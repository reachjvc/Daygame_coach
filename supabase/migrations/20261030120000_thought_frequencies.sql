-- ============================================================================
-- THOUGHT FREQUENCIES: the thoughts that keep coming back, how often they
-- come, and what the person rewrote them into. Plus the app's first
-- notification plumbing, shared by any feature that needs to reach a phone
-- with the app closed.
--
-- Plans/thought.md, Phase 2. Approved by the owner on 2026-10-30 ("go
-- execute"). Creates empty tables and stops: nothing existing is changed.
-- The way back is supabase/migrations/rollback/20261030120000_thought_frequencies.down.sql.
--
-- ----------------------------------------------------------------------------
-- THE DECISIONS THE SHAPE RESTS ON.
--
-- 1. IDS OF THINGS A PERSON MAKES ARE MINTED ON THE DEVICE (thoughts, logs,
--    reframes), so there is no default on those ids. A tap on a train is
--    queued and sent later, and a retry of the same tap must land on the same
--    row: the id is what makes a log count once (Plans/thought.md, R5).
--
-- 2. NO STORED TOTALS. Every count is computed from `thought_logs` inside the
--    database (`thought_counts` below), because a read is silently capped at
--    1,000 rows and at one reminder every 15 minutes one thought passes 1,000
--    logs in about two weeks (R2).
--
-- 3. A CHILD LINKS TO ITS PARENT ON (parent, owner) TOGETHER, as the
--    vice and life_plan tables do, so a log cannot be attached to someone
--    else's thought even if the app asks for it.
--
-- 4. WHAT THE SERVER COMPUTES, THE CLIENT CANNOT WRITE. The reminder
--    schedule, the devices and the send log have no client write policy:
--    `.claude/rules/database.md`. The devices table is server-only for a
--    second reason: the server POSTs to whatever address a device row holds,
--    so an address written straight from a browser would be a way to make
--    the server call any URL. The route checks the address first.
-- ============================================================================


-- ============================================================================
-- ONE ROW PER WORDING.
--
-- `norm` is the wording folded for duplicate detection (lower case, spaces
-- collapsed, end punctuation dropped) by `normalizeThought` in
-- src/thoughts/thoughtsService.ts. One live wording per person: typing "I am
-- bad." when "i am bad" exists is the same thought, by constraint.
--
-- A MERGED THOUGHT STAYS AS A ROW pointing at the thought it went into, with
-- no logs of its own. Two reasons: a tap queued offline against the old id
-- still lands (the repo follows the pointer), and typing the old wording again
-- finds the surviving thought instead of making a third copy.
-- ============================================================================
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


-- ============================================================================
-- WHAT THE SERVER SENT: one row per reminder (shared plumbing).
--
-- Lets the page say "last reminder delivered 14:15", and lets the Frequencies
-- tab count how many reminders were answered (a log carries the id of the
-- reminder it answered). Read by its owner; written only by the server.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('thought-prompt', 'test')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- How many switched-on devices it went to, how many the push service
  -- accepted, and how many the service said were gone (and were removed).
  devices SMALLINT NOT NULL DEFAULT 0 CHECK (devices >= 0),
  delivered SMALLINT NOT NULL DEFAULT 0 CHECK (delivered >= 0),
  removed SMALLINT NOT NULL DEFAULT 0 CHECK (removed >= 0),

  CONSTRAINT notification_sends_id_owner UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS notification_sends_owner_sent ON public.notification_sends (user_id, sent_at DESC);


-- ============================================================================
-- ONE ROW PER "IT HAPPENED".
--
-- `thought_id` NULL is a "nothing notable" answer to a reminder: it counts as
-- an answer and as nothing else. `prompt_id` is the reminder it answered, if
-- any; deleting that reminder's row keeps the log and clears only the pointer.
-- ============================================================================
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


-- ============================================================================
-- A REWRITTEN THOUGHT. Several per thought over time; the newest is current.
-- Only the new sentence is required (Plans/thought.md, Q9).
-- ============================================================================
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


-- ============================================================================
-- THE PERSON'S CHOICES: one row per person, absent until first saved.
--
-- Data that both the server's clock and a future native app read (R4), so
-- times are plain numbers in the person's own wall clock and the zone comes
-- from `profiles.timezone`. Quiet hours are minutes after midnight and may
-- span midnight (22:00 -> 08:00 is 1320 -> 480); both NULL means none.
-- `active_days` is a bit set, bit 0 = Monday.
-- ============================================================================
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


-- ============================================================================
-- WHEN THE NEXT REMINDER IS DUE. Server-only, computed from the settings, the
-- last log and the last reminder (src/thoughts/schedule.ts).
--
-- The clock claims a due row by moving `next_due_at` forward in the same
-- statement that reads it (`claim_due_thought_prompts`), so two ticks running
-- at once can never both send the same reminder.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.thought_prompt_schedule (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  next_due_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS thought_prompt_schedule_due
  ON public.thought_prompt_schedule (next_due_at) WHERE next_due_at IS NOT NULL;


-- ============================================================================
-- ONE ROW PER BROWSER OR INSTALLED APP THAT AGREED TO RECEIVE NOTIFICATIONS
-- (shared plumbing). Server-only: see decision 4.
--
-- The endpoint is unique across everyone: it names one browser profile, and
-- when a second person signs in on that browser and switches reminders on, the
-- row moves to them rather than leaving the first person's reminders arriving
-- on someone else's screen.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.push_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE CHECK (endpoint LIKE 'https://%' AND length(endpoint) <= 1000),
  p256dh TEXT NOT NULL CHECK (length(p256dh) BETWEEN 1 AND 200),
  auth TEXT NOT NULL CHECK (length(auth) BETWEEN 1 AND 100),
  label TEXT NOT NULL DEFAULT '' CHECK (length(label) <= 80),
  enabled BOOLEAN NOT NULL DEFAULT true,
  failures SMALLINT NOT NULL DEFAULT 0 CHECK (failures >= 0),
  last_success_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_devices_owner ON public.push_devices (user_id);


-- ============================================================================
-- ROW SECURITY.
--
-- thoughts, thought_logs, thought_reframes, thought_settings: the owner reads
-- and writes their own rows, all four operations, like the vice tables.
-- notification_sends: the owner reads; only the server writes.
-- thought_prompt_schedule, push_devices: no client policy at all.
-- ============================================================================
ALTER TABLE public.thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thought_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thought_reframes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thought_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thought_prompt_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS notification_sends_select_own ON public.notification_sends;
CREATE POLICY notification_sends_select_own ON public.notification_sends
  FOR SELECT USING (auth.uid() = user_id);

-- TRUNCATE ignores row security (tests/integration/db/clientPrivileges).
REVOKE TRUNCATE ON public.thoughts, public.thought_logs, public.thought_reframes, public.thought_settings,
  public.thought_prompt_schedule, public.notification_sends, public.push_devices FROM anon, authenticated;


-- ============================================================================
-- EVERY THOUGHT'S COUNTS, COUNTED IN THE DATABASE (decision 2).
--
-- "Today" is the person's own day: midnight in `p_tz`, not in UTC. Runs as the
-- caller, so row security applies: a signed-in person passing someone else's
-- `p_user` gets nothing back. `p_user` exists for the server's clock, which
-- runs as the service role and has no `auth.uid()`. Merged-away thoughts have
-- no logs left, so they never appear.
-- ============================================================================
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


-- ============================================================================
-- THE NOTIFICATION KEYS AND THE CLOCK'S SECRET, READ FROM THE VAULT.
--
-- They live in Supabase Vault, not in the hosting's settings, so no person has
-- to paste them anywhere and they move with the database when the app leaves
-- Vercel. Only the service role may call this, and only these three names can
-- be read through it. Values are put in the vault by hand (never by a
-- migration: a migration is in the repository).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notification_secret(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ds.decrypted_secret
    FROM vault.decrypted_secrets ds
   WHERE ds.name = p_name
     AND p_name IN ('push_vapid_public', 'push_vapid_private', 'notifications_clock_secret')
$$;

REVOKE ALL ON FUNCTION public.notification_secret(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notification_secret(TEXT) TO service_role;
