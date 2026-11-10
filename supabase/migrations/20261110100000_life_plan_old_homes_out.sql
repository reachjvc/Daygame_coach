-- ============================================================================
-- THE OLD HOMES GO (Plans/life-plan-rebuild.md, Phase 7).
--
-- Phases 1-6 gave every part of the plan one home and copied it there. The old
-- homes were kept, unread or written twice, until the owner said yes to
-- removing them: "GO execute that phase" (2026-11-10). This removes them.
--
-- A backup of every table this touches was taken first, outside the code:
-- ~/dg-backups/life-plan-2026-11-10-before-phase7.json (38 tables).
--
-- In order:
--   1. The goals the Track step copied into `user_goals` (tagged `ns:`) give
--      their numbers to the plan first: each non-zero current value as a day
--      number on its plan goal, on the day it was last changed, and each
--      non-zero weekly snapshot on its own day. A number the plan already has
--      for that goal and day is kept. Then the copies and their snapshots go.
--   2. Answer rows for answers that have a column of their own (the north
--      star's, its commitment, the season's supports and its sentence) go.
--      Checked on the owner's account before writing this: all seven are
--      word for word what their columns hold.
--   3. The change-only save, without the habits table, the season focus on
--      the plan row, and the guard on `user_goal_id`.
--   4. The whole-plan save `save_life_plan` (refused since Phase 4).
--   5. Columns: life_plans.season_focus_id, life_plan_areas.season_rank and
--      review_fortnight, life_plan_goals.serves_one_thing and user_goal_id.
--   6. Tables: life_plan_goal_habits (and its 'habit' nodes), life_answers and
--      life_chapters (the one thing's old history; the season holds it).
--
-- Undo: rollback/20261110100000_life_plan_old_homes_out.down.sql puts the
-- structure back; the rows come back only from the backup above.
-- ============================================================================

-- 1. ------------------------------------------------- the Track step's copies
CREATE TEMP TABLE p7_track_numbers AS
WITH copies AS (
  SELECT g.id AS user_goal_id, g.user_id, g.current_value, g.updated_at,
         n.id AS node_id, n.plan_id,
         coalesce(
           (SELECT p.timezone FROM public.profiles p
             WHERE p.id = g.user_id AND p.timezone IN (SELECT name FROM pg_catalog.pg_timezone_names)),
           'UTC') AS tz
    FROM public.user_goals g
    JOIN public.life_plan_nodes n
      ON n.user_id = g.user_id AND n.kind = 'goal' AND n.local_id = split_part(g.template_id, ':', 3)
   WHERE g.template_id LIKE 'ns:%:%'
),
numbers AS (
  -- A weekly (or daily) snapshot first: it is the number that week ended on.
  SELECT c.user_id, c.plan_id, c.node_id, s.snapshot_date AS on_date, s.current_value::numeric AS value, 1 AS rank
    FROM copies c
    JOIN public.daily_goal_snapshots s ON s.goal_id = c.user_goal_id
   WHERE s.current_value <> 0
  UNION ALL
  SELECT c.user_id, c.plan_id, c.node_id, (c.updated_at AT TIME ZONE c.tz)::date, c.current_value::numeric, 2
    FROM copies c
   WHERE c.current_value <> 0
)
SELECT DISTINCT ON (node_id, on_date) user_id, plan_id, node_id, on_date, value
  FROM numbers
 ORDER BY node_id, on_date, rank;

INSERT INTO public.life_plan_days (user_id, plan_id, on_date)
SELECT DISTINCT user_id, plan_id, on_date FROM p7_track_numbers
ON CONFLICT (plan_id, on_date) DO NOTHING;

INSERT INTO public.life_plan_day_numbers (user_id, day_id, node_id, value)
SELECT t.user_id, d.id, t.node_id, t.value
  FROM p7_track_numbers t
  JOIN public.life_plan_days d ON d.plan_id = t.plan_id AND d.on_date = t.on_date
ON CONFLICT (day_id, node_id) DO NOTHING;

-- A copy whose plan goal is gone has no home for its numbers: stop rather than
-- lose them. (On 2026-11-10 all 50 matched.)
DO $$
DECLARE
  orphans INTEGER;
BEGIN
  SELECT count(*) INTO orphans
    FROM public.user_goals g
   WHERE g.template_id LIKE 'ns:%'
     AND (g.current_value <> 0 OR EXISTS (SELECT 1 FROM public.daily_goal_snapshots s WHERE s.goal_id = g.id AND s.current_value <> 0))
     AND NOT EXISTS (
       SELECT 1 FROM public.life_plan_nodes n
        WHERE n.user_id = g.user_id AND n.kind = 'goal' AND n.local_id = split_part(g.template_id, ':', 3));
  IF orphans > 0 THEN
    RAISE EXCEPTION '% copied goals hold numbers but match no plan goal; nothing was changed', orphans;
  END IF;
END
$$;

DELETE FROM public.daily_goal_snapshots s
 USING public.user_goals g
 WHERE s.goal_id = g.id AND g.template_id LIKE 'ns:%';
DELETE FROM public.user_goals WHERE template_id LIKE 'ns:%';
DROP TABLE p7_track_numbers;

-- 2. -------------------------------------------- answers with their own column
DELETE FROM public.life_plan_answers
 WHERE kind = 'answer'
   AND prompt_id IN (
     'star_why', 'identity_total', 'conduct', 'become', 'affirmations', 'start:commit', 'start:commit-date',
     'start:one-why', 'start:one-cost', 'start:one-identity', 'start:one-values', 'start:one-areas',
     'start:one-thing'
   );

-- 3. ----------------------------------------------------- the change-only save
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
    ARRAY['routines',       'life_plan_routines'],
    ARRAY['steps',          'life_plan_routine_steps'],
    ARRAY['split_days',     'life_plan_routine_split_days'],
    ARRAY['experiences',    'life_plan_experiences'],
    ARRAY['fields',         'life_plan_fields'],
    ARRAY['sub_steps',      'life_plan_sub_steps'],
    ARRAY['seasons',        'life_plan_seasons'],
    ARRAY['goal_feeds',     'life_plan_goal_feeds'],
    ARRAY['goal_serves',    'life_plan_goal_serves'],
    ARRAY['routine_serves', 'life_plan_routine_serves'],
    ARRAY['step_serves',    'life_plan_step_serves'],
    ARRAY['reviews',        'life_plan_reviews'],
    ARRAY['season_areas',   'life_plan_season_areas'],
    ARRAY['season_goals',   'life_plan_season_goals'],
    ARRAY['review_scores',  'life_plan_review_scores'],
    ARRAY['review_goals',   'life_plan_review_goals'],
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

    -- The table's real columns that the rows actually carry. A field a page
    -- running older code still sends for a column that is gone is ignored.
    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY a.attnum),
           string_agg(format('%1$I = EXCLUDED.%1$I', a.attname), ', ' ORDER BY a.attnum)
             FILTER (WHERE a.attname <> ALL (v_pk)
                       AND a.attname NOT IN ('user_id', 'plan_id'))
      INTO v_cols, v_set
      FROM pg_attribute a
     WHERE a.attrelid = v_table::regclass AND a.attnum > 0 AND NOT a.attisdropped
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
         revision = revision + 1
   WHERE id = v_plan_id
  RETURNING revision INTO v_rev;

  RETURN v_rev;
END;
$$;

REVOKE ALL ON FUNCTION apply_life_plan_changes(JSONB, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION apply_life_plan_changes(JSONB, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION apply_life_plan_changes(JSONB, INTEGER) TO authenticated;

-- 4. ------------------------------------------------------ the whole-plan save
DROP FUNCTION IF EXISTS public.save_life_plan(JSONB, INTEGER);

-- 5. ------------------------------------------------------------- the columns
ALTER TABLE public.life_plans DROP COLUMN IF EXISTS season_focus_id;
ALTER TABLE public.life_plan_areas DROP COLUMN IF EXISTS season_rank;
ALTER TABLE public.life_plan_areas DROP COLUMN IF EXISTS review_fortnight;
ALTER TABLE public.life_plan_goals DROP COLUMN IF EXISTS serves_one_thing;
ALTER TABLE public.life_plan_goals DROP COLUMN IF EXISTS user_goal_id;

-- 6. -------------------------------------------------------------- the tables
DROP TABLE IF EXISTS public.life_plan_goal_habits;
DELETE FROM public.life_plan_nodes WHERE kind = 'habit';
DROP TABLE IF EXISTS public.life_answers;
DROP TABLE IF EXISTS public.life_chapters;
DROP FUNCTION IF EXISTS public.life_answers_reject_update();
DROP FUNCTION IF EXISTS public.life_chapters_reject_update();

-- The change-only save must still be unable to reach the day half, and must
-- still run as the caller.
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
    'life_plan_days', 'life_plan_day_ratings', 'life_plan_day_ticks', 'life_plan_day_journal',
    'life_plan_day_numbers'
  ] LOOP
    IF position(forbidden IN f.prosrc) > 0 THEN
      RAISE EXCEPTION 'apply_life_plan_changes names %, which it must never reach', forbidden;
    END IF;
  END LOOP;
END
$$;

NOTIFY pgrst, 'reload schema';
