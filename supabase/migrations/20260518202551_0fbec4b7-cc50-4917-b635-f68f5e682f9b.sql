
CREATE OR REPLACE FUNCTION public.super_admin_set_company_active(_company_id uuid, _active boolean, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF NOT public.is_super_admin(v_uid) THEN
    RAISE EXCEPTION 'Réservé aux super administrateurs';
  END IF;

  UPDATE public.companies SET is_active = _active, updated_at = now()
  WHERE id = _company_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Entreprise introuvable'; END IF;

  INSERT INTO public.audit_logs (company_id, user_id, action, target_table, target_id, metadata)
  VALUES (_company_id, v_uid,
          CASE WHEN _active THEN 'SUPER_ADMIN_ACTIVATE' ELSE 'SUPER_ADMIN_SUSPEND' END,
          'companies', _company_id,
          jsonb_build_object('reason', _reason, 'at', now()));
END $$;

CREATE OR REPLACE FUNCTION public.super_admin_set_subscription_plan(_company_id uuid, _plan subscription_plan)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_prev subscription_plan;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF NOT public.is_super_admin(v_uid) THEN
    RAISE EXCEPTION 'Réservé aux super administrateurs';
  END IF;

  SELECT subscription_plan INTO v_prev FROM public.companies WHERE id = _company_id;
  IF v_prev IS NULL THEN RAISE EXCEPTION 'Entreprise introuvable'; END IF;

  UPDATE public.companies SET subscription_plan = _plan, updated_at = now()
  WHERE id = _company_id;

  INSERT INTO public.audit_logs (company_id, user_id, action, target_table, target_id, metadata)
  VALUES (_company_id, v_uid, 'SUPER_ADMIN_PLAN_CHANGE', 'companies', _company_id,
          jsonb_build_object('from', v_prev, 'to', _plan, 'at', now()));
END $$;

CREATE OR REPLACE FUNCTION public.super_admin_global_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF NOT public.is_super_admin(v_uid) THEN
    RAISE EXCEPTION 'Réservé aux super administrateurs';
  END IF;

  SELECT jsonb_build_object(
    'companies_total', (SELECT count(*) FROM public.companies),
    'companies_active', (SELECT count(*) FROM public.companies WHERE is_active = true),
    'companies_suspended', (SELECT count(*) FROM public.companies WHERE is_active = false),
    'users_total', (SELECT count(DISTINCT user_id) FROM public.company_members),
    'products_total', (SELECT count(*) FROM public.products),
    'sales_total', (SELECT count(*) FROM public.sales),
    'sales_30d', (SELECT count(*) FROM public.sales WHERE sold_at > now() - interval '30 days'),
    'revenue_total', COALESCE((SELECT sum(total_ttc) FROM public.sales WHERE is_credit_note = false), 0),
    'revenue_30d', COALESCE((SELECT sum(total_ttc) FROM public.sales WHERE is_credit_note = false AND sold_at > now() - interval '30 days'), 0),
    'stock_movements_30d', (SELECT count(*) FROM public.stock_movements WHERE created_at > now() - interval '30 days'),
    'plans', (
      SELECT COALESCE(jsonb_object_agg(subscription_plan, c), '{}'::jsonb)
      FROM (SELECT subscription_plan, count(*) AS c FROM public.companies GROUP BY 1) x
    )
  ) INTO v;

  RETURN v;
END $$;

-- Bootstrap helper: any authenticated user can claim super admin IF none exists yet.
CREATE OR REPLACE FUNCTION public.super_admin_grant(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_count int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  SELECT count(*) INTO v_count FROM public.super_admins;
  IF v_count = 0 THEN
    -- premier super admin : l'utilisateur s'auto-promeut
    IF _user_id <> v_uid THEN
      RAISE EXCEPTION 'Le premier super admin doit être vous-même';
    END IF;
  ELSE
    IF NOT public.is_super_admin(v_uid) THEN
      RAISE EXCEPTION 'Réservé aux super administrateurs';
    END IF;
  END IF;

  INSERT INTO public.super_admins (user_id) VALUES (_user_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.audit_logs (company_id, user_id, action, target_table, target_id, metadata)
  SELECT id, v_uid, 'SUPER_ADMIN_GRANT', 'super_admins', _user_id, jsonb_build_object('at', now())
  FROM public.companies LIMIT 1;
END $$;

-- INSERT policy so super admins can also insert through normal RLS path (defense-in-depth)
DROP POLICY IF EXISTS "Super admins insert super admins" ON public.super_admins;
CREATE POLICY "Super admins insert super admins" ON public.super_admins
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR NOT EXISTS (SELECT 1 FROM public.super_admins));
