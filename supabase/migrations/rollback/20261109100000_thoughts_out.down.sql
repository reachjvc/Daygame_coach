-- ============================================================================
-- THE WAY BACK FROM 20261109100000_thoughts_out.sql (Plans/energy-audit.md).
--
-- RUN 20261109110000_energy_audit.down.sql FIRST while the audit is installed:
-- this file restores the clock's gate and the send-kind check of before the
-- audit, so run alone it would either fail (audit sends exist) or quietly stop
-- the audit's pings and break its sends (security review, 2026-11-09).
--
-- THE DATA DOES NOT COME BACK. This recreates the five Thoughts tables, their
-- policies and the four functions EMPTY, restores the clock's gate and the
-- send-kind check, and renames the cron job back. Definitions are copied from
-- 20261030120000_thought_frequencies.sql and 20261030140000_thought_stats.sql.
--
-- NEVER run rollback/20261030120000_thought_frequencies.down.sql or
-- rollback/20261030130000_thoughts_clock.down.sql: they drop push_devices,
-- notification_sends, notification_secret() and the clock, which Time needs.
-- ============================================================================

-- 1. The tables, indexes, policies and functions, empty.
CREATE TABLE IF NOT EXISTS public.thoughts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (length(btrim(text)) BETWEEN 1 AND 280),
  norm TEXT NOT NULL CHECK (length(norm) BETWEEN 1 AND 280),
  pinned BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  merged_into UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT thoughts_id_owner UNIQUE (id, user_id),
  -- Deleting the surviving thought deletes the wordings merged into it: their
  -- history already moved there and went with it.
  CONSTRAINT thoughts_merged_into_owner
    FOREIGN KEY (merged_into, user_id) REFERENCES public.thoughts (id, user_id) ON DELETE CASCADE,
  CONSTRAINT thoughts_not_merged_into_itself CHECK (merged_into IS DISTINCT FROM id)
);

CREATE UNIQUE INDEX IF NOT EXISTS thoughts_one_wording_per_person
  ON public.thoughts (user_id, norm) WHERE merged_into IS NULL;
CREATE INDEX IF NOT EXISTS thoughts_merged_into ON public.thoughts (merged_into) WHERE merged_into IS NOT NULL;


CREATE TABLE IF NOT EXISTS public.thought_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thought_id UUID,
  at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('tap', 'typed', 'prompt', 'prompt-action')),
  prompt_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT thought_logs_thought_owner
    FOREIGN KEY (thought_id, user_id) REFERENCES public.thoughts (id, user_id) ON DELETE CASCADE,
  CONSTRAINT thought_logs_prompt_owner
    FOREIGN KEY (prompt_id, user_id) REFERENCES public.notification_sends (id, user_id) ON DELETE SET NULL (prompt_id)
);

CREATE INDEX IF NOT EXISTS thought_logs_owner_thought_at ON public.thought_logs (user_id, thought_id, at);
CREATE INDEX IF NOT EXISTS thought_logs_owner_at ON public.thought_logs (user_id, at);
CREATE INDEX IF NOT EXISTS thought_logs_prompt ON public.thought_logs (prompt_id) WHERE prompt_id IS NOT NULL;


CREATE TABLE IF NOT EXISTS public.thought_reframes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thought_id UUID NOT NULL,
  text TEXT NOT NULL CHECK (length(btrim(text)) BETWEEN 1 AND 500),
  -- "How true does the old thought feel", 0-100, before and after writing the
  -- reframe. NULL means "not answered", never zero.
  belief_before SMALLINT CHECK (belief_before IS NULL OR belief_before BETWEEN 0 AND 100),
  belief_after SMALLINT CHECK (belief_after IS NULL OR belief_after BETWEEN 0 AND 100),
  evidence TEXT NOT NULL DEFAULT '' CHECK (length(evidence) <= 2000),
  friend TEXT NOT NULL DEFAULT '' CHECK (length(friend) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT thought_reframes_thought_owner
    FOREIGN KEY (thought_id, user_id) REFERENCES public.thoughts (id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS thought_reframes_thought ON public.thought_reframes (user_id, thought_id, created_at);


CREATE TABLE IF NOT EXISTS public.thought_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reminders_on BOOLEAN NOT NULL DEFAULT false,
  interval_minutes SMALLINT NOT NULL DEFAULT 15
    CHECK (interval_minutes IN (5, 10, 15, 20, 30, 45, 60, 90, 120)),
  quiet_start SMALLINT DEFAULT 1320 CHECK (quiet_start IS NULL OR quiet_start BETWEEN 0 AND 1439),
  quiet_end SMALLINT DEFAULT 480 CHECK (quiet_end IS NULL OR quiet_end BETWEEN 0 AND 1439),
  active_days SMALLINT NOT NULL DEFAULT 127 CHECK (active_days BETWEEN 1 AND 127),
  paused_until TIMESTAMPTZ,
  show_thoughts BOOLEAN NOT NULL DEFAULT false,
  reframe_after_days SMALLINT NOT NULL DEFAULT 3 CHECK (reframe_after_days BETWEEN 1 AND 14),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT thought_settings_quiet_both_or_neither CHECK ((quiet_start IS NULL) = (quiet_end IS NULL)),
  CONSTRAINT thought_settings_quiet_not_empty CHECK (quiet_start IS DISTINCT FROM quiet_end OR quiet_start IS NULL)
);


CREATE TABLE IF NOT EXISTS public.thought_prompt_schedule (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  next_due_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS thought_prompt_schedule_due
  ON public.thought_prompt_schedule (next_due_at) WHERE next_due_at IS NOT NULL;


ALTER TABLE public.thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thought_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thought_reframes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thought_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thought_prompt_schedule ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['thoughts', 'thought_logs', 'thought_reframes', 'thought_settings'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (auth.uid() = user_id)', t || '_select_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)', t || '_insert_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t || '_update_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (auth.uid() = user_id)', t || '_delete_own', t);
  END LOOP;
END $$;

REVOKE TRUNCATE ON public.thoughts, public.thought_logs, public.thought_reframes, public.thought_settings,
  public.thought_prompt_schedule FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.thought_counts(p_tz TEXT, p_now TIMESTAMPTZ DEFAULT now(), p_user UUID DEFAULT NULL)
RETURNS TABLE (
  thought_id UUID,
  today INTEGER,
  week INTEGER,
  month INTEGER,
  total INTEGER,
  first_at TIMESTAMPTZ,
  last_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    l.thought_id,
    (count(*) FILTER (WHERE l.at >= (date_trunc('day', p_now AT TIME ZONE p_tz) AT TIME ZONE p_tz)))::int,
    (count(*) FILTER (WHERE l.at >= p_now - interval '7 days'))::int,
    (count(*) FILTER (WHERE l.at >= p_now - interval '30 days'))::int,
    count(*)::int,
    min(l.at),
    max(l.at)
  FROM public.thought_logs l
  WHERE l.user_id = coalesce(p_user, auth.uid()) AND l.thought_id IS NOT NULL AND l.at <= p_now
  GROUP BY l.thought_id
  ORDER BY l.thought_id
$$;

REVOKE ALL ON FUNCTION public.thought_counts(TEXT, TIMESTAMPTZ, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.thought_counts(TEXT, TIMESTAMPTZ, UUID) TO authenticated, service_role;


-- ============================================================================
-- MERGE ONE THOUGHT INTO ANOTHER, IN ONE TRANSACTION.
--
-- Every log and reframe of `p_from` moves to `p_into`; anything previously
-- merged into `p_from` now points at `p_into`, so no chain of pointers ever
-- grows; `p_from` stays as a pointer (see the thoughts table). Runs as the
-- caller: a thought that is not theirs is simply not found, and nothing moves.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.merge_thought(p_from UUID, p_into UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
BEGIN
  IF p_from = p_into THEN
    RAISE EXCEPTION 'a thought cannot be merged into itself' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM thoughts WHERE id = p_from AND user_id = me AND merged_into IS NULL)
     OR NOT EXISTS (SELECT 1 FROM thoughts WHERE id = p_into AND user_id = me AND merged_into IS NULL) THEN
    RAISE EXCEPTION 'both thoughts must exist and not be merged already' USING ERRCODE = 'P0002';
  END IF;

  UPDATE thought_logs SET thought_id = p_into WHERE thought_id = p_from AND user_id = me;
  UPDATE thought_reframes SET thought_id = p_into, updated_at = now() WHERE thought_id = p_from AND user_id = me;
  UPDATE thoughts SET merged_into = p_into, updated_at = now() WHERE merged_into = p_from AND user_id = me;
  UPDATE thoughts SET merged_into = p_into, pinned = false, updated_at = now() WHERE id = p_from AND user_id = me;
  UPDATE thoughts SET updated_at = now() WHERE id = p_into AND user_id = me;
END
$$;

REVOKE ALL ON FUNCTION public.merge_thought(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_thought(UUID, UUID) TO authenticated;


-- ============================================================================
-- THE CLOCK'S CLAIM: every reminder due at `p_now`, each taken by exactly one
-- caller.
--
-- `FOR UPDATE SKIP LOCKED` lets a second tick running at the same moment pass
-- over rows the first is holding, and the UPDATE pushes `next_due_at` forward
-- by `p_lease` in the same statement, so a row taken once is not due again
-- until either the sender writes the real next time or the lease runs out
-- (a sender that crashed mid-send is retried, not lost). Server-only.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.claim_due_thought_prompts(p_now TIMESTAMPTZ, p_lease INTERVAL, p_limit INTEGER)
RETURNS TABLE (user_id UUID, due_at TIMESTAMPTZ)
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH due AS (
    SELECT s.user_id, s.next_due_at
      FROM thought_prompt_schedule s
     WHERE s.next_due_at IS NOT NULL AND s.next_due_at <= p_now
     ORDER BY s.next_due_at
     LIMIT p_limit
       FOR UPDATE SKIP LOCKED
  )
  UPDATE thought_prompt_schedule s
     SET next_due_at = p_now + p_lease, updated_at = p_now
    FROM due
   WHERE s.user_id = due.user_id
  RETURNING s.user_id, due.next_due_at
$$;

REVOKE ALL ON FUNCTION public.claim_due_thought_prompts(TIMESTAMPTZ, INTERVAL, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_thought_prompts(TIMESTAMPTZ, INTERVAL, INTEGER) TO service_role;


CREATE OR REPLACE FUNCTION public.thought_frequency_stats(p_tz TEXT, p_now TIMESTAMPTZ DEFAULT now())
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  recent AS (
    SELECT l.thought_id, l.at, l.prompt_id
      FROM thought_logs l, me
     WHERE l.user_id = me.uid AND l.at <= p_now AND l.at > p_now - interval '30 days'
  ),
  week_top AS (
    SELECT thought_id, count(*)::int AS n FROM recent
     WHERE thought_id IS NOT NULL AND at > p_now - interval '7 days'
     GROUP BY thought_id ORDER BY n DESC, thought_id LIMIT 10
  ),
  month_top AS (
    SELECT thought_id, count(*)::int AS n FROM recent
     WHERE thought_id IS NOT NULL
     GROUP BY thought_id ORDER BY n DESC, thought_id LIMIT 10
  ),
  heat AS (
    SELECT extract(isodow FROM at AT TIME ZONE p_tz)::int AS dow,
           extract(hour FROM at AT TIME ZONE p_tz)::int AS hour,
           count(*)::int AS n
      FROM recent WHERE thought_id IS NOT NULL
     GROUP BY 1, 2
  ),
  days AS (
    SELECT thought_id, (at AT TIME ZONE p_tz)::date AS day, count(*)::int AS n
      FROM recent
     WHERE thought_id IS NOT NULL AND at > p_now - interval '15 days'
     GROUP BY 1, 2
  ),
  first_reframe AS (
    SELECT r.thought_id, min(r.created_at) AS reframed_at
      FROM thought_reframes r, me WHERE r.user_id = me.uid
     GROUP BY r.thought_id
  ),
  windows AS (
    SELECT f.thought_id, f.reframed_at,
           greatest(f.reframed_at - interval '14 days',
                    coalesce((SELECT min(l.at) FROM thought_logs l, me
                               WHERE l.user_id = me.uid AND l.thought_id = f.thought_id), f.reframed_at)) AS before_from,
           least(f.reframed_at + interval '14 days', p_now) AS after_to
      FROM first_reframe f
  ),
  before_after AS (
    SELECT w.thought_id, w.reframed_at,
           (SELECT count(*) FROM thought_logs l, me
             WHERE l.user_id = me.uid AND l.thought_id = w.thought_id
               AND l.at >= w.before_from AND l.at < w.reframed_at)::int AS before_n,
           round((extract(epoch FROM (w.reframed_at - w.before_from)) / 86400)::numeric, 2) AS before_days,
           (SELECT count(*) FROM thought_logs l, me
             WHERE l.user_id = me.uid AND l.thought_id = w.thought_id
               AND l.at >= w.reframed_at AND l.at < w.after_to)::int AS after_n,
           round((extract(epoch FROM greatest(w.after_to - w.reframed_at, interval '0')) / 86400)::numeric, 2) AS after_days
      FROM windows w
  ),
  sends AS (
    SELECT s.id FROM notification_sends s, me
     WHERE s.user_id = me.uid AND s.kind = 'thought-prompt' AND s.delivered > 0
       AND s.sent_at <= p_now AND s.sent_at > p_now - interval '7 days'
  )
  SELECT jsonb_build_object(
    'weekTop', coalesce((SELECT jsonb_agg(jsonb_build_object('thoughtId', thought_id, 'n', n) ORDER BY n DESC, thought_id) FROM week_top), '[]'::jsonb),
    'monthTop', coalesce((SELECT jsonb_agg(jsonb_build_object('thoughtId', thought_id, 'n', n) ORDER BY n DESC, thought_id) FROM month_top), '[]'::jsonb),
    'heat', coalesce((SELECT jsonb_agg(jsonb_build_object('dow', dow, 'hour', hour, 'n', n)) FROM heat), '[]'::jsonb),
    'days', coalesce((SELECT jsonb_agg(jsonb_build_object('thoughtId', thought_id, 'day', day, 'n', n)) FROM days), '[]'::jsonb),
    'reframes', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'thoughtId', thought_id, 'reframedAt', reframed_at,
        'beforeN', before_n, 'beforeDays', before_days, 'afterN', after_n, 'afterDays', after_days)) FROM before_after), '[]'::jsonb),
    'prompts', jsonb_build_object(
        'delivered', (SELECT count(*) FROM sends)::int,
        'answered', (SELECT count(DISTINCT l.prompt_id) FROM thought_logs l JOIN sends s ON s.id = l.prompt_id, me WHERE l.user_id = me.uid)::int)
  )
$$;

REVOKE ALL ON FUNCTION public.thought_frequency_stats(TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.thought_frequency_stats(TEXT, TIMESTAMPTZ) TO authenticated;


-- 2. The clock's gate exactly as in 20261105150000_running_timer_notification.sql,
--    keeping `and not public.timetrack_alert_due()`. Never the gate from
--    20261030130000_thoughts_clock.sql: it drops Time's alert.
create or replace function public.notifications_clock_tick()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  target text;
  token text;
begin
  if not exists (
    select 1 from public.thought_prompt_schedule
     where next_due_at is not null and next_due_at <= now()
  ) and not public.timetrack_alert_due() then
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

revoke all on function public.notifications_clock_tick() from public, anon, authenticated, service_role;

-- 3. The send-kind check with 'thought-prompt'.
alter table public.notification_sends drop constraint if exists notification_sends_kind_check;
alter table public.notification_sends
  add constraint notification_sends_kind_check
  check (kind in ('thought-prompt', 'test', 'timetrack-running', 'timetrack-alert'));

-- 4. The job back under its old name.
select cron.unschedule('notifications-clock') where exists (select 1 from cron.job where jobname = 'notifications-clock');
select cron.schedule('thoughts-clock', '* * * * *', 'select public.notifications_clock_tick()');

notify pgrst, 'reload schema';
