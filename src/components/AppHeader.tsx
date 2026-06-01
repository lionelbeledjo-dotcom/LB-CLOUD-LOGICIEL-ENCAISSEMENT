import { Bell, Plus, Search, LogOut, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCompanyContext } from "@/hooks/use-company";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

const mockNotifications = [
  { id: 1, title: "Stock faible", message: "Pain au Chocolat : seuil min atteint (5 unités)", time: "il y a 12 min", unread: true },
  { id: 2, title: "Paiement reçu", message: "Facture F-202605-000042 réglée par CB", time: "il y a 38 min", unread: true },
  { id: 3, title: "Nouvelle session", message: "Sophie L. a ouvert la Caisse Principale", time: "il y a 1h", unread: false },
  { id: 4, title: "Mise à jour NF525", message: "Scellement quotidien effectué avec succès", time: "il y a 2h", unread: false },
];

export function AppHeader() {
  const { signOut } = useAuth();
  const { companies, activeCompany, switchCompany } = useCompanyContext();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const handleNewSale = () => {
    navigate({ to: "/caisse" });
  };

  const unreadCount = mockNotifications.filter((n) => n.unread).length;

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10 shadow-sm shadow-secondary/5">
      <div className="h-full px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/60 border border-border rounded-md">
            <span className="size-2 rounded-full bg-secondary animate-pulse" />
            <select
              className="bg-transparent text-sm font-medium text-foreground border-none focus:ring-0 cursor-pointer outline-none"
              aria-label="Sélection de l'entreprise"
              value={activeCompany?.id ?? ""}
              onChange={(e) => switchCompany(e.target.value)}
            >
              {companies.length === 0 ? (
                <option>Aucune entreprise</option>
              ) : (
                companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))
              )}
            </select>
          </div>

          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="bg-background border border-border rounded-md pl-10 pr-4 py-1.5 text-sm w-64 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 text-muted-foreground hover:text-secondary transition-colors"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 size-4 bg-primary rounded-full ring-2 ring-card flex items-center justify-center text-[9px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-12 w-80 bg-card ring-1 ring-border rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                  <button onClick={() => setShowNotifs(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {mockNotifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-border/60 hover:bg-muted/30 transition-colors ${n.unread ? "bg-primary/5" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground">{n.title}</p>
                        {n.unread && <span className="size-2 rounded-full bg-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{n.time}</p>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-border">
                  <button className="text-xs text-primary hover:underline w-full text-center">
                    Tout marquer comme lu
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleNewSale}
            className="bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold rounded-md flex items-center gap-2 hover:bg-primary/90 transition-all active:scale-95 shadow-md shadow-primary/30"
          >
            <Plus className="size-4 shrink-0" />
            Nouvelle Vente
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Se déconnecter"
            title="Se déconnecter"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
