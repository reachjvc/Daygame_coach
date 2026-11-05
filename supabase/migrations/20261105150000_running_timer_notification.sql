-- The running timer in the phone's notification shade
-- (Plans/time-tracker-like-toggl.md, Phase 7).
--
-- THREE SMALL ADDITIONS, NOTHING REMOVED.
--
-- 1. `push_devices.timer_running`: the per-device setting "Show the running
--    timer on this device". It is a column of its own, not the reminders'
--    `enabled`, because the two are separate choices: a phone can show the
--    timer with Thought Frequencies reminders off, and the reverse. Off by
--    default; the server switches it on when the installed app on a phone
--    (standalone display mode) registers (`timerOnByDefault` in
--    src/notifications/endpoints.ts). Phones already registered as the
--    installed app are switched on here by the same rule, which is the
--    "default on for the installed phone app" the plan decided (Q4, scenario
--    9). Desktop browsers, and an installed app on a PC, stay off.
--
-- 2. `notification_sends` learns two kinds:
--      'timetrack-running'  the silent "● Gym · since 17:05" / "Stopped" pushes;
--      'timetrack-alert'    the one alert with sound when a timer passes 6 h.
--    `thought_frequency_stats` counts only kind 'thought-prompt', so neither
--    is ever counted as a reminder that went unanswered.
--
-- 3. `notification_sends.entry_id`: which time entry a timer send was about.
--    The unique index on it for 'timetrack-alert' is what makes the 6 h alert
--    ring ONCE: the clock records the send before it sends, and a second
--    record for the same entry (a second clock tick racing the first, a retry)
--    is refused by the database. This is the "alerted" mark the plan asked
--    for; it lives on the send log rather than on `timetrack_entries`, because
--    a write to an entry moves its `updated_at`, and every device holding a
--    queued edit of that running entry would then be refused once as stale
--    (D1) for a change nobody made. No foreign key: a send is a record of what
--    went out, and it is written only by the server, from an entry it read.
--
-- 4. The database's minute clock (`notifications_clock_tick`, migration
--    20261030130000_thoughts_clock.sql) called the site only when a Thought
--    Frequencies reminder was due, so a 6 h alert would have waited for the
--    next reminder, or for ever with reminders off. It now also calls when
--    `timetrack_alert_due()` says an alert is due: a running entry past 6 h,
--    not yet alerted, of a person with a device showing the timer, where it
--    is between 07:00 and 22:59 for them. The night hold is checked here too,
--    so a forgotten timer is not 480 calls a night that each send nothing.
--    `timetrack_alerts_due(p_limit)` is the list itself, which the site's
--    clock reads; the check above is "is that list empty", so the two agree.
--
-- Row security is unchanged: `push_devices` has no client policy at all, and
-- `notification_sends` stays read-only to its owner, written by the server.
-- The new function is the clock's alone: no client role may call it.
--
-- Way back: supabase/migrations/rollback/20261105150000_running_timer_notification.down.sql

alter table public.push_devices
  add column if not exists timer_running boolean not null default false;

update public.push_devices
   set timer_running = true
 where label in ('Android phone · installed app', 'iPhone · installed app');

alter table public.notification_sends
  drop constraint if exists notification_sends_kind_check;
alter table public.notification_sends
  add constraint notification_sends_kind_check
  check (kind in ('thought-prompt', 'test', 'timetrack-running', 'timetrack-alert'));

alter table public.notification_sends
  add column if not exists entry_id text check (entry_id is null or length(entry_id) <= 200);

create unique index if not exists notification_sends_one_alert_per_entry
  on public.notification_sends (entry_id)
  where kind = 'timetrack-alert';

-- THE 6 H ALERTS DUE NOW, as the site's clock (`runTimerAlertClock`) asks for
-- them: not yet alerted, of a person with a device showing the timer, started
-- 6 h to 7 days ago, inside that person's 07:00–22:59, and AT MOST ONE PER
-- PERSON — their oldest — oldest first, at most `p_limit`.
--
-- Every rule is applied BEFORE the limit (security review, 2026-11-04). The
-- clock used to take the 200 newest running entries of everyone and drop the
-- ineligible ones after: start times are a device's to set and one sync takes
-- 1,600 rows, so one account could fill all 200 places with entries just past
-- 6 h, and those of an account with no timer device are never marked alerted,
-- so they held the places for good and nobody else's timer ever rang. One per
-- person means one account takes one place; the next tick offers its next.
--
-- A zone name Postgres does not know is read as UTC rather than raising: an
-- error here would stop the reminders' tick too.
create or replace function public.timetrack_alerts_due(p_limit integer)
returns table (id text, user_id uuid, description text, project_name text, started_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.user_id, d.description, d.project_name, d.started_at
    from (
      select distinct on (e.user_id)
             e.id, e.user_id, e.description, pr.name as project_name, e.started_at
        from public.timetrack_entries as e
        left join public.timetrack_projects as pr on pr.id = e.project_id
        left join public.profiles as p on p.id = e.user_id
       where e.stopped_at is null
         and e.deleted_at is null
         and e.started_at <= now() - interval '6 hours'
         and e.started_at > now() - interval '7 days'
         and exists (select 1 from public.push_devices as dv where dv.user_id = e.user_id and dv.timer_running)
         and not exists (
           select 1 from public.notification_sends as s where s.kind = 'timetrack-alert' and s.entry_id = e.id
         )
         and extract(hour from now() at time zone (
               case when p.timezone in (select name from pg_catalog.pg_timezone_names) then p.timezone else 'UTC' end
             )) between 7 and 22
       order by e.user_id, e.started_at asc, e.id asc
    ) as d
   order by d.started_at asc, d.id asc
   limit greatest(coalesce(p_limit, 0), 0)
$$;

revoke all on function public.timetrack_alerts_due(integer) from public, anon, authenticated;
grant execute on function public.timetrack_alerts_due(integer) to service_role;

-- Is a 6 h alert due, for anyone (or for `p_user`)? The same rules as the
-- site's clock reads, so the database calls exactly when the site would send.
create or replace function public.timetrack_alert_due(p_user uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.timetrack_alerts_due(2147483647) as a where p_user is null or a.user_id = p_user
  )
$$;

revoke all on function public.timetrack_alert_due(uuid) from public, anon, authenticated, service_role;

-- The clock, as before, plus the alert. Unchanged otherwise, line for line.
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
  ) and not public.timetrack_alert_due() then
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

-- so the API sees the new columns without waiting for its next schema reload
notify pgrst, 'reload schema';
