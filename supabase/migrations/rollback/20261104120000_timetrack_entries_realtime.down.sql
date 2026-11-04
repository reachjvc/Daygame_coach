-- The way back from 20261104120000_timetrack_entries_realtime.sql. Deletes no data.
--
-- Takes public.timetrack_entries out of the `supabase_realtime` publication. The
-- tracker stops getting change pings and falls back by itself to what it did
-- before: a check once a minute, and on focus, on coming back online and when
-- the page becomes visible. Idempotent.

do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'timetrack_entries'
  ) then
    alter publication supabase_realtime drop table public.timetrack_entries;
  end if;
end
$$;
