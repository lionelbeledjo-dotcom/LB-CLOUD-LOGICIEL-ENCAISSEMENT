-- ─────────── Table des mouvements de stock
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN
    ('entree','sortie','inventaire','perte','ajustement','retour')),
  quantity numeric NOT NULL,           -- signé : >0 entrée, <0 sortie
  quantity_before numeric NOT NULL,
  quantity_after numeric NOT NULL,
  unit_cost numeric NOT NULL DEFAULT 0, -- prix d'achat pour valorisation
  total_value numeric NOT NULL DEFAULT 0,
  reason text,
  reference text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_company_date
  ON public.stock_movements(company_id, created_at DESC);
CREATE INDEX idx_stock_movements_product
  ON public.stock_movements(product_id, created_at DESC);
CREATE INDEX idx_stock_movements_type
  ON public.stock_movements(company_id, movement_type, created_at DESC);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view stock movements"
  ON public.stock_movements FOR SELECT TO authenticated
  USING (is_company_member(auth.uid(), company_id) OR is_super_admin(auth.uid()));

-- Aucune policy INSERT/UPDATE/DELETE : seule la fonction SECURITY DEFINER écrit.

-- ─────────── Fonction d'enregistrement atomique d'un mouvement
CREATE OR REPLACE FUNCTION public.record_stock_movement(
  _product_id uuid,
  _movement_type text,
  _quantity numeric,           -- valeur absolue saisie par l'utilisateur
  _unit_cost numeric DEFAULT NULL,
  _reason text DEFAULT NULL,
  _reference text DEFAULT NULL,
  _target_quantity numeric DEFAULT NULL  -- pour inventaire : nouvelle valeur absolue
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
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

  -- Calcul du delta selon le type
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
    ELSE  -- sortie, perte, ajustement (signé négatif par convention ici)
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
    unit_cost, total_value, reason, reference, user_id
  ) VALUES (
    v_company, _product_id, v_name, _movement_type,
    v_delta, v_before, v_after,
    v_cost, ROUND(abs(v_delta) * v_cost, 2),
    _reason, _reference, v_uid
  ) RETURNING id INTO v_id;

  RETURN v_id;
END $$;