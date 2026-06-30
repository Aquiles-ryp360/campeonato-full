import "server-only";

import { createSupabaseAdminClient } from "./supabase-admin";
import { createSupabaseRouteClient } from "./supabase-server";

export type DelegateRouteAccess =
  | {
      ok: true;
      email: string | null;
    }
  | {
      ok: false;
      email: string | null;
      reason: "not_authenticated" | "not_registered" | "pending_review" | "not_delegate";
    };

type ProfileRoleRow = {
  role: "admin" | "delegate" | "viewer";
};

type DelegateAccessTeamRow = {
  id: string;
  status: "pending_payment" | "registered" | "observed" | "approved";
};

export async function getDelegateRouteAccess(): Promise<DelegateRouteAccess> {
  if (!hasSupabaseServerEnv()) {
    return { ok: true, email: "delegado" };
  }

  const routeSupabase = await createSupabaseRouteClient();
  const { data: userData, error: userError } = await routeSupabase.auth.getUser();

  if (userError || !userData.user) {
    return { ok: false, email: null, reason: "not_authenticated" };
  }

  const email = userData.user.email?.trim().toLowerCase() ?? null;

  const adminSupabase = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle<ProfileRoleRow>();

  if (profileError) {
    return { ok: false, email, reason: "not_delegate" };
  }

  if (profile?.role === "admin") {
    return { ok: true, email };
  }

  const query = adminSupabase
    .from("teams")
    .select("id, status")
    .or(email ? `delegate_user_id.eq.${userData.user.id},delegate_email.eq.${email}` : `delegate_user_id.eq.${userData.user.id}`);

  const { data: teams, error: teamsError } = await query.returns<DelegateAccessTeamRow[]>();

  if (teamsError) {
    return { ok: false, email, reason: "not_delegate" };
  }

  const delegateTeams = teams ?? [];

  if (delegateTeams.some((team) => team.status === "approved")) {
    return { ok: true, email };
  }

  if (delegateTeams.length > 0) {
    return { ok: false, email, reason: "pending_review" };
  }

  return { ok: false, email, reason: "not_registered" };
}

function hasSupabaseServerEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
