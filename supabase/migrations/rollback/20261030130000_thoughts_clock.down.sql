-- The way back from 20261030130000_thoughts_clock.sql. Stops every thought
-- reminder; deletes nobody's data. pg_net is left installed: removing an
-- extension is not needed to stop the calls, and something else may use it.

SELECT cron.unschedule('thoughts-clock') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'thoughts-clock');
SELECT cron.unschedule('prune-cron-history') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune-cron-history');
DROP FUNCTION IF EXISTS public.notifications_clock_tick();
