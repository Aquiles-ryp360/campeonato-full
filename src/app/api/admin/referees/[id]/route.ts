import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, routeError } from "@/lib/server-access";

export const runtime = "nodejs";

const schema = z.object({
  userId: z.string().uuid().optional().nullable(),
  fullName: z.string().trim().min(2).optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  phone: z.string().trim().optional(),
  active: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requireRole("admin");
    const input = schema.parse(await request.json());
    const { data, error } = await supabase
      .from("referees")
      .update({
        user_id: input.userId,
        full_name: input.fullName,
        email: input.email,
        phone: input.phone,
        active: input.active,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, referee: data });
  } catch (error) {
    return routeError(error, "No se pudo actualizar el arbitro.");
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requireRole("admin");
    const { count, error: countError } = await supabase
      .from("match_referees")
      .select("id", { count: "exact", head: true })
      .eq("referee_id", id);

    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      await supabase.from("referees").update({ active: false }).eq("id", id);
      return NextResponse.json({ ok: false, error: "No se puede eliminar un arbitro con partidos asociados; fue desactivado." }, { status: 409 });
    }

    const { error } = await supabase.from("referees").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return routeError(error, "No se pudo eliminar el arbitro.");
  }
}
