-- VALUE OF THE WEEK AND THE COUNCIL'S DAILY REMINDER (Plans/role-models.md, Phase 12, O3 = yes).
--
-- Adds only: the week's marks (Benjamin Franklin's little book: one value a
-- week, a mark for each day), one settings row per person (the week's value,
-- the reminder switch and hour; both off until chosen), the 'council-daily'
-- notification kind, the function the clock reads, and one more check in the
-- clock's gate. Nothing existing changes otherwise.
-- Undo: rollback/20261110130000_council_week_and_reminder.down.sql (it DELETES
-- the marks and settings; ask the owner first).

create table if not exists public.user_role_model_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  week_value text check (week_value is null or (length(week_value) between 1 and 40)),
  week_of date,
  remind_on boolean not null default false,
  remind_hour smallint not null default 8 check (remind_hour between 7 and 21),
  updated_at timestamptz not null default now()
);
alter table public.user_role_model_settings enable row level security;
drop policy if exists "own council settings" on public.user_role_model_settings;
create policy "own council settings" on public.user_role_model_settings
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.user_role_model_settings from anon;
revoke truncate on public.user_role_model_settings from authenticated;

create table if not exists public.user_role_model_week_marks (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  value text not null check (length(value) between 1 and 40),
  lived boolean not null,
  marked_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.user_role_model_week_marks enable row level security;
drop policy if exists "own week marks" on public.user_role_model_week_marks;
create policy "own week marks" on public.user_role_model_week_marks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.user_role_model_week_marks from anon;
revoke truncate on public.user_role_model_week_marks from authenticated;

-- The kind list: 20261109140000_plan_review_reminder.sql's list plus 'council-daily'.
alter table public.notification_sends drop constraint if exists notification_sends_kind_check;
alter table public.notification_sends add constraint notification_sends_kind_check
  check (kind in ('test', 'timetrack-running', 'timetrack-alert', 'audit-ping', 'audit-end', 'plan-review', 'council-daily'));
create unique index if not exists notification_sends_one_council_daily
  on public.notification_sends (entry_id) where kind = 'council-daily';

-- Council reminders due at p_now: switched on, the person's hour in their zone,
-- first 20 minutes, a phone that takes reminders, someone in the council, and
-- not sent yet that local day.
create or replace function public.council_reminders_due(p_limit integer, p_now timestamptz default now())
returns table (user_id uuid, local_day date, tz text)
language sql stable security definer set search_path = ''
as $$
  select s.user_id, (p_now at time zone z.tz)::date, z.tz
    from public.user_role_model_settings as s
    left join public.profiles as p on p.id = s.user_id
    cross join lateral (
      select case when p.timezone in (select name from pg_catalog.pg_timezone_names) then p.timezone else 'UTC' end as tz
    ) as z
   where s.remind_on
     and extract(hour from p_now at time zone z.tz) = s.remind_hour
     and extract(minute from p_now at time zone z.tz) < 20
     and exists (select 1 from public.push_devices as d where d.user_id = s.user_id and d.enabled)
     and exists (select 1 from public.user_role_models as m where m.user_id = s.user_id)
     and not exists (
       select 1 from public.notification_sends as n
        where n.kind = 'council-daily'
          and n.entry_id = 'council-daily:' || s.user_id::text || ':' || ((p_now at time zone z.tz)::date)::text
     )
   order by s.user_id
   limit greatest(coalesce(p_limit, 0), 0)
$$;
revoke all on function public.council_reminders_due(integer, timestamptz) from public, anon, authenticated;
grant execute on function public.council_reminders_due(integer, timestamptz) to service_role;

-- The clock: 20261109140000_plan_review_reminder.sql's version, with only the
-- gate widened to the council reminders. Everything else is unchanged, line for line.
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
  if not exists (select 1 from public.audit_pings_due(1)) and not exists (select 1 from public.audit_ends_due(1)) and not public.timetrack_alert_due() and not exists (select 1 from public.plan_reviews_due(1)) and not exists (select 1 from public.council_reminders_due(1)) then
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

notify pgrst, 'reload schema';
