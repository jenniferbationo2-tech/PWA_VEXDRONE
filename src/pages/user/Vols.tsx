import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Square,
  UploadCloud,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { FlightStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useNotifications } from "@/lib/notifications/NotificationContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePhoneCapture } from "@/lib/capture/PhoneCaptureContext";
import { useAnalysisVerification } from "@/lib/analysis/useAnalysisVerification";
import { getCaptureMode } from "@/lib/captureMode";
import { useAuth } from "@/lib/Auth/AuthContext";

const STEPS: { value: FlightStatus; label: string }[] = [
  { value: "en_attente", label: "En attente" },
  { value: "en_cours", label: "En cours" },
  { value: "terminee", label: "Terminée" },
];

export function Vols() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const { user } = useAuth();
  // Seuils definis par l'Admin/Superadmin de l'entreprise, desormais partages
  // via l'API (voir client.ts) au lieu du localStorage — c'etait la cause du
  // bug d'origine : deux techniciens du meme vol voyaient des seuils
  // differents selon les reglages sauvegardes sur leur propre appareil.
  // Defaut le temps du chargement (ou entreprise_id absent) : mêmes valeurs
  // que l'ancien DEFAULT_ADMIN_SETTINGS, pour ne rien casser en attendant.
  const { data: settings = { defaultMaxAltitudeMeters: 120, lowBatteryThresholdPercent: 20 } } = useQuery({
    queryKey: ["entreprise-settings", user?.entreprise_id],
    queryFn: () => api.getEntrepriseSettings(user!.entreprise_id!),
    enabled: !!user?.entreprise_id,
  });
  const { isCapturing, error: captureError, stream, lastCaptureAt, consecutiveFailures, stopCaptureNow } =
    usePhoneCapture();
  const liveVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (liveVideoRef.current) liveVideoRef.current.srcObject = stream;
  }, [stream]);

  // Fait vivre le "il y a Xs" sous le compteur d'images sans dépendre du
  // polling du vol (toutes les 4s, trop lent pour ce repère).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isCapturing) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isCapturing]);

  const { data: flight, isLoading, isFetching, isError } = useQuery({
    queryKey: ["active-flight"],
    queryFn: api.getActiveFlight,
    refetchInterval: 4000,
  });

  // Tant que data reste undefined (aucun vol n'a jamais ete trouve), React
  // Query repasse status a "pending" a CHAQUE tentative du refetchInterval —
  // meme apres un premier echec deja affiche. Sans ce garde-fou, isLoading
  // redevient true toutes les 4s et la page clignote "Chargement…" / "Aucun
  // vol en cours" en boucle au lieu de rester stable sur l'etat vide.
  const hasLoadedOnce = useRef(false);
  if (!isFetching) hasLoadedOnce.current = true;

  // Reutilise le cache de la page Missions si deja charge — pas de requete
  // supplementaire dans ce cas, juste le nom a afficher.
  const { data: missions } = useQuery({ queryKey: ["missions"], queryFn: api.getMissions });

  function missionName(missionId: string) {
    return missions?.find((m) => m.id === missionId)?.name ?? "Mission inconnue";
  }

  const activeMission = flight ? missions?.find((m) => m.id === flight.missionId) : undefined;
  const isPhoneMission = activeMission?.appareil === "appareil_photo";
  const isUploadMode = activeMission ? getCaptureMode(activeMission.id) === "differe" : false;

  // Vérification IA de la mission (statut_analyse par image, avec relances
  // automatiques) — sert à la fois la galerie ci-dessous et le bandeau de
  // statut "tout est sain / en cours / échecs" (voir useAnalysisVerification).
  const verification = useAnalysisVerification(flight?.missionId, { enabled: !!flight });
  const missionImages = verification.images;

  // Meme cle que Anomalies.tsx/Carte.tsx : dedupe la requete si ces pages
  // sont deja montees. Pas de filtre par mission cote API (voir client.ts),
  // donc on filtre cote client comme le reste du module anomalies.
  const { data: anomalies } = useQuery({
    queryKey: ["anomalies"],
    queryFn: api.getAnomalies,
    enabled: !!flight,
    refetchInterval: 4000,
  });
  const anomaliesCount = flight
    ? anomalies?.filter((a) => a.missionId === flight.missionId).length ?? 0
    : 0;

  const endMutation = useMutation({
    mutationFn: async () => {
      if (!flight) return;
      const mission = missions?.find((m) => m.id === flight.missionId);
      if (!mission) throw new Error("Mission introuvable");
      // Coupe la capture en direct tout de suite, avant le moindre appel
      // reseau : sinon la boucle de capture (son propre timer, independant
      // de cette mutation) peut encore uploader 1-2 photos pendant que
      // endFlight/updateMission sont en vol (voir PhoneCaptureContext.tsx).
      stopCaptureNow();
      await api.endFlight(flight.id);
      await api.updateMission(mission.id, {
        name: mission.name,
        zone: mission.zone,
        description: mission.description,
        dateDebut: mission.dateDebut,
        dateFin: mission.dateFin,
        status: "terminee",
        appareil: mission.appareil,
        droneId: mission.droneId,
        typeMissionId: mission.typeMissionId,
      });
    },
    onSuccess: () => {
      setConfirmEnd(false);
      queryClient.invalidateQueries({ queryKey: ["active-flight"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["entreprise-missions"] });
      // Un rapport = une mission terminee (voir toReport dans mappers.ts) :
      // sans cette invalidation, Rapports.tsx ne montre le nouveau rapport
      // qu'apres un reload manuel de la page.
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      addNotification({ title: "Mission terminée", message: "Le vol a été clôturé." });
    },
  });

  if (isLoading && !hasLoadedOnce.current) {
    return (
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
          <Skeleton className="h-7 w-40 rounded-full" />
        </div>

        <div className="mb-5 rounded-lg border border-brand-blue/[0.06] bg-white p-6 shadow-card dark:border-white/10 dark:bg-brand-blue-dark dark:shadow-none">
          <div className="mb-6 flex items-center gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-1 items-center last:flex-none">
                <Skeleton className="h-3 w-3 rounded-full" />
                {i < 2 && <Skeleton className="mx-2 h-px flex-1" />}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 divide-x divide-brand-blue/[0.06] text-center dark:divide-white/10">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-12" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-lg border border-brand-blue/[0.06] bg-white p-6 shadow-card dark:border-white/10 dark:bg-brand-blue-dark dark:shadow-none lg:col-span-2">
            <Skeleton className="mb-4 h-4 w-40" />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-md" />
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-brand-blue/[0.06] bg-white p-6 shadow-card dark:border-white/10 dark:bg-brand-blue-dark dark:shadow-none">
            <Skeleton className="mb-4 h-4 w-28" />
            <Skeleton className="h-[180px] w-full rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !flight) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center">
        <p className="font-display text-h3">Aucun vol en cours</p>
        <p className="mt-1 text-brand-gray dark:text-white/60">Lance une mission pour voir la télémétrie en direct ici.</p>
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex((s) => s.value === flight.status);
  const connected = flight.droneConnection !== "hors_ligne";
  // Réglages de vol définis par le SuperAdmin (voir adminSettings.ts) —
  // vérifiés ici contre la télémétrie live, pas juste affichés en badge sur
  // le dashboard.
  const altitudeExceeded = !isPhoneMission && flight.altitude > settings.defaultMaxAltitudeMeters;
  const batteryLow = flight.battery < settings.lowBatteryThresholdPercent;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Vol en cours</h1>
          <p className="mt-0.5 text-[14px] text-brand-gray dark:text-white/60">Mission : {missionName(flight.missionId)}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-semibold",
              connected ? "bg-status-success/10 text-status-success dark:bg-status-success/20" : "bg-brand-orange/10 text-brand-orange"
            )}
          >
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {connected
              ? `${isPhoneMission ? "Téléphone" : "Drone"} connecté · ${flight.droneConnection === "wifi" ? "Wi-Fi" : "4G"}`
              : `${isPhoneMission ? "Téléphone" : "Drone"} hors ligne`}
          </span>
          <Button variant="accent" size="sm" className="gap-1.5" onClick={() => setConfirmEnd(true)}>
            <Square size={13} />
            Terminer
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmEnd}
        title="Terminer la mission"
        description={
          verification.counts.pending > 0
            ? `Le vol sera clôturé et la mission passera au statut Terminée. ${verification.counts.pending} image${verification.counts.pending > 1 ? "s sont" : " est"} encore en cours de vérification — l'analyse continuera après la fin du vol. Cette action est définitive.`
            : "Le vol sera clôturé et la mission passera au statut Terminée. Cette action est définitive."
        }
        confirmLabel="Terminer"
        loadingLabel="Clôture…"
        onConfirm={() => endMutation.mutate()}
        onCancel={() => setConfirmEnd(false)}
        isLoading={endMutation.isPending}
      />

      <div className="mb-5 rounded-lg border border-brand-blue/[0.06] bg-white p-6 shadow-card dark:border-white/10 dark:bg-brand-blue-dark dark:shadow-none">
        <div className="mb-6 flex items-center">
          {STEPS.map((step, i) => (
            <div key={step.value} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "h-3 w-3 rounded-full",
                    i <= currentStepIndex ? "bg-brand-blue dark:bg-white" : "bg-brand-gray/25 dark:bg-white/15"
                  )}
                />
                <span
                  className={cn(
                    "text-[12px] font-medium",
                    i === currentStepIndex ? "text-brand-blue-dark dark:text-white" : "text-brand-gray dark:text-white/50"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("mx-2 h-px flex-1", i < currentStepIndex ? "bg-brand-blue dark:bg-white" : "bg-brand-gray/25 dark:bg-white/15")} />
              )}
            </div>
          ))}
        </div>

        <div
          className={cn(
            "grid divide-x divide-brand-blue/[0.06] text-center dark:divide-white/10",
            isPhoneMission ? "grid-cols-3" : "grid-cols-4"
          )}
        >
          {!isPhoneMission && (
            <div>
              <div className="text-[13px] text-brand-gray dark:text-white/60">Altitude</div>
              <div
                className={cn(
                  "mt-1 font-display text-[26px] font-bold",
                  altitudeExceeded ? "text-brand-orange" : "text-brand-blue-dark dark:text-white"
                )}
              >
                {flight.altitude} m
              </div>
            </div>
          )}
          <div>
            <div className="text-[13px] text-brand-gray dark:text-white/60">Batterie</div>
            <div
              className={cn(
                "mt-1 font-display text-[26px] font-bold",
                batteryLow ? "text-brand-orange" : "text-brand-blue-dark dark:text-white"
              )}
            >
              {flight.battery}%
            </div>
          </div>
          <div>
            <div className="text-[13px] text-brand-gray dark:text-white/60">Images</div>
            <div className="mt-1 font-display text-[26px] font-bold text-brand-blue-dark dark:text-white">
              {flight.imagesCaptured}
            </div>
            {isPhoneMission && (
              <div className={cn("mt-1 text-[12px] font-medium", consecutiveFailures >= 3 ? "text-brand-orange" : "text-brand-gray dark:text-white/60")}>
                {consecutiveFailures >= 3
                  ? `${consecutiveFailures} échecs de capture d'affilée`
                  : lastCaptureAt
                    ? `Dernière capture il y a ${Math.max(0, Math.round((now - lastCaptureAt) / 1000))}s`
                    : isCapturing
                      ? "En attente de la première capture…"
                      : null}
              </div>
            )}
          </div>
          <div>
            <div className="text-[13px] text-brand-gray dark:text-white/60">Anomalies</div>
            <div
              className={cn(
                "mt-1 font-display text-[26px] font-bold",
                anomaliesCount > 0 ? "text-brand-orange" : "text-brand-blue-dark dark:text-white"
              )}
            >
              {anomaliesCount}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-brand-blue/[0.06] bg-white p-4 shadow-card dark:border-white/10 dark:bg-brand-blue-dark dark:shadow-none">
        {altitudeExceeded && (
          <Badge variant="high">
            <AlertTriangle size={12} />
            Altitude au-dessus du max autorisé ({flight.altitude} m / {settings.defaultMaxAltitudeMeters} m)
          </Badge>
        )}
        {batteryLow && (
          <Badge variant="high">
            <AlertTriangle size={12} />
            Batterie faible ({flight.battery}% / seuil {settings.lowBatteryThresholdPercent}%)
          </Badge>
        )}
        {verification.counts.total === 0 ? (
          <span className="text-[13px] text-brand-gray dark:text-white/60">Aucune image capturée pour l'instant.</span>
        ) : (
          <>
            {verification.counts.pending > 0 && (
              <Badge variant="pending">
                <Loader2 size={12} className="animate-spin" />
                {verification.counts.verified + verification.counts.failed}/{verification.counts.total} vérifiées
              </Badge>
            )}
            {verification.counts.pending === 0 && verification.counts.failed === 0 && anomaliesCount === 0 && (
              <Badge variant="success">
                <CheckCircle2 size={12} />
                Tout est sain — {verification.counts.total} image{verification.counts.total > 1 ? "s" : ""} vérifiée
                {verification.counts.total > 1 ? "s" : ""}
              </Badge>
            )}
            {anomaliesCount > 0 && (
              <Badge variant="high">
                <AlertTriangle size={12} />
                {anomaliesCount} anomalie{anomaliesCount > 1 ? "s" : ""} détectée{anomaliesCount > 1 ? "s" : ""}
              </Badge>
            )}
            {verification.counts.failed > 0 && (
              <>
                <Badge variant="high">
                  <XCircle size={12} />
                  {verification.counts.failed} image{verification.counts.failed > 1 ? "s" : ""} non vérifiée
                  {verification.counts.failed > 1 ? "s" : ""}
                </Badge>
                <button
                  onClick={verification.retryFailed}
                  className="text-[12px] font-semibold text-brand-blue hover:underline dark:text-white/90"
                >
                  Réessayer
                </button>
              </>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-brand-blue/[0.06] bg-white p-6 shadow-card dark:border-white/10 dark:bg-brand-blue-dark dark:shadow-none">
          <h3 className="mb-4">Images captées en direct</h3>
          {missionImages && missionImages.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {missionImages.slice(0, 8).map((img) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt="Photo capturée pendant le vol"
                  className="aspect-square w-full rounded-md object-cover"
                />
              ))}
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center rounded-md bg-brand-off-white text-[13px] text-brand-gray dark:bg-white/5 dark:text-white/60">
              {flight.imagesCaptured > 0 ? "Chargement des photos…" : "Aucune photo pour l'instant"}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-brand-blue/[0.06] bg-white p-6 shadow-card dark:border-white/10 dark:bg-brand-blue-dark dark:shadow-none">
          <h3 className="mb-4">
            {isPhoneMission ? (isUploadMode ? "Import manuel" : "Vue caméra en direct") : "Vidéo drone"}
          </h3>
          <div className="overflow-hidden rounded-md">
            {isPhoneMission ? (
              isUploadMode ? (
                <div className="flex h-[180px] w-full flex-col items-center justify-center gap-2.5 rounded-md border border-dashed border-brand-blue/20 text-center dark:border-white/15">
                  <UploadCloud size={22} className="text-brand-blue/50 dark:text-white/40" strokeWidth={1.5} />
                  <p className="px-4 text-[12px] text-brand-gray dark:text-white/60">
                    Mode upload — importe tes photos depuis Anomalies.
                  </p>
                  <Link
                    to="/anomalies"
                    state={{ missionId: activeMission?.id }}
                    className="text-[12px] font-semibold text-brand-blue hover:underline dark:text-white/90"
                  >
                    Importer maintenant
                  </Link>
                </div>
              ) : isCapturing && stream ? (
                <video
                  ref={liveVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-[180px] w-full bg-black object-cover"
                />
              ) : (
                <div className="flex h-[180px] w-full flex-col items-center justify-center gap-2 rounded-md bg-brand-off-white text-center dark:bg-white/5">
                  <VideoOff size={22} className="text-brand-gray/60 dark:text-white/40" strokeWidth={1.5} />
                  <p className="px-4 text-[12px] text-brand-gray dark:text-white/60">
                    {captureError ?? "Connexion à la caméra…"}
                  </p>
                </div>
              )
            ) : (
              <div className="flex h-[180px] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-brand-blue/20 text-center dark:border-white/15">
                <Video size={22} className="text-brand-blue/40 dark:text-white/30" strokeWidth={1.5} />
                <p className="text-[12px] font-medium text-brand-gray dark:text-white/60">Vidéo drone à venir</p>
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-[13px] text-brand-gray dark:text-white/60">
            {flight.gps.lat.toFixed(4)}°N, {flight.gps.lng.toFixed(4)}°O
          </p>
        </div>
      </div>
    </div>
  );
}