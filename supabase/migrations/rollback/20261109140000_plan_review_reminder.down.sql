-- ROLLBACK: DELETES REMINDER SETTINGS AND THEIR SEND RECORDS
--
-- Undoes 20261109140000_plan_review_reminder.sql. Running this on the live
-- database removes the owner's reminder row and every 'plan-review' send
-- record: ask the owner first. Rolling back the code alone is enough to stop
-- reminders, because nothing sends while push_on is false.

-- 1. The clock as 20261109110000_energy_audit.sql left it.
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
  if not exists (select 1 from public.audit_pings_due(1)) and not exists (select 1 from public.audit_ends_due(1)) and not public.timetrack_alert_due() then
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

-- 2-3. The two functions.
drop function if exists public.plan_week_review_written(uuid, date);
drop function if exists public.plan_reviews_due(integer, timestamptz);

-- 4-5. The send records.
drop index if exists public.notification_sends_one_plan_review;
delete from public.notification_sends where kind = 'plan-review';

-- 6. The kind list as it was.
alter table public.notification_sends drop constraint if exists notification_sends_kind_check;
alter table public.notification_sends add constraint notification_sends_kind_check
  check (kind in ('test', 'timetrack-running', 'timetrack-alert', 'audit-ping', 'audit-end'));

-- 7. The settings.
drop table if exists public.life_plan_reminders;

notify pgrst, 'reload schema';
