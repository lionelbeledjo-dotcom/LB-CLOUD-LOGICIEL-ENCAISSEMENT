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

const PAGE_SIZE = 10;

function SuperAdminsPage() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filtered = (data ?? []).filter((r) => {
    if (!normalizedQuery) return true;
    const name = (r.full_name ?? "").toLowerCase();
    const uid = r.user_id.toLowerCase();
    return name.includes(normalizedQuery) || uid.includes(normalizedQuery);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(start, start + PAGE_SIZE);

  const pageNumbers = (() => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safePage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (safePage >= totalPages - 3) {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = safePage - 1; i <= safePage + 1; i++) pages.push(i);
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }
    return pages;
  })();

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
        <div className="p-3 border-b border-border flex flex-wrap items-center gap-2">
          <ShieldCheck className="size-4 text-brand" />
          <h2 className="text-sm font-semibold">Super administrateurs Lb Cloud</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} compte(s)
          </span>
        </div>
        <div className="p-3 border-b border-border/60">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Rechercher par nom ou UUID…"
              className="pl-9 text-sm"
            />
          </div>
        </div>
        {isLoading ? (
          <div className="p-4"><Skeleton className="h-48 w-full" /></div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-surface/40">
                <tr>
                  <th className="text-left px-3 py-2">Nom</th>
                  <th className="text-left px-3 py-2">User ID</th>
                  <th className="text-left px-3 py-2">Promu le</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((r) => (
                  <tr key={r.user_id} className="border-t border-border/60">
                    <td className="px-3 py-2">{r.full_name ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.user_id}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("fr-FR")}
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr><td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">Aucun résultat.</td></tr>
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="p-3 border-t border-border/60 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (safePage > 1) setCurrentPage(safePage - 1);
                        }}
                        className={safePage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {pageNumbers.map((p, i) =>
                      p === "ellipsis" ? (
                        <PaginationItem key={`ellipsis-${i}`}>
                          <span className="flex h-9 w-9 items-center justify-center text-xs text-muted-foreground">…</span>
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href="#"
                            isActive={p === safePage}
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(p);
                            }}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (safePage < totalPages) setCurrentPage(safePage + 1);
                        }}
                        className={safePage === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
