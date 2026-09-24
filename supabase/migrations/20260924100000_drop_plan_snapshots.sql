-- ============================================================================
-- THE UNAUTHENTICATED MIRROR OF EVERYBODY'S PLAN COMES DOWN.
--
-- M5 of docs/plans/life-mastery-everything-saves.md. Approved by the owner on
-- 2026-09-24, after M1 was proved on their own account.
--
-- WHAT THIS TABLE WAS. `POST /api/plan-snapshots` accepted a copy of anybody's
-- whole Life Mastery plan — journal and day notes included — **with no sign-in**,
-- and wrote it with the service-role key, the credential that ignores every
-- row-level-security rule in this database. It was on by default, with an
-- opt-out you had to find at the foot of the page. The rows carried no owner:
-- `user_id` was null on every one, keyed instead by a UUID the browser minted
-- for itself.
--
-- It existed for a good reason — seeing where real plans got stuck, when the
-- plan lived nowhere but a browser and there was no other way to look. Phase 1
-- and M1 made it redundant: the plan and the day half are on the account now,
-- readable by their owner and by nobody else.
--
-- To be accurate about the risk in both directions, because the first draft of
-- the plan overstated it: reading a row needed either the browser's random id
-- or the service key, so this was not an open window onto everybody's journal.
-- What it was, with no qualification, is an unauthenticated WRITE path into the
-- production database using the most privileged credential it has.
--
-- ----------------------------------------------------------------------------
-- THE ROWS ARE EXPORTED, AND NOT INTO THIS REPOSITORY.
--
-- All 120 (not the 76 the original plan recorded — it was still collecting)
-- were written to a file in the owner's home directory on 2026-09-24, verified
-- to contain their real plan: 50 goals, 12 areas, revision 356, 69,653 bytes.
--
-- The deployment plan said to commit them as a test fixture. That would publish
-- a journal into git permanently, where it cannot be unpublished. Outside the
-- repository is the point, not an implementation detail.
--
-- THIS IS IRREVERSIBLE. If the export is not where the commit message says it
-- is, stop and find it before running this.
-- ============================================================================

DROP TABLE IF EXISTS plan_snapshots;

DO $$ BEGIN
  RAISE NOTICE 'plan_snapshots dropped; the plan lives on the account now.';
END $$;
