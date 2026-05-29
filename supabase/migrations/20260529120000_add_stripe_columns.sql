-- Add Stripe integration columns to companies table
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add Stripe price IDs to subscription plans catalog
ALTER TABLE public.subscription_plans_catalog
  ADD COLUMN IF NOT EXISTS stripe_price_id_monthly TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id_yearly TEXT;

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer_id
  ON public.companies (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_companies_stripe_subscription_id
  ON public.companies (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
