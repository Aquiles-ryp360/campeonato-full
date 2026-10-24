export type RouteAuthRole = "admin" | "delegate" | "referee" | "viewer";
// "member": cualquier participante con cuenta (delegado, arbitro o admin).
export type ProtectedRouteRole = Exclude<RouteAuthRole, "viewer"> | "member";

const protectedRouteRules: Array<{ prefix: string; role: ProtectedRouteRole }> = [
  { prefix: "/admin", role: "admin" },
  { prefix: "/delegado", role: "delegate" },
  { prefix: "/arbitro", role: "referee" }
];

// Informacion del campeonato reservada a equipos inscritos.
const memberRoutePatterns = [
  /^\/c\/[^/]+\/(fixture|bases)(\/|$)/,
  /^\/imprimir(\/|$)/,
  /^\/api\/(matches|teams)(\/|$)/
];

export function requiredRoleForPath(pathname: string): ProtectedRouteRole | null {
  const rule = protectedRouteRules.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (rule) return rule.role;
  return memberRoutePatterns.some((pattern) => pattern.test(pathname)) ? "member" : null;
}

export function canRoleAccess(role: RouteAuthRole | null | undefined, requiredRole: ProtectedRouteRole) {
  if (!role) return false;
  if (role === "admin") return true;
  if (requiredRole === "member") return role === "delegate" || role === "referee";
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
