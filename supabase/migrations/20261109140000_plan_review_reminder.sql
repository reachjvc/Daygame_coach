-- ONE WEEKLY REMINDER FOR THE PLAN'S REVIEW (Plans/life-plan-after-setup.md, Phase 5, d4).
--
-- Adds only: a table holding one person's reminder day and hour (off until
-- switched on), two functions the server calls with the service role, the
-- 'plan-review' notification kind, and one more check in the clock's gate.
-- Undo: rollback/20261109140000_plan_review_reminder.down.sql (it DELETES the
-- reminder settings and their send records; ask the owner first).

create table if not exists public.life_plan_reminders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_on boolean not null default false,
  review_day smallint not null default 7 check (review_day between 1 and 7),
  review_hour smallint not null default 19 check (review_hour between 6 and 22),
  updated_at timestamptz not null default now()
);
alter table public.life_plan_reminders enable row level security;
drop policy if exists "own reminder row" on public.life_plan_reminders;
create policy "own reminder row" on public.life_plan_reminders
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.life_plan_reminders from anon;
revoke truncate on public.life_plan_reminders from authenticated;

-- The kind list: 20261109110000_energy_audit.sql's list plus 'plan-review'.
alter table public.notification_sends drop constraint if exists notification_sends_kind_check;
alter table public.notification_sends add constraint notification_sends_kind_check
  check (kind in ('test', 'timetrack-running', 'timetrack-alert', 'audit-ping', 'audit-end', 'plan-review'));
create unique index if not exists notification_sends_one_plan_review
  on public.notification_sends (entry_id) where kind = 'plan-review';

-- Weekly reminders due at p_now: the person's weekday and hour, in their zone, first 20 minutes.
create or replace function public.plan_reviews_due(p_limit integer, p_now timestamptz default now())
returns table (user_id uuid, local_day date, review_day smallint)
language sql stable security definer set search_path = ''
as $$
  select r.user_id, (p_now at time zone z.tz)::date, r.review_day
    from public.life_plan_reminders as r
    left join public.profiles as p on p.id = r.user_id
    cross join lateral (
      select case when p.timezone in (select name from pg_catalog.pg_timezone_names) then p.timezone else 'UTC' end as tz
    ) as z
   where r.push_on
     and extract(isodow from p_now at time zone z.tz) = r.review_day
     and extract(hour from p_now at time zone z.tz) = r.review_hour
     and extract(minute from p_now at time zone z.tz) < 20
     and exists (select 1 from public.push_devices as d where d.user_id = r.user_id and d.enabled)
     and not exists (
       select 1 from public.notification_sends as s
        where s.kind = 'plan-review'
          and s.entry_id = 'plan-review:' || r.user_id::text || ':' || ((p_now at time zone z.tz)::date)::text
     )
   order by r.user_id
   limit greatest(coalesce(p_limit, 0), 0)
$$;
revoke all on function public.plan_reviews_due(integer, timestamptz) from public, anon, authenticated;
grant execute on function public.plan_reviews_due(integer, timestamptz) to service_role;

-- Whether a week review holds anything written. Answers a yes/no only, so no review text leaves the database.
create or replace function public.plan_week_review_written(p_user uuid, p_start date)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.life_plan_reviews as v
     where v.user_id = p_user and v.cadence = 'week' and v.period_start = p_start
       -- Any visible character, as the app's trim() counts it (btrim strips spaces only).
       and (coalesce(v.magic_moments, '') ~ '\S' or coalesce(v.lessons, '') ~ '\S'
            or coalesce(v.next_outcomes, '') ~ '\S'
            or exists (select 1 from public.life_plan_review_goals as g where g.review_id = v.id))
  )
$$;
revoke all on function public.plan_week_review_written(uuid, date) from public, anon, authenticated;
grant execute on function public.plan_week_review_written(uuid, date) to service_role;

-- The clock: 20261109110000_energy_audit.sql's version, with only the gate
-- widened to the weekly reminders. Everything else is unchanged, line for line.
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

notify pgrst, 'reload schema';
