import type { Anomaly, DashboardSummary, Flight, Mission, NewMissionInput, Report } from "./types";
import { mockDashboardSummary, mockMissions, mockReports, mockAnomalies, mockFlight } from "./mockData";

const USE_MOCKS = !import.meta.env.VITE_API_BASE_URL;
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function delay<T>(data: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
  return res.json();
}

export const api = {
  getDashboardSummary: (): Promise<DashboardSummary> =>
    USE_MOCKS ? delay(mockDashboardSummary) : apiFetch("/api/dashboard/summary"),

  getMissions: (): Promise<Mission[]> =>
    USE_MOCKS ? delay(mockMissions) : apiFetch("/api/missions"),

  createMission: async (input: NewMissionInput): Promise<Mission> => {
    if (USE_MOCKS) {
      const newMission: Mission = { ...input, id: `m-${Date.now()}` };
      mockMissions.unshift(newMission); // ajoutée en tête de liste
      return delay(newMission, 400);
    }
    const res = await fetch(`${BASE_URL}/api/missions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Impossible de créer la mission");
    return res.json();
  },

  updateMission: async (id: string, input: NewMissionInput): Promise<Mission> => {
    if (USE_MOCKS) {
      const index = mockMissions.findIndex((m) => m.id === id);
      if (index === -1) throw new Error("Mission introuvable");
      mockMissions[index] = { ...input, id };
      return delay(mockMissions[index], 400);
    }
    const res = await fetch(`${BASE_URL}/api/missions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Impossible de modifier la mission");
    return res.json();
  },

  deleteMission: async (id: string): Promise<void> => {
    if (USE_MOCKS) {
      const index = mockMissions.findIndex((m) => m.id === id);
      if (index === -1) throw new Error("Mission introuvable");
      mockMissions.splice(index, 1);
      return delay(undefined, 300);
    }
    const res = await fetch(`${BASE_URL}/api/missions/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Impossible de supprimer la mission");
  },

  getReports: (): Promise<Report[]> =>
    USE_MOCKS ? delay(mockReports) : apiFetch("/api/reports"),

  getAnomalies: (): Promise<Anomaly[]> =>
    USE_MOCKS ? delay(mockAnomalies) : apiFetch("/api/anomalies"),

  markAnomalyTreated: async (id: string): Promise<Anomaly> => {
    if (USE_MOCKS) {
      const anomaly = mockAnomalies.find((a) => a.id === id);
      if (!anomaly) throw new Error("Anomaly not found");
      anomaly.status = "traitee";
      return delay(anomaly);
    }
    const res = await fetch(`${BASE_URL}/api/anomalies/${id}/traiter`, { method: "PATCH" });
    if (!res.ok) throw new Error("Failed to mark anomaly as treated");
    return res.json();
  },

  getActiveFlight: (): Promise<Flight> => {
    if (USE_MOCKS) {
      mockFlight.imagesCaptured += Math.floor(Math.random() * 2);
      mockFlight.battery = Math.max(5, mockFlight.battery - (Math.random() < 0.3 ? 1 : 0));
      mockFlight.gps = {
        lat: mockFlight.gps.lat + (Math.random() - 0.5) * 0.0006,
        lng: mockFlight.gps.lng + (Math.random() - 0.5) * 0.0006,
      };
      return delay(mockFlight, 150);
    }
    return apiFetch("/api/flights/active");
  },
};