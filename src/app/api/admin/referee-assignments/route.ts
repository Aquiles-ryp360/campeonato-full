import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ServerAccessError,
  requireAdminUser,
  type AdminClient
} from "@/lib/server-access";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { mapRefereeAssignment, type RefereeAssignmentRow } from "@/lib/data-mappers";

export const runtime = "nodejs";

const assignmentSchema = z.object({
  matchId: z.string().uuid(),
  refereeEmail: z.string().trim().toLowerCase().optional().default(""),
  refereeName: z.string().trim().optional().default("")
});

export async function GET() {
  try {
    const admin = createSupabaseAdminClient();
    await requireAdminUser(admin);

    const { data, error } = await admin
      .from("referee_assignments")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    return NextResponse.json({
      assignments: ((data ?? []) as RefereeAssignmentRow[]).map(mapRefereeAssignment)
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = assignmentSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();
    const user = await requireAdminUser(admin);

    await ensureMatchExists(admin, input.matchId);

    if (!input.refereeEmail) {
      await clearMatchAssignment(admin, input.matchId);
      return NextResponse.json({ ok: true, assignment: null });
    }

    const userId = await findAuthUserIdByEmail(admin, input.refereeEmail);
    if (userId) {
      await promoteRefereeProfile(admin, {
        userId,
        refereeEmail: input.refereeEmail,
        refereeName: input.refereeName || input.refereeEmail
      });
    }

    const deactivateResponse = await admin
      .from("referee_assignments")
      .update({
        active: false,
        updated_at: new Date().toISOString()
      })
      .eq("match_id", input.matchId)
      .neq("referee_email", input.refereeEmail)
      .eq("active", true);

    if (deactivateResponse.error) throw new Error(deactivateResponse.error.message);

    const { data, error } = await admin
      .from("referee_assignments")
      .upsert(
        {
          match_id: input.matchId,
          referee_user_id: userId,
          referee_email: input.refereeEmail,
          referee_name: input.refereeName || null,
          active: true,
          assigned_by: user.id,
          updated_at: new Date().toISOString()
        },
        { onConflict: "match_id,referee_email" }
      )
      .select("*")
      .single<RefereeAssignmentRow>();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      assignment: mapRefereeAssignment(data)
    });
  } catch (error) {
    return jsonError(error);
  }
}

async function ensureMatchExists(admin: AdminClient, matchId: string) {
  const { data, error } = await admin
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .maybeSingle<{ id: string }>();

  if (error) throw new Error(error.message);
  if (!data) throw new ServerAccessError("Partido no encontrado.", 404);
}

async function clearMatchAssignment(admin: AdminClient, matchId: string) {
  const { error } = await admin
    .from("referee_assignments")
    .update({
      active: false,
      updated_at: new Date().toISOString()
    })
    .eq("match_id", matchId)
    .eq("active", true);

  if (error) throw new Error(error.message);
}

async function promoteRefereeProfile(
  admin: AdminClient,
  {
    userId,
    refereeEmail,
    refereeName
  }: {
    userId: string;
    refereeEmail: string;
    refereeName: string;
  }
) {
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role, phone")
    .eq("id", userId)
    .maybeSingle<{ role: string; phone: string | null }>();

  if (profileError) throw new Error(profileError.message);
  if (profile?.role === "admin" || profile?.role === "delegate") return;

  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      role: "referee",
      full_name: refereeName || refereeEmail,
      phone: profile?.phone ?? null,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );

  if (error) throw new Error(error.message);
}

async function findAuthUserIdByEmail(admin: AdminClient, email: string) {
  let page = 1;
  const perPage = 1000;
  const normalizedEmail = email.trim().toLowerCase();

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });

    if (error) throw new Error(error.message);

    const user = data.users.find((current) => current.email?.trim().toLowerCase() === normalizedEmail);
    if (user) return user.id;
    if (data.users.length < perPage) return null;

    page += 1;
  }
}

function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "No se pudo procesar la asignacion.";
  const status = error instanceof ServerAccessError ? error.status : 400;
  return NextResponse.json({ error: message }, { status });
}
