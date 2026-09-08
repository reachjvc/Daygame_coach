-- ============================================================================
-- ONE MEANING OF "A TRAINING WEEK YOU SAVED".
--
-- There were two, and they could not see each other. `workout_templates` held
-- a flat list of sets that prefilled the free-form logger; the program builder
-- held a schedule that only existed while you were on the page — close the tab
-- before pressing Start and it was gone, and it was never stored anywhere you
-- could get it back from on another device.
--
-- So somebody who built their week in the Life Mastery flow had nothing to show
-- for it, and somebody who saved a "template" could not start it as a program.
-- This table is the one place a saved week lives, and every template becomes
-- one.
--
-- A DRAFT IS A WORK IN PROGRESS, AND THE SCHEMA SAYS SO. A day with no
-- exercises in it yet is a legal draft — building a week over two sittings is
-- the ordinary case, and one of the templates being migrated here has no sets
-- at all. It is NOT a legal program: starting a draft validates it strictly
-- (CustomScheduleSchema, which requires at least one exercise per day) and
-- refuses. Saving is permissive, starting is not.
-- ============================================================================

CREATE TABLE IF NOT EXISTS program_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  discipline TEXT NOT NULL DEFAULT 'strength'
    CHECK (discipline IN ('strength','bodybuilding','calisthenics','cardio','flexibility','triathlon','ironman')),
  -- The unit the numbers in `working_weights` are IN. Never converted on the
  -- way in or out: a converted increment is a different program.
  unit_system TEXT NOT NULL DEFAULT 'kg' CHECK (unit_system IN ('kg','lb')),
  -- Shape is `CustomScheduleSchema` relaxed to allow an empty day; validated at
  -- the API on write, and strictly on start. JSONB rather than columns because
  -- a schedule is a document the engine reads whole, not something queried by
  -- part.
  schedule JSONB NOT NULL DEFAULT '{"kind":"linear_rotation","days":[]}'::jsonb,
  working_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Where it came from, so the app can say so rather than guess: written from
  -- scratch, started from a catalogue program, or carried over from a saved
  -- workout by this migration.
  source TEXT NOT NULL DEFAULT 'built' CHECK (source IN ('built','catalog','saved_workout')),
  source_program_id TEXT CHECK (source_program_id IS NULL OR char_length(source_program_id) BETWEEN 1 AND 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Two weeks with the same name is a rename people mean to do, not two things.
  UNIQUE (user_id, name),
  -- The schedule must at least be an object with a kind and a days ARRAY. This
  -- is not the full shape — that is the API's job — but it stops a write that
  -- would make every read of this row throw.
  CONSTRAINT program_drafts_schedule_shape CHECK (
    jsonb_typeof(schedule) = 'object'
    AND jsonb_typeof(schedule -> 'days') = 'array'
    AND schedule ? 'kind'
  ),
  CONSTRAINT program_drafts_weights_shape CHECK (jsonb_typeof(working_weights) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_program_drafts_user ON program_drafts(user_id, updated_at DESC);

-- ============================================================================
-- Who may touch a draft: only the person who wrote it.
--
-- A saved training week is text you typed, about yourself, that nobody else has
-- a stake in — the same kind of thing as `workout_templates`, which has had
-- exactly these four rules since 20260715. Nothing here is earned or computed,
-- so own-row CRUD is the right shape rather than system-only.
-- ============================================================================
ALTER TABLE program_drafts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can read own program drafts" ON program_drafts
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own program drafts" ON program_drafts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- WITH CHECK is spelled out rather than left implicit. Postgres already falls
-- back to the USING expression when an UPDATE policy has no WITH CHECK, so this
-- changes nothing on its own — it is written down so that a later edit to
-- USING cannot silently widen what a row is allowed to BECOME. Verified on real
-- Postgres: with the clause removed, handing your own draft to another account
-- is still refused.
DO $$ BEGIN
  CREATE POLICY "Users can update own program drafts" ON program_drafts
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own program drafts" ON program_drafts
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- `updated_at` is kept by the database, not by whoever remembers to set it.
-- The list is ordered by it, so a client that forgets would silently reorder
-- somebody's drafts.
-- ============================================================================
CREATE OR REPLACE FUNCTION program_drafts_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_program_drafts_updated_at ON program_drafts;
CREATE TRIGGER trg_program_drafts_updated_at
  BEFORE UPDATE ON program_drafts
  FOR EACH ROW EXECUTE FUNCTION program_drafts_touch_updated_at();

-- ============================================================================
-- CARRY EVERY SAVED WORKOUT OVER, INCLUDING THE EMPTY ONE.
--
-- Each template becomes a one-day draft. Its sets are grouped by exercise name
-- in the order they first appear, so three rows of "incline 12 kg × 8" become
-- ONE lift asking for 3 sets of 8 — which is what the person meant when they
-- typed it, and what the flat list could never say.
--
-- Progression is `none` on purpose. These were prefills for a logger, never a
-- program with a rule; inventing "add 2.5 kg a session" for somebody would be
-- the app making up training advice and attributing it to them.
--
-- Weights are kept in kilograms because that is what `weight_kg` holds
-- (`formatWeight` converts on the way out, so the stored number really is kg).
-- Converting to pounds here would change every number for no reason.
-- ============================================================================
DO $$
DECLARE
  templates_before INTEGER;
  drafts_after INTEGER;
  sets_before INTEGER;
  sets_after INTEGER;
  named_sets_dropped INTEGER;
BEGIN
  IF to_regclass('public.workout_templates') IS NULL THEN
    RAISE NOTICE 'workout_templates is already gone; nothing to migrate.';
    RETURN;
  END IF;

  SELECT count(*) INTO templates_before FROM workout_templates;
  SELECT coalesce(sum(jsonb_array_length(sets)), 0) INTO sets_before FROM workout_templates;

  INSERT INTO program_drafts
    (user_id, name, discipline, unit_system, schedule, working_weights, source, created_at, updated_at)
  SELECT
    t.user_id,
    t.name,
    CASE t.session_type
      WHEN 'weights' THEN 'strength'
      WHEN 'cardio' THEN 'cardio'
      WHEN 'running' THEN 'cardio'
      ELSE 'flexibility'
    END,
    'kg',
    jsonb_build_object(
      'kind', 'linear_rotation',
      'days', jsonb_build_array(jsonb_build_object(
        'id', 'day1',
        'label', left(t.name, 120),
        'exercises', coalesce(g.exercises, '[]'::jsonb)
      ))
    ),
    coalesce(g.weights, '{}'::jsonb),
    'saved_workout',
    t.created_at,
    t.updated_at
  FROM workout_templates t
  LEFT JOIN LATERAL (
    SELECT
      jsonb_agg(
        jsonb_build_object(
          'id', gx.slug,
          'name', gx.display_name,
          'metricType', 'load',
          'scheme', jsonb_build_object(
            'kind', 'linear',
            -- Capped at the schema's own ceilings so a migrated row cannot be
            -- one the API would then refuse to save back.
            'sets', gx.n_sets,
            'reps', gx.reps
          ),
          'progression', jsonb_build_object('kind', 'none'),
          -- Free weights, because a logger set never said what it was loaded
          -- on, and guessing "barbell" would put a 20 kg bar under a dumbbell.
          'loadStyle', 'free'
        ) ORDER BY gx.first_ix
      ) AS exercises,
      jsonb_object_agg(gx.slug, gx.weight) AS weights
    FROM (
      SELECT
        s.slug,
        min(s.ord) AS first_ix,
        -- The spelling the person used the FIRST time, kept as the label.
        left((array_agg(s.exercise ORDER BY s.ord))[1], 120) AS display_name,
        -- The working weight is the heaviest the lift was written at, not the
        -- first: a template with a warm-up row in it should not start you there.
        max(s.weight_kg) AS weight,
        least(count(*), 20) AS n_sets,
        greatest(least(min(s.reps), 100), 1) AS reps
      FROM (
        SELECT
          -- WITH ORDINALITY, not row_number(): the order the lifts appear in is
          -- the order the person wrote them, and a window function with no
          -- ORDER BY is not promised to preserve it.
          e.ord,
          btrim(e.value ->> 'exercise') AS exercise,
          -- GROUPED BY THE SLUG, NOT THE NAME. The slug is the lift's id inside
          -- the schedule AND the key into `working_weights`, so two spellings
          -- that slugify the same ("Incline Press" and "incline-press") have to
          -- be one lift — grouped by name they would produce the same key twice
          -- and the insert would fail on a duplicate key.
          left(
            coalesce(
              nullif(
                btrim(regexp_replace(lower(btrim(e.value ->> 'exercise')), '[^a-z0-9]+', '_', 'g'), '_'),
                ''
              ),
              'lift_' || e.ord::text
            ),
            80
          ) AS slug,
          coalesce((e.value ->> 'weight_kg')::numeric, 0) AS weight_kg,
          coalesce((e.value ->> 'reps')::int, 1) AS reps
        FROM jsonb_array_elements(t.sets) WITH ORDINALITY AS e(value, ord)
        WHERE coalesce(btrim(e.value ->> 'exercise'), '') <> ''
      ) s
      GROUP BY s.slug
    ) gx
  ) g ON TRUE
  -- A person who already has a draft of that name keeps it; the template is
  -- the copy that loses. Nothing is overwritten silently.
  ON CONFLICT (user_id, name) DO NOTHING;

  SELECT count(*) INTO drafts_after FROM program_drafts WHERE source = 'saved_workout';

  -- Every set that named an exercise must be accounted for by exactly one
  -- lift's set count. Grouping is the whole conversion, so this is the check
  -- that it grouped rather than dropped: three "incline" rows become one lift
  -- asking for three sets, and 3 still equals 3.
  SELECT coalesce(sum((ex -> 'scheme' ->> 'sets')::int), 0) INTO sets_after FROM (
    SELECT jsonb_array_elements(schedule -> 'days' -> 0 -> 'exercises') AS ex
    FROM program_drafts WHERE source = 'saved_workout'
  ) q;

  IF drafts_after <> templates_before THEN
    RAISE EXCEPTION 'Template migration lost rows: % templates became % drafts',
      templates_before, drafts_after;
  END IF;

  -- Sets are only allowed to go missing where the row named no exercise (there
  -- is nothing to migrate) or where one lift had more than the schema's 20.
  SELECT sets_before - count(*) INTO named_sets_dropped
  FROM workout_templates t, jsonb_array_elements(t.sets) AS e(value)
  WHERE coalesce(btrim(e.value ->> 'exercise'), '') <> '';

  IF sets_after <> sets_before - named_sets_dropped THEN
    RAISE EXCEPTION 'Template migration lost sets: % named sets became % across the drafts',
      sets_before - named_sets_dropped, sets_after;
  END IF;

  RAISE NOTICE 'Migrated % templates (% sets) into % drafts holding % lifts.',
    templates_before, sets_before, drafts_after, sets_after;
END $$;

DROP TABLE IF EXISTS workout_templates;
