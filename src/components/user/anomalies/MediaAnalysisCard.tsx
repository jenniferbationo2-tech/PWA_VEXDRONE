import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud,
  FileImage,
  FileVideo,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { validateMediaSelection } from "@/lib/mediaValidation";
import { useNotifications } from "@/lib/notifications/NotificationContext";
import { formatFileSize } from "@/lib/utils";

export function MediaAnalysisCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [selectionWarning, setSelectionWarning] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  // Présélectionnée quand on arrive depuis "Importer maintenant" sur Vols.tsx
  // (mission en mode upload) — évite d'avoir à la retrouver dans la liste.
  const location = useLocation();
  const [missionId, setMissionId] = useState(() => (location.state as { missionId?: string } | null)?.missionId ?? "");

  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();

  // /images/ et /videos/ exigent tous les deux mission_uuid — import manuel,
  // donc pas de mission "active" implicite comme pour la capture live
  // (PhoneCaptureContext.tsx) : le technicien choisit explicitement.
  const { data: missions } = useQuery({ queryKey: ["missions"], queryFn: api.getMissions });

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
      addNotification({
        title: "Analyse terminée",
        message: "Votre rapport d'analyse est prêt.",
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
        <div className="mb-3">
          <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark">Mission</label>
          <select
            value={missionId}
            onChange={(e) => setMissionId(e.target.value)}
            className="h-10 w-full rounded-sm border border-brand-gray/25 bg-white px-3 text-[14px] text-brand-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
          >
            <option value="">Sélectionner une mission</option>
            {(missions ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.zone}
              </option>
            ))}
          </select>
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
          className="flex w-full flex-col items-center justify-center gap-2.5 rounded-md border border-dashed border-brand-blue/20 py-10 text-center transition-colors hover:border-brand-blue/40 hover:bg-brand-off-white"
        >
          <UploadCloud size={26} className="text-brand-blue/50" strokeWidth={1.5} />
          <span className="text-[13px] font-medium text-brand-blue-dark">
            Importer des médias à analyser
          </span>
          <span className="text-[12px] text-brand-gray">Plusieurs images, ou une vidéo</span>
        </button>
      )}

      {phase === "ready" && (
        <div>
          <p className="mb-3 text-[13px] font-semibold text-brand-blue-dark">Médias prêts pour l'analyse</p>

          <ul className="mb-3 max-h-40 space-y-1.5 overflow-y-auto">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center gap-2.5 rounded-sm bg-brand-off-white px-3 py-2 text-[13px]"
              >
                {f.type.startsWith("video/") ? (
                  <FileVideo size={15} className="flex-shrink-0 text-brand-blue/60" />
                ) : (
                  <FileImage size={15} className="flex-shrink-0 text-brand-blue/60" />
                )}
                <span className="flex-1 truncate text-brand-blue-dark">{f.name}</span>
                <span className="flex-shrink-0 text-[12px] text-brand-gray">{formatFileSize(f.size)}</span>
                <button
                  onClick={() => removeFile(i)}
                  aria-label={`Retirer ${f.name}`}
                  className="flex-shrink-0 text-brand-gray hover:text-brand-orange"
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
              className="text-[13px] font-semibold text-brand-blue hover:underline"
            >
              Ajouter des fichiers
            </button>
            <button onClick={resetAll} className="text-[13px] font-semibold text-brand-gray hover:underline">
              Annuler
            </button>
          </div>
        </div>
      )}

      {phase === "analyzing" && (
        <div className="py-4 text-center">
          <Loader2 size={26} className="mx-auto mb-3 animate-spin text-brand-blue" strokeWidth={1.75} />
          <p className="mb-3 text-[13px] font-semibold text-brand-blue-dark">
            Analyse en cours — {job?.progress ?? 0} %
          </p>
          <div className="mx-auto h-2 w-full max-w-xs overflow-hidden rounded-full bg-brand-off-white">
            <div
              className="h-full rounded-full bg-brand-blue transition-all duration-300"
              style={{ width: `${job?.progress ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {phase === "success" && (
        <div className="py-4 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-3 text-status-success" strokeWidth={1.75} />
          <p className="mb-1 text-[14px] font-semibold text-brand-blue-dark">Analyse terminée</p>
          <p className="mb-4 text-[13px] text-brand-gray">Votre rapport d'analyse est prêt.</p>
          <div className="flex items-center justify-center gap-2.5">
            <Link to="/rapports">
              <Button variant="primary" size="sm">
                Voir dans Rapports
                <ArrowRight size={14} />
              </Button>
            </Link>
            <button onClick={resetAll} className="text-[13px] font-semibold text-brand-gray hover:underline">
              Nouvelle analyse
            </button>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="py-4 text-center">
          <XCircle size={28} className="mx-auto mb-3 text-brand-orange" strokeWidth={1.75} />
          <p className="mb-1 text-[14px] font-semibold text-brand-blue-dark">Échec de l'analyse</p>
          <p className="mb-4 text-[13px] text-brand-gray">
            {job?.errorMessage ?? "Une erreur est survenue pendant l'analyse."}
          </p>
          <div className="flex items-center justify-center gap-2.5">
            <Button variant="primary" size="sm" onClick={() => analyzeMutation.mutate()}>
              Réessayer
            </Button>
            <button onClick={resetAll} className="text-[13px] font-semibold text-brand-gray hover:underline">
              Choisir d'autres fichiers
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
