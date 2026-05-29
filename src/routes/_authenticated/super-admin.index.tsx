import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, Users, Package, Receipt, Boxes, TrendingUp, Pause, Layers,
  CreditCard, AlertTriangle, Activity, Clock,
} from "lucide-react";

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
  const mrr = Number(data.revenue_30d || 0) / 1;
  const totalCompanies = Number(data.companies_total || 0);
  const activeCompanies = Number(data.companies_active || 0);
  const churnRate = totalCompanies > 0 ? (((totalCompanies - activeCompanies) / totalCompanies) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Vue d'ensemble</h2>
          <p className="text-xs text-muted-foreground">Métriques clés de la plateforme LB Cloud</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="size-3.5 text-emerald-400" />
          <span>Mise à jour auto chaque minute</span>
        </div>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl ring-1 ring-border bg-surface/60 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <CreditCard className="size-3.5 text-primary" /> MRR Estimé
          </div>
          <p className="text-2xl font-semibold tabular-nums text-foreground">{eur(mrr)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Revenu mensuel récurrent basé sur le CA 30j</p>
        </div>
        <div className="rounded-xl ring-1 ring-border bg-surface/60 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <AlertTriangle className="size-3.5 text-amber-400" /> Taux de churn
          </div>
          <p className="text-2xl font-semibold tabular-nums text-foreground">{churnRate}%</p>
          <p className="text-[10px] text-muted-foreground mt-1">Entreprises suspendues / total</p>
        </div>
        <div className="rounded-xl ring-1 ring-border bg-surface/60 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Clock className="size-3.5 text-primary" /> Panier moyen
          </div>
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {data.sales_total > 0 ? eur(Number(data.revenue_total) / Number(data.sales_total)) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">CA TTC / nombre de ventes</p>
        </div>
      </div>

      <div className="rounded-xl ring-1 ring-border bg-surface/60 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Layers className="size-4 text-primary" /> Répartition par abonnement
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["essai", "standard", "premium", "entreprise"] as const).map((p) => {
            const count = plans[p] ?? 0;
            const pct = totalCompanies > 0 ? ((count / totalCompanies) * 100).toFixed(0) : "0";
            return (
              <div key={p} className="rounded-md ring-1 ring-border px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{p}</p>
                <p className="text-2xl font-semibold tabular-nums mt-1">{num(count)}</p>
                <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{pct}% du total</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl ring-1 ring-border bg-surface/60 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Activity className="size-4 text-primary" /> Actions rapides
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction label="Nouvelle entreprise" desc="Créer un compte client" href="/super-admin/entreprises" />
          <QuickAction label="Gérer les plans" desc="Modifier les abonnements" href="/super-admin/abonnements" />
          <QuickAction label="Voir les logs" desc="Audit & traçabilité" href="/super-admin/logs" />
          <QuickAction label="Super admins" desc="Gérer les accès" href="/super-admin/admins" />
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

function QuickAction({ label, desc, href }: { label: string; desc: string; href: string }) {
  return (
    <a
      href={href}
      className="block rounded-lg ring-1 ring-border p-3 hover:ring-primary/40 hover:bg-surface/80 transition-all"
    >
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
    </a>
  );
}
