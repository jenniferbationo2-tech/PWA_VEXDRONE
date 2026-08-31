import type { Mission, Anomaly, Flight, Report, Severity, MissionStatus, Drone, Entreprise, PlatformUser } from "./types";
import type {
  BackendAnomalyType,
  BackendMission,
  BackendAnomaly,
  BackendDrone,
  BackendEntreprise,
  BackendImage,
  BackendPlatformUser,
  BackendReport,
  BackendVol,
} from "./backendTypes";

const ANOMALY_TYPE_LABELS: Record<BackendAnomalyType, string> = {
  isolateur_casse: "Isolateur cassé",
  corrosion: "Corrosion",
  antenne_endommagee: "Antenne endommagée",
  broken_tower: "Pylône endommagé",
  broken_cable: "Câble endommagé",
  vegetation_cautious: "Végétation — Vigilance",
  vegetation_critical: "Végétation — Critique",
  vegetation_low: "Végétation — Faible",
  autre: "Autre",
};

// Le paramètre reste large (string) par prudence runtime : le type précis
// n'engage que ce qu'on écrit dans ANOMALY_TYPE_LABELS, pas ce que l'API
// renverra réellement. Une valeur inconnue s'affiche telle quelle plutôt que
// de disparaître silencieusement.
export function toAnomalyTypeLabel(type_anomalie: string): string {
  return ANOMALY_TYPE_LABELS[type_anomalie as BackendAnomalyType] ?? type_anomalie;
}

// Le backend a 4 niveaux de gravité, l'interface actuelle en attend 3.
// On garde "critique" séparé plutôt que de le fondre dans "eleve" —
// une anomalie critique doit rester visuellement distincte.
export function toSeverity(gravite: BackendAnomaly["gravite"]): Severity {
  switch (gravite) {
    case "critique":
    case "elevee":
      return "eleve";
    case "moyenne":
      return "moyen";
    case "faible":
      return "faible";
  }
}

export function toMissionStatus(statut: BackendMission["statut"]): MissionStatus {
  switch (statut) {
    case "planifiee":
      return "en_attente";
    case "en_cours":
      return "en_cours";
    case "terminee":
      return "terminee";
    case "annulee":
      return "annulee";
  }
}

export function toBackendMissionStatus(status: MissionStatus): BackendMission["statut"] {
  switch (status) {
    case "en_attente":
      return "planifiee";
    case "en_cours":
      return "en_cours";
    case "terminee":
      return "terminee";
    case "annulee":
      return "annulee";
  }
}

export function toMission(raw: BackendMission): Mission {
  return {
    id: raw.uuid,
    name: raw.titre,
    zone: raw.zone,
    dateDebut: raw.date_debut,
    dateFin: raw.date_fin,
    description: raw.description ?? "",
    status: toMissionStatus(raw.statut),
    appareil: raw.appareil,
    droneId: raw.drone_uuid ?? undefined,
    userId: String(raw.user_id),
  };
}

export function toDrone(raw: BackendDrone): Drone {
  return {
    id: raw.uuid,
    identifiant: raw.identifiant,
    modele: raw.modele ?? "",
    status: raw.statut,
  };
}

export function toEntreprise(raw: BackendEntreprise): Entreprise {
  return {
    id: raw.uuid,
    nom: raw.nom,
    status: raw.statut,
    createdAt: raw.created_at,
  };
}

const PLATFORM_ROLE_MAP = {
  superadmin: "super_admin",
  admin: "admin",
  utilisateur: "technicien",
} as const;

export function toPlatformUser(raw: BackendPlatformUser): PlatformUser {
  return {
    id: String(raw.id),
    name: raw.name,
    username: raw.username,
    email: raw.email,
    role: PLATFORM_ROLE_MAP[raw.role],
    entrepriseId: raw.entreprise_id ?? undefined,
    isDeleted: raw.is_deleted,
  };
}

// Nécessite l'image associée pour obtenir la position GPS
// (le backend stocke lat/lng sur l'image, pas sur l'anomalie elle-même).
export function toAnomaly(raw: BackendAnomaly, image?: BackendImage): Anomaly {
  return {
    id: raw.uuid,
    type: toAnomalyTypeLabel(raw.type_anomalie),
    zone: "", // TODO: a deriver de la mission via l'image, pas encore cablé
    // Le backend renvoie une fraction (0.0-1.0, cf. schema Pydantic
    // confiance: ge=0.0 le=1.0) ; l'UI affiche "{confidence}%" partout
    // (Anomalies.tsx, Carte.tsx) — invisible tant que le moteur IA ne
    // renvoyait aucune vraie detection (fixtures de test a 0 detection).
    confidence: Math.round(raw.confiance * 100),
    severity: toSeverity(raw.gravite),
    status: raw.validee_par_humain ? "traitee" : "non_traitee",
    detectedAt: raw.created_at,
    gps: {
      lat: image?.latitude ?? 0,
      lng: image?.longitude ?? 0,
    },
    missionId: image?.mission_uuid ?? "",
    imageUrl: image ? `/api/v1/images/${image.uuid}/fichier` : undefined,
    bbox: { x: raw.bbox_x, y: raw.bbox_y, width: raw.bbox_largeur, height: raw.bbox_hauteur },
  };
}

// Les valeurs de statut/connexion sont deja les memes chaines cote backend
// et frontend (en_attente/en_cours/terminee, wifi/4g/hors_ligne).
export function toFlight(raw: BackendVol): Flight {
  return {
    id: raw.uuid,
    missionId: raw.mission_uuid,
    status: raw.statut,
    altitude: raw.altitude,
    battery: raw.batterie,
    imagesCaptured: raw.images_capturees,
    gps: { lat: raw.latitude ?? 0, lng: raw.longitude ?? 0 },
    droneConnection: raw.connexion_drone,
  };
}

// Un rapport = une mission terminee, pas une entite stockee a part (voir
// le module report cote backend). pdf_url n'est pas encore implemente
// cote backend : "#" reprend la convention deja utilisee par l'UI pour
// signaler "pas d'apercu PDF disponible".
export function toReport(raw: BackendReport): Report {
  return {
    id: raw.mission_uuid,
    missionId: raw.mission_uuid,
    missionName: raw.titre,
    zone: raw.zone,
    date: raw.date_mission,
    anomaliesCount: raw.nombre_anomalies,
    pdfUrl: raw.pdf_url ?? "#",
  };
}