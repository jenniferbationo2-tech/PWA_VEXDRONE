import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Mission, PlatformUser } from "@/lib/api/types";

interface Props {
  missions?: Mission[];
  members?: PlatformUser[];
  isLoading?: boolean;
}

function firstName(fullName: string): string {
  return fullName.split(" ")[0];
}

export function TechnicienWorkloadChart({ missions, members, isLoading }: Props) {
  const data = (members ?? [])
    .map((member) => ({
      name: firstName(member.name),
      missions: (missions ?? []).filter((m) => m.userId === member.id).length,
    }))
    .sort((a, b) => b.missions - a.missions);

  const chartHeight = Math.max(220, data.length * 36);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Charge de travail par technicien</CardTitle>
      </CardHeader>
      {isLoading ? (
        <Skeleton className="h-[220px]" />
      ) : data.length === 0 ? (
        <p className="text-[13px] text-brand-gray dark:text-white/60">Aucun technicien à afficher.</p>
      ) : (
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke="#1B365D" strokeOpacity={0.06} />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8A8D8F" }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={72}
                tick={{ fontSize: 12, fill: "#1B365D" }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid rgba(27,54,93,0.08)",
                  fontSize: 13,
                  boxShadow: "0 4px 12px rgba(27,54,93,0.10)",
                }}
                labelStyle={{ color: "#1B365D", fontWeight: 600 }}
                formatter={(value: number) => [`${value} mission${value === 1 ? "" : "s"}`, ""]}
              />
              <Bar dataKey="missions" fill="#1B365D" radius={[0, 3, 3, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
