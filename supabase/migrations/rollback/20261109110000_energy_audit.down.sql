-- ============================================================================
-- THE WAY BACK FROM 20261109110000_energy_audit.sql (Plans/energy-audit.md).
--
-- DESTRUCTIVE: DELETES ALL AUDIT DATA AND THE AUDIT'S SEND RECORDS.
-- Run only on the owner's word.
-- ============================================================================

-- 1. The clock with Migration A's gate (20261109100000_thoughts_out.sql), same revokes.
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

-- 2. The two functions.
drop function if exists public.audit_pings_due(integer, timestamptz);
drop function if exists public.audit_ends_due(integer, timestamptz);

-- 3. One send per quarter.
drop index if exists public.notification_sends_one_ping_per_quarter;

-- 4. The audit's send records.
delete from public.notification_sends where kind in ('audit-ping', 'audit-end');

-- 5. The kind check without the audit's kinds.
alter table public.notification_sends drop constraint if exists notification_sends_kind_check;
alter table public.notification_sends
  add constraint notification_sends_kind_check
  check (kind in ('test', 'timetrack-running', 'timetrack-alert'));

-- 6. The tables.
drop table if exists public.audit_slots, public.audit_runs;

-- 7.
notify pgrst, 'reload schema';
