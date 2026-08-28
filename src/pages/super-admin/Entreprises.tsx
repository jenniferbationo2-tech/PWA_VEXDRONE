import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Search } from "lucide-react";
import { api } from "@/lib/api/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewEntrepriseModal } from "@/components/super-admin/entreprises/NewEntrepriseModal";
import { EntrepriseDetailModal } from "@/components/super-admin/entreprises/EntrepriseDetailModal";

export function SuperAdminEntreprises() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  // Un id, pas l'objet entier : la modale doit refléter les données à jour
  // après une mutation (bloquer/renommer...), pas un instantané pris au clic.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: entreprises, isLoading, isError } = useQuery({
    queryKey: ["entreprises"],
    queryFn: api.getEntreprises,
  });
  const { data: users } = useQuery({ queryKey: ["platform-users"], queryFn: api.getPlatformUsers });

  function accountCount(entrepriseId: string) {
    return users?.filter((u) => u.entrepriseId === entrepriseId).length ?? 0;
  }

  const createMutation = useMutation({
    mutationFn: api.createEntreprise,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["entreprises"] }),
  });

  const filtered = useMemo(() => {
    if (!entreprises) return [];
    const q = search.trim().toLowerCase();
    return q ? entreprises.filter((e) => e.nom.toLowerCase().includes(q)) : entreprises;
  }, [entreprises, search]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1>Entreprises</h1>
        <Button size="sm" className="gap-2" onClick={() => setModalOpen(true)}>
          <Plus size={16} strokeWidth={1.75} />
          Nouvelle entreprise
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une entreprise…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-brand-gray shadow-card dark:border-white/10 dark:bg-brand-blue-dark">
          Chargement…
        </div>
      ) : isError ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-center shadow-card dark:border-white/10 dark:bg-brand-blue-dark">
          <p className="font-semibold text-brand-blue-dark dark:text-white">Impossible de charger les entreprises</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-brand-blue/[0.06] bg-white text-center shadow-card dark:border-white/10 dark:bg-brand-blue-dark">
          <Building2 size={28} strokeWidth={1.5} className="mb-3 text-brand-gray dark:text-white/40" />
          <p className="text-[13px] text-brand-gray dark:text-white/60">
            {search ? "Aucune entreprise ne correspond à ta recherche." : "Aucune entreprise pour l'instant."}
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
                    <th className="px-5 py-3 font-medium">Statut</th>
                    <th className="px-5 py-3 font-medium">Comptes</th>
                    <th className="px-5 py-3 font-medium">Créée le</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr
                      key={e.id}
                      onClick={() => setSelectedId(e.id)}
                      className="cursor-pointer border-b border-brand-blue/[0.04] last:border-0 hover:bg-brand-off-white/60 dark:border-white/5 dark:hover:bg-white/5"
                    >
                      <td className="px-5 py-3.5 font-semibold text-brand-blue-dark dark:text-white">{e.nom}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant={e.status === "bloquee" ? "pending" : "success"}>
                          {e.status === "bloquee" ? "Bloquée" : "Active"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-brand-gray dark:text-white/60">{accountCount(e.id)}</td>
                      <td className="px-5 py-3.5 text-brand-gray dark:text-white/60">
                        {new Date(e.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vue cartes — mobile */}
          <div className="space-y-3 md:hidden">
            {filtered.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className="w-full rounded-lg border border-brand-blue/[0.06] bg-white p-4 text-left shadow-card dark:border-white/10 dark:bg-brand-blue-dark"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-semibold text-brand-blue-dark dark:text-white">{e.nom}</p>
                  <Badge variant={e.status === "bloquee" ? "pending" : "success"}>
                    {e.status === "bloquee" ? "Bloquée" : "Active"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[13px] text-brand-gray dark:text-white/60">
                  <span>{accountCount(e.id)} compte(s)</span>
                  <span>{new Date(e.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <NewEntrepriseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={async (nom) => {
          await createMutation.mutateAsync(nom);
        }}
      />
      <EntrepriseDetailModal
        open={!!selectedId}
        entreprise={entreprises?.find((e) => e.id === selectedId) ?? null}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
