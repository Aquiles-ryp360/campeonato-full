import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, routeError } from "@/lib/server-access";

export const runtime = "nodejs";

const schema = z.object({
  userId: z.string().uuid().optional().nullable(),
  fullName: z.string().trim().min(2),
  email: z.string().trim().email().toLowerCase(),
  phone: z.string().trim().optional().default(""),
  active: z.boolean().optional().default(true)
});

export async function GET() {
  try {
    const { supabase } = await requireRole("admin");
    const { data, error } = await supabase
      .from("referees")
      .select("*, match_referees(match_id)")
      .order("full_name", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ ok: true, referees: data ?? [] });
  } catch (error) {
    return routeError(error, "No se pudieron cargar los arbitros.");
  }
}

export async function POST(request: Request) {
  try {
    const { supabase } = await requireRole("admin");
    const input = schema.parse(await request.json());
    const { data, error } = await supabase
      .from("referees")
      .insert({
        user_id: input.userId ?? null,
        full_name: input.fullName,
        email: input.email,
        phone: input.phone || null,
        active: input.active
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, referee: data });
  } catch (error) {
    return routeError(error, "No se pudo crear el arbitro.");
  }
}
