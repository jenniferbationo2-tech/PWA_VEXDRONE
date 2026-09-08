import { BatteryWarning, Gauge, Plane } from "lucide-react";
import { formatAltitude, formatSpeed, type AdminSettings } from "@/lib/adminSettings";

interface Props {
  settings: AdminSettings;
}

// Même format que WeatherCard (icône + stat principale + ligne de repères
// secondaires) pour s'empiler proprement au-dessus dans l'en-tête du
// dashboard Admin. Valeurs définies par le SuperAdmin (Réglages de vol &
// export) — lecture seule ici, voir super-admin/Dashboard.tsx pour la
// modification.
export function FlightLimitsCard({ settings }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-brand-blue/[0.06] bg-white px-4 py-2.5 shadow-card dark:border-white/10 dark:bg-brand-blue-dark">
      <Plane size={26} className="flex-shrink-0 text-brand-blue dark:text-white" strokeWidth={1.5} />
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[19px] font-bold leading-none text-brand-blue-dark dark:text-white">
            {formatAltitude(settings.defaultMaxAltitudeMeters, settings.altitudeUnit)}
          </span>
          <span className="text-[12px] text-brand-gray dark:text-white/60">Altitude max autorisée</span>
        </div>
        <div className="mt-1 flex items-center gap-2.5 text-[11px] text-brand-gray dark:text-white/50">
          <span className="flex items-center gap-0.5">
            <Gauge size={11} />
            {formatSpeed(settings.defaultMaxSpeedKmh, settings.speedUnit)} max
          </span>
          <span className="flex items-center gap-0.5">
            <BatteryWarning size={11} />
            &lt; {settings.lowBatteryThresholdPercent}%
          </span>
        </div>
      </div>
    </div>
  );
}
