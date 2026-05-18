import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Boxes,
  Users,
  Calculator,
  Settings,
  ShieldCheck,
  Shield,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LbLogo } from "./LbLogo";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const navMain = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/caisse", label: "Caisse", icon: ShoppingCart },
  { to: "/produits", label: "Produits", icon: Package },
  { to: "/ventes", label: "Ventes", icon: Receipt },
];

const navManage = [
  { to: "/stocks", label: "Stocks", icon: Boxes },
  { to: "/employes", label: "Employés", icon: Users },
  { to: "/comptabilite", label: "Comptabilité", icon: Calculator },
  { to: "/conformite", label: "Conformité", icon: ShieldCheck },
  { to: "/parametres", label: "Paramètres", icon: Settings },
];

export function AppSidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const { data: isSuperAdmin } = useQuery({
    queryKey: ["is-super-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("super_admins").select("user_id").eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
  });
  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Utilisateur";

  return (
    <aside className="fixed inset-y-0 left-0 z-20 w-64 bg-sidebar text-sidebar-foreground flex flex-col shadow-lg shadow-secondary/20">
      <div className="p-6 flex items-center gap-3">
        <LbLogo />
        <span className="text-sidebar-foreground font-semibold tracking-tight text-lg">Lb Cloud</span>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <SectionLabel>Principal</SectionLabel>
        {navMain.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            label={item.label}
            Icon={item.icon}
            active={location.pathname.startsWith(item.to)}
          />
        ))}

        <div className="pt-4">
          <SectionLabel>Gestion</SectionLabel>
          {navManage.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              label={item.label}
              Icon={item.icon}
              active={location.pathname.startsWith(item.to)}
            />
          ))}
        </div>

        {isSuperAdmin && (
          <div className="pt-4">
            <SectionLabel>Plateforme</SectionLabel>
            <NavItem
              to="/super-admin"
              label="Super Admin"
              Icon={Shield}
              active={location.pathname.startsWith("/super-admin")}
            />
          </div>
        )}
      </nav>

      <div className="p-4 mt-auto border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-2 bg-sidebar-accent/40 ring-1 ring-sidebar-border rounded-lg">
          <div className="size-9 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center text-[11px] font-semibold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
            <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">Compte actif</p>
          </div>
        </div>
        <div className="mt-3 px-2 flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-sidebar-primary" />
          <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">
            NF525 · RGPD
          </p>
        </div>
      </div>
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-widest">
      {children}
    </div>
  );
}

function NavItem({
  to,
  label,
  Icon,
  active,
}: {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={
        active
          ? "flex items-center gap-3 px-3 py-2 text-sm font-semibold text-sidebar-primary bg-sidebar-accent/60 rounded-md transition-colors shadow-sm"
          : "flex items-center gap-3 px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 rounded-md transition-colors"
      }
    >
      <Icon className={active ? "size-4 shrink-0 text-sidebar-primary" : "size-4 shrink-0 text-sidebar-foreground/70"} />
      {label}
    </Link>
  );
}
