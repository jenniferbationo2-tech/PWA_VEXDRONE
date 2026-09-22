import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

// Filet de secours si un composant plante en plein rendu (voir main.tsx,
// Sentry.ErrorBoundary) : sans ca, React demonte tout l'arbre et laisse un
// ecran blanc — particulierement mauvais en pleine demo devant un jury.
export function ErrorFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-off-white p-6 dark:bg-brand-blue-dark">
      <div className="max-w-sm rounded-lg border border-brand-blue/[0.06] bg-white p-6 text-center shadow-card dark:border-white/10 dark:bg-brand-blue-dark dark:shadow-none">
        <TriangleAlert className="mx-auto mb-3 text-brand-orange" size={32} />
        <h1 className="font-display text-[16px] font-semibold text-brand-blue-dark dark:text-white">
          Une erreur inattendue est survenue
        </h1>
        <p className="mt-2 text-[14px] text-brand-blue-dark/60 dark:text-white/60">
          L'équipe a été notifiée. Essaie de recharger la page.
        </p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Recharger la page
        </Button>
      </div>
    </div>
  );
}
