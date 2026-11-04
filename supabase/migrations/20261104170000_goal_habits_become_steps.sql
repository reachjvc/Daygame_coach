-- ============================================================================
-- A GOAL'S HABITS BECOME ROUTINE STEPS (Plans/life-plan-rebuild.md, Phase 4;
-- Q5 of Plans/life-plan-tables.md).
--
-- "Something I do regularly" had two homes: a goal's habits
-- (`life_plan_goal_habits`, shown as its "actions") and routine steps. Today
-- ticks steps and never read habits, so an action written under a goal was
-- done nowhere. Each habit becomes a routine step that serves its goal
-- (`life_plan_step_serves`), by the rule the app now uses for a new action
-- (`addAction` in src/goals/northStarService.ts):
--
--   * ONE STEP PER ACTION. The same title (case and outer spaces aside) under
--     several goals of one plan is one thing done, serving all of them:
--     "Train, and hit your protein" under four body goals is one step, not four
--     ticks on Today.
--   * A STEP THE PLAN ALREADY RUNS, matched by that title, is that step: it is
--     linked, not copied. First match in routine order, then step order.
--   * OTHERWISE a new step in its area's "<area> actions" routine (blueprint
--     `actions`, weekly), made the first time the area needs one. The area is
--     that of the first goal, in goal order, that names the action, and so are
--     its days a week. No length: an action has a frequency, not a duration.
--
-- Placeholder habits ("Work toward: <goal>", a stand-in the old lab wrote) are
-- not actions and are not copied. Named training days on a habit
-- (`routine_days`) have no place on a step and are not copied either; no plan
-- has any.
--
-- New local ids come off the plan's own counter (`r<n>`, `s<n>`), as the
-- app's `nextId` makes them, and the counter and the revision move on, so a
-- page that loaded the plan before this ran is told it is stale rather than
-- saving over it.
--
-- COPIED. The habit rows stay until Phase 7; the app stops reading them in
-- the same release. Adds and copies only. Running it twice adds nothing: a
-- copied action's step is found by its title the second time.
-- ============================================================================

DO $$
DECLARE
  p RECORD;
  a RECORD;
  v_seq INTEGER;
  v_changed BOOLEAN;
  v_step UUID;
  v_routine UUID;
  v_goal UUID;
BEGIN
  FOR p IN SELECT id, user_id, seq FROM life_plans LOOP
    v_seq := p.seq;
    v_changed := false;

    FOR a IN
      WITH named AS (
        SELECT lower(btrim(h.title)) AS key, btrim(h.title) AS title,
               h.days_per_week, h.goal_id, g.area_id, g.position AS goal_pos, h.position AS habit_pos
          FROM life_plan_goal_habits h
          JOIN life_plan_goals g ON g.id = h.goal_id
         WHERE g.plan_id = p.id AND NOT h.placeholder AND btrim(h.title) <> ''
      )
      SELECT key,
             (array_agg(title ORDER BY goal_pos, habit_pos))[1] AS title,
             (array_agg(days_per_week ORDER BY goal_pos, habit_pos))[1] AS days,
             (array_agg(area_id ORDER BY goal_pos, habit_pos))[1] AS area_id,
             array_agg(goal_id ORDER BY goal_pos, habit_pos) AS goal_ids,
             -- Where it is first named: goal order, then its place in THAT
             -- goal's list, which is the order the app's fold meets it in.
             min(goal_pos) AS first_goal,
             (array_agg(habit_pos ORDER BY goal_pos, habit_pos))[1] AS first_habit
        FROM named
       GROUP BY key
       ORDER BY first_goal, first_habit, key
    LOOP
      SELECT s.id INTO v_step
        FROM life_plan_routine_steps s
        JOIN life_plan_routines r ON r.id = s.routine_id
       WHERE r.plan_id = p.id AND lower(btrim(s.title)) = a.key
       ORDER BY r.position, s.position
       LIMIT 1;

      IF v_step IS NULL THEN
        SELECT r.id INTO v_routine
          FROM life_plan_routines r
         WHERE r.plan_id = p.id AND r.blueprint_id = 'actions' AND r.area_id IS NOT DISTINCT FROM a.area_id
         ORDER BY r.position
         LIMIT 1;

        IF v_routine IS NULL THEN
          v_seq := v_seq + 1;
          INSERT INTO life_plan_nodes (plan_id, user_id, kind, local_id)
          VALUES (p.id, p.user_id, 'routine', 'r' || v_seq)
          RETURNING id INTO v_routine;
          INSERT INTO life_plan_routines (
            id, user_id, plan_id, position, label, blueprint_id, kind, area_id, days_per_week, enrollment_id)
          SELECT v_routine, p.user_id, p.id,
                 coalesce((SELECT max(r.position) + 1 FROM life_plan_routines r WHERE r.plan_id = p.id), 0),
                 coalesce(nullif(btrim((SELECT ar.label FROM life_plan_areas ar WHERE ar.id = a.area_id)), ''), 'Goal') || ' actions',
                 'actions', 'weekly', a.area_id, 7, NULL;
        END IF;

        v_seq := v_seq + 1;
        INSERT INTO life_plan_nodes (plan_id, user_id, kind, local_id)
        VALUES (p.id, p.user_id, 'routine_step', 's' || v_seq)
        RETURNING id INTO v_step;
        -- Where it goes and what it asks are left unset (`*_set` false), which
        -- the loader reads as "never decided" and infers from the title, the
        -- same inference the app runs on a step somebody types.
        INSERT INTO life_plan_routine_steps (
          id, user_id, routine_id, position, library_step_id, title, minutes, days_per_week,
          dimension, days, start_min, goes_to, goes_to_set, asks, asks_set)
        SELECT v_step, p.user_id, v_routine,
               coalesce((SELECT max(s.position) + 1 FROM life_plan_routine_steps s WHERE s.routine_id = v_routine), 0),
               NULL, left(a.title, 500), 0, greatest(1, least(7, a.days)),
               NULL, '{}', NULL, NULL, false, NULL, false;
      END IF;

      FOREACH v_goal IN ARRAY a.goal_ids LOOP
        INSERT INTO life_plan_step_serves (user_id, step_id, goal_id, position)
        SELECT p.user_id, v_step, v_goal,
               coalesce((SELECT max(x.position) + 1 FROM life_plan_step_serves x WHERE x.step_id = v_step), 0)
        ON CONFLICT (step_id, goal_id) DO NOTHING;
        IF FOUND THEN v_changed := true; END IF;
      END LOOP;

      v_step := NULL;
      v_routine := NULL;
    END LOOP;

    IF v_changed OR v_seq <> p.seq THEN
      UPDATE life_plans SET seq = v_seq, revision = revision + 1 WHERE id = p.id;
    END IF;
  END LOOP;
END $$;
