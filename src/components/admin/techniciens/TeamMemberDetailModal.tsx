import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getInitials } from "@/lib/utils";

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

  if (!open || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl dark:bg-brand-blue-dark">
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

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Badge variant={member.isDeleted ? "pending" : "success"}>
            {member.isDeleted ? "Désactivé" : "Actif"}
          </Badge>
        </div>

        <div className="mb-5 rounded-lg border border-brand-blue/[0.06] px-4 py-3 dark:border-white/10">
          <p className="text-[12px] font-medium uppercase tracking-wide text-brand-gray dark:text-white/50">Email</p>
          <p className="mt-0.5 text-[14px] text-brand-blue-dark dark:text-white">{member.email}</p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5 text-brand-orange hover:bg-brand-orange/10"
          onClick={() => setConfirmRemove(true)}
        >
          <Trash2 size={14} />
          Retirer de l'entreprise
        </Button>
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
    </div>
  );
}
