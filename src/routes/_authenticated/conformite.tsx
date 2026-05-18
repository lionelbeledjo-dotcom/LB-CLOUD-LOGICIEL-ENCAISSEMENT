import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileDown, ShieldCheck, UserX, ScrollText, Archive, AlertTriangle, Filter } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/use-company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  exportFEC, monthlyVatReport, exportCustomerData, anonymizeCustomer,
} from "@/lib/conformite.functions";

export const Route = createFileRoute("/_authenticated/conformite")({
  head: () => ({ meta: [{ title: "Conformité — Lb Cloud" }] }),
  component: ConformitePage,
});

function ConformitePage() {
  const { data: company, isLoading } = useActiveCompany();
  const companyId = company?.company_id;

  if (isLoading) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  if (!companyId)
    return <div className="p-8 text-sm text-muted-foreground">Aucune entreprise active.</div>;

  return (
    <div className="max-w-[1400px] mx-auto p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Conformité légale</h1>
        <p className="text-sm text-muted-foreground">NF525 · RGPD · TVA · FEC</p>
      </header>

      <Tabs defaultValue="tva" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full">
          <TabsTrigger value="tva">TVA</TabsTrigger>
          <TabsTrigger value="fec">FEC</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
          <TabsTrigger value="archives">Archives</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="rgpd">RGPD</TabsTrigger>
        </TabsList>

        <TabsContent value="tva"><VatTab companyId={companyId} /></TabsContent>
        <TabsContent value="fec"><FECTab companyId={companyId} /></TabsContent>
        <TabsContent value="journal"><JournalTab companyId={companyId} /></TabsContent>
        <TabsContent value="archives"><ArchivesTab companyId={companyId} /></TabsContent>
        <TabsContent value="audit"><AuditTab companyId={companyId} /></TabsContent>
        <TabsContent value="rgpd"><RgpdTab companyId={companyId} /></TabsContent>
      </Tabs>
    </div>
  );
}

// -------- TVA tab --------
function VatTab({ companyId }: { companyId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const run = useServerFn(monthlyVatReport);

  const rates = useQuery({
    queryKey: ["vat-rates", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vat_rates").select("*").eq("company_id", companyId).order("rate", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const report = useQuery({
    queryKey: ["vat-report", companyId, year, month],
    queryFn: () => run({ data: { companyId, year, month } }),
  });

  return (
    <div className="space-y-6 mt-6">
      <Card title="Taux de TVA applicables">
        {rates.isLoading ? <Skeleton className="h-20" /> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {rates.data?.map(r => (
              <div key={r.id} className="rounded-lg border border-border p-4">
                <p className="text-2xl font-semibold text-foreground tabular-nums">{Number(r.rate).toFixed(2)}%</p>
                <p className="text-xs text-muted-foreground mt-1">{r.label}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Rapport TVA mensuel">
        <div className="flex gap-3 items-end mb-4">
          <div>
            <Label className="text-xs">Année</Label>
            <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-28" />
          </div>
          <div>
            <Label className="text-xs">Mois</Label>
            <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <SelectItem key={m} value={String(m)}>{String(m).padStart(2, "0")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {report.isLoading ? <Skeleton className="h-32" /> : (
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated">
              <tr>
                <Th>Taux</Th><Th>HT</Th><Th>TVA</Th><Th>TTC</Th><Th>Lignes</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report.data?.byRate.map(b => (
                <tr key={b.rate}>
                  <Td>{b.rate.toFixed(2)}%</Td>
                  <Td>{b.ht.toFixed(2)} €</Td>
                  <Td>{b.vat.toFixed(2)} €</Td>
                  <Td>{b.ttc.toFixed(2)} €</Td>
                  <Td>{b.count}</Td>
                </tr>
              ))}
              {report.data && (
                <tr className="font-semibold bg-surface-elevated/50">
                  <Td>Total</Td>
                  <Td>{report.data.totals.ht.toFixed(2)} €</Td>
                  <Td>{report.data.totals.vat.toFixed(2)} €</Td>
                  <Td>{report.data.totals.ttc.toFixed(2)} €</Td>
                  <Td>—</Td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// -------- FEC tab --------
function FECTab({ companyId }: { companyId: string }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const run = useServerFn(exportFEC);
  const mut = useMutation({
    mutationFn: () => run({ data: { companyId, year } }),
    onSuccess: (res) => {
      const blob = new Blob([res.content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = res.filename; a.click();
      URL.revokeObjectURL(url);
      toast.success(`FEC exporté — ${res.count} ventes`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-6">
      <Card title="Fichier des Écritures Comptables (FEC)">
        <p className="text-sm text-muted-foreground mb-4">
          Export annuel au format réglementaire (CGI art. A.47 A-1) — colonnes pipe-séparées, encodage UTF-8.
        </p>
        <div className="flex gap-3 items-end">
          <div>
            <Label className="text-xs">Exercice</Label>
            <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-32" />
          </div>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            <FileDown className="size-4 mr-2" />
            {mut.isPending ? "Génération…" : "Télécharger le FEC"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// -------- Journal tab --------
function JournalTab({ companyId }: { companyId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["sales-journal", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_journal").select("*").eq("company_id", companyId)
        .order("sequence_number", { ascending: false }).limit(5000);
      if (error) throw error;
      return data;
    },
  });

  const downloadCsv = () => {
    if (!data?.length) { toast.error("Journal vide"); return; }
    const headers = ["sequence_number","invoice_number","sold_at","total_ht","total_vat","total_ttc","previous_hash","current_hash"];
    const rows = data.map(j => [
      j.sequence_number, j.invoice_number, j.sold_at,
      Number(j.total_ht).toFixed(2), Number(j.total_vat).toFixed(2), Number(j.total_ttc).toFixed(2),
      j.previous_hash, j.current_hash,
    ]);
    downloadCSV(`journal_ventes_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
    toast.success(`Journal exporté — ${data.length} entrées`);
  };

  return (
    <div className="mt-6">
      <Card title="Journal des ventes (inaltérable)">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <ScrollText className="size-3" /> Chaînage cryptographique SHA-256, append-only.
          </p>
          <Button size="sm" onClick={downloadCsv} disabled={isLoading || !data?.length}>
            <FileDown className="size-4 mr-2" /> Télécharger (CSV)
          </Button>
        </div>
        {isLoading ? <Skeleton className="h-32" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-surface-elevated">
                <tr>
                  <Th>#Seq</Th><Th>Facture</Th><Th>Date</Th><Th>TTC</Th><Th>Hash</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.slice(0, 200).map(j => (
                  <tr key={j.id}>
                    <Td className="tabular-nums">{j.sequence_number}</Td>
                    <Td>{j.invoice_number}</Td>
                    <Td>{new Date(j.sold_at).toLocaleString("fr-FR")}</Td>
                    <Td>{Number(j.total_ttc).toFixed(2)} €</Td>
                    <Td className="font-mono text-[10px] text-muted-foreground">{j.current_hash.slice(0, 16)}…</Td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data && data.length > 200 && (
              <p className="text-[10px] text-muted-foreground mt-2">
                Affichage des 200 plus récentes — le CSV contient les {data.length} entrées.
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

// -------- Archives tab --------
function ArchivesTab({ companyId }: { companyId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["invoice-archives", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_archives").select("*").eq("company_id", companyId)
        .order("archived_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mt-6">
      <Card title="Archives factures (snapshots figés)">
        <p className="text-xs text-muted-foreground mb-4 flex items-center gap-2">
          <Archive className="size-3" /> Conservation 10 ans — obligation Code de commerce.
        </p>
        {isLoading ? <Skeleton className="h-32" /> : (
          <div className="space-y-2">
            {data?.map(a => (
              <details key={a.id} className="rounded border border-border bg-surface/40 p-3">
                <summary className="cursor-pointer text-sm flex items-center justify-between">
                  <span className="font-medium">{(a.payload as any)?.sale?.invoice_number}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.archived_at).toLocaleString("fr-FR")} · hash {a.hash.slice(0, 12)}…
                  </span>
                </summary>
                <pre className="mt-3 max-h-64 overflow-auto text-[10px] text-muted-foreground">
                  {JSON.stringify(a.payload, null, 2)}
                </pre>
              </details>
            ))}
            {!data?.length && <p className="text-sm text-muted-foreground">Aucune archive.</p>}
          </div>
        )}
      </Card>
    </div>
  );
}

// -------- Audit tab --------
function AuditTab({ companyId }: { companyId: string }) {
  const [filter, setFilter] = useState<string>("all");
  const { data, isLoading } = useQuery({
    queryKey: ["audit", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs").select("*").eq("company_id", companyId)
        .order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data;
    if (filter === "rgpd") return data.filter(l => l.action?.startsWith("RGPD_"));
    return data.filter(l => l.action === filter);
  }, [data, filter]);

  return (
    <div className="mt-6">
      <Card title="Historique des modifications">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              <SelectItem value="rgpd">RGPD uniquement</SelectItem>
              <SelectItem value="INSERT">Créations</SelectItem>
              <SelectItem value="UPDATE">Modifications</SelectItem>
              <SelectItem value="DELETE">Suppressions</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{filtered.length} entrée(s)</span>
        </div>
        {isLoading ? <Skeleton className="h-32" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-surface-elevated">
                <tr><Th>Date</Th><Th>Action</Th><Th>Table</Th><Th>Cible</Th><Th>Utilisateur</Th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(l => {
                  const isRgpd = l.action?.startsWith("RGPD_");
                  return (
                    <tr key={l.id} className={isRgpd ? "bg-primary/5" : ""}>
                      <Td>{new Date(l.created_at).toLocaleString("fr-FR")}</Td>
                      <Td>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          isRgpd ? "bg-primary/15 text-primary" : "bg-surface-elevated"
                        }`}>{l.action}</span>
                      </Td>
                      <Td>{l.target_table ?? "—"}</Td>
                      <Td className="font-mono text-[10px]">{l.target_id?.slice(0, 8) ?? "—"}</Td>
                      <Td className="font-mono text-[10px]">{l.user_id?.slice(0, 8) ?? "—"}</Td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr><Td className="text-muted-foreground">Aucune entrée.</Td><Td>—</Td><Td>—</Td><Td>—</Td><Td>—</Td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// -------- RGPD tab --------
function RgpdTab({ companyId }: { companyId: string }) {
  const [search, setSearch] = useState("");
  const [toAnon, setToAnon] = useState<{ id: string; name: string } | null>(null);
  const [pending, setPending] = useState(false);
  const qc = useQueryClient();
  const exportFn = useServerFn(exportCustomerData);
  const anonFn = useServerFn(anonymizeCustomer);

  const customers = useQuery({
    queryKey: ["rgpd-customers", companyId, search],
    queryFn: async () => {
      let q = supabase.from("customers").select("id, full_name, email, phone, is_active")
        .eq("company_id", companyId).order("full_name").limit(50);
      if (search) q = q.ilike("full_name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const doExport = async (id: string, name: string) => {
    try {
      const res = await exportFn({ data: { customerId: id } });
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `rgpd_${name.replace(/\W+/g, "_")}.json`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Export RGPD téléchargé — action consignée à l'audit");
      qc.invalidateQueries({ queryKey: ["audit", companyId] });
    } catch (e: any) { toast.error(e.message); }
  };

  const confirmAnon = async () => {
    if (!toAnon) return;
    setPending(true);
    try {
      await anonFn({ data: { customerId: toAnon.id } });
      toast.success(`${toAnon.name} anonymisé — action consignée à l'audit`);
      setToAnon(null);
      customers.refetch();
      qc.invalidateQueries({ queryKey: ["audit", companyId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <Card title="Droits RGPD — Article 17 & 20">
        <p className="text-xs text-muted-foreground mb-4 flex items-center gap-2">
          <ShieldCheck className="size-3" />
          Export portable (JSON) ou anonymisation. Chaque action est journalisée dans l'onglet Audit.
          Les données comptables liées sont conservées pour respecter la NF525.
        </p>
        <Input
          placeholder="Rechercher un client…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="max-w-md mb-4"
        />
        {customers.isLoading ? <Skeleton className="h-32" /> : (
          <div className="space-y-2">
            {customers.data?.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {c.full_name}
                    {!c.is_active && <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">anonymisé</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{c.email ?? "—"} · {c.phone ?? "—"}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => doExport(c.id, c.full_name)}>
                    <Download className="size-3 mr-1" /> Exporter
                  </Button>
                  <Button
                    size="sm" variant="destructive"
                    onClick={() => setToAnon({ id: c.id, name: c.full_name })}
                    disabled={!c.is_active}
                  >
                    <UserX className="size-3 mr-1" /> Anonymiser
                  </Button>
                </div>
              </div>
            ))}
            {!customers.data?.length && <p className="text-sm text-muted-foreground">Aucun client.</p>}
          </div>
        )}
      </Card>

      <AlertDialog open={!!toAnon} onOpenChange={(o) => !o && !pending && setToAnon(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Anonymiser définitivement ce client ?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Le client <strong className="text-foreground">{toAnon?.name}</strong> sera anonymisé
                  conformément à l'article 17 du RGPD :
                </p>
                <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
                  <li>Nom, email, téléphone et adresse effacés</li>
                  <li>Compte désactivé</li>
                  <li>Factures conservées 10 ans (obligation légale NF525)</li>
                  <li>Action tracée dans l'historique d'audit</li>
                </ul>
                <p className="text-destructive font-medium pt-2">Cette action est irréversible.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmAnon(); }}
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending ? "Anonymisation…" : "Confirmer l'anonymisation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// -------- helpers --------
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface/60 p-6">
      <h2 className="text-base font-semibold text-foreground mb-4">{title}</h2>
      {children}
    </section>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 text-sm text-foreground ${className}`}>{children}</td>;
}
