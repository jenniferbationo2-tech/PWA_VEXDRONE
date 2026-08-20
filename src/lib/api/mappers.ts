import type { Mission, Anomaly, Flight, Severity, MissionStatus } from "./types";
import type { BackendMission, BackendAnomaly, BackendImage, BackendVol } from "./backendTypes";

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
      return "en_attente"; // TODO: ajouter un statut "annulee" cote frontend si besoin
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
  }
}

export function toMission(raw: BackendMission): Mission {
  return {
    id: raw.uuid,
    name: raw.titre,
    zone: raw.zone,
    dateDebut: raw.date_mission,
    dateFin: raw.date_mission, // le backend n'a qu'une seule date pour l'instant
    description: raw.description ?? "",
    status: toMissionStatus(raw.statut),
  };
}

// Nécessite l'image associée pour obtenir la position GPS
// (le backend stocke lat/lng sur l'image, pas sur l'anomalie elle-même).
export function toAnomaly(raw: BackendAnomaly, image?: BackendImage): Anomaly {
  return {
    id: raw.uuid,
    type: raw.type_anomalie,
    zone: "", // TODO: a deriver de la mission via l'image, pas encore cablé
    confidence: raw.confiance,
    severity: toSeverity(raw.gravite),
    status: raw.validee_par_humain ? "traitee" : "non_traitee",
    detectedAt: raw.created_at,
    gps: {
      lat: image?.latitude ?? 0,
      lng: image?.longitude ?? 0,
    },
    missionId: image?.mission_uuid ?? "",
    imageUrl: image ? `/api/v1/images/${image.uuid}/fichier` : undefined,
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