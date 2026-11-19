# Tests that catch what matters

Written 2026-11-19. **Status: proposed.** Pasting the execution prompt at the end is the go.
Follows `Plans/tests-green-and-fast.md` (tests green again, suites fast; its Phase 7 is still open).
That plan made the tests run. This one makes them catch more of what can hurt: lost or leaked data,
a broken live site, and a red main that nobody owns. Every phase is low to medium risk. No test is
deleted. Each phase names the model that runs it.

## What you are agreeing to, in plain words

- **No money.** GitHub runs are free for this public repo. The mutation tool (Phase 7) is free and
  downloads on demand; nothing is added to the app's package list.
- **Your real data is never touched.** Every new data test runs on the throwaway test database. The
  one new check against the live site (Phase 6) opens public pages signed out and never writes.
- **Nothing irreversible, nothing deleted.** Tests are only added or repaired.
- **One new thing runs on its own:** after each deploy, a one-minute check opens the live site and
  goes red if it is broken. Red shows up in every Claude session's start line, like main does now.

## What you will notice when it is done

1. When main is red, every session sees **which commit broke which test**. Today every browser run on
   main since 09:53 UTC was red (27 in a row), from several sessions' work, and each one can say
   "not mine".
2. Two kinds of mistakes that turned main red again and again get caught **at commit, in seconds**,
   instead of 20 minutes after the push.
3. **Every server address in the app is checked to refuse a stranger**, not 21 picked by hand.
4. The functions that **write your data** (training sessions, approaches, field reports, goals,
   workouts, time-log restore, settings) each get a test proving they write the right row and only
   your row. 125 of them have no test at all today.
5. **The live site is checked after every deploy.** On 2026-11-18 it logged 26 server errors
   ("Cannot find module") across 13 deploys, and nothing told anyone.
6. **We learn how strong the tests on your daily tools really are** (Time Log, check-ins, black box),
   by breaking the code on purpose and seeing whether the tests notice. Gaps found get tests.
7. Flaky tests (pass only on the second try) get fixed, and the everyday phone flows of the Time Log
   and check-ins get a test each where none walks them the way you use them.

## Facts measured 2026-11-19 (origin/main 14949b79)

| What | Now | Target | After |
|---|---|---|---|
| Unit tests | 8,260 in 691 files, 94.6 s with coverage on this PC | unchanged speed (± 10 %) | |
| Unit line coverage (unit only; database and browser tests not counted) | 33.6 % lines, 29.5 % branches. Time Log 85 %, check-ins 77 %, programs 78 %; goals 30 %, quit 25 %, tracking 20 %, `app/api` 11 % | no % target (see "Left out") | |
| Functions that write user data (`tests/unit/writeCoverage.test.ts`) | 236: 51 asserted, 60 mentioned, **125 unasserted** (ceiling 128) | unasserted ≤ 70 | |
| API routes (`app/api/**/route.ts`) | 137; **52** have no test that names their path; `security-auth.spec.ts` checks 21 from a hand list | all 137 checked signed out | |
| Main E2E on 2026-11-19 | **27 red in a row** since 09:53 UTC (green 08:04–09:46), from rebrand, quit, plan-new and sweep changes | red runs name their first red commit | |
| Main CI static job | Lint ratchet red in 5 main CI runs, 2026-11-18 22:00 – 11-19 07:00 UTC | lint caught at commit | |
| Sweep broken by a page hidden on purpose | 4 times in 2 days: `/quit/lab`, `/plan/sandbox`, `/quit/coaching`, `/plan/new/role-models` | caught at commit | |
| Known flaky browser specs | 6 (tests-green B13) | 0 | |
| Check of the live site after deploy | none | every production deploy | |
| Mutation score (share of planted bugs the tests catch) | one file tried: `src/audit/pingService.ts` 45 % (24 caught, 29 in code no unit test runs), 29 s | measured on 8 daily-use files, survivors triaged | |

Live-data ranking (read-only row counts, 2026-11-19; numbers kept out of this public repo): the
tables with the most rows are training sessions, workout sets, approaches, Time Log entries, life
plan nodes, field reports, life plan seasons, goal snapshots, vice reports and goals. Phase 4 goes in
that order.

## What the research says (checked 2026-11-19 unless marked)

- **Mutation testing** is the honest measure of whether tests catch bugs; coverage can be 100 % with
  weak asserts. Thoughtworks Technology Radar, April 2026: "Trial", names Stryker. Checked.
- **AI-written tests confirm their own author's mistakes** ("self-confirming loop"); the fixes teams use
  are mutation testing, a different author for tests than for code, and running candidate tests many
  times to catch flakiness (Stevens 2026 paper and practitioner write-ups, mostly vendor blogs).
  Checked; numbers in those posts are not verified.
- **Flaky tests:** retries hide real bugs; teams track tests that pass only on retry and fix them by
  waiting for real state, not sleeping. Playwright marks them "flaky". Checked (vendor blogs, consistent).
- This repo already knows the self-confirming problem: `scripts/tests-must-fail-without-the-fix.mjs`
  and the write-coverage ratchet were written after the same failure (memory, confirmed in the files).

## Left out on purpose

| Idea | Why not now |
|---|---|
| Screenshot comparison tests | The rebrand changes colours and layout this week; pictures would go red daily for nothing |
| Gating pushes (branch first, merge queue) | You want pushes to main without gates. Phases 1–2 make breaks visible and owned instead |
| A coverage % target | Rewards the easy tests: the write-coverage file records helpers covered while the database write was not |
| Property-based tests (fast-check) | Needs a new package. Phase 7 shows first whether the merge logic tests are weak |
| Tests for the quit tools and `/plan/new` | Their own sessions rebuild them daily and write their own specs |
| Checking every `[id]` route with a second account | Needs a test object per route; `security-idor.spec.ts` covers the main ones. Revisit after Phase 3 |
| Deleting tests | No test found that fails the removal rule (R-DEL in tests-green-and-fast). Nothing removed |
| More speed work | Done by tests-green-and-fast |

## Blockers, each tried once

| ID | What | Tried, result | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | One shared local test database | `docker ps`: `supabase_db_daygame-tests Up 7 hours (healthy)`, shared by every session | local integration and browser runs | GitHub runs them. Locally one file at a time by memory `integration-tests-without-stack-up` / `worktree-e2e-servers` |
| B2 | tests-green-and-fast Phase 7 still open in another session; it edited `scripts/ci/main-status.mjs` today (2d9825a5) | `git log origin/main` | Phases 1, 5, 6 touch the same files | Rebase before every commit; never edit `docs/testing/durations.json` baselines (that plan lowers them) |
| B3 | Mutation tool on this test setup (vitest 4, three projects) | First run red before mutating: `every variable the code reads is on the list … expected [ …(2) ] to deeply equal []` (in-place instrumentation adds code a repo-scanning test reads). Second run with `vitest.related: true`: worked, 29 s, `@stryker-mutator/core@9.6.1` | Phase 7 | Always `related: true`, in a scratch worktree, never in the shared checkout |
| B4 | Live site reachable from a check | From this PC: `/api/healthz` 200 with `buildId`; public pages 200. The per-deploy URL answers 302 (Vercel sign-in wall) | Phase 6 | Use the production domain and wait for `buildId` = the deployed commit. GitHub runner IPs untried: the first Phase 6 run is that attempt; if blocked (403 or challenge), record it and stop Phase 6 |
| B5 | Deploys reach GitHub as events | Newest Production deployment has status `success` by `vercel[bot]` | Phase 6 trigger | `on: deployment_status`. That app-created events start workflows is from memory of GitHub's docs, not checked |
| B6 | Dependency manifests | Not needed: the mutation tool runs by `npx`; nothing here edits `package.json` | nothing | If a step turns out to need one, stop that step and record it |
| B7 | Vercel's ~60 deploys a day | memory `vercel-late-deploy-rollback` | pushes | At most one push to main per finished phase |
| B8 | Main red from other sessions (tests-green B10–B12, today's site-frame and sweep reds) | E2E 44581804643 | "green" acceptance runs | Not this plan's to fix. Judge a phase green on its own specs; Phase 1 makes the others name themselves |
| B9 | Local full typecheck cannot finish while several sessions run | `node scripts/typecheck-ratchet.mjs` killed 3+ times per worker: `tsc exited with 143` (SIGTERM from `~/.cache/daygame-research/tools/memguard.sh` when RAM + swap < 2.5 GB; its log names tsc from this plan and from other sessions) | Part 2's local typecheck before push | Use CI `static` (same typecheck and lint ratchets) green on the branch head before pushing to main; every phase quotes that run |
| B10 | Vercel deploy rate limit, hit by all sessions' pushes on 2026-11-19 | Commit status on main f43f0529 (20:16 UTC): `Vercel failure Deployment rate limited — retry in 24 hours.`; live `/api/healthz` buildId stays `ee1ae8db` (20:04 UTC) | Phase 6's real Production run (B4, B5 untested) | After the limit lifts, the next push to main deploys; find the first non-skipped `live-check.yml` run and quote it in Phase 6 |

## Questions, each with a recommendation (proposed until you say yes)

| Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|
| Q1 When the live check fails, what happens? | It goes red and every session's start line says so. Nothing automatic | Roll back on Vercel by itself (needs power over your Vercel account) | A broken live site waits for the next session |
| Q2 Should a test that passes only on its second try turn main red? | No. Show it in the start line when it flaked in 2 of the last 5 main runs | Fail the run (`failOnFlakyTests`) | More red on a main many sessions push to |
| Q3 Run the mutation check every night? | No. Once now, with a saved command any session can rerun | Nightly on GitHub | A weak test on new code goes unnoticed until someone reruns it |

---

# PHASES

Every phase ends with a **Status** line in this plan: done with the deciding command output quoted,
or `blocked: <ID>` with the exact message. Phases 1, 2, 3, 4 and 6 do not depend on each other except
where noted; 5 before 8; 9 last.

## Phase 0 — Rig · XS · haiku

1. `git worktree add -b tests-catch ~/.cache/daygame-research/tests-catch/wt origin/main`, symlink
   `node_modules` from the main checkout. Each later phase gets its own worktree branched from the
   newest `origin/main` under `~/.cache/daygame-research/tests-catch/`.
2. Write the start SHA here.

Accept: worktree exists; start SHA written.

**Status:** done 2026-11-19 — rig worktree ~/.cache/daygame-research/tests-catch/wt on branch tests-catch; start SHA 7530375257ff59edc38bb5c61a98c3e067abf685 (origin/main when execution began).

## Phase 1 — A red main names the commit that broke it · M · sonnet

1. `.github/workflows/e2e.yml`, job `report`: after the HTML merge, also run
   `npx playwright merge-reports --reporter json ./all-blob-reports > merged.json`.
2. New `scripts/ci/e2e-failures.mjs <merged.json> [previous failures.json]` writes `failures.json`:
   `{ sha, subject, runId, failed: [{ id: "<file>:<line> <title>", project, firstSha, firstSubject, firstRunId }], flaky: [{ id, project, last5: [bools] }] }`.
   A test failing in both runs keeps the previous `firstSha`; a new failure gets this run's sha; a test
   that passed drops out. With no previous file, `firstSha` is `null` (printed "red since before
   tracking began").
3. On a push to main, the report job downloads the previous file: the newest earlier completed main
   push run of `e2e.yml` that has artifact `e2e-failures` (look back at most 5 runs). Give the job
   `permissions: { contents: read, actions: read }` and `GH_TOKEN: ${{ github.token }}`. Upload
   `failures.json` as artifact `e2e-failures` (retention 14 days) and write a short table to
   `$GITHUB_STEP_SUMMARY`.
4. `scripts/ci/main-status.mjs`: for a red E2E run, download its `e2e-failures` artifact (3 s timeout;
   skip silently when missing or slow; total stays ≤ 5 s, exit 0 always). After the existing line,
   print at most 3 lines grouped by first red commit, then one flaky line if any test flaked in ≥ 2 of
   its last 5:
   ```
   main is red since 2026-11-19: E2E Tests (run 44581804643)
     4 tests first red at 3423892f "Rebrand Phase 7: Training card on You…" (e.g. programs-one-language.spec.ts:191)
     2 tests first red at 886a1721 "Plan new: V1 sequence…" (e.g. cold-open.spec.ts:192)
     flaky on main: audit.spec.ts:411 (3 of 5 runs)
   ```
5. Tests: `tests/unit/ci/e2eFailures.test.ts` (carry forward, new failure, fixed test drops out, no
   previous file, flaky window) and new fixtures in `tests/unit/ci/mainStatus.test.ts`. Keep
   `tests/unit/ciWorkflows.test.ts` and `pipelineRules.test.ts` green; add an assertion that the report
   job uploads `e2e-failures`. Never delete one of their assertions.

Accept: on a main push run the artifact exists and `node scripts/ci/main-status.mjs` prints a grouped
line naming a real commit; with a green fixture it prints nothing. Quote both.

**Status:** done 2026-11-19 — report job writes artifact `e2e-failures` on every main push run and main-status prints it; chain proved on runs 44596562185 (first, firstSha null) -> 44598007336 -> 44599561980 -> 44600730312 (fix 336513ba matches tests without the line number); `node scripts/ci/main-status.mjs` printed `main is red since 2026-11-19: E2E Tests e2e-fast (run 44598007336)` / `  2 tests first red at 2ae85b01 "Tests catch: Phase 2 — lint at commit…" (e.g. cold-open.spec.ts:153)` (that group was the old line-number bug, fixed after) and now `  15 tests red since before tracking began (e.g. route-sweep.spec.ts:102)`; a green fixture prints nothing (mainStatus.test.ts); CI static+unit+database green on branch head 336513ba (run 44599833808).

## Phase 2 — The common main breakers caught at commit · S · sonnet

1. **Lint at commit.** If `scripts/lint-ratchet.mjs` has no file mode, add `--files <paths…>`: lint only
   those files with the same config and fail only where a file's count per rule rises above
   `eslint-baseline.json`. Call it from `.husky/pre-commit` for staged `.ts/.tsx/.js/.mjs` files, before
   the tests. Keep every existing comment there; update `tests/unit/ci/preCommitHook.test.ts`.
   Budget ≤ 8 s for 5 files; quote `time sh .husky/pre-commit` for one `src/` file.
2. **Pages hidden on purpose.** Move `NOT_SWEPT` out of `tests/e2e/sweep/cold-open.spec.ts` into
   `tests/support/` (the spec imports it). New `tests/unit/navigation/gatedPagesAreNotSwept.test.ts`:
   every static route from `tests/support/appRoutes` whose page file calls `notFound(` must be in
   `NOT_SWEPT` with a reason, or in a short `NOT_FOUND_ONLY_ON_BAD_INPUT` list with a reason. Do the
   same for any exclusion list `route-sweep.spec.ts` keeps. Prove it: remove the `/quit/lab` entry,
   the test goes red with a message naming the page; put it back.
3. Check `scripts/related-tests.mjs` runs that test when only an `app/**/page.tsx` is staged (commit
   8b1ea813 taught it files read by glob). Throwaway commit on the work branch; quote the output. If not
   picked, make it picked.

Accept: the three quoted outputs; full unit suite green.

**Status:** done 2026-11-19 — lint at commit (`lint-ratchet.mjs --files`, judged on staged text, same baseline as the full run), hidden-page gate (`NOT_SWEPT` now in tests/support/notSwept.ts; `gatedPagesAreNotSwept.test.ts` red without the `/quit/lab` line), staged `app/**/page.tsx` now runs the route-walker tests; `time sh .husky/pre-commit` for one src/ file: real 0m2.147s, "Lint: 1 file(s), none new."; full lint ratchet "Lint errors: 290, none new." Round 2: `/quit/coaching` moved to `NOT_SWEPT` (CI sweeps a production build, where it 404s); `NOT_FOUND_ONLY_ON_BAD_INPUT` is empty and refuses env/flag/preview pages.

## Phase 3 — Every API route refuses a stranger · M · sonnet

1. New `tests/e2e/sweep/api-signed-out.spec.ts`, desktop project, `request` fixture with no cookies.
   Routes come from disk (`app/api/**/route.ts`), methods from the file's exports
   (`export (async )?function GET|POST|…` or `export const GET`). Dynamic segments get a random UUID;
   writes send `{}`.
2. Allowed answers: 401, 403, 404, 405. Never 2xx, never 5xx. A 400 means the route reads the body
   before checking sign-in: a finding. Routes meant to be public (healthz, auth callbacks, webhooks that
   check a signature, cron that checks a secret, …) go in a `PUBLIC_API` list in `tests/support/`, each
   with a reason and the answer it gives a stranger. A unit test fails on a stale entry.
3. A route that answers 2xx with data or 5xx is a product bug: make it check sign-in first with the
   app's existing helper (copy how a neighbouring route does it), one commit per route. Keep the
   hand list in `security-auth.spec.ts` (it also checks bad tokens).

Accept: a dispatched E2E run with the new spec green; the count of routes checked quoted (137 or the
current number); each finding and its fix listed here.

**Status:** done 2026-11-19 — `tests/e2e/sweep/api-signed-out.spec.ts` (sweep-desktop) asks every API route with no session; 137 route files, 194 route x method pairs checked, 5 PUBLIC_API entries (healthz GET 200, errors POST 200, auth/sign-out POST 200, notifications/tick POST 401|503, quit/count POST 400), each asserted to its exact answer; a unit test (`tests/unit/auth/apiRoutes.test.ts`) fails on a stale entry. Findings: none beyond the five public routes. Every other pair answered 401/403/404/405, no 2xx, no 5xx, no 400, so no product fix and nothing in KNOWN_FINDINGS. First CI run, before the list existed, named exactly those five: `POST /api/auth/sign-out: got 200`, `POST /api/errors: got 200`, `GET /api/healthz: got 200`, `POST /api/notifications/tick: got 503`, `POST /api/quit/count: got 400`. With the list, e2e.yml runs 44595744239 (workflow_dispatch, commit 2e139ca) and 44599956559 (push, commit bc67576, no skip left in the spec), e2e-fast job: `api-signed-out: 137 route files, 194 route x method pairs, 5 public` and `✓ 1 [sweep-desktop] › tests/e2e/sweep/api-signed-out.spec.ts:37:7 › API routes, signed out › every route and method refuses a stranger (2.9s)`. Same job's other failure is B8, not this phase: `/quit/coaching answered 404`. `security-auth.spec.ts` hand list kept. CI `static` (typecheck + lint ratchets) and `unit` green on bc67576: run 44599956633. Local dev server (`next dev`) dies from memory pressure around `/api/goals/tree-of-life`, so the acceptance evidence is CI's production build.

## Phase 4 — Writes to your data get real tests · L · sonnet, three agents in parallel

Order (by live rows): A = `src/db/trackingRepo.ts` + `src/tracking/trackingService.ts` (46 functions);
B = `goalRepo` (9), `valuesRepo.deleteUserValues`, `settingsRepo` (9), `profileService` (5),
`innerGameProgressRepo` (6); C = `programRepo` (9), `workoutRepo` (3), `programDraftRepo` (3),
`timetrackBackupRepo.restoreTimetrack`, `healthRepo` (7). Skip lab and test-only writers
(`apiAiService` test logging, `embeddingsTestRepo`, `scenario*`).

Per function, an integration test in `tests/integration/repos/<repo>Writes.integration.test.ts`
(through the service where the app calls the service):
1. The row as written: every field the function sets.
2. A second user's rows, created first, are byte-identical afterwards.
3. Delete, archive, reset: only the target rows change.
4. **Put the defect back:** per file, two hand edits (drop the user filter; change one written field);
   the tests go red; revert. Write which test caught each in the Status.

Then mark each function `"asserted"` in `tests/support/writeCoverage.baseline.json` and lower
`MAX_UNASSERTED` to the new count. A test that finds data loss or a leak: fix it in the repo function
when ≤ 30 lines with the test as proof; bigger, mark the test `it.fails` with a comment naming the
finding and add a finding row here. Run integration files on GitHub (CI `database` job runs on every
branch push) or locally one file at a time (B1).

Accept: `unasserted` ≤ 70, quoted from the baseline; CI `database` job green on the branch; the
put-the-defect-back table filled in.

### Group A (`trackingRepo` + `trackingService`)

All 50 baseline rows of the two files (46 unasserted, 4 mentioned) are marked `"asserted"`. One file,
`tests/integration/repos/trackingRepoWrites.integration.test.ts` (27 tests), reads every row back from
the database. Each test first creates a second user with a row in every tracking table and ends on a
whole-row, every-column comparison of that user's rows before and after. Service functions are tested
through the service, so the recounted totals and badges are checked too.

| File | Defect put back (reverted) | Test that went red | CI run |
| --- | --- | --- | --- |
| `src/db/trackingRepo.ts` | `removeFavoriteTemplate` loses `.eq("user_id", userId)` | "addFavoriteTemplate, removeFavoriteTemplate and getFavoriteTemplateIds keep that person's list…" | 44591070649 |
| `src/db/trackingRepo.ts` | `updateUserTrackingStats` filter `.eq("user_id", userId)` replaced by `.not("user_id","is",null)` | "updateUserTrackingStats writes the fields named into that person's row only" (and the replace / roll / display tests that share the table) | 44591021580 |
| `src/db/trackingRepo.ts` | `abandonSession` writes `end_reason: 'completed'` | "abandonSession (repo + service) closes that session as abandoned…" | 44593195181 |
| `src/tracking/trackingService.ts` | `endSession` writes `goal_met: false` | "endSession (service) writes the ending of that session only…" and "reactivateSession (repo + service) opens that session again…" | 44593202103 |
| `src/tracking/trackingService.ts` | `deleteSession` stops recounting after the delete | "deleteSession (repo + service) removes that session and its approaches only, and the counters go down" | 44593210310 |

Defects were pushed to throwaway branches `tc-p4a-d1` … `tc-p4a-d5` (never to the work branch or main).

Findings (no data loss, no leak; nothing fixed, nothing marked `it.fails`):
- `createApproach` with a `session_id` that belongs to another person: the insert itself passes (a
  foreign key is checked past row security), only the recount of their session is refused. The caller's
  own approach row is left pointing at a session that is not theirs; it is invisible to the session's
  owner and goes with that session if it is deleted. Pinned by the test (error `Failed to update session`).
- `getFavoriteTemplateIds(<someone else's id>)` throws "Failed to create tracking stats: duplicate key"
  instead of returning nothing (the read is refused by row security, the create then collides). No data
  is touched; the caller only ever passes its own id.

**Status (group A):** done 2026-11-19 — see the combined Phase 4 Status line for the baseline count.

### Group C (programs, workouts, saved weeks, Time Log restore, health logs)

Files: `tests/integration/repos/{programRepo,workoutRepo,programDraft,timetrackBackup,healthRepo}Writes.integration.test.ts`.
Each delete also has a "filter alone" test that swaps the signed-in session for the server's key, because
row security otherwise hides a missing `user_id` filter in the repo.

| file | defect put back | test that went red |
|---|---|---|
| healthRepo | `deleteWeightLog` without `.eq("user_id")` | deleteWeightLog > filter alone: another account's id ... deletes nothing |
| healthRepo | `createWeightLog` writes `time_of_day: "evening"` over the given one | createWeightLog > writes every field it was given ... |
| programDraftRepo | `deleteDraft` without `.eq("user_id")` | deleteDraft > filter alone: another account's week is not deleted |
| programDraftRepo | `createDraft` writes `unit_system: "kg"` always | createDraft > writes every field it was given |
| programRepo | `deleteEnrollmentPermanently` without `.eq("user_id")` | deleteEnrollmentPermanently > filter alone: another account's ended program is not erased |
| programRepo | `resetEnrollment` rewinds to `dayIndex: 1` | resetEnrollment > rewinds the cursor, keeps the weights ... |
| workoutRepo | `adjustWorkout` drops the merge with the stored adjustments | adjustWorkout > writes what changed on the day, merges rather than replaces |
| workoutRepo | `discardWorkout` without `.eq("user_id")` | NONE: `requireLive(userId, ...)` runs first and refuses any workout that is not the caller's, so the filter on the delete is unreachable redundancy; not catchable by a test |
| timetrackBackupRepo | `restoreTimetrack` skips the first row of each page (`slice(i + 1, ...)`) | restoreTimetrack > writes every row of the backup back as it was; and > restoring twice changes nothing |
| timetrackBackupRepo | (user filter: `restoreTimetrack` has none, it writes only the backup's rows by id) | the "another account's rows byte-identical" test holds it; a first try with a no-op edit (`slice(i, i + PAGE_SIZE - 1)`, same rows under 1,000) stayed green, as it should |

Findings:
- `unenroll` (programRepo): never uses `userId` for the write. `end_enrollment(p_id)` has no user filter
  and the repo only checks for an open workout, so only row security stops it. With the server's key it ends
  another account's program. Not reachable from the app today. Marked `it.fails` in
  `programRepoWrites.integration.test.ts`; fix is an ownership read in the repo (the unit fake in
  `tests/unit/db/programRepoGuards.test.ts` would need that read) or a migration, both over 30 lines or an
  owner call. Remove `.fails` when fixed.

**Status (group C):** done 2026-11-19 — 23 functions asserted (programRepo 9, workoutRepo 3, programDraftRepo 3, healthRepo 7, restoreTimetrack); group C alone took the count 125 -> 102; with group A's marks merged the baseline holds 56 "unasserted" and MAX_UNASSERTED is 56; CI run 44600185515 on branch tests-catch-p4c: database success, static success, unit 1/2 and 2/2 success; one finding (`unenroll` has no user filter, `it.fails`), no data loss fixed.

### Group B (goalRepo, valuesRepo.deleteUserValues, settingsRepo, profileService, innerGameProgressRepo)

Files: `tests/integration/repos/{goalRepo,settingsRepo,profileService,innerGameProgressRepo,valuesRepo}Writes.integration.test.ts`
(66 tests). 32 functions marked `"asserted"`; the other five goalRepo writers that were "mentioned"
(`createGoal`, `incrementGoalProgress`, `rollGoalPeriods`, `syncLinkedGoals`, `updateGoal`) are left alone.
`MAX_UNASSERTED` 56 -> 26 (the test's own count after merging with the other groups on main).

| File | Defect put back | Test that went red |
|---|---|---|
| `src/db/goalRepo.ts` | `archiveGoal` writes `is_active: true` | `archiveGoal switches off that one goal and touches no other` |
| `src/db/goalRepo.ts` | `deleteGoal` without `.eq("user_id")` | stayed green: row security fences the delete, so the filter is the second lock, not the only one |
| `src/db/settingsRepo.ts` | `updateDifficulty` writes `"beginner"` | `updateDifficulty writes difficulty and nothing else` |
| `src/db/settingsRepo.ts` | `updateSubscriptionStatus` without the `user_id` filter | `updateSubscriptionStatus does not touch somebody else's purchase, even one the caller names` |
| `src/profile/profileService.ts` | `updateAgeRangeForUser` writes the end as the start | `updateAgeRangeForUser writes both ends, clamped to 18..45 and in order` |
| `src/profile/profileService.ts` | `updateSecondaryRegionDirectForUser` drops the "same as primary means none" rule | `writes null for null, and for the same region as the primary` |
| `src/db/innerGameProgressRepo.ts` | `resetProgress` without `.eq("user_id")` | `resetProgress puts every field of the person's row back to the start` (the database refuses an UPDATE with no WHERE) |
| `src/db/innerGameProgressRepo.ts` | `resetSection` leaves `cutting_completed` true | `resetSection hurdles ...` and `resetSection cutting ...` (plus the other section tests) |
| `src/db/valuesRepo.ts` | `deleteUserValues` filter replaced by a match-everything filter | stayed green: row security fences the delete to the caller's own rows |

**Finding (fixed, group B):** `settingsRepo.updateSubscriptionStatus` wrote nothing. `purchases` has
no UPDATE policy, so through the signed-in client the update matched zero rows and reported success;
cancelling or resuming a subscription never changed the purchase's `subscription_status`. Fixed in the
repo (admin client, fenced by a new `userId` argument; the two callers in `settingsService.ts` pass it),
proof: `updateSubscriptionStatus writes the status on the subscription named ...`. No customer is
affected today (nobody has paid).

**Status (group B):** done 2026-11-19 — CI run 44602957663 on branch tests-catch-p4b (head 36fe28d5): success (static, unit 1/2, unit 2/2, database all success).

**Status:** done 2026-11-19 — checked by the foreman: `tests/support/writeCoverage.baseline.json` on origin/main holds 26 `"unasserted"` (was 125), `MAX_UNASSERTED = 26`; CI on each pushed head green on database, static and both unit jobs: group A 44599988639 (b1b82125), group B 44603532244 (48d242d6), group C 44602388341 (3260a2db). One product bug fixed (`updateSubscriptionStatus` wrote nothing: `purchases` has no UPDATE policy); one finding kept as `it.fails` (`unenroll` has no user filter of its own); no data loss or leak found.

## Phase 5 — Flaky specs fixed · M · sonnet

1. `.github/workflows/e2e.yml` `workflow_dispatch` inputs `grep` (string) and `repeat_each` (number,
   default 1), passed to the lane's `playwright test` call. Update `ciWorkflows.test.ts`.
2. For each flaky spec (tests-green B13: `life-mastery-dated-steps.spec.ts:42`,
   `life-mastery-day-persists.spec.ts:227`, `role-models-council.spec.ts:127`,
   `life-mastery-achievements.spec.ts:40`, `audit.spec.ts:411`, `programs-live-format.spec.ts:408`
   android; plus `timetrack-sync.spec.ts:639` if Phase 1's artifact shows it first red on a commit
   that did not touch the Time Log): read the trace of the failed try, find the race, wait for real
   state (a request, a label), never a sleep. Unsure whether the product or the test races: treat it
   as the product.

Accept: per spec a dispatched run with `repeat_each=10` on its lane: 0 failed, 0 flaky. Quote run ids.

**Status:** done 2026-11-19 — dispatch inputs `grep` and `repeat_each` added (e2e.yml, `ciWorkflows.test.ts` "a dispatch can name tests and repeat them…"; empty inputs add no flag, push runs unchanged). Per spec (race found; fix; clean run at `repeat_each`):
- `audit.spec.ts` "a queued answer is wiped at Log Out" (android and desktop lane; the real flake): the spec pressed Log Out as soon as the header button answered, ~150 ms before the page's `load`; the press was lost (CI trail, run 44609248663: `click`, then `/dashboard` and `load`, no dialog for 20 s; 1 in 10 to 1 in 8 on both lanes: runs 44603744744, 44605794266). Fix: `waitForLoadState("load")` before the press. Run 44611304648, repeat_each=40: android 40/40, desktop 40/40, phone 40/40 passed, flaky 0.
- `role-models-council.spec.ts` "the values step offers what you took" (desktop; flaked once in run 44611284593): the chip shows once the council has loaded, before the account's plan has, and a tap in that gap is undone when the plan lands. Fix: press after both plan reads answered. Run 44613824191, repeat_each=30: 30/30 passed, flaky 0. Product finding, not changed: `planHalfAfterLoad` takes the account's plan whole when the page opened with no browser copy, so an edit made in that window is dropped silently (any control, not only this chip).
- `life-mastery-dated-steps`, `life-mastery-day-persists`, `life-mastery-achievements`, `life-mastery-goal-status` (desktop), `programs-live-format` "a workout that is over is not kept" (android): not reproduced alone. Main's failures were all `getByText('Saved to your account.')` not found in the default 5 s under a loaded shard (runs 44598007336, 44599561980, 44600730312); the label is the real state, so the wait stays and gets the 20 s the sibling specs use. Clean at repeat_each=10, 0 failed 0 flaky, before the change (run 44603744744) and after it (run 44611284593). The `programs-live-format` android spec passed 10/10 in both runs unchanged: no race seen, nothing changed. `timetrack-sync.spec.ts:639` was not in Phase 1's flaky lists: not touched.
Judged on its own specs: lint ratchet on this head fails only on `tests/e2e/quit/wave1-part1.spec.ts` (`'t' is assigned a value but never used`, another session's file, B8); typecheck ratchet run locally: `Type errors: 88, none new.`; `ciWorkflows.test.ts` 24 passed. A last all-specs dispatch (44615337248) died on Docker Hub `toomanyrequests: Rate exceeded` in every lane, twice.

## Phase 6 — The live site checked after every deploy · M · sonnet · after Phase 1

1. New `.github/workflows/live-check.yml`, `on: deployment_status`, job only when
   `github.event.deployment_status.state == 'success' && github.event.deployment.environment == 'Production'`.
   `env: LIVE_URL: https://daygame-coach.vercel.app` (one place; the domain changes with the rebrand).
   `permissions: contents: read`, no secrets.
2. Poll `$LIVE_URL/api/healthz` until `buildId` equals `github.event.deployment.sha` (max 10 min). If a
   newer commit is live first, end green ("superseded").
3. New Playwright project `live` (excluded from every other project), spec
   `tests/e2e/live/live-smoke.spec.ts`: open the public pages signed out (`/`, `/life`, `/dating`,
   `/quit`, `/pricing`, `/auth/login`, `/privacy`): 200, no Next error page, no "Cannot find module",
   no console error. It never writes: every non-GET request to `LIVE_URL` is aborted, and the test
   fails unless that request is in a short list in the spec with a reason (say, an analytics beacon).
   ≤ 3 min per run.
4. Add the workflow to `main-status.mjs` (its runs come from `deployment_status`, not `push`).
   Unit-test the healthz poll (match, superseded, timeout) with a fake fetch.

Accept: one real production deploy runs the check green; quote the run. B4 decides whether this
phase can finish.

**Status:** blocked: B10 — `Vercel failure Deployment rate limited — retry in 24 hours.` (commit status on main f43f0529), so no Production deploy can run the check today. Built and on main (a6e6b4b5): `live-check.yml`, `scripts/ci/live-wait.mjs`, project `live`, `tests/e2e/live/live-smoke.spec.ts`, the main-status line. Checked: the spec passes 8/8 against the real site from this PC in under 5 s; CI static green on the branch head (run 44604986181); `live-check.yml` does start on `deployment_status` (skipped runs for Preview and staging events), so B5 is half checked; B4 (GitHub runner IPs) untested. Found: every signed-out page makes one `GET /api/settings/time-preferences` that answers 401 (a console error for each visitor; `components/ClockSync.tsx` documents it as intended; the spec allow-lists exactly that request with the reason; proposed fix, not done: skip the call when there is no sign-in cookie, as the quit pages already do).

## Phase 7 — How strong are the tests on daily tools · M · sonnet

1. Commit `scripts/mutation/stryker.conf.json` (`testRunner: vitest`, `vitest.related: true`,
   `inPlace: true`, `coverageAnalysis: perTest`, `reporters: clear-text, json`) and
   `scripts/mutation/run.sh <file>` that runs
   `npx -y -p @stryker-mutator/core@9.6.1 -p @stryker-mutator/vitest-runner@9.6.1 stryker run …`
   with `--mutate <file>` and refuses to run outside a git worktree (in-place edits the files).
2. Check `~/.cache/daygame-research/tools/load.sh` first: `ok` concurrency 4, `busy` 2, `game` wait.
3. Run on: `src/timetrack/syncService.ts`, `syncVersionService.ts`, `timetrackService.ts`,
   `runningTimerService.ts`, `src/audit/auditQueue.ts`, `auditService.ts`,
   `src/vice/blackbox/blackboxStore.ts`, `src/shared/dateUtils.ts`. Write score, survived and no-coverage
   counts per file here.
4. Triage each surviving mutant: no behaviour change (ignore, say why in one line) or a real gap
   (write one test of the behaviour, not of the line). At most 40 new tests; data paths first (merge,
   queue, conflict, dates). Rerun the file; write the new score.

Accept: before/after score table for all 8 files; no new test that only restates the code.

## Phase 8 — Everyday phone flows · M · sonnet · after Phase 5

1. Map the everyday flows on `android` to the spec line that does each the way a person would (taps,
   the time wheel, not typing): Time Log start, stop, switch task, change start **and** end of a
   finished entry, change the start of a running one, delete and undo, add a missed entry for
   yesterday; check-in: answer from the notification link, change an answer, open the day's review.
   Write the map here.
2. For each gap (at most 6), one spec. Where measurable: start and end use the same control; lengths
   show as hours and minutes; controls ≥ 44 px (48 px in sheets, finding F27); the number of taps is
   written down as a ceiling.
3. Skip the life plan and the quit tools (rebuilt daily by their own sessions).

Accept: the map; each new spec green with `repeat_each=10` on android. "No gaps" is a valid result.

## Phase 9 — Prove it and report · S · opus reviewer, sonnet

1. A fresh `opus` subagent that wrote none of it runs `/code-review` on `<start SHA>..HEAD`
   (this plan's commits). Fix or record every finding.
2. A fresh `sonnet` subagent picks 10 new tests at random, breaks the code each guards with a one-line
   edit, confirms red, reverts. A test that stays green is rewritten.
3. Fill the "After" column. Remove the worktrees, `git worktree prune`, archive this plan into
   `Plans/ARCHIVE.md` (memory `plans-archive`).
4. Report to the owner in plain words, starting with any doubt: product bugs found, what now catches
   what, before and after numbers.

Accept: review and break-test results quoted; facts table filled.

---

# PART 2 — Rules for the executing session

- **Foreman.** The session running the prompt does no phase work. It starts one background `Agent`
  per phase (three for Phase 4) with the model the phase names, briefed with the phase text, its
  acceptance, this Part 2 and its worktree. It checks every acceptance itself against the thing
  itself (the GitHub run in the API, the diff, the numbers) before marking the phase done. A worker
  that fails the same acceptance twice: send the phase once more to an `opus` agent.
- **Shared checkout.** Work only in worktrees under `~/.cache/daygame-research/tests-catch/`. Never
  `git add -A`, `git stash` or `--no-verify` on main. Ship: rebase onto `origin/main`, run the related
  unit tests and `node scripts/typecheck-ratchet.mjs` and `npm run lint:ratchet` (stop dev servers
  first), then `git push origin HEAD:main`. One push per finished phase (B7).
- Never run `test-stack.mjs up`, the full integration suite or the full browser suite locally (B1).
- Load: `~/.cache/daygame-research/tools/load.sh` before heavy local work; tell workers the same.
- Never touch the live database. The live site only through Phase 6's read-only check.
- Never weaken an assertion about data, sync, sign-in or privacy to make it pass. Never delete a test.
- Red main from other sessions (B8) is not yours: judge your phase on its own specs and say so.
- The repo is public: no personal data, live row counts or user content in commits.
- Each phase ends with a **Status** line here, committed with the work.

---

# EXECUTION PROMPT

Paste into a new Claude Code session in this folder (it delegates to smaller models):

```
/goal Execute Plans/tests-catch-what-matters.md, Phase 0 through Phase 9, skipping phases that already
have a "done" Status line. Read first: that whole plan (Part 2 is binding), CLAUDE.md and your memory
index. You are the foreman: do no phase work yourself. For each phase start a background Agent with
the model the phase names, in its own worktree under ~/.cache/daygame-research/tests-catch/, briefed
with the phase text, its acceptance check and Part 2. Phases 1, 2, 3, 4 (three agents: groups A, B, C)
and 7 may run in parallel, as many as tools/load.sh allows; 6 waits for 1; 8 waits for 5; 9 is last.
Before marking a phase done, check its acceptance yourself against the thing itself: the GitHub run in
the API, the diff, the measured numbers. If a worker fails the same acceptance twice, give that phase
once to a model "opus" agent. Done means: every phase has a Status line, the facts table has its After
column, a fresh opus agent reviewed start..HEAD, worktrees are pruned and the plan is archived. Escape:
a blocker outside this plan is recorded in the blocker table with the exact message and counts as met.
Re-run the same failing GitHub run at most twice. Commit and push your own work. End with the Phase 9
report in plain words for a non-programmer, starting with any doubt.
```
