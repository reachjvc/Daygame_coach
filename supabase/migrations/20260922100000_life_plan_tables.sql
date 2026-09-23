-- ============================================================================
-- THE LIFE MASTERY PLAN GETS AN ACCOUNT TO LIVE ON.
--
-- Today the whole plan — north star, twelve areas, every goal, every routine,
-- every daily rating and journal entry — is one lump of JSON in one browser's
-- localStorage under `north-star-v1`. Clear your browsing data and it is gone.
-- Open it on your phone and it was never there. Three things reach the
-- database today and the other forty do not.
--
-- These 25 tables are that plan, as tables. Phase 1 of
-- docs/plans/life-mastery-deployment.md.
--
-- NOTHING IS MIGRATED BY THIS FILE. It creates empty tables and stops. The
-- browser copy is imported once, by the app, only when the account has no plan
-- row — because the import has to read a key that only exists in a browser.
--
-- ----------------------------------------------------------------------------
-- THE THREE RULES THE SHAPE FOLLOWS, so none of it is arbitrary:
--
-- 1. One per parent and nothing points at it: a COLUMN on the parent.
--    Many, or pointable, or worth finding on its own: its own TABLE with an id.
--    Many but only ever edited as a whole and never pointed at: a LIST column.
--    That is why `reasons_list` and `ramp_steps` stay on the goal row while
--    values get a table — "every goal that asks for Courage" is a question
--    worth asking; "the fourth reason you wrote" is not.
--
-- 2. Every row carries its owner, and a child links to its parent on
--    (parent, owner) TOGETHER. A child cannot be attached to someone else's
--    plan even if the app asks for it, because the foreign key has nothing to
--    match. That is why parents carry UNIQUE (id, user_id), which looks
--    redundant beside a primary key and is not.
--
-- 3. The four day tables are NEVER written by the whole-plan save. A day is
--    appended to; a plan is replaced. Saving the plan must not be able to wipe
--    a year of journal, so they are separated here rather than by remembering.
-- ============================================================================


-- ============================================================================
-- ONE PLAN PER PERSON.
--
-- `seq` is the id counter the flow mints local ids from, and it lives here
-- because it must survive the browser that created it: two devices minting
-- from a counter that resets to 0 would produce two different things both
-- called `g3`.
--
-- `revision` is the lock. Every save says which revision it read, and a save
-- built on a stale one is refused rather than merged — the page then says "this
-- plan changed on another device" instead of silently dropping what the other
-- device wrote.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The plan's own schema version, as the flow writes it. Not the revision.
  version INTEGER NOT NULL DEFAULT 1 CHECK (version BETWEEN 1 AND 1000),
  -- Bumped by the app on every whole-plan save. See `save_life_plan`.
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  -- The id counter. Monotonic: it may only ever rise.
  seq INTEGER NOT NULL DEFAULT 0 CHECK (seq >= 0),
  -- The area this season is about. A node id, not a label.
  season_focus_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One plan per account, for now. Lifting this is a migration, not a redesign.
  CONSTRAINT life_plans_one_per_user UNIQUE (user_id),
  -- Rule 2: what every child's composite foreign key matches against.
  CONSTRAINT life_plans_owner_key UNIQUE (id, user_id)
);


-- ============================================================================
-- EVERY PART'S ID AND KIND.
--
-- Three pointers in the flow are genuinely polymorphic — each can name a goal,
-- a routine step, an experience or a sub-step, and the TypeScript says so:
-- `NsDailyField.targetId`, `NsSubStep.targetId`, and the ids inside
-- `plan.logged`. Those three reference this table, and only those three.
--
-- EVERYTHING ELSE REFERENCES ITS SPECIFIC TABLE, so the database still refuses
-- the wrong kind: a goal's area must be an area, a step's served goals must be
-- goals. Routing every link through one generic table would throw that away,
-- which is the mistake the first draft of this design made.
--
-- `local_id` is the plan's own id — `g3`, `area_health`, `stretch` — stored
-- verbatim and never rewritten. It is how a browser copy maps onto rows, and
-- how the app keeps talking in its own ids without caring about UUIDs.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (
    'north_star','area','goal','checkpoint','obstacle','belief','habit',
    'routine','routine_step','split_day','experience','field','sub_step')),
  local_id TEXT NOT NULL CHECK (
    char_length(local_id) BETWEEN 1 AND 80
    AND local_id ~ '^[A-Za-z0-9_:.-]+$'),
  CONSTRAINT life_plan_nodes_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  -- Two parts of one plan cannot share an id. This is the constraint Phase 0
  -- existed to make satisfiable: `stretch` used to be both a morning step and a
  -- night step, and under database keys that save simply fails.
  CONSTRAINT life_plan_nodes_local_key UNIQUE (plan_id, local_id),
  -- What a detail table's composite key matches, so a row cannot lie about
  -- what kind of thing it is.
  CONSTRAINT life_plan_nodes_detail_key UNIQUE (id, user_id, kind),
  -- What the three polymorphic pointers match.
  CONSTRAINT life_plan_nodes_owner_key UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_life_plan_nodes_plan ON life_plan_nodes(plan_id, kind);


-- ============================================================================
-- THE NORTH STAR.
--
-- A node of its own rather than a column on `life_plans`, although there is
-- exactly one. That is a deliberate bet and not a defect report: every goal
-- carries a `servesOneThing` flag and a morning step can point at the star, and
-- both work today only because there is exactly one of each. It costs one small
-- table now and a migration later if a plan ever holds a five-year and a
-- twenty-year picture side by side.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_north_stars (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'north_star' CHECK (node_kind = 'north_star'),
  text TEXT NOT NULL DEFAULT '' CHECK (char_length(text) <= 20000),
  horizon_years SMALLINT NOT NULL DEFAULT 10 CHECK (horizon_years IN (5, 10, 20)),
  CONSTRAINT life_plan_north_stars_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_north_stars_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_north_stars_one_per_plan UNIQUE (plan_id)
);


-- ============================================================================
-- AREAS OF LIFE, and the review answers that hang off each one.
--
-- The review is one-per-area and nothing points at it, so by rule 1 it is
-- columns here rather than a table of its own.
--
-- `season_rank` is how an area is placed in this season's order; NULL means it
-- is not in the season. `position` is the area's place in the list itself.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_areas (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'area' CHECK (node_kind = 'area'),
  position INTEGER NOT NULL CHECK (position >= 0),
  label TEXT NOT NULL DEFAULT '' CHECK (char_length(label) <= 200),
  sublabel TEXT NOT NULL DEFAULT '' CHECK (char_length(sublabel) <= 400),
  color TEXT NOT NULL DEFAULT '' CHECK (char_length(color) <= 40),
  custom BOOLEAN NOT NULL DEFAULT FALSE,
  -- The review. All optional; a half-answered area is the ordinary case.
  review_ten TEXT NOT NULL DEFAULT '' CHECK (char_length(review_ten) <= 20000),
  review_purpose TEXT NOT NULL DEFAULT '' CHECK (char_length(review_purpose) <= 20000),
  review_snapshot TEXT NOT NULL DEFAULT '' CHECK (char_length(review_snapshot) <= 20000),
  review_blockers TEXT NOT NULL DEFAULT '' CHECK (char_length(review_blockers) <= 20000),
  review_identity TEXT NOT NULL DEFAULT '' CHECK (char_length(review_identity) <= 20000),
  -- 0-10, and NULL is a real state: not rated yet is not the same as zero.
  review_fortnight SMALLINT CHECK (review_fortnight IS NULL OR review_fortnight BETWEEN 0 AND 10),
  -- "Do my goals aim at this?" — yes, no, or not answered.
  review_goals_aim TEXT CHECK (review_goals_aim IS NULL OR review_goals_aim IN ('yes','no')),
  season_rank INTEGER CHECK (season_rank IS NULL OR season_rank >= 0),
  CONSTRAINT life_plan_areas_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_areas_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_areas_owner_key UNIQUE (id, user_id),
  -- DEFERRABLE because reordering a list swaps positions inside one
  -- transaction and would otherwise collide halfway through.
  CONSTRAINT life_plan_areas_position_key UNIQUE (plan_id, position) DEFERRABLE INITIALLY DEFERRED
);


-- ============================================================================
-- GOALS.
--
-- `user_goal_id` IS THE LINK TO THE COUNTED GOAL, and it is the only thing that
-- decides identity. The `ns:` tag written on `user_goals` is written and never
-- read back for identity — a tag whose run id lives in localStorage means
-- clearing your browser makes a second copy of every goal you push.
--
-- `ladder` and `ramp_steps` are JSONB by rule 1: many per goal, but only ever
-- edited as a whole and nothing points at one rung. `reasons_list` is a TEXT[]
-- for the same reason — the 100-reasons drill is a list, not a hundred rows.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_goals (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'goal' CHECK (node_kind = 'goal'),
  -- TWO ORDERS, BECAUSE THERE REALLY ARE TWO. `position` is the goals list's
  -- own order, which is what eight live screens render by reading `plan.goals`
  -- directly. `priority_rank` is the index in `priorityIds`, which `addGoal`
  -- maintains as a separate list. An earlier draft of this table stored only
  -- the rank, on the strength of a comment saying `orderedGoals` renders from
  -- the priority list — that function does not exist and has no callers, so
  -- collapsing the two would have silently reordered every goal screen on the
  -- first load after this shipped.
  position INTEGER NOT NULL CHECK (position >= 0),
  priority_rank INTEGER NOT NULL DEFAULT 0 CHECK (priority_rank >= 0),
  area_id UUID,
  title TEXT NOT NULL DEFAULT '' CHECK (char_length(title) <= 500),
  goal_type TEXT NOT NULL DEFAULT 'achievement'
    CHECK (goal_type IN ('milestone_ladder','habit_ramp','achievement')),
  why TEXT NOT NULL DEFAULT '' CHECK (char_length(why) <= 20000),
  pain_why TEXT NOT NULL DEFAULT '' CHECK (char_length(pain_why) <= 20000),
  sentence TEXT NOT NULL DEFAULT '' CHECK (char_length(sentence) <= 20000),
  feeling TEXT NOT NULL DEFAULT '' CHECK (char_length(feeling) <= 20000),
  reward TEXT NOT NULL DEFAULT '' CHECK (char_length(reward) <= 20000),
  stake TEXT NOT NULL DEFAULT '' CHECK (char_length(stake) <= 20000),
  unit TEXT NOT NULL DEFAULT '' CHECK (char_length(unit) <= 100),
  target_date DATE,
  belief_level SMALLINT CHECK (belief_level IS NULL OR belief_level BETWEEN 0 AND 10),
  desire_level SMALLINT CHECK (desire_level IS NULL OR desire_level BETWEEN 0 AND 10),
  days_per_week SMALLINT NOT NULL DEFAULT 0 CHECK (days_per_week BETWEEN 0 AND 7),
  per_week NUMERIC CHECK (per_week IS NULL OR per_week >= 0),
  -- "No weed" is a daily practice you do NOT do. The badge engine suppresses
  -- streaks for these; nothing set the flag before this column existed.
  is_abstinence BOOLEAN NOT NULL DEFAULT FALSE,
  serves_one_thing BOOLEAN NOT NULL DEFAULT FALSE,
  -- Where the number comes from when it is not typed in. Null = typed.
  metric TEXT CHECK (metric IS NULL OR metric IN ('daily_area')),
  ladder JSONB CHECK (ladder IS NULL OR jsonb_typeof(ladder) = 'object'),
  ramp_steps JSONB CHECK (ramp_steps IS NULL OR jsonb_typeof(ramp_steps) = 'array'),
  reasons_list TEXT[] NOT NULL DEFAULT '{}',
  -- Which guide questions were answered or skipped, so the flow does not ask
  -- again about one somebody deliberately passed over.
  asked TEXT[] NOT NULL DEFAULT '{}',
  -- NO `stages` COLUMN, deliberately. The counted goal has stages and they look
  -- like they belong here too, but `northStarTrackService` DERIVES them at push
  -- time from the checkpoint titles. Storing them would be a second copy of a
  -- fact this schema already holds, and the two would drift the first time
  -- somebody renamed a checkpoint. Rule 1: every fact is stored once.
  -- THE LINK. Null until the goal is pushed to the counted-goals table.
  user_goal_id UUID REFERENCES user_goals(id) ON DELETE SET NULL,
  CONSTRAINT life_plan_goals_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_goals_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_goals_area_fk FOREIGN KEY (area_id, user_id)
    REFERENCES life_plan_areas (id, user_id) ON DELETE SET NULL,
  CONSTRAINT life_plan_goals_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_goals_position_key UNIQUE (plan_id, position) DEFERRABLE INITIALLY DEFERRED,
  -- The priority list covers every goal exactly once; two goals cannot share a
  -- rank any more than they can share a place in the list.
  CONSTRAINT life_plan_goals_priority_key UNIQUE (plan_id, priority_rank) DEFERRABLE INITIALLY DEFERRED,
  -- One plan goal per counted goal. Two plan goals pointing at one row is how
  -- a rename on one silently overwrites the other.
  CONSTRAINT life_plan_goals_user_goal_key UNIQUE (user_goal_id)
);

CREATE INDEX IF NOT EXISTS idx_life_plan_goals_area ON life_plan_goals(area_id);


-- ============================================================================
-- WHAT HANGS OFF A GOAL.
--
-- Four tables rather than four JSONB columns, because each is pointable: a
-- checkpoint can carry a daily question, an obstacle is worth finding on its
-- own, a habit becomes a routine step. Rule 1.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_goal_checkpoints (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'checkpoint' CHECK (node_kind = 'checkpoint'),
  position INTEGER NOT NULL CHECK (position >= 0),
  title TEXT NOT NULL DEFAULT '' CHECK (char_length(title) <= 500),
  done BOOLEAN NOT NULL DEFAULT FALSE,
  celebration TEXT NOT NULL DEFAULT '' CHECK (char_length(celebration) <= 2000),
  CONSTRAINT life_plan_goal_checkpoints_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_goal_checkpoints_goal_fk FOREIGN KEY (goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_goal_checkpoints_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_goal_checkpoints_position_key UNIQUE (goal_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS life_plan_goal_obstacles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'obstacle' CHECK (node_kind = 'obstacle'),
  position INTEGER NOT NULL CHECK (position >= 0),
  what TEXT NOT NULL DEFAULT '' CHECK (char_length(what) <= 5000),
  counter TEXT NOT NULL DEFAULT '' CHECK (char_length(counter) <= 5000),
  CONSTRAINT life_plan_goal_obstacles_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_goal_obstacles_goal_fk FOREIGN KEY (goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_goal_obstacles_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_goal_obstacles_position_key UNIQUE (goal_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS life_plan_goal_beliefs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'belief' CHECK (node_kind = 'belief'),
  position INTEGER NOT NULL CHECK (position >= 0),
  old TEXT NOT NULL DEFAULT '' CHECK (char_length(old) <= 5000),
  -- Three states on purpose: not judged yet is not "not useful".
  useful BOOLEAN,
  evidence TEXT NOT NULL DEFAULT '' CHECK (char_length(evidence) <= 20000),
  replacement TEXT NOT NULL DEFAULT '' CHECK (char_length(replacement) <= 5000),
  CONSTRAINT life_plan_goal_beliefs_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_goal_beliefs_goal_fk FOREIGN KEY (goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_goal_beliefs_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_goal_beliefs_position_key UNIQUE (goal_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS life_plan_goal_habits (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'habit' CHECK (node_kind = 'habit'),
  position INTEGER NOT NULL CHECK (position >= 0),
  title TEXT NOT NULL DEFAULT '' CHECK (char_length(title) <= 500),
  days_per_week SMALLINT NOT NULL DEFAULT 0 CHECK (days_per_week BETWEEN 0 AND 7),
  -- A placeholder is a habit the flow suggested and nobody has confirmed.
  placeholder BOOLEAN NOT NULL DEFAULT FALSE,
  -- THE HABIT'S DESIGNED ROTATION: named days in cycle order, `{id, name}`
  -- each. NOT weekday numbers — "Upper", "Lower", "Rest" is the ordinary case
  -- and slot 1 of the week is the first day, so the ORDER is the meaning. A
  -- list column rather than a table by rule 1: many per habit, only ever edited
  -- as a whole, and nothing anywhere points at one of them.
  routine_days JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(routine_days) = 'array'),
  -- The template target this habit came from, if any. A code id, not a node.
  source_target_id TEXT CHECK (source_target_id IS NULL OR char_length(source_target_id) <= 120),
  CONSTRAINT life_plan_goal_habits_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_goal_habits_goal_fk FOREIGN KEY (goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_goal_habits_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_goal_habits_position_key UNIQUE (goal_id, position) DEFERRABLE INITIALLY DEFERRED
);


-- ============================================================================
-- WHICH GOAL FEEDS WHICH, AND WHICH AREAS EACH LIFTS.
--
-- Link tables, so the database refuses a link to something that is not a goal
-- or not an area. Both sides reference the specific table, not the node table.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_goal_feeds (
  user_id UUID NOT NULL,
  goal_id UUID NOT NULL,
  feeds_goal_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  PRIMARY KEY (goal_id, feeds_goal_id),
  CONSTRAINT life_plan_goal_feeds_goal_fk FOREIGN KEY (goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_goal_feeds_target_fk FOREIGN KEY (feeds_goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE CASCADE,
  -- A goal feeding itself is a cycle of length one and always a mistake.
  CONSTRAINT life_plan_goal_feeds_not_self CHECK (goal_id <> feeds_goal_id)
);

CREATE TABLE IF NOT EXISTS life_plan_goal_serves (
  user_id UUID NOT NULL,
  goal_id UUID NOT NULL,
  area_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  PRIMARY KEY (goal_id, area_id),
  CONSTRAINT life_plan_goal_serves_goal_fk FOREIGN KEY (goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_goal_serves_area_fk FOREIGN KEY (area_id, user_id)
    REFERENCES life_plan_areas (id, user_id) ON DELETE CASCADE
);


-- ============================================================================
-- ROUTINES.
--
-- `enrollment_id` IS A REFERENCE, NEVER A COPY. Starting a program used to copy
-- its day names into the plan and nothing else, so a plan could say Upper/Lower
-- forever while the account was enrolled in something else, and no fact
-- anywhere could settle which was right. The enrollment is the truth about what
-- you train; the program's name, catalogue id and start date are read from it.
--
-- ON DELETE SET NULL, not cascade: ending a program must not delete the
-- training week you wrote.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_routines (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'routine' CHECK (node_kind = 'routine'),
  position INTEGER NOT NULL CHECK (position >= 0),
  label TEXT NOT NULL DEFAULT '' CHECK (char_length(label) <= 200),
  blueprint_id TEXT NOT NULL DEFAULT '' CHECK (char_length(blueprint_id) <= 120),
  kind TEXT NOT NULL DEFAULT 'sequence' CHECK (kind IN ('sequence','weekly')),
  -- Null when the routine serves every area rather than one.
  area_id UUID,
  days_per_week SMALLINT NOT NULL DEFAULT 0 CHECK (days_per_week BETWEEN 0 AND 7),
  enrollment_id UUID REFERENCES program_enrollments(id) ON DELETE SET NULL,
  CONSTRAINT life_plan_routines_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_routines_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_routines_area_fk FOREIGN KEY (area_id, user_id)
    REFERENCES life_plan_areas (id, user_id) ON DELETE SET NULL,
  CONSTRAINT life_plan_routines_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_routines_position_key UNIQUE (plan_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS life_plan_routine_serves (
  user_id UUID NOT NULL,
  routine_id UUID NOT NULL,
  area_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  PRIMARY KEY (routine_id, area_id),
  CONSTRAINT life_plan_routine_serves_routine_fk FOREIGN KEY (routine_id, user_id)
    REFERENCES life_plan_routines (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_routine_serves_area_fk FOREIGN KEY (area_id, user_id)
    REFERENCES life_plan_areas (id, user_id) ON DELETE CASCADE
);

-- ============================================================================
-- THE LINES IN A ROUTINE.
--
-- `library_step_id` is the library entry this step came from, and the step's
-- own id is a counter value. They were one field until Phase 0, which is why
-- `stretch` could be both a morning step and a night step — a save this schema
-- would simply refuse.
--
-- `goes_to` and `asks` each carry a COMPANION BOOLEAN, because absent is not
-- null. A step saved before those existed has no key at all and the loader
-- infers one from its own words; NULL is a destination somebody deliberately
-- cleared, and inference must never argue with that. One nullable column
-- cannot hold three states.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_routine_steps (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  routine_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'routine_step' CHECK (node_kind = 'routine_step'),
  position INTEGER NOT NULL CHECK (position >= 0),
  library_step_id TEXT CHECK (library_step_id IS NULL OR char_length(library_step_id) <= 120),
  title TEXT NOT NULL DEFAULT '' CHECK (char_length(title) <= 500),
  minutes SMALLINT NOT NULL DEFAULT 0 CHECK (minutes BETWEEN 0 AND 1440),
  days_per_week SMALLINT NOT NULL DEFAULT 0 CHECK (days_per_week BETWEEN 0 AND 7),
  dimension TEXT CHECK (dimension IS NULL OR dimension IN ('mind','body','spirit')),
  -- Which days it runs on. 0=Monday.
  days SMALLINT[] NOT NULL DEFAULT '{}',
  start_min SMALLINT CHECK (start_min IS NULL OR start_min BETWEEN 0 AND 1439),
  goes_to TEXT CHECK (goes_to IS NULL OR char_length(goes_to) <= 200),
  goes_to_set BOOLEAN NOT NULL DEFAULT FALSE,
  asks TEXT CHECK (asks IS NULL OR char_length(asks) <= 2000),
  asks_set BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT life_plan_routine_steps_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_routine_steps_routine_fk FOREIGN KEY (routine_id, user_id)
    REFERENCES life_plan_routines (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_routine_steps_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_routine_steps_position_key UNIQUE (routine_id, position) DEFERRABLE INITIALLY DEFERRED,
  -- A cleared destination and an unset one must be distinguishable, so a value
  -- with the flag down is a contradiction.
  CONSTRAINT life_plan_routine_steps_goes_to_shape CHECK (goes_to IS NULL OR goes_to_set),
  CONSTRAINT life_plan_routine_steps_asks_shape CHECK (asks IS NULL OR asks_set)
);

CREATE TABLE IF NOT EXISTS life_plan_step_serves (
  user_id UUID NOT NULL,
  step_id UUID NOT NULL,
  goal_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  PRIMARY KEY (step_id, goal_id),
  CONSTRAINT life_plan_step_serves_step_fk FOREIGN KEY (step_id, user_id)
    REFERENCES life_plan_routine_steps (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_step_serves_goal_fk FOREIGN KEY (goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE CASCADE
);

-- ============================================================================
-- NAMED TRAINING DAYS — A WEEK SOMEBODY WROTE BY HAND.
--
-- A routine with `enrollment_id` set has NO rows here: its days are derived
-- from the enrollment's own schedule, so that a swapped lift is named
-- correctly. Two answers to one question is the thing this whole design
-- refuses. A CHECK cannot span two tables, so the mapper enforces it and a unit
-- test asserts it.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_routine_split_days (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  routine_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'split_day' CHECK (node_kind = 'split_day'),
  position INTEGER NOT NULL CHECK (position >= 0),
  name TEXT NOT NULL DEFAULT '' CHECK (char_length(name) <= 200),
  CONSTRAINT life_plan_routine_split_days_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_routine_split_days_routine_fk FOREIGN KEY (routine_id, user_id)
    REFERENCES life_plan_routines (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_routine_split_days_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_routine_split_days_position_key UNIQUE (routine_id, position) DEFERRABLE INITIALLY DEFERRED
);


-- ============================================================================
-- EXPERIENCES — things to have done, outside the goal machinery on purpose.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_experiences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'experience' CHECK (node_kind = 'experience'),
  position INTEGER NOT NULL CHECK (position >= 0),
  title TEXT NOT NULL DEFAULT '' CHECK (char_length(title) <= 500),
  area_id UUID,
  goal_id UUID,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  done_on DATE,
  CONSTRAINT life_plan_experiences_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_experiences_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_experiences_area_fk FOREIGN KEY (area_id, user_id)
    REFERENCES life_plan_areas (id, user_id) ON DELETE SET NULL,
  CONSTRAINT life_plan_experiences_goal_fk FOREIGN KEY (goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE SET NULL,
  CONSTRAINT life_plan_experiences_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_experiences_position_key UNIQUE (plan_id, position) DEFERRABLE INITIALLY DEFERRED,
  -- A date on something not done is one of the two fields having been written
  -- without the other.
  CONSTRAINT life_plan_experiences_done_shape CHECK (done_on IS NULL OR done)
);


-- ============================================================================
-- THE QUESTIONS YOU ASK YOURSELF DAILY.
--
-- `target_id` is one of the three genuinely polymorphic pointers: it can name a
-- goal, a routine step, an experience or a sub-step. ON DELETE SET NULL, which
-- matches what the flow does today — a field whose target is gone re-homes to
-- the day rather than vanishing.
--
-- `read_source_id` is the one id here that is NOT a node: it names an entry in
-- a code registry, so it gets no foreign key and could not have one.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_fields (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'field' CHECK (node_kind = 'field'),
  position INTEGER NOT NULL CHECK (position >= 0),
  label TEXT NOT NULL DEFAULT '' CHECK (char_length(label) <= 500),
  kind TEXT NOT NULL DEFAULT 'write' CHECK (kind IN ('write','read','go')),
  target_id UUID,
  read_source_id TEXT CHECK (read_source_id IS NULL OR char_length(read_source_id) <= 200),
  CONSTRAINT life_plan_fields_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_fields_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_fields_target_fk FOREIGN KEY (target_id, user_id)
    REFERENCES life_plan_nodes (id, user_id) ON DELETE SET NULL,
  CONSTRAINT life_plan_fields_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_fields_position_key UNIQUE (plan_id, position) DEFERRABLE INITIALLY DEFERRED
);


-- ============================================================================
-- SUB-STEPS — the to-do list under a bigger weekly thing.
--
-- The second polymorphic pointer. ON DELETE CASCADE, matching today: a sub-step
-- whose parent is gone has nothing to be a sub-step OF.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_sub_steps (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  node_kind TEXT NOT NULL DEFAULT 'sub_step' CHECK (node_kind = 'sub_step'),
  position INTEGER NOT NULL CHECK (position >= 0),
  target_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '' CHECK (char_length(title) <= 500),
  CONSTRAINT life_plan_sub_steps_node_fk FOREIGN KEY (id, user_id, node_kind)
    REFERENCES life_plan_nodes (id, user_id, kind) ON DELETE CASCADE,
  CONSTRAINT life_plan_sub_steps_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_sub_steps_target_fk FOREIGN KEY (target_id, user_id)
    REFERENCES life_plan_nodes (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_sub_steps_owner_key UNIQUE (id, user_id),
  CONSTRAINT life_plan_sub_steps_position_key UNIQUE (plan_id, position) DEFERRABLE INITIALLY DEFERRED
);


-- ============================================================================
-- VALUES, IN ONE TABLE WITH A SCOPE.
--
-- Lived by, chosen, per area, per goal. One table because the question worth
-- asking is "every goal that asks for Courage", and that question is
-- unanswerable if the four live in four places.
--
-- A value has no id of its own — it is a word — so this is not a node table.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('past','chosen','area','goal')),
  value TEXT NOT NULL CHECK (char_length(btrim(value)) BETWEEN 1 AND 200),
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  area_id UUID,
  goal_id UUID,
  CONSTRAINT life_plan_values_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_values_area_fk FOREIGN KEY (area_id, user_id)
    REFERENCES life_plan_areas (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_values_goal_fk FOREIGN KEY (goal_id, user_id)
    REFERENCES life_plan_goals (id, user_id) ON DELETE CASCADE,
  -- The scope and the parent must agree, or a row says "this is Health's value"
  -- while naming no area.
  CONSTRAINT life_plan_values_scope_shape CHECK (
    (scope = 'area' AND area_id IS NOT NULL AND goal_id IS NULL)
    OR (scope = 'goal' AND goal_id IS NOT NULL AND area_id IS NULL)
    OR (scope IN ('past','chosen') AND area_id IS NULL AND goal_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_life_plan_values_lookup ON life_plan_values(plan_id, value);


-- ============================================================================
-- WRITTEN ANSWERS TO THE FLOW'S QUESTIONS.
--
-- `rungs` and `answers` are both Record<string,string> in the plan and both
-- land here, told apart by `kind`. The key is a prompt id from a code registry,
-- not a node, so it gets no foreign key.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('rung','answer')),
  prompt_id TEXT NOT NULL CHECK (char_length(prompt_id) BETWEEN 1 AND 200),
  body TEXT NOT NULL DEFAULT '' CHECK (char_length(body) <= 100000),
  CONSTRAINT life_plan_answers_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_answers_key UNIQUE (plan_id, kind, prompt_id)
);


-- ============================================================================
-- THE FOUR DAY TABLES.
--
-- NEVER WRITTEN BY THE WHOLE-PLAN SAVE. This is the single most dangerous thing
-- the first draft of this plan got wrong: a plan is replaced on every save, and
-- if a day lived inside it then one keystroke on the Systems step could wipe a
-- year of journal. They are appended to, by their own route, and the plan save
-- cannot reach them.
--
-- The day is the USER'S calendar day, from their timezone, never the server's.
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  on_date DATE NOT NULL,
  note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 100000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT life_plan_days_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_days_key UNIQUE (plan_id, on_date),
  CONSTRAINT life_plan_days_owner_key UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_life_plan_days_recent ON life_plan_days(plan_id, on_date DESC);

CREATE TABLE IF NOT EXISTS life_plan_day_ratings (
  user_id UUID NOT NULL,
  day_id UUID NOT NULL,
  area_id UUID NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 0 AND 10),
  PRIMARY KEY (day_id, area_id),
  CONSTRAINT life_plan_day_ratings_day_fk FOREIGN KEY (day_id, user_id)
    REFERENCES life_plan_days (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_day_ratings_area_fk FOREIGN KEY (area_id, user_id)
    REFERENCES life_plan_areas (id, user_id) ON DELETE CASCADE
);

-- The third polymorphic pointer: what you actually did that day can be a goal,
-- a routine step, an experience or a sub-step.
CREATE TABLE IF NOT EXISTS life_plan_day_ticks (
  user_id UUID NOT NULL,
  day_id UUID NOT NULL,
  node_id UUID NOT NULL,
  PRIMARY KEY (day_id, node_id),
  CONSTRAINT life_plan_day_ticks_day_fk FOREIGN KEY (day_id, user_id)
    REFERENCES life_plan_days (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_day_ticks_node_fk FOREIGN KEY (node_id, user_id)
    REFERENCES life_plan_nodes (id, user_id) ON DELETE CASCADE
);

-- What you wrote that day, keyed by the field or routine step that asked. The
-- key is a node id, but a question can also be a step's `asks`, so both land
-- here under one shape — one journal, two ways for a question to get into it.
CREATE TABLE IF NOT EXISTS life_plan_day_journal (
  user_id UUID NOT NULL,
  day_id UUID NOT NULL,
  node_id UUID NOT NULL,
  body TEXT NOT NULL DEFAULT '' CHECK (char_length(body) <= 100000),
  PRIMARY KEY (day_id, node_id),
  CONSTRAINT life_plan_day_journal_day_fk FOREIGN KEY (day_id, user_id)
    REFERENCES life_plan_days (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_day_journal_node_fk FOREIGN KEY (node_id, user_id)
    REFERENCES life_plan_nodes (id, user_id) ON DELETE CASCADE
);


-- ============================================================================
-- THE SEASON FOCUS POINTS AT AN AREA.
--
-- Added after the areas table exists, because it points into it.
-- ============================================================================
DO $$ BEGIN
  ALTER TABLE life_plans
    ADD CONSTRAINT life_plans_season_focus_fk
    FOREIGN KEY (season_focus_id, user_id)
    REFERENCES life_plan_areas (id, user_id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- WHO MAY TOUCH ANY OF IT: ONLY THE PERSON WHOSE PLAN IT IS.
--
-- Own-row CRUD on all 25, enforced by the database rather than by the app, so a
-- bug in a route cannot get past it. Every one of these tables carries
-- `user_id` precisely so this policy is the same four lines everywhere.
--
-- Written as a loop rather than 100 hand-copied policies. One rule, one place:
-- a hand-copied set is where the twenty-third table quietly gets three policies
-- instead of four, and nothing would fail.
-- ============================================================================
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'life_plans',
    'life_plan_nodes',
    'life_plan_north_stars',
    'life_plan_areas',
    'life_plan_goals',
    'life_plan_goal_checkpoints',
    'life_plan_goal_obstacles',
    'life_plan_goal_beliefs',
    'life_plan_goal_habits',
    'life_plan_goal_feeds',
    'life_plan_goal_serves',
    'life_plan_routines',
    'life_plan_routine_serves',
    'life_plan_routine_steps',
    'life_plan_routine_split_days',
    'life_plan_step_serves',
    'life_plan_experiences',
    'life_plan_fields',
    'life_plan_sub_steps',
    'life_plan_values',
    'life_plan_answers',
    'life_plan_days',
    'life_plan_day_ratings',
    'life_plan_day_ticks',
    'life_plan_day_journal'
  ];
BEGIN
  IF array_length(tables, 1) <> 25 THEN
    RAISE EXCEPTION 'Expected 25 life-plan tables in the policy list, found %',
      array_length(tables, 1);
  END IF;

  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE EXCEPTION 'Table % is in the policy list but was not created', t;
    END IF;

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    -- WITH CHECK is spelled out on UPDATE rather than left implicit. Postgres
    -- falls back to USING when it is absent, so this changes nothing today; it
    -- is written down so a later edit to USING cannot silently widen what a row
    -- is allowed to BECOME.
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR SELECT USING (auth.uid() = user_id)',
        t || '_select_own', t);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (auth.uid() = user_id)',
        t || '_insert_own', t);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
        t || '_update_own', t);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR DELETE USING (auth.uid() = user_id)',
        t || '_delete_own', t);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END LOOP;
END $$;


-- ============================================================================
-- `updated_at` IS KEPT BY THE DATABASE.
--
-- The revision lock reads it and the day list is ordered by it, so a client
-- that forgets to set it would silently reorder somebody's record.
-- ============================================================================
CREATE OR REPLACE FUNCTION life_plan_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_life_plans_updated_at ON life_plans;
CREATE TRIGGER trg_life_plans_updated_at
  BEFORE UPDATE ON life_plans
  FOR EACH ROW EXECUTE FUNCTION life_plan_touch_updated_at();

DROP TRIGGER IF EXISTS trg_life_plan_days_updated_at ON life_plan_days;
CREATE TRIGGER trg_life_plan_days_updated_at
  BEFORE UPDATE ON life_plan_days
  FOR EACH ROW EXECUTE FUNCTION life_plan_touch_updated_at();


-- ============================================================================
-- THE COUNT, ASSERTED RATHER THAN HOPED FOR.
--
-- A migration that quietly creates 24 tables and 96 policies still "succeeds".
-- ============================================================================
DO $$
DECLARE
  made INTEGER;
  guarded INTEGER;
  policies INTEGER;
BEGIN
  SELECT count(*) INTO made FROM pg_tables
   WHERE schemaname = 'public' AND tablename LIKE 'life_plan%';
  SELECT count(*) INTO guarded FROM pg_tables
   WHERE schemaname = 'public' AND tablename LIKE 'life_plan%' AND rowsecurity;
  SELECT count(*) INTO policies FROM pg_policies
   WHERE schemaname = 'public' AND tablename LIKE 'life_plan%';

  IF made <> 25 THEN
    RAISE EXCEPTION 'Expected 25 life-plan tables, found %', made;
  END IF;
  IF guarded <> 25 THEN
    RAISE EXCEPTION 'Only % of 25 life-plan tables have row security on', guarded;
  END IF;
  IF policies <> 100 THEN
    RAISE EXCEPTION 'Expected 100 life-plan policies (4 x 25), found %', policies;
  END IF;

  RAISE NOTICE 'Life plan: % tables, all with row security, % policies.', made, policies;
END $$;
