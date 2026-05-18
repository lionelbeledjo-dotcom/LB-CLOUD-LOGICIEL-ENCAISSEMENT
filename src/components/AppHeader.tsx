import { Bell, Plus, Search, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";

export function AppHeader() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <header className="h-16 border-b border-border bg-background/70 backdrop-blur-md sticky top-0 z-10">
      <div className="h-full px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface ring-1 ring-border rounded-md">
            <span className="size-2 rounded-full bg-brand animate-pulse" />
            <select
              className="bg-transparent text-sm font-medium text-foreground border-none focus:ring-0 cursor-pointer outline-none"
              aria-label="Sélection de l'entreprise"
            >
              <option>Aucune entreprise</option>
            </select>
          </div>

          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="bg-surface/50 border-none ring-1 ring-border rounded-md pl-10 pr-4 py-1.5 text-sm w-64 text-foreground placeholder:text-muted-foreground focus:ring-brand/50 focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Notifications"
          >
            <Bell className="size-5" />
            <span className="absolute top-2 right-2 size-1.5 bg-brand rounded-full ring-2 ring-background" />
          </button>

          <button
            type="button"
            className="bg-brand text-primary-foreground px-4 py-2 text-sm font-semibold rounded-md flex items-center gap-2 hover:bg-brand/90 transition-all active:scale-95 shadow-brand ring-1 ring-brand"
          >
            <Plus className="size-4 shrink-0" />
            Nouvelle Vente
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
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
