import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { computeMissionStatus, isPastDate } from "@/lib/missionStatus";
import type { Mission, NewMissionInput } from "@/lib/api/types";

interface Props {
  open: boolean;
  mission?: Mission | null; // fourni = mode modification, absent = mode création
  onClose: () => void;
  onSave: (input: NewMissionInput) => Promise<void>;
}

export function NewMissionModal({ open, mission, onClose, onSave }: Props) {
  const isEditMode = !!mission;

  const [name, setName] = useState("");
  const [zone, setZone] = useState("");
  const [description, setDescription] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Pré-remplit le formulaire à chaque ouverture en mode modification
  useEffect(() => {
    if (open && mission) {
      setName(mission.name);
      setZone(mission.zone);
      setDescription(mission.description);
      setDateDebut(mission.dateDebut);
      setDateFin(mission.dateFin);
    } else if (open && !mission) {
      setName("");
      setZone("");
      setDescription("");
      setDateDebut("");
      setDateFin("");
    }
    setError(null);
  }, [open, mission]);

  if (!open) return null;

  function resetAndClose() {
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name || !zone || !dateDebut || !dateFin) {
      setError("Merci de remplir tous les champs obligatoires.");
      return;
    }

    // La date passée n'est bloquante qu'à la création : une mission déjà en
    // cours ou terminée a forcément une date de début dans le passé.
    if (!isEditMode && isPastDate(dateDebut)) {
      setError("La date de début ne peut pas être dans le passé. Merci de choisir une date à venir ou aujourd'hui.");
      return;
    }

    if (new Date(dateFin) < new Date(dateDebut)) {
      setError("La date de fin ne peut pas être avant la date de début.");
      return;
    }

    const status = computeMissionStatus(dateDebut, dateFin);

    setSubmitting(true);
    try {
      await onSave({ name, zone, description, dateDebut, dateFin, status });
      resetAndClose();
    } catch (err) {
      const fallback = isEditMode ? "Impossible de modifier la mission." : "Impossible de créer la mission.";
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-bold text-brand-blue-dark">
            {isEditMode ? "Modifier la mission" : "Nouvelle mission"}
          </h2>
          <button onClick={resetAndClose} className="text-brand-gray hover:text-brand-blue-dark">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark">Nom de la mission</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Inspection ligne Nord" />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark">Zone</label>
            <Input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Zone A" />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails de la mission" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark">Date de début</label>
              <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark">Date de fin</label>
              <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </div>
          </div>

          {error && <p className="text-[13px] font-medium text-brand-orange">⚠ {error}</p>}

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={resetAndClose}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? "Enregistrement…" : isEditMode ? "Enregistrer" : "Créer la mission"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}