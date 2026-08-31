import { cn } from "@/lib/utils";

// Primitive : un bloc gris pulsé, dimensionné via className. Toute
// composition de skeleton (table, grille de stats, carte...) part de ce seul
// bloc pour rester visuellement cohérente dans toute l'app.
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-sm bg-brand-blue/[0.08] dark:bg-white/10", className)} />;
}
