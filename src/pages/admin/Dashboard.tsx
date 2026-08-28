import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/Auth/AuthContext";
import { prettifyUsername } from "@/lib/utils";

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.name ?? prettifyUsername(user?.username ?? "");

  return (
    <div>
      <h1>Espace Admin</h1>
      <p className="mt-2 text-brand-gray dark:text-white/60">Bienvenue, {displayName}.</p>

      <div className="mt-6 max-w-md">
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
      </div>
    </div>
  );
}
