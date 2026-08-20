import { useState } from "react";
import { X, Download, FileSpreadsheet, Share2, Mail, MessageCircle, FileText } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import type { Report } from "@/lib/api/types";

interface Props {
  report: Report | null;
  onClose: () => void;
}

function csvEscape(value: string) {
  return /[",;\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function exportReportCsv(report: Report) {
  const headers = ["Mission", "Zone", "Date", "Anomalies détectées"];
  const row = [
    report.missionName,
    report.zone,
    new Date(report.date).toLocaleDateString("fr-FR"),
    String(report.anomaliesCount),
  ];
  const csv = [headers, row].map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rapport-${report.missionName.replace(/\s+/g, "_")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadPdf(report: Report) {
  const a = document.createElement("a");
  a.href = report.pdfUrl;
  a.download = `rapport-${report.missionName.replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function buildShareText(report: Report) {
  const dateFR = new Date(report.date).toLocaleDateString("fr-FR");
  const base = `Rapport de mission "${report.missionName}" (${report.zone}) — ${dateFR} — ${report.anomaliesCount} anomalie(s) détectée(s).`;
  return report.pdfUrl && report.pdfUrl !== "#" ? `${base}\n${report.pdfUrl}` : base;
}

export function ReportDetailModal({ report, onClose }: Props) {
  const [shareOpen, setShareOpen] = useState(false);

  if (!report) return null;

  const dateFR = new Date(report.date).toLocaleDateString("fr-FR");
  const hasPdfPreview = report.pdfUrl && report.pdfUrl !== "#";
  const shareText = buildShareText(report);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-[18px] font-bold text-brand-blue-dark">{report.missionName}</h2>
            <p className="mt-0.5 text-[13px] text-brand-gray">Rapport de mission</p>
          </div>

          <div className="flex items-center gap-1">
            <IconButton icon={Download} label="Exporter en PDF" onClick={() => downloadPdf(report)} />
            <IconButton icon={FileSpreadsheet} label="Exporter en CSV" onClick={() => exportReportCsv(report)} />

            <div className="relative">
              <IconButton icon={Share2} label="Partager" onClick={() => setShareOpen((v) => !v)} />
              {shareOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShareOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1.5 w-52 rounded-lg border border-brand-blue/[0.06] bg-white p-1.5 shadow-2xl">
                    <a
                      href={`mailto:?subject=${encodeURIComponent(`Rapport — ${report.missionName}`)}&body=${encodeURIComponent(shareText)}`}
                      onClick={() => setShareOpen(false)}
                      className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-[13px] font-medium text-brand-blue-dark hover:bg-brand-off-white"
                    >
                      <Mail size={15} className="text-brand-gray" />
                      Envoyer par e-mail
                    </a>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShareOpen(false)}
                      className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-[13px] font-medium text-brand-blue-dark hover:bg-brand-off-white"
                    >
                      <MessageCircle size={15} className="text-brand-gray" />
                      Partager via WhatsApp
                    </a>
                  </div>
                </>
              )}
            </div>

            <button onClick={onClose} className="ml-1.5 text-brand-gray hover:text-brand-blue-dark" aria-label="Fermer">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-y-3 rounded-md bg-brand-off-white px-4 py-3.5 text-[13px]">
          <span className="text-brand-gray">Zone</span>
          <span className="text-right font-semibold text-brand-blue-dark">{report.zone}</span>
          <span className="text-brand-gray">Date</span>
          <span className="text-right font-semibold text-brand-blue-dark">{dateFR}</span>
          <span className="text-brand-gray">Anomalies détectées</span>
          <span className="text-right font-semibold text-brand-blue-dark">{report.anomaliesCount}</span>
        </div>

        {hasPdfPreview ? (
          <iframe title="Aperçu du rapport PDF" src={report.pdfUrl} className="h-64 w-full rounded-md border border-brand-blue/[0.06]" />
        ) : (
          <div className="flex h-40 flex-col items-center justify-center rounded-md border border-dashed border-brand-blue/15 text-center">
            <FileText size={22} className="mb-2 text-brand-gray" />
            <p className="text-[13px] text-brand-gray">Aperçu PDF indisponible</p>
          </div>
        )}
      </div>
    </div>
  );
}
