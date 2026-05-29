import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UserPlus, Phone, Mail, Building2, Clock, CheckCircle2, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/super-admin/crm")({
  component: CrmPage,
});

const statusLabels: Record<string, { label: string; color: string }> = {
  nouveau: { label: "Nouveau", color: "bg-blue-500/10 text-blue-600 ring-blue-500/30" },
  contacte: { label: "Contacté", color: "bg-amber-500/10 text-amber-600 ring-amber-500/30" },
  converti: { label: "Converti", color: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30" },
  perdu: { label: "Perdu", color: "bg-red-500/10 text-red-600 ring-red-500/30" },
};

function CrmPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");

  const { data: leads, isLoading } = useQuery({
    queryKey: ["demo-requests"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("demo_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from("demo_requests")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["demo-requests"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (leads ?? []).filter((l: any) => filter === "all" || l.status === filter);
  const counts = {
    all: (leads ?? []).length,
    nouveau: (leads ?? []).filter((l: any) => l.status === "nouveau").length,
    contacte: (leads ?? []).filter((l: any) => l.status === "contacte").length,
    converti: (leads ?? []).filter((l: any) => l.status === "converti").length,
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="size-6 text-primary" /> CRM — Demandes de démo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Prospects qui ont demandé un rappel depuis la landing page
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{counts.nouveau}</p>
          <p className="text-xs text-muted-foreground">nouveaux leads</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: `Tous (${counts.all})` },
          { key: "nouveau", label: `Nouveaux (${counts.nouveau})` },
          { key: "contacte", label: `Contactés (${counts.contacte})` },
          { key: "converti", label: `Convertis (${counts.converti})` },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-surface ring-1 ring-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste des leads */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucune demande de démo pour ce filtre.
          </div>
        ) : (
          filtered.map((lead: any) => (
            <div key={lead.id} className="bg-card ring-1 ring-border rounded-xl p-5 hover:ring-primary/30 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-foreground">{lead.name}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ring-1 ${statusLabels[lead.status]?.color ?? ""}`}>
                      {statusLabels[lead.status]?.label ?? lead.status}
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2"><Building2 className="size-3.5" /> {lead.company}</span>
                    <span className="flex items-center gap-2"><Mail className="size-3.5" /> {lead.email}</span>
                    <span className="flex items-center gap-2"><Phone className="size-3.5" /> {lead.phone}</span>
                    <span className="flex items-center gap-2"><Clock className="size-3.5" /> {new Date(lead.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {lead.message && (
                    <p className="mt-2 text-xs text-muted-foreground flex items-start gap-2">
                      <MessageSquare className="size-3.5 mt-0.5 shrink-0" /> {lead.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {lead.status === "nouveau" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: lead.id, status: "contacte" })}>
                      Marquer contacté
                    </Button>
                  )}
                  {lead.status === "contacte" && (
                    <>
                      <Button size="sm" onClick={() => updateStatus.mutate({ id: lead.id, status: "converti" })}>
                        <CheckCircle2 className="size-3.5 mr-1" /> Converti
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => updateStatus.mutate({ id: lead.id, status: "perdu" })}>
                        Perdu
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
