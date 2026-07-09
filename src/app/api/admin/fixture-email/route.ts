import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyCatalogLabels,
  mapCompetitionFormat,
  mapEvent,
  mapMatch,
  mapSport,
  mapTeam,
  mapVenue,
  type CompetitionFormatRow,
  type EventRow,
  type MatchRow,
  type SportRow,
  type TeamRow,
  type VenueRow
} from "@/lib/data-mappers";
import { buildVisibleFixtureMatches } from "@/lib/domain/fixture-preview";
import { isActiveRegistrationTeamStatus } from "@/lib/domain/registration-rules";
import { appBaseUrl, sendFixtureEmail } from "@/lib/mail";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminUser, ServerAccessError } from "@/lib/server-access";
import type { Team } from "@/lib/types";

export const runtime = "nodejs";

const sendFixtureSchema = z.object({
  eventId: z.string().uuid("Selecciona un campeonato."),
  testEmail: z.string().trim().email().optional()
});

type RefereeAssignmentRow = {
  referee_email: string;
  referee_name: string | null;
  active: boolean;
};

type FixtureRecipient = {
  email: string;
  name: string;
  roles: Set<string>;
};

export async function POST(request: Request) {
  try {
    const input = sendFixtureSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    await requireAdminUser(admin);

    const data = await loadFixtureEmailData(admin, input.eventId);
    const event = data.events[0];
    if (!event) {
      return NextResponse.json({ ok: false, error: "Campeonato no encontrado." }, { status: 404 });
    }

    const matches = buildVisibleFixtureMatches({
      events: data.events,
      teams: data.teams,
      matches: data.matches,
      venues: data.venues
    }).filter((match) => match.eventId === event.id);

    if (matches.length === 0) {
      return NextResponse.json({ ok: false, error: "Este campeonato no tiene fixture para enviar." }, { status: 409 });
    }

    const recipientResult = input.testEmail
      ? { recipients: [recipient(input.testEmail, "Prueba de fixture", "prueba")], skipped: [] }
      : await fixtureRecipients(admin, event.id, data.teams, data.matches.map((match) => match.id));
    const fixtureUrl = `${appBaseUrl().replace(/\/$/, "")}/c/${event.id}/fixture`;
    const sent: Array<{ email: string; messageId?: string }> = [];
    const failed: Array<{ email: string; error: string }> = [];

    if (recipientResult.recipients.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "No hay correos reales para enviar este fixture.",
          skipped: recipientResult.skipped
        },
        { status: 409 }
      );
    }

    for (const item of recipientResult.recipients) {
      try {
        const result = await sendFixtureEmail({
          to: item.email,
          recipientName: item.name,
          eventName: event.name,
          fixtureUrl,
          matches,
          teams: data.teams
        });
        sent.push({ email: item.email, messageId: result.messageId });
      } catch (error) {
        failed.push({
          email: item.email,
          error: error instanceof Error ? error.message : "No se pudo enviar."
        });
      }
    }

    return NextResponse.json({
      ok: failed.length === 0,
      event: event.name,
      fixtureUrl,
      sent,
      failed,
      skipped: recipientResult.skipped,
      recipientCount: recipientResult.recipients.length
    }, { status: failed.length === 0 ? 200 : 207 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: error.errors[0]?.message ?? "Datos invalidos." },
        { status: 400 }
      );
    }

    return routeError(error, "No se pudo enviar el fixture.");
  }
}

async function loadFixtureEmailData(admin: ReturnType<typeof createSupabaseAdminClient>, eventId: string) {
  const [eventsResponse, teamsResponse, matchesResponse, sportsResponse, formatsResponse, venuesResponse] =
    await Promise.all([
      admin.from("events").select("*").eq("id", eventId),
      admin
        .from("teams")
        .select("*, registration_code:registration_code_id (id, code, method, status)")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true }),
      admin
        .from("matches")
        .select("*, venue:venue_id (id, name)")
        .eq("event_id", eventId)
        .order("scheduled_at", { ascending: true }),
      admin.from("sports").select("*").order("name", { ascending: true }),
      admin.from("competition_formats").select("*").order("name", { ascending: true }),
      admin.from("venues").select("*").order("name", { ascending: true })
    ]);

  if (eventsResponse.error) throw eventsResponse.error;
  if (teamsResponse.error) throw teamsResponse.error;
  if (matchesResponse.error) throw matchesResponse.error;
  if (sportsResponse.error) throw sportsResponse.error;
  if (formatsResponse.error) throw formatsResponse.error;
  if (venuesResponse.error) throw venuesResponse.error;

  return {
    ...applyCatalogLabels({
      events: ((eventsResponse.data ?? []) as EventRow[]).map(mapEvent),
      teams: ((teamsResponse.data ?? []) as unknown as TeamRow[]).map(mapTeam),
      matches: ((matchesResponse.data ?? []) as MatchRow[]).map(mapMatch),
      sports: ((sportsResponse.data ?? []) as SportRow[]).map(mapSport),
      competitionFormats: ((formatsResponse.data ?? []) as CompetitionFormatRow[]).map(mapCompetitionFormat),
      venues: ((venuesResponse.data ?? []) as VenueRow[]).map(mapVenue),
      players: [],
      matchLiveEvents: [],
      registrationCodes: [],
      timeSlots: [],
      groups: [],
      groupTeams: [],
      groupStandings: [],
      tournamentBases: []
    })
  };
}

async function fixtureRecipients(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string,
  teams: Team[],
  matchIds: string[]
) {
  const recipients = new Map<string, FixtureRecipient>();
  const skipped: string[] = [];

  for (const team of teams.filter((item) => item.eventId === eventId && isActiveRegistrationTeamStatus(item.status))) {
    addRecipient(recipients, skipped, team.delegateEmail, team.delegateName || team.name, "delegado");
  }

  if (matchIds.length > 0) {
    const { data, error } = await admin
      .from("referee_assignments")
      .select("referee_email, referee_name, active")
      .in("match_id", matchIds)
      .eq("active", true);

    if (error) throw error;

    for (const assignment of (data ?? []) as RefereeAssignmentRow[]) {
      addRecipient(recipients, skipped, assignment.referee_email, assignment.referee_name ?? "Arbitro", "arbitro");
    }
  }

  return {
    recipients: Array.from(recipients.values()),
    skipped
  };
}

function recipient(email: string, name: string, role: string): FixtureRecipient {
  return {
    email: email.trim().toLowerCase(),
    name,
    roles: new Set([role])
  };
}

function addRecipient(
  recipients: Map<string, FixtureRecipient>,
  skipped: string[],
  email: string | undefined,
  name: string,
  role: string
) {
  const normalized = normalizeRecipientEmail(email);
  if (!normalized) {
    if (email?.trim()) skipped.push(email.trim());
    return;
  }

  const current = recipients.get(normalized);
  if (current) {
    current.roles.add(role);
    return;
  }

  recipients.set(normalized, recipient(normalized, name, role));
}

function normalizeRecipientEmail(email: string | undefined) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.endsWith(".local")) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return normalized;
}

function routeError(error: unknown, fallback: string) {
  if (error instanceof ServerAccessError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ ok: false, error: message || fallback }, { status: 500 });
}
