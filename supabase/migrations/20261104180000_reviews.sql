-- ============================================================================
-- REVIEWS: A WEEK, MONTH, QUARTER OR YEAR LOOKED BACK ON
-- (Plans/life-plan-rebuild.md, Phase 5; Q7 of Plans/life-plan-tables.md).
--
-- Stefan's rhythm had no table: every week, score each area 0-10, keep the
-- magic moments and the lessons, set the next outcomes; then the same each
-- month, quarter and year. One row per review, with its period and how often
-- it comes round, and one score row per area it scored.
--
-- ONE REVIEW PER PERIOD: (plan, cadence, period_start) is unique, and the
-- app's id for a review is `<cadence>-<period_start>`, the same fact.
--
-- THE COPY. A plan whose areas carry a "last two weeks" score (Your 10s,
-- `life_plan_areas.review_fortnight`) gets those scores as its first review,
-- kind `fortnight`, so the history starts where the person already stood.
-- Nothing records when those scores were given; they arrived with the plan,
-- so the review is dated to the two weeks ending on the day the plan row was
-- made. `review_fortnight` stays, and stays the Your 10s number: the copy is
-- a snapshot, and later changes there do not reach it. A plan made after this
-- runs gets no copy; its first review starts its history.
--
-- Adds and copies only.
-- ============================================================================

ALTER TABLE life_plan_nodes DROP CONSTRAINT IF EXISTS life_plan_nodes_kind_check;
ALTER TABLE life_plan_nodes ADD CONSTRAINT life_plan_nodes_kind_check CHECK (kind IN (
  'north_star','area','goal','checkpoint','obstacle','belief','habit',
  'routine','routine_step','split_day','experience','field','sub_step','season','review'));

CREATE TABLE IF NOT EXISTS life_plan_reviews (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'review' CHECK (node_kind = 'review'),
  -- How often it comes round. `fortnight` is only the copied first review.
  cadence TEXT NOT NULL CHECK (cadence IN ('week', 'fortnight', 'month', 'quarter', 'year')),
  -- The days it looks back over, both inclusive.
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  -- The day it was first written in.
  written_on DATE NOT NULL DEFAULT current_date,
  magic_moments TEXT NOT NULL DEFAULT '' CHECK (char_length(magic_moments) <= 100000),
  lessons TEXT NOT NULL DEFAULT '' CHECK (char_length(lessons) <= 100000),
  next_outcomes TEXT NOT NULL DEFAULT '' CHECK (char_length(next_outcomes) <= 100000),
  CONSTRAINT life_plan_reviews_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_reviews_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_reviews_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_reviews_one_per_period UNIQUE (plan_id, cadence, period_start),
  -- Inside living memory: a script cannot fill the table with a review for
  -- every week back to year 1 (the security review's catch).
  CONSTRAINT life_plan_reviews_dates CHECK (
    period_end >= period_start AND period_start >= DATE '1900-01-01' AND period_end <= DATE '2200-12-31')
);

CREATE INDEX IF NOT EXISTS idx_life_plan_reviews_plan ON life_plan_reviews(plan_id, period_start);

CREATE TABLE IF NOT EXISTS life_plan_review_scores (
  user_id UUID NOT NULL,
  review_id UUID NOT NULL,
  area_id UUID NOT NULL,
  score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 10),
  PRIMARY KEY (review_id, area_id),
  CONSTRAINT life_plan_review_scores_review_fk FOREIGN KEY (review_id, user_id)
    REFERENCES life_plan_reviews (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_review_scores_area_fk FOREIGN KEY (area_id, user_id)
    REFERENCES life_plan_areas (id, user_id) ON DELETE CASCADE
);

-- An area's removal cascades to its scores; this keeps that a lookup.
CREATE INDEX IF NOT EXISTS idx_life_plan_review_scores_area ON life_plan_review_scores(area_id);

-- Locked to their owner, as every life plan table.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['life_plan_reviews', 'life_plan_review_scores'] LOOP
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
-- Once per plan: a plan that already has a review is left alone, so running
-- this twice adds nothing.
DO $$
DECLARE
  p RECORD;
  v_end DATE;
  v_start DATE;
  v_review UUID;
BEGIN
  FOR p IN SELECT id, user_id, created_at FROM life_plans LOOP
    CONTINUE WHEN EXISTS (SELECT 1 FROM life_plan_reviews r WHERE r.plan_id = p.id);
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM life_plan_areas a WHERE a.plan_id = p.id AND a.review_fortnight IS NOT NULL);

    -- The UTC day. For the one account there is, made at 09:21 UTC on
    -- 23 Sep 2026, that is the same day as in Copenhagen.
    v_end := (p.created_at AT TIME ZONE 'UTC')::date;
    v_start := v_end - 13;

    INSERT INTO life_plan_nodes (plan_id, user_id, kind, local_id)
    VALUES (p.id, p.user_id, 'review', 'review:fortnight-' || to_char(v_start, 'YYYY-MM-DD'))
    RETURNING id INTO v_review;

    INSERT INTO life_plan_reviews (id, user_id, plan_id, cadence, period_start, period_end, written_on)
    VALUES (v_review, p.user_id, p.id, 'fortnight', v_start, v_end, v_end);

    INSERT INTO life_plan_review_scores (user_id, review_id, area_id, score)
    SELECT p.user_id, v_review, a.id, a.review_fortnight
      FROM life_plan_areas a
     WHERE a.plan_id = p.id AND a.review_fortnight IS NOT NULL;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
