import "server-only";

import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "./supabase-admin";
import { createSupabaseRouteClient } from "./supabase-server";

export type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export class ServerAccessError extends Error {
  constructor(
    message: string,
    readonly status = 401
  ) {
    super(message);
  }
}

export async function getRouteUser() {
  const authClient = await createSupabaseRouteClient();
  const { data, error } = await authClient.auth.getUser();

  if (error || !data.user?.email) {
    throw new ServerAccessError("No autorizado", 401);
  }

  return data.user;
}

export async function getOptionalRouteUser() {
  try {
    return await getRouteUser();
  } catch {
    return null;
  }
}

export async function requireAdminUser(admin: AdminClient = createSupabaseAdminClient()) {
  const user = await getRouteUser();
  const isAdmin = await isAdminUser(admin, user);

  if (!isAdmin) {
    throw new ServerAccessError("No autorizado", 401);
  }

  return user;
}

export async function isAdminUser(admin: AdminClient, user: User) {
  const email = user.email?.trim().toLowerCase();
  if (!email) return false;

  const [profileResponse, adminEmailResponse] = await Promise.all([
    admin.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>(),
    admin
      .from("admin_emails")
      .select("email")
      .eq("email", email)
      .eq("active", true)
      .maybeSingle<{ email: string }>()
  ]);

  if (profileResponse.error) {
    throw new ServerAccessError(profileResponse.error.message, 500);
  }

  if (adminEmailResponse.error) {
    throw new ServerAccessError(adminEmailResponse.error.message, 500);
  }

  return profileResponse.data?.role === "admin" || Boolean(adminEmailResponse.data);
}

export async function requireRefereeMatchAccess(
  matchId: string,
  admin: AdminClient = createSupabaseAdminClient()
) {
  const user = await getRouteUser();

  if (await isAdminUser(admin, user)) {
    return { user, isAdmin: true };
  }

  const email = user.email?.trim().toLowerCase();
  if (!email) {
    throw new ServerAccessError("No autorizado", 401);
  }

  const { data: assignmentByEmail, error: emailError } = await admin
    .from("referee_assignments")
    .select("id")
    .eq("match_id", matchId)
    .eq("referee_email", email)
    .eq("active", true)
    .maybeSingle<{ id: string }>();

  if (emailError) {
    throw new ServerAccessError(emailError.message, 500);
  }

  if (assignmentByEmail) {
    await linkRefereeUser(admin, matchId, user.id, email);
    return { user, isAdmin: false };
  }

  const { data: assignmentByUser, error: userError } = await admin
    .from("referee_assignments")
    .select("id")
    .eq("match_id", matchId)
    .eq("referee_user_id", user.id)
    .eq("active", true)
    .maybeSingle<{ id: string }>();

  if (userError) {
    throw new ServerAccessError(userError.message, 500);
  }

  if (assignmentByUser) {
    return { user, isAdmin: false };
  }

  throw new ServerAccessError("Este partido no esta asignado a tu cuenta.", 403);
}

export async function requireDelegateTeamAccess(
  teamId: string,
  admin: AdminClient = createSupabaseAdminClient()
) {
  const user = await getRouteUser();
  const isAdmin = await isAdminUser(admin, user);

  const { data: team, error } = await admin
    .from("teams")
    .select("id, event_id, delegate_user_id, delegate_email")
    .eq("id", teamId)
    .maybeSingle<{
      id: string;
      event_id: string;
      delegate_user_id: string | null;
      delegate_email: string | null;
    }>();

  if (error) {
    throw new ServerAccessError(error.message, 500);
  }

  if (!team) {
    throw new ServerAccessError("Equipo no encontrado", 404);
  }

  if (isAdmin || team.delegate_user_id === user.id) {
    return { user, isAdmin, team };
  }

  const email = user.email?.trim().toLowerCase();
  const delegateEmail = team.delegate_email?.trim().toLowerCase();

  if (email && delegateEmail && email === delegateEmail) {
    await admin
      .from("teams")
      .update({
        delegate_user_id: user.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", teamId)
      .is("delegate_user_id", null);

    return { user, isAdmin, team };
  }

  throw new ServerAccessError("Este equipo no esta asignado a tu cuenta.", 403);
}

async function linkRefereeUser(
  admin: AdminClient,
  matchId: string,
  userId: string,
  email: string
) {
  const { error } = await admin
    .from("referee_assignments")
    .update({
      referee_user_id: userId,
      updated_at: new Date().toISOString()
    })
    .eq("match_id", matchId)
    .eq("referee_email", email)
    .eq("active", true);

  if (error) {
    throw new ServerAccessError(error.message, 500);
  }
}
