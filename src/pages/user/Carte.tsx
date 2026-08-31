import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import { AlertTriangle, Zap, Leaf } from "lucide-react";
import { api } from "@/lib/api/client";
import type { Anomaly, Severity } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

const SEVERITY_COLOR: Record<Severity, string> = {
  eleve: "#E37222",
  moyen: "#F2A93B",
  faible: "#8A8D8F",
};
const severityVariant = { eleve: "high", moyen: "medium", faible: "low" } as const;
const severityLabel = { eleve: "Élevé", moyen: "Moyen", faible: "Faible" } as const;

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

const TYPE_ICON: Record<string, typeof AlertTriangle> = {
  "Isolateur cassé": AlertTriangle,
  "Câble endommagé": Zap,
  "Poteau incliné": AlertTriangle,
  "Végétation envahissante": Leaf,
};

export function Carte() {
  const { data: anomalies, isLoading, isError } = useQuery({
    queryKey: ["anomalies"],
    queryFn: api.getAnomalies,
  });

  // Reutilise le cache de la page Missions si deja charge. Le backend ne met
  // pas encore la zone directement sur l'anomalie (TODO dans mappers.ts) :
  // on la derive ici via la mission, comme le nom.
  const { data: missions } = useQuery({ queryKey: ["missions"], queryFn: api.getMissions });

  function missionName(missionId: string) {
    return missions?.find((m) => m.id === missionId)?.name ?? "Mission inconnue";
  }

  function missionZone(missionId: string, fallback: string) {
    return fallback || missions?.find((m) => m.id === missionId)?.zone || "—";
  }

  const center = useMemo<[number, number]>(() => {
    if (!anomalies || anomalies.length === 0) return [12.3714, -1.5197];
    const lat = anomalies.reduce((s, a) => s + a.gps.lat, 0) / anomalies.length;
    const lng = anomalies.reduce((s, a) => s + a.gps.lng, 0) / anomalies.length;
    return [lat, lng];
  }, [anomalies]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1>Carte</h1>
        <span className="text-[13px] text-brand-gray">Ligne HT Secteur 7</span>
      </div>

      {isLoading ? (
        <>
          <Skeleton className="h-[420px] w-full rounded-lg" />
          <div className="mt-5">
            <TableSkeleton columns={6} />
          </div>
        </>
      ) : isError || !anomalies ? (
        <div className="flex h-[420px] flex-col items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-center shadow-card">
          <p className="font-semibold text-brand-blue-dark">Impossible de charger les anomalies</p>
          <p className="mt-1 text-[13px] text-brand-gray">Vérifie la connexion à l'API et réessaie.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-brand-blue/[0.06] shadow-card">
            <MapContainer center={center} zoom={14} scrollWheelZoom={false} style={{ height: 420, width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Polyline positions={DEMO_FLIGHT_PATH} pathOptions={{ color: "#E37222", weight: 2.5 }} />
              {anomalies.map((a) => (
                <Marker key={a.id} position={[a.gps.lat, a.gps.lng]} icon={markerIcon(a.severity)}>
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

          <div className="mt-5 overflow-hidden rounded-lg border border-brand-blue/[0.06] bg-white shadow-card">
            <table className="w-full text-left text-[14px]">
              <tbody>
                {anomalies.map((a: Anomaly, i: number) => {
                  const Icon = TYPE_ICON[a.type] ?? AlertTriangle;
                  return (
                    <tr key={a.id} className="border-b border-brand-blue/[0.04] last:border-0 hover:bg-brand-off-white/60">
                      <td className="w-10 px-5 py-3.5 text-brand-gray">{i + 1}.</td>
                      <td className="px-2 py-3.5">
                        <div className="flex items-center gap-2">
                          <Icon size={15} style={{ color: SEVERITY_COLOR[a.severity] }} />
                          <span className="font-semibold text-brand-blue-dark">{a.type}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-brand-gray">{missionZone(a.missionId, a.zone)}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={severityVariant[a.severity]}>{severityLabel[a.severity]}</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={a.status === "traitee" ? "success" : "pending"}>
                          {a.status === "traitee" ? "Traitée" : "Non traitée"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-brand-gray">{missionName(a.missionId)}</td>
                      <td className="px-5 py-3.5 text-right text-brand-gray">{formatRelativeTime(a.detectedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}