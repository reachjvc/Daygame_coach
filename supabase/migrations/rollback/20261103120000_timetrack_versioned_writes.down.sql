-- The way back from 20261103120000_timetrack_versioned_writes.sql. Deletes no data.
--
-- Drops the versioned write. The sync route notices the function is gone
-- (PostgREST answers PGRST202) and goes back to the old whole-row upsert by
-- itself, so the app keeps saving; what is lost is only the protection: a stale
-- copy can again restart a stopped timer, and a removed tag is again not stored.

drop function if exists public.timetrack_push(jsonb, jsonb);

notify pgrst, 'reload schema';
