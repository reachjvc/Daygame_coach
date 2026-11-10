-- A DEVICE THE PUSH SERVICE SAYS IS GONE IS MARKED, NOT DELETED (review of
-- 7d1e7328, sev 4).
--
-- A send answered 404/410 used to delete the device's row. The phone, moving
-- to a new address after a lost registration, then made the row again from the
-- switches it remembered; but it could not tell that deletion from the person
-- removing the device in Settings on another device, so a removed device came
-- back. Now a gone row is kept, marked with when it went and the two switches
-- it had; both switches go off, so nothing is sent to it and no clock counts
-- it as a device. A move or a new registration at its address brings it back
-- with its switches. Removing a device in Settings still deletes the row. Gone
-- rows older than 30 days are deleted by the app's clock.
--
-- Adds three nullable columns and one check; changes no data.
-- Undo: rollback/20261110150000_push_devices_gone.down.sql.

alter table public.push_devices add column if not exists gone_at timestamptz;
alter table public.push_devices add column if not exists enabled_before_gone boolean;
alter table public.push_devices add column if not exists timer_before_gone boolean;

alter table public.push_devices drop constraint if exists push_devices_gone_whole;
alter table public.push_devices add constraint push_devices_gone_whole check (
  (gone_at is null and enabled_before_gone is null and timer_before_gone is null)
  or (gone_at is not null and enabled_before_gone is not null and timer_before_gone is not null)
);
