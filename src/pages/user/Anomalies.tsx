import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Wifi, MapPin } from "lucide-react";
import { api } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/card";
import { MediaAnalysisCard } from "@/components/user/anomalies/MediaAnalysisCard";
import { getCurrentMissionId } from "@/lib/currentMission";
import { cn, formatRelativeTime } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

const severityVariant = { eleve: "high", moyen: "medium", faible: "low" } as const;
const severityLabel = { eleve: "Élevé", moyen: "Moyen", faible: "Faible" } as const;

export function Anomalies() {
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

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Le tableau ne montre que les résultats de la mission "courante" (la
  // dernière lancée depuis Missions.tsx — voir setCurrentMissionId) : ceux
  // de la mission précédente restent consultables (Rapports) mais
  // disparaissent d'ici dès qu'une nouvelle mission démarre. Avant tout
  // lancement sur cet appareil (pas encore de pointeur en localStorage), on
  // retombe sur la mission déjà lancée la plus récente, pour ne pas afficher
  // un tableau vide alors qu'une mission est en cours.
  const currentMissionId = getCurrentMissionId() ?? missions?.find((m) => m.status !== "en_attente")?.id ?? null;

  // Pas de filtre par statut ici : une anomalie fraîchement détectée doit
  // remonter automatiquement sans que le technicien ait à changer d'onglet.
  const filtered = currentMissionId ? (anomalies ?? []).filter((a) => a.missionId === currentMissionId) : [];

  const selected = filtered.find((a) => a.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1>IA & Anomalies</h1>
        <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-status-success/10 px-3 py-1 text-[12px] font-semibold text-status-success dark:bg-status-success/20">
          <Wifi size={12} />
          Modèle IA actif · analyse serveur
        </span>
      </div>

      <div className="mb-6">
        <MediaAnalysisCard />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <CardTitle className="mb-3">Résultat analyse</CardTitle>
          {isLoading ? (
            <TableSkeleton columns={5} />
          ) : isError ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-center shadow-card dark:border-white/10 dark:bg-brand-blue-dark dark:shadow-none">
              <p className="font-semibold text-brand-blue-dark dark:text-white">Impossible de charger les anomalies</p>
              <p className="mt-1 text-[13px] text-brand-gray dark:text-white/60">Vérifie la connexion à l'API et réessaie.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-center shadow-card dark:border-white/10 dark:bg-brand-blue-dark dark:shadow-none">
              <p className="font-semibold text-brand-blue-dark dark:text-white">Aucune anomalie détectée</p>
              <p className="mt-1 text-[13px] text-brand-gray dark:text-white/60">Lance une analyse pour voir apparaître des résultats ici.</p>
            </div>
          ) : (
            <>
              {/* Vue tableau — desktop */}
              <div className="hidden overflow-hidden rounded-lg border border-brand-blue/[0.06] bg-white shadow-card dark:border-white/10 dark:bg-brand-blue-dark dark:shadow-none sm:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-[14px]">
                    <thead>
                      <tr className="border-b border-brand-blue/[0.06] text-[12px] uppercase tracking-wide text-brand-gray dark:border-white/10 dark:text-white/60">
                        <th className="px-5 py-3 font-medium">ID</th>
                        <th className="px-5 py-3 font-medium">Type</th>
                        <th className="px-5 py-3 font-medium">Zone</th>
                        <th className="px-5 py-3 font-medium">Confiance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((a) => (
                        <tr
                          key={a.id}
                          onClick={() => setSelectedId(a.id)}
                          className={cn(
                            "cursor-pointer border-b border-brand-blue/[0.04] last:border-0 hover:bg-brand-off-white/60 dark:border-white/5 dark:hover:bg-white/5",
                            selected?.id === a.id && "bg-brand-orange/[0.06] dark:bg-brand-orange/[0.08]"
                          )}
                        >
                          <td className="px-5 py-3.5 font-semibold text-brand-blue-dark dark:text-white">{a.id}</td>
                          <td className="px-5 py-3.5 text-brand-blue-dark/80 dark:text-white/80">{a.type}</td>
                          <td className="px-5 py-3.5 text-brand-gray dark:text-white/60">{missionZone(a.missionId, a.zone)}</td>
                          <td className="px-5 py-3.5 font-semibold text-brand-blue-dark dark:text-white">{a.confidence}%</td>
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
                      "w-full rounded-lg border bg-white p-4 text-left shadow-card transition-colors dark:bg-brand-blue-dark dark:shadow-none",
                      selected?.id === a.id
                        ? "border-brand-orange/40 bg-brand-orange/[0.06] dark:bg-brand-orange/[0.08]"
                        : "border-brand-blue/[0.06] dark:border-white/10"
                    )}
                  >
                    <div className="mb-2">
                      <p className="text-[12px] font-semibold text-brand-gray dark:text-white/60">{a.id}</p>
                      <p className="font-semibold text-brand-blue-dark dark:text-white">{a.type}</p>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-brand-gray dark:text-white/60">{missionZone(a.missionId, a.zone)}</span>
                      <span className="font-semibold text-brand-blue-dark dark:text-white">{a.confidence}% confiance</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="rounded-lg border border-brand-blue/[0.06] bg-white p-5 shadow-card dark:border-white/10 dark:bg-brand-blue-dark dark:shadow-none">
              <CardTitle className="mb-3">Image analysée</CardTitle>
              <div className="mb-4 overflow-hidden rounded-sm bg-brand-off-white dark:bg-white/5">
                {selected.imageUrl ? (
                  // Le cadre est positionne en % du conteneur : celui-ci doit
                  // epouser exactement les dimensions rendues de l'image (pas
                  // de object-contain/hauteur fixe), sinon un eventuel
                  // letterboxing decale le cadre par rapport a la vraie zone
                  // detectee.
                  <div className="relative">
                    <img
                      src={selected.imageUrl}
                      alt={`Photo — ${selected.type}`}
                      className="block w-full"
                    />
                    {selected.bbox && (
                      <div
                        className="absolute border-2 border-brand-orange"
                        style={{
                          left: `${selected.bbox.x * 100}%`,
                          top: `${selected.bbox.y * 100}%`,
                          width: `${selected.bbox.width * 100}%`,
                          height: `${selected.bbox.height * 100}%`,
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div className="relative flex h-[220px] items-center justify-center">
                    <div className="h-16 w-20 rounded border-2 border-brand-orange" />
                    <span className="absolute bottom-3 text-[12px] text-brand-gray dark:text-white/50">Image indisponible</span>
                  </div>
                )}
              </div>

              <h3 className="mb-1">{selected.type}</h3>
              <div className="mb-4">
                <Badge variant={severityVariant[selected.severity]}>{severityLabel[selected.severity]}</Badge>
              </div>

              <div className="mb-4">
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="text-brand-gray dark:text-white/60">Confiance du modèle</span>
                  <span className="font-semibold text-brand-blue-dark dark:text-white">{selected.confidence}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-gray/15 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-brand-blue dark:bg-white"
                    style={{ width: `${selected.confidence}%` }}
                  />
                </div>
              </div>

              <dl className="mb-5 space-y-2.5 text-[13px]">
                <div className="flex items-center justify-between">
                  <dt className="text-brand-gray dark:text-white/60">Position GPS</dt>
                  <dd className="font-medium text-brand-blue-dark dark:text-white">
                    {selected.gps.lat.toFixed(4)}°N, {selected.gps.lng.toFixed(4)}°O
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-brand-gray dark:text-white/60">Mission</dt>
                  <dd className="font-medium text-brand-blue-dark dark:text-white">{missionName(selected.missionId)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-brand-gray dark:text-white/60">Détectée</dt>
                  <dd className="font-medium text-brand-blue-dark dark:text-white">{formatRelativeTime(selected.detectedAt)}</dd>
                </div>
              </dl>

              <Link to="/carte" state={{ anomalyId: selected.id }} className="block">
                <motion.div
                  whileHover={{ y: -2, scale: 1.015 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                  className="group flex items-center justify-center gap-2 rounded-sm bg-gradient-to-r from-brand-blue to-brand-blue-light px-4 py-2.5 text-[14px] font-semibold text-white shadow-card transition-shadow duration-200 hover:shadow-[0_10px_28px_-6px_rgba(227,114,34,0.5)]"
                >
                  <MapPin
                    size={16}
                    strokeWidth={2}
                    className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-110"
                  />
                  Voir sur la carte
                </motion.div>
              </Link>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-brand-gray shadow-card dark:border-white/10 dark:bg-brand-blue-dark dark:text-white/60 dark:shadow-none">
              Sélectionne une anomalie
            </div>
          )}
        </div>
      </div>
    </div>
  );
}