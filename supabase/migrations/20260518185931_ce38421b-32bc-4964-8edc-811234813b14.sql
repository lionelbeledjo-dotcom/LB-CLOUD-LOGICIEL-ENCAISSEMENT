
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.payment_method AS ENUM ('especes', 'carte', 'cheque', 'virement', 'ticket_restaurant', 'autre');
CREATE TYPE public.sale_status AS ENUM ('en_cours', 'validee', 'annulee', 'remboursee');

-- =========================================================
-- PRODUCTS
-- =========================================================
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sku text,
  barcode text,
  purchase_price numeric(12,4) NOT NULL DEFAULT 0,
  sale_price numeric(12,4) NOT NULL DEFAULT 0,
  vat_rate numeric(5,2) NOT NULL DEFAULT 20.00,
  stock_quantity numeric(12,3) NOT NULL DEFAULT 0,
  stock_alert_threshold numeric(12,3) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'piece',
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, sku),
  UNIQUE (company_id, barcode)
);
CREATE INDEX idx_products_company ON public.products(company_id);
CREATE INDEX idx_products_barcode ON public.products(company_id, barcode);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view company products"
  ON public.products FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins manage products"
  ON public.products FOR ALL TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));

CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- CUSTOMERS
-- =========================================================
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country text NOT NULL DEFAULT 'France',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_company ON public.customers(company_id);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view company customers"
  ON public.customers FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Members create company customers"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins update company customers"
  ON public.customers FOR UPDATE TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Admins delete company customers"
  ON public.customers FOR DELETE TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id));

CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- SALES (tickets / factures)
-- =========================================================
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  cashier_id uuid,
  status public.sale_status NOT NULL DEFAULT 'validee',
  payment_method public.payment_method NOT NULL DEFAULT 'especes',
  total_ht numeric(12,2) NOT NULL DEFAULT 0,
  total_vat numeric(12,2) NOT NULL DEFAULT 0,
  total_ttc numeric(12,2) NOT NULL DEFAULT 0,
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  amount_change numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  sold_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, invoice_number)
);
CREATE INDEX idx_sales_company ON public.sales(company_id);
CREATE INDEX idx_sales_sold_at ON public.sales(company_id, sold_at DESC);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view company sales"
  ON public.sales FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Members create company sales"
  ON public.sales FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins update company sales"
  ON public.sales FOR UPDATE TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Admins delete company sales"
  ON public.sales FOR DELETE TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id));

CREATE TRIGGER trg_sales_updated BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- SALE ITEMS
-- =========================================================
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity numeric(12,3) NOT NULL DEFAULT 1,
  unit_price_ht numeric(12,4) NOT NULL DEFAULT 0,
  vat_rate numeric(5,2) NOT NULL DEFAULT 20.00,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  line_total_ht numeric(12,2) NOT NULL DEFAULT 0,
  line_total_vat numeric(12,2) NOT NULL DEFAULT 0,
  line_total_ttc numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX idx_sale_items_company ON public.sale_items(company_id);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view company sale items"
  ON public.sale_items FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Members create company sale items"
  ON public.sale_items FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins update company sale items"
  ON public.sale_items FOR UPDATE TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Admins delete company sale items"
  ON public.sale_items FOR DELETE TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id));

-- =========================================================
-- AUDIT LOGS (journal inaltérable côté applicatif)
-- =========================================================
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_company ON public.audit_logs(company_id, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins (et super admins) consultent les logs ; aucun update/delete (préparation NF525)
CREATE POLICY "Admins view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Members insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
