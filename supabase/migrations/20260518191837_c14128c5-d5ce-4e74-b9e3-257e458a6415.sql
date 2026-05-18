
-- =====================================================
-- BLOC 3 — NF525 + RGPD
-- =====================================================

-- TVA RATES ------------------------------------------------
CREATE TABLE public.vat_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  rate numeric(5,2) NOT NULL,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, rate)
);
ALTER TABLE public.vat_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view vat rates" ON public.vat_rates
  FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins manage vat rates" ON public.vat_rates
  FOR ALL TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));

-- Seed default rates for existing companies
INSERT INTO public.vat_rates (company_id, rate, label)
SELECT c.id, r.rate, r.label
FROM public.companies c
CROSS JOIN (VALUES
  (20.00, 'Taux normal'),
  (10.00, 'Taux intermédiaire'),
  (5.50,  'Taux réduit'),
  (2.10,  'Taux particulier')
) AS r(rate, label)
ON CONFLICT DO NOTHING;

-- Auto-seed for new companies
CREATE OR REPLACE FUNCTION public.seed_vat_rates_for_company()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.vat_rates (company_id, rate, label) VALUES
    (NEW.id, 20.00, 'Taux normal'),
    (NEW.id, 10.00, 'Taux intermédiaire'),
    (NEW.id, 5.50,  'Taux réduit'),
    (NEW.id, 2.10,  'Taux particulier')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_vat_rates
AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.seed_vat_rates_for_company();

-- NF525: SALES IMMUTABILITY --------------------------------
ALTER TABLE public.sales
  ADD COLUMN sequence_number bigint,
  ADD COLUMN previous_hash text,
  ADD COLUMN current_hash text,
  ADD COLUMN signed_at timestamptz,
  ADD COLUMN is_locked boolean NOT NULL DEFAULT true,
  ADD COLUMN is_credit_note boolean NOT NULL DEFAULT false,
  ADD COLUMN original_sale_id uuid REFERENCES public.sales(id);

CREATE TABLE public.sale_sequences (
  company_id uuid PRIMARY KEY,
  last_number bigint NOT NULL DEFAULT 0
);
ALTER TABLE public.sale_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no direct access sale_sequences" ON public.sale_sequences FOR SELECT USING (false);

-- Function: compute & assign hash + sequence before insert
CREATE OR REPLACE FUNCTION public.sales_seal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seq bigint;
  v_prev text;
  v_payload text;
BEGIN
  INSERT INTO public.sale_sequences (company_id, last_number)
  VALUES (NEW.company_id, 1)
  ON CONFLICT (company_id) DO UPDATE SET last_number = sale_sequences.last_number + 1
  RETURNING last_number INTO v_seq;

  SELECT current_hash INTO v_prev
  FROM public.sales
  WHERE company_id = NEW.company_id AND sequence_number = v_seq - 1;

  NEW.sequence_number := v_seq;
  NEW.previous_hash := COALESCE(v_prev, 'GENESIS');
  v_payload := COALESCE(v_prev, 'GENESIS') || '|' || NEW.invoice_number || '|'
            || NEW.total_ht::text || '|' || NEW.total_vat::text || '|'
            || NEW.total_ttc::text || '|' || NEW.sold_at::text;
  NEW.current_hash := encode(digest(v_payload, 'sha256'), 'hex');
  NEW.signed_at := now();
  NEW.is_locked := true;
  RETURN NEW;
END;
$$;

-- Need pgcrypto for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TRIGGER trg_sales_seal
BEFORE INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.sales_seal();

-- Lock against UPDATE/DELETE
CREATE OR REPLACE FUNCTION public.sales_prevent_modification()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_locked THEN
      RAISE EXCEPTION 'Vente scellée (NF525) : suppression interdite. Émettez un avoir.' USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  ELSE
    IF OLD.is_locked AND (
      NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
      OR NEW.total_ht IS DISTINCT FROM OLD.total_ht
      OR NEW.total_vat IS DISTINCT FROM OLD.total_vat
      OR NEW.total_ttc IS DISTINCT FROM OLD.total_ttc
      OR NEW.sold_at IS DISTINCT FROM OLD.sold_at
      OR NEW.sequence_number IS DISTINCT FROM OLD.sequence_number
      OR NEW.current_hash IS DISTINCT FROM OLD.current_hash
      OR NEW.previous_hash IS DISTINCT FROM OLD.previous_hash
    ) THEN
      RAISE EXCEPTION 'Vente scellée (NF525) : modification des champs comptables interdite.' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_sales_no_modify
BEFORE UPDATE OR DELETE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.sales_prevent_modification();

-- Lock sale_items when parent sale is locked
CREATE OR REPLACE FUNCTION public.sale_items_prevent_modification()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_locked boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT is_locked INTO v_locked FROM public.sales WHERE id = OLD.sale_id;
    IF v_locked THEN
      RAISE EXCEPTION 'Ligne de vente scellée (NF525) : suppression interdite.' USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  ELSE
    SELECT is_locked INTO v_locked FROM public.sales WHERE id = NEW.sale_id;
    IF v_locked THEN
      RAISE EXCEPTION 'Ligne de vente scellée (NF525) : modification interdite.' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_sale_items_no_modify
BEFORE UPDATE OR DELETE ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.sale_items_prevent_modification();

-- SALES JOURNAL (append-only) ------------------------------
CREATE TABLE public.sales_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL,
  company_id uuid NOT NULL,
  sequence_number bigint NOT NULL,
  invoice_number text NOT NULL,
  total_ht numeric NOT NULL,
  total_vat numeric NOT NULL,
  total_ttc numeric NOT NULL,
  previous_hash text NOT NULL,
  current_hash text NOT NULL,
  sold_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view sales journal" ON public.sales_journal
  FOR SELECT TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));
-- No INSERT/UPDATE/DELETE policies => append-only via trigger only

CREATE OR REPLACE FUNCTION public.sales_record_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.sales_journal (
    sale_id, company_id, sequence_number, invoice_number,
    total_ht, total_vat, total_ttc, previous_hash, current_hash, sold_at
  ) VALUES (
    NEW.id, NEW.company_id, NEW.sequence_number, NEW.invoice_number,
    NEW.total_ht, NEW.total_vat, NEW.total_ttc,
    NEW.previous_hash, NEW.current_hash, NEW.sold_at
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sales_journal
AFTER INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.sales_record_journal();

-- INVOICE ARCHIVES -----------------------------------------
CREATE TABLE public.invoice_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL UNIQUE,
  company_id uuid NOT NULL,
  payload jsonb NOT NULL,
  hash text NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view archives" ON public.invoice_archives
  FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));
-- No write policies => only via SECURITY DEFINER function

CREATE OR REPLACE FUNCTION public.archive_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_payload jsonb;
BEGIN
  -- Defer to statement-level via simple snapshot of header; items archived separately
  v_payload := jsonb_build_object(
    'sale', to_jsonb(NEW),
    'company', (SELECT to_jsonb(c) FROM public.companies c WHERE c.id = NEW.company_id),
    'customer', (SELECT to_jsonb(cu) FROM public.customers cu WHERE cu.id = NEW.customer_id)
  );
  INSERT INTO public.invoice_archives (sale_id, company_id, payload, hash)
  VALUES (NEW.id, NEW.company_id, v_payload, NEW.current_hash)
  ON CONFLICT (sale_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_archive_invoice
AFTER INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.archive_invoice();

-- Update archive with items after items inserted (called via separate flow if needed)
CREATE OR REPLACE FUNCTION public.archive_invoice_items()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.invoice_archives
  SET payload = payload || jsonb_build_object(
    'items', (SELECT jsonb_agg(to_jsonb(si)) FROM public.sale_items si WHERE si.sale_id = NEW.sale_id)
  )
  WHERE sale_id = NEW.sale_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_archive_items
AFTER INSERT ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.archive_invoice_items();

-- AUDIT LOGS — extended ------------------------------------
ALTER TABLE public.audit_logs
  ADD COLUMN old_values jsonb,
  ADD COLUMN new_values jsonb;

CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_company uuid;
  v_target uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_company := (to_jsonb(OLD)->>'company_id')::uuid;
    v_target := (to_jsonb(OLD)->>'id')::uuid;
  ELSE
    v_company := (to_jsonb(NEW)->>'company_id')::uuid;
    v_target := (to_jsonb(NEW)->>'id')::uuid;
  END IF;

  IF v_company IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  INSERT INTO public.audit_logs (
    company_id, user_id, action, target_table, target_id, old_values, new_values
  ) VALUES (
    v_company, auth.uid(), TG_OP, TG_TABLE_NAME, v_target,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_products AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER trg_audit_customers AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER trg_audit_sales AFTER INSERT OR UPDATE OR DELETE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER trg_audit_companies AFTER UPDATE OR DELETE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- RGPD: anonymise customer (preserve NF525 chain) ----------
CREATE OR REPLACE FUNCTION public.anonymize_customer(_customer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid;
BEGIN
  SELECT company_id INTO v_company FROM public.customers WHERE id = _customer_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Client introuvable'; END IF;
  IF NOT public.is_company_admin(auth.uid(), v_company) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  UPDATE public.customers SET
    full_name = '[SUPPRIMÉ RGPD ' || to_char(now(),'YYYY-MM-DD') || ']',
    email = NULL, phone = NULL,
    address_line1 = NULL, address_line2 = NULL,
    postal_code = NULL, city = NULL,
    notes = NULL, is_active = false
  WHERE id = _customer_id;
END;
$$;

-- Indexes
CREATE INDEX idx_sales_company_sequence ON public.sales(company_id, sequence_number);
CREATE INDEX idx_sales_journal_company ON public.sales_journal(company_id, sequence_number);
CREATE INDEX idx_audit_logs_company_time ON public.audit_logs(company_id, created_at DESC);
CREATE INDEX idx_invoice_archives_company ON public.invoice_archives(company_id, archived_at DESC);
