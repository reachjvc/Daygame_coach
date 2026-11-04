-- The way back from 20261104170000_goal_habits_become_steps.sql.
--
-- DELETES DATA: every "<area> actions" routine and its steps, with every tick
-- and note written against them, and every action added since, which lives
-- there too. Back the plan up first. The habit rows the copy came from were
-- never touched, so putting the app back on the code before Q5 shows them
-- again. Put the code back FIRST: the new code does not read habit rows.
--
-- A habit that was LINKED to a step the plan already ran (same title) was not
-- copied; that link is taken off here, and the step itself stays. A link the
-- person had made by hand between such a step and such a goal cannot be told
-- apart from one the copy made and goes too. On the live database there were
-- none: it held no step links at all when the copy ran (2026-11-04).

delete from public.life_plan_step_serves x
 using public.life_plan_routine_steps s, public.life_plan_goal_habits h
 where x.step_id = s.id
   and h.goal_id = x.goal_id
   and lower(btrim(h.title)) = lower(btrim(s.title));

-- The steps' nodes and the routines' nodes. Deleting a node cascades to its
-- row; deleting only the routine's would leave each step's node behind.
delete from public.life_plan_nodes n
 where n.id in (
   select s.id from public.life_plan_routine_steps s
     join public.life_plan_routines r on r.id = s.routine_id
    where r.blueprint_id = 'actions'
   union
   select r.id from public.life_plan_routines r where r.blueprint_id = 'actions'
 );

update public.life_plans set revision = revision + 1;
