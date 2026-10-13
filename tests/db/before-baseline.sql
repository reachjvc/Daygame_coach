-- SO THE BASELINE RESTORES PRODUCTION'S PRIVILEGES, NOT THE LOCAL STACK'S.
--
-- A fresh local Supabase starts with default privileges for `postgres` in the
-- public schema that grant EVERYTHING on every new table, function and sequence
-- to anon, authenticated and service_role — TRUNCATE and EXECUTE included. The
-- baseline (tests/db/baseline.sql) is a pg_dump, and pg_dump writes each
-- object's grants as a difference from Postgres's built-in default, assuming the
-- restore starts there. It never writes a REVOKE from anon. So with those local
-- defaults in force, every object the baseline creates is wider open than in
-- production, and nothing narrows it again.
--
-- What that looked like, 2026-10-13: anon and authenticated held TRUNCATE on all
-- 84 tables (production took it away in 20260908120000_revoke_truncate_from_
-- clients.sql), and anon could call claim_beta_slot, which production grants
-- only to authenticated and service_role. A test of either rule would have been
-- testing the local stack's generosity, not production.
--
-- Clearing the defaults first makes each object start where pg_dump assumes it
-- does. The baseline's own ALTER DEFAULT PRIVILEGES, at its end, then puts
-- production's defaults back, so migrations newer than the baseline get exactly
-- what production gives them. Migrations run as `postgres`, so its defaults are
-- the ones that apply; `supabase_admin`'s cannot be changed from here and do
-- not touch objects `postgres` creates.
--
-- Applied first, before the baseline (scripts/db/test-stack.mjs).
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
