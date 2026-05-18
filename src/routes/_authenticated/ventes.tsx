import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Receipt, ShoppingCart, TrendingUp, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/use-company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/ventes")({
  head: () => ({ meta: [{ title: "Ventes — Lb Cloud" }] }),
  component: VentesPage,
  errorComponent: ({ error, reset }) => (
    <ModuleError title="Ventes" message={error.message} reset={reset} />
  ),
});

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);

function ModuleError({ title, message, reset }: { title: string; message: string; reset: () => void }) {
  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>{title} — erreur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{message}</p>
          <Button onClick={reset} size="sm">Réessayer</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function VentesPage() {
  const { data: company } = useActiveCompany();
  const companyId = company?.company_id;

  const { data, isLoading } = useQuery({
    queryKey: ["ventes-list", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, invoice_number, sold_at, total_ttc, total_ht, total_vat, payment_method, status, is_credit_note")
        .eq("company_id", companyId!)
        .order("sold_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const sales = data ?? [];
  const totals = sales.reduce(
    (acc, s) => {
      acc.ttc += Number(s.total_ttc) || 0;
      acc.ht += Number(s.total_ht) || 0;
      acc.vat += Number(s.total_vat) || 0;
      return acc;
    },
    { ttc: 0, ht: 0, vat: 0 },
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-secondary flex items-center gap-2">
            <Receipt className="size-6" /> Ventes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Historique des tickets et factures émises.</p>
        </div>
        <Button asChild>
          <Link to="/caisse"><ShoppingCart className="size-4" /> Nouvelle vente</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Chiffre d'affaires TTC" value={eur(totals.ttc)} icon={TrendingUp} />
        <StatCard label="Total HT" value={eur(totals.ht)} icon={FileText} />
        <StatCard label="TVA collectée" value={eur(totals.vat)} icon={Receipt} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dernières ventes</CardTitle>
        </CardHeader>
        <CardContent>
          {!companyId ? (
            <EmptyState message="Aucune entreprise sélectionnée." />
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : sales.length === 0 ? (
            <EmptyState message="Aucune vente enregistrée pour le moment." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Total TTC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.invoice_number}</TableCell>
                    <TableCell>{new Date(s.sold_at).toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="capitalize">{s.payment_method}</TableCell>
                    <TableCell>
                      {s.is_credit_note ? (
                        <Badge variant="destructive">Avoir</Badge>
                      ) : (
                        <Badge variant="secondary">{s.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{eur(Number(s.total_ttc))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
