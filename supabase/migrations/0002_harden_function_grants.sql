-- Security Advisor flags handle_new_user() and rls_auto_enable() as SECURITY DEFINER
-- functions executable by PUBLIC. Neither is directly callable (their RETURNS types
-- `trigger` / `event_trigger` are pseudo-types Postgres only invokes via the trigger
-- machinery), but revoke the standing PUBLIC grant anyway per least-privilege.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
