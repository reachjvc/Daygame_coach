-- ============================================================================
-- A GOAL CAN BE A THING YOU DO NOT DO.
--
-- The owner's concept list, item 14: "Nogle mål er gør aldrig Y" — some goals
-- are never do Y. His own plan has one: "No weed".
--
-- The product had nowhere to put it, so it guessed. `readsAsAbstinence` read
-- the TITLE, decided the line named a vice, and rewrote the goal into a weekly
-- practice. "No weed" became a weekly counter with a target of THREE, which
-- the app then treated as an achievement: be weed-free on Monday, Tuesday and
-- Wednesday and the goal read 100% complete with a streak of one, while he
-- smoked the other four days. A prohibition was recorded as a quota.
--
-- WHY A COLUMN AND NOT A NEW `goal_type`. Two reasons.
--
-- First, `goal_type` carries TWO duplicate CHECK constraints on this table
-- (`user_goals_goal_type_check` and `chk_goal_type`), and
-- `scripts/generate-goal-constraints.ts` only regenerates the first. Adding a
-- value there would pass the generator and still be rejected by the constraint
-- it does not know about — the same trap that already has two disagreeing
-- CHECKs on `display_category`. That cleanup is its own piece of work and does
-- not belong inside a behaviour change.
--
-- Second, and better: "never" is not a fourth KIND of goal. It is a daily rule
-- like "read every night", with the polarity flipped. Both are yes-or-no every
-- day. What differs is how they are rewarded, and that is one fact.
--
-- WHAT IT CHANGES. `src/goals/data/goalAchievementRules.ts` has had an
-- `isAbstinence` switch since the badge engine was written — it suppresses the
-- streak badges, because a streak is the wrong instrument for quitting
-- something. `factsFor` takes it as an argument, and NOTHING HAS EVER SET IT,
-- because no row could say so. This column is what sets it.
--
-- Suppressing streaks is a research finding, not a style choice: the vice
-- module at /life-mastery/quit-vice deliberately has no streak counter, and a
-- day-one relapse wiping a 200-day number is the thing that makes people stop
-- opening an app. Days clean still accumulate, and the total badges still fire
-- on them, so the reward half does not disappear — it stops being destructible.
--
-- Safe by construction: additive, NOT NULL with a default, no policy change.
-- Every existing row keeps its meaning, because every existing row is false.
-- ============================================================================

ALTER TABLE user_goals
  ADD COLUMN IF NOT EXISTS is_abstinence BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN user_goals.is_abstinence IS
  'True when the goal is something NOT to do ("No weed"). Daily and yes/no like any standing rule, but rewarded by days accumulated rather than by a streak, because a streak punishes one bad day by deleting the record of every good one. Read by factsFor in src/goals/goalAchievementsService.ts.';
