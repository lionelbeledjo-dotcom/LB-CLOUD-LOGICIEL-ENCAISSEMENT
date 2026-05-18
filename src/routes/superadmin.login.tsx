import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LbLogo } from "@/components/LbLogo";

export const Route = createFileRoute("/superadmin/login")({
  head: () => ({
    meta: [
      { title: "Super Admin — Connexion" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuperAdminLoginPage,
});

function SuperAdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // If already signed in AND already super admin → straight to dashboard
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: rows } = await supabase.from("super_admins").select("user_id");
        const isSuper = (rows ?? []).some((r: any) => r.user_id === u.user!.id);
        if (isSuper) {
          navigate({ to: "/superadmin/dashboard" });
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

      const { data: rows, error: e2 } = await supabase
        .from("super_admins")
        .select("user_id")
        .eq("user_id", uid)
        .maybeSingle();
      if (e2) throw e2;
      if (!rows) {
        await supabase.auth.signOut();
        throw new Error("Ce compte n'est pas Super Admin.");
      }

      toast.success("Connexion Super Admin réussie");
      navigate({ to: "/superadmin/dashboard" });
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
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-md bg-card ring-1 ring-border rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-center mb-6">
          <LbLogo size={48} />
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="size-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Super Admin</h1>
        </div>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Accès réservé à l'administration globale Lb Cloud.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="sa-email">Email</Label>
            <Input
              id="sa-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="sa-pwd">Mot de passe</Label>
            <Input
              id="sa-pwd"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            Se connecter
          </Button>
        </form>
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/login" className="hover:underline">← Retour à la connexion standard</Link>
        </div>
      </div>
    </div>
  );
}
