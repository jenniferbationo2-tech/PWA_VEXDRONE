import { useQuery } from "@tanstack/react-query";
import { Wifi } from "lucide-react";
import { api } from "@/lib/api/client";
import { StatCard } from "@/components/user/dashboard/StatCard";
import { AnomaliesChart } from "@/components/user/dashboard/AnomaliesChart";
import { SeverityDonut } from "@/components/user/dashboard/SeverityDonut";
import { WeatherCard } from "@/components/user/dashboard/WeatherCard";

export function Dashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: api.getDashboardSummary,
  });

  if (isLoading) {
    return <div className="text-brand-gray">Chargement du tableau de bord…</div>;
  }

  if (isError || !data) {
    return (
      <div>
        <p className="font-display text-h3">Impossible de charger le tableau de bord</p>
        <p className="mt-1 text-brand-gray">
          Vérifie la connexion à l'API. Nouvelle tentative recommandée dans quelques instants.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1>Tableau de bord</h1>
          <span className="flex items-center gap-1.5 rounded-full bg-status-success/10 px-3 py-1 text-[12px] font-semibold text-status-success">
            <Wifi size={12} />
            Modèle IA actif
          </span>
        </div>
        <WeatherCard />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Vols aujourd'hui" value={String(data.flightsToday)} delta={{ value: data.flightsTodayDelta }} helper="vs hier" />
        <StatCard
          label="Alertes critiques"
          value={String(data.criticalAlerts)}
          delta={{ value: data.criticalAlertsDelta, positiveIsGood: false }}
          helper="vs hier"
        />
        <StatCard
          label="Flotte disponible"
          value={`${data.fleetAvailability}%`}
          helper={`${data.fleetActive}/${data.fleetTotal} drones actifs`}
        />
        <StatCard
          label="Anomalies résolues"
          value={String(data.anomaliesResolved)}
          helper={`sur ${data.anomaliesResolvedTotal} ce mois`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <AnomaliesChart data={data.anomaliesTrend} />
        <SeverityDonut data={data.severityBreakdown} />
      </div>
    </div>
  );
}
