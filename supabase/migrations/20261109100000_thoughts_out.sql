-- ============================================================================
-- THOUGHTS OUT, THE CLOCK KEPT (Plans/energy-audit.md, Phase 2, Migration A).
--
-- Thoughts is deleted at the owner's request (O2, 2026-11-08: "delete it and
-- its history entirely", no copy kept) and this change to the live database is
-- approved (O3, 2026-11-08). THE THOUGHTS DATA DOES NOT COME BACK.
--
-- What stays: push_devices, notification_sends (rows of kind 'test' and the
-- timer's), notification_secret() and the minute clock, because Time's
-- running-timer notification and 6 h alert depend on them. The clock's job is
-- renamed from 'thoughts-clock' to 'notifications-clock'.
--
-- The way back: supabase/migrations/rollback/20261109100000_thoughts_out.down.sql
-- (recreates the EMPTY tables). NEVER run rollback/20261030120000_thought_frequencies.down.sql
-- or rollback/20261030130000_thoughts_clock.down.sql: they drop the shared
-- plumbing Time needs.
-- ============================================================================

-- 1. The clock first, so it stops reading the table about to go. The body is
--    the one in 20261105150000_running_timer_notification.sql, with only the
--    gate reduced to the 6 h alert.
create or replace function public.notifications_clock_tick()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  target text;
  token text;
begin
  if not public.timetrack_alert_due() then
    return null;
  end if;

  select decrypted_secret into target from vault.decrypted_secrets where name = 'notifications_clock_url';
  select decrypted_secret into token from vault.decrypted_secrets where name = 'notifications_clock_secret';
  if target is null or token is null or target not like 'https://%' then
    return null;
  end if;

  return net.http_post(
    url := target,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || token),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
end
$$;

revoke all on function public.notifications_clock_tick() from public, anon, authenticated, service_role;

-- 2. Thoughts' send records (the shared 'test' and timer rows stay).
delete from public.notification_sends where kind = 'thought-prompt';

-- 3. The four functions, with the argument types recorded live in Phase 0.
drop function if exists public.thought_frequency_stats(text, timestamptz);
drop function if exists public.thought_counts(text, timestamptz, uuid);
drop function if exists public.merge_thought(uuid, uuid);
drop function if exists public.claim_due_thought_prompts(timestamptz, interval, integer);

-- 4. The five tables.
drop table if exists public.thought_logs, public.thought_reframes, public.thoughts, public.thought_settings, public.thought_prompt_schedule;

-- 5. What a send can be, without 'thought-prompt'.
alter table public.notification_sends drop constraint if exists notification_sends_kind_check;
alter table public.notification_sends
  add constraint notification_sends_kind_check
  check (kind in ('test', 'timetrack-running', 'timetrack-alert'));

-- 6. Rename the cron job. Where it does not exist (the test database has no
--    cron jobs) nothing is unscheduled; the new job is scheduled either way.
select cron.unschedule('thoughts-clock') where exists (select 1 from cron.job where jobname = 'thoughts-clock');
select cron.schedule('notifications-clock', '* * * * *', 'select public.notifications_clock_tick()');

-- 7. so the API sees the change without waiting for its next schema reload
notify pgrst, 'reload schema';
