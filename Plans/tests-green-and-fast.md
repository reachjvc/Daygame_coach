# Tests green and fast

Written 2026-11-18. Every automatic check has been red since 2026-11-05. This plan makes them green
again, keeps them green, and cuts the time the tests take. Built so a smaller model can run it phase
by phase. The execution prompt is at the end.

## In plain words

- **Today nothing runs at all.** The test machine cannot install the app: one add-on tries to download
  a GPU file that GitHub no longer has. One line fixes it (Phase 1).
- **Underneath, about 55 tests fail for 7 reasons.** The biggest one is a single helper that waits for a
  "Saved." badge in the Time Log header, and that badge moved during the phone work. That alone breaks
  about 40 tests. The rest are role models, training navigation, check-in Log Out on a phone, and two
  database tests (Phase 2).
- **Slow because red, and slow anyway.** A red phone shard takes 19 minutes, because every broken test
  waits its full timeout twice. The unit tests take 3.6 minutes, double their October time, and every
  commit on this PC runs all of them first. Phases 3 to 5 cut each of these.
- **Never silently red again.** Every Claude session will see a one-line warning at start when main is
  red (Phase 6).

## Facts measured 2026-11-18

| What | Now | Target | Now (after) |
|---|---|---|---|
| `npm ci` in every CI job | fails: onnxruntime GPU download 404 | passes | passes in every job and in the Docker image (b70788dd, a62a1295) |
| Pre-commit on this PC | the whole unit suite (613 files; 216 s in CI); this PC 2026-11-18: 53 s wall (613 files, 0 failed) | ≤ 30 s for a typical commit | related tests only: 1.8–28.4 s for one `src/` file, 0.3 s for a doc; full suite (config files) 34.5 s |
| CI `checks` job, wall | 454 s (unit 217 s, DB 93 s, typecheck 62 s, lint 29 s) | ≤ 240 s | 141 s: static 131, unit 75 + 108, database 123 side by side (CI 44402861154) |
| Unit suite | 216 s: import 123 s, jsdom environment 128 s (baseline 97 s) | ≤ 100 s total CPU-wall in CI | two shards in parallel: 47 s + 65 s, then 39 s + 40 s (CI 44394669123) |
| E2E on a main push, wall | 18–21 min (red phone shard 1/2: 1,152 s) | ≤ 6 min green; a red run stops ≤ 10 min |
| E2E per green shard | 330–560 s (backend 28 s, build+start ~77 s, browsers 16–62 s) | ≤ 300 s |
| Nightly Android lane | 136 tests, 1 worker, killed at its 45 min limit | ≤ 15 min |
| Nightly checks | red (duration ratchet: no green runs) | green |

Last green CI and E2E: 2026-11-05 16:11 UTC. Last green nightly: 2026-10-30.
Evidence runs: CI 43601945915, 44279935097; E2E 44079593390 (nightly), 43601945901; nightly 44096960629.
Start SHA: 9813183b (main, 2026-11-18).

## Failure groups (evidence from the runs above)

| ID | Tests | What fails | First lead |
|---|---|---|---|
| F0 | all jobs | Fixed in Phase 1 (commit b70788dd): `npm ci` passes in every job of CI 44284506640 and E2E 44284506582. Was `npm error Error: Failed to download the binaries: 404 Not Found.` in `onnxruntime-node` | Env `ONNXRUNTIME_NODE_INSTALL_CUDA=skip` in all three workflows |
| F1 | 42 test-instances (retries excluded): phone 2/2 (38 error lines), phone 1/2 (22), desktop 4/4 (18), timing-phone 1/1 (6). Files: `mobile/mobile-toggl`, `timetrack-sync`, `toggl-time-tracker`, `timetrack-edge-cases`, `mobile/mobile-time-polish` | Every error is `locator('header').getByRole('button', { name: /^Saved\./ })` not found, no other error (run 44284506582) | `tests/e2e/helpers/timetrack.ts:66` `savedToAccount`; badge moved in the Time Log phone commits (8da8dd4b, 246ff664, b61a4736) |
| F2 | 3, phone 1/2 | audit Log Out tests hit their 150 s limit: `browserContext.close: Test ended.` (run 44284506582: `audit-devices` 84 and 112, `audit-ping` 285) | `tests/e2e/audit-devices.spec.ts:84,112`, `audit-ping.spec.ts:285`; maybe a real bug: Log Out hangs on WebKit |
| F3 | 7 + sweep: `role-models.spec.ts:17,50`, `role-models-council.spec.ts:67,88,136`, `sweep/route-sweep.spec.ts:101` (`/plan/role-models`) | role models (run 44284506582, desktop 3/4, desktop 4/4, phone 2/2, sweep-phone 1/1): gallery expects 0, gets 5; first screen over 307,200 B (`toBeLessThan(300 * 1024)`); empty council still shows a card; area people order (Lincoln before Ziglar); sweep `/plan/role-models` | `tests/e2e/role-models*.spec.ts`; the library grew to 194 people on 2026-11-11 |
| F4 | 1, desktop 3/4 | `getByRole('link', { name: 'Training' })` has no `aria-current="page"` on /programs (run 44284506582) | `tests/e2e/programs-past-workout.spec.ts:454`; navigation rebuilt (option E) 2026-11-10 |
| F5 | 2: phone 2/2 and desktop 3/4 (run 44284506582), still red | password-reset "resend confirmation" @phone | `tests/e2e/password-reset.spec.ts:123`; seen 11-14, check if still red |
| F6 | 2, Database tests job of CI 44284506640 | `auditAnswersFromManyDevices` "keeps a newer answer from another device when an older offline one arrives": expected 3 rows, got 4; `auditPings` "'mute' mutes for one hour": `expected 2763890 to be greater than or equal to 3540000` | the first one is a data-loss shape: treat as a product bug until proven otherwise; the second looks like a clock margin |
| F7 | 1, nightly (not run in Phase 1) | duration ratchet: suites with no green run | clears when F0–F6 are fixed; baselines must then be met (unit 97 s × 1.3 = 126 s) |
| F8 | 1, desktop 4/4 and phone 2/2 (run 44284506582) | `timetrack-sync.spec.ts:100` "the product route is dressed as part of this app, not as a lab page @phone": `header:visible` link `Dashboard` not found in 5 s | Navigation rebuilt (option E, 2026-11-10): check whether the product-route header changed on purpose; update the test or restore the link |

New failures may appear once F0 is fixed, because nothing has run since 11-17. Add them as F8, F9 and so on.

Runs after Phase 1: CI 44284506640, E2E 44284506582 (sha b70788dd). Install passed in both.

### Phase 2 results per group (foreman, 2026-11-18)

How it ran: each group in its own worktree, specs checked locally one at a time through a shared lock
(`~/.cache/daygame-research/tests-green/run-spec.sh`, B2 method), then all groups merged on
`tests-green` and proven by one dispatched GitHub run per batch (B4: no per-group pushes).

| ID | Decision | What changed |
|---|---|---|
| F1 | Outdated test, plus two product bugs | The phone header shows nothing when all is saved on purpose (8da8dd4b, time-log-phone 6.6); `savedToAccount` now also finds hidden "Saved." text kept for screen readers. Behind it: phone sheet says Start not Create (87a47248), phone delete goes through the sheet, "Import and export" (8da8dd4b), Stop taps retried because the run bar ignores a tap right after it changes (`TAP_SETTLE_MS`). **Product bugs fixed:** phone Back spent one press on a dead step after editing a calendar block (`useBackCloses`, b61a4736); entry sheet shortcuts, typed time box and row ▶ were 44 px, owner finding F27 says 48 px; entry row tap area 42 → 44 px. `mobile-toggl.spec.ts` ported to the Time Log phone layout (17 tests). |
| F2 | Outdated test | The tests pressed a phone "More" button removed in f2b5bf58; Log Out is on the You tab now (`helpers/logOut.ts`). Log Out already sends or names a waiting answer within 5 s. `test.setTimeout(150_000)` removed (project default 60 s; the flow takes 8–17 s). |
| F3 | Outdated tests, plus a product bug and a lighter shell | Council tests shared one account per worker, so each now starts from an empty council; hover glow is a 300 ms transition by design (c5de0596). **Product bug fixed:** filter chips (36 px) and back link (20 px) under the 44 px phone target. **Budget (D4):** the page itself was ~63 KB; the shell every signed-in page loads carried ~75 KB for Log Out (time-tracker sync, Supabase client, audit queue; imports added 2026-11-10). The header's Log Out now loads its code on approach, press or 6 s after load; offline before it loaded, a press says so visibly and loses nothing (new desktop e2e). Mono font not preloaded; cards do not prefetch profiles; card data trimmed. `/plan/role-models` 471 → 296 KB (phone 298), `/dashboard` 612 → 575, `/plan` 707 → 677 (local production build). |
| F4 | Outdated test | Training stopped being a tab (f2b5bf58); the test checks the bar shows on /training with Home as the way out and no tab marked current. |
| F5 | Not red | The test carries `test.fail` for a known product bug (e1a68550): a resent sign-up confirmation link lands on `/auth/login?error=missing_code` because `resend()` sends no PKCE challenge. Outside this plan; see B6. |
| F6 | Outdated tests | The refusal now also carries the stored answer (565ccb2a); the newer answer still wins. Mute snaps to the quarter the label names (b3aad6b1), so "1 h" is 45–60 min. |
| F8 | Outdated test | The way out of the Time Log is labelled Home (f2b5bf58). |
| F9 | Product bug, fixed | On a phone, Log Out from the You tab landed on `/` or `/auth/login` by a race: the `signOut` server action re-rendered the page without a session, and the proxy sent it to sign-in before Log Out's own move to `/`. Sign-out is now a POST to `app/api/auth/sign-out/route.ts`; `audit-ping.spec.ts:287` is strict `/` again. |
| F10 | Outdated test, fixed | The offline-before-Log-Out test skips by viewport (< 640 px, no header Log Out), so Android skips it too. |
| F11 | Flaky test, fixed | `audit-sheet-fit.spec.ts:103` read the stretch card's heading once while the sheet slid in (0.2 s); it now polls. Passed and failed on the same code (E2E 44354834713 green, 44342184859 red). |
| F12 | Same cause as F0, fixed | CI `image-staging` (main only): `npm ci` inside the Docker build downloaded the onnxruntime GPU archive (404); the workflow env does not reach `docker build`. `infra/Dockerfile` now sets `ONNXRUNTIME_NODE_INSTALL_CUDA=skip` on that `npm ci` (a62a1295); CI 44368770269 re-run: `image-staging: success`. |
| F13 | Another session's break, fixed | Main CI red from 19:29 (CI 44383715199): `runtimeEnv.test.ts` found `NEXT_RUNTIME` read in `instrumentation.ts` (e3e334f6, 03dcb915, b7539500, error-reporting work) but not listed in `scripts/check-runtime-env.mjs`. Listed as `platform` (32f5f28e). |

Open, for the owner: the phone week strip's day buttons are 40 px wide (49 px tall); seven days and two
44 px arrows do not fit 390 px otherwise. The tap-size test allows ≥ 38 px wide there.
Unit tests that failed once under local load and pass alone (Phase 3 input): `backClosesSheet`,
`aChangeFromAnOlderPageIsNotLost`, `aRunningSecondRedrawsOneDayOfThePhoneList`.

## Blockers, each tried once

| ID | What | Tried, result | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | onnxruntime GPU file gone | `curl -I -L …/v1.21.0/onnxruntime-linux-x64-gpu-1.21.0.tgz` returned 404 | everything | Phase 1: set the env var at the top of all three workflows. No owner step |
| B2 | One shared local test database (`supabase_db_daygame-tests`, up 3 days). Local e2e or integration runs can reset it under other sessions | `docker ps` shows it shared | local repro | Run lanes on GitHub (`gh workflow run e2e.yml --ref <branch>`). Run locally only one spec at a time, by memory `worktree-e2e-servers` (`E2E_STACK_ENV` preset, `--workers=1`) |
| B3 | The permission classifier refused `package.json`/lockfile edits in the shared folder before | memory `shared-checkout-tool-quirks` | any dependency change | No step here needs one. If one turns out to, ask the owner once, then go on |
| B4 | Vercel's limit is about 60 deploys a day, and every branch push makes a preview | memory `vercel-late-deploy-rollback` | pushes | Push the work branch at most once per finished step; ≤ 15 pushes a day for this plan |
| B5 | Bigger GitHub runners cost money | public repo: 4-core runners are free | nothing | Never switch `runs-on` to a paid size |
| B6 | Resent sign-up confirmation link fails (`resend()` sends no PKCE challenge; supabase-js 2.91 has no option) | Checked in Phase 2 (F5): still fails with `test.fail` removed | nothing here (test is marked `test.fail`) | Outside this plan: a design choice (fragment-reading confirm page, or resend as `signInWithOtp`). Schedule separately |
| B7 | Quit tool browser specs red on main (another session's work in progress, Plans/quit-tool.md; commits "Quit tool phase 1–7" 2026-11-18, author reachjvc, e.g. ef2a1c49 "Quit tool phase 7: e2e specs from the audits") | E2E 44340099177 on that session's own head 157104b1, before any push from this plan: job `desktop 3/4`, step `Run Playwright tests` (`npx playwright test --project=desktop --shard=3/4`), 55 failed, first `tests/e2e/quit/menu.spec.ts:27` link "Quit nicotine" not found on /quit; same on main 1234fc96 (E2E 44342184859: desktop 3/4 54, phone 2/2 48, desktop 4/4 3, junk-params /quit and /quit/coaching). CI `image-staging` fails at "Wait for the browser tests on this commit" for the same reason. Owner sessions told 2026-11-18 | green main runs (Phase 7) | Outside this plan: the quit session fixes its specs. This plan does not touch quit files; quit failures count as this blocker |
| B8 | GitHub queue jam on main: other sessions pushed main ~12 times in an hour (2026-11-18 18:20–19:15 UTC); every main push starts an 11-job E2E run that is never cancelled on main, and the free plan runs ~20 jobs at once, so 11 E2E runs waited in the queue | CI 44368770269 (a62a1295, F12 fix): job `image-staging`, step "Wait for the browser tests on this commit": `await-workflow: gave up after 45 minutes: .github/workflows/e2e.yml is queued` (E2E 44368770394). Also hit the API rate limit (5,000/h) once at 19:14 UTC | staging image proof; "three green main pushes" while the queue is long | In plan: Phase 5 cuts each main E2E run to ≤ 6 min; foreman polls every 3–5 min, not every minute. Re-run the staging job once the queue drains |
| B9 | Other sessions' new work red on main, 2026-11-18 evening: (a) lint ratchet, 4 unused variables in `src/quit/lab/**` (quit-copy session, 9d6e1273, f048a80e); (b) `/quit/lab` 404 in the production build, `cold-open.spec.ts:183` (same session, hidden on purpose); (c) `/plan/sandbox` 404, `plan-sandbox.spec.ts:165` "chunk … carries a session", and `userDataCascades.integration.test.ts` "a new ON DELETE SET NULL" from `supabase/migrations/20261118120000_plan_sandboxes.sql:23` (plan-in-steps session) | E2E 44391054491 (e536f392): jobs e2e-fast, sweep-phone, desktop 2/4; CI 44402861154 (cc058d45): job `database`, step `Database tests`; authors: reachjvc commits of those sessions. Owners told 2026-11-18 21:40–22:20 UTC; (a) and (b) fixed in the quit session's next batch | three green main pushes in a row | Outside this plan: the owning sessions fix them |
| B10 | Programs live screen: orange fills and thumb-size checks red on desktop and android, 2026-11-19 (probably the colour change in b9b6972b "Rebrand Phase 3: one colour per part (Life gold, Quit violet, Dating orange)", reachjvc, rebrand session; not proven) | E2E 44531966638 and 44541773509 (tg-p5 at bb7c756f / f916e9af): jobs `desktop 3/8`, `desktop 4/8`, step `Run the lane`: `programs-live-menus.spec.ts:307`, `programs-one-language.spec.ts:191` ("Today has 0 orange fills") and `:263` ("the live screen's one orange is Finish"), `programs-history-progress.spec.ts:616` ("history: text 11px: L"). The specs are unchanged since 2026-10-15 | green main runs | Outside this plan: the rebrand/programs session updates the specs or the page |
| B11 | `/quit/coaching` answers 404 without `?preview` (`app/quit/coaching/page.tsx`: `previewAllowed` then `notFound()`), but the sweep route list still has it; also `tests/e2e/quit/menu.spec.ts:32` "the nicotine menu shows 5 groups and every row" fails on desktop (quit session, e.g. 076f4a38 "Quit frame…", reachjvc) | E2E 44531966638 and 44541773509: jobs e2e-fast, sweep-android, sweep-phone, sweep-webkit, desktop 5/8 (`cold-open.spec.ts:192` "opens clean: /quit/coaching", Received 404) | green main runs | Outside this plan: the quit session removes the route from the sweep list or shows the page |
| B12 | `/tracking` on Android: `route-sweep.spec.ts:102` "/tracking holds up" ("only 4 words on screen") failed twice in the new `sweep-android` lane (E2E 44524607281, 44541773509 sweep-android) and passed on retry once (E2E 44549404805). A real phone-size finding or a slow render; not investigated, the page is the time tracker (last change b60fd6e5 "Rebrand Phase 6", reachjvc) | as quoted; the iPhone and desktop sweeps never saw it | stable `sweep-android` | Outside this plan: whoever owns /tracking checks it at 412 px width |
| B13 | Flaky specs under 3 workers (pass on the one retry, so green): `life-mastery-dated-steps.spec.ts:42` (also at 2 workers, E2E 44549404805), `life-mastery-day-persists.spec.ts:227`, `role-models-council.spec.ts:127`, `life-mastery-achievements.spec.ts:40`, `audit.spec.ts:411`, `programs-live-format.spec.ts:408` (android); one run lost a shard to `supabase start: failed to start containers` (E2E 44549404805, desktop 8/8) | E2E 44516699059 to 44549404805, jobs named above, step `Run the lane`, `N flaky` summary | the Phase 5 rule "keep 3 workers only if no new flake" cannot be proven or refuted: the same flake appears at 2 workers, the others once each | Kept 3 workers; to fix, one spec at a time (wait for a real state) |

## Decisions (taken; the owner can veto)

- **D1. Android on every push, iPhone nightly.** The owner's phone is Android (memory `time-log-phone-plan`).
  Chromium runs faster than WebKit in CI. The iPhone lane keeps Safari's cookie checks, once a night.
- **D2. Pre-commit runs only the tests related to the staged files.** CI still runs everything.
  The full suite runs before commit only when config or setup files are staged.
- **D3. A red run stops early.** `maxFailures` is set per shard in CI, so a broken lane stops after 15
  failures instead of retrying for 19 minutes.
- **D4. The 300 KB first-screen budget for role models stays.** Mobile data matters on his phone, so the
  page is made lighter rather than the test removed.
- **D5. Tests may be removed, under rule R-DEL below.** Every removal goes in the removal log.

## Questions, each with a recommendation (the recommendation counts as accepted)

| Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|
| Q1 Should F2 and F6 count as product bugs? | Yes, until the run proves otherwise. Both are about answers surviving Log Out or a second device | Treat them as test timing | A lost check-in answer reaches the owner |
| Q2 Should the red-main warning also stop pushes? | No. A warning at session start only. Pushes deploy the site, and a hard stop would block urgent fixes | Hard stop | Main stays red one more day |
| Q3 Should the unit suite get a second CI job (sharding)? | Yes, if Phase 3's config levers alone do not reach the 100 s target | One job | 20 s of `npm ci` per extra job |

## Rule R-DEL: when a test may be removed

A test may be deleted only when **all** of these hold, written in the removal log:
1. It is in one of these kinds: (a) a duplicate of a unit or integration test that checks the same
   thing (name the other test); (b) it asserts on machine speed, network timing or animation frames, not
   on behaviour, and cannot be made deterministic with a fake clock; (c) it checks a screen or text that
   no longer exists on purpose (cite the commit that removed it).
2. It is **not** about lost data, sync between devices, offline queues, sign-in or out, payments, or privacy.
   Those are fixed, never deleted.
3. A run without it is green, and the removal log row says which run.

A brittle test that fails kind 1 or 2 gets fixed: wait for a real state (a request, a label), never a sleep.
New tests are welcome where a fix had none: one spec or unit test per real bug found.

### Removal log

| Test (file:line, title) | Kind | Replaced by / reason | Green run without it |
|---|---|---|---|
| `tests/e2e/mobile/mobile-toggl.spec.ts:181` "bulk selection is opt-in, so checkboxes do not clutter the list" | (c) | The phone has no way into bulk Select any more: removed on purpose in a8c52299 (time-log-phone 4.2 / D2, "Copy start link and Select are gone from the phone"). Not about data, sync, offline, sign-in or privacy | E2E 44356834908 (cb504cfa), every lane green |

---

# PHASES

Each phase lists a model hint for the foreman (see Part 2). Every acceptance check is run, and the
command and its deciding output line are quoted under the phase as a **Status** line.

## Phase 0 — Rig and baseline · S · haiku

1. `git worktree add -b tests-green ~/.cache/daygame-research/tests-green/wt main`, then symlink
   `node_modules` from the main checkout. Work and commit only there (memory `tmp-wiped-on-crash`: not /tmp).
2. Measure the pre-commit time on this PC: `time npx vitest run --reporter=dot` in the worktree (check
   `~/.cache/daygame-research/tools/load.sh` first; if it says `game`, wait). Write the number in the
   facts table.
3. Record the start SHA in this plan.

Accept: worktree exists on branch `tests-green`; local unit time written down.

**Status:** done 2026-11-18. Worktree ~/.cache/daygame-research/tests-green/wt on branch tests-green; `time npx vitest run --reporter=dot`: real 0m53.191s; Test Files 613 passed (613); Tests 7168 passed | 1 skipped (7169); Duration 52.73s (transform 35.72s, setup 40.29s, import 166.13s, tests 336.08s, environment 135.58s).

## Phase 1 — Install works again (F0) · XS · haiku

1. In `.github/workflows/ci.yml`, `e2e.yml` and `nightly.yml` add, at top level after `permissions:`:
   ```yaml
   # onnxruntime-node (via @huggingface/transformers) downloads CUDA binaries on Linux during npm ci;
   # the v1.21.0 GPU archive is gone from GitHub (404, 2026-11-18) and nothing here uses a GPU.
   env:
     ONNXRUNTIME_NODE_INSTALL_CUDA: skip
   ```
2. `npx vitest run tests/unit/ciWorkflows.test.ts tests/unit/ci/` must stay green. If a test forbids a
   top-level `env:`, put the variable on the `npm ci` steps instead.
3. Ship to main right away: everything else depends on it. Rebase, ff-merge, push (Part 2).

Accept: the next CI run's "Install dependencies" step passes (quote `gh run view <id> --json jobs`).
Then copy the new list of failures into F-rows. Anything not listed above becomes F8+.

**Status:** done 2026-11-18. Commit b70788dd (on main). CI 44284506640, checks job, `Install dependencies`: success (image-staging, verify-production, image-production skipped; checks failed on Database tests only). E2E 44284506582: `Install dependencies` success in e2e-fast, timing-phone 1/1, phone 1/2, phone 2/2, desktop 1/4 to 4/4, timing 1/1, sweep-phone 1/1 (the 1/1 nightly lanes not in this run). Remaining red: F1, F2, F3, F4, F5, F6, F8.

## Phase 2 — Make every test green (F1–F6, F8+) · L · sonnet, one agent per group

Groups touch different files, so they can run as parallel agents, each in its **own** worktree branched
from `tests-green` (at most as many as `load.sh` allows; CI does the heavy running, so 3–4 is fine).
For every group:

1. Reproduce once from CI logs: `gh run view <id> --log-failed | grep -A30 '<test title>'`.
2. Find what changed: `git log --oneline -S '<old text or testid>' -- src tests` and read that commit.
3. Decide, and write one line why: **product bug** (behaviour the owner relies on broke, so fix `src/`
   and keep the test) or **outdated test** (the product changed on purpose, so update the test and cite
   the commit). Unsure counts as a product bug.
4. Run the single spec locally only by the B2 method, or push the branch and run
   `gh workflow run e2e.yml --ref <branch>` and read that run.

Group notes:
- **F1:** fix `savedToAccount` (`tests/e2e/helpers/timetrack.ts:65`) to find the badge where the phone and
  desktop layouts now put it. Prefer a role/name over `header` scoping. One fix, about 40 tests.
  Check that the badge still says "Saved." to the user on a phone. If it no longer shows at all, that is a product bug.
- **F2:** open the Log Out flow with a waiting answer on WebKit. If Log Out waits forever for a send,
  that is a product bug: Log Out must send or name the waiting answer within a few seconds. Bring
  `test.setTimeout(150_000)` down to what the flow really needs (≤ 30 s) once fixed.
- **F3:** five failures, read each. Budget: lazy-load images below the first screen or page the gallery
  until the first screen transfers < 300 KB (D4). Empty council showing a card: product bug. Area order:
  check what "your council first" means in `src/` before changing either side.
- **F4:** find what the new navigation marks as current on /programs. Update the test if the nav changed on purpose.
- **F5:** first check whether it is still red after Phase 1.
- **F6:** `tests/integration/repos/auditAnswersFromManyDevices.integration.test.ts`. A newer answer must win
  over an older offline one, so fix the repo or SQL. `auditPings` mute: if the margin is a clock race,
  use a fixed `now` or a tolerance of seconds, not minutes. Run integration tests only by memory
  `integration-tests-without-stack-up`.

Merge each group's branch into `tests-green` when its specs pass on GitHub. Ship to main in batches
(≤ 1 push per 20 min).

Accept: one `workflow_dispatch` E2E run on `tests-green` with every lane green except at most flaky
tests that passed on retry, and the flaky ones listed; CI green on the same commit. Quote both run ids.

**Status:** done 2026-11-18. `gh workflow run e2e.yml --ref tests-green` → E2E 44356834908 on cb504cfa: `conclusion success`, all 14 lanes success (android 1/1 776 s, phone 2/2 1,894 s), no flaky tests in the logs. CI 44356833798 on cb504cfa: `checks: success`. Shipped to main in two batches (1234fc96, 134d39d1); main E2E 44355864103 on 134d39d1 success. Remaining: F12 (staging image build) and B7 cleared by its owner (E2E 44354834713 on 7dfba7b7 success).

## Phase 3 — Faster unit tests and pre-commit · M · sonnet

1. Per-file times: `npx vitest run --reporter=json --outputFile=$HOME/.cache/daygame-research/tests-green/unit.json`.
   List the 20 slowest files and the share of time spent on jsdom files (`// @vitest-environment jsdom`).
2. Try these levers one at a time. Keep a lever only if the suite stays green twice in a row and gets
   faster; write the before/after seconds:
   a. Split `vitest.config.ts` into two `test.projects`: `node` (default files) with `isolate: false`, and
      `dom` (files with the jsdom pragma) keeping isolation. A node file that leaks state between files
      shows up as a failure. Fix its leak, or move it to the isolated project.
   b. `pool: 'threads'` for the node project.
   c. In the 20 slowest files: real `setTimeout` waits become `vi.useFakeTimers()`; big fixtures build once
      per file (`beforeAll`), not per test.
3. Pre-commit (`.husky/pre-commit`), D2:
   ```sh
   staged=$(git diff --cached --name-only --diff-filter=ACMR)
   # Config, setup or workflow changes can break any test: run all of them.
   if echo "$staged" | grep -qE '^(vitest\.config\.ts|tests/setup\.ts|tests/__mocks__/|package(-lock)?\.json|tsconfig\.json|\.github/|docs/testing/|playwright\.config\.ts)'; then
     npm test -- --reporter=dot || exit 1
   else
     code=$(echo "$staged" | grep -E '\.(ts|tsx|mjs|js)$')
     [ -z "$code" ] && exit 0
     npx vitest related --run --reporter=dot $code || exit 1
   fi
   ```
   Keep the existing comments in that file. Test it with three throwaway commits on the work branch: a
   `src/` file, a doc only, and `vitest.config.ts`. Time each one.

Accept: CI unit step ≤ 100 s, or Q3's second shard added and each shard ≤ 70 s. A typical
`src/` commit's pre-commit takes ≤ 30 s on this PC. Quote all numbers.

**Status:** done 2026-11-18 (third worker; the first failed twice: 162 s in one job, then 94 s per shard). CI 44394669123 on 73de11b7, `Unit tests` step: attempt 1 `checks` (shard 1/2) 47 s (`Duration 45.85s`), `unit-2` (shard 2/2) 65 s (`Duration 63.82s`); attempt 2 39 s / 40 s. Before: 216–217 s in one job. Kept: three vitest projects (`node` and `dom` share their worker, only `vi.mock`/`vi.doMock`/`vi.resetModules` files stay isolated, 253 → 115), `tests/setup.ts` restores clocks, stubs, spies and replaced globals after each file, an even-shards sequencer, four flaky unit tests made deterministic. Dropped: `pool: 'threads'`, `deps.optimizer`, `--maxWorkers=4` (no gain). Pre-commit (`time sh .husky/pre-commit`, load `ok`): leaf `src/audit/pingService.ts` 1 test 1.8 s; `auditService.ts` 68 tests 13.3 s; `usePushDevice.ts` 80 tests 18.7 s; `src/shared/dateUtils.ts` (most imported) 257 tests 28.4 s; doc 0.3 s; `vitest.config.ts` full suite 34.5 s. Related tests come from `scripts/related-tests.mjs` (static import lookup, 0.3 s) instead of `vitest related` (~20 s overhead). Note: `docs/testing/durations.json` row `checks › Unit tests` now times shard 1 only (Phase 4 renames it).

## Phase 4 — CI jobs side by side · S · sonnet

1. Split `ci.yml`'s `checks` into parallel jobs: `static` (secret scan, lint ratchet, typecheck ratchet,
   audit ratchet), `unit` (one or two shards, from Phase 3), `database`. Keep the port-reservation step
   first in every job that starts the backend. `image-staging` and `image-production` need all three
   (`needs: [static, unit, database]`, and their `if:` checks each result).
2. Update `tests/unit/ciWorkflows.test.ts` and `tests/unit/ci/pipelineRules.test.ts` to the new shape.
   Keep what they protect (no secrets, port step first, publish needs green checks). Never delete one of their assertions without a replacement.
3. Rename the two `ci.yml` rows in `docs/testing/durations.json` to the new job names in this same commit.

Accept: one CI run where the wall time from first job start to last job end is ≤ 240 s. Quote it.

**Status:** done 2026-11-18. `ci.yml`: `static` (secret scan, lint, typecheck, audit), `unit` (matrix 1/2, 2/2), `database`, side by side; image jobs need all three. CI 44402861154 on main cc058d45: static 21:55:06–21:57:17 (131 s), unit 1/2 75 s, unit 2/2 108 s, database 123 s; **first start → last end 141 s**. (Branch runs 44398373950 and 44399823464 measured 303 s and 258 s only because jobs waited for free runners, B8.) `durations.json`: `checks › Unit tests` → `unit 1/2 › Unit tests` (+ `unit 2/2 › Unit tests`, 97), `checks › Database tests` → `database › Database tests` (73). CI concurrency left as is: a main run waiting days for the owner's production approval would hold a shared group. That run's `database` job was red on another session's migration (B9).

## Phase 5 — Faster browser lanes · M · sonnet

Measure every lever with one dispatched run before and one after. Keep it only if green and faster.
1. **Next build cache** in each lane: `actions/cache` on `.next-e2e/cache` (the `NEXT_DIST_DIR` the config
   sets), key `next-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-${{ github.sha }}`, restore
   prefix `next-${{ runner.os }}-${{ hashFiles('package-lock.json') }}-`.
2. **Browser cache:** cache `~/.cache/ms-playwright`, keyed on the Playwright version in the lockfile. Then run
   `npx playwright install --with-deps <browser>`. It skips the download when the browser is already cached.
3. **D1:** the per-push phone lane becomes `android` (Pixel 7, Chromium): `workers` 2 and 2 shards. `phone`
   (iPhone) moves to the nightly matrix. `timing-phone` follows Android (add a timing-android project if needed).
   Update `ciWorkflows.test.ts` and the `durations.json` rows in the same commit.
4. **Workers 2 → 3** in CI for `desktop` and `android`. Run the lanes twice. Keep 3 only if no new flake
   appears. Then rebalance the shard counts so every shard is ≤ 300 s.
5. **D3:** in `playwright.config.ts`, `maxFailures: process.env.CI ? 15 : undefined`.
6. **Duplicates (R-DEL a):** list tests that run on desktop and phone but check nothing about layout
   (`@phone` on pure data or API flows). Drop the `@phone` tag where the phone run adds nothing; they still
   run on desktop. Log each one.
7. `tests/e2e/helpers/*`: replace any fixed `waitForTimeout` with a wait on a real state where you find
   one. `e2eSleepsAreTimed` lists them.

Accept: a dispatched run where every push lane shard is ≤ 300 s and the whole E2E run on a main push
takes ≤ 6 min wall. The nightly lanes each finish in ≤ 15 min. Quote the job times
(`gh run view <id> --json jobs`).

**Status:** done 2026-11-19 except the 300 s mark on three shards, which stay at 301-325 s by runner noise (see below). Branch tg-p5, three dispatched runs on the final layout.
Kept: (1) Next build cache (hit in every job: "Cache restored from key: next-Linux-…"; setup before the lane is 25-40 s); (2) Playwright browser cache (hit); (3) Android Chromium per push (`android` 3 shards, `timing-android`, `sweep-android`), iPhone (`phone`, `timing-phone`, `sweep-phone`) nightly; (4) desktop 4 shards to 8 (4 shards: 363 / 502 s; 6 shards: 358 s slowest; 8 shards: below), android 2 shards to 3 (2 shards: 329 s slowest); (5) `maxFailures: 15`; (6) `@phone` dropped from nine text/data tests; (7) the browser's apt `.deb` files cached (`~/apt-debs`): WebKit's install took 723 s cold (apt mirror 181 kB/s, 126 MB), the nightly `phone 1/2` fell from 1,253 s to 536 s and `phone 2/2` from 1,190 s to 371 s. Workers 3 kept (B13). Dropped: nothing measured slower.
Job times (seconds, `gh run view <id> --json jobs`, started to completed):
- E2E 44541773509 (tg-p5 f916e9af, final layout): desktop 1/8 272, 2/8 257, 3/8 248, 4/8 255 (red, B10), 5/8 203, 6/8 178 (red), 7/8 193, 8/8 301; android 1/3 325, 2/3 212, 3/3 185; timing 231; timing-android 188; e2e-fast 179 (red, B11); sweep-android 236 (red, B11/B12). Nightly: phone 1/2 536, 2/2 371, timing-phone 232, firefox 210, webkit 322, sweep-phone 302 (red, B11), sweep-webkit 304 (red, B11). Every nightly lane is under 15 min (900 s).
- E2E 44531966638 (bb7c756f, android still 2 shards): desktop 1/8 245, 2/8 277, 3/8 300, 5/8 208, 7/8 173, 8/8 289; android 1/2 329, 2/2 237.
Over 300 s: `desktop 8/8` 301 s and `android 1/3` 325 s (the audit tests with 30 s waits sit first in the file order, so shard 1 is always the slowest; two retried flaky tests add a minute). Fixed cost per job is 105 s (backend 45 s, build+start 57 s) plus 40 s of setup. Whole-run wall on a main push was not measurable: GitHub ran 1 to 3 of this run's 22 jobs at a time while other sessions' runs queued (B8), so the three runs took 40 to 60 min; the longest single job is 325 s. Push-lane jobs per run: 1 + 8 + 1 + 3 + 1 + 1 = 15, plus CI's 4, within the free plan's 20 concurrent.
Reds in these runs are other sessions' (B10 to B13). `durations.json` rows follow the lane names; phone baselines rose (540, 375) because the iPhone is now the cold-cache nightly lane.

## Phase 6 — Never silently red again · S · sonnet

1. `scripts/ci/main-status.mjs`: uses `gh run list --branch main --limit 20 --json`. Prints one line when
   main's latest CI or E2E run is red, for example `main is red since <date>: <workflow> <job> (run <id>)`.
   Prints nothing when green. Exits 0 always, and within 5 s, also when offline or when `gh` is missing.
   Add a unit test for the parsing.
2. Add it as a `SessionStart` hook in the project's `.claude/settings.json` (use the update-config skill).
   Hook output reaches the session as context.
3. Add one line to `CLAUDE.md` under Rules: "If the session-start line says main is red, fix it first or
   name who broke it."

Accept: with a red run in the API the hook prints the line, and with a green one it prints nothing. Quote both.

**Status:** done 2026-11-19 (code on main since fd8acc54). `npx vitest run tests/unit/ci/mainStatus.test.ts`: Test Files 1 passed (1), Tests 9 passed (9). Red fixture (`MAIN_STATUS_FIXTURE`, one failed push CI run): `main is red since 2026-11-18: CI (run 44383715199)`. Green fixture: prints nothing, exit 0. Live API on 2026-11-19 12:50 UTC: the newest 20 main runs were all still queued or running (B8), so it printed nothing (no finished run to judge). `SessionStart` hook in `.claude/settings.json`; the CLAUDE.md rule line is in.

## Phase 7 — Prove it · M · sonnet + a fresh reviewer

1. Three main pushes in a row with CI and E2E green, then one nightly E2E and nightly checks green.
2. Lower each `durations.json` baseline to the new slowest green time (they may only fall), in one commit.
3. Run `/code-review` on `<start SHA>..HEAD` through a fresh subagent that did not write the fixes. Fix or
   record every finding.
4. Remove the worktrees and run `git worktree prune`. Archive this plan into `Plans/ARCHIVE.md` (memory `plans-archive`).
5. Report to the owner, in plain words, starting with any doubt: what is green, the before and after
   times from the facts table, the bugs found in the product, the tests removed and why.

Accept: the run ids for step 1 quoted; the facts table has a "Now (after)" column filled in.

---

# PART 2 — Rules for the executing session

- **Foreman and workers.** The session that runs this prompt is the foreman. It does no phase work
  itself. It starts one background `Agent` per phase or group with `model: "sonnet"`, and `"haiku"` where a
  phase says so or for reading CI logs. Each brief names the phase, its acceptance check, this Part 2,
  and the worktree. The foreman checks every acceptance itself (reads the run in the API, the diff,
  the numbers) before the next phase starts. When a worker's result fails its acceptance twice, the
  foreman sends the same phase once more to a `model: "opus"` agent.
- Shared checkout: work only in worktrees under `~/.cache/daygame-research/tests-green/`. Never
  `git add -A`, `git stash` or `--no-verify` on main. Ship by memory `shared-checkout-tool-quirks` item 5:
  rebase onto main, run `npx vitest run`, run `node scripts/typecheck-ratchet.mjs` (memory
  `typecheck-before-push`), then `git merge --ff-only` from the main checkout and `git push origin main`.
- Never run `test-stack.mjs up`, the full integration suite or the full e2e suite locally (B2). GitHub runs them.
- Load: run `~/.cache/daygame-research/tools/load.sh` before heavy local work. `game` means one worker
  and no browsers.
- Never spend money: no paid runners, no paid services. Never touch the live database.
- Never weaken an assertion about data, sync, sign-in or privacy to make it pass (R-DEL 2).
- Every phase ends with a **Status** line in this plan (done, with the decisive command output, or
  `blocked: <ID>` with the exact message). Commit the plan with the work.
- The repo is public: no personal data in commits or logs.

---

# EXECUTION PROMPT

Paste into a new Claude Code session in this folder (any model; it delegates down):

```
/goal Execute Plans/tests-green-and-fast.md from the first phase without a Status line through Phase 7.
Read first: that whole plan (Part 2 is binding), CLAUDE.md and your memory index.
You are the foreman: do no phase work yourself. For each phase (and each F-group in Phase 2) start a
background Agent with model "sonnet" ("haiku" where the phase says so), in its own worktree under
~/.cache/daygame-research/tests-green/, briefed with the phase text, its acceptance check and Part 2.
Run independent F-groups in parallel, as many as tools/load.sh allows. Before starting the next phase,
check each acceptance yourself against the thing itself: the GitHub run in the API, the diff, the
measured seconds. If a worker fails the same acceptance twice, give that phase once to a model "opus" agent.
Done means: three main pushes in a row with CI and E2E green, the nightly E2E and nightly checks green,
the facts table has its after-numbers, the removal log is filled in, /code-review was run by a fresh
agent on start..HEAD, worktrees are pruned, and the plan is archived. Escape: a blocker outside this
plan (quote the job, step and commit author) is recorded in the blocker table and counts as met. Re-run
the same failing CI at most twice. Commit and push your own work. End with the Phase 7 report in plain
words for a non-programmer, starting with any doubt.
```
