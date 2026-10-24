import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminUser, ServerAccessError } from "@/lib/server-access";

export const runtime = "nodejs";

const createSchema = z.object({
  eventId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(3, "El título es muy corto.").max(120),
  body: z.string().trim().min(3, "Escribe el aviso.").max(2000)
});

export async function GET() {
  try {
    const admin = createSupabaseAdminClient();
    await requireAdminUser(admin);

    const [events, announcements] = await Promise.all([
      admin.from("events").select("id, name").order("created_at", { ascending: false }),
      admin
        .from("announcements")
        .select("id, event_id, title, body, created_at")
        .order("created_at", { ascending: false })
    ]);

    if (events.error) throw events.error;
    if (announcements.error) {
      return jsonError("Falta aplicar la migración 025 (tabla de avisos) en Supabase.", 503);
    }

    return NextResponse.json({ ok: true, events: events.data ?? [], announcements: announcements.data ?? [] });
  } catch (error) {
    return routeError(error, "No se pudieron cargar los avisos.");
  }
}

export async function POST(request: Request) {
  try {
    const admin = createSupabaseAdminClient();
    const user = await requireAdminUser(admin);
    const parsed = createSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);
    }

    const { data, error } = await admin
      .from("announcements")
      .insert({
        event_id: parsed.data.eventId ?? null,
        title: parsed.data.title,
        body: parsed.data.body,
        created_by: user.id
      })
      .select("id, event_id, title, body, created_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, announcement: data });
  } catch (error) {
    return routeError(error, "No se pudo publicar el aviso.");
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = createSupabaseAdminClient();
    await requireAdminUser(admin);
    const id = new URL(request.url).searchParams.get("id") ?? "";

    if (!z.string().uuid().safeParse(id).success) {
      return jsonError("Aviso inválido.", 400);
    }

    const { error } = await admin.from("announcements").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return routeError(error, "No se pudo eliminar el aviso.");
  }
}

function routeError(error: unknown, fallback: string) {
  if (error instanceof ServerAccessError) {
    return jsonError(error.message, error.status);
  }

  console.error(fallback, error);
  return jsonError(fallback, 500);
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}
