
REVOKE EXECUTE ON FUNCTION public.super_admin_set_company_active(uuid, boolean, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.super_admin_set_subscription_plan(uuid, subscription_plan) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.super_admin_global_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.super_admin_grant(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.super_admin_set_company_active(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_set_subscription_plan(uuid, subscription_plan) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_global_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_grant(uuid) TO authenticated;
