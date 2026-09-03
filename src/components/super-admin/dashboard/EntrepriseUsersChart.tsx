import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Entreprise, PlatformUser } from "@/lib/api/types";

interface Props {
  entreprises?: Entreprise[];
  users?: PlatformUser[];
  isLoading?: boolean;
}

export function EntrepriseUsersChart({ entreprises, users, isLoading }: Props) {
  const data = (entreprises ?? []).map((e) => {
    const entrepriseUsers = (users ?? []).filter((u) => u.entrepriseId === e.id);
    return {
      nom: e.nom,
      admins: entrepriseUsers.filter((u) => u.role === "admin").length,
      techniciens: entrepriseUsers.filter((u) => u.role === "technicien").length,
    };
  });

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Répartition Admins / Techniciens par entreprise</CardTitle>
      </CardHeader>
      {isLoading ? (
        <Skeleton className="h-[240px]" />
      ) : data.length === 0 ? (
        <p className="text-[13px] text-brand-gray dark:text-white/60">Aucune entreprise à afficher.</p>
      ) : (
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#1B365D" strokeOpacity={0.06} />
              <XAxis
                dataKey="nom"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#8A8D8F" }}
                interval={0}
                angle={data.length > 5 ? -20 : 0}
                textAnchor={data.length > 5 ? "end" : "middle"}
                height={data.length > 5 ? 44 : 24}
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
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => (value === "admins" ? "Admins" : "Techniciens")} />
              <Bar dataKey="admins" name="admins" stackId="users" fill="#1B365D" radius={[0, 0, 0, 0]} />
              <Bar dataKey="techniciens" name="techniciens" stackId="users" fill="#274A7A" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
