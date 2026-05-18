import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Package, Receipt, Boxes, TrendingUp, Pause, Layers } from "lucide-react";

export const Route = createFileRoute("/_authenticated/super-admin/")({
  component: SuperAdminHome,
});

const eur = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);
const num = (n: number) => new Intl.NumberFormat("fr-FR").format(n || 0);

function SuperAdminHome() {
  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-stats"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("super_admin_global_stats");
      if (error) throw error;
      return data as Record<string, any>;
    },
    refetchInterval: 60000,
  });

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) return <p className="text-muted-foreground">Aucune donnée.</p>;

  const plans = (data.plans ?? {}) as Record<string, number>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Entreprises" value={num(data.companies_total)} icon={Building2} />
        <Kpi label="Actives" value={num(data.companies_active)} icon={Building2} tone="emerald" />
        <Kpi label="Suspendues" value={num(data.companies_suspended)} icon={Pause} tone="amber" />
        <Kpi label="Utilisateurs" value={num(data.users_total)} icon={Users} />
        <Kpi label="Produits" value={num(data.products_total)} icon={Package} />
        <Kpi label="Mouvements 30j" value={num(data.stock_movements_30d)} icon={Boxes} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Ventes totales" value={num(data.sales_total)} icon={Receipt} />
        <Kpi label="Ventes 30j" value={num(data.sales_30d)} icon={Receipt} tone="emerald" />
        <Kpi label="CA cumulé TTC" value={eur(Number(data.revenue_total))} icon={TrendingUp} />
        <Kpi label="CA 30j TTC" value={eur(Number(data.revenue_30d))} icon={TrendingUp} tone="emerald" />
      </div>

      <div className="rounded-xl ring-1 ring-border bg-surface/60 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Layers className="size-4 text-brand" /> Répartition par abonnement
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["essai", "standard", "premium", "entreprise"] as const).map((p) => (
            <div key={p} className="rounded-md ring-1 ring-border px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{p}</p>
              <p className="text-2xl font-semibold tabular-nums mt-1">{num(plans[p] ?? 0)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone?: "emerald" | "amber" }) {
  const accent = tone === "emerald" ? "text-emerald-400" : tone === "amber" ? "text-amber-400" : "text-foreground";
  return (
    <div className="rounded-xl ring-1 ring-border bg-surface/60 px-4 py-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className={`size-3.5 ${accent}`} />{label}
      </div>
      <div className={`text-xl font-semibold tabular-nums mt-1 ${accent}`}>{value}</div>
    </div>
  );
}
