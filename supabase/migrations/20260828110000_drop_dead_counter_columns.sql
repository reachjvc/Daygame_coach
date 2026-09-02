-- The ISO-week label columns, retired.
--
-- `current_week` and `last_active_week` stored a week as "2026-W35", derived
-- from the SERVER clock. Two problems, both live: the label was computed in the
-- wrong timezone, and the computation could give two different weeks the same
-- label in zones whose DST starts mid-year (measured: Pacific/Auckland 2016,
-- 2021, 2027, 2038 — see tests/unit/shared/periodEquivalence.test.ts). They are
-- replaced by `week_start_date` and `last_active_week_start`, Monday dates in
-- the user's own timezone.
--
-- `last_session_week` was in the database, absent from UserTrackingStatsRow, and
-- read and written by nothing in the repository. No migration here creates it —
-- it predates supabase/migrations.
--
-- DESTRUCTIVE. Every value in all three columns is preserved in
-- `user_tracking_stats_backup_20260827`, taken before the repair in
-- docs/plans/counters-repair-log.md. Drop that table by hand once this is
-- settled; nothing automated removes it.

alter table user_tracking_stats
  drop column if exists current_week,
  drop column if exists last_active_week,
  drop column if exists last_session_week;
