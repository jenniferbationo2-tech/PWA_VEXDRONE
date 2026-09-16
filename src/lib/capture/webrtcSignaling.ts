// Helpers WebRTC partagés entre PhoneCaptureContext (récepteur, côté PC) et
// PhoneSender (émetteur, côté téléphone). Signalisation en HTTP polling
// (voir client.ts) plutôt que WebSocket — la WS existante est bloquée par un
// 403 au niveau de l'edge Cloudflare/Render (BACKEND_REQUESTS.md §6),
// indépendamment de cette fonctionnalité. ICE non-trickle (on attend la
// collecte complète avant d'envoyer le SDP) : évite un endpoint dédié à
// l'échange de candidats, largement suffisant pour 2 pairs sur le même WiFi.

export const STUN_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

const ICE_GATHERING_TIMEOUT_MS = 10_000;

export function waitForIceGatheringComplete(
  pc: RTCPeerConnection,
  timeoutMs = ICE_GATHERING_TIMEOUT_MS
): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      pc.removeEventListener("icegatheringstatechange", check);
      resolve();
    }, timeoutMs);
    function check() {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timeout);
        pc.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    }
    pc.addEventListener("icegatheringstatechange", check);
  });
}

// Doit être appelé IMMÉDIATEMENT après la création du RTCPeerConnection, avant
// tout setRemoteDescription : `ontrack` peut se déclencher dès que la SDP
// distante est appliquée (le track négocié devient disponible), pas
// seulement une fois les médias effectivement reçus — un `pc.ontrack = ...`
// posé après setRemoteDescription arrive donc parfois trop tard et rate
// l'évènement pour de bon (vécu en test : connectionState atteint
// "connected" mais ontrack jamais vu). Cette fonction n'a pas de timeout —
// c'est juste l'inscription du listener ; combiner avec `withTimeout`
// ci-dessous au moment où on veut vraiment attendre.
export function createRemoteTrackPromise(pc: RTCPeerConnection): Promise<MediaStream> {
  return new Promise((resolve) => {
    pc.ontrack = (event) => resolve(event.streams[0]);
  });
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs)),
  ]);
}

export interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
}

// fn doit retourner null tant que la ressource n'est pas prête (ex. 404 sur
// l'offer/answer côté client.ts) — une vraie erreur doit être levée, pas
// retournée, pour interrompre le polling immédiatement.
export async function pollUntil<T>(fn: () => Promise<T | null>, options: PollOptions = {}): Promise<T> {
  const { intervalMs = 2000, timeoutMs = 60_000 } = options;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await fn();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Délai dépassé en attendant la connexion.");
}
