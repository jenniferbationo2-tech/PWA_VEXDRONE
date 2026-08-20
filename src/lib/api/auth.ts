const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const USE_MOCK = import.meta.env.VITE_USE_MOCKS === "true";
// Le token CSRF vit en mémoire, pas dans un cookie lisible par JS.
// Le backend le retourne dans le corps de /auth/login (et, si présent, de tout
// autre endpoint authentifié — voir captureCsrfToken). Il est donc perdu à
// chaque rechargement de page : c'est ce qui provoque les 403 sur les
// POST/PUT/PATCH/DELETE si l'utilisateur recharge après connexion.
let csrfToken: string | null = null;

export function getStoredCsrfToken(): string | null {
  return csrfToken;
}

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

// Capture opportuniste : si un endpoint authentifié (ex. /users/me) renvoie
// un csrf_token dans son corps de réponse, on le récupère au passage — ça
// permet de récupérer un token perdu après reload sans forcer une reconnexion,
// le jour où le backend le fournit sur plus d'un endpoint.
export function captureCsrfToken(data: unknown): void {
  if (data && typeof data === "object" && "csrf_token" in data) {
    const token = (data as { csrf_token?: unknown }).csrf_token;
    if (typeof token === "string" && token) csrfToken = token;
  }
}

const AUTH_EXPIRED_EVENT = "vexdrone:auth-expired";

// Signale une session invalide côté client (typiquement : 403 sur une requête
// protégée par CSRF, donc token manquant/périmé). AuthContext s'abonne pour
// vider l'utilisateur courant, ce qui fait rediriger ProtectedRoute vers /connexion.
export function notifyAuthExpired(): void {
  csrfToken = null;
  sessionStorage.setItem("vexdrone_session_expired", "1");
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

export function onAuthExpired(handler: () => void): () => void {
  window.addEventListener(AUTH_EXPIRED_EVENT, handler);
  return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handler);
}

// ---- Version mock (sans backend) ----
async function mockLogin(username: string, password: string) {
  await new Promise((r) => setTimeout(r, 500));
  if (!username || !password) throw new Error("Identifiants incorrects");
  sessionStorage.setItem("vexdrone_mock_user", username);
}

async function mockLogout() {
  sessionStorage.removeItem("vexdrone_mock_user");
}

async function mockGetMe() {
  const username = sessionStorage.getItem("vexdrone_mock_user");
  if (!username) throw new Error("Non authentifié");
  return { username };
}

// ---- Version réelle (avec backend FastAPI) ----
async function realLogin(username: string, password: string) {
  const body = new URLSearchParams({ username, password });

  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Identifiants incorrects");
  }

  const data = await res.json();
  csrfToken = data.csrf_token;
  return data;
}

async function realLogout() {
  await fetch(`${BASE_URL}/api/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRF-Token": csrfToken ?? "" },
  });
  csrfToken = null;
}

async function realGetMe() {
  const res = await fetch(`${BASE_URL}/api/v1/users/me`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Non authentifié");
  const data = await res.json();
  captureCsrfToken(data);
  return data;
}

// ---- Export unique, le reste de l'app ne sait pas laquelle est active ----
export const login = USE_MOCK ? mockLogin : realLogin;
export const logout = USE_MOCK ? mockLogout : realLogout;
export const getMe = USE_MOCK ? mockGetMe : realGetMe;