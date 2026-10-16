-- ============================================================================
-- A GOAL UNDER "SCENARIOS" CAN BE SAVED, AND EACH GOAL COLUMN HAS ONE CHECK.
--
-- Found 2026-10-13 by tests/integration/db/enumConstraintSync.integration.test.ts
-- and tests/integration/db/goalRepo.integration.test.ts, run on production's
-- real schema.
--
-- 1. TWO CHECKS PER COLUMN, AND THEY DISAGREE.
--    Four `user_goals` columns carry an older `chk_*` beside the
--    `user_goals_*_check` that scripts/generate-goal-constraints.ts writes from
--    src/db/goalEnums.ts. A write must pass both. On `display_category` the
--    generator's copy lacks 'scenarios', so every goal filed under it (the three
--    scenario goals in src/goals/data/goalGraph.ts) is refused. The duplicates
--    are a trap for the next value too: the generator only knows its own copy
--    (20260920100000_goal_abstinence.sql left this cleanup for later).
--
--    The generator's copy is kept, rebuilt from the code's list for
--    display_category; the `chk_*` copies go. After this each column has one
--    CHECK, and it says what GOAL_DISPLAY_CATEGORIES, GOAL_TYPES, GOAL_NATURES
--    and GOAL_TRACKING_TYPES say. Every existing row already passes it: the old
--    pair allowed a subset of the new single CHECK.
--    `chk_period` stays; it is the only CHECK on `period`.
--
-- 2. THE DEFAULT GOAL TYPE IS ONE THE TABLE REFUSES.
--    `goal_type` defaults to 'process', which both of its CHECKs refuse, so any
--    write that leaves the type out fails. The app always names one, falling
--    back to 'recurring' (goalRepo), so the default becomes that.
-- ============================================================================

ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS user_goals_display_category_check;
ALTER TABLE user_goals ADD CONSTRAINT user_goals_display_category_check CHECK (
  display_category IS NULL OR display_category IN (
    'field_work', 'results', 'dirty_dog', 'texting', 'dates', 'relationship', 'scenarios',
    'mindfulness', 'resilience', 'learning', 'reflection', 'discipline',
    'strength', 'training', 'nutrition', 'body_comp', 'flexibility', 'endurance',
    'income', 'saving', 'investing', 'career_growth', 'entrepreneurship',
    'porn_freedom', 'digital_discipline', 'substance_control', 'self_control'
  )
);

ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS chk_display_category;
ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS chk_goal_type;
ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS chk_goal_nature;
ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS chk_tracking_type;

ALTER TABLE user_goals ALTER COLUMN goal_type SET DEFAULT 'recurring';
