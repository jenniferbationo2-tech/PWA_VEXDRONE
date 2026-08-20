import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/Auth/AuthContext";
import { NotificationProvider } from "@/lib/notifications/NotificationContext";
import { ProtectedRoute } from "@/lib/Auth/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { Dashboard } from "@/pages/Dashboard";
import { Missions } from "@/pages/Missions";
import { Anomalies } from "@/pages/Anomalies";
import { Carte } from "@/pages/Carte";
import { Vols } from "@/pages/Vols";
import { Rapports } from "@/pages/Rapports";
import { Login } from "@/pages/Login";
import { Parametres } from "./pages/Parametre";

// Pages à construire selon le même patron que Dashboard.tsx :
// composant dans src/pages/, données via src/lib/api/client.ts (mock -> réel).
function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <h1>{title}</h1>
      <p className="mt-2 text-brand-gray">Écran à construire — maquette disponible, pas encore implémenté.</p>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/connexion" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<Dashboard />} />

                <Route path="/missions" element={<Missions />} />
                <Route path="/vols" element={<Vols />} />
                <Route path="/anomalies" element={<Anomalies />} />
                <Route path="/carte" element={<Carte />} />
                <Route path="/rapports" element={<Rapports />} />
                <Route path="/Parametres" element={<Parametres />} />
              </Route>
            </Route>
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}