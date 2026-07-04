import "server-only";

import { redirect } from "next/navigation";
import { canRoleAccess, loginPathFor, normalizeRouteRole, roleHomePath, type ProtectedRouteRole } from "./route-access";
import { createSupabaseRouteClient } from "./supabase-server";

type ProfileRoleRow = {
  role: string;
};

export async function requireServerRole(requiredRole: ProtectedRouteRole, nextPath: string) {
  if (!hasSupabaseAuthEnv()) {
    return { role: requiredRole, bypassed: true };
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseRouteClient>>;

  try {
    supabase = await createSupabaseRouteClient();
  } catch {
    redirect(loginPathFor(nextPath));
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect(loginPathFor(nextPath));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle<ProfileRoleRow>();

  if (profileError) {
    redirect(loginPathFor(nextPath));
  }

  const role = normalizeRouteRole(profile?.role);

  if (!canRoleAccess(role, requiredRole)) {
    redirect(roleHomePath(role));
  }

  return { role, user: userData.user, bypassed: false };
}

function hasSupabaseAuthEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
