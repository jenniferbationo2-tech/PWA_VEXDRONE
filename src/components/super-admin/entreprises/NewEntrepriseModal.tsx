import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (nom: string) => Promise<void>;
}

export function NewEntrepriseModal({ open, onClose, onSave }: Props) {
  const [nom, setNom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setNom("");
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

    if (!nom.trim()) {
      setError("Merci d'indiquer le nom de l'entreprise.");
      return;
    }

    setSubmitting(true);
    try {
      await onSave(nom.trim());
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer l'entreprise.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl dark:bg-brand-blue-dark">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-bold text-brand-blue-dark dark:text-white">
            Nouvelle entreprise
          </h2>
          <button
            onClick={resetAndClose}
            className="text-brand-gray hover:text-brand-blue-dark dark:text-white/60 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark dark:text-white">
              Nom de l'entreprise
            </label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Sonabel" autoFocus />
          </div>

          {error && <p className="text-[13px] font-medium text-brand-orange">⚠ {error}</p>}

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={resetAndClose}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? "Création…" : "Créer l'entreprise"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
