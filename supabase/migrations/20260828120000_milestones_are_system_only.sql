-- BADGES AND COUNTERS ARE AWARDED BY THE SERVER, NEVER CLAIMED BY A USER.
--
-- Until this migration, any signed-in user could give themselves any badge and
-- set their approach count to whatever they liked, straight from the browser
-- with the public anon key — no tooling, just a POST. Three policies allowed it:
--
--   "Users can insert own milestones"   -> grant yourself Living Legend
--   "Users can insert own stats"        -> create a stats row of your choosing
--   "Users can update own stats"        -> set total_approaches to 5000
--
-- Nothing in the app used them. Every write to either table goes through the
-- service-role client in trackingRepo (`insertMilestones`,
-- `replaceUserTrackingStats`, `rollTrackingCounters`), which bypasses RLS by
-- design, so removing these takes no capability away from the product. The code
-- has assumed they were already gone for months: see the comment
-- "milestones is system-only (no user INSERT policy)" in src/db/trackingRepo.ts.
--
-- SELECT policies are untouched. Users still read their own badges and stats.

drop policy if exists "Users can insert own milestones" on public.milestones;
drop policy if exists "Users can insert own stats" on public.user_tracking_stats;
drop policy if exists "Users can update own stats" on public.user_tracking_stats;

comment on table public.milestones is
  'Achievements. System-only writes: awarded by the server from the user''s own rows (src/tracking/achievementsSyncService.ts). Insert-only — a badge earned is never revoked.';
comment on table public.user_tracking_stats is
  'Derived counters. System-only writes: recomputed from source rows on every change, never incremented. Not a source of truth for anything — see docs/plans/achievement_counters.md.';
