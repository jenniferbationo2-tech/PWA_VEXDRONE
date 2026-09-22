import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { modalTransition, modalVariants, overlayTransition, overlayVariants } from "@/lib/motion";

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
            className="w-full max-w-sm rounded-lg border border-white/10 bg-brand-blue-dark/80 p-6 shadow-2xl backdrop-blur-md"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={modalTransition}
          >
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
                  Nom de l'entreprise<RequiredMark />
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
