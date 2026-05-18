import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
  errorComponent: ({ error, reset }) => (
    <AuthenticatedLayoutShell>
      <div className="p-8">
        <div className="max-w-xl rounded-xl border border-border bg-card p-6 shadow-sm shadow-secondary/10">
          <h2 className="text-lg font-semibold text-secondary">Une erreur est survenue</h2>
          <p className="mt-2 text-sm text-muted-foreground break-words">{error.message}</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={reset} size="sm">Réessayer</Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard">Retour au tableau de bord</Link>
            </Button>
          </div>
        </div>
      </div>
    </AuthenticatedLayoutShell>
  ),
});

function AuthenticatedLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar />
      <main className="pl-64">
        <AppHeader />
        {children}
      </main>
    </div>
  );
}

function AuthenticatedLayout() {
  return (
    <AuthenticatedLayoutShell>
      <Outlet />
    </AuthenticatedLayoutShell>
  );
}
