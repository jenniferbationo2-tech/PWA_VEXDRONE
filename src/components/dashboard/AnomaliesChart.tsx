import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  data: { date: string; count: number }[];
}

export function AnomaliesChart({ data }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
  }));

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Anomalies détectées — 30 derniers jours</CardTitle>
      </CardHeader>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="anomaliesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1B365D" stopOpacity={0.14} />
                <stop offset="100%" stopColor="#1B365D" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#1B365D" strokeOpacity={0.06} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "#8A8D8F" }}
              interval="preserveStartEnd"
            />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8A8D8F" }} width={24} />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid rgba(27,54,93,0.08)",
                fontSize: 13,
                boxShadow: "0 4px 12px rgba(27,54,93,0.10)",
              }}
              labelStyle={{ color: "#1B365D", fontWeight: 600 }}
              formatter={(value: number) => [`${value} anomalies`, ""]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#1B365D"
              strokeWidth={2}
              fill="url(#anomaliesFill)"
              activeDot={{ r: 4, fill: "#E37222", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
