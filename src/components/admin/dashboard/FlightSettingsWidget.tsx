import { Settings2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatAltitude, formatSpeed, EXPORT_FORMAT_LABELS, type AdminSettings } from "@/lib/adminSettings";

interface Props {
  settings: AdminSettings;
}

// Consultation seule pour l'Admin — la modification des réglages de vol &
// export est réservée au SuperAdmin, voir super-admin/Dashboard.tsx.
export function FlightSettingsWidget({ settings }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-brand-blue/40 dark:text-white/40" strokeWidth={1.75} />
          <CardTitle>Réglages de vol & export</CardTitle>
        </div>
        <Badge variant="neutral">Lecture seule</Badge>
      </CardHeader>

      <div className="flex flex-wrap gap-1.5 text-[12px]">
        <span className="rounded-full bg-brand-off-white px-2.5 py-1 text-brand-blue-dark dark:bg-white/10 dark:text-white/80">
          Altitude max {formatAltitude(settings.defaultMaxAltitudeMeters, settings.altitudeUnit)}
        </span>
        <span className="rounded-full bg-brand-off-white px-2.5 py-1 text-brand-blue-dark dark:bg-white/10 dark:text-white/80">
          {settings.altitudeUnit === "ft" ? "Pieds" : "Mètres"}
        </span>
        <span className="rounded-full bg-brand-off-white px-2.5 py-1 text-brand-blue-dark dark:bg-white/10 dark:text-white/80">
          {formatSpeed(100, settings.speedUnit).split(" ")[1]}
        </span>
        <span className="rounded-full bg-brand-off-white px-2.5 py-1 text-brand-blue-dark dark:bg-white/10 dark:text-white/80">
          Export {EXPORT_FORMAT_LABELS[settings.defaultExportFormat]}
        </span>
      </div>

      <p className="mt-4 text-[12px] text-brand-gray dark:text-white/50">Gérés par le SuperAdmin.</p>
    </Card>
  );
}
