import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  UploadCloud,
  FileImage,
  FileVideo,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ChevronDown,
  Check,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { getCaptureMode } from "@/lib/captureMode";
import { validateMediaSelection } from "@/lib/mediaValidation";
import { getEffectiveStatus } from "@/lib/missionStatus";
import { useNotifications } from "@/lib/notifications/NotificationContext";
import { cn, formatFileSize } from "@/lib/utils";

export function MediaAnalysisCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [selectionWarning, setSelectionWarning] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  // Présélectionnée quand on arrive depuis "Importer maintenant" sur Vols.tsx
  // (mission en mode upload) — évite d'avoir à la retrouver dans la liste.
  const location = useLocation();
  const [missionId, setMissionId] = useState(() => (location.state as { missionId?: string } | null)?.missionId ?? "");
  const [missionOpen, setMissionOpen] = useState(false);
  const missionFieldRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();

  // /images/ et /videos/ exigent tous les deux mission_uuid — import manuel,
  // donc pas de mission "active" implicite comme pour la capture live
  // (PhoneCaptureContext.tsx) : le technicien choisit explicitement.
  const { data: missions } = useQuery({ queryKey: ["missions"], queryFn: api.getMissions });
  // Seules les missions déjà lancées en mode "Upload média" (differe) ont du
  // sens ici : une mission en streaming reçoit ses photos en direct pendant
  // le vol (voir Vols.tsx), et une mission "en attente" n'a pas encore de
  // vol pour rattacher les images. Le backend n'expose capture_mode que sur
  // le Vol (pas sur la Mission, cf. openapi.json) et n'a pas de endpoint pour
  // les lister en masse — on retombe donc sur le choix fait localement au
  // lancement (setCaptureMode dans Missions.tsx), même source que Vols.tsx.
  const uploadMissions = (missions ?? []).filter((m) => {
    const status = getEffectiveStatus(m);
    return status !== "en_attente" && status !== "annulee" && getCaptureMode(m.id) === "differe";
  });
  const selectedMission = uploadMissions.find((m) => m.id === missionId) ?? null;

  // Menu custom plutôt que <select> natif : la liste déroulante d'un <select>
  // est rendue par l'OS et ignore le thème sombre de l'appli.
  useEffect(() => {
    if (!missionOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (missionFieldRef.current && !missionFieldRef.current.contains(e.target as Node)) setMissionOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMissionOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [missionOpen]);

  const analyzeMutation = useMutation({
    mutationFn: () => api.analyzeMedia(files, missionId),
    onSuccess: (job) => {
      queryClient.setQueryData(["media-analysis", job.id], job);
      setJobId(job.id);
    },
  });

  const { data: job } = useQuery({
    queryKey: ["media-analysis", jobId],
    queryFn: () => api.getMediaAnalysisJob(jobId as string),
    enabled: !!jobId,
    refetchInterval: (query) => (query.state.data?.status === "en_cours" ? 500 : false),
  });

  // Notifie une seule fois par job, quand l'analyse se termine (succès ou échec).
  const notifiedJobRef = useRef<string | null>(null);
  useEffect(() => {
    if (!jobId || !job || job.status === "en_cours" || notifiedJobRef.current === jobId) return;
    notifiedJobRef.current = jobId;
    if (job.status === "terminee") {
      queryClient.invalidateQueries({ queryKey: ["anomalies"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      const failedCount = job.failedCount ?? 0;
      addNotification({
        title: failedCount > 0 ? "Analyse terminée avec erreurs" : "Analyse terminée",
        message:
          failedCount > 0
            ? `Votre rapport est prêt — ${failedCount} image(s) n'ont pas pu être vérifiées.`
            : "Votre rapport d'analyse est prêt.",
        link: "/rapports",
      });
    } else if (job.status === "echouee") {
      addNotification({
        title: "Échec de l'analyse",
        message: job.errorMessage ?? "Une erreur est survenue pendant l'analyse.",
      });
    }
  }, [jobId, job, addNotification, queryClient]);

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const { accepted, error } = validateMediaSelection([...files, ...Array.from(fileList)]);
    setFiles(accepted);
    setSelectionWarning(error);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setSelectionWarning(null);
  }

  function resetAll() {
    setFiles([]);
    setSelectionWarning(null);
    setJobId(null);
    analyzeMutation.reset();
  }

  const phase: "idle" | "ready" | "analyzing" | "success" | "error" =
    jobId && job
      ? job.status === "en_cours"
        ? "analyzing"
        : job.status === "terminee"
        ? "success"
        : job.status === "echouee"
        ? "error"
        : "analyzing"
      : files.length > 0
      ? "ready"
      : "idle";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analyse de médias</CardTitle>
      </CardHeader>

      {(phase === "idle" || phase === "ready") && (
        <div ref={missionFieldRef} className="relative mb-3">
          <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark dark:text-white">Mission</label>
          <button
            type="button"
            onClick={() => setMissionOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={missionOpen}
            className="flex h-10 w-full items-center justify-between gap-2 rounded-sm border border-brand-gray/25 bg-white px-3 text-left text-[14px] text-brand-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 dark:border-white/15 dark:bg-white/5 dark:text-white"
          >
            <span className={cn("truncate", !selectedMission && "text-brand-gray dark:text-white/50")}>
              {selectedMission ? `${selectedMission.name} — ${selectedMission.zone}` : "Sélectionner une mission"}
            </span>
            <ChevronDown
              size={16}
              className={cn(
                "flex-shrink-0 text-brand-gray transition-transform duration-150 dark:text-white/50",
                missionOpen && "rotate-180"
              )}
            />
          </button>

          <AnimatePresence>
            {missionOpen && (
              <motion.ul
                role="listbox"
                initial={{ opacity: 0, scale: 0.97, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -4 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: "top" }}
                className="dark absolute left-0 right-0 top-full z-50 mt-1.5 max-h-56 overflow-auto rounded-lg border border-white/10 bg-brand-blue-dark/95 py-1.5 shadow-card-hover backdrop-blur-md"
              >
                {uploadMissions.length === 0 ? (
                  <li className="px-3 py-2 text-[13px] text-white/50">Aucune mission en mode upload média</li>
                ) : (
                  uploadMissions.map((m) => (
                    <li key={m.id} role="option" aria-selected={m.id === missionId}>
                      <button
                        type="button"
                        onClick={() => {
                          setMissionId(m.id);
                          setMissionOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] text-white/90 transition-colors hover:bg-white/10",
                          m.id === missionId && "bg-brand-orange/15 text-white"
                        )}
                      >
                        <span className="truncate">
                          {m.name} — {m.zone}
                        </span>
                        {m.id === missionId && <Check size={14} className="flex-shrink-0 text-brand-orange" />}
                      </button>
                    </li>
                  ))
                )}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {phase === "idle" && (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2.5 rounded-md border border-dashed border-brand-blue/20 py-10 text-center transition-colors hover:border-brand-blue/40 hover:bg-brand-off-white dark:border-white/15 dark:hover:border-white/30 dark:hover:bg-white/5"
        >
          <UploadCloud size={26} className="text-brand-blue/50 dark:text-white/40" strokeWidth={1.5} />
          <span className="text-[13px] font-medium text-brand-blue-dark dark:text-white">
            Importer des médias à analyser
          </span>
          <span className="text-[12px] text-brand-gray dark:text-white/60">Plusieurs images, ou une vidéo</span>
        </button>
      )}

      {phase === "ready" && (
        <div>
          <p className="mb-3 text-[13px] font-semibold text-brand-blue-dark dark:text-white">Médias prêts pour l'analyse</p>

          <ul className="mb-3 max-h-40 space-y-1.5 overflow-y-auto">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center gap-2.5 rounded-sm bg-brand-off-white px-3 py-2 text-[13px] dark:bg-white/5"
              >
                {f.type.startsWith("video/") ? (
                  <FileVideo size={15} className="flex-shrink-0 text-brand-blue/60 dark:text-white/50" />
                ) : (
                  <FileImage size={15} className="flex-shrink-0 text-brand-blue/60 dark:text-white/50" />
                )}
                <span className="flex-1 truncate text-brand-blue-dark dark:text-white">{f.name}</span>
                <span className="flex-shrink-0 text-[12px] text-brand-gray dark:text-white/60">{formatFileSize(f.size)}</span>
                <button
                  onClick={() => removeFile(i)}
                  aria-label={`Retirer ${f.name}`}
                  className="flex-shrink-0 text-brand-gray hover:text-brand-orange dark:text-white/50"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>

          {selectionWarning && (
            <p className="mb-3 text-[12px] font-medium text-brand-orange">⚠ {selectionWarning}</p>
          )}

          {!missionId && (
            <p className="mb-3 text-[12px] font-medium text-brand-orange">
              ⚠ Choisis une mission avant de lancer l'analyse.
            </p>
          )}

          <div className="flex items-center gap-2.5">
            <Button
              variant="primary"
              size="sm"
              disabled={!missionId}
              onClick={() => analyzeMutation.mutate()}
            >
              Analyser
            </Button>
            <button
              onClick={() => inputRef.current?.click()}
              className="text-[13px] font-semibold text-brand-blue hover:underline dark:text-white/90"
            >
              Ajouter des fichiers
            </button>
            <button onClick={resetAll} className="text-[13px] font-semibold text-brand-gray hover:underline dark:text-white/60">
              Annuler
            </button>
          </div>
        </div>
      )}

      {phase === "analyzing" && (
        <div className="py-4 text-center">
          <Loader2 size={26} className="mx-auto mb-3 animate-spin text-brand-blue dark:text-white" strokeWidth={1.75} />
          <p className="mb-3 text-[13px] font-semibold text-brand-blue-dark dark:text-white">
            Analyse en cours — {job?.progress ?? 0} %
          </p>
          <div className="mx-auto h-2 w-full max-w-xs overflow-hidden rounded-full bg-brand-off-white dark:bg-white/10">
            <div
              className="h-full rounded-full bg-brand-blue transition-all duration-300 dark:bg-white"
              style={{ width: `${job?.progress ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {phase === "success" && (
        <div className="py-4 text-center">
          {(job?.failedCount ?? 0) > 0 ? (
            <>
              <AlertTriangle size={28} className="mx-auto mb-3 text-brand-orange" strokeWidth={1.75} />
              <p className="mb-1 text-[14px] font-semibold text-brand-blue-dark dark:text-white">Analyse terminée avec erreurs</p>
              <p className="mb-4 text-[13px] text-brand-gray dark:text-white/60">
                {job?.failedCount} image{(job?.failedCount ?? 0) > 1 ? "s n'ont" : " n'a"} pas pu être vérifiée
                {(job?.failedCount ?? 0) > 1 ? "s" : ""} malgré plusieurs tentatives.
              </p>
            </>
          ) : (
            <>
              <CheckCircle2 size={28} className="mx-auto mb-3 text-status-success" strokeWidth={1.75} />
              <p className="mb-1 text-[14px] font-semibold text-brand-blue-dark dark:text-white">Analyse terminée</p>
              <p className="mb-4 text-[13px] text-brand-gray dark:text-white/60">Votre rapport d'analyse est prêt.</p>
            </>
          )}
          <div className="flex items-center justify-center gap-2.5">
            <Link to="/rapports">
              <Button variant="primary" size="sm">
                Voir dans Rapports
                <ArrowRight size={14} />
              </Button>
            </Link>
            <button onClick={resetAll} className="text-[13px] font-semibold text-brand-gray hover:underline dark:text-white/60">
              Nouvelle analyse
            </button>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="py-4 text-center">
          <XCircle size={28} className="mx-auto mb-3 text-brand-orange" strokeWidth={1.75} />
          <p className="mb-1 text-[14px] font-semibold text-brand-blue-dark dark:text-white">Échec de l'analyse</p>
          <p className="mb-4 text-[13px] text-brand-gray dark:text-white/60">
            {job?.errorMessage ?? "Une erreur est survenue pendant l'analyse."}
          </p>
          <div className="flex items-center justify-center gap-2.5">
            <Button variant="primary" size="sm" onClick={() => analyzeMutation.mutate()}>
              Réessayer
            </Button>
            <button onClick={resetAll} className="text-[13px] font-semibold text-brand-gray hover:underline dark:text-white/60">
              Choisir d'autres fichiers
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
