import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LbLogo } from "@/components/LbLogo";
import { toast } from "sonner";
import { Shield, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Lb Cloud" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: rows } = await supabase
          .from("super_admins")
          .select("user_id")
          .eq("user_id", u.user.id)
          .maybeSingle();
        if (rows) {
          navigate({ to: "/super-admin" });
          return;
        }
      }
      setChecking(false);
    })();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const uid = data.user?.id;
      if (!uid) throw new Error("Session introuvable");

      const { data: row, error: e2 } = await supabase
        .from("super_admins")
        .select("user_id")
        .eq("user_id", uid)
        .maybeSingle();
      if (e2) throw e2;
      if (!row) {
        await supabase.auth.signOut();
        throw new Error("Ce compte n'a pas les droits d'administration.");
      }

      toast.success("Connexion Super Admin réussie");
      navigate({ to: "/super-admin" });
    } catch (err: any) {
      toast.error(err?.message ?? "Échec de connexion");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 size-[500px] rounded-full bg-violet-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 size-[400px] rounded-full bg-indigo-500/10 blur-[140px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-8">
          <LbLogo size={36} />
          <span className="text-foreground font-semibold tracking-tight text-2xl">Lb Cloud</span>
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-violet-500/20 text-violet-400 rounded-full ring-1 ring-violet-500/30">
            Admin
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl shadow-violet-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="size-5 text-violet-400" />
            <h1 className="text-xl font-semibold text-foreground">Espace Propriétaire</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Console d'administration globale Lb Cloud. Accès réservé.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email administrateur</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 focus:outline-none transition-colors"
                placeholder="admin@lbcloud.fr"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mot de passe</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 text-white py-2.5 rounded-md text-sm font-semibold hover:bg-violet-700 transition-all active:scale-[0.99] shadow-lg shadow-violet-600/30 disabled:opacity-50"
            >
              {loading ? "Vérification..." : "Accéder à l'administration"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-[10px] text-muted-foreground text-center">
              Seuls les comptes avec le rôle Super Admin peuvent se connecter ici.
              <br />
              La double authentification (2FA) sera demandée après connexion.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] text-muted-foreground uppercase tracking-widest">
          Lb Cloud · Console d'administration · Accès sécurisé
        </p>
      </div>
    </div>
  );
}
