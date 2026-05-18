
-- Sessions de caisse
CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  opened_by uuid NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  opening_amount numeric NOT NULL DEFAULT 0,
  closed_by uuid,
  closed_at timestamptz,
  closing_amount numeric,
  expected_cash numeric,
  variance numeric,
  status text NOT NULL DEFAULT 'open',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cash_sessions_one_open_per_company
  ON public.cash_sessions(company_id) WHERE status = 'open';

ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view sessions" ON public.cash_sessions FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Members open sessions" ON public.cash_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id) AND opened_by = auth.uid());
CREATE POLICY "Admins close sessions" ON public.cash_sessions FOR UPDATE TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));

-- Rattachement vente <-> session
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS session_id uuid;

-- Ouvrir une session
CREATE OR REPLACE FUNCTION public.open_cash_session(_company_id uuid, _opening_amount numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF NOT public.is_company_member(v_uid, _company_id) THEN
    RAISE EXCEPTION 'Permission refusée'; END IF;
  IF EXISTS (SELECT 1 FROM public.cash_sessions
    WHERE company_id = _company_id AND status = 'open') THEN
    RAISE EXCEPTION 'Une session est déjà ouverte';
  END IF;
  INSERT INTO public.cash_sessions (company_id, opened_by, opening_amount)
  VALUES (_company_id, v_uid, COALESCE(_opening_amount, 0))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Clôturer la session ouverte
CREATE OR REPLACE FUNCTION public.close_cash_session(
  _company_id uuid, _closing_amount numeric, _notes text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid; v_open numeric; v_cash_sales numeric; v_expected numeric;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF NOT public.is_company_admin(v_uid, _company_id) THEN
    RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;

  SELECT id, opening_amount INTO v_id, v_open
  FROM public.cash_sessions
  WHERE company_id = _company_id AND status = 'open'
  FOR UPDATE;

  IF v_id IS NULL THEN RAISE EXCEPTION 'Aucune session ouverte'; END IF;

  SELECT COALESCE(SUM(total_ttc),0) INTO v_cash_sales
  FROM public.sales
  WHERE session_id = v_id AND payment_method = 'especes';

  v_expected := COALESCE(v_open,0) + COALESCE(v_cash_sales,0);

  UPDATE public.cash_sessions SET
    status = 'closed', closed_at = now(), closed_by = v_uid,
    closing_amount = COALESCE(_closing_amount,0),
    expected_cash = v_expected,
    variance = COALESCE(_closing_amount,0) - v_expected,
    notes = _notes
  WHERE id = v_id;
  RETURN v_id;
END $$;

-- Rattacher automatiquement la vente à la session ouverte
CREATE OR REPLACE FUNCTION public.attach_sale_to_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NEW.session_id IS NULL THEN
    SELECT id INTO v_id FROM public.cash_sessions
    WHERE company_id = NEW.company_id AND status = 'open' LIMIT 1;
    NEW.session_id := v_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sales_attach_session ON public.sales;
CREATE TRIGGER sales_attach_session BEFORE INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.attach_sale_to_session();

-- Annulation sécurisée : crée un avoir (vente miroir négative) et restitue le stock
CREATE OR REPLACE FUNCTION public.cancel_sale(_sale_id uuid, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_orig public.sales%ROWTYPE;
  v_new_id uuid;
  v_invoice text;
  v_uid uuid := auth.uid();
  it RECORD;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;

  SELECT * INTO v_orig FROM public.sales WHERE id = _sale_id;
  IF v_orig.id IS NULL THEN RAISE EXCEPTION 'Vente introuvable'; END IF;
  IF NOT public.is_company_admin(v_uid, v_orig.company_id) THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  IF v_orig.is_credit_note THEN
    RAISE EXCEPTION 'Cette pièce est déjà un avoir';
  END IF;
  IF EXISTS (SELECT 1 FROM public.sales WHERE original_sale_id = _sale_id) THEN
    RAISE EXCEPTION 'Vente déjà annulée par un avoir';
  END IF;

  v_invoice := public.next_invoice_number(v_orig.company_id);

  INSERT INTO public.sales (
    company_id, invoice_number, total_ht, total_vat, total_ttc,
    payment_method, status, cashier_id, customer_id,
    amount_paid, amount_change, notes,
    is_credit_note, original_sale_id
  ) VALUES (
    v_orig.company_id, v_invoice,
    -v_orig.total_ht, -v_orig.total_vat, -v_orig.total_ttc,
    v_orig.payment_method, 'annulee', v_uid, v_orig.customer_id,
    -v_orig.total_ttc, 0,
    COALESCE(_reason, 'Annulation de ' || v_orig.invoice_number),
    true, v_orig.id
  ) RETURNING id INTO v_new_id;

  FOR it IN SELECT * FROM public.sale_items WHERE sale_id = _sale_id LOOP
    INSERT INTO public.sale_items (
      sale_id, company_id, product_id, product_name, quantity,
      unit_price_ht, vat_rate, discount_percent,
      line_total_ht, line_total_vat, line_total_ttc
    ) VALUES (
      v_new_id, it.company_id, it.product_id, it.product_name, -it.quantity,
      it.unit_price_ht, it.vat_rate, it.discount_percent,
      -it.line_total_ht, -it.line_total_vat, -it.line_total_ttc
    );
    IF it.product_id IS NOT NULL THEN
      UPDATE public.products SET stock_quantity = stock_quantity + it.quantity
      WHERE id = it.product_id;
    END IF;
  END LOOP;

  INSERT INTO public.audit_logs (company_id, user_id, action, target_table, target_id, metadata)
  VALUES (v_orig.company_id, v_uid, 'SALE_CANCEL', 'sales', _sale_id,
    jsonb_build_object('credit_note_id', v_new_id, 'reason', _reason, 'at', now()));

  RETURN v_new_id;
END $$;
