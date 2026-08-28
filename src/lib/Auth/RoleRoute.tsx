import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { normalizeRole, roleHome, type Role } from "./roles";

// A placer sous ProtectedRoute : suppose déjà un user authentifié. Un rôle
// non autorisé est renvoyé vers son propre espace, pas vers /connexion —
// il est bien connecté, juste au mauvais endroit.
export function RoleRoute({ allow }: { allow: Role[] }) {
  const { user } = useAuth();
  if (!user) return null;

  const role = normalizeRole(user.role);
  return allow.includes(role) ? <Outlet /> : <Navigate to={roleHome(user.role)} replace />;
}
