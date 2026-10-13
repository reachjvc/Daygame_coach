# Tests worth their keep — cut first, then make what is left fast

**Status:** executing since 2026-10-13 — Phases 1–3 in progress; Phase 7's backend,
harness and first repo-level tests built (see "Progress" at the end). Replaces the 2026-10-01 version of this
file, which was never executed apart from the test-gate fix
(`git show 5c3554aa:Plans/tests-worth-their-keep.md`).

**Serves** vision item 13 ("Tests are worth their keep: the useless ones removed,
the missing ones written") and item 43 (CI). **The file-by-file verdicts** are in
`Plans/tests-worth-their-keep.inventory.md`.

---

# THE HUMAN HALF

## What I am least sure of

1. **The verdicts are a reading, not a run.** Eight agents read every test file in
   full; I re-checked six of their claims by hand and all six held. But a reader
   can be wrong about a test that looks useless and guards a real bug. That is why
   Phase 1 deletes only on a written reason, and why the executor re-reads each
   file first.
2. **Every speed-up after the cut is arithmetic, not a measurement.** The numbers
   marked "projected" below have not been run. Phase 5 and Phase 9 measure them.
3. **The new test backend is proven to boot and to log a user in, not yet to run
   the whole browser suite.** I built it and signed into the app with it today
   (see finding 6). Content pages that need seeded data, and the AI calls, have
   not been tried against it.

## What you will see when this is done

| | Today | After the cut (Phases 1–4) | After the speed work (Phases 6–9) |
|---|---|---|---|
| Unit tests | 6,022 tests in 375 files | about 5,300 after Phase 1; about 4,060 after Phase 4 as recommended | same count |
| Unit time | 56 s on this machine (2026-10-01); **216 s in CI** (today's run) | — | about 100 s in CI (projected) |
| Database tests | 300 tests; **0 of them run the app's own code** | about 105 real ones | plus the first repo-level tests, running in parallel |
| Database time | 108 s in CI | — | under 60 s in CI (projected) |
| Browser test runs per pass | 1,191 | 349 per pull request, 450 nightly | same |
| Browser time | 3 h 4 m + 27 m CI jobs; **87 of 87 full runs failed** since February | — | about 20–25 minutes per pull request (projected) |

## What I found

### 1. The four-hour suite has never passed — so nothing is protected by measuring it first

I pulled every recorded CI run from GitHub's public API instead of spending four
hours on a benchmark. The full browser suite runs only on a push to `main` or a
pull request into it, and there has never been such a pull request. It ran 87 times between 2026-02-04 and 2026-09-17, and **failed all 87 times**. The
long runs took a median of 247 minutes; the Chromium job alone takes about 184.

It has not run at all since 2026-09-17, because this branch is 430 commits ahead of
`main` and pushes here run only a 4-minute route sweep. The nightly run has never
fired once: `main`'s copy of the workflow has no schedule.

**So your instinct to clean before measuring is right, and for a stronger reason
than cost.** There is no green baseline to protect and no "before" worth four
hours. The one long measurement belongs at the end (Phase 9), once.

### 2. A quarter of the browser runs test pages that do not exist where CI runs them

CI starts the app as a production build. Every `/test/*` page returns 404 in
production, on purpose, since 2026-02-27 (`app/test/layout.tsx`). **About 295 of
the 1,191 browser runs per pass drive `/test/*` pages** — the archived goals hub,
the archived quit-vice module, the time-tracker bench at `/test/toggl`, prototype
variants. They can never pass in CI. Each one waits out a 15–30 second timeout and
is then retried twice. That is very likely a large share of both the four hours
and the red.

I checked one by hand: the production build on :3100 answers 404 for
`/test/toggl`; the dev server on :3000 answers 200.

### 3. Most of the useless tests are tests of code nobody can reach

You expected getter-and-setter tests. They are there — about 430 tests restate a
declaration (a list of allowed values accepts its own members, a copy function
copies). But the bigger class is different: **about 1,260 unit tests check code
that no user can reach.** Either nothing in the app calls it (about 40 functions
are dead), or only a `/test` lab page does.

| Kind of useless test | Approximate count |
|---|---|
| Tests of code only a `/test` lab reaches | 960 |
| Tests of functions nothing calls | 300 |
| Restating a declaration (enum members, constants, identity copies) | 430 |
| Duplicates of a stronger test | 170 |
| Brittle: source-text regexes, CSS class names, exact copy | 110 |
| Cannot fail, or pass without running | 50 |

(These overlap; the inventory gives each test one primary reason.)

With no decision from you, about **700 unit tests (12 %)** go on rule-backed
reasons alone (Phase 1). Following every recommendation below — tests of dead code
and of lab-only code retired too — about **1,960 (33 %)** go.
A peer session is separately deleting the 10 architecture test files you asked it
to remove.

### 4. The database tests test the database, not the app

**0 of the 300 database tests call the app's own data code.** 266 of them run SQL
the test wrote itself — insert a row, read it back — which proves Postgres works.
The suite also runs against a hand-written 2,640-line copy of the schema that is
missing 29 live tables (all of time tracking, the health logs, the vice tables).

About 105 tests are real: constraints, triggers, row-security checks and database
functions. The other 185 go.

The reason the app's code is untested is structural: every data function builds
its own Supabase client, which talks over HTTP. A plain Postgres container cannot
answer that. Finding 6 is what fixes it.

### 5. The browser tests are slow because they share three accounts, not because there are many

Every browser test signs in as one of three real accounts in the live Supabase
project. Two tests on one account delete each other's rows, so CI runs one test
at a time, and ten projects exist only to force an order. A per-test-user
design removes the reason for every chain at once.

Locally, your `.env.local` points at the **production** Supabase project, so local
browser runs create and wipe test data in production today.

### 6. A real, local copy of the backend works — I built one

The question that decided the old plan was "where can tests get a database of
their own?" I tried it instead of reasoning about it:

- **Migrations alone cannot build the schema.** I started a local Supabase from
  `supabase/migrations/`; it failed on the second file, which alters `user_goals`
  — a table no migration creates. Eighteen tables were made outside migrations.
- **A schema-only copy of production can.** `supabase db dump --linked` (schema
  only, no rows) gave 84 tables and 320 row-security policies. With a three-line
  fix for one trigger, a local Supabase booted from it in **29 seconds**.
- **It behaves like production.** I created four accounts in 105 milliseconds;
  each got its profile row from the real trigger; one account could not see the
  other's goal (row security works); deleting an account removed its rows.
- **The app runs against it.** I started a dev server on :3300 pointed at the local
  copy and signed in with an account that exists only there. It landed on the
  dashboard.

This means every test — database and browser — can get its **own fresh user, in
a throwaway backend, created in milliseconds**. No shared accounts, no wiping, no
writes to production, and no production secret in CI.

### 7. Unit-suite speed comes from configuration, not deletion

Deleting tests buys little time here: the unit suite already runs on fifteen
cores at once, and its cost sits in a few files. The real wins, measured on
2026-10-01:
three quarters of the files build a fake browser they never use (292 files ran in
13 s under Node against 25 s under the fake browser), and one 40-second
combinatorial test is a fifth of the suite. Both are configuration (Phase 6).

## The rules this plan follows — approve these, not the counts

**R1 — Cut first; measure in CI, not on this machine.** Four sessions share this
checkout and they edited about 25 test files during the audit; no timing taken
here is clean. CI runners are isolated, and GitHub already records how long every
step took.
*If wrong:* a deletion whose only value was speed gets made on worth alone — low
cost, because nothing here is deleted for speed.

**R2 — No test is deleted without a reason from a fixed list (D1–D9), named in
the commit.** A scanner gives a shortlist; a reader decides; the executor re-reads
the file before cutting.
*If wrong:* the one test holding down a real bug goes, and the bug comes back.

**R3 — Tests check the product, not the lab.** No browser test drives a `/test/*`
page. Code that only a lab reaches is not tested in CI (subject to Q3).
*If wrong:* a lab page breaks and nobody notices — which is acceptable for a lab.

**R4 — Isolation comes from the data, not the schedule.** Every test owns a fresh
user in a throwaway backend. No chains, no truncating tables, no shared accounts.
*If wrong:* weeks on a harness that still cannot run in parallel. Mitigated: the
mechanism already works (finding 6).

**R5 — Every parallelism claim is proved by a run that goes red when the isolation
is removed.** A green parallel suite is not evidence; it may be green because the
tests stopped checking.

**R6 — Less engine coverage is a named decision, never a side effect** (Q5).

**R7 — One test backend, built from production's real schema, not a hand-written
copy.** *If wrong:* the copy drifts; the drift check in Phase 7 exists for that.

## The phases

Each phase ends in a state worth having on its own.

| Phase | What happens | You will see | Effort | Needs |
|---|---|---|---|---|
| 1 | Cut the unit suite, rule-backed only | ~700 fewer unit tests, all green | 2–3 days, 6 parallel work packages | nothing |
| 2 | Cut the database suite | 300 → ~105 real tests | 1 day | nothing |
| 3 | Cut the browser suite | 1,191 → 450 runs; no test drives a `/test` page | 2–3 days | nothing |
| 4 | Retire tests of lab-only and dead code | ~1,260 more unit tests gone; dead functions gone | 1–2 days | Q3, Q4 |
| 5 | Read the first numbers, free, from CI | unit and database times after the cut | 1 hour | a push |
| 6 | Unit suite runs at the speed of its content | CI unit step ~216 s → ~100 s | 1–2 days | Phase 1 |
| 7 | One real test backend: local Supabase from production's schema | database tests in parallel; the app's own data code tested | 3–4 days | Q1, Q2 |
| 8 | Browser tests in parallel on that backend | every worker has its own user; no chains | 1–2 weeks | Phases 3, 7 |
| 9 | CI rebuilt for the new shape, and the one long measurement | a pull request answered in about 20–25 minutes | 2–3 days | B1, B3 |
| 10 | It cannot rot again | checks that fail on the patterns removed here | 1 day | Phase 9 |

**Phases 1–4 need no measurement and no decision from you except Q3/Q4 for Phase 4.**
They can run in parallel: six sessions could each take one unit work package while
others take the database and browser cuts — the files do not overlap.

## Manual blockers — each attempted

Things only you can do, or answer. Each was tried first.

**B1 · GitHub CLI is not logged in.** Needed for CI logs, test reports, editing CI
secrets, and opening the measurement pull request.
*Attempted:* `gh auth status` — not logged in. Fetching a failed run's log through
the API without login returns 403 "Must have admin rights to Repository".
`gh auth login` is interactive, so I cannot run it.
*Needs from you:* run `gh auth login` once, in a terminal.
*Resolved 2026-10-13:* the `daygame-coach-bf` session logged `gh` in as reachjvc.

**B2 · Which Supabase project CI's browser tests use.** Your account has two:
`supabase-daygame` (production) and `CI_daygame` (created 2026-02-05, the day CI
browser runs began).
*Attempted:* `supabase projects list` shows both; your `.env.local` points at
production; CI's secrets are not readable without B1.
*Recommendation:* this stops mattering if you answer Q1 with the local backend —
CI then needs no Supabase secret at all.

**B3 · The full browser suite cannot be triggered on this branch.** It runs on a
push to `main` or a pull request into `main`. `main`'s workflow has no manual
trigger and no schedule, and `main` is 430 commits behind.
*Attempted:* the Actions API confirms 0 scheduled runs, ever, and 0 pull-request
runs.
*Recommendation:* after Phase 3, open a **draft** pull request from
`training-rebuild` into `main`. It triggers the full suite without merging
anything. Needs B1, or two clicks on github.com.

**B4 · The schema baseline needs a home** — attempted and solved for testing;
one decision left.
*Attempted:* migrations alone fail at file 2; a schema-only dump of production
works (finding 6).
*What I did that you should know:* `supabase db dump --linked` read production's
**schema** (no rows). To do that, the Supabase CLI creates a temporary login role
on the production project — its normal behaviour for this command. The dump sits
only in this session's scratch folder; nothing is committed.
*Needs from you:* Q2 — where the baseline file lives.

**B5 · A local Supabase stack** — attempted and works. First start downloaded
images for 6 m 43 s; later starts take 29 s; a full reset 19 s.

**B6 · Writing test accounts into the live project** — not attempted, on purpose.
The local backend makes it unnecessary. The 2026-10-01 session tried it and the
permission layer refused it as a live write. Only needed if you answer Q1 with
"live".

**B7 · A clean window to measure in.** *Attempted:* four other sessions were live
the whole time and edited about 25 test files during this audit.
*Recommendation:* measure in CI (R1). I read today's CI step times that way: unit
216 s, database 108 s, route sweep 157 s.

**B8 · Rotate the Supabase service-role key.** It is handed to three CI jobs in a
**public** repository. Only you can rotate it (Supabase dashboard), and rotating
it breaks CI and your `.env.local` until both are updated. Not attempted for that
reason. Do it at the end of Phase 9, once CI no longer needs it.

**B9 · Public CI reports published the test accounts' passwords** — found by
peer sessions, being fixed by one. Anyone signed in to GitHub can download a
public repository's CI artifacts. Playwright titles a fill step `Fill "<value>"`
(confirmed in `playwright-core`'s own step titles), so **every uploaded HTML
report carried the password of each account it logged in with** — traces or not.
My first version of this entry said the two 215 KB reports were safe because
they held no trace; that was wrong.
*Status:* `f92a16f1` (session `daygame-coach-bf`) types secrets through
`tests/e2e/helpers/secret.ts`, turns every trace off under CI, removes the
trace upload, and adds the guard `tests/unit/infra/e2eSecretsStayOutOfReports.test.ts`.
On your instruction that session is rotating the three test passwords
(TEST_USER, TEST_USER_B, TEST_USER_TRAINING) and deleting the live artifacts.
*Done 2026-10-13* (reported by that session): all 10 artifacts deleted; the
three passwords changed with every session revoked; `.env`, `.env.local` and the
three GitHub secrets updated. The report from `b62c809c` did hold a password in
plain text.

## Open questions — each with my recommendation

| # | Question | Recommendation, and why |
|---|---|---|
| Q1 | Where do database and browser tests get their backend? (a) a local Supabase built from production's schema, (b) the live project with a pool of test accounts, (c) the `CI_daygame` project with a pool | **(a).** Proven today. Every test gets a fresh user in milliseconds; nothing touches production; CI needs no real secret; email flows can be tested for real against the local mail catcher. *Cost if wrong:* the local copy drifts from production — Phase 7's on-demand drift check catches it. *Note:* when the app moves to Hetzner, the local Supabase gets swapped for plain Postgres; the per-test-user design and the tests themselves carry over. |
| Q2 | Where does the schema baseline live? (a) `tests/db/baseline.sql`, refreshed by a script, with newer migrations applied on top automatically; (b) squashed into `supabase/migrations/`; (c) keep the hand-written copy | **(a).** It touches no migration (those are ask-first and belong to the platform plan), and it is the real schema. *Security note:* the repository is public, so this publishes the full schema, including 18 tables not in any migration today. Most of the schema is already public through the migrations, and row security does not depend on secrecy — but it is a choice. |
| Q3 | The `/test` labs: (a) keep the labs, retire their tests; (b) retire labs and tests; (c) keep both | **(a).** The labs stay where you put them (you asked for the old vice module to be kept in the archive). Their tests go: about 960 unit tests and about 295 browser runs check pages that no user can open. *Cost if wrong:* a lab breaks unnoticed; if one graduates to the product, it gets tests then. |
| Q4 | Functions nothing calls (about 40, listed in the inventory): (a) delete code and tests, (b) delete only the tests, (c) keep both | **(a) Delete code and tests together**, one module per commit, with the "no caller" grep in the commit message. Two exceptions first need your call: `carryAuthoredSettings` may be a live bug rather than dead code, and two `sameWeek` functions disagree about what "the same week" means. |
| Q5 | Which browsers on every pull request? | **Desktop Chromium + iPhone Safari on every pull request; Firefox, desktop Safari and Android nightly.** Safari engine on the iPhone has found real faults here; nothing records Firefox finding one. *Cost:* a Firefox-only fault surfaces a day late. |
| Q6 | Retries in CI | **1 retry, plus a named quarantine list.** Two retries triple the cost of every real failure and hide flakes. |
| Q7 | When does the browser suite run? | **The desktop lane on every push (about 15 minutes once Phase 9 lands); every lane on pull requests; the extra engines nightly.** Today the full suite runs only on `main`, which this branch has not reached in 430 commits — so a suite that runs on push is the only one that will actually run. The nightly schedule starts working after the first merge to `main`. |
| Q8 | The pre-commit hook runs the whole unit suite on every commit, from five sessions | **Run only the tests related to the staged files (`vitest related --run`); CI runs everything.** *Cost:* a break in an unrelated test is caught in CI minutes later instead of at commit. |
| Q9 | Tests that read source files and regex them (67 files) | **Keep the repo-wide rules** (write coverage, e2e isolation, the ratchets); **cut the ones that pin one string in one file.** The peer deleting the architecture tests is already doing the largest share. |
| Q10 | Copy and wording tests | **Keep the lints that scan all copy for a rule** (vice language, Life Mastery voice); **cut tests that pin one sentence.** |
| Q11 | The 40-second recurring-meeting property test | **Keep it, compute once, make its oracle lazy, split it into four files by frequency.** It found a real eleven-year bug. |
| Q12 | `helpFreshness` turns `npm test` red on 2026-12-24 with no code change | **Move the 90-day check to a scheduled CI job**, so a calendar date cannot block every session. |
| Q13 | Content the browser tests need (scenarios, articles, catalogue rows) | **Seed it from a small committed fixture**, not from a production data copy. Personal data never enters the test backend. |

## Security, raised unasked

- **The service-role key** bypasses every row-security rule. It is handed to three
  CI jobs, and this repository is public, so Actions logs are world-readable. One
  accidental `echo` publishes it. Phase 9 removes it from CI; then rotate it (B8).
- **Local browser runs write to production** today (`.env.local` points there).
  Phase 8 ends that.
- **The schema baseline** (Q2) would publish the full schema in a public repository.
- **CI test reports are public** and published the three test passwords (B9);
  rotation and the fix are in hand. Any secret a test types goes through
  `fillSecret`, and traces stay off under CI until Phase 9 says otherwise.
- **What I did to production today:** one schema-only dump through the Supabase
  CLI, which creates a temporary login role to run it. No rows were read or written.
- Not a today-emergency: there are no users and no payments. These matter before
  launch, and they get cheaper to fix as part of this plan than after it.

## Bugs found while auditing — not this plan's to fix, listed so they are not lost

- `src/programs/components/live/AddLift.tsx:128` shows the raw group name
  ("Hamstrings_glutes") because `BODY_GROUP_LABELS` is never used.
- `carryAuthoredSettings` is dead; its own comment says re-applying program text
  unpins weekdays without it — that bug may be live.
- Two `sameWeek` implementations disagree (pins and schemes).
- `tests/unit/programs/dayNameRule.test.ts:65` — a no-op branch; half that rule
  enforces nothing.
- 13 browser tests of Ask Coach probably skip silently: `/dashboard/qa` needs
  `has_purchased`, which no code writes.
- `auth-destructive` probably logs the shared account out before the
  `integration` project uses it (same dependency phase, declared first).
- `sweep/junk-params`' `/programs` case navigates zero times and passes.
- `life-mastery-day-persists.spec.ts` runs twice per pass (missing from chromium's
  ignore list).
- `blackbox.spec.ts` seeds fixed UUIDs; two accounts writing them collide.
- The database harness silently falls back to a shared connection file another
  session can overwrite (`tests/integration/setup.ts:124-137`).
- **Found by the real schema, 2026-10-13 — every scenario attempt fails to save.**
  Production's `scenarios` table has `difficulty`, `archetype` (both NOT NULL),
  `score`, `completed_at` and no `scenario_data`, `user_response` or
  `evaluation`. `createScenarioAttempt` fails with "Could not find the
  'evaluation' column of 'scenarios'", and `persistScenarioAttempt` swallows it.
  Both `getScenarioStats` (scenarioRepo and settingsRepo) select `evaluation`,
  get an error, ignore it and report 0 — the settings one also orders by
  `created_at`, which the table does not have. Pinned with `it.fails` in
  `tests/integration/repos/scenarioRepo.stack.test.ts`; the fix is your call
  (which columns are right).
- **Five composite foreign keys can abort a plan save** (found by the Phase 2
  agent): `life_plan_goals_area_fk`, `life_plan_routines_area_fk`,
  `life_plan_experiences_area_fk`, `life_plan_experiences_goal_fk`,
  `life_plan_fields_target_fk` use a bare `ON DELETE SET NULL` on
  `(x, user_id)`, which nulls `user_id` too, so deleting an area that has goals
  filed under it fails ("null value in column user_id"). `save_life_plan` deletes
  removed nodes before upserting goals, so a save that removes such an area
  fails. Migration `20260922100000` lines 248, 412, 529, 531, 566; the fix
  `20260923130000` applied to season focus only. Needs a migration (ask-first).

## What I verified, and what I am inferring

**Verified today, by running something:** 87 of 87 full browser runs on `main`
failed (GitHub API); 0 scheduled and 0 pull-request runs ever; CI step times (unit
216 s, database 108 s, sweep 157 s; Chromium job 184 m, cross-browser 27 m);
`/test/toggl` 404 on the production build and 200 on dev; migrations fail from zero
at file 2; the production schema dump (84 tables, 320 policies) boots locally in
29 s; 4 accounts in 105 ms with profile trigger, row security and cascade working;
the app signs a local-only account into the dashboard; template-database clones on
this disk take 0.5–4 s each; `gh` not logged in; the repository is public; two
Supabase projects exist; six agent verdicts re-checked by grep.

**Read, not run:** every per-file verdict in the inventory (eight agents, every
file read in full); the ~295 browser runs that target `/test` (derived from the
config by hand, not by `--list`); the dead-code findings (grep for callers).

**Inferred, not measured:** every "projected" number above; that `/test` pages are
a large share of the four hours; that the local backend serves content pages once
seeded.

---

# THE EXECUTION HALF

## The deletion reasons (R2's fixed list)

Every removal cites one. The id goes in the commit message.

- **D1 · Restates a declaration.** Asserts what a type, literal, constant or schema
  already guarantees: an enum accepts its own members, an identity mapper copies,
  a constant equals its literal. *Not D1:* bounds, refines, transforms, defaults,
  coercions, error messages a caller branches on, an enum mirrored by a database
  CHECK, a persisted storage key.
- **D2 · Asserts its own fixture.** Builds a value and checks it with no production
  code in between.
- **D3 · Weak-only.** Every assertion is `toBeDefined` / `toBeTruthy` /
  `not.toBeNull` / length > 0 on something that cannot be absent.
- **D4 · Tautology.** Holds whatever production does.
- **D5 · Duplicate.** Its failure set is a subset of a named other test's.
- **D6 · Passes without running.** Conditional skip, early return, swallowed
  assertion.
- **D7 · Brittle.** Pins incidental detail: one-file source regex, Tailwind class,
  exact copy, call counts of internals, sleeps.
- **D8 · Mock echo.** Asserts a mock received what the test fed it.
- **D9 · Dead target.** The code under test has no caller outside `tests/`
  (or, marked †, only a `/test` lab reaches it).

**Counter-rules.** A test that is the only cover for a write function in
`tests/support/writeCoverage.baseline.json` is never deleted before its replacement
is green — unless the function itself is deleted, in which case its baseline row
goes in the same commit. Anti-vacuity guards ("the scan actually read files") and
known-wrong pins stay. Date, timezone and DST tests stay. Row-security tests stay.

## Phase 1 — Cut the unit suite, rule-backed only

**Destructive (tests only).** No product code changes in this phase.

Six work packages, disjoint files, any order, any number of sessions at once.
**Only tests not marked dead or † go in this phase**; those wait for Phase 4.

| WP | Scope | Cut now | Waits for Q4 (dead) | Waits for Q3 (†) |
|---|---|---|---|---|
| U1 | `tests/unit/goals/` a–l | ~90 | ~99 | ~400 |
| U2 | `tests/unit/goals/` m–z | ~76 | ~11 | ~394 |
| U3 | `tests/unit/programs/` | ~49 | ~76 | — |
| U4 | `tests/unit/timetrack/`, `tests/unit/vice/` | 84 | — | ~110 |
| U5 | `tests/unit/db/`, `tracking/`, `health/` | ~221 | ~43 | — |
| U6 | the rest of `tests/unit/` | ~184 | ~72 | ~55 |
| | **total** | **~704** | **~301** | **~959** |

Steps per work package:

1. Open the inventory section. For each non-KEEP row: re-read the file; if a peer
   changed it so the verdict no longer fits, skip the row and say so.
2. Apply the cut, merge or rewrite exactly as the row says. Rewrites are part of
   this phase — a REWRITE row is never satisfied by deleting.
3. One commit per file or small group: `test(<slice>): cut N tests — D1 ×a, D5 ×b`
   with the test names in the body.
4. Fold in the small fixes found in that scope: the `helpFreshness` move (Q12),
   `dayNameRule.test.ts:65`, `customize`'s misnamed last test, the
   `enduranceBlocks.test.tsx` stale fixture field.

**Acceptance (per work package):**
- `npm test` green.
- The `it(`/`test(` count in scope falls by the inventory's number ±10 %; a bigger
  gap is explained in the last commit.
- `tests/unit/writeCoverage.test.ts` green and its baseline unchanged or lower.
- Every REWRITE row: break the behaviour it guards by hand, watch the new test
  go red, restore. Name the planted break in the commit body.

## Phase 2 — Cut the database suite

**Destructive (tests only).** Scope: `tests/integration/db/`, per the WP-I table.

1. Delete and trim per the table; replace the 12 cascade/foreign-key tests with
   **one catalog test**: every user-owned table cascades from the user, except a
   named list with reasons (`error_reports` SET NULL, `milestones.session_id`,
   `workout_logs.enrollment_id`).
2. Name every refusal: replace the 12 bare `rejects.toThrow()` with the constraint
   name or SQLSTATE.
3. Fix the leaked connections (lifeAnswers, lifePlanDay, pagedReads) and the four
   no-op `set_config` calls in lifePlanRoundTrip (use `asUser`).
4. Add the missing tests: the two `user_goals` partial uniques, `claim_beta_slot`.

**Acceptance:** `npm run test:integration` green; about 105 tests plus the catalog
test; a new unit check fails on a bare `.rejects.toThrow()` under
`tests/integration`.

## Phase 3 — Cut the browser suite

**Destructive (tests only).** Scope: `tests/e2e/`, `playwright.config.ts`.

1. Delete the specs in the inventory's delete table, the tracked screenshots, the
   stale `CONTINUATION_PROMPT.md` and the three dead helpers.
2. Retarget the time-tracker specs from `/test/toggl` to the product route
   `/dashboard/time`. Replace fixed sleeps with waits on a condition; the five
   timing-sensitive tests listed in the inventory get an `@timing` tag.
3. Merge, trim, rewrite and demote per the second table. Demoted API-only checks
   become database or unit tests in the same commit — a demotion never just
   deletes.
4. Remove the per-project test lists for duplicated engines, per Q5's default.
5. Update `tests/unit/ciWorkflows.test.ts` and `tests/unit/e2e-isolation.test.ts`
   in the same commits that change the config (they police it, and the latter's
   grandfathered list names two specs that no longer exist).

**Acceptance:**
- `npx playwright test --list` totals about 349 runs for the pull-request projects
  and 450 with the nightly projects.
- New unit checks: no spec under `tests/e2e` navigates to `/test/`; no
  `waitForTimeout(` outside an allowlist of `@timing` tests that may only shrink;
  no `test.skip(` outside a shrink-only allowlist, with a reason per entry, kept
  inside that check (`.test-known-failures.json` was deleted on 2026-10-13).
- Every changed spec run green once locally against the dev server, named in the
  commit. Run one project at a time; the shared `next dev` is the local limit.
  As today, this uses the three existing test accounts in the live project —
  Phase 8 ends that; until then, run only what changed.

## Phase 4 — Retire tests of lab-only and dead code (needs Q3, Q4)

1. **Q3 = (a):** delete every † row's tests across U1, U2, U4 and U6 (about 960).
   Keep the lab pages. Before deleting a file, move out any test of an export that
   a live page also uses (`REASON_PROMPTS`, `goalHorizon`, `goalNeedsAction`,
   `rungSentences`, `planProblem`).
2. **Q4 = (a):** for each dead function in the inventory (about 300 tests), delete
   the function and its tests together, one module per commit, with the
   zero-caller grep in the message. Remove matching rows from `writeCoverage.baseline.json` and from any
   allowlist that names them (`goalProgressOneOwner`'s, `progressReads`').
   Settle `carryAuthoredSettings` and `sameWeek` with the owner first.

**Acceptance:** `npm test` green; `node scripts/typecheck-ratchet.mjs` and
`npm run lint:ratchet` pass with their baselines unchanged or lower.

## Phase 5 — Read the first numbers, from CI

Push. When the CI run has finished, read its step times from the public Actions
API (no login needed; this command printed today's 216 s and 108 s):

```sh
RUN=$(curl -s "https://api.github.com/repos/reachjvc/Daygame_coach/actions/workflows/ci.yml/runs?branch=training-rebuild&status=completed&per_page=1" \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['workflow_runs'][0]['id'])")
curl -s "https://api.github.com/repos/reachjvc/Daygame_coach/actions/runs/$RUN/jobs" | python3 -c "
import json,sys,datetime as d
p=lambda t:d.datetime.fromisoformat(t.replace('Z','+00:00'))
for j in json.load(sys.stdin)['jobs']:
  for s in j['steps']:
    if s.get('completed_at') and s['name'] in ('Unit tests','Database tests'): print(s['name'], round((p(s['completed_at'])-p(s['started_at'])).total_seconds()), 's')"
```

Record the numbers here under Phase 5, beside today's. No local timing.

## Phase 6 — The unit suite runs at the speed of its content

Non-destructive: the test count must not move in this phase.

1. Default `environment: 'node'` in `vitest.config.ts`. Add
   `// @vitest-environment jsdom` to the files that use the DOM — the inventory's
   list of 72 is a starting point; classify **by what a file uses**, never by
   extension.
2. Split `anOldRecurringMeetingStillImports.test.ts` into four files by frequency
   with a shared `recurrenceShapes.ts`; compute each shape's result once and share
   it across the property tests; generate oracle candidates lazily so the early
   break works. Do not cut dimensions — a narrower space hid two live bugs.
3. One cached source-file index in `tests/support/` for the eight tests that each
   walk the tree; memoise `writeFunctions()` and `benchLinkers()`.
4. Fake timers for real sleeps: `aPullDoesNotUndoWhatYouJustDid` (9.1 s), and the
   100 ms and 50 ms sleeps the inventory names.

**Acceptance:** same test count before and after; removing the jsdom pragma from
one DOM file turns it red (R5); each recurrence file reports under 10 s in the CI
run and a failure names the shape; the CI unit step time falls (read as in
Phase 5).

## Phase 7 — One real test backend

Depends on Q1 = (a) and Q2 = (a).

1. **Baseline.** `scripts/db/baseline.sh` runs `supabase db dump --linked` (schema
   only) into `tests/db/baseline.sql` and stamps it with the newest migration file
   production already has. `tests/db/shim.sql` holds the one trigger a
   public-schema dump cannot carry:
   ```sql
   create trigger on_auth_user_created after insert on auth.users
     for each row execute function public.handle_new_user();
   ```
   At start, every file in `supabase/migrations/` newer than the stamp is applied
   on top — so a new migration reaches the tests the day it is written, before
   production has it. `scripts/db/baseline.sh --check` diffs a fresh dump against
   the committed one, to catch changes made in the Supabase dashboard rather than
   in a migration; it needs the Supabase login, so it runs on demand, not in CI.
2. **The stack.** A `tests/db/supabase/` working folder with its own `config.toml`
   (its own `project_id`, so it never meets another stack) whose migrations are the
   baseline plus the shim. Start it with
   `supabase start -x realtime,storage-api,imgproxy,studio,edge-runtime,logflare,vector,supavisor,postgres-meta`
   — that is the exact command that worked today. Vitest's `globalSetup` starts it
   or reuses a running one; CI starts it in a workflow step.
3. **Helpers.** `newUser()` creates a confirmed account through the local admin
   API and returns its id and a signed-in client. `asUser(id)` sets
   `request.jwt.claims` and `SET ROLE authenticated` on one connection. Every test
   uses its own user: **no truncation anywhere.** Global tables (catalogues,
   content) are seeded once from a small committed fixture (Q13).
4. **Parallel.** `fileParallelism: true`, `maxWorkers` 4 in CI and 8 locally
   (Vitest 4.1 has no `poolOptions`).
5. **The app's own code.** Integration files mock `@/src/db/supabase` to return
   supabase-js clients bound to the local stack and the test's user, so repo
   functions run unchanged against real PostgREST and real row security. Write the
   first repo-level tests from the inventory's list.
6. **Retire** `tests/integration/schema.sql`, `tests/unit/db/schemaMirror.test.ts`,
   the shared connection file and `@testcontainers/postgresql`.

**Acceptance:**
- `npm run test:integration` green with files in parallel.
- R5 proof: with `TEST_SHARED_USER=1` forcing every test onto one user, the suite
  goes red.
- A catalog test asserts every public table has row security on and every policy
  is owner-shaped or on a named list — covering all 84 tables, including the 29
  the mirror lacked.
- A dummy migration newer than the stamp, creating a table, is applied on top and
  the table exists in the test stack; deleting the dummy removes it again.
- The first repo-level tests pass against real PostgREST.

**Why not keep testcontainers:** it is the right tool for starting a plain
Postgres from test code. The app's backend is Postgres plus Supabase's HTTP layer
and auth, and the Supabase CLI starts exactly that set of containers. After the
Hetzner move the backend becomes plain Postgres again, and testcontainers comes
back with it; the per-test-user design and the tests carry over unchanged.

## Phase 8 — Browser tests in parallel on that backend

1. **A worker-scoped `account` fixture**: creates a user per Playwright worker
   through the local admin API, signs in through the API, writes that worker's
   storage state. A `secondUser` fixture for the row-security tests. Logout tests
   use a throwaway account of their own (sign-out is global).
2. **Delete the chains**: every `dependencies` edge that exists to force an order,
   every `workers: 1` and `fullyParallel: false` override, the 36-entry chromium
   ignore list, the four setup projects. Keep `describe.serial` inside files where
   one account holds one thing (one open workout, one active session).
3. **Lanes, not hand-picked projects:** desktop, public, phone on pull requests;
   firefox, webkit-desktop, android nightly. Choose extra-engine tests with tags
   (`@engine`, `@phone`, `@timing`), not per-project file lists.
4. **Data the specs assumed:** seed per test what the inventory's risk list names
   (a routine step, a 7×/week step, dating answers, `has_purchased` for the Ask
   Coach test). Stub AI calls with route mocks. Mint UUIDs per run in
   `blackbox.spec.ts`.
5. **Email flows** read the local mail catcher (Mailpit, port 54324) — signup
   confirmation and password reset become real end-to-end tests.
6. **Locally**, run against a production build in its own folder and port
   (`NEXT_DIST_DIR=.next-e2e`, port 3200, `--webpack`), never the shared
   `next dev`.
7. Rewrite `trainingSpecsGuarded` and the training helper's path check: the
   one-training-account rule disappears with per-worker accounts.

**Acceptance:** each lane green locally at 8 workers; R5 proof: with
`E2E_SHARED_ACCOUNT=1` forcing one account for all workers, the run goes red; a
config unit check fails if any Playwright project declares `dependencies`.

## Phase 9 — CI built for the new shape, and the one long measurement

1. **Build once:** a `build` job runs `next build --webpack` with the local
   backend's address baked in and uploads `.next` as an artifact.
2. **Matrix:** per lane, `--shard=i/N` with the blob reporter; pull requests run
   desktop 4 shards × 2 workers, phone 2 × 2, public 1 × 2; nightly adds firefox,
   webkit-desktop and android. Two workers because each runner also hosts its own
   backend and server; raise to four (the public-repo runner has 4 vCPUs) if the
   memory allows. Each shard starts its own local backend and `next start`;
   pulling the backend's images costs each shard 1–2 minutes, which is inside the
   20–25-minute estimate (cache them if it is not). A `merge-reports` job merges the blobs. `@timing` tests in a
   one-worker shard.
3. `retries: 1` (Q6). Browser cache for `~/.cache/ms-playwright`.
   **Traces stay off under CI**, blob reports passed between jobs carry no
   trace, every typed secret goes through `fillSecret`, and
   `tests/unit/infra/e2eSecretsStayOutOfReports.test.ts` stays green (B9). Turning `on-first-retry` back on is safe only once every account
   CI signs in with is a throwaway user in the local backend (Phase 8), so a
   trace can hold no real credential; that is a named decision, recorded here if
   taken. Keep `runs-on: ubuntu-24.04` (pinned by the `caddy-deploy-and-cicd`
   plan because `ubuntu-latest` moves to 26.04 on 2026-10-19).
4. **Remove every Supabase secret from `e2e.yml`.** Then you rotate the
   service-role key (B8).
5. Rewrite `tests/unit/ciWorkflows.test.ts` for the matrix (it hard-codes three job
   names and cannot read `${{ matrix }}` values).
6. **The measurement:** open the draft pull request (B3). Record every lane's wall
   time here. This is the only long run in the plan.

**Acceptance:** one pull-request run green within 30 minutes, every lane; the
numbers written into this file.

## Phase 10 — It cannot rot again

- A duration ratchet: `docs/testing/durations.json` holds each suite's CI wall
  time from Phase 9; a scheduled job reads the latest run's step times and fails
  above the baseline; the numbers may only fall. Prove it by lowering one by a
  second and watching it fail.
- The checks from Phases 2, 3 and 7 stay: no bare `rejects.toThrow()` in
  integration, no `/test/` navigation, no `waitForTimeout` outside the `@timing`
  allowlist, no `test.skip` outside its allowlist.

## Ordering

- Phases 1, 2, 3 and 4 are independent and touch disjoint files; run them in
  parallel. Phase 4 waits only for Q3/Q4.
- Phase 5 after 1–3 are pushed.
- Phase 6 after Phase 1 (both edit the unit files).
- Phase 7 is independent of 1–6, but its acceptance assumes Phase 2 is done.
- Phase 8 after Phases 3 and 7. Phase 9 after 8. Phase 10 last.

## What this plan does not do

- It does not touch `supabase/migrations/` (Q2 keeps the baseline beside the tests).
- It does not reopen the Hetzner decision; Phase 7 states what changes at the move.
- It does not fix the product bugs listed above; it lists them.
- It does not claim any deletion made anything faster. The speed comes from
  Phases 6–9.

---

## The execution prompt

Paste after `/goal`. Kept here so it outlives the session that wrote it.

> Execute `Plans/tests-worth-their-keep.md` end to end. Read it first, then
> `Plans/tests-worth-their-keep.inventory.md`, then `docs/testing_behavior.md`.
>
> **Order:** Phases 1, 2 and 3 first, in parallel where you can — they need no
> measurement and no decision. Phase 4 only for the questions the owner has
> answered. Then 5, 6, 7, 8, 9, 10.
>
> **Deleting:** only on a reason from D1–D9, named in the commit. Re-read every
> file before cutting it; four sessions share this checkout and edit tests
> constantly. A REWRITE row is never satisfied by deleting. Never delete the only
> cover for a write function before its replacement is green.
>
> **Measuring:** never on this machine. Read CI step times from the GitHub
> Actions API. The only long run is Phase 9's draft pull request.
>
> **Parallelism:** every claim is proved by a run that goes red with the isolation
> removed. A green parallel suite is not evidence.
>
> **The backend:** Phase 7's commands are the ones that worked on 2026-10-13. If
> one fails, say so and fix the plan; do not work around it.
>
> **Security:** never print the service-role key. Remove it from CI in Phase 9,
> then tell the owner to rotate it.
>
> Commit each phase separately with its before and after counts. Commit with
> `git commit --only <paths>`. Run `npm run ci` before saying a phase is done. If
> a result contradicts this plan, say so in the reply and correct the plan.

---

## Progress

**2026-10-13** — executed by one session with parallel agents; every commit is
on `training-rebuild`.

| Phase | State | Result |
|---|---|---|
| 1 Cut the unit suite | done | 8df2e292, 812f496d, a13dc9f3, b4edcaca, 705516d3. All six work packages; every rewrite proven by a planted break. |
| 2 Cut the database suite | done | c498c5d4. 300 → 111 tests; every refusal named. |
| 3 Cut the browser suite | mostly done | 9274a742, 7e66dd8a; the agent is finishing spec runs. 1,191 runs per pass → see its final numbers. |
| 4 Lab-only and dead code | done except two owner calls | b4edcaca, 705516d3, 812f496d (lab tests); 3fa860e3, 863fcf74, 31f0b466 (dead code with its tests, ~14,000 lines). `carryAuthoredSettings`, both `sameWeek`s and badgeEngine's `detectTierUpgrades` wait for you. |
| 5 First CI numbers | blocked | CI is red at the lint step on another session's commit (dbe09f12), being fixed by that session, so the unit and database steps have not run since. |
| 6 Unit speed | done | 1b2b7fca (recurrence sweep 40 s → 5 s), b9a06180 (Node by default, jsdom only where a file renders: 47 s → 27 s here), 084742e3 (write-coverage guard 2.2 s → 0.5 s). |
| 7 One real test backend | done | 7cb661a9, 3aaea00e, d7968eea. Production's schema, files in parallel, no truncation: 146 s → 11 s; 139 passing + 8 pinned known-wrong; `TEST_SHARED_USER=1` turns 99 red; row-security catalog over all 84 tables. |
| 8–10 | not started | Phase 8 starts when Phase 3's agent finishes. |

**Counts:** unit 6,519 runtime tests this morning → 4,533 (the peer's
architecture deletion included); database 300 → 147 (139 + 8 known-wrong, now
including the app's own data code); browser per Phase 3's final report.

**Bugs found by this work.** Fixed: the time tracker crashed when browser
storage was full (c5ab3116); its phone header pushed the bell off screen
(80cfcc73); AddLift printed "Hamstrings_glutes" (18e1b1e6). Pinned for you
(`it.fails`, each with a header): every scenario attempt fails to save, and the
scenario stats read 0 (`scenarios` has no `evaluation` column); saving
inner-game values keeps only the first category (`user_values` has no UPDATE
policy); inner-game reset always returns 500 (`inner_game_progress` has no
`essential_selection` column); goals filed under "scenarios" are refused by a
second production CHECK; `user_goals.goal_type` defaults to a value its own CHECK
refuses; `user_values` has no foreign key to the person; five `life_plan_*`
foreign keys abort a plan save that removes an area with goals under it.
Also: migration `20260927120000_corrections_keep_set_order` is not applied in
production (the test backend applies it on top of the baseline).

**Found by the browser cut, not fixed:** the tracking history's "All" filter
hides drafts; the custom report builder cannot save a notes-only report (400
"Fields required"); `life-mastery-track.spec` fails at "pushes the plan into
real goals" before and after this work.

**Security, found along the way:** `/api/goals/plan` and the four
`/api/goals/vision-plan/*` routes are deployed and callable by any signed-in
account, though only `/test` lab pages use them (the vision-plan ones run
Claude on every call); `npm audit` reports 21 advisories (1 critical, 8 high),
not investigated here.
