-- The way back from 20261104160000_running_timer_notification.sql.
--
-- DELETES ONE KIND OF DATA: the send-log rows of kind 'timetrack-running' and
-- 'timetrack-alert'. The old kind check cannot be put back while they exist.
-- They are a record of which timer notifications went out, nothing a person
-- typed; time entries are not touched. Every device's "Show the running timer"
-- setting goes with its column.
--
-- Deploy the app version from before Phase 7 first: the current one reads
-- `push_devices.timer_running` when it registers a device. Idempotent.

-- The clock as 20261030130000_thoughts_clock.sql made it: reminders only.
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
  if not exists (
    select 1 from public.thought_prompt_schedule
     where next_due_at is not null and next_due_at <= now()
  ) then
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

drop function if exists public.timetrack_alert_due(uuid);

drop index if exists public.notification_sends_one_alert_per_entry;

delete from public.notification_sends where kind in ('timetrack-running', 'timetrack-alert');

alter table public.notification_sends drop column if exists entry_id;

alter table public.notification_sends drop constraint if exists notification_sends_kind_check;
alter table public.notification_sends
  add constraint notification_sends_kind_check check (kind in ('thought-prompt', 'test'));

alter table public.push_devices drop column if exists timer_running;

notify pgrst, 'reload schema';
