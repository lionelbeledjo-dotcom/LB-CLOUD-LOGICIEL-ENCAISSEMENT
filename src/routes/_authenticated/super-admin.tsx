import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Building2, CreditCard, ScrollText, LayoutDashboard, KeyRound, AlertTriangle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/super-admin")({
  head: () => ({ meta: [{ title: "Super Admin — Lb Cloud" }, { name: "robots", content: "noindex" }] }),
  component: SuperAdminLayout,
});

function SuperAdminLayout() {
  const loc = useLocation();
  const navigate = useNavigate();
  const [aal, setAal] = useState<{ current?: string; next?: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-self"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { isSuper: false, hasNone: false };
      const { data: rows } = await supabase.from("super_admins").select("user_id");
      const isSuper = (rows ?? []).some((r: any) => r.user_id === u.user!.id);
      // Detect if "no super admin exists yet" so we can offer bootstrap.
      const hasNone = (rows ?? []).length === 0;
      return { isSuper, hasNone, userId: u.user.id };
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        setAal({ current: data?.currentLevel ?? undefined, next: data?.nextLevel ?? undefined });
      } catch {
        setAal({});
      }
    })();
  }, []);

  if (isLoading || aal === null) {
    return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
  }

  if (!data?.isSuper) {
    if (data?.hasNone) {
      return <Bootstrap userId={data.userId!} />;
    }
    return (
      <div className="p-10 max-w-xl mx-auto text-center">
        <Shield className="size-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-semibold">Accès refusé</h1>
        <p className="text-muted-foreground mt-2">Espace réservé aux super administrateurs Lb Cloud.</p>
      </div>
    );
  }

  // 2FA obligatoire : si AAL2 non atteint, on force la mise en place / vérification.
  const onMfaPage = loc.pathname.startsWith("/super-admin/mfa");
  if (aal.current !== "aal2" && !onMfaPage) {
    return (
      <div className="p-10 max-w-xl mx-auto text-center">
        <KeyRound className="size-12 text-amber-400 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold">2FA requise</h1>
        <p className="text-muted-foreground mt-2">
          L'accès au super admin nécessite la double authentification (TOTP).
          {aal.next === "aal2"
            ? " Veuillez vérifier votre code à 6 chiffres."
            : " Veuillez activer votre application d'authentification."}
        </p>
        <Button className="mt-6" onClick={() => navigate({ to: "/super-admin/mfa" })}>
          {aal.next === "aal2" ? "Vérifier le code" : "Configurer la 2FA"}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <header className="mb-6 flex items-center gap-3">
        <Shield className="size-7 text-brand" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Super Admin</h1>
          <p className="text-sm text-muted-foreground">
            Console globale Lb Cloud · accès sécurisé 2FA
          </p>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 mb-6 rounded-xl ring-1 ring-border bg-surface/60 p-2">
        <Tab to="/super-admin" label="Vue globale" icon={LayoutDashboard} exact />
        <Tab to="/super-admin/entreprises" label="Entreprises" icon={Building2} />
        <Tab to="/super-admin/abonnements" label="Abonnements" icon={CreditCard} />
        <Tab to="/super-admin/logs" label="Logs globaux" icon={ScrollText} />
        <Tab to="/super-admin/admins" label="Super admins" icon={ShieldCheck} />
        <Tab to="/super-admin/mfa" label="2FA" icon={KeyRound} />
      </nav>

      <Outlet />
    </div>
  );
}

function Tab({ to, label, icon: Icon, exact }: { to: string; label: string; icon: any; exact?: boolean }) {
  const loc = useLocation();
  const active = exact ? loc.pathname === to : loc.pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
        active ? "bg-surface ring-1 ring-brand/40 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-surface/40"
      }`}
    >
      <Icon className="size-4" /> {label}
    </Link>
  );
}

function Bootstrap({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const claim = async () => {
    setBusy(true); setErr(null);
    const { error } = await (supabase.rpc as any)("super_admin_grant", { _user_id: userId });
    if (error) { setErr(error.message); setBusy(false); return; }
    window.location.reload();
  };
  return (
    <div className="p-10 max-w-xl mx-auto text-center">
      <AlertTriangle className="size-12 text-amber-400 mx-auto mb-4" />
      <h1 className="text-2xl font-semibold">Aucun super administrateur</h1>
      <p className="text-muted-foreground mt-2">
        Aucun super admin n'est encore défini. Vous pouvez vous auto-promouvoir
        en tant que premier super administrateur Lb Cloud.
      </p>
      {err && <p className="text-destructive text-sm mt-3">{err}</p>}
      <Button className="mt-6" disabled={busy} onClick={claim}>
        {busy ? "Promotion…" : "Devenir super admin"}
      </Button>
    </div>
  );
}
