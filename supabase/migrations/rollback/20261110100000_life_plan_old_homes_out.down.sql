-- ROLLBACK: puts back the old homes Phase 7 removed (Plans/life-plan-rebuild.md).
--
-- Undoes 20261110100000_life_plan_old_homes_out.sql: the whole-plan save, the
-- previous change-only save, the five columns, and the three tables with
-- their keys, row security and triggers. Taken from a schema dump of the live
-- database just before Phase 7.
--
-- STRUCTURE ONLY. The rows (the 50 copied goals and their snapshots, the
-- answer rows, the habits and their nodes, the one thing's history, the
-- column values) come back only from ~/dg-backups/life-plan-2026-11-10-before-phase7.json.
-- The day numbers Phase 7 copied in stay; remove them by hand if wanted.
-- Roll back the code first. Ask the owner before running this on the live
-- database.


ALTER TABLE public.life_plans ADD COLUMN IF NOT EXISTS season_focus_id uuid;
ALTER TABLE public.life_plan_areas ADD COLUMN IF NOT EXISTS review_fortnight smallint
  CONSTRAINT life_plan_areas_review_fortnight_check CHECK (review_fortnight IS NULL OR (review_fortnight >= 0 AND review_fortnight <= 10));
ALTER TABLE public.life_plan_areas ADD COLUMN IF NOT EXISTS season_rank integer
  CONSTRAINT life_plan_areas_season_rank_check CHECK (season_rank IS NULL OR season_rank >= 0);
ALTER TABLE public.life_plan_goals ADD COLUMN IF NOT EXISTS serves_one_thing boolean DEFAULT false NOT NULL;
ALTER TABLE public.life_plan_goals ADD COLUMN IF NOT EXISTS user_goal_id uuid;

ALTER TABLE ONLY "public"."life_plan_goals"
    ADD CONSTRAINT "life_plan_goals_user_goal_key" UNIQUE ("user_goal_id");

ALTER TABLE ONLY "public"."life_plan_goals"
    ADD CONSTRAINT "life_plan_goals_user_goal_id_fkey" FOREIGN KEY ("user_goal_id") REFERENCES "public"."user_goals"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."life_plans"
    ADD CONSTRAINT "life_plans_season_focus_fk" FOREIGN KEY ("season_focus_id", "user_id") REFERENCES "public"."life_plan_nodes"("id", "user_id") ON DELETE SET NULL ("season_focus_id");

CREATE OR REPLACE FUNCTION "public"."life_answers_reject_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  raise exception
    'life_answers is append-only: delete the row and write a new one (attempted update on %)', old.id
    using errcode = 'restrict_violation';
end;
$$;

CREATE OR REPLACE FUNCTION "public"."life_chapters_reject_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  raise exception
    'life_chapters is append-only: delete the chapter and open a new one (attempted update on %)', old.id
    using errcode = 'restrict_violation';
end;
$$;

CREATE TABLE IF NOT EXISTS "public"."life_chapters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "statement_key" "text" NOT NULL,
    "started_on" "date" NOT NULL,
    "due_on" "date" NOT NULL,
    "opened_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "continues_id" "uuid",
    CONSTRAINT "life_chapters_dates_sane" CHECK ((("due_on" >= "started_on") AND ("due_on" <= ("started_on" + 1830)))),
    CONSTRAINT "life_chapters_statement_key_check" CHECK (("statement_key" = 'one_thing'::"text"))
);

CREATE TABLE IF NOT EXISTS "public"."life_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "answer_key" "text" NOT NULL,
    "body" "text" NOT NULL,
    "answered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "legacy_due_on" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "chapter_id" "uuid" NOT NULL,
    CONSTRAINT "life_answers_answer_key_check" CHECK (("answer_key" = ANY (ARRAY['one_thing'::"text", 'one_why'::"text", 'one_cost'::"text", 'one_identity'::"text", 'one_values'::"text"]))),
    CONSTRAINT "life_answers_body_check" CHECK ((("length"("btrim"("body")) >= 1) AND ("length"("btrim"("body")) <= 2000)))
);

CREATE TABLE IF NOT EXISTS "public"."life_plan_goal_habits" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "node_kind" "text" DEFAULT 'habit'::"text" NOT NULL,
    "position" integer NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "days_per_week" smallint DEFAULT 0 NOT NULL,
    "placeholder" boolean DEFAULT false NOT NULL,
    "routine_days" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "source_target_id" "text",
    CONSTRAINT "life_plan_goal_habits_days_per_week_check" CHECK ((("days_per_week" >= 0) AND ("days_per_week" <= 7))),
    CONSTRAINT "life_plan_goal_habits_node_kind_check" CHECK (("node_kind" = 'habit'::"text")),
    CONSTRAINT "life_plan_goal_habits_position_check" CHECK (("position" >= 0)),
    CONSTRAINT "life_plan_goal_habits_routine_days_check" CHECK (("jsonb_typeof"("routine_days") = 'array'::"text")),
    CONSTRAINT "life_plan_goal_habits_source_target_id_check" CHECK ((("source_target_id" IS NULL) OR ("char_length"("source_target_id") <= 120))),
    CONSTRAINT "life_plan_goal_habits_title_check" CHECK (("char_length"("title") <= 500))
);

COMMENT ON TABLE "public"."life_answers" IS 'Dated written answers from the Life Mastery flow. Current = newest row. Insert and delete only; never updated.';

COMMENT ON COLUMN "public"."life_answers"."legacy_due_on" IS 'FROZEN. The per-row deadline from before chapters existed, kept for reference. Never read, never written. The live deadline is life_chapters.due_on.';

COMMENT ON TABLE "public"."life_chapters" IS 'What you committed to, and the dates it runs between. The words live in life_answers, one or more versions per chapter. Current = newest chapter; never a stored flag.';

COMMENT ON COLUMN "public"."life_chapters"."continues_id" IS 'The chapter this one continues when a deadline moved. Deliberately not a foreign key: nulling it on delete is an UPDATE, which the append-only trigger refuses. A dangling id means the chapter it continued was deleted.';

ALTER TABLE ONLY "public"."life_answers"
    ADD CONSTRAINT "life_answers_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."life_chapters"
    ADD CONSTRAINT "life_chapters_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."life_plan_goal_habits"
    ADD CONSTRAINT "life_plan_goal_habits_owner_key" UNIQUE ("id", "user_id");

ALTER TABLE ONLY "public"."life_plan_goal_habits"
    ADD CONSTRAINT "life_plan_goal_habits_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."life_plan_goal_habits"
    ADD CONSTRAINT "life_plan_goal_habits_position_key" UNIQUE ("goal_id", "position") DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX "life_answers_chapter_idx" ON "public"."life_answers" USING "btree" ("chapter_id", "answer_key", "answered_at" DESC);

CREATE INDEX "life_answers_current_idx" ON "public"."life_answers" USING "btree" ("user_id", "answer_key", "answered_at" DESC);

CREATE INDEX "life_chapters_current_idx" ON "public"."life_chapters" USING "btree" ("user_id", "statement_key", "opened_at" DESC);

CREATE OR REPLACE TRIGGER "life_answers_no_update" BEFORE UPDATE ON "public"."life_answers" FOR EACH ROW EXECUTE FUNCTION "public"."life_answers_reject_update"();

CREATE OR REPLACE TRIGGER "life_chapters_no_update" BEFORE UPDATE ON "public"."life_chapters" FOR EACH ROW EXECUTE FUNCTION "public"."life_chapters_reject_update"();

ALTER TABLE ONLY "public"."life_answers"
    ADD CONSTRAINT "life_answers_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."life_chapters"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."life_answers"
    ADD CONSTRAINT "life_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."life_chapters"
    ADD CONSTRAINT "life_chapters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."life_plan_goal_habits"
    ADD CONSTRAINT "life_plan_goal_habits_goal_fk" FOREIGN KEY ("goal_id", "user_id") REFERENCES "public"."life_plan_goals"("id", "user_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."life_plan_goal_habits"
    ADD CONSTRAINT "life_plan_goal_habits_node_fk" FOREIGN KEY ("id", "user_id", "node_kind") REFERENCES "public"."life_plan_nodes"("id", "user_id", "kind") ON DELETE CASCADE;

ALTER TABLE "public"."life_answers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."life_chapters" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."life_plan_goal_habits" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delete own chapters" ON "public"."life_chapters" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "delete own life answers" ON "public"."life_answers" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "life_plan_goal_habits_delete_own" ON "public"."life_plan_goal_habits" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "life_plan_goal_habits_insert_own" ON "public"."life_plan_goal_habits" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "life_plan_goal_habits_select_own" ON "public"."life_plan_goal_habits" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "life_plan_goal_habits_update_own" ON "public"."life_plan_goal_habits" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "open own chapters" ON "public"."life_chapters" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "read own chapters" ON "public"."life_chapters" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "read own life answers" ON "public"."life_answers" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "write own life answers" ON "public"."life_answers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_answers" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."life_answers" TO "service_role";

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_chapters" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_chapters" TO "authenticated";
GRANT ALL ON TABLE "public"."life_chapters" TO "service_role";

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_goal_habits" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_goal_habits" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_goal_habits" TO "service_role";

GRANT ALL ON FUNCTION "public"."life_answers_reject_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."life_answers_reject_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."life_answers_reject_update"() TO "service_role";

GRANT ALL ON FUNCTION "public"."life_chapters_reject_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."life_chapters_reject_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."life_chapters_reject_update"() TO "service_role";

CREATE OR REPLACE FUNCTION "public"."save_life_plan"("p_rows" "jsonb", "p_expected_rev" integer) RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_plan_id UUID;
  v_rev INTEGER;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'object' THEN
    RAISE EXCEPTION 'save_life_plan needs an object of row arrays'
      USING ERRCODE = '22023';
  END IF;

  -- The plan the caller may actually see. Row security means this finds
  -- nothing at all for somebody else's plan, which is the refusal we want.
  SELECT id, revision INTO v_plan_id, v_rev
    FROM life_plans
   WHERE id = (p_rows ->> 'plan_id')::uuid
     FOR UPDATE;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'No such plan, or it is not yours'
      USING ERRCODE = '42501';
  END IF;

  IF v_rev <> p_expected_rev THEN
    RAISE EXCEPTION 'Plan revision is % but the save was built on %', v_rev, p_expected_rev
      USING ERRCODE = '55000';
  END IF;

  -- ------------------------------------------------------------------ nodes
  -- Gone from the plan: gone from the database, taking its detail row and its
  -- ticks with it. Still present: keeps the UUID it already had.
  DELETE FROM life_plan_nodes n
   WHERE n.plan_id = v_plan_id
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements(coalesce(p_rows -> 'nodes', '[]'::jsonb)) AS e
        WHERE (e.value ->> 'id')::uuid = n.id);

  INSERT INTO life_plan_nodes (id, plan_id, user_id, kind, local_id)
  SELECT (e.value ->> 'id')::uuid, v_plan_id, (e.value ->> 'user_id')::uuid,
         e.value ->> 'kind', e.value ->> 'local_id'
    FROM jsonb_array_elements(coalesce(p_rows -> 'nodes', '[]'::jsonb)) AS e
      ON CONFLICT (id) DO UPDATE
         SET local_id = EXCLUDED.local_id;

  -- ---------------------------------------------------------- detail tables
  -- One upsert each, in dependency order. No branching: every array is already
  -- exactly its table's shape.
  INSERT INTO life_plan_north_stars
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_north_stars,
    coalesce(p_rows -> 'north_stars', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    text = EXCLUDED.text, horizon_years = EXCLUDED.horizon_years;

  INSERT INTO life_plan_areas
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_areas,
    coalesce(p_rows -> 'areas', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    position = EXCLUDED.position, label = EXCLUDED.label, sublabel = EXCLUDED.sublabel,
    color = EXCLUDED.color, custom = EXCLUDED.custom,
    review_ten = EXCLUDED.review_ten, review_purpose = EXCLUDED.review_purpose,
    review_snapshot = EXCLUDED.review_snapshot, review_blockers = EXCLUDED.review_blockers,
    review_identity = EXCLUDED.review_identity, review_fortnight = EXCLUDED.review_fortnight,
    review_goals_aim = EXCLUDED.review_goals_aim, season_rank = EXCLUDED.season_rank;

  -- `user_goal_id` IS ABSENT FROM THIS UPDATE ON PURPOSE. It is the link to the
  -- counted goal and it is owned by the push, not by the plan save. Listing it
  -- here would let a plan written on a second device, which has never pushed,
  -- blank the link and make the next push create a duplicate of every goal.
  INSERT INTO life_plan_goals
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goals,
    coalesce(p_rows -> 'goals', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    position = EXCLUDED.position, priority_rank = EXCLUDED.priority_rank,
    area_id = EXCLUDED.area_id, title = EXCLUDED.title,
    goal_type = EXCLUDED.goal_type, why = EXCLUDED.why, pain_why = EXCLUDED.pain_why,
    sentence = EXCLUDED.sentence, feeling = EXCLUDED.feeling, reward = EXCLUDED.reward,
    stake = EXCLUDED.stake, unit = EXCLUDED.unit, target_date = EXCLUDED.target_date,
    belief_level = EXCLUDED.belief_level, desire_level = EXCLUDED.desire_level,
    days_per_week = EXCLUDED.days_per_week, per_week = EXCLUDED.per_week,
    is_abstinence = EXCLUDED.is_abstinence, serves_one_thing = EXCLUDED.serves_one_thing,
    metric = EXCLUDED.metric, ladder = EXCLUDED.ladder, ramp_steps = EXCLUDED.ramp_steps,
    reasons_list = EXCLUDED.reasons_list, asked = EXCLUDED.asked;

  INSERT INTO life_plan_goal_checkpoints
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goal_checkpoints,
    coalesce(p_rows -> 'checkpoints', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    goal_id = EXCLUDED.goal_id, position = EXCLUDED.position, title = EXCLUDED.title,
    done = EXCLUDED.done, celebration = EXCLUDED.celebration;

  INSERT INTO life_plan_goal_obstacles
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goal_obstacles,
    coalesce(p_rows -> 'obstacles', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    goal_id = EXCLUDED.goal_id, position = EXCLUDED.position,
    what = EXCLUDED.what, counter = EXCLUDED.counter;

  INSERT INTO life_plan_goal_beliefs
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goal_beliefs,
    coalesce(p_rows -> 'beliefs', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    goal_id = EXCLUDED.goal_id, position = EXCLUDED.position, old = EXCLUDED.old,
    useful = EXCLUDED.useful, evidence = EXCLUDED.evidence, replacement = EXCLUDED.replacement;

  INSERT INTO life_plan_goal_habits
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goal_habits,
    coalesce(p_rows -> 'habits', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    goal_id = EXCLUDED.goal_id, position = EXCLUDED.position, title = EXCLUDED.title,
    days_per_week = EXCLUDED.days_per_week, placeholder = EXCLUDED.placeholder,
    routine_days = EXCLUDED.routine_days, source_target_id = EXCLUDED.source_target_id;

  INSERT INTO life_plan_routines
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_routines,
    coalesce(p_rows -> 'routines', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    position = EXCLUDED.position, label = EXCLUDED.label,
    blueprint_id = EXCLUDED.blueprint_id, kind = EXCLUDED.kind,
    area_id = EXCLUDED.area_id, days_per_week = EXCLUDED.days_per_week,
    enrollment_id = EXCLUDED.enrollment_id;

  INSERT INTO life_plan_routine_steps
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_routine_steps,
    coalesce(p_rows -> 'steps', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    routine_id = EXCLUDED.routine_id, position = EXCLUDED.position,
    library_step_id = EXCLUDED.library_step_id, title = EXCLUDED.title,
    minutes = EXCLUDED.minutes, days_per_week = EXCLUDED.days_per_week,
    dimension = EXCLUDED.dimension, days = EXCLUDED.days, start_min = EXCLUDED.start_min,
    goes_to = EXCLUDED.goes_to, goes_to_set = EXCLUDED.goes_to_set,
    asks = EXCLUDED.asks, asks_set = EXCLUDED.asks_set;

  INSERT INTO life_plan_routine_split_days
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_routine_split_days,
    coalesce(p_rows -> 'split_days', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    routine_id = EXCLUDED.routine_id, position = EXCLUDED.position, name = EXCLUDED.name;

  INSERT INTO life_plan_experiences
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_experiences,
    coalesce(p_rows -> 'experiences', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    position = EXCLUDED.position, title = EXCLUDED.title, area_id = EXCLUDED.area_id,
    goal_id = EXCLUDED.goal_id, done = EXCLUDED.done, done_on = EXCLUDED.done_on;

  INSERT INTO life_plan_fields
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_fields,
    coalesce(p_rows -> 'fields', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    position = EXCLUDED.position, label = EXCLUDED.label, kind = EXCLUDED.kind,
    target_id = EXCLUDED.target_id, read_source_id = EXCLUDED.read_source_id;

  INSERT INTO life_plan_sub_steps
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_sub_steps,
    coalesce(p_rows -> 'sub_steps', '[]'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    position = EXCLUDED.position, target_id = EXCLUDED.target_id, title = EXCLUDED.title;

  -- ------------------------------------------------- link and list tables
  -- Replaced wholesale. Nothing points at one of these rows, so nothing can be
  -- orphaned by rewriting them, and a pair table has no stable id to upsert on.
  DELETE FROM life_plan_goal_feeds f
   USING life_plan_goals g
   WHERE f.goal_id = g.id AND g.plan_id = v_plan_id;
  INSERT INTO life_plan_goal_feeds
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goal_feeds,
    coalesce(p_rows -> 'goal_feeds', '[]'::jsonb));

  DELETE FROM life_plan_goal_serves s
   USING life_plan_goals g
   WHERE s.goal_id = g.id AND g.plan_id = v_plan_id;
  INSERT INTO life_plan_goal_serves
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_goal_serves,
    coalesce(p_rows -> 'goal_serves', '[]'::jsonb));

  DELETE FROM life_plan_routine_serves s
   USING life_plan_routines r
   WHERE s.routine_id = r.id AND r.plan_id = v_plan_id;
  INSERT INTO life_plan_routine_serves
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_routine_serves,
    coalesce(p_rows -> 'routine_serves', '[]'::jsonb));

  DELETE FROM life_plan_step_serves ss
   USING life_plan_routine_steps st, life_plan_routines r
   WHERE ss.step_id = st.id AND st.routine_id = r.id AND r.plan_id = v_plan_id;
  INSERT INTO life_plan_step_serves
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_step_serves,
    coalesce(p_rows -> 'step_serves', '[]'::jsonb));

  DELETE FROM life_plan_values WHERE plan_id = v_plan_id;
  INSERT INTO life_plan_values
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_values,
    coalesce(p_rows -> 'values', '[]'::jsonb));

  DELETE FROM life_plan_answers WHERE plan_id = v_plan_id;
  INSERT INTO life_plan_answers
  SELECT * FROM jsonb_populate_recordset(NULL::life_plan_answers,
    coalesce(p_rows -> 'answers', '[]'::jsonb));

  -- ------------------------------------------------------------- the plan
  -- `seq` may only ever rise: it is the id counter, and letting a stale device
  -- lower it would mint an id that already belongs to something else.
  UPDATE life_plans
     SET version = coalesce((p_rows ->> 'version')::int, version),
         seq = greatest(seq, coalesce((p_rows ->> 'seq')::int, 0)),
         season_focus_id = (p_rows ->> 'season_focus_id')::uuid,
         revision = revision + 1
   WHERE id = v_plan_id
  RETURNING revision INTO v_rev;

  RETURN v_rev;
END;
$$;

REVOKE ALL ON FUNCTION "public"."save_life_plan"("p_rows" "jsonb", "p_expected_rev" integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION "public"."save_life_plan"("p_rows" "jsonb", "p_expected_rev" integer) FROM anon;
GRANT ALL ON FUNCTION "public"."save_life_plan"("p_rows" "jsonb", "p_expected_rev" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_life_plan"("p_rows" "jsonb", "p_expected_rev" integer) TO "service_role";

CREATE OR REPLACE FUNCTION "public"."apply_life_plan_changes"("p_changes" "jsonb", "p_expected_rev" integer) RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
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
    ARRAY['habits',         'life_plan_goal_habits'],
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

    -- The table's real columns that the rows actually carry. `user_goal_id`
    -- is never one of them, on an insert either: the link to the counted goal
    -- is the Track push's, and a key check ignores row security, so a goal
    -- written here could otherwise claim another account's counted goal and
    -- block that account's own push on UNIQUE (user_goal_id).
    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY a.attnum),
           string_agg(format('%1$I = EXCLUDED.%1$I', a.attname), ', ' ORDER BY a.attnum)
             FILTER (WHERE a.attname <> ALL (v_pk)
                       AND a.attname NOT IN ('user_id', 'plan_id'))
      INTO v_cols, v_set
      FROM pg_attribute a
     WHERE a.attrelid = v_table::regclass AND a.attnum > 0 AND NOT a.attisdropped
       AND a.attname <> 'user_goal_id'
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
         season_focus_id = CASE WHEN (p_changes -> 'plan') ? 'season_focus_id'
                                THEN (p_changes -> 'plan' ->> 'season_focus_id')::uuid
                                ELSE season_focus_id END,
         revision = revision + 1
   WHERE id = v_plan_id
  RETURNING revision INTO v_rev;

  RETURN v_rev;
END;
$_$;

NOTIFY pgrst, 'reload schema';
