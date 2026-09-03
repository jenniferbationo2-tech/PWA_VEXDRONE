import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/Skeleton";
import { DRONE_STATUS_OPTIONS } from "@/lib/droneStatus";
import type { Drone } from "@/lib/api/types";

interface Props {
  drones?: Drone[];
  isLoading?: boolean;
}

export function FleetUsageDonut({ drones, isLoading }: Props) {
  const counts = DRONE_STATUS_OPTIONS.map((s) => ({
    ...s,
    count: (drones ?? []).filter((d) => d.status === s.value).length,
  }));
  const total = drones?.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Utilisation de la flotte</CardTitle>
      </CardHeader>
      {isLoading ? (
        <Skeleton className="h-[140px]" />
      ) : total === 0 ? (
        <p className="text-[13px] text-brand-gray dark:text-white/60">Aucun drone enregistré.</p>
      ) : (
        <div className="flex items-center gap-6">
          <div className="relative h-[140px] w-[140px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={counts} dataKey="count" nameKey="label" innerRadius={44} outerRadius={62} paddingAngle={3} stroke="none">
                  {counts.map((entry) => (
                    <Cell key={entry.value} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[26px] font-bold text-brand-blue-dark dark:text-white">{total}</span>
              <span className="text-[11px] text-brand-gray dark:text-white/50">drones</span>
            </div>
          </div>
          <div className="space-y-2.5">
            {counts.map((s) => (
              <div key={s.value} className="flex items-center gap-2 text-[14px]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-brand-blue-dark/80 dark:text-white/70">{s.label}</span>
                <span className="font-semibold text-brand-blue-dark dark:text-white">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
