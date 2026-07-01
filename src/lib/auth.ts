export type AuthRole = "admin" | "delegate" | "viewer";
export type ProtectedAuthRole = Exclude<AuthRole, "viewer">;

export interface AuthSession {
  role: AuthRole;
  username: string;
  displayName: string;
  createdAt: string;
}

export interface DelegateAccess {
  email: string;
  provider: "google";
  loginUrl: string;
}

const sessionKey = "campeonato.session";
export const sessionChangeEvent = "campeonato.session-change";

export const demoAdminCredentials = {
  username: "admin",
  password: "admin123"
};

export const demoDelegateCredentials = {
  username: "delegado",
  password: "delegado123"
};

export function createSession(
  role: AuthRole,
  username: string,
  displayName: string,
  createdAt = new Date().toISOString()
): AuthSession {
  return {
    role,
    username,
    displayName,
    createdAt
  };
}

export function getStoredSession() {
  if (typeof window === "undefined") return null;

  const rawSession = window.localStorage.getItem(sessionKey);
  if (!rawSession) return null;

  try {
    return JSON.parse(rawSession) as AuthSession;
  } catch {
    window.localStorage.removeItem(sessionKey);
    return null;
  }
}

export function storeSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  const nextSession = JSON.stringify(session);
  if (window.localStorage.getItem(sessionKey) === nextSession) return;
  window.localStorage.setItem(sessionKey, nextSession);
  window.dispatchEvent(new Event(sessionChangeEvent));
}

export function clearStoredSession() {
  if (typeof window === "undefined") return;
  if (!window.localStorage.getItem(sessionKey)) return;
  window.localStorage.removeItem(sessionKey);
  window.dispatchEvent(new Event(sessionChangeEvent));
}

export function canAccess(session: AuthSession | null, requiredRole: ProtectedAuthRole) {
  if (!session) return false;
  if (session.role === "admin") return true;
  return requiredRole === "delegate" && session.role === "delegate";
}

export function loginWithCredentials(usernameInput: string, passwordInput: string) {
  const username = usernameInput.trim();
  const password = passwordInput.trim();

  if (username === demoAdminCredentials.username && password === demoAdminCredentials.password) {
    return createSession("admin", username, "Administrador demo");
  }

  if (
    username === demoDelegateCredentials.username &&
    password === demoDelegateCredentials.password
  ) {
    return createSession("delegate", username, "Delegado demo");
  }

  return null;
}
