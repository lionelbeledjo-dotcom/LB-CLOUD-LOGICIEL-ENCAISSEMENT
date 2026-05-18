import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Shield, ShieldCheck, KeyRound, Trash2, ArrowLeft, AlertTriangle, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/superadmin/mfa")({
  head: () => ({
    meta: [
      { title: "Super Admin — Double authentification (MFA)" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuperAdminMfaPage,
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

type Factor = { id: string; status: string; friendly_name?: string };

function SuperAdminMfaPage() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [aal, setAal] = useState<{ current?: string; next?: string }>({});
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  // Guard: signed-in + super admin
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { navigate({ to: "/superadmin/login" }); return; }
      const { data: row } = await supabase
        .from("super_admins").select("user_id").eq("user_id", u.user.id).maybeSingle();
      if (!row) { await supabase.auth.signOut(); navigate({ to: "/superadmin/login" }); return; }
      setChecked(true);
    })();
  }, [navigate]);

  const refresh = async () => {
    const [{ data: f }, { data: a }] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    setFactors(((f?.totp ?? []) as any) as Factor[]);
    setAal({ current: a?.currentLevel ?? undefined, next: a?.nextLevel ?? undefined });
  };

  useEffect(() => { if (checked) refresh(); }, [checked]);

  const startEnroll = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `SuperAdmin · ${new Date().toISOString().slice(0, 10)}`,
      });
      if (error) throw error;
      setEnroll({
        factorId: data.id,
        qr: (data as any).totp.qr_code,
        secret: (data as any).totp.secret,
      });
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const verifyEnroll = async () => {
    if (!enroll) return;
    setBusy(true);
    try {
      const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
      if (e1) throw e1;
      const { error: e2 } = await supabase.auth.mfa.verify({
        factorId: enroll.factorId, challengeId: ch.id, code,
      });
      if (e2) throw e2;
      toast.success("Double authentification activée");
      setEnroll(null); setCode("");
      await refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const elevate = async (factorId: string) => {
    setBusy(true);
    try {
      const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId });
      if (e1) throw e1;
      const { error: e2 } = await supabase.auth.mfa.verify({
        factorId, challengeId: ch.id, code,
      });
      if (e2) throw e2;
      toast.success("Session élevée (AAL2)");
      setCode("");
      await refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const removeFactor = async (factorId: string) => {
    if (!confirm("Supprimer ce facteur 2FA ?")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) toast.error(error.message);
    else { toast.success("Facteur supprimé"); refresh(); }
  };

  if (!checked) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const verified = factors.filter((f) => f.status === "verified");
  const unverified = factors.filter((f) => f.status === "unverified");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 grid place-items-center">
              <Shield className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">
                Double authentification (MFA)
              </h1>
              <p className="text-xs text-muted-foreground">
                Sécurité du compte Super Admin Lb Cloud
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/superadmin/dashboard">
              <ArrowLeft className="size-4 mr-2" /> Retour
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 grid md:grid-cols-2 gap-4">
        <section className="rounded-xl ring-1 ring-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">État de la 2FA</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Niveau de session actuel :{" "}
            <span className="text-foreground font-mono">{aal.current ?? "—"}</span>
            <br />
            Niveau requis :{" "}
            <span className="text-foreground font-mono">{aal.next ?? "—"}</span>
          </p>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Facteurs TOTP
            </Label>
            {factors.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun facteur configuré pour le moment.
              </p>
            )}
            {factors.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-md ring-1 ring-border px-3 py-2 bg-background"
              >
                <div className="text-sm">
                  <p className="font-medium text-foreground">
                    {f.friendly_name || "Authenticator"}
                  </p>
                  <p className="text-xs text-muted-foreground">{f.status}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeFactor(f.id)}>
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>

          {verified.length > 0 && aal.current !== "aal2" && (
            <div className="rounded-md bg-amber-500/10 ring-1 ring-amber-500/30 p-3 space-y-2">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Saisissez votre code à 6 chiffres pour élever votre session :
              </p>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                className="h-9"
              />
              <Button
                size="sm"
                disabled={busy || code.length !== 6}
                onClick={() => elevate(verified[0].id)}
              >
                Vérifier le code
              </Button>
            </div>
          )}

          {unverified.length === 0 && verified.length === 0 && !enroll && (
            <Button onClick={startEnroll} disabled={busy} className="gap-2">
              <KeyRound className="size-4" /> Activer la 2FA (TOTP)
            </Button>
          )}
        </section>

        {enroll ? (
          <section className="rounded-xl ring-1 ring-border bg-card p-5 shadow-sm space-y-3">
            <h3 className="text-base font-semibold text-foreground">Scannez le QR code</h3>
            <p className="text-sm text-muted-foreground">
              Utilisez Google Authenticator, 1Password, Authy, Microsoft Authenticator…
            </p>
            <div className="bg-white rounded-md p-3 inline-block ring-1 ring-border">
              <img src={enroll.qr} alt="QR code TOTP" className="size-48" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Ou code manuel
              </Label>
              <Input readOnly value={enroll.secret} className="h-9 font-mono text-xs" />
            </div>
            <div>
              <Label>Code à 6 chiffres</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                className="h-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => { setEnroll(null); setCode(""); }}
              >
                Annuler
              </Button>
              <Button disabled={busy || code.length !== 6} onClick={verifyEnroll}>
                Activer
              </Button>
            </div>
          </section>
        ) : (
          <section className="rounded-xl ring-1 ring-border bg-card p-5 shadow-sm space-y-3">
            <h3 className="text-base font-semibold text-foreground">
              Comment ça marche ?
            </h3>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-5">
              <li>Cliquez sur « Activer la 2FA » pour générer un secret TOTP.</li>
              <li>Scannez le QR code avec votre application d'authentification.</li>
              <li>Saisissez le code à 6 chiffres pour confirmer l'activation.</li>
              <li>
                À chaque connexion sensible, votre session devra être élevée au
                niveau <span className="font-mono">AAL2</span>.
              </li>
            </ol>
          </section>
        )}
      </main>
    </div>
  );
}
