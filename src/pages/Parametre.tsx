import { useAuth } from "@/lib/Auth/AuthContext";

export function Parametres() {
  const { user } = useAuth();

  return (
    <div>
      <h1>Paramètres</h1>

      <div className="mt-6 max-w-md rounded-lg border border-brand-blue/[0.06] bg-white p-5 shadow-card">
        <p className="text-[13px] text-brand-gray">Connecté en tant que</p>
        <p className="font-semibold text-brand-blue-dark">{user?.username}</p>
      </div>
    </div>
  );
}