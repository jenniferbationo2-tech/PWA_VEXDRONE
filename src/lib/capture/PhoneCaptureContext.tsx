import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useNotifications } from "@/lib/notifications/NotificationContext";
import { getCaptureMode } from "@/lib/captureMode";

// Cadence de capture : alignée sur celle de l'extraction de frames vidéo côté
// backend (1 image / 2s), avec un peu de marge pour laisser le temps à
// l'upload + l'analyse de la capture précédente de se terminer.
const CAPTURE_INTERVAL_MS = 3000;
const JPEG_QUALITY = 0.8;
// Au-delà de ce nombre d'échecs d'affilée, on considère que la capture ne
// remonte plus rien (pas juste un raté isolé) et on alerte le technicien.
const FAILURE_ALERT_THRESHOLD = 3;

interface PhoneCaptureContextType {
  isCapturing: boolean;
  error: string | null;
  // Même MediaStream que le <video> caché ci-dessous, exposé pour qu'un écran
  // (Vols.tsx) puisse l'afficher en direct — un MediaStream peut être attaché
  // à plusieurs éléments <video> sans conflit.
  stream: MediaStream | null;
  // Horodatage de la dernière capture uploadée avec succès — permet à
  // Vols.tsx d'afficher "dernière capture il y a Xs" plutôt que de laisser un
  // échec silencieux passer inaperçu jusqu'à la fin du vol.
  lastCaptureAt: number | null;
  consecutiveFailures: number;
}

const PhoneCaptureContext = createContext<PhoneCaptureContextType>({
  isCapturing: false,
  error: null,
  stream: null,
  lastCaptureAt: null,
  consecutiveFailures: 0,
});

export function usePhoneCapture() {
  return useContext(PhoneCaptureContext);
}

// Network Information API : support partiel (Chrome/Android), absente sur
// iOS Safari et Firefox — "wifi" par défaut plutôt que de deviner à tort.
function getConnectionType(): "wifi" | "4g" | "hors_ligne" {
  if (!navigator.onLine) return "hors_ligne";
  const nav = navigator as Navigator & { connection?: { type?: string } };
  return nav.connection?.type === "cellular" ? "4g" : "wifi";
}

// Battery Status API : dépréciée/retirée de la plupart des navigateurs
// (fingerprinting) — on tente, on abandonne silencieusement sinon.
async function getBatteryLevel(): Promise<number | undefined> {
  try {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number }> };
    if (!nav.getBattery) return undefined;
    const battery = await nav.getBattery();
    return Math.round(battery.level * 100);
  } catch {
    return undefined;
  }
}

function getCurrentPosition(): Promise<{ lat: number; lng: number } | undefined> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(undefined);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(undefined),
      { timeout: 5000, maximumAge: 10000 }
    );
  });
}

// Monté une seule fois dans AppShell (donc actif sur toutes les routes
// protégées) : la capture doit continuer même si le technicien quitte l'écran
// Vols pour aller sur Missions, par ex. — elle ne s'arrête que quand la
// mission n'est plus "en_cours" (mission terminée), pas quand la page change.
export function PhoneCaptureProvider({ children }: { children: ReactNode }) {
  const { addNotification } = useNotifications();
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [lastCaptureAt, setLastCaptureAt] = useState<number | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeFlightIdRef = useRef<string | null>(null);
  const imagesCapturedRef = useRef(0);
  // Garde-fou pour n'envoyer l'alerte qu'une fois par série d'échecs, pas à
  // chaque nouvel échec au-delà du seuil.
  const alertedRef = useRef(false);

  // Mêmes clés/options que Vols.tsx : React Query dédupe la requête entre les
  // deux composants, pas de double polling quand on est sur cette page.
  const {
    data: flight,
    isError,
  } = useQuery({
    queryKey: ["active-flight"],
    queryFn: api.getActiveFlight,
    refetchInterval: 4000,
  });
  const { data: missions } = useQuery({ queryKey: ["missions"], queryFn: api.getMissions });

  async function captureOnce(missionId: string, flightId: string) {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) return;

    const gps = await getCurrentPosition();

    try {
      const image = await api.uploadImage(missionId, blob, gps);
      // Analyse best-effort : un 422 (moteur indisponible / déjà analysée) ne
      // doit pas interrompre la boucle de capture.
      api.analyzeImage(image.id).catch(() => {});

      imagesCapturedRef.current += 1;
      const battery = await getBatteryLevel();
      await api.updateFlightTelemetry(flightId, {
        imagesCaptured: imagesCapturedRef.current,
        gps,
        battery,
        connection: getConnectionType(),
      });
      setLastCaptureAt(Date.now());
      setConsecutiveFailures(0);
      alertedRef.current = false;
    } catch (err) {
      // Une capture ratée (réseau...) ne doit pas arrêter la boucle — la suivante réessaiera.
      console.error("Échec d'une capture en direct", err);
      setConsecutiveFailures((n) => {
        const next = n + 1;
        if (next >= FAILURE_ALERT_THRESHOLD && !alertedRef.current) {
          alertedRef.current = true;
          addNotification({
            title: "Capture en direct interrompue",
            message: `${next} captures ont échoué d'affilée — vérifie la connexion du téléphone.`,
          });
        }
        return next;
      });
    }
  }

  function scheduleNext(missionId: string, flightId: string) {
    timeoutRef.current = setTimeout(async () => {
      await captureOnce(missionId, flightId);
      if (activeFlightIdRef.current === flightId) scheduleNext(missionId, flightId);
    }, CAPTURE_INTERVAL_MS);
  }

  async function start(missionId: string, flightId: string, startingCount: number) {
    setError(null);
    setLastCaptureAt(null);
    setConsecutiveFailures(0);
    alertedRef.current = false;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      activeFlightIdRef.current = flightId;
      imagesCapturedRef.current = startingCount;
      setIsCapturing(true);
      setStream(mediaStream);
      addNotification({
        title: "Capture en direct démarrée",
        message: "Le téléphone capture et analyse en continu, même si tu changes d'écran.",
      });
      scheduleNext(missionId, flightId);
    } catch (err) {
      const message =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Accès à la caméra refusé — autorise la caméra pour capturer en direct."
          : "Impossible d'accéder à la caméra du téléphone.";
      setError(message);
      addNotification({ title: "Capture en direct impossible", message });
    }
  }

  function stop() {
    activeFlightIdRef.current = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsCapturing(false);
    setStream(null);
  }

  useEffect(() => {
    if (!flight || isError || !missions) {
      if (activeFlightIdRef.current) stop();
      return;
    }

    const mission = missions.find((m) => m.id === flight.missionId);
    // Pas de mode enregistré (mission lancée avant ce choix, ou stockage
    // indisponible) : on retombe sur l'ancien comportement, streaming par
    // défaut pour une mission téléphone.
    const isUploadMode = mission ? getCaptureMode(mission.id) === "upload" : false;
    const shouldCapture = mission?.appareil === "appareil_photo" && flight.status === "en_cours" && !isUploadMode;

    if (shouldCapture && mission && activeFlightIdRef.current !== flight.id) {
      start(mission.id, flight.id, flight.imagesCaptured);
    } else if (!shouldCapture && activeFlightIdRef.current) {
      stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight, isError, missions]);

  // Coupe la caméra si le provider lui-même est démonté (déconnexion de l'app).
  useEffect(() => stop, []);

  return (
    <PhoneCaptureContext.Provider value={{ isCapturing, error, stream, lastCaptureAt, consecutiveFailures }}>
      {children}
      <video ref={videoRef} className="hidden" muted playsInline />
    </PhoneCaptureContext.Provider>
  );
}
