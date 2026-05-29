import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STRIPE_SECRET_KEY = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY non configurée");
  return key;
};

const STRIPE_WEBHOOK_SECRET = () =>
  process.env.STRIPE_WEBHOOK_SECRET ?? process.env.SECRET_DU_WEBHOOK_STRIPE ?? "";

const SITE_URL = () =>
  process.env.SITE_URL ?? process.env.URL_DU_SITE ?? "https://pro-gestion-coeur.lovable.app";

async function stripeRequest(path: string, body?: Record<string, string>, method = "POST") {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Erreur Stripe");
  return data;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string; priceId: string; billingCycle: "monthly" | "yearly" }) =>
    z.object({
      companyId: z.string().uuid(),
      priceId: z.string().min(1),
      billingCycle: z.enum(["monthly", "yearly"]),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, user } = context;

    const { data: member } = await supabase
      .from("company_members")
      .select("role")
      .eq("company_id", data.companyId)
      .eq("user_id", user.id)
      .eq("role", "admin_entreprise")
      .maybeSingle();

    if (!member) throw new Error("Accès refusé — admin entreprise requis");

    const { data: company } = await supabase
      .from("companies")
      .select("id, name, stripe_customer_id")
      .eq("id", data.companyId)
      .single();

    if (!company) throw new Error("Entreprise introuvable");

    let customerId = company.stripe_customer_id;

    if (!customerId) {
      const customer = await stripeRequest("/customers", {
        name: company.name,
        "metadata[company_id]": company.id,
        "metadata[user_id]": user.id,
        email: user.email ?? "",
      });
      customerId = customer.id;

      await supabase
        .from("companies")
        .update({ stripe_customer_id: customerId })
        .eq("id", company.id);
    }

    const session = await stripeRequest("/checkout/sessions", {
      customer: customerId,
      mode: "subscription",
      "line_items[0][price]": data.priceId,
      "line_items[0][quantity]": "1",
      success_url: `${SITE_URL()}/parametres?checkout=success`,
      cancel_url: `${SITE_URL()}/parametres?checkout=cancel`,
      "metadata[company_id]": data.companyId,
      "subscription_data[metadata][company_id]": data.companyId,
      allow_promotion_codes: "true",
      billing_address_collection: "required",
      tax_id_collection: "true" as any,
    } as any);

    return { url: session.url };
  });

export const createCustomerPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string }) =>
    z.object({ companyId: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, user } = context;

    const { data: member } = await supabase
      .from("company_members")
      .select("role")
      .eq("company_id", data.companyId)
      .eq("user_id", user.id)
      .eq("role", "admin_entreprise")
      .maybeSingle();

    if (!member) throw new Error("Accès refusé");

    const { data: company } = await supabase
      .from("companies")
      .select("stripe_customer_id")
      .eq("id", data.companyId)
      .single();

    if (!company?.stripe_customer_id) {
      throw new Error("Aucun abonnement Stripe actif pour cette entreprise");
    }

    const session = await stripeRequest("/billing_portal/sessions", {
      customer: company.stripe_customer_id,
      return_url: `${SITE_URL()}/parametres`,
    });

    return { url: session.url };
  });

export const handleStripeWebhook = createServerFn({ method: "POST" })
  .inputValidator((d: { payload: string; signature: string }) =>
    z.object({ payload: z.string(), signature: z.string() }).parse(d)
  )
  .handler(async ({ data }) => {
    const secret = STRIPE_WEBHOOK_SECRET();
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET non configurée");

    const event = JSON.parse(data.payload);

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const companyId = session.metadata?.company_id;
        if (!companyId) break;

        const subscriptionId = session.subscription;
        const sub = await stripeRequest(`/subscriptions/${subscriptionId}`, undefined, "GET");
        const plan = mapStripePlanToLocal(sub);

        await supabase
          .from("companies")
          .update({
            subscription_plan: plan,
            stripe_customer_id: session.customer,
            stripe_subscription_id: subscriptionId,
            is_active: true,
          })
          .eq("id", companyId);

        await (supabase.rpc as any)("super_admin_upsert_billing", {
          _company_id: companyId,
          _billing_cycle: sub.items.data[0]?.price?.recurring?.interval === "year" ? "yearly" : "monthly",
          _next_billing_at: new Date(sub.current_period_end * 1000).toISOString(),
          _payment_status: "paid",
          _payment_method: "stripe",
          _notes: `Stripe sub: ${subscriptionId}`,
        });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (!subId) break;

        const { data: company } = await supabase
          .from("companies")
          .select("id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle();

        if (company) {
          await (supabase.rpc as any)("super_admin_create_subscription_invoice", {
            _company_id: company.id,
            _plan: "standard",
            _billing_cycle: "monthly",
            _period_start: new Date(invoice.period_start * 1000).toISOString().slice(0, 10),
            _period_end: new Date(invoice.period_end * 1000).toISOString().slice(0, 10),
            _amount_ht: (invoice.subtotal ?? 0) / 100,
            _vat_rate: 20,
            _status: "paid",
          });

          await supabase
            .from("company_billing")
            .update({ payment_status: "paid" })
            .eq("company_id", company.id);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (!subId) break;

        const { data: company } = await supabase
          .from("companies")
          .select("id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle();

        if (company) {
          await supabase
            .from("company_billing")
            .update({ payment_status: "overdue" })
            .eq("company_id", company.id);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const companyId = sub.metadata?.company_id;
        if (!companyId) break;

        const plan = mapStripePlanToLocal(sub);
        const status = sub.status === "active" ? "paid"
          : sub.status === "past_due" ? "overdue"
          : sub.status === "canceled" ? "cancelled"
          : "pending";

        await supabase
          .from("companies")
          .update({
            subscription_plan: plan,
            is_active: sub.status !== "canceled",
          })
          .eq("id", companyId);

        await supabase
          .from("company_billing")
          .update({
            payment_status: status,
            next_billing_at: new Date(sub.current_period_end * 1000).toISOString(),
            billing_cycle: sub.items.data[0]?.price?.recurring?.interval === "year" ? "yearly" : "monthly",
          })
          .eq("company_id", companyId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const companyId = sub.metadata?.company_id;
        if (!companyId) break;

        await supabase
          .from("companies")
          .update({ subscription_plan: "essai", is_active: false, stripe_subscription_id: null })
          .eq("id", companyId);

        await supabase
          .from("company_billing")
          .update({ payment_status: "cancelled" })
          .eq("company_id", companyId);
        break;
      }
    }

    return { received: true };
  });

function mapStripePlanToLocal(sub: any): string {
  const priceId = sub.items?.data?.[0]?.price?.id ?? "";
  const amount = (sub.items?.data?.[0]?.price?.unit_amount ?? 0) / 100;

  if (priceId.includes("enterprise") || amount >= 99) return "entreprise";
  if (priceId.includes("premium") || amount >= 49) return "premium";
  if (priceId.includes("standard") || amount >= 19) return "standard";
  return "essai";
}
