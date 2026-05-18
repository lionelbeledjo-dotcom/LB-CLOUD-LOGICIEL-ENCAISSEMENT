import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Phone, Receipt, FileText, ShieldCheck, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompany } from "@/hooks/use-company";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({ meta: [{ title: "Paramètres — Lb Cloud" }] }),
  component: ParametresPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="rounded-xl ring-1 ring-destructive/40 bg-destructive/5 p-6">
          <h1 className="text-lg font-semibold mb-2">Erreur de chargement</h1>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => { router.invalidate(); reset(); }}>Réessayer</Button>
        </div>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="p-8 max-w-xl mx-auto text-center text-muted-foreground">
      Ressource introuvable.
    </div>
  ),
});

function ParametresPage() {
  const { data: active, isLoading: loadingCompany } = useActiveCompany();
  const companyId = active?.company_id as string | undefined;

  if (loadingCompany) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="rounded-xl ring-1 ring-border bg-surface/60 p-6 text-center">
          <h1 className="text-lg font-semibold mb-2">Aucune entreprise active</h1>
          <p className="text-sm text-muted-foreground">
            Rejoignez ou créez une entreprise pour accéder aux paramètres.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">
          Gérez les informations de votre entreprise, la TVA, la facturation et la sécurité.
        </p>
      </header>

      <Tabs defaultValue="entreprise" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="entreprise"><Building2 className="size-4 mr-2" />Entreprise</TabsTrigger>
          <TabsTrigger value="tva"><Receipt className="size-4 mr-2" />TVA</TabsTrigger>
          <TabsTrigger value="coordonnees"><Phone className="size-4 mr-2" />Coordonnées</TabsTrigger>
          <TabsTrigger value="facturation"><FileText className="size-4 mr-2" />Facturation</TabsTrigger>
          <TabsTrigger value="securite"><ShieldCheck className="size-4 mr-2" />Sécurité</TabsTrigger>
        </TabsList>

        <TabsContent value="entreprise" className="mt-4">
          <CompanyInfoSection companyId={companyId} />
        </TabsContent>
        <TabsContent value="tva" className="mt-4">
          <VatRatesSection companyId={companyId} />
        </TabsContent>
        <TabsContent value="coordonnees" className="mt-4">
          <ContactSection companyId={companyId} />
        </TabsContent>
        <TabsContent value="facturation" className="mt-4">
          <InvoicingSection companyId={companyId} />
        </TabsContent>
        <TabsContent value="securite" className="mt-4">
          <SecuritySection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useCompany(companyId: string) {
  return useQuery({
    queryKey: ["company-settings", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl ring-1 ring-border bg-surface/60 p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function CompanyInfoSection({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useCompany(companyId);
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (data) setForm({
      name: data.name ?? "",
      legal_name: data.legal_name ?? "",
      siret: data.siret ?? "",
      vat_number: data.vat_number ?? "",
      sector: data.sector ?? "autre",
    });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("companies")
        .update({
          name: form.name,
          legal_name: form.legal_name || null,
          siret: form.siret || null,
          vat_number: form.vat_number || null,
        })
        .eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Informations enregistrées");
      qc.invalidateQueries({ queryKey: ["company-settings", companyId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  if (isLoading || !form) return <Skeleton className="h-64 w-full" />;

  return (
    <Card title="Informations entreprise" description="Identité légale de votre société.">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Nom commercial">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Raison sociale">
          <Input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
        </Field>
        <Field label="SIRET">
          <Input value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value })} />
        </Field>
        <Field label="N° TVA intracom.">
          <Input value={form.vat_number} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} />
        </Field>
        <Field label="Secteur">
          <Input value={form.sector} disabled />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </Card>
  );
}

function ContactSection({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useCompany(companyId);
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (data) setForm({
      email: data.email ?? "",
      phone: data.phone ?? "",
      address_line1: data.address_line1 ?? "",
      address_line2: data.address_line2 ?? "",
      postal_code: data.postal_code ?? "",
      city: data.city ?? "",
      country: data.country ?? "France",
    });
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("companies")
        .update({
          email: form.email || null,
          phone: form.phone || null,
          address_line1: form.address_line1 || null,
          address_line2: form.address_line2 || null,
          postal_code: form.postal_code || null,
          city: form.city || null,
          country: form.country || "France",
        })
        .eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Coordonnées enregistrées");
      qc.invalidateQueries({ queryKey: ["company-settings", companyId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  if (isLoading || !form) return <Skeleton className="h-64 w-full" />;

  return (
    <Card title="Coordonnées" description="Adresse et contacts de l'entreprise.">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Téléphone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Adresse"><Input value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} /></Field>
        <Field label="Complément"><Input value={form.address_line2} onChange={(e) => setForm({ ...form, address_line2: e.target.value })} /></Field>
        <Field label="Code postal"><Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></Field>
        <Field label="Ville"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
        <Field label="Pays"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </Card>
  );
}

function VatRatesSection({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [rate, setRate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["vat-rates", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vat_rates")
        .select("id, label, rate, is_active, created_at")
        .eq("company_id", companyId)
        .order("rate", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const r = parseFloat(rate.replace(",", "."));
      if (!label.trim()) throw new Error("Libellé requis");
      if (isNaN(r) || r < 0 || r > 100) throw new Error("Taux invalide (0–100)");
      const { error } = await supabase.from("vat_rates").insert({
        company_id: companyId, label: label.trim(), rate: r,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Taux ajouté");
      setLabel(""); setRate("");
      qc.invalidateQueries({ queryKey: ["vat-rates", companyId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("vat_rates").update({ is_active: !is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vat-rates", companyId] }),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vat_rates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Taux supprimé");
      qc.invalidateQueries({ queryKey: ["vat-rates", companyId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  return (
    <Card title="Paramètres TVA" description="Configurez les taux de TVA disponibles pour vos ventes.">
      <div className="flex flex-wrap gap-2 items-end">
        <Field label="Libellé"><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: TVA 20%" className="w-48" /></Field>
        <Field label="Taux (%)"><Input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="20" className="w-28" /></Field>
        <Button onClick={() => add.mutate()} disabled={add.isPending}>
          <Plus className="size-4 mr-1" />Ajouter
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-surface/40">
            <tr>
              <th className="text-left px-3 py-2">Libellé</th>
              <th className="text-left px-3 py-2">Taux</th>
              <th className="text-left px-3 py-2">Statut</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r: any) => (
              <tr key={r.id} className="border-t border-border/60">
                <td className="px-3 py-2">{r.label}</td>
                <td className="px-3 py-2">{Number(r.rate).toFixed(2)} %</td>
                <td className="px-3 py-2">
                  <button
                    className={`text-xs px-2 py-0.5 rounded-full ring-1 ${r.is_active ? "bg-success/10 ring-success/40 text-success" : "bg-muted/30 ring-border text-muted-foreground"}`}
                    onClick={() => toggle.mutate({ id: r.id, is_active: r.is_active })}
                  >
                    {r.is_active ? "Actif" : "Inactif"}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(r.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Aucun taux configuré.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function InvoicingSection({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["invoice-counters", companyId],
    queryFn: async () => {
      const { data: company } = await supabase
        .from("companies")
        .select("subscription_plan, logo_url")
        .eq("id", companyId)
        .single();
      return { company };
    },
  });

  const setLogoUrl = useMutation({
    mutationFn: async (url: string | null) => {
      const { error } = await supabase
        .from("companies")
        .update({ logo_url: url })
        .eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice-counters", companyId] });
      qc.invalidateQueries({ queryKey: ["company-settings", companyId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Le fichier doit être une image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image trop volumineuse (max 2 Mo)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${companyId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("company-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("company-logos").getPublicUrl(path);
      await setLogoUrl.mutateAsync(pub.publicUrl);
      toast.success("Logo enregistré");
    } catch (err: any) {
      toast.error(err.message ?? "Échec du téléversement");
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    await setLogoUrl.mutateAsync(null);
    toast.success("Logo supprimé");
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  const logoUrl = data?.company?.logo_url ?? "";

  return (
    <Card title="Configuration facturation" description="Numérotation et identité visuelle des factures.">
      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        <Field label="Plan d'abonnement">
          <Input value={data?.company?.subscription_plan ?? ""} disabled />
        </Field>
        <Field label="URL du logo">
          <Input value={logoUrl} disabled placeholder="Non configuré" />
        </Field>
      </div>

      <div className="rounded-lg ring-1 ring-border/60 bg-surface/40 p-4 flex flex-wrap items-center gap-4">
        <div className="size-20 rounded-lg ring-1 ring-border bg-background flex items-center justify-center overflow-hidden shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo entreprise" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[10px] text-muted-foreground">Aucun logo</span>
          )}
        </div>
        <div className="flex-1 min-w-[200px] space-y-2">
          <p className="text-sm font-medium">Logo de l'entreprise</p>
          <p className="text-xs text-muted-foreground">
            PNG, JPG ou SVG. Max 2 Mo. Affiché sur vos factures et tickets.
          </p>
          <div className="flex flex-wrap gap-2">
            <label>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
              <span className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground text-xs font-medium px-3 py-2 cursor-pointer hover:opacity-90">
                {uploading ? "Téléversement…" : logoUrl ? "Remplacer" : "Téléverser un logo"}
              </span>
            </label>
            {logoUrl && (
              <Button size="sm" variant="ghost" onClick={removeLogo} disabled={uploading}>
                <Trash2 className="size-4 mr-1" /> Supprimer
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg ring-1 ring-border/60 bg-surface/40 p-4 text-xs text-muted-foreground space-y-1">
        <p>• Format de numérotation : <span className="font-mono">FAC-AAAAMM-XXXX</span></p>
        <p>• Compteur réinitialisé chaque mois.</p>
        <p>• Conformité loi anti-fraude : journal de ventes signé activé.</p>
        <p>• Archivage des factures avec hash de contrôle.</p>
      </div>
    </Card>
  );
}


function SecuritySection() {
  const [enrolling, setEnrolling] = useState(false);

  const { data: aal, isLoading, refetch } = useQuery({
    queryKey: ["security-aal"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;
      const { data: factors } = await supabase.auth.mfa.listFactors();
      return { ...data, factors: factors?.totp ?? [] };
    },
  });

  const removeFactor = async (id: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Facteur supprimé");
    refetch();
  };

  return (
    <Card title="Paramètres sécurité" description="Authentification renforcée et gestion des sessions.">
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Authentification à deux facteurs (TOTP)</p>
              <p className="text-xs text-muted-foreground">
                Niveau actuel : <span className="font-mono">{aal?.currentLevel ?? "aal1"}</span>
              </p>
            </div>
            <a
              href="/super-admin/mfa"
              className="text-xs text-primary hover:underline"
              onClick={(e) => { if (enrolling) e.preventDefault(); }}
            >
              Configurer la 2FA
            </a>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Facteurs enregistrés</p>
            {(aal?.factors ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun facteur TOTP enregistré.</p>
            ) : (
              <ul className="space-y-2">
                {(aal?.factors ?? []).map((f: any) => (
                  <li key={f.id} className="flex items-center justify-between rounded-lg ring-1 ring-border/60 bg-surface/40 px-3 py-2 text-sm">
                    <span>{f.friendly_name ?? "Authenticator"} <span className="text-xs text-muted-foreground">({f.status})</span></span>
                    <Button size="sm" variant="ghost" onClick={() => removeFactor(f.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg ring-1 ring-border/60 bg-surface/40 p-4 text-xs text-muted-foreground space-y-1">
            <p>• Sessions sécurisées via JWT (Supabase Auth).</p>
            <p>• Mot de passe : suivez les bonnes pratiques (12+ caractères).</p>
            <p>• Les accès super-admin requièrent obligatoirement la 2FA.</p>
          </div>
        </>
      )}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
