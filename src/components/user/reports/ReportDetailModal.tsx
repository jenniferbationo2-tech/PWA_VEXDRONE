import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Download, FileSpreadsheet, Share2, Mail, MessageCircle, FileText } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { modalTransition, modalVariants, overlayTransition, overlayVariants } from "@/lib/motion";
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

  const dateFR = report ? new Date(report.date).toLocaleDateString("fr-FR") : "";
  const hasPdfPreview = report ? report.pdfUrl && report.pdfUrl !== "#" : false;
  const shareText = report ? buildShareText(report) : "";

  return (
    <AnimatePresence>
      {report && (
        <motion.div
          className="dark fixed inset-0 z-50 flex items-center justify-center bg-brand-blue-dark/60 px-4 backdrop-blur-sm"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={overlayTransition}
        >
          <motion.div
            className="w-full max-w-lg rounded-lg border border-white/10 bg-brand-blue-dark/80 p-6 shadow-2xl backdrop-blur-md"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={modalTransition}
          >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-[18px] font-bold text-white">{report.missionName}</h2>
            <p className="mt-0.5 text-[13px] text-white/60">Rapport de mission</p>
          </div>

          <div className="flex items-center gap-1">
            <IconButton icon={Download} label="Exporter en PDF" onClick={() => downloadPdf(report)} />
            <IconButton icon={FileSpreadsheet} label="Exporter en CSV" onClick={() => exportReportCsv(report)} />

            <div className="relative">
              <IconButton icon={Share2} label="Partager" onClick={() => setShareOpen((v) => !v)} />
              {shareOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShareOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1.5 w-52 rounded-lg border border-white/10 bg-brand-blue-dark p-1.5 shadow-2xl">
                    <a
                      href={`mailto:?subject=${encodeURIComponent(`Rapport — ${report.missionName}`)}&body=${encodeURIComponent(shareText)}`}
                      onClick={() => setShareOpen(false)}
                      className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-[13px] font-medium text-white hover:bg-white/5"
                    >
                      <Mail size={15} className="text-white/60" />
                      Envoyer par e-mail
                    </a>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShareOpen(false)}
                      className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-[13px] font-medium text-white hover:bg-white/5"
                    >
                      <MessageCircle size={15} className="text-white/60" />
                      Partager via WhatsApp
                    </a>
                  </div>
                </>
              )}
            </div>

            <button onClick={onClose} className="ml-1.5 text-white/60 hover:text-white" aria-label="Fermer">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-y-3 rounded-md bg-white/5 px-4 py-3.5 text-[13px]">
          <span className="text-white/60">Zone</span>
          <span className="text-right font-semibold text-white">{report.zone}</span>
          <span className="text-white/60">Date</span>
          <span className="text-right font-semibold text-white">{dateFR}</span>
          <span className="text-white/60">Anomalies détectées</span>
          <span className="text-right font-semibold text-white">{report.anomaliesCount}</span>
        </div>

        {hasPdfPreview ? (
          <iframe title="Aperçu du rapport PDF" src={report.pdfUrl} className="h-64 w-full rounded-md border border-white/10" />
        ) : (
          <div className="flex h-40 flex-col items-center justify-center rounded-md border border-dashed border-white/15 text-center">
            <FileText size={22} className="mb-2 text-white/50" />
            <p className="text-[13px] text-white/60">Aperçu PDF indisponible</p>
          </div>
        )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
