import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { Severity } from "@/lib/api/types";

const SEVERITY_COLOR: Record<Severity, string> = {
  eleve: "#E37222",
  moyen: "#F2A93B",
  faible: "#8A8D8F",
};
const SEVERITY_LABEL: Record<Severity, string> = {
  eleve: "Élevé",
  moyen: "Moyen",
  faible: "Faible",
};

interface Props {
  data: { severity: Severity; count: number }[];
}

export function SeverityDonut({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition par gravité</CardTitle>
      </CardHeader>
      <div className="flex items-center gap-6">
        <div className="relative h-[140px] w-[140px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="severity"
                innerRadius={44}
                outerRadius={62}
                paddingAngle={3}
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell key={entry.severity} fill={SEVERITY_COLOR[entry.severity]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[26px] font-bold text-brand-blue-dark">{total}</span>
            <span className="text-[11px] text-brand-gray">total</span>
          </div>
        </div>
        <div className="space-y-2.5">
          {data.map((d) => (
            <div key={d.severity} className="flex items-center gap-2 text-[14px]">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: SEVERITY_COLOR[d.severity] }}
              />
              <span className="text-brand-blue-dark/80">{SEVERITY_LABEL[d.severity]}</span>
              <span className="font-semibold text-brand-blue-dark">{d.count}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
