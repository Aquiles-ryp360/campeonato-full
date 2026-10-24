import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createMemoryRateLimiter } from "@/lib/identity/rate-limit";
import { clientIpFromRequest } from "@/lib/server/identity-rate-limit";
import {
  registrationAvailability,
  registrationClosedMessage
} from "@/lib/domain/registration-rules";

export const runtime = "nodejs";

// Solo verifica el codigo; el consumo sigue ocurriendo en /api/register-delegate.
const validationLimiter = createMemoryRateLimiter({ limit: 10, windowMs: 60_000 });

const validationSchema = z.object({
  eventId: z
    .string({ required_error: "Selecciona un campeonato." })
    .trim()
    .min(1, "Selecciona un campeonato."),
  registrationCode: z
    .string({ required_error: "Ingresa tu código de acceso." })
    .trim()
    .min(3, "Ingresa tu código de acceso.")
    .max(64, "El código de acceso no es válido.")
});

type EventRow = {
  id: string;
  status: "draft" | "registration" | "in_progress" | "finished";
  registration_open_until: string | null;
  max_teams: number;
};

type RegistrationCodeRow = {
  method: "yape" | "plin";
  status: "available" | "used" | "revoked";
  used_by_team_id: string | null;
};

export async function POST(request: Request) {
  const rateLimit = validationLimiter.check(`code:${clientIpFromRequest(request)}`);
  if (!rateLimit.allowed) {
    return jsonError("Demasiados intentos. Espera un minuto e inténtalo otra vez.", 429);
  }

  const parsed = validationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);
  }

  let supabase: ReturnType<typeof createSupabaseAdminClient>;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return jsonError("El servidor no tiene configurado Supabase para validar códigos.", 500);
  }

  const { eventId, registrationCode } = parsed.data;
  const eventQuery = supabase
    .from("events")
    .select("id, status, registration_open_until, max_teams")
    .limit(1);
  const eventResponse = isUuid(eventId)
    ? await eventQuery.eq("id", eventId).maybeSingle<EventRow>()
    : await eventQuery.eq("slug", eventId).maybeSingle<EventRow>();

  if (eventResponse.error) {
    return jsonError("No se pudo validar el campeonato seleccionado.", 500);
  }

  const event = eventResponse.data;
  if (!event) {
    return jsonError("El campeonato seleccionado no existe.", 404);
  }

  const { count, error: countError } = await supabase
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .in("status", ["registered", "observed", "approved"]);

  if (countError) {
    return jsonError("No se pudo validar el cupo del campeonato.", 500);
  }

  const availability = registrationAvailability({
    event: {
      status: event.status,
      registrationOpenUntil: event.registration_open_until ?? "",
      maxTeams: event.max_teams
    },
    teamCount: count ?? 0
  });

  if (!availability.open) {
    return jsonError(registrationClosedMessage(availability.reason), 409);
  }

  const { data: code, error: codeError } = await supabase
    .from("registration_codes")
    .select("method, status, used_by_team_id")
    .eq("event_id", event.id)
    .eq("code", registrationCode)
    .maybeSingle<RegistrationCodeRow>();

  if (codeError) {
    return jsonError("No se pudo validar el código de acceso.", 500);
  }

  if (!code) {
    return jsonError(
      "El código de acceso es incorrecto o no corresponde a este campeonato.",
      404
    );
  }

  if (code.status === "used" || code.used_by_team_id) {
    return jsonError("Este código de acceso ya fue utilizado en otra inscripción.", 409);
  }

  if (code.status !== "available") {
    return jsonError(
      "Este código de acceso fue anulado. Comunícate con un organizador.",
      409
    );
  }

  return NextResponse.json({ ok: true, paymentMethod: code.method });
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
