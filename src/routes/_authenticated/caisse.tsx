import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Minus, Trash2, Search, Receipt, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/use-company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/caisse")({
  head: () => ({ meta: [{ title: "Caisse — Lb Cloud" }] }),
  component: CaissePage,
});

type Product = {
  id: string;
  name: string;
  sale_price: number;
  vat_rate: number;
  stock_quantity: number;
  unit: string;
  category: string | null;
  sku: string | null;
  barcode: string | null;
};

type CartItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_ht: number;
  vat_rate: number;
  discount_percent: number;
  stock_available: number;
};

const PAYMENT_METHODS = [
  { value: "especes", label: "Espèces" },
  { value: "carte_bancaire", label: "Carte bancaire" },
  { value: "cheque", label: "Chèque" },
  { value: "ticket_restaurant", label: "Ticket restaurant" },
  { value: "virement", label: "Virement" },
];

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function CaissePage() {
  const { data: membership, isLoading: loadingCompany } = useActiveCompany();
  const companyId = membership?.company_id;
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("especes");
  const [amountPaid, setAmountPaid] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<{
    invoice: string;
    totalTtc: number;
    change: number;
  } | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", companyId, "active"],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sale_price, vat_rate, stock_quantity, unit, category, sku, barcode")
        .eq("company_id", companyId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const filtered = useMemo(() => {
    const list = products ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list.slice(0, 30);
    return list
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [products, search]);

  const totals = useMemo(() => {
    let ht = 0;
    let vat = 0;
    for (const it of cart) {
      const lineHt = round2(it.quantity * it.unit_price_ht * (1 - it.discount_percent / 100));
      const lineVat = round2((lineHt * it.vat_rate) / 100);
      ht += lineHt;
      vat += lineVat;
    }
    const ttc = round2(ht + vat);
    return { ht: round2(ht), vat: round2(vat), ttc };
  }, [cart]);

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
        return prev.map((c) =>
          c.product_id === p.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      if (p.stock_quantity <= 0) {
        toast.warning("Produit en rupture de stock");
        return prev;
      }
      return [
        ...prev,
        {
          product_id: p.id,
          product_name: p.name,
          quantity: 1,
          unit_price_ht: Number(p.sale_price),
          vat_rate: Number(p.vat_rate),
          discount_percent: 0,
          stock_available: Number(p.stock_quantity),
        },
      ];
    });
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev.flatMap((c) => {
        if (c.product_id !== id) return [c];
        const next = c.quantity + delta;
        if (next <= 0) return [];
        if (next > c.stock_available) {
          toast.warning("Stock insuffisant");
          return [c];
        }
        return [{ ...c, quantity: next }];
      }),
    );
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((c) => c.product_id !== id));
  }

  const createSaleMut = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Aucune entreprise active");
      if (cart.length === 0) throw new Error("Panier vide");

      const paid =
        paymentMethod === "especes" && amountPaid
          ? parseFloat(amountPaid)
          : totals.ttc;

      if (paymentMethod === "especes" && paid < totals.ttc) {
        throw new Error("Montant reçu insuffisant");
      }

      const { data, error } = await supabase.rpc("create_sale", {
        _company_id: companyId,
        _payment_method: paymentMethod as
          | "especes"
          | "carte_bancaire"
          | "cheque"
          | "ticket_restaurant"
          | "virement",
        _customer_id: null,
        _amount_paid: paid,
        _notes: null,
        _items: cart.map((c) => ({
          product_id: c.product_id,
          product_name: c.product_name,
          quantity: c.quantity,
          unit_price_ht: c.unit_price_ht,
          vat_rate: c.vat_rate,
          discount_percent: c.discount_percent,
        })),
      });
      if (error) throw error;

      const saleId = data as unknown as string;
      const { data: sale } = await supabase
        .from("sales")
        .select("invoice_number, total_ttc, amount_change")
        .eq("id", saleId)
        .single();
      return sale;
    },
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: ["products", companyId] });
      qc.invalidateQueries({ queryKey: ["products", companyId, "active"] });
      setLastInvoice({
        invoice: sale?.invoice_number ?? "—",
        totalTtc: Number(sale?.total_ttc ?? 0),
        change: Number(sale?.amount_change ?? 0),
      });
      setCart([]);
      setAmountPaid("");
      setConfirmOpen(false);
      toast.success("Vente enregistrée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loadingCompany) {
    return (
      <div className="p-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-surface/60 ring-1 ring-border rounded-xl p-10 text-center">
          <ShoppingCart className="mx-auto size-10 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground">
            Aucune entreprise active
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-6rem)]">
        {/* Catalogue */}
        <section className="lg:col-span-7 bg-surface/60 ring-1 ring-border rounded-xl flex flex-col overflow-hidden">
          <header className="p-4 border-b border-border flex items-center gap-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit, scanner un code-barres…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </header>

          {isLoading ? (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
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
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={out}
                    className={
                      out
                        ? "text-left bg-background/30 ring-1 ring-border rounded-lg p-3 opacity-50 cursor-not-allowed"
                        : "text-left bg-background/40 ring-1 ring-border hover:ring-brand/60 hover:bg-surface-elevated/50 rounded-lg p-3 transition-colors"
                    }
                  >
                    <div className="text-sm font-medium text-foreground line-clamp-2">
                      {p.name}
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-base font-semibold text-foreground tabular-nums">
                        {Number(p.sale_price).toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Stock {p.stock_quantity}
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
              <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                Vider
              </Button>
            )}
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-sm text-muted-foreground py-12">
                <Receipt className="size-8 mb-3 opacity-50" />
                Cliquez sur un produit pour l'ajouter
              </div>
            ) : (
              cart.map((c) => {
                const lineHt = round2(
                  c.quantity * c.unit_price_ht * (1 - c.discount_percent / 100),
                );
                const lineTtc = round2(lineHt * (1 + c.vat_rate / 100));
                return (
                  <div
                    key={c.product_id}
                    className="flex items-center gap-3 p-3 bg-background/40 ring-1 ring-border rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {c.product_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {c.unit_price_ht.toFixed(2)} € HT · TVA {c.vat_rate}%
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => updateQty(c.product_id, -1)}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-7 text-center text-sm font-medium tabular-nums">
                        {c.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => updateQty(c.product_id, 1)}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                    <div className="w-20 text-right text-sm font-semibold text-foreground tabular-nums">
                      {lineTtc.toFixed(2)} €
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => removeItem(c.product_id)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <footer className="border-t border-border p-4 space-y-3">
            <div className="space-y-1 text-sm">
              <Row label="Total HT" value={`${totals.ht.toFixed(2)} €`} />
              <Row label="TVA" value={`${totals.vat.toFixed(2)} €`} />
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-sm font-semibold text-foreground">Total TTC</span>
                <span className="text-xl font-semibold text-foreground tabular-nums">
                  {totals.ttc.toFixed(2)} €
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Paiement
                </Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {paymentMethod === "especes" ? "Reçu (€)" : "Encaissé"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={totals.ttc.toFixed(2)}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  disabled={paymentMethod !== "especes"}
                />
              </div>
            </div>

            {paymentMethod === "especes" && change > 0 && (
              <div className="flex justify-between text-sm text-brand">
                <span>Rendu monnaie</span>
                <span className="tabular-nums font-semibold">{change.toFixed(2)} €</span>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={cart.length === 0 || createSaleMut.isPending}
              onClick={() => setConfirmOpen(true)}
            >
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
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => createSaleMut.mutate()}
              disabled={createSaleMut.isPending}
            >
              Valider la vente
            </Button>
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
