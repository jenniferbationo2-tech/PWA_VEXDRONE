const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const USE_MOCK = import.meta.env.VITE_USE_MOCKS === "true";
// Le token CSRF vit en mémoire, pas dans un cookie lisible par JS.
// Le backend le retourne dans le corps de /auth/login, pas dans un cookie.
let csrfToken: string | null = null;

export function getStoredCsrfToken(): string | null {
  return csrfToken;
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
  return res.json();
}

// ---- Export unique, le reste de l'app ne sait pas laquelle est active ----
export const login = USE_MOCK ? mockLogin : realLogin;
export const logout = USE_MOCK ? mockLogout : realLogout;
export const getMe = USE_MOCK ? mockGetMe : realGetMe;