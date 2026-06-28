import { NextResponse } from "next/server";
import { resolveOAuthAccess } from "@/lib/oauth-access";
import { createSupabaseRouteClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return redirectToLogin(requestUrl, "oauth_missing_code", nextPath);
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseRouteClient>>;

  try {
    supabase = await createSupabaseRouteClient();
  } catch {
    return redirectToLogin(requestUrl, "supabase_not_configured", nextPath);
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return redirectToLogin(requestUrl, "oauth_exchange_failed", nextPath);
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    await supabase.auth.signOut();
    return redirectToLogin(requestUrl, "oauth_user_missing", nextPath);
  }

  try {
    const access = await resolveOAuthAccess(userData.user);

    if (!access.ok) {
      await supabase.auth.signOut();
      return redirectToLogin(requestUrl, access.reason, nextPath);
    }

    return NextResponse.redirect(new URL(resolveDestination(access.role, nextPath), requestUrl.origin));
  } catch (error) {
    console.error("OAuth access resolution failed", error);
    await supabase.auth.signOut();
    return redirectToLogin(requestUrl, "oauth_access_failed", nextPath);
  }
}

function redirectToLogin(requestUrl: URL, error: string, nextPath: string) {
  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("error", error);

  if (nextPath !== "/") {
    loginUrl.searchParams.set("next", nextPath);
  }

  return NextResponse.redirect(loginUrl);
}

function resolveDestination(role: "admin" | "delegate", nextPath: string) {
  if (
    role === "admin" &&
    (nextPath.startsWith("/admin") || nextPath.startsWith("/delegado") || nextPath === "/equipo")
  ) {
    return nextPath;
  }

  if (role === "delegate" && (nextPath.startsWith("/delegado") || nextPath === "/equipo")) {
    return nextPath;
  }

  return role === "admin" ? "/admin" : "/delegado";
}

function sanitizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}
