-- The last three tables with Row Level Security switched off.
--
-- Until this runs, anyone who reads the public anon key out of the browser can
-- read AND write these three tables. Verified 2026-09-02 via `npm run audit:rls`.
--
-- WHAT READS THEM (checked before writing this, not assumed):
--
--   embeddings_test  32,126 rows, the QA coaching corpus. Every reader goes
--                    through src/db/embeddingsTestRepo.ts, and all 7 functions
--                    in it use createAdminSupabaseClient() -- the service-role
--                    key, which bypasses RLS entirely. src/qa/retrieval.ts
--                    imports from @/src/db/server, so retrieval is server-side.
--                    No browser ever queries this table.
--
--   core_values      222 rows. ZERO references in src/, app/ or scripts/. The
--                    application reads the separate `values` table instead.
--                    core_values exists only as the target of
--                    user_values.value_id.
--
--   user_xp          0 rows. ZERO references anywhere in the codebase.
--
-- Because nothing reads any of these with a user's key, the correct setting is
-- the tightest one: RLS on, and NO policy at all. That means "only server-side
-- code holding the secret key may touch this". It is the same pattern already
-- used by beta_invites, waitlist_emails and plan_snapshots in this repo.
--
-- An earlier draft of this migration added `select using (auth.uid() is not
-- null)` to each table. That was inventing a reader that does not exist. If a
-- feature later needs browser access, it adds its own policy then.

-- ---------------------------------------------------------------------------
-- 1. The coaching corpus. Server-only.
--
--    Honest limit: this stops anonymous scraping. It does NOT protect the
--    corpus from a signed-in user, because it never needed to -- retrieval
--    already runs on the server and returns only matching chunks. That is the
--    right architecture and it is why no policy is needed here.
-- ---------------------------------------------------------------------------
alter table public.embeddings_test enable row level security;
revoke select, insert, update, delete on public.embeddings_test from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. core_values. Server-only until something actually reads it.
--
--    NOTE: this table is a near-duplicate of `values` -- same columns
--    (id, category), 222 rows each, 221 ids in common. `values` is the one the
--    app reads. Consolidating them is a separate decision, tracked as an open
--    question in docs/plans/beta-launch.md. Locking it changes nothing today
--    and does not prejudge that decision.
-- ---------------------------------------------------------------------------
alter table public.core_values enable row level security;
revoke select, insert, update, delete on public.core_values from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. user_xp. Empty, unreferenced, duplicates profiles.xp.
--
--    Secured rather than dropped: locking is reversible, dropping is not, and
--    whether this table has a future is an open question. If the answer is
--    "drop it", that is one line later.
-- ---------------------------------------------------------------------------
alter table public.user_xp enable row level security;
revoke select, insert, update, delete on public.user_xp from anon, authenticated;
