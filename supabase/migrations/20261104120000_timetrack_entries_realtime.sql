-- The other device hears about a change within seconds (D4 in
-- Plans/time-tracker-like-toggl.md).
--
-- Puts public.timetrack_entries in the `supabase_realtime` publication, so the
-- tracker, while open, gets a "something changed" ping from Supabase Realtime
-- when this account's entries change, and checks the account at once instead
-- of at its next once-a-minute check. Row security applies to the feed: a
-- browser hears only about rows its own session could read.
--
-- Changes no data and no table. Idempotent: does nothing if the table is
-- already published, or if the publication does not exist (a bare Postgres,
-- the local test stack, which runs without Realtime).
--
-- The app works without it: no ping arrives, and the minute's check, the check
-- on focus, on coming back online and on the page becoming visible all stay.
--
-- Way back: supabase/migrations/rollback/20261104120000_timetrack_entries_realtime.down.sql

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'publication supabase_realtime does not exist; nothing to do';
    return;
  end if;
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'timetrack_entries'
  ) then
    raise notice 'public.timetrack_entries is already in supabase_realtime';
    return;
  end if;
  alter publication supabase_realtime add table public.timetrack_entries;
end
$$;
