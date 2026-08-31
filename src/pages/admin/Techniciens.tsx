import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/api/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewTeamMemberModal } from "@/components/admin/techniciens/NewTeamMemberModal";
import { TeamMemberDetailModal } from "@/components/admin/techniciens/TeamMemberDetailModal";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

export function AdminTechniciens() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: members, isLoading, isError } = useQuery({
    queryKey: ["team-members"],
    queryFn: api.getTeamMembers,
  });

  const createMutation = useMutation({
    mutationFn: api.createTeamMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team-members"] }),
  });

  const filtered = useMemo(() => {
    if (!members) return [];
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.username.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [members, search]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1>Techniciens</h1>
        <Button size="sm" className="gap-2" onClick={() => setModalOpen(true)}>
          <UserPlus size={16} strokeWidth={1.75} />
          Inviter un technicien
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un technicien…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <TableSkeleton columns={4} />
      ) : isError ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-center shadow-card dark:border-white/10 dark:bg-brand-blue-dark">
          <p className="font-semibold text-brand-blue-dark dark:text-white">Impossible de charger les techniciens</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-center shadow-card dark:border-white/10 dark:bg-brand-blue-dark">
          <Users size={28} strokeWidth={1.5} className="mb-3 text-brand-gray dark:text-white/40" />
          <p className="text-[13px] text-brand-gray dark:text-white/60">
            {search ? "Aucun technicien ne correspond à ta recherche." : "Aucun technicien pour l'instant."}
          </p>
        </div>
      ) : (
        <>
          {/* Vue tableau — desktop */}
          <div className="hidden overflow-hidden rounded-lg border border-brand-blue/[0.06] bg-white shadow-card dark:border-white/10 dark:bg-brand-blue-dark md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[14px]">
                <thead>
                  <tr className="border-b border-brand-blue/[0.06] text-[12px] uppercase tracking-wide text-brand-gray dark:border-white/10">
                    <th className="px-5 py-3 font-medium">Nom</th>
                    <th className="px-5 py-3 font-medium">Nom d'utilisateur</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedId(m.id)}
                      className="cursor-pointer border-b border-brand-blue/[0.04] last:border-0 hover:bg-brand-off-white/60 dark:border-white/5 dark:hover:bg-white/5"
                    >
                      <td className="px-5 py-3.5 font-semibold text-brand-blue-dark dark:text-white">{m.name}</td>
                      <td className="px-5 py-3.5 text-brand-gray dark:text-white/60">@{m.username}</td>
                      <td className="px-5 py-3.5 text-brand-gray dark:text-white/60">{m.email}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={m.isDeleted ? "pending" : "success"}>{m.isDeleted ? "Désactivé" : "Actif"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vue cartes — mobile */}
          <div className="space-y-3 md:hidden">
            {filtered.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className="w-full rounded-lg border border-brand-blue/[0.06] bg-white p-4 text-left shadow-card dark:border-white/10 dark:bg-brand-blue-dark"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-semibold text-brand-blue-dark dark:text-white">{m.name}</p>
                  <Badge variant={m.isDeleted ? "pending" : "success"}>{m.isDeleted ? "Désactivé" : "Actif"}</Badge>
                </div>
                <div className="flex items-center justify-between text-[13px] text-brand-gray dark:text-white/60">
                  <span>@{m.username}</span>
                  <span className="truncate">{m.email}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <NewTeamMemberModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={async (input) => {
          await createMutation.mutateAsync(input);
        }}
      />
      <TeamMemberDetailModal open={!!selectedId} memberId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
