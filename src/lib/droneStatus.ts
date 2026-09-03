import type { BadgeProps } from "@/components/ui/badge";
import type { DroneStatus } from "@/lib/api/types";

// Libellés + couleur (badge ET graphique) par statut de drone — partagé entre
// la gestion de flotte (SuperAdmin), le widget de consultation en lecture
// seule (Admin) et le donut d'utilisation de la flotte (SuperAdmin). `color`
// reprend le hex Tailwind derrière chaque variant (voir tailwind.config.ts)
// car recharts a besoin d'une couleur littérale, pas d'une classe.
export const DRONE_STATUS_OPTIONS: {
  value: DroneStatus;
  label: string;
  variant: NonNullable<BadgeProps["variant"]>;
  color: string;
}[] = [
  { value: "disponible", label: "Disponible", variant: "success", color: "#3E8F5C" },
  { value: "en_vol", label: "En vol", variant: "active", color: "#1B365D" },
  { value: "maintenance", label: "Maintenance", variant: "pending", color: "#F2A93B" },
  { value: "hors_service", label: "Hors service", variant: "high", color: "#E37222" },
];
