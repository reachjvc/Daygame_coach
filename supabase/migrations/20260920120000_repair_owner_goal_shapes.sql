-- ============================================================================
-- THE OWNER'S FIFTY GOALS GET THE SHAPES THE PRODUCT NOW KNOWS HOW TO MAKE.
--
-- Everything committed before this changed what the PUSH produces. The rows
-- already on his account kept the old shapes, so "No weed" still said three a
-- week, "Body Weight" was still a tick box, and six goals with four named
-- stages each still had none of them.
--
-- FIFTEEN of the fifty change. The other thirty-five were already right.
--
--   5 ramped practices   their weekly target becomes the ramp's FIRST step
--                        instead of a day count: Approaches 7 -> 5, Consistent
--                        Bedtime and Sleep Quality 7 -> 4, Protein Target and
--                        Calorie Tracking 7 -> 3.
--   3 downward climbs    Body Weight, Body Fat %, Waist Measurement stop being
--                        yes/no boxes and become counters carrying their real
--                        numbers, starting at the weight he is rather than at
--                        zero.
--   6 staged goals       Body Milestones, Opening Skill, Abundance Stages,
--                        Approach Anxiety, Founder Skills, Business Journey get
--                        their twenty-four named steps.
--   1 prohibition        No weed becomes daily and yes-or-no.
--
-- WHAT IS DELIBERATELY NOT TOUCHED.
--
--   current_value is only ever GIVEN a starting measurement, never reduced. It
--   is set on exactly the three downward climbs, which hold 0 — the column's
--   default, not a weight — and only because they hold 0. Eight rows carry
--   progress he logged and none of them is in this file.
--
--   current_streak and best_streak: not written. All fifty are zero today, so
--   there is nothing to lose, and a repair that could reset a streak is a
--   repair nobody should run.
--
--   description: not written. Three of these rows carry "From 90 kg down to
--   80 kg." in prose, put there when the columns could not hold it. It is
--   redundant now and it is still his text, so it stays. New pushes do not add
--   it.
--
--   The other thirty-five rows are not in this file at all. An earlier version
--   of this repair touched thirty-two rows, because it compared milestone_config
--   as SERIALISED JSON and seventeen of them differed only in the order of the
--   keys. Comparing the values instead took it to fifteen.
--
-- NO GOAL BECOMES COMPLETE BECAUSE OF THIS. Checked before writing it: for
-- every row, completion under the new shape equals completion under the old.
--
-- Each statement names one row by its uuid, with the before and after above it.
-- ============================================================================

-- Consistent Bedtime
--   target_value 7 -> 4
UPDATE user_goals SET target_value = 4
  WHERE id = '7497a146-0083-430c-8856-1f32b8142462' AND template_id LIKE 'ns:%';

-- No weed
--   tracking_type "counter" -> "boolean", period "weekly" -> "daily", goal_type "habit_ramp" -> "recurring", target_value 3 -> 1, is_abstinence false -> true
UPDATE user_goals SET tracking_type = 'boolean', period = 'daily', goal_type = 'recurring', target_value = 1, is_abstinence = TRUE
  WHERE id = '7a94d0b6-5be4-4232-bef4-56c6eb6c0763' AND template_id LIKE 'ns:%';

-- Protein Target
--   target_value 7 -> 3
UPDATE user_goals SET target_value = 3
  WHERE id = '90eca670-31f1-4fbc-a8f7-0ac0570cbea7' AND template_id LIKE 'ns:%';

-- Calorie Tracking
--   target_value 7 -> 3
UPDATE user_goals SET target_value = 3
  WHERE id = 'ab0c12bf-f756-433d-9510-c6cd5a1e2e68' AND template_id LIKE 'ns:%';

-- Body Weight
--   tracking_type "boolean" -> "counter", target_value 1 -> 80, milestone_config null -> {"start": 90, "target": 80, "steps, current_value 0 -> 90
UPDATE user_goals SET tracking_type = 'counter', target_value = 80, milestone_config = '{"start": 90, "target": 80, "steps": 6, "curveTension": 0, "controlPoints": [], "pins": []}'::jsonb, current_value = 90
  WHERE id = 'bfd78375-cc40-4fde-a852-a7af37290a9d' AND template_id LIKE 'ns:%';

-- Body Fat %
--   tracking_type "boolean" -> "counter", target_value 1 -> 14, milestone_config null -> {"start": 19, "target": 14, "steps, current_value 0 -> 19
UPDATE user_goals SET tracking_type = 'counter', target_value = 14, milestone_config = '{"start": 19, "target": 14, "steps": 7, "curveTension": 0, "controlPoints": [], "pins": []}'::jsonb, current_value = 19
  WHERE id = 'd2c667d4-9106-498b-bbc1-a915d78bc564' AND template_id LIKE 'ns:%';

-- Body Milestones
--   tracking_type "boolean" -> "counter", target_value 1 -> 4, milestone_config null -> {"start": 0, "target": 4, "steps":, stages null -> ["first pull-up", "visible abs", "
UPDATE user_goals SET tracking_type = 'counter', target_value = 4, milestone_config = '{"start": 0, "target": 4, "steps": 4, "curveTension": 0, "controlPoints": [], "pins": []}'::jsonb, stages = '{"first pull-up","visible abs","run a 5k","photoshoot ready"}'::text[]
  WHERE id = '34830c8a-4da1-4256-8be4-8f82e06002ff' AND template_id LIKE 'ns:%';

-- Waist Measurement
--   tracking_type "boolean" -> "counter", target_value 1 -> 82, milestone_config null -> {"start": 90, "target": 82, "steps, current_value 0 -> 90
UPDATE user_goals SET tracking_type = 'counter', target_value = 82, milestone_config = '{"start": 90, "target": 82, "steps": 6, "curveTension": 0, "controlPoints": [], "pins": []}'::jsonb, current_value = 90
  WHERE id = '84db0775-1b46-4efa-b72c-a4ca9f11aae9' AND template_id LIKE 'ns:%';

-- Sleep Quality
--   target_value 7 -> 4
UPDATE user_goals SET target_value = 4
  WHERE id = '9cda1bec-f0e5-4d18-8eba-2b47b1fec21e' AND template_id LIKE 'ns:%';

-- Approaches
--   target_value 7 -> 5
UPDATE user_goals SET target_value = 5
  WHERE id = '556909aa-3fe9-499f-8a43-c47309417ed7' AND template_id LIKE 'ns:%';

-- Opening Skill
--   tracking_type "boolean" -> "counter", target_value 1 -> 4, milestone_config null -> {"start": 0, "target": 4, "steps":, stages null -> ["open without a script", "consist
UPDATE user_goals SET tracking_type = 'counter', target_value = 4, milestone_config = '{"start": 0, "target": 4, "steps": 4, "curveTension": 0, "controlPoints": [], "pins": []}'::jsonb, stages = '{"open without a script","consistent daily opens","read it & adapt","opening feels effortless"}'::text[]
  WHERE id = '6ef60a23-4ad8-4c09-acd4-99c591190fec' AND template_id LIKE 'ns:%';

-- Abundance Stages
--   tracking_type "boolean" -> "counter", target_value 1 -> 4, milestone_config null -> {"start": 0, "target": 4, "steps":, stages null -> ["first lay", "dating 2 women", "r
UPDATE user_goals SET tracking_type = 'counter', target_value = 4, milestone_config = '{"start": 0, "target": 4, "steps": 4, "curveTension": 0, "controlPoints": [], "pins": []}'::jsonb, stages = '{"first lay","dating 2 women","rotation of 3+","true abundance"}'::text[]
  WHERE id = '94ecddac-e4b5-4e2e-89b7-32fd980536c7' AND template_id LIKE 'ns:%';

-- Approach Anxiety
--   tracking_type "boolean" -> "counter", target_value 1 -> 4, milestone_config null -> {"start": 0, "target": 4, "steps":, stages null -> ["paralysing anxiety", "nervous bu
UPDATE user_goals SET tracking_type = 'counter', target_value = 4, milestone_config = '{"start": 0, "target": 4, "steps": 4, "curveTension": 0, "controlPoints": [], "pins": []}'::jsonb, stages = '{"paralysing anxiety","nervous but moving","mild butterflies","calm and present"}'::text[]
  WHERE id = '4bccb7ed-10ea-462c-bd25-bca0899a2f6a' AND template_id LIKE 'ns:%';

-- Founder Skills
--   tracking_type "boolean" -> "counter", target_value 1 -> 4, milestone_config null -> {"start": 0, "target": 4, "steps":, stages null -> ["validate an idea", "land your fi
UPDATE user_goals SET tracking_type = 'counter', target_value = 4, milestone_config = '{"start": 0, "target": 4, "steps": 4, "curveTension": 0, "controlPoints": [], "pins": []}'::jsonb, stages = '{"validate an idea","land your first sale","build a repeatable offer","scale what works"}'::text[]
  WHERE id = '2f368b9d-ac4a-43d3-a5a7-fc8855070163' AND template_id LIKE 'ns:%';

-- Business Journey
--   tracking_type "boolean" -> "counter", target_value 1 -> 4, milestone_config null -> {"start": 0, "target": 4, "steps":, stages null -> ["just an idea", "first paying cus
UPDATE user_goals SET tracking_type = 'counter', target_value = 4, milestone_config = '{"start": 0, "target": 4, "steps": 4, "curveTension": 0, "controlPoints": [], "pins": []}'::jsonb, stages = '{"just an idea","first paying customer","ramen profitable","real, growing business"}'::text[]
  WHERE id = 'b4be988f-f8fa-4a16-a0ca-c85d4b4fe565' AND template_id LIKE 'ns:%';
