import { randomInt } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, routeError } from "@/lib/server-access";

export const runtime = "nodejs";

const createCodesSchema = z.object({
  eventId: z.string().uuid("Selecciona un campeonato."),
  method: z.enum(["yape", "plin"]),
  count: z.number().int().min(1).max(100)
});

type EventRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  registration_fee: number | string;
};

type ExistingCodeRow = {
  code: string;
};

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function GET() {
  try {
    const { supabase } = await requireRole("admin");
    const [eventsResponse, codesResponse] = await Promise.all([
      supabase
        .from("events")
        .select("id, name, slug, status, registration_fee")
        .order("created_at", { ascending: false }),
      supabase
        .from("registration_codes")
        .select("id, event_id, code, method, amount, status, used_by_team_id, created_at")
        .order("created_at", { ascending: false })
    ]);

    if (eventsResponse.error) throw eventsResponse.error;
    if (codesResponse.error) throw codesResponse.error;

    return NextResponse.json({
      ok: true,
      events: eventsResponse.data ?? [],
      codes: codesResponse.data ?? []
    });
  } catch (error) {
    return routeError(error, "No se pudieron cargar los codigos.");
  }
}

export async function POST(request: Request) {
  try {
    const input = createCodesSchema.parse(await request.json());
    const { supabase } = await requireRole("admin");

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, slug, status, registration_fee")
      .eq("id", input.eventId)
      .maybeSingle<EventRow>();

    if (eventError) throw eventError;
    if (!event) return NextResponse.json({ ok: false, error: "Campeonato no encontrado." }, { status: 404 });

    const { data: existing, error: existingError } = await supabase
      .from("registration_codes")
      .select("code")
      .eq("event_id", event.id);

    if (existingError) throw existingError;

    const seen = new Set(((existing ?? []) as ExistingCodeRow[]).map((row) => row.code));
    const rows = Array.from({ length: input.count }, () => {
      const code = uniqueCode(event.slug, seen);
      return {
        event_id: event.id,
        method: input.method,
        code,
        amount: Number(event.registration_fee),
        status: "available"
      };
    });

    const { data, error } = await supabase
      .from("registration_codes")
      .insert(rows)
      .select("id, event_id, code, method, amount, status, used_by_team_id, created_at");

    if (error) throw error;
    return NextResponse.json({ ok: true, codes: data ?? [] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: error.errors[0]?.message ?? "Datos invalidos." }, { status: 400 });
    }

    return routeError(error, "No se pudieron crear los codigos.");
  }
}

function uniqueCode(slug: string, seen: Set<string>) {
  let code = "";
  do {
    code = `${codePrefix(slug)}-${chunk()}-${chunk()}`;
  } while (seen.has(code));

  seen.add(code);
  return code;
}

function codePrefix(slug: string) {
  return `CMP-${slugify(slug).slice(0, 4).toUpperCase() || "GEN"}`;
}

function chunk() {
  return Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
