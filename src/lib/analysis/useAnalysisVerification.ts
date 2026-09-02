import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { MissionImage } from "@/lib/api/types";
import { autoRetryStuckImages, createRetryTracker, retryFailedImages, summarizeImages } from "./verifyImages";
import type { ImageVerificationCounts } from "./verifyImages";

const POLL_INTERVAL_MS = 4000;

export interface UseAnalysisVerificationResult {
  images: MissionImage[];
  counts: ImageVerificationCounts;
  // pending === 0 : plus rien en attente, que ce soit resolu proprement
  // (verified) ou en echec definitif (failed) — ne dit pas a lui seul si
  // c'est un succes, voir counts.failed pour ca.
  allResolved: boolean;
  retryFailed: () => void;
}

// Moteur de verification IA pour une mission, partage entre Vols.tsx (vol en
// direct) et PhoneCaptureContext.tsx (notification de fin de verification,
// meme apres que le technicien a quitte l'ecran Vol). Voir verifyImages.ts
// pour le principe directeur (statut_analyse polle = seule source de verite).
export function useAnalysisVerification(
  missionId: string | undefined,
  opts: { enabled?: boolean } = {}
): UseAnalysisVerificationResult {
  const enabled = (opts.enabled ?? true) && !!missionId;
  const trackerRef = useRef(createRetryTracker());

  // Meme queryKey que l'ancienne query "galerie" de Vols.tsx : partage le
  // cache/polling au lieu de dupliquer la requete.
  const { data: images } = useQuery({
    queryKey: ["mission-images", missionId],
    queryFn: () => api.getMissionImages(missionId as string),
    enabled,
    refetchInterval: enabled ? POLL_INTERVAL_MS : false,
  });

  // Reinitialise le suivi de relance quand on change de mission — sinon les
  // compteurs d'une mission precedente fausseraient la nouvelle.
  useEffect(() => {
    trackerRef.current = createRetryTracker();
  }, [missionId]);

  useEffect(() => {
    if (images) autoRetryStuckImages(images, trackerRef.current, api);
  }, [images]);

  const counts = summarizeImages(images ?? []);

  return {
    images: images ?? [],
    counts,
    allResolved: enabled && counts.pending === 0,
    retryFailed: () => {
      if (images) retryFailedImages(images, trackerRef.current, api);
    },
  };
}
