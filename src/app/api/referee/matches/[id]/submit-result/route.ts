import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAssignedRefereeMatch } from "@/lib/referee-access";
import { routeError } from "@/lib/server-access";

export const runtime = "nodejs";

const eventSchema = z.object({
  teamId: z.string().uuid().optional(),
  playerId: z.string().uuid().optional(),
  eventType: z.enum(["goal", "yellow_card", "red_card", "own_goal", "penalty_goal", "penalty_missed", "injury", "incident"]),
  minute: z.number().int().min(0).optional(),
  value: z.number().int().optional(),
  notes: z.string().trim().optional()
});

const setSchema = z.object({
  setNumber: z.number().int().min(1),
  homePoints: z.number().int().min(0),
  awayPoints: z.number().int().min(0)
});

const schema = z.object({
  homeScore: z.number().int().min(0).optional(),
  awayScore: z.number().int().min(0).optional(),
  observations: z.string().trim().optional().default(""),
  events: z.array(eventSchema).optional().default([]),
  sets: z.array(setSchema).optional().default([])
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = schema.parse(await request.json());
    const access = await requireAssignedRefereeMatch(id);
    if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
    if (access.match.status === "validated" || access.match.status === "finished") {
      return NextResponse.json({ ok: false, error: "El resultado validado no puede ser editado por el arbitro." }, { status: 409 });
    }
    if (access.match.status === "submitted") {
      return NextResponse.json({ ok: false, error: "El resultado ya fue enviado y esta en revision." }, { status: 409 });
    }

    const { data: event } = await access.supabase
      .from("events")
      .select("id, auto_validate_referee_results")
      .eq("id", access.match.event_id)
      .maybeSingle<{ id: string; auto_validate_referee_results: boolean }>();
    const status = event?.auto_validate_referee_results ? "validated" : "submitted";
    const now = new Date().toISOString();
    const homeSets = input.sets.filter((set) => set.homePoints > set.awayPoints).length;
    const awaySets = input.sets.filter((set) => set.awayPoints > set.homePoints).length;

    const { data: result, error: resultError } = await access.supabase
      .from("match_results")
      .upsert({
        match_id: id,
        submitted_by: access.user.id,
        validated_by: status === "validated" ? access.user.id : null,
        home_score: input.homeScore ?? homeSets,
        away_score: input.awayScore ?? awaySets,
        home_sets: input.sets.length ? homeSets : null,
        away_sets: input.sets.length ? awaySets : null,
        status,
        observations: input.observations,
        submitted_at: now,
        validated_at: status === "validated" ? now : null,
        updated_at: now
      }, { onConflict: "match_id" })
      .select("id")
      .single();

    if (resultError) throw resultError;

    await access.supabase.from("match_events").delete().eq("match_id", id);
    if (input.events.length > 0) {
      const { error } = await access.supabase.from("match_events").insert(
        input.events.map((event) => ({
          match_id: id,
          team_id: event.teamId ?? null,
          player_id: event.playerId ?? null,
          event_type: event.eventType,
          minute: event.minute ?? null,
          value: event.value ?? null,
          notes: event.notes ?? null,
          created_by: access.user.id
        }))
      );
      if (error) throw error;
    }

    await access.supabase.from("volleyball_sets").delete().eq("match_id", id);
    if (input.sets.length > 0) {
      const { error } = await access.supabase.from("volleyball_sets").insert(
        input.sets.map((set) => ({
          match_id: id,
          set_number: set.setNumber,
          home_points: set.homePoints,
          away_points: set.awayPoints,
          winner_team_id: set.homePoints > set.awayPoints ? access.match.home_team_id : set.awayPoints > set.homePoints ? access.match.away_team_id : null
        }))
      );
      if (error) throw error;
    }

    const { error: matchError } = await access.supabase
      .from("matches")
      .update({
        status,
        home_score: input.homeScore ?? homeSets,
        away_score: input.awayScore ?? awaySets,
        notes: input.observations,
        updated_at: now
      })
      .eq("id", id);
    if (matchError) throw matchError;

    return NextResponse.json({ ok: true, resultId: result.id, status });
  } catch (error) {
    return routeError(error, "No se pudo enviar el resultado.");
  }
}
