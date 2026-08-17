import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  onConfirm,
  onCancel,
  isLoading,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl">
        <h3 className="mb-2 font-display text-[16px] font-bold text-brand-blue-dark">{title}</h3>
        <p className="mb-5 text-[13px] text-brand-gray">{description}</p>
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
            {isLoading ? "Suppression…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}