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
