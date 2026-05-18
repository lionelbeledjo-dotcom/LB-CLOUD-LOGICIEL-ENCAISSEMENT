
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.sales_seal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
  NEW.current_hash := encode(extensions.digest(v_payload::bytea, 'sha256'::text), 'hex');
  NEW.signed_at := now();
  NEW.is_locked := true;
  RETURN NEW;
END;
$function$;
