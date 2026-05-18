-- Journal dédié aux écarts de clôture de caisse
CREATE TABLE public.cash_variance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  session_id uuid NOT NULL,
  user_id uuid,
  expected_amount numeric NOT NULL,
  counted_amount numeric NOT NULL,
  variance numeric NOT NULL,
  abs_variance numeric NOT NULL,
  severity text NOT NULL,
  threshold_minor numeric NOT NULL DEFAULT 0.01,
  threshold_major numeric NOT NULL DEFAULT 2.00,
  justification text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cash_variance_logs_company ON public.cash_variance_logs(company_id, occurred_at DESC);
CREATE INDEX idx_cash_variance_logs_session ON public.cash_variance_logs(session_id);

ALTER TABLE public.cash_variance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view variance logs"
ON public.cash_variance_logs FOR SELECT TO authenticated
USING (is_company_admin(auth.uid(), company_id) OR is_super_admin(auth.uid()));

-- Insertion uniquement via la fonction close_cash_session (SECURITY DEFINER)
-- Pas de policy INSERT/UPDATE/DELETE pour les rôles authenticated.

-- Mise à jour de close_cash_session : journalise toujours l'écart + justification
CREATE OR REPLACE FUNCTION public.close_cash_session(
  _company_id uuid, _closing_amount numeric, _notes text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid; v_open numeric; v_cash_sales numeric; v_expected numeric;
  v_variance numeric; v_abs numeric; v_severity text;
  v_minor numeric := 0.01; v_major numeric := 2.00;
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
  v_variance := COALESCE(_closing_amount,0) - v_expected;
  v_abs := abs(v_variance);

  v_severity := CASE
    WHEN v_abs < v_minor THEN 'none'
    WHEN v_abs < v_major THEN 'minor'
    ELSE 'major'
  END;

  UPDATE public.cash_sessions SET
    status = 'closed', closed_at = now(), closed_by = v_uid,
    closing_amount = COALESCE(_closing_amount,0),
    expected_cash = v_expected,
    variance = v_variance,
    notes = _notes
  WHERE id = v_id;

  -- Journalisation systématique (y compris écart nul pour traçabilité)
  INSERT INTO public.cash_variance_logs (
    company_id, session_id, user_id,
    expected_amount, counted_amount, variance, abs_variance,
    severity, threshold_minor, threshold_major, justification
  ) VALUES (
    _company_id, v_id, v_uid,
    v_expected, COALESCE(_closing_amount,0), v_variance, v_abs,
    v_severity, v_minor, v_major, _notes
  );

  -- Audit log pour les écarts non nuls
  IF v_severity <> 'none' THEN
    INSERT INTO public.audit_logs (
      company_id, user_id, action, target_table, target_id, metadata
    ) VALUES (
      _company_id, v_uid, 'CASH_VARIANCE', 'cash_sessions', v_id,
      jsonb_build_object(
        'severity', v_severity,
        'expected', v_expected,
        'counted', COALESCE(_closing_amount,0),
        'variance', v_variance,
        'justification', _notes,
        'at', now()
      )
    );
  END IF;

  RETURN v_id;
END $function$;