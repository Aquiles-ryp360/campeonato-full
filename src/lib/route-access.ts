export type RouteAuthRole = "admin" | "delegate" | "referee" | "viewer";
export type ProtectedRouteRole = Exclude<RouteAuthRole, "viewer">;

const protectedRouteRules: Array<{ prefix: string; role: ProtectedRouteRole }> = [
  { prefix: "/admin", role: "admin" },
  { prefix: "/delegado", role: "delegate" },
  { prefix: "/arbitro", role: "referee" }
];

export function requiredRoleForPath(pathname: string): ProtectedRouteRole | null {
  return protectedRouteRules.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.role ?? null;
}

export function canRoleAccess(role: RouteAuthRole | null | undefined, requiredRole: ProtectedRouteRole) {
  if (!role) return false;
  if (role === "admin") return true;
  return role === requiredRole;
}

export function normalizeRouteRole(value: string | null | undefined): RouteAuthRole {
  if (value === "admin" || value === "delegate" || value === "referee" || value === "viewer") {
    return value;
  }

  return "viewer";
}

export function roleHomePath(role: RouteAuthRole | null | undefined) {
  if (role === "admin") return "/admin";
  if (role === "delegate") return "/delegado";
  if (role === "referee") return "/arbitro";
  return "/";
}

export function loginPathFor(pathname: string) {
  const params = new URLSearchParams();
  if (pathname !== "/") params.set("next", pathname);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}
