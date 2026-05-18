import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- FEC export (Fichier des Écritures Comptables) ----------
export const exportFEC = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string; year: number }) =>
    z.object({ companyId: z.string().uuid(), year: z.number().int().min(2000).max(2100) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: company } = await supabase
      .from("companies").select("siret, name").eq("id", data.companyId).single();

    const { data: sales, error } = await supabase
      .from("sales")
      .select("id, sequence_number, invoice_number, sold_at, total_ht, total_vat, total_ttc, payment_method, customer_id, sale_items(product_name, quantity, line_total_ht, line_total_vat, vat_rate)")
      .eq("company_id", data.companyId)
      .gte("sold_at", `${data.year}-01-01`)
      .lt("sold_at", `${data.year + 1}-01-01`)
      .order("sequence_number");

    if (error) throw new Error(error.message);

    const header = [
      "JournalCode","JournalLib","EcritureNum","EcritureDate","CompteNum","CompteLib",
      "CompAuxNum","CompAuxLib","PieceRef","PieceDate","EcritureLib","Debit","Credit",
      "EcritureLet","DateLet","ValidDate","Montantdevise","Idevise",
    ].join("|");

    const lines: string[] = [header];
    const fmt = (n: number) => n.toFixed(2).replace(".", ",");
    const dfmt = (d: string) => new Date(d).toISOString().slice(0, 10).replace(/-/g, "");

    for (const s of sales ?? []) {
      const num = String(s.sequence_number ?? 0).padStart(8, "0");
      const date = dfmt(s.sold_at as string);
      // Client 411 / Vente 707 / TVA 44571
      lines.push([
        "VTE","Ventes",num,date,"411000","Clients",
        "","",s.invoice_number,date,`Facture ${s.invoice_number}`,
        fmt(Number(s.total_ttc)),"0,00","","","",fmt(Number(s.total_ttc)),"EUR",
      ].join("|"));
      lines.push([
        "VTE","Ventes",num,date,"707000","Ventes de marchandises",
        "","",s.invoice_number,date,`Facture ${s.invoice_number}`,
        "0,00",fmt(Number(s.total_ht)),"","","",fmt(Number(s.total_ht)),"EUR",
      ].join("|"));
      if (Number(s.total_vat) > 0) {
        lines.push([
          "VTE","Ventes",num,date,"445710","TVA collectée",
          "","",s.invoice_number,date,`TVA ${s.invoice_number}`,
          "0,00",fmt(Number(s.total_vat)),"","","",fmt(Number(s.total_vat)),"EUR",
        ].join("|"));
      }
    }

    const siren = (company?.siret ?? "").replace(/\D/g, "").slice(0, 9) || "000000000";
    return {
      filename: `FEC_${siren}_${data.year}1231.txt`,
      content: lines.join("\n"),
      count: sales?.length ?? 0,
    };
  });

// ---------- Rapport TVA mensuel ----------
export const monthlyVatReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string; year: number; month: number }) =>
    z.object({
      companyId: z.string().uuid(),
      year: z.number().int().min(2000).max(2100),
      month: z.number().int().min(1).max(12),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const start = new Date(Date.UTC(data.year, data.month - 1, 1)).toISOString();
    const end = new Date(Date.UTC(data.year, data.month, 1)).toISOString();

    const { data: rows, error } = await supabase
      .from("sale_items")
      .select("vat_rate, line_total_ht, line_total_vat, line_total_ttc, sales!inner(sold_at, company_id)")
      .eq("company_id", data.companyId)
      .gte("sales.sold_at", start)
      .lt("sales.sold_at", end);

    if (error) throw new Error(error.message);

    const buckets: Record<string, { ht: number; vat: number; ttc: number; count: number }> = {};
    for (const r of rows ?? []) {
      const key = Number(r.vat_rate).toFixed(2);
      buckets[key] ??= { ht: 0, vat: 0, ttc: 0, count: 0 };
      buckets[key].ht += Number(r.line_total_ht);
      buckets[key].vat += Number(r.line_total_vat);
      buckets[key].ttc += Number(r.line_total_ttc);
      buckets[key].count += 1;
    }

    const byRate = Object.entries(buckets)
      .map(([rate, v]) => ({ rate: Number(rate), ...v }))
      .sort((a, b) => b.rate - a.rate);

    const totals = byRate.reduce(
      (acc, b) => ({ ht: acc.ht + b.ht, vat: acc.vat + b.vat, ttc: acc.ttc + b.ttc }),
      { ht: 0, vat: 0, ttc: 0 }
    );

    return { byRate, totals };
  });

// ---------- RGPD: export client ----------
export const exportCustomerData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { customerId: string }) =>
    z.object({ customerId: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: customer, error } = await supabase
      .from("customers").select("*").eq("id", data.customerId).single();
    if (error) throw new Error(error.message);

    const { data: sales } = await supabase
      .from("sales")
      .select("*, sale_items(*)")
      .eq("customer_id", data.customerId);

    // Trace RGPD action
    await supabase.rpc("log_rgpd_action", {
      _customer_id: data.customerId,
      _action: "RGPD_EXPORT",
    });

    return {
      exported_at: new Date().toISOString(),
      customer,
      sales: sales ?? [],
    };
  });

// ---------- RGPD: anonymise client ----------
export const anonymizeCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { customerId: string }) =>
    z.object({ customerId: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("anonymize_customer", { _customer_id: data.customerId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
