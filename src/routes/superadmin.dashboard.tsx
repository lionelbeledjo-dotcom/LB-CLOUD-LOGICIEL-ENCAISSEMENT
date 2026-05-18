import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield, Building2, CreditCard, ScrollText, KeyRound, ShieldCheck,
  Loader2, LogOut, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/superadmin/dashboard")({
  head: () => ({
    meta: [
      { title: "Super Admin — Tableau de bord" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuperAdminDashboardPage,
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

function SuperAdminDashboardPage() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  // Guard: must be signed-in AND super admin
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { navigate({ to: "/superadmin/login" }); return; }
      const { data: rows } = await supabase
        .from("super_admins").select("user_id").eq("user_id", u.user.id).maybeSingle();
      if (!rows) { await supabase.auth.signOut(); navigate({ to: "/superadmin/login" }); return; }
      setChecked(true);
    })();
  }, [navigate]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["super-admin-global-stats"],
    enabled: checked,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("super_admin_global_stats");
      if (error) throw error;
      return data as Record<string, any>;
    },
  });

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/superadmin/login" });
  }

  if (!checked) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tiles = [
    { to: "/super-admin", icon: Shield, label: "Vue d'ensemble", desc: "Statistiques globales Lb Cloud" },
    { to: "/super-admin/entreprises", icon: Building2, label: "Entreprises", desc: "Créer, suspendre, gérer toutes les entreprises" },
    { to: "/super-admin/abonnements", icon: CreditCard, label: "Abonnements", desc: "Plans et facturation" },
    { to: "/super-admin/admins", icon: KeyRound, label: "Administrateurs", desc: "Promotions et accès super admin" },
    { to: "/superadmin/mfa", icon: ShieldCheck, label: "MFA / Sécurité", desc: "Activer la double authentification" },
    { to: "/super-admin/logs", icon: ScrollText, label: "Journaux d'audit", desc: "Suivi complet des actions" },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 grid place-items-center">
              <Shield className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">Super Admin Lb Cloud</h1>
              <p className="text-xs text-muted-foreground">Accès global — indépendant des entreprises</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="size-4 mr-2" /> Déconnexion
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Entreprises" value={isLoading ? "…" : stats?.companies_total ?? 0} />
          <StatCard label="Actives" value={isLoading ? "…" : stats?.companies_active ?? 0} />
          <StatCard label="Suspendues" value={isLoading ? "…" : stats?.companies_suspended ?? 0} />
          <StatCard label="Utilisateurs" value={isLoading ? "…" : stats?.users_total ?? 0} />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Modules d'administration</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiles.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="group block bg-card ring-1 ring-border rounded-xl p-5 hover:ring-primary/40 hover:shadow-md transition"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-9 rounded-lg bg-secondary/10 grid place-items-center group-hover:bg-secondary/20 transition">
                    <t.icon className="size-4 text-secondary" />
                  </div>
                  <h3 className="font-medium text-foreground">{t.label}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
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
