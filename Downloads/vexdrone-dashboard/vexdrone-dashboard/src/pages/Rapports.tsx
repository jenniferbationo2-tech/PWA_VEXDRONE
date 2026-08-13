import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download } from "lucide-react";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "recentes", label: "Missions terminées" },
  { value: "archives", label: "Archives" },
] as const;

export function Rapports() {
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("recentes");
  const { data: reports, isLoading, isError } = useQuery({
    queryKey: ["reports"],
    queryFn: api.getReports,
  });

  const visible = tab === "recentes" ? reports ?? [] : [];

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
            {tab === "archives" ? "Aucun rapport archivé" : "Aucun rapport disponible"}
          </p>
          <p className="mt-1 text-[13px] text-brand-gray">
            {tab === "archives"
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
                    <th className="px-6 py-3 font-medium">Rapport PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id} className="border-b border-brand-blue/[0.04] last:border-0 hover:bg-brand-off-white/60">
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
                      <td className="px-6 py-3.5">
                        
                         <a href={r.pdfUrl}
                          className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-blue hover:underline"
                        >
                          <Download size={13} />
                          Télécharger PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vue cartes — mobile */}
          <div className="space-y-3 md:hidden">
            {visible.map((r) => (
              <div key={r.id} className="rounded-lg border border-brand-blue/[0.06] bg-white p-4 shadow-card">
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

                
                 <a href={r.pdfUrl}
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
    </div>
  );
}