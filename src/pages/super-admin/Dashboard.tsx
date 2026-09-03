import { useState } from "react";
import { Building2, Plane, Settings2, ShieldBan, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { DashboardActionCard } from "@/components/dashboard/DashboardActionCard";
import { FleetModal } from "@/components/dashboard/FleetModal";
import { SettingsModal } from "@/components/dashboard/SettingsModal";
import { EntrepriseUsersChart } from "@/components/super-admin/dashboard/EntrepriseUsersChart";
import { FleetUsageDonut } from "@/components/super-admin/dashboard/FleetUsageDonut";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/Auth/AuthContext";
import { prettifyUsername } from "@/lib/utils";
import { StatGridSkeleton } from "@/components/ui/StatGridSkeleton";
import { formatAltitude, formatSpeed, getAdminSettings, EXPORT_FORMAT_LABELS, type AdminSettings } from "@/lib/adminSettings";

export function SuperAdminDashboard() {
  const { user } = useAuth();
  const displayName = user?.name ?? prettifyUsername(user?.username ?? "");

  const [fleetOpen, setFleetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AdminSettings>(() => getAdminSettings());

  const { data: entreprises, isLoading: entreprisesLoading } = useQuery({ queryKey: ["entreprises"], queryFn: api.getEntreprises });
  const { data: users, isLoading: usersLoading } = useQuery({ queryKey: ["platform-users"], queryFn: api.getPlatformUsers });
  const { data: drones, isLoading: dronesLoading } = useQuery({ queryKey: ["drones"], queryFn: api.getDrones });
  const statsLoading = entreprisesLoading || usersLoading;

  const activeCount = entreprises?.filter((e) => e.status === "active").length ?? 0;
  const blockedCount = entreprises?.filter((e) => e.status === "bloquee").length ?? 0;
  const adminCount = users?.filter((u) => u.role === "admin").length ?? 0;
  const technicienCount = users?.filter((u) => u.role === "technicien").length ?? 0;

  return (
    <div>
      <h1>Espace SuperAdmin</h1>
      <p className="mt-2 text-brand-gray dark:text-white/60">Bienvenue, {displayName}.</p>

      <div className="mt-6">
        {statsLoading ? (
          <StatGridSkeleton count={3} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Card className="flex flex-col items-center py-5 text-center">
              <Building2 size={20} className="mb-2 text-brand-blue dark:text-white" />
              <p className="font-display text-[22px] font-bold text-brand-blue-dark dark:text-white">{activeCount}</p>
              <p className="text-[12px] text-brand-gray dark:text-white/60">Entreprises actives</p>
            </Card>
            <Card className="flex flex-col items-center py-5 text-center">
              <ShieldBan size={20} className="mb-2 text-brand-orange" />
              <p className="font-display text-[22px] font-bold text-brand-blue-dark dark:text-white">{blockedCount}</p>
              <p className="text-[12px] text-brand-gray dark:text-white/60">Entreprises bloquées</p>
            </Card>
            <Card className="flex flex-col items-center py-5 text-center">
              <Users size={20} className="mb-2 text-brand-blue dark:text-white" />
              <p className="font-display text-[22px] font-bold text-brand-blue-dark dark:text-white">
                {adminCount} / {technicienCount}
              </p>
              <p className="text-[12px] text-brand-gray dark:text-white/60">Admins / Techniciens</p>
            </Card>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardActionCard
          title="Flotte"
          description="Vue Admin en lecture seule — les modifications se font ici."
          buttonLabel="Gérer la flotte"
          buttonIcon={Plane}
          buttonVariant="secondary"
          onAction={() => setFleetOpen(true)}
        >
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
        </DashboardActionCard>

        <DashboardActionCard
          title="Réglages de vol & export"
          description="Propres à cet appareil — non synchronisés entre navigateurs ou comptes SuperAdmin."
          buttonLabel="Modifier"
          buttonIcon={Settings2}
          buttonVariant="secondary"
          onAction={() => setSettingsOpen(true)}
        >
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
        </DashboardActionCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <EntrepriseUsersChart entreprises={entreprises} users={users} isLoading={statsLoading} />
        <FleetUsageDonut drones={drones} isLoading={dronesLoading} />
      </div>

      <FleetModal open={fleetOpen} onClose={() => setFleetOpen(false)} />
      <SettingsModal open={settingsOpen} settings={settings} onClose={() => setSettingsOpen(false)} onSaved={setSettings} />
    </div>
  );
}
