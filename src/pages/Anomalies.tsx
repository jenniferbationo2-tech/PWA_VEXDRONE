import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wifi, MapPin, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api/client";
import type { AnomalyStatus } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaAnalysisCard } from "@/components/anomalies/MediaAnalysisCard";
import { cn, formatRelativeTime } from "@/lib/utils";

const FILTERS: { value: AnomalyStatus | "toutes"; label: string }[] = [
  { value: "toutes", label: "Toutes" },
  { value: "non_traitee", label: "Non traitées" },
  { value: "traitee", label: "Traitées" },
];

const severityVariant = { eleve: "high", moyen: "medium", faible: "low" } as const;
const severityLabel = { eleve: "Élevé", moyen: "Moyen", faible: "Faible" } as const;

export function Anomalies() {
  const queryClient = useQueryClient();
  const { data: anomalies, isLoading, isError } = useQuery({
    queryKey: ["anomalies"],
    queryFn: api.getAnomalies,
  });

  // Reutilise le cache de la page Missions si deja charge. Le backend ne met
  // pas encore la zone directement sur l'anomalie : on la derive via la
  // mission, comme le nom (voir le TODO dans mappers.ts).
  const { data: missions } = useQuery({ queryKey: ["missions"], queryFn: api.getMissions });

  function missionName(missionId: string) {
    return missions?.find((m) => m.id === missionId)?.name ?? "Mission inconnue";
  }

  function missionZone(missionId: string, fallback: string) {
    return fallback || missions?.find((m) => m.id === missionId)?.zone || "—";
  }

  const [filter, setFilter] = useState<AnomalyStatus | "toutes">("toutes");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!anomalies) return [];
    if (filter === "toutes") return anomalies;
    return anomalies.filter((a) => a.status === filter);
  }, [anomalies, filter]);

  const selected = anomalies?.find((a) => a.id === selectedId) ?? filtered[0] ?? null;

  const markTreated = useMutation({
    mutationFn: api.markAnomalyTreated,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["anomalies"] }),
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1>IA & Anomalies</h1>
        <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-status-success/10 px-3 py-1 text-[12px] font-semibold text-status-success">
          <Wifi size={12} />
          Modèle IA actif · analyse serveur
        </span>
      </div>

      <div className="mb-6">
        <MediaAnalysisCard />
      </div>

      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-sm px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              filter === f.value
                ? "bg-brand-blue text-white"
                : "bg-white text-brand-blue-dark/70 border border-brand-gray/20 hover:bg-brand-off-white"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-brand-gray shadow-card">
              Chargement…
            </div>
          ) : isError ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-center shadow-card">
              <p className="font-semibold text-brand-blue-dark">Impossible de charger les anomalies</p>
              <p className="mt-1 text-[13px] text-brand-gray">Vérifie la connexion à l'API et réessaie.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-center shadow-card">
              <p className="font-semibold text-brand-blue-dark">Aucune anomalie ici</p>
              <p className="mt-1 text-[13px] text-brand-gray">Essaie un autre filtre.</p>
            </div>
          ) : (
            <>
              {/* Vue tableau — desktop */}
              <div className="hidden overflow-hidden rounded-lg border border-brand-blue/[0.06] bg-white shadow-card sm:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-[14px]">
                    <thead>
                      <tr className="border-b border-brand-blue/[0.06] text-[12px] uppercase tracking-wide text-brand-gray">
                        <th className="px-5 py-3 font-medium">ID</th>
                        <th className="px-5 py-3 font-medium">Type</th>
                        <th className="px-5 py-3 font-medium">Zone</th>
                        <th className="px-5 py-3 font-medium">Confiance</th>
                        <th className="px-5 py-3 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((a) => (
                        <tr
                          key={a.id}
                          onClick={() => setSelectedId(a.id)}
                          className={cn(
                            "cursor-pointer border-b border-brand-blue/[0.04] last:border-0 hover:bg-brand-off-white/60",
                            selected?.id === a.id && "bg-brand-orange/[0.06]"
                          )}
                        >
                          <td className="px-5 py-3.5 font-semibold text-brand-blue-dark">{a.id}</td>
                          <td className="px-5 py-3.5 text-brand-blue-dark/80">{a.type}</td>
                          <td className="px-5 py-3.5 text-brand-gray">{missionZone(a.missionId, a.zone)}</td>
                          <td className="px-5 py-3.5 font-semibold text-brand-blue-dark">{a.confidence}%</td>
                          <td className="px-5 py-3.5">
                            <Badge variant={a.status === "traitee" ? "success" : "pending"}>
                              {a.status === "traitee" ? "Traitée" : "Non traitée"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Vue cartes — mobile */}
              <div className="space-y-3 sm:hidden">
                {filtered.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={cn(
                      "w-full rounded-lg border bg-white p-4 text-left shadow-card transition-colors",
                      selected?.id === a.id
                        ? "border-brand-orange/40 bg-brand-orange/[0.06]"
                        : "border-brand-blue/[0.06]"
                    )}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[12px] font-semibold text-brand-gray">{a.id}</p>
                        <p className="font-semibold text-brand-blue-dark">{a.type}</p>
                      </div>
                      <Badge variant={a.status === "traitee" ? "success" : "pending"}>
                        {a.status === "traitee" ? "Traitée" : "Non traitée"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-brand-gray">{missionZone(a.missionId, a.zone)}</span>
                      <span className="font-semibold text-brand-blue-dark">{a.confidence}% confiance</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="rounded-lg border border-brand-blue/[0.06] bg-white p-5 shadow-card">
              <div className="relative mb-4 flex h-[220px] items-center justify-center rounded-sm bg-brand-off-white">
                <div className="h-16 w-20 rounded border-2 border-brand-orange" />
                <span className="absolute bottom-3 text-[12px] text-brand-gray">Image annotée (drone)</span>
              </div>

              <div className="mb-1 flex items-center justify-between">
                <h3>{selected.type}</h3>
                <Badge variant={selected.status === "traitee" ? "success" : "pending"}>
                  {selected.status === "traitee" ? "Traitée" : "Non traitée"}
                </Badge>
              </div>
              <div className="mb-4">
                <Badge variant={severityVariant[selected.severity]}>{severityLabel[selected.severity]}</Badge>
              </div>

              <div className="mb-4">
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="text-brand-gray">Confiance du modèle</span>
                  <span className="font-semibold text-brand-blue-dark">{selected.confidence}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-gray/15">
                  <div
                    className="h-full rounded-full bg-brand-blue"
                    style={{ width: `${selected.confidence}%` }}
                  />
                </div>
              </div>

              <dl className="mb-5 space-y-2.5 text-[13px]">
                <div className="flex items-center justify-between">
                  <dt className="text-brand-gray">Position GPS</dt>
                  <dd className="font-medium text-brand-blue-dark">
                    {selected.gps.lat.toFixed(4)}°N, {selected.gps.lng.toFixed(4)}°O
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-brand-gray">Mission</dt>
                  <dd className="font-medium text-brand-blue-dark">{missionName(selected.missionId)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-brand-gray">Détectée</dt>
                  <dd className="font-medium text-brand-blue-dark">{formatRelativeTime(selected.detectedAt)}</dd>
                </div>
              </dl>

              <div className="flex gap-2.5">
                <Button variant="secondary" size="sm" className="flex-1">
                  <MapPin size={14} />
                  Voir sur la carte
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  disabled={selected.status === "traitee" || markTreated.isPending}
                  onClick={() => markTreated.mutate(selected.id)}
                >
                  <CheckCircle2 size={14} />
                  {selected.status === "traitee" ? "Traitée" : "Marquer traité"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-brand-gray shadow-card">
              Sélectionne une anomalie
            </div>
          )}
        </div>
      </div>
    </div>
  );
}