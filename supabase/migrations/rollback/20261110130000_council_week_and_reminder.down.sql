-- Undo 20261110130000_council_week_and_reminder.sql. DELETES the week marks, the
-- council settings and the council reminders' send records: ask the owner first.
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
  if not exists (select 1 from public.audit_pings_due(1)) and not exists (select 1 from public.audit_ends_due(1)) and not public.timetrack_alert_due() and not exists (select 1 from public.plan_reviews_due(1)) then
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
drop function if exists public.council_reminders_due(integer, timestamptz);
drop index if exists public.notification_sends_one_council_daily;
delete from public.notification_sends where kind = 'council-daily';
alter table public.notification_sends drop constraint if exists notification_sends_kind_check;
alter table public.notification_sends add constraint notification_sends_kind_check
  check (kind in ('test', 'timetrack-running', 'timetrack-alert', 'audit-ping', 'audit-end', 'plan-review'));
drop table if exists public.user_role_model_week_marks;
drop table if exists public.user_role_model_settings;
notify pgrst, 'reload schema';
