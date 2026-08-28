import { UserPlus, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AdminTechniciens() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1>Techniciens</h1>
        <Button size="sm" className="gap-2" disabled>
          <UserPlus size={16} strokeWidth={1.75} />
          Inviter un technicien
        </Button>
      </div>

      <Card className="mt-6 flex h-48 flex-col items-center justify-center text-center">
        <Users size={28} strokeWidth={1.5} className="mb-3 text-brand-gray dark:text-white/40" />
        <p className="text-[13px] text-brand-gray dark:text-white/60">
          Écran à construire — la gestion des techniciens (invitation, liste, retrait) arrive dans une prochaine
          itération.
        </p>
      </Card>
    </div>
  );
}
