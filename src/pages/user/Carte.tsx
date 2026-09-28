import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Map as MapIcon, Satellite } from "lucide-react";
import MapGL, {
  AttributionControl,
  Layer,
  Marker,
  NavigationControl,
  Popup,
  ScaleControl,
  Source,
  type MapRef,
} from "react-map-gl/maplibre";
import { setWorkerUrl, type LngLatBoundsLike } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { api } from "@/lib/api/client";
import type { Anomaly, Severity } from "@/lib/api/types";
import { useTheme } from "@/lib/theme/ThemeContext";
import { mapStyleFor, type BaseMap } from "@/lib/map/styles";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

// MapLibre v6 cherche son worker à côté de son propre fichier
// (import.meta.url), ce qui ne survit pas au bundling Vite — on lui donne
// explicitement l'URL du worker compilé par Vite (?worker&url).
setWorkerUrl(workerUrl);

const FOCUS_ZOOM = 17;
const DEFAULT_CENTER = { longitude: -1.5197, latitude: 12.3714 };
const BASEMAP_KEY = "vexdrone_basemap";

const SEVERITY_COLOR: Record<Severity, string> = {
  eleve: "#E37222",
  moyen: "#F2A93B",
  faible: "#8A8D8F",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  eleve: "Élevée",
  moyen: "Moyenne",
  faible: "Faible",
};

const DEMO_FLIGHT_PATH: [number, number][] = [
  [12.3547, -1.5616],
  [12.358, -1.556],
  [12.36, -1.558],
  [12.3565, -1.563],
];

const FLIGHT_PATH_GEOJSON: GeoJSON.Feature<GeoJSON.LineString> = {
  type: "Feature",
  properties: {},
  geometry: { type: "LineString", coordinates: DEMO_FLIGHT_PATH.map(([lat, lng]) => [lng, lat]) },
};

function readBaseMap(): BaseMap {
  try {
    return localStorage.getItem(BASEMAP_KEY) === "satellite" ? "satellite" : "plan";
  } catch {
    return "plan";
  }
}

// Emprise englobant anomalies + trajectoire, pour le cadrage initial.
function boundsOf(anomalies: Anomaly[]): LngLatBoundsLike | null {
  const points = [...anomalies.map((a) => [a.gps.lat, a.gps.lng]), ...DEMO_FLIGHT_PATH];
  if (points.length === 0) return null;
  let [minLat, minLng] = points[0];
  let [maxLat, maxLng] = points[0];
  for (const [lat, lng] of points) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

function AnomalyDot({ severity, focused }: { severity: Severity; focused: boolean }) {
  const pulsing = focused || severity === "eleve";
  return (
    <span
      className={cn("vex-marker", focused && "vex-marker--focused")}
      style={{ color: SEVERITY_COLOR[severity] }}
    >
      {pulsing && <span className="vex-marker__ring" />}
      {focused && <span className="vex-marker__ring vex-marker__ring--delayed" />}
      <span className="vex-marker__dot" />
    </span>
  );
}

function BaseMapToggle({ value, onChange }: { value: BaseMap; onChange: (v: BaseMap) => void }) {
  const options: { id: BaseMap; label: string; icon: typeof MapIcon }[] = [
    { id: "plan", label: "Plan", icon: MapIcon },
    { id: "satellite", label: "Satellite", icon: Satellite },
  ];
  return (
    <div className="absolute left-3 top-3 z-10 flex rounded-sm border border-brand-blue/10 bg-white/85 p-1 shadow-card backdrop-blur-md dark:border-white/10 dark:bg-brand-blue-dark/80">
      {options.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={active}
            className={cn(
              "relative flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[13px] font-semibold transition-colors",
              active ? "text-white" : "text-brand-blue hover:text-brand-orange dark:text-white/70 dark:hover:text-white"
            )}
          >
            {active && (
              <motion.span
                layoutId="basemap-pill"
                className="absolute inset-0 rounded-[6px] bg-gradient-to-r from-brand-blue to-brand-blue-light shadow-[0_4px_14px_-4px_rgba(227,114,34,0.55)]"
                transition={{ type: "spring", stiffness: 480, damping: 34 }}
              />
            )}
            <Icon size={14} strokeWidth={2} className="relative" />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SeverityLegend() {
  return (
    <div className="absolute bottom-3 left-3 z-10 flex gap-3 rounded-sm border border-brand-blue/10 bg-white/85 px-3 py-1.5 text-[12px] text-brand-blue-dark shadow-card backdrop-blur-md dark:border-white/10 dark:bg-brand-blue-dark/80 dark:text-white/80">
      {(Object.keys(SEVERITY_COLOR) as Severity[]).map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEVERITY_COLOR[s] }} />
          {SEVERITY_LABEL[s]}
        </span>
      ))}
    </div>
  );
}

export function Carte() {
  const { data: anomalies, isLoading, isError } = useQuery({
    queryKey: ["anomalies"],
    queryFn: api.getAnomalies,
  });
  const { theme } = useTheme();
  const [baseMap, setBaseMap] = useState<BaseMap>(readBaseMap);

  function changeBaseMap(next: BaseMap) {
    setBaseMap(next);
    try {
      localStorage.setItem(BASEMAP_KEY, next);
    } catch {
      // stockage indisponible (navigation privée) — le choix reste en mémoire
    }
  }

  // Ciblage depuis "Voir sur la carte" (Anomalies.tsx) : vol jusqu'à
  // l'anomalie, puis ouverture de son popup à l'arrivée. Son marqueur pulse
  // plus fort tant qu'elle reste la cible.
  const location = useLocation();
  const focusAnomalyId = (location.state as { anomalyId?: string } | null)?.anomalyId ?? null;
  const focusAnomaly = focusAnomalyId ? anomalies?.find((a) => a.id === focusAnomalyId) ?? null : null;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? anomalies?.find((a) => a.id === selectedId) ?? null : null;

  const mapRef = useRef<MapRef>(null);
  const [mapReady, setMapReady] = useState(false);

  const initialViewState = useMemo(() => {
    const bounds = anomalies ? boundsOf(anomalies) : null;
    return bounds
      ? { bounds, fitBoundsOptions: { padding: 64, maxZoom: 16 } }
      : { ...DEFAULT_CENTER, zoom: 13 };
    // Calculé une seule fois : la carte n'est montée qu'après le chargement
    // des anomalies, et initialViewState n'est lu qu'au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !focusAnomaly) return;
    setSelectedId(null);
    map.flyTo({
      center: [focusAnomaly.gps.lng, focusAnomaly.gps.lat],
      zoom: FOCUS_ZOOM,
      pitch: 45,
      duration: 2400,
      essential: true,
    });
    const id = focusAnomaly.id;
    const open = () => setSelectedId(id);
    map.once("moveend", open);
    return () => {
      map.off("moveend", open);
    };
  }, [mapReady, focusAnomaly]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1>Carte</h1>
        <span className="text-[13px] text-brand-gray dark:text-white/60">Ligne HT Secteur 7</span>
      </div>

      {isLoading ? (
        <Skeleton className="h-[420px] w-full rounded-lg md:h-[560px]" />
      ) : isError || !anomalies ? (
        <div className="flex h-[420px] flex-col items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-center shadow-card dark:border-white/10 dark:bg-brand-blue-dark dark:shadow-none md:h-[560px]">
          <p className="font-semibold text-brand-blue-dark dark:text-white">Impossible de charger les anomalies</p>
          <p className="mt-1 text-[13px] text-brand-gray dark:text-white/60">Vérifie la connexion à l'API et réessaie.</p>
        </div>
      ) : (
        <div className="relative h-[420px] overflow-hidden rounded-lg border border-brand-blue/[0.06] shadow-card dark:border-white/10 dark:shadow-none md:h-[560px]">
          <MapGL
            ref={mapRef}
            initialViewState={initialViewState}
            mapStyle={mapStyleFor(baseMap, theme === "dark")}
            attributionControl={false}
            maxPitch={60}
            onLoad={() => setMapReady(true)}
            onClick={() => setSelectedId(null)}
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="top-right" visualizePitch />
            <ScaleControl position="bottom-right" unit="metric" />
            <AttributionControl position="bottom-right" compact />

            <Source id="flight-path" type="geojson" data={FLIGHT_PATH_GEOJSON}>
              <Layer
                id="flight-path-glow"
                type="line"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{ "line-color": "#E37222", "line-width": 10, "line-opacity": 0.25, "line-blur": 6 }}
              />
              <Layer
                id="flight-path-line"
                type="line"
                layout={{ "line-cap": "round", "line-join": "round" }}
                paint={{ "line-color": "#E37222", "line-width": 2.5 }}
              />
            </Source>

            {anomalies.map((a) => (
              <Marker
                key={a.id}
                longitude={a.gps.lng}
                latitude={a.gps.lat}
                anchor="center"
                style={{ zIndex: a.id === focusAnomalyId ? 2 : 1 }}
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelectedId(a.id);
                }}
              >
                <AnomalyDot severity={a.severity} focused={a.id === focusAnomalyId} />
              </Marker>
            ))}

            {selected && (
              <Popup
                longitude={selected.gps.lng}
                latitude={selected.gps.lat}
                offset={16}
                closeButton={false}
                closeOnClick={false}
                onClose={() => setSelectedId(null)}
                className="vex-popup"
                maxWidth="260px"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEVERITY_COLOR[selected.severity] }} />
                  <span className="font-semibold text-brand-blue-dark dark:text-white">{selected.type}</span>
                </div>
                <div className="mt-1 text-brand-gray dark:text-white/60">
                  {selected.zone} · {selected.confidence}% confiance
                </div>
                <div className="mt-0.5 text-brand-gray dark:text-white/60">
                  Gravité {SEVERITY_LABEL[selected.severity].toLowerCase()}
                </div>
              </Popup>
            )}
          </MapGL>

          <BaseMapToggle value={baseMap} onChange={changeBaseMap} />
          <SeverityLegend />
        </div>
      )}
    </div>
  );
}
