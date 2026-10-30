-- ============================================================================
-- THE FREQUENCIES TAB'S NUMBERS, COUNTED IN THE DATABASE (Plans/thought.md,
-- Phase 8). One call, one JSON answer, so no read can be cut short by the
-- 1,000-row cap and every number on the tab comes from the same instant.
--
-- Runs as the caller (row security applies) and filters by `auth.uid()`.
-- Hours and days are the person's own (`p_tz`). Read-only: nothing is stored.
--
--   weekTop / monthTop  most frequent thoughts, last 7 / 30 days (top 10)
--   heat                logs by local weekday (1 = Monday) and hour, last 30 days
--   days                logs per thought per local day, last 15 days
--   reframes            per reframed thought: logs in the 14 days before its
--                       first reframe and in the 14 days after, with how many
--                       days each window really covers (a thought logged for
--                       only 3 days before its reframe has a 3-day window)
--   prompts             reminders delivered in the last 7 days, and how many of
--                       them got an answer (a log carrying that reminder's id)
--
-- The way back: supabase/migrations/rollback/20261030140000_thought_stats.down.sql
-- ============================================================================

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
