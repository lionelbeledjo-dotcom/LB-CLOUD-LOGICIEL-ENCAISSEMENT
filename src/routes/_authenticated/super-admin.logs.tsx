import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Search, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

function toCSV(rows: Log[], companyMap: Map<string, string>): string {
  const headers = ["created_at", "company_id", "company_name", "user_id", "action", "target_table", "target_id", "metadata"];
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      r.created_at, r.company_id, companyMap.get(r.company_id) ?? "",
      r.user_id ?? "", r.action, r.target_table ?? "", r.target_id ?? "", r.metadata ?? {},
    ].map(escape).join(","));
  }
  return lines.join("\n");
}

export const Route = createFileRoute("/_authenticated/super-admin/logs")({
  component: SuperAdminLogs,
});

type Log = {
  id: string;
  created_at: string;
  company_id: string;
  user_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  metadata: any;
};

function SuperAdminLogs() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [companyId, setCompanyId] = useState("all");

  const { data: companies } = useQuery({
    queryKey: ["super-admin-companies-min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, created_at, company_id, user_id, action, target_table, target_id, metadata")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Log[];
    },
  });

  const actions = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((l) => set.add(l.action));
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((l) => {
      if (action !== "all" && l.action !== action) return false;
      if (companyId !== "all" && l.company_id !== companyId) return false;
      if (!q) return true;
      return (
        l.action.toLowerCase().includes(q)
        || (l.target_table ?? "").toLowerCase().includes(q)
        || (l.target_id ?? "").toLowerCase().includes(q)
        || JSON.stringify(l.metadata ?? {}).toLowerCase().includes(q)
      );
    });
  }, [data, search, action, companyId]);

  const companyMap = useMemo(() => {
    const m = new Map<string, string>();
    (companies ?? []).forEach((c) => m.set(c.id, c.name));
    return m;
  }, [companies]);

  return (
    <div className="rounded-xl ring-1 ring-border bg-surface/60 overflow-hidden">
      <div className="p-3 border-b border-border flex flex-wrap items-center gap-2">
        <ScrollText className="size-4 text-brand" />
        <h2 className="text-sm font-semibold">Logs globaux</h2>
        <div className="flex-1" />
        <Search className="size-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)}
          className="h-8 max-w-xs" placeholder="Rechercher…" />
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes actions</SelectItem>
            {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={companyId} onValueChange={setCompanyId}>
          <SelectTrigger className="h-8 w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes entreprises</SelectItem>
            {(companies ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          disabled={!filtered.length}
          onClick={() => {
            const csv = toCSV(filtered, companyMap);
            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `audit-logs-${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="size-4 mr-1" /> CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="p-4"><Skeleton className="h-72 w-full" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-surface/40">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Entreprise</th>
                <th className="text-left px-3 py-2">Action</th>
                <th className="text-left px-3 py-2">Cible</th>
                <th className="text-left px-3 py-2">Détails</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t border-border/60 align-top">
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-3 py-2 text-xs">{companyMap.get(l.company_id) ?? l.company_id.slice(0, 8)}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs ring-1 ring-border bg-surface font-mono">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {l.target_table ?? "—"}{l.target_id ? ` · ${l.target_id.slice(0, 8)}` : ""}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap break-all max-w-xl">
                      {l.metadata && Object.keys(l.metadata).length > 0
                        ? JSON.stringify(l.metadata, null, 0)
                        : "—"}
                    </pre>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  Aucun log.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
