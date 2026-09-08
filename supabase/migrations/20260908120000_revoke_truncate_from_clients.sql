-- Take the four privileges no browser client should hold away from `anon` and
-- `authenticated`: TRUNCATE, MAINTAIN, REFERENCES and TRIGGER.
--
-- WHAT IS WRONG
--
-- Measured on the live project 2026-09-08, and re-counted three ways:
--
--   tables in schema public:                                   63
--   ... that let `authenticated` TRUNCATE them:                63
--   ... that let `authenticated` MAINTAIN them:                63
--   sequences that let `anon` and `authenticated` UPDATE them:  1
--
-- Your database has a per-user rule: you may only touch your own row. It covers
-- reading, editing and deleting rows. These four privileges are not about rows,
-- so that rule is never consulted for them.
--
--   TRUNCATE   empties an entire table in one statement.
--   MAINTAIN   runs VACUUM FULL / CLUSTER / REINDEX, each of which takes an
--              exclusive lock and stalls every reader until it finishes.
--   REFERENCES lets a role point a foreign key at a table, which can then block
--              deletes elsewhere.
--   TRIGGER    lets a role attach code that runs on somebody else's writes.
--
-- The sequence matters for the same reason: `UPDATE` on a sequence permits
-- `setval`, so the counter behind `embeddings` can be rewound and made to hand
-- out ids that already exist.
--
-- IS ANY OF IT REACHABLE TODAY? NO -- AND THAT IS THE POINT.
--
-- PostgREST, the interface the browser talks to, exposes no TRUNCATE, VACUUM or
-- setval verb. 134 functions are executable by these roles; three are SECURITY
-- DEFINER (claim_beta_slot, handle_new_user, prune_error_reports) and none of
-- them takes SQL as an argument or builds SQL from its input, so none is a way
-- in. Nothing here is exploitable as the system stands.
--
-- It is safe because of what the interface happens not to offer, not because
-- anything stops it. One new function that runs dynamic SQL, or one direct
-- connection using the public key, and "anyone on the internet empties all 63
-- tables" becomes true. The grants buy nothing in exchange.
--
-- WHERE IT CAME FROM
--
-- Supabase's default `grant all on all tables in schema public to anon,
-- authenticated`. The 2026-08-28 hardening migration revoked insert, update and
-- delete on `profiles` and stopped there, because those were the verbs the
-- paywall bypass used. These four were left behind on every table.
--
-- WHAT THIS FILE DOES NOT COVER, STATED SO IT IS NOT MISTAKEN FOR DONE
--
-- `storage.objects`, `storage.buckets` and `storage.buckets_analytics` grant
-- TRUNCATE to `anon` today (verified). They are owned by
-- `supabase_storage_admin`, and the grants were issued by that role. These
-- migrations run as `postgres`, which is not a superuser and not a member of
-- it, so a REVOKE here would emit a warning and change nothing. Closing those
-- needs the Supabase dashboard or their support, and is a separate job.
--
-- WHAT STILL WORKS AFTERWARDS: everything the app does. Reading, inserting,
-- updating and deleting rows are separate privileges and are untouched. This
-- removes only what no client should ever have held.

-- TRANSACTION: left to the runner, like the other 37 migrations here.
--
-- An earlier draft wrapped this file in `begin; ... commit;` so it would not
-- depend on the runner. Checked before keeping it: NO other migration in this
-- repo does that, and `supabase db push` already runs each file in one
-- transaction together with its own bookkeeping insert. A nested `begin` only
-- warns, but the matching `commit` would close the RUNNER's transaction early
-- and leave that insert outside it. Matching the convention is safer than
-- defending against a runner that already does the right thing.
--

-- ---------------------------------------------------------------------------
-- 1. Existing tables and sequences.
-- ---------------------------------------------------------------------------
revoke truncate, maintain, references, trigger
  on all tables in schema public
  from anon, authenticated;

revoke update
  on all sequences in schema public
  from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Tables and sequences created from now on.
--
-- `for role postgres` is explicit rather than implied. Default privileges are
-- recorded per creating-role, and an unqualified statement silently means
-- "whichever role happens to be running this". All 63 tables in public are
-- owned by postgres today and these migrations run as postgres, so the two are
-- the same right now -- naming it means the statement cannot quietly become a
-- no-op if that ever stops being true.
--
-- Deliberately NOT `for role supabase_admin`: postgres is neither a superuser
-- nor a member of that role, so the clause would abort the migration.
-- ---------------------------------------------------------------------------
alter default privileges for role postgres in schema public
  revoke truncate, maintain, references, trigger on tables
  from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke update on sequences
  from anon, authenticated;
