import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminUser, ServerAccessError } from "@/lib/server-access";
import type { PaymentMethod } from "@/lib/types";

export const runtime = "nodejs";

const createCodesSchema = z.object({
  eventId: z.string().uuid("Selecciona un campeonato."),
  method: z.enum(["yape", "plin"]),
  count: z.coerce.number().int().min(1).max(100)
});

type EventRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  registration_fee: number | string;
  registration_open_until: string;
};

type RegistrationCodeRow = {
  id: string;
  event_id: string;
  code: string;
  method: PaymentMethod;
  amount: number | string;
  status: "available" | "used" | "revoked";
  used_by_team_id: string | null;
  created_at: string;
};

const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function GET() {
  try {
    const admin = createSupabaseAdminClient();
    await requireAdminUser(admin);

    const [eventsResponse, codesResponse] = await Promise.all([
      admin
        .from("events")
        .select("id, name, slug, status, registration_fee, registration_open_until")
        .order("created_at", { ascending: false }),
      admin
        .from("registration_codes")
        .select("id, event_id, code, method, amount, status, used_by_team_id, created_at")
        .order("created_at", { ascending: false })
    ]);

    if (eventsResponse.error) throw eventsResponse.error;
    if (codesResponse.error) throw codesResponse.error;

    return NextResponse.json({
      ok: true,
      events: (eventsResponse.data ?? []) as EventRow[],
      codes: (codesResponse.data ?? []) as RegistrationCodeRow[]
    });
  } catch (error) {
    return routeError(error, "No se pudieron cargar los codigos.");
  }
}

export async function POST(request: Request) {
  try {
    const input = createCodesSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    await requireAdminUser(admin);

    const { data: event, error: eventError } = await admin
      .from("events")
      .select("id, name, slug, status, registration_fee, registration_open_until")
      .eq("id", input.eventId)
      .maybeSingle<EventRow>();

    if (eventError) throw eventError;
    if (!event) {
      return NextResponse.json({ ok: false, error: "Campeonato no encontrado." }, { status: 404 });
    }

    const { data: existing, error: existingError } = await admin
      .from("registration_codes")
      .select("code")
      .eq("event_id", event.id);

    if (existingError) throw existingError;

    const seen = new Set(((existing ?? []) as Pick<RegistrationCodeRow, "code">[]).map((row) => row.code));
    const rows = Array.from({ length: input.count }, () => ({
      event_id: event.id,
      method: input.method,
      code: uniqueRegistrationCode(event.slug, seen),
      amount: Number(event.registration_fee),
      status: "available"
    }));

    const { data, error } = await admin
      .from("registration_codes")
      .insert(rows)
      .select("id, event_id, code, method, amount, status, used_by_team_id, created_at");

    if (error) throw error;
    return NextResponse.json({ ok: true, codes: (data ?? []) as RegistrationCodeRow[] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: error.errors[0]?.message ?? "Datos invalidos." },
        { status: 400 }
      );
    }

    return routeError(error, "No se pudieron crear los codigos.");
  }
}

function uniqueRegistrationCode(slug: string, seen: Set<string>) {
  let code = "";

  do {
    code = `${registrationCodePrefix(slug)}-${randomCodeChunk()}-${randomCodeChunk()}`;
  } while (seen.has(code));

  seen.add(code);
  return code;
}

function registrationCodePrefix(slug: string) {
  const slugPrefix = slugify(slug).slice(0, 4).toUpperCase() || "GEN";
  return `CMP-${slugPrefix}`;
}

function randomCodeChunk() {
  return Array.from({ length: 4 }, () => codeAlphabet[randomInt(codeAlphabet.length)]).join("");
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function routeError(error: unknown, fallback: string) {
  if (error instanceof ServerAccessError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ ok: false, error: message || fallback }, { status: 500 });
}
