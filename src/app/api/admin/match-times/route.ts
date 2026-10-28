import { NextResponse } from "next/server";
import { z } from "zod";
import { mapMatch, type MatchRow } from "@/lib/data-mappers";
import { isStartedMatch } from "@/lib/domain/cross-event-clashes";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminUser, ServerAccessError } from "@/lib/server-access";

export const runtime = "nodejs";

// Mueve horario/cancha de partidos aun no jugados (resolver cruces entre disciplinas).
const movesSchema = z.object({
  moves: z
    .array(
      z.object({
        id: z.string().uuid(),
        scheduledAt: z.string().datetime({ offset: true }),
        scheduledEndAt: z.string().datetime({ offset: true }),
        venueId: z.string().uuid().nullable()
      })
    )
    .min(1, "No hay cambios para guardar.")
    .max(100)
});

export async function PATCH(request: Request) {
  try {
    const admin = createSupabaseAdminClient();
    await requireAdminUser(admin);
    const { moves } = movesSchema.parse(await request.json());

    const matchesResponse = await admin
      .from("matches")
      .select("*, venue:venue_id (id, name), event:event_id (fixture_status)")
      .in(
        "id",
        moves.map((move) => move.id)
      );
    if (matchesResponse.error) throw new ServerAccessError(matchesResponse.error.message, 500);

    const rows = (matchesResponse.data ?? []) as Array<
      MatchRow & { event?: { fixture_status?: string } | null }
    >;
    if (rows.length !== moves.length)
      return jsonError("Algun partido ya no existe. Recarga la pagina.", 404);
    if (rows.some((row) => row.event?.fixture_status === "locked")) {
      return jsonError("El fixture esta bloqueado. Desbloquealo antes de mover partidos.", 409);
    }
    const started = rows.map(mapMatch).find(isStartedMatch);
    if (started)
      return jsonError(
        `${started.label ?? "Un partido"} ya empezo o tiene resultado; no se puede mover.`,
        409
      );

    const updatedAt = new Date().toISOString();
    // ponytail: un update por partido, sin transaccion; si uno falla se avisa y basta volver a aplicar.
    const results = await Promise.all(
      moves.map((move) =>
        admin
          .from("matches")
          .update({
            scheduled_at: move.scheduledAt,
            scheduled_end_at: move.scheduledEndAt,
            venue_id: move.venueId,
            updated_at: updatedAt
          })
          .eq("id", move.id)
      )
    );
    const failed = results.find((result) => result.error);
    if (failed?.error) throw new ServerAccessError(failed.error.message, 500);

    return NextResponse.json({ ok: true, updated: moves.length });
  } catch (error) {
    if (error instanceof ServerAccessError) return jsonError(error.message, error.status);
    if (error instanceof z.ZodError)
      return jsonError(error.errors[0]?.message ?? "Datos invalidos.", 400);
    console.error("Match times error", error);
    return jsonError("No se pudieron mover los partidos.", 500);
  }
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}
