import "server-only";

import { createSupabaseAdminClient } from "./supabase-admin";
import { createSupabaseRouteClient } from "./supabase-server";
import type { AuthRole } from "./types";

export class RouteAccessError extends Error {
  constructor(
    message: string,
    readonly status = 401
  ) {
    super(message);
  }
}

export async function requireRole(role: AuthRole) {
  const routeSupabase = await createSupabaseRouteClient();
  const { data: userData, error: userError } = await routeSupabase.auth.getUser();

  if (userError || !userData.user) {
    throw new RouteAccessError("Debes iniciar sesion.", 401);
  }

  const adminSupabase = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await adminSupabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", userData.user.id)
    .maybeSingle<{ role: AuthRole | "viewer"; full_name: string | null }>();

  if (profileError || !profile || (role !== "delegate" && profile.role !== role)) {
    throw new RouteAccessError("No tienes permisos para esta accion.", 403);
  }

  if (role === "delegate" && profile.role !== "delegate" && profile.role !== "admin") {
    throw new RouteAccessError("No tienes permisos para esta accion.", 403);
  }

  return {
    supabase: adminSupabase,
    user: userData.user,
    profile
  };
}

export function routeError(error: unknown, fallback: string) {
  if (error instanceof RouteAccessError) {
    return Response.json({ ok: false, error: error.message }, { status: error.status });
  }

  console.error(fallback, error);
  return Response.json({ ok: false, error: fallback }, { status: 500 });
}
