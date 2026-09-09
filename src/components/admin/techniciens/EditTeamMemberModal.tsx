import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { modalTransition, modalVariants, overlayTransition, overlayVariants } from "@/lib/motion";
import type { PlatformUser, UpdateTeamMemberInput } from "@/lib/api/types";

interface Props {
  open: boolean;
  member: PlatformUser | null;
  onClose: () => void;
  onSave: (input: UpdateTeamMemberInput) => Promise<void>;
}

export function EditTeamMemberModal({ open, member, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && member) {
      setName(member.name);
      setEmail(member.email);
      setError(null);
    }
  }, [open, member]);

  function resetAndClose() {
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError("Merci de remplir tous les champs.");
      return;
    }

    setSubmitting(true);
    try {
      await onSave({ name: name.trim(), email: email.trim() });
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de modifier ce compte.");
    } finally {
      setSubmitting(false);
    }
  }

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
            className="w-full max-w-sm rounded-lg border border-white/10 bg-brand-blue-dark/80 p-6 shadow-2xl backdrop-blur-md"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={modalTransition}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-[18px] font-bold text-brand-blue-dark dark:text-white">
                Modifier le technicien
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
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="awa.compaore@sonabel.bf"
                />
              </div>

              {error && <p className="text-[13px] font-medium text-brand-orange">⚠ {error}</p>}

              <div className="flex justify-end gap-2.5 pt-2">
                <Button type="button" variant="secondary" size="sm" onClick={resetAndClose}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                  {submitting ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
