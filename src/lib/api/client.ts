import type { Anomaly, DashboardSummary, Flight, MediaAnalysisJob, Mission, NewMissionInput, Report } from "./types";
import { mockDashboardSummary, mockMissions, mockReports, mockAnomalies, mockFlight } from "./mockData";
import { captureCsrfToken, getStoredCsrfToken, notifyAuthExpired } from "./auth";
import { toAnomaly, toBackendMissionStatus, toMission } from "./mappers";
import type { BackendAnomaly, BackendDashboardStats, BackendMission } from "./backendTypes";
import { getMockAnalysisJob, startMockAnalysisJob } from "./mediaAnalysisMock";
import { fetchCurrentWeather } from "./weather";

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function delay<T>(data: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

const CSRF_PROTECTED_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const isCsrfProtected = CSRF_PROTECTED_METHODS.includes(method);
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (isCsrfProtected) {
    const token = getStoredCsrfToken();
    if (token) headers.set("X-CSRF-Token", token);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    // Un 403 protegeant du CSRF porte le header X-CSRF-Error : c'est le seul
    // cas ou le jeton (garde en memoire, perdu au reload) manque vraiment, et
    // ou forcer une reconnexion a du sens. Un 403 de permission ("cette
    // mission ne vous appartient pas") est un 403 tout aussi valide mais n'a
    // rien a voir avec la session — ne pas le confondre avec l'autre.
    if (isCsrfProtected && res.headers.get("X-CSRF-Error") === "true") notifyAuthExpired();
    throw new Error(`API error ${res.status} on ${path}`);
  }
  if (res.status === 204) return undefined as T;

  const data = await res.json();
  captureCsrfToken(data);
  return data;
}

function missionPayload(input: NewMissionInput) {
  return {
    titre: input.name,
    zone: input.zone,
    date_mission: input.dateDebut,
    statut: toBackendMissionStatus(input.status),
    description: input.description,
  };
}

// Les stats d'anomalies n'ont pas d'endpoint dedie : recalculees cote client
// a partir de /anomalies/. Le module drone expose lui /dashboard/stats pour
// le reste (flotte, vols du jour, delta alertes critiques).
async function computeAnomalyStats() {
  const raw = await apiFetch<{ data: BackendAnomaly[] }>("/api/v1/anomalies/?items_per_page=100");
  const anomalies = raw.data.map((a) => toAnomaly(a));

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
    if (USE_MOCKS) return delay(mockMissions);
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
      body: JSON.stringify(missionPayload(input)),
    });
    return toMission(raw);
  },

  updateMission: async (id: string, input: NewMissionInput): Promise<Mission> => {
    if (USE_MOCKS) {
      const index = mockMissions.findIndex((m) => m.id === id);
      if (index === -1) throw new Error("Mission introuvable");
      mockMissions[index] = { ...input, id };
      return delay(mockMissions[index], 400);
    }
    // Le PATCH renvoie 204 sans corps : on relit la mission a jour ensuite.
    await apiFetch<void>(`/api/v1/missions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(missionPayload(input)),
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

  // Pas encore d'endpoint rapports cote backend : reste mocke meme en mode reel.
  getReports: (): Promise<Report[]> => delay(mockReports),

  getAnomalies: async (): Promise<Anomaly[]> => {
    if (USE_MOCKS) return delay(mockAnomalies);
    const raw = await apiFetch<{ data: BackendAnomaly[] }>("/api/v1/anomalies/");
    return raw.data.map((a) => toAnomaly(a));
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
    return toAnomaly(raw);
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

  // Pas encore d'endpoint vol actif cote backend : reste mocke meme en mode reel.
  getActiveFlight: (): Promise<Flight> => {
    mockFlight.imagesCaptured += Math.floor(Math.random() * 2);
    mockFlight.battery = Math.max(5, mockFlight.battery - (Math.random() < 0.3 ? 1 : 0));
    mockFlight.gps = {
      lat: mockFlight.gps.lat + (Math.random() - 0.5) * 0.0006,
      lng: mockFlight.gps.lng + (Math.random() - 0.5) * 0.0006,
    };
    return delay(mockFlight, 150);
  },
};
