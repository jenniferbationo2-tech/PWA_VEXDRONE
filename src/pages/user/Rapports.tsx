import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Search, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { Report } from "@/lib/api/types";
import { ReportDetailModal } from "@/components/user/reports/ReportDetailModal";
import { Input } from "@/components/ui/input";
import { partitionReports } from "@/lib/reportArchive";

const TABS = [
  { value: "recentes", label: "Missions terminées" },
  { value: "archives", label: "Archives" },
] as const;

export function Rapports() {
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("recentes");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const { data: reports, isLoading, isError } = useQuery({
    queryKey: ["reports"],
    queryFn: api.getReports,
  });

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const hasActiveFilters = search.trim() !== "" || dateFrom !== "" || dateTo !== "";

  function resetFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
  }

  const { active, archived } = useMemo(() => partitionReports(reports ?? []), [reports]);

  const visible = useMemo(() => {
    const source = tab === "recentes" ? active : archived;
    const q = search.trim().toLowerCase();
    return source.filter((r) => {
      const matchesSearch = q === "" || r.missionName.toLowerCase().includes(q);
      const matchesDate =
        dateFrom && dateTo
          ? r.date >= dateFrom && r.date <= dateTo
          : dateFrom
          ? r.date === dateFrom
          : dateTo
          ? r.date <= dateTo
          : true;
      return matchesSearch && matchesDate;
    });
  }, [active, archived, tab, search, dateFrom, dateTo]);

  return (
    <div>
      <div className="mb-6">
        <h1>Rapports</h1>
      </div>

      <div className="mb-5 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "rounded-sm px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              tab === t.value
                ? "bg-brand-blue text-white"
                : "bg-white text-brand-blue-dark/70 border border-brand-gray/20 hover:bg-brand-off-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray" />
          <Input
            placeholder="Rechercher un rapport par nom de mission…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[13px] text-brand-gray">Du</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[150px]"
          />
          <label className="text-[13px] text-brand-gray">Au</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[150px]"
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-gray hover:text-brand-blue-dark"
          >
            <X size={14} />
            Réinitialiser
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-brand-gray shadow-card">
          Chargement des rapports…
        </div>
      ) : isError ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-center shadow-card">
          <p className="font-semibold text-brand-blue-dark">Impossible de charger les rapports</p>
          <p className="mt-1 text-[13px] text-brand-gray">Vérifie la connexion à l'API et réessaie.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-center shadow-card">
          <p className="font-semibold text-brand-blue-dark">
            {hasActiveFilters
              ? "Aucun rapport ne correspond"
              : tab === "archives"
              ? "Aucun rapport archivé"
              : "Aucun rapport disponible"}
          </p>
          <p className="mt-1 text-[13px] text-brand-gray">
            {hasActiveFilters
              ? "Essaie un autre nom de mission ou une autre période."
              : tab === "archives"
              ? "Les rapports archivés apparaîtront ici."
              : "Les rapports de missions terminées apparaîtront ici automatiquement."}
          </p>
        </div>
      ) : (
        <>
          {/* Vue tableau — desktop */}
          <div className="hidden overflow-hidden rounded-lg border border-brand-blue/[0.06] bg-white shadow-card md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[14px]">
                <thead>
                  <tr className="border-b border-brand-blue/[0.06] text-[12px] uppercase tracking-wide text-brand-gray">
                    <th className="px-6 py-3 font-medium">Mission</th>
                    <th className="px-6 py-3 font-medium">Zone</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Anomalies</th>
                    {/* <th className="px-6 py-3 font-medium">Rapport PDF</th> */}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedReport(r)}
                      className="cursor-pointer border-b border-brand-blue/[0.04] last:border-0 hover:bg-brand-off-white/60"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded bg-brand-orange/10 text-[10px] font-bold text-brand-orange">
                            <FileText size={14} />
                          </span>
                          <span className="font-semibold text-brand-blue-dark">{r.missionName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-brand-gray">{r.zone}</td>
                      <td className="px-6 py-3.5 text-brand-gray">
                        {new Date(r.date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-brand-blue-dark">{r.anomaliesCount}</td>
                      {/* <td className="px-6 py-3.5">
                        <a
                          href={r.pdfUrl}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-blue hover:underline"
                        >
                          <Download size={13} />
                          Télécharger PDF
                        </a>
                      </td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vue cartes — mobile */}
          <div className="space-y-3 md:hidden">
            {visible.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedReport(r)}
                className="cursor-pointer rounded-lg border border-brand-blue/[0.06] bg-white p-4 shadow-card"
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-brand-orange/10 text-brand-orange">
                    <FileText size={14} />
                  </span>
                  <div>
                    <p className="font-semibold text-brand-blue-dark">{r.missionName}</p>
                    <p className="text-[12px] text-brand-gray">{r.zone}</p>
                  </div>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-y-1.5 text-[13px]">
                  <span className="text-brand-gray">Date</span>
                  <span className="text-right font-medium text-brand-blue-dark">
                    {new Date(r.date).toLocaleDateString("fr-FR")}
                  </span>
                  <span className="text-brand-gray">Anomalies</span>
                  <span className="text-right font-semibold text-brand-blue-dark">{r.anomaliesCount}</span>
                </div>

                <a
                  href={r.pdfUrl}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-1.5 rounded-sm border border-brand-blue/20 py-2 text-[13px] font-semibold text-brand-blue hover:bg-brand-off-white"
                >
                  <Download size={13} />
                  Télécharger PDF
                </a>
              </div>
            ))}
          </div>
        </>
      )}

      <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
    </div>
  );
}