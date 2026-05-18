import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Boxes, ArrowDownToLine, ArrowUpFromLine, ClipboardList, AlertTriangle,
  History, TrendingDown, TrendingUp, Search, Package, Plus, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/use-company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/stocks")({
  head: () => ({ meta: [{ title: "Stocks — Lb Cloud" }] }),
  component: StocksPage,
});

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);
const num = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(n || 0);

type Product = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  category: string | null;
  purchase_price: number;
  sale_price: number;
  vat_rate: number;
  stock_quantity: number;
  stock_alert_threshold: number;
};

type Movement = {
  id: string;
  product_id: string;
  product_name: string;
  movement_type: "entree" | "sortie" | "inventaire" | "perte" | "ajustement" | "retour";
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  unit_cost: number;
  total_value: number;
  reason: string | null;
  reference: string | null;
  created_at: string;
  user_id: string | null;
};

function StocksPage() {
  const { data: membership, isLoading } = useActiveCompany();
  const companyId = membership?.company_id;

  if (isLoading) {
    return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
  }
  if (!companyId) {
    return (
      <div className="p-6 text-muted-foreground">
        Aucune entreprise active. Sélectionnez une entreprise pour gérer les stocks.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <header className="mb-6 flex items-center gap-3">
        <Boxes className="size-7 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gestion du stock</h1>
          <p className="text-sm text-muted-foreground">
            Entrées, sorties, inventaires, alertes et valorisation
          </p>
        </div>
      </header>

      <KpisBar companyId={companyId} />

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="bg-surface ring-1 ring-border">
          <TabsTrigger value="overview"><Package className="size-4 mr-2" />Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="entree"><ArrowDownToLine className="size-4 mr-2" />Entrées</TabsTrigger>
          <TabsTrigger value="sortie"><ArrowUpFromLine className="size-4 mr-2" />Sorties</TabsTrigger>
          <TabsTrigger value="inventaire"><ClipboardList className="size-4 mr-2" />Inventaire</TabsTrigger>
          <TabsTrigger value="alertes"><AlertTriangle className="size-4 mr-2" />Alertes</TabsTrigger>
          <TabsTrigger value="mouvements"><History className="size-4 mr-2" />Mouvements</TabsTrigger>
          <TabsTrigger value="pertes"><TrendingDown className="size-4 mr-2" />Pertes</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><OverviewTab companyId={companyId} /></TabsContent>
        <TabsContent value="entree"><MultiEntryTab companyId={companyId} /></TabsContent>
        <TabsContent value="sortie"><MovementTab companyId={companyId} kind="sortie" /></TabsContent>
        <TabsContent value="inventaire"><InventoryTab companyId={companyId} /></TabsContent>
        <TabsContent value="alertes"><AlertsTab companyId={companyId} /></TabsContent>
        <TabsContent value="mouvements"><MovementsHistoryTab companyId={companyId} /></TabsContent>
        <TabsContent value="pertes"><LossReportTab companyId={companyId} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────── KPIs
function KpisBar({ companyId }: { companyId: string }) {
  const { data } = useQuery({
    queryKey: ["stock-kpis", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("stock_quantity, stock_alert_threshold, purchase_price, sale_price, is_active")
        .eq("company_id", companyId)
        .eq("is_active", true);
      if (error) throw error;
      let totalSku = 0, lowStock = 0, outOfStock = 0;
      let valuationCost = 0, valuationSale = 0, margin = 0;
      for (const p of data ?? []) {
        totalSku++;
        const q = Number(p.stock_quantity);
        if (q <= 0) outOfStock++;
        else if (q <= Number(p.stock_alert_threshold)) lowStock++;
        valuationCost += q * Number(p.purchase_price);
        valuationSale += q * Number(p.sale_price);
        margin += q * (Number(p.sale_price) - Number(p.purchase_price));
      }
      const marginPct = valuationSale > 0 ? (margin / valuationSale) * 100 : 0;
      return { totalSku, lowStock, outOfStock, valuationCost, valuationSale, margin, marginPct };
    },
    refetchInterval: 30000,
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Kpi label="Références" value={data ? String(data.totalSku) : "—"} icon={Package} />
      <Kpi label="Stock bas" value={data ? String(data.lowStock) : "—"} icon={AlertTriangle} tone="amber" />
      <Kpi label="Ruptures" value={data ? String(data.outOfStock) : "—"} icon={AlertTriangle} tone="red" />
      <Kpi label="Valo. coût" value={data ? eur(data.valuationCost) : "—"} />
      <Kpi label="Valo. vente" value={data ? eur(data.valuationSale) : "—"} />
      <Kpi
        label={data ? `Marge (${data.marginPct.toFixed(1)}%)` : "Marge"}
        value={data ? eur(data.margin) : "—"}
        icon={TrendingUp}
        tone="emerald"
      />
    </div>
  );
}

function Kpi({
  label, value, icon: Icon, tone,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "amber" | "red" | "emerald";
}) {
  const accent = tone === "red" ? "text-red-400"
    : tone === "amber" ? "text-amber-400"
    : tone === "emerald" ? "text-emerald-400"
    : "text-foreground";
  return (
    <div className="rounded-xl ring-1 ring-border bg-surface/60 px-4 py-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className={`size-3.5 ${accent}`} />}{label}
      </div>
      <div className={`text-xl font-semibold tabular-nums mt-1 ${accent}`}>{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────── Overview (table + marges)
function OverviewTab({ companyId }: { companyId: string }) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["products-overview", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((p) =>
      p.name.toLowerCase().includes(q)
      || (p.sku ?? "").toLowerCase().includes(q)
      || (p.category ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  if (isLoading) return <Skeleton className="h-96 w-full mt-4" />;

  return (
    <div className="mt-4 rounded-xl ring-1 ring-border bg-surface/60 overflow-hidden">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <Search className="size-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher (nom, SKU, catégorie)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-sm"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-surface/40">
            <tr>
              <th className="text-left px-3 py-2">Produit</th>
              <th className="text-left px-3 py-2">SKU</th>
              <th className="text-right px-3 py-2">Stock</th>
              <th className="text-right px-3 py-2">Seuil</th>
              <th className="text-right px-3 py-2">P. achat</th>
              <th className="text-right px-3 py-2">P. vente</th>
              <th className="text-right px-3 py-2">Marge €</th>
              <th className="text-right px-3 py-2">Marge %</th>
              <th className="text-right px-3 py-2">Valo. coût</th>
              <th className="text-center px-3 py-2">État</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const q = Number(p.stock_quantity);
              const margin = Number(p.sale_price) - Number(p.purchase_price);
              const marginPct = Number(p.sale_price) > 0
                ? (margin / Number(p.sale_price)) * 100 : 0;
              const status = q <= 0 ? "rupture"
                : q <= Number(p.stock_alert_threshold) ? "bas" : "ok";
              return (
                <tr key={p.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{p.sku ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{num(q)} {p.unit}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {num(Number(p.stock_alert_threshold))}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{eur(Number(p.purchase_price))}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{eur(Number(p.sale_price))}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${margin < 0 ? "text-red-400" : ""}`}>
                    {eur(margin)}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${
                    marginPct < 0 ? "text-red-400"
                    : marginPct < 10 ? "text-amber-400" : "text-emerald-400"
                  }`}>
                    {marginPct.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{eur(q * Number(p.purchase_price))}</td>
                  <td className="px-3 py-2 text-center">
                    <Badge status={status} />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                Aucun produit.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Badge({ status }: { status: "ok" | "bas" | "rupture" }) {
  const cls = status === "rupture" ? "text-red-300 bg-red-500/10 ring-red-500/30"
    : status === "bas" ? "text-amber-300 bg-amber-500/10 ring-amber-500/30"
    : "text-emerald-300 bg-emerald-500/10 ring-emerald-500/30";
  const label = status === "rupture" ? "Rupture" : status === "bas" ? "Bas" : "OK";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs ring-1 ${cls}`}>{label}</span>
  );
}

// ─────────────────────────────────────────── Entrée / Sortie
function MovementTab({
  companyId, kind,
}: { companyId: string; kind: "entree" | "sortie" }) {
  const qc = useQueryClient();
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [newSupplierOpen, setNewSupplierOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [search, setSearch] = useState("");

  const { data: products } = useQuery({
    queryKey: ["products", companyId, "active-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, unit, stock_quantity, purchase_price")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Pick<Product, "id" | "name" | "sku" | "unit" | "stock_quantity" | "purchase_price">[];
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("suppliers")
        .select("id, name")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: kind === "entree",
  });

  const createSupplier = useMutation({
    mutationFn: async () => {
      const name = newSupplierName.trim();
      if (!name) throw new Error("Nom requis");
      const { data, error } = await (supabase as any)
        .from("suppliers")
        .insert({ company_id: companyId, name })
        .select("id, name")
        .single();
      if (error) throw error;
      return data as { id: string; name: string };
    },
    onSuccess: (sup) => {
      toast.success("Fournisseur créé");
      qc.invalidateQueries({ queryKey: ["suppliers", companyId] });
      setSupplierId(sup.id);
      setNewSupplierName("");
      setNewSupplierOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const list = products ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((p) =>
      p.name.toLowerCase().includes(q)
      || (p.sku ?? "").toLowerCase().includes(q));
  }, [products, search]);

  const selected = products?.find((p) => p.id === productId);

  const lotDlcError = lotNumber.trim() && !expiryDate;
  const expiryInvalid = expiryDate ? isNaN(new Date(expiryDate).getTime()) : false;

  const mut = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error("Sélectionnez un produit");
      const qty = parseFloat(quantity);
      if (!qty || qty <= 0) throw new Error("Quantité invalide");
      if (lotNumber.trim() && !expiryDate) {
        throw new Error("La date d'expiration (DLC) est obligatoire lorsqu'un numéro de lot est renseigné.");
      }
      if (expiryDate && isNaN(new Date(expiryDate).getTime())) {
        throw new Error("La date d'expiration (DLC) n'est pas une date valide.");
      }
      const { error } = await (supabase.rpc as any)("record_stock_movement", {
        _product_id: productId,
        _movement_type: kind,
        _quantity: qty,
        _unit_cost: unitCost ? parseFloat(unitCost) : null,
        _reason: reason || null,
        _reference: reference || null,
        _target_quantity: null,
        _supplier_id: kind === "entree" && supplierId ? supplierId : null,
        _invoice_number: kind === "entree" && invoiceNumber ? invoiceNumber : null,
        _lot_number: lotNumber.trim() || null,
        _expiry_date: expiryDate || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(kind === "entree" ? "Entrée enregistrée" : "Sortie enregistrée");
      setQuantity(""); setUnitCost(""); setReason(""); setReference("");
      setInvoiceNumber(""); setSupplierId("");
      setLotNumber(""); setExpiryDate("");
      qc.invalidateQueries({ queryKey: ["products", companyId, "active-min"] });
      qc.invalidateQueries({ queryKey: ["stock-movements", companyId] });
      qc.invalidateQueries({ queryKey: ["stock-kpis", companyId] });
      qc.invalidateQueries({ queryKey: ["products-overview", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-4 grid lg:grid-cols-[1fr_420px] gap-4">
      <div className="rounded-xl ring-1 ring-border bg-surface/60 overflow-hidden">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <Search className="size-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit…" className="h-9" />
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => { setProductId(p.id); setUnitCost(String(p.purchase_price ?? "")); }}
              className={`w-full text-left px-4 py-2.5 border-b border-border/40 hover:bg-surface flex items-center justify-between gap-3 ${
                productId === p.id ? "bg-surface ring-1 ring-primary/40" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-[11px] text-muted-foreground font-mono">{p.sku ?? "—"}</p>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {num(Number(p.stock_quantity))} {p.unit}
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Aucun produit.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl ring-1 ring-border bg-surface/60 p-4 space-y-3">
        <div className="flex items-center gap-2">
          {kind === "entree" ? (
            <ArrowDownToLine className="size-5 text-emerald-400" />
          ) : (
            <ArrowUpFromLine className="size-5 text-amber-400" />
          )}
          <h2 className="text-base font-semibold">
            {kind === "entree" ? "Nouvelle entrée" : "Nouvelle sortie"}
          </h2>
        </div>
        {selected ? (
          <div className="text-sm bg-surface/60 ring-1 ring-border rounded-md px-3 py-2">
            <p className="font-medium">{selected.name}</p>
            <p className="text-xs text-muted-foreground">
              Stock actuel : <span className="tabular-nums text-foreground">{num(Number(selected.stock_quantity))} {selected.unit}</span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sélectionnez un produit dans la liste.</p>
        )}
        <div>
          <Label>Quantité</Label>
          <Input type="number" step="0.001" min="0" value={quantity}
            onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
        </div>
        <div>
          <Label>{kind === "entree" ? "Prix d'achat unitaire (€)" : "Coût unitaire (€)"}</Label>
          <Input type="number" step="0.01" min="0" value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)} placeholder="0,00" />
          <p className="text-[11px] text-muted-foreground mt-1">
            Utilisé pour la valorisation du mouvement.
          </p>
        </div>
        <div>
          <Label>Référence interne</Label>
          <Input value={reference} onChange={(e) => setReference(e.target.value)}
            placeholder={kind === "entree" ? "Bon de livraison interne…" : "Bon de sortie…"} />
        </div>
        {kind === "entree" && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Fournisseur</Label>
                <button
                  type="button"
                  className="text-[11px] text-primary hover:underline"
                  onClick={() => setNewSupplierOpen(true)}
                >+ Nouveau</button>
              </div>
              <Select value={supplierId || "none"} onValueChange={(v) => setSupplierId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucun —</SelectItem>
                  {(suppliers ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>N° facture / BL fournisseur</Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="FA-2025-0042" />
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>N° lot</Label>
            <Input
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              placeholder="LOT-2025-001"
              className={lotDlcError ? "ring-1 ring-destructive" : ""}
            />
          </div>
          <div>
            <Label>DLC / expiration</Label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className={lotDlcError || expiryInvalid ? "ring-1 ring-destructive" : ""}
            />
            {lotDlcError && (
              <p className="text-[11px] text-destructive mt-1">DLC obligatoire si lot renseigné</p>
            )}
            {expiryInvalid && (
              <p className="text-[11px] text-destructive mt-1">Date invalide</p>
            )}
          </div>
        </div>
        <div>
          <Label>Motif / notes</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
        </div>
        {quantity && unitCost && (
          <div className="text-sm text-muted-foreground">
            Valeur du mouvement : <span className="text-foreground tabular-nums font-semibold">
              {eur((parseFloat(quantity) || 0) * (parseFloat(unitCost) || 0))}
            </span>
          </div>
        )}
        <Button
          className="w-full"
          variant={kind === "entree" ? "default" : "destructive"}
          disabled={!productId || !quantity || mut.isPending}
          onClick={() => mut.mutate()}
        >
          {mut.isPending ? "Enregistrement…" : (kind === "entree" ? "Enregistrer l'entrée" : "Enregistrer la sortie")}
        </Button>
      </div>

      <Dialog open={newSupplierOpen} onOpenChange={setNewSupplierOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau fournisseur</DialogTitle>
            <DialogDescription>Créer un fournisseur rattaché à votre entreprise.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nom du fournisseur</Label>
            <Input
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
              placeholder="Ex : Metro Cash & Carry"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewSupplierOpen(false)}>Annuler</Button>
            <Button
              onClick={() => createSupplier.mutate()}
              disabled={!newSupplierName.trim() || createSupplier.isPending}
            >{createSupplier.isPending ? "Création…" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────── Entrée multi-lignes
type EntryLine = {
  key: string;
  product_id: string;
  quantity: string;
  unit_cost: string;
  lot_number: string;
  expiry_date: string;
};

function MultiEntryTab({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const [lines, setLines] = useState<EntryLine[]>([
    { key: crypto.randomUUID(), product_id: "", quantity: "", unit_cost: "", lot_number: "", expiry_date: "" },
  ]);
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [newSupplierOpen, setNewSupplierOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");

  const { data: products } = useQuery({
    queryKey: ["products", companyId, "active-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, unit, stock_quantity, purchase_price")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Pick<Product, "id" | "name" | "sku" | "unit" | "stock_quantity" | "purchase_price">[];
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("suppliers")
        .select("id, name")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const createSupplier = useMutation({
    mutationFn: async () => {
      const name = newSupplierName.trim();
      if (!name) throw new Error("Nom requis");
      const { data, error } = await (supabase as any)
        .from("suppliers")
        .insert({ company_id: companyId, name })
        .select("id, name")
        .single();
      if (error) throw error;
      return data as { id: string; name: string };
    },
    onSuccess: (sup) => {
      toast.success("Fournisseur créé");
      qc.invalidateQueries({ queryKey: ["suppliers", companyId] });
      setSupplierId(sup.id);
      setNewSupplierName("");
      setNewSupplierOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateLine = (key: string, patch: Partial<EntryLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key: string) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  const addLine = () =>
    setLines((prev) => [...prev, { key: crypto.randomUUID(), product_id: "", quantity: "", unit_cost: "", lot_number: "", expiry_date: "" }]);

  const onPickProduct = (key: string, pid: string) => {
    const p = products?.find((x) => x.id === pid);
    updateLine(key, { product_id: pid, unit_cost: p ? String(p.purchase_price ?? "") : "" });
  };

  const totalValue = useMemo(
    () => lines.reduce((acc, l) => acc + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_cost) || 0), 0),
    [lines]
  );
  const validLineCount = lines.filter(
    (l) => l.product_id && parseFloat(l.quantity) > 0
  ).length;

  const submit = useMutation({
    mutationFn: async () => {
      const valid = lines.filter((l) => l.product_id && parseFloat(l.quantity) > 0);
      if (valid.length === 0) throw new Error("Ajoutez au moins une ligne valide");

      // Autorise plusieurs lignes pour un même produit (lots/DLC distincts),
      // mais empêche des doublons exacts (même produit + même lot + même DLC).
      const seen = new Set<string>();
      for (const l of valid) {
        const sig = `${l.product_id}|${l.lot_number.trim()}|${l.expiry_date}`;
        if (seen.has(sig)) {
          throw new Error("Deux lignes ont le même produit et le même lot/DLC");
        }
        seen.add(sig);
      }

      const results: { ok: number; errors: string[] } = { ok: 0, errors: [] };
      for (const l of valid) {
        const qty = parseFloat(l.quantity);
        const cost = l.unit_cost ? parseFloat(l.unit_cost) : null;
        const { error } = await (supabase.rpc as any)("record_stock_movement", {
          _product_id: l.product_id,
          _movement_type: "entree",
          _quantity: qty,
          _unit_cost: cost,
          _reason: reason || null,
          _reference: reference || null,
          _target_quantity: null,
          _supplier_id: supplierId || null,
          _invoice_number: invoiceNumber || null,
          _lot_number: l.lot_number.trim() || null,
          _expiry_date: l.expiry_date || null,
        });
        if (error) {
          const name = products?.find((p) => p.id === l.product_id)?.name ?? l.product_id;
          results.errors.push(`${name} : ${error.message}`);
        } else {
          results.ok += 1;
        }
      }
      return results;
    },
    onSuccess: (res) => {
      if (res.ok > 0) {
        toast.success(`${res.ok} ligne(s) enregistrée(s)`);
        setLines([{ key: crypto.randomUUID(), product_id: "", quantity: "", unit_cost: "", lot_number: "", expiry_date: "" }]);
        setInvoiceNumber(""); setReference(""); setReason("");
        qc.invalidateQueries({ queryKey: ["products", companyId, "active-min"] });
        qc.invalidateQueries({ queryKey: ["stock-movements", companyId] });
        qc.invalidateQueries({ queryKey: ["stock-kpis", companyId] });
        qc.invalidateQueries({ queryKey: ["products-overview", companyId] });
      }
      for (const err of res.errors) toast.error(err);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-4 space-y-4">
      <div className="grid md:grid-cols-4 gap-3 rounded-xl ring-1 ring-border bg-surface/60 p-4">
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <Label>Fournisseur</Label>
            <button type="button" className="text-[11px] text-primary hover:underline"
              onClick={() => setNewSupplierOpen(true)}>+ Nouveau</button>
          </div>
          <Select value={supplierId || "none"} onValueChange={(v) => setSupplierId(v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Aucun —</SelectItem>
              {(suppliers ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>N° facture / BL fournisseur</Label>
          <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="FA-2025-0042" />
        </div>
        <div>
          <Label>Référence interne</Label>
          <Input value={reference} onChange={(e) => setReference(e.target.value)}
            placeholder="BL interne…" />
        </div>
      </div>

      <div className="rounded-xl ring-1 ring-border bg-surface/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <ArrowDownToLine className="size-4 text-emerald-400" />
            Lignes de l'entrée
          </h2>
          <Button size="sm" variant="outline" onClick={addLine}>
            <Plus className="size-4 mr-1" /> Ajouter une ligne
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface/80 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 w-[28%]">Produit</th>
                <th className="text-right px-3 py-2 w-[100px]">Stock</th>
                <th className="text-right px-3 py-2 w-[100px]">Quantité</th>
                <th className="text-right px-3 py-2 w-[120px]">PU (€)</th>
                <th className="text-left px-3 py-2 w-[140px]">N° lot</th>
                <th className="text-left px-3 py-2 w-[150px]">DLC</th>
                <th className="text-right px-3 py-2 w-[110px]">Valeur</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const p = products?.find((x) => x.id === l.product_id);
                const lineVal = (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_cost) || 0);
                const exp = l.expiry_date ? new Date(l.expiry_date) : null;
                const daysLeft = exp ? Math.ceil((exp.getTime() - Date.now()) / 86400000) : null;
                const expClass = daysLeft === null ? "" : daysLeft < 0
                  ? "ring-red-500/40 text-red-300"
                  : daysLeft <= 30 ? "ring-amber-500/40 text-amber-300" : "";
                return (
                  <tr key={l.key} className="border-t border-border/40 align-top">
                    <td className="px-3 py-2">
                      <Select value={l.product_id || ""} onValueChange={(v) => onPickProduct(l.key, v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                        <SelectContent>
                          {(products ?? []).map((prod) => (
                            <SelectItem key={prod.id} value={prod.id}>
                              {prod.name}{prod.sku ? ` · ${prod.sku}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {p ? `${num(Number(p.stock_quantity))} ${p.unit}` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" step="0.001" min="0" className="h-9 text-right"
                        value={l.quantity}
                        onChange={(e) => updateLine(l.key, { quantity: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" step="0.01" min="0" className="h-9 text-right"
                        value={l.unit_cost}
                        onChange={(e) => updateLine(l.key, { unit_cost: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <Input className="h-9" placeholder="LOT-…"
                        value={l.lot_number}
                        onChange={(e) => updateLine(l.key, { lot_number: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="date" className={`h-9 ${expClass}`}
                        value={l.expiry_date}
                        onChange={(e) => updateLine(l.key, { expiry_date: e.target.value })} />
                      {daysLeft !== null && (
                        <p className={`text-[10px] mt-0.5 ${daysLeft < 0 ? "text-red-300" : daysLeft <= 30 ? "text-amber-300" : "text-muted-foreground"}`}>
                          {daysLeft < 0 ? `Expirée (${-daysLeft}j)` : `J-${daysLeft}`}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {lineVal ? eur(lineVal) : "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button size="icon" variant="ghost" disabled={lines.length === 1}
                        onClick={() => removeLine(l.key)}>
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-surface/60">
                <td colSpan={6} className="px-3 py-2 text-right text-sm font-semibold">Total entrée</td>
                <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums">{eur(totalValue)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="rounded-xl ring-1 ring-border bg-surface/60 p-4 space-y-3">
        <div>
          <Label>Motif / notes (appliqué à toutes les lignes)</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {validLineCount} ligne(s) valide(s) · Audit : fournisseur, n° facture et utilisateur enregistrés par ligne.
          </p>
          <Button onClick={() => submit.mutate()} disabled={validLineCount === 0 || submit.isPending}>
            {submit.isPending ? "Enregistrement…" : `Enregistrer ${validLineCount} ligne(s)`}
          </Button>
        </div>
      </div>

      <Dialog open={newSupplierOpen} onOpenChange={setNewSupplierOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau fournisseur</DialogTitle>
            <DialogDescription>Créer un fournisseur rattaché à votre entreprise.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nom du fournisseur</Label>
            <Input value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)}
              placeholder="Ex : Metro Cash & Carry" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewSupplierOpen(false)}>Annuler</Button>
            <Button onClick={() => createSupplier.mutate()}
              disabled={!newSupplierName.trim() || createSupplier.isPending}>
              {createSupplier.isPending ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────── Inventaire (recomptage)
function InventoryTab({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState<Product | null>(null);
  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");

  const { data: products } = useQuery({
    queryKey: ["products-overview", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const filtered = useMemo(() => {
    const list = products ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q));
  }, [products, search]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!open) return;
      const target = parseFloat(counted);
      if (Number.isNaN(target) || target < 0) throw new Error("Quantité invalide");
      const { error } = await (supabase.rpc as any)("record_stock_movement", {
        _product_id: open.id,
        _movement_type: "inventaire",
        _quantity: 0,
        _unit_cost: open.purchase_price,
        _reason: reason || "Inventaire physique",
        _reference: null,
        _target_quantity: target,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inventaire enregistré");
      setOpen(null); setCounted(""); setReason("");
      qc.invalidateQueries({ queryKey: ["products-overview", companyId] });
      qc.invalidateQueries({ queryKey: ["stock-movements", companyId] });
      qc.invalidateQueries({ queryKey: ["stock-kpis", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delta = open && counted !== "" ? parseFloat(counted) - Number(open.stock_quantity) : 0;

  return (
    <div className="mt-4 rounded-xl ring-1 ring-border bg-surface/60 overflow-hidden">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <Search className="size-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="h-9 max-w-sm" />
        <p className="text-xs text-muted-foreground ml-auto">
          Cliquez sur un produit pour saisir la quantité comptée.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-surface/40">
            <tr>
              <th className="text-left px-3 py-2">Produit</th>
              <th className="text-right px-3 py-2">Stock système</th>
              <th className="text-right px-3 py-2">Seuil</th>
              <th className="text-right px-3 py-2">Valo. coût</th>
              <th className="text-right px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-border/60">
                <td className="px-3 py-2 font-medium">
                  {p.name}
                  <span className="ml-2 text-[11px] text-muted-foreground font-mono">{p.sku ?? ""}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{num(Number(p.stock_quantity))} {p.unit}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{num(Number(p.stock_alert_threshold))}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {eur(Number(p.stock_quantity) * Number(p.purchase_price))}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant="outline" onClick={() => {
                    setOpen(p); setCounted(String(p.stock_quantity)); setReason("");
                  }}>
                    Recompter
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inventaire — {open?.name}</DialogTitle>
            <DialogDescription>
              Stock système : <strong className="text-foreground">{open ? num(Number(open.stock_quantity)) : ""} {open?.unit}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Quantité comptée</Label>
              <Input type="number" step="0.001" min="0" value={counted} onChange={(e) => setCounted(e.target.value)} />
              {counted !== "" && open && (
                <p className="text-xs mt-1">
                  Écart : <span className={`tabular-nums font-semibold ${
                    delta === 0 ? "text-emerald-400"
                    : delta > 0 ? "text-blue-400" : "text-red-400"
                  }`}>
                    {delta > 0 ? "+" : ""}{num(delta)} {open.unit}
                  </span>
                  {" "}· valeur impact <span className="tabular-nums">{eur(Math.abs(delta) * Number(open.purchase_price))}</span>
                </p>
              )}
            </div>
            <div>
              <Label>Justification</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                placeholder="Casse, vol, erreur de saisie…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(null)}>Annuler</Button>
            <Button onClick={() => mut.mutate()} disabled={counted === "" || mut.isPending}>
              Valider l'inventaire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────── Alertes stock bas
function AlertsTab({ companyId }: { companyId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["stock-alerts", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("stock_quantity");
      if (error) throw error;
      return (data as Product[]).filter((p) =>
        Number(p.stock_quantity) <= Number(p.stock_alert_threshold));
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <Skeleton className="h-64 w-full mt-4" />;

  return (
    <div className="mt-4 rounded-xl ring-1 ring-border bg-surface/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <AlertTriangle className="size-4 text-amber-400" />
        <h3 className="text-sm font-semibold">
          {data?.length ?? 0} produit(s) en alerte
        </h3>
      </div>
      {(!data || data.length === 0) ? (
        <p className="px-4 py-10 text-center text-muted-foreground text-sm">
          Aucune alerte. Tous les stocks sont au-dessus de leur seuil.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-surface/40">
              <tr>
                <th className="text-left px-3 py-2">Produit</th>
                <th className="text-right px-3 py-2">Stock</th>
                <th className="text-right px-3 py-2">Seuil</th>
                <th className="text-right px-3 py-2">Manquant</th>
                <th className="text-center px-3 py-2">État</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => {
                const q = Number(p.stock_quantity);
                const seuil = Number(p.stock_alert_threshold);
                const status = q <= 0 ? "rupture" : "bas";
                return (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className="px-3 py-2 font-medium">{p.name}
                      <span className="ml-2 text-[11px] text-muted-foreground font-mono">{p.sku ?? ""}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{num(q)} {p.unit}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{num(seuil)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-400">
                      {num(Math.max(seuil - q, 0))} {p.unit}
                    </td>
                    <td className="px-3 py-2 text-center"><Badge status={status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────── Historique mouvements
const TYPE_LABEL: Record<Movement["movement_type"], string> = {
  entree: "Entrée", sortie: "Sortie", inventaire: "Inventaire",
  perte: "Perte", ajustement: "Ajustement", retour: "Retour",
};
const TYPE_STYLE: Record<Movement["movement_type"], string> = {
  entree: "text-emerald-300 bg-emerald-500/10 ring-emerald-500/30",
  sortie: "text-amber-300 bg-amber-500/10 ring-amber-500/30",
  inventaire: "text-blue-300 bg-blue-500/10 ring-blue-500/30",
  perte: "text-red-300 bg-red-500/10 ring-red-500/30",
  ajustement: "text-violet-300 bg-violet-500/10 ring-violet-500/30",
  retour: "text-teal-300 bg-teal-500/10 ring-teal-500/30",
};

function MovementsHistoryTab({ companyId }: { companyId: string }) {
  const [type, setType] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["stock-movements", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements" as never)
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Movement[];
    },
    refetchInterval: 30000,
  });

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (type !== "all") list = list.filter((m) => m.movement_type === type);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) =>
        m.product_name.toLowerCase().includes(q)
        || (m.reference ?? "").toLowerCase().includes(q)
        || (m.reason ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [data, type, search]);

  if (isLoading) return <Skeleton className="h-96 w-full mt-4" />;

  return (
    <div className="mt-4 rounded-xl ring-1 ring-border bg-surface/60 overflow-hidden">
      <div className="p-3 border-b border-border flex flex-wrap items-center gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="entree">Entrées</SelectItem>
            <SelectItem value="sortie">Sorties</SelectItem>
            <SelectItem value="inventaire">Inventaires</SelectItem>
            <SelectItem value="perte">Pertes</SelectItem>
            <SelectItem value="ajustement">Ajustements</SelectItem>
            <SelectItem value="retour">Retours</SelectItem>
          </SelectContent>
        </Select>
        <Input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher produit, réf, motif…" className="h-9 max-w-sm" />
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} mouvement(s)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-surface/40">
            <tr>
              <th className="text-left px-3 py-2">Date</th>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-left px-3 py-2">Produit</th>
              <th className="text-right px-3 py-2">Quantité</th>
              <th className="text-right px-3 py-2">Avant → Après</th>
              <th className="text-right px-3 py-2">Valeur</th>
              <th className="text-left px-3 py-2">Réf / Motif</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-t border-border/60">
                <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">
                  {new Date(m.created_at).toLocaleString("fr-FR")}
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs ring-1 ${TYPE_STYLE[m.movement_type]}`}>
                    {TYPE_LABEL[m.movement_type]}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium">{m.product_name}</td>
                <td className={`px-3 py-2 text-right tabular-nums font-semibold ${
                  Number(m.quantity) > 0 ? "text-emerald-400" : "text-red-400"
                }`}>
                  {Number(m.quantity) > 0 ? "+" : ""}{num(Number(m.quantity))}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground text-xs">
                  {num(Number(m.quantity_before))} → {num(Number(m.quantity_after))}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{eur(Number(m.total_value))}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground max-w-xs truncate">
                  {m.reference && <span className="font-mono text-foreground mr-2">{m.reference}</span>}
                  {m.reason}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                Aucun mouvement.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────── Rapport pertes
function LossReportTab({ companyId }: { companyId: string }) {
  const [days, setDays] = useState("30");

  const { data, isLoading } = useQuery({
    queryKey: ["stock-losses", companyId, days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - parseInt(days, 10));
      const { data, error } = await supabase
        .from("stock_movements" as never)
        .select("*")
        .eq("company_id", companyId)
        .eq("movement_type", "perte")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Movement[];
    },
  });

  const totals = useMemo(() => {
    const list = data ?? [];
    let qty = 0, value = 0;
    const byProduct = new Map<string, { name: string; qty: number; value: number }>();
    for (const m of list) {
      qty += Math.abs(Number(m.quantity));
      value += Number(m.total_value);
      const cur = byProduct.get(m.product_id) ?? { name: m.product_name, qty: 0, value: 0 };
      cur.qty += Math.abs(Number(m.quantity));
      cur.value += Number(m.total_value);
      byProduct.set(m.product_id, cur);
    }
    return {
      qty, value,
      ranked: Array.from(byProduct.entries())
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.value - a.value),
    };
  }, [data]);

  if (isLoading) return <Skeleton className="h-96 w-full mt-4" />;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-3">
        <Label className="text-xs">Période</Label>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 derniers jours</SelectItem>
            <SelectItem value="30">30 derniers jours</SelectItem>
            <SelectItem value="90">90 derniers jours</SelectItem>
            <SelectItem value="365">12 derniers mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Kpi label="Pertes (qté)" value={num(totals.qty)} icon={TrendingDown} tone="red" />
        <Kpi label="Pertes (valeur)" value={eur(totals.value)} icon={TrendingDown} tone="red" />
        <Kpi label="Lignes" value={String(data?.length ?? 0)} />
      </div>

      <div className="rounded-xl ring-1 ring-border bg-surface/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <TrendingDown className="size-4 text-red-400" />
          <h3 className="text-sm font-semibold">Classement par produit</h3>
        </div>
        {totals.ranked.length === 0 ? (
          <p className="px-4 py-10 text-center text-muted-foreground text-sm">
            Aucune perte enregistrée sur la période.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-surface/40">
              <tr>
                <th className="text-left px-3 py-2">Produit</th>
                <th className="text-right px-3 py-2">Quantité perdue</th>
                <th className="text-right px-3 py-2">Valeur</th>
                <th className="text-right px-3 py-2">% du total</th>
              </tr>
            </thead>
            <tbody>
              {totals.ranked.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{num(r.qty)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{eur(r.value)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {totals.value > 0 ? ((r.value / totals.value) * 100).toFixed(1) : "0"}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl ring-1 ring-border bg-surface/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Détail des pertes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-surface/40">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Produit</th>
                <th className="text-right px-3 py-2">Quantité</th>
                <th className="text-right px-3 py-2">Valeur</th>
                <th className="text-left px-3 py-2">Motif</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((m) => (
                <tr key={m.id} className="border-t border-border/60">
                  <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">
                    {new Date(m.created_at).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-3 py-2 font-medium">{m.product_name}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-red-400">
                    {num(Math.abs(Number(m.quantity)))}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{eur(Number(m.total_value))}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{m.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl ring-1 ring-border bg-surface/60 p-4">
        <p className="text-xs text-muted-foreground">
          Pour enregistrer une perte (casse, vol, péremption), utilisez l'onglet « Sorties » et changez le type via l'onglet
          mouvement perte, ou utilisez la fonction <span className="font-mono text-foreground">record_stock_movement</span> avec le type « perte ».
        </p>
        <LossQuickForm companyId={companyId} />
      </div>
    </div>
  );
}

function LossQuickForm({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const { data: products } = useQuery({
    queryKey: ["products", companyId, "active-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock_quantity, unit, purchase_price")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Pick<Product, "id" | "name" | "stock_quantity" | "unit" | "purchase_price">[];
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (!productId) throw new Error("Produit requis");
      const qty = parseFloat(quantity);
      if (!qty || qty <= 0) throw new Error("Quantité invalide");
      const { error } = await (supabase.rpc as any)("record_stock_movement", {
        _product_id: productId,
        _movement_type: "perte",
        _quantity: qty,
        _unit_cost: null,
        _reason: reason || "Perte",
        _reference: null,
        _target_quantity: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perte enregistrée");
      setQuantity(""); setReason("");
      qc.invalidateQueries({ queryKey: ["stock-losses", companyId] });
      qc.invalidateQueries({ queryKey: ["stock-movements", companyId] });
      qc.invalidateQueries({ queryKey: ["products-overview", companyId] });
      qc.invalidateQueries({ queryKey: ["stock-kpis", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-3 grid sm:grid-cols-[2fr_1fr_2fr_auto] gap-2 items-end">
      <div>
        <Label className="text-xs">Produit</Label>
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
          <SelectContent>
            {(products ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({num(Number(p.stock_quantity))} {p.unit})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Quantité</Label>
        <Input type="number" step="0.001" min="0" className="h-9"
          value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">Motif</Label>
        <Input className="h-9" value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="Casse, vol, péremption…" />
      </div>
      <Button variant="destructive" disabled={!productId || !quantity || mut.isPending}
        onClick={() => mut.mutate()}>
        Enregistrer
      </Button>
    </div>
  );
}
