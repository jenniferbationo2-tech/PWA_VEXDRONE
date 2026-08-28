import type {
  Anomaly,
  DashboardSummary,
  Drone,
  Entreprise,
  Flight,
  MediaAnalysisJob,
  Mission,
  NewAdminInput,
  NewMissionInput,
  PlatformUser,
  Report,
} from "./types";
import {
  mockDashboardSummary,
  mockDrones,
  mockEntreprises,
  mockMissions,
  mockPlatformUsers,
  mockReports,
  mockAnomalies,
  mockFlight,
} from "./mockData";
import { captureCsrfToken, getStoredCsrfToken, notifyAuthExpired } from "./auth";
import { toAnomaly, toBackendMissionStatus, toDrone, toEntreprise, toFlight, toMission, toPlatformUser, toReport } from "./mappers";
import type {
  BackendAnomaly,
  BackendDashboardStats,
  BackendDrone,
  BackendEntreprise,
  BackendImage,
  BackendMission,
  BackendPlatformUser,
  BackendReport,
  BackendVol,
} from "./backendTypes";
import { getMockAnalysisJob, startMockAnalysisJob } from "./mediaAnalysisMock";
import { fetchCurrentWeather } from "./weather";

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function delay<T>(data: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

const CSRF_PROTECTED_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

// FastAPI renvoie soit {"detail": "message"} (erreurs metier : 401/403/409...),
// soit {"detail": [{"loc": [...], "msg": "..."}]} pour les erreurs de
// validation Pydantic (422) — les deux formes sont a gerer, sinon un echec
// de validation affiche juste "[object Object]".
function extractErrorDetail(body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e === "object" && "msg" in e ? String((e as { msg: unknown }).msg) : String(e)))
      .join(" · ");
  }
  return "Erreur inattendue";
}

// Sans timeout, un fetch() qui ne recoit jamais de reponse (backend bloque,
// proxy qui stalle) laisse React Query en isLoading pour toujours — ni retry
// ni erreur affichee, puisque la promesse ne se resout jamais. 65s : le cold
// start Render observe en pratique est alle jusqu'a ~60s, un timeout plus
// court couperait des requetes qui auraient fini par reussir.
const REQUEST_TIMEOUT_MS = 65_000;

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const isCsrfProtected = CSRF_PROTECTED_METHODS.includes(method);
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (isCsrfProtected) {
    const token = getStoredCsrfToken();
    if (token) headers.set("X-CSRF-Token", token);
  }

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
    signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
  }).catch((err) => {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new Error(`Le serveur ne répond pas (délai dépassé) sur ${path}`);
    }
    throw err;
  });

  if (!res.ok) {
    // Un 403 protegeant du CSRF porte le header X-CSRF-Error : c'est le seul
    // cas ou le jeton (garde en memoire, perdu au reload) manque vraiment, et
    // ou forcer une reconnexion a du sens. Un 403 de permission ("cette
    // mission ne vous appartient pas") est un 403 tout aussi valide mais n'a
    // rien a voir avec la session — ne pas le confondre avec l'autre.
    if (isCsrfProtected && res.headers.get("X-CSRF-Error") === "true") notifyAuthExpired();
    throw new Error(`${extractErrorDetail(await res.json().catch(() => null))} (${res.status})`);
  }
  if (res.status === 204) return undefined as T;

  const data = await res.json();
  captureCsrfToken(data);
  return data;
}

// appareil/drone_uuid : fixés à la création uniquement, absents de
// MissionUpdate (confirmé sur le schéma live) — deux payloads distincts pour
// ne pas risquer de les envoyer sur un PATCH.
function missionCreatePayload(input: NewMissionInput) {
  return {
    titre: input.name,
    zone: input.zone,
    date_debut: input.dateDebut,
    date_fin: input.dateFin,
    appareil: input.appareil,
    drone_uuid: input.appareil === "drone" ? input.droneId : undefined,
    statut: toBackendMissionStatus(input.status),
    description: input.description,
  };
}

function missionUpdatePayload(input: NewMissionInput) {
  return {
    titre: input.name,
    zone: input.zone,
    date_debut: input.dateDebut,
    date_fin: input.dateFin,
    statut: toBackendMissionStatus(input.status),
    description: input.description,
  };
}

// La position GPS et la mission d'une anomalie vivent sur l'image associee,
// pas sur l'anomalie elle-meme (voir toAnomaly) — /anomalies/ ne renvoie que
// image_uuid. Un aller simple par image distincte (dedupliquee, en
// parallele) pour recuperer lat/lng/mission_uuid.
async function fetchAnomaliesWithImages(itemsPerPage = 20): Promise<Anomaly[]> {
  const raw = await apiFetch<{ data: BackendAnomaly[] }>(`/api/v1/anomalies/?items_per_page=${itemsPerPage}`);
  const imageUuids = [...new Set(raw.data.map((a) => a.image_uuid))];
  const images = await Promise.all(
    imageUuids.map((uuid) => apiFetch<BackendImage>(`/api/v1/images/${uuid}`).catch(() => null))
  );
  const imageByUuid = new Map(images.filter((i): i is BackendImage => i !== null).map((i) => [i.uuid, i]));
  return raw.data.map((a) => toAnomaly(a, imageByUuid.get(a.image_uuid)));
}

// Les stats d'anomalies n'ont pas d'endpoint dedie : recalculees cote client
// a partir de /anomalies/. Le module drone expose lui /dashboard/stats pour
// le reste (flotte, vols du jour, delta alertes critiques).
async function computeAnomalyStats() {
  const anomalies = await fetchAnomaliesWithImages(100);

  const severityBreakdown: DashboardSummary["severityBreakdown"] = (["eleve", "moyen", "faible"] as const).map(
    (severity) => ({ severity, count: anomalies.filter((a) => a.severity === severity).length })
  );

  const trendByDay = new Map<string, number>();
  for (const a of anomalies) {
    const day = a.detectedAt.slice(0, 10);
    trendByDay.set(day, (trendByDay.get(day) ?? 0) + 1);
  }
  const anomaliesTrend = [...trendByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const recentAlerts = [...anomalies].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt)).slice(0, 5);

  return {
    criticalAlerts: anomalies.filter((a) => a.severity === "eleve" && a.status === "non_traitee").length,
    anomaliesResolved: anomalies.filter((a) => a.status === "traitee").length,
    anomaliesResolvedTotal: anomalies.length,
    severityBreakdown,
    anomaliesTrend,
    recentAlerts,
  };
}

export const api = {
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    if (USE_MOCKS) return delay(mockDashboardSummary);
    const [stats, fleet] = await Promise.all([
      computeAnomalyStats(),
      apiFetch<BackendDashboardStats>("/api/v1/dashboard/stats"),
    ]);
    return {
      flightsToday: fleet.flights_today,
      flightsTodayDelta: 0, // pas d'historique j-1 sur les vols cote backend
      fleetTotal: fleet.fleet_total,
      fleetActive: fleet.fleet_active,
      fleetAvailability:
        fleet.fleet_total > 0 ? Math.round((fleet.fleet_availability / fleet.fleet_total) * 100) : 0,
      criticalAlertsDelta: fleet.critical_alerts_delta,
      ...stats,
    };
  },

  getMissions: async (): Promise<Mission[]> => {
    // Copie superficielle : mockMissions est mutée en place par create/update/delete,
    // renvoyer la même référence empêcherait React Query (structural sharing) de
    // détecter un changement après invalidateQueries et de re-render.
    if (USE_MOCKS) return delay([...mockMissions]);
    const raw = await apiFetch<{ data: BackendMission[] }>("/api/v1/missions/");
    return raw.data.map(toMission);
  },

  createMission: async (input: NewMissionInput): Promise<Mission> => {
    if (USE_MOCKS) {
      const newMission: Mission = { ...input, id: `m-${Date.now()}` };
      mockMissions.unshift(newMission);
      return delay(newMission, 400);
    }
    const raw = await apiFetch<BackendMission>("/api/v1/missions/", {
      method: "POST",
      body: JSON.stringify(missionCreatePayload(input)),
    });
    return toMission(raw);
  },

  updateMission: async (id: string, input: NewMissionInput): Promise<Mission> => {
    if (USE_MOCKS) {
      const index = mockMissions.findIndex((m) => m.id === id);
      if (index === -1) throw new Error("Mission introuvable");
      // appareil/droneId ne sont pas modifiables : on garde ceux de la mission existante.
      mockMissions[index] = { ...input, id, appareil: mockMissions[index].appareil, droneId: mockMissions[index].droneId };
      return delay(mockMissions[index], 400);
    }
    // Le PATCH renvoie 204 sans corps : on relit la mission a jour ensuite.
    await apiFetch<void>(`/api/v1/missions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(missionUpdatePayload(input)),
    });
    const raw = await apiFetch<BackendMission>(`/api/v1/missions/${id}`);
    return toMission(raw);
  },

  deleteMission: async (id: string): Promise<void> => {
    if (USE_MOCKS) {
      const index = mockMissions.findIndex((m) => m.id === id);
      if (index === -1) throw new Error("Mission introuvable");
      mockMissions.splice(index, 1);
      return delay(undefined, 300);
    }
    await apiFetch<void>(`/api/v1/missions/${id}`, { method: "DELETE" });
  },

  getDrones: async (): Promise<Drone[]> => {
    if (USE_MOCKS) return delay([...mockDrones]);
    const raw = await apiFetch<{ data: BackendDrone[] }>("/api/v1/drones/");
    return raw.data.map(toDrone);
  },

  getReports: async (): Promise<Report[]> => {
    if (USE_MOCKS) return delay(mockReports);
    const raw = await apiFetch<{ data: BackendReport[] }>("/api/v1/reports/?items_per_page=100");
    return raw.data.map(toReport);
  },

  getAnomalies: async (): Promise<Anomaly[]> => {
    if (USE_MOCKS) return delay(mockAnomalies);
    return fetchAnomaliesWithImages();
  },

  markAnomalyTreated: async (id: string): Promise<Anomaly> => {
    if (USE_MOCKS) {
      const anomaly = mockAnomalies.find((a) => a.id === id);
      if (!anomaly) throw new Error("Anomaly not found");
      anomaly.status = "traitee";
      return delay(anomaly);
    }
    await apiFetch<void>(`/api/v1/anomalies/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ validee_par_humain: true }),
    });
    const raw = await apiFetch<BackendAnomaly>(`/api/v1/anomalies/${id}`);
    const image = await apiFetch<BackendImage>(`/api/v1/images/${raw.image_uuid}`).catch(() => undefined);
    return toAnomaly(raw, image);
  },

  // Pas encore d'endpoint upload/analyse media cote backend : reste mocke meme en mode reel.
  analyzeMedia: async (files: File[]): Promise<MediaAnalysisJob> => {
    return delay(startMockAnalysisJob(files.length), 200);
  },

  getMediaAnalysisJob: async (jobId: string): Promise<MediaAnalysisJob> => {
    return delay(getMockAnalysisJob(jobId), 150);
  },

  // Meteo temps reel via Open-Meteo (voir weather.ts) : externe au backend VEXDRONE.
  getWeather: fetchCurrentWeather,

  getActiveFlight: async (): Promise<Flight> => {
    if (USE_MOCKS) {
      mockFlight.imagesCaptured += Math.floor(Math.random() * 2);
      mockFlight.battery = Math.max(5, mockFlight.battery - (Math.random() < 0.3 ? 1 : 0));
      mockFlight.gps = {
        lat: mockFlight.gps.lat + (Math.random() - 0.5) * 0.0006,
        lng: mockFlight.gps.lng + (Math.random() - 0.5) * 0.0006,
      };
      return delay(mockFlight, 150);
    }
    // Pas de vol "global" cote backend : un vol est rattache a une mission.
    // On prend la mission en_cours et on regarde si elle a un vol actif.
    const missions = await apiFetch<{ data: BackendMission[] }>("/api/v1/missions/");
    const activeMission = missions.data.find((m) => m.statut === "en_cours");
    if (!activeMission) throw new Error("Aucune mission en cours");
    const raw = await apiFetch<BackendVol>(`/api/v1/vols/actif?mission_uuid=${activeMission.uuid}`);
    return toFlight(raw);
  },

  // POST /vols/ passe directement le vol en "en_cours" — même moment que le
  // clic sur "Lancer" une mission (drone ou téléphone, les deux ont un Vol).
  startFlight: async (missionId: string): Promise<Flight> => {
    if (USE_MOCKS) {
      mockFlight.missionId = missionId;
      mockFlight.status = "en_cours";
      mockFlight.imagesCaptured = 0;
      mockFlight.battery = 100;
      return delay(mockFlight, 300);
    }
    const raw = await apiFetch<BackendVol>("/api/v1/vols/", {
      method: "POST",
      body: JSON.stringify({ mission_uuid: missionId }),
    });
    return toFlight(raw);
  },

  endFlight: async (flightId: string): Promise<void> => {
    if (USE_MOCKS) {
      mockFlight.status = "terminee";
      return delay(undefined, 300);
    }
    await apiFetch<void>(`/api/v1/vols/${flightId}`, {
      method: "PATCH",
      body: JSON.stringify({ statut: "terminee" }),
    });
  },

  // multipart/form-data : ne peut pas passer par apiFetch, qui force
  // Content-Type: application/json (casserait la frontière multipart).
  uploadImage: async (
    missionId: string,
    blob: Blob,
    gps?: { lat: number; lng: number }
  ): Promise<{ id: string }> => {
    if (USE_MOCKS) return delay({ id: `img-${Date.now()}` }, 200);

    const form = new FormData();
    form.append("fichier", blob, "capture.jpg");
    form.append("mission_uuid", missionId);
    if (gps) {
      form.append("latitude", String(gps.lat));
      form.append("longitude", String(gps.lng));
    }

    const headers = new Headers();
    const token = getStoredCsrfToken();
    if (token) headers.set("X-CSRF-Token", token);

    const res = await fetch(`${BASE_URL}/api/v1/images/`, {
      method: "POST",
      credentials: "include",
      headers,
      body: form,
    });
    if (!res.ok) {
      if (res.headers.get("X-CSRF-Error") === "true") notifyAuthExpired();
      throw new Error(`${extractErrorDetail(await res.json().catch(() => null))} (${res.status})`);
    }
    const data = await res.json();
    captureCsrfToken(data);
    return { id: data.uuid };
  },

  // Synchrone côté API ; peut renvoyer 422 (moteur indisponible, ou image déjà
  // analysée) — traité comme non bloquant par l'appelant (voir doc backend §6.2).
  analyzeImage: async (imageId: string): Promise<void> => {
    if (USE_MOCKS) return delay(undefined, 200);
    await apiFetch<unknown>(`/api/v1/images/${imageId}/analyser`, { method: "POST" });
  },

  // Tous les champs sont optionnels côté API (mise à jour partielle) —
  // JSON.stringify élague déjà les clés undefined.
  updateFlightTelemetry: async (
    flightId: string,
    patch: {
      imagesCaptured?: number;
      gps?: { lat: number; lng: number };
      battery?: number;
      connection?: "wifi" | "4g" | "hors_ligne";
    }
  ): Promise<void> => {
    if (USE_MOCKS) {
      if (patch.imagesCaptured !== undefined) mockFlight.imagesCaptured = patch.imagesCaptured;
      if (patch.gps) mockFlight.gps = patch.gps;
      if (patch.battery !== undefined) mockFlight.battery = patch.battery;
      if (patch.connection) mockFlight.droneConnection = patch.connection;
      return delay(undefined, 150);
    }
    await apiFetch<void>(`/api/v1/vols/${flightId}`, {
      method: "PATCH",
      body: JSON.stringify({
        images_capturees: patch.imagesCaptured,
        latitude: patch.gps?.lat,
        longitude: patch.gps?.lng,
        batterie: patch.battery,
        connexion_drone: patch.connection,
      }),
    });
  },

  // ---- Réservé SUPERADMIN ----

  getEntreprises: async (): Promise<Entreprise[]> => {
    if (USE_MOCKS) return delay([...mockEntreprises]);
    const raw = await apiFetch<{ data: BackendEntreprise[] }>("/api/v1/entreprises/?items_per_page=100");
    return raw.data.map(toEntreprise);
  },

  createEntreprise: async (nom: string): Promise<Entreprise> => {
    if (USE_MOCKS) {
      const entreprise: Entreprise = { id: `e-${Date.now()}`, nom, status: "active", createdAt: new Date().toISOString() };
      mockEntreprises.unshift(entreprise);
      return delay(entreprise, 400);
    }
    const raw = await apiFetch<BackendEntreprise>("/api/v1/entreprises/", {
      method: "POST",
      body: JSON.stringify({ nom }),
    });
    return toEntreprise(raw);
  },

  // Forme de retour de PATCH non confirmée (contrairement à bloquer/debloquer/
  // delete, tous les trois vérifiés en 204) — le composant appelant relit la
  // liste ensuite plutôt que de compter sur une valeur ici.
  renameEntreprise: async (id: string, nom: string): Promise<void> => {
    if (USE_MOCKS) {
      const entreprise = mockEntreprises.find((e) => e.id === id);
      if (entreprise) entreprise.nom = nom;
      return delay(undefined, 300);
    }
    await apiFetch<unknown>(`/api/v1/entreprises/${id}`, { method: "PATCH", body: JSON.stringify({ nom }) });
  },

  blockEntreprise: async (id: string): Promise<void> => {
    if (USE_MOCKS) {
      const entreprise = mockEntreprises.find((e) => e.id === id);
      if (entreprise) entreprise.status = "bloquee";
      return delay(undefined, 300);
    }
    await apiFetch<void>(`/api/v1/entreprises/${id}/bloquer`, { method: "POST" });
  },

  unblockEntreprise: async (id: string): Promise<void> => {
    if (USE_MOCKS) {
      const entreprise = mockEntreprises.find((e) => e.id === id);
      if (entreprise) entreprise.status = "active";
      return delay(undefined, 300);
    }
    await apiFetch<void>(`/api/v1/entreprises/${id}/debloquer`, { method: "POST" });
  },

  deleteEntreprise: async (id: string): Promise<void> => {
    if (USE_MOCKS) {
      const index = mockEntreprises.findIndex((e) => e.id === id);
      if (index !== -1) mockEntreprises.splice(index, 1);
      return delay(undefined, 300);
    }
    await apiFetch<void>(`/api/v1/entreprises/${id}`, { method: "DELETE" });
  },

  // GET /users/ ne filtre pas par entreprise côté API (juste la pagination) :
  // on récupère tout (items_per_page large, taille attendue faible pour ce POC)
  // et le composant appelant filtre par entrepriseId côté client.
  getPlatformUsers: async (): Promise<PlatformUser[]> => {
    if (USE_MOCKS) return delay([...mockPlatformUsers]);
    const raw = await apiFetch<{ data: BackendPlatformUser[] }>("/api/v1/users/?items_per_page=100");
    return raw.data.map(toPlatformUser);
  },

  createAdminAccount: async (input: NewAdminInput): Promise<PlatformUser> => {
    if (USE_MOCKS) {
      const user: PlatformUser = {
        id: `u-${Date.now()}`,
        name: input.name,
        username: input.username,
        email: input.email,
        role: "admin",
        entrepriseId: input.entrepriseId,
      };
      mockPlatformUsers.unshift(user);
      return delay(user, 400);
    }
    const raw = await apiFetch<BackendPlatformUser>("/api/v1/users/", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        username: input.username,
        email: input.email,
        password: input.password,
        role: "admin",
        entreprise_id: input.entrepriseId,
      }),
    });
    return toPlatformUser(raw);
  },
};
