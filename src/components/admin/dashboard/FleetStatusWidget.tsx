import { Plane } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DRONE_STATUS_OPTIONS } from "@/lib/droneStatus";
import type { Drone } from "@/lib/api/types";

interface Props {
  drones?: Drone[];
  isLoading?: boolean;
}

// Consultation seule pour l'Admin — la gestion de la flotte (ajout, retrait,
// changement de statut) est réservée au SuperAdmin, voir super-admin/Dashboard.tsx.
export function FleetStatusWidget({ drones, isLoading }: Props) {
  const counts = DRONE_STATUS_OPTIONS.map((s) => ({
    ...s,
    count: drones?.filter((d) => d.status === s.value).length ?? 0,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Plane size={16} className="text-brand-blue/40 dark:text-white/40" strokeWidth={1.75} />
          <CardTitle>Flotte</CardTitle>
        </div>
        <Badge variant="neutral">Lecture seule</Badge>
      </CardHeader>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-brand-off-white dark:bg-white/5" />
          ))}
        </div>
      ) : !drones || drones.length === 0 ? (
        <p className="text-[13px] text-brand-gray dark:text-white/60">Aucun drone enregistré.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {counts.map((s) => (
            <div
              key={s.value}
              className="flex items-center justify-between rounded-lg border border-brand-blue/[0.06] px-3.5 py-2.5 dark:border-white/10"
            >
              <span className="text-[13px] font-medium text-brand-blue-dark dark:text-white">{s.label}</span>
              <Badge variant={s.variant}>{s.count}</Badge>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-[12px] text-brand-gray dark:text-white/50">Gérée par le SuperAdmin.</p>
    </Card>
  );
}
