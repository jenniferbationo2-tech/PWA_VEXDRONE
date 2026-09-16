import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardList, Loader2, Tags, XCircle } from "lucide-react";
import { api } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { MissionTypesModal } from "@/components/admin/missions/MissionTypesModal";
import { useNotifications } from "@/lib/notifications/NotificationContext";
import type { Mission, MissionStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { getEffectiveStatus, MISSION_STATUS_BADGE, formatMissionDateRange } from "@/lib/missionStatus";

const FILTERS: { value: MissionStatus | "toutes"; label: string }[] = [
  { value: "toutes", label: "Toutes" },
  { value: "en_attente", label: "En attente" },
  { value: "en_cours", label: "En cours" },
  { value: "terminee", label: "Terminée" },
  { value: "annulee", label: "Annulée" },
];

const ITEMS_PER_PAGE = 10;

export function AdminMissions() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const [filter, setFilter] = useState<MissionStatus | "toutes">("toutes");
  const [page, setPage] = useState(1);
  const [typesModalOpen, setTypesModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Mission | null>(null);

  const { data: members } = useQuery({ queryKey: ["team-members"], queryFn: api.getTeamMembers });
  const technicienName = (userId?: string) => members?.find((m) => m.id === userId)?.name ?? "—";

  const { data: missionTypes } = useQuery({ queryKey: ["mission-types"], queryFn: api.getMissionTypes });
  const typeName = (typeMissionId?: string) => missionTypes?.find((t) => t.id === typeMissionId)?.name ?? "—";

  // Chargée en une fois (comme les autres listes admin) plutôt que paginée
  // côté serveur : l'API n'a aucun paramètre de tri, donc la page 1 d'une
  // vraie pagination serveur n'aurait aucune garantie de contenir la mission
  // la plus récente. Ici on trie/filtre/pagine en mémoire — même queryKey que
  // le graphique "Missions dans le temps" du dashboard Admin, donc le cache
  // est partagé entre les deux écrans.
  const { data: allMissions, isLoading, isError } = useQuery({
    queryKey: ["entreprise-missions", "all"],
    queryFn: () => api.getEntrepriseMissions({ itemsPerPage: 100 }),
    // Poll léger (même intervalle que Vols.tsx/Missions.tsx technicien) :
    // une nouvelle mission "en_attente" peut apparaître à tout moment sans
    // que l'admin n'interagisse avec cette page pour la voir.
    refetchInterval: 4000,
  });

  // Validation hiérarchique : seule action qui écrit le statut d'une mission
  // depuis ce rôle (voir missionStatus.ts). Réutilise le PATCH générique
  // /missions/{id} — pas d'endpoint dédié "accepter/rejeter" côté backend.
  const acceptMutation = useMutation({
    mutationFn: (mission: Mission) =>
      api.updateMission(mission.id, {
        name: mission.name,
        zone: mission.zone,
        description: mission.description,
        dateDebut: mission.dateDebut,
        dateFin: mission.dateFin,
        status: "en_cours",
        appareil: mission.appareil,
        droneId: mission.droneId,
        typeMissionId: mission.typeMissionId,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["entreprise-missions"] });
      addNotification({ title: "Mission acceptée", message: `"${updated.name}" peut maintenant être lancée.` });
    },
    onError: (err) => {
      addNotification({
        title: "Échec de l'acceptation",
        message: err instanceof Error ? err.message : "Une erreur inattendue est survenue.",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (mission: Mission) =>
      api.updateMission(mission.id, {
        name: mission.name,
        zone: mission.zone,
        description: mission.description,
        dateDebut: mission.dateDebut,
        dateFin: mission.dateFin,
        status: "annulee",
        appareil: mission.appareil,
        droneId: mission.droneId,
        typeMissionId: mission.typeMissionId,
      }),
    onSuccess: (updated) => {
      setCancelTarget(null);
      queryClient.invalidateQueries({ queryKey: ["entreprise-missions"] });
      addNotification({ title: "Mission annulée", message: `"${updated.name}" a été annulée.` });
    },
    onError: (err) => {
      addNotification({
        title: "Échec de l'annulation",
        message: err instanceof Error ? err.message : "Une erreur inattendue est survenue.",
      });
    },
  });

  const filtered = useMemo(() => {
    const missions = allMissions?.data ?? [];
    return filter === "toutes" ? missions : missions.filter((m) => getEffectiveStatus(m) === filter);
  }, [allMissions, filter]);

  const data = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return {
      data: filtered.slice(start, start + ITEMS_PER_PAGE),
      totalCount: filtered.length,
      hasMore: start + ITEMS_PER_PAGE < filtered.length,
      page,
      itemsPerPage: ITEMS_PER_PAGE,
    };
  }, [filtered, page]);

  function handleFilterChange(value: MissionStatus | "toutes") {
    setFilter(value);
    setPage(1);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1>Missions de l'entreprise</h1>
        <Button size="sm" className="gap-2" onClick={() => setTypesModalOpen(true)}>
          <Tags size={16} strokeWidth={1.75} />
          Gérer les types de mission
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            className={cn(
              "rounded-sm px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              filter === f.value
                ? "bg-brand-blue text-white"
                : "bg-white text-brand-blue-dark/70 border border-brand-gray/20 hover:bg-brand-off-white dark:bg-white/5 dark:text-white/70 dark:border-white/15 dark:hover:bg-white/10"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <TableSkeleton columns={7} />
      ) : isError ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-center shadow-card dark:border-white/10 dark:bg-brand-blue-dark">
          <p className="font-semibold text-brand-blue-dark dark:text-white">Impossible de charger les missions</p>
        </div>
      ) : data.data.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-center shadow-card dark:border-white/10 dark:bg-brand-blue-dark">
          <ClipboardList size={28} strokeWidth={1.5} className="mb-3 text-brand-gray dark:text-white/40" />
          <p className="text-[13px] text-brand-gray dark:text-white/60">
            {filter === "toutes" ? "Aucune mission pour l'instant." : "Aucune mission avec ce statut."}
          </p>
        </div>
      ) : (
        <>
          {/* Vue tableau — desktop */}
          <div className="hidden overflow-hidden rounded-lg border border-brand-blue/[0.06] bg-white shadow-card dark:border-white/10 dark:bg-brand-blue-dark md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[14px]">
                <thead>
                  <tr className="border-b border-brand-blue/[0.06] text-[12px] uppercase tracking-wide text-brand-gray dark:border-white/10">
                    <th className="px-5 py-3 font-medium">Titre</th>
                    <th className="px-5 py-3 font-medium">Zone</th>
                    <th className="px-5 py-3 font-medium">Technicien</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Statut</th>
                    <th className="px-5 py-3 font-medium">Dates</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((mission) => {
                    const effectiveStatus = getEffectiveStatus(mission);
                    const isPending = effectiveStatus === "en_attente";
                    const isAccepting = acceptMutation.isPending && acceptMutation.variables?.id === mission.id;
                    return (
                      <tr
                        key={mission.id}
                        className="border-b border-brand-blue/[0.04] last:border-0 dark:border-white/5"
                      >
                        <td className="px-5 py-3.5 font-semibold text-brand-blue-dark dark:text-white">{mission.name}</td>
                        <td className="px-5 py-3.5 text-brand-gray dark:text-white/60">{mission.zone}</td>
                        <td className="px-5 py-3.5 text-brand-gray dark:text-white/60">{technicienName(mission.userId)}</td>
                        <td className="px-5 py-3.5 text-brand-gray dark:text-white/60">{typeName(mission.typeMissionId)}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant={MISSION_STATUS_BADGE[effectiveStatus].variant}>{MISSION_STATUS_BADGE[effectiveStatus].label}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-brand-gray dark:text-white/60">
                          {formatMissionDateRange(mission.dateDebut, mission.dateFin)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-0.5">
                            {isPending &&
                              (isAccepting ? (
                                <span className="flex h-9 w-9 items-center justify-center text-brand-gray">
                                  <Loader2 size={16} className="animate-spin" />
                                </span>
                              ) : (
                                <>
                                  <IconButton
                                    icon={Check}
                                    label="Accepter"
                                    onClick={() => acceptMutation.mutate(mission)}
                                    className="hover:bg-status-success/10 hover:text-status-success"
                                  />
                                  <IconButton
                                    icon={XCircle}
                                    label="Annuler"
                                    onClick={() => setCancelTarget(mission)}
                                    className="hover:bg-brand-orange/10 hover:text-brand-orange"
                                  />
                                </>
                              ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vue cartes — mobile */}
          <div className="space-y-3 md:hidden">
            {data.data.map((mission) => {
              const effectiveStatus = getEffectiveStatus(mission);
              const isPending = effectiveStatus === "en_attente";
              const isAccepting = acceptMutation.isPending && acceptMutation.variables?.id === mission.id;
              return (
                <div
                  key={mission.id}
                  className="rounded-lg border border-brand-blue/[0.06] bg-white p-4 shadow-card dark:border-white/10 dark:bg-brand-blue-dark"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="font-semibold text-brand-blue-dark dark:text-white">{mission.name}</p>
                    <Badge variant={MISSION_STATUS_BADGE[effectiveStatus].variant}>{MISSION_STATUS_BADGE[effectiveStatus].label}</Badge>
                  </div>
                  <div className="space-y-1 text-[13px] text-brand-gray dark:text-white/60">
                    <p>{mission.zone}</p>
                    <p>{technicienName(mission.userId)}</p>
                    <p>{typeName(mission.typeMissionId)}</p>
                    <p>{formatMissionDateRange(mission.dateDebut, mission.dateFin)}</p>
                  </div>
                  {isPending && (
                    <div className="mt-3 flex items-center gap-4 border-t border-brand-blue/[0.06] pt-3 dark:border-white/10">
                      {isAccepting ? (
                        <span className="flex items-center gap-1 text-[13px] font-semibold text-brand-gray dark:text-white/60">
                          <Loader2 size={13} className="animate-spin" /> Acceptation…
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => acceptMutation.mutate(mission)}
                            className="flex items-center gap-1 text-[13px] font-semibold text-status-success hover:underline"
                          >
                            <Check size={13} /> Accepter
                          </button>
                          <button
                            onClick={() => setCancelTarget(mission)}
                            className="flex items-center gap-1 text-[13px] font-semibold text-brand-orange hover:underline"
                          >
                            <XCircle size={13} /> Annuler
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Pagination
            page={data.page}
            itemsPerPage={data.itemsPerPage}
            totalCount={data.totalCount}
            hasMore={data.hasMore}
            onPageChange={setPage}
          />
        </>
      )}

      <MissionTypesModal open={typesModalOpen} onClose={() => setTypesModalOpen(false)} />

      <ConfirmDialog
        open={!!cancelTarget}
        title="Annuler cette mission ?"
        description={`"${cancelTarget?.name}" passera au statut Annulée et ne pourra plus être lancée par le technicien.`}
        confirmLabel="Annuler la mission"
        loadingLabel="Annulation…"
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget)}
        onCancel={() => setCancelTarget(null)}
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
