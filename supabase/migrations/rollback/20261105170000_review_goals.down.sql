-- The way back from 20261105170000_review_goals.sql.
--
-- DELETES DATA: every review's answer per goal (on track, behind, change). Back
-- them up first. Put the app back on the code before it first: the read asks
-- for this table, and a page on newer code cannot load the plan without it.
-- Then re-apply 20261104180100_change_save_reaches_reviews.sql, so the save no
-- longer lists the table.

drop table if exists public.life_plan_review_goals;

notify pgrst, 'reload schema';
