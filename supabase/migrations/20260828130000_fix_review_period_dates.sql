-- REVIEWS WERE FILED ONE DAY EARLY, FOR EVERY USER EAST OF GREENWICH.
--
-- `reviews.period_start` and `period_end` are DATE columns, but the review pages
-- sent an ISO instant built from local midnight:
--
--   Copenhagen Monday 2026-02-02 00:00  ->  "2026-02-01T23:00:00.000Z"  ->  2026-02-01
--
-- Postgres keeps the UTC date, so every weekly review was stored against the
-- SUNDAY before its week, and every daily review against the previous day. The
-- weekly-review streak is keyed on the Monday derived from `period_start`, so a
-- user who never missed a week had their streak read against the wrong week.
--
-- The pages now send calendar dates (`toDateISO`), so no new row can be wrong.
-- This corrects the rows already stored. Both fixes are guarded so a row that is
-- already right cannot be moved:
--
--   weekly: period_start must be the Monday of the week ending at period_end
--   daily:  period_start must be the same day as period_end
--
-- Verified against the live data before writing (5 rows, all one day early):
--   weekly 2026-02-01 (a Sunday) with period_end 2026-02-08
--   daily  2026-03-03 with period_end 2026-03-04, four of them

update reviews
   set period_start = period_end - interval '6 days'
 where review_type = 'weekly'
   and period_start <> period_end - interval '6 days'
   and period_start = period_end - interval '7 days';

update reviews
   set period_start = period_end
 where review_type = 'daily'
   and period_start = period_end - interval '1 day';
