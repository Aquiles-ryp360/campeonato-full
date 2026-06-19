export type AuthRole = "admin" | "delegate";

export interface AuthSession {
  role: AuthRole;
  username: string;
  displayName: string;
  createdAt: string;
}

export interface DelegateCredentials {
  username: string;
  password: string;
}

const sessionKey = "campeonato.session";
const delegateCredentialsKey = "campeonato.delegate.credentials";

export const demoAdminCredentials = {
  username: "admin",
  password: "admin123"
};

export const demoDelegateCredentials = {
  username: "delegado",
  password: "delegado123"
};

export function createSession(role: AuthRole, username: string, displayName: string): AuthSession {
  return {
    role,
    username,
    displayName,
    createdAt: new Date().toISOString()
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
  window.localStorage.setItem(sessionKey, JSON.stringify(session));
}

export function clearStoredSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(sessionKey);
}

export function canAccess(session: AuthSession | null, requiredRole: AuthRole) {
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

  const generatedCredential = getGeneratedDelegateCredentials().find(
    (credential) => credential.username === username && credential.password === password
  );

  if (generatedCredential) {
    return createSession("delegate", username, "Delegado inscrito");
  }

  return null;
}

export function generateDelegateCredentials(teamName: string, registrationCode: string) {
  const teamSlug = slugifyCredential(teamName) || "equipo";
  const codeSlug = slugifyCredential(registrationCode).toUpperCase() || "CODIGO";

  return {
    username: `del-${teamSlug.slice(0, 18)}`,
    password: `${codeSlug.slice(0, 18)}`
  };
}

export function rememberGeneratedDelegateCredentials(credentials: DelegateCredentials) {
  if (typeof window === "undefined") return;

  const existing = getGeneratedDelegateCredentials();
  const next = [
    ...existing.filter((credential) => credential.username !== credentials.username),
    credentials
  ];

  window.localStorage.setItem(delegateCredentialsKey, JSON.stringify(next));
}

function getGeneratedDelegateCredentials() {
  if (typeof window === "undefined") return [];

  const rawCredentials = window.localStorage.getItem(delegateCredentialsKey);
  if (!rawCredentials) return [];

  try {
    return JSON.parse(rawCredentials) as DelegateCredentials[];
  } catch {
    window.localStorage.removeItem(delegateCredentialsKey);
    return [];
  }
}

function slugifyCredential(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
