import type { Anomaly, Severity } from "@/lib/api/types";

// Texte de recommandation généré par règle simple (sévérité -> délai +
// phrase type), pas par IA — décision explicite pour cette itération (rapide
// à produire, déterministe, pas de dépendance à un modèle de langage). Le
// champ libre `commentaire` existe côté backend (BackendAnomaly) pour une
// vraie note humaine mais n'est pas encore exposé côté frontend.
const SEVERITY_LABEL: Record<Severity, string> = {
  eleve: "élevée",
  moyen: "modérée",
  faible: "faible",
};

const SEVERITY_DELAY_DAYS: Record<Severity, number> = {
  eleve: 12,
  moyen: 30,
  faible: 90,
};

const SEVERITY_CLAUSE: Record<Severity, string> = {
  eleve: "Risque de fragilisation structurelle si non traité rapidement.",
  moyen: "À surveiller — risque d'aggravation à moyen terme si aucune action n'est engagée.",
  faible: "Anomalie mineure, à intégrer à la prochaine maintenance planifiée.",
};

export function severityLabel(severity: Severity): string {
  return SEVERITY_LABEL[severity];
}

export function recommendedDelayDays(severity: Severity): number {
  return SEVERITY_DELAY_DAYS[severity];
}

export function buildRecommendationText(anomaly: Pick<Anomaly, "type" | "severity" | "confidence">): string {
  const delay = SEVERITY_DELAY_DAYS[anomaly.severity];
  return (
    `${anomaly.type} détecté(e) avec un niveau de confiance de ${anomaly.confidence}%. ` +
    `${SEVERITY_CLAUSE[anomaly.severity]} ` +
    `Intervention recommandée sous ${delay} jour${delay > 1 ? "s" : ""}.`
  );
}
