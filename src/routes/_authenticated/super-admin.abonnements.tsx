import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/super-admin/abonnements")({
  component: SuperAdminSubscriptions,
});

const PLANS = ["essai", "standard", "premium", "entreprise"] as const;

function SuperAdminSubscriptions() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, siret, is_active, subscription_plan, created_at")
        .order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) =>
      c.name.toLowerCase().includes(q) || (c.siret ?? "").includes(q)
    );
  }, [data, search]);

  const setPlan = useMutation({
    mutationFn: async ({ id, plan }: { id: string; plan: string }) => {
      const { error } = await (supabase.rpc as any)("super_admin_set_subscription_plan", {
        _company_id: id, _plan: plan,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Abonnement mis à jour");
      qc.invalidateQueries({ queryKey: ["super-admin-companies"] });
      qc.invalidateQueries({ queryKey: ["super-admin-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="rounded-xl ring-1 ring-border bg-surface/60 overflow-hidden">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <CreditCard className="size-4 text-brand" />
        <h2 className="text-sm font-semibold">Gestion des abonnements</h2>
        <div className="ml-auto flex items-center gap-2">
          <Search className="size-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-8 max-w-xs" placeholder="Rechercher…" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-surface/40">
            <tr>
              <th className="text-left px-3 py-2">Entreprise</th>
              <th className="text-left px-3 py-2">SIRET</th>
              <th className="text-left px-3 py-2">État</th>
              <th className="text-left px-3 py-2">Abonnement</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-border/60">
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{c.siret ?? "—"}</td>
                <td className="px-3 py-2">
                  {c.is_active
                    ? <span className="text-xs text-emerald-300">Active</span>
                    : <span className="text-xs text-amber-300">Suspendue</span>}
                </td>
                <td className="px-3 py-2 w-[220px]">
                  <Select
                    value={c.subscription_plan}
                    onValueChange={(v) => setPlan.mutate({ id: c.id, plan: v })}
                    disabled={setPlan.isPending}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLANS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                Aucune entreprise.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
