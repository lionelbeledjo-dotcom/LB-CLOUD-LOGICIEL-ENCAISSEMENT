
-- Ajouter les colonnes Stripe à la table companies (si elles n'existent pas encore)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN stripe_customer_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN stripe_subscription_id TEXT;
  END IF;
END $$;

-- Ajouter les colonnes Stripe à la table subscription_plans_catalog (si elles n'existent pas encore)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscription_plans_catalog' AND column_name = 'stripe_price_id_monthly'
  ) THEN
    ALTER TABLE public.subscription_plans_catalog ADD COLUMN stripe_price_id_monthly TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscription_plans_catalog' AND column_name = 'stripe_price_id_yearly'
  ) THEN
    ALTER TABLE public.subscription_plans_catalog ADD COLUMN stripe_price_id_yearly TEXT;
  END IF;
END $$;

-- Mettre à jour le catalogue des plans avec les IDs Stripe
UPDATE public.subscription_plans_catalog
SET stripe_price_id_monthly = 'price_1TcOIUJ4UIuMOfZBshlgxml0',
    stripe_price_id_yearly  = 'price_1TcOIUJ4UIuMOfZBOavROvM8'
WHERE plan = 'standard';

UPDATE public.subscription_plans_catalog
SET stripe_price_id_monthly = 'price_1TcOJ7J4UIuMOfZBYO5wwWtH',
    stripe_price_id_yearly  = 'price_1TcOJcJ4UIuMOfZBsYSettf9'
WHERE plan = 'premium';

UPDATE public.subscription_plans_catalog
SET stripe_price_id_monthly = 'price_1TcOJxJ4UIuMOfZBxEE5worP',
    stripe_price_id_yearly  = 'price_1TcOKIJ4UIuMOfZBkwsEMkyI'
WHERE plan = 'entreprise';
