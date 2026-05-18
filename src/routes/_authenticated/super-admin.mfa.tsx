import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/super-admin/mfa")({
  component: SuperAdminMfa,
});

type Factor = { id: string; status: string; friendly_name?: string };

function SuperAdminMfa() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [aal, setAal] = useState<{ current?: string; next?: string }>({});
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [{ data: f }, { data: a }] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    setFactors((f?.totp ?? []) as any);
    setAal({ current: a?.currentLevel ?? undefined, next: a?.nextLevel ?? undefined });
  };

  useEffect(() => { refresh(); }, []);

  const startEnroll = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `SuperAdmin · ${new Date().toISOString().slice(0, 10)}`,
      });
      if (error) throw error;
      setEnroll({ factorId: data.id, qr: (data as any).totp.qr_code, secret: (data as any).totp.secret });
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
      toast.success("2FA activée");
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
      window.location.reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const removeFactor = async (factorId: string) => {
    if (!confirm("Supprimer ce facteur 2FA ?")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) toast.error(error.message);
    else { toast.success("Facteur supprimé"); refresh(); }
  };

  const verified = factors.filter((f) => f.status === "verified");
  const unverified = factors.filter((f) => f.status === "unverified");

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <section className="rounded-xl ring-1 ring-border bg-surface/60 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h2 className="text-base font-semibold">État 2FA</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Niveau de session : <span className="text-foreground font-mono">{aal.current ?? "—"}</span><br />
          Niveau requis : <span className="text-foreground font-mono">{aal.next ?? "—"}</span>
        </p>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Facteurs TOTP</Label>
          {factors.length === 0 && <p className="text-sm text-muted-foreground">Aucun facteur configuré.</p>}
          {factors.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-md ring-1 ring-border px-3 py-2">
              <div className="text-sm">
                <p className="font-medium">{f.friendly_name || "Authenticator"}</p>
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
            <p className="text-xs text-amber-300">
              Saisissez votre code 6 chiffres pour élever votre session :
            </p>
            <Input value={code} onChange={(e) => setCode(e.target.value)}
              inputMode="numeric" maxLength={6} placeholder="123456" className="h-9" />
            <Button size="sm" disabled={busy || code.length !== 6}
              onClick={() => elevate(verified[0].id)}>
              Vérifier le code
            </Button>
          </div>
        )}

        {unverified.length === 0 && verified.length === 0 && (
          <Button onClick={startEnroll} disabled={busy}>
            <KeyRound className="size-4" /> Activer la 2FA (TOTP)
          </Button>
        )}
      </section>

      {enroll && (
        <section className="rounded-xl ring-1 ring-border bg-surface/60 p-5 space-y-3">
          <h3 className="text-base font-semibold">Scannez le QR code</h3>
          <p className="text-sm text-muted-foreground">
            Avec Google Authenticator, 1Password, Authy, etc.
          </p>
          <div className="bg-white rounded-md p-3 inline-block">
            <img src={enroll.qr} alt="QR code TOTP" className="size-48" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ou code manuel</Label>
            <Input readOnly value={enroll.secret} className="h-9 font-mono text-xs" />
          </div>
          <div>
            <Label>Code à 6 chiffres</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)}
              inputMode="numeric" maxLength={6} placeholder="123456" className="h-9" />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setEnroll(null); setCode(""); }}>Annuler</Button>
            <Button disabled={busy || code.length !== 6} onClick={verifyEnroll}>
              Activer
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
