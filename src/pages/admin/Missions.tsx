import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { api } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import type { MissionStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { MISSION_STATUS_BADGE, formatMissionDateRange } from "@/lib/missionStatus";

const FILTERS: { value: MissionStatus | "toutes"; label: string }[] = [
  { value: "toutes", label: "Toutes" },
  { value: "en_attente", label: "En attente" },
  { value: "en_cours", label: "En cours" },
  { value: "terminee", label: "Terminée" },
  { value: "annulee", label: "Annulée" },
];

const ITEMS_PER_PAGE = 10;

export function AdminMissions() {
  const [filter, setFilter] = useState<MissionStatus | "toutes">("toutes");
  const [page, setPage] = useState(1);

  const { data: members } = useQuery({ queryKey: ["team-members"], queryFn: api.getTeamMembers });
  const technicienName = (userId?: string) => members?.find((m) => m.id === userId)?.name ?? "—";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["entreprise-missions", filter, page],
    queryFn: () =>
      api.getEntrepriseMissions({
        status: filter === "toutes" ? undefined : filter,
        page,
        itemsPerPage: ITEMS_PER_PAGE,
      }),
  });

  function handleFilterChange(value: MissionStatus | "toutes") {
    setFilter(value);
    setPage(1);
  }

  return (
    <div>
      <h1 className="mb-6">Missions de l'entreprise</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            className={cn(
              "rounded-sm px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              filter === f.value
                ? "bg-brand-blue text-white"
                : "bg-white text-brand-blue-dark/70 border border-brand-gray/20 hover:bg-brand-off-white dark:bg-white/5 dark:text-white/70 dark:border-white/15 dark:hover:bg-white/10"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <TableSkeleton columns={5} />
      ) : isError || !data ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-center shadow-card dark:border-white/10 dark:bg-brand-blue-dark">
          <p className="font-semibold text-brand-blue-dark dark:text-white">Impossible de charger les missions</p>
        </div>
      ) : data.data.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-center shadow-card dark:border-white/10 dark:bg-brand-blue-dark">
          <ClipboardList size={28} strokeWidth={1.5} className="mb-3 text-brand-gray dark:text-white/40" />
          <p className="text-[13px] text-brand-gray dark:text-white/60">
            {filter === "toutes" ? "Aucune mission pour l'instant." : "Aucune mission avec ce statut."}
          </p>
        </div>
      ) : (
        <>
          {/* Vue tableau — desktop */}
          <div className="hidden overflow-hidden rounded-lg border border-brand-blue/[0.06] bg-white shadow-card dark:border-white/10 dark:bg-brand-blue-dark md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[14px]">
                <thead>
                  <tr className="border-b border-brand-blue/[0.06] text-[12px] uppercase tracking-wide text-brand-gray dark:border-white/10">
                    <th className="px-5 py-3 font-medium">Titre</th>
                    <th className="px-5 py-3 font-medium">Zone</th>
                    <th className="px-5 py-3 font-medium">Technicien</th>
                    <th className="px-5 py-3 font-medium">Statut</th>
                    <th className="px-5 py-3 font-medium">Dates</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((mission) => (
                    <tr
                      key={mission.id}
                      className="border-b border-brand-blue/[0.04] last:border-0 dark:border-white/5"
                    >
                      <td className="px-5 py-3.5 font-semibold text-brand-blue-dark dark:text-white">{mission.name}</td>
                      <td className="px-5 py-3.5 text-brand-gray dark:text-white/60">{mission.zone}</td>
                      <td className="px-5 py-3.5 text-brand-gray dark:text-white/60">{technicienName(mission.userId)}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={MISSION_STATUS_BADGE[mission.status].variant}>{MISSION_STATUS_BADGE[mission.status].label}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-brand-gray dark:text-white/60">
                        {formatMissionDateRange(mission.dateDebut, mission.dateFin)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vue cartes — mobile */}
          <div className="space-y-3 md:hidden">
            {data.data.map((mission) => (
              <div
                key={mission.id}
                className="rounded-lg border border-brand-blue/[0.06] bg-white p-4 shadow-card dark:border-white/10 dark:bg-brand-blue-dark"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-semibold text-brand-blue-dark dark:text-white">{mission.name}</p>
                  <Badge variant={MISSION_STATUS_BADGE[mission.status].variant}>{MISSION_STATUS_BADGE[mission.status].label}</Badge>
                </div>
                <div className="space-y-1 text-[13px] text-brand-gray dark:text-white/60">
                  <p>{mission.zone}</p>
                  <p>{technicienName(mission.userId)}</p>
                  <p>{formatMissionDateRange(mission.dateDebut, mission.dateFin)}</p>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            page={data.page}
            itemsPerPage={data.itemsPerPage}
            totalCount={data.totalCount}
            hasMore={data.hasMore}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
