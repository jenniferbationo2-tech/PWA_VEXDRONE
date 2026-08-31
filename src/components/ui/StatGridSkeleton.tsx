import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/card";

// Reprend la forme de StatCard (label, valeur, ligne d'aide) pour les
// bandeaux de stats de tableau de bord.
export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="mb-3 h-3 w-20" />
          <Skeleton className="mb-2 h-7 w-14" />
          <Skeleton className="h-3 w-24" />
        </Card>
      ))}
    </div>
  );
}
