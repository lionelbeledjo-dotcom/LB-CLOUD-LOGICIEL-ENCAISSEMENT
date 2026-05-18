
-- ============================================================
-- 1) CATALOGUE DES PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans_catalog (
  plan subscription_plan PRIMARY KEY,
  label text NOT NULL,
  description text,
  monthly_price numeric(10,2) NOT NULL DEFAULT 0,
  yearly_price numeric(10,2) NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view plans"
  ON public.subscription_plans_catalog
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins manage plans"
  ON public.subscription_plans_catalog
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.subscription_plans_catalog (plan, label, description, monthly_price, yearly_price, features) VALUES
  ('essai',      'Essai gratuit', '14 jours pour tester toutes les fonctionnalités.', 0,    0,     '["1 utilisateur","Données limitées","Support email"]'::jsonb),
  ('standard',   'Standard',      'Idéal pour un point de vente unique.',              29,   290,   '["3 utilisateurs","Stocks illimités","NF525","Support email"]'::jsonb),
  ('premium',    'Premium',       'Multi-utilisateurs, conformité avancée.',           79,   790,   '["10 utilisateurs","Multi-caisses","Comptabilité","Support prioritaire"]'::jsonb),
  ('entreprise', 'Entreprise',    'Grands comptes, multi-sites.',                       199,  1990,  '["Utilisateurs illimités","Multi-sites","API","Account manager dédié"]'::jsonb)
ON CONFLICT (plan) DO UPDATE
SET label = EXCLUDED.label,
    description = EXCLUDED.description,
    monthly_price = EXCLUDED.monthly_price,
    yearly_price = EXCLUDED.yearly_price,
    features = EXCLUDED.features,
    updated_at = now();

-- ============================================================
-- 2) FACTURATION PAR ENTREPRISE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.company_billing (
  company_id uuid PRIMARY KEY,
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  next_billing_at timestamptz,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid','pending','overdue','cancelled','trial')),
  payment_method text,
  notes text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view their billing"
  ON public.company_billing
  FOR SELECT TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage billing"
  ON public.company_billing
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ============================================================
-- 3) FACTURES D'ABONNEMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  invoice_number text NOT NULL UNIQUE,
  plan subscription_plan NOT NULL,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  amount_ht numeric(12,2) NOT NULL DEFAULT 0,
  vat_rate numeric(5,2) NOT NULL DEFAULT 20.00,
  vat_amount numeric(12,2) NOT NULL DEFAULT 0,
  amount_ttc numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('draft','issued','paid','overdue','cancelled')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_invoices_company ON public.subscription_invoices(company_id, issued_at DESC);

ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view their subscription invoices"
  ON public.subscription_invoices
  FOR SELECT TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage subscription invoices"
  ON public.subscription_invoices
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ============================================================
-- 4) FONCTIONS SUPER ADMIN
-- ============================================================
CREATE OR REPLACE FUNCTION public.super_admin_upsert_billing(
  _company_id uuid,
  _billing_cycle text,
  _next_billing_at timestamptz,
  _payment_status text,
  _payment_method text,
  _notes text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF NOT public.is_super_admin(v_uid) THEN
    RAISE EXCEPTION 'Réservé aux super administrateurs';
  END IF;
  IF _billing_cycle NOT IN ('monthly','yearly') THEN
    RAISE EXCEPTION 'Cycle invalide';
  END IF;
  IF _payment_status NOT IN ('paid','pending','overdue','cancelled','trial') THEN
    RAISE EXCEPTION 'Statut invalide';
  END IF;

  INSERT INTO public.company_billing (
    company_id, billing_cycle, next_billing_at, payment_status, payment_method, notes, updated_by, updated_at
  ) VALUES (
    _company_id, _billing_cycle, _next_billing_at, _payment_status, _payment_method, _notes, v_uid, now()
  )
  ON CONFLICT (company_id) DO UPDATE
  SET billing_cycle = EXCLUDED.billing_cycle,
      next_billing_at = EXCLUDED.next_billing_at,
      payment_status = EXCLUDED.payment_status,
      payment_method = EXCLUDED.payment_method,
      notes = EXCLUDED.notes,
      updated_by = v_uid,
      updated_at = now();

  INSERT INTO public.audit_logs (company_id, user_id, action, target_table, target_id, metadata)
  VALUES (_company_id, v_uid, 'SUPER_ADMIN_BILLING_UPDATE', 'company_billing', _company_id,
          jsonb_build_object('cycle', _billing_cycle, 'status', _payment_status, 'at', now()));
END $$;

CREATE OR REPLACE FUNCTION public.super_admin_create_subscription_invoice(
  _company_id uuid,
  _plan subscription_plan,
  _billing_cycle text,
  _period_start date,
  _period_end date,
  _amount_ht numeric,
  _vat_rate numeric,
  _status text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_num text;
  v_seq int;
  v_vat numeric;
  v_ttc numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF NOT public.is_super_admin(v_uid) THEN
    RAISE EXCEPTION 'Réservé aux super administrateurs';
  END IF;
  IF _billing_cycle NOT IN ('monthly','yearly') THEN
    RAISE EXCEPTION 'Cycle invalide';
  END IF;
  IF _amount_ht < 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  IF COALESCE(_status, 'issued') NOT IN ('draft','issued','paid','overdue','cancelled') THEN
    RAISE EXCEPTION 'Statut invalide';
  END IF;

  SELECT COUNT(*) + 1 INTO v_seq FROM public.subscription_invoices
   WHERE date_trunc('month', issued_at) = date_trunc('month', now());
  v_num := 'SUB-' || to_char(now(), 'YYYYMM') || '-' || lpad(v_seq::text, 5, '0');

  v_vat := round(_amount_ht * COALESCE(_vat_rate, 20) / 100, 2);
  v_ttc := _amount_ht + v_vat;

  INSERT INTO public.subscription_invoices (
    company_id, invoice_number, plan, billing_cycle,
    period_start, period_end, amount_ht, vat_rate, vat_amount, amount_ttc,
    status, paid_at, created_by
  ) VALUES (
    _company_id, v_num, _plan, _billing_cycle,
    _period_start, _period_end, _amount_ht, COALESCE(_vat_rate, 20), v_vat, v_ttc,
    COALESCE(_status, 'issued'),
    CASE WHEN _status = 'paid' THEN now() ELSE NULL END,
    v_uid
  ) RETURNING id INTO v_id;

  INSERT INTO public.audit_logs (company_id, user_id, action, target_table, target_id, metadata)
  VALUES (_company_id, v_uid, 'SUPER_ADMIN_INVOICE_CREATE', 'subscription_invoices', v_id,
          jsonb_build_object('invoice', v_num, 'ttc', v_ttc, 'at', now()));

  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.super_admin_mark_invoice_paid(_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_company uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF NOT public.is_super_admin(v_uid) THEN
    RAISE EXCEPTION 'Réservé aux super administrateurs';
  END IF;

  UPDATE public.subscription_invoices
     SET status = 'paid', paid_at = now()
   WHERE id = _invoice_id
  RETURNING company_id INTO v_company;

  IF NOT FOUND THEN RAISE EXCEPTION 'Facture introuvable'; END IF;

  INSERT INTO public.audit_logs (company_id, user_id, action, target_table, target_id, metadata)
  VALUES (v_company, v_uid, 'SUPER_ADMIN_INVOICE_PAID', 'subscription_invoices', _invoice_id,
          jsonb_build_object('at', now()));
END $$;
