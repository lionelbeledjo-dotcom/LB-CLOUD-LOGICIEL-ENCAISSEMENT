import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, UserPlus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

export const Route = createFileRoute("/_authenticated/super-admin/admins")({
  component: SuperAdminsPage,
});

type Row = { user_id: string; created_at: string; full_name?: string | null };

function SuperAdminsPage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["super-admins-list"],
    queryFn: async () => {
      const { data: admins, error } = await supabase
        .from("super_admins")
        .select("user_id, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const ids = (admins ?? []).map((a: any) => a.user_id);
      let profiles: any[] = [];
      if (ids.length) {
        const { data: p } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", ids);
        profiles = p ?? [];
      }
      const map = new Map(profiles.map((p) => [p.user_id, p.full_name]));
      return (admins ?? []).map((a: any) => ({
        ...a,
        full_name: map.get(a.user_id) ?? null,
      })) as Row[];
    },
  });

  const grant = useMutation({
    mutationFn: async (id: string) => {
      const trimmed = id.trim();
      if (!/^[0-9a-f-]{36}$/i.test(trimmed)) {
        throw new Error("UUID utilisateur invalide");
      }
      const { error } = await (supabase.rpc as any)("super_admin_grant", { _user_id: trimmed });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Super admin ajouté");
      setUserId("");
      qc.invalidateQueries({ queryKey: ["super-admins-list"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl ring-1 ring-border bg-surface/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="size-4 text-brand" />
          <h2 className="text-sm font-semibold">Promouvoir un utilisateur</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="UUID utilisateur (auth.users.id)"
            className="max-w-md font-mono text-xs"
          />
          <Button
            disabled={!userId.trim() || grant.isPending}
            onClick={() => grant.mutate(userId)}
          >
            {grant.isPending ? "Promotion…" : "Ajouter super admin"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          L'utilisateur doit déjà exister. Récupérez son UUID dans la liste des membres d'une entreprise ou dans la console backend.
        </p>
      </div>

      <div className="rounded-xl ring-1 ring-border bg-surface/60 overflow-hidden">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <ShieldCheck className="size-4 text-brand" />
          <h2 className="text-sm font-semibold">Super administrateurs Lb Cloud</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {data?.length ?? 0} compte(s)
          </span>
        </div>
        {isLoading ? (
          <div className="p-4"><Skeleton className="h-48 w-full" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-surface/40">
              <tr>
                <th className="text-left px-3 py-2">Nom</th>
                <th className="text-left px-3 py-2">User ID</th>
                <th className="text-left px-3 py-2">Promu le</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((r) => (
                <tr key={r.user_id} className="border-t border-border/60">
                  <td className="px-3 py-2">{r.full_name ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.user_id}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))}
              {(data ?? []).length === 0 && (
                <tr><td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">Aucun super admin.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
