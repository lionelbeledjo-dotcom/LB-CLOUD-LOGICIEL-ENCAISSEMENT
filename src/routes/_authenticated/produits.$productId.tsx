import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Package, AlertTriangle, History, ArrowDownToLine, ArrowUpFromLine,
  ClipboardList, TrendingDown, RotateCcw, Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/produits/$productId")({
  head: () => ({ meta: [{ title: "Détail produit — Lb Cloud" }] }),
  component: ProductDetailsPage,
});

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);
const num = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(n || 0);
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";
const fmtDateOnly = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("fr-FR") : "—";

type Movement = {
  id: string;
  created_at: string;
  movement_type: "entree" | "sortie" | "inventaire" | "perte" | "ajustement" | "retour";
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  unit_cost: number;
  total_value: number;
  reason: string | null;
  reference: string | null;
  supplier_name: string | null;
  invoice_number: string | null;
  lot_number: string | null;
  expiry_date: string | null;
};

const TYPE_LABEL: Record<Movement["movement_type"], string> = {
  entree: "Entrée", sortie: "Sortie", inventaire: "Inventaire",
  perte: "Perte", ajustement: "Ajustement", retour: "Retour",
};
const TYPE_COLOR: Record<Movement["movement_type"], string> = {
  entree: "text-emerald-300 bg-emerald-500/10 ring-emerald-500/30",
  sortie: "text-amber-300 bg-amber-500/10 ring-amber-500/30",
  inventaire: "text-sky-300 bg-sky-500/10 ring-sky-500/30",
  perte: "text-red-300 bg-red-500/10 ring-red-500/30",
  ajustement: "text-violet-300 bg-violet-500/10 ring-violet-500/30",
  retour: "text-teal-300 bg-teal-500/10 ring-teal-500/30",
};
const TYPE_ICON = {
  entree: ArrowDownToLine, sortie: ArrowUpFromLine, inventaire: ClipboardList,
  perte: TrendingDown, ajustement: ClipboardList, retour: RotateCcw,
} as const;

function ProductDetailsPage() {
  const { productId } = Route.useParams();

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [lotFilter, setLotFilter] = useState("");
  const [expiryFilter, setExpiryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: movements, isLoading: loadingMovements } = useQuery({
    queryKey: ["product-movements", productId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("stock_movements")
        .select("id, created_at, movement_type, quantity, quantity_before, quantity_after, unit_cost, total_value, reason, reference, supplier_name, invoice_number, lot_number, expiry_date")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Movement[];
    },
  });

  const lots = useMemo(() => {
    const set = new Set<string>();
    (movements ?? []).forEach((m) => { if (m.lot_number) set.add(m.lot_number); });
    return Array.from(set).sort();
  }, [movements]);

  const filtered = useMemo(() => {
    const list = movements ?? [];
    const q = search.trim().toLowerCase();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return list.filter((m) => {
      if (typeFilter !== "all" && m.movement_type !== typeFilter) return false;
      if (lotFilter && (m.lot_number ?? "").toLowerCase() !== lotFilter.toLowerCase()) return false;
      if (expiryFilter !== "all") {
        const exp = m.expiry_date ? new Date(m.expiry_date) : null;
        if (expiryFilter === "with" && !exp) return false;
        if (expiryFilter === "without" && exp) return false;
        if (expiryFilter === "expired" && (!exp || exp >= today)) return false;
        if (expiryFilter === "soon") {
          if (!exp) return false;
          const days = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
          if (days < 0 || days > 30) return false;
        }
      }
      if (q) {
        const hay = [m.reference, m.reason, m.supplier_name, m.invoice_number, m.lot_number]
          .map((x) => (x ?? "").toLowerCase()).join(" ");
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [movements, typeFilter, lotFilter, expiryFilter, search]);

  const stats = useMemo(() => {
    const s = { entree: 0, sortie: 0, perte: 0, value: 0 };
    for (const m of filtered) {
      if (m.movement_type === "entree" || m.movement_type === "retour") s.entree += Number(m.quantity);
      else if (m.movement_type === "sortie") s.sortie += -Number(m.quantity);
      else if (m.movement_type === "perte") s.perte += -Number(m.quantity);
      s.value += Number(m.total_value);
    }
    return s;
  }, [filtered]);

  return (
    <div className="container mx-auto px-6 py-8">
      <Link to="/stocks" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Retour aux stocks
      </Link>

      {loadingProduct ? (
        <Skeleton className="h-20 w-full mt-4" />
      ) : !product ? (
        <div className="mt-6 rounded-xl ring-1 ring-border bg-surface/60 p-8 text-center">
          <Package className="mx-auto size-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Produit introuvable.</p>
        </div>
      ) : (
        <header className="mt-4 rounded-xl ring-1 ring-border bg-surface/60 p-5 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold">{(product as any).name}</h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              {(product as any).sku ?? "—"} · {(product as any).barcode ?? "—"}
            </p>
            {(product as any).category && (
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-2">
                {(product as any).category}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold tabular-nums">
              {num(Number((product as any).stock_quantity))} <span className="text-base text-muted-foreground">{(product as any).unit}</span>
            </div>
            {Number((product as any).stock_quantity) <= Number((product as any).stock_alert_threshold) && (
              <div className="inline-flex items-center gap-1.5 mt-2 text-xs text-amber-400">
                <AlertTriangle className="size-3.5" /> Stock bas (seuil {num(Number((product as any).stock_alert_threshold))})
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Prix d'achat {eur(Number((product as any).purchase_price))} · Vente {eur(Number((product as any).sale_price))}
            </p>
          </div>
        </header>
      )}

      <section className="mt-6 grid sm:grid-cols-4 gap-3">
        <Kpi label="Entrées (filtre)" value={`+${num(stats.entree)}`} color="text-emerald-300" />
        <Kpi label="Sorties (filtre)" value={`${num(stats.sortie)}`} color="text-amber-300" />
        <Kpi label="Pertes (filtre)" value={`${num(stats.perte)}`} color="text-red-300" />
        <Kpi label="Valeur cumulée" value={eur(stats.value)} color="text-foreground" />
      </section>

      <section className="mt-6 rounded-xl ring-1 ring-border bg-surface/60 p-4">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <History className="size-4" /> Historique des mouvements
        </h2>
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <Label>Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="entree">Entrées</SelectItem>
                <SelectItem value="sortie">Sorties</SelectItem>
                <SelectItem value="inventaire">Inventaires</SelectItem>
                <SelectItem value="perte">Pertes</SelectItem>
                <SelectItem value="ajustement">Ajustements</SelectItem>
                <SelectItem value="retour">Retours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>N° de lot</Label>
            <Select value={lotFilter || "all"} onValueChange={(v) => setLotFilter(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les lots</SelectItem>
                {lots.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>DLC</Label>
            <Select value={expiryFilter} onValueChange={setExpiryFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="with">Avec DLC</SelectItem>
                <SelectItem value="without">Sans DLC</SelectItem>
                <SelectItem value="soon">DLC ≤ 30 jours</SelectItem>
                <SelectItem value="expired">Expirée</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Recherche</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Réf, motif, fournisseur…" className="pl-8" />
            </div>
          </div>
        </div>

        {(typeFilter !== "all" || lotFilter || expiryFilter !== "all" || search) && (
          <div className="mt-3">
            <Button size="sm" variant="ghost" onClick={() => {
              setTypeFilter("all"); setLotFilter(""); setExpiryFilter("all"); setSearch("");
            }}>Réinitialiser les filtres</Button>
          </div>
        )}

        <div className="mt-4 overflow-x-auto rounded-lg ring-1 ring-border">
          <table className="w-full text-sm">
            <thead className="bg-surface/80 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-right px-3 py-2">Δ qté</th>
                <th className="text-right px-3 py-2">Avant → Après</th>
                <th className="text-left px-3 py-2">Lot</th>
                <th className="text-left px-3 py-2">DLC</th>
                <th className="text-left px-3 py-2">Fournisseur / Facture</th>
                <th className="text-left px-3 py-2">Référence / Motif</th>
                <th className="text-right px-3 py-2">Valeur</th>
              </tr>
            </thead>
            <tbody>
              {loadingMovements ? (
                <tr><td colSpan={9} className="p-6"><Skeleton className="h-8 w-full" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-sm text-muted-foreground">
                  Aucun mouvement avec ces filtres.
                </td></tr>
              ) : filtered.map((m) => {
                const Icon = TYPE_ICON[m.movement_type];
                const exp = m.expiry_date ? new Date(m.expiry_date) : null;
                const days = exp ? Math.ceil((exp.getTime() - Date.now()) / 86400000) : null;
                return (
                  <tr key={m.id} className="border-t border-border/40 hover:bg-surface/40">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{fmtDate(m.created_at)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ${TYPE_COLOR[m.movement_type]}`}>
                        <Icon className="size-3" /> {TYPE_LABEL[m.movement_type]}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums font-medium ${Number(m.quantity) >= 0 ? "text-emerald-300" : "text-amber-300"}`}>
                      {Number(m.quantity) > 0 ? "+" : ""}{num(Number(m.quantity))}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs text-muted-foreground">
                      {num(Number(m.quantity_before))} → <span className="text-foreground">{num(Number(m.quantity_after))}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{m.lot_number ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {exp ? (
                        <span className={days! < 0 ? "text-red-300" : days! <= 30 ? "text-amber-300" : ""}>
                          {fmtDateOnly(m.expiry_date)}
                          {days !== null && (
                            <span className="block text-[10px] opacity-80">
                              {days < 0 ? `Expirée (${-days}j)` : `J-${days}`}
                            </span>
                          )}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div>{m.supplier_name ?? "—"}</div>
                      <div className="text-muted-foreground font-mono">{m.invoice_number ?? ""}</div>
                    </td>
                    <td className="px-3 py-2 text-xs max-w-[260px]">
                      <div className="truncate">{m.reference ?? "—"}</div>
                      {m.reason && <div className="text-muted-foreground truncate">{m.reason}</div>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{eur(Number(m.total_value))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          {filtered.length} mouvement(s) affichés · 500 derniers chargés.
        </p>
      </section>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl ring-1 ring-border bg-surface/60 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
