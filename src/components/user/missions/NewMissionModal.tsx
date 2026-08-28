import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Smartphone, PlaneTakeoff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isPastDate } from "@/lib/missionStatus";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { CaptureDevice, Mission, NewMissionInput } from "@/lib/api/types";

interface Props {
  open: boolean;
  mission?: Mission | null; // fourni = mode modification, absent = mode création
  onClose: () => void;
  onSave: (input: NewMissionInput) => Promise<void>;
}

const APPAREIL_OPTIONS: { value: CaptureDevice; label: string; icon: typeof Smartphone }[] = [
  { value: "appareil_photo", label: "Téléphone", icon: Smartphone },
  { value: "drone", label: "Drone", icon: PlaneTakeoff },
];

export function NewMissionModal({ open, mission, onClose, onSave }: Props) {
  const isEditMode = !!mission;

  const [name, setName] = useState("");
  const [zone, setZone] = useState("");
  const [description, setDescription] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [appareil, setAppareil] = useState<CaptureDevice>("appareil_photo");
  const [droneId, setDroneId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // appareil est fixé à la création (aucun champ correspondant dans le PATCH
  // côté API) : la liste de drones ne sert donc qu'en mode création.
  const { data: drones } = useQuery({
    queryKey: ["drones"],
    queryFn: api.getDrones,
    enabled: open && !isEditMode,
  });
  const availableDrones = (drones ?? []).filter((d) => d.status === "disponible");

  // Pré-remplit le formulaire à chaque ouverture en mode modification
  useEffect(() => {
    if (open && mission) {
      setName(mission.name);
      setZone(mission.zone);
      setDescription(mission.description);
      setDateDebut(mission.dateDebut);
      setDateFin(mission.dateFin);
      setAppareil(mission.appareil);
      setDroneId(mission.droneId ?? "");
    } else if (open && !mission) {
      setName("");
      setZone("");
      setDescription("");
      setDateDebut("");
      setDateFin("");
      setAppareil("appareil_photo");
      setDroneId("");
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

    if (!isEditMode && appareil === "drone" && !droneId) {
      setError("Merci de choisir un drone.");
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

    // Une mission naît toujours "en_attente" : elle ne passe "en_cours" que via
    // le bouton "Lancer", et l'édition ne doit pas court-circuiter ce cycle.
    const status = isEditMode && mission ? mission.status : "en_attente";

    setSubmitting(true);
    try {
      await onSave({
        name,
        zone,
        description,
        dateDebut,
        dateFin,
        status,
        appareil: isEditMode && mission ? mission.appareil : appareil,
        droneId: isEditMode && mission ? mission.droneId : appareil === "drone" ? droneId : undefined,
      });
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
            <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark">
              Méthode d'inspection
            </label>
            <div className="grid grid-cols-2 gap-2">
              {APPAREIL_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  disabled={isEditMode}
                  onClick={() => setAppareil(value)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-sm border px-3 py-2.5 text-[13px] font-semibold transition-colors",
                    appareil === value
                      ? "border-brand-blue bg-brand-blue text-white"
                      : "border-brand-gray/25 bg-white text-brand-blue-dark/70 hover:bg-brand-off-white",
                    isEditMode && "cursor-not-allowed opacity-60"
                  )}
                >
                  <Icon size={15} strokeWidth={1.75} />
                  {label}
                </button>
              ))}
            </div>
            {isEditMode && (
              <p className="mt-1.5 text-[12px] text-brand-gray">
                Fixée à la création de la mission, non modifiable ensuite.
              </p>
            )}
          </div>

          {!isEditMode && appareil === "drone" && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark">Drone</label>
              {availableDrones.length === 0 ? (
                <p className="rounded-sm border border-brand-gray/25 bg-brand-off-white px-3 py-2.5 text-[13px] text-brand-gray">
                  Aucun drone disponible actuellement.
                </p>
              ) : (
                <select
                  value={droneId}
                  onChange={(e) => setDroneId(e.target.value)}
                  className="h-10 w-full rounded-sm border border-brand-gray/25 bg-white px-3 text-[14px] text-brand-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
                >
                  <option value="">Sélectionner un drone</option>
                  {availableDrones.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.identifiant}
                      {d.modele ? ` — ${d.modele}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

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
