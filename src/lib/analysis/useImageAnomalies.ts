import { useQueries, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Anomaly, MissionImage } from "@/lib/api/types";
import { sortByNewestFirst } from "@/lib/utils";

// Anomalies d'une mission, lues image par image (GET /anomalies/?image_uuid=).
//
// Remplace l'ancienne deduction "0 anomalie de cette mission dans la liste
// globale → tout est sain", qui transformait silencieusement toute requete
// en echec en faux verdict sain (diagnostic du 2026-09-29, voir
// BACKEND_REQUESTS.md §11). Regle ici : "sans anomalie" n'est affirmable que
// si `complete` — chaque image analysee a bien ete relue. Sinon l'appelant
// affiche "en cours" (pending) ou "incomplet" (failed), jamais "sain".
export interface AnomalyLookup {
  anomalies: Anomaly[];
  pending: number; // images analysees dont la lecture est en cours
  failed: number; // images analysees dont la lecture a echoue (apres relances)
  complete: boolean; // pending === 0 && failed === 0
  retry: () => void;
}

export function useImagesAnomalies(images: readonly MissionImage[]): AnomalyLookup {
  // Seules les images "analysee" ont des anomalies definitives. Le backend
  // passe l'image a "analysee" apres avoir enregistre ses anomalies (constate
  // sur les horodatages), donc la lecture faite a ce moment est complete —
  // d'ou staleTime infini : une image n'est relue qu'une fois, pas a chaque
  // cycle de polling.
  const analysed = images.filter((img) => img.analysisStatus === "analysee");
  const results = useQueries({
    queries: analysed.map((img) => ({
      queryKey: ["image-anomalies", img.id],
      queryFn: () => api.getImageAnomalies(img),
      staleTime: Infinity,
      retry: 3,
    })),
  });

  const pending = results.filter((r) => r.isPending).length;
  const failed = results.filter((r) => r.isError).length;
  const anomalies = sortByNewestFirst(
    results.flatMap((r) => r.data ?? []),
    (a) => a.detectedAt
  );

  return {
    anomalies,
    pending,
    failed,
    complete: pending === 0 && failed === 0,
    retry: () => {
      for (const r of results) if (r.isError) r.refetch();
    },
  };
}

export interface MissionAnomalies extends AnomalyLookup {
  images: MissionImage[];
  isLoading: boolean; // liste des images pas encore recue
  isError: boolean; // liste des images en echec
}

// Pour les ecrans qui n'ont pas deja les images de la mission (rapport, page
// Anomalies). Meme queryKey que useAnalysisVerification : cache partage.
export function useMissionAnomalies(missionId: string | undefined, opts: { pollMs?: number } = {}): MissionAnomalies {
  const imagesQuery = useQuery({
    queryKey: ["mission-images", missionId],
    queryFn: () => api.getMissionImages(missionId as string),
    enabled: !!missionId,
    refetchInterval: opts.pollMs ?? false,
  });
  const images = imagesQuery.data ?? [];
  const lookup = useImagesAnomalies(images);
  return {
    ...lookup,
    images,
    isLoading: !!missionId && imagesQuery.isPending,
    isError: imagesQuery.isError,
  };
}
