import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { api } from "@/lib/api/client";
import { STUN_SERVERS, waitForIceGatheringComplete, pollUntil } from "@/lib/capture/webrtcSignaling";

// Page publique (hors ProtectedRoute/AppShell, voir App.tsx) ouverte en
// scannant le QR affiché sur Vols.tsx en mode "Caméra distante". Volontairement
// minimale : capture caméra + envoi WebRTC, aucune logique métier — c'est le
// PC qui reste le "cerveau" de la mission (session authentifiée, upload,
// analyse). Ne dépend pas de PhoneCaptureContext, qui n'est monté que dans
// AppShell et donc absent de cette route.
type Status = "requesting-camera" | "connecting" | "connected" | "error";

export function PhoneSender() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>("requesting-camera");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Lien invalide.");
      return;
    }
    // Capture dans une const narrowee à `string` : `token` reste `string |
    // undefined` pour TS à l'intérieur de la closure `run()` sinon, même
    // après le garde ci-dessus.
    const pairingToken = token;

    let cancelled = false;

    async function run() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
        setStatus("connecting");

        const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
        pcRef.current = pc;
        mediaStream.getTracks().forEach((track) => pc.addTrack(track, mediaStream));
        pc.onconnectionstatechange = () => {
          if (cancelled) return;
          if (pc.connectionState === "connected") setStatus("connected");
          if (
            pc.connectionState === "failed" ||
            pc.connectionState === "disconnected" ||
            pc.connectionState === "closed"
          ) {
            setStatus("error");
            setErrorMessage("Connexion perdue avec l'ordinateur.");
          }
        };

        // Non-trickle des deux côtés (voir webrtcSignaling.ts) : le PC a déjà
        // attendu sa propre collecte ICE avant de poster son offre, donc rien
        // à échanger ici hormis l'offre puis la réponse elles-mêmes.
        const offer = await pollUntil(() => api.getSignalingOffer(pairingToken), {
          intervalMs: 2000,
          timeoutMs: 60_000,
        });
        if (cancelled) return;
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await waitForIceGatheringComplete(pc);
        if (cancelled) return;
        await api.postSignalingAnswer(pairingToken, pc.localDescription!);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(
          err instanceof Error && err.name === "NotAllowedError"
            ? "Accès à la caméra refusé — autorise la caméra pour continuer."
            : err instanceof Error
              ? err.message
              : "Impossible de se connecter à la mission."
        );
      }
    }

    run();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
    };
  }, [token]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-brand-blue-dark px-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(39,74,122,0.7) 0%, rgba(27,54,93,0.5) 45%, rgba(13,27,48,0.85) 100%)",
        }}
      />

      <div className="relative w-full max-w-[380px] rounded-lg border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl backdrop-blur-sm">
        <div className="mx-auto mb-4 flex h-15 w-15 items-center justify-center rounded-full ring-2 ring-brand-orange/40">
          <img src="/logo/vexdrone-icon.png" alt="VEXDRON" className="h-full w-full rounded-full" />
        </div>

        <div className="relative mb-5 aspect-video w-full overflow-hidden rounded-md bg-black">
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        </div>

        {status === "requesting-camera" && (
          <p className="flex items-center justify-center gap-2 text-[14px] text-white/70">
            <Loader2 size={16} className="animate-spin" /> Demande d'accès à la caméra…
          </p>
        )}
        {status === "connecting" && (
          <p className="flex items-center justify-center gap-2 text-[14px] text-white/70">
            <Loader2 size={16} className="animate-spin" /> Connexion à la mission…
          </p>
        )}
        {status === "connected" && (
          <p className="flex items-center justify-center gap-2 text-[14px] font-semibold text-emerald-400">
            <CheckCircle2 size={16} /> Caméra active — connectée à la mission
          </p>
        )}
        {status === "error" && (
          <p className="flex items-center justify-center gap-2 text-[14px] font-semibold text-brand-orange">
            <XCircle size={16} /> {errorMessage}
          </p>
        )}

        <p className="mt-6 text-[12px] text-white/30">VEXDRONE — Caméra distante</p>
      </div>
    </div>
  );
}
