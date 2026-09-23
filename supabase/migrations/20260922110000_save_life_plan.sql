-- ============================================================================
-- SAVING THE WHOLE PLAN, IN ONE STATEMENT, WITHOUT TOUCHING THE DAYS.
--
-- The flow saves the entire plan on every keystroke-ish change. Doing that as
-- twenty-five round trips from the app means a half-saved plan the first time
-- a connection drops mid-way: areas updated, goals not, and nothing able to say
-- which half is real. This is one transaction — it all lands or none of it does.
--
-- ----------------------------------------------------------------------------
-- SECURITY INVOKER, EXPLICITLY, copying `finish_program_workout`.
--
-- DEFINER would run as the function's owner and walk straight past every one of
-- the hundred row-security policies the previous migration just created — the
-- app would be the only thing standing between one account and another's plan.
-- INVOKER runs as the signed-in person, so the policies still apply to every
-- statement inside. The function is a transaction boundary, not a privilege.
--
-- ----------------------------------------------------------------------------
-- IT NEVER DELETES AND REINSERTS THE NODES, and that is the whole safety
-- design rather than an optimisation.
--
-- `life_plan_day_ticks` and `life_plan_day_journal` point at nodes and cascade.
-- A save that dropped every node and wrote them back with fresh UUIDs would
-- therefore delete every tick and every journal entry the person had ever
-- written, silently, on an ordinary edit to an unrelated step. So a node that
-- is still in the plan KEEPS ITS UUID; only a part genuinely removed from the
-- plan loses its ticks, which is what removing it means.
--
-- ----------------------------------------------------------------------------
-- THE REVISION IS THE LOCK. The caller says which revision it read. If the
-- stored one has moved, the save is refused with ERRCODE 55000 and the route
-- turns that into a 409 — "this plan changed on another device, reload" —
-- rather than merging two plans into a third thing neither device wrote.
--
-- ----------------------------------------------------------------------------
-- IT DOES NO MAPPING AND NO BRANCHING ON KIND. Every array arrives already
-- shaped like its table, with real UUIDs resolved by the mapper. Duplicating
-- the mapper's rules in PL/pgSQL would put untested policy in the database,
-- where none of the app's tests can reach it.
-- ============================================================================

CREATE OR REPLACE FUNCTION save_life_plan(p_rows JSONB, p_expected_rev INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan_id UUID;
  v_rev INTEGER;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'object' THEN
    RAISE EXCEPTION 'save_life_plan needs an object of row arrays'
      USING ERRCODE = '22023';
  END IF;

  -- The plan the caller may actually see. Row security means this finds
  -- nothing at all for somebody else's plan, which is the refusal we want.
  SELECT id, revision INTO v_plan_id, v_rev
    FROM life_plans
   WHERE id = (p_rows ->> 'plan_id')::uuid
     FOR UPDATE;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'No such plan, or it is not yours'
      USING ERRCODE = '42501';
  END IF;

  IF v_rev <> p_expected_rev THEN
    RAISE EXCEPTION 'Plan revision is % but the save was built on %', v_rev, p_expected_rev
      USING ERRCODE = '55000';
  END IF;

  -- ------------------------------------------------------------------ nodes
  -- Gone from the plan: gone from the database, taking its detail row and its
  -- ticks with it. Still present: keeps the UUID it already had.
  DELETE FROM life_plan_nodes n
   WHERE n.plan_id = v_plan_id
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements(coalesce(p_rows -> 'nodes', '[]'::jsonb)) AS e
        WHERE (e.value ->> 'id')::uuid = n.id);

  INSERT INTO life_plan_nodes (id, plan_id, user_id, kind, local_id)
  SELECT (e.value ->> 'id')::uuid, v_plan_id, (e.value ->> 'user_id')::uuid,
         e.value ->> 'kind', e.value ->> 'local_id'
    FROM jsonb_array_elements(coalesce(p_rows -> 'nodes', '[]'::jsonb)) AS e
      ON CONFLICT (id) DO UPDATE
         SET local_id = EXCLUDED.local_id;

  -- ---------------------------------------------------------- detail tables
  -- One upsert each, in dependency order. No branching: every array is already
  -- exactly its table's shape.
  INSERT INTO life_plan_north_stars
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_north_stars,
    coalesce(p_rows -> 'north_stars', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    text = EXCLUDED.text, horizon_years = EXCLUDED.horizon_years;

  INSERT INTO life_plan_areas
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_areas,
    coalesce(p_rows -> 'areas', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    position = EXCLUDED.position, label = EXCLUDED.label, sublabel = EXCLUDED.sublabel,
    color = EXCLUDED.color, custom = EXCLUDED.custom,
    review_ten = EXCLUDED.review_ten, review_purpose = EXCLUDED.review_purpose,
    review_snapshot = EXCLUDED.review_snapshot, review_blockers = EXCLUDED.review_blockers,
    review_identity = EXCLUDED.review_identity, review_fortnight = EXCLUDED.review_fortnight,
    review_goals_aim = EXCLUDED.review_goals_aim, season_rank = EXCLUDED.season_rank;

  -- `user_goal_id` IS ABSENT FROM THIS UPDATE ON PURPOSE. It is the link to the
  -- counted goal and it is owned by the push, not by the plan save. Listing it
  -- here would let a plan written on a second device, which has never pushed,
  -- blank the link and make the next push create a duplicate of every goal.
  INSERT INTO life_plan_goals
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goals,
    coalesce(p_rows -> 'goals', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    position = EXCLUDED.position, priority_rank = EXCLUDED.priority_rank,
    area_id = EXCLUDED.area_id, title = EXCLUDED.title,
    goal_type = EXCLUDED.goal_type, why = EXCLUDED.why, pain_why = EXCLUDED.pain_why,
    sentence = EXCLUDED.sentence, feeling = EXCLUDED.feeling, reward = EXCLUDED.reward,
    stake = EXCLUDED.stake, unit = EXCLUDED.unit, target_date = EXCLUDED.target_date,
    belief_level = EXCLUDED.belief_level, desire_level = EXCLUDED.desire_level,
    days_per_week = EXCLUDED.days_per_week, per_week = EXCLUDED.per_week,
    is_abstinence = EXCLUDED.is_abstinence, serves_one_thing = EXCLUDED.serves_one_thing,
    metric = EXCLUDED.metric, ladder = EXCLUDED.ladder, ramp_steps = EXCLUDED.ramp_steps,
    reasons_list = EXCLUDED.reasons_list, asked = EXCLUDED.asked;

  INSERT INTO life_plan_goal_checkpoints
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goal_checkpoints,
    coalesce(p_rows -> 'checkpoints', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    goal_id = EXCLUDED.goal_id, position = EXCLUDED.position, title = EXCLUDED.title,
    done = EXCLUDED.done, celebration = EXCLUDED.celebration;

  INSERT INTO life_plan_goal_obstacles
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goal_obstacles,
    coalesce(p_rows -> 'obstacles', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    goal_id = EXCLUDED.goal_id, position = EXCLUDED.position,
    what = EXCLUDED.what, counter = EXCLUDED.counter;

  INSERT INTO life_plan_goal_beliefs
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goal_beliefs,
    coalesce(p_rows -> 'beliefs', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    goal_id = EXCLUDED.goal_id, position = EXCLUDED.position, old = EXCLUDED.old,
    useful = EXCLUDED.useful, evidence = EXCLUDED.evidence, replacement = EXCLUDED.replacement;

  INSERT INTO life_plan_goal_habits
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goal_habits,
    coalesce(p_rows -> 'habits', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    goal_id = EXCLUDED.goal_id, position = EXCLUDED.position, title = EXCLUDED.title,
    days_per_week = EXCLUDED.days_per_week, placeholder = EXCLUDED.placeholder,
    routine_days = EXCLUDED.routine_days, source_target_id = EXCLUDED.source_target_id;

  INSERT INTO life_plan_routines
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_routines,
    coalesce(p_rows -> 'routines', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    position = EXCLUDED.position, label = EXCLUDED.label,
    blueprint_id = EXCLUDED.blueprint_id, kind = EXCLUDED.kind,
    area_id = EXCLUDED.area_id, days_per_week = EXCLUDED.days_per_week,
    enrollment_id = EXCLUDED.enrollment_id;

  INSERT INTO life_plan_routine_steps
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_routine_steps,
    coalesce(p_rows -> 'steps', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    routine_id = EXCLUDED.routine_id, position = EXCLUDED.position,
    library_step_id = EXCLUDED.library_step_id, title = EXCLUDED.title,
    minutes = EXCLUDED.minutes, days_per_week = EXCLUDED.days_per_week,
    dimension = EXCLUDED.dimension, days = EXCLUDED.days, start_min = EXCLUDED.start_min,
    goes_to = EXCLUDED.goes_to, goes_to_set = EXCLUDED.goes_to_set,
    asks = EXCLUDED.asks, asks_set = EXCLUDED.asks_set;

  INSERT INTO life_plan_routine_split_days
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_routine_split_days,
    coalesce(p_rows -> 'split_days', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    routine_id = EXCLUDED.routine_id, position = EXCLUDED.position, name = EXCLUDED.name;

  INSERT INTO life_plan_experiences
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_experiences,
    coalesce(p_rows -> 'experiences', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    position = EXCLUDED.position, title = EXCLUDED.title, area_id = EXCLUDED.area_id,
    goal_id = EXCLUDED.goal_id, done = EXCLUDED.done, done_on = EXCLUDED.done_on;

  INSERT INTO life_plan_fields
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_fields,
    coalesce(p_rows -> 'fields', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    position = EXCLUDED.position, label = EXCLUDED.label, kind = EXCLUDED.kind,
    target_id = EXCLUDED.target_id, read_source_id = EXCLUDED.read_source_id;

  INSERT INTO life_plan_sub_steps
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_sub_steps,
    coalesce(p_rows -> 'sub_steps', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    position = EXCLUDED.position, target_id = EXCLUDED.target_id, title = EXCLUDED.title;

  -- ------------------------------------------------- link and list tables
  -- Replaced wholesale. Nothing points at one of these rows, so nothing can be
  -- orphaned by rewriting them, and a pair table has no stable id to upsert on.
  DELETE FROM life_plan_goal_feeds f
   USING life_plan_goals g
   WHERE f.goal_id = g.id AND g.plan_id = v_plan_id;
  INSERT INTO life_plan_goal_feeds
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goal_feeds,
    coalesce(p_rows -> 'goal_feeds', '[]'::jsonb));

  DELETE FROM life_plan_goal_serves s
   USING life_plan_goals g
   WHERE s.goal_id = g.id AND g.plan_id = v_plan_id;
  INSERT INTO life_plan_goal_serves
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goal_serves,
    coalesce(p_rows -> 'goal_serves', '[]'::jsonb));

  DELETE FROM life_plan_routine_serves s
   USING life_plan_routines r
   WHERE s.routine_id = r.id AND r.plan_id = v_plan_id;
  INSERT INTO life_plan_routine_serves
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_routine_serves,
    coalesce(p_rows -> 'routine_serves', '[]'::jsonb));

  DELETE FROM life_plan_step_serves ss
   USING life_plan_routine_steps st, life_plan_routines r
   WHERE ss.step_id = st.id AND st.routine_id = r.id AND r.plan_id = v_plan_id;
  INSERT INTO life_plan_step_serves
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_step_serves,
    coalesce(p_rows -> 'step_serves', '[]'::jsonb));

  DELETE FROM life_plan_values WHERE plan_id = v_plan_id;
  INSERT INTO life_plan_values
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_values,
    coalesce(p_rows -> 'values', '[]'::jsonb));

  DELETE FROM life_plan_answers WHERE plan_id = v_plan_id;
  INSERT INTO life_plan_answers
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_answers,
    coalesce(p_rows -> 'answers', '[]'::jsonb));

  -- ------------------------------------------------------------- the plan
  -- `seq` may only ever rise: it is the id counter, and letting a stale device
  -- lower it would mint an id that already belongs to something else.
  UPDATE life_plans
     SET version = coalesce((p_rows ->> 'version')::int, version),
         seq = greatest(seq, coalesce((p_rows ->> 'seq')::int, 0)),
         season_focus_id = (p_rows ->> 'season_focus_id')::uuid,
         revision = revision + 1
   WHERE id = v_plan_id
  RETURNING revision INTO v_rev;

  RETURN v_rev;
END;
$$;

-- The signed-in person may call it. It runs as them, so this grants no reach
-- beyond what their own policies already allow.
REVOKE ALL ON FUNCTION save_life_plan(JSONB, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_life_plan(JSONB, INTEGER) TO authenticated;


-- ============================================================================
-- THE DAY TABLES ARE NOT REACHABLE FROM HERE, and it is asserted rather than
-- remembered. If a later edit adds a write to one of them, this fails loudly at
-- migration time instead of quietly a year later when somebody's journal goes.
-- ============================================================================
DO $$
DECLARE
  body TEXT;
  forbidden TEXT;
BEGIN
  SELECT prosrc INTO body FROM pg_proc WHERE proname = 'save_life_plan';

  FOREACH forbidden IN ARRAY ARRAY[
    'life_plan_days', 'life_plan_day_ratings', 'life_plan_day_ticks', 'life_plan_day_journal'
  ] LOOP
    IF body ~ ('(INSERT INTO|UPDATE|DELETE FROM)\s+' || forbidden) THEN
      RAISE EXCEPTION 'save_life_plan writes to %, which it must never do', forbidden;
    END IF;
  END LOOP;

  IF body !~ 'ERRCODE = ''55000''' THEN
    RAISE EXCEPTION 'save_life_plan has lost its revision lock';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'save_life_plan' AND prosecdef
  ) THEN
    RAISE EXCEPTION 'save_life_plan is SECURITY DEFINER; it must be INVOKER';
  END IF;

  RAISE NOTICE 'save_life_plan: invoker, revision-locked, cannot reach the day tables.';
END $$;
