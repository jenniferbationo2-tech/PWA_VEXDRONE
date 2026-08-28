import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Pencil, Trash2, Play, Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { getEffectiveStatus } from "@/lib/missionStatus";
import type { Mission, MissionStatus, NewMissionInput } from "@/lib/api/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/IconButton";
import { useNotifications } from "@/lib/notifications/NotificationContext";
import { cn } from "@/lib/utils";
import { NewMissionModal } from "@/components/missions/NewMissionModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const FILTERS: { value: MissionStatus | "toutes"; label: string }[] = [
  { value: "toutes", label: "Toutes" },
  { value: "en_attente", label: "En attente" },
  { value: "en_cours", label: "En cours" },
  { value: "terminee", label: "Terminée" },
];

const STATUS_BADGE = {
  en_attente: { variant: "pending", label: "En attente" },
  en_cours: { variant: "active", label: "En cours" },
  terminee: { variant: "neutral", label: "Terminée" },
} as const;

function formatDateRange(dateDebut: string, dateFin: string) {
  const d1 = new Date(dateDebut).toLocaleDateString("fr-FR");
  const d2 = new Date(dateFin).toLocaleDateString("fr-FR");
  return dateDebut === dateFin ? d1 : `${d1} → ${d2}`;
}

export function Missions() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const { data: missions, isLoading, isError } = useQuery({
    queryKey: ["missions"],
    queryFn: api.getMissions,
  });

  const [filter, setFilter] = useState<MissionStatus | "toutes">("toutes");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Mission | null>(null);
  const [deleting, setDeleting] = useState(false);

  const launchMutation = useMutation({
    mutationFn: async (mission: Mission) => {
      const updated = await api.updateMission(mission.id, {
        name: mission.name,
        zone: mission.zone,
        description: mission.description,
        dateDebut: mission.dateDebut,
        dateFin: mission.dateFin,
        status: "en_cours",
      });
      // Deux appels distincts : passer la mission en_cours ne demarre pas de
      // vol tout seul (voir startVol dans client.ts).
      await api.startVol(mission.id);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      addNotification({
        title: "Mission lancée",
        message: `"${updated.name}" est en cours — suivez le vol en direct.`,
        link: "/vols",
      });
    },
  });

  const filtered = useMemo(() => {
    if (!missions) return [];
    return missions.filter((m: Mission) => {
      const matchesFilter = filter === "toutes" || getEffectiveStatus(m) === filter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        m.name.toLowerCase().includes(q) ||
        m.zone.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [missions, filter, search]);

  function openCreateModal() {
    setEditingMission(null);
    setModalOpen(true);
  }

  function openEditModal(mission: Mission) {
    setEditingMission(mission);
    setModalOpen(true);
  }

  async function handleSave(input: NewMissionInput) {
    if (editingMission) {
      await api.updateMission(editingMission.id, input);
    } else {
      await api.createMission(input);
    }
    queryClient.invalidateQueries({ queryKey: ["missions"] });
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteMission(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      setDeleteTarget(null);
    } catch {
      // en cas d'échec, on laisse la popup ouverte pour réessayer
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6">Missions</h1>

      <div className="relative mb-4">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray" />
        <Input
          placeholder="Rechercher une mission, une zone ou un lieu…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
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

        <button
          type="button"
          onClick={openCreateModal}
          aria-label="Nouvelle mission"
          className="group flex h-9 flex-shrink-0 items-center rounded-sm bg-brand-blue px-2.5 text-white transition-colors hover:bg-brand-blue-light"
        >
          <Plus size={16} className="flex-shrink-0" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-[13px] font-semibold transition-[max-width] duration-200 group-hover:max-w-[140px] group-focus-visible:max-w-[140px]">
            <span className="pl-2">Nouvelle mission</span>
          </span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-brand-gray">Chargement des missions…</div>
      ) : isError ? (
        <div className="flex h-40 flex-col items-center justify-center text-center">
          <p className="font-semibold text-brand-blue-dark">Impossible de charger les missions</p>
          <p className="mt-1 text-[13px] text-brand-gray">Vérifie la connexion à l'API et réessaie.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center text-center">
          <p className="font-semibold text-brand-blue-dark">Aucune mission ne correspond</p>
          <p className="mt-1 text-[13px] text-brand-gray">Essaie un autre filtre ou une autre recherche.</p>
        </div>
      ) : (
        <>
          {/* Vue tableau — desktop */}
          <div className="hidden overflow-hidden rounded-lg border border-brand-blue/[0.06] bg-white shadow-card md:block">
            <table className="w-full table-fixed text-left text-[14px]">
              <colgroup>
                <col className="w-[11%]" />
                <col className="w-[19%]" />
                <col className="w-[17%]" />
                <col className="w-[26%]" />
                <col className="w-[12%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-brand-blue/[0.06] text-[12px] uppercase tracking-wide text-brand-gray">
                  <th className="px-3 py-3 font-medium">Zone</th>
                  <th className="px-3 py-3 font-medium">Mission</th>
                  <th className="px-3 py-3 font-medium">Période</th>
                  <th className="px-3 py-3 font-medium">Description</th>
                  <th className="px-3 py-3 font-medium">Statut</th>
                  <th className="px-3 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m: Mission) => {
                  const isLaunching = launchMutation.isPending && launchMutation.variables?.id === m.id;
                  const effectiveStatus = getEffectiveStatus(m);
                  return (
                    <tr key={m.id} className="border-b border-brand-blue/[0.04] last:border-0 hover:bg-brand-off-white/60">
                      <td className="px-3 py-3 truncate" title={m.zone}>
                        <Badge variant="neutral">{m.zone}</Badge>
                      </td>
                      <td className="truncate px-3 py-3 font-semibold text-brand-blue-dark" title={m.name}>
                        {m.name}
                      </td>
                      <td
                        className="truncate px-3 py-3 text-brand-gray"
                        title={formatDateRange(m.dateDebut, m.dateFin)}
                      >
                        {formatDateRange(m.dateDebut, m.dateFin)}
                      </td>
                      <td className="truncate px-3 py-3 text-brand-blue-dark/80" title={m.description}>
                        {m.description}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={STATUS_BADGE[effectiveStatus].variant}>{STATUS_BADGE[effectiveStatus].label}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          {effectiveStatus === "en_attente" &&
                            (isLaunching ? (
                              <span className="flex h-9 w-9 items-center justify-center text-brand-gray">
                                <Loader2 size={16} className="animate-spin" />
                              </span>
                            ) : (
                              <IconButton
                                icon={Play}
                                label="Lancer"
                                onClick={() => launchMutation.mutate(m)}
                                className="hover:bg-status-success/10 hover:text-status-success"
                              />
                            ))}
                          <IconButton
                            icon={Pencil}
                            label="Modifier"
                            onClick={() => openEditModal(m)}
                            className="hover:bg-brand-blue/5 hover:text-brand-blue"
                          />
                          <IconButton
                            icon={Trash2}
                            label="Supprimer"
                            onClick={() => setDeleteTarget(m)}
                            className="hover:bg-brand-orange/10 hover:text-brand-orange"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Vue cartes — mobile */}
          <div className="space-y-3 md:hidden">
            {filtered.map((m: Mission) => {
              const effectiveStatus = getEffectiveStatus(m);
              return (
                <div key={m.id} className="rounded-lg border border-brand-blue/[0.06] bg-white p-4 shadow-card">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="neutral">{m.zone}</Badge>
                      <p className="mt-1.5 font-semibold text-brand-blue-dark">{m.name}</p>
                    </div>
                    <Badge variant={STATUS_BADGE[effectiveStatus].variant}>{STATUS_BADGE[effectiveStatus].label}</Badge>
                  </div>

                  <p className="mb-3 text-[13px] text-brand-blue-dark/80">{m.description}</p>

                  <div className="mb-3 flex items-center justify-between text-[13px]">
                    <span className="text-brand-gray">Période</span>
                    <span className="font-medium text-brand-blue-dark">
                      {formatDateRange(m.dateDebut, m.dateFin)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 border-t border-brand-blue/[0.06] pt-3">
                    {effectiveStatus === "en_attente" &&
                      (launchMutation.isPending && launchMutation.variables?.id === m.id ? (
                        <span className="flex items-center gap-1 text-[13px] font-semibold text-brand-gray">
                          <Loader2 size={13} className="animate-spin" /> Lancement…
                        </span>
                      ) : (
                        <button
                          onClick={() => launchMutation.mutate(m)}
                          className="flex items-center gap-1 text-[13px] font-semibold text-status-success hover:underline"
                        >
                          <Play size={13} /> Lancer
                        </button>
                      ))}
                    <button
                      onClick={() => openEditModal(m)}
                      className="flex items-center gap-1 text-[13px] font-semibold text-brand-blue hover:underline"
                    >
                      <Pencil size={13} /> Modifier
                    </button>
                    <button
                      onClick={() => setDeleteTarget(m)}
                      className="flex items-center gap-1 text-[13px] font-semibold text-brand-orange hover:underline"
                    >
                      <Trash2 size={13} /> Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <NewMissionModal
        open={modalOpen}
        mission={editingMission}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer la mission ?"
        description={`Cette action supprimera définitivement "${deleteTarget?.name}". Elle ne pourra pas être récupérée.`}
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleting}
      />
    </div>
  );
}