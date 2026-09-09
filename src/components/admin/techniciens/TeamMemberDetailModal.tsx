import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Ban, Pencil, Trash2, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EditTeamMemberModal } from "./EditTeamMemberModal";
import { getInitials } from "@/lib/utils";
import { modalTransition, modalVariants, overlayTransition, overlayVariants } from "@/lib/motion";

interface Props {
  open: boolean;
  memberId: string | null;
  onClose: () => void;
}

// Id, pas l'objet entier : reflète l'état à jour de la liste après une
// mutation, plutôt qu'un instantané pris au clic (voir EntrepriseDetailModal
// pour le bug déjà rencontré avec ce pattern).
export function TeamMemberDetailModal({ open, memberId, onClose }: Props) {
  const queryClient = useQueryClient();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [editing, setEditing] = useState(false);

  const { data: members } = useQuery({
    queryKey: ["team-members"],
    queryFn: api.getTeamMembers,
    enabled: open,
  });
  const member = members?.find((m) => m.id === memberId) ?? null;

  const removeMutation = useMutation({
    mutationFn: () => api.removeTeamMember(member!.username),
    onSuccess: () => {
      setConfirmRemove(false);
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: { name: string; email: string }) => api.updateTeamMember(member!.username, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team-members"] }),
  });

  return (
    <AnimatePresence>
      {open && member && (
        <motion.div
          className="dark fixed inset-0 z-50 flex items-center justify-center bg-brand-blue-dark/60 px-4 backdrop-blur-sm"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={overlayTransition}
        >
          <motion.div
            className="w-full max-w-md rounded-lg border border-white/10 bg-brand-blue-dark/80 p-6 shadow-2xl backdrop-blur-md"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={modalTransition}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue text-[15px] font-semibold text-white">
                  {getInitials(member.name)}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-display text-[16px] font-bold text-brand-blue-dark dark:text-white">
                    {member.name}
                  </h2>
                  <p className="truncate text-[13px] text-brand-gray dark:text-white/60">@{member.username}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 text-brand-gray hover:text-brand-blue-dark dark:text-white/60 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-1">
              <Badge variant={member.isDeleted ? "pending" : "success"}>
                {member.isDeleted ? "Désactivé" : "Actif"}
              </Badge>
              <IconButton
                icon={Trash2}
                label="Supprimer"
                onClick={() => setConfirmRemove(true)}
                className="hover:bg-brand-orange/10 hover:text-brand-orange"
              />
              <IconButton
                icon={Ban}
                label="Bientôt disponible"
                disabled
                className="cursor-not-allowed opacity-40 hover:bg-transparent hover:text-brand-gray dark:hover:bg-transparent dark:hover:text-white/60"
              />
              <IconButton icon={Pencil} label="Modifier" onClick={() => setEditing(true)} />
            </div>

            <div className="mb-5 rounded-lg border border-brand-blue/[0.06] px-4 py-3 dark:border-white/10">
              <p className="text-[12px] font-medium uppercase tracking-wide text-brand-gray dark:text-white/50">Email</p>
              <p className="mt-0.5 text-[14px] text-brand-blue-dark dark:text-white">{member.email}</p>
            </div>

            <ConfirmDialog
              open={confirmRemove}
              title="Retirer ce technicien"
              description="Suppression douce — le compte ne pourra plus se connecter à la plateforme pour cette entreprise. Cette action ne peut pas être annulée depuis l'interface."
              confirmLabel="Retirer"
              loadingLabel="Retrait…"
              onConfirm={() => removeMutation.mutate()}
              onCancel={() => setConfirmRemove(false)}
              isLoading={removeMutation.isPending}
            />

            <EditTeamMemberModal
              open={editing}
              member={member}
              onClose={() => setEditing(false)}
              onSave={(input) => updateMutation.mutateAsync(input)}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
