import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  page: number;
  itemsPerPage: number;
  totalCount: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
}

// Pagination générique — page/itemsPerPage/totalCount/hasMore peuvent venir
// du backend ou être calculés côté client (voir admin/Missions.tsx : la liste
// est chargée en une fois puis triée/paginée en mémoire, faute de paramètre
// de tri côté API — le composant ne fait aucune hypothèse sur la source).
export function Pagination({ page, itemsPerPage, totalCount, hasMore, onPageChange }: Props) {
  if (totalCount === 0) return null;

  const start = (page - 1) * itemsPerPage + 1;
  const end = Math.min(page * itemsPerPage, totalCount);

  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-[13px] text-brand-gray dark:text-white/60">
      <span>
        {start}–{end} sur {totalCount}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="gap-1"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={14} />
          Précédent
        </Button>
        <Button variant="secondary" size="sm" className="gap-1" disabled={!hasMore} onClick={() => onPageChange(page + 1)}>
          Suivant
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
