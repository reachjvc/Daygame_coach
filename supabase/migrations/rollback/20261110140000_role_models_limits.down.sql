-- Undo 20261110140000_role_models_limits.sql. Removes checks only; no data is lost.
drop trigger if exists user_role_model_week_marks_near_today on public.user_role_model_week_marks;
drop function if exists public.user_role_model_week_marks_near_today();
alter table public.user_role_models drop constraint if exists user_role_models_words_ok;
drop function if exists public.role_model_words_ok(text[]);
