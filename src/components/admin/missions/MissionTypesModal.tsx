import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Tags, Trash2, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { modalTransition, modalVariants, overlayTransition, overlayVariants } from "@/lib/motion";
import type { MissionType } from "@/lib/api/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MissionTypesModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<MissionType | null>(null);

  const { data: types, isLoading } = useQuery({
    queryKey: ["mission-types"],
    queryFn: api.getMissionTypes,
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setName("");
      setError(null);
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: api.createMissionType,
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["mission-types"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Impossible de créer ce type."),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.deleteMissionType(id),
    onSuccess: () => {
      setRemoveTarget(null);
      queryClient.invalidateQueries({ queryKey: ["mission-types"] });
    },
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Merci d'indiquer un nom.");
      return;
    }
    createMutation.mutate({ name: name.trim() });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="dark fixed inset-0 z-50 flex items-center justify-center bg-brand-blue-dark/60 px-4 backdrop-blur-sm"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={overlayTransition}
        >
          <motion.div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg border border-white/10 bg-brand-blue-dark/80 p-6 shadow-2xl backdrop-blur-md"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={modalTransition}
          >
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-display text-[18px] font-bold text-white">Types de mission</h2>
              <button onClick={onClose} className="text-white/60 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <p className="mb-5 text-[12px] text-white/50">
              Visibles par tes techniciens dans le formulaire de création de mission.
            </p>

            {isLoading ? (
              <div className="mb-5 space-y-1.5">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 w-full rounded-lg" />
                ))}
              </div>
            ) : !types || types.length === 0 ? (
              <div className="mb-5 flex flex-col items-center justify-center rounded-lg border border-white/10 py-8 text-center">
                <Tags size={24} strokeWidth={1.5} className="mb-2 text-white/40" />
                <p className="text-[13px] text-white/60">Aucun type défini pour l'instant.</p>
              </div>
            ) : (
              <ul className="mb-5 space-y-1.5">
                {types.map((type) => (
                  <li
                    key={type.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-4 py-2.5"
                  >
                    <p className="truncate text-[13px] font-semibold text-white">{type.name}</p>
                    <button
                      onClick={() => setRemoveTarget(type)}
                      aria-label="Supprimer ce type"
                      className="flex-shrink-0 text-white/50 hover:text-brand-orange-light"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleAdd} className="space-y-3 rounded-lg border border-white/10 p-4">
              <h4 className="font-display text-[13px] font-semibold text-white">Ajouter un type</h4>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Inspection préventive" />
              {error && <p className="text-[13px] font-medium text-brand-orange">⚠ {error}</p>}
              <div className="flex justify-end">
                <Button type="submit" size="sm" className="gap-1.5" disabled={createMutation.isPending}>
                  <Plus size={14} />
                  {createMutation.isPending ? "Ajout…" : "Ajouter"}
                </Button>
              </div>
            </form>

            <ConfirmDialog
              open={!!removeTarget}
              title="Supprimer ce type ?"
              description={`"${removeTarget?.name}" ne sera plus proposé à la création d'une mission. Les missions existantes qui l'utilisent déjà conservent la référence.`}
              confirmLabel="Supprimer"
              onConfirm={() => removeTarget && removeMutation.mutate(removeTarget.id)}
              onCancel={() => setRemoveTarget(null)}
              isLoading={removeMutation.isPending}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
