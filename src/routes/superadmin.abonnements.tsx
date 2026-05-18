import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Shield, CreditCard, Search, ArrowLeft, AlertTriangle, Loader2,
  FileText, Plus, CheckCircle2, Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/superadmin/abonnements")({
  head: () => ({
    meta: [
      { title: "Super Admin — Abonnements & facturation" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuperAdminBillingPage,
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="max-w-md bg-card ring-1 ring-border rounded-xl p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto size-10 text-destructive mb-3" />
        <p className="text-sm text-muted-foreground mb-4">{error?.message}</p>
        <Button onClick={reset}>Réessayer</Button>
      </div>
    </div>
  ),
});

const PLANS = ["essai", "standard", "premium", "entreprise"] as const;
const CYCLES = [
  { value: "monthly", label: "Mensuel" },
  { value: "yearly", label: "Annuel" },
] as const;
const STATUSES = [
  { value: "trial", label: "Essai", tone: "bg-blue-500/10 text-blue-700 ring-blue-500/30" },
  { value: "paid", label: "Payé", tone: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30" },
  { value: "pending", label: "En attente", tone: "bg-amber-500/10 text-amber-700 ring-amber-500/30" },
  { value: "overdue", label: "En retard", tone: "bg-red-500/10 text-red-700 ring-red-500/30" },
  { value: "cancelled", label: "Annulé", tone: "bg-muted text-muted-foreground ring-border" },
] as const;

const fmtEUR = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n ?? 0);

function SuperAdminBillingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [checked, setChecked] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);

  // Guard super admin
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { navigate({ to: "/superadmin/login" }); return; }
      const { data: row } = await supabase
        .from("super_admins").select("user_id").eq("user_id", u.user.id).maybeSingle();
      if (!row) { await supabase.auth.signOut(); navigate({ to: "/superadmin/login" }); return; }
      setChecked(true);
    })();
  }, [navigate]);

  const { data: plans } = useQuery({
    queryKey: ["sub-plans-catalog"],
    enabled: checked,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans_catalog")
        .select("*")
        .order("monthly_price");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["sa-billing-companies"],
    enabled: checked,
    queryFn: async () => {
      const [{ data: companies, error: e1 }, { data: billing, error: e2 }] = await Promise.all([
        supabase.from("companies")
          .select("id, name, siret, is_active, subscription_plan, created_at")
          .order("name"),
        supabase.from("company_billing").select("*"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const map = new Map((billing ?? []).map((b: any) => [b.company_id, b]));
      return (companies ?? []).map((c: any) => ({ ...c, billing: map.get(c.id) ?? null }));
    },
  });

  const setPlan = useMutation({
    mutationFn: async ({ id, plan }: { id: string; plan: string }) => {
      const { error } = await (supabase.rpc as any)("super_admin_set_subscription_plan", {
        _company_id: id, _plan: plan,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan mis à jour");
      qc.invalidateQueries({ queryKey: ["sa-billing-companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const list = rows ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c: any) =>
      c.name.toLowerCase().includes(q) || (c.siret ?? "").includes(q)
    );
  }, [rows, search]);

  const revenue = useMemo(() => {
    if (!rows || !plans) return 0;
    const planMap = new Map(plans.map((p: any) => [p.plan, p]));
    return rows.reduce((acc: number, r: any) => {
      const p: any = planMap.get(r.subscription_plan);
      if (!p) return acc;
      const cycle = r.billing?.billing_cycle ?? "monthly";
      const monthly = cycle === "yearly" ? Number(p.yearly_price) / 12 : Number(p.monthly_price);
      return acc + (r.is_active ? monthly : 0);
    }, 0);
  }, [rows, plans]);

  if (!checked) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 grid place-items-center">
              <Shield className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">
                Abonnements & facturation
              </h1>
              <p className="text-xs text-muted-foreground">
                Gérez les plans et la facturation de toutes les entreprises
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/superadmin/dashboard">
              <ArrowLeft className="size-4 mr-2" /> Retour
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Entreprises" value={rows?.length ?? 0} />
          <StatCard label="Actives" value={(rows ?? []).filter((r: any) => r.is_active).length} />
          <StatCard label="MRR estimé" value={fmtEUR(revenue)} />
          <StatCard
            label="En retard"
            value={(rows ?? []).filter((r: any) => r.billing?.payment_status === "overdue").length}
          />
        </section>

        {/* Catalogue */}
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Catalogue de plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {(plans ?? []).map((p: any) => (
              <div key={p.plan} className="bg-card ring-1 ring-border rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground capitalize">{p.label}</h3>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {p.plan}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 mb-3 min-h-[32px]">
                  {p.description}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold text-foreground tabular-nums">
                    {fmtEUR(Number(p.monthly_price))}
                  </span>
                  <span className="text-xs text-muted-foreground">/mois</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  ou {fmtEUR(Number(p.yearly_price))} /an
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Table */}
        <section className="rounded-xl ring-1 ring-border bg-card shadow-sm overflow-hidden">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <CreditCard className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Entreprises</h2>
            <div className="ml-auto flex items-center gap-2">
              <Search className="size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 max-w-xs"
                placeholder="Rechercher…"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2">Entreprise</th>
                    <th className="text-left px-3 py-2">État</th>
                    <th className="text-left px-3 py-2">Plan</th>
                    <th className="text-left px-3 py-2">Cycle</th>
                    <th className="text-left px-3 py-2">Prochaine échéance</th>
                    <th className="text-left px-3 py-2">Statut paiement</th>
                    <th className="text-right px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c: any) => {
                    const stat = STATUSES.find((s) => s.value === c.billing?.payment_status);
                    return (
                      <tr key={c.id} className="border-t border-border/60 hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <p className="font-medium text-foreground">{c.name}</p>
                          <p className="text-[11px] font-mono text-muted-foreground">
                            {c.siret ?? "—"}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          {c.is_active ? (
                            <span className="text-xs px-2 py-0.5 rounded ring-1 bg-emerald-500/10 text-emerald-700 ring-emerald-500/30">
                              Active
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded ring-1 bg-amber-500/10 text-amber-700 ring-amber-500/30">
                              Suspendue
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 w-[180px]">
                          <Select
                            value={c.subscription_plan}
                            onValueChange={(v) => setPlan.mutate({ id: c.id, plan: v })}
                            disabled={setPlan.isPending}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PLANS.map((p) => (
                                <SelectItem key={p} value={p} className="capitalize">
                                  {p}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {CYCLES.find((x) => x.value === c.billing?.billing_cycle)?.label ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {c.billing?.next_billing_at
                            ? new Date(c.billing.next_billing_at).toLocaleDateString("fr-FR")
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {stat ? (
                            <span className={`text-xs px-2 py-0.5 rounded ring-1 ${stat.tone}`}>
                              {stat.label}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button size="sm" variant="outline" onClick={() => setSelected(c)}>
                            <Pencil className="size-3.5 mr-1" /> Gérer
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                        Aucune entreprise.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>

      {selected && (
        <BillingDialog
          company={selected}
          plans={plans ?? []}
          onClose={() => setSelected(null)}
          onRefresh={() => {
            qc.invalidateQueries({ queryKey: ["sa-billing-companies"] });
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card ring-1 ring-border rounded-xl p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground tabular-nums mt-1">{value}</p>
    </div>
  );
}

function BillingDialog({
  company, plans, onClose, onRefresh,
}: { company: any; plans: any[]; onClose: () => void; onRefresh: () => void }) {
  const qc = useQueryClient();
  const billing = company.billing ?? {};
  const [cycle, setCycle] = useState<string>(billing.billing_cycle ?? "monthly");
  const [status, setStatus] = useState<string>(billing.payment_status ?? "pending");
  const [method, setMethod] = useState<string>(billing.payment_method ?? "");
  const [nextAt, setNextAt] = useState<string>(
    billing.next_billing_at ? String(billing.next_billing_at).slice(0, 10) : ""
  );
  const [notes, setNotes] = useState<string>(billing.notes ?? "");

  const planInfo = plans.find((p) => p.plan === company.subscription_plan);
  const defaultAmount = planInfo
    ? cycle === "yearly" ? Number(planInfo.yearly_price) : Number(planInfo.monthly_price)
    : 0;

  const { data: invoices, refetch: refetchInvoices } = useQuery({
    queryKey: ["sa-sub-invoices", company.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_invoices")
        .select("*")
        .eq("company_id", company.id)
        .order("issued_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
  });

  const saveBilling = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.rpc as any)("super_admin_upsert_billing", {
        _company_id: company.id,
        _billing_cycle: cycle,
        _next_billing_at: nextAt ? new Date(nextAt).toISOString() : null,
        _payment_status: status,
        _payment_method: method || null,
        _notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Facturation enregistrée");
      onRefresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createInvoice = useMutation({
    mutationFn: async () => {
      const start = new Date();
      const end = new Date(start);
      if (cycle === "yearly") end.setFullYear(end.getFullYear() + 1);
      else end.setMonth(end.getMonth() + 1);

      const { error } = await (supabase.rpc as any)("super_admin_create_subscription_invoice", {
        _company_id: company.id,
        _plan: company.subscription_plan,
        _billing_cycle: cycle,
        _period_start: start.toISOString().slice(0, 10),
        _period_end: end.toISOString().slice(0, 10),
        _amount_ht: defaultAmount,
        _vat_rate: 20,
        _status: "issued",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Facture créée");
      refetchInvoices();
      qc.invalidateQueries({ queryKey: ["sa-sub-invoices", company.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.rpc as any)("super_admin_mark_invoice_paid", {
        _invoice_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Facture marquée payée");
      refetchInvoices();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="size-4 text-primary" />
            {company.name} — facturation
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 py-2">
          <div className="space-y-3">
            <div>
              <Label>Cycle</Label>
              <Select value={cycle} onValueChange={setCycle}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CYCLES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut de paiement</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prochaine échéance</Label>
              <Input type="date" value={nextAt} onChange={(e) => setNextAt(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label>Mode de paiement</Label>
              <Input
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                placeholder="Carte, virement, SEPA…"
                className="h-9"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes internes…"
                rows={3}
              />
            </div>
            <Button
              onClick={() => saveBilling.mutate()}
              disabled={saveBilling.isPending}
              className="w-full"
            >
              {saveBilling.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              Enregistrer la facturation
            </Button>
          </div>

          <div className="space-y-3">
            <div className="rounded-md bg-muted/30 p-3 text-xs space-y-1">
              <p className="text-muted-foreground">Plan actuel</p>
              <p className="font-semibold capitalize text-foreground">
                {company.subscription_plan} — {fmtEUR(defaultAmount)}{" "}
                <span className="text-muted-foreground">
                  ({cycle === "yearly" ? "annuel" : "mensuel"})
                </span>
              </p>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="size-4" /> Factures récentes
              </h3>
              <Button size="sm" variant="outline" onClick={() => createInvoice.mutate()}
                disabled={createInvoice.isPending}>
                <Plus className="size-3.5 mr-1" /> Nouvelle facture
              </Button>
            </div>

            <div className="rounded-md ring-1 ring-border max-h-72 overflow-y-auto">
              {(invoices ?? []).length === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  Aucune facture pour le moment.
                </p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-2 py-1.5">N°</th>
                      <th className="text-left px-2 py-1.5">Période</th>
                      <th className="text-right px-2 py-1.5">TTC</th>
                      <th className="text-left px-2 py-1.5">Statut</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoices ?? []).map((inv: any) => {
                      const st = STATUSES.find((s) => s.value === inv.status);
                      return (
                        <tr key={inv.id} className="border-t border-border/60">
                          <td className="px-2 py-1.5 font-mono">{inv.invoice_number}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">
                            {new Date(inv.period_start).toLocaleDateString("fr-FR")} →{" "}
                            {new Date(inv.period_end).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">
                            {fmtEUR(Number(inv.amount_ttc))}
                          </td>
                          <td className="px-2 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded ring-1 text-[10px] ${
                              st?.tone ?? "ring-border text-muted-foreground"
                            }`}>
                              {st?.label ?? inv.status}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {inv.status !== "paid" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                onClick={() => markPaid.mutate(inv.id)}
                                title="Marquer payée"
                              >
                                <CheckCircle2 className="size-4 text-emerald-600" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
