-- baseline-stamp: 20261110130000
-- Schema only (no rows), dumped from the linked Supabase project by scripts/db/baseline.sh.
-- Do not edit by hand: write a migration, then re-run the script once production has it.



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE TYPE "public"."goal_period" AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'custom',
    'quarterly',
    'yearly'
);


ALTER TYPE "public"."goal_period" OWNER TO "postgres";


CREATE TYPE "public"."goal_tracking_type" AS ENUM (
    'counter',
    'percentage',
    'streak',
    'boolean'
);


ALTER TYPE "public"."goal_tracking_type" OWNER TO "postgres";


CREATE TYPE "public"."linked_metric" AS ENUM (
    'approaches_weekly',
    'sessions_weekly',
    'numbers_weekly',
    'instadates_weekly',
    'approaches_cumulative',
    'sessions_cumulative',
    'numbers_cumulative',
    'instadates_cumulative',
    'field_reports_weekly',
    'field_reports_cumulative',
    'approach_quality_avg_weekly',
    'high_quality_approaches_cumulative',
    'scenario_sessions_cumulative',
    'scenario_types_cumulative',
    'scenario_high_scores_cumulative',
    'body_weight_current',
    'sleep_hours_avg_weekly',
    'gym_sessions_weekly',
    'gym_sessions_cumulative',
    'nutrition_quality_avg_weekly',
    'cardio_sessions_weekly',
    'training_hours_cumulative',
    'consecutive_training_weeks',
    'bench_press_1rm',
    'squat_1rm',
    'deadlift_1rm',
    'overhead_press_1rm',
    'pullups_max_reps',
    'progress_photos_cumulative',
    'weight_lost_from_peak',
    'weight_gained_from_lowest',
    'body_measurements_count',
    'protein_days_hit_weekly',
    'calorie_days_hit_weekly',
    'mobility_sessions_weekly',
    'yoga_sessions_weekly',
    'flexibility_hours_cumulative',
    'running_sessions_weekly',
    'running_distance_cumulative',
    'longest_run_km',
    'consecutive_cardio_weeks',
    'high_quality_approaches_weekly'
);


ALTER TYPE "public"."linked_metric" OWNER TO "postgres";


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

    -- The table's real columns that the rows actually carry. A field a page
    -- running older code still sends for a column that is gone is ignored.
    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY a.attnum),
           string_agg(format('%1$I = EXCLUDED.%1$I', a.attname), ', ' ORDER BY a.attnum)
             FILTER (WHERE a.attname <> ALL (v_pk)
                       AND a.attname NOT IN ('user_id', 'plan_id'))
      INTO v_cols, v_set
      FROM pg_attribute a
     WHERE a.attrelid = v_table::regclass AND a.attnum > 0 AND NOT a.attisdropped
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
         revision = revision + 1
   WHERE id = v_plan_id
  RETURNING revision INTO v_rev;

  RETURN v_rev;
END;
$_$;


ALTER FUNCTION "public"."apply_life_plan_changes"("p_changes" "jsonb", "p_expected_rev" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_ends_due"("p_limit" integer, "p_now" timestamp with time zone DEFAULT "now"()) RETURNS TABLE("run_id" "uuid", "user_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select r.id, r.user_id
    from public.audit_runs as r
   where r.ended_at is null
     and p_now >= r.ends_at
     and p_now < r.ends_at + interval '2 days'
     and r.end_sent_at is null
     and exists (select 1 from public.push_devices as d where d.user_id = r.user_id and d.enabled)
     and not exists (select 1 from public.notification_sends as s where s.kind = 'audit-end' and s.entry_id = 'audit-end:' || r.id::text)
   order by r.ends_at
   limit greatest(coalesce(p_limit, 0), 0)
$$;


ALTER FUNCTION "public"."audit_ends_due"("p_limit" integer, "p_now" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_pings_due"("p_limit" integer, "p_now" timestamp with time zone DEFAULT "now"()) RETURNS TABLE("run_id" "uuid", "user_id" "uuid", "slot_at" timestamp with time zone, "timezone" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  with q as (
    select to_timestamp(floor(extract(epoch from p_now) / 900) * 900) - interval '15 minutes' as slot_at
  )
  select r.id, r.user_id, q.slot_at, z.tz
    from public.audit_runs as r
    cross join q
    left join public.profiles as p on p.id = r.user_id
    cross join lateral (
      select case when p.timezone in (select name from pg_catalog.pg_timezone_names) then p.timezone else 'UTC' end as tz
    ) as z
    cross join lateral (
      select (extract(hour from q.slot_at at time zone z.tz) * 60
            + extract(minute from q.slot_at at time zone z.tz))::int as m
    ) as t
   where r.ended_at is null
     and p_now < r.ends_at
     and q.slot_at + interval '15 minutes' > r.started_at
     and p_now < q.slot_at + interval '20 minutes'
     and (r.muted_until is null or r.muted_until <= p_now)
     and not (
       case
         when r.quiet_start = r.quiet_end then false
         when r.quiet_start < r.quiet_end then t.m >= r.quiet_start and t.m < r.quiet_end
         else t.m >= r.quiet_start or t.m < r.quiet_end
       end
     )
     and exists (select 1 from public.push_devices as d where d.user_id = r.user_id and d.enabled)
     and not exists (select 1 from public.audit_slots as a where a.run_id = r.id and a.slot_at = q.slot_at)
     and not exists (
       select 1 from public.notification_sends as s
        where s.kind = 'audit-ping'
          and s.entry_id = 'audit:' || r.id::text || ':' || extract(epoch from q.slot_at)::bigint::text
     )
   order by r.user_id
   limit greatest(coalesce(p_limit, 0), 0)
$$;


ALTER FUNCTION "public"."audit_pings_due"("p_limit" integer, "p_now" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_level"("xp_amount" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Level up every 100 XP (you can adjust this formula)
  RETURN GREATEST(1, FLOOR(xp_amount / 100.0) + 1);
END;
$$;


ALTER FUNCTION "public"."calculate_level"("xp_amount" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_beta_slot"("p_code" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_invite beta_invites%rowtype;
begin
  if auth.uid() is null then return 'invalid'; end if;
  select * into v_invite from beta_invites
    where code = p_code and active
    for update;
  if not found then return 'invalid'; end if;
  if exists (select 1 from beta_testers where user_id = auth.uid())
    then return 'already_member'; end if;
  if v_invite.use_count >= v_invite.max_uses then return 'full'; end if;
  update beta_invites set use_count = use_count + 1 where id = v_invite.id;
  insert into beta_testers (user_id, invite_id) values (auth.uid(), v_invite.id);
  return 'granted';
end $$;


ALTER FUNCTION "public"."claim_beta_slot"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."council_reminders_due"("p_limit" integer, "p_now" timestamp with time zone DEFAULT "now"()) RETURNS TABLE("user_id" "uuid", "local_day" "date", "tz" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select s.user_id, (p_now at time zone z.tz)::date, z.tz
    from public.user_role_model_settings as s
    left join public.profiles as p on p.id = s.user_id
    cross join lateral (
      select case when p.timezone in (select name from pg_catalog.pg_timezone_names) then p.timezone else 'UTC' end as tz
    ) as z
   where s.remind_on
     and extract(hour from p_now at time zone z.tz) = s.remind_hour
     and extract(minute from p_now at time zone z.tz) < 20
     and exists (select 1 from public.push_devices as d where d.user_id = s.user_id and d.enabled)
     and exists (select 1 from public.user_role_models as m where m.user_id = s.user_id)
     and not exists (
       select 1 from public.notification_sends as n
        where n.kind = 'council-daily'
          and n.entry_id = 'council-daily:' || s.user_id::text || ':' || ((p_now at time zone z.tz)::date)::text
     )
   order by s.user_id
   limit greatest(coalesce(p_limit, 0), 0)
$$;


ALTER FUNCTION "public"."council_reminders_due"("p_limit" integer, "p_now" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."end_enrollment"("p_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Not filtered on `is_active`: ending a program that is already ended is a
  -- no-op that succeeded, and answering "not found" for it would be a sentence
  -- nobody can act on. A row belonging to somebody else is invisible under the
  -- row rules, so it reaches the NOT FOUND below instead.
  UPDATE program_enrollments SET is_active = false WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'That program is not on your account' USING ERRCODE = '55000';
  END IF;

  RETURN p_id;
END $$;


ALTER FUNCTION "public"."end_enrollment"("p_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."end_enrollment"("p_id" "uuid") IS 'Stops a program prescribing. The busy-program trigger refuses it while a workout is open on it.';



CREATE OR REPLACE FUNCTION "public"."finish_program_workout"("p_workout_id" "uuid", "p_ended_at" timestamp with time zone, "p_duration_min" integer, "p_intensity" smallint, "p_rpe" numeric, "p_notes" "text", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer, "p_changes" "jsonb", "p_records" "jsonb", "p_started_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_session_type" "text" DEFAULT NULL::"text", "p_distance_km" numeric DEFAULT NULL::numeric) RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_enrollment UUID;
BEGIN
  PERFORM set_config('app.program_engine', 'on', true);
  SELECT enrollment_id INTO v_enrollment
  FROM workout_logs
  WHERE id = p_workout_id AND started_at IS NOT NULL AND ended_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That workout has already been finished' USING ERRCODE = '55000';
  END IF;
  IF v_enrollment IS NOT NULL THEN
    PERFORM 1
    FROM program_enrollments
    WHERE id = v_enrollment
      AND (cursor ->> 'sessionCount')::int = p_expected_session_count
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Your program moved on while this workout was open — reload and finish it again'
        USING ERRCODE = '55000';
    END IF;
    UPDATE program_enrollments
    SET exercise_state = p_exercise_state,
        cursor = p_cursor,
        replay_events = COALESCE(p_replay_events, replay_events)
    WHERE id = v_enrollment;
  END IF;
  UPDATE workout_logs
  SET ended_at = p_ended_at,
      duration_min = p_duration_min,
      intensity = p_intensity,
      rpe = COALESCE(p_rpe, rpe),
      notes = COALESCE(p_notes, notes),
      progression_changes = p_changes,
      personal_records = p_records,
      started_at = COALESCE(p_started_at, started_at),
      logged_at = COALESCE(p_started_at, logged_at),
      session_type = COALESCE(p_session_type, session_type),
      distance_km = p_distance_km
  WHERE id = p_workout_id;
  RETURN p_workout_id;
END $$;


ALTER FUNCTION "public"."finish_program_workout"("p_workout_id" "uuid", "p_ended_at" timestamp with time zone, "p_duration_min" integer, "p_intensity" smallint, "p_rpe" numeric, "p_notes" "text", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer, "p_changes" "jsonb", "p_records" "jsonb", "p_started_at" timestamp with time zone, "p_session_type" "text", "p_distance_km" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."finish_program_workout"("p_workout_id" "uuid", "p_ended_at" timestamp with time zone, "p_duration_min" integer, "p_intensity" smallint, "p_rpe" numeric, "p_notes" "text", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer, "p_changes" "jsonb", "p_records" "jsonb", "p_started_at" timestamp with time zone, "p_session_type" "text", "p_distance_km" numeric) IS 'Closes a live workout, moves the program''s weights and writes the receipt the screen showed — all in one transaction. Refuses a second call for the same workout, so a retry cannot advance the program twice. Also sets, when given: the start instant (started_at and logged_at together, so a session written up later is filed under the day it happened), the session kind, and the distance. The session RPE moves in half steps.';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  claimed text := new.raw_user_meta_data->>'timezone';
  known boolean := claimed is not null
    and exists (select 1 from pg_timezone_names where name = claimed);
begin
  insert into public.profiles (id, email, full_name, timezone, timezone_source)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    case when known then claimed else 'UTC' end,
    case when known then 'detected' else 'signup_default' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."life_plan_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."life_plan_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_session_and_advance"("p_workout" "jsonb", "p_sets" "jsonb", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_expected_session_count" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_row workout_logs;
  v_id UUID;
BEGIN
  PERFORM set_config('app.program_engine', 'on', true);
  SELECT * INTO v_row FROM jsonb_populate_record(null::workout_logs, p_workout);
  INSERT INTO workout_logs (
    user_id, session_type, duration_min, intensity, distance_km,
    enrollment_id, program_day_id, program_cycle, program_week,
    adjustments, rpe, notes, client_key, logged_at
  ) VALUES (
    v_row.user_id, v_row.session_type, v_row.duration_min, v_row.intensity,
    v_row.distance_km, v_row.enrollment_id, v_row.program_day_id,
    v_row.program_cycle, v_row.program_week,
    COALESCE(v_row.adjustments, '{}'::jsonb), v_row.rpe, v_row.notes,
    v_row.client_key, COALESCE(v_row.logged_at, now())
  )
  ON CONFLICT (user_id, client_key) WHERE client_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM workout_logs
    WHERE user_id = v_row.user_id AND client_key = v_row.client_key;
    RETURN jsonb_build_object('workout_id', v_id, 'inserted', false);
  END IF;
  INSERT INTO workout_sets (
    log_id, exercise, exercise_id, library_id, weight_kg, reps, set_number,
    set_kind, side, notes, exercise_notes, rpe, slot_id, set_group_id
  )
  SELECT v_id, s.exercise, s.exercise_id, s.library_id, s.weight_kg, s.reps,
         s.set_number, COALESCE(s.set_kind, 'working'), s.side, s.notes,
         s.exercise_notes, s.rpe, s.slot_id, s.set_group_id
  FROM jsonb_populate_recordset(null::workout_sets, COALESCE(p_sets, '[]'::jsonb)) s;
  IF v_row.enrollment_id IS NOT NULL THEN
    PERFORM 1 FROM program_enrollments
    WHERE id = v_row.enrollment_id
      AND (cursor ->> 'sessionCount')::int = p_expected_session_count
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Your program moved on while this was being written up — reload and try again'
        USING ERRCODE = '55000';
    END IF;
    UPDATE program_enrollments
    SET exercise_state = p_exercise_state,
        cursor = p_cursor
    WHERE id = v_row.enrollment_id;
  END IF;
  RETURN jsonb_build_object('workout_id', v_id, 'inserted', true);
END $$;


ALTER FUNCTION "public"."log_session_and_advance"("p_workout" "jsonb", "p_sets" "jsonb", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_expected_session_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_session_and_advance"("p_workout" "jsonb", "p_sets" "jsonb", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_expected_session_count" integer) IS 'Writes up a session that already happened and advances the program together. The same write-up sent twice records one session and advances once.';



CREATE OR REPLACE FUNCTION "public"."match_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) RETURNS TABLE("id" bigint, "content" "text", "source" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select
    embeddings.id,
    embeddings.content,
    embeddings.source,
    embeddings.metadata,
    1 - (embeddings.embedding <=> query_embedding) as similarity
  from embeddings
  where 1 - (embeddings.embedding <=> query_embedding) > match_threshold
  order by embeddings.embedding <=> query_embedding
  limit match_count;
end;
$$;


ALTER FUNCTION "public"."match_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_embeddings_test"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.5, "match_count" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "content" "text", "source" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select
    e.id,
    e.content,
    e.source,
    e.metadata,
    1 - (e.embedding <=> query_embedding) as similarity
  from embeddings_test e
  where 1 - (e.embedding <=> query_embedding) > match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
end;
$$;


ALTER FUNCTION "public"."match_embeddings_test"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notification_secret"("p_name" "text") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT ds.decrypted_secret
    FROM vault.decrypted_secrets ds
   WHERE ds.name = p_name
     AND p_name IN ('push_vapid_public', 'push_vapid_private', 'notifications_clock_secret')
$$;


ALTER FUNCTION "public"."notification_secret"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notifications_clock_tick"() RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target text;
  token text;
begin
  if not exists (select 1 from public.audit_pings_due(1)) and not exists (select 1 from public.audit_ends_due(1)) and not public.timetrack_alert_due() and not exists (select 1 from public.plan_reviews_due(1)) and not exists (select 1 from public.council_reminders_due(1)) then
    return null;
  end if;

  select decrypted_secret into target from vault.decrypted_secrets where name = 'notifications_clock_url';
  select decrypted_secret into token from vault.decrypted_secrets where name = 'notifications_clock_secret';
  if target is null or token is null or target not like 'https://%' then
    return null;
  end if;

  return net.http_post(
    url := target,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || token),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
end
$$;


ALTER FUNCTION "public"."notifications_clock_tick"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."plan_reviews_due"("p_limit" integer, "p_now" timestamp with time zone DEFAULT "now"()) RETURNS TABLE("user_id" "uuid", "local_day" "date", "review_day" smallint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select r.user_id, (p_now at time zone z.tz)::date, r.review_day
    from public.life_plan_reminders as r
    left join public.profiles as p on p.id = r.user_id
    cross join lateral (
      select case when p.timezone in (select name from pg_catalog.pg_timezone_names) then p.timezone else 'UTC' end as tz
    ) as z
    -- The Monday of the local ISO week (date_trunc('week') starts weeks on Monday).
    cross join lateral (
      select date_trunc('week', p_now at time zone z.tz)::date as monday
    ) as w
   where r.push_on
     and extract(isodow from p_now at time zone z.tz) = r.review_day
     and extract(hour from p_now at time zone z.tz) = r.review_hour
     and extract(minute from p_now at time zone z.tz) < 20
     and exists (select 1 from public.push_devices as d where d.user_id = r.user_id and d.enabled)
     -- Nothing sent or recorded for this person this week, whichever day it
     -- was keyed by. Keys end in a YYYY-MM-DD date, so text order is date order.
     and not exists (
       select 1 from public.notification_sends as s
        where s.kind = 'plan-review'
          and s.user_id = r.user_id
          and s.entry_id like 'plan-review:' || r.user_id::text || ':%'
          and right(s.entry_id, 10) between w.monday::text and (w.monday + 6)::text
     )
   order by r.user_id
   limit greatest(coalesce(p_limit, 0), 0)
$$;


ALTER FUNCTION "public"."plan_reviews_due"("p_limit" integer, "p_now" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."plan_week_review_written"("p_user" "uuid", "p_start" "date") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1 from public.life_plan_reviews as v
     where v.user_id = p_user and v.cadence = 'week' and v.period_start = p_start
       -- Any visible character, as the app's trim() counts it (btrim strips spaces only).
       and (coalesce(v.magic_moments, '') ~ '\S' or coalesce(v.lessons, '') ~ '\S'
            or coalesce(v.next_outcomes, '') ~ '\S'
            or exists (select 1 from public.life_plan_review_goals as g where g.review_id = v.id))
  )
$$;


ALTER FUNCTION "public"."plan_week_review_written"("p_user" "uuid", "p_start" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."program_drafts_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."program_drafts_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."program_numbers_only_by_the_app"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF coalesce(current_setting('app.program_engine', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'A program is started through the app, not written into the table.'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.exercise_state IS DISTINCT FROM OLD.exercise_state
     OR NEW.cursor IS DISTINCT FROM OLD.cursor
     OR NEW.replay_events IS DISTINCT FROM OLD.replay_events
     OR NEW.initial_exercise_state IS DISTINCT FROM OLD.initial_exercise_state
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'A program''s numbers are worked out by the app and cannot be written directly.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."program_numbers_only_by_the_app"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."program_numbers_only_by_the_app"() IS 'Refuses a client write of a program''s calculated columns (exercise_state, cursor, replay_events, initial_exercise_state, user_id) and a client insert, unless one of the app''s program functions is doing it.';



CREATE OR REPLACE FUNCTION "public"."prune_error_reports"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  removed integer := 0;
  batch integer;
begin
  delete from public.error_reports where last_seen_at < now() - interval '30 days';
  get diagnostics removed = row_count;

  -- and a hard ceiling, oldest first
  with excess as (
    select id from public.error_reports
    order by last_seen_at desc
    offset 10000
  )
  delete from public.error_reports where id in (select id from excess);
  get diagnostics batch = row_count;

  return removed + batch;
end;
$$;


ALTER FUNCTION "public"."prune_error_reports"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."prune_error_reports"() IS 'Deletes crash reports older than 30 days, then trims to the newest 10,000. Scheduled nightly by pg_cron.';



CREATE OR REPLACE FUNCTION "public"."refuse_to_pause_a_busy_program"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF OLD.is_active AND NOT NEW.is_active THEN
    -- "Open" is started-and-not-ended, and nothing looser: a workout typed in
    -- after the fact has no start time and is not something you are in.
    IF EXISTS (
      SELECT 1 FROM workout_logs
      WHERE enrollment_id = NEW.id
        AND started_at IS NOT NULL
        AND ended_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Finish or throw away the open workout first.' USING ERRCODE = '55000';
    END IF;
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."refuse_to_pause_a_busy_program"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refuse_to_pause_a_busy_program"() IS 'Refuses to switch a program off while a workout is open on it. The app checks this too, but a check followed by a write has a gap, and a script has no check at all.';



CREATE OR REPLACE FUNCTION "public"."remove_session_and_replay"("p_log_id" "uuid", "p_enrollment_id" "uuid", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_row program_enrollments;
  v_gone UUID;
BEGIN
  PERFORM set_config('app.program_engine', 'on', true);
  PERFORM 1 FROM program_enrollments
  WHERE id = p_enrollment_id
    AND (cursor ->> 'sessionCount')::int = p_expected_session_count
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Your program moved on while this was being recalculated — reload and try again'
      USING ERRCODE = '55000';
  END IF;
  DELETE FROM workout_logs
  WHERE id = p_log_id AND enrollment_id = p_enrollment_id
  RETURNING id INTO v_gone;
  IF v_gone IS NULL THEN
    RAISE EXCEPTION 'That session was not found, so nothing was deleted'
      USING ERRCODE = '55000';
  END IF;
  UPDATE program_enrollments
  SET exercise_state = p_exercise_state,
      cursor = p_cursor,
      replay_events = COALESCE(p_replay_events, replay_events)
  WHERE id = p_enrollment_id
  RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END $$;


ALTER FUNCTION "public"."remove_session_and_replay"("p_log_id" "uuid", "p_enrollment_id" "uuid", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."remove_session_and_replay"("p_log_id" "uuid", "p_enrollment_id" "uuid", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer) IS 'Removes one logged session and writes the recalculated weights together. Refuses a calculation made against a different history.';



CREATE OR REPLACE FUNCTION "public"."replace_sets_and_replay"("p_log_id" "uuid", "p_sets" "jsonb", "p_enrollment_id" "uuid", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_row program_enrollments;
BEGIN
  PERFORM set_config('app.program_engine', 'on', true);
  IF p_enrollment_id IS NOT NULL THEN
    PERFORM 1 FROM program_enrollments
    WHERE id = p_enrollment_id
      AND (cursor ->> 'sessionCount')::int = p_expected_session_count
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Your program moved on while this was being recalculated — reload and try again'
        USING ERRCODE = '55000';
    END IF;
  END IF;
  PERFORM 1 FROM workout_logs WHERE id = p_log_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That workout no longer exists' USING ERRCODE = '55000';
  END IF;
  DELETE FROM workout_sets WHERE log_id = p_log_id;
  INSERT INTO workout_sets (
    log_id, exercise, exercise_id, library_id, weight_kg, reps, set_number,
    set_kind, side, notes, exercise_notes, rpe, completed_at, prescribed_index,
    slot_id, set_group_id
  )
  SELECT p_log_id, s.exercise, s.exercise_id, s.library_id, s.weight_kg, s.reps,
         s.set_number, COALESCE(s.set_kind, 'working'), s.side, s.notes,
         s.exercise_notes, s.rpe, s.completed_at, s.prescribed_index,
         s.slot_id, s.set_group_id
  FROM jsonb_populate_recordset(null::workout_sets, COALESCE(p_sets, '[]'::jsonb)) s;
  IF p_enrollment_id IS NULL THEN
    RETURN NULL;
  END IF;
  UPDATE program_enrollments
  SET exercise_state = p_exercise_state,
      cursor = p_cursor,
      replay_events = COALESCE(p_replay_events, replay_events)
  WHERE id = p_enrollment_id
  RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END $$;


ALTER FUNCTION "public"."replace_sets_and_replay"("p_log_id" "uuid", "p_sets" "jsonb", "p_enrollment_id" "uuid", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."replace_sets_and_replay"("p_log_id" "uuid", "p_sets" "jsonb", "p_enrollment_id" "uuid", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer) IS 'Replaces a workout''s sets and writes the recalculated weights together. Nothing is half-written.';



CREATE OR REPLACE FUNCTION "public"."resume_enrollment"("p_id" "uuid", "p_displace" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_row program_enrollments;
BEGIN
  -- Pausing first, for the same two reasons as `start_enrollment`: one
  -- transaction makes the order irrelevant to safety, and only one row per
  -- program may be live, so the running one has to go off before this one
  -- comes on.
  IF p_displace IS NOT NULL AND array_length(p_displace, 1) > 0 THEN
    UPDATE program_enrollments SET is_active = false WHERE id = ANY (p_displace);
  END IF;

  UPDATE program_enrollments SET is_active = true
  WHERE id = p_id AND NOT is_active
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'That program is already running, or is not on your account'
      USING ERRCODE = '55000';
  END IF;

  RETURN to_jsonb(v_row);
END $$;


ALTER FUNCTION "public"."resume_enrollment"("p_id" "uuid", "p_displace" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."resume_enrollment"("p_id" "uuid", "p_displace" "uuid"[]) IS 'Runs a finished program again at the weights it was left at, pausing what it displaces, in one transaction.';



CREATE OR REPLACE FUNCTION "public"."save_program_state"("p_id" "uuid", "p_fields" "jsonb", "p_expect" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_old program_enrollments;
  v_row program_enrollments;
  v_has_spec BOOLEAN := p_fields ? 'spec' AND jsonb_typeof(p_fields -> 'spec') = 'object';
BEGIN
  PERFORM set_config('app.program_engine', 'on', true);
  SELECT * INTO v_old FROM program_enrollments WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  -- "Only if it is still in kilograms": a second conversion of the same switch
  -- matches nothing and says so, rather than converting twice.
  IF p_expect ? 'unit_system' AND v_old.unit_system IS DISTINCT FROM (p_expect ->> 'unit_system') THEN
    RETURN NULL;
  END IF;
  IF p_expect ? 'sessionCount'
     AND (v_old.cursor ->> 'sessionCount')::int IS DISTINCT FROM (p_expect ->> 'sessionCount')::int THEN
    RAISE EXCEPTION 'Your program moved on while this was being worked out — reload and try again'
      USING ERRCODE = '55000';
  END IF;

  UPDATE program_enrollments SET
    exercise_state = CASE WHEN p_fields ? 'exercise_state' THEN p_fields -> 'exercise_state' ELSE exercise_state END,
    cursor = CASE WHEN p_fields ? 'cursor' THEN p_fields -> 'cursor' ELSE cursor END,
    replay_events = CASE WHEN p_fields ? 'replay_events' THEN p_fields -> 'replay_events' ELSE replay_events END,
    initial_exercise_state = CASE WHEN p_fields ? 'initial_exercise_state'
      THEN NULLIF(p_fields -> 'initial_exercise_state', 'null'::jsonb) ELSE initial_exercise_state END,
    custom_schedule = CASE WHEN p_fields ? 'custom_schedule'
      THEN NULLIF(p_fields -> 'custom_schedule', 'null'::jsonb) ELSE custom_schedule END,
    unit_system = CASE WHEN p_fields ? 'unit_system' THEN p_fields ->> 'unit_system' ELSE unit_system END,
    spec = CASE WHEN p_fields ? 'spec' THEN NULLIF(p_fields -> 'spec', 'null'::jsonb) ELSE spec END,
    spec_version = CASE WHEN p_fields ? 'spec_version' THEN (p_fields ->> 'spec_version')::int ELSE spec_version END,
    maxes = CASE WHEN p_fields ? 'maxes' THEN NULLIF(p_fields -> 'maxes', 'null'::jsonb) ELSE maxes END,
    started_on = CASE WHEN p_fields ? 'started_on' THEN (p_fields ->> 'started_on')::date ELSE started_on END
  WHERE id = p_id
  RETURNING * INTO v_row;

  IF v_has_spec THEN
    INSERT INTO program_versions (enrollment_id, user_id, version, spec, spec_version)
    VALUES (
      p_id,
      v_row.user_id,
      COALESCE((SELECT max(version) FROM program_versions WHERE enrollment_id = p_id), 0) + 1,
      v_row.spec,
      v_row.spec_version
    );
  END IF;
  RETURN to_jsonb(v_row);
END $$;


ALTER FUNCTION "public"."save_program_state"("p_id" "uuid", "p_fields" "jsonb", "p_expect" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_program_state"("p_id" "uuid", "p_fields" "jsonb", "p_expect" "jsonb") IS 'Writes the given columns of one program (the app''s calculated numbers, its schedule or spec, its unit) in one statement. p_expect: {"unit_system": ...} answers null when it no longer holds; {"sessionCount": n} refuses a calculation made against a different history. A new spec is recorded as the next version.';



CREATE OR REPLACE FUNCTION "public"."start_enrollment"("p_row" "jsonb", "p_displace" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_row program_enrollments;
  v_new program_enrollments;
BEGIN
  PERFORM set_config('app.program_engine', 'on', true);
  IF p_displace IS NOT NULL AND array_length(p_displace, 1) > 0 THEN
    UPDATE program_enrollments SET is_active = false WHERE id = ANY (p_displace);
  END IF;
  SELECT * INTO v_row FROM jsonb_populate_record(null::program_enrollments, p_row);
  INSERT INTO program_enrollments (
    user_id, program_id, level, unit_system,
    exercise_state, initial_exercise_state, cursor,
    custom_schedule, replay_events, bar_weight_kg, label, is_active,
    spec, spec_version, started_on, maxes
  ) VALUES (
    v_row.user_id, v_row.program_id, v_row.level, v_row.unit_system,
    v_row.exercise_state, v_row.initial_exercise_state, v_row.cursor,
    v_row.custom_schedule, COALESCE(v_row.replay_events, '[]'::jsonb),
    v_row.bar_weight_kg, v_row.label, true,
    v_row.spec, v_row.spec_version, v_row.started_on, v_row.maxes
  )
  RETURNING * INTO v_new;
  IF v_new.spec IS NOT NULL THEN
    INSERT INTO program_versions (enrollment_id, user_id, version, spec, spec_version)
    VALUES (v_new.id, v_new.user_id, 1, v_new.spec, v_new.spec_version);
  END IF;
  RETURN to_jsonb(v_new);
END $$;


ALTER FUNCTION "public"."start_enrollment"("p_row" "jsonb", "p_displace" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."start_enrollment"("p_row" "jsonb", "p_displace" "uuid"[]) IS 'Starts a program and pauses the ones it makes room for, in one transaction — so a refused start leaves the program you were on running.';



CREATE OR REPLACE FUNCTION "public"."timetrack_alert_due"("p_user" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1 from public.timetrack_alerts_due(2147483647) as a where p_user is null or a.user_id = p_user
  )
$$;


ALTER FUNCTION "public"."timetrack_alert_due"("p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."timetrack_alerts_due"("p_limit" integer) RETURNS TABLE("id" "text", "user_id" "uuid", "description" "text", "project_name" "text", "started_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select d.id, d.user_id, d.description, d.project_name, d.started_at
    from (
      select distinct on (e.user_id)
             e.id, e.user_id, e.description, pr.name as project_name, e.started_at
        from public.timetrack_entries as e
        left join public.timetrack_projects as pr on pr.id = e.project_id
        left join public.profiles as p on p.id = e.user_id
       where e.stopped_at is null
         and e.deleted_at is null
         and e.started_at <= now() - interval '6 hours'
         and e.started_at > now() - interval '7 days'
         and exists (select 1 from public.push_devices as dv where dv.user_id = e.user_id and dv.timer_running)
         and not exists (
           select 1 from public.notification_sends as s where s.kind = 'timetrack-alert' and s.entry_id = e.id
         )
         and extract(hour from now() at time zone (
               case when p.timezone in (select name from pg_catalog.pg_timezone_names) then p.timezone else 'UTC' end
             )) between 7 and 22
       order by e.user_id, e.started_at asc, e.id asc
    ) as d
   order by d.started_at asc, d.id asc
   limit greatest(coalesce(p_limit, 0), 0)
$$;


ALTER FUNCTION "public"."timetrack_alerts_due"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."timetrack_push"("p_batch" "jsonb", "p_tag_sets" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $_$
declare
  v_uid uuid := auth.uid();
  v_tables constant text[] := array[
    'timetrack_workspaces', 'timetrack_clients', 'timetrack_projects', 'timetrack_project_rates',
    'timetrack_project_alerts', 'timetrack_alert_events', 'timetrack_tasks', 'timetrack_tags',
    'timetrack_entries', 'timetrack_entry_tags', 'timetrack_favorites', 'timetrack_saved_reports',
    'timetrack_approvals', 'timetrack_webhooks', 'timetrack_webhook_log',
    'timetrack_autotracker_rules', 'timetrack_timeline', 'timetrack_calendars', 'timetrack_settings'
  ];
  v_sets jsonb := coalesce(p_tag_sets, '{}'::jsonb);
  v_part jsonb;
  v_table text;
  v_bases jsonb;
  v_keycol text;
  v_checked boolean;
  v_stamped boolean;
  v_columns text[];
  v_row jsonb;
  v_key text;
  v_base text;
  v_list text;
  v_current jsonb;
  v_new jsonb;
  v_count integer;
  v_applied integer := 0;
  v_written jsonb := '{}'::jsonb;
  v_conflicts jsonb := '{}'::jsonb;
  v_conflict_tags jsonb := '{}'::jsonb;
  v_entries_written text[] := '{}';
  v_entries_refused text[] := '{}';
  v_entry text;
  v_tags jsonb;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if jsonb_typeof(p_batch) is distinct from 'array' then
    raise exception 'p_batch must be an array of {table, rows, bases}' using errcode = '22023';
  end if;
  if jsonb_typeof(v_sets) is distinct from 'object' then
    raise exception 'p_tag_sets must map an entry id to its tag ids' using errcode = '22023';
  end if;

  -- The caller sends the tables parents first (the repo's TIMETRACK_TABLES order),
  -- so every foreign key is satisfied as it goes.
  for v_part in select value from jsonb_array_elements(p_batch) loop
    v_table := v_part->>'table';
    if v_table is null or not (v_table = any (v_tables)) then
      raise exception 'Not a time-tracking table: %', coalesce(v_table, '(none)') using errcode = '22023';
    end if;
    v_bases := coalesce(v_part->'bases', '{}'::jsonb);

    if v_table = 'timetrack_entry_tags' then
      -- Links are only ever added here. An entry whose whole set travels in
      -- p_tag_sets is handled below instead, and a refused entry's links wait for
      -- the device to send them again with the entry.
      insert into public.timetrack_entry_tags (entry_id, tag_id, user_id)
      select link->>'entry_id', link->>'tag_id', v_uid
      from jsonb_array_elements(coalesce(v_part->'rows', '[]'::jsonb)) as link
      where not ((link->>'entry_id') = any (v_entries_refused))
        and not (v_sets ? (link->>'entry_id'))
      on conflict (entry_id, tag_id) do nothing;
      get diagnostics v_count = row_count;
      v_applied := v_applied + v_count;
      continue;
    end if;

    v_keycol := case when v_table = 'timetrack_settings' then 'user_id' else 'id' end;
    v_checked := v_table not in ('timetrack_workspaces', 'timetrack_webhook_log');
    v_stamped := v_table <> 'timetrack_webhook_log';
    select array_agg(a.attname::text) into v_columns
    from pg_catalog.pg_attribute as a
    where a.attrelid = pg_catalog.to_regclass('public.' || v_table)
      and a.attnum > 0
      and not a.attisdropped;

    for v_row in select value from jsonb_array_elements(coalesce(v_part->'rows', '[]'::jsonb)) loop
      v_row := v_row || jsonb_build_object('user_id', v_uid);
      v_key := v_row->>v_keycol;
      if v_key is null then
        raise exception 'A % row without its %', v_table, v_keycol using errcode = '22023';
      end if;

      -- the columns this row names; unknown keys are ignored, `updated_at` is ours
      select string_agg(pg_catalog.quote_ident(k), ', ') into v_list
      from jsonb_object_keys(v_row) as k
      where k = any (v_columns) and k <> 'updated_at';

      execute format('select to_jsonb(t) from public.%I as t where t.%I::text = $1 for update', v_table, v_keycol)
        into v_current using v_key;

      v_new := null;
      if v_current is null then
        if v_stamped then
          execute format(
            'insert into public.%I as t (%s, updated_at) select %s, now() from pg_catalog.jsonb_populate_record(null::public.%I, $1) returning to_jsonb(t.updated_at)',
            v_table, v_list, v_list, v_table
          ) into v_new using v_row;
        else
          execute format(
            'insert into public.%I (%s) select %s from pg_catalog.jsonb_populate_record(null::public.%I, $1)',
            v_table, v_list, v_list, v_table
          ) using v_row;
        end if;
      else
        v_base := v_bases->>v_key;
        if v_checked and (v_base is null or (v_current->>'updated_at')::timestamptz <> v_base::timestamptz) then
          -- Stale, or a write of a row the device believed was new: the stored row
          -- stays as it is, and the device is told what it is.
          v_conflicts := jsonb_set(
            v_conflicts, array[v_table], coalesce(v_conflicts->v_table, '[]'::jsonb) || jsonb_build_array(v_current)
          );
          if v_table = 'timetrack_entries' then
            v_entries_refused := v_entries_refused || v_key;
            v_conflict_tags := v_conflict_tags || jsonb_build_object(
              v_key,
              coalesce(
                (select jsonb_agg(l.tag_id order by l.tag_id) from public.timetrack_entry_tags as l where l.entry_id = v_key),
                '[]'::jsonb
              )
            );
          end if;
          continue;
        end if;
        if v_stamped then
          -- the touch trigger sets updated_at to now()
          execute format(
            'update public.%I as t set (%s) = (select %s from pg_catalog.jsonb_populate_record(null::public.%I, $1)) where t.%I::text = $2 returning to_jsonb(t.updated_at)',
            v_table, v_list, v_list, v_table, v_keycol
          ) into v_new using v_row, v_key;
        else
          execute format(
            'update public.%I as t set (%s) = (select %s from pg_catalog.jsonb_populate_record(null::public.%I, $1)) where t.%I::text = $2',
            v_table, v_list, v_list, v_table, v_keycol
          ) using v_row, v_key;
        end if;
      end if;

      v_applied := v_applied + 1;
      if v_new is not null then
        v_written := jsonb_set(
          v_written, array[v_table], coalesce(v_written->v_table, '{}'::jsonb) || jsonb_build_object(v_key, v_new)
        );
      end if;
      if v_table = 'timetrack_entries' then
        v_entries_written := v_entries_written || v_key;
      end if;
    end loop;
  end loop;

  -- An entry's whole tag set: what is not in it goes, what is in it is there.
  for v_entry, v_tags in select s.key, s.value from jsonb_each(v_sets) as s loop
    if jsonb_typeof(v_tags) is distinct from 'array' then
      raise exception 'The tag set for entry % is not a list', v_entry using errcode = '22023';
    end if;
    -- a set travels with its entry, under the entry's check
    if not (v_entry = any (v_entries_written)) then
      continue;
    end if;
    delete from public.timetrack_entry_tags as l
    where l.entry_id = v_entry
      and not (l.tag_id in (select jsonb_array_elements_text(v_tags)));
    insert into public.timetrack_entry_tags (entry_id, tag_id, user_id)
    select v_entry, tag, v_uid from jsonb_array_elements_text(v_tags) as tag
    on conflict (entry_id, tag_id) do nothing;
  end loop;

  return jsonb_build_object(
    'applied', v_applied,
    'written', v_written,
    'conflicts', v_conflicts,
    'conflict_tags', v_conflict_tags
  );
end;
$_$;


ALTER FUNCTION "public"."timetrack_push"("p_batch" "jsonb", "p_tag_sets" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."timetrack_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."timetrack_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_inner_game_progress_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_inner_game_progress_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tracking_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_tracking_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_lair_config_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_lair_config_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_programs_touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."user_programs_touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_role_models_at_most_five"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  perform pg_advisory_xact_lock(hashtextextended('user_role_models:' || new.user_id::text, 0));
  if (select count(*) from public.user_role_models where user_id = new.user_id) >= 5 then
    raise exception 'council_full' using errcode = 'P0001', hint = 'A council holds at most five people.';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."user_role_models_at_most_five"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."workout_logs_enrollment_is_own"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.enrollment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM program_enrollments e
    WHERE e.id = NEW.enrollment_id AND e.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'A workout can only be attached to your own program';
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."workout_logs_enrollment_is_own"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_usage_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "feature" "text" NOT NULL,
    "scenario_id" "text",
    "operation" "text" NOT NULL,
    "model" "text" NOT NULL,
    "input_tokens" integer NOT NULL,
    "output_tokens" integer NOT NULL,
    "cache_creation_tokens" integer DEFAULT 0 NOT NULL,
    "cache_read_tokens" integer DEFAULT 0 NOT NULL,
    "input_cost_cents" numeric(10,4) NOT NULL,
    "output_cost_cents" numeric(10,4) NOT NULL,
    "cache_creation_cost_cents" numeric(10,4) DEFAULT 0 NOT NULL,
    "cache_read_cost_cents" numeric(10,4) DEFAULT 0 NOT NULL,
    "total_cost_cents" numeric(10,4) NOT NULL,
    "response_time_ms" integer,
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_usage_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_usage_logs" IS 'Tracks all AI API calls (tokens, costs, performance) for budget management and analytics';



COMMENT ON COLUMN "public"."ai_usage_logs"."feature" IS 'Which feature used AI: keep-it-going, openers-evaluator, qa, articles';



COMMENT ON COLUMN "public"."ai_usage_logs"."scenario_id" IS 'For scenarios: which situation (bookstore, cafe, etc.)';



COMMENT ON COLUMN "public"."ai_usage_logs"."operation" IS 'What operation: evaluate, generate_response, generate_close, generate_advice';



COMMENT ON COLUMN "public"."ai_usage_logs"."total_cost_cents" IS 'Total cost in USD cents (sum of input + output + cache costs)';



CREATE TABLE IF NOT EXISTS "public"."approaches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_id" "uuid",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "outcome" "text",
    "tags" "text"[],
    "mood" integer,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "note" "text",
    "voice_note_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "set_type" "text",
    "quality" integer,
    CONSTRAINT "approaches_mood_check" CHECK ((("mood" >= 1) AND ("mood" <= 5))),
    CONSTRAINT "approaches_quality_check" CHECK ((("quality" >= 1) AND ("quality" <= 10)))
);


ALTER TABLE "public"."approaches" OWNER TO "postgres";


COMMENT ON COLUMN "public"."approaches"."set_type" IS 'Type of set: solo, two_set, three_plus, seated, moving, etc.';



CREATE TABLE IF NOT EXISTS "public"."audit_runs" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "ended_at" timestamp with time zone,
    "quiet_start" smallint DEFAULT 1320 NOT NULL,
    "quiet_end" smallint DEFAULT 480 NOT NULL,
    "muted_until" timestamp with time zone,
    "review" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "end_sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audit_runs_check" CHECK ((("ends_at" > "started_at") AND ("ends_at" <= ("started_at" + '31 days'::interval)))),
    CONSTRAINT "audit_runs_check1" CHECK ((("ended_at" IS NULL) OR ("ended_at" >= "started_at"))),
    CONSTRAINT "audit_runs_check2" CHECK ((("mod"(("quiet_start")::integer, 15) = 0) AND ("mod"(("quiet_end")::integer, 15) = 0))),
    CONSTRAINT "audit_runs_quiet_end_check" CHECK ((("quiet_end" >= 0) AND ("quiet_end" <= 1439))),
    CONSTRAINT "audit_runs_quiet_start_check" CHECK ((("quiet_start" >= 0) AND ("quiet_start" <= 1439)))
);


ALTER TABLE "public"."audit_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_slots" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "run_id" "uuid" NOT NULL,
    "slot_at" timestamp with time zone NOT NULL,
    "activity" "text" NOT NULL,
    "energy" smallint NOT NULL,
    "growth" smallint NOT NULL,
    "avoiding" boolean DEFAULT false NOT NULL,
    "why" "text",
    "source" "text" NOT NULL,
    "time_entry_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audit_slots_activity_check" CHECK ((("length"("activity") >= 1) AND ("length"("activity") <= 200))),
    CONSTRAINT "audit_slots_energy_check" CHECK ((("energy" >= 1) AND ("energy" <= 7))),
    CONSTRAINT "audit_slots_growth_check" CHECK ((("growth" >= 1) AND ("growth" <= 7))),
    CONSTRAINT "audit_slots_slot_at_check" CHECK (("mod"(EXTRACT(epoch FROM "slot_at"), (900)::numeric) = (0)::numeric)),
    CONSTRAINT "audit_slots_source_check" CHECK (("source" = ANY (ARRAY['app'::"text", 'later'::"text", 'same'::"text"]))),
    CONSTRAINT "audit_slots_time_entry_id_check" CHECK ((("time_entry_id" IS NULL) OR ("length"("time_entry_id") <= 200))),
    CONSTRAINT "audit_slots_why_check" CHECK ((("why" IS NULL) OR ("length"("why") <= 2000)))
);


ALTER TABLE "public"."audit_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."beta_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "max_uses" integer DEFAULT 60 NOT NULL,
    "use_count" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "beta_invites_check" CHECK ((("use_count" >= 0) AND ("use_count" <= "max_uses")))
);


ALTER TABLE "public"."beta_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."beta_testers" (
    "user_id" "uuid" NOT NULL,
    "invite_id" "uuid" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."beta_testers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."body_measurements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "measurement_type" "text" NOT NULL,
    "value_cm" numeric(5,1) NOT NULL,
    "logged_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "body_measurements_measurement_type_check" CHECK (("measurement_type" = ANY (ARRAY['chest'::"text", 'waist'::"text", 'hips'::"text", 'arms'::"text", 'thighs'::"text", 'neck'::"text", 'shoulders'::"text", 'calves'::"text"]))),
    CONSTRAINT "body_measurements_value_cm_check" CHECK ((("value_cm" > (0)::numeric) AND ("value_cm" < (300)::numeric)))
);


ALTER TABLE "public"."body_measurements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."core_values" (
    "id" "text" NOT NULL,
    "category" "text" NOT NULL
);


ALTER TABLE "public"."core_values" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_goal_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "snapshot_date" "date" NOT NULL,
    "current_value" integer NOT NULL,
    "target_value" integer NOT NULL,
    "was_complete" boolean NOT NULL,
    "current_streak" integer NOT NULL,
    "best_streak" integer NOT NULL,
    "period" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."daily_goal_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dashboard_widgets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "dashboard_key" "text" DEFAULT 'tracking'::"text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "widget_type" "text" DEFAULT 'metric_tile'::"text" NOT NULL,
    "metric_id" "text",
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "dashboard_widgets_dashboard_key_len" CHECK ((("char_length"("dashboard_key") >= 1) AND ("char_length"("dashboard_key") <= 64))),
    CONSTRAINT "dashboard_widgets_metric_id_len" CHECK ((("metric_id" IS NULL) OR (("char_length"("metric_id") >= 1) AND ("char_length"("metric_id") <= 128)))),
    CONSTRAINT "dashboard_widgets_position_nonneg" CHECK (("position" >= 0)),
    CONSTRAINT "dashboard_widgets_widget_type_len" CHECK ((("char_length"("widget_type") >= 1) AND ("char_length"("widget_type") <= 64)))
);


ALTER TABLE "public"."dashboard_widgets" OWNER TO "postgres";


COMMENT ON TABLE "public"."dashboard_widgets" IS 'Per-user dashboard layout (which widgets, what order). Own-row CRUD RLS. metric_id references the code-side catalogue in src/tracking/data/metricCatalog.ts, or is goal:<uuid>:<view> for goal-derived metrics.';



CREATE TABLE IF NOT EXISTS "public"."embeddings" (
    "id" bigint NOT NULL,
    "content" "text",
    "source" "text",
    "metadata" "jsonb",
    "embedding" "public"."vector"(768)
);


ALTER TABLE "public"."embeddings" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."embeddings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."embeddings_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."embeddings_id_seq" OWNED BY "public"."embeddings"."id";



CREATE TABLE IF NOT EXISTS "public"."embeddings_test" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content" "text" NOT NULL,
    "source" "text" NOT NULL,
    "embedding" "public"."vector"(768) NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."embeddings_test" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."error_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "fingerprint" "text" NOT NULL,
    "message" "text" NOT NULL,
    "stack" "text",
    "component_stack" "text",
    "route" "text" DEFAULT ''::"text" NOT NULL,
    "user_agent" "text" DEFAULT ''::"text" NOT NULL,
    "release" "text" DEFAULT ''::"text" NOT NULL,
    "severity" "text" DEFAULT 'error'::"text" NOT NULL,
    "seen_count" integer DEFAULT 1 NOT NULL,
    "first_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "error_reports_message_not_blank" CHECK (("length"("btrim"("message")) > 0)),
    CONSTRAINT "error_reports_seen_count_check" CHECK (("seen_count" > 0)),
    CONSTRAINT "error_reports_severity_check" CHECK (("severity" = ANY (ARRAY['error'::"text", 'warning'::"text"]))),
    CONSTRAINT "error_reports_stack_bounded" CHECK ((("stack" IS NULL) OR ("length"("stack") <= 8000)))
);


ALTER TABLE "public"."error_reports" OWNER TO "postgres";


COMMENT ON TABLE "public"."error_reports" IS 'Crash reports. RLS on with NO policies: written and read only by the service role via /api/errors and the admin page. Never contains user-entered text.';



CREATE TABLE IF NOT EXISTS "public"."field_report_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "estimated_minutes" integer,
    "is_system" boolean DEFAULT false,
    "base_template_id" "uuid",
    "static_fields" "jsonb" NOT NULL,
    "dynamic_fields" "jsonb" NOT NULL,
    "active_dynamic_fields" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."field_report_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."field_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_id" "uuid",
    "template_id" "uuid",
    "fields" "jsonb" NOT NULL,
    "approach_count" integer,
    "location" "text",
    "tags" "text"[],
    "is_draft" boolean DEFAULT false,
    "reported_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "title" "text",
    "system_template_slug" "text",
    CONSTRAINT "field_reports_template_check" CHECK ((NOT (("template_id" IS NOT NULL) AND ("system_template_slug" IS NOT NULL))))
);


ALTER TABLE "public"."field_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inner_game_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "current_step" integer DEFAULT 0 NOT NULL,
    "current_substep" integer DEFAULT 0,
    "welcome_dismissed" boolean DEFAULT false,
    "step1_completed" boolean DEFAULT false,
    "step2_completed" boolean DEFAULT false,
    "step3_completed" boolean DEFAULT false,
    "cutting_completed" boolean DEFAULT false,
    "hurdles_response" "text",
    "hurdles_inferred_values" "jsonb",
    "deathbed_response" "text",
    "deathbed_inferred_values" "jsonb",
    "final_core_values" "jsonb",
    "aspirational_values" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "values_completed" boolean DEFAULT false,
    "shadow_completed" boolean DEFAULT false,
    "peak_experience_completed" boolean DEFAULT false,
    "hurdles_completed" boolean DEFAULT false,
    "shadow_response" "text",
    "shadow_inferred_values" "jsonb",
    "peak_experience_response" "text",
    "peak_experience_inferred_values" "jsonb"
);


ALTER TABLE "public"."inner_game_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_areas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "icon" "text" DEFAULT 'target'::"text" NOT NULL,
    "hex_color" "text" DEFAULT '#9ca3af'::"text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "is_archived" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."life_areas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "prompt_id" "text" NOT NULL,
    "body" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "life_plan_answers_body_check" CHECK (("char_length"("body") <= 100000)),
    CONSTRAINT "life_plan_answers_kind_check" CHECK (("kind" = ANY (ARRAY['rung'::"text", 'answer'::"text"]))),
    CONSTRAINT "life_plan_answers_prompt_id_check" CHECK ((("char_length"("prompt_id") >= 1) AND ("char_length"("prompt_id") <= 200)))
);


ALTER TABLE "public"."life_plan_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_areas" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "node_kind" "text" DEFAULT 'area'::"text" NOT NULL,
    "position" integer NOT NULL,
    "label" "text" DEFAULT ''::"text" NOT NULL,
    "sublabel" "text" DEFAULT ''::"text" NOT NULL,
    "color" "text" DEFAULT ''::"text" NOT NULL,
    "custom" boolean DEFAULT false NOT NULL,
    "review_ten" "text" DEFAULT ''::"text" NOT NULL,
    "review_purpose" "text" DEFAULT ''::"text" NOT NULL,
    "review_snapshot" "text" DEFAULT ''::"text" NOT NULL,
    "review_blockers" "text" DEFAULT ''::"text" NOT NULL,
    "review_identity" "text" DEFAULT ''::"text" NOT NULL,
    "review_goals_aim" "text",
    CONSTRAINT "life_plan_areas_color_check" CHECK (("char_length"("color") <= 40)),
    CONSTRAINT "life_plan_areas_label_check" CHECK (("char_length"("label") <= 200)),
    CONSTRAINT "life_plan_areas_node_kind_check" CHECK (("node_kind" = 'area'::"text")),
    CONSTRAINT "life_plan_areas_position_check" CHECK (("position" >= 0)),
    CONSTRAINT "life_plan_areas_review_blockers_check" CHECK (("char_length"("review_blockers") <= 20000)),
    CONSTRAINT "life_plan_areas_review_goals_aim_check" CHECK ((("review_goals_aim" IS NULL) OR ("review_goals_aim" = ANY (ARRAY['yes'::"text", 'no'::"text"])))),
    CONSTRAINT "life_plan_areas_review_identity_check" CHECK (("char_length"("review_identity") <= 20000)),
    CONSTRAINT "life_plan_areas_review_purpose_check" CHECK (("char_length"("review_purpose") <= 20000)),
    CONSTRAINT "life_plan_areas_review_snapshot_check" CHECK (("char_length"("review_snapshot") <= 20000)),
    CONSTRAINT "life_plan_areas_review_ten_check" CHECK (("char_length"("review_ten") <= 20000)),
    CONSTRAINT "life_plan_areas_sublabel_check" CHECK (("char_length"("sublabel") <= 400))
);


ALTER TABLE "public"."life_plan_areas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_day_journal" (
    "user_id" "uuid" NOT NULL,
    "day_id" "uuid" NOT NULL,
    "body" "text" DEFAULT ''::"text" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "local_id" "text" NOT NULL,
    "asked" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "life_plan_day_journal_asked_len" CHECK (("char_length"("asked") <= 500)),
    CONSTRAINT "life_plan_day_journal_body_check" CHECK (("char_length"("body") <= 100000)),
    CONSTRAINT "life_plan_day_journal_local_shape" CHECK (((("char_length"("local_id") >= 1) AND ("char_length"("local_id") <= 80)) AND ("local_id" ~ '^[A-Za-z0-9_:.-]+$'::"text")))
);


ALTER TABLE "public"."life_plan_day_journal" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_day_numbers" (
    "user_id" "uuid" NOT NULL,
    "day_id" "uuid" NOT NULL,
    "node_id" "uuid" NOT NULL,
    "value" numeric NOT NULL,
    CONSTRAINT "life_plan_day_numbers_value_check" CHECK ((("value" >= ('-1000000000'::integer)::numeric) AND ("value" <= (1000000000)::numeric)))
);


ALTER TABLE "public"."life_plan_day_numbers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_day_ratings" (
    "user_id" "uuid" NOT NULL,
    "day_id" "uuid" NOT NULL,
    "area_id" "uuid" NOT NULL,
    "rating" smallint NOT NULL,
    CONSTRAINT "life_plan_day_ratings_rating_check" CHECK ((("rating" >= 0) AND ("rating" <= 10)))
);


ALTER TABLE "public"."life_plan_day_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_day_ticks" (
    "user_id" "uuid" NOT NULL,
    "day_id" "uuid" NOT NULL,
    "node_id" "uuid" NOT NULL
);


ALTER TABLE "public"."life_plan_day_ticks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_days" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "on_date" "date" NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "life_plan_days_note_check" CHECK (("char_length"("note") <= 100000))
);


ALTER TABLE "public"."life_plan_days" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_experiences" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "node_kind" "text" DEFAULT 'experience'::"text" NOT NULL,
    "position" integer NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "area_id" "uuid",
    "goal_id" "uuid",
    "done" boolean DEFAULT false NOT NULL,
    "done_on" "date",
    CONSTRAINT "life_plan_experiences_done_shape" CHECK ((("done_on" IS NULL) OR "done")),
    CONSTRAINT "life_plan_experiences_node_kind_check" CHECK (("node_kind" = 'experience'::"text")),
    CONSTRAINT "life_plan_experiences_position_check" CHECK (("position" >= 0)),
    CONSTRAINT "life_plan_experiences_title_check" CHECK (("char_length"("title") <= 500))
);


ALTER TABLE "public"."life_plan_experiences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_fields" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "node_kind" "text" DEFAULT 'field'::"text" NOT NULL,
    "position" integer NOT NULL,
    "label" "text" DEFAULT ''::"text" NOT NULL,
    "kind" "text" DEFAULT 'write'::"text" NOT NULL,
    "target_id" "uuid",
    "read_source_id" "text",
    CONSTRAINT "life_plan_fields_kind_check" CHECK (("kind" = ANY (ARRAY['write'::"text", 'read'::"text", 'go'::"text", 'number'::"text"]))),
    CONSTRAINT "life_plan_fields_label_check" CHECK (("char_length"("label") <= 500)),
    CONSTRAINT "life_plan_fields_node_kind_check" CHECK (("node_kind" = 'field'::"text")),
    CONSTRAINT "life_plan_fields_position_check" CHECK (("position" >= 0)),
    CONSTRAINT "life_plan_fields_read_source_id_check" CHECK ((("read_source_id" IS NULL) OR ("char_length"("read_source_id") <= 200)))
);


ALTER TABLE "public"."life_plan_fields" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_goal_beliefs" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "node_kind" "text" DEFAULT 'belief'::"text" NOT NULL,
    "position" integer NOT NULL,
    "old" "text" DEFAULT ''::"text" NOT NULL,
    "useful" boolean,
    "evidence" "text" DEFAULT ''::"text" NOT NULL,
    "replacement" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "life_plan_goal_beliefs_evidence_check" CHECK (("char_length"("evidence") <= 20000)),
    CONSTRAINT "life_plan_goal_beliefs_node_kind_check" CHECK (("node_kind" = 'belief'::"text")),
    CONSTRAINT "life_plan_goal_beliefs_old_check" CHECK (("char_length"("old") <= 5000)),
    CONSTRAINT "life_plan_goal_beliefs_position_check" CHECK (("position" >= 0)),
    CONSTRAINT "life_plan_goal_beliefs_replacement_check" CHECK (("char_length"("replacement") <= 5000))
);


ALTER TABLE "public"."life_plan_goal_beliefs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_goal_checkpoints" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "node_kind" "text" DEFAULT 'checkpoint'::"text" NOT NULL,
    "position" integer NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "done" boolean DEFAULT false NOT NULL,
    "celebration" "text" DEFAULT ''::"text" NOT NULL,
    "due_on" "date",
    "done_on" "date",
    CONSTRAINT "life_plan_goal_checkpoints_celebration_check" CHECK (("char_length"("celebration") <= 2000)),
    CONSTRAINT "life_plan_goal_checkpoints_days_check" CHECK (((("due_on" IS NULL) OR (("due_on" >= '1900-01-01'::"date") AND ("due_on" <= '2200-12-31'::"date"))) AND (("done_on" IS NULL) OR (("done_on" >= '1900-01-01'::"date") AND ("done_on" <= '2200-12-31'::"date"))))),
    CONSTRAINT "life_plan_goal_checkpoints_node_kind_check" CHECK (("node_kind" = 'checkpoint'::"text")),
    CONSTRAINT "life_plan_goal_checkpoints_position_check" CHECK (("position" >= 0)),
    CONSTRAINT "life_plan_goal_checkpoints_title_check" CHECK (("char_length"("title") <= 500))
);


ALTER TABLE "public"."life_plan_goal_checkpoints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_goal_feeds" (
    "user_id" "uuid" NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "feeds_goal_id" "uuid" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "life_plan_goal_feeds_not_self" CHECK (("goal_id" <> "feeds_goal_id")),
    CONSTRAINT "life_plan_goal_feeds_position_check" CHECK (("position" >= 0))
);


ALTER TABLE "public"."life_plan_goal_feeds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_goal_obstacles" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "node_kind" "text" DEFAULT 'obstacle'::"text" NOT NULL,
    "position" integer NOT NULL,
    "what" "text" DEFAULT ''::"text" NOT NULL,
    "counter" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "life_plan_goal_obstacles_counter_check" CHECK (("char_length"("counter") <= 5000)),
    CONSTRAINT "life_plan_goal_obstacles_node_kind_check" CHECK (("node_kind" = 'obstacle'::"text")),
    CONSTRAINT "life_plan_goal_obstacles_position_check" CHECK (("position" >= 0)),
    CONSTRAINT "life_plan_goal_obstacles_what_check" CHECK (("char_length"("what") <= 5000))
);


ALTER TABLE "public"."life_plan_goal_obstacles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_goal_serves" (
    "user_id" "uuid" NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "area_id" "uuid" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "life_plan_goal_serves_position_check" CHECK (("position" >= 0))
);


ALTER TABLE "public"."life_plan_goal_serves" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_goals" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "node_kind" "text" DEFAULT 'goal'::"text" NOT NULL,
    "position" integer NOT NULL,
    "priority_rank" integer DEFAULT 0 NOT NULL,
    "area_id" "uuid",
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "goal_type" "text" DEFAULT 'achievement'::"text" NOT NULL,
    "why" "text" DEFAULT ''::"text" NOT NULL,
    "pain_why" "text" DEFAULT ''::"text" NOT NULL,
    "sentence" "text" DEFAULT ''::"text" NOT NULL,
    "feeling" "text" DEFAULT ''::"text" NOT NULL,
    "reward" "text" DEFAULT ''::"text" NOT NULL,
    "stake" "text" DEFAULT ''::"text" NOT NULL,
    "unit" "text" DEFAULT ''::"text" NOT NULL,
    "target_date" "date",
    "belief_level" smallint,
    "desire_level" smallint,
    "days_per_week" smallint DEFAULT 0 NOT NULL,
    "per_week" numeric,
    "is_abstinence" boolean DEFAULT false NOT NULL,
    "metric" "text",
    "ladder" "jsonb",
    "ramp_steps" "jsonb",
    "reasons_list" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "asked" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "timeframe" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "status_on" "date",
    CONSTRAINT "life_plan_goals_belief_level_check" CHECK ((("belief_level" IS NULL) OR (("belief_level" >= 0) AND ("belief_level" <= 10)))),
    CONSTRAINT "life_plan_goals_days_per_week_check" CHECK ((("days_per_week" >= 0) AND ("days_per_week" <= 7))),
    CONSTRAINT "life_plan_goals_desire_level_check" CHECK ((("desire_level" IS NULL) OR (("desire_level" >= 0) AND ("desire_level" <= 10)))),
    CONSTRAINT "life_plan_goals_feeling_check" CHECK (("char_length"("feeling") <= 20000)),
    CONSTRAINT "life_plan_goals_goal_type_check" CHECK (("goal_type" = ANY (ARRAY['milestone_ladder'::"text", 'habit_ramp'::"text", 'achievement'::"text"]))),
    CONSTRAINT "life_plan_goals_ladder_check" CHECK ((("ladder" IS NULL) OR ("jsonb_typeof"("ladder") = 'object'::"text"))),
    CONSTRAINT "life_plan_goals_metric_check" CHECK ((("metric" IS NULL) OR ("metric" = 'daily_area'::"text"))),
    CONSTRAINT "life_plan_goals_node_kind_check" CHECK (("node_kind" = 'goal'::"text")),
    CONSTRAINT "life_plan_goals_pain_why_check" CHECK (("char_length"("pain_why") <= 20000)),
    CONSTRAINT "life_plan_goals_per_week_check" CHECK ((("per_week" IS NULL) OR ("per_week" >= (0)::numeric))),
    CONSTRAINT "life_plan_goals_position_check" CHECK (("position" >= 0)),
    CONSTRAINT "life_plan_goals_priority_rank_check" CHECK (("priority_rank" >= 0)),
    CONSTRAINT "life_plan_goals_ramp_steps_check" CHECK ((("ramp_steps" IS NULL) OR ("jsonb_typeof"("ramp_steps") = 'array'::"text"))),
    CONSTRAINT "life_plan_goals_reward_check" CHECK (("char_length"("reward") <= 20000)),
    CONSTRAINT "life_plan_goals_sentence_check" CHECK (("char_length"("sentence") <= 20000)),
    CONSTRAINT "life_plan_goals_stake_check" CHECK (("char_length"("stake") <= 20000)),
    CONSTRAINT "life_plan_goals_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'achieved'::"text", 'paused'::"text", 'dropped'::"text"]))),
    CONSTRAINT "life_plan_goals_status_on_check" CHECK ((("status_on" IS NULL) OR (("status_on" >= '1900-01-01'::"date") AND ("status_on" <= '2200-12-31'::"date")))),
    CONSTRAINT "life_plan_goals_timeframe_check" CHECK ((("timeframe" IS NULL) OR ("timeframe" = ANY (ARRAY['1m'::"text", '90d'::"text", '1y'::"text", '3y'::"text", '5y'::"text", '10y'::"text", '20y'::"text"])))),
    CONSTRAINT "life_plan_goals_title_check" CHECK (("char_length"("title") <= 500)),
    CONSTRAINT "life_plan_goals_unit_check" CHECK (("char_length"("unit") <= 100)),
    CONSTRAINT "life_plan_goals_why_check" CHECK (("char_length"("why") <= 20000))
);


ALTER TABLE "public"."life_plan_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_nodes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "local_id" "text" NOT NULL,
    CONSTRAINT "life_plan_nodes_kind_check" CHECK (("kind" = ANY (ARRAY['north_star'::"text", 'area'::"text", 'goal'::"text", 'checkpoint'::"text", 'obstacle'::"text", 'belief'::"text", 'habit'::"text", 'routine'::"text", 'routine_step'::"text", 'split_day'::"text", 'experience'::"text", 'field'::"text", 'sub_step'::"text", 'season'::"text", 'review'::"text"]))),
    CONSTRAINT "life_plan_nodes_local_id_check" CHECK (((("char_length"("local_id") >= 1) AND ("char_length"("local_id") <= 80)) AND ("local_id" ~ '^[A-Za-z0-9_:.-]+$'::"text")))
);


ALTER TABLE "public"."life_plan_nodes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_north_stars" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "node_kind" "text" DEFAULT 'north_star'::"text" NOT NULL,
    "text" "text" DEFAULT ''::"text" NOT NULL,
    "horizon_years" smallint DEFAULT 10 NOT NULL,
    "started_on" "date" DEFAULT CURRENT_DATE NOT NULL,
    "ended_on" "date",
    "purpose" "text" DEFAULT ''::"text" NOT NULL,
    "identity" "text" DEFAULT ''::"text" NOT NULL,
    "conduct" "text" DEFAULT ''::"text" NOT NULL,
    "become" "text" DEFAULT ''::"text" NOT NULL,
    "affirmations" "text" DEFAULT ''::"text" NOT NULL,
    "commitment" "text" DEFAULT ''::"text" NOT NULL,
    "committed_on" "date",
    CONSTRAINT "life_plan_north_stars_affirmations_check" CHECK (("char_length"("affirmations") <= 100000)),
    CONSTRAINT "life_plan_north_stars_become_check" CHECK (("char_length"("become") <= 100000)),
    CONSTRAINT "life_plan_north_stars_commitment_check" CHECK (("char_length"("commitment") <= 100000)),
    CONSTRAINT "life_plan_north_stars_conduct_check" CHECK (("char_length"("conduct") <= 100000)),
    CONSTRAINT "life_plan_north_stars_dates" CHECK ((("ended_on" IS NULL) OR ("ended_on" >= "started_on"))),
    CONSTRAINT "life_plan_north_stars_horizon_years_check" CHECK (("horizon_years" = ANY (ARRAY[5, 10, 20]))),
    CONSTRAINT "life_plan_north_stars_identity_check" CHECK (("char_length"("identity") <= 100000)),
    CONSTRAINT "life_plan_north_stars_node_kind_check" CHECK (("node_kind" = 'north_star'::"text")),
    CONSTRAINT "life_plan_north_stars_purpose_check" CHECK (("char_length"("purpose") <= 100000)),
    CONSTRAINT "life_plan_north_stars_text_check" CHECK (("char_length"("text") <= 20000))
);


ALTER TABLE "public"."life_plan_north_stars" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_reminders" (
    "user_id" "uuid" NOT NULL,
    "push_on" boolean DEFAULT false NOT NULL,
    "review_day" smallint DEFAULT 7 NOT NULL,
    "review_hour" smallint DEFAULT 19 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "life_plan_reminders_review_day_check" CHECK ((("review_day" >= 1) AND ("review_day" <= 7))),
    CONSTRAINT "life_plan_reminders_review_hour_check" CHECK ((("review_hour" >= 6) AND ("review_hour" <= 22)))
);


ALTER TABLE "public"."life_plan_reminders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_review_goals" (
    "user_id" "uuid" NOT NULL,
    "review_id" "uuid" NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "verdict" "text" NOT NULL,
    CONSTRAINT "life_plan_review_goals_verdict_check" CHECK (("verdict" = ANY (ARRAY['on_track'::"text", 'behind'::"text", 'change'::"text"])))
);


ALTER TABLE "public"."life_plan_review_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_review_scores" (
    "user_id" "uuid" NOT NULL,
    "review_id" "uuid" NOT NULL,
    "area_id" "uuid" NOT NULL,
    "score" smallint NOT NULL,
    "scored_on" "date",
    CONSTRAINT "life_plan_review_scores_score_check" CHECK ((("score" >= 0) AND ("score" <= 10))),
    CONSTRAINT "life_plan_review_scores_scored_on_check" CHECK ((("scored_on" IS NULL) OR (("scored_on" >= '1900-01-01'::"date") AND ("scored_on" <= '2200-12-31'::"date"))))
);


ALTER TABLE "public"."life_plan_review_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_reviews" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "node_kind" "text" DEFAULT 'review'::"text" NOT NULL,
    "cadence" "text" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "written_on" "date" DEFAULT CURRENT_DATE NOT NULL,
    "magic_moments" "text" DEFAULT ''::"text" NOT NULL,
    "lessons" "text" DEFAULT ''::"text" NOT NULL,
    "next_outcomes" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "life_plan_reviews_cadence_check" CHECK (("cadence" = ANY (ARRAY['week'::"text", 'fortnight'::"text", 'month'::"text", 'quarter'::"text", 'year'::"text"]))),
    CONSTRAINT "life_plan_reviews_dates" CHECK ((("period_end" >= "period_start") AND ("period_start" >= '1900-01-01'::"date") AND ("period_end" <= '2200-12-31'::"date"))),
    CONSTRAINT "life_plan_reviews_lessons_check" CHECK (("char_length"("lessons") <= 100000)),
    CONSTRAINT "life_plan_reviews_magic_moments_check" CHECK (("char_length"("magic_moments") <= 100000)),
    CONSTRAINT "life_plan_reviews_next_outcomes_check" CHECK (("char_length"("next_outcomes") <= 100000)),
    CONSTRAINT "life_plan_reviews_node_kind_check" CHECK (("node_kind" = 'review'::"text"))
);


ALTER TABLE "public"."life_plan_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_routine_serves" (
    "user_id" "uuid" NOT NULL,
    "routine_id" "uuid" NOT NULL,
    "area_id" "uuid" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "life_plan_routine_serves_position_check" CHECK (("position" >= 0))
);


ALTER TABLE "public"."life_plan_routine_serves" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_routine_split_days" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "routine_id" "uuid" NOT NULL,
    "node_kind" "text" DEFAULT 'split_day'::"text" NOT NULL,
    "position" integer NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "life_plan_routine_split_days_name_check" CHECK (("char_length"("name") <= 200)),
    CONSTRAINT "life_plan_routine_split_days_node_kind_check" CHECK (("node_kind" = 'split_day'::"text")),
    CONSTRAINT "life_plan_routine_split_days_position_check" CHECK (("position" >= 0))
);


ALTER TABLE "public"."life_plan_routine_split_days" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_routine_steps" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "routine_id" "uuid" NOT NULL,
    "node_kind" "text" DEFAULT 'routine_step'::"text" NOT NULL,
    "position" integer NOT NULL,
    "library_step_id" "text",
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "minutes" smallint DEFAULT 0 NOT NULL,
    "days_per_week" smallint DEFAULT 0 NOT NULL,
    "dimension" "text",
    "days" smallint[] DEFAULT '{}'::smallint[] NOT NULL,
    "start_min" smallint,
    "goes_to" "text",
    "goes_to_set" boolean DEFAULT false NOT NULL,
    "asks" "text",
    "asks_set" boolean DEFAULT false NOT NULL,
    CONSTRAINT "life_plan_routine_steps_asks_check" CHECK ((("asks" IS NULL) OR ("char_length"("asks") <= 2000))),
    CONSTRAINT "life_plan_routine_steps_asks_shape" CHECK ((("asks" IS NULL) OR "asks_set")),
    CONSTRAINT "life_plan_routine_steps_days_per_week_check" CHECK ((("days_per_week" >= 0) AND ("days_per_week" <= 7))),
    CONSTRAINT "life_plan_routine_steps_dimension_check" CHECK ((("dimension" IS NULL) OR ("dimension" = ANY (ARRAY['mind'::"text", 'body'::"text", 'spirit'::"text"])))),
    CONSTRAINT "life_plan_routine_steps_goes_to_check" CHECK ((("goes_to" IS NULL) OR ("char_length"("goes_to") <= 200))),
    CONSTRAINT "life_plan_routine_steps_goes_to_shape" CHECK ((("goes_to" IS NULL) OR "goes_to_set")),
    CONSTRAINT "life_plan_routine_steps_library_step_id_check" CHECK ((("library_step_id" IS NULL) OR ("char_length"("library_step_id") <= 120))),
    CONSTRAINT "life_plan_routine_steps_minutes_check" CHECK ((("minutes" >= 0) AND ("minutes" <= 1440))),
    CONSTRAINT "life_plan_routine_steps_node_kind_check" CHECK (("node_kind" = 'routine_step'::"text")),
    CONSTRAINT "life_plan_routine_steps_position_check" CHECK (("position" >= 0)),
    CONSTRAINT "life_plan_routine_steps_start_min_check" CHECK ((("start_min" IS NULL) OR (("start_min" >= 0) AND ("start_min" <= 1439)))),
    CONSTRAINT "life_plan_routine_steps_title_check" CHECK (("char_length"("title") <= 500))
);


ALTER TABLE "public"."life_plan_routine_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_routines" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "node_kind" "text" DEFAULT 'routine'::"text" NOT NULL,
    "position" integer NOT NULL,
    "label" "text" DEFAULT ''::"text" NOT NULL,
    "blueprint_id" "text" DEFAULT ''::"text" NOT NULL,
    "kind" "text" DEFAULT 'sequence'::"text" NOT NULL,
    "area_id" "uuid",
    "days_per_week" smallint DEFAULT 0 NOT NULL,
    "enrollment_id" "uuid",
    CONSTRAINT "life_plan_routines_blueprint_id_check" CHECK (("char_length"("blueprint_id") <= 120)),
    CONSTRAINT "life_plan_routines_days_per_week_check" CHECK ((("days_per_week" >= 0) AND ("days_per_week" <= 7))),
    CONSTRAINT "life_plan_routines_kind_check" CHECK (("kind" = ANY (ARRAY['sequence'::"text", 'weekly'::"text"]))),
    CONSTRAINT "life_plan_routines_label_check" CHECK (("char_length"("label") <= 200)),
    CONSTRAINT "life_plan_routines_node_kind_check" CHECK (("node_kind" = 'routine'::"text")),
    CONSTRAINT "life_plan_routines_position_check" CHECK (("position" >= 0))
);


ALTER TABLE "public"."life_plan_routines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_season_areas" (
    "user_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "area_id" "uuid" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "life_plan_season_areas_position_check" CHECK (("position" >= 0))
);


ALTER TABLE "public"."life_plan_season_areas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_season_goals" (
    "user_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "life_plan_season_goals_position_check" CHECK (("position" >= 0))
);


ALTER TABLE "public"."life_plan_season_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_seasons" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "node_kind" "text" DEFAULT 'season'::"text" NOT NULL,
    "started_on" "date" DEFAULT CURRENT_DATE NOT NULL,
    "ends_on" "date",
    "ended_on" "date",
    "sentence" "text" DEFAULT ''::"text" NOT NULL,
    "why" "text" DEFAULT ''::"text" NOT NULL,
    "cost" "text" DEFAULT ''::"text" NOT NULL,
    "identity" "text" DEFAULT ''::"text" NOT NULL,
    "values_note" "text" DEFAULT ''::"text" NOT NULL,
    "areas_note" "text" DEFAULT ''::"text" NOT NULL,
    "focus_id" "uuid",
    CONSTRAINT "life_plan_seasons_areas_note_check" CHECK (("char_length"("areas_note") <= 100000)),
    CONSTRAINT "life_plan_seasons_cost_check" CHECK (("char_length"("cost") <= 100000)),
    CONSTRAINT "life_plan_seasons_dates" CHECK (((("ends_on" IS NULL) OR ("ends_on" >= "started_on")) AND (("ended_on" IS NULL) OR ("ended_on" >= "started_on")))),
    CONSTRAINT "life_plan_seasons_identity_check" CHECK (("char_length"("identity") <= 100000)),
    CONSTRAINT "life_plan_seasons_node_kind_check" CHECK (("node_kind" = 'season'::"text")),
    CONSTRAINT "life_plan_seasons_sentence_check" CHECK (("char_length"("sentence") <= 2000)),
    CONSTRAINT "life_plan_seasons_values_note_check" CHECK (("char_length"("values_note") <= 100000)),
    CONSTRAINT "life_plan_seasons_why_check" CHECK (("char_length"("why") <= 100000))
);


ALTER TABLE "public"."life_plan_seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_step_serves" (
    "user_id" "uuid" NOT NULL,
    "step_id" "uuid" NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "life_plan_step_serves_position_check" CHECK (("position" >= 0))
);


ALTER TABLE "public"."life_plan_step_serves" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_sub_steps" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "node_kind" "text" DEFAULT 'sub_step'::"text" NOT NULL,
    "position" integer NOT NULL,
    "target_id" "uuid" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "life_plan_sub_steps_node_kind_check" CHECK (("node_kind" = 'sub_step'::"text")),
    CONSTRAINT "life_plan_sub_steps_position_check" CHECK (("position" >= 0)),
    CONSTRAINT "life_plan_sub_steps_title_check" CHECK (("char_length"("title") <= 500))
);


ALTER TABLE "public"."life_plan_sub_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plan_values" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "scope" "text" NOT NULL,
    "value" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "area_id" "uuid",
    "goal_id" "uuid",
    CONSTRAINT "life_plan_values_position_check" CHECK (("position" >= 0)),
    CONSTRAINT "life_plan_values_scope_check" CHECK (("scope" = ANY (ARRAY['past'::"text", 'chosen'::"text", 'area'::"text", 'goal'::"text"]))),
    CONSTRAINT "life_plan_values_scope_shape" CHECK (((("scope" = 'area'::"text") AND ("area_id" IS NOT NULL) AND ("goal_id" IS NULL)) OR (("scope" = 'goal'::"text") AND ("goal_id" IS NOT NULL) AND ("area_id" IS NULL)) OR (("scope" = ANY (ARRAY['past'::"text", 'chosen'::"text"])) AND ("area_id" IS NULL) AND ("goal_id" IS NULL)))),
    CONSTRAINT "life_plan_values_value_check" CHECK ((("char_length"("btrim"("value")) >= 1) AND ("char_length"("btrim"("value")) <= 200)))
);


ALTER TABLE "public"."life_plan_values" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."life_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "revision" integer DEFAULT 0 NOT NULL,
    "seq" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "life_plans_revision_check" CHECK (("revision" >= 0)),
    CONSTRAINT "life_plans_seq_check" CHECK (("seq" >= 0)),
    CONSTRAINT "life_plans_version_check" CHECK ((("version" >= 1) AND ("version" <= 1000)))
);


ALTER TABLE "public"."life_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."milestones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "milestone_type" "text" NOT NULL,
    "achieved_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "value" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "session_id" "uuid"
);


ALTER TABLE "public"."milestones" OWNER TO "postgres";


COMMENT ON TABLE "public"."milestones" IS 'Achievements. System-only writes: awarded by the server from the user''s own rows (src/tracking/achievementsSyncService.ts). Insert-only — a badge earned is never revoked.';



CREATE TABLE IF NOT EXISTS "public"."notification_sends" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "devices" smallint DEFAULT 0 NOT NULL,
    "delivered" smallint DEFAULT 0 NOT NULL,
    "removed" smallint DEFAULT 0 NOT NULL,
    "entry_id" "text",
    CONSTRAINT "notification_sends_delivered_check" CHECK (("delivered" >= 0)),
    CONSTRAINT "notification_sends_devices_check" CHECK (("devices" >= 0)),
    CONSTRAINT "notification_sends_entry_id_check" CHECK ((("entry_id" IS NULL) OR ("length"("entry_id") <= 200))),
    CONSTRAINT "notification_sends_kind_check" CHECK (("kind" = ANY (ARRAY['test'::"text", 'timetrack-running'::"text", 'timetrack-alert'::"text", 'audit-ping'::"text", 'audit-end'::"text", 'plan-review'::"text", 'council-daily'::"text"]))),
    CONSTRAINT "notification_sends_removed_check" CHECK (("removed" >= 0))
);


ALTER TABLE "public"."notification_sends" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nutrition_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "quality_score" smallint NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "protein_g" numeric(5,1),
    "logged_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "calories" integer,
    CONSTRAINT "nutrition_logs_calories_check" CHECK ((("calories" IS NULL) OR (("calories" > 0) AND ("calories" < 10000)))),
    CONSTRAINT "nutrition_logs_quality_score_check" CHECK ((("quality_score" >= 1) AND ("quality_score" <= 5)))
);


ALTER TABLE "public"."nutrition_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "has_purchased" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "difficulty" "text" DEFAULT 'beginner'::"text",
    "age" integer,
    "archetype" "text",
    "level" integer DEFAULT 1,
    "xp" integer DEFAULT 0,
    "scenarios_completed" integer DEFAULT 0,
    "age_range_start" integer,
    "age_range_end" integer,
    "speaks_home_language" boolean,
    "dating_foreigners" boolean,
    "ethnicity" "text",
    "user_is_foreign" boolean DEFAULT false,
    "preferred_region" "text",
    "experience_level" "text",
    "primary_goal" "text",
    "secondary_region" "text",
    "secondary_archetype" "text",
    "tertiary_archetype" "text",
    "voice_language" "text" DEFAULT 'en-US'::"text",
    "preferred_language" "text",
    "timezone" "text" DEFAULT 'UTC'::"text" NOT NULL,
    "week_start_day" smallint DEFAULT 1 NOT NULL,
    "curve_style" "text" DEFAULT 'zen'::"text" NOT NULL,
    "sandbox_settings" "jsonb",
    "subscription_cancelled_at" timestamp with time zone,
    "weight_unit" "text" DEFAULT 'kg'::"text" NOT NULL,
    "bar_weight_kg" numeric(5,2) DEFAULT 20 NOT NULL,
    "smallest_plate_kg" numeric(5,2) DEFAULT 1.25 NOT NULL,
    "timezone_source" "text" DEFAULT 'signup_default'::"text" NOT NULL,
    CONSTRAINT "profiles_bar_weight" CHECK ((("bar_weight_kg" >= (0)::numeric) AND ("bar_weight_kg" <= (50)::numeric))),
    CONSTRAINT "profiles_smallest_plate" CHECK ((("smallest_plate_kg" >= 0.25) AND ("smallest_plate_kg" <= (25)::numeric))),
    CONSTRAINT "profiles_timezone_source_check" CHECK (("timezone_source" = ANY (ARRAY['signup_default'::"text", 'detected'::"text", 'chosen'::"text"]))),
    CONSTRAINT "profiles_weight_unit" CHECK (("weight_unit" = ANY (ARRAY['kg'::"text", 'lb'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."sandbox_settings" IS 'Per-user scenario sandbox preferences. Merged over DEFAULT_SANDBOX_SETTINGS in src/scenarios/config.';



COMMENT ON COLUMN "public"."profiles"."subscription_cancelled_at" IS 'When the user asked to cancel. Access is still governed by has_purchased, never by this column.';



COMMENT ON COLUMN "public"."profiles"."timezone_source" IS 'Where profiles.timezone came from: signup_default (nobody has said — "today" is a guess and screens say so), detected (the browser, unasked), chosen (typed into Settings). Written only by settingsRepo.updateTimezone and by handle_new_user.';



CREATE TABLE IF NOT EXISTS "public"."program_drafts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "discipline" "text" DEFAULT 'strength'::"text" NOT NULL,
    "unit_system" "text" DEFAULT 'kg'::"text" NOT NULL,
    "schedule" "jsonb" DEFAULT '{"days": [], "kind": "linear_rotation"}'::"jsonb" NOT NULL,
    "working_weights" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "source" "text" DEFAULT 'built'::"text" NOT NULL,
    "source_program_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "program_drafts_discipline_check" CHECK (("discipline" = ANY (ARRAY['strength'::"text", 'bodybuilding'::"text", 'calisthenics'::"text", 'cardio'::"text", 'flexibility'::"text", 'triathlon'::"text", 'ironman'::"text"]))),
    CONSTRAINT "program_drafts_name_check" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 60))),
    CONSTRAINT "program_drafts_schedule_shape" CHECK ((("jsonb_typeof"("schedule") = 'object'::"text") AND ("jsonb_typeof"(("schedule" -> 'days'::"text")) = 'array'::"text") AND ("schedule" ? 'kind'::"text"))),
    CONSTRAINT "program_drafts_source_check" CHECK (("source" = ANY (ARRAY['built'::"text", 'catalog'::"text", 'saved_workout'::"text"]))),
    CONSTRAINT "program_drafts_source_program_id_check" CHECK ((("source_program_id" IS NULL) OR (("char_length"("source_program_id") >= 1) AND ("char_length"("source_program_id") <= 80)))),
    CONSTRAINT "program_drafts_unit_system_check" CHECK (("unit_system" = ANY (ARRAY['kg'::"text", 'lb'::"text"]))),
    CONSTRAINT "program_drafts_weights_shape" CHECK (("jsonb_typeof"("working_weights") = 'object'::"text"))
);


ALTER TABLE "public"."program_drafts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."program_enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "program_id" "text" NOT NULL,
    "level" "text" NOT NULL,
    "unit_system" "text" NOT NULL,
    "exercise_state" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "cursor" "jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "custom_schedule" "jsonb",
    "initial_exercise_state" "jsonb",
    "replay_events" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "bar_weight_kg" numeric(5,2),
    "label" "text",
    "spec" "jsonb",
    "spec_version" integer,
    "started_on" "date",
    "maxes" "jsonb",
    CONSTRAINT "program_enrollments_bar_weight_sane" CHECK ((("bar_weight_kg" IS NULL) OR (("bar_weight_kg" >= (0)::numeric) AND ("bar_weight_kg" <= (50)::numeric)))),
    CONSTRAINT "program_enrollments_label_length" CHECK ((("label" IS NULL) OR (("char_length"("label") >= 1) AND ("char_length"("label") <= 60)))),
    CONSTRAINT "program_enrollments_level_check" CHECK (("level" = ANY (ARRAY['beginner'::"text", 'intermediate'::"text", 'advanced'::"text"]))),
    CONSTRAINT "program_enrollments_maxes_shape" CHECK ((("maxes" IS NULL) OR (("jsonb_typeof"("maxes") = 'object'::"text") AND ("octet_length"(("maxes")::"text") <= 8192)))),
    CONSTRAINT "program_enrollments_spec_shape" CHECK ((("spec" IS NULL) OR (("jsonb_typeof"("spec") = 'object'::"text") AND ("octet_length"(("spec")::"text") <= 65536)))),
    CONSTRAINT "program_enrollments_spec_version" CHECK (((("spec" IS NULL) = ("spec_version" IS NULL)) AND (("spec_version" IS NULL) OR (("spec_version" >= 2) AND ("spec_version" <= 999))))),
    CONSTRAINT "program_enrollments_unit_system_check" CHECK (("unit_system" = ANY (ARRAY['kg'::"text", 'lb'::"text"])))
);


ALTER TABLE "public"."program_enrollments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."program_enrollments"."custom_schedule" IS 'The user''s edited ProgramSchedule, or NULL to follow the catalog program. Copy-on-write: set whole on first edit.';



COMMENT ON COLUMN "public"."program_enrollments"."initial_exercise_state" IS 'The state this enrollment started from — what the person typed at enrolment. Replay folds history over THIS, never over the catalogue''s defaults.';



COMMENT ON COLUMN "public"."program_enrollments"."replay_events" IS 'Everything that changed this program''s state and was not a logged workout: a skipped session, a reset, a weight set by hand, and the schedule it started with plus every edit since. Replay folds these over initial_exercise_state, so a correction cannot undo them.';



COMMENT ON COLUMN "public"."program_enrollments"."bar_weight_kg" IS 'The bar this program is trained on, in kg. NULL follows the account default. A 15 kg or 10 kg bar is a real bar.';



COMMENT ON COLUMN "public"."program_enrollments"."spec" IS 'The program this enrollment runs, in the program format, copied at start. Null on rows started before the format: those run the catalogue program converted on read.';



COMMENT ON COLUMN "public"."program_enrollments"."started_on" IS 'The first day of the program on the account''s calendar. Programs whose weeks run by the calendar count from the Monday of this date''s week.';



COMMENT ON COLUMN "public"."program_enrollments"."maxes" IS 'The maxes the program was started with, by lift, as typed. The numbers the program moves are in exercise_state.';



CREATE TABLE IF NOT EXISTS "public"."program_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "spec" "jsonb" NOT NULL,
    "spec_version" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "program_versions_spec_shape" CHECK ((("jsonb_typeof"("spec") = 'object'::"text") AND ("octet_length"(("spec")::"text") <= 65536))),
    CONSTRAINT "program_versions_spec_version_check" CHECK ((("spec_version" >= 2) AND ("spec_version" <= 999))),
    CONSTRAINT "program_versions_version_check" CHECK ((("version" >= 1) AND ("version" <= 10000)))
);


ALTER TABLE "public"."program_versions" OWNER TO "postgres";


COMMENT ON TABLE "public"."program_versions" IS 'Every version of a running program''s spec, numbered from 1 at start. A replay judges each session against the version in force when it was logged (Q14).';



CREATE TABLE IF NOT EXISTS "public"."purchases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_session_id" "text",
    "product_id" "text" NOT NULL,
    "amount_cents" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "stripe_subscription_id" "text",
    "subscription_status" "text" DEFAULT 'active'::"text"
);


ALTER TABLE "public"."purchases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "label" "text" DEFAULT ''::"text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "failures" smallint DEFAULT 0 NOT NULL,
    "last_success_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "timer_running" boolean DEFAULT false NOT NULL,
    CONSTRAINT "push_devices_auth_check" CHECK ((("length"("auth") >= 1) AND ("length"("auth") <= 100))),
    CONSTRAINT "push_devices_endpoint_check" CHECK ((("endpoint" ~~ 'https://%'::"text") AND ("length"("endpoint") <= 1000))),
    CONSTRAINT "push_devices_failures_check" CHECK (("failures" >= 0)),
    CONSTRAINT "push_devices_label_check" CHECK (("length"("label") <= 80)),
    CONSTRAINT "push_devices_p256dh_check" CHECK ((("length"("p256dh") >= 1) AND ("length"("p256dh") <= 200)))
);


ALTER TABLE "public"."push_devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "estimated_minutes" integer,
    "review_type" "text" NOT NULL,
    "is_system" boolean DEFAULT false,
    "base_template_id" "uuid",
    "static_fields" "jsonb" NOT NULL,
    "dynamic_fields" "jsonb" NOT NULL,
    "active_dynamic_fields" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."review_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "review_type" "text" NOT NULL,
    "template_id" "uuid",
    "fields" "jsonb" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "previous_commitment" "text",
    "commitment_fulfilled" boolean,
    "new_commitment" "text",
    "is_draft" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scenarios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "difficulty" "text",
    "archetype" "text",
    "scenario_type" "text",
    "score" integer,
    "feedback" "text",
    "xp_earned" integer DEFAULT 0,
    "completed_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "scenarios_score_range" CHECK ((("score" IS NULL) OR (("score" >= 1) AND ("score" <= 10))))
);


ALTER TABLE "public"."scenarios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "goal" integer,
    "goal_met" boolean DEFAULT false,
    "total_approaches" integer DEFAULT 0,
    "duration_minutes" integer,
    "primary_location" "text",
    "location_data" "jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "session_focus" "text",
    "technique_focus" "text",
    "if_then_plan" "text",
    "custom_intention" "text",
    "pre_session_mood" integer,
    "with_wingman" boolean DEFAULT false,
    "wingman_name" "text",
    "end_reason" "text",
    CONSTRAINT "sessions_end_reason_check" CHECK (("end_reason" = ANY (ARRAY['completed'::"text", 'abandoned'::"text"]))),
    CONSTRAINT "sessions_pre_session_mood_check" CHECK ((("pre_session_mood" >= 1) AND ("pre_session_mood" <= 5)))
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sessions"."session_focus" IS 'User-defined focus for the session, e.g., "Be more playful"';



COMMENT ON COLUMN "public"."sessions"."technique_focus" IS 'Specific technique being practiced, e.g., "Cold reads"';



COMMENT ON COLUMN "public"."sessions"."if_then_plan" IS 'Implementation intention, e.g., "If X happens, I will Y"';



COMMENT ON COLUMN "public"."sessions"."custom_intention" IS 'Any other user-defined intention or note';



COMMENT ON COLUMN "public"."sessions"."pre_session_mood" IS 'Mood before session (1-5 scale)';



COMMENT ON COLUMN "public"."sessions"."with_wingman" IS 'Whether the session was done with a wingman';



COMMENT ON COLUMN "public"."sessions"."wingman_name" IS 'Name of the wingman if applicable';



CREATE TABLE IF NOT EXISTS "public"."sleep_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "bedtime" timestamp with time zone NOT NULL,
    "wake_time" timestamp with time zone NOT NULL,
    "quality" smallint DEFAULT 3 NOT NULL,
    "logged_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sleep_logs_quality_check" CHECK ((("quality" >= 1) AND ("quality" <= 5)))
);


ALTER TABLE "public"."sleep_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sticking_points" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'active'::"text",
    "occurrence_count" integer DEFAULT 0,
    "resolved_at" timestamp with time zone,
    "resolution_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sticking_points" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetrack_alert_events" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "text" NOT NULL,
    "basis" "text" NOT NULL,
    "threshold" integer NOT NULL,
    "period_start" "date" NOT NULL,
    "fired_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "acknowledged_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "read" boolean DEFAULT false NOT NULL,
    CONSTRAINT "timetrack_alert_events_basis_check" CHECK (("basis" = ANY (ARRAY['estimate'::"text", 'fixed_fee'::"text"])))
);


ALTER TABLE "public"."timetrack_alert_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetrack_approvals" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workspace_id" "text" NOT NULL,
    "period_start" "date",
    "period_end" "date",
    "status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "note" "text",
    "submitted_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "member_id" "text",
    "week_start" "date",
    "decided_at" timestamp with time zone,
    CONSTRAINT "timetrack_approvals_period_ordered" CHECK (("period_end" >= "period_start")),
    CONSTRAINT "timetrack_approvals_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'submitted'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."timetrack_approvals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetrack_autotracker_rules" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workspace_id" "text" NOT NULL,
    "match_text" "text" NOT NULL,
    "project_id" "text",
    "task_id" "text",
    "description" "text",
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "tag_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    CONSTRAINT "timetrack_autotracker_match_not_blank" CHECK (("length"("btrim"("match_text")) > 0))
);


ALTER TABLE "public"."timetrack_autotracker_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetrack_calendars" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workspace_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "source" "text" NOT NULL,
    "ref" "text" DEFAULT ''::"text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "last_synced_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "color" "text" DEFAULT '#6b7280'::"text" NOT NULL,
    CONSTRAINT "timetrack_calendars_name_not_blank" CHECK (("length"("btrim"("name")) > 0)),
    CONSTRAINT "timetrack_calendars_source_check" CHECK (("source" = ANY (ARRAY['ics_url'::"text", 'ics_file'::"text", 'google_api'::"text"])))
);


ALTER TABLE "public"."timetrack_calendars" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetrack_clients" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workspace_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "archived" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "timetrack_clients_name_not_blank" CHECK (("length"("btrim"("name")) > 0))
);


ALTER TABLE "public"."timetrack_clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetrack_entries" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workspace_id" "text" NOT NULL,
    "project_id" "text",
    "task_id" "text",
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "billable" boolean DEFAULT false NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "stopped_at" timestamp with time zone,
    "duration_seconds" integer,
    "duration_only" boolean DEFAULT false NOT NULL,
    "created_with" "text" DEFAULT 'web'::"text" NOT NULL,
    "source_event_id" "text",
    "running_device_id" "text",
    "shared_with" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "timetrack_entries_duration_matches_stop" CHECK ((("stopped_at" IS NULL) OR ("duration_seconds" IS NOT NULL))),
    CONSTRAINT "timetrack_entries_duration_seconds_check" CHECK ((("duration_seconds" IS NULL) OR ("duration_seconds" >= 0))),
    CONSTRAINT "timetrack_entries_stop_after_start" CHECK ((("stopped_at" IS NULL) OR ("stopped_at" >= "started_at")))
);


ALTER TABLE "public"."timetrack_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetrack_entry_tags" (
    "entry_id" "text" NOT NULL,
    "tag_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."timetrack_entry_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetrack_favorites" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workspace_id" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "project_id" "text",
    "task_id" "text",
    "billable" boolean DEFAULT false NOT NULL,
    "tag_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."timetrack_favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetrack_project_alerts" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "text" NOT NULL,
    "basis" "text" NOT NULL,
    "threshold" integer NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "timetrack_project_alerts_basis_check" CHECK (("basis" = ANY (ARRAY['estimate'::"text", 'fixed_fee'::"text"]))),
    CONSTRAINT "timetrack_project_alerts_threshold_check" CHECK ((("threshold" >= 1) AND ("threshold" <= 500)))
);


ALTER TABLE "public"."timetrack_project_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetrack_project_rates" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "text" NOT NULL,
    "rate" numeric(12,2) NOT NULL,
    "effective_from" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "timetrack_project_rates_rate_check" CHECK (("rate" >= (0)::numeric))
);


ALTER TABLE "public"."timetrack_project_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetrack_projects" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workspace_id" "text" NOT NULL,
    "client_id" "text",
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#e57cd8'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "is_private" boolean DEFAULT false NOT NULL,
    "billable" boolean DEFAULT false NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "rate" numeric(12,2),
    "estimate_type" "text" DEFAULT 'hours'::"text" NOT NULL,
    "estimated_seconds" integer,
    "estimated_amount" numeric(12,2),
    "auto_estimates" boolean DEFAULT false NOT NULL,
    "fixed_fee" numeric(12,2),
    "is_template" boolean DEFAULT false NOT NULL,
    "recurring" boolean DEFAULT false NOT NULL,
    "recurring_period" "text",
    "recurring_start" "date",
    "start_date" "date",
    "end_date" "date",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "member_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "timetrack_projects_dates_ordered" CHECK ((("end_date" IS NULL) OR ("start_date" IS NULL) OR ("end_date" >= "start_date"))),
    CONSTRAINT "timetrack_projects_estimate_type_check" CHECK (("estimate_type" = ANY (ARRAY['hours'::"text", 'monetary'::"text"]))),
    CONSTRAINT "timetrack_projects_estimated_amount_check" CHECK ((("estimated_amount" IS NULL) OR ("estimated_amount" >= (0)::numeric))),
    CONSTRAINT "timetrack_projects_estimated_seconds_check" CHECK ((("estimated_seconds" IS NULL) OR ("estimated_seconds" >= 0))),
    CONSTRAINT "timetrack_projects_fixed_fee_check" CHECK ((("fixed_fee" IS NULL) OR ("fixed_fee" >= (0)::numeric))),
    CONSTRAINT "timetrack_projects_name_not_blank" CHECK (("length"("btrim"("name")) > 0)),
    CONSTRAINT "timetrack_projects_recurring_complete" CHECK (((NOT "recurring") OR (("recurring_period" IS NOT NULL) AND ("recurring_start" IS NOT NULL)))),
    CONSTRAINT "timetrack_projects_recurring_period_check" CHECK (("recurring_period" = ANY (ARRAY['weekly'::"text", 'biweekly'::"text", 'monthly'::"text", 'quarterly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "timetrack_projects_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'archived'::"text", 'done'::"text"])))
);


ALTER TABLE "public"."timetrack_projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetrack_saved_reports" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workspace_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "timetrack_saved_reports_name_not_blank" CHECK (("length"("btrim"("name")) > 0))
);


ALTER TABLE "public"."timetrack_saved_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetrack_settings" (
    "user_id" "uuid" NOT NULL,
    "prefs" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."timetrack_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetrack_tags" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workspace_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "timetrack_tags_name_not_blank" CHECK (("length"("btrim"("name")) > 0))
);


ALTER TABLE "public"."timetrack_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetrack_tasks" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "estimated_seconds" integer,
    "rate" numeric(12,2),
    "assignee_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "timetrack_tasks_estimated_seconds_check" CHECK ((("estimated_seconds" IS NULL) OR ("estimated_seconds" >= 0))),
    CONSTRAINT "timetrack_tasks_name_not_blank" CHECK (("length"("btrim"("name")) > 0))
);


ALTER TABLE "public"."timetrack_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetrack_timeline" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workspace_id" "text" NOT NULL,
    "title" "text",
    "started_at" timestamp with time zone NOT NULL,
    "ended_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "label" "text" DEFAULT ''::"text" NOT NULL,
    "converted" boolean DEFAULT false NOT NULL,
    CONSTRAINT "timetrack_timeline_ordered" CHECK (("ended_at" >= "started_at"))
);


ALTER TABLE "public"."timetrack_timeline" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetrack_webhook_log" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "webhook_id" "text" NOT NULL,
    "event" "text" NOT NULL,
    "status" "text" NOT NULL,
    "response_code" integer,
    "detail" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payload" "text" DEFAULT ''::"text" NOT NULL,
    "url" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "timetrack_webhook_log_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'sent'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."timetrack_webhook_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetrack_webhooks" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workspace_id" "text" NOT NULL,
    "url" "text" NOT NULL,
    "events" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "timetrack_webhooks_url_is_https" CHECK (("url" ~* '^https://'::"text"))
);


ALTER TABLE "public"."timetrack_webhooks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."timetrack_workspaces" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" DEFAULT 'My Workspace'::"text" NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."timetrack_workspaces" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" character varying(100) NOT NULL,
    "category" character varying(50) NOT NULL,
    "tracking_type" "public"."goal_tracking_type" DEFAULT 'counter'::"public"."goal_tracking_type" NOT NULL,
    "period" "public"."goal_period" DEFAULT 'weekly'::"public"."goal_period" NOT NULL,
    "target_value" integer DEFAULT 1 NOT NULL,
    "current_value" integer DEFAULT 0 NOT NULL,
    "period_start_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "custom_end_date" "date",
    "current_streak" integer DEFAULT 0 NOT NULL,
    "best_streak" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_archived" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "linked_metric" "public"."linked_metric",
    "position" integer DEFAULT 0 NOT NULL,
    "life_area_id" "uuid",
    "parent_goal_id" "uuid",
    "horizon" "text" DEFAULT 'weekly'::"text" NOT NULL,
    "goal_type" "text" DEFAULT 'recurring'::"text" NOT NULL,
    "description" "text",
    "purpose" "text",
    "deadline" "date",
    "identity_statement" "text",
    "depth" integer DEFAULT 0 NOT NULL,
    "life_area" "text" DEFAULT 'custom'::"text",
    "target_date" "date",
    "goal_nature" "text",
    "display_category" "text",
    "goal_level" smallint,
    "template_id" "text",
    "milestone_config" "jsonb",
    "ramp_steps" "jsonb",
    "motivation_note" "text",
    "streak_freezes_available" integer DEFAULT 0 NOT NULL,
    "streak_freezes_used" integer DEFAULT 0 NOT NULL,
    "last_freeze_date" "date",
    "goal_phase" "text",
    "aligned_values" "text"[] DEFAULT '{}'::"text"[],
    "is_abstinence" boolean DEFAULT false NOT NULL,
    "stages" "text"[],
    CONSTRAINT "chk_period" CHECK (("period" = ANY (ARRAY['daily'::"public"."goal_period", 'weekly'::"public"."goal_period", 'monthly'::"public"."goal_period", 'quarterly'::"public"."goal_period", 'yearly'::"public"."goal_period", 'custom'::"public"."goal_period"]))),
    CONSTRAINT "user_goals_display_category_check" CHECK ((("display_category" IS NULL) OR ("display_category" = ANY (ARRAY['field_work'::"text", 'results'::"text", 'dirty_dog'::"text", 'texting'::"text", 'dates'::"text", 'relationship'::"text", 'scenarios'::"text", 'mindfulness'::"text", 'resilience'::"text", 'learning'::"text", 'reflection'::"text", 'discipline'::"text", 'strength'::"text", 'training'::"text", 'nutrition'::"text", 'body_comp'::"text", 'flexibility'::"text", 'endurance'::"text", 'income'::"text", 'saving'::"text", 'investing'::"text", 'career_growth'::"text", 'entrepreneurship'::"text", 'porn_freedom'::"text", 'digital_discipline'::"text", 'substance_control'::"text", 'self_control'::"text"])))),
    CONSTRAINT "user_goals_goal_level_check" CHECK ((("goal_level" >= 0) AND ("goal_level" <= 3))),
    CONSTRAINT "user_goals_goal_nature_check" CHECK ((("goal_nature" IS NULL) OR ("goal_nature" = ANY (ARRAY['input'::"text", 'outcome'::"text"])))),
    CONSTRAINT "user_goals_goal_phase_check" CHECK ((("goal_phase" IS NULL) OR ("goal_phase" = ANY (ARRAY['acquisition'::"text", 'consolidation'::"text", 'graduated'::"text"])))),
    CONSTRAINT "user_goals_goal_type_check" CHECK (("goal_type" = ANY (ARRAY['recurring'::"text", 'milestone'::"text", 'habit_ramp'::"text"]))),
    CONSTRAINT "user_goals_tracking_type_check" CHECK (("tracking_type" = ANY (ARRAY['counter'::"public"."goal_tracking_type", 'boolean'::"public"."goal_tracking_type"])))
);


ALTER TABLE "public"."user_goals" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_goals"."tracking_type" IS 'How the number is kept: a counter, or done/not-done. Mirrors GOAL_TRACKING_TYPES in src/db/goalEnums.ts.';



COMMENT ON COLUMN "public"."user_goals"."linked_metric" IS 'If set, goal current_value auto-syncs with this tracking metric';



COMMENT ON COLUMN "public"."user_goals"."is_abstinence" IS 'True when the goal is something NOT to do ("No weed"). Daily and yes/no like any standing rule, but rewarded by days accumulated rather than by a streak, because a streak punishes one bad day by deleting the record of every good one. Read by factsFor in src/goals/goalAchievementsService.ts.';



COMMENT ON COLUMN "public"."user_goals"."stages" IS 'Ordered names of the steps this goal is reached by ("first pull-up", "visible abs", ...). NULL for a goal that is not staged. The number reached is current_value and the number of stages is target_value, so progress, rungs and badges all come from the ordinary climb machinery in src/db/goalProgress.ts.';



CREATE TABLE IF NOT EXISTS "public"."user_programs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "spec" "jsonb" NOT NULL,
    "spec_version" integer NOT NULL,
    "starting_weights" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "source_program_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_programs_name_check" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 80))),
    CONSTRAINT "user_programs_source_program_id_check" CHECK ((("source_program_id" IS NULL) OR (("char_length"("source_program_id") >= 1) AND ("char_length"("source_program_id") <= 80)))),
    CONSTRAINT "user_programs_spec_shape" CHECK ((("jsonb_typeof"("spec") = 'object'::"text") AND ("octet_length"(("spec")::"text") <= 65536))),
    CONSTRAINT "user_programs_spec_version_check" CHECK ((("spec_version" >= 2) AND ("spec_version" <= 999))),
    CONSTRAINT "user_programs_weights_shape" CHECK ((("jsonb_typeof"("starting_weights") = 'object'::"text") AND ("octet_length"(("starting_weights")::"text") <= 8192)))
);


ALTER TABLE "public"."user_programs" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_programs" IS 'Programs people build themselves, in the program format. Private to their owner (Q6).';



CREATE TABLE IF NOT EXISTS "public"."user_role_model_settings" (
    "user_id" "uuid" NOT NULL,
    "week_value" "text",
    "week_of" "date",
    "remind_on" boolean DEFAULT false NOT NULL,
    "remind_hour" smallint DEFAULT 8 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_role_model_settings_remind_hour_check" CHECK ((("remind_hour" >= 7) AND ("remind_hour" <= 21))),
    CONSTRAINT "user_role_model_settings_week_value_check" CHECK ((("week_value" IS NULL) OR (("length"("week_value") >= 1) AND ("length"("week_value") <= 40))))
);


ALTER TABLE "public"."user_role_model_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_role_model_week_marks" (
    "user_id" "uuid" NOT NULL,
    "day" "date" NOT NULL,
    "value" "text" NOT NULL,
    "lived" boolean NOT NULL,
    "marked_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_role_model_week_marks_value_check" CHECK ((("length"("value") >= 1) AND ("length"("value") <= 40)))
);


ALTER TABLE "public"."user_role_model_week_marks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_role_models" (
    "user_id" "uuid" NOT NULL,
    "role_model_id" "text" NOT NULL,
    "position" smallint NOT NULL,
    "taken_values" "text"[] NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_role_models_position_check" CHECK ((("position" >= 0) AND ("position" <= 4))),
    CONSTRAINT "user_role_models_role_model_id_check" CHECK ((("role_model_id" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::"text") AND ("length"("role_model_id") <= 80))),
    CONSTRAINT "user_role_models_taken_values_check" CHECK ((("cardinality"("taken_values") >= 1) AND ("cardinality"("taken_values") <= 5)))
);


ALTER TABLE "public"."user_role_models" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_tracking_stats" (
    "user_id" "uuid" NOT NULL,
    "total_approaches" integer DEFAULT 0,
    "total_sessions" integer DEFAULT 0,
    "total_numbers" integer DEFAULT 0,
    "total_instadates" integer DEFAULT 0,
    "current_streak" integer DEFAULT 0,
    "longest_streak" integer DEFAULT 0,
    "last_approach_date" "date",
    "weekly_reviews_completed" integer DEFAULT 0,
    "current_weekly_streak" integer DEFAULT 0,
    "monthly_review_unlocked" boolean DEFAULT false,
    "quarterly_review_unlocked" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "total_field_reports" integer DEFAULT 0,
    "current_week_streak" integer DEFAULT 0,
    "longest_week_streak" integer DEFAULT 0,
    "unique_locations" "text"[] DEFAULT '{}'::"text"[],
    "current_week_sessions" integer DEFAULT 0,
    "current_week_approaches" integer DEFAULT 0,
    "current_week_field_reports" integer DEFAULT 0 NOT NULL,
    "current_week_numbers" integer DEFAULT 0 NOT NULL,
    "current_week_instadates" integer DEFAULT 0 NOT NULL,
    "favorite_template_ids" "text"[] DEFAULT ARRAY[]::"text"[] NOT NULL,
    "week_start_date" "date",
    "last_active_week_start" "date",
    "last_review_week_start" "date"
);


ALTER TABLE "public"."user_tracking_stats" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_tracking_stats" IS 'Derived counters. System-only writes: recomputed from source rows on every change, never incremented. Not a source of truth for anything — see docs/plans/achievement_counters.md.';



CREATE TABLE IF NOT EXISTS "public"."user_values" (
    "user_id" "uuid" NOT NULL,
    "value_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_values" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."value_comparisons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "value_a_id" "text" NOT NULL,
    "value_b_id" "text" NOT NULL,
    "chosen_value_id" "text" NOT NULL,
    "comparison_type" "text" NOT NULL,
    "round_number" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."value_comparisons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."values" (
    "id" "text" NOT NULL,
    "category" "text" NOT NULL
);


ALTER TABLE "public"."values" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vice_attempts" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "vice_id" "text" NOT NULL,
    "label" "text" NOT NULL,
    "started_on" "date" NOT NULL,
    "started_by" "text" DEFAULT ''::"text" NOT NULL,
    "structure" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "ended_on" "date",
    "ended_by_report_id" "uuid",
    "updated_at" timestamp with time zone NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "vice_attempts_ends_after_start" CHECK ((("ended_on" IS NULL) OR ("ended_on" >= "started_on"))),
    CONSTRAINT "vice_attempts_label_check" CHECK ((("length"("label") >= 1) AND ("length"("label") <= 80))),
    CONSTRAINT "vice_attempts_vice_id_check" CHECK ((("length"("vice_id") >= 1) AND ("length"("vice_id") <= 40)))
);


ALTER TABLE "public"."vice_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vice_reports" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "attempt_id" "uuid" NOT NULL,
    "at" timestamp without time zone NOT NULL,
    "went_through" boolean NOT NULL,
    "thought" "text" DEFAULT ''::"text" NOT NULL,
    "ending" "text" NOT NULL,
    "closeness" smallint,
    "with_whom" "text" DEFAULT ''::"text" NOT NULL,
    "where_at" "text" DEFAULT ''::"text" NOT NULL,
    "factors" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "did_instead" "text" DEFAULT ''::"text" NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "vice_reports_closeness_check" CHECK ((("closeness" IS NULL) OR (("closeness" >= 0) AND ("closeness" <= 10)))),
    CONSTRAINT "vice_reports_ending_check" CHECK (("ending" = ANY (ARRAY['fine'::"text", 'justone'::"text", 'drink'::"text", 'stress'::"text", 'faded'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."vice_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."waitlist_emails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "source" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "waitlist_emails_source_check" CHECK (("source" = ANY (ARRAY['beta_full'::"text", 'premium_teaser'::"text"])))
);


ALTER TABLE "public"."waitlist_emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weight_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "weight_kg" numeric(5,2) NOT NULL,
    "time_of_day" "text" NOT NULL,
    "photo_url" "text",
    "logged_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "weight_logs_time_of_day_check" CHECK (("time_of_day" = ANY (ARRAY['morning'::"text", 'post_workout'::"text", 'evening'::"text"]))),
    CONSTRAINT "weight_logs_weight_kg_check" CHECK ((("weight_kg" > (0)::numeric) AND ("weight_kg" < (500)::numeric)))
);


ALTER TABLE "public"."weight_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_type" "text" NOT NULL,
    "duration_min" integer,
    "intensity" smallint,
    "logged_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "distance_km" numeric(6,2),
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "enrollment_id" "uuid",
    "program_day_id" "text",
    "program_cycle" integer,
    "program_week" integer,
    "adjustments" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "rpe" numeric(3,1),
    "notes" "text",
    "client_key" "text",
    "progression_changes" "jsonb",
    "personal_records" "jsonb",
    CONSTRAINT "workout_logs_cycle_range" CHECK ((("program_cycle" IS NULL) OR (("program_cycle" >= 1) AND ("program_cycle" <= 1000)))),
    CONSTRAINT "workout_logs_distance_range" CHECK ((("distance_km" IS NULL) OR (("distance_km" >= (0)::numeric) AND ("distance_km" <= (1000)::numeric)))),
    CONSTRAINT "workout_logs_duration_min_check" CHECK ((("duration_min" > 0) AND ("duration_min" < 600))),
    CONSTRAINT "workout_logs_ended_after_start" CHECK ((("ended_at" IS NULL) OR ("started_at" IS NULL) OR ("ended_at" >= "started_at"))),
    CONSTRAINT "workout_logs_intensity_check" CHECK ((("intensity" >= 1) AND ("intensity" <= 5))),
    CONSTRAINT "workout_logs_lifecycle" CHECK (((("started_at" IS NULL) AND ("ended_at" IS NULL) AND ("duration_min" IS NOT NULL) AND ("intensity" IS NOT NULL)) OR (("started_at" IS NOT NULL) AND ("ended_at" IS NULL) AND ("duration_min" IS NULL) AND ("intensity" IS NULL)) OR (("started_at" IS NOT NULL) AND ("ended_at" IS NOT NULL) AND ("duration_min" IS NOT NULL) AND ("intensity" IS NOT NULL)))),
    CONSTRAINT "workout_logs_logged_is_start" CHECK ((("started_at" IS NULL) OR ("logged_at" = "started_at"))),
    CONSTRAINT "workout_logs_notes_length" CHECK ((("notes" IS NULL) OR ("char_length"("notes") <= 1000))),
    CONSTRAINT "workout_logs_program_context" CHECK ((("enrollment_id" IS NULL) OR (("program_day_id" IS NOT NULL) AND ("program_cycle" IS NOT NULL) AND ("program_week" IS NOT NULL)))),
    CONSTRAINT "workout_logs_rpe_range" CHECK ((("rpe" IS NULL) OR (("rpe" >= (1)::numeric) AND ("rpe" <= (10)::numeric) AND (("rpe" * (2)::numeric) = "trunc"(("rpe" * (2)::numeric)))))),
    CONSTRAINT "workout_logs_session_type_check" CHECK (("session_type" = ANY (ARRAY['weights'::"text", 'cardio'::"text", 'mobility'::"text", 'yoga'::"text", 'running'::"text"]))),
    CONSTRAINT "workout_logs_week_range" CHECK ((("program_week" IS NULL) OR (("program_week" >= 1) AND ("program_week" <= 52))))
);


ALTER TABLE "public"."workout_logs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."workout_logs"."enrollment_id" IS 'The program this workout was done on, or NULL for a loose one. ON DELETE SET NULL: erasing a program keeps the fact that you trained.';



COMMENT ON COLUMN "public"."workout_logs"."client_key" IS 'The browser''s own id for this workout. Makes "start" idempotent, so a retry after a dropped connection cannot log it twice.';



COMMENT ON COLUMN "public"."workout_logs"."progression_changes" IS 'What the finish screen said the program would do next time. NULL means it was not kept (any workout finished before 2026-09-17), never "nothing changed".';



COMMENT ON COLUMN "public"."workout_logs"."personal_records" IS 'The bests and first-time lifts the finish screen named: { records, firstTimeLifts }. NULL means it was not kept, or the history could not be read — never "nothing was beaten".';



CREATE TABLE IF NOT EXISTS "public"."workout_sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "log_id" "uuid" NOT NULL,
    "exercise" "text" NOT NULL,
    "weight_kg" numeric(5,2) NOT NULL,
    "reps" integer NOT NULL,
    "set_number" integer NOT NULL,
    "notes" "text",
    "exercise_notes" "text",
    "exercise_id" "text",
    "library_id" "text",
    "set_kind" "text" DEFAULT 'working'::"text" NOT NULL,
    "prescribed_index" smallint,
    "completed_at" timestamp with time zone,
    "rpe" numeric(3,1),
    "side" "text",
    "slot_id" "text",
    "set_group_id" "text",
    CONSTRAINT "workout_sets_exercise_notes_check" CHECK ((("exercise_notes" IS NULL) OR ("char_length"("exercise_notes") <= 500))),
    CONSTRAINT "workout_sets_kind" CHECK (("set_kind" = ANY (ARRAY['warmup'::"text", 'working'::"text", 'amrap'::"text", 'backoff'::"text", 'drop'::"text", 'top'::"text", 'restpause'::"text"]))),
    CONSTRAINT "workout_sets_notes_check" CHECK ((("notes" IS NULL) OR ("char_length"("notes") <= 500))),
    CONSTRAINT "workout_sets_reps_check" CHECK ((("reps" >= 0) AND ("reps" <= 1000))),
    CONSTRAINT "workout_sets_rpe_range" CHECK ((("rpe" IS NULL) OR (("rpe" >= (1)::numeric) AND ("rpe" <= (10)::numeric) AND (("rpe" * (2)::numeric) = "trunc"(("rpe" * (2)::numeric)))))),
    CONSTRAINT "workout_sets_set_group_id_length" CHECK ((("set_group_id" IS NULL) OR (("char_length"("set_group_id") >= 1) AND ("char_length"("set_group_id") <= 100)))),
    CONSTRAINT "workout_sets_set_number_check" CHECK (("set_number" > 0)),
    CONSTRAINT "workout_sets_side" CHECK ((("side" IS NULL) OR ("side" = ANY (ARRAY['left'::"text", 'right'::"text"])))),
    CONSTRAINT "workout_sets_slot_id_length" CHECK ((("slot_id" IS NULL) OR (("char_length"("slot_id") >= 1) AND ("char_length"("slot_id") <= 100)))),
    CONSTRAINT "workout_sets_weight_kg_check" CHECK (("weight_kg" >= (0)::numeric)),
    CONSTRAINT "workout_sets_weight_max" CHECK (("weight_kg" <= 999.99))
);


ALTER TABLE "public"."workout_sets" OWNER TO "postgres";


COMMENT ON COLUMN "public"."workout_sets"."set_kind" IS 'warmup | working | amrap | backoff | drop. Replaces is_warmup: a tagged set can be an all-out top set, which a boolean could not say.';



COMMENT ON COLUMN "public"."workout_sets"."prescribed_index" IS 'Which prescribed set this answers, or NULL if it was added. Lets the engine find the AMRAP set by its flag rather than by being logged last.';



COMMENT ON COLUMN "public"."workout_sets"."slot_id" IS 'The slot of the program this set answered (program format). "Last time" is per slot: Monday''s heavy bench and Friday''s volume bench are two histories of one lift.';



COMMENT ON COLUMN "public"."workout_sets"."set_group_id" IS 'The set group within the slot (a top set, its back-offs). A back-off range is worked out from the group it names.';



COMMENT ON CONSTRAINT "workout_sets_weight_max" ON "public"."workout_sets" IS 'Matches NUMERIC(5,2) exactly. If the column is ever widened, widen this with it — they disagreed once and every validator in the app copied the wrong one.';



ALTER TABLE ONLY "public"."embeddings" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."embeddings_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."approaches"
    ADD CONSTRAINT "approaches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_runs"
    ADD CONSTRAINT "audit_runs_id_user_id_key" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."audit_runs"
    ADD CONSTRAINT "audit_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_slots"
    ADD CONSTRAINT "audit_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_slots"
    ADD CONSTRAINT "audit_slots_run_id_slot_at_key" UNIQUE ("run_id", "slot_at");



ALTER TABLE ONLY "public"."beta_invites"
    ADD CONSTRAINT "beta_invites_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."beta_invites"
    ADD CONSTRAINT "beta_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."beta_testers"
    ADD CONSTRAINT "beta_testers_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."body_measurements"
    ADD CONSTRAINT "body_measurements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_goal_snapshots"
    ADD CONSTRAINT "daily_goal_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_widgets"
    ADD CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."embeddings"
    ADD CONSTRAINT "embeddings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."embeddings_test"
    ADD CONSTRAINT "embeddings_test_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."error_reports"
    ADD CONSTRAINT "error_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."field_report_templates"
    ADD CONSTRAINT "field_report_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."field_reports"
    ADD CONSTRAINT "field_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inner_game_progress"
    ADD CONSTRAINT "inner_game_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inner_game_progress"
    ADD CONSTRAINT "inner_game_progress_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."life_areas"
    ADD CONSTRAINT "life_areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_areas"
    ADD CONSTRAINT "life_areas_user_id_slug_key" UNIQUE ("user_id", "slug");



ALTER TABLE ONLY "public"."life_plan_answers"
    ADD CONSTRAINT "life_plan_answers_key" UNIQUE ("plan_id", "kind", "prompt_id");



ALTER TABLE ONLY "public"."life_plan_answers"
    ADD CONSTRAINT "life_plan_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_plan_areas"
    ADD CONSTRAINT "life_plan_areas_owner_key" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."life_plan_areas"
    ADD CONSTRAINT "life_plan_areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_plan_areas"
    ADD CONSTRAINT "life_plan_areas_position_key" UNIQUE ("plan_id", "position") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."life_plan_day_journal"
    ADD CONSTRAINT "life_plan_day_journal_key" UNIQUE ("day_id", "local_id");



ALTER TABLE ONLY "public"."life_plan_day_journal"
    ADD CONSTRAINT "life_plan_day_journal_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_plan_day_numbers"
    ADD CONSTRAINT "life_plan_day_numbers_pkey" PRIMARY KEY ("day_id", "node_id");



ALTER TABLE ONLY "public"."life_plan_day_ratings"
    ADD CONSTRAINT "life_plan_day_ratings_pkey" PRIMARY KEY ("day_id", "area_id");



ALTER TABLE ONLY "public"."life_plan_day_ticks"
    ADD CONSTRAINT "life_plan_day_ticks_pkey" PRIMARY KEY ("day_id", "node_id");



ALTER TABLE ONLY "public"."life_plan_days"
    ADD CONSTRAINT "life_plan_days_key" UNIQUE ("plan_id", "on_date");



ALTER TABLE ONLY "public"."life_plan_days"
    ADD CONSTRAINT "life_plan_days_owner_key" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."life_plan_days"
    ADD CONSTRAINT "life_plan_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_plan_experiences"
    ADD CONSTRAINT "life_plan_experiences_owner_key" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."life_plan_experiences"
    ADD CONSTRAINT "life_plan_experiences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_plan_experiences"
    ADD CONSTRAINT "life_plan_experiences_position_key" UNIQUE ("plan_id", "position") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."life_plan_fields"
    ADD CONSTRAINT "life_plan_fields_owner_key" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."life_plan_fields"
    ADD CONSTRAINT "life_plan_fields_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_plan_fields"
    ADD CONSTRAINT "life_plan_fields_position_key" UNIQUE ("plan_id", "position") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."life_plan_goal_beliefs"
    ADD CONSTRAINT "life_plan_goal_beliefs_owner_key" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."life_plan_goal_beliefs"
    ADD CONSTRAINT "life_plan_goal_beliefs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_plan_goal_beliefs"
    ADD CONSTRAINT "life_plan_goal_beliefs_position_key" UNIQUE ("goal_id", "position") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."life_plan_goal_checkpoints"
    ADD CONSTRAINT "life_plan_goal_checkpoints_owner_key" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."life_plan_goal_checkpoints"
    ADD CONSTRAINT "life_plan_goal_checkpoints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_plan_goal_checkpoints"
    ADD CONSTRAINT "life_plan_goal_checkpoints_position_key" UNIQUE ("goal_id", "position") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."life_plan_goal_feeds"
    ADD CONSTRAINT "life_plan_goal_feeds_pkey" PRIMARY KEY ("goal_id", "feeds_goal_id");



ALTER TABLE ONLY "public"."life_plan_goal_obstacles"
    ADD CONSTRAINT "life_plan_goal_obstacles_owner_key" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."life_plan_goal_obstacles"
    ADD CONSTRAINT "life_plan_goal_obstacles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_plan_goal_obstacles"
    ADD CONSTRAINT "life_plan_goal_obstacles_position_key" UNIQUE ("goal_id", "position") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."life_plan_goal_serves"
    ADD CONSTRAINT "life_plan_goal_serves_pkey" PRIMARY KEY ("goal_id", "area_id");



ALTER TABLE ONLY "public"."life_plan_goals"
    ADD CONSTRAINT "life_plan_goals_owner_key" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."life_plan_goals"
    ADD CONSTRAINT "life_plan_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_plan_goals"
    ADD CONSTRAINT "life_plan_goals_position_key" UNIQUE ("plan_id", "position") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."life_plan_goals"
    ADD CONSTRAINT "life_plan_goals_priority_key" UNIQUE ("plan_id", "priority_rank") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."life_plan_nodes"
    ADD CONSTRAINT "life_plan_nodes_detail_key" UNIQUE ("id", "user_id", "kind");



ALTER TABLE ONLY "public"."life_plan_nodes"
    ADD CONSTRAINT "life_plan_nodes_local_key" UNIQUE ("plan_id", "local_id");



ALTER TABLE ONLY "public"."life_plan_nodes"
    ADD CONSTRAINT "life_plan_nodes_owner_key" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."life_plan_nodes"
    ADD CONSTRAINT "life_plan_nodes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_plan_north_stars"
    ADD CONSTRAINT "life_plan_north_stars_one_current" EXCLUDE USING "btree" ("plan_id" WITH =) WHERE (("ended_on" IS NULL)) DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."life_plan_north_stars"
    ADD CONSTRAINT "life_plan_north_stars_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_plan_reminders"
    ADD CONSTRAINT "life_plan_reminders_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."life_plan_review_goals"
    ADD CONSTRAINT "life_plan_review_goals_pkey" PRIMARY KEY ("review_id", "goal_id");



ALTER TABLE ONLY "public"."life_plan_review_scores"
    ADD CONSTRAINT "life_plan_review_scores_pkey" PRIMARY KEY ("review_id", "area_id");



ALTER TABLE ONLY "public"."life_plan_reviews"
    ADD CONSTRAINT "life_plan_reviews_one_per_period" UNIQUE ("plan_id", "cadence", "period_start");



ALTER TABLE ONLY "public"."life_plan_reviews"
    ADD CONSTRAINT "life_plan_reviews_owner_key" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."life_plan_reviews"
    ADD CONSTRAINT "life_plan_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_plan_routine_serves"
    ADD CONSTRAINT "life_plan_routine_serves_pkey" PRIMARY KEY ("routine_id", "area_id");



ALTER TABLE ONLY "public"."life_plan_routine_split_days"
    ADD CONSTRAINT "life_plan_routine_split_days_owner_key" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."life_plan_routine_split_days"
    ADD CONSTRAINT "life_plan_routine_split_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_plan_routine_split_days"
    ADD CONSTRAINT "life_plan_routine_split_days_position_key" UNIQUE ("routine_id", "position") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."life_plan_routine_steps"
    ADD CONSTRAINT "life_plan_routine_steps_owner_key" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."life_plan_routine_steps"
    ADD CONSTRAINT "life_plan_routine_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_plan_routine_steps"
    ADD CONSTRAINT "life_plan_routine_steps_position_key" UNIQUE ("routine_id", "position") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."life_plan_routines"
    ADD CONSTRAINT "life_plan_routines_owner_key" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."life_plan_routines"
    ADD CONSTRAINT "life_plan_routines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_plan_routines"
    ADD CONSTRAINT "life_plan_routines_position_key" UNIQUE ("plan_id", "position") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."life_plan_season_areas"
    ADD CONSTRAINT "life_plan_season_areas_pkey" PRIMARY KEY ("season_id", "area_id");



ALTER TABLE ONLY "public"."life_plan_season_goals"
    ADD CONSTRAINT "life_plan_season_goals_pkey" PRIMARY KEY ("season_id", "goal_id");



ALTER TABLE ONLY "public"."life_plan_seasons"
    ADD CONSTRAINT "life_plan_seasons_one_current" EXCLUDE USING "btree" ("plan_id" WITH =) WHERE (("ended_on" IS NULL)) DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."life_plan_seasons"
    ADD CONSTRAINT "life_plan_seasons_owner_key" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."life_plan_seasons"
    ADD CONSTRAINT "life_plan_seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_plan_step_serves"
    ADD CONSTRAINT "life_plan_step_serves_pkey" PRIMARY KEY ("step_id", "goal_id");



ALTER TABLE ONLY "public"."life_plan_sub_steps"
    ADD CONSTRAINT "life_plan_sub_steps_owner_key" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."life_plan_sub_steps"
    ADD CONSTRAINT "life_plan_sub_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_plan_sub_steps"
    ADD CONSTRAINT "life_plan_sub_steps_position_key" UNIQUE ("plan_id", "position") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."life_plan_values"
    ADD CONSTRAINT "life_plan_values_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."life_plans"
    ADD CONSTRAINT "life_plans_one_per_user" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."life_plans"
    ADD CONSTRAINT "life_plans_owner_key" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."life_plans"
    ADD CONSTRAINT "life_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."milestones"
    ADD CONSTRAINT "milestones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."milestones"
    ADD CONSTRAINT "milestones_user_id_milestone_type_key" UNIQUE ("user_id", "milestone_type");



ALTER TABLE ONLY "public"."notification_sends"
    ADD CONSTRAINT "notification_sends_id_owner" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."notification_sends"
    ADD CONSTRAINT "notification_sends_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nutrition_logs"
    ADD CONSTRAINT "nutrition_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_drafts"
    ADD CONSTRAINT "program_drafts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_drafts"
    ADD CONSTRAINT "program_drafts_user_id_name_key" UNIQUE ("user_id", "name");



ALTER TABLE ONLY "public"."program_enrollments"
    ADD CONSTRAINT "program_enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_versions"
    ADD CONSTRAINT "program_versions_enrollment_id_version_key" UNIQUE ("enrollment_id", "version");



ALTER TABLE ONLY "public"."program_versions"
    ADD CONSTRAINT "program_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_stripe_session_id_key" UNIQUE ("stripe_session_id");



ALTER TABLE ONLY "public"."push_devices"
    ADD CONSTRAINT "push_devices_endpoint_key" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."push_devices"
    ADD CONSTRAINT "push_devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_templates"
    ADD CONSTRAINT "review_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scenarios"
    ADD CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sleep_logs"
    ADD CONSTRAINT "sleep_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sticking_points"
    ADD CONSTRAINT "sticking_points_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timetrack_alert_events"
    ADD CONSTRAINT "timetrack_alert_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timetrack_alert_events"
    ADD CONSTRAINT "timetrack_alert_events_project_id_basis_threshold_period_st_key" UNIQUE ("project_id", "basis", "threshold", "period_start");



ALTER TABLE ONLY "public"."timetrack_approvals"
    ADD CONSTRAINT "timetrack_approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timetrack_autotracker_rules"
    ADD CONSTRAINT "timetrack_autotracker_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timetrack_calendars"
    ADD CONSTRAINT "timetrack_calendars_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timetrack_clients"
    ADD CONSTRAINT "timetrack_clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timetrack_entries"
    ADD CONSTRAINT "timetrack_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timetrack_entry_tags"
    ADD CONSTRAINT "timetrack_entry_tags_pkey" PRIMARY KEY ("entry_id", "tag_id");



ALTER TABLE ONLY "public"."timetrack_favorites"
    ADD CONSTRAINT "timetrack_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timetrack_project_alerts"
    ADD CONSTRAINT "timetrack_project_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timetrack_project_alerts"
    ADD CONSTRAINT "timetrack_project_alerts_project_id_basis_threshold_key" UNIQUE ("project_id", "basis", "threshold");



ALTER TABLE ONLY "public"."timetrack_project_rates"
    ADD CONSTRAINT "timetrack_project_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timetrack_project_rates"
    ADD CONSTRAINT "timetrack_project_rates_project_id_effective_from_key" UNIQUE ("project_id", "effective_from");



ALTER TABLE ONLY "public"."timetrack_projects"
    ADD CONSTRAINT "timetrack_projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timetrack_saved_reports"
    ADD CONSTRAINT "timetrack_saved_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timetrack_settings"
    ADD CONSTRAINT "timetrack_settings_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."timetrack_tags"
    ADD CONSTRAINT "timetrack_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timetrack_tasks"
    ADD CONSTRAINT "timetrack_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timetrack_timeline"
    ADD CONSTRAINT "timetrack_timeline_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timetrack_webhook_log"
    ADD CONSTRAINT "timetrack_webhook_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timetrack_webhooks"
    ADD CONSTRAINT "timetrack_webhooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timetrack_workspaces"
    ADD CONSTRAINT "timetrack_workspaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_goals"
    ADD CONSTRAINT "user_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_programs"
    ADD CONSTRAINT "user_programs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_programs"
    ADD CONSTRAINT "user_programs_user_id_name_key" UNIQUE ("user_id", "name");



ALTER TABLE ONLY "public"."user_role_model_settings"
    ADD CONSTRAINT "user_role_model_settings_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_role_model_week_marks"
    ADD CONSTRAINT "user_role_model_week_marks_pkey" PRIMARY KEY ("user_id", "day");



ALTER TABLE ONLY "public"."user_role_models"
    ADD CONSTRAINT "user_role_models_pkey" PRIMARY KEY ("user_id", "role_model_id");



ALTER TABLE ONLY "public"."user_tracking_stats"
    ADD CONSTRAINT "user_tracking_stats_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_values"
    ADD CONSTRAINT "user_values_pkey" PRIMARY KEY ("user_id", "value_id");



ALTER TABLE ONLY "public"."value_comparisons"
    ADD CONSTRAINT "value_comparisons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."core_values"
    ADD CONSTRAINT "values_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."values"
    ADD CONSTRAINT "values_pkey1" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vice_attempts"
    ADD CONSTRAINT "vice_attempts_id_owner" UNIQUE ("id", "user_id");



ALTER TABLE ONLY "public"."vice_attempts"
    ADD CONSTRAINT "vice_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vice_reports"
    ADD CONSTRAINT "vice_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."waitlist_emails"
    ADD CONSTRAINT "waitlist_emails_email_source_key" UNIQUE ("email", "source");



ALTER TABLE ONLY "public"."waitlist_emails"
    ADD CONSTRAINT "waitlist_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weight_logs"
    ADD CONSTRAINT "weight_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_logs"
    ADD CONSTRAINT "workout_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_sets"
    ADD CONSTRAINT "workout_sets_pkey" PRIMARY KEY ("id");



CREATE INDEX "ai_usage_logs_created_idx" ON "public"."ai_usage_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "ai_usage_logs_feature_idx" ON "public"."ai_usage_logs" USING "btree" ("feature");



CREATE INDEX "ai_usage_logs_user_created_idx" ON "public"."ai_usage_logs" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "audit_runs_one_open_per_person" ON "public"."audit_runs" USING "btree" ("user_id") WHERE ("ended_at" IS NULL);



CREATE INDEX "audit_slots_owner_slot" ON "public"."audit_slots" USING "btree" ("user_id", "slot_at");



CREATE INDEX "dashboard_widgets_user_dashboard_idx" ON "public"."dashboard_widgets" USING "btree" ("user_id", "dashboard_key", "position");



CREATE INDEX "embeddings_test_embedding_idx" ON "public"."embeddings_test" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='20');



CREATE INDEX "embeddings_test_source_idx" ON "public"."embeddings_test" USING "btree" ("source");



CREATE UNIQUE INDEX "error_reports_fingerprint_release_uniq" ON "public"."error_reports" USING "btree" ("fingerprint", "release");



CREATE INDEX "error_reports_frequent_idx" ON "public"."error_reports" USING "btree" ("seen_count" DESC);



CREATE INDEX "error_reports_recent_idx" ON "public"."error_reports" USING "btree" ("last_seen_at" DESC);



CREATE INDEX "idx_approaches_outcome" ON "public"."approaches" USING "btree" ("outcome");



CREATE INDEX "idx_approaches_session_id" ON "public"."approaches" USING "btree" ("session_id");



CREATE INDEX "idx_approaches_timestamp" ON "public"."approaches" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_approaches_user_id" ON "public"."approaches" USING "btree" ("user_id");



CREATE INDEX "idx_body_measurements_user_date" ON "public"."body_measurements" USING "btree" ("user_id", "logged_at" DESC);



CREATE INDEX "idx_field_reports_reported_at" ON "public"."field_reports" USING "btree" ("reported_at" DESC);



CREATE INDEX "idx_field_reports_session_id" ON "public"."field_reports" USING "btree" ("session_id");



CREATE INDEX "idx_field_reports_system_template" ON "public"."field_reports" USING "btree" ("system_template_slug") WHERE ("system_template_slug" IS NOT NULL);



CREATE INDEX "idx_field_reports_user_id" ON "public"."field_reports" USING "btree" ("user_id");



CREATE INDEX "idx_inner_game_progress_user_id" ON "public"."inner_game_progress" USING "btree" ("user_id");



CREATE INDEX "idx_life_areas_user_archived" ON "public"."life_areas" USING "btree" ("user_id", "is_archived");



CREATE INDEX "idx_life_areas_user_id" ON "public"."life_areas" USING "btree" ("user_id");



CREATE INDEX "idx_life_plan_day_journal_question" ON "public"."life_plan_day_journal" USING "btree" ("user_id", "local_id");



CREATE INDEX "idx_life_plan_day_numbers_node" ON "public"."life_plan_day_numbers" USING "btree" ("node_id");



CREATE INDEX "idx_life_plan_days_recent" ON "public"."life_plan_days" USING "btree" ("plan_id", "on_date" DESC);



CREATE INDEX "idx_life_plan_goals_area" ON "public"."life_plan_goals" USING "btree" ("area_id");



CREATE INDEX "idx_life_plan_nodes_plan" ON "public"."life_plan_nodes" USING "btree" ("plan_id", "kind");



CREATE INDEX "idx_life_plan_review_goals_goal" ON "public"."life_plan_review_goals" USING "btree" ("goal_id");



CREATE INDEX "idx_life_plan_review_scores_area" ON "public"."life_plan_review_scores" USING "btree" ("area_id");



CREATE INDEX "idx_life_plan_reviews_plan" ON "public"."life_plan_reviews" USING "btree" ("plan_id", "period_start");



CREATE INDEX "idx_life_plan_seasons_plan" ON "public"."life_plan_seasons" USING "btree" ("plan_id", "started_on");



CREATE INDEX "idx_life_plan_values_lookup" ON "public"."life_plan_values" USING "btree" ("plan_id", "value");



CREATE INDEX "idx_milestones_session_id" ON "public"."milestones" USING "btree" ("session_id");



CREATE INDEX "idx_milestones_user_id" ON "public"."milestones" USING "btree" ("user_id");



CREATE INDEX "idx_nutrition_logs_user_date" ON "public"."nutrition_logs" USING "btree" ("user_id", "logged_at" DESC);



CREATE INDEX "idx_program_drafts_user" ON "public"."program_drafts" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "idx_program_enrollments_user_active" ON "public"."program_enrollments" USING "btree" ("user_id", "is_active");



CREATE INDEX "idx_program_versions_user" ON "public"."program_versions" USING "btree" ("user_id");



CREATE INDEX "idx_purchases_subscription_id" ON "public"."purchases" USING "btree" ("stripe_subscription_id");



CREATE INDEX "idx_purchases_user_status" ON "public"."purchases" USING "btree" ("user_id", "status");



CREATE INDEX "idx_reviews_period" ON "public"."reviews" USING "btree" ("period_start" DESC);



CREATE INDEX "idx_reviews_type" ON "public"."reviews" USING "btree" ("review_type");



CREATE INDEX "idx_reviews_user_id" ON "public"."reviews" USING "btree" ("user_id");



CREATE INDEX "idx_sessions_is_active" ON "public"."sessions" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_sessions_started_at" ON "public"."sessions" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_sessions_user_id" ON "public"."sessions" USING "btree" ("user_id");



CREATE INDEX "idx_sleep_logs_user_date" ON "public"."sleep_logs" USING "btree" ("user_id", "logged_at" DESC);



CREATE UNIQUE INDEX "idx_snapshots_unique" ON "public"."daily_goal_snapshots" USING "btree" ("goal_id", "snapshot_date");



CREATE INDEX "idx_snapshots_user_date" ON "public"."daily_goal_snapshots" USING "btree" ("user_id", "snapshot_date" DESC);



CREATE INDEX "idx_sticking_points_user_id" ON "public"."sticking_points" USING "btree" ("user_id");



CREATE INDEX "idx_user_goals_active" ON "public"."user_goals" USING "btree" ("user_id", "is_active", "is_archived");



CREATE INDEX "idx_user_goals_category" ON "public"."user_goals" USING "btree" ("user_id", "category");



CREATE INDEX "idx_user_goals_horizon" ON "public"."user_goals" USING "btree" ("horizon");



CREATE INDEX "idx_user_goals_life_area" ON "public"."user_goals" USING "btree" ("life_area_id");



CREATE INDEX "idx_user_goals_parent" ON "public"."user_goals" USING "btree" ("parent_goal_id");



CREATE INDEX "idx_user_goals_position" ON "public"."user_goals" USING "btree" ("user_id", "position");



CREATE INDEX "idx_user_goals_user_horizon" ON "public"."user_goals" USING "btree" ("user_id", "horizon");



CREATE INDEX "idx_user_goals_user_id" ON "public"."user_goals" USING "btree" ("user_id");



CREATE INDEX "idx_user_programs_user" ON "public"."user_programs" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "idx_value_comparisons_type" ON "public"."value_comparisons" USING "btree" ("comparison_type");



CREATE INDEX "idx_value_comparisons_user_id" ON "public"."value_comparisons" USING "btree" ("user_id");



CREATE INDEX "idx_weight_logs_user_date" ON "public"."weight_logs" USING "btree" ("user_id", "logged_at" DESC);



CREATE INDEX "idx_workout_logs_enrollment" ON "public"."workout_logs" USING "btree" ("enrollment_id", "logged_at" DESC) WHERE ("enrollment_id" IS NOT NULL);



CREATE INDEX "idx_workout_logs_user_date" ON "public"."workout_logs" USING "btree" ("user_id", "logged_at" DESC);



CREATE INDEX "idx_workout_sets_log" ON "public"."workout_sets" USING "btree" ("log_id");



CREATE UNIQUE INDEX "notification_sends_one_alert_per_entry" ON "public"."notification_sends" USING "btree" ("entry_id") WHERE ("kind" = 'timetrack-alert'::"text");



CREATE UNIQUE INDEX "notification_sends_one_council_daily" ON "public"."notification_sends" USING "btree" ("entry_id") WHERE ("kind" = 'council-daily'::"text");



CREATE UNIQUE INDEX "notification_sends_one_ping_per_quarter" ON "public"."notification_sends" USING "btree" ("entry_id") WHERE ("kind" = ANY (ARRAY['audit-ping'::"text", 'audit-end'::"text"]));



CREATE UNIQUE INDEX "notification_sends_one_plan_review" ON "public"."notification_sends" USING "btree" ("entry_id") WHERE ("kind" = 'plan-review'::"text");



CREATE INDEX "notification_sends_owner_sent" ON "public"."notification_sends" USING "btree" ("user_id", "sent_at" DESC);



CREATE INDEX "push_devices_owner" ON "public"."push_devices" USING "btree" ("user_id");



CREATE UNIQUE INDEX "timetrack_approvals_member_week_uniq" ON "public"."timetrack_approvals" USING "btree" ("user_id", "member_id", "week_start") WHERE ("deleted_at" IS NULL);



CREATE INDEX "timetrack_calendars_user_idx" ON "public"."timetrack_calendars" USING "btree" ("user_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "timetrack_clients_user_idx" ON "public"."timetrack_clients" USING "btree" ("user_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "timetrack_entries_project_idx" ON "public"."timetrack_entries" USING "btree" ("project_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "timetrack_entries_running_idx" ON "public"."timetrack_entries" USING "btree" ("user_id") WHERE (("stopped_at" IS NULL) AND ("deleted_at" IS NULL));



CREATE UNIQUE INDEX "timetrack_entries_source_event_uniq" ON "public"."timetrack_entries" USING "btree" ("user_id", "source_event_id") WHERE (("source_event_id" IS NOT NULL) AND ("deleted_at" IS NULL));



CREATE INDEX "timetrack_entries_updated_idx" ON "public"."timetrack_entries" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "timetrack_entries_user_start_idx" ON "public"."timetrack_entries" USING "btree" ("user_id", "started_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "timetrack_entry_tags_tag_idx" ON "public"."timetrack_entry_tags" USING "btree" ("tag_id");



CREATE INDEX "timetrack_project_rates_project_idx" ON "public"."timetrack_project_rates" USING "btree" ("project_id", "effective_from" DESC);



CREATE INDEX "timetrack_projects_updated_idx" ON "public"."timetrack_projects" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "timetrack_projects_user_idx" ON "public"."timetrack_projects" USING "btree" ("user_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "timetrack_tags_user_idx" ON "public"."timetrack_tags" USING "btree" ("user_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "timetrack_tasks_project_idx" ON "public"."timetrack_tasks" USING "btree" ("project_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "timetrack_timeline_user_start_idx" ON "public"."timetrack_timeline" USING "btree" ("user_id", "started_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "timetrack_webhook_log_webhook_idx" ON "public"."timetrack_webhook_log" USING "btree" ("webhook_id", "created_at" DESC);



CREATE UNIQUE INDEX "timetrack_workspaces_one_live_per_user" ON "public"."timetrack_workspaces" USING "btree" ("user_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uq_program_enrollments_active" ON "public"."program_enrollments" USING "btree" ("user_id", "program_id") WHERE "is_active";



CREATE UNIQUE INDEX "uq_user_goals_linked_metric" ON "public"."user_goals" USING "btree" ("user_id", "linked_metric") WHERE (("linked_metric" IS NOT NULL) AND ("is_archived" = false));



CREATE UNIQUE INDEX "uq_user_goals_template" ON "public"."user_goals" USING "btree" ("user_id", "template_id") WHERE (("template_id" IS NOT NULL) AND ("is_archived" = false));



CREATE UNIQUE INDEX "uq_workout_logs_client_key" ON "public"."workout_logs" USING "btree" ("user_id", "client_key") WHERE ("client_key" IS NOT NULL);



CREATE UNIQUE INDEX "uq_workout_logs_live" ON "public"."workout_logs" USING "btree" ("user_id") WHERE (("ended_at" IS NULL) AND ("started_at" IS NOT NULL));



CREATE UNIQUE INDEX "uq_workout_sets_slot" ON "public"."workout_sets" USING "btree" ("log_id", COALESCE("exercise_id", "exercise"), "set_kind", "set_number", COALESCE("side", ''::"text"));



CREATE INDEX "vice_attempts_owner_changed" ON "public"."vice_attempts" USING "btree" ("user_id", "updated_at", "id");



CREATE INDEX "vice_reports_attempt" ON "public"."vice_reports" USING "btree" ("attempt_id");



CREATE INDEX "vice_reports_owner_changed" ON "public"."vice_reports" USING "btree" ("user_id", "updated_at", "id");



CREATE OR REPLACE TRIGGER "field_report_templates_updated_at" BEFORE UPDATE ON "public"."field_report_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_tracking_updated_at"();



CREATE OR REPLACE TRIGGER "field_reports_updated_at" BEFORE UPDATE ON "public"."field_reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_tracking_updated_at"();



CREATE OR REPLACE TRIGGER "inner_game_progress_updated_at" BEFORE UPDATE ON "public"."inner_game_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_inner_game_progress_updated_at"();



CREATE OR REPLACE TRIGGER "life_plan_day_journal_touch" BEFORE UPDATE ON "public"."life_plan_day_journal" FOR EACH ROW EXECUTE FUNCTION "public"."life_plan_touch_updated_at"();



CREATE OR REPLACE TRIGGER "program_busy_while_workout_open" BEFORE UPDATE OF "is_active" ON "public"."program_enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."refuse_to_pause_a_busy_program"();



CREATE OR REPLACE TRIGGER "program_numbers_only_by_the_app" BEFORE INSERT OR UPDATE ON "public"."program_enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."program_numbers_only_by_the_app"();



CREATE OR REPLACE TRIGGER "review_templates_updated_at" BEFORE UPDATE ON "public"."review_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_tracking_updated_at"();



CREATE OR REPLACE TRIGGER "reviews_updated_at" BEFORE UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_tracking_updated_at"();



CREATE OR REPLACE TRIGGER "sessions_updated_at" BEFORE UPDATE ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_tracking_updated_at"();



CREATE OR REPLACE TRIGGER "sticking_points_updated_at" BEFORE UPDATE ON "public"."sticking_points" FOR EACH ROW EXECUTE FUNCTION "public"."update_tracking_updated_at"();



CREATE OR REPLACE TRIGGER "timetrack_alert_events_touch" BEFORE UPDATE ON "public"."timetrack_alert_events" FOR EACH ROW EXECUTE FUNCTION "public"."timetrack_touch_updated_at"();



CREATE OR REPLACE TRIGGER "timetrack_approvals_touch" BEFORE UPDATE ON "public"."timetrack_approvals" FOR EACH ROW EXECUTE FUNCTION "public"."timetrack_touch_updated_at"();



CREATE OR REPLACE TRIGGER "timetrack_autotracker_rules_touch" BEFORE UPDATE ON "public"."timetrack_autotracker_rules" FOR EACH ROW EXECUTE FUNCTION "public"."timetrack_touch_updated_at"();



CREATE OR REPLACE TRIGGER "timetrack_calendars_touch" BEFORE UPDATE ON "public"."timetrack_calendars" FOR EACH ROW EXECUTE FUNCTION "public"."timetrack_touch_updated_at"();



CREATE OR REPLACE TRIGGER "timetrack_clients_touch" BEFORE UPDATE ON "public"."timetrack_clients" FOR EACH ROW EXECUTE FUNCTION "public"."timetrack_touch_updated_at"();



CREATE OR REPLACE TRIGGER "timetrack_entries_touch" BEFORE UPDATE ON "public"."timetrack_entries" FOR EACH ROW EXECUTE FUNCTION "public"."timetrack_touch_updated_at"();



CREATE OR REPLACE TRIGGER "timetrack_favorites_touch" BEFORE UPDATE ON "public"."timetrack_favorites" FOR EACH ROW EXECUTE FUNCTION "public"."timetrack_touch_updated_at"();



CREATE OR REPLACE TRIGGER "timetrack_project_alerts_touch" BEFORE UPDATE ON "public"."timetrack_project_alerts" FOR EACH ROW EXECUTE FUNCTION "public"."timetrack_touch_updated_at"();



CREATE OR REPLACE TRIGGER "timetrack_project_rates_touch" BEFORE UPDATE ON "public"."timetrack_project_rates" FOR EACH ROW EXECUTE FUNCTION "public"."timetrack_touch_updated_at"();



CREATE OR REPLACE TRIGGER "timetrack_projects_touch" BEFORE UPDATE ON "public"."timetrack_projects" FOR EACH ROW EXECUTE FUNCTION "public"."timetrack_touch_updated_at"();



CREATE OR REPLACE TRIGGER "timetrack_saved_reports_touch" BEFORE UPDATE ON "public"."timetrack_saved_reports" FOR EACH ROW EXECUTE FUNCTION "public"."timetrack_touch_updated_at"();



CREATE OR REPLACE TRIGGER "timetrack_settings_touch" BEFORE UPDATE ON "public"."timetrack_settings" FOR EACH ROW EXECUTE FUNCTION "public"."timetrack_touch_updated_at"();



CREATE OR REPLACE TRIGGER "timetrack_tags_touch" BEFORE UPDATE ON "public"."timetrack_tags" FOR EACH ROW EXECUTE FUNCTION "public"."timetrack_touch_updated_at"();



CREATE OR REPLACE TRIGGER "timetrack_tasks_touch" BEFORE UPDATE ON "public"."timetrack_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."timetrack_touch_updated_at"();



CREATE OR REPLACE TRIGGER "timetrack_timeline_touch" BEFORE UPDATE ON "public"."timetrack_timeline" FOR EACH ROW EXECUTE FUNCTION "public"."timetrack_touch_updated_at"();



CREATE OR REPLACE TRIGGER "timetrack_webhooks_touch" BEFORE UPDATE ON "public"."timetrack_webhooks" FOR EACH ROW EXECUTE FUNCTION "public"."timetrack_touch_updated_at"();



CREATE OR REPLACE TRIGGER "timetrack_workspaces_touch" BEFORE UPDATE ON "public"."timetrack_workspaces" FOR EACH ROW EXECUTE FUNCTION "public"."timetrack_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_life_plan_days_updated_at" BEFORE UPDATE ON "public"."life_plan_days" FOR EACH ROW EXECUTE FUNCTION "public"."life_plan_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_life_plans_updated_at" BEFORE UPDATE ON "public"."life_plans" FOR EACH ROW EXECUTE FUNCTION "public"."life_plan_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_program_drafts_updated_at" BEFORE UPDATE ON "public"."program_drafts" FOR EACH ROW EXECUTE FUNCTION "public"."program_drafts_touch_updated_at"();



CREATE OR REPLACE TRIGGER "trg_user_programs_updated_at" BEFORE UPDATE ON "public"."user_programs" FOR EACH ROW EXECUTE FUNCTION "public"."user_programs_touch_updated_at"();



CREATE OR REPLACE TRIGGER "user_goals_updated_at_trigger" BEFORE UPDATE ON "public"."user_goals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "user_role_models_at_most_five" BEFORE INSERT ON "public"."user_role_models" FOR EACH ROW EXECUTE FUNCTION "public"."user_role_models_at_most_five"();



CREATE OR REPLACE TRIGGER "user_tracking_stats_updated_at" BEFORE UPDATE ON "public"."user_tracking_stats" FOR EACH ROW EXECUTE FUNCTION "public"."update_tracking_updated_at"();



CREATE OR REPLACE TRIGGER "workout_logs_enrollment_is_own_trg" BEFORE INSERT OR UPDATE OF "enrollment_id", "user_id" ON "public"."workout_logs" FOR EACH ROW EXECUTE FUNCTION "public"."workout_logs_enrollment_is_own"();



ALTER TABLE ONLY "public"."ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approaches"
    ADD CONSTRAINT "approaches_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approaches"
    ADD CONSTRAINT "approaches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_runs"
    ADD CONSTRAINT "audit_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_slots"
    ADD CONSTRAINT "audit_slots_run_id_user_id_fkey" FOREIGN KEY ("run_id", "user_id") REFERENCES "public"."audit_runs"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_slots"
    ADD CONSTRAINT "audit_slots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."beta_testers"
    ADD CONSTRAINT "beta_testers_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "public"."beta_invites"("id");



ALTER TABLE ONLY "public"."beta_testers"
    ADD CONSTRAINT "beta_testers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."body_measurements"
    ADD CONSTRAINT "body_measurements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_goal_snapshots"
    ADD CONSTRAINT "daily_goal_snapshots_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."user_goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_goal_snapshots"
    ADD CONSTRAINT "daily_goal_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dashboard_widgets"
    ADD CONSTRAINT "dashboard_widgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."error_reports"
    ADD CONSTRAINT "error_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."field_report_templates"
    ADD CONSTRAINT "field_report_templates_base_template_id_fkey" FOREIGN KEY ("base_template_id") REFERENCES "public"."field_report_templates"("id");



ALTER TABLE ONLY "public"."field_report_templates"
    ADD CONSTRAINT "field_report_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."field_reports"
    ADD CONSTRAINT "field_reports_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."field_reports"
    ADD CONSTRAINT "field_reports_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."field_report_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."field_reports"
    ADD CONSTRAINT "field_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_goals"
    ADD CONSTRAINT "fk_parent_goal" FOREIGN KEY ("parent_goal_id") REFERENCES "public"."user_goals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inner_game_progress"
    ADD CONSTRAINT "inner_game_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_areas"
    ADD CONSTRAINT "life_areas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_answers"
    ADD CONSTRAINT "life_plan_answers_plan_fk" FOREIGN KEY ("plan_id", "user_id") REFERENCES "public"."life_plans"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_areas"
    ADD CONSTRAINT "life_plan_areas_node_fk" FOREIGN KEY ("id", "user_id", "node_kind") REFERENCES "public"."life_plan_nodes"("id", "user_id", "kind") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_areas"
    ADD CONSTRAINT "life_plan_areas_plan_fk" FOREIGN KEY ("plan_id", "user_id") REFERENCES "public"."life_plans"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_day_journal"
    ADD CONSTRAINT "life_plan_day_journal_day_fk" FOREIGN KEY ("day_id", "user_id") REFERENCES "public"."life_plan_days"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_day_numbers"
    ADD CONSTRAINT "life_plan_day_numbers_day_fk" FOREIGN KEY ("day_id", "user_id") REFERENCES "public"."life_plan_days"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_day_numbers"
    ADD CONSTRAINT "life_plan_day_numbers_node_fk" FOREIGN KEY ("node_id", "user_id") REFERENCES "public"."life_plan_nodes"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_day_ratings"
    ADD CONSTRAINT "life_plan_day_ratings_area_fk" FOREIGN KEY ("area_id", "user_id") REFERENCES "public"."life_plan_areas"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_day_ratings"
    ADD CONSTRAINT "life_plan_day_ratings_day_fk" FOREIGN KEY ("day_id", "user_id") REFERENCES "public"."life_plan_days"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_day_ticks"
    ADD CONSTRAINT "life_plan_day_ticks_day_fk" FOREIGN KEY ("day_id", "user_id") REFERENCES "public"."life_plan_days"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_day_ticks"
    ADD CONSTRAINT "life_plan_day_ticks_node_fk" FOREIGN KEY ("node_id", "user_id") REFERENCES "public"."life_plan_nodes"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_days"
    ADD CONSTRAINT "life_plan_days_plan_fk" FOREIGN KEY ("plan_id", "user_id") REFERENCES "public"."life_plans"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_experiences"
    ADD CONSTRAINT "life_plan_experiences_area_fk" FOREIGN KEY ("area_id", "user_id") REFERENCES "public"."life_plan_areas"("id", "user_id") ON DELETE SET NULL ("area_id");



ALTER TABLE ONLY "public"."life_plan_experiences"
    ADD CONSTRAINT "life_plan_experiences_goal_fk" FOREIGN KEY ("goal_id", "user_id") REFERENCES "public"."life_plan_goals"("id", "user_id") ON DELETE SET NULL ("goal_id");



ALTER TABLE ONLY "public"."life_plan_experiences"
    ADD CONSTRAINT "life_plan_experiences_node_fk" FOREIGN KEY ("id", "user_id", "node_kind") REFERENCES "public"."life_plan_nodes"("id", "user_id", "kind") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_experiences"
    ADD CONSTRAINT "life_plan_experiences_plan_fk" FOREIGN KEY ("plan_id", "user_id") REFERENCES "public"."life_plans"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_fields"
    ADD CONSTRAINT "life_plan_fields_node_fk" FOREIGN KEY ("id", "user_id", "node_kind") REFERENCES "public"."life_plan_nodes"("id", "user_id", "kind") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_fields"
    ADD CONSTRAINT "life_plan_fields_plan_fk" FOREIGN KEY ("plan_id", "user_id") REFERENCES "public"."life_plans"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_fields"
    ADD CONSTRAINT "life_plan_fields_target_fk" FOREIGN KEY ("target_id", "user_id") REFERENCES "public"."life_plan_nodes"("id", "user_id") ON DELETE SET NULL ("target_id");



ALTER TABLE ONLY "public"."life_plan_goal_beliefs"
    ADD CONSTRAINT "life_plan_goal_beliefs_goal_fk" FOREIGN KEY ("goal_id", "user_id") REFERENCES "public"."life_plan_goals"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_goal_beliefs"
    ADD CONSTRAINT "life_plan_goal_beliefs_node_fk" FOREIGN KEY ("id", "user_id", "node_kind") REFERENCES "public"."life_plan_nodes"("id", "user_id", "kind") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_goal_checkpoints"
    ADD CONSTRAINT "life_plan_goal_checkpoints_goal_fk" FOREIGN KEY ("goal_id", "user_id") REFERENCES "public"."life_plan_goals"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_goal_checkpoints"
    ADD CONSTRAINT "life_plan_goal_checkpoints_node_fk" FOREIGN KEY ("id", "user_id", "node_kind") REFERENCES "public"."life_plan_nodes"("id", "user_id", "kind") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_goal_feeds"
    ADD CONSTRAINT "life_plan_goal_feeds_goal_fk" FOREIGN KEY ("goal_id", "user_id") REFERENCES "public"."life_plan_goals"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_goal_feeds"
    ADD CONSTRAINT "life_plan_goal_feeds_target_fk" FOREIGN KEY ("feeds_goal_id", "user_id") REFERENCES "public"."life_plan_goals"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_goal_obstacles"
    ADD CONSTRAINT "life_plan_goal_obstacles_goal_fk" FOREIGN KEY ("goal_id", "user_id") REFERENCES "public"."life_plan_goals"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_goal_obstacles"
    ADD CONSTRAINT "life_plan_goal_obstacles_node_fk" FOREIGN KEY ("id", "user_id", "node_kind") REFERENCES "public"."life_plan_nodes"("id", "user_id", "kind") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_goal_serves"
    ADD CONSTRAINT "life_plan_goal_serves_area_fk" FOREIGN KEY ("area_id", "user_id") REFERENCES "public"."life_plan_areas"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_goal_serves"
    ADD CONSTRAINT "life_plan_goal_serves_goal_fk" FOREIGN KEY ("goal_id", "user_id") REFERENCES "public"."life_plan_goals"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_goals"
    ADD CONSTRAINT "life_plan_goals_area_fk" FOREIGN KEY ("area_id", "user_id") REFERENCES "public"."life_plan_areas"("id", "user_id") ON DELETE SET NULL ("area_id");



ALTER TABLE ONLY "public"."life_plan_goals"
    ADD CONSTRAINT "life_plan_goals_node_fk" FOREIGN KEY ("id", "user_id", "node_kind") REFERENCES "public"."life_plan_nodes"("id", "user_id", "kind") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_goals"
    ADD CONSTRAINT "life_plan_goals_plan_fk" FOREIGN KEY ("plan_id", "user_id") REFERENCES "public"."life_plans"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_nodes"
    ADD CONSTRAINT "life_plan_nodes_plan_fk" FOREIGN KEY ("plan_id", "user_id") REFERENCES "public"."life_plans"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_nodes"
    ADD CONSTRAINT "life_plan_nodes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_north_stars"
    ADD CONSTRAINT "life_plan_north_stars_node_fk" FOREIGN KEY ("id", "user_id", "node_kind") REFERENCES "public"."life_plan_nodes"("id", "user_id", "kind") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_north_stars"
    ADD CONSTRAINT "life_plan_north_stars_plan_fk" FOREIGN KEY ("plan_id", "user_id") REFERENCES "public"."life_plans"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_reminders"
    ADD CONSTRAINT "life_plan_reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_review_goals"
    ADD CONSTRAINT "life_plan_review_goals_goal_fk" FOREIGN KEY ("goal_id", "user_id") REFERENCES "public"."life_plan_goals"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_review_goals"
    ADD CONSTRAINT "life_plan_review_goals_review_fk" FOREIGN KEY ("review_id", "user_id") REFERENCES "public"."life_plan_reviews"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_review_scores"
    ADD CONSTRAINT "life_plan_review_scores_area_fk" FOREIGN KEY ("area_id", "user_id") REFERENCES "public"."life_plan_areas"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_review_scores"
    ADD CONSTRAINT "life_plan_review_scores_review_fk" FOREIGN KEY ("review_id", "user_id") REFERENCES "public"."life_plan_reviews"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_reviews"
    ADD CONSTRAINT "life_plan_reviews_node_fk" FOREIGN KEY ("id", "user_id", "node_kind") REFERENCES "public"."life_plan_nodes"("id", "user_id", "kind") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_reviews"
    ADD CONSTRAINT "life_plan_reviews_plan_fk" FOREIGN KEY ("plan_id", "user_id") REFERENCES "public"."life_plans"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_routine_serves"
    ADD CONSTRAINT "life_plan_routine_serves_area_fk" FOREIGN KEY ("area_id", "user_id") REFERENCES "public"."life_plan_areas"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_routine_serves"
    ADD CONSTRAINT "life_plan_routine_serves_routine_fk" FOREIGN KEY ("routine_id", "user_id") REFERENCES "public"."life_plan_routines"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_routine_split_days"
    ADD CONSTRAINT "life_plan_routine_split_days_node_fk" FOREIGN KEY ("id", "user_id", "node_kind") REFERENCES "public"."life_plan_nodes"("id", "user_id", "kind") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_routine_split_days"
    ADD CONSTRAINT "life_plan_routine_split_days_routine_fk" FOREIGN KEY ("routine_id", "user_id") REFERENCES "public"."life_plan_routines"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_routine_steps"
    ADD CONSTRAINT "life_plan_routine_steps_node_fk" FOREIGN KEY ("id", "user_id", "node_kind") REFERENCES "public"."life_plan_nodes"("id", "user_id", "kind") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_routine_steps"
    ADD CONSTRAINT "life_plan_routine_steps_routine_fk" FOREIGN KEY ("routine_id", "user_id") REFERENCES "public"."life_plan_routines"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_routines"
    ADD CONSTRAINT "life_plan_routines_area_fk" FOREIGN KEY ("area_id", "user_id") REFERENCES "public"."life_plan_areas"("id", "user_id") ON DELETE SET NULL ("area_id");



ALTER TABLE ONLY "public"."life_plan_routines"
    ADD CONSTRAINT "life_plan_routines_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."program_enrollments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."life_plan_routines"
    ADD CONSTRAINT "life_plan_routines_node_fk" FOREIGN KEY ("id", "user_id", "node_kind") REFERENCES "public"."life_plan_nodes"("id", "user_id", "kind") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_routines"
    ADD CONSTRAINT "life_plan_routines_plan_fk" FOREIGN KEY ("plan_id", "user_id") REFERENCES "public"."life_plans"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_season_areas"
    ADD CONSTRAINT "life_plan_season_areas_area_fk" FOREIGN KEY ("area_id", "user_id") REFERENCES "public"."life_plan_areas"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_season_areas"
    ADD CONSTRAINT "life_plan_season_areas_season_fk" FOREIGN KEY ("season_id", "user_id") REFERENCES "public"."life_plan_seasons"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_season_goals"
    ADD CONSTRAINT "life_plan_season_goals_goal_fk" FOREIGN KEY ("goal_id", "user_id") REFERENCES "public"."life_plan_goals"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_season_goals"
    ADD CONSTRAINT "life_plan_season_goals_season_fk" FOREIGN KEY ("season_id", "user_id") REFERENCES "public"."life_plan_seasons"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_seasons"
    ADD CONSTRAINT "life_plan_seasons_focus_fk" FOREIGN KEY ("focus_id", "user_id") REFERENCES "public"."life_plan_nodes"("id", "user_id") ON DELETE SET NULL ("focus_id");



ALTER TABLE ONLY "public"."life_plan_seasons"
    ADD CONSTRAINT "life_plan_seasons_node_fk" FOREIGN KEY ("id", "user_id", "node_kind") REFERENCES "public"."life_plan_nodes"("id", "user_id", "kind") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_seasons"
    ADD CONSTRAINT "life_plan_seasons_plan_fk" FOREIGN KEY ("plan_id", "user_id") REFERENCES "public"."life_plans"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_step_serves"
    ADD CONSTRAINT "life_plan_step_serves_goal_fk" FOREIGN KEY ("goal_id", "user_id") REFERENCES "public"."life_plan_goals"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_step_serves"
    ADD CONSTRAINT "life_plan_step_serves_step_fk" FOREIGN KEY ("step_id", "user_id") REFERENCES "public"."life_plan_routine_steps"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_sub_steps"
    ADD CONSTRAINT "life_plan_sub_steps_node_fk" FOREIGN KEY ("id", "user_id", "node_kind") REFERENCES "public"."life_plan_nodes"("id", "user_id", "kind") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_sub_steps"
    ADD CONSTRAINT "life_plan_sub_steps_plan_fk" FOREIGN KEY ("plan_id", "user_id") REFERENCES "public"."life_plans"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_sub_steps"
    ADD CONSTRAINT "life_plan_sub_steps_target_fk" FOREIGN KEY ("target_id", "user_id") REFERENCES "public"."life_plan_nodes"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_values"
    ADD CONSTRAINT "life_plan_values_area_fk" FOREIGN KEY ("area_id", "user_id") REFERENCES "public"."life_plan_areas"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_values"
    ADD CONSTRAINT "life_plan_values_goal_fk" FOREIGN KEY ("goal_id", "user_id") REFERENCES "public"."life_plan_goals"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plan_values"
    ADD CONSTRAINT "life_plan_values_plan_fk" FOREIGN KEY ("plan_id", "user_id") REFERENCES "public"."life_plans"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."life_plans"
    ADD CONSTRAINT "life_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."milestones"
    ADD CONSTRAINT "milestones_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."milestones"
    ADD CONSTRAINT "milestones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_sends"
    ADD CONSTRAINT "notification_sends_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nutrition_logs"
    ADD CONSTRAINT "nutrition_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_drafts"
    ADD CONSTRAINT "program_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_enrollments"
    ADD CONSTRAINT "program_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_versions"
    ADD CONSTRAINT "program_versions_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."program_enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_versions"
    ADD CONSTRAINT "program_versions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_devices"
    ADD CONSTRAINT "push_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_templates"
    ADD CONSTRAINT "review_templates_base_template_id_fkey" FOREIGN KEY ("base_template_id") REFERENCES "public"."review_templates"("id");



ALTER TABLE ONLY "public"."review_templates"
    ADD CONSTRAINT "review_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."review_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scenarios"
    ADD CONSTRAINT "scenarios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sleep_logs"
    ADD CONSTRAINT "sleep_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sticking_points"
    ADD CONSTRAINT "sticking_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_alert_events"
    ADD CONSTRAINT "timetrack_alert_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."timetrack_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_alert_events"
    ADD CONSTRAINT "timetrack_alert_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_approvals"
    ADD CONSTRAINT "timetrack_approvals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_approvals"
    ADD CONSTRAINT "timetrack_approvals_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."timetrack_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_autotracker_rules"
    ADD CONSTRAINT "timetrack_autotracker_rules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."timetrack_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_autotracker_rules"
    ADD CONSTRAINT "timetrack_autotracker_rules_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."timetrack_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_autotracker_rules"
    ADD CONSTRAINT "timetrack_autotracker_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_autotracker_rules"
    ADD CONSTRAINT "timetrack_autotracker_rules_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."timetrack_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_calendars"
    ADD CONSTRAINT "timetrack_calendars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_calendars"
    ADD CONSTRAINT "timetrack_calendars_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."timetrack_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_clients"
    ADD CONSTRAINT "timetrack_clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_clients"
    ADD CONSTRAINT "timetrack_clients_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."timetrack_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_entries"
    ADD CONSTRAINT "timetrack_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."timetrack_projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."timetrack_entries"
    ADD CONSTRAINT "timetrack_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."timetrack_tasks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."timetrack_entries"
    ADD CONSTRAINT "timetrack_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_entries"
    ADD CONSTRAINT "timetrack_entries_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."timetrack_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_entry_tags"
    ADD CONSTRAINT "timetrack_entry_tags_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "public"."timetrack_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_entry_tags"
    ADD CONSTRAINT "timetrack_entry_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."timetrack_tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_entry_tags"
    ADD CONSTRAINT "timetrack_entry_tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_favorites"
    ADD CONSTRAINT "timetrack_favorites_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."timetrack_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_favorites"
    ADD CONSTRAINT "timetrack_favorites_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."timetrack_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_favorites"
    ADD CONSTRAINT "timetrack_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_favorites"
    ADD CONSTRAINT "timetrack_favorites_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."timetrack_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_project_alerts"
    ADD CONSTRAINT "timetrack_project_alerts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."timetrack_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_project_alerts"
    ADD CONSTRAINT "timetrack_project_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_project_rates"
    ADD CONSTRAINT "timetrack_project_rates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."timetrack_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_project_rates"
    ADD CONSTRAINT "timetrack_project_rates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_projects"
    ADD CONSTRAINT "timetrack_projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."timetrack_clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."timetrack_projects"
    ADD CONSTRAINT "timetrack_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_projects"
    ADD CONSTRAINT "timetrack_projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."timetrack_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_saved_reports"
    ADD CONSTRAINT "timetrack_saved_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_saved_reports"
    ADD CONSTRAINT "timetrack_saved_reports_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."timetrack_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_settings"
    ADD CONSTRAINT "timetrack_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_tags"
    ADD CONSTRAINT "timetrack_tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_tags"
    ADD CONSTRAINT "timetrack_tags_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."timetrack_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_tasks"
    ADD CONSTRAINT "timetrack_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."timetrack_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_tasks"
    ADD CONSTRAINT "timetrack_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_timeline"
    ADD CONSTRAINT "timetrack_timeline_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_timeline"
    ADD CONSTRAINT "timetrack_timeline_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."timetrack_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_webhook_log"
    ADD CONSTRAINT "timetrack_webhook_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_webhook_log"
    ADD CONSTRAINT "timetrack_webhook_log_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "public"."timetrack_webhooks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_webhooks"
    ADD CONSTRAINT "timetrack_webhooks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_webhooks"
    ADD CONSTRAINT "timetrack_webhooks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."timetrack_workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timetrack_workspaces"
    ADD CONSTRAINT "timetrack_workspaces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_goals"
    ADD CONSTRAINT "user_goals_life_area_id_fkey" FOREIGN KEY ("life_area_id") REFERENCES "public"."life_areas"("id");



ALTER TABLE ONLY "public"."user_goals"
    ADD CONSTRAINT "user_goals_parent_goal_id_fkey" FOREIGN KEY ("parent_goal_id") REFERENCES "public"."user_goals"("id");



ALTER TABLE ONLY "public"."user_goals"
    ADD CONSTRAINT "user_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_programs"
    ADD CONSTRAINT "user_programs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_role_model_settings"
    ADD CONSTRAINT "user_role_model_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_role_model_week_marks"
    ADD CONSTRAINT "user_role_model_week_marks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_role_models"
    ADD CONSTRAINT "user_role_models_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_tracking_stats"
    ADD CONSTRAINT "user_tracking_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_values"
    ADD CONSTRAINT "user_values_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_values"
    ADD CONSTRAINT "user_values_value_id_fkey" FOREIGN KEY ("value_id") REFERENCES "public"."core_values"("id");



ALTER TABLE ONLY "public"."value_comparisons"
    ADD CONSTRAINT "value_comparisons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vice_attempts"
    ADD CONSTRAINT "vice_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vice_reports"
    ADD CONSTRAINT "vice_reports_attempt_owner" FOREIGN KEY ("attempt_id", "user_id") REFERENCES "public"."vice_attempts"("id", "user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vice_reports"
    ADD CONSTRAINT "vice_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weight_logs"
    ADD CONSTRAINT "weight_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_logs"
    ADD CONSTRAINT "workout_logs_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."program_enrollments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workout_logs"
    ADD CONSTRAINT "workout_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_sets"
    ADD CONSTRAINT "workout_sets_log_id_fkey" FOREIGN KEY ("log_id") REFERENCES "public"."workout_logs"("id") ON DELETE CASCADE;



CREATE POLICY "Public read access" ON "public"."core_values" FOR SELECT USING (true);



CREATE POLICY "Public read access" ON "public"."values" FOR SELECT USING (true);



CREATE POLICY "Users can add versions to own programs" ON "public"."program_versions" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."program_enrollments" "e"
  WHERE (("e"."id" = "program_versions"."enrollment_id") AND ("e"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can delete own approaches" ON "public"."approaches" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own body measurements" ON "public"."body_measurements" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own enrollments" ON "public"."program_enrollments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own nutrition logs" ON "public"."nutrition_logs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own program drafts" ON "public"."program_drafts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own programs" ON "public"."user_programs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own reports" ON "public"."field_reports" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own review templates" ON "public"."review_templates" FOR DELETE USING ((("auth"."uid"() = "user_id") AND ("is_system" = false)));



CREATE POLICY "Users can delete own reviews" ON "public"."reviews" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own sessions" ON "public"."sessions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own sleep logs" ON "public"."sleep_logs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own sticking points" ON "public"."sticking_points" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own templates" ON "public"."field_report_templates" FOR DELETE USING ((("auth"."uid"() = "user_id") AND ("is_system" = false)));



CREATE POLICY "Users can delete own weight logs" ON "public"."weight_logs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own workout logs" ON "public"."workout_logs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own workout sets" ON "public"."workout_sets" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."workout_logs"
  WHERE (("workout_logs"."id" = "workout_sets"."log_id") AND ("workout_logs"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own approaches" ON "public"."approaches" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own body measurements" ON "public"."body_measurements" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own comparisons" ON "public"."value_comparisons" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own enrollments" ON "public"."program_enrollments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own nutrition logs" ON "public"."nutrition_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own program drafts" ON "public"."program_drafts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own programs" ON "public"."user_programs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own progress" ON "public"."inner_game_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own reports" ON "public"."field_reports" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own review templates" ON "public"."review_templates" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ("is_system" = false)));



CREATE POLICY "Users can insert own reviews" ON "public"."reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own sessions" ON "public"."sessions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own sleep logs" ON "public"."sleep_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own sticking points" ON "public"."sticking_points" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own templates" ON "public"."field_report_templates" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ("is_system" = false)));



CREATE POLICY "Users can insert own weight logs" ON "public"."weight_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own workout logs" ON "public"."workout_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own workout sets" ON "public"."workout_sets" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workout_logs"
  WHERE (("workout_logs"."id" = "workout_sets"."log_id") AND ("workout_logs"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert their own purchases" ON "public"."purchases" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own life areas" ON "public"."life_areas" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own body measurements" ON "public"."body_measurements" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own enrollments" ON "public"."program_enrollments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own nutrition logs" ON "public"."nutrition_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own program drafts" ON "public"."program_drafts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own program versions" ON "public"."program_versions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own programs" ON "public"."user_programs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own sleep logs" ON "public"."sleep_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own weight logs" ON "public"."weight_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own workout logs" ON "public"."workout_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own workout sets" ON "public"."workout_sets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."workout_logs"
  WHERE (("workout_logs"."id" = "workout_sets"."log_id") AND ("workout_logs"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own approaches" ON "public"."approaches" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own body measurements" ON "public"."body_measurements" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own enrollments" ON "public"."program_enrollments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own nutrition logs" ON "public"."nutrition_logs" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own program drafts" ON "public"."program_drafts" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own programs" ON "public"."user_programs" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own progress" ON "public"."inner_game_progress" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own reports" ON "public"."field_reports" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own review templates" ON "public"."review_templates" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("is_system" = false)));



CREATE POLICY "Users can update own reviews" ON "public"."reviews" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own sessions" ON "public"."sessions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own sleep logs" ON "public"."sleep_logs" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own sticking points" ON "public"."sticking_points" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own templates" ON "public"."field_report_templates" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("is_system" = false)));



CREATE POLICY "Users can update own weight logs" ON "public"."weight_logs" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own workout logs" ON "public"."workout_logs" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own workout sets" ON "public"."workout_sets" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."workout_logs"
  WHERE (("workout_logs"."id" = "workout_sets"."log_id") AND ("workout_logs"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own approaches" ON "public"."approaches" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own comparisons" ON "public"."value_comparisons" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own milestones" ON "public"."milestones" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own progress" ON "public"."inner_game_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own reports" ON "public"."field_reports" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own reviews" ON "public"."reviews" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own sessions" ON "public"."sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own snapshots" ON "public"."daily_goal_snapshots" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own stats" ON "public"."user_tracking_stats" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own sticking points" ON "public"."sticking_points" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view system and own review templates" ON "public"."review_templates" FOR SELECT USING ((("is_system" = true) OR ("auth"."uid"() = "user_id")));



CREATE POLICY "Users can view system and own templates" ON "public"."field_report_templates" FOR SELECT USING ((("is_system" = true) OR ("auth"."uid"() = "user_id")));



CREATE POLICY "Users can view their own purchases" ON "public"."purchases" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own scenarios" ON "public"."scenarios" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "add to own council" ON "public"."user_role_models" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."ai_usage_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ai_usage_logs_select_own" ON "public"."ai_usage_logs" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."approaches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "approaches_delete_own" ON "public"."approaches" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "approaches_insert_own" ON "public"."approaches" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "approaches_select_own" ON "public"."approaches" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "approaches_update_own" ON "public"."approaches" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."audit_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_runs_delete_own" ON "public"."audit_runs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "audit_runs_insert_own" ON "public"."audit_runs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "audit_runs_select_own" ON "public"."audit_runs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "audit_runs_update_own" ON "public"."audit_runs" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."audit_slots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_slots_delete_own" ON "public"."audit_slots" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "audit_slots_insert_own" ON "public"."audit_slots" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "audit_slots_select_own" ON "public"."audit_slots" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "audit_slots_update_own" ON "public"."audit_slots" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."beta_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."beta_testers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "beta_testers_select_own" ON "public"."beta_testers" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."body_measurements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "change own council" ON "public"."user_role_models" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."core_values" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_goal_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dashboard_widgets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dashboard_widgets_delete_own" ON "public"."dashboard_widgets" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "dashboard_widgets_insert_own" ON "public"."dashboard_widgets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "dashboard_widgets_select_own" ON "public"."dashboard_widgets" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "dashboard_widgets_update_own" ON "public"."dashboard_widgets" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."embeddings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "embeddings_select_authenticated" ON "public"."embeddings" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."embeddings_test" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."error_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."field_report_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "field_report_templates_delete_own" ON "public"."field_report_templates" FOR DELETE USING ((("user_id" = "auth"."uid"()) AND ("is_system" = false)));



CREATE POLICY "field_report_templates_insert_own" ON "public"."field_report_templates" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND ("is_system" = false)));



CREATE POLICY "field_report_templates_select" ON "public"."field_report_templates" FOR SELECT USING ((("is_system" = true) OR (("user_id" IS NOT NULL) AND ("user_id" = "auth"."uid"()))));



CREATE POLICY "field_report_templates_update_own" ON "public"."field_report_templates" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND ("is_system" = false))) WITH CHECK ((("user_id" = "auth"."uid"()) AND ("is_system" = false)));



ALTER TABLE "public"."field_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "field_reports_delete_own" ON "public"."field_reports" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "field_reports_insert_own" ON "public"."field_reports" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "field_reports_select_own" ON "public"."field_reports" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "field_reports_update_own" ON "public"."field_reports" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."inner_game_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inner_game_progress_insert_own" ON "public"."inner_game_progress" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "inner_game_progress_select_own" ON "public"."inner_game_progress" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "inner_game_progress_update_own" ON "public"."inner_game_progress" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."life_areas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."life_plan_answers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_answers_delete_own" ON "public"."life_plan_answers" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_answers_insert_own" ON "public"."life_plan_answers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_answers_select_own" ON "public"."life_plan_answers" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_answers_update_own" ON "public"."life_plan_answers" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_areas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_areas_delete_own" ON "public"."life_plan_areas" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_areas_insert_own" ON "public"."life_plan_areas" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_areas_select_own" ON "public"."life_plan_areas" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_areas_update_own" ON "public"."life_plan_areas" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_day_journal" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_day_journal_delete_own" ON "public"."life_plan_day_journal" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_day_journal_insert_own" ON "public"."life_plan_day_journal" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_day_journal_select_own" ON "public"."life_plan_day_journal" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_day_journal_update_own" ON "public"."life_plan_day_journal" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_day_numbers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_day_numbers_delete_own" ON "public"."life_plan_day_numbers" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_day_numbers_insert_own" ON "public"."life_plan_day_numbers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_day_numbers_select_own" ON "public"."life_plan_day_numbers" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_day_numbers_update_own" ON "public"."life_plan_day_numbers" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_day_ratings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_day_ratings_delete_own" ON "public"."life_plan_day_ratings" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_day_ratings_insert_own" ON "public"."life_plan_day_ratings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_day_ratings_select_own" ON "public"."life_plan_day_ratings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_day_ratings_update_own" ON "public"."life_plan_day_ratings" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_day_ticks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_day_ticks_delete_own" ON "public"."life_plan_day_ticks" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_day_ticks_insert_own" ON "public"."life_plan_day_ticks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_day_ticks_select_own" ON "public"."life_plan_day_ticks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_day_ticks_update_own" ON "public"."life_plan_day_ticks" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_days" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_days_delete_own" ON "public"."life_plan_days" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_days_insert_own" ON "public"."life_plan_days" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_days_select_own" ON "public"."life_plan_days" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_days_update_own" ON "public"."life_plan_days" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_experiences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_experiences_delete_own" ON "public"."life_plan_experiences" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_experiences_insert_own" ON "public"."life_plan_experiences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_experiences_select_own" ON "public"."life_plan_experiences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_experiences_update_own" ON "public"."life_plan_experiences" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_fields" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_fields_delete_own" ON "public"."life_plan_fields" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_fields_insert_own" ON "public"."life_plan_fields" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_fields_select_own" ON "public"."life_plan_fields" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_fields_update_own" ON "public"."life_plan_fields" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_goal_beliefs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_goal_beliefs_delete_own" ON "public"."life_plan_goal_beliefs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_goal_beliefs_insert_own" ON "public"."life_plan_goal_beliefs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_goal_beliefs_select_own" ON "public"."life_plan_goal_beliefs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_goal_beliefs_update_own" ON "public"."life_plan_goal_beliefs" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_goal_checkpoints" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_goal_checkpoints_delete_own" ON "public"."life_plan_goal_checkpoints" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_goal_checkpoints_insert_own" ON "public"."life_plan_goal_checkpoints" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_goal_checkpoints_select_own" ON "public"."life_plan_goal_checkpoints" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_goal_checkpoints_update_own" ON "public"."life_plan_goal_checkpoints" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_goal_feeds" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_goal_feeds_delete_own" ON "public"."life_plan_goal_feeds" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_goal_feeds_insert_own" ON "public"."life_plan_goal_feeds" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_goal_feeds_select_own" ON "public"."life_plan_goal_feeds" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_goal_feeds_update_own" ON "public"."life_plan_goal_feeds" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_goal_obstacles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_goal_obstacles_delete_own" ON "public"."life_plan_goal_obstacles" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_goal_obstacles_insert_own" ON "public"."life_plan_goal_obstacles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_goal_obstacles_select_own" ON "public"."life_plan_goal_obstacles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_goal_obstacles_update_own" ON "public"."life_plan_goal_obstacles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_goal_serves" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_goal_serves_delete_own" ON "public"."life_plan_goal_serves" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_goal_serves_insert_own" ON "public"."life_plan_goal_serves" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_goal_serves_select_own" ON "public"."life_plan_goal_serves" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_goal_serves_update_own" ON "public"."life_plan_goal_serves" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_goals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_goals_delete_own" ON "public"."life_plan_goals" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_goals_insert_own" ON "public"."life_plan_goals" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_goals_select_own" ON "public"."life_plan_goals" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_goals_update_own" ON "public"."life_plan_goals" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_nodes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_nodes_delete_own" ON "public"."life_plan_nodes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_nodes_insert_own" ON "public"."life_plan_nodes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_nodes_select_own" ON "public"."life_plan_nodes" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_nodes_update_own" ON "public"."life_plan_nodes" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_north_stars" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_north_stars_delete_own" ON "public"."life_plan_north_stars" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_north_stars_insert_own" ON "public"."life_plan_north_stars" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_north_stars_select_own" ON "public"."life_plan_north_stars" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_north_stars_update_own" ON "public"."life_plan_north_stars" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."life_plan_review_goals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_review_goals_delete_own" ON "public"."life_plan_review_goals" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_review_goals_insert_own" ON "public"."life_plan_review_goals" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_review_goals_select_own" ON "public"."life_plan_review_goals" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_review_goals_update_own" ON "public"."life_plan_review_goals" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_review_scores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_review_scores_delete_own" ON "public"."life_plan_review_scores" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_review_scores_insert_own" ON "public"."life_plan_review_scores" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_review_scores_select_own" ON "public"."life_plan_review_scores" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_review_scores_update_own" ON "public"."life_plan_review_scores" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_reviews_delete_own" ON "public"."life_plan_reviews" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_reviews_insert_own" ON "public"."life_plan_reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_reviews_select_own" ON "public"."life_plan_reviews" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_reviews_update_own" ON "public"."life_plan_reviews" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_routine_serves" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_routine_serves_delete_own" ON "public"."life_plan_routine_serves" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_routine_serves_insert_own" ON "public"."life_plan_routine_serves" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_routine_serves_select_own" ON "public"."life_plan_routine_serves" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_routine_serves_update_own" ON "public"."life_plan_routine_serves" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_routine_split_days" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_routine_split_days_delete_own" ON "public"."life_plan_routine_split_days" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_routine_split_days_insert_own" ON "public"."life_plan_routine_split_days" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_routine_split_days_select_own" ON "public"."life_plan_routine_split_days" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_routine_split_days_update_own" ON "public"."life_plan_routine_split_days" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_routine_steps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_routine_steps_delete_own" ON "public"."life_plan_routine_steps" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_routine_steps_insert_own" ON "public"."life_plan_routine_steps" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_routine_steps_select_own" ON "public"."life_plan_routine_steps" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_routine_steps_update_own" ON "public"."life_plan_routine_steps" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_routines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_routines_delete_own" ON "public"."life_plan_routines" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_routines_insert_own" ON "public"."life_plan_routines" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_routines_select_own" ON "public"."life_plan_routines" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_routines_update_own" ON "public"."life_plan_routines" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_season_areas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_season_areas_delete_own" ON "public"."life_plan_season_areas" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_season_areas_insert_own" ON "public"."life_plan_season_areas" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_season_areas_select_own" ON "public"."life_plan_season_areas" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_season_areas_update_own" ON "public"."life_plan_season_areas" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_season_goals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_season_goals_delete_own" ON "public"."life_plan_season_goals" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_season_goals_insert_own" ON "public"."life_plan_season_goals" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_season_goals_select_own" ON "public"."life_plan_season_goals" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_season_goals_update_own" ON "public"."life_plan_season_goals" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_seasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_seasons_delete_own" ON "public"."life_plan_seasons" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_seasons_insert_own" ON "public"."life_plan_seasons" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_seasons_select_own" ON "public"."life_plan_seasons" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_seasons_update_own" ON "public"."life_plan_seasons" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_step_serves" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_step_serves_delete_own" ON "public"."life_plan_step_serves" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_step_serves_insert_own" ON "public"."life_plan_step_serves" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_step_serves_select_own" ON "public"."life_plan_step_serves" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_step_serves_update_own" ON "public"."life_plan_step_serves" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_sub_steps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_sub_steps_delete_own" ON "public"."life_plan_sub_steps" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_sub_steps_insert_own" ON "public"."life_plan_sub_steps" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_sub_steps_select_own" ON "public"."life_plan_sub_steps" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_sub_steps_update_own" ON "public"."life_plan_sub_steps" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plan_values" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plan_values_delete_own" ON "public"."life_plan_values" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_values_insert_own" ON "public"."life_plan_values" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_values_select_own" ON "public"."life_plan_values" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plan_values_update_own" ON "public"."life_plan_values" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."life_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "life_plans_delete_own" ON "public"."life_plans" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plans_insert_own" ON "public"."life_plans" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plans_select_own" ON "public"."life_plans" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "life_plans_update_own" ON "public"."life_plans" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."milestones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "milestones_select_own" ON "public"."milestones" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."notification_sends" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notification_sends_select_own" ON "public"."notification_sends" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."nutrition_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own council settings" ON "public"."user_role_model_settings" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "own reminder row" ON "public"."life_plan_reminders" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "own week marks" ON "public"."user_role_model_week_marks" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."program_drafts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."program_enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."program_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchases" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "purchases_select_own" ON "public"."purchases" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."push_devices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read own council" ON "public"."user_role_models" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "remove from own council" ON "public"."user_role_models" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."review_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "review_templates_delete_own" ON "public"."review_templates" FOR DELETE USING ((("user_id" = "auth"."uid"()) AND ("is_system" = false)));



CREATE POLICY "review_templates_insert_own" ON "public"."review_templates" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND ("is_system" = false)));



CREATE POLICY "review_templates_select" ON "public"."review_templates" FOR SELECT USING ((("is_system" = true) OR (("user_id" IS NOT NULL) AND ("user_id" = "auth"."uid"()))));



CREATE POLICY "review_templates_update_own" ON "public"."review_templates" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND ("is_system" = false))) WITH CHECK ((("user_id" = "auth"."uid"()) AND ("is_system" = false)));



ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reviews_delete_own" ON "public"."reviews" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "reviews_insert_own" ON "public"."reviews" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "reviews_select_own" ON "public"."reviews" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "reviews_update_own" ON "public"."reviews" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."scenarios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scenarios_select_own" ON "public"."scenarios" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sessions_delete_own" ON "public"."sessions" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "sessions_insert_own" ON "public"."sessions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "sessions_select_own" ON "public"."sessions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "sessions_update_own" ON "public"."sessions" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."sleep_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sticking_points" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sticking_points_delete_own" ON "public"."sticking_points" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "sticking_points_insert_own" ON "public"."sticking_points" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "sticking_points_select_own" ON "public"."sticking_points" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "sticking_points_update_own" ON "public"."sticking_points" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."timetrack_alert_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timetrack_alert_events_delete_own" ON "public"."timetrack_alert_events" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_alert_events_insert_own" ON "public"."timetrack_alert_events" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_alert_events_select_own" ON "public"."timetrack_alert_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_alert_events_update_own" ON "public"."timetrack_alert_events" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."timetrack_approvals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timetrack_approvals_delete_own" ON "public"."timetrack_approvals" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_approvals_insert_own" ON "public"."timetrack_approvals" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_approvals_select_own" ON "public"."timetrack_approvals" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_approvals_update_own" ON "public"."timetrack_approvals" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."timetrack_autotracker_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timetrack_autotracker_rules_delete_own" ON "public"."timetrack_autotracker_rules" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_autotracker_rules_insert_own" ON "public"."timetrack_autotracker_rules" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_autotracker_rules_select_own" ON "public"."timetrack_autotracker_rules" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_autotracker_rules_update_own" ON "public"."timetrack_autotracker_rules" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."timetrack_calendars" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timetrack_calendars_delete_own" ON "public"."timetrack_calendars" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_calendars_insert_own" ON "public"."timetrack_calendars" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_calendars_select_own" ON "public"."timetrack_calendars" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_calendars_update_own" ON "public"."timetrack_calendars" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."timetrack_clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timetrack_clients_delete_own" ON "public"."timetrack_clients" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_clients_insert_own" ON "public"."timetrack_clients" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_clients_select_own" ON "public"."timetrack_clients" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_clients_update_own" ON "public"."timetrack_clients" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."timetrack_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timetrack_entries_delete_own" ON "public"."timetrack_entries" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_entries_insert_own" ON "public"."timetrack_entries" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_entries_select_own" ON "public"."timetrack_entries" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_entries_update_own" ON "public"."timetrack_entries" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."timetrack_entry_tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timetrack_entry_tags_delete_own" ON "public"."timetrack_entry_tags" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_entry_tags_insert_own" ON "public"."timetrack_entry_tags" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_entry_tags_select_own" ON "public"."timetrack_entry_tags" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_entry_tags_update_own" ON "public"."timetrack_entry_tags" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."timetrack_favorites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timetrack_favorites_delete_own" ON "public"."timetrack_favorites" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_favorites_insert_own" ON "public"."timetrack_favorites" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_favorites_select_own" ON "public"."timetrack_favorites" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_favorites_update_own" ON "public"."timetrack_favorites" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."timetrack_project_alerts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timetrack_project_alerts_delete_own" ON "public"."timetrack_project_alerts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_project_alerts_insert_own" ON "public"."timetrack_project_alerts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_project_alerts_select_own" ON "public"."timetrack_project_alerts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_project_alerts_update_own" ON "public"."timetrack_project_alerts" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."timetrack_project_rates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timetrack_project_rates_delete_own" ON "public"."timetrack_project_rates" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_project_rates_insert_own" ON "public"."timetrack_project_rates" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_project_rates_select_own" ON "public"."timetrack_project_rates" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_project_rates_update_own" ON "public"."timetrack_project_rates" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."timetrack_projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timetrack_projects_delete_own" ON "public"."timetrack_projects" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_projects_insert_own" ON "public"."timetrack_projects" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_projects_select_own" ON "public"."timetrack_projects" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_projects_update_own" ON "public"."timetrack_projects" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."timetrack_saved_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timetrack_saved_reports_delete_own" ON "public"."timetrack_saved_reports" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_saved_reports_insert_own" ON "public"."timetrack_saved_reports" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_saved_reports_select_own" ON "public"."timetrack_saved_reports" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_saved_reports_update_own" ON "public"."timetrack_saved_reports" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."timetrack_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timetrack_settings_delete_own" ON "public"."timetrack_settings" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_settings_insert_own" ON "public"."timetrack_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_settings_select_own" ON "public"."timetrack_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_settings_update_own" ON "public"."timetrack_settings" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."timetrack_tags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timetrack_tags_delete_own" ON "public"."timetrack_tags" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_tags_insert_own" ON "public"."timetrack_tags" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_tags_select_own" ON "public"."timetrack_tags" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_tags_update_own" ON "public"."timetrack_tags" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."timetrack_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timetrack_tasks_delete_own" ON "public"."timetrack_tasks" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_tasks_insert_own" ON "public"."timetrack_tasks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_tasks_select_own" ON "public"."timetrack_tasks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_tasks_update_own" ON "public"."timetrack_tasks" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."timetrack_timeline" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timetrack_timeline_delete_own" ON "public"."timetrack_timeline" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_timeline_insert_own" ON "public"."timetrack_timeline" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_timeline_select_own" ON "public"."timetrack_timeline" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_timeline_update_own" ON "public"."timetrack_timeline" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."timetrack_webhook_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timetrack_webhook_log_delete_own" ON "public"."timetrack_webhook_log" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_webhook_log_insert_own" ON "public"."timetrack_webhook_log" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_webhook_log_select_own" ON "public"."timetrack_webhook_log" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_webhook_log_update_own" ON "public"."timetrack_webhook_log" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."timetrack_webhooks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timetrack_webhooks_delete_own" ON "public"."timetrack_webhooks" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_webhooks_insert_own" ON "public"."timetrack_webhooks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_webhooks_select_own" ON "public"."timetrack_webhooks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_webhooks_update_own" ON "public"."timetrack_webhooks" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."timetrack_workspaces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timetrack_workspaces_delete_own" ON "public"."timetrack_workspaces" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_workspaces_insert_own" ON "public"."timetrack_workspaces" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_workspaces_select_own" ON "public"."timetrack_workspaces" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "timetrack_workspaces_update_own" ON "public"."timetrack_workspaces" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_goals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_goals_delete_own" ON "public"."user_goals" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_goals_insert_own" ON "public"."user_goals" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "user_goals_select_own" ON "public"."user_goals" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_goals_update_own" ON "public"."user_goals" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_programs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_role_model_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_role_model_week_marks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_role_models" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_tracking_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_tracking_stats_select_own" ON "public"."user_tracking_stats" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_values" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_values_delete_own" ON "public"."user_values" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_values_insert_own" ON "public"."user_values" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "user_values_select_own" ON "public"."user_values" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."value_comparisons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "value_comparisons_delete_own" ON "public"."value_comparisons" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "value_comparisons_insert_own" ON "public"."value_comparisons" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "value_comparisons_select_own" ON "public"."value_comparisons" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."values" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "values_select_authenticated" ON "public"."values" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."vice_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vice_attempts_delete_own" ON "public"."vice_attempts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "vice_attempts_insert_own" ON "public"."vice_attempts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "vice_attempts_select_own" ON "public"."vice_attempts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "vice_attempts_update_own" ON "public"."vice_attempts" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."vice_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vice_reports_delete_own" ON "public"."vice_reports" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "vice_reports_insert_own" ON "public"."vice_reports" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "vice_reports_select_own" ON "public"."vice_reports" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "vice_reports_update_own" ON "public"."vice_reports" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."waitlist_emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weight_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_sets" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."timetrack_entries";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";














































































































































































REVOKE ALL ON FUNCTION "public"."apply_life_plan_changes"("p_changes" "jsonb", "p_expected_rev" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_life_plan_changes"("p_changes" "jsonb", "p_expected_rev" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_life_plan_changes"("p_changes" "jsonb", "p_expected_rev" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."audit_ends_due"("p_limit" integer, "p_now" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."audit_ends_due"("p_limit" integer, "p_now" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."audit_pings_due"("p_limit" integer, "p_now" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."audit_pings_due"("p_limit" integer, "p_now" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_level"("xp_amount" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_level"("xp_amount" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_level"("xp_amount" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_beta_slot"("p_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_beta_slot"("p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_beta_slot"("p_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



REVOKE ALL ON FUNCTION "public"."council_reminders_due"("p_limit" integer, "p_now" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."council_reminders_due"("p_limit" integer, "p_now" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."end_enrollment"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."end_enrollment"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."end_enrollment"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."end_enrollment"("p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."finish_program_workout"("p_workout_id" "uuid", "p_ended_at" timestamp with time zone, "p_duration_min" integer, "p_intensity" smallint, "p_rpe" numeric, "p_notes" "text", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer, "p_changes" "jsonb", "p_records" "jsonb", "p_started_at" timestamp with time zone, "p_session_type" "text", "p_distance_km" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."finish_program_workout"("p_workout_id" "uuid", "p_ended_at" timestamp with time zone, "p_duration_min" integer, "p_intensity" smallint, "p_rpe" numeric, "p_notes" "text", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer, "p_changes" "jsonb", "p_records" "jsonb", "p_started_at" timestamp with time zone, "p_session_type" "text", "p_distance_km" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."finish_program_workout"("p_workout_id" "uuid", "p_ended_at" timestamp with time zone, "p_duration_min" integer, "p_intensity" smallint, "p_rpe" numeric, "p_notes" "text", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer, "p_changes" "jsonb", "p_records" "jsonb", "p_started_at" timestamp with time zone, "p_session_type" "text", "p_distance_km" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."finish_program_workout"("p_workout_id" "uuid", "p_ended_at" timestamp with time zone, "p_duration_min" integer, "p_intensity" smallint, "p_rpe" numeric, "p_notes" "text", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer, "p_changes" "jsonb", "p_records" "jsonb", "p_started_at" timestamp with time zone, "p_session_type" "text", "p_distance_km" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."life_plan_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."life_plan_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."life_plan_touch_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_session_and_advance"("p_workout" "jsonb", "p_sets" "jsonb", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_expected_session_count" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_session_and_advance"("p_workout" "jsonb", "p_sets" "jsonb", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_expected_session_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."log_session_and_advance"("p_workout" "jsonb", "p_sets" "jsonb", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_expected_session_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_session_and_advance"("p_workout" "jsonb", "p_sets" "jsonb", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_expected_session_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_embeddings_test"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_embeddings_test"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_embeddings_test"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."notification_secret"("p_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."notification_secret"("p_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."notifications_clock_tick"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."plan_reviews_due"("p_limit" integer, "p_now" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."plan_reviews_due"("p_limit" integer, "p_now" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."plan_week_review_written"("p_user" "uuid", "p_start" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."plan_week_review_written"("p_user" "uuid", "p_start" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."program_drafts_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."program_drafts_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."program_drafts_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."program_numbers_only_by_the_app"() TO "anon";
GRANT ALL ON FUNCTION "public"."program_numbers_only_by_the_app"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."program_numbers_only_by_the_app"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prune_error_reports"() TO "anon";
GRANT ALL ON FUNCTION "public"."prune_error_reports"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prune_error_reports"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refuse_to_pause_a_busy_program"() TO "anon";
GRANT ALL ON FUNCTION "public"."refuse_to_pause_a_busy_program"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refuse_to_pause_a_busy_program"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."remove_session_and_replay"("p_log_id" "uuid", "p_enrollment_id" "uuid", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."remove_session_and_replay"("p_log_id" "uuid", "p_enrollment_id" "uuid", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."remove_session_and_replay"("p_log_id" "uuid", "p_enrollment_id" "uuid", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_session_and_replay"("p_log_id" "uuid", "p_enrollment_id" "uuid", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."replace_sets_and_replay"("p_log_id" "uuid", "p_sets" "jsonb", "p_enrollment_id" "uuid", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."replace_sets_and_replay"("p_log_id" "uuid", "p_sets" "jsonb", "p_enrollment_id" "uuid", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."replace_sets_and_replay"("p_log_id" "uuid", "p_sets" "jsonb", "p_enrollment_id" "uuid", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace_sets_and_replay"("p_log_id" "uuid", "p_sets" "jsonb", "p_enrollment_id" "uuid", "p_exercise_state" "jsonb", "p_cursor" "jsonb", "p_replay_events" "jsonb", "p_expected_session_count" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."resume_enrollment"("p_id" "uuid", "p_displace" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resume_enrollment"("p_id" "uuid", "p_displace" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."resume_enrollment"("p_id" "uuid", "p_displace" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."resume_enrollment"("p_id" "uuid", "p_displace" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_program_state"("p_id" "uuid", "p_fields" "jsonb", "p_expect" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_program_state"("p_id" "uuid", "p_fields" "jsonb", "p_expect" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_program_state"("p_id" "uuid", "p_fields" "jsonb", "p_expect" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_program_state"("p_id" "uuid", "p_fields" "jsonb", "p_expect" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



REVOKE ALL ON FUNCTION "public"."start_enrollment"("p_row" "jsonb", "p_displace" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."start_enrollment"("p_row" "jsonb", "p_displace" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."start_enrollment"("p_row" "jsonb", "p_displace" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_enrollment"("p_row" "jsonb", "p_displace" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."timetrack_alert_due"("p_user" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."timetrack_alerts_due"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."timetrack_alerts_due"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."timetrack_push"("p_batch" "jsonb", "p_tag_sets" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."timetrack_push"("p_batch" "jsonb", "p_tag_sets" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."timetrack_push"("p_batch" "jsonb", "p_tag_sets" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."timetrack_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."timetrack_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."timetrack_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_inner_game_progress_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_inner_game_progress_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_inner_game_progress_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tracking_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tracking_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tracking_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_lair_config_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_lair_config_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_lair_config_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_programs_touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."user_programs_touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_programs_touch_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_role_models_at_most_five"() TO "anon";
GRANT ALL ON FUNCTION "public"."user_role_models_at_most_five"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_role_models_at_most_five"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."workout_logs_enrollment_is_own"() TO "anon";
GRANT ALL ON FUNCTION "public"."workout_logs_enrollment_is_own"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."workout_logs_enrollment_is_own"() TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";















GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ai_usage_logs" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ai_usage_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_logs" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."approaches" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."approaches" TO "authenticated";
GRANT ALL ON TABLE "public"."approaches" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."audit_runs" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."audit_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_runs" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."audit_slots" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."audit_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_slots" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."beta_invites" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."beta_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."beta_invites" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."beta_testers" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."beta_testers" TO "authenticated";
GRANT ALL ON TABLE "public"."beta_testers" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."body_measurements" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."body_measurements" TO "authenticated";
GRANT ALL ON TABLE "public"."body_measurements" TO "service_role";



GRANT ALL ON TABLE "public"."core_values" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."daily_goal_snapshots" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."daily_goal_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_goal_snapshots" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."dashboard_widgets" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."dashboard_widgets" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_widgets" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."embeddings" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."embeddings" TO "authenticated";
GRANT ALL ON TABLE "public"."embeddings" TO "service_role";



GRANT SELECT,USAGE ON SEQUENCE "public"."embeddings_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."embeddings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."embeddings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."embeddings_test" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."error_reports" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."error_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."error_reports" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."field_report_templates" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."field_report_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."field_report_templates" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."field_reports" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."field_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."field_reports" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."inner_game_progress" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."inner_game_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."inner_game_progress" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_areas" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."life_areas" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_answers" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_answers" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_areas" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_areas" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_day_journal" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_day_journal" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_day_journal" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_day_numbers" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_day_numbers" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_day_numbers" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_day_ratings" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_day_ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_day_ratings" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_day_ticks" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_day_ticks" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_day_ticks" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_days" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_days" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_days" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_experiences" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_experiences" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_experiences" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_fields" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_fields" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_fields" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_goal_beliefs" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_goal_beliefs" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_goal_beliefs" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_goal_checkpoints" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_goal_checkpoints" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_goal_checkpoints" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_goal_feeds" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_goal_feeds" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_goal_feeds" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_goal_obstacles" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_goal_obstacles" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_goal_obstacles" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_goal_serves" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_goal_serves" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_goal_serves" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_goals" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_goals" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_nodes" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_nodes" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_nodes" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_north_stars" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_north_stars" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_north_stars" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_reminders" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_review_goals" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_review_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_review_goals" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_review_scores" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_review_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_review_scores" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_reviews" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_reviews" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_routine_serves" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_routine_serves" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_routine_serves" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_routine_split_days" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_routine_split_days" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_routine_split_days" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_routine_steps" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_routine_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_routine_steps" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_routines" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_routines" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_routines" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_season_areas" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_season_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_season_areas" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_season_goals" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_season_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_season_goals" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_seasons" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_seasons" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_step_serves" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_step_serves" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_step_serves" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_sub_steps" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_sub_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_sub_steps" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_values" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plan_values" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plan_values" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plans" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."life_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."life_plans" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."milestones" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."milestones" TO "authenticated";
GRANT ALL ON TABLE "public"."milestones" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."notification_sends" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."notification_sends" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_sends" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."nutrition_logs" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."nutrition_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."nutrition_logs" TO "service_role";



GRANT SELECT ON TABLE "public"."profiles" TO "anon";
GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT UPDATE("full_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("difficulty") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("age") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("archetype") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("level") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("xp") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("scenarios_completed") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("age_range_start") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("age_range_end") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("speaks_home_language") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("dating_foreigners") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("ethnicity") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("user_is_foreign") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("preferred_region") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("experience_level") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("primary_goal") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("secondary_region") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("secondary_archetype") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("tertiary_archetype") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("voice_language") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("preferred_language") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("timezone") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("week_start_day") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("curve_style") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("sandbox_settings") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("subscription_cancelled_at") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("weight_unit") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("bar_weight_kg") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("smallest_plate_kg") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("timezone_source") ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."program_drafts" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."program_drafts" TO "authenticated";
GRANT ALL ON TABLE "public"."program_drafts" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."program_enrollments" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."program_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."program_enrollments" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."program_versions" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."program_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."program_versions" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."purchases" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."purchases" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."push_devices" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."push_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."push_devices" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."review_templates" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."review_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."review_templates" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."reviews" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."scenarios" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."scenarios" TO "authenticated";
GRANT ALL ON TABLE "public"."scenarios" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."sessions" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."sleep_logs" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."sleep_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."sleep_logs" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."sticking_points" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."sticking_points" TO "authenticated";
GRANT ALL ON TABLE "public"."sticking_points" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_alert_events" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_alert_events" TO "authenticated";
GRANT ALL ON TABLE "public"."timetrack_alert_events" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_approvals" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_approvals" TO "authenticated";
GRANT ALL ON TABLE "public"."timetrack_approvals" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_autotracker_rules" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_autotracker_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."timetrack_autotracker_rules" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_calendars" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_calendars" TO "authenticated";
GRANT ALL ON TABLE "public"."timetrack_calendars" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_clients" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_clients" TO "authenticated";
GRANT ALL ON TABLE "public"."timetrack_clients" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_entries" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."timetrack_entries" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_entry_tags" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_entry_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."timetrack_entry_tags" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_favorites" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."timetrack_favorites" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_project_alerts" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_project_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."timetrack_project_alerts" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_project_rates" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_project_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."timetrack_project_rates" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_projects" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_projects" TO "authenticated";
GRANT ALL ON TABLE "public"."timetrack_projects" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_saved_reports" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_saved_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."timetrack_saved_reports" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_settings" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."timetrack_settings" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_tags" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."timetrack_tags" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_tasks" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."timetrack_tasks" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_timeline" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_timeline" TO "authenticated";
GRANT ALL ON TABLE "public"."timetrack_timeline" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_webhook_log" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_webhook_log" TO "authenticated";
GRANT ALL ON TABLE "public"."timetrack_webhook_log" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_webhooks" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_webhooks" TO "authenticated";
GRANT ALL ON TABLE "public"."timetrack_webhooks" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_workspaces" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."timetrack_workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."timetrack_workspaces" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_goals" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."user_goals" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_programs" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_programs" TO "authenticated";
GRANT ALL ON TABLE "public"."user_programs" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_role_model_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_role_model_settings" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_role_model_week_marks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_role_model_week_marks" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_role_models" TO "authenticated";
GRANT ALL ON TABLE "public"."user_role_models" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_tracking_stats" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_tracking_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."user_tracking_stats" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_values" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_values" TO "authenticated";
GRANT ALL ON TABLE "public"."user_values" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."value_comparisons" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."value_comparisons" TO "authenticated";
GRANT ALL ON TABLE "public"."value_comparisons" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."values" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."values" TO "authenticated";
GRANT ALL ON TABLE "public"."values" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."vice_attempts" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."vice_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."vice_attempts" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."vice_reports" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."vice_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."vice_reports" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."waitlist_emails" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."waitlist_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."waitlist_emails" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."weight_logs" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."weight_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."weight_logs" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."workout_logs" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."workout_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_logs" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."workout_sets" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."workout_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_sets" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,USAGE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,USAGE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































