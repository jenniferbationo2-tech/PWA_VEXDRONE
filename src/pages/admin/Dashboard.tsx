import { useState } from "react";
import { CalendarClock, ClipboardList, Plane, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/user/dashboard/StatCard";
import { StatGridSkeleton } from "@/components/ui/StatGridSkeleton";
import { WeatherCard } from "@/components/dashboard/WeatherCard";
import { FleetStatusWidget } from "@/components/admin/dashboard/FleetStatusWidget";
import { FlightSettingsWidget } from "@/components/admin/dashboard/FlightSettingsWidget";
import { MissionsTimelineChart } from "@/components/admin/dashboard/MissionsTimelineChart";
import { TechnicienWorkloadChart } from "@/components/admin/dashboard/TechnicienWorkloadChart";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/Auth/AuthContext";
import { prettifyUsername } from "@/lib/utils";
import { getAdminSettings, type AdminSettings } from "@/lib/adminSettings";

export function AdminDashboard() {
  const { user } = useAuth();
  const displayName = user?.name ?? prettifyUsername(user?.username ?? "");

  const [settings] = useState<AdminSettings>(() => getAdminSettings());

  const { data: members, isLoading: membersLoading } = useQuery({ queryKey: ["team-members"], queryFn: api.getTeamMembers });
  const { data: enCours, isLoading: enCoursLoading } = useQuery({
    queryKey: ["entreprise-missions", "en_cours", "count"],
    queryFn: () => api.getEntrepriseMissions({ status: "en_cours", itemsPerPage: 1 }),
  });
  const { data: planifiees, isLoading: planifieesLoading } = useQuery({
    queryKey: ["entreprise-missions", "en_attente", "count"],
    queryFn: () => api.getEntrepriseMissions({ status: "en_attente", itemsPerPage: 1 }),
  });
  const { data: drones, isLoading: dronesLoading } = useQuery({ queryKey: ["drones"], queryFn: api.getDrones });
  // Liste complète (pas juste un compteur paginé) pour alimenter les graphiques
  // ci-dessous — même endpoint que les compteurs "en cours"/"planifiées".
  const { data: allMissions, isLoading: allMissionsLoading } = useQuery({
    queryKey: ["entreprise-missions", "all"],
    queryFn: () => api.getEntrepriseMissions({ itemsPerPage: 100 }),
  });
  const dronesDisponibles = drones?.filter((d) => d.status === "disponible").length ?? 0;
  const statsLoading = membersLoading || enCoursLoading || planifieesLoading || dronesLoading;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1>Espace Admin</h1>
          <p className="mt-2 text-brand-gray dark:text-white/60">Bienvenue, {displayName}.</p>
        </div>
        <WeatherCard />
      </div>

      <div className="mt-6">
        {statsLoading ? (
          <StatGridSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Techniciens" value={String(members?.length ?? "—")} icon={Users} />
            <StatCard label="Missions en cours" value={String(enCours?.totalCount ?? "—")} icon={ClipboardList} />
            <StatCard label="Missions planifiées" value={String(planifiees?.totalCount ?? "—")} icon={CalendarClock} />
            <StatCard
              label="Flotte disponible"
              value={drones ? `${dronesDisponibles}/${drones.length}` : "—"}
              icon={Plane}
            />
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FleetStatusWidget drones={drones} isLoading={dronesLoading} />
        <FlightSettingsWidget settings={settings} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <MissionsTimelineChart missions={allMissions?.data} isLoading={allMissionsLoading} />
        <TechnicienWorkloadChart missions={allMissions?.data} members={members} isLoading={allMissionsLoading || membersLoading} />
      </div>
    </div>
  );
}
