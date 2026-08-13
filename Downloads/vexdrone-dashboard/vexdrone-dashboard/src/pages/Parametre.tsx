import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/Auth/AuthContext";

export function Parametres() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/connexion");
  }

  return (
    <div>
      <h1>Paramètres</h1>

      <div className="mt-6 max-w-md rounded-lg border border-brand-blue/[0.06] bg-white p-5 shadow-card">
        <p className="text-[13px] text-brand-gray">Connecté en tant que</p>
        <p className="mb-5 font-semibold text-brand-blue-dark">{user?.username}</p>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-sm border border-brand-orange/30 px-4 py-2 text-[13px] font-semibold text-brand-orange hover:bg-brand-orange/5"
        >
          <LogOut size={14} />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}