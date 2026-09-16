import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { X, Smartphone, PlaneTakeoff, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isPastDate } from "@/lib/missionStatus";
import { api } from "@/lib/api/client";
import { modalTransition, modalVariants, overlayTransition, overlayVariants } from "@/lib/motion";
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

// <select> natif remplacé par ce dropdown custom : la liste déroulante d'un
// <select> est rendue par l'OS/navigateur et ignore le thème sombre de ce
// modal (même correctif que le sélecteur "Mission" de MediaAnalysisCard.tsx).
// Le premier item de la liste reste l'équivalent de l'ancienne <option
// value=""> — un choix "vide" explicite, pas juste un texte d'invite.
function SelectDropdown({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (fieldRef.current && !fieldRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={fieldRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-sm border border-white/15 bg-white/5 px-3 text-left text-[14px] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
      >
        <span className={cn("truncate", !selected && "text-white/50")}>{selected ? selected.label : placeholder}</span>
        <ChevronDown
          size={16}
          className={cn("flex-shrink-0 text-white/50 transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "top" }}
            className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-56 overflow-auto rounded-lg border border-white/10 bg-brand-blue-dark/95 py-1.5 shadow-card-hover backdrop-blur-md"
          >
            <li role="option" aria-selected={!value}>
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] text-white/70 transition-colors hover:bg-white/10",
                  !value && "bg-brand-orange/15 text-white"
                )}
              >
                {placeholder}
                {!value && <Check size={14} className="flex-shrink-0 text-brand-orange" />}
              </button>
            </li>
            {options.map((o) => (
              <li key={o.value} role="option" aria-selected={o.value === value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] text-white/90 transition-colors hover:bg-white/10",
                    o.value === value && "bg-brand-orange/15 text-white"
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {o.value === value && <Check size={14} className="flex-shrink-0 text-brand-orange" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function NewMissionModal({ open, mission, onClose, onSave }: Props) {
  const isEditMode = !!mission;

  const [name, setName] = useState("");
  const [zone, setZone] = useState("");
  const [description, setDescription] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [appareil, setAppareil] = useState<CaptureDevice>("appareil_photo");
  const [droneId, setDroneId] = useState("");
  const [typeMissionId, setTypeMissionId] = useState("");
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

  // Types créés par l'admin de l'entreprise du technicien connecté (voir
  // MissionTypesModal côté Admin) — optionnel, la liste peut être vide.
  const { data: missionTypes } = useQuery({
    queryKey: ["mission-types"],
    queryFn: api.getMissionTypes,
    enabled: open,
  });

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
      setTypeMissionId(mission.typeMissionId ?? "");
    } else if (open && !mission) {
      setName("");
      setZone("");
      setDescription("");
      setDateDebut("");
      setDateFin("");
      setAppareil("appareil_photo");
      setDroneId("");
      setTypeMissionId("");
    }
    setError(null);
  }, [open, mission]);

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

    // Une mission naît toujours "en_attente" : elle ne passe "en_cours" que par
    // validation de l'admin (voir admin/Missions.tsx), et l'édition ne doit
    // pas court-circuiter ce cycle.
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
        typeMissionId: typeMissionId || undefined,
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
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg border border-white/10 bg-brand-blue-dark/80 p-6 shadow-2xl backdrop-blur-md"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={modalTransition}
          >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-bold text-white">
            {isEditMode ? "Modifier la mission" : "Nouvelle mission"}
          </h2>
          <button onClick={resetAndClose} className="text-white/60 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-white">
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
                      ? "border-white bg-white/10 text-white"
                      : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10",
                    isEditMode && "cursor-not-allowed opacity-60"
                  )}
                >
                  <Icon size={15} strokeWidth={1.75} />
                  {label}
                </button>
              ))}
            </div>
            {isEditMode && (
              <p className="mt-1.5 text-[12px] text-white/50">
                Fixée à la création de la mission, non modifiable ensuite.
              </p>
            )}
          </div>

          {!isEditMode && appareil === "drone" && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-white">Drone</label>
              {availableDrones.length === 0 ? (
                <p className="rounded-sm border border-white/15 bg-white/5 px-3 py-2.5 text-[13px] text-white/60">
                  Aucun drone disponible actuellement.
                </p>
              ) : (
                <SelectDropdown
                  value={droneId}
                  onChange={setDroneId}
                  placeholder="Sélectionner un drone"
                  options={availableDrones.map((d) => ({
                    value: d.id,
                    label: d.identifiant + (d.modele ? ` — ${d.modele}` : ""),
                  }))}
                />
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-white">
              Type de mission <span className="font-normal text-white/50">(optionnel)</span>
            </label>
            {!missionTypes || missionTypes.length === 0 ? (
              <p className="rounded-sm border border-white/15 bg-white/5 px-3 py-2.5 text-[13px] text-white/60">
                Aucun type défini par ton administrateur pour l'instant.
              </p>
            ) : (
              <SelectDropdown
                value={typeMissionId}
                onChange={setTypeMissionId}
                placeholder="Aucun type"
                options={missionTypes.map((t) => ({ value: t.id, label: t.name }))}
              />
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-white">Nom de la mission</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Inspection ligne Nord" />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-white">Zone</label>
            <Input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Zone A" />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-white">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails de la mission" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-white">Date de début</label>
              <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-white">Date de fin</label>
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
