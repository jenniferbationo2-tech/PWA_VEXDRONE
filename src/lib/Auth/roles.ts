export type Role = "technicien" | "admin" | "super_admin";

// Valeurs confirmées côté API (schéma UserRole, GET /openapi.json) :
// "superadmin" | "admin" | "utilisateur". "technicien" est notre libellé
// interne pour ce même palier — alias conservés pour la tolérance en mock.
const ROLE_ALIASES: Record<string, Role> = {
  utilisateur: "technicien",
  technicien: "technicien",
  technician: "technicien",
  user: "technicien",
  admin: "admin",
  administrateur: "admin",
  gerant: "admin",
  super_admin: "super_admin",
  "super-admin": "super_admin",
  superadmin: "super_admin",
};
export function normalizeRole(role: string | undefined): Role {
  if (!role) return "technicien";
  return ROLE_ALIASES[role.trim().toLowerCase()] ?? "technicien";
}

const ROLE_HOME: Record<Role, string> = {
  technicien: "/",
  admin: "/admin",
  super_admin: "/super-admin",
};

export function roleHome(role: string | undefined): string {
  return ROLE_HOME[normalizeRole(role)];
}
