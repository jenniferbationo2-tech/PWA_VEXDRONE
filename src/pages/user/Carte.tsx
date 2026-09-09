import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L, { type Marker as LeafletMarkerInstance } from "leaflet";
import { api } from "@/lib/api/client";
import type { Severity } from "@/lib/api/types";
import { Skeleton } from "@/components/ui/Skeleton";

const FOCUS_ZOOM = 17;

// Centre/zoome la carte sur l'anomalie ciblée (voir "Voir sur la carte" dans
// Anomalies.tsx) — center/zoom sur <MapContainer> ne s'appliquent qu'au tout
// premier rendu (composant non contrôlé côté react-leaflet), donc tout
// recentrage après coup doit passer par l'instance de carte via useMap().
function FocusOnPosition({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, FOCUS_ZOOM, { duration: 1 });
  }, [position, map]);
  return null;
}

const SEVERITY_COLOR: Record<Severity, string> = {
  eleve: "#E37222",
  moyen: "#F2A93B",
  faible: "#8A8D8F",
};

function markerIcon(severity: Severity) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:18px;height:18px;border-radius:9999px;
      background:${SEVERITY_COLOR[severity]};
      border:2.5px solid white;
      box-shadow:0 1px 4px rgba(27,54,93,0.35);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

const DEMO_FLIGHT_PATH: [number, number][] = [
  [12.3547, -1.5616],
  [12.358, -1.556],
  [12.36, -1.558],
  [12.3565, -1.563],
];

export function Carte() {
  const { data: anomalies, isLoading, isError } = useQuery({
    queryKey: ["anomalies"],
    queryFn: api.getAnomalies,
  });

  // Ciblage depuis "Voir sur la carte" (Anomalies.tsx) — voir FocusOnPosition
  // pour le recentrage effectif et markerRefs pour l'ouverture du popup.
  const location = useLocation();
  const focusAnomalyId = (location.state as { anomalyId?: string } | null)?.anomalyId ?? null;
  const focusAnomaly = focusAnomalyId ? anomalies?.find((a) => a.id === focusAnomalyId) ?? null : null;
  const focusPosition = useMemo<[number, number] | null>(
    () => (focusAnomaly ? [focusAnomaly.gps.lat, focusAnomaly.gps.lng] : null),
    [focusAnomaly]
  );

  const center = useMemo<[number, number]>(() => {
    if (focusPosition) return focusPosition;
    if (!anomalies || anomalies.length === 0) return [12.3714, -1.5197];
    const lat = anomalies.reduce((s, a) => s + a.gps.lat, 0) / anomalies.length;
    const lng = anomalies.reduce((s, a) => s + a.gps.lng, 0) / anomalies.length;
    return [lat, lng];
  }, [anomalies, focusPosition]);

  const markerRefs = useRef(new Map<string, LeafletMarkerInstance>());

  // Le marqueur ciblé peut monter après ce render (anomalies encore en cours
  // de chargement au premier passage) — on retente à chaque changement de
  // focusAnomalyId/anomalies plutôt qu'une seule fois au montage.
  useEffect(() => {
    if (!focusAnomalyId) return;
    markerRefs.current.get(focusAnomalyId)?.openPopup();
  }, [focusAnomalyId, anomalies]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1>Carte</h1>
        <span className="text-[13px] text-brand-gray dark:text-white/60">Ligne HT Secteur 7</span>
      </div>

      {isLoading ? (
        <Skeleton className="h-[420px] w-full rounded-lg" />
      ) : isError || !anomalies ? (
        <div className="flex h-[420px] flex-col items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-center shadow-card dark:border-white/10 dark:bg-brand-blue-dark dark:shadow-none">
          <p className="font-semibold text-brand-blue-dark dark:text-white">Impossible de charger les anomalies</p>
          <p className="mt-1 text-[13px] text-brand-gray dark:text-white/60">Vérifie la connexion à l'API et réessaie.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-brand-blue/[0.06] shadow-card dark:border-white/10 dark:shadow-none">
          <MapContainer
            center={center}
            zoom={focusPosition ? FOCUS_ZOOM : 14}
            scrollWheelZoom={false}
            style={{ height: 420, width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FocusOnPosition position={focusPosition} />
            <Polyline positions={DEMO_FLIGHT_PATH} pathOptions={{ color: "#E37222", weight: 2.5 }} />
            {anomalies.map((a) => (
              <Marker
                key={a.id}
                position={[a.gps.lat, a.gps.lng]}
                icon={markerIcon(a.severity)}
                ref={(instance) => {
                  if (instance) markerRefs.current.set(a.id, instance);
                  else markerRefs.current.delete(a.id);
                }}
              >
                <Popup>
                  <div className="text-[13px]">
                    <div className="font-semibold text-brand-blue-dark">{a.type}</div>
                    <div className="text-brand-gray">{a.zone} · {a.confidence}% confiance</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}