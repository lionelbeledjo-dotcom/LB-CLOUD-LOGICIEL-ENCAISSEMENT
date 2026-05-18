-- Audit RGPD: log export + extend anonymisation to write audit entry
CREATE OR REPLACE FUNCTION public.log_rgpd_action(_customer_id uuid, _action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_company uuid;
BEGIN
  SELECT company_id INTO v_company FROM public.customers WHERE id = _customer_id;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Client introuvable'; END IF;
  IF NOT public.is_company_member(auth.uid(), v_company) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  INSERT INTO public.audit_logs (company_id, user_id, action, target_table, target_id, metadata)
  VALUES (v_company, auth.uid(), _action, 'customers', _customer_id,
          jsonb_build_object('rgpd', true, 'at', now()));
END;
$$;

-- Extend anonymize_customer to also write an audit entry
CREATE OR REPLACE FUNCTION public.anonymize_customer(_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.audit_logs (company_id, user_id, action, target_table, target_id, metadata)
  VALUES (v_company, auth.uid(), 'RGPD_ANONYMIZE', 'customers', _customer_id,
          jsonb_build_object('rgpd', true, 'at', now()));
END;
$$;