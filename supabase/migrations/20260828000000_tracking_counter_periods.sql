-- A counter is a number plus the period it belongs to. These are the periods.
--
-- user_tracking_stats has held five weekly counters and three streaks with no
-- honest key: `current_week` and `last_active_week` are ISO-week labels derived
-- from the SERVER clock, and the review streak had no key at all. That is why
-- the Week Streak tile showed a February number in August.
--
-- These three columns are Monday dates in the USER's timezone, the same
-- representation `user_goals.period_start_date` already uses.

alter table user_tracking_stats
  add column if not exists week_start_date date,
  add column if not exists last_active_week_start date,
  add column if not exists last_review_week_start date;

-- Backfill from the ISO-week strings already stored. Conversion verified
-- against this database: '2026-W35' -> 2026-08-24, '2026-W08' -> 2026-02-16,
-- '2026-W01' -> 2025-12-29.
update user_tracking_stats
   set week_start_date = to_date(current_week, 'IYYY-"W"IW')
 where current_week is not null and week_start_date is null;

update user_tracking_stats
   set last_active_week_start = to_date(last_active_week, 'IYYY-"W"IW')
 where last_active_week is not null and last_active_week_start is null;

-- last_review_week_start stays NULL on purpose: nothing ever recorded which
-- week a weekly review was for, and inventing one would be fabrication. A null
-- key reads as "streak not verifiable", which the read gate shows as 0 until
-- the next review sets it.

comment on column user_tracking_stats.week_start_date is
  'Monday (user timezone) that the current_week_* counters belong to. Replaces current_week.';
comment on column user_tracking_stats.last_active_week_start is
  'Monday of the last week that qualified as active (2+ sessions or 5+ approaches). Replaces last_active_week.';
comment on column user_tracking_stats.last_review_week_start is
  'Monday of the week the last weekly review was filed for. NULL means never recorded.';
