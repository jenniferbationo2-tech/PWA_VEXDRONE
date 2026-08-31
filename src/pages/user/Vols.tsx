import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Square, Video, VideoOff, Wifi, WifiOff } from "lucide-react";
import { api } from "@/lib/api/client";
import type { FlightStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useNotifications } from "@/lib/notifications/NotificationContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePhoneCapture } from "@/lib/capture/PhoneCaptureContext";

const STEPS: { value: FlightStatus; label: string }[] = [
  { value: "en_attente", label: "En attente" },
  { value: "en_cours", label: "En cours" },
  { value: "terminee", label: "Terminée" },
];

export function Vols() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const { isCapturing, error: captureError, stream } = usePhoneCapture();
  const liveVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (liveVideoRef.current) liveVideoRef.current.srcObject = stream;
  }, [stream]);

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

  const endMutation = useMutation({
    mutationFn: async () => {
      if (!flight) return;
      const mission = missions?.find((m) => m.id === flight.missionId);
      if (!mission) throw new Error("Mission introuvable");
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
      });
    },
    onSuccess: () => {
      setConfirmEnd(false);
      queryClient.invalidateQueries({ queryKey: ["active-flight"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
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

        <div className="mb-5 rounded-lg border border-brand-blue/[0.06] bg-white p-6 shadow-card">
          <div className="mb-6 flex items-center gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-1 items-center last:flex-none">
                <Skeleton className="h-3 w-3 rounded-full" />
                {i < 2 && <Skeleton className="mx-2 h-px flex-1" />}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 divide-x divide-brand-blue/[0.06] text-center">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-12" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-lg border border-brand-blue/[0.06] bg-white p-6 shadow-card lg:col-span-2">
            <Skeleton className="mb-4 h-4 w-40" />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-md" />
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-brand-blue/[0.06] bg-white p-6 shadow-card">
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
        <p className="mt-1 text-brand-gray">Lance une mission pour voir la télémétrie en direct ici.</p>
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex((s) => s.value === flight.status);
  const connected = flight.droneConnection !== "hors_ligne";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Vol en cours</h1>
          <p className="mt-0.5 text-[14px] text-brand-gray">Mission : {missionName(flight.missionId)}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-semibold",
              connected ? "bg-status-success/10 text-status-success" : "bg-brand-orange/10 text-brand-orange"
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
        description="Le vol sera clôturé et la mission passera au statut Terminée. Cette action est définitive."
        confirmLabel="Terminer"
        loadingLabel="Clôture…"
        onConfirm={() => endMutation.mutate()}
        onCancel={() => setConfirmEnd(false)}
        isLoading={endMutation.isPending}
      />

      <div className="mb-5 rounded-lg border border-brand-blue/[0.06] bg-white p-6 shadow-card">
        <div className="mb-6 flex items-center">
          {STEPS.map((step, i) => (
            <div key={step.value} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "h-3 w-3 rounded-full",
                    i <= currentStepIndex ? "bg-brand-blue" : "bg-brand-gray/25"
                  )}
                />
                <span
                  className={cn(
                    "text-[12px] font-medium",
                    i === currentStepIndex ? "text-brand-blue-dark" : "text-brand-gray"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("mx-2 h-px flex-1", i < currentStepIndex ? "bg-brand-blue" : "bg-brand-gray/25")} />
              )}
            </div>
          ))}
        </div>

        <div
          className={cn(
            "grid divide-x divide-brand-blue/[0.06] text-center",
            isPhoneMission ? "grid-cols-2" : "grid-cols-3"
          )}
        >
          {!isPhoneMission && (
            <div>
              <div className="text-[13px] text-brand-gray">Altitude</div>
              <div className="mt-1 font-display text-[26px] font-bold text-brand-blue-dark">{flight.altitude} m</div>
            </div>
          )}
          <div>
            <div className="text-[13px] text-brand-gray">Batterie</div>
            <div
              className={cn(
                "mt-1 font-display text-[26px] font-bold",
                flight.battery < 20 ? "text-brand-orange" : "text-brand-blue-dark"
              )}
            >
              {flight.battery}%
            </div>
          </div>
          <div>
            <div className="text-[13px] text-brand-gray">Images</div>
            <div className="mt-1 font-display text-[26px] font-bold text-brand-blue-dark">
              {flight.imagesCaptured}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-brand-blue/[0.06] bg-white p-6 shadow-card">
          <h3 className="mb-4">Images captées en direct</h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {Array.from({ length: Math.min(8, flight.imagesCaptured) }).map((_, i) => (
              <div
                key={i}
                className="flex aspect-square items-center justify-center rounded-md bg-brand-off-white text-[11px] text-brand-gray"
              >
                photo
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-brand-blue/[0.06] bg-white p-6 shadow-card">
          <h3 className="mb-4">{isPhoneMission ? "Vue caméra en direct" : "Vidéo drone"}</h3>
          <div className="overflow-hidden rounded-md">
            {isPhoneMission ? (
              isCapturing && stream ? (
                <video
                  ref={liveVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-[180px] w-full bg-black object-cover"
                />
              ) : (
                <div className="flex h-[180px] w-full flex-col items-center justify-center gap-2 rounded-md bg-brand-off-white text-center">
                  <VideoOff size={22} className="text-brand-gray/60" strokeWidth={1.5} />
                  <p className="px-4 text-[12px] text-brand-gray">
                    {captureError ?? "Connexion à la caméra…"}
                  </p>
                </div>
              )
            ) : (
              <div className="flex h-[180px] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-brand-blue/20 text-center">
                <Video size={22} className="text-brand-blue/40" strokeWidth={1.5} />
                <p className="text-[12px] font-medium text-brand-gray">Vidéo drone à venir</p>
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-[13px] text-brand-gray">
            {flight.gps.lat.toFixed(4)}°N, {flight.gps.lng.toFixed(4)}°O
          </p>
        </div>
      </div>
    </div>
  );
}