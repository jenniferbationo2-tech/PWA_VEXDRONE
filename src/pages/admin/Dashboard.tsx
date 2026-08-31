import { useState } from "react";
import { CalendarClock, ClipboardList, Plane, Settings2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/user/dashboard/StatCard";
import { StatGridSkeleton } from "@/components/ui/StatGridSkeleton";
import { WeatherCard } from "@/components/dashboard/WeatherCard";
import { FleetModal } from "@/components/admin/dashboard/FleetModal";
import { SettingsModal } from "@/components/admin/dashboard/SettingsModal";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/Auth/AuthContext";
import { prettifyUsername } from "@/lib/utils";
import { formatAltitude, formatSpeed, getAdminSettings, EXPORT_FORMAT_LABELS, type AdminSettings } from "@/lib/adminSettings";

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.name ?? prettifyUsername(user?.username ?? "");

  const [fleetOpen, setFleetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AdminSettings>(() => getAdminSettings());

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
  const dronesDisponibles = drones?.filter((d) => d.status === "disponible").length ?? 0;
  const statsLoading = membersLoading || enCoursLoading || planifieesLoading || dronesLoading;

  return (
    <div>
      <h1>Espace Admin</h1>
      <p className="mt-2 text-brand-gray dark:text-white/60">Bienvenue, {displayName}.</p>

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
        <div className="space-y-4">
          <WeatherCard />

          <Card>
            <CardHeader>
              <CardTitle>Techniciens</CardTitle>
            </CardHeader>
            <p className="mb-4 text-[13px] text-brand-gray dark:text-white/60">
              Inscris et gère les techniciens de ton entreprise sur la plateforme.
            </p>
            <Button size="sm" className="gap-2" onClick={() => navigate("/admin/techniciens")}>
              <Users size={16} strokeWidth={1.75} />
              Gérer les techniciens
            </Button>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Missions</CardTitle>
            </CardHeader>
            <p className="mb-4 text-[13px] text-brand-gray dark:text-white/60">
              Suis les missions de tous les techniciens de ton entreprise.
            </p>
            <Button size="sm" className="gap-2" onClick={() => navigate("/admin/missions")}>
              <ClipboardList size={16} strokeWidth={1.75} />
              Voir les missions
            </Button>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Flotte</CardTitle>
            </CardHeader>
            {drones && drones.length > 0 ? (
              <ul className="mb-4 space-y-1.5">
                {drones.slice(0, 3).map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded-lg border border-brand-blue/[0.06] px-3.5 py-2 text-[13px] dark:border-white/10"
                  >
                    <span className="font-medium text-brand-blue-dark dark:text-white">{d.identifiant}</span>
                    <span className="text-brand-gray dark:text-white/60">{d.modele || "—"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-[13px] text-brand-gray dark:text-white/60">Aucun drone enregistré.</p>
            )}
            <Button variant="secondary" size="sm" className="gap-2" onClick={() => setFleetOpen(true)}>
              <Plane size={16} strokeWidth={1.75} />
              Gérer la flotte
            </Button>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Réglages de vol & export</CardTitle>
            </CardHeader>
            <div className="mb-4 flex flex-wrap gap-1.5 text-[12px]">
              <span className="rounded-full bg-brand-off-white px-2.5 py-1 text-brand-blue-dark dark:bg-white/10 dark:text-white/80">
                Altitude max {formatAltitude(settings.defaultMaxAltitudeMeters, settings.altitudeUnit)}
              </span>
              <span className="rounded-full bg-brand-off-white px-2.5 py-1 text-brand-blue-dark dark:bg-white/10 dark:text-white/80">
                {settings.altitudeUnit === "ft" ? "Pieds" : "Mètres"}
              </span>
              <span className="rounded-full bg-brand-off-white px-2.5 py-1 text-brand-blue-dark dark:bg-white/10 dark:text-white/80">
                {formatSpeed(100, settings.speedUnit).split(" ")[1]}
              </span>
              <span className="rounded-full bg-brand-off-white px-2.5 py-1 text-brand-blue-dark dark:bg-white/10 dark:text-white/80">
                Export {EXPORT_FORMAT_LABELS[settings.defaultExportFormat]}
              </span>
            </div>
            <Button variant="secondary" size="sm" className="gap-2" onClick={() => setSettingsOpen(true)}>
              <Settings2 size={16} strokeWidth={1.75} />
              Modifier
            </Button>
          </Card>
        </div>
      </div>

      <FleetModal open={fleetOpen} onClose={() => setFleetOpen(false)} />
      <SettingsModal open={settingsOpen} settings={settings} onClose={() => setSettingsOpen(false)} onSaved={setSettings} />
    </div>
  );
}
