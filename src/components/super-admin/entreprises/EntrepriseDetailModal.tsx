import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, Pencil, Trash2, UserPlus, X } from "lucide-react";
import { api } from "@/lib/api/client";
import type { Entreprise } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Props {
  open: boolean;
  entreprise: Entreprise | null;
  onClose: () => void;
}

const ROLE_BADGE = {
  super_admin: { label: "SuperAdmin", variant: "active" as const },
  admin: { label: "Admin", variant: "active" as const },
  technicien: { label: "Technicien", variant: "neutral" as const },
};

const USERNAME_RE = /^[a-z0-9]+$/;
const PASSWORD_RE = /^(?=.*\d).{8,}$/;

export function EntrepriseDetailModal({ open, entreprise, onClose }: Props) {
  const queryClient = useQueryClient();

  const [renaming, setRenaming] = useState(false);
  const [nom, setNom] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  const [confirmBlock, setConfirmBlock] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);

  const { data: users } = useQuery({
    queryKey: ["platform-users"],
    queryFn: api.getPlatformUsers,
    enabled: open,
  });
  const entrepriseUsers = (users ?? []).filter((u) => u.entrepriseId === entreprise?.id);

  useEffect(() => {
    if (open && entreprise) {
      setNom(entreprise.nom);
      setRenaming(false);
      setRenameError(null);
      setAddingAdmin(false);
      setAdminName("");
      setAdminUsername("");
      setAdminEmail("");
      setAdminPassword("");
      setAdminError(null);
    }
  }, [open, entreprise]);

  const renameMutation = useMutation({
    mutationFn: (newNom: string) => api.renameEntreprise(entreprise!.id, newNom),
    onSuccess: () => {
      setRenaming(false);
      queryClient.invalidateQueries({ queryKey: ["entreprises"] });
    },
    onError: (err) => setRenameError(err instanceof Error ? err.message : "Impossible de renommer."),
  });

  const blockMutation = useMutation({
    mutationFn: () => (entreprise!.status === "active" ? api.blockEntreprise(entreprise!.id) : api.unblockEntreprise(entreprise!.id)),
    onSuccess: () => {
      setConfirmBlock(false);
      queryClient.invalidateQueries({ queryKey: ["entreprises"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteEntreprise(entreprise!.id),
    onSuccess: () => {
      setConfirmDelete(false);
      queryClient.invalidateQueries({ queryKey: ["entreprises"] });
      onClose();
    },
  });

  const addAdminMutation = useMutation({
    mutationFn: () =>
      api.createAdminAccount({
        name: adminName.trim(),
        username: adminUsername.trim(),
        email: adminEmail.trim(),
        password: adminPassword,
        entrepriseId: entreprise!.id,
      }),
    onSuccess: () => {
      setAddingAdmin(false);
      setAdminName("");
      setAdminUsername("");
      setAdminEmail("");
      setAdminPassword("");
      queryClient.invalidateQueries({ queryKey: ["platform-users"] });
    },
    onError: (err) => setAdminError(err instanceof Error ? err.message : "Impossible de créer le compte."),
  });

  if (!open || !entreprise) return null;

  function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRenameError(null);
    if (!nom.trim()) {
      setRenameError("Le nom ne peut pas être vide.");
      return;
    }
    renameMutation.mutate(nom.trim());
  }

  function handleAddAdminSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAdminError(null);

    if (!adminName.trim() || !adminUsername.trim() || !adminEmail.trim() || !adminPassword) {
      setAdminError("Merci de remplir tous les champs.");
      return;
    }
    if (!USERNAME_RE.test(adminUsername.trim())) {
      setAdminError("Le nom d'utilisateur ne peut contenir que des minuscules et des chiffres.");
      return;
    }
    if (!PASSWORD_RE.test(adminPassword)) {
      setAdminError("Le mot de passe doit contenir au moins 8 caractères, dont un chiffre.");
      return;
    }
    addAdminMutation.mutate();
  }

  const isBlocked = entreprise.status === "bloquee";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-2xl dark:bg-brand-blue-dark">
        <div className="mb-1 flex items-start justify-between gap-3">
          {renaming ? (
            <form onSubmit={handleRenameSubmit} className="flex flex-1 items-center gap-2">
              <Input value={nom} onChange={(e) => setNom(e.target.value)} autoFocus className="h-9" />
              <Button type="submit" size="sm" disabled={renameMutation.isPending}>
                OK
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setRenaming(false)}>
                Annuler
              </Button>
            </form>
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate font-display text-[18px] font-bold text-brand-blue-dark dark:text-white">
                {entreprise.nom}
              </h2>
              <button
                onClick={() => setRenaming(true)}
                aria-label="Renommer"
                className="text-brand-gray hover:text-brand-blue-dark dark:text-white/60 dark:hover:text-white"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="flex-shrink-0 text-brand-gray hover:text-brand-blue-dark dark:text-white/60 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        {renameError && <p className="mb-2 text-[13px] font-medium text-brand-orange">⚠ {renameError}</p>}

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Badge variant={isBlocked ? "pending" : "success"}>{isBlocked ? "Bloquée" : "Active"}</Badge>
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={() => (isBlocked ? blockMutation.mutate() : setConfirmBlock(true))}
          >
            {isBlocked ? <CheckCircle2 size={14} /> : <Ban size={14} />}
            {isBlocked ? "Débloquer" : "Bloquer"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5 text-brand-orange hover:bg-brand-orange/10"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={14} />
            Supprimer
          </Button>
        </div>

        <div className="mb-5">
          <h3 className="mb-2.5 font-display text-[14px] font-semibold text-brand-blue-dark/70 dark:text-white/70">
            Comptes ({entrepriseUsers.length})
          </h3>
          {entrepriseUsers.length === 0 ? (
            <p className="rounded-lg border border-brand-blue/[0.06] bg-brand-off-white px-4 py-3 text-[13px] text-brand-gray dark:border-white/10 dark:bg-white/5 dark:text-white/60">
              Aucun compte pour l'instant.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {entrepriseUsers.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-brand-blue/[0.06] px-4 py-2.5 dark:border-white/10"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-brand-blue-dark dark:text-white">{u.name}</p>
                    <p className="truncate text-[12px] text-brand-gray dark:text-white/60">{u.email}</p>
                  </div>
                  <Badge variant={ROLE_BADGE[u.role].variant}>{ROLE_BADGE[u.role].label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        {addingAdmin ? (
          <form
            onSubmit={handleAddAdminSubmit}
            className="space-y-3 rounded-lg border border-brand-blue/[0.06] p-4 dark:border-white/10"
          >
            <h4 className="font-display text-[13px] font-semibold text-brand-blue-dark dark:text-white">
              Nouvel administrateur
            </h4>
            <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Nom complet" />
            <Input
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value.toLowerCase())}
              placeholder="nomutilisateur (minuscules/chiffres)"
            />
            <Input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@entreprise.bf"
            />
            <Input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Mot de passe (8+ car., 1 chiffre)"
            />
            {adminError && <p className="text-[13px] font-medium text-brand-orange">⚠ {adminError}</p>}
            <div className="flex justify-end gap-2.5">
              <Button type="button" variant="secondary" size="sm" onClick={() => setAddingAdmin(false)}>
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={addAdminMutation.isPending}>
                {addAdminMutation.isPending ? "Création…" : "Créer le compte"}
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setAddingAdmin(true)}>
            <UserPlus size={14} />
            Ajouter un administrateur
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmBlock}
        title="Bloquer cette entreprise"
        description="Les comptes de cette entreprise ne pourront plus se connecter, y compris ceux déjà connectés — leur session sera coupée immédiatement."
        confirmLabel="Bloquer"
        loadingLabel="Blocage…"
        onConfirm={() => blockMutation.mutate()}
        onCancel={() => setConfirmBlock(false)}
        isLoading={blockMutation.isPending}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer cette entreprise"
        description="Suppression douce — l'entreprise et ses comptes ne seront plus accessibles. Cette action ne peut pas être annulée depuis l'interface."
        confirmLabel="Supprimer"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
