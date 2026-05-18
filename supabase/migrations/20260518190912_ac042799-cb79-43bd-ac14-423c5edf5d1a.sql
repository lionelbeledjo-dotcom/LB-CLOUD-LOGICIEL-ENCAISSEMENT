-- Sequence helper table for per-company invoice counters
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  company_id uuid NOT NULL,
  year_month text NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id, year_month)
);

ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

-- No direct access; only the SECURITY DEFINER function touches this table.
CREATE POLICY "no direct access invoice_counters"
ON public.invoice_counters FOR SELECT
USING (false);

CREATE OR REPLACE FUNCTION public.next_invoice_number(_company_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ym text := to_char(now(), 'YYYYMM');
  n integer;
BEGIN
  INSERT INTO public.invoice_counters (company_id, year_month, last_number)
  VALUES (_company_id, ym, 1)
  ON CONFLICT (company_id, year_month)
  DO UPDATE SET last_number = invoice_counters.last_number + 1
  RETURNING last_number INTO n;

  RETURN 'F-' || ym || '-' || lpad(n::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.create_sale(
  _company_id uuid,
  _payment_method payment_method,
  _customer_id uuid,
  _amount_paid numeric,
  _notes text,
  _items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id uuid;
  v_invoice text;
  v_total_ht numeric := 0;
  v_total_vat numeric := 0;
  v_total_ttc numeric := 0;
  v_uid uuid := auth.uid();
  it jsonb;
  v_qty numeric;
  v_price numeric;
  v_vat numeric;
  v_disc numeric;
  v_line_ht numeric;
  v_line_vat numeric;
  v_line_ttc numeric;
  v_product_id uuid;
  v_product_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_company_member(v_uid, _company_id) THEN
    RAISE EXCEPTION 'Not a member of this company';
  END IF;

  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'No items provided';
  END IF;

  -- Compute totals
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := COALESCE((it->>'quantity')::numeric, 0);
    v_price := COALESCE((it->>'unit_price_ht')::numeric, 0);
    v_vat := COALESCE((it->>'vat_rate')::numeric, 0);
    v_disc := COALESCE((it->>'discount_percent')::numeric, 0);

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Quantity must be positive';
    END IF;

    v_line_ht := round(v_qty * v_price * (1 - v_disc / 100), 2);
    v_line_vat := round(v_line_ht * v_vat / 100, 2);
    v_line_ttc := v_line_ht + v_line_vat;

    v_total_ht := v_total_ht + v_line_ht;
    v_total_vat := v_total_vat + v_line_vat;
    v_total_ttc := v_total_ttc + v_line_ttc;
  END LOOP;

  v_invoice := public.next_invoice_number(_company_id);

  INSERT INTO public.sales (
    company_id, invoice_number, total_ht, total_vat, total_ttc,
    payment_method, status, cashier_id, customer_id,
    amount_paid, amount_change, notes
  ) VALUES (
    _company_id, v_invoice, v_total_ht, v_total_vat, v_total_ttc,
    _payment_method, 'validee', v_uid, _customer_id,
    COALESCE(_amount_paid, v_total_ttc),
    GREATEST(COALESCE(_amount_paid, v_total_ttc) - v_total_ttc, 0),
    _notes
  )
  RETURNING id INTO v_sale_id;

  -- Insert items + decrement stock
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := COALESCE((it->>'quantity')::numeric, 0);
    v_price := COALESCE((it->>'unit_price_ht')::numeric, 0);
    v_vat := COALESCE((it->>'vat_rate')::numeric, 0);
    v_disc := COALESCE((it->>'discount_percent')::numeric, 0);
    v_product_id := NULLIF(it->>'product_id','')::uuid;
    v_product_name := COALESCE(it->>'product_name', 'Article');

    v_line_ht := round(v_qty * v_price * (1 - v_disc / 100), 2);
    v_line_vat := round(v_line_ht * v_vat / 100, 2);
    v_line_ttc := v_line_ht + v_line_vat;

    INSERT INTO public.sale_items (
      sale_id, company_id, product_id, product_name, quantity,
      unit_price_ht, vat_rate, discount_percent,
      line_total_ht, line_total_vat, line_total_ttc
    ) VALUES (
      v_sale_id, _company_id, v_product_id, v_product_name, v_qty,
      v_price, v_vat, v_disc,
      v_line_ht, v_line_vat, v_line_ttc
    );

    IF v_product_id IS NOT NULL THEN
      UPDATE public.products
      SET stock_quantity = stock_quantity - v_qty
      WHERE id = v_product_id AND company_id = _company_id;
    END IF;
  END LOOP;

  RETURN v_sale_id;
END;
$$;