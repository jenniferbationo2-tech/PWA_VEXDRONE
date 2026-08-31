import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NewTeamMemberInput } from "@/lib/api/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (input: NewTeamMemberInput) => Promise<void>;
}

const USERNAME_RE = /^[a-z0-9]+$/;
const PASSWORD_RE = /^(?=.*\d).{8,}$/;

export function NewTeamMemberModal({ open, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setUsername("");
      setEmail("");
      setPassword("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  function resetAndClose() {
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !username.trim() || !email.trim() || !password) {
      setError("Merci de remplir tous les champs.");
      return;
    }
    if (!USERNAME_RE.test(username.trim())) {
      setError("Le nom d'utilisateur ne peut contenir que des minuscules et des chiffres.");
      return;
    }
    if (!PASSWORD_RE.test(password)) {
      setError("Le mot de passe doit contenir au moins 8 caractères, dont un chiffre.");
      return;
    }

    setSubmitting(true);
    try {
      await onSave({ name: name.trim(), username: username.trim(), email: email.trim(), password });
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer le compte.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl dark:bg-brand-blue-dark">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-bold text-brand-blue-dark dark:text-white">
            Inviter un technicien
          </h2>
          <button
            onClick={resetAndClose}
            className="text-brand-gray hover:text-brand-blue-dark dark:text-white/60 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark dark:text-white">
              Nom complet
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Awa Compaoré" autoFocus />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark dark:text-white">
              Nom d'utilisateur
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="awacompaore (minuscules/chiffres)"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark dark:text-white">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="awa.compaore@sonabel.bf"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark dark:text-white">
              Mot de passe
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8+ caractères, 1 chiffre"
            />
          </div>

          {error && <p className="text-[13px] font-medium text-brand-orange">⚠ {error}</p>}

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={resetAndClose}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? "Création…" : "Créer le compte"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
