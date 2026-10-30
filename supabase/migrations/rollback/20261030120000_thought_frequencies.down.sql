-- The way back from 20261030120000_thought_frequencies.sql.
--
-- DESTRUCTIVE: every thought, log, reframe, reminder setting and registered
-- device goes with these tables. Run only on the owner's word, and only after
-- the clock job (20261030130000_thoughts_clock.sql, if applied) is stopped.

DROP FUNCTION IF EXISTS public.notification_secret(TEXT);
DROP FUNCTION IF EXISTS public.claim_due_thought_prompts(TIMESTAMPTZ, INTERVAL, INTEGER);
DROP FUNCTION IF EXISTS public.merge_thought(UUID, UUID);
DROP FUNCTION IF EXISTS public.thought_counts(TEXT, TIMESTAMPTZ, UUID);

DROP TABLE IF EXISTS public.thought_logs;
DROP TABLE IF EXISTS public.thought_reframes;
DROP TABLE IF EXISTS public.thoughts;
DROP TABLE IF EXISTS public.thought_settings;
DROP TABLE IF EXISTS public.thought_prompt_schedule;
DROP TABLE IF EXISTS public.notification_sends;
DROP TABLE IF EXISTS public.push_devices;
