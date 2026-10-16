-- ============================================================================
-- A SCENARIO ATTEMPT IS SAVED, AND ONLY THE SERVER CAN SAVE ONE.
--
-- Found 2026-10-13, the first day the repo's tests ran against production's
-- real schema (tests/integration/repos/scenarioRepo.integration.test.ts).
--
-- 1. NO ATTEMPT WAS EVER SAVED.
--    The code wrote `scenario_data`, `user_response` and `evaluation`, which
--    `scenarios` never had, and left out `difficulty` and `archetype`, which
--    are NOT NULL. Every insert failed, `persistScenarioAttempt` logged it and
--    moved on, and the table holds 0 rows (checked 2026-10-16). The practice
--    stats and the scenario badges read 0 for everyone.
--
--    The code now writes what the stats need and the table already has:
--    `scenario_type`, `score`, and `archetype` when the scenario had one (the
--    chat does; the opener trainer has no girl to name). No evaluator knows the
--    difficulty at the point it saves. So both may be empty.
--
-- 2. A PERSON COULD WRITE THEIR OWN SCORE.
--    "Users can insert their own scenarios" let any signed-in account insert
--    rows with any score straight through the API, and the scores feed the
--    scenario badges. Earned data is the server's to write
--    (.claude/rules/database.md), so the policy goes and the server saves the
--    attempt with its own key. Reading your own attempts is unchanged.
--
-- 3. A SCORE IS 1-10, or none.
--
-- NOTHING IS MIGRATED: the table is empty.
-- ============================================================================

ALTER TABLE scenarios ALTER COLUMN difficulty DROP NOT NULL;
ALTER TABLE scenarios ALTER COLUMN archetype DROP NOT NULL;

DROP POLICY IF EXISTS "Users can insert their own scenarios" ON scenarios;

DO $$ BEGIN
  ALTER TABLE scenarios
    ADD CONSTRAINT scenarios_score_range CHECK (score IS NULL OR score BETWEEN 1 AND 10);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
