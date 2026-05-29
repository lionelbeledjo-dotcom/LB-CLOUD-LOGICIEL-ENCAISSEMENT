import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Building2,
  CreditCard,
  ScrollText,
  LayoutDashboard,
  KeyRound,
  AlertTriangle,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/super-admin")({
  head: () => ({ meta: [{ title: "Super Admin — Lb Cloud" }, { name: "robots", content: "noindex" }] }),
  component: SuperAdminLayout,
});

/* ---------- Navigation structure ---------- */
interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  disabled?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "PILOTAGE",
    items: [
      { to: "/super-admin", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
      { to: "/super-admin/entreprises", label: "Entreprises", icon: Building2 },
      { to: "/super-admin/admins", label: "Utilisateurs", icon: Users },
      { to: "/super-admin/crm", label: "CRM (Prospects)", icon: Users },
    ],
  },
  {
    title: "MONÉTISATION",
    items: [
      { to: "/super-admin/abonnements", label: "Abonnements & Plans", icon: CreditCard },
      { to: "/super-admin/abonnements", label: "Paiements", icon: Wallet },
      { to: "/super-admin/abonnements", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "PLATEFORME",
    items: [
      { to: "/super-admin/logs", label: "Sécurité & Logs", icon: ScrollText },
      { to: "/super-admin/logs", label: "Paramètres", icon: Settings },
      { to: "/super-admin/mfa", label: "2FA", icon: KeyRound },
    ],
  },
];

/* ---------- Layout component ---------- */
function SuperAdminLayout() {
  const loc = useLocation();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-self"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { isSuper: false, hasNone: false };
      setUserEmail(u.user.email ?? null);
      const { data: rows } = await supabase.from("super_admins").select("user_id");
      const isSuper = (rows ?? []).some((r: any) => r.user_id === u.user!.id);
      const hasNone = (rows ?? []).length === 0;
      return { isSuper, hasNone, userId: u.user.id };
    },
  });

  if (isLoading) {
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 w-72 bg-[#1a2332] text-white flex flex-col shadow-2xl">
        {/* Logo section */}
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center">
              <Shield className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">LB CLOUD</h1>
              <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                Console Propriétaire
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <h2 className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {section.title}
              </h2>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarItem key={item.label} item={item} currentPath={loc.pathname} />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white uppercase">
              {userEmail ? userEmail.slice(0, 2) : "??"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {userEmail ?? "Super Admin"}
              </p>
              <p className="text-[11px] text-slate-400 truncate">Propriétaire</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
              title="Déconnexion"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-72 flex-1 overflow-y-auto bg-background">
        <div className="p-8 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

/* ---------- Sidebar nav item ---------- */
function SidebarItem({ item, currentPath }: { item: NavItem; currentPath: string }) {
  const Icon = item.icon;

  const active = item.exact
    ? currentPath === item.to || currentPath === item.to + "/"
    : currentPath.startsWith(item.to + "/") || currentPath === item.to;

  if (item.disabled) {
    return (
      <li>
        <span className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 cursor-not-allowed select-none">
          <Icon className="size-4" />
          <span>{item.label}</span>
          <span className="ml-auto text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">Bientôt</span>
        </span>
      </li>
    );
  }

  return (
    <li>
      <Link
        to={item.to}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
          active
            ? "bg-white/10 text-white shadow-sm shadow-white/5"
            : "text-slate-300 hover:bg-white/5 hover:text-white"
        }`}
      >
        <Icon className={`size-4 ${active ? "text-blue-400" : ""}`} />
        <span>{item.label}</span>
        {active && <ChevronRight className="size-3.5 ml-auto text-blue-400" />}
      </Link>
    </li>
  );
}

/* ---------- Bootstrap (first-time setup) ---------- */
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
