import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Pause, Play, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/super-admin/entreprises")({
  component: SuperAdminCompanies,
});

type Company = {
  id: string;
  name: string;
  legal_name: string | null;
  siret: string | null;
  city: string | null;
  is_active: boolean;
  subscription_plan: string;
  created_at: string;
};

function SuperAdminCompanies() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<Company | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, legal_name, siret, city, is_active, subscription_plan, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Company[];
    },
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) =>
      c.name.toLowerCase().includes(q)
      || (c.legal_name ?? "").toLowerCase().includes(q)
      || (c.siret ?? "").includes(q)
      || (c.city ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  const toggle = useMutation({
    mutationFn: async ({ company, active }: { company: Company; active: boolean }) => {
      const { error } = await (supabase.rpc as any)("super_admin_set_company_active", {
        _company_id: company.id, _active: active, _reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.active ? "Entreprise activée" : "Entreprise suspendue");
      setTarget(null); setReason("");
      qc.invalidateQueries({ queryKey: ["super-admin-companies"] });
      qc.invalidateQueries({ queryKey: ["super-admin-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="rounded-xl ring-1 ring-border bg-surface/60 overflow-hidden">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <Search className="size-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher (nom, SIRET, ville)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-sm"
        />
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} entreprise(s)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-surface/40">
            <tr>
              <th className="text-left px-3 py-2">Entreprise</th>
              <th className="text-left px-3 py-2">SIRET</th>
              <th className="text-left px-3 py-2">Ville</th>
              <th className="text-left px-3 py-2">Abonnement</th>
              <th className="text-left px-3 py-2">Créée</th>
              <th className="text-center px-3 py-2">État</th>
              <th className="text-right px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-border/60">
                <td className="px-3 py-2">
                  <div className="font-medium flex items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground" /> {c.name}
                  </div>
                  {c.legal_name && c.legal_name !== c.name && (
                    <div className="text-xs text-muted-foreground">{c.legal_name}</div>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{c.siret ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.city ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs ring-1 ring-border bg-surface">
                    {c.subscription_plan}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground text-xs">
                  {new Date(c.created_at).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-3 py-2 text-center">
                  {c.is_active ? (
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs ring-1 ring-emerald-500/30 bg-emerald-500/10 text-emerald-300">Active</span>
                  ) : (
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs ring-1 ring-amber-500/30 bg-amber-500/10 text-amber-300">Suspendue</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant={c.is_active ? "destructive" : "default"}
                    onClick={() => setTarget(c)}>
                    {c.is_active ? (<><Pause className="size-3.5" /> Suspendre</>) : (<><Play className="size-3.5" /> Activer</>)}
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                Aucune entreprise.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!target} onOpenChange={(o) => { if (!o) { setTarget(null); setReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {target?.is_active ? "Suspendre l'entreprise" : "Activer l'entreprise"}
            </DialogTitle>
            <DialogDescription>
              {target?.name} — cette action sera enregistrée dans les logs d'audit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motif {target?.is_active ? "(recommandé)" : "(optionnel)"}</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder={target?.is_active ? "Ex : non-paiement, fraude…" : "Ex : régularisation…"} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>Annuler</Button>
            <Button
              variant={target?.is_active ? "destructive" : "default"}
              disabled={toggle.isPending}
              onClick={() => target && toggle.mutate({ company: target, active: !target.is_active })}
            >
              {toggle.isPending ? "…" : (target?.is_active ? "Suspendre" : "Activer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
