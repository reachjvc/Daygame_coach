-- The way back from 20261105160000_review_score_day.sql.
--
-- Drops the day each review score was given; the scores stay. Put the app back
-- on the code before it first, or the next save sends a column the table no
-- longer has (the change-only save ignores it, so nothing fails, but the days
-- are gone).

alter table public.life_plan_review_scores drop constraint if exists life_plan_review_scores_scored_on_check;
alter table public.life_plan_review_scores drop column if exists scored_on;

notify pgrst, 'reload schema';
