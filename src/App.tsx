import { lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/Auth/AuthContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { NotificationProvider } from "@/lib/notifications/NotificationContext";
import { ProtectedRoute } from "@/lib/Auth/ProtectedRoute";
import { RoleRoute } from "@/lib/Auth/RoleRoute";
import { roleHome } from "@/lib/Auth/roles";
import { AppShell } from "@/components/layout/AppShell";
import { Login } from "@/pages/Login";

// Un chunk par écran (chargé à la navigation, pas au démarrage) plutôt qu'un
// seul bundle de ~940 Ko : Leaflet (Carte) et le module médias/IA (Anomalies)
// sont les plus lourds à sortir du chargement initial.
const Dashboard = lazy(() => import("@/pages/user/Dashboard").then((m) => ({ default: m.Dashboard })));
const Missions = lazy(() => import("@/pages/user/Missions").then((m) => ({ default: m.Missions })));
const Anomalies = lazy(() => import("@/pages/user/Anomalies").then((m) => ({ default: m.Anomalies })));
const Carte = lazy(() => import("@/pages/user/Carte").then((m) => ({ default: m.Carte })));
const Vols = lazy(() => import("@/pages/user/Vols").then((m) => ({ default: m.Vols })));
const Rapports = lazy(() => import("@/pages/user/Rapports").then((m) => ({ default: m.Rapports })));
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard").then((m) => ({ default: m.AdminDashboard })));
const AdminTechniciens = lazy(() => import("@/pages/admin/Techniciens").then((m) => ({ default: m.AdminTechniciens })));
const AdminMissions = lazy(() => import("@/pages/admin/Missions").then((m) => ({ default: m.AdminMissions })));
const SuperAdminDashboard = lazy(() =>
  import("@/pages/super-admin/Dashboard").then((m) => ({ default: m.SuperAdminDashboard }))
);
const SuperAdminEntreprises = lazy(() =>
  import("@/pages/super-admin/Entreprises").then((m) => ({ default: m.SuperAdminEntreprises }))
);
const Parametres = lazy(() => import("@/pages/Parametre").then((m) => ({ default: m.Parametres })));

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
                    <Route path="/admin/missions" element={<AdminMissions />} />
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
