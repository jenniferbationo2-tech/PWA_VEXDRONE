import type { MediaAnalysisJob } from "./types";

// Aucun endpoint d'upload/analyse n'existe encore côté backend FastAPI
// (cf. BackendImage.statut_analyse dans backendTypes.ts, pas encore câblé).
// Ce module simule le job d'analyse pour permettre de valider tout le
// parcours (progression, succès, échec) en attendant l'endpoint réel.
// La progression est dérivée du temps écoulé (pas d'un compteur de tick),
// pour rester cohérente même si le composant qui l'affiche est démonté puis remonté.

interface InternalJob {
  startedAt: number;
  durationMs: number;
  fileCount: number;
  willFail: boolean;
  // Simule un job qui se termine mais avec une image non verifiee (voir
  // waitForImagesResolved cote reel) — permet de tester l'etat "terminee
  // avec erreurs" de MediaAnalysisCard sans backend reel.
  failedCount: number;
}

const jobs = new Map<string, InternalJob>();

export function startMockAnalysisJob(fileCount: number): MediaAnalysisJob {
  const id = `job-${Date.now()}-${Math.round(Math.random() * 1000)}`;
  const job: InternalJob = {
    startedAt: Date.now(),
    durationMs: 4000 + fileCount * 600,
    fileCount,
    // Échec simulé occasionnel, pour permettre de valider l'état "Analyse échouée".
    willFail: Math.random() < 0.15,
    // Indépendant de willFail : un job qui "réussit" globalement peut quand
    // même laisser une image non vérifiée après relances (cas réel couvert
    // par waitForImagesResolved).
    failedCount: fileCount > 1 && Math.random() < 0.2 ? 1 : 0,
  };
  jobs.set(id, job);
  return computeJobState(id, job);
}

export function getMockAnalysisJob(id: string): MediaAnalysisJob {
  const job = jobs.get(id);
  if (!job) throw new Error("Analyse introuvable");
  return computeJobState(id, job);
}

function computeJobState(id: string, job: InternalJob): MediaAnalysisJob {
  const elapsed = Date.now() - job.startedAt;

  if (elapsed >= job.durationMs) {
    return job.willFail
      ? {
          id,
          status: "echouee",
          progress: 100,
          fileCount: job.fileCount,
          errorMessage:
            "Le serveur d'analyse n'a pas pu traiter un ou plusieurs fichiers (format non supporté ou fichier corrompu).",
        }
      : { id, status: "terminee", progress: 100, fileCount: job.fileCount, failedCount: job.failedCount };
  }

  return {
    id,
    status: "en_cours",
    progress: Math.min(99, Math.round((elapsed / job.durationMs) * 100)),
    fileCount: job.fileCount,
  };
}
