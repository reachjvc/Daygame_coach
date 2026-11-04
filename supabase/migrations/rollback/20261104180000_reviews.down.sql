-- The way back from 20261104180000_reviews.sql.
--
-- DELETES DATA: every review and its scores, which since this migration may
-- hold reviews written nowhere else. Back them up first. The copied first
-- review's scores are still on the areas (`review_fortnight`).
-- Run 20261104180100's rollback first.

delete from public.life_plan_nodes where kind = 'review';
drop table if exists public.life_plan_review_scores;
drop table if exists public.life_plan_reviews;
alter table public.life_plan_nodes drop constraint if exists life_plan_nodes_kind_check;
alter table public.life_plan_nodes add constraint life_plan_nodes_kind_check check (kind in (
  'north_star','area','goal','checkpoint','obstacle','belief','habit',
  'routine','routine_step','split_day','experience','field','sub_step','season'));

notify pgrst, 'reload schema';
