-- ============================================================================
-- ONE SEASON (Plans/life-plan-rebuild.md, Phase 3; Q1 of Plans/life-plan-tables.md).
--
-- "The one thing", the focus areas and the season focus were one idea kept in
-- four unlinked places: the sentence and its dates in `life_chapters` and
-- `life_answers`, its why/cost/identity/values/areas in `life_plan_answers`,
-- the ranked areas in `life_plan_areas.season_rank`, the single focus in
-- `life_plans.season_focus_id`, and the goals in `life_plan_goals.serves_one_thing`.
-- They become one row per season, with its areas and goals as link rows.
-- Each season is a row, so the history comes free: a new one ends the old.
--
-- COPIED here; every old home stays until Phase 7. Adds and copies only.
-- ============================================================================

ALTER TABLE life_plan_nodes DROP CONSTRAINT IF EXISTS life_plan_nodes_kind_check;
ALTER TABLE life_plan_nodes ADD CONSTRAINT life_plan_nodes_kind_check CHECK (kind IN (
  'north_star','area','goal','checkpoint','obstacle','belief','habit',
  'routine','routine_step','split_day','experience','field','sub_step','season'));

CREATE TABLE IF NOT EXISTS life_plan_seasons (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'season' CHECK (node_kind = 'season'),
  started_on DATE NOT NULL DEFAULT current_date,
  -- The day it is meant to end; null for "until I say so".
  ends_on DATE,
  -- The day it did end. Null for the current season.
  ended_on DATE,
  sentence TEXT NOT NULL DEFAULT '' CHECK (char_length(sentence) <= 2000),
  why TEXT NOT NULL DEFAULT '' CHECK (char_length(why) <= 100000),
  cost TEXT NOT NULL DEFAULT '' CHECK (char_length(cost) <= 100000),
  identity TEXT NOT NULL DEFAULT '' CHECK (char_length(identity) <= 100000),
  values_note TEXT NOT NULL DEFAULT '' CHECK (char_length(values_note) <= 100000),
  areas_note TEXT NOT NULL DEFAULT '' CHECK (char_length(areas_note) <= 100000),
  -- The one area or goal the season band names. Any part of the plan, as
  -- `life_plans.season_focus_id` was.
  focus_id UUID,
  CONSTRAINT life_plan_seasons_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_seasons_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_seasons_focus_fk FOREIGN KEY (focus_id, user_id)
    REFERENCES life_plan_nodes (id, user_id) ON DELETE SET NULL (focus_id),
  CONSTRAINT life_plan_seasons_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_seasons_dates CHECK (
    (ends_on IS NULL OR ends_on >= started_on) AND (ended_on IS NULL OR ended_on >= started_on)),
  -- One current season per plan. Deferrable: starting a new one ends the old
  -- and adds the new inside one save.
  CONSTRAINT life_plan_seasons_one_current
    EXCLUDE USING btree (plan_id WITH =) WHERE (ended_on IS NULL) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_life_plan_seasons_plan ON life_plan_seasons(plan_id, started_on);

CREATE TABLE IF NOT EXISTS life_plan_season_areas (
  user_id UUID NOT NULL,
  season_id UUID NOT NULL,
  area_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  PRIMARY KEY (season_id, area_id),
  CONSTRAINT life_plan_season_areas_season_fk FOREIGN KEY (season_id, user_id)
    REFERENCES life_plan_seasons (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_season_areas_area_fk FOREIGN KEY (area_id, user_id)
    REFERENCES life_plan_areas (id, user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS life_plan_season_goals (
  user_id UUID NOT NULL,
  season_id UUID NOT NULL,
  goal_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  PRIMARY KEY (season_id, goal_id),
  CONSTRAINT life_plan_season_goals_season_fk FOREIGN KEY (season_id, user_id)
    REFERENCES life_plan_seasons (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_season_goals_goal_fk FOREIGN KEY (goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE CASCADE
);

-- Locked to their owner, as every life plan table.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['life_plan_seasons', 'life_plan_season_areas', 'life_plan_season_goals'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    BEGIN
      EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (auth.uid() = user_id)', t || '_select_own', t);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (auth.uid() = user_id)', t || '_insert_own', t);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t || '_update_own', t);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (auth.uid() = user_id)', t || '_delete_own', t);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END LOOP;
END $$;

-- ---------------------------------------------------------------- the copy
-- One current season per plan that has anything of one: a one-thing chapter,
-- a one-thing answer, focus areas, a focus, or a goal serving the one thing.
-- Its dates are the newest one-thing chapter's; its sentence is that chapter's
-- newest wording, else the plan's own one-thing answer.
--
-- EARLIER ONE THINGS BECOME PAST SEASONS, so the box's history still lists
-- them. One per chapter that nothing continues (an extension is a new chapter
-- continuing the old, carrying its start, so the last of a chain is the whole
-- one thing), with that chapter's newest wording. It ended when the next one
-- started, else on its own deadline. Their node ids (`season:ch-<chapter>`)
-- cannot collide with the app's own `season:s<n>`.
DO $$
DECLARE
  p RECORD;
  v_chapter RECORD;
  v_sentence TEXT;
  v_season UUID;
  v_local TEXT;
  v_past RECORD;
BEGIN
  FOR p IN SELECT id, user_id, created_at, season_focus_id FROM life_plans LOOP
    CONTINUE WHEN EXISTS (SELECT 1 FROM life_plan_seasons s WHERE s.plan_id = p.id);

    SELECT c.id, c.started_on, c.due_on INTO v_chapter
      FROM life_chapters c
     WHERE c.user_id = p.user_id AND c.statement_key = 'one_thing'
       AND NOT EXISTS (SELECT 1 FROM life_chapters n WHERE n.continues_id = c.id)
     ORDER BY c.started_on DESC, c.created_at DESC
     LIMIT 1;

    v_sentence := NULL;
    IF v_chapter.id IS NOT NULL THEN
      SELECT a.body INTO v_sentence FROM life_answers a
       WHERE a.user_id = p.user_id AND a.chapter_id = v_chapter.id AND a.answer_key = 'one_thing'
       ORDER BY a.answered_at DESC LIMIT 1;
    END IF;
    IF coalesce(btrim(v_sentence), '') = '' THEN
      SELECT a.body INTO v_sentence FROM life_plan_answers a
       WHERE a.plan_id = p.id AND a.kind = 'answer' AND a.prompt_id = 'start:one-thing';
    END IF;

    CONTINUE WHEN v_chapter.id IS NULL
      AND coalesce(btrim(v_sentence), '') = ''
      AND p.season_focus_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM life_plan_areas a WHERE a.plan_id = p.id AND a.season_rank IS NOT NULL)
      AND NOT EXISTS (SELECT 1 FROM life_plan_goals g WHERE g.plan_id = p.id AND g.serves_one_thing)
      AND NOT EXISTS (SELECT 1 FROM life_plan_answers a WHERE a.plan_id = p.id AND a.kind = 'answer'
                        AND a.prompt_id LIKE 'start:one-%' AND btrim(a.body) <> '');

    -- The season's node. Its local id is the one the app gives its first season.
    v_local := 'season:s1';
    INSERT INTO life_plan_nodes (plan_id, user_id, kind, local_id)
    VALUES (p.id, p.user_id, 'season', v_local)
    RETURNING id INTO v_season;

    INSERT INTO life_plan_seasons (
      id, user_id, plan_id, started_on, ends_on, sentence, why, cost, identity, values_note, areas_note, focus_id)
    SELECT v_season, p.user_id, p.id,
           coalesce(v_chapter.started_on, p.created_at::date),
           CASE WHEN v_chapter.due_on >= coalesce(v_chapter.started_on, p.created_at::date) THEN v_chapter.due_on END,
           left(coalesce(v_sentence, ''), 2000),
           coalesce((SELECT a.body FROM life_plan_answers a WHERE a.plan_id = p.id AND a.kind = 'answer' AND a.prompt_id = 'start:one-why'), ''),
           coalesce((SELECT a.body FROM life_plan_answers a WHERE a.plan_id = p.id AND a.kind = 'answer' AND a.prompt_id = 'start:one-cost'), ''),
           coalesce((SELECT a.body FROM life_plan_answers a WHERE a.plan_id = p.id AND a.kind = 'answer' AND a.prompt_id = 'start:one-identity'), ''),
           coalesce((SELECT a.body FROM life_plan_answers a WHERE a.plan_id = p.id AND a.kind = 'answer' AND a.prompt_id = 'start:one-values'), ''),
           coalesce((SELECT a.body FROM life_plan_answers a WHERE a.plan_id = p.id AND a.kind = 'answer' AND a.prompt_id = 'start:one-areas'), ''),
           p.season_focus_id;

    INSERT INTO life_plan_season_areas (user_id, season_id, area_id, position)
    SELECT p.user_id, v_season, a.id, row_number() OVER (ORDER BY a.season_rank, a.position) - 1
      FROM life_plan_areas a
     WHERE a.plan_id = p.id AND a.season_rank IS NOT NULL;

    INSERT INTO life_plan_season_goals (user_id, season_id, goal_id, position)
    SELECT p.user_id, v_season, g.id, row_number() OVER (ORDER BY g.position) - 1
      FROM life_plan_goals g
     WHERE g.plan_id = p.id AND g.serves_one_thing;

    -- The earlier one things.
    FOR v_past IN
      WITH heads AS (
        SELECT c.id, c.started_on, c.due_on, c.created_at,
               (SELECT a.body FROM life_answers a
                 WHERE a.user_id = p.user_id AND a.chapter_id = c.id AND a.answer_key = 'one_thing'
                 ORDER BY a.answered_at DESC LIMIT 1) AS body
          FROM life_chapters c
         WHERE c.user_id = p.user_id AND c.statement_key = 'one_thing'
           AND NOT EXISTS (SELECT 1 FROM life_chapters n WHERE n.continues_id = c.id)
      ), ordered AS (
        SELECT h.*, lead(h.started_on) OVER (ORDER BY h.started_on, h.created_at) AS next_start
          FROM heads h
      )
      SELECT * FROM ordered
       WHERE id IS DISTINCT FROM v_chapter.id AND coalesce(btrim(body), '') <> ''
    LOOP
      INSERT INTO life_plan_nodes (plan_id, user_id, kind, local_id)
      VALUES (p.id, p.user_id, 'season', 'season:ch-' || v_past.id)
      RETURNING id INTO v_season;

      INSERT INTO life_plan_seasons (id, user_id, plan_id, started_on, ends_on, ended_on, sentence)
      VALUES (
        v_season, p.user_id, p.id, v_past.started_on,
        CASE WHEN v_past.due_on >= v_past.started_on THEN v_past.due_on END,
        greatest(v_past.started_on, coalesce(v_past.next_start, v_past.due_on, v_past.started_on)),
        left(v_past.body, 2000));
    END LOOP;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
