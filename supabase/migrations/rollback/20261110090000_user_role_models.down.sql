-- Undo 20261110090000_user_role_models.sql. DELETES every council pick: ask the owner first.
drop trigger if exists user_role_models_at_most_five on public.user_role_models;
drop function if exists public.user_role_models_at_most_five();
drop table if exists public.user_role_models;
