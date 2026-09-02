import type { MissionImage } from "@/lib/api/types";

// Moteur de verification IA partage entre la capture live (voir
// useAnalysisVerification.ts, utilise par Vols.tsx) et l'import manuel
// (client.ts, runMediaAnalysis) — un seul endroit qui sait comment compter
// et relancer, plutot que deux copies qui divergeraient avec le temps.
//
// Principe directeur : le statut_analyse polle cote backend est la seule
// source de verite. On ne fait jamais confiance a la reussite/echec de
// l'appel analyzeImage() lui-meme (fire-and-forget en capture live, best-effort
// en import manuel) — cet appel ne fait que *declencher* l'analyse.

// Nombre de cycles de polling consecutifs qu'une image peut rester
// en_attente/en_cours avant d'etre consideree "bloquee" (declenchement perdu
// en reseau) et relancee automatiquement.
const STUCK_AFTER_POLLS = 2;
// Relances automatiques max par image avant de la considerer en echec
// definitif, necessitant une action manuelle ("Reessayer").
const MAX_AUTO_RETRIES_PER_IMAGE = 3;

export interface ImageVerificationCounts {
  total: number;
  verified: number; // statut_analyse === "analysee"
  pending: number; // en_attente/en_cours, encore dans le budget de relance
  failed: number; // echec, ou relances automatiques epuisees
}

export function summarizeImages(images: readonly Pick<MissionImage, "analysisStatus">[]): ImageVerificationCounts {
  return {
    total: images.length,
    verified: images.filter((i) => i.analysisStatus === "analysee").length,
    pending: images.filter((i) => i.analysisStatus === "en_attente" || i.analysisStatus === "en_cours").length,
    failed: images.filter((i) => i.analysisStatus === "echec").length,
  };
}

// Etat de relance tenu en memoire par l'appelant (hook React ou boucle
// d'import manuel) — pas besoin de survivre a un reload : au pire on relance
// une image deja analysee, ce qui est un no-op inoffensif cote backend
// (voir le commentaire sur analyzeImage dans client.ts).
export interface RetryTracker {
  pollsStuck: Map<string, number>;
  retriesUsed: Map<string, number>;
}

export function createRetryTracker(): RetryTracker {
  return { pollsStuck: new Map(), retriesUsed: new Map() };
}

export interface AnalysisApi {
  analyzeImage: (imageId: string) => Promise<void>;
}

// A appeler a chaque cycle de polling avec l'etat courant des images d'une
// mission : relance automatiquement celles bloquees depuis plus de
// STUCK_AFTER_POLLS cycles, ou en echec, dans la limite de
// MAX_AUTO_RETRIES_PER_IMAGE. Retourne les ids effectivement relances.
export function autoRetryStuckImages(
  images: readonly Pick<MissionImage, "id" | "analysisStatus">[],
  tracker: RetryTracker,
  api: AnalysisApi
): string[] {
  const retried: string[] = [];
  const seenIds = new Set<string>();

  for (const img of images) {
    seenIds.add(img.id);

    if (img.analysisStatus === "analysee") {
      tracker.pollsStuck.delete(img.id);
      continue;
    }

    const usedRetries = tracker.retriesUsed.get(img.id) ?? 0;
    if (usedRetries >= MAX_AUTO_RETRIES_PER_IMAGE) continue; // echec definitif : relance manuelle seulement

    if (img.analysisStatus === "echec") {
      tracker.retriesUsed.set(img.id, usedRetries + 1);
      api.analyzeImage(img.id).catch(() => {});
      retried.push(img.id);
      continue;
    }

    // en_attente / en_cours : ne relance qu'apres STUCK_AFTER_POLLS cycles
    // immobiles, pour laisser le temps a une analyse normalement en cours.
    const stuckFor = (tracker.pollsStuck.get(img.id) ?? 0) + 1;
    if (stuckFor > STUCK_AFTER_POLLS) {
      tracker.retriesUsed.set(img.id, usedRetries + 1);
      tracker.pollsStuck.set(img.id, 0);
      api.analyzeImage(img.id).catch(() => {});
      retried.push(img.id);
    } else {
      tracker.pollsStuck.set(img.id, stuckFor);
    }
  }

  // Une image qui ne reapparait plus dans le poll (rare) ne doit pas fuiter
  // indefiniment dans les Maps.
  for (const id of tracker.pollsStuck.keys()) if (!seenIds.has(id)) tracker.pollsStuck.delete(id);
  for (const id of tracker.retriesUsed.keys()) if (!seenIds.has(id)) tracker.retriesUsed.delete(id);

  return retried;
}

// Relance manuelle groupee (bouton "Reessayer") : reinitialise le budget de
// relance des images en echec definitif pour leur donner une nouvelle salve.
export function retryFailedImages(
  images: readonly Pick<MissionImage, "id" | "analysisStatus">[],
  tracker: RetryTracker,
  api: AnalysisApi
): void {
  for (const img of images) {
    if (img.analysisStatus === "echec") {
      tracker.retriesUsed.set(img.id, 0);
      tracker.pollsStuck.set(img.id, 0);
      api.analyzeImage(img.id).catch(() => {});
    }
  }
}

// Attente bornee (import manuel, voir client.ts/runMediaAnalysis) : poll
// jusqu'a ce que toutes les images du lot atteignent un etat terminal
// (analysee/echec), en relancant celles bloquees, avec un budget de temps
// fixe plutot qu'illimite pour ne jamais laisser un job "en_cours" pour
// toujours en cas de panne persistante.
export async function waitForImagesResolved(
  fetchImages: () => Promise<readonly Pick<MissionImage, "id" | "analysisStatus">[]>,
  api: AnalysisApi,
  opts: { maxPolls?: number; intervalMs?: number } = {}
): Promise<{ verified: number; failed: number }> {
  const maxPolls = opts.maxPolls ?? 8;
  const intervalMs = opts.intervalMs ?? 2500;
  const tracker = createRetryTracker();

  for (let poll = 0; poll < maxPolls; poll++) {
    const images = await fetchImages();
    autoRetryStuckImages(images, tracker, api);
    const { pending, verified, failed } = summarizeImages(images);
    if (pending === 0) return { verified, failed };
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  // Budget epuise : tout ce qui n'est pas "analysee" compte comme non verifie.
  const finalImages = await fetchImages();
  const failed = finalImages.filter((i) => i.analysisStatus !== "analysee").length;
  return { verified: finalImages.length - failed, failed };
}
