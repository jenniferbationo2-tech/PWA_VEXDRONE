const BASE_URL = "http://127.0.0.1:8000/api/v1";
const USE_MOCK = import.meta.env.VITE_USE_MOCK_AUTH === "true";

function getCsrfToken(): string | null {
  const match = document.cookie.match(/fastapi-csrf-token=([^;]+)/);
  return match ? match[1] : null;
}

// ---- Version mock (sans backend) ----
async function mockLogin(username: string, password: string) {
  await new Promise((r) => setTimeout(r, 500)); // simule la latence réseau
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
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Identifiants incorrects");
  return res.json();
}

async function realLogout() {
  await fetch(`${BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRF-Token": getCsrfToken() ?? "" },
  });
}

async function realGetMe() {
  const res = await fetch(`${BASE_URL}/auth/me`, { credentials: "include" });
  if (!res.ok) throw new Error("Non authentifié");
  return res.json();
}

// ---- Export unique, le reste de l'app ne sait pas laquelle est active ----
export const login = USE_MOCK ? mockLogin : realLogin;
export const logout = USE_MOCK ? mockLogout : realLogout;
export const getMe = USE_MOCK ? mockGetMe : realGetMe;