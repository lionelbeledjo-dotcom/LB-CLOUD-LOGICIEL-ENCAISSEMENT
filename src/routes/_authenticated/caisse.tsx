import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Minus, Trash2, Search, Receipt, ShoppingCart, AlertTriangle,
  Lock, Unlock, Percent, History, XCircle, ScanBarcode, ChevronDown, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/use-company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/caisse")({
  head: () => ({ meta: [{ title: "Caisse — Lb Cloud" }] }),
  component: CaissePage,
});

type Product = {
  id: string; name: string; sale_price: number; vat_rate: number;
  stock_quantity: number; unit: string; category: string | null;
  sku: string | null; barcode: string | null;
};

type CartItem = {
  product_id: string; product_name: string; quantity: number;
  unit_price_ht: number; vat_rate: number; discount_percent: number;
  stock_available: number;
};

const PAYMENT_METHODS = [
  { value: "especes", label: "Espèces" },
  { value: "carte", label: "Carte bancaire" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement" },
  { value: "ticket_restaurant", label: "Ticket restaurant" },
  { value: "autre", label: "Autre" },
];
const QUICK_CASH = [5, 10, 20, 50, 100];

function round2(n: number) { return Math.round(n * 100) / 100; }
function eur(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

type StockError = { product: string; requested: number; available: number };
function parseStockError(msg: string): StockError | null {
  const m = msg.match(/Stock insuffisant pour\s+"([^"]+)":\s*demandé\s+([\d.,]+)\s*\/\s*disponible\s+([\d.,]+)/i);
  if (!m) return null;
  return { product: m[1], requested: parseFloat(m[2].replace(",", ".")), available: parseFloat(m[3].replace(",", ".")) };
}

function CaissePage() {
  const { data: membership, isLoading: loadingCompany } = useActiveCompany();
  const companyId = membership?.company_id;

  if (loadingCompany) {
    return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  }
  if (!companyId) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-surface/60 ring-1 ring-border rounded-xl p-10 text-center">
          <ShoppingCart className="mx-auto size-10 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Aucune entreprise active</h2>
        </div>
      </div>
    );
  }
  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <Tabs defaultValue="vente">
        <TabsList className="mb-4">
          <TabsTrigger value="vente"><ShoppingCart className="size-4 mr-2" />Encaissement</TabsTrigger>
          <TabsTrigger value="journal"><History className="size-4 mr-2" />Journal du jour</TabsTrigger>
        </TabsList>
        <TabsContent value="vente"><VenteTab companyId={companyId} /></TabsContent>
        <TabsContent value="journal"><JournalTab companyId={companyId} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────── Session bar
function SessionBar({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const [openSessionDlg, setOpenSessionDlg] = useState(false);
  const [closeSessionDlg, setCloseSessionDlg] = useState(false);
  const [opening, setOpening] = useState("0");
  const [closing, setClosing] = useState("");
  const [notes, setNotes] = useState("");

  const { data: session } = useQuery({
    queryKey: ["cash-session", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_sessions" as never)
        .select("*")
        .eq("company_id", companyId)
        .eq("status", "open")
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 30000,
  });

  const { data: cashToday } = useQuery({
    queryKey: ["cash-session-cash", session?.id],
    enabled: !!session?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("total_ttc")
        .eq("session_id", session.id)
        .eq("payment_method", "especes");
      if (error) throw error;
      return (data ?? []).reduce((s, r: any) => s + Number(r.total_ttc), 0);
    },
  });

  const openMut = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.rpc as any)("open_cash_session", {
        _company_id: companyId, _opening_amount: parseFloat(opening) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session ouverte");
      setOpenSessionDlg(false);
      qc.invalidateQueries({ queryKey: ["cash-session", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeMut = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.rpc as any)("close_cash_session", {
        _company_id: companyId,
        _closing_amount: parseFloat(closing) || 0,
        _notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Caisse clôturée");
      setCloseSessionDlg(false); setClosing(""); setNotes("");
      qc.invalidateQueries({ queryKey: ["cash-session", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const expected = (Number(session?.opening_amount ?? 0)) + (cashToday ?? 0);

  return (
    <div className="mb-4 flex items-center justify-between bg-surface/60 ring-1 ring-border rounded-xl px-4 py-3">
      {session ? (
        <>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-2 text-emerald-400 font-medium">
              <Unlock className="size-4" /> Caisse ouverte
            </span>
            <span className="text-muted-foreground">
              Fonds: <span className="text-foreground tabular-nums">{eur(Number(session.opening_amount))}</span>
            </span>
            <span className="text-muted-foreground">
              Espèces du jour: <span className="text-foreground tabular-nums">{eur(cashToday ?? 0)}</span>
            </span>
            <span className="text-muted-foreground">
              Attendu: <span className="text-foreground tabular-nums">{eur(expected)}</span>
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCloseSessionDlg(true)}>
            <Lock className="size-4 mr-2" /> Clôturer
          </Button>
        </>
      ) : (
        <>
          <span className="flex items-center gap-2 text-sm text-amber-400 font-medium">
            <Lock className="size-4" /> Aucune caisse ouverte
          </span>
          <Button size="sm" onClick={() => setOpenSessionDlg(true)}>
            <Unlock className="size-4 mr-2" /> Ouvrir la caisse
          </Button>
        </>
      )}

      <Dialog open={openSessionDlg} onOpenChange={setOpenSessionDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ouverture de caisse</DialogTitle>
            <DialogDescription>Saisir le fonds de caisse initial.</DialogDescription>
          </DialogHeader>
          <Label>Fonds d'ouverture (€)</Label>
          <Input type="number" step="0.01" min="0" value={opening} onChange={(e) => setOpening(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenSessionDlg(false)}>Annuler</Button>
            <Button onClick={() => openMut.mutate()} disabled={openMut.isPending}>Ouvrir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeSessionDlg} onOpenChange={setCloseSessionDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clôture de caisse</DialogTitle>
            <DialogDescription>
              Attendu en caisse: <strong className="text-foreground">{eur(expected)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Espèces comptées (€)</Label>
              <Input type="number" step="0.01" min="0" value={closing} onChange={(e) => setClosing(e.target.value)} />
              {closing && (
                <p className="text-xs mt-1 text-muted-foreground">
                  Écart: <span className={`tabular-nums font-semibold ${
                    parseFloat(closing) - expected === 0 ? "text-emerald-400"
                    : "text-amber-400"
                  }`}>{eur((parseFloat(closing) || 0) - expected)}</span>
                </p>
              )}
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCloseSessionDlg(false)}>Annuler</Button>
            <Button onClick={() => closeMut.mutate()} disabled={closeMut.isPending}>Clôturer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────── Vente
function VenteTab({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("especes");
  const [amountPaid, setAmountPaid] = useState("");
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [stockError, setStockError] = useState<StockError | null>(null);
  const [lastInvoice, setLastInvoice] = useState<{ invoice: string; totalTtc: number; change: number } | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", companyId, "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sale_price, vat_rate, stock_quantity, unit, category, sku, barcode")
        .eq("company_id", companyId).eq("is_active", true).order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const filtered = useMemo(() => {
    const list = products ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list.slice(0, 30);
    return list.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.sku ?? "").toLowerCase().includes(q) ||
      (p.barcode ?? "").toLowerCase().includes(q),
    ).slice(0, 30);
  }, [products, search]);

  const totals = useMemo(() => {
    let ht = 0, vat = 0;
    for (const it of cart) {
      const lineHt = round2(it.quantity * it.unit_price_ht * (1 - it.discount_percent / 100));
      const lineVat = round2((lineHt * it.vat_rate) / 100);
      ht += lineHt; vat += lineVat;
    }
    const promoMul = 1 - (globalDiscount / 100);
    ht = round2(ht * promoMul); vat = round2(vat * promoMul);
    return { ht, vat, ttc: round2(ht + vat) };
  }, [cart, globalDiscount]);

  const change = useMemo(() => {
    if (paymentMethod !== "especes") return 0;
    const paid = parseFloat(amountPaid);
    if (!isFinite(paid)) return 0;
    return Math.max(0, round2(paid - totals.ttc));
  }, [amountPaid, totals.ttc, paymentMethod]);

  function addToCart(p: Product) {
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === p.id);
      if (existing) {
        if (existing.quantity + 1 > p.stock_quantity) {
          toast.warning(`Stock insuffisant (${p.stock_quantity} ${p.unit})`);
          return prev;
        }
        return prev.map((c) => c.product_id === p.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      if (p.stock_quantity <= 0) { toast.warning("Produit en rupture"); return prev; }
      return [...prev, {
        product_id: p.id, product_name: p.name, quantity: 1,
        unit_price_ht: Number(p.sale_price), vat_rate: Number(p.vat_rate),
        discount_percent: 0, stock_available: Number(p.stock_quantity),
      }];
    });
  }

  // Scan: Enter → premier match (ou code-barres exact)
  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const q = search.trim().toLowerCase();
    if (!q) return;
    const exact = (products ?? []).find((p) => (p.barcode ?? "").toLowerCase() === q);
    const target = exact ?? filtered[0];
    if (target) { addToCart(target); setSearch(""); }
    else toast.warning("Aucun produit pour ce code");
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) => prev.flatMap((c) => {
      if (c.product_id !== id) return [c];
      const next = c.quantity + delta;
      if (next <= 0) return [];
      if (next > c.stock_available) { toast.warning("Stock insuffisant"); return [c]; }
      return [{ ...c, quantity: next }];
    }));
  }
  function setLineDiscount(id: string, pct: number) {
    setCart((prev) => prev.map((c) => c.product_id === id
      ? { ...c, discount_percent: Math.min(100, Math.max(0, pct)) } : c));
  }
  function removeItem(id: string) {
    setCart((prev) => prev.filter((c) => c.product_id !== id));
  }

  const createSaleMut = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error("Panier vide");
      const paid = paymentMethod === "especes" && amountPaid ? parseFloat(amountPaid) : totals.ttc;
      if (paymentMethod === "especes" && paid < totals.ttc) throw new Error("Montant reçu insuffisant");

      // Appliquer la promo globale sur chaque ligne (cumul avec remise ligne)
      const promo = globalDiscount / 100;
      const items = cart.map((c) => ({
        product_id: c.product_id, product_name: c.product_name,
        quantity: c.quantity, unit_price_ht: c.unit_price_ht, vat_rate: c.vat_rate,
        discount_percent: round2(100 * (1 - (1 - c.discount_percent / 100) * (1 - promo))),
      }));

      const { data, error } = await supabase.rpc("create_sale", {
        _company_id: companyId,
        _payment_method: paymentMethod as any,
        _customer_id: null as unknown as string,
        _amount_paid: paid,
        _notes: globalDiscount > 0 ? `Promotion globale ${globalDiscount}%` : (null as unknown as string),
        _items: items,
      });
      if (error) throw error;
      const saleId = data as unknown as string;
      const { data: sale } = await supabase
        .from("sales").select("invoice_number, total_ttc, amount_change")
        .eq("id", saleId).single();
      return sale;
    },
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: ["products", companyId, "active"] });
      qc.invalidateQueries({ queryKey: ["sales-today", companyId] });
      qc.invalidateQueries({ queryKey: ["cash-session-cash"] });
      setLastInvoice({
        invoice: sale?.invoice_number ?? "—",
        totalTtc: Number(sale?.total_ttc ?? 0),
        change: Number(sale?.amount_change ?? 0),
      });
      setCart([]); setAmountPaid(""); setGlobalDiscount(0); setConfirmOpen(false);
      toast.success("Vente enregistrée");
      searchRef.current?.focus();
    },
    onError: (e: Error) => {
      const parsed = parseStockError(e.message);
      if (parsed) {
        setStockError(parsed);
        setCart((prev) => prev.map((c) =>
          c.product_name === parsed.product ? { ...c, stock_available: parsed.available } : c));
        toast.error("Stock insuffisant", {
          description: `${parsed.product} — demandé ${parsed.requested}, disponible ${parsed.available}`,
        });
      } else toast.error("Échec de la vente", { description: e.message });
    },
  });

  useEffect(() => { searchRef.current?.focus(); }, []);

  return (
    <>
      <SessionBar companyId={companyId} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-12rem)]">
        {/* Catalogue */}
        <section className="lg:col-span-7 bg-surface/60 ring-1 ring-border rounded-xl flex flex-col overflow-hidden">
          <header className="p-4 border-b border-border flex items-center gap-3">
            <ScanBarcode className="size-4 text-muted-foreground" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Scanner ou rechercher (Entrée pour ajouter)…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <Search className="size-4 text-muted-foreground" />
          </header>

          {isLoading ? (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6">
              Aucun produit trouvé.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((p) => {
                const out = p.stock_quantity <= 0;
                return (
                  <button key={p.id} onClick={() => addToCart(p)} disabled={out}
                    className={out
                      ? "text-left bg-background/30 ring-1 ring-border rounded-lg p-3 opacity-50 cursor-not-allowed"
                      : "text-left bg-background/40 ring-1 ring-border hover:ring-primary/60 hover:bg-surface-elevated/50 rounded-lg p-3 transition-colors active:scale-[0.98]"}
                  >
                    <div className="text-sm font-medium text-foreground line-clamp-2">{p.name}</div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-base font-semibold text-foreground tabular-nums">{eur(Number(p.sale_price))}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Stock {p.stock_quantity} · TVA {p.vat_rate}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Cart */}
        <section className="lg:col-span-5 bg-surface/60 ring-1 ring-border rounded-xl flex flex-col overflow-hidden">
          <header className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Ticket en cours</h2>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => { setCart([]); setGlobalDiscount(0); }}>
                Vider
              </Button>
            )}
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-sm text-muted-foreground py-12">
                <Receipt className="size-8 mb-3 opacity-50" />
                Scannez ou cliquez un produit
              </div>
            ) : cart.map((c) => {
              const lineHt = round2(c.quantity * c.unit_price_ht * (1 - c.discount_percent / 100));
              const lineTtc = round2(lineHt * (1 + c.vat_rate / 100));
              return (
                <div key={c.product_id} className="p-3 bg-background/40 ring-1 ring-border rounded-lg space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.product_name}</p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {c.unit_price_ht.toFixed(2)} € HT · TVA {c.vat_rate}%
                        {c.discount_percent > 0 && ` · -${c.discount_percent}%`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => updateQty(c.product_id, -1)}>
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium tabular-nums">{c.quantity}</span>
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => updateQty(c.product_id, 1)}>
                        <Plus className="size-3" />
                      </Button>
                    </div>
                    <div className="w-20 text-right text-sm font-semibold text-foreground tabular-nums">
                      {lineTtc.toFixed(2)} €
                    </div>
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => removeItem(c.product_id)}>
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Percent className="size-3 text-muted-foreground" />
                    <Input type="number" min="0" max="100" step="1"
                      className="h-7 text-xs w-20"
                      value={c.discount_percent}
                      onChange={(e) => setLineDiscount(c.product_id, parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-[10px] text-muted-foreground">Remise ligne</span>
                  </div>
                </div>
              );
            })}
          </div>

          <footer className="border-t border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Promo globale</Label>
              <Input type="number" min="0" max="100" step="1" className="h-8 w-20 text-xs"
                value={globalDiscount}
                onChange={(e) => setGlobalDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              />
              <span className="text-xs text-muted-foreground">%</span>
              {[5, 10, 15, 20].map((p) => (
                <Button key={p} variant="outline" size="sm" className="h-7 px-2 text-xs"
                  onClick={() => setGlobalDiscount(p)}>-{p}%</Button>
              ))}
            </div>

            <div className="space-y-1 text-sm">
              <Row label="Total HT" value={`${totals.ht.toFixed(2)} €`} />
              <Row label="TVA" value={`${totals.vat.toFixed(2)} €`} />
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-sm font-semibold text-foreground">Total TTC</span>
                <span className="text-xl font-semibold text-foreground tabular-nums">{totals.ttc.toFixed(2)} €</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Paiement</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {paymentMethod === "especes" ? "Reçu (€)" : "Encaissé"}
                </Label>
                <Input type="number" step="0.01" min="0" placeholder={totals.ttc.toFixed(2)}
                  value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)}
                  disabled={paymentMethod !== "especes"}
                />
              </div>
            </div>

            {paymentMethod === "especes" && (
              <div className="flex flex-wrap gap-1">
                <Button variant="outline" size="sm" className="h-7 text-xs"
                  onClick={() => setAmountPaid(totals.ttc.toFixed(2))}>Compte juste</Button>
                {QUICK_CASH.map((v) => (
                  <Button key={v} variant="outline" size="sm" className="h-7 text-xs"
                    onClick={() => setAmountPaid(v.toFixed(2))}>{v} €</Button>
                ))}
              </div>
            )}

            {paymentMethod === "especes" && change > 0 && (
              <div className="flex justify-between text-sm text-emerald-400">
                <span>Rendu monnaie</span>
                <span className="tabular-nums font-semibold">{change.toFixed(2)} €</span>
              </div>
            )}

            <Button className="w-full" size="lg"
              disabled={cart.length === 0 || createSaleMut.isPending}
              onClick={() => setConfirmOpen(true)}>
              {createSaleMut.isPending ? "Enregistrement…" : `Encaisser ${totals.ttc.toFixed(2)} €`}
            </Button>
          </footer>
        </section>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l'encaissement</DialogTitle>
            <DialogDescription>
              {cart.length} article{cart.length > 1 ? "s" : ""} · Total{" "}
              <strong className="text-foreground">{totals.ttc.toFixed(2)} €</strong> ·{" "}
              {PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Annuler</Button>
            <Button onClick={() => createSaleMut.mutate()} disabled={createSaleMut.isPending}>
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!stockError} onOpenChange={(o) => !o && setStockError(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" /> Stock insuffisant
            </DialogTitle>
            <DialogDescription>La vente a été refusée.</DialogDescription>
          </DialogHeader>
          {stockError && (
            <div className="space-y-3 py-2">
              <div className="bg-background/40 ring-1 ring-border rounded-lg p-4">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Produit</div>
                <div className="text-base font-semibold text-foreground mt-1">{stockError.product}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background/40 ring-1 ring-border rounded-lg p-4">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Demandé</div>
                  <div className="text-xl font-semibold text-foreground tabular-nums mt-1">{stockError.requested}</div>
                </div>
                <div className="bg-background/40 ring-1 ring-border rounded-lg p-4">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Disponible</div>
                  <div className="text-xl font-semibold text-amber-400 tabular-nums mt-1">{stockError.available}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setStockError(null)}>Compris</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lastInvoice} onOpenChange={(o) => !o && setLastInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vente enregistrée</DialogTitle>
            <DialogDescription>Le stock a été mis à jour.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Row label="N° de facture" value={lastInvoice?.invoice ?? ""} />
            <Row label="Total TTC" value={`${lastInvoice?.totalTtc.toFixed(2)} €`} />
            {(lastInvoice?.change ?? 0) > 0 && (
              <Row label="Rendu monnaie" value={`${lastInvoice?.change.toFixed(2)} €`} />
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setLastInvoice(null)}>Nouvelle vente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────── Journal du jour
type SaleRow = {
  id: string; invoice_number: string; sold_at: string;
  payment_method: string; total_ht: number; total_vat: number; total_ttc: number;
  amount_paid: number; amount_change: number; notes: string | null;
  is_credit_note: boolean; original_sale_id: string | null;
  sale_items: {
    id: string; product_name: string; quantity: number;
    unit_price_ht: number; vat_rate: number; discount_percent: number;
    line_total_ht: number; line_total_vat: number; line_total_ttc: number;
  }[];
};

function JournalTab({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const [toCancel, setToCancel] = useState<{ id: string; invoice: string } | null>(null);
  const [reason, setReason] = useState("");
  const [fromHour, setFromHour] = useState("00:00");
  const [toHour, setToHour] = useState("23:59");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const dayStart = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales-today", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`id, invoice_number, sold_at, payment_method,
                 total_ht, total_vat, total_ttc, amount_paid, amount_change, notes,
                 is_credit_note, original_sale_id,
                 sale_items ( id, product_name, quantity, unit_price_ht, vat_rate,
                              discount_percent, line_total_ht, line_total_vat, line_total_ttc )`)
        .eq("company_id", companyId)
        .gte("sold_at", dayStart.toISOString())
        .order("sold_at", { ascending: false });
      if (error) throw error;
      return data as unknown as SaleRow[];
    },
    refetchInterval: 15000,
  });

  const cancelMut = useMutation({
    mutationFn: async () => {
      if (!toCancel) return;
      const { error } = await (supabase.rpc as any)("cancel_sale", {
        _sale_id: toCancel.id, _reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vente annulée (avoir émis)");
      setToCancel(null); setReason("");
      qc.invalidateQueries({ queryKey: ["sales-today", companyId] });
      qc.invalidateQueries({ queryKey: ["products", companyId, "active"] });
    },
    onError: (e: Error) => toast.error("Annulation refusée", { description: e.message }),
  });

  // Filtre par plage horaire
  const filtered = useMemo(() => {
    const list = sales ?? [];
    const [fh, fm] = fromHour.split(":").map(Number);
    const [th, tm] = toHour.split(":").map(Number);
    const from = new Date(dayStart); from.setHours(fh || 0, fm || 0, 0, 0);
    const to = new Date(dayStart); to.setHours(th || 23, tm || 59, 59, 999);
    return list.filter((s) => {
      const t = new Date(s.sold_at).getTime();
      return t >= from.getTime() && t <= to.getTime();
    });
  }, [sales, fromHour, toHour, dayStart]);

  // Agrégats
  const totals = useMemo(() => {
    const byPayment: Record<string, { count: number; ttc: number }> = {};
    let ht = 0, vat = 0, ttc = 0, cash = 0, change = 0;
    let invoices = 0, credits = 0;
    for (const s of filtered) {
      ht += Number(s.total_ht); vat += Number(s.total_vat); ttc += Number(s.total_ttc);
      if (s.is_credit_note) credits++; else invoices++;
      const p = s.payment_method;
      byPayment[p] = byPayment[p] || { count: 0, ttc: 0 };
      byPayment[p].count++; byPayment[p].ttc += Number(s.total_ttc);
      if (p === "especes") {
        cash += Number(s.total_ttc);
        change += Number(s.amount_change || 0);
      }
    }
    return { ht, vat, ttc, cash, change, byPayment, invoices, credits };
  }, [filtered]);

  const cancelled = new Set(
    (sales ?? []).filter((s) => s.original_sale_id).map((s) => s.original_sale_id!)
  );

  function toggle(id: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  return (
    <>
      <SessionBar companyId={companyId} />

      {/* Filtres */}
      <div className="mb-4 bg-surface/60 ring-1 ring-border rounded-xl p-4 flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">De</Label>
          <Input type="time" value={fromHour} onChange={(e) => setFromHour(e.target.value)} className="h-8 w-28" />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">À</Label>
          <Input type="time" value={toHour} onChange={(e) => setToHour(e.target.value)} className="h-8 w-28" />
        </div>
        <div className="flex gap-1">
          {[
            { label: "Tout", from: "00:00", to: "23:59" },
            { label: "Matin", from: "00:00", to: "12:00" },
            { label: "Midi", from: "12:00", to: "14:30" },
            { label: "Après-midi", from: "14:30", to: "19:00" },
            { label: "Soir", from: "19:00", to: "23:59" },
          ].map((p) => (
            <Button key={p.label} variant="outline" size="sm" className="h-8 text-xs"
              onClick={() => { setFromHour(p.from); setToHour(p.to); }}>{p.label}</Button>
          ))}
        </div>
      </div>

      {/* Récap */}
      <div className="mb-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Opérations" value={`${totals.invoices} + ${totals.credits} avoir`} />
        <Kpi label="Total HT" value={eur(totals.ht)} />
        <Kpi label="TVA" value={eur(totals.vat)} />
        <Kpi label="Total TTC" value={eur(totals.ttc)} accent />
        <Kpi label="Espèces (net)" value={eur(totals.cash)} sub={`Rendu ${eur(totals.change)}`} />
      </div>

      {Object.keys(totals.byPayment).length > 0 && (
        <div className="mb-4 bg-surface/60 ring-1 ring-border rounded-xl p-4">
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Par mode de paiement</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(totals.byPayment).map(([k, v]) => (
              <div key={k} className="bg-background/40 ring-1 ring-border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">
                  {PAYMENT_METHODS.find((m) => m.value === k)?.label ?? k}
                </div>
                <div className="text-base font-semibold text-foreground tabular-nums">{eur(v.ttc)}</div>
                <div className="text-[10px] text-muted-foreground">{v.count} op.</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="bg-surface/60 ring-1 ring-border rounded-xl overflow-hidden">
        <header className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Journal du jour</h2>
            <p className="text-xs text-muted-foreground">
              {filtered.length} opération(s) entre {fromHour} et {toHour}
            </p>
          </div>
        </header>

        {isLoading ? (
          <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Aucune opération sur cette plage.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="w-8 p-3" />
                <th className="text-left p-3">Heure</th>
                <th className="text-left p-3">N° facture</th>
                <th className="text-left p-3">Paiement</th>
                <th className="text-right p-3">HT</th>
                <th className="text-right p-3">TVA</th>
                <th className="text-right p-3">TTC</th>
                <th className="text-right p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const isCN = s.is_credit_note;
                const wasCancelled = cancelled.has(s.id);
                const isOpen = expanded.has(s.id);
                return (
                  <Fragment key={s.id}>
                    <tr className={`border-b border-border/50 ${isCN ? "bg-destructive/5" : ""}`}>
                      <td className="p-3">
                        <Button size="icon" variant="ghost" className="size-6"
                          onClick={() => toggle(s.id)}>
                          {isOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                        </Button>
                      </td>
                      <td className="p-3 text-muted-foreground tabular-nums">
                        {new Date(s.sold_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td className="p-3 font-medium text-foreground">
                        {s.invoice_number}
                        {isCN && <span className="text-xs text-destructive ml-1">(avoir)</span>}
                        {wasCancelled && <span className="text-xs text-amber-400 ml-1">annulée</span>}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {PAYMENT_METHODS.find((m) => m.value === s.payment_method)?.label ?? s.payment_method}
                      </td>
                      <td className={`p-3 text-right tabular-nums ${isCN ? "text-destructive" : "text-foreground"}`}>
                        {Number(s.total_ht).toFixed(2)}
                      </td>
                      <td className={`p-3 text-right tabular-nums ${isCN ? "text-destructive" : "text-muted-foreground"}`}>
                        {Number(s.total_vat).toFixed(2)}
                      </td>
                      <td className={`p-3 text-right tabular-nums font-medium ${isCN ? "text-destructive" : "text-foreground"}`}>
                        {Number(s.total_ttc).toFixed(2)} €
                      </td>
                      <td className="p-3 text-right">
                        {!isCN && !wasCancelled && (
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                            onClick={() => setToCancel({ id: s.id, invoice: s.invoice_number })}>
                            <XCircle className="size-3.5 mr-1" /> Annuler
                          </Button>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className={isCN ? "bg-destructive/5" : "bg-background/20"}>
                        <td />
                        <td colSpan={7} className="p-3">
                          <div className="bg-background/40 ring-1 ring-border rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                <tr className="border-b border-border/50">
                                  <th className="text-left p-2">Article</th>
                                  <th className="text-right p-2">Qté</th>
                                  <th className="text-right p-2">PU HT</th>
                                  <th className="text-right p-2">Remise</th>
                                  <th className="text-right p-2">TVA</th>
                                  <th className="text-right p-2">HT</th>
                                  <th className="text-right p-2">TTC</th>
                                </tr>
                              </thead>
                              <tbody>
                                {s.sale_items.map((li) => (
                                  <tr key={li.id} className="border-b border-border/30 last:border-0">
                                    <td className="p-2 text-foreground">{li.product_name}</td>
                                    <td className="p-2 text-right tabular-nums">{li.quantity}</td>
                                    <td className="p-2 text-right tabular-nums">{Number(li.unit_price_ht).toFixed(2)}</td>
                                    <td className="p-2 text-right tabular-nums">{Number(li.discount_percent).toFixed(0)}%</td>
                                    <td className="p-2 text-right tabular-nums">{Number(li.vat_rate).toFixed(1)}%</td>
                                    <td className="p-2 text-right tabular-nums">{Number(li.line_total_ht).toFixed(2)}</td>
                                    <td className="p-2 text-right tabular-nums font-medium">{Number(li.line_total_ttc).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                            <span>Encaissé: <span className="text-foreground tabular-nums">{eur(Number(s.amount_paid))}</span></span>
                            {Number(s.amount_change) > 0 && (
                              <span>Rendu: <span className="text-foreground tabular-nums">{eur(Number(s.amount_change))}</span></span>
                            )}
                            {s.notes && <span>Note: <span className="text-foreground">{s.notes}</span></span>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot className="text-sm font-medium">
              <tr className="border-t border-border bg-background/30">
                <td colSpan={4} className="p-3 text-right text-muted-foreground">Totaux</td>
                <td className="p-3 text-right tabular-nums">{totals.ht.toFixed(2)}</td>
                <td className="p-3 text-right tabular-nums">{totals.vat.toFixed(2)}</td>
                <td className="p-3 text-right tabular-nums">{totals.ttc.toFixed(2)} €</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <AlertDialog open={!!toCancel} onOpenChange={(o) => !o && setToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler {toCancel?.invoice} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Conformité NF525 : la vente reste inaltérée. Un avoir miroir sera émis
              et le stock restitué. Action tracée dans le journal d'audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1">
            <Label>Motif</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
              placeholder="Erreur de saisie, retour client…" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Fermer</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}>
              Émettre l'avoir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ring-1 ${accent ? "bg-primary/10 ring-primary/30" : "bg-surface/60 ring-border"}`}>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold text-foreground tabular-nums mt-1">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground tabular-nums">{value}</span>
    </div>
  );
}
