import { Building2, ShieldBan, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { DashboardActionCard } from "@/components/dashboard/DashboardActionCard";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/Auth/AuthContext";
import { prettifyUsername } from "@/lib/utils";
import { StatGridSkeleton } from "@/components/ui/StatGridSkeleton";

export function SuperAdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.name ?? prettifyUsername(user?.username ?? "");

  const { data: entreprises, isLoading: entreprisesLoading } = useQuery({ queryKey: ["entreprises"], queryFn: api.getEntreprises });
  const { data: users, isLoading: usersLoading } = useQuery({ queryKey: ["platform-users"], queryFn: api.getPlatformUsers });
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

      <div className="mt-6 max-w-md">
        <DashboardActionCard
          title="Entreprises"
          description="Gère les entreprises et leurs comptes admin sur la plateforme."
          buttonLabel="Gérer les entreprises"
          buttonIcon={Building2}
          onAction={() => navigate("/super-admin/entreprises")}
        />
      </div>
    </div>
  );
}
