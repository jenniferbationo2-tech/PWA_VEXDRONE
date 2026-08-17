import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Anomaly } from "@/lib/api/types";
import { formatRelativeTime, cn } from "@/lib/utils";

interface Props {
  alerts: Anomaly[];
}

const severityVariant = { eleve: "high", moyen: "medium", faible: "low" } as const;
const severityLabel = { eleve: "Élevé", moyen: "Moyen", faible: "Faible" } as const;

export function RecentAlertsTable({ alerts }: Props) {
  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Alertes récentes</CardTitle>
        <Link to="/anomalies" className="text-[13px] font-semibold text-brand-blue hover:underline">
          Voir dans IA & Anomalies →
        </Link>
      </CardHeader>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="font-display text-[15px] font-semibold text-brand-blue-dark">
            Aucune anomalie non traitée
          </p>
          <p className="mt-1 text-[13px] text-brand-gray">
            Les prochaines détections apparaîtront ici automatiquement.
          </p>
        </div>
      ) : (
        <>
          {/* Vue tableau — desktop */}
          <div className="-mx-6 hidden overflow-x-auto px-6 sm:block">
            <table className="w-full min-w-[640px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-brand-blue/[0.06] text-[12px] uppercase tracking-wide text-brand-gray">
                  <th className="pb-2.5 font-medium">ID</th>
                  <th className="pb-2.5 font-medium">Type</th>
                  <th className="pb-2.5 font-medium">Zone</th>
                  <th className="pb-2.5 font-medium">Gravité</th>
                  <th className="pb-2.5 font-medium">Statut</th>
                  <th className="pb-2.5 font-medium">Détectée</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr
                    key={a.id}
                    className={cn(
                      "border-b border-brand-blue/[0.04] last:border-0 hover:bg-brand-off-white/60"
                    )}
                  >
                    <td className="py-3 font-semibold text-brand-blue-dark">{a.id}</td>
                    <td className="py-3 text-brand-blue-dark/80">{a.type}</td>
                    <td className="py-3 text-brand-gray">{a.zone}</td>
                    <td className="py-3">
                      <Badge variant={severityVariant[a.severity]}>{severityLabel[a.severity]}</Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={a.status === "traitee" ? "success" : "pending"}>
                        {a.status === "traitee" ? "Traitée" : "Non traitée"}
                      </Badge>
                    </td>
                    <td className="py-3 text-brand-gray">{formatRelativeTime(a.detectedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vue cartes — mobile */}
          <div className="space-y-2.5 sm:hidden">
            {alerts.map((a) => (
              <div key={a.id} className="rounded-sm border border-brand-blue/[0.06] p-3">
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[12px] font-semibold text-brand-gray">{a.id}</p>
                    <p className="font-semibold text-brand-blue-dark">{a.type}</p>
                  </div>
                  <Badge variant={a.status === "traitee" ? "success" : "pending"}>
                    {a.status === "traitee" ? "Traitée" : "Non traitée"}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[13px]">
                  <span className="text-brand-gray">{a.zone}</span>
                  <Badge variant={severityVariant[a.severity]}>{severityLabel[a.severity]}</Badge>
                  <span className="text-brand-gray">{formatRelativeTime(a.detectedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}