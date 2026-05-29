import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Tableau de bord — Lb Cloud" }],
  }),
  component: DashboardPage,
});

const kpis = [
  { label: "CA du jour", value: "2 485,50 €", delta: "+12.4%", positive: true, bar: 75 },
  { label: "Tickets", value: "142", delta: "+8", positive: true, bar: 50 },
  { label: "Panier Moyen", value: "17,50 €", delta: "0.0%", positive: false, bar: 66 },
  { label: "Articles Vendus", value: "412", delta: "+24", positive: true, bar: 80 },
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
];

export default function DashboardPage() {
  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* KPI grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <article
            key={kpi.label}
            className="bg-surface/60 ring-1 ring-border p-5 rounded-xl flex flex-col gap-1"
          >
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              {kpi.label}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-foreground tabular-nums">{kpi.value}</span>
              <span className={kpi.positive ? "text-xs font-medium text-primary" : "text-xs font-medium text-muted-foreground"}>
                {kpi.delta}
              </span>
            </div>
            <div className="mt-4 h-1 w-full bg-surface-elevated rounded-full overflow-hidden">
              <div
                className={kpi.positive ? "h-full bg-primary" : "h-full bg-muted"}
                style={{ width: `${kpi.bar}%` }}
              />
            </div>
          </article>
        ))}
      </section>

      {/* Chart + Tills */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-surface/60 ring-1 ring-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-base font-semibold text-foreground">Évolution du CA</h2>
              <p className="text-xs text-muted-foreground">Performance sur les 7 derniers jours</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-xs font-medium bg-surface-elevated text-foreground rounded-md ring-1 ring-border">
                Semaine
              </button>
              <button className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                Mois
              </button>
            </div>
          </div>
          <ChartPlaceholder />
        </div>

        <div className="lg:col-span-4 bg-surface/60 ring-1 ring-border rounded-xl p-6">
          <h2 className="text-base font-semibold text-foreground mb-6">État des caisses</h2>
          <div className="space-y-3">
            {tills.map((till) => (
              <div
                key={till.name}
                className={
                  till.open
                    ? "flex items-center gap-4 p-3 bg-background/40 ring-1 ring-border rounded-lg"
                    : "flex items-center gap-4 p-3 ring-1 ring-border rounded-lg opacity-50"
                }
              >
                <div className={till.open ? "size-1.5 rounded-full bg-primary" : "size-1.5 rounded-full bg-muted-foreground"} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{till.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{till.operator}</p>
                </div>
                <span className="text-sm font-medium text-foreground tabular-nums">{till.amount}</span>
              </div>
            ))}
          </div>
          <Link
            to="/caisse"
            className="block w-full mt-6 py-2 text-xs font-semibold text-foreground ring-1 ring-border rounded-md hover:bg-surface-elevated transition-colors text-center"
          >
            Gérer les sessions
          </Link>
        </div>
      </section>

      {/* Recent sales */}
      <section className="bg-surface/60 ring-1 ring-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h2 className="text-base font-semibold text-foreground">Dernières ventes</h2>
          <Link to="/ventes" className="text-xs font-medium text-primary hover:underline underline-offset-4 inline-flex items-center gap-1">
            Tout voir <ArrowUpRight className="size-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-background/40">
              <tr>
                <Th>ID Ticket</Th>
                <Th>Heure</Th>
                <Th>Articles</Th>
                <Th>Mode</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-surface-elevated/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-foreground tabular-nums">{s.id}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground tabular-nums">{s.time}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{s.items}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 text-[10px] bg-surface-elevated text-muted-foreground rounded-full ring-1 ring-border">
                      {s.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-foreground tabular-nums">
                    {s.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="flex items-center justify-between py-6 border-t border-border">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
          © 2026 Lb Cloud — Conformité NF525 & RGPD
        </p>
        <div className="flex gap-6">
          <a href="#" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            Assistance
          </a>
          <a href="#" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            Documentation
          </a>
        </div>
      </footer>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-6 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest ${className}`}>
      {children}
    </th>
  );
}

function ChartPlaceholder() {
  // Lightweight SVG sparkline-style chart to avoid heavy dep, real recharts plug-in later.
  const points = [40, 55, 48, 70, 62, 85, 78];
  const max = Math.max(...points);
  const w = 800;
  const h = 220;
  const stepX = w / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${h - (p / max) * h * 0.85}`)
    .join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;

  return (
    <div className="w-full aspect-[21/9] bg-background/40 ring-1 ring-border rounded-lg p-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ca-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.72 0.17 162)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="oklch(0.72 0.17 162)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#ca-grad)" />
        <path d={path} fill="none" stroke="oklch(0.82 0.16 162)" strokeWidth="2" />
      </svg>
    </div>
  );
}
