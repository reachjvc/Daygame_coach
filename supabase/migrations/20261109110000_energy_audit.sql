-- ============================================================================
-- THE TIME & ENERGY AUDIT'S STORAGE AND CLOCK (Plans/energy-audit.md, Phase 3,
-- Migration B). Approved by the owner on 2026-11-08 (O3).
--
-- Two new tables (a run, and one answered quarter-hour), two functions the
-- notification clock reads (pings due, "your two weeks are done" due), and the
-- send kinds 'audit-ping' and 'audit-end'. Nothing existing is deleted.
--
-- A quarter is 15 minutes on the clock (:00, :15, :30, :45). A ping goes out
-- only in the first 5 minutes after its quarter ended, so after an outage
-- nothing arrives late or in a burst.
--
-- The way back: supabase/migrations/rollback/20261109110000_energy_audit.down.sql
-- (DESTRUCTIVE: deletes all audit data and the audit's send records).
-- ============================================================================

create table if not exists public.audit_runs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ends_at timestamptz not null,
  ended_at timestamptz,
  quiet_start smallint not null default 1320 check (quiet_start between 0 and 1439),
  quiet_end smallint not null default 480 check (quiet_end between 0 and 1439),
  muted_until timestamptz,
  review jsonb not null default '{}'::jsonb,
  end_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > started_at and ends_at <= started_at + interval '31 days'),
  check (ended_at is null or ended_at >= started_at),
  check (mod(quiet_start, 15) = 0 and mod(quiet_end, 15) = 0),
  unique (id, user_id)
);
create unique index if not exists audit_runs_one_open_per_person on public.audit_runs (user_id) where ended_at is null;

create table if not exists public.audit_slots (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null,
  slot_at timestamptz not null check (mod(extract(epoch from slot_at), 900) = 0),
  activity text not null check (length(activity) between 1 and 200),
  energy smallint not null check (energy between 1 and 7),
  growth smallint not null check (growth between 1 and 7),
  avoiding boolean not null default false,
  why text check (why is null or length(why) <= 2000),
  source text not null check (source in ('app', 'later', 'same')),
  time_entry_id text check (time_entry_id is null or length(time_entry_id) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (run_id, user_id) references public.audit_runs (id, user_id) on delete cascade,
  unique (run_id, slot_at)
);
create index if not exists audit_slots_owner_slot on public.audit_slots (user_id, slot_at);

-- Row security: the owner reads and writes their own rows, all four operations.
alter table public.audit_runs enable row level security;
alter table public.audit_slots enable row level security;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['audit_runs', 'audit_slots'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (auth.uid() = user_id)', t || '_select_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)', t || '_insert_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t || '_update_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (auth.uid() = user_id)', t || '_delete_own', t);
  END LOOP;
END $$;

-- TRUNCATE ignores row security (tests/integration/db/clientPrivileges).
revoke truncate on public.audit_runs, public.audit_slots from anon, authenticated;

-- What a send can be, with the audit's two kinds. `entry_id` is
-- 'audit:<run id>:<epoch seconds of the quarter>' for a ping and
-- 'audit-end:<run id>' for the end notice; one send per quarter, by index.
alter table public.notification_sends drop constraint if exists notification_sends_kind_check;
alter table public.notification_sends
  add constraint notification_sends_kind_check
  check (kind in ('test', 'timetrack-running', 'timetrack-alert', 'audit-ping', 'audit-end'));

create unique index if not exists notification_sends_one_ping_per_quarter on public.notification_sends (entry_id) where kind in ('audit-ping', 'audit-end');

-- Pings due at p_now: the quarter that just ended, in the first 5 minutes after it ended.
create or replace function public.audit_pings_due(p_limit integer, p_now timestamptz default now())
returns table (run_id uuid, user_id uuid, slot_at timestamptz, timezone text)
language sql stable security definer set search_path = ''
as $$
  with q as (
    select to_timestamp(floor(extract(epoch from p_now) / 900) * 900) - interval '15 minutes' as slot_at
  )
  select r.id, r.user_id, q.slot_at, z.tz
    from public.audit_runs as r
    cross join q
    left join public.profiles as p on p.id = r.user_id
    cross join lateral (
      select case when p.timezone in (select name from pg_catalog.pg_timezone_names) then p.timezone else 'UTC' end as tz
    ) as z
    cross join lateral (
      select (extract(hour from q.slot_at at time zone z.tz) * 60
            + extract(minute from q.slot_at at time zone z.tz))::int as m
    ) as t
   where r.ended_at is null
     and p_now < r.ends_at
     and q.slot_at + interval '15 minutes' > r.started_at
     and p_now < q.slot_at + interval '20 minutes'
     and (r.muted_until is null or r.muted_until <= p_now)
     and not (
       case
         when r.quiet_start = r.quiet_end then false
         when r.quiet_start < r.quiet_end then t.m >= r.quiet_start and t.m < r.quiet_end
         else t.m >= r.quiet_start or t.m < r.quiet_end
       end
     )
     and exists (select 1 from public.push_devices as d where d.user_id = r.user_id and d.enabled)
     and not exists (select 1 from public.audit_slots as a where a.run_id = r.id and a.slot_at = q.slot_at)
     and not exists (
       select 1 from public.notification_sends as s
        where s.kind = 'audit-ping'
          and s.entry_id = 'audit:' || r.id::text || ':' || extract(epoch from q.slot_at)::bigint::text
     )
   order by r.user_id
   limit greatest(coalesce(p_limit, 0), 0)
$$;
revoke all on function public.audit_pings_due(integer, timestamptz) from public, anon, authenticated;
grant execute on function public.audit_pings_due(integer, timestamptz) to service_role;

-- "Your two weeks are done": once per run, after its 14 days (never after "End now").
create or replace function public.audit_ends_due(p_limit integer, p_now timestamptz default now())
returns table (run_id uuid, user_id uuid)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.user_id
    from public.audit_runs as r
   where r.ended_at is null
     and p_now >= r.ends_at
     and p_now < r.ends_at + interval '2 days'
     and r.end_sent_at is null
     and exists (select 1 from public.push_devices as d where d.user_id = r.user_id and d.enabled)
     and not exists (select 1 from public.notification_sends as s where s.kind = 'audit-end' and s.entry_id = 'audit-end:' || r.id::text)
   order by r.ends_at
   limit greatest(coalesce(p_limit, 0), 0)
$$;
revoke all on function public.audit_ends_due(integer, timestamptz) from public, anon, authenticated;
grant execute on function public.audit_ends_due(integer, timestamptz) to service_role;

-- The clock: Migration A's version, with only the gate widened to the audit's
-- two lists. Everything else is unchanged, line for line.
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

notify pgrst, 'reload schema';
