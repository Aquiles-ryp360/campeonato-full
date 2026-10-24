import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canRoleAccess, loginPathFor, normalizeRouteRole, requiredRoleForPath, roleHomePath } from "./lib/route-access";

type ProfileRoleRow = {
  role: string;
};

export async function middleware(request: NextRequest) {
  const requiredRole = requiredRoleForPath(request.nextUrl.pathname);

  if (!requiredRole || !hasSupabaseAuthEnv()) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers
            }
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    if (isApiPath(request)) return apiDenied(401);
    return redirectTo(request, loginPathFor(request.nextUrl.pathname));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<ProfileRoleRow>();

  if (profileError) {
    return redirectTo(request, loginPathFor(request.nextUrl.pathname));
  }

  const role = normalizeRouteRole(profile?.role);

  if (!canRoleAccess(role, requiredRole)) {
    if (isApiPath(request)) return apiDenied(403);
    return redirectTo(request, roleHomePath(role));
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/delegado/:path*",
    "/arbitro/:path*",
    "/c/:slug/fixture/:path*",
    "/c/:slug/bases/:path*",
    "/imprimir/:path*",
    "/api/matches/:path*",
    "/api/teams/:path*"
  ]
};

function isApiPath(request: NextRequest) {
  return request.nextUrl.pathname.startsWith("/api/");
}

function apiDenied(status: 401 | 403) {
  return NextResponse.json(
    { ok: false, error: "Disponible solo para equipos inscritos." },
    { status }
  );
}

function hasSupabaseAuthEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}
