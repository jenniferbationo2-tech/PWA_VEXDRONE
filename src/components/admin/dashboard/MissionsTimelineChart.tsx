import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Mission } from "@/lib/api/types";

interface Props {
  missions?: Mission[];
  isLoading?: boolean;
}

const WEEKS_SHOWN = 8;

// Lundi de la semaine ISO contenant `date`.
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = lundi
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildWeeklyBuckets(missions: Mission[]): { label: string; creees: number; terminees: number }[] {
  const now = new Date();
  const buckets: { start: Date; creees: number; terminees: number }[] = [];
  for (let i = WEEKS_SHOWN - 1; i >= 0; i--) {
    const start = startOfWeek(now);
    start.setDate(start.getDate() - i * 7);
    buckets.push({ start, creees: 0, terminees: 0 });
  }

  function bucketFor(dateStr: string) {
    const d = startOfWeek(new Date(dateStr));
    return buckets.find((b) => b.start.getTime() === d.getTime());
  }

  for (const m of missions) {
    const created = bucketFor(m.dateDebut);
    if (created) created.creees += 1;
    if (m.status === "terminee") {
      const finished = bucketFor(m.dateFin);
      if (finished) finished.terminees += 1;
    }
  }

  return buckets.map((b) => ({
    label: b.start.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    creees: b.creees,
    terminees: b.terminees,
  }));
}

export function MissionsTimelineChart({ missions, isLoading }: Props) {
  const data = buildWeeklyBuckets(missions ?? []);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Missions dans le temps — {WEEKS_SHOWN} dernières semaines</CardTitle>
      </CardHeader>
      {isLoading ? (
        <Skeleton className="h-[220px]" />
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#1B365D" strokeOpacity={0.06} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#8A8D8F" }}
                interval="preserveStartEnd"
              />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8A8D8F" }} width={24} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid rgba(27,54,93,0.08)",
                  fontSize: 13,
                  boxShadow: "0 4px 12px rgba(27,54,93,0.10)",
                }}
                labelStyle={{ color: "#1B365D", fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => (value === "creees" ? "Créées" : "Terminées")} />
              <Bar dataKey="creees" name="creees" fill="#1B365D" radius={[3, 3, 0, 0]} />
              <Bar dataKey="terminees" name="terminees" fill="#3E8F5C" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
