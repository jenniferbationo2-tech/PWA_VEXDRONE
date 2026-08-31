import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

interface Props {
  rows?: number;
  columns?: number;
  className?: string;
}

// Remplace le tableau/liste réel pendant son chargement — même conteneur
// (bordure/fond/ombre) que les tableaux qu'il précède, pour que la mise en
// page ne "saute" pas quand les vraies données arrivent.
export function TableSkeleton({ rows = 5, columns = 4, className }: Props) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-brand-blue/[0.06] bg-white shadow-card dark:border-white/10 dark:bg-brand-blue-dark",
        className
      )}
    >
      <div className="divide-y divide-brand-blue/[0.04] dark:divide-white/5">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-6 px-5 py-4">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className={cn("h-3.5", c === 0 ? "w-1/5 min-w-[80px]" : "max-w-[140px] flex-1")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
