-- Undo 20261128120000_ai_spend_cap.sql. Ship the code that stops calling ai_spend_reserve first,
-- or every AI call is refused. No usage rows are deleted; the settled_at column goes.
drop function if exists public.ai_spend_reserve(uuid, text, text, text, text, numeric, numeric);
alter table public.ai_usage_logs drop column if exists settled_at;
grant insert, update, delete on public.ai_usage_logs to anon, authenticated;
