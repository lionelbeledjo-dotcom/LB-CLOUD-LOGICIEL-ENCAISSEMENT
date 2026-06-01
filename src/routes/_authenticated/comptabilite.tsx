import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Calculator, TrendingUp, Receipt, FileText, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/use-company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { exportFEC } from "@/lib/conformite.functions";

export const Route = createFileRoute("/_authenticated/comptabilite")({
  head: () => ({ meta: [{ title: "Comptabilité — Lb Cloud" }] }),
  component: ComptabilitePage,
  errorComponent: ({ error, reset }) => (
    <div className="p-8">
      <Card>
        <CardHeader><CardTitle>Comptabilité — erreur</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button onClick={reset} size="sm">Réessayer</Button>
        </CardContent>
      </Card>
    </div>
  ),
});

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);

function ComptabilitePage() {
  const { data: company } = useActiveCompany();
  const companyId = company?.company_id;
  const [exporting, setExporting] = useState(false);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  async function handleExportFEC() {
    if (!companyId) return;
    setExporting(true);
    try {
      const result = await exportFEC({ data: { companyId, year: now.getFullYear() } });
      const blob = new Blob([result as string], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FEC_${now.getFullYear()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Fichier FEC exporté avec succès");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors de l'export FEC");
    } finally {
      setExporting(false);
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ["compta", companyId, monthStart],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("sold_at, total_ht, total_vat, total_ttc, payment_method, is_credit_note")
        .eq("company_id", companyId!)
        .gte("sold_at", monthStart);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = data ?? [];
  const totals = rows.reduce(
    (acc, r) => {
      const sign = r.is_credit_note ? -1 : 1;
      acc.ht += sign * (Number(r.total_ht) || 0);
      acc.vat += sign * (Number(r.total_vat) || 0);
      acc.ttc += sign * (Number(r.total_ttc) || 0);
      acc.byMethod[r.payment_method] = (acc.byMethod[r.payment_method] || 0) + sign * (Number(r.total_ttc) || 0);
      return acc;
    },
    { ht: 0, vat: 0, ttc: 0, byMethod: {} as Record<string, number> },
  );

  const methods = Object.entries(totals.byMethod);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-secondary flex items-center gap-2">
            <Calculator className="size-6" /> Comptabilité
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Synthèse du mois en cours — {now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}.
          </p>
        </div>
        <Button variant="outline" onClick={handleExportFEC} disabled={exporting || !companyId}>
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {exporting ? "Export en cours…" : "Exporter FEC"}
        </Button>
      </div>

      {!companyId ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          Aucune entreprise sélectionnée.
        </CardContent></Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Chiffre d'affaires HT" value={eur(totals.ht)} icon={FileText} />
            <StatCard label="TVA collectée" value={eur(totals.vat)} icon={Receipt} />
            <StatCard label="Chiffre d'affaires TTC" value={eur(totals.ttc)} icon={TrendingUp} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Encaissements par moyen de paiement</CardTitle></CardHeader>
            <CardContent>
              {methods.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Aucun encaissement enregistré ce mois-ci.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Moyen</TableHead>
                      <TableHead className="text-right">Montant TTC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {methods.map(([m, v]) => (
                      <TableRow key={m}>
                        <TableCell className="capitalize">{m}</TableCell>
                        <TableCell className="text-right font-semibold">{eur(v)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-secondary">{value}</p>
          </div>
          <div className="size-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
