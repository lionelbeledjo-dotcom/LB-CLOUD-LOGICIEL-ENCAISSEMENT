import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const STRIPE_SECRET_KEY = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY non configurée");
  return key;
};

const STRIPE_WEBHOOK_SECRET = () =>
  process.env.STRIPE_WEBHOOK_SECRET ?? process.env.SECRET_DU_WEBHOOK_STRIPE ?? "";

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

function mapStripePlanToLocal(sub: any): string {
  const priceId = sub.items?.data?.[0]?.price?.id ?? "";
  const amount = (sub.items?.data?.[0]?.price?.unit_amount ?? 0) / 100;

  if (priceId.includes("enterprise") || amount >= 99) return "entreprise";
  if (priceId.includes("premium") || amount >= 49) return "premium";
  if (priceId.includes("standard") || amount >= 19) return "standard";
  return "essai";
}

/**
 * Verify Stripe webhook signature using the raw body and crypto.subtle.
 * This avoids needing the full Stripe SDK.
 */
async function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  const parts = signatureHeader.split(",").reduce(
    (acc, part) => {
      const [key, value] = part.split("=");
      if (key === "t") acc.timestamp = value;
      if (key === "v1") acc.signatures.push(value);
      return acc;
    },
    { timestamp: "", signatures: [] as string[] },
  );

  if (!parts.timestamp || parts.signatures.length === 0) return false;

  const signedPayload = `${parts.timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return parts.signatures.some((sig) => sig === expectedSignature);
}

export const config = {
  api: {
    bodyParser: false,
  },
};

function getRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = await getRawBody(req);
    const signature = (req.headers["stripe-signature"] as string) ?? "";
    const secret = STRIPE_WEBHOOK_SECRET();

    if (!secret) {
      throw new Error("STRIPE_WEBHOOK_SECRET non configurée");
    }

    const isValid = await verifyStripeSignature(payload, signature, secret);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event = JSON.parse(payload);

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
          _billing_cycle:
            sub.items.data[0]?.price?.recurring?.interval === "year" ? "yearly" : "monthly",
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
        const status =
          sub.status === "active"
            ? "paid"
            : sub.status === "past_due"
              ? "overdue"
              : sub.status === "canceled"
                ? "cancelled"
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
            billing_cycle:
              sub.items.data[0]?.price?.recurring?.interval === "year" ? "yearly" : "monthly",
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

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Stripe webhook error:", error);
    return res.status(400).json({ error: error.message });
  }
}
