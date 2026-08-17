import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api/client";
import type { Mission, MissionStatus, NewMissionInput } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

  const filtered = useMemo(() => {
    if (!missions) return [];
    return missions.filter((m: Mission) => {
      const matchesFilter = filter === "toutes" || m.status === filter;
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
      <div className="mb-6 flex items-center justify-between">
        <h1>Missions</h1>
        <Button variant="primary" size="sm" onClick={openCreateModal}>
          <Plus size={14} />
          Nouvelle mission
        </Button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray" />
        <Input
          placeholder="Rechercher une mission, une zone ou un lieu…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="mb-5 flex gap-2">
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
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-brand-blue/[0.06] text-[12px] uppercase tracking-wide text-brand-gray">
                  <th className="px-6 py-3 font-medium">Zone</th>
                  <th className="px-6 py-3 font-medium">Mission</th>
                  <th className="px-6 py-3 font-medium">Période</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium">Statut</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m: Mission) => (
                  <tr key={m.id} className="border-b border-brand-blue/[0.04] last:border-0 hover:bg-brand-off-white/60">
                    <td className="px-6 py-3.5">
                      <Badge variant="neutral">{m.zone}</Badge>
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-brand-blue-dark">{m.name}</td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-brand-gray">
                      {formatDateRange(m.dateDebut, m.dateFin)}
                    </td>
                    <td className="px-6 py-3.5 max-w-xs truncate text-brand-blue-dark/80">{m.description}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant={STATUS_BADGE[m.status].variant}>{STATUS_BADGE[m.status].label}</Badge>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vue cartes — mobile */}
          <div className="space-y-3 md:hidden">
            {filtered.map((m: Mission) => (
              <div key={m.id} className="rounded-lg border border-brand-blue/[0.06] bg-white p-4 shadow-card">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="neutral">{m.zone}</Badge>
                    <p className="mt-1.5 font-semibold text-brand-blue-dark">{m.name}</p>
                  </div>
                  <Badge variant={STATUS_BADGE[m.status].variant}>{STATUS_BADGE[m.status].label}</Badge>
                </div>

                <p className="mb-3 text-[13px] text-brand-blue-dark/80">{m.description}</p>

                <div className="mb-3 flex items-center justify-between text-[13px]">
                  <span className="text-brand-gray">Période</span>
                  <span className="font-medium text-brand-blue-dark">
                    {formatDateRange(m.dateDebut, m.dateFin)}
                  </span>
                </div>

                <div className="flex items-center gap-4 border-t border-brand-blue/[0.06] pt-3">
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
            ))}
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