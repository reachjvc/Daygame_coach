-- ============================================================================
-- THE CHANGE-ONLY SAVE NEVER WRITES THE LINK TO A COUNTED GOAL, AND CHECKS
-- ITSELF (Plans/life-plan-rebuild.md, Phase 1, from its review).
--
-- 20261104100000 kept `user_goal_id` out of the UPDATE but not out of the
-- INSERT. Only the repo stripped it, and any signed-in person can call the
-- function directly. A key check ignores row security, so a new goal row could
-- name another account's counted goal and then block that account's own push
-- on UNIQUE (user_goal_id). The column is now left out of both.
--
-- The same function otherwise, replaced whole. Then the self-check
-- `save_life_plan` had: it must stay SECURITY INVOKER, and it must not name a
-- day table.
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_life_plan_changes(p_changes JSONB, p_expected_rev INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Dependency order: parents before children. Removal runs it backwards.
  v_tables CONSTANT TEXT[][] := ARRAY[
    ARRAY['nodes',          'life_plan_nodes'],
    ARRAY['north_stars',    'life_plan_north_stars'],
    ARRAY['areas',          'life_plan_areas'],
    ARRAY['goals',          'life_plan_goals'],
    ARRAY['checkpoints',    'life_plan_goal_checkpoints'],
    ARRAY['obstacles',      'life_plan_goal_obstacles'],
    ARRAY['beliefs',        'life_plan_goal_beliefs'],
    ARRAY['habits',         'life_plan_goal_habits'],
    ARRAY['routines',       'life_plan_routines'],
    ARRAY['steps',          'life_plan_routine_steps'],
    ARRAY['split_days',     'life_plan_routine_split_days'],
    ARRAY['experiences',    'life_plan_experiences'],
    ARRAY['fields',         'life_plan_fields'],
    ARRAY['sub_steps',      'life_plan_sub_steps'],
    ARRAY['goal_feeds',     'life_plan_goal_feeds'],
    ARRAY['goal_serves',    'life_plan_goal_serves'],
    ARRAY['routine_serves', 'life_plan_routine_serves'],
    ARRAY['step_serves',    'life_plan_step_serves'],
    ARRAY['values',         'life_plan_values'],
    ARRAY['answers',        'life_plan_answers']
  ];
  -- The two tables `replace` may name. Both carry plan_id.
  v_whole CONSTANT TEXT[] := ARRAY['values', 'answers'];
  v_plan_id UUID;
  v_rev INTEGER;
  v_key TEXT;
  v_table TEXT;
  v_rows JSONB;
  v_pk TEXT[];
  v_cols TEXT;
  v_set TEXT;
  v_match TEXT;
  i INTEGER;
BEGIN
  IF p_changes IS NULL OR jsonb_typeof(p_changes) <> 'object' THEN
    RAISE EXCEPTION 'apply_life_plan_changes needs an object of changes'
      USING ERRCODE = '22023';
  END IF;

  -- Every table key the caller used must be on the list.
  FOR v_key IN
    SELECT k FROM jsonb_object_keys(coalesce(p_changes -> 'upsert', '{}'::jsonb)) AS k
    UNION SELECT k FROM jsonb_object_keys(coalesce(p_changes -> 'remove', '{}'::jsonb)) AS k
  LOOP
    IF NOT EXISTS (SELECT 1 FROM generate_subscripts(v_tables, 1) AS s WHERE v_tables[s][1] = v_key) THEN
      RAISE EXCEPTION 'apply_life_plan_changes cannot reach "%"', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;
  FOR v_key IN SELECT jsonb_array_elements_text(coalesce(p_changes -> 'replace', '[]'::jsonb)) LOOP
    IF NOT v_key = ANY (v_whole) THEN
      RAISE EXCEPTION 'apply_life_plan_changes cannot replace "%"', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;

  -- The plan the caller may actually see. Row security makes this find
  -- nothing for somebody else's plan, which is the refusal we want.
  SELECT id, revision INTO v_plan_id, v_rev
    FROM life_plans
   WHERE id = (p_changes ->> 'plan_id')::uuid
     FOR UPDATE;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'No such plan, or it is not yours' USING ERRCODE = '42501';
  END IF;

  IF v_rev <> p_expected_rev THEN
    RAISE EXCEPTION 'Plan revision is % but the save was built on %', v_rev, p_expected_rev
      USING ERRCODE = '55000';
  END IF;

  -- ---------------------------------------------------------------- removal
  -- Children first. Only the rows named, matched on their key columns.
  FOR i IN REVERSE array_length(v_tables, 1) .. 1 LOOP
    v_key := v_tables[i][1];
    v_table := v_tables[i][2];

    IF v_key = ANY (v_whole) AND (p_changes -> 'replace') ? v_key THEN
      EXECUTE format('DELETE FROM %I WHERE plan_id = $1', v_table) USING v_plan_id;
    END IF;

    v_rows := p_changes -> 'remove' -> v_key;
    CONTINUE WHEN v_rows IS NULL OR jsonb_array_length(v_rows) = 0;

    SELECT array_agg(a.attname::text ORDER BY a.attnum) INTO v_pk
      FROM pg_index x
      JOIN pg_attribute a ON a.attrelid = x.indrelid AND a.attnum = ANY (x.indkey)
     WHERE x.indrelid = v_table::regclass AND x.indisprimary;

    SELECT string_agg(format('t.%1$I = k.%1$I', c), ' AND ') INTO v_match FROM unnest(v_pk) AS c;
    EXECUTE format(
      'DELETE FROM %1$I t USING jsonb_populate_recordset(NULL::%1$I, $1) k WHERE %2$s',
      v_table, v_match)
      USING v_rows;
  END LOOP;

  -- ----------------------------------------------------------------- upsert
  FOR i IN 1 .. array_length(v_tables, 1) LOOP
    v_key := v_tables[i][1];
    v_table := v_tables[i][2];
    v_rows := p_changes -> 'upsert' -> v_key;
    CONTINUE WHEN v_rows IS NULL OR jsonb_array_length(v_rows) = 0;

    SELECT array_agg(a.attname::text ORDER BY a.attnum) INTO v_pk
      FROM pg_index x
      JOIN pg_attribute a ON a.attrelid = x.indrelid AND a.attnum = ANY (x.indkey)
     WHERE x.indrelid = v_table::regclass AND x.indisprimary;

    -- The table's real columns that the rows actually carry. `user_goal_id`
    -- is never one of them, on an insert either: the link to the counted goal
    -- is the Track push's, and a key check ignores row security, so a goal
    -- written here could otherwise claim another account's counted goal and
    -- block that account's own push on UNIQUE (user_goal_id).
    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY a.attnum),
           string_agg(format('%1$I = EXCLUDED.%1$I', a.attname), ', ' ORDER BY a.attnum)
             FILTER (WHERE a.attname <> ALL (v_pk)
                       AND a.attname NOT IN ('user_id', 'plan_id'))
      INTO v_cols, v_set
      FROM pg_attribute a
     WHERE a.attrelid = v_table::regclass AND a.attnum > 0 AND NOT a.attisdropped
       AND a.attname <> 'user_goal_id'
       AND EXISTS (SELECT 1 FROM jsonb_array_elements(v_rows) e WHERE e.value ? a.attname);

    EXECUTE format(
      'INSERT INTO %1$I (%2$s) SELECT %2$s FROM jsonb_populate_recordset(NULL::%1$I, $1) ON CONFLICT (%3$s) DO %4$s',
      v_table, v_cols,
      (SELECT string_agg(quote_ident(c), ', ') FROM unnest(v_pk) AS c),
      CASE WHEN v_set IS NULL THEN 'NOTHING' ELSE 'UPDATE SET ' || v_set END)
      USING v_rows;
  END LOOP;

  -- -------------------------------------------------------------- the plan
  UPDATE life_plans
     SET version = coalesce((p_changes -> 'plan' ->> 'version')::int, version),
         seq = greatest(seq, coalesce((p_changes -> 'plan' ->> 'seq')::int, 0)),
         season_focus_id = CASE WHEN (p_changes -> 'plan') ? 'season_focus_id'
                                THEN (p_changes -> 'plan' ->> 'season_focus_id')::uuid
                                ELSE season_focus_id END,
         revision = revision + 1
   WHERE id = v_plan_id
  RETURNING revision INTO v_rev;

  RETURN v_rev;
END;
$$;

REVOKE ALL ON FUNCTION apply_life_plan_changes(JSONB, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION apply_life_plan_changes(JSONB, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION apply_life_plan_changes(JSONB, INTEGER) TO authenticated;

DO $$
DECLARE
  f RECORD;
  forbidden TEXT;
BEGIN
  SELECT prosecdef, prosrc INTO f FROM pg_proc WHERE proname = 'apply_life_plan_changes';
  IF f.prosecdef THEN
    RAISE EXCEPTION 'apply_life_plan_changes must be SECURITY INVOKER, or row security does not apply inside it';
  END IF;
  FOREACH forbidden IN ARRAY ARRAY[
    'life_plan_days', 'life_plan_day_ratings', 'life_plan_day_ticks', 'life_plan_day_journal'
  ] LOOP
    IF position(forbidden IN f.prosrc) > 0 THEN
      RAISE EXCEPTION 'apply_life_plan_changes names %, which it must never reach', forbidden;
    END IF;
  END LOOP;
  IF position('user_goal_id' IN f.prosrc) = 0 THEN
    RAISE EXCEPTION 'apply_life_plan_changes has lost its guard on user_goal_id';
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
