-- Undo 20261110150000_push_devices_gone.sql. Gone rows are deleted first, as
-- they were before it (they are switched off and reach nobody); then the
-- columns go. Only rows the push service already said were dead are lost.
delete from public.push_devices where gone_at is not null;
alter table public.push_devices drop constraint if exists push_devices_gone_whole;
alter table public.push_devices
  drop column if exists gone_at,
  drop column if exists enabled_before_gone,
  drop column if exists timer_before_gone;
