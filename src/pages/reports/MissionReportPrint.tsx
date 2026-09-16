import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Printer,
  MapPin,
  Calendar,
  User,
  Tags,
  AlertTriangle,
  ShieldCheck,
  Settings,
  Clock,
  Lightbulb,
  ImageOff,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/Auth/AuthContext";
import type { Anomaly, Mission, Severity } from "@/lib/api/types";
import { getEffectiveStatus, MISSION_STATUS_BADGE, formatMissionDateRange } from "@/lib/missionStatus";
import { getMissionStructure, setMissionStructure } from "@/lib/missionStructure";
import { buildRecommendationText, recommendedDelayDays, severityLabel } from "@/lib/reportRecommendation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const SEVERITY_BADGE_VARIANT: Record<Severity, "high" | "medium" | "low"> = {
  eleve: "high",
  moyen: "medium",
  faible: "low",
};

// Reprend les mêmes tokens que severity.high/medium/low (tailwind.config.ts,
// déjà utilisés par badge.tsx) pour la bordure/le texte des éléments hors
// Badge (cadre de détection sur la photo, icône d'évaluation).
const SEVERITY_BORDER: Record<Severity, string> = {
  eleve: "border-severity-high",
  moyen: "border-severity-medium",
  faible: "border-severity-low",
};
const SEVERITY_TEXT: Record<Severity, string> = {
  eleve: "text-severity-high",
  moyen: "text-severity-medium",
  faible: "text-severity-low",
};

// Numéro de rapport stable pour une mission donnée (pas un vrai identifiant
// serveur, juste un affichage présentable — voir BACKEND_REQUESTS.md §8 pour
// la vraie proposition si un jour ce numéro doit être garanti unique/officiel).
function reportNumber(missionId: string, year: number): string {
  let hash = 0;
  for (let i = 0; i < missionId.length; i++) hash = (hash * 31 + missionId.charCodeAt(i)) >>> 0;
  return `VXD-${year}-${String(hash % 100000).padStart(5, "0")}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR")} — ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

interface PageChromeProps {
  reportNo: string;
  generatedAt: Date;
  page: number;
  totalPages: number;
  children: React.ReactNode;
}

// Ossature commune (bandeau logo + pied de page numéroté) aux deux gabarits
// de page — reprend la charte du template `public/rapport/rapport de
// mission.png` : bandeau bleu marine, VEX en blanc / DRONE en orange.
function ReportPage({ reportNo, generatedAt, page, totalPages, children }: PageChromeProps) {
  return (
    <section className="report-page mx-auto mb-8 w-full max-w-[860px] overflow-hidden rounded-lg border border-brand-blue/10 bg-white shadow-card print:mb-0 print:rounded-none print:border-0 print:shadow-none">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-brand-blue px-8 py-6">
        <div className="flex items-center gap-3">
          <img src="/logo/vexdrone-badge.png" alt="" className="h-12 w-12 flex-shrink-0" />
          <div>
            <p className="font-display text-[22px] font-extrabold leading-none text-white">
              VEX<span className="text-brand-orange">DRONE</span>
            </p>
            <p className="mt-1 text-[11px] font-medium tracking-wide text-white/70">
              INSPECTION INTELLIGENTE D'INFRASTRUCTURES
            </p>
          </div>
        </div>
        <div className="border-l border-white/20 pl-4 text-right">
          <p className="text-[13px] font-bold text-white">Rapport N° {reportNo}</p>
          <p className="text-[11px] text-white/70">Généré le {formatDateTime(generatedAt.toISOString())}</p>
        </div>
      </header>

      <div className="p-8">{children}</div>

      <footer className="flex items-center justify-between border-t border-brand-blue/10 px-8 py-3 text-[11px] text-brand-gray">
        <span>{reportNo}</span>
        <span>
          Page {page} / {totalPages}
        </span>
      </footer>
    </section>
  );
}

function InfoStrip({ items }: { items: { icon: typeof MapPin; label: string; value: string }[] }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 divide-y divide-brand-blue/10 rounded-md border border-brand-blue/10 bg-brand-off-white px-5 py-1 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-2.5 py-3 sm:pl-4 sm:first:pl-0">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
            <Icon size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-gray">{label}</p>
            <p className="truncate text-[13px] font-bold text-brand-blue-dark" title={value}>
              {value || "—"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface CoverPageProps {
  mission: Mission;
  technicienName: string;
  anomalies: Anomaly[];
  structure: string;
  onStructureChange: (value: string) => void;
  reportNo: string;
  generatedAt: Date;
  totalPages: number;
}

function CoverPage({ mission, technicienName, anomalies, structure, onStructureChange, reportNo, generatedAt, totalPages }: CoverPageProps) {
  const effectiveStatus = getEffectiveStatus(mission);
  const bySeverity: Record<Severity, number> = { eleve: 0, moyen: 0, faible: 0 };
  for (const a of anomalies) bySeverity[a.severity]++;

  return (
    <ReportPage reportNo={reportNo} generatedAt={generatedAt} page={1} totalPages={totalPages}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-brand-orange">Rapport de mission</p>
          <h1 className="mt-1 font-display text-h2 text-brand-blue-dark">{mission.name}</h1>
        </div>
        <Badge variant={MISSION_STATUS_BADGE[effectiveStatus].variant}>{MISSION_STATUS_BADGE[effectiveStatus].label}</Badge>
      </div>

      <InfoStrip
        items={[
          { icon: User, label: "Technicien", value: technicienName },
          { icon: MapPin, label: "Zone", value: mission.zone },
          { icon: Calendar, label: "Période", value: formatMissionDateRange(mission.dateDebut, mission.dateFin) },
          { icon: Tags, label: "Anomalies détectées", value: String(anomalies.length) },
        ]}
      />

      <div className="mb-6 rounded-md border border-brand-blue/10 p-5">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-brand-gray">Description</p>
        <p className="text-[14px] leading-relaxed text-brand-blue-dark/90">{mission.description || "Aucune description fournie."}</p>
      </div>

      <div className="mb-6 rounded-md border border-brand-blue/10 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-brand-gray">Identifiant structure / tronçon</p>
          <span className="text-[11px] text-brand-gray print:hidden">Saisi ici, appliqué à toutes les pages du rapport</span>
        </div>
        <div className="print:hidden">
          <Input
            value={structure}
            onChange={(e) => onStructureChange(e.target.value)}
            placeholder="Ex. P-114 / Tronçon B"
          />
        </div>
        <p className="hidden text-[14px] font-bold text-brand-blue-dark print:block">{structure || "Non renseigné"}</p>
      </div>

      <div className="rounded-md border border-brand-blue/10 p-5">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-brand-gray">Répartition des anomalies</p>
        {anomalies.length === 0 ? (
          <p className="text-[13px] text-brand-gray">Aucune anomalie détectée sur cette mission.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(["eleve", "moyen", "faible"] as Severity[])
              .filter((s) => bySeverity[s] > 0)
              .map((s) => (
                <Badge key={s} variant={SEVERITY_BADGE_VARIANT[s]}>
                  {bySeverity[s]} · Gravité {severityLabel(s)}
                </Badge>
              ))}
          </div>
        )}
      </div>
    </ReportPage>
  );
}

interface AnomalyPageProps {
  anomaly: Anomaly;
  mission: Mission;
  structure: string;
  reportNo: string;
  generatedAt: Date;
  page: number;
  totalPages: number;
}

function AnomalyPage({ anomaly, mission, structure, reportNo, generatedAt, page, totalPages }: AnomalyPageProps) {
  const delay = recommendedDelayDays(anomaly.severity);
  const bbox = anomaly.bbox;

  return (
    <ReportPage reportNo={reportNo} generatedAt={generatedAt} page={page} totalPages={totalPages}>
      <InfoStrip
        items={[
          { icon: MapPin, label: "Mission", value: mission.name },
          { icon: Settings, label: "Structure", value: structure },
          { icon: Calendar, label: "Détecté le", value: formatDateTime(anomaly.detectedAt) },
          { icon: Tags, label: "Type d'anomalie", value: anomaly.type },
        ]}
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-5">
        <div className="overflow-hidden rounded-md bg-brand-blue-dark md:col-span-3">
          <div className="relative aspect-[4/3] w-full">
            {anomaly.imageUrl ? (
              <img src={anomaly.imageUrl} alt={anomaly.type} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/40">
                <ImageOff size={28} strokeWidth={1.5} />
                <p className="text-[12px]">Photo indisponible</p>
              </div>
            )}
            {bbox && anomaly.imageUrl && (
              <div
                className={`absolute rounded-sm border-2 ${SEVERITY_BORDER[anomaly.severity]}`}
                style={{
                  left: `${bbox.x * 100}%`,
                  top: `${bbox.y * 100}%`,
                  width: `${bbox.width * 100}%`,
                  height: `${bbox.height * 100}%`,
                }}
              >
                <span
                  className={`absolute -top-6 left-0 whitespace-nowrap rounded-sm border bg-white px-1.5 py-0.5 text-[10px] font-bold ${SEVERITY_BORDER[anomaly.severity]} ${SEVERITY_TEXT[anomaly.severity]}`}
                >
                  {anomaly.type.toUpperCase()} — {anomaly.confidence}%
                </span>
              </div>
            )}
          </div>
          <p className="px-3 py-2 text-[11px] text-white/70">Photo annotée — {anomaly.type}</p>
        </div>

        <div className="rounded-md border border-brand-blue/10 p-5 md:col-span-2">
          <div className="mb-4 flex items-center gap-2 text-brand-blue-dark">
            <AlertTriangle size={18} className={SEVERITY_TEXT[anomaly.severity]} />
            <p className="font-display text-[15px] font-bold">Évaluation</p>
          </div>
          <Badge variant={SEVERITY_BADGE_VARIANT[anomaly.severity]} className="mb-4">
            Gravité {severityLabel(anomaly.severity)}
          </Badge>

          <p className="font-display text-[32px] font-extrabold leading-none text-brand-blue-dark">
            {anomaly.confidence}%
          </p>
          <p className="mb-1.5 mt-1 text-[11px] font-semibold uppercase tracking-wide text-brand-gray">Confiance IA</p>
          <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-brand-blue/10">
            <div className="h-full rounded-full bg-brand-blue" style={{ width: `${anomaly.confidence}%` }} />
          </div>

          <dl className="space-y-3 text-[13px]">
            <div className="flex items-start gap-2.5">
              <ShieldCheck size={15} className="mt-0.5 flex-shrink-0 text-brand-gray" />
              <div>
                <dt className="text-brand-gray">Type d'anomalie</dt>
                <dd className="font-semibold text-brand-blue-dark">{anomaly.type}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Settings size={15} className="mt-0.5 flex-shrink-0 text-brand-gray" />
              <div>
                <dt className="text-brand-gray">Structure</dt>
                <dd className="font-semibold text-brand-blue-dark">{structure || "Non renseigné"}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin size={15} className="mt-0.5 flex-shrink-0 text-brand-gray" />
              <div>
                <dt className="text-brand-gray">Coordonnées GPS</dt>
                <dd className="font-semibold text-brand-blue-dark">
                  {anomaly.gps.lat.toFixed(4)}° N, {anomaly.gps.lng.toFixed(4)}° O
                </dd>
              </div>
            </div>
          </dl>

          <div className="mt-4 flex items-center gap-2.5 rounded-md bg-brand-off-white px-3 py-2.5">
            <Clock size={16} className="flex-shrink-0 text-brand-blue" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-gray">Délai d'action recommandé</p>
              <p className="text-[14px] font-bold text-brand-blue-dark">{delay} jours</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-md border border-brand-blue/10 p-5">
        <div className="mb-2 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-white">
            <Lightbulb size={15} strokeWidth={1.75} />
          </span>
          <p className="font-display text-[15px] font-bold text-brand-blue-dark">Recommandation</p>
        </div>
        <p className="text-[13px] leading-relaxed text-brand-blue-dark/90">{buildRecommendationText(anomaly)}</p>
      </div>
    </ReportPage>
  );
}

export function MissionReportPrint() {
  const { missionId } = useParams<{ missionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: missions, isLoading: missionsLoading } = useQuery({
    queryKey: ["missions"],
    queryFn: api.getMissions,
  });
  const { data: allAnomalies, isLoading: anomaliesLoading } = useQuery({
    queryKey: ["anomalies"],
    queryFn: api.getAnomalies,
  });

  const mission = missions?.find((m) => m.id === missionId);
  const anomalies = useMemo(
    () => (allAnomalies ?? []).filter((a) => a.missionId === missionId),
    [allAnomalies, missionId]
  );

  const [structure, setStructure] = useState("");
  useEffect(() => {
    if (missionId) setStructure(getMissionStructure(missionId));
  }, [missionId]);

  function handleStructureChange(value: string) {
    setStructure(value);
    if (missionId) setMissionStructure(missionId, value);
  }

  const generatedAt = useMemo(() => new Date(), []);
  const reportNo = missionId ? reportNumber(missionId, generatedAt.getFullYear()) : "";
  const totalPages = 1 + anomalies.length;

  if (missionsLoading || anomaliesLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-brand-blue" size={28} />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-center">
        <p className="font-semibold text-brand-blue-dark">Mission introuvable</p>
        <button onClick={() => navigate(-1)} className="text-[13px] font-semibold text-brand-blue hover:underline">
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-off-white py-8 print:bg-white print:py-0">
      <style>{`@media print { @page { size: A4; margin: 12mm; } .report-page { break-after: page; } .report-page:last-child { break-after: auto; } }`}</style>

      <div className="mx-auto mb-6 flex w-full max-w-[860px] items-center justify-between px-2 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-blue-dark hover:underline dark:text-white"
        >
          <ArrowLeft size={15} />
          Retour
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-sm bg-brand-blue px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-blue-light"
        >
          <Printer size={15} />
          Imprimer / Enregistrer en PDF
        </button>
      </div>

      <CoverPage
        mission={mission}
        technicienName={user?.name ?? user?.username ?? "—"}
        anomalies={anomalies}
        structure={structure}
        onStructureChange={handleStructureChange}
        reportNo={reportNo}
        generatedAt={generatedAt}
        totalPages={totalPages}
      />

      {anomalies.map((anomaly, i) => (
        <AnomalyPage
          key={anomaly.id}
          anomaly={anomaly}
          mission={mission}
          structure={structure}
          reportNo={reportNo}
          generatedAt={generatedAt}
          page={i + 2}
          totalPages={totalPages}
        />
      ))}
    </div>
  );
}
