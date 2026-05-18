import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, UserPlus, Shield, Power, PowerOff, Mail, Phone, KeyRound, Copy, Pencil, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useActiveCompany } from "@/hooks/use-company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  listEmployes, inviteEmploye, updateEmployeRole, setEmployeActive, resetEmployePassword, updateEmployeProfile,
} from "@/lib/employes.functions";

export const Route = createFileRoute("/_authenticated/employes")({
  head: () => ({ meta: [{ title: "Utilisateurs — Lb Cloud" }] }),
  component: EmployesPage,
});

const ROLES = [
  { value: "admin_entreprise", label: "Administrateur" },
  { value: "caissier", label: "Caissier" },
  { value: "comptable", label: "Comptable" },
  { value: "employe", label: "Employé" },
] as const;

const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r;

function EmployesPage() {
  const { data: company, isLoading: loadingCompany } = useActiveCompany();
  const qc = useQueryClient();
  const fnList = useServerFn(listEmployes);
  const fnInvite = useServerFn(inviteEmploye);
  const fnRole = useServerFn(updateEmployeRole);
  const fnActive = useServerFn(setEmployeActive);
  const fnReset = useServerFn(resetEmployePassword);
  const fnUpdate = useServerFn(updateEmployeProfile);

  const companyId = company?.company_id;
  const { data: members, isLoading } = useQuery({
    queryKey: ["employes", companyId],
    enabled: !!companyId,
    queryFn: () => fnList({ data: { companyId: companyId! } }),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "", fullName: "", role: "caissier" as (typeof ROLES)[number]["value"], password: "",
  });

  const inviteMut = useMutation({
    mutationFn: () =>
      fnInvite({
        data: {
          companyId: companyId!,
          email: form.email.trim(),
          fullName: form.fullName.trim(),
          role: form.role,
          password: form.password.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Employé invité");
      setOpen(false);
      setForm({ email: "", fullName: "", role: "caissier", password: "" });
      qc.invalidateQueries({ queryKey: ["employes", companyId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec de l'invitation"),
  });

  const roleMut = useMutation({
    mutationFn: (v: { memberId: string; role: any }) =>
      fnRole({ data: { companyId: companyId!, memberId: v.memberId, role: v.role } }),
    onSuccess: () => {
      toast.success("Rôle mis à jour");
      qc.invalidateQueries({ queryKey: ["employes", companyId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec"),
  });

  const activeMut = useMutation({
    mutationFn: (v: { memberId: string; isActive: boolean }) =>
      fnActive({ data: { companyId: companyId!, memberId: v.memberId, isActive: v.isActive } }),
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["employes", companyId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec"),
  });

  const [resetTarget, setResetTarget] = useState<null | { userId: string; name: string }>(null);
  const [customPwd, setCustomPwd] = useState("");
  const [resetResult, setResetResult] = useState<null | { password: string; name: string }>(null);

  const resetMut = useMutation({
    mutationFn: (v: { targetUserId: string; password?: string }) =>
      fnReset({ data: { companyId: companyId!, targetUserId: v.targetUserId, password: v.password } }),
    onSuccess: (res: any) => {
      setResetResult({ password: res.password, name: resetTarget?.name ?? "" });
      setResetTarget(null);
      setCustomPwd("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec de la réinitialisation"),
  });

  const copyPassword = async (pwd: string) => {
    try {
      await navigator.clipboard.writeText(pwd);
      toast.success("Mot de passe copié");
    } catch {
      toast.error("Impossible de copier");
    }
  };

  if (loadingCompany) return <PageSkeleton />;
  if (!companyId) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Aucune entreprise active.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Users className="size-6" /> Utilisateurs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Invitez des employés et gérez leurs rôles dans {company?.companies?.name ?? "l'entreprise"}.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="size-4 mr-2" />Inviter un employé</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inviter un employé</DialogTitle>
              <DialogDescription>
                Le compte est créé immédiatement avec un mot de passe initial.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="fn">Nom complet</Label>
                <Input id="fn" value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Sophie Martin" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="em">Email</Label>
                <Input id="em" type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="sophie@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Rôle</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw">Mot de passe (optionnel)</Label>
                <Input id="pw" type="text" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Laissez vide pour générer automatiquement" />
                <p className="text-xs text-muted-foreground">Minimum 8 caractères. Transmettez-le à l'utilisateur en sécurité.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
              <Button
                onClick={() => inviteMut.mutate()}
                disabled={!form.email || !form.fullName || inviteMut.isPending}
              >
                {inviteMut.isPending ? "Création…" : "Créer le compte"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[2fr_2fr_1.2fr_1fr_auto] gap-4 px-5 py-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
          <div>Utilisateur</div>
          <div>Contact</div>
          <div>Rôle</div>
          <div>Statut</div>
          <div className="text-right">Actions</div>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : (members?.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Aucun employé. Invitez votre premier utilisateur.
          </div>
        ) : (
          members!.map((m: any) => (
            <div key={m.id}
              className="grid grid-cols-[2fr_2fr_1.2fr_1fr_auto] gap-4 px-5 py-4 border-b border-border last:border-0 items-center">
              <div>
                <div className="font-medium">{m.full_name ?? "Sans nom"}</div>
                <div className="text-xs text-muted-foreground font-mono">{m.user_id.slice(0, 8)}…</div>
              </div>
              <div className="text-sm space-y-1">
                {m.email && <div className="flex items-center gap-1.5"><Mail className="size-3" />{m.email}</div>}
                {m.phone && <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="size-3" />{m.phone}</div>}
              </div>
              <div>
                <Select
                  value={m.role}
                  onValueChange={(v) => roleMut.mutate({ memberId: m.id, role: v })}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                {m.is_active ? (
                  <Badge variant="default" className="gap-1"><Shield className="size-3" />Actif</Badge>
                ) : (
                  <Badge variant="secondary">Désactivé</Badge>
                )}
              </div>
              <div className="text-right flex items-center justify-end gap-1">
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setResetTarget({ userId: m.user_id, name: m.full_name ?? m.email ?? "cet utilisateur" })}
                  title="Réinitialiser le mot de passe"
                >
                  <KeyRound className="size-4" />
                </Button>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => activeMut.mutate({ memberId: m.id, isActive: !m.is_active })}
                  title={m.is_active ? "Désactiver" : "Activer"}
                >
                  {m.is_active
                    ? <PowerOff className="size-4 text-destructive" />
                    : <Power className="size-4 text-primary" />}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => { if (!o) { setResetTarget(null); setCustomPwd(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription>
              Définir un nouveau mot de passe pour <strong>{resetTarget?.name}</strong>. L'utilisateur devra l'utiliser à sa prochaine connexion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="newpwd">Nouveau mot de passe (optionnel)</Label>
            <Input
              id="newpwd" type="text" value={customPwd}
              onChange={(e) => setCustomPwd(e.target.value)}
              placeholder="Laissez vide pour générer automatiquement"
            />
            <p className="text-xs text-muted-foreground">Minimum 8 caractères.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setResetTarget(null); setCustomPwd(""); }}>Annuler</Button>
            <Button
              onClick={() => resetMut.mutate({ targetUserId: resetTarget!.userId, password: customPwd.trim() || undefined })}
              disabled={resetMut.isPending || (customPwd.length > 0 && customPwd.length < 8)}
            >
              {resetMut.isPending ? "Réinitialisation…" : "Réinitialiser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result dialog showing the new password */}
      <Dialog open={!!resetResult} onOpenChange={(o) => { if (!o) setResetResult(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mot de passe réinitialisé</DialogTitle>
            <DialogDescription>
              Nouveau mot de passe pour <strong>{resetResult?.name}</strong>. Copiez-le maintenant — il ne sera plus affiché.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-2">
            <Input readOnly value={resetResult?.password ?? ""} className="font-mono" />
            <Button variant="outline" size="icon" onClick={() => resetResult && copyPassword(resetResult.password)}>
              <Copy className="size-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setResetResult(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
