-- ============================================================================
-- THE BLACK BOX GETS AN ACCOUNT.
--
-- Today the whole record — every run off every vice, every night somebody
-- nearly went and didn't, and what they were thinking — is one lump of JSON in
-- one browser under `vice-blackbox-v1`. Clear your browsing data and it is
-- gone. Open it on your phone and it was never there. A second browser is a
-- second, diverging record that can never be brought back together.
--
-- These two tables are that record, as rows. Phase 1 of
-- docs/plans/vice-on-the-account.md, approved by the owner on 2026-09-23.
--
-- NOTHING IS MIGRATED BY THIS FILE. It creates empty tables and stops. The
-- browser copy is imported once, by the app, only into an account with no rows
-- — because the import has to read a key that only exists in a browser.
--
-- ----------------------------------------------------------------------------
-- THE FOUR DECISIONS THE SHAPE RESTS ON, so none of it is arbitrary.
--
-- 1. IDS ARE MINTED ON THE DEVICE, so there is no `DEFAULT gen_random_uuid()`
--    anywhere here. The record is written offline and syncs later; a row whose
--    id is decided by the server cannot exist until the server has seen it, and
--    this page has to work at eleven at night on no signal. `crypto.randomUUID`
--    is what mints them.
--
-- 2. A DELETION IS A ROW. `deleted_at` rather than `DELETE`, because a device
--    that was offline when something was removed would otherwise see a row the
--    server no longer has, decide the server forgot it, and upload it again —
--    forever, on every device. Nothing in the app issues a DELETE.
--
-- 3. A CHILD LINKS TO ITS PARENT ON (parent, owner) TOGETHER, which is why
--    `vice_attempts` carries a UNIQUE (id, user_id) that looks redundant beside
--    its primary key and is not. A report cannot be attached to someone else's
--    run even if the app asks for it, because the foreign key has nothing to
--    match. The same rule the life_plan tables next door follow.
--
-- 4. THE THREE KINDS OF TIME ARE THREE DIFFERENT COLUMN TYPES, and muddling
--    them is a bug this module has already had once.
--      * `started_on` / `ended_on` are CALENDAR DAYS in the person's own
--        calendar. DATE. No zone, because a day has none.
--      * `at` is the NIGHT something happened, in the person's own wall clock.
--        TIMESTAMP WITHOUT TIME ZONE, deliberately: a report filed at 23:30 in
--        Berlin must not become tomorrow, which is exactly what storing it with
--        a zone would do.
--      * `updated_at` / `deleted_at` are SYNC BOOKKEEPING, compared across
--        devices that may be in different places. TIMESTAMPTZ, true instants.
--        Local wall-clock text stops being comparable the moment a phone in
--        Berlin meets a laptop in London.
-- ============================================================================


-- ============================================================================
-- ONE ROW PER RUN.
-- ============================================================================
CREATE TABLE IF NOT EXISTS vice_attempts (
  -- Minted on the device. See decision 1.
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The catalogue id and the person's own words for it. Both carried since day
  -- one so that a second vice was never a migration, which is why the screen
  -- could be given a vice switcher without touching the stored shape.
  vice_id TEXT NOT NULL CHECK (length(vice_id) BETWEEN 1 AND 40),
  label TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 80),

  started_on DATE NOT NULL,
  -- What got it going, and what was put in place to keep it underway. The
  -- owner's concept item 3: the important periods understood, not only ended.
  started_by TEXT NOT NULL DEFAULT '',
  structure TEXT[] NOT NULL DEFAULT '{}',

  ended_on DATE,
  -- The report that ended it. NOT a foreign key, on purpose: reports point at
  -- attempts and this points back, and a mutual constraint cannot be satisfied
  -- by either insert order. The app writes both together and `importRecord`
  -- refuses a file where this names a report the file does not carry.
  ended_by_report_id UUID,

  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,

  -- A run cannot end before it starts. The store refuses it too; this is the
  -- guard that cannot be skipped by any caller, present or future.
  CONSTRAINT vice_attempts_ends_after_start CHECK (ended_on IS NULL OR ended_on >= started_on),
  -- Decision 3.
  CONSTRAINT vice_attempts_id_owner UNIQUE (id, user_id)
);

-- The delta read: "everything of mine that changed since X". `id` comes after
-- `updated_at` because paging a moving table on a non-unique key can put the
-- same row in two pages and lose the one it displaced.
CREATE INDEX IF NOT EXISTS vice_attempts_owner_changed
  ON vice_attempts (user_id, updated_at, id);


-- ============================================================================
-- ONE ROW PER REPORT — a night you nearly went, or a night you did.
--
-- ONE TABLE FOR BOTH, and `went_through` is the only column that differs. From
-- the Aviation Safety Reporting System, which has collected voluntary close-call
-- reports since 1976 on the premise that the chain behind a near miss is the
-- same chain as behind the accident. Giving near misses a lighter, separate
-- home is how they become second-class and stop being filed, and a log holding
-- only somebody's defeats is the object that makes the next one likelier.
-- ============================================================================
CREATE TABLE IF NOT EXISTS vice_reports (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_id UUID NOT NULL,

  -- The person's own wall clock. See decision 4.
  at TIMESTAMP NOT NULL,
  went_through BOOLEAN NOT NULL,

  -- The rationalisation, in their own words, and which family it belongs to.
  -- The family is a closed set: an id the app does not know renders as
  -- "something else" on every bar AND drops out of the cost ranking, because
  -- that panel walks the known families — two panels disagreeing with nothing
  -- on screen saying why. The check is what stops it being possible at all.
  thought TEXT NOT NULL DEFAULT '',
  ending TEXT NOT NULL CHECK (ending IN ('fine', 'justone', 'drink', 'stress', 'faded', 'other')),

  -- Null is a real answer and means "they did not say". Not zero.
  closeness SMALLINT CHECK (closeness IS NULL OR closeness BETWEEN 0 AND 10),

  -- Being alone was a top-five predictor of whether a craving became a lapse
  -- across 37,002 entries, and nothing else in this module records it.
  -- `where` is reserved in SQL, so the column is `where_at`.
  with_whom TEXT NOT NULL DEFAULT '',
  where_at TEXT NOT NULL DEFAULT '',
  -- Plural on purpose, never "the reason".
  factors TEXT[] NOT NULL DEFAULT '{}',
  -- Only meaningful on a close call.
  did_instead TEXT NOT NULL DEFAULT '',

  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,

  -- Decision 3: the pair, not the id alone.
  CONSTRAINT vice_reports_attempt_owner
    FOREIGN KEY (attempt_id, user_id)
    REFERENCES vice_attempts (id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS vice_reports_owner_changed
  ON vice_reports (user_id, updated_at, id);
CREATE INDEX IF NOT EXISTS vice_reports_attempt
  ON vice_reports (attempt_id);


-- ============================================================================
-- OWNER-ONLY, ALL FOUR OPERATIONS.
--
-- Approved by the owner on 2026-09-23. On Supabase the database is on the
-- public internet and these policies are the entire wall — the browser holds
-- the anon key by design. That is the arrangement the 2026-09-17 decision is
-- about leaving, and it is why `src/db/viceRepo.ts` scopes every query by
-- `user_id` in the repo as well: the policies get deleted rather than ported
-- when the platform moves, and the repo's scoping is what survives.
--
-- This is the most sensitive data in the app — which nights somebody drank,
-- used porn or gambled, and what they were thinking. There is no shared read,
-- no service-role path, and no policy here that is true for anybody but the
-- owner of the row.
-- ============================================================================
ALTER TABLE vice_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vice_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vice_attempts_select_own ON vice_attempts;
CREATE POLICY vice_attempts_select_own ON vice_attempts
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS vice_attempts_insert_own ON vice_attempts;
CREATE POLICY vice_attempts_insert_own ON vice_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS vice_attempts_update_own ON vice_attempts;
CREATE POLICY vice_attempts_update_own ON vice_attempts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS vice_attempts_delete_own ON vice_attempts;
CREATE POLICY vice_attempts_delete_own ON vice_attempts
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS vice_reports_select_own ON vice_reports;
CREATE POLICY vice_reports_select_own ON vice_reports
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS vice_reports_insert_own ON vice_reports;
CREATE POLICY vice_reports_insert_own ON vice_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS vice_reports_update_own ON vice_reports;
CREATE POLICY vice_reports_update_own ON vice_reports
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS vice_reports_delete_own ON vice_reports;
CREATE POLICY vice_reports_delete_own ON vice_reports
  FOR DELETE USING (auth.uid() = user_id);
