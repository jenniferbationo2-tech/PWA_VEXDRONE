import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { modalTransition, modalVariants, overlayTransition, overlayVariants } from "@/lib/motion";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loadingLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  loadingLabel = "Suppression…",
  onConfirm,
  onCancel,
  isLoading,
}: Props) {
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
            <h3 className="mb-2 font-display text-[16px] font-bold text-brand-blue-dark dark:text-white">{title}</h3>
            <p className="mb-5 text-[13px] text-brand-gray dark:text-white/60">{description}</p>
            <div className="flex justify-end gap-2.5">
              <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
                Annuler
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="bg-brand-orange hover:bg-brand-orange-light"
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading ? loadingLabel : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}