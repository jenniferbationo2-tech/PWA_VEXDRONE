import type { Anomaly, DashboardSummary, Drone, Entreprise, Flight, Mission, PlatformUser, Report } from "./types";

export const mockDrones: Drone[] = [
  { id: "d-1", identifiant: "DRONE-01", modele: "DJI Mavic 3T", status: "disponible" },
  { id: "d-2", identifiant: "DRONE-02", modele: "DJI Mavic 3T", status: "disponible" },
  { id: "d-3", identifiant: "DRONE-03", modele: "DJI Matrice 30T", status: "maintenance" },
];

export const mockEntreprises: Entreprise[] = [
  { id: "e-1", nom: "Sonabel", status: "active", createdAt: "2026-05-12T09:00:00Z" },
  { id: "e-2", nom: "Faso Energie", status: "active", createdAt: "2026-06-20T09:00:00Z" },
  { id: "e-3", nom: "Onea", status: "bloquee", createdAt: "2026-04-02T09:00:00Z" },
];

export const mockPlatformUsers: PlatformUser[] = [
  { id: "u-1", name: "Gérant Sonabel", username: "gerantsonabel", email: "gerant@sonabel.bf", role: "admin", entrepriseId: "e-1", isDeleted: false },
  { id: "u-2", name: "Demo User", username: "demouser", email: "demo.user@sonabel.bf", role: "technicien", entrepriseId: "e-1", isDeleted: false },
  { id: "u-3", name: "Gérant Faso Energie", username: "gerantfaso", email: "gerant@fasoenergie.bf", role: "admin", entrepriseId: "e-2", isDeleted: false },
];

// Équipe de l'Admin connecté (GET/POST/DELETE /users/team) — distinct de
// mockPlatformUsers (portée SuperAdmin, cross-entreprise) : ici on simule
// uniquement "mon" entreprise, comme le fait l'API réelle pour un ADMIN.
export const mockTeamMembers: PlatformUser[] = [
  { id: "u-2", name: "Demo User", username: "demouser", email: "demo.user@sonabel.bf", role: "technicien", entrepriseId: "e-1", isDeleted: false },
  { id: "u-10", name: "Awa Compaoré", username: "awacompaore", email: "awa.compaore@sonabel.bf", role: "technicien", entrepriseId: "e-1", isDeleted: false },
  { id: "u-11", name: "Boureima Sawadogo", username: "boureimasawadogo", email: "boureima.sawadogo@sonabel.bf", role: "technicien", entrepriseId: "e-1", isDeleted: false },
];


export const mockDashboardSummary: DashboardSummary = {
  flightsToday: 3,
  flightsTodayDelta: 1,
  criticalAlerts: 2,
  criticalAlertsDelta: 2,
  fleetAvailability: 94,
  fleetActive: 3,
  fleetTotal: 4,
  anomaliesResolved: 18,
  anomaliesResolvedTotal: 21,
  anomaliesTrend: [
    { date: "2026-06-25", count: 4 },
    { date: "2026-06-30", count: 5 },
    { date: "2026-07-05", count: 6 },
    { date: "2026-07-10", count: 6 },
    { date: "2026-07-14", count: 7 },
    { date: "2026-07-18", count: 6 },
    { date: "2026-07-20", count: 8 },
    { date: "2026-07-24", count: 9 },
  ],
  severityBreakdown: [
    { severity: "eleve", count: 9 },
    { severity: "moyen", count: 6 },
    { severity: "faible", count: 6 },
  ],
  recentAlerts: [
    {
      id: "HT-14",
      type: "Isolateur cassé",
      zone: "Zone A",
      confidence: 92,
      severity: "eleve",
      status: "non_traitee",
      detectedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      gps: { lat: 12.3547, lng: -1.5616 },
      missionId: "m-2",
    },
    {
      id: "HT-09",
      type: "Câble endommagé",
      zone: "Zone B",
      confidence: 87,
      severity: "eleve",
      status: "non_traitee",
      detectedAt: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
      gps: { lat: 12.36, lng: -1.558 },
      missionId: "m-2",
    },
  ],
};

export const mockMissions: Mission[] = [
  {
    id: "m-1",
    name: "Pont Nord",
    zone: "Zone A",
    dateDebut: "2026-03-10",
    dateFin: "2026-03-12",
    description: "Inspection structurelle du tablier et des piles",
    status: "terminee",
    appareil: "drone",
    droneId: "d-1",
    userId: "u-2",
  },
  {
    id: "m-2",
    name: "Ligne HT Secteur 7",
    zone: "Zone B",
    dateDebut: "2026-07-24",
    dateFin: "2026-08-20",
    description: "Détection de corrosion et isolateurs défectueux",
    status: "en_cours",
    appareil: "drone",
    droneId: "d-2",
    userId: "u-2",
  },
  {
    id: "m-3",
    name: "Barrage Sud",
    zone: "Zone C",
    dateDebut: "2026-08-20",
    dateFin: "2026-08-25",
    description: "Contrôle annuel de l'ouvrage et des abords",
    status: "en_attente",
    appareil: "appareil_photo",
    userId: "u-10",
  },
  {
    id: "m-4",
    name: "Éolienne E-12",
    zone: "Zone D",
    dateDebut: "2026-06-01",
    dateFin: "2026-06-03",
    description: "Vérification des pales et du mât",
    status: "terminee",
    appareil: "appareil_photo",
    userId: "u-11",
  },
  {
    id: "m-5",
    name: "Poste Zagtouli",
    zone: "Zone E",
    dateDebut: "2026-08-05",
    dateFin: "2026-08-06",
    description: "Inspection annulée suite à indisponibilité du site",
    status: "annulee",
    appareil: "drone",
    droneId: "d-3",
    userId: "u-11",
  },
];

export const mockAnomalies: Anomaly[] = [
  {
    id: "A-042",
    type: "Isolateur cassé",
    zone: "Zone A",
    confidence: 92,
    severity: "eleve",
    status: "non_traitee",
    detectedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    gps: { lat: 12.3547, lng: -1.5616 },
    missionId: "m-2",
  },
  {
    id: "A-041",
    type: "Câble endommagé",
    zone: "Zone B",
    confidence: 87,
    severity: "eleve",
    status: "non_traitee",
    detectedAt: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
    gps: { lat: 12.36, lng: -1.558 },
    missionId: "m-2",
  },
  {
    id: "A-038",
    type: "Pylône endommagé",
    zone: "Zone C",
    confidence: 78,
    severity: "moyen",
    status: "non_traitee",
    detectedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    gps: { lat: 12.351, lng: -1.565 },
    missionId: "m-3",
  },
  {
    id: "A-030",
    type: "Végétation — Critique",
    zone: "Zone D",
    confidence: 95,
    severity: "faible",
    status: "traitee",
    detectedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    gps: { lat: 12.368, lng: -1.552 },
    missionId: "m-4",
  },
];

export const mockFlight: Flight = {
  id: "f-1",
  missionId: "m-2",
  status: "en_cours",
  altitude: 42,
  battery: 68,
  imagesCaptured: 143,
  gps: { lat: 12.365, lng: -1.558 },
  droneConnection: "wifi",
};

export const mockReports: Report[] = [
  {
    id: "r-1",
    missionId: "m-1",
    missionName: "Pont Nord",
    zone: "Zone A",
    date: "2026-03-12",
    anomaliesCount: 4,
    pdfUrl: "#",
  },
  {
    id: "r-2",
    missionId: "m-4",
    missionName: "Éolienne E-12",
    zone: "Zone D",
    date: "2026-06-03",
    anomaliesCount: 1,
    pdfUrl: "#",
  },
  {
    id: "r-3",
    missionId: "m-5",
    missionName: "Voie ferrée km45",
    zone: "Zone B",
    date: "2026-01-28",
    anomaliesCount: 2,
    pdfUrl: "#",
  },
];
