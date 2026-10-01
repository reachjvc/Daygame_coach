# Tests worth their keep — the speed and the worth

**Serves vision item 13** ("Tests are worth their keep: the useless ones removed,
the missing ones written") and item 43 (CI exists). Written 2026-10-01.

---

# THE HUMAN HALF

## Start with the uncomfortable part: your premise about speed is wrong, and acting on it would have wasted the work

You asked to clean aggressively *before* measuring, because measuring costs four
hours. Two of the three suites turned out to be measurable in under seven
minutes, so I measured first. It redirected the whole plan, and I would have
handed you a plan that spent its effort in the wrong place otherwise.

**The four hours is almost entirely the browser suite. Unit tests are 56
seconds.**

| Suite | What it is | Wall time | CPU used | Where I got the number |
|---|---|---|---|---|
| Unit (`npm test`) | 6,628 tests, 384 files | **56.1 s** | 1506 % (15 cores busy) | ran it today, solo |
| Database (`npm run test:integration`) | 300 tests, 22 files | **6 m 14 s** | **5 %** — 21.5 s of CPU in a 374 s run | ran it today |
| Browser (`npm run test:e2e`) | 1,196 test runs, 84 files, 44 projects | **3 h 45 m – 5 h 15 m** | one worker | recorded in `.github/workflows/e2e.yml` from 179 real CI runs |

So: **deleting unit tests cannot buy you speed.** The entire unit suite finishes
in the time it takes the browser suite to log in. If every one of the 6,628 unit
tests vanished you would save 56 seconds off a four-hour wait. (There *is* a 2×
win available in the unit suite — see the next section — but it comes from how the
suite is configured, not from deleting anything.)

That does **not** mean your quality instinct is wrong. It is right, and I found
exactly the thing you described. It means the cleanup is justified by *worth* —
tests that lie to you, tests that pass by not running, tests that will break when
somebody renames a field — and never by speed. The plan keeps those two arguments
apart on purpose, because mixing them is how a speed project ends up deleting the
tests that were holding real bugs down.

## Two unit-suite wins that are real — and the mistake I made finding them

I nearly handed you the opposite of this section, and the way it went wrong is
worth more than the numbers.

I tested two theories about the unit suite, measured both, got "no gain" on both,
and wrote "there is no cheap speed win in the unit suite" into this plan.
**Then a peer session told me it had been running the unit suite three times
during exactly that window.** I re-ran everything in a clean solo window, in one
batch, with the A/B alternated to cancel drift. Both theories are right. My
measurement was measuring the other session.

| Run | Wall | Note |
|---|---|---|
| Full unit suite, clean baseline | **56.1 s** | vs 49.8 s in the dirty window — ±12 % run to run |
| Full suite minus the slowest file | **44.2 s** | **−12 s, −21 %** |
| 292 non-DOM files, jsdom | 26.3 s / 24.6 s | two runs |
| 292 non-DOM files, Node env | **13.6 s / 12.7 s / 13.2 s** | three runs — **~2× faster** |

**Theory 1 holds: one file is a fifth of the suite.**
`anOldRecurringMeetingStillImports.test.ts` is a combinatorial property sweep —
four frequencies × three intervals × four counts × several end dates × weekday
sets × two durations, thousands of cases inside 28 tests. Sharding it recovers
12 seconds.

**Theory 2 holds, and bigger: jsdom is a tax on three quarters of the suite.**
292 of 311 `.test.ts` files touch no DOM at all. Only 39 declare
`@vitest-environment node`. The rest build a whole fake browser they never use —
**394 seconds of summed worker time per full run**, which falls to 51 ms under
the Node environment.

**So the unit suite can roughly halve, 56 s → around 30 s.** That combined figure
is a projection, not a measurement: the property file sits inside the 292, so the
two wins overlap and do not simply add. M0 measures the real combined number.

**What this cost and what it teaches.** Two correct optimisations were nearly
discarded because I measured on a shared machine and reported the result as fact.
The lesson is already in this plan as M0, and it earned its place: **a wall-time
number from this checkout means nothing unless one session is working in it.** I
would have told you to skip a 2× win.

One caveat I still cannot test: 56 s is with a warm Vite transform cache. CI
starts cold, so CI's unit step is slower by an unknown amount.

**And a warning for whoever executes theory 2.** When I ran the 292 files under
Node, 6 tests failed — not because of the change, but because vitest treats
positional file arguments as *substring filters*, so
`tests/unit/programs/enduranceBlocks.test.ts` also matched its sibling
`enduranceBlocks.test.tsx`, which does need a DOM. **Classify files by what they
use, never by extension or by name.** That mistake is the one way this change
breaks, and it broke that way on the first attempt.

## Where the four hours actually goes, and why it is not the tests' fault

The browser suite is slow for one reason, and it is not test count.

**Every browser test signs in as one of three real accounts in the live Supabase
project.** Because they share those accounts, they cannot run at the same time —
one test deletes the rows another is mid-assertion on. So:

- CI pins **one worker** (`playwright.config.ts:38`). 1,196 tests, one at a time.
- 44 Playwright projects exist, and **ten of them exist *only* to force an
  order** — seven of those hold a single spec file each and chain to the previous.
  `goals-1 → goals-2 → goals-3`. `session-1 → session-2 → session-3 → session-4`.
  `training → training-iphone-safari → training-android → training-firefox`,
  all four pinned to one worker — 143 tests, strictly one after another.
- `retries: 2` on a suite the workflow's own comment calls permanently red, so
  failures cost three runs each.

The config says so itself, in its own words: *"These files share a test user and
mutate goals data, so they must not run in parallel."* Not one chain exists
because a later test needs an earlier one's output. **Every chain is there to
stop two tests touching one account.**

**That is the whole bottleneck, and it is fixable at the data layer rather than
the schedule.** Give each parallel worker its own account and the reason for
every chain disappears at once.

And the chains cost you something worse than time. From the config's own comment
on `goals-4`: *"Playwright SKIPS a project whose dependency failed, `goals-1` is
currently red, and a skipped spec reports as a green run."* **One red test at the
head of a chain silently converts everything behind it into a non-run that reads
as a pass.** That is a correctness argument for pulling the chains apart, not a
speed one. (That sentence is the config author's, not my measurement — but the
Playwright behaviour it describes is documented and real.)

### One honest limit on all of this: the four hours is a CI number

`workers: 1` applies **only when `CI` is set**. Locally `workers` is undefined, so
Playwright already uses half your cores, and the local suite is already far faster
than four hours — except where a project pins `workers: 1` itself.

So if your four hours is the CI tick, M3 fixes it. **If your pain is the local
run, M3 helps less than it looks**, because locally the limiter is a different
thing: one `next dev` serving every worker, compiling each route on first request.
`memory/e2e-runs-need-a-frozen-src` records this being misdiagnosed as an account
race — *"Giving the phone project its own account did not fix it: the contention is
the single dev server both suites drive, not the rows they write."*

**Per-worker accounts do not fix a shared dev server.** The fix for the local case
is to run the suite against a production build (`npm run build && npx next start`)
on its own port, which also matches what CI does. M3 includes that, and it is the
part I am least able to verify from here, because building freezes WSL
(`memory/next-build-oom-freezes-wsl`; `--webpack` is the workaround already wired
into `npm run build`).

## The database suite is the other easy win, and the number is embarrassing

300 database tests take 6 minutes 14 seconds and use **21.5 seconds of CPU**.
94 % of that run is a single core waiting on a socket.

Three causes, all structural, none about the tests:

- `fileParallelism: false` in `vitest.integration.config.ts` — 22 files, strictly
  one at a time, because they share one database.
- Every helper call opens a **brand-new database connection** and closes it.
  There are 249 `getClient()` call sites.
- 45 `beforeEach` blocks each run a **27-table `TRUNCATE`**.

A 24-core machine is running one of them.

## What I also found, which is the "missing tests" half of item 13

The database suite builds its Postgres from one hand-written file,
`tests/integration/schema.sql`. I diffed it against `supabase/migrations/` today,
by table name:

- **52 tables in the mirror. 66 created by the migrations. 32 absent — and 3 of
  those were deliberately dropped** (`plan_snapshots`, `program_session_logs`,
  `workout_templates`), so **29 live tables have never existed in the test
  database.**
- 18 of the 29 are `timetrack_*`. `grep -ci timetrack tests/integration/schema.sql`
  returns **0**. Also absent: `vice_attempts`, `vice_reports`, `error_reports`,
  `life_chapters`, and the five health logging tables (`sleep_logs`,
  `nutrition_logs`, `weight_logs`, `body_measurements`, `dashboard_widgets`).
- The mirror carries **24** row-security policies. The migrations contain 68
  `CREATE POLICY` and 22 `DROP POLICY`, so the live total is lower than 68 — but
  **every policy on those 29 missing tables is unrepresented by construction.**

So whole slices — timetrack, quit-vice, health logging — have **no database-level
coverage at all**. They are not failing; they are absent, which is worse, because
the suite reads as covering the database.
`tests/unit/db/schemaMirror.test.ts` already documents this blind spot in its own
header, and says why: its rule 1 only checks policies "on a table the mirror
actually has", so a missing table makes the guard silent rather than red. Nothing
has closed it.

Cleaning is half of this job. The other half is that a real coverage hole sits
behind a green tick.

## A brittleness finding that arrived while this was being written

A peer session ran the unit suite three times during my measurement window and
reported something I would not have found alone. **The suite's two slowest tests
are also the first two to fail when the machine is busy:**

| Test | Alone | Under load |
|---|---|---|
| `architecture.test.ts > no date is spelled in whichever locale the runtime happens to have` | 5.3 s | **22.8 s — failed** |
| `anOldRecurringMeetingStillImports.test.ts > matches a day-by-day walk of the same rule, for every shape` | 41.8 s | **85.8 s — failed** |

`vitest.config.ts` pins `testTimeout: 20000`, and its own comment explains that
the timeout was raised from 5 s precisely because contention was failing tests
that assert nothing about duration. **These two have now outgrown 20 s the same
way.** Raising it again is the same cliff further away — which that comment says
itself.

So both need a **budget or a split, not a bigger number**: shard the property
sweep so each shard is bounded, and give the locale scan a cap. This is a quality
finding, not a timing artefact: a test that goes red on a busy machine teaches
everybody to re-run it instead of reading it, and this repo has already recorded
where that ends.

**One honest qualification, raised by the session that measured it.** That 22.8 s
is wall-clock for the whole test; nobody isolated what it was spent on.
`architecture.test.ts` globs and reads source files, so *CPU contention* and *a
tree being written by three sessions* are two different causes with the same
signature, and a budget sized against the wrong one is sized wrong. Contention is
the explanation that fits; it is not proved. **Before setting either budget,
measure that test alone under CPU load with a quiet tree, and alone with a
churning tree.** Two runs, and the cause stops being a guess.

The same session hit a third thing: a run collected
`tests/unit/docs/planStatus.test.ts` and then lost it, because another session
created or deleted it mid-collection. **No pass/fail or wall-time number from this
checkout means anything unless one session is working in it** — which is why M0's
lock has to refuse on file churn under `tests/`, not only on a concurrent suite.

## The rules this plan follows — approve these, not the counts

Per `.claude/rules/plans.md`: you approve rules and costs. Counts are outputs.

**R1 — Speed work goes where the time is, and that is the browser suite only.**
Unit and database cleanup is argued on worth alone; this plan never claims a
deletion made anything faster.
*If I am wrong:* effort goes into a 50-second suite while a four-hour one stays slow.

**R2 — No test is deleted without a written reason from a fixed list, named in
the commit.** Seven reasons, defined below. No deletion by heuristic, by file
size, or by taste.
*If I am wrong:* we delete the one test holding a real bug down, and find out in
production months later. This is the rule that protects you from me.

**R3 — Isolation comes from the data, not from the schedule.** Tests are
serialized today because they share three accounts and one database. Per-worker
accounts and per-worker databases remove the reason, and then the schedule can be
parallel.
*If I am wrong:* a rewritten harness that still cannot run in parallel — weeks
spent, nothing gained.

**R4 — Every parallelism claim is proved by a run that goes RED when the
isolation is removed.** A green parallel suite is not evidence; it may be green
because the tests stopped checking.
*If I am wrong:* a fast suite that silently tests nothing. This is the failure
mode this repo has hit most often.

**R5 — Reduced coverage is a decision with a line in this plan, never a side
effect.** Dropping an engine from the matrix is a named choice with a named cost,
not something that falls out of a speed change.
*If I am wrong:* Safari breaks for a user and no test has run there for months.

## The phases

Each is a state you can stop at. Nothing later is required for an earlier one to
be worth having.

### M0 — A measurement you can trust *(half a day)*

Today's database number is contaminated: a peer Claude session ran the same suite
concurrently with mine, and I only noticed by reading the process table. That is
not a one-off — four sessions share this checkout.

- `scripts/bench-tests.mjs <suite>` records wall time, CPU time and per-file
  durations to `docs/testing/bench/`, and **refuses to run** when either of these
  is true:
  1. another vitest, Playwright or testcontainers Postgres is alive in this
     checkout — the thing that spoiled today's database number;
  2. anything under `tests/` or `src/` changed while it was running — the thing
     that produced a phantom collection error in a peer's run today. Compare a
     cheap tree hash before and after, and void the measurement if it moved.
- Baseline committed from the numbers in the table above.

**Acceptance:** start a second vitest, run the benchmark, watch it refuse and exit
non-zero. Then touch a file under `tests/` mid-run and watch it void the result.
Not "it should detect that" — watch both.

### M1 — The unit suite stops telling you things it has not checked *(2–3 days)*

Delete by rule D1–D4 (below) across `tests/unit`. Expect the bulk to come from
five schema files holding **262 tests**, most of which assert that a Zod enum
accepts its own listed members.

**Acceptance:** `npm test` green; `node scripts/tests-must-fail-without-the-fix.mjs`
reports no new entries; `tests/support/writeCoverage.baseline.json` unchanged or
lowered, never raised; each removed file named in a commit with its rule id.

**Destructive.** Gate: before deleting any test that is the only cover for a
write path in the write-coverage baseline, write the replacement first.

### M1b — The unit suite halves, without deleting anything *(1 day)*

Measured, not hoped. Independent of M1 — do either first.

- **Default the test environment to `node`** in `vitest.config.ts`, and add
  `// @vitest-environment jsdom` to the files that genuinely use a DOM. Classify
  **by what a file uses** — `render`, `@testing-library`, `document`, `window`,
  `localStorage`, `navigator`, `HTMLElement` — never by extension. 39 files
  already declare `node`; about 292 more qualify.
- **Shard the property sweep.** Split
  `anOldRecurringMeetingStillImports.test.ts` so each shard is bounded and a
  failure names the case, rather than 28 tests running thousands of cases behind
  one 20-second budget. Pairs with the brittleness finding above.

**Acceptance:** `npm test` green with the same test count (6,628 — this phase
deletes nothing, so the count may not move); M0 reports the combined wall time;
**and one file that needs a DOM, with its docblock removed, goes red** — proving
the classification is load-bearing rather than decorative.

**The trap, hit on the first attempt:** vitest positional arguments are substring
filters, so a `.test.ts` path also selects a sibling `.test.tsx`. Verify the final
jsdom list against the file contents, not against a glob.

### M2 — The database suite runs in parallel and cannot leak *(3–4 days)*

Target: 6 m 14 s → **under 60 s**, and the 5 % CPU figure up into the hundreds.
The arithmetic behind that target, so you can check it rather than trust it: 338 s
of the 374 s is test time, nearly all of it waiting on round trips, which divides
across workers. 338 ÷ 8 ≈ 42 s, plus ~10 s of container start, schema load and
eight template-database copies. **Under 60 s is derived, not promised** — if the
truncates turn out to serialize on a shared lock the number will be worse, and M0
will say so.

- One container. Schema loaded **once** into a template database.
- `CREATE DATABASE test_w<N> TEMPLATE …` per worker — a few hundred ms each, and
  then every worker has its own isolated database.
- `fileParallelism: true`.
- One pooled client per worker, replacing 249 connect-and-close call sites.
- The truncate list derived **from the catalog**, not the hand-written list of 27
  tables. A new table is cleaned the day it exists, with nobody editing a list.

**Acceptance:** all 300 pass; CPU% rises; **a row deliberately leaked by one file
is proved invisible to another** (R4); a table added to `schema.sql` is truncated
with no list edited.

### M3 — Any two browser tests can run at once. This is the four hours. *(1–2 weeks)*

- A **worker-scoped Playwright fixture** that creates its own account before the
  worker's first test and deletes it after its last. The mechanism already exists
  in this repo and you have already sanctioned it:
  `tests/manual/timezoneCounters.test.ts` creates a real account at line 109
  (`admin.auth.admin.createUser`) and deletes it at line 167.
- Per-worker storage state, replacing the shared `tests/e2e/.auth/user.json`.
- **Delete the chains**: the dependency edges and the `workers: 1` pins on
  `goals-1..3`, `session-1..4`, the four training projects, `auth-destructive`
  and `integration`. The projects that exist *only* to force an order merge back
  into one — `goals-1..3` → one, `session-1..4` → one, the four training
  projects → one. Projects that encode a real difference (a device, an engine,
  signed-out, two users) stay. Honest estimate: **44 → around 20, and the
  serialization goes entirely.** The count is an output, not a target.
- Local runs against a production build on their own port, not the shared
  `next dev` (see the limit above).
- CI `workers: 1` → 4.
- `retries: 2` → 1, plus a named quarantine list for known flakes.

**Acceptance:** whole suite green at `workers: 4`; **and a deliberate run with the
per-worker account fixture disabled goes RED** (R4 — proves isolation is what
makes it safe, not luck).

**Destructive, and the one thing needing your yes:** this creates and deletes
accounts in the live Supabase project. See blocker B1.

**Two execution risks I cannot test without doing it:**
- **Supabase auth rate limits.** Four workers creating and deleting accounts on
  every run may hit them. Mitigation: a small pool of long-lived per-worker
  accounts (`e2e-w1..w4`) reused across runs and wiped at worker start, rather
  than created fresh each time. Start there; create-per-run only if the pool
  proves insufficient.
- **Email confirmation.** `admin.auth.admin.createUser` must pass
  `email_confirm: true` or the account cannot sign in. The existing manual test
  is the reference implementation.

**One blocker that is already answered:** no new CI secret is needed.
`e2e.yml` already passes `SUPABASE_SERVICE_ROLE_KEY` to every browser job.

### M4 — No test passes by not running *(3–4 days)*

Delete by rule D5–D7 across `tests/e2e` and `tests/integration`:

- **147 `waitForTimeout` call sites; the 136 with a literal duration sum to 170
  seconds of hardcoded sleeping per pass**, before counting the files that run on
  four engines. Each is a condition somebody did not write. `timetrack-sync.spec.ts`
  alone sleeps 54.4 s.
- **46 conditional-skip and soft-assertion sites**, including six
  `test.skip(!page.url().includes('/dashboard/qa'))` that skip silently whenever
  the account lacks QA access, and two whole suites in `vision-plan.spec.ts`
  disabled with a bare `test.skip(...)`.
- The 5-engine duplication: 1,196 runs of 660 distinct tests.

**Acceptance:** a check that fails on a new `waitForTimeout` under `tests/e2e`,
and on a `test.skip` with no matching entry in `.test-known-failures.json`.

### M4a — The gate that decides whether to run the tests at all

Same rule as the rest of M4, applied one level up. `.claude/hooks/check-test-results.sh:27`
decides whether to run `npm test` with:

```sh
CODE_MODIFIED=$(git diff --name-only HEAD | grep -E "\.(ts|tsx|js|jsx)$" | wc -l)
```

**`git diff --name-only HEAD` does not list untracked files.** A session that adds
a brand-new `.ts` file and changes nothing else gets `0`, and the gate exits
without running a single test. Found by a peer session; I confirmed it by reading
the hook.

The obvious fix — `git status --porcelain` — **is not sufficient, and this is the
part worth getting right.** By default git collapses an untracked *directory* into
one entry: the peer's own output read `?? app/test/zzbuildprobe/`, which does not
end in `.ts`, so the grep cannot match it and a whole new directory of code still
skips the gate. It needs `git status --porcelain -uall`, which lists the files
inside. *(That last step is reasoned from the peer's quoted output and git's
documented behaviour, not re-run here — the directory was committed before I could
reproduce it, and creating one would have voided the measurement then running.)*

**Acceptance:** add one new `.ts` file, nothing else, and watch the gate run the
suite. Then add a new directory containing one `.ts` file and watch it run again.
Both cases, or the fix is half of it.

### M5 — The missing half: the database suite covers the database *(1 week)*

This is the "missing ones written" half of vision item 13, and it is the one piece
here that adds tests rather than removing them.

- Add the **29 live tables absent from the mirror** — 18 `timetrack_*`, the two
  vice tables, `error_reports`, `life_chapters`, and the five health logging
  tables — with their policies.
- Extend `schemaMirror.test.ts` so an **absent table fails** instead of being
  filtered out of rule 1. Today a missing table makes the guard silent, which is
  how 29 of them accumulated.

**Acceptance:** a policy added to a migration and not to the mirror turns the suite
red the same day — **proved by planting one and watching it fail**, not by reading
the code. Same for a new table.

**Do this before M2 if you only do one.** M2 makes a suite with a 29-table hole
run fast; M5 makes it tell the truth. Fast and wrong is the worse of the two.

### M6 — It cannot silently get slow again *(1 day)*

A duration ratchet, the same bargain as the lint and type ratchets this repo
already runs: `docs/testing/bench/baseline.json` holds wall time per suite, CI
fails above it, and the number may only fall. Per `.claude/rules/testing.md`:
the check is not "does the ratchet pass", it is "does it still pass one lower" —
so prove it by lowering it one and watching it fail.

## Manual blockers — all six attempted

**B1 · Permission to create and delete accounts in the live Supabase project.**
M3's whole mechanism.
*Attempted:* confirmed `SUPABASE_SERVICE_ROLE_KEY` is present locally (presence
checked as a boolean; the value was never printed). Confirmed the repo already
does exactly this, with your knowledge, in `tests/manual/timezoneCounters.test.ts`.
I did **not** create an account: `CLAUDE.md` and `.claude/hooks/never.py` require
asking first about auth.
*Status:* **blocked on your yes; mechanism proven to already exist here.**
*Recommendation:* yes. Name them `e2e-w<N>-<runid>@…` and add a sweeper that
deletes any older than 24 hours, so a crashed run cannot leave litter.

**B2 · A clean four-hour browser baseline.**
*Attempted:* not run, deliberately. Four peer sessions are live in this checkout;
one ran the database suite concurrently with mine and contaminated that number.
`memory/e2e-runs-need-a-frozen-src` requires a frozen `src/` and an exclusive
:3000, and I can guarantee neither.
*Status:* **not possible from here today.**
*Recommendation:* do not spend the four hours on a "before". It already exists —
179 real CI runs, recorded in `e2e.yml`. Spend it once, after M3, on the "after".

**B3 · GitHub runner size and secret inventory** (decides the worker count).
*Attempted:* `gh` is **not installed** on this machine, so I could read neither
the runner spec nor `gh secret list`.
*Status:* **attempted, blocked by a missing tool.**
*Recommendation:* I believe `ubuntu-latest` is 4 vCPU / 16 GB for public repos and
2 vCPU / 7 GB for free private ones, **and I could not verify which this repo is —
treat that as belief, not fact.** Do not guess it: add `run: nproc && free -g` as
the first step of the browser job, read it from one run's log, and set `workers`
from that. One line, one run, and the number is known.

**B4 · A local Supabase stack**, which would remove the live database entirely.
*Attempted:* the `supabase` CLI **is** installed (2.75.0) — but there is **no
`supabase/config.toml`**, so `supabase start` has nothing to start, and
`schema.sql` cannot load into a real Supabase stack because it deliberately stubs
`auth.uid()` and points user links at `profiles` rather than `auth.users`.
*Status:* **attempted, and deliberately not pursued.**
*Recommendation:* do not build it. The platform is moving to Hetzner and plain
Postgres (vision item 36; `memory/leave-vercel-supabase-decision`, settled, not
to be reopened). Investment belongs in the plain-Postgres container M2 already
uses, which is the thing that survives the move.

**B5 · Running a suite solo, so a measurement means something.**
*Attempted:* messaged `daygame-coach-31` about the overlapping database runs.
Sent and queued.
*Status:* **partially solved.** Coordination works and is not enforceable.
*Recommendation:* M0's lock. Make it mechanical instead of social.

**B6 · The mirror gap's real size.**
*Attempted:* counted it myself rather than trusting the docstring that claims it.
`grep -c` on `tests/integration/schema.sql`: 52 tables, 20 policies, **zero**
mentions of timetrack, against 66 tables and 51 policies in `supabase/migrations/`.
*Status:* **done — claim verified, and it is real.**

## Open questions — ten, each decided

You said you are not assisting further, so each carries my recommendation **and
the decision I have taken**. Overrule any of them.

| # | Question | Decision, and why |
|---|---|---|
| Q1 | Browser tests against the live project, or an ephemeral database? | **Live project, per-worker ephemeral ACCOUNTS.** The data layer has no seam to point at a container: 25 of the 47 files in `src/db/` build a Supabase client themselves (my count today), and `own-platform-and-app.md` M0.4 records that they speak HTTP and are bound to Next's request context. Building that seam is Q-SEAM / Q-HARNESS's job and belongs to the platform plan. Accounts need no seam and no new infrastructure. **This also answers the orphan at `own-platform-and-app.md:1689`** — *"the suite has nowhere to run… needs an owner before M3"* — for the pre-port period: accounts, not a database. |
| Q2 | How many CI workers? | **4 in CI, 8 locally.** 4 vCPU runners. Corrected from M0's numbers, never from a guess. |
| Q3 | Keep the five-engine matrix? | **Chromium + WebKit + one phone viewport on PRs; Firefox nightly only.** Duplication 1.81 → ~1.3. *Cost: a Firefox-only regression ships and the nightly catches it a day late.* Justification: WebKit and iPhone found four real hydration failures (recorded in `e2e.yml`); nothing here records Firefox finding anything. |
| Q4 | Database isolation: transaction rollback, or database per worker? | **Database per worker.** Rollback is faster but breaks `asUser()`, which opens a second connection — and `asUser()` is the only thing that exercises row security at all. Breaking it would turn every denial test green while proving nothing. *Cost: a few hundred ms per worker at startup.* |
| Q5 | Keep `retries: 2`? | **Drop to 1, add a quarantine list.** Three runs per failure on a permanently-red suite is a large share of the 3 h 45 m, and retries hide flakes rather than fix them. |
| Q6 | Where does deletion stop on schema tests? | **D1 reaps "the enum accepts its own members" and nothing else.** It does not touch a bound, a refine, a transform, a default, a coercion, or a message a caller branches on — **and before reaping any enum, check `enumConstraintSync.integration.test.ts`**, because that test links a Zod enum to a database CHECK constraint and may be the only thing holding them in step. |
| Q7 | The four chained training projects? | **Collapse to one project at `workers: 4`** on per-worker accounts. The chain exists because they share one account and each wipes it. Keep sequencing *inside* a file only where that file's tests genuinely sequence. |
| Q8 | The three `sweep-*` projects (3 engines × 56)? | **Desktop sweep on every push** — it is the fast job and it earns its minutes. **Phone and WebKit sweeps to nightly.** |
| Q9 | Keep the 25.9 s property sweep? | **Keep it, seed it, split it.** It caught a real eleven-year bug. But 28 tests run thousands of cases, so a failure does not name the case. *Not a speed decision — removing it saved nothing (measured).* |
| Q10 | What about `vitest.manual.config.ts`? | **Keep it and wire it into the nightly.** A suite that runs only when somebody remembers is a suite that does not run. |

---

# THE EXECUTION HALF

## The seven deletion reasons (R2's fixed list)

Every removal cites one. The id goes in the commit message.

**D1 · Restates a declaration.** The assertion is already guaranteed by the type
or by the literal it reads. Canonical: `z.enum([...]).safeParse('<a member>')`
expecting success.
*Found:* 262 tests — `tracking/schemas.test.ts` (101), `articles/schemas.test.ts`
(53), `inner-game/schemas.test.ts` (45), `qa/schemas.test.ts` (34),
`db/goalSchemas.test.ts` (29).
*Not D1:* bounds, refines, transforms, defaults, coercions, branched-on messages,
or an enum mirrored by a database CHECK (see Q6).

**D2 · Asserts its own fixture.** The test builds a value and asserts a property
of the value it just built, with no production function between. This repo's own
`docs/testing_behavior.md` §5 names it.

**D3 · Weak-only.** Every assertion is `toBeDefined` / `toBeTruthy` /
`not.toBeNull` on something that cannot be absent.
*Found:* 22 files where weak assertions are ≥40 % of all; 7 at ≥80 %, worst
`programs/receiptBody.test.tsx` at 24 of 27 and `programs/restSurvivesReload.test.tsx`
at 7 of 7.

**D4 · Tautology.** Compares an expression with itself, or holds as `0 === 0`.
Detector exists: `scripts/tests-must-fail-without-the-fix.mjs`. Run it per batch.

**D5 · Duplicate.** Its failure set is a subset of another test's. For browser
tests: the same assertion on a 2nd–5th engine with no engine-specific risk.
*Found:* 1,196 runs of 660 distinct tests.

**D6 · Passes without running.** A conditional skip or silent return that makes
absent coverage look like coverage.
*Found:* 46 sites.

**D7 · Brittle, without being about the brittleness.** A sleep standing in for a
condition.
*Found:* 136 `waitForTimeout` calls, 170 s per pass;
`timetrack-sync.spec.ts` alone sleeps 54.4 s.

**The counter-rule.** A test that is the only cover for a write path in
`tests/support/writeCoverage.baseline.json` is never deleted before its
replacement is written and green.

## Files and exact changes

**M0** — new `scripts/bench-tests.mjs`; new `docs/testing/bench/`. The lock reads
the process table for `vitest`, `playwright` and `postgres:15-alpine` containers
in this checkout, the way the contamination was found today.

**M1** — `tests/unit/tracking/schemas.test.ts`, `tests/unit/articles/schemas.test.ts`,
`tests/unit/inner-game/schemas.test.ts`, `tests/unit/qa/schemas.test.ts`,
`tests/unit/db/goalSchemas.test.ts`, plus the 22 D3 files. Do **not** touch
`tests/unit/architecture*.test.ts` or the nine other rule-enforcing tests that
read files from disk — they look like "no production import" to a scanner and are
the most valuable tests in the repo. *(A scanner flagged 65 files as importing
nothing from `src/`; sampling found `db/workoutRepoFinish.test.ts` imports through
`vi.doMock` and is a genuine idempotency test. The scanner is a shortlist, never a
verdict.)*

**M2** — `tests/integration/setup.ts` (template database, pooled client,
catalog-derived truncate), `vitest.integration.config.ts`
(`fileParallelism: true`, `poolOptions`), `tests/integration/globalSetup.ts`.

**M3** — `playwright.config.ts` (the 44 projects; `workers`; `retries`), a new
`tests/e2e/fixtures/workerAccount.ts`, `tests/e2e/auth.setup.ts`,
`tests/e2e/fixtures/test-user.ts`, `.github/workflows/e2e.yml`.

**M4** — the 20 spec files holding `waitForTimeout`; `error-handling.spec.ts`,
`qa-chat.spec.ts`, `security-rls.spec.ts`, `security-idor.spec.ts`,
`vision-plan.spec.ts` for D6; a new assertion in `tests/unit/architecture.test.ts`
for the two new checks.

**M5** — `tests/integration/schema.sql`, `tests/unit/db/schemaMirror.test.ts`.

**M6** — `scripts/bench-ratchet.mjs`, `docs/testing/bench/baseline.json`,
`.github/workflows/ci.yml`.

## One dead gate to settle while passing

`docs/testing_behavior.md:150` says *"The test script (`scripts/run-tests.sh`)
must: run ALL tests… be updated whenever new test types are added."* The script
exists. **It is referenced by nothing** — not `package.json`, not either husky
hook, not either workflow. The only thing in the repo that mentions it is the doc
declaring it mandatory.

So a document tells the next person a gate exists that does not run. Either wire
it or delete it and the paragraph with it. **Recommendation: delete both.**
`npm run ci` already chains the real gates, and a second entry point that drifts
is worse than none. (This is the repo's own "is any control dead without a reason
beside it" check, applied to the test harness itself.)

## Ordering constraints

- M0 before any claim of improvement in M1b, M2, M3 or M6. Today's lesson.
- M1, M1b and M2 are independent; any order.
- **M1b is the cheapest thing here** — one day, a measured 2×, deletes nothing.
  If you want one phase done this week, it is that one.
- **M5 before M2** if only one gets done — see M5's last line.
- M3 needs B1 answered. Nothing else does.
- M4a is independent and takes an hour.
- M6 last — it ratchets whatever the others achieved.

## What I verified today, and what I am inferring

Separated deliberately, because the repo's checklist demands it.

**Measured here, today, in a clean solo window:** the unit suite's 56.1 s / 6,628
tests / 1506 % CPU; 44.2 s without the property sweep; 13.1 s versus 25.5 s for
292 non-DOM files under Node versus jsdom (five runs, alternated); the browser
suite's 1,196 invocations over 84 files and 44 projects and its 1.81 duplication
factor; 147 `waitForTimeout` sites summing to 170 s; 46 conditional-skip sites;
the 29 live tables absent from the schema mirror; 24 policies in the mirror; 249
`getClient()` call sites; 45 `beforeEach` truncates; 292 of 311 `.test.ts` files
touching no DOM; all nine test credentials present; `supabase` CLI 2.75.0
installed with no `config.toml`; `gh` absent; `run-tests.sh` wired to nothing;
the untracked-file hole at `check-test-results.sh:27`.

**Measured, but in a contended window and therefore only an upper bound:** the
database suite's 374 s. A third session's Postgres container overlapped it. Its
**21.5 s of CPU** is the load-bearing figure and is not inflated by contention —
a busy machine does not reduce the CPU a process consumed.

**Taken from the repo's own records, not re-measured:** the 3 h 45 m browser
baseline and the +90 minutes for training (`e2e.yml`, from 179 runs); that
`goals-1` was red when `goals-4`'s comment was written; that the local dev-server
contention is not fixed by per-worker accounts
(`memory/e2e-runs-need-a-frozen-src`).

**Inference, not fact:** that M3 reaches roughly a quarter of 3 h 45 m at four
workers; that M2 reaches under 60 s; that M1b's two wins combine to about 30 s
(they overlap — the property file is inside the 292); that `ubuntu-latest` is
4 vCPU; that the `-uall` refinement in M4a is needed (reasoned from git's
documented behaviour and a peer's quoted output, not reproduced). Each has its
check named above. **None of them has been run.**

**The doubt that belongs in the first line:** M3 is the only phase that touches the
four hours, it is the only one needing a permission I do not have, and it is the
one whose mechanism I could not exercise from here. If one thing in this plan
fails, it is that.

## What this plan does not do

- It does not point the browser suite at a container database. That is Q-SEAM and
  Q-HARNESS in `docs/plans/own-platform-and-app.md`, and it belongs there.
- It does not touch `supabase/migrations/`.
- It does not add a local Supabase stack (B4).
- It does not claim any deletion made anything faster. The unit suite's 2× comes
  from M1b's configuration change; M1's deletions are argued on worth alone (R1).

---

## The execution prompt

Paste after `/goal`. Kept here so it survives the session that wrote it.

> Execute `docs/plans/tests-worth-their-keep.md` end to end, every phase, no
> per-phase approval. Read the plan first, then `docs/known-failures.md`,
> `.claude/rules/testing.md` and `docs/testing_behavior.md`.
>
> **Order:** M0 first and alone — nothing later may claim an improvement without
> it. Then M1b (one day, a measured 2×, deletes nothing), M4a (one hour), M5, M1,
> M2, M3, M6 last.
>
> **The one rule that governs the whole job:** no number from this checkout is
> valid unless one session is working in it. Four sessions share this tree. Two of
> this plan's conclusions were written backwards because a peer was running the
> unit suite through my measurement window. Before every timing claim, check
> `ps` for a peer vitest/Playwright/testcontainers Postgres, and check that
> nothing under `tests/` or `src/` moved while you ran. That is M0's job — build
> it before you need it, not after.
>
> **Deleting tests:** only on a written reason from the D1–D7 list in the plan,
> with the rule id in the commit message. Never by heuristic. The scan that found
> 65 files "importing nothing from src/" was wrong on the first one I checked —
> `db/workoutRepoFinish.test.ts` imports through `vi.doMock` and is a real
> idempotency test. A scanner gives you a shortlist, never a verdict. Never delete
> the only cover for a write path in `tests/support/writeCoverage.baseline.json`
> before its replacement is green.
>
> **Every parallelism claim is proved by a run that goes RED when the isolation is
> removed.** A green parallel suite is not evidence. This applies to M2's
> per-worker databases and M3's per-worker accounts, and both acceptance criteria
> say so.
>
> **M3 needs the owner's yes** (creating and deleting accounts in the live
> Supabase project — blocker B1 in the plan). They said they would not be
> available, so: do everything in M3 that does not touch live auth — the fixture,
> the per-worker storage state, the chain removal, the worker count, the retry
> change, the production-build-per-port for local runs — and leave the account
> creation behind one flag, defaulted off, with the one command the owner runs to
> turn it on. Do not create auth accounts without that yes. Report it as the one
> thing outstanding.
>
> **Do not** touch `supabase/migrations/`, add a local Supabase stack, or reopen
> the Hetzner decision. **Do not** re-litigate the 3h45m browser baseline by
> running it — it is recorded from 179 CI runs in `e2e.yml`. Spend that time once,
> after M3, on the after-number.
>
> Commit each phase separately with its measured before/after. Run `npm run ci`
> before saying a phase is done. If a phase's measured result contradicts the
> plan, say so in the reply and fix the plan — the plan has been wrong twice
> already and both times the measurement was right.
