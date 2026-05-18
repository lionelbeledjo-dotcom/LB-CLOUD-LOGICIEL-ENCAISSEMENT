import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Plus, Search, Pencil, Trash2, AlertTriangle, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/use-company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/produits")({
  head: () => ({ meta: [{ title: "Produits — Lb Cloud" }] }),
  component: ProductsPage,
});

type Product = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  purchase_price: number;
  sale_price: number;
  vat_rate: number;
  stock_quantity: number;
  stock_alert_threshold: number;
  unit: string;
  category: string | null;
  is_active: boolean;
};

const VAT_RATES = [
  { value: "20", label: "20% — Normal" },
  { value: "10", label: "10% — Restauration" },
  { value: "5.5", label: "5,5% — Alimentaire" },
  { value: "2.1", label: "2,1% — Spécial" },
  { value: "0", label: "0% — Exonéré" },
];

const productSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(200),
  sku: z.string().trim().max(50).optional().or(z.literal("")),
  barcode: z.string().trim().max(50).optional().or(z.literal("")),
  category: z.string().trim().max(100).optional().or(z.literal("")),
  unit: z.string().trim().min(1).max(30),
  purchase_price: z.coerce.number().min(0),
  sale_price: z.coerce.number().min(0),
  vat_rate: z.coerce.number().min(0).max(100),
  stock_quantity: z.coerce.number(),
  stock_alert_threshold: z.coerce.number().min(0),
});

function ProductsPage() {
  const { data: membership, isLoading: loadingCompany } = useActiveCompany();
  const companyId = membership?.company_id;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q),
    );
  }, [products, search]);

  const stats = useMemo(() => {
    const list = products ?? [];
    const lowStock = list.filter(
      (p) => p.stock_quantity <= p.stock_alert_threshold,
    );
    const value = list.reduce(
      (s, p) => s + Number(p.sale_price) * Number(p.stock_quantity),
      0,
    );
    return { total: list.length, lowStock: lowStock.length, value };
  }, [products]);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products", companyId] });
      toast.success("Produit supprimé");
      setToDelete(null);
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
          <Package className="mx-auto size-10 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground">
            Aucune entreprise active
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Vous devez appartenir à une entreprise pour gérer le catalogue produits.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Catalogue Produits</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez votre catalogue, stocks, TVA et seuils d'alerte
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="size-4" /> Nouveau produit
        </Button>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Produits" value={String(stats.total)} />
        <StatCard
          label="Alertes stock"
          value={String(stats.lowStock)}
          warning={stats.lowStock > 0}
        />
        <StatCard
          label="Valeur stock"
          value={stats.value.toLocaleString("fr-FR", {
            style: "currency",
            currency: "EUR",
          })}
        />
      </section>

      <div className="bg-surface/60 ring-1 ring-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, SKU, code-barres…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto size-10 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              {search ? "Aucun produit ne correspond à la recherche." : "Aucun produit. Créez-en un pour commencer."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-background/40">
                <tr>
                  <Th>Produit</Th>
                  <Th>SKU / Code-barres</Th>
                  <Th className="text-right">Prix HT</Th>
                  <Th className="text-right">TVA</Th>
                  <Th className="text-right">Stock</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => {
                  const low = Number(p.stock_quantity) <= Number(p.stock_alert_threshold);
                  return (
                    <tr key={p.id} className="hover:bg-surface-elevated/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground">{p.name}</div>
                        {p.category && (
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                            {p.category}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground tabular-nums">
                        <div>{p.sku || "—"}</div>
                        <div className="opacity-70">{p.barcode || "—"}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-foreground tabular-nums">
                        {Number(p.sale_price).toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-muted-foreground tabular-nums">
                        {Number(p.vat_rate).toString().replace(".", ",")}%
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div
                          className={
                            low
                              ? "inline-flex items-center gap-1.5 text-sm font-medium text-amber-400 tabular-nums"
                              : "text-sm text-foreground tabular-nums"
                          }
                        >
                          {low && <AlertTriangle className="size-3.5" />}
                          {Number(p.stock_quantity)} {p.unit}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          seuil {Number(p.stock_alert_threshold)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditing(p);
                              setOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setToDelete(p)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductDialog
        open={open}
        onOpenChange={setOpen}
        product={editing}
        companyId={companyId}
        onSaved={() => qc.invalidateQueries({ queryKey: ["products", companyId] })}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              "{toDelete?.name}" sera définitivement supprimé du catalogue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMut.mutate(toDelete.id)}
              className="bg-destructive text-destructive-foreground"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  warning,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="bg-surface/60 ring-1 ring-border p-5 rounded-xl">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
        {label}
      </span>
      <div
        className={
          warning
            ? "text-2xl font-semibold text-amber-400 tabular-nums mt-1"
            : "text-2xl font-semibold text-foreground tabular-nums mt-1"
        }
      >
        {value}
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-6 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest ${className}`}
    >
      {children}
    </th>
  );
}

function ProductDialog({
  open,
  onOpenChange,
  product,
  companyId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product: Product | null;
  companyId: string;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const raw = Object.fromEntries(form.entries());
    const parsed = productSchema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Données invalides");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...parsed.data,
        sku: parsed.data.sku || null,
        barcode: parsed.data.barcode || null,
        category: parsed.data.category || null,
        company_id: companyId,
      };
      if (product) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", product.id);
        if (error) throw error;
        toast.success("Produit mis à jour");
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        toast.success("Produit créé");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
          <DialogDescription>
            Renseignez les informations du produit. Les champs marqués sont obligatoires.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" key={product?.id ?? "new"}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nom *" name="name" defaultValue={product?.name ?? ""} required />
            <Field label="Catégorie" name="category" defaultValue={product?.category ?? ""} />
            <Field label="SKU" name="sku" defaultValue={product?.sku ?? ""} />
            <Field label="Code-barres" name="barcode" defaultValue={product?.barcode ?? ""} />

            <Field
              label="Prix d'achat HT (€)"
              name="purchase_price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.purchase_price ?? 0}
            />
            <Field
              label="Prix de vente HT (€) *"
              name="sale_price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.sale_price ?? 0}
              required
            />

            <div className="space-y-2">
              <Label>Taux TVA *</Label>
              <Select name="vat_rate" defaultValue={String(product?.vat_rate ?? "20")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VAT_RATES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Field
              label="Unité"
              name="unit"
              defaultValue={product?.unit ?? "piece"}
              required
            />

            <Field
              label="Stock actuel"
              name="stock_quantity"
              type="number"
              step="0.01"
              defaultValue={product?.stock_quantity ?? 0}
            />
            <Field
              label="Seuil d'alerte"
              name="stock_alert_threshold"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.stock_alert_threshold ?? 0}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement…" : product ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}
