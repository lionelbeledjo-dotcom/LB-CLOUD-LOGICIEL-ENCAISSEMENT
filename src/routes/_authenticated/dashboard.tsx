import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, TrendingUp, TrendingDown, ShoppingCart, CreditCard, Package, AlertTriangle, Clock, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Tableau de bord — Lb Cloud" }],
  }),
  component: DashboardPage,
});

const kpis = [
  { label: "CA du jour", value: "2 485,50 €", delta: "+12.4%", positive: true, bar: 75, icon: TrendingUp },
  { label: "Tickets", value: "142", delta: "+8", positive: true, bar: 50, icon: ShoppingCart },
  { label: "Panier Moyen", value: "17,50 €", delta: "+2.1%", positive: true, bar: 66, icon: CreditCard },
  { label: "Articles Vendus", value: "412", delta: "+24", positive: true, bar: 80, icon: Package },
];

const tills = [
  { name: "Caisse Principale", operator: "Ouverte par Sophie L.", amount: "1 240 €", open: true },
  { name: "Borne Extérieure", operator: "Ouverte par Marc A.", amount: "845 €", open: true },
  { name: "Caisse Secondaire", operator: "Fermée à 14:30", amount: "0 €", open: false },
];

const sales = [
  { id: "#24819", time: "16:42:01", items: "Baguette Tradition x3, Croissant…", method: "Carte Bancaire", total: "14,20 €" },
  { id: "#24818", time: "16:38:12", items: "Formule Midi, Coca-Cola", method: "Espèces", total: "9,50 €" },
  { id: "#24817", time: "16:35:55", items: "Pain au Chocolat x6, Café", method: "Carte Bancaire", total: "11,80 €" },
  { id: "#24816", time: "16:31:08", items: "Sandwich Jambon, Eau", method: "Ticket Resto", total: "8,90 €" },
  { id: "#24815", time: "16:27:44", items: "Tarte aux Pommes, Jus Orange", method: "Carte Bancaire", total: "9,10 €" },
  { id: "#24814", time: "16:22:19", items: "Pain de Campagne x2", method: "Espèces", total: "5,60 €" },
];

const alerts = [
  { type: "stock", message: "Pain au Chocolat : stock bas (5 unités)", time: "il y a 12 min" },
  { type: "stock", message: "Jus d'Orange Frais : stock bas (3 unités)", time: "il y a 45 min" },
  { type: "caisse", message: "Écart de caisse détecté : -1,70 € (session hier)", time: "il y a 2h" },
];

const topProducts = [
  { name: "Baguette Tradition", qty: 89, revenue: "106,80 €" },
  { name: "Pain au Chocolat", qty: 64, revenue: "83,20 €" },
  { name: "Croissant Beurre", qty: 52, revenue: "62,40 €" },
  { name: "Sandwich Jambon-Beurre", qty: 31, revenue: "139,50 €" },
  { name: "Café Expresso", qty: 78, revenue: "117,00 €" },
];

export default function DashboardPage() {
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble de votre activité aujourd'hui</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          <span>Mis à jour à {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>

      {/* KPI grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <article
            key={kpi.label}
            className="bg-surface/60 ring-1 ring-border p-5 rounded-xl flex flex-col gap-1 hover:ring-primary/30 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                {kpi.label}
              </span>
              <kpi.icon className="size-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-semibold text-foreground tabular-nums">{kpi.value}</span>
              <span className={`text-xs font-medium flex items-center gap-0.5 ${kpi.positive ? "text-emerald-600" : "text-red-500"}`}>
                {kpi.positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {kpi.delta}
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${kpi.bar}%` }}
              />
            </div>
          </article>
        ))}
      </section>

      {/* Chart + Tills + Alerts */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chart */}
        <div className="lg:col-span-5 bg-surface/60 ring-1 ring-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">Évolution du CA</h2>
              <p className="text-xs text-muted-foreground">7 derniers jours</p>
            </div>
            <div className="flex gap-1">
              <button className="px-2.5 py-1 text-[10px] font-medium bg-primary text-primary-foreground rounded-md">Semaine</button>
              <button className="px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground">Mois</button>
            </div>
          </div>
          <ChartPlaceholder />
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div><p className="text-lg font-semibold">15 420 €</p><p className="text-[10px] text-muted-foreground">CA semaine</p></div>
            <div><p className="text-lg font-semibold">847</p><p className="text-[10px] text-muted-foreground">Tickets</p></div>
            <div><p className="text-lg font-semibold">18,20 €</p><p className="text-[10px] text-muted-foreground">Panier moy.</p></div>
          </div>
        </div>

        {/* Tills */}
        <div className="lg:col-span-4 bg-surface/60 ring-1 ring-border rounded-xl p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">État des caisses</h2>
          <div className="space-y-3">
            {tills.map((till) => (
              <div
                key={till.name}
                className={`flex items-center gap-3 p-3 rounded-lg ring-1 ring-border ${till.open ? "bg-background/40" : "opacity-50"}`}
              >
                <div className={`size-2 rounded-full ${till.open ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{till.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{till.operator}</p>
                </div>
                <span className="text-sm font-semibold text-foreground tabular-nums">{till.amount}</span>
              </div>
            ))}
          </div>
          <Link to="/caisse" className="block w-full mt-4 py-2 text-xs font-semibold text-foreground ring-1 ring-border rounded-md hover:bg-surface-elevated transition-colors text-center">
            Gérer les sessions
          </Link>
        </div>

        {/* Alerts */}
        <div className="lg:col-span-3 bg-surface/60 ring-1 ring-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="size-4 text-amber-500" />
            <h2 className="text-base font-semibold text-foreground">Alertes</h2>
          </div>
          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <div key={i} className="p-3 rounded-lg bg-amber-500/5 ring-1 ring-amber-500/20">
                <p className="text-xs text-foreground font-medium">{alert.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{alert.time}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Products + Recent Sales */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Top Products */}
        <div className="lg:col-span-5 bg-surface/60 ring-1 ring-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Top produits du jour</h2>
            <Link to="/produits" className="text-xs text-primary hover:underline">Voir tout</Link>
          </div>
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="size-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold grid place-items-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.qty} vendus</p>
                </div>
                <span className="text-sm font-semibold text-foreground tabular-nums">{p.revenue}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent sales */}
        <div className="lg:col-span-7 bg-surface/60 ring-1 ring-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex justify-between items-center">
            <h2 className="text-base font-semibold text-foreground">Dernières ventes</h2>
            <Link to="/ventes" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
              Tout voir <ArrowUpRight className="size-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/30">
                <tr>
                  <Th>Ticket</Th>
                  <Th>Heure</Th>
                  <Th>Articles</Th>
                  <Th>Mode</Th>
                  <Th className="text-right">Total</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground tabular-nums">{s.id}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">{s.time}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{s.items}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-[10px] bg-surface-elevated text-muted-foreground rounded-full ring-1 ring-border">
                        {s.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground tabular-nums">{s.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex items-center justify-between py-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
          © 2026 Lb Cloud — Conformité NF525 & RGPD
        </p>
        <div className="flex gap-4">
          <a href="#" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Assistance</a>
          <a href="#" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Documentation</a>
        </div>
      </footer>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest ${className}`}>
      {children}
    </th>
  );
}

function ChartPlaceholder() {
  const points = [40, 55, 48, 70, 62, 85, 78];
  const max = Math.max(...points);
  const w = 600;
  const h = 180;
  const stepX = w / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${h - (p / max) * h * 0.85}`)
    .join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;

  return (
    <div className="w-full aspect-[3/1] bg-background/40 ring-1 ring-border rounded-lg p-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ca-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.72 0.17 162)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="oklch(0.72 0.17 162)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#ca-grad)" />
        <path d={path} fill="none" stroke="oklch(0.72 0.17 162)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={i * stepX} cy={h - (p / max) * h * 0.85} r="4" fill="oklch(0.72 0.17 162)" stroke="white" strokeWidth="2" />
        ))}
      </svg>
    </div>
  );
}
