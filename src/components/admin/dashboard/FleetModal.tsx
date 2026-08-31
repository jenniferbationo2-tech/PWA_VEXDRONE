import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plane, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Drone, DroneStatus } from "@/lib/api/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: DroneStatus; label: string; variant: NonNullable<BadgeProps["variant"]> }[] = [
  { value: "disponible", label: "Disponible", variant: "success" },
  { value: "en_vol", label: "En vol", variant: "active" },
  { value: "maintenance", label: "Maintenance", variant: "pending" },
  { value: "hors_service", label: "Hors service", variant: "high" },
];

export function FleetModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [identifiant, setIdentifiant] = useState("");
  const [modele, setModele] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Drone | null>(null);

  const { data: drones, isLoading } = useQuery({ queryKey: ["drones"], queryFn: api.getDrones, enabled: open });

  useEffect(() => {
    if (open) {
      setIdentifiant("");
      setModele("");
      setError(null);
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: api.createDrone,
    onSuccess: () => {
      setIdentifiant("");
      setModele("");
      queryClient.invalidateQueries({ queryKey: ["drones"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Impossible d'ajouter ce drone."),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DroneStatus }) => api.updateDroneStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drones"] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.removeDrone(id),
    onSuccess: () => {
      setRemoveTarget(null);
      queryClient.invalidateQueries({ queryKey: ["drones"] });
    },
  });

  if (!open) return null;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!identifiant.trim()) {
      setError("Merci d'indiquer l'identifiant du drone.");
      return;
    }
    createMutation.mutate({ identifiant: identifiant.trim(), modele: modele.trim() || undefined });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-2xl dark:bg-brand-blue-dark">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-bold text-brand-blue-dark dark:text-white">Flotte</h2>
          <button
            onClick={onClose}
            className="text-brand-gray hover:text-brand-blue-dark dark:text-white/60 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-5 text-[12px] text-brand-gray dark:text-white/50">
          Flotte partagée par toute la plateforme — pas encore cloisonnée par entreprise côté API.
        </p>

        {isLoading ? (
          <div className="mb-5 space-y-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg border border-brand-blue/[0.06] px-4 py-2.5 dark:border-white/10"
              >
                <div className="min-w-0 flex-1">
                  <Skeleton className="mb-1.5 h-3.5 w-20" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-8 w-24 rounded-sm" />
              </div>
            ))}
          </div>
        ) : !drones || drones.length === 0 ? (
          <div className="mb-5 flex flex-col items-center justify-center rounded-lg border border-brand-blue/[0.06] py-8 text-center dark:border-white/10">
            <Plane size={24} strokeWidth={1.5} className="mb-2 text-brand-gray dark:text-white/40" />
            <p className="text-[13px] text-brand-gray dark:text-white/60">Aucun drone enregistré.</p>
          </div>
        ) : (
          <ul className="mb-5 space-y-1.5">
            {drones.map((drone) => {
              const statusInfo = STATUS_OPTIONS.find((s) => s.value === drone.status)!;
              return (
                <li
                  key={drone.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-brand-blue/[0.06] px-4 py-2.5 dark:border-white/10"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-brand-blue-dark dark:text-white">
                      {drone.identifiant}
                    </p>
                    {drone.modele && <p className="truncate text-[12px] text-brand-gray dark:text-white/60">{drone.modele}</p>}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <select
                      value={drone.status}
                      disabled={statusMutation.isPending}
                      onChange={(e) => statusMutation.mutate({ id: drone.id, status: e.target.value as DroneStatus })}
                      className="h-8 rounded-sm border border-brand-gray/25 bg-white px-2 text-[12px] text-brand-blue-dark focus-visible:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <Badge variant={statusInfo.variant} className="hidden sm:inline-flex">
                      {statusInfo.label}
                    </Badge>
                    <button
                      onClick={() => setRemoveTarget(drone)}
                      aria-label="Retirer ce drone"
                      className="text-brand-gray hover:text-brand-orange dark:text-white/50 dark:hover:text-brand-orange-light"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <form
          onSubmit={handleAdd}
          className="space-y-3 rounded-lg border border-brand-blue/[0.06] p-4 dark:border-white/10"
        >
          <h4 className="font-display text-[13px] font-semibold text-brand-blue-dark dark:text-white">
            Ajouter un drone
          </h4>
          <Input value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} placeholder="Identifiant (ex. DRONE-04)" />
          <Input value={modele} onChange={(e) => setModele(e.target.value)} placeholder="Modèle (optionnel)" />
          {error && <p className="text-[13px] font-medium text-brand-orange">⚠ {error}</p>}
          <div className="flex justify-end">
            <Button type="submit" size="sm" className="gap-1.5" disabled={createMutation.isPending}>
              <Plus size={14} />
              {createMutation.isPending ? "Ajout…" : "Ajouter"}
            </Button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        title="Retirer ce drone"
        description={`"${removeTarget?.identifiant}" sera retiré de la flotte. L'historique des missions déjà réalisées avec ce drone est conservé.`}
        confirmLabel="Retirer"
        loadingLabel="Retrait…"
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget.id)}
        onCancel={() => setRemoveTarget(null)}
        isLoading={removeMutation.isPending}
      />
    </div>
  );
}
