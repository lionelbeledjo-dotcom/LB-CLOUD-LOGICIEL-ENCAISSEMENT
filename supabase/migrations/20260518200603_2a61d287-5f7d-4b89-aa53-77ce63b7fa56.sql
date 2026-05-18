
ALTER TABLE public.stock_movements
  ADD COLUMN lot_number text,
  ADD COLUMN expiry_date date;

CREATE INDEX idx_stock_movements_lot ON public.stock_movements(lot_number);
CREATE INDEX idx_stock_movements_expiry ON public.stock_movements(expiry_date);

CREATE OR REPLACE FUNCTION public.record_stock_movement(
  _product_id uuid,
  _movement_type text,
  _quantity numeric,
  _unit_cost numeric DEFAULT NULL,
  _reason text DEFAULT NULL,
  _reference text DEFAULT NULL,
  _target_quantity numeric DEFAULT NULL,
  _supplier_id uuid DEFAULT NULL,
  _invoice_number text DEFAULT NULL,
  _lot_number text DEFAULT NULL,
  _expiry_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_company uuid;
  v_name text;
  v_before numeric;
  v_purchase numeric;
  v_after numeric;
  v_delta numeric;
  v_cost numeric;
  v_id uuid;
  v_supplier_name text;
  v_supplier_company uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF _movement_type NOT IN ('entree','sortie','inventaire','perte','ajustement','retour') THEN
    RAISE EXCEPTION 'Type de mouvement invalide : %', _movement_type;
  END IF;

  SELECT company_id, name, stock_quantity, purchase_price
    INTO v_company, v_name, v_before, v_purchase
  FROM public.products
  WHERE id = _product_id
  FOR UPDATE;

  IF v_company IS NULL THEN RAISE EXCEPTION 'Produit introuvable'; END IF;
  IF NOT public.is_company_admin(v_uid, v_company) THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;

  IF _supplier_id IS NOT NULL THEN
    SELECT company_id, name INTO v_supplier_company, v_supplier_name
    FROM public.suppliers WHERE id = _supplier_id;
    IF v_supplier_company IS NULL OR v_supplier_company <> v_company THEN
      RAISE EXCEPTION 'Fournisseur invalide';
    END IF;
  END IF;

  IF _expiry_date IS NOT NULL AND _expiry_date < CURRENT_DATE - INTERVAL '1 day' THEN
    RAISE EXCEPTION 'Date d''expiration déjà passée : %', _expiry_date;
  END IF;

  IF _movement_type = 'inventaire' THEN
    IF _target_quantity IS NULL THEN
      RAISE EXCEPTION 'Quantité cible requise pour un inventaire';
    END IF;
    IF _target_quantity < 0 THEN
      RAISE EXCEPTION 'Quantité d''inventaire négative interdite';
    END IF;
    v_after := _target_quantity;
    v_delta := v_after - v_before;
  ELSE
    IF _quantity IS NULL OR _quantity <= 0 THEN
      RAISE EXCEPTION 'Quantité strictement positive requise';
    END IF;
    IF _movement_type IN ('entree','retour') THEN
      v_delta := _quantity;
    ELSE
      v_delta := -_quantity;
    END IF;
    v_after := v_before + v_delta;
    IF v_after < 0 THEN
      RAISE EXCEPTION 'Stock insuffisant pour "%": disponible % / demandé %',
        v_name, v_before, _quantity;
    END IF;
  END IF;

  v_cost := COALESCE(_unit_cost, v_purchase, 0);

  UPDATE public.products
  SET stock_quantity = v_after, updated_at = now()
  WHERE id = _product_id;

  INSERT INTO public.stock_movements (
    company_id, product_id, product_name, movement_type,
    quantity, quantity_before, quantity_after,
    unit_cost, total_value, reason, reference, user_id,
    supplier_id, supplier_name, invoice_number,
    lot_number, expiry_date
  ) VALUES (
    v_company, _product_id, v_name, _movement_type,
    v_delta, v_before, v_after,
    v_cost, ROUND(abs(v_delta) * v_cost, 2),
    _reason, _reference, v_uid,
    _supplier_id, v_supplier_name, _invoice_number,
    NULLIF(trim(COALESCE(_lot_number, '')), ''), _expiry_date
  ) RETURNING id INTO v_id;

  RETURN v_id;
END
$function$;
