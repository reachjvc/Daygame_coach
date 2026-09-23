-- ============================================================================
-- A DIARY ENTRY OUTLIVES THE QUESTION THAT ASKED FOR IT.
--
-- M1 of docs/plans/life-mastery-everything-saves.md, and the one new rule the
-- owner approved: **what you wrote in words outlives the thing it was written
-- under; what was only a tick does not.**
--
-- `life_plan_day_journal` is keyed `(day_id, node_id)` with node_id cascading
-- from `life_plan_nodes`. That is right for a tick and wrong for a diary:
-- `save_life_plan` deletes every node no longer in the plan, so removing one
-- daily question would take months of writing with it. The app already promises
-- the opposite on screen — `journalArchive` renders an entry whose question is
-- gone, labelled, and its own comment calls dropping them "deleting somebody's
-- diary to make a join easier".
--
-- WHY NOT `ON DELETE SET NULL`. Because the key is two columns and Postgres
-- with no column list nulls EVERY one of them, including `user_id`, which is
-- NOT NULL — so the parent delete aborts rather than clearing the pointer.
-- Proved against this database in a rolled-back transaction over temp tables:
--
--   UPDATE ONLY "probe_child" SET "ref_id" = NULL, "user_id" = NULL
--   ERROR: null value in column "user_id" violates not-null constraint
--
-- (The same trap was live in `life_plans_season_focus_fk`, fixed in
-- 20260923130000. Here it is avoided rather than patched: no node link at all.)
--
-- SO: the row is keyed by the PLAN'S OWN id for the question — `f3`, `s7` — the
-- same `local_id` space `life_plan_nodes` uses, and carries `asked`, the
-- question's words AS THEY WERE ON THE DAY IT WAS ANSWERED. That is not a
-- second copy of a fact (rule 1 of the deployment plan): editing a question
-- later must not rewrite five months of entries, so the two genuinely differ.
--
-- A deliberate consequence, stated: nothing stops a journal row naming a
-- question the plan no longer has. That IS the feature. The trade is that the
-- database can no longer refuse a typo'd id, so `lifePlanDayService` validates
-- the shape on the way in and a test holds it.
--
-- ----------------------------------------------------------------------------
-- ALTERED IN PLACE, NOT DROPPED AND RECREATED.
--
-- The first draft of this file dropped the table, on the grounds that it holds
-- zero rows. Two reasons that was worse, and both survive being right about the
-- row count. A `DROP TABLE` in a migration is a loaded gun pointed at whatever
-- the table holds on the day it actually runs, not on the day it was written —
-- and dropping takes the four row-level-security policies with it, so the
-- correctness of the rebuild depends on remembering to recreate them. These
-- ALTERs cannot delete a row and cannot lose a policy.
--
-- The guard below still refuses to run against a table with rows in it, because
-- `local_id` cannot be backfilled from `node_id` without a join this file has
-- no business making. If it ever fires, the fix is a backfill, not a drop.
-- ============================================================================

DO $$
DECLARE
  n BIGINT;
BEGIN
  SELECT count(*) INTO n FROM life_plan_day_journal;
  IF n > 0 THEN
    RAISE EXCEPTION
      'life_plan_day_journal holds % row(s); this migration cannot backfill local_id. Write the backfill first.', n;
  END IF;
END $$;

-- The node link goes first: it is the thing being undone.
ALTER TABLE life_plan_day_journal
  DROP CONSTRAINT IF EXISTS life_plan_day_journal_node_fk;

ALTER TABLE life_plan_day_journal
  DROP CONSTRAINT IF EXISTS life_plan_day_journal_pkey;

ALTER TABLE life_plan_day_journal
  ADD COLUMN IF NOT EXISTS id UUID NOT NULL DEFAULT gen_random_uuid();

-- The plan's own id for whatever asked: a field (`f3`) or a routine step
-- (`s7`). Same shape as `life_plan_nodes.local_id`, deliberately not a key.
ALTER TABLE life_plan_day_journal
  ADD COLUMN IF NOT EXISTS local_id TEXT NOT NULL DEFAULT '';
ALTER TABLE life_plan_day_journal
  ALTER COLUMN local_id DROP DEFAULT;

-- The question, as it read on the day it was answered. Empty is allowed: an
-- entry can outlive the words, and the archive has its own fallback copy.
ALTER TABLE life_plan_day_journal
  ADD COLUMN IF NOT EXISTS asked TEXT NOT NULL DEFAULT '';

ALTER TABLE life_plan_day_journal
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE life_plan_day_journal
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE life_plan_day_journal
  DROP COLUMN IF EXISTS node_id;

DO $$ BEGIN
  ALTER TABLE life_plan_day_journal
    ADD CONSTRAINT life_plan_day_journal_local_shape CHECK (
      char_length(local_id) BETWEEN 1 AND 80
      AND local_id ~ '^[A-Za-z0-9_:.-]+$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE life_plan_day_journal
    ADD CONSTRAINT life_plan_day_journal_asked_len CHECK (char_length(asked) <= 500);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE life_plan_day_journal ADD PRIMARY KEY (id);
EXCEPTION WHEN invalid_table_definition THEN NULL; END $$;

-- One answer per question per day. The upsert target.
DO $$ BEGIN
  ALTER TABLE life_plan_day_journal
    ADD CONSTRAINT life_plan_day_journal_key UNIQUE (day_id, local_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reading one question's whole history is the archive's second query, after
-- "everything written on this day".
CREATE INDEX IF NOT EXISTS idx_life_plan_day_journal_question
  ON life_plan_day_journal(user_id, local_id);

-- The table was never dropped, so its four policies and RLS are untouched.
-- The touch trigger is added because the original table had none: only
-- `life_plans` and `life_plan_days` carry it.
DO $$ BEGIN
  CREATE TRIGGER life_plan_day_journal_touch
    BEFORE UPDATE ON life_plan_day_journal
    FOR EACH ROW EXECUTE FUNCTION life_plan_touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  RAISE NOTICE 'day journal: keyed by the plan''s own id, keeps the question it answered.';
END $$;
