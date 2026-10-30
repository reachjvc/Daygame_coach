-- ============================================================================
-- THE CLOCK THAT SENDS THOUGHT REMINDERS (Plans/thought.md, Phase 6, Q15).
--
-- Once a minute the database checks whether any reminder is due, and only
-- then calls the website's clock address, which sends them. Free: `pg_cron`
-- already runs a nightly job here, and `pg_net` (the database's way to make
-- an HTTP call) ships with Supabase. Vercel's own clock runs once a day on the
-- free plan; every minute would need the paid one.
--
-- NOTHING SECRET IS IN THIS FILE. The address and the secret are read from
-- Supabase Vault at each tick (`notifications_clock_url`,
-- `notifications_clock_secret`). Where either is missing — every local test
-- database — the tick does nothing at all.
--
-- TO STOP EVERY REMINDER AT ONCE (one line, in the SQL editor):
--   select cron.unschedule('thoughts-clock');
-- The way back for the whole file: supabase/migrations/rollback/20261030130000_thoughts_clock.down.sql
--
-- WHEN THE APP LEAVES VERCEL (docs/plans/own-platform-and-app.md): a server
-- timer calls the same address with the same secret, and this job is
-- unscheduled. The address and its rules do not change.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ----------------------------------------------------------------------------
-- One tick. SECURITY DEFINER so the job can read the vault; nobody but the
-- database owner (the scheduler) may call it.
--
-- Calls the website only when a reminder is due, so a quiet night is no
-- calls rather than 600. Returns the pg_net request id, or NULL when it did
-- not call. pg_net sends after this returns, so a slow website never holds a
-- database connection.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notifications_clock_tick()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target TEXT;
  token TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.thought_prompt_schedule
     WHERE next_due_at IS NOT NULL AND next_due_at <= now()
  ) THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO target FROM vault.decrypted_secrets WHERE name = 'notifications_clock_url';
  SELECT decrypted_secret INTO token FROM vault.decrypted_secrets WHERE name = 'notifications_clock_secret';
  IF target IS NULL OR token IS NULL OR target NOT LIKE 'https://%' THEN
    RETURN NULL;
  END IF;

  RETURN net.http_post(
    url := target,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || token),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
END
$$;

REVOKE ALL ON FUNCTION public.notifications_clock_tick() FROM PUBLIC, anon, authenticated, service_role;

-- Every minute. `cron.schedule` with a name replaces a job of the same name,
-- so applying this twice leaves one job.
SELECT cron.schedule('thoughts-clock', '* * * * *', 'select public.notifications_clock_tick()');

-- pg_cron keeps a row per run and never deletes them: 1,440 a day from the
-- job above. Keep a week, nightly, beside the existing 03:20 job.
SELECT cron.schedule(
  'prune-cron-history',
  '40 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$
);
