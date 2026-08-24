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

export interface ProfileUpdateInput {
  name?: string;
  email?: string;
  organisation?: string;
  zone?: string;
}

// ---- Version mock (sans backend) ----
const MOCK_PROFILE_KEY = "vexdrone_mock_profile";

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
  const profile = JSON.parse(localStorage.getItem(MOCK_PROFILE_KEY) ?? "{}");
  return { username, ...profile };
}

async function mockUpdateProfile(input: ProfileUpdateInput) {
  await new Promise((r) => setTimeout(r, 400));
  const current = JSON.parse(localStorage.getItem(MOCK_PROFILE_KEY) ?? "{}");
  const updated = { ...current, ...input };
  localStorage.setItem(MOCK_PROFILE_KEY, JSON.stringify(updated));
  return updated;
}

async function mockChangePassword(currentPassword: string, newPassword: string) {
  await new Promise((r) => setTimeout(r, 400));
  if (!currentPassword || newPassword.length < 8) throw new Error("Mot de passe invalide");
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

// BLOQUANT BACKEND : pas de contrat confirmé pour ces deux endpoints (aucun
// BackendUser dans backendTypes.ts, contrairement aux missions/anomalies).
// Chemins REST plausibles en attendant confirmation par l'équipe backend.
async function realUpdateProfile(input: ProfileUpdateInput) {
  const res = await fetch(`${BASE_URL}/api/v1/users/me`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken ?? "" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Impossible de mettre à jour le profil");
  }
  const data = await res.json();
  captureCsrfToken(data);
  return data;
}

async function realChangePassword(currentPassword: string, newPassword: string) {
  const res = await fetch(`${BASE_URL}/api/v1/auth/change-password`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken ?? "" },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Impossible de modifier le mot de passe");
  }
}

// L'avatar n'a aucun équivalent côté API (pas de stockage d'image utilisateur
// prévu) : conservé en local, que l'app tourne en mock ou contre le vrai
// backend — même logique que analyzeMedia dans client.ts.
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.readAsDataURL(file);
  });
}

async function localUpdateAvatar(username: string, file: File): Promise<{ avatarUrl: string }> {
  const avatarUrl = await fileToDataUrl(file);
  localStorage.setItem(`vexdrone_avatar_${username}`, avatarUrl);
  return { avatarUrl };
}

function localGetAvatar(username: string): string | null {
  return localStorage.getItem(`vexdrone_avatar_${username}`);
}

// Recupere un jeton CSRF perdu (ex: apres un rechargement de page) a partir
// du cookie de session, qui lui survit au reload. Cet endpoint ne demande
// pas de CSRF lui-meme — c'est le seul moyen de se rattraper sans repasser
// par un vrai login, qui echouerait par-dessus une session encore active.
// A appeler au demarrage, avant qu'une requete protegee ne declenche un 403.
export async function refreshCsrfToken(): Promise<void> {
  if (USE_MOCK) return;
  const res = await fetch(`${BASE_URL}/api/v1/auth/refresh-csrf`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return;
  const data = await res.json();
  captureCsrfToken(data);
}

// ---- Export unique, le reste de l'app ne sait pas laquelle est active ----
export const login = USE_MOCK ? mockLogin : realLogin;
export const logout = USE_MOCK ? mockLogout : realLogout;
export const updateProfile = USE_MOCK ? mockUpdateProfile : realUpdateProfile;
export const changePassword = USE_MOCK ? mockChangePassword : realChangePassword;

export async function getMe() {
  const me = await (USE_MOCK ? mockGetMe() : realGetMe());
  const avatarUrl = localGetAvatar(me.username);
  return avatarUrl ? { ...me, avatarUrl } : me;
}

export async function updateAvatar(username: string, file: File) {
  return localUpdateAvatar(username, file);
}