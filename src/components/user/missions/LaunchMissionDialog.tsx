import { useEffect, useState } from "react";
import { Loader2, UploadCloud, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Mission } from "@/lib/api/types";
import type { CaptureMode } from "@/lib/captureMode";

interface Props {
  mission: Mission | null;
  onCancel: () => void;
  onLaunch: (mission: Mission, mode: CaptureMode) => void;
  isLaunching: boolean;
}

// Le streaming en direct n'existe que pour les missions téléphone
// (PhoneCaptureContext, caméra du navigateur) — un drone n'a aujourd'hui
// aucun flux vidéo câblé (voir Vols.tsx, "Vidéo drone à venir"). L'option
// reste visible pour les deux appareils mais désactivée pour drone, plutôt
// que de la faire disparaître, pour ne pas donner l'impression qu'il n'y a
// jamais eu de choix à faire.
export function LaunchMissionDialog({ mission, onCancel, onLaunch, isLaunching }: Props) {
  const [mode, setMode] = useState<CaptureMode>("streaming");
  const streamingAvailable = mission?.appareil === "appareil_photo";

  useEffect(() => {
    if (mission) setMode(streamingAvailable ? "streaming" : "differe");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission]);

  if (!mission) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl dark:bg-brand-blue-dark">
        <h3 className="mb-1 font-display text-[16px] font-bold text-brand-blue-dark dark:text-white">
          Lancer "{mission.name}"
        </h3>
        <p className="mb-5 text-[13px] text-brand-gray dark:text-white/60">
          Comment les photos de cette mission seront-elles collectées ?
        </p>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!streamingAvailable}
            onClick={() => setMode("streaming")}
            className={cn(
              "flex flex-col items-center gap-2 rounded-md border p-4 text-center transition-colors",
              !streamingAvailable && "cursor-not-allowed opacity-50",
              mode === "streaming" && streamingAvailable
                ? "border-brand-blue bg-brand-blue/5 dark:border-white dark:bg-white/10"
                : "border-brand-gray/20 hover:bg-brand-off-white dark:border-white/15 dark:hover:bg-white/5"
            )}
          >
            <Video size={22} className="text-brand-blue dark:text-white" strokeWidth={1.5} />
            <span className="text-[13px] font-semibold text-brand-blue-dark dark:text-white">
              Streaming en direct
            </span>
            <span className="text-[11px] text-brand-gray dark:text-white/50">
              {streamingAvailable ? "Capture et analyse en continu" : "Bientôt disponible pour drone"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode("differe")}
            className={cn(
              "flex flex-col items-center gap-2 rounded-md border p-4 text-center transition-colors",
              mode === "differe"
                ? "border-brand-blue bg-brand-blue/5 dark:border-white dark:bg-white/10"
                : "border-brand-gray/20 hover:bg-brand-off-white dark:border-white/15 dark:hover:bg-white/5"
            )}
          >
            <UploadCloud size={22} className="text-brand-blue dark:text-white" strokeWidth={1.5} />
            <span className="text-[13px] font-semibold text-brand-blue-dark dark:text-white">
              Upload de fichier
            </span>
            <span className="text-[11px] text-brand-gray dark:text-white/50">
              Importer les photos après coup
            </span>
          </button>
        </div>

        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={isLaunching}>
            Annuler
          </Button>
          <Button type="button" size="sm" onClick={() => onLaunch(mission, mode)} disabled={isLaunching}>
            {isLaunching && <Loader2 size={14} className="animate-spin" />}
            Lancer
          </Button>
        </div>
      </div>
    </div>
  );
}
