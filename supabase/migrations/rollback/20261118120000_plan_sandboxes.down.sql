-- Undo 20261118120000_plan_sandboxes.sql. Drops the table only. The hidden
-- accounts it pointed at stay behind with their copies; delete them first,
-- by id, from the rows this table holds (deleting an auth user cascades its
-- plan and day rows):
--   select sandbox_user_id from public.plan_sandboxes where sandbox_user_id is not null;
drop table if exists public.plan_sandboxes;
drop function if exists public.plan_sandboxes_keep_apart();
