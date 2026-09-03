import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  displayAltitudeToMeters,
  metersToDisplayAltitude,
  saveAdminSettings,
  TIMEZONE_OPTIONS,
  EXPORT_FORMAT_LABELS,
  type AdminSettings,
  type AltitudeUnit,
  type ExportFormat,
  type SpeedUnit,
} from "@/lib/adminSettings";

interface Props {
  open: boolean;
  settings: AdminSettings;
  onClose: () => void;
  onSaved: (settings: AdminSettings) => void;
}

const SELECT_CLASS =
  "h-10 w-full rounded-sm border border-brand-gray/25 bg-white px-3 text-[14px] text-brand-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 dark:border-white/15 dark:bg-white/5 dark:text-white";

export function SettingsModal({ open, settings, onClose, onSaved }: Props) {
  const [altitudeUnit, setAltitudeUnit] = useState<AltitudeUnit>(settings.altitudeUnit);
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>(settings.speedUnit);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [exportFormat, setExportFormat] = useState<ExportFormat>(settings.defaultExportFormat);
  const [maxAltitude, setMaxAltitude] = useState(
    String(metersToDisplayAltitude(settings.defaultMaxAltitudeMeters, settings.altitudeUnit))
  );

  useEffect(() => {
    if (open) {
      setAltitudeUnit(settings.altitudeUnit);
      setSpeedUnit(settings.speedUnit);
      setTimezone(settings.timezone);
      setExportFormat(settings.defaultExportFormat);
      setMaxAltitude(String(metersToDisplayAltitude(settings.defaultMaxAltitudeMeters, settings.altitudeUnit)));
    }
  }, [open, settings]);

  if (!open) return null;

  function handleAltitudeUnitChange(unit: AltitudeUnit) {
    // Convertit la valeur affichée pour rester cohérente avec la nouvelle unité,
    // plutôt que de garder le même nombre sous une unité différente.
    const meters = displayAltitudeToMeters(Number(maxAltitude) || 0, altitudeUnit);
    setAltitudeUnit(unit);
    setMaxAltitude(String(metersToDisplayAltitude(meters, unit)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: AdminSettings = {
      altitudeUnit,
      speedUnit,
      timezone,
      defaultExportFormat: exportFormat,
      defaultMaxAltitudeMeters: displayAltitudeToMeters(Number(maxAltitude) || 0, altitudeUnit),
    };
    saveAdminSettings(next);
    onSaved(next);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl dark:bg-brand-blue-dark">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-bold text-brand-blue-dark dark:text-white">
            Réglages de vol & export
          </h2>
          <button
            onClick={onClose}
            className="text-brand-gray hover:text-brand-blue-dark dark:text-white/60 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-5 text-[12px] text-brand-gray dark:text-white/50">
          Propres à cet appareil — non synchronisés entre navigateurs ou comptes Admin.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark dark:text-white">
                Unité d'altitude
              </label>
              <select
                value={altitudeUnit}
                onChange={(e) => handleAltitudeUnitChange(e.target.value as AltitudeUnit)}
                className={SELECT_CLASS}
              >
                <option value="m">Mètres (m)</option>
                <option value="ft">Pieds (ft)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark dark:text-white">
                Unité de vitesse
              </label>
              <select value={speedUnit} onChange={(e) => setSpeedUnit(e.target.value as SpeedUnit)} className={SELECT_CLASS}>
                <option value="kmh">km/h</option>
                <option value="kt">Nœuds (kt)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark dark:text-white">
              Fuseau horaire
            </label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={SELECT_CLASS}>
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark dark:text-white">
              Format d'export par défaut
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
              className={SELECT_CLASS}
            >
              {Object.entries(EXPORT_FORMAT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark dark:text-white">
              Altitude de vol max par défaut ({altitudeUnit})
            </label>
            <Input
              type="number"
              min={0}
              value={maxAltitude}
              onChange={(e) => setMaxAltitude(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" size="sm">
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
