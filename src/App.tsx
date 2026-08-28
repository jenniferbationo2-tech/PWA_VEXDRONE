import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/Auth/AuthContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { NotificationProvider } from "@/lib/notifications/NotificationContext";
import { ProtectedRoute } from "@/lib/Auth/ProtectedRoute";
import { RoleRoute } from "@/lib/Auth/RoleRoute";
import { roleHome } from "@/lib/Auth/roles";
import { AppShell } from "@/components/layout/AppShell";
import { Dashboard } from "@/pages/user/Dashboard";
import { Missions } from "@/pages/user/Missions";
import { Anomalies } from "@/pages/user/Anomalies";
import { Carte } from "@/pages/user/Carte";
import { Vols } from "@/pages/user/Vols";
import { Rapports } from "@/pages/user/Rapports";
import { AdminDashboard } from "@/pages/admin/Dashboard";
import { AdminTechniciens } from "@/pages/admin/Techniciens";
import { SuperAdminDashboard } from "@/pages/super-admin/Dashboard";
import { SuperAdminEntreprises } from "@/pages/super-admin/Entreprises";
import { Login } from "@/pages/Login";
import { Parametres } from "@/pages/Parametre";

// Chemin inconnu (ou racine "/" pour un admin/superAdmin — leur "/" est
// réservé au technicien, voir RoleRoute) : on renvoie vers l'accueil propre
// au rôle plutôt que de laisser une page blanche.
function DefaultRedirect() {
  const { user } = useAuth();
  return <Navigate to={roleHome(user?.role)} replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <Routes>
              <Route path="/connexion" element={<Login />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  {/* Partagé entre les 3 rôles */}
                  <Route path="/parametres" element={<Parametres />} />

                  {/* Technicien */}
                  <Route element={<RoleRoute allow={["technicien"]} />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/missions" element={<Missions />} />
                    <Route path="/vols" element={<Vols />} />
                    <Route path="/anomalies" element={<Anomalies />} />
                    <Route path="/carte" element={<Carte />} />
                    <Route path="/rapports" element={<Rapports />} />
                  </Route>

                  {/* Admin */}
                  <Route element={<RoleRoute allow={["admin"]} />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/techniciens" element={<AdminTechniciens />} />
                  </Route>

                  {/* SuperAdmin */}
                  <Route element={<RoleRoute allow={["super_admin"]} />}>
                    <Route path="/super-admin" element={<SuperAdminDashboard />} />
                    <Route path="/super-admin/entreprises" element={<SuperAdminEntreprises />} />
                  </Route>

                  <Route path="*" element={<DefaultRedirect />} />
                </Route>
              </Route>
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
