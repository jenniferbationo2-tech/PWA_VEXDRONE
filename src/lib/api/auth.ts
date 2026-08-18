const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const USE_MOCK = !import.meta.env.VITE_API_BASE_URL;

// Jetons en memoire (jamais localStorage) : perdus au rechargement de page,
// mais un header Authorization n'est jamais soumis a SameSite, contrairement
// au cookie de session utilise avant. Frontend et backend n'ont plus besoin
// d'etre sur la meme adresse pour que l'auth fonctionne.
let accessToken: string | null = null;
let refreshToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
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

  const res = await fetch(`${BASE_URL}/api/v1/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.detail ?? "Identifiants incorrects");
  }

  const data = await res.json();
  accessToken = data.access_token;
  refreshToken = data.refresh_token ?? null;
  return data;
}

async function realLogout() {
  // Jeton stateless : rien a revoquer cote serveur, on oublie juste le jeton.
  accessToken = null;
  refreshToken = null;
}

async function realGetMe() {
  const res = await fetch(`${BASE_URL}/api/v1/users/me`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!res.ok) throw new Error("Non authentifié");
  return res.json();
}

// Renouvelle le jeton d'acces expire a partir du refresh token garde en
// memoire. Utilise par client.ts pour rejouer une requete apres un 401.
export async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;
  const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    accessToken = null;
    refreshToken = null;
    return false;
  }
  const data = await res.json();
  accessToken = data.access_token;
  return true;
}

// ---- Export unique, le reste de l'app ne sait pas laquelle est active ----
export const login = USE_MOCK ? mockLogin : realLogin;
export const logout = USE_MOCK ? mockLogout : realLogout;
export const getMe = USE_MOCK ? mockGetMe : realGetMe;
