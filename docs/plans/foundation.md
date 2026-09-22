# The foundation — plan

**Status:** drafted 2026-09-18. The decision underneath it was argued over 2026-09-11 → 17,
attacked by an adversarial pass on 2026-09-17, and the attack's findings are folded in below
(every one of its verified claims changed something). **Not approved. Nothing here has run.**

**What this plan is for.** The owner assesses the product at 5–15% built and wants the
foundation that the remaining 85–95% can stand on. Time and effort are not constraints; the
best long-term outcome is. The owner is not yet a programmer and intends to become one, so
every milestone says what concept it teaches and how you would know, yourself, if it broke.

---

## In plain words

**Where you are.** The app's logic is well separated from its infrastructure — nothing outside
one folder imports the database library, and a test fails the build if that changes. That one
discipline is the reason the rest of this plan is measured in weeks rather than months. But
the foundation under that logic has six faults, and three of them get more expensive every
week you build on them:

1. **Your database cannot be rebuilt from your code.** The code reads and writes 58 tables.
   **21 of them are created nowhere in the repository** — `sessions`, `approaches`,
   `user_goals`, `field_reports`, `reviews`, `purchases`, and fifteen more. They exist only on
   Supabase's servers. If that project vanished tonight, nobody could reconstruct the shape of
   your data. Of the 212 access rules protecting those tables, the repository accounts for
   roughly a third. There is also a third, hand-written copy of the schema for tests that
   somebody keeps in sync by hand.
2. **Development, testing and production share one database.** The browser test suite signs
   in as real users against the same database production uses.
3. **Database changes are applied by hand; code deploys itself.** Nothing checks that the two
   agree. (As of 2026-09-18 they do — every migration through 17 September is applied — but
   nothing would tell you if that stopped being true.)
4. **The database is on the public internet, and the key that opens it is in every visitor's
   browser by design.** The 212 rules are the entire wall. Every new table is a fresh chance
   to leave a gap, and the audit that checks for gaps is run by hand.
5. **Every user-data table is wired directly to Supabase's own user table.** Leaving Supabase
   Auth later means rewiring all of them under live data. Today there are no users.
6. **The wall around the database is narrower than it looks.** The test bans *importing* the
   library outside `src/db/`; it does not ban *querying*. Eight files outside the wall build
   queries, one at the repository root imports the library directly, nine scripts do too, and
   fifty files ask Supabase "who is logged in?" without going through the one function that
   should own that question.

**What this plan does.** Eight milestones. The first five are required on any platform and do
not depend on whether you leave Supabase — so the platform decision (M5) is made *after* they
are done, with your friend, against a written filter, rather than now under pressure. M6 and M7
are the move itself, if M5 says go.

## The five rules this plan follows — approval is of these

Per `.claude/rules/plans.md`: the owner approves rules and costs, never counts. Each rule
below says what it costs if it is wrong. A later change that leaves these five intact gets
one line in a reply; a change to one of them gets one question.

1. **The repository holds exactly one description of the shape of the data, and every
   database — test, staging, production — is derived from it, never edited by hand.**
   *If wrong:* three copies drift, nobody knows which is right, and the database becomes
   unrecoverable from the code. That is the state today.

2. **The boundary around the database is a test, not a folder.** Nothing outside `src/db/`
   may query or ask who is logged in, every query on user data is scoped to the signed-in
   user, and the build fails when a new file forgets. *If wrong:* the wall is decorative,
   the platform move is not mechanical, and one scoping mistake in 250 call sites leaks one
   user's data to another with nothing to catch it.

3. **Prove before you move.** Every milestone is verified by a test that exists before the
   code changes, on a type-checker that is switched on, in an environment that is not
   production. *If wrong:* a rewrite of 23 files that cannot be type-checked or tested is a
   rewrite you cannot trust, and you find out from users.

4. **The platform is chosen after the platform-independent work, against written
   requirements, with the expert, and the reasoning is recorded.** *If wrong:* the decision
   is made under pressure from a summary of an hour-long conversation nobody can reconstruct,
   and in six months nobody can say why.

5. **Data moves before login.** *If wrong:* the riskiest, most-trusted component — the one
   with sixty lines of hard-won cookie fixes and an email dependency that does not exist
   yet — is replaced first, without the tests and the sender that make it safe.

**What you will be able to say, truthfully, at the end of each:**

| | You can say | Teaches |
|---|---|---|
| M0 | "My database can be rebuilt from my repository, and a test proves it." | what a schema is; what a migration is; one representation of each fact |
| M1 | "Nothing outside one folder can touch the database or ask who is logged in, and a test proves it." | what a boundary is and why a test has to guard it |
| M2 | "My code has zero type errors, the build refuses to ship if that changes, and nothing I ship has a known critical vulnerability." | what you are shipping that you did not write |
| M3 | "There is a staging copy. Nothing tests against production." | what an environment is; what a secret is |
| M4 | "A database change deploys with the code, or the deploy stops." | why the code and the database must agree; what a pipeline is for |
| M5 | "The platform was chosen against five written requirements, with him, and the reasoning is recorded." | how to make a decision you can defend later |
| M6 | "My data lives in a database nobody can reach from the internet." | private networks; what an ORM is; why the 1,000-row cap was never a database limit |
| M7 | "Login is mine. Users live in my database." | sessions, cookies, why auth is the riskiest thing to replace |

---

## What this plan asks permission to do — named here so nothing is silent

- **Deletions (code and files, none of them your data):**
  - The 44 migration files under `supabase/migrations/`, replaced by one baseline (M0). They
    stay in git history, which `CLAUDE.md` already names as the pattern.
  - `tests/integration/schema.sql`, the hand-written third copy (M0).
  - `app/api/test/**` and `app/api/exercising/**` and `src/exercising/` — live in production,
    unauthenticated or writing to a single shared Google Sheet (M1).
  - `src/db/paging.ts` and the unpaged-read ledger in the architecture test (M6 — the cap
    they exist for is a Supabase REST limit, not a Postgres one).
- **One write to the live database's bookkeeping table** (M0, gated): telling Supabase's
  migration tracker that the 44 old versions are retired and the baseline is applied. This
  touches a metadata table only. No row of yours is read, changed or deleted.
- **Dependencies:** `next` 16.0.10 → 16.3.5 (two critical advisories against the installed
  version); pin `@supabase/supabase-js` to the installed version instead of `"latest"`;
  `npm audit` added to CI (M2).
- **Build config:** `ignoreBuildErrors: true` removed from `next.config.mjs` once the type
  ratchet reaches zero (M2).
- **`CLAUDE.md`:** one addition, folded into the four-rules restructure another session is
  mid-way through (see the last section). Not added by this plan directly.
- **New Supabase project** for staging, created by you in their dashboard (M3).

Any single item can be vetoed before its milestone runs — say which, and that step is struck.

---

## The filter for the platform decision (M5)

The eight-property list from the conversation was tested against the code by the adversarial
pass. Five held as requirements. Two turned out to be preferences: nothing in `src/` or `app/`
runs server-side background work (every timer is in the browser), and the one job that looks
like it wants a scheduler — the goal-period rollover — is better fixed by a single guarded
database statement than by cron. Serverless is therefore not disqualified by evidence.

| | Requirement | Held by the code? |
|---|---|---|
| R1 | Database on a private network, reachable only from the app server | **No** — public, behind 212 rules |
| R2 | All data access through app code; rules written once, in one place | Half — code does it; rules exist alongside |
| R3 | Schema changes travel with the code, applied by the pipeline, drift detected | **No** |
| R4 | Separate staging and production of the same shape | **No** — one database |
| R5 | Nothing that opens the database is ever in a browser | **No** — anon key in every browser |
| P1 | A persistent server process (state, long connections) | preference — nothing requires it |
| P2 | First-class scheduler / queue | preference — nothing requires it today |

Candidates that pass R1–R5 include Railway, Fly.io, Render (app + private Postgres on one
platform) **and** Vercel for the app with a private Postgres elsewhere (Neon, RDS). Which one
is M5's job, with him. The question to put to him: *"is there a reason we need a persistent
server that the code doesn't show?"* — because that is the one claim of his the code did not
support, and he may know something the code cannot.

---

## Milestones

Each milestone: what changes → why → what you'll see → acceptance test → gated steps → then
the AI section with paths. Executed end to end once approved; no per-milestone checkpoints,
per `.claude/rules/plans.md`.

### M0 — The database can be rebuilt from the repository

**What changes.** One file, `supabase/migrations/00000000000000_baseline.sql`, becomes the
single description of your database: every table, rule, function, trigger and index, as they
exist live. The 44 incremental files retire to git history. The hand-written test copy is
deleted. The integration tests load the real baseline into a real Postgres container and a
new test asserts the container matches production.

**Why this shape and not another.** Every migration tool that adopts an existing database —
Prisma, Drizzle, Flyway — does the same thing: the baseline is the current state, squashed;
history before adoption stays in version control. The alternative (reconstruct a "true
January baseline" by subtracting 44 migrations' worth of changes) is fragile, cannot be
verified except by the same diff this plan runs anyway, and is thrown away at M6 when the
schema is introspected into the new tool. The 44 files' comments — which are genuinely good —
are one `git log -- supabase/migrations/` away, and a README in the folder says so.

**What you'll see.** `ls supabase/migrations/` → one file. `npm run test:integration` → a
test named *"the baseline rebuilds production"* passes. `supabase migration list --linked`
→ one row.

**Acceptance test.** `tests/integration/db/rebuild.integration.test.ts`: starts a fresh
container, loads the shim + baseline, then (a) asserts the counts recorded from the live dump
on 2026-09-18 — 58 tables, 212 policies, 17 functions, 31 triggers, 80 indexes, 3 enums —
and (b) `pg_dump`s the container, normalises both dumps (owner lines, comment ordering,
`SET` preambles), and asserts the diff is empty. (a) is the cheap always-on guard; (b) is the
proof.

**Gated step — one write to the live bookkeeping table.** After the baseline is proven,
`supabase migration repair --status reverted <44 versions>` and
`--status applied 00000000000000`. Metadata only. **Does not run without an explicit yes.**

**Sequencing constraint.** The `training-rebuild` branch is still adding migrations (two
landed on 17 September). M0 starts *after* it merges, and begins by re-dumping — the dump
taken on 2026-09-18 (`~/.cache/daygame-coach/live-schema-2026-09-18.sql`, 4,679 lines,
sha256 `db079cd00080fdf9…`) is the rehearsal copy, not the one that ships.

**Who owns what in this checkout (from the sessions themselves, 2026-09-18).** Four Claude
sessions share the working tree. Any milestone that touches a file below waits for, or
coordinates with, its owner:

| Session | Owns | Doing |
|---|---|---|
| `daygame-coach-cc` | `src/db/{workoutRepo,programRepo,healthRepo}.ts`, `src/programs/**`, `src/health/**`, `app/api/programs/**`, `app/api/workouts/**`, both `20260917*` migrations | executing `training-three-doors.md`: Phase 0 landed (`d125b64d`), Phase 1 of 11 in flight |
| `daygame-coach-0f` | `docs/product/`, `tests/unit/docs/`, `docs/plans/life-mastery-deployment.md`, its two rule-file appends | Life Mastery deployment (approved, not built); has adapted its plan so that if M0 lands first, its tables go in by migration only |
| `daygame-coach-80` (unverified, by elimination) | `.claude/rules/*`, the 224-line `CLAUDE.md` rewrite | rules restructure |
| this session | `docs/plans/foundation.md` only | this plan |

Consequences: **M1** must not move the `auth.getUser` calls or scoping in `-cc`'s three
repos until its phases release them; **M6** cannot rewrite those three repos at all while
`training-three-doors` is in flight (it is 11 phases); **M2** touches `package.json`,
`next.config.mjs` and `ci.yml` — `ci.yml` was edited by another session this morning, so
that edit is coordinated first; **M3** changes `.env.local`, which every running session's
dev server reads — it is done at an agreed moment, not silently. Merge timing for
`training-rebuild` is the owner's decision alone.

**What can start before `training-rebuild` merges, if the owner wants progress meanwhile:**
M2's dependency and type work (nothing `-cc` owns, except that `ci.yml` needs one message
first) and M3's staging project creation (the dashboard part, not the `.env.local` switch).
M0, M1's repo moves, and M6 wait.

**Teaches.** A *schema* is the shape of your data — which tables, which columns, which rules.
A *migration* is a dated file that changes that shape. "One representation of each fact"
means the repository holds exactly one description of the shape, and everything else — the
test database, staging, production — is derived from it, never edited by hand.

<details><summary>AI section — M0</summary>

- Re-dump: `supabase db dump --linked --schema public -f supabase/migrations/00000000000000_baseline.sql`.
  The CLI needs no DB password (verified 2026-09-18: `Initialising login role… Dumped`).
- Strip `OWNER TO "postgres"` lines and the `pg_database_owner` grant; keep every `GRANT … TO
  "anon" | "authenticated" | "service_role"` — they are part of the wall until M6/M7.
- Shim for plain Postgres, `tests/integration/supabase-shim.sql`, loaded before the baseline:
  `CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pgcrypto;`
  `CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;`
  `CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid primary key, email text, raw_user_meta_data jsonb, created_at timestamptz default now());`
  and the `auth.uid()` stub currently at `tests/integration/schema.sql:535-538` (reads
  `current_setting('test.uid', true)`). Verified: no function or trigger in the dump calls
  `auth.uid()` — only policies do — so the stub is sufficient.
- Container image `postgres:15-alpine` → `pgvector/pgvector:pg16` in `tests/integration/setup.ts:39`
  (the dump references `"public"."vector"` in `match_embeddings`). Loader at `setup.ts:60-61`
  reads shim then baseline instead of `schema.sql`.
- Delete `tests/integration/schema.sql`. Grep for anything else that reads it first.
- `supabase/migrations/README.md`: "Baseline squashed 2026-09-xx from production. The 44
  incremental files it replaced: `git log --diff-filter=D -- supabase/migrations/`."
- The repair command: verify with `supabase migration list --linked` before and after; paste
  both into the PR.
- Coordinate: the session on `training-rebuild` edited `tests/integration/schema.sql` on
  2026-09-18. Tell it, via SendMessage, that M0 deletes that file, before M0 starts.

</details>

### M1 — Nothing outside the wall can touch the database or ask who is logged in

**What changes.** The architecture test gains three rules and the code is brought into line
with them: no query building outside `src/db/`; no "who is logged in?" outside
`src/db/auth.ts`; every query on a user-data table filters by the signed-in user. The eight
outside files, the root `proxy.ts`, the nine scripts and the fifty direct login checks are
moved behind the wall. Two sets of production routes that never belonged there are deleted.

**Why first, before any move.** This is what makes M6 mechanical: when the wall is real, the
move is "rewrite what is inside it". It is also what makes the keep-or-delete-rules decision
safe either way — today several inserts trust the database to reject a forged user id, and two
places trust an unverified login cookie *because* the rules backstop them. After M1, the app
scopes every query itself and a test fails when a new one forgets.

**What you'll see.** `npm test` → the architecture test lists zero exceptions for the three
new rules. `/api/exercising/*` and `/api/test/*` → 404 in production.

**Acceptance test.** `tests/unit/architecture.test.ts`: the three new `describe` blocks pass
with empty allowlists. Plus an integration test that inserts a row through each repo write
path with a *different* user id in the payload than the signed-in one, and asserts rejection.

**Teaches.** A *boundary* is only real if something fails when it is crossed. The test is the
boundary; the folder is just where the code happens to live.

<details><summary>AI section — M1</summary>

- Outside-the-wall queries (verified 2026-09-18): `app/dashboard/qa/page.tsx`,
  `app/dashboard/inner-game/page.tsx`, `app/dashboard/articles/page.tsx`,
  `app/preferences/archetypes/page.tsx`, `app/test/archive/goals-hub/page.tsx`,
  `src/scenarios/components/ScenariosPage.tsx:68,78` (queries `profiles`),
  `src/api_ai/apiAiService.ts`, `src/api_ai/apiAiRepo.ts` (move to `src/db/apiAiRepo.ts`),
  `proxy.ts:1` (`@supabase/ssr`). Scripts: `scripts/dev/seed-training-year.ts`,
  `scripts/training-data/{10.EXT.ingest,00.EXT.reset-embeddings,11.EXT.retrieval-smoke}.ts`,
  `scripts/repair-counters.ts`, `scripts/tracking/audit-achievements.ts`, `scripts/seed_values.ts`,
  `scripts/audit-rls.ts` — scripts may keep a *server* client but must import it from `src/db/`.
- Direct `auth.getUser`: 50 files outside `src/db/` (`grep -rln "auth\.getUser" src app | grep -v ^src/db/`).
  Route through `requireAuth()` / `requirePremium()` (`src/db/auth.ts`, 74 lines).
- The user-scoping rule: for each `.from("<table>")` where `<table>` has a `user_id` column,
  the same builder chain must contain `.eq("user_id",` or be under `createAdminSupabaseClient()`
  with a comment naming why. Ratchet: record today's count, only goes down, target 0 except
  the four admin-only repos (`embeddingsRepo`, `planSnapshotRepo`, `errorReportRepo`,
  `timetrackBackupRepo`).
- Extend the test's scan to include `proxy.ts` and `scripts/`.
- Delete: `app/api/test/**`, `app/api/exercising/**`, `src/exercising/**`,
  `app/test/exercising/`. Grep for importers first.
- Fix while here: `app/api/goals/tree/route.ts:16` swallows a failed `syncLinkedGoals`;
  `src/db/goalRepo.ts:376` swallows a failed streak backfill; `goalRepo.ts:794` never reads
  its `error`. Each becomes a thrown error. And `resetGoalsForPeriods` (`goalRepo.ts:794`)
  gains the same period guard `rollTrackingCounters` has (`trackingRepo.ts:1166-1171`), with
  a regression test that runs two rolls concurrently.

</details>

### M2 — Zero type errors, verified builds, no known-critical dependencies

**What changes.** The type-error count goes from 102 to 0 and `ignoreBuildErrors` is removed,
so a production build that does not type-check does not ship. `next` moves to 16.3.5.
`@supabase/supabase-js` is pinned. `npm audit --omit=dev` runs in CI and fails on high or
critical.

**Why before M6.** A rewrite of 23 database files cannot be verified by a type-checker that is
switched off. The adversarial pass called this out as a sequencing error and it was right.

**What you'll see.** `npx tsc --noEmit` prints nothing. `npm audit --omit=dev` → 0 high, 0
critical. `git diff next.config.mjs` shows the `typescript:` block gone.

**Acceptance test.** CI's type-ratchet step replaced by a plain `tsc --noEmit` that must exit
0; `tsc-baseline.json` deleted. `npm audit --omit=dev --audit-level=high` as a CI step.

**Teaches.** Everything under `node_modules/` is code you ship without having read. `npm
audit` is the list of what is known to be wrong with it today.

<details><summary>AI section — M2</summary>

- 102 errors, 41 in `src/`+`app/`, most under `app/test/*`. Delete the labs that memory does
  not list as live (`app/test/goalsv2..v11`, `tour-variants`, `goal-scorecard` — check each
  against `MEMORY.md` first); fix the rest. Real ones to fix, not delete:
  `src/db/goalRepo.ts:376,1218`, `src/goals/components/{MilestoneCompleteDialog,WeeklyReviewDialog}.tsx`
  (missing `iron`, `mythic` tiers), `GoalIntake.tsx:32`, `GoalsStepTour.tsx:535,585`.
- `npm audit fix` (not `--force`); verify `next` lands on 16.3.5 and `npm test` + e2e stay green.
- `"@supabase/supabase-js": "latest"` → the version in `node_modules/@supabase/supabase-js/package.json`.
- `.github/workflows/ci.yml`: add the audit step; `on.push.branches` → all branches (today
  only `main`, `beta` — the branch being worked on gets no CI).

</details>

### M3 — A staging environment; nothing tests against production

**What changes.** A second Supabase project. CI, local development and the e2e suite point at
it. Production keys exist only in Vercel's settings. The RLS audit runs in CI against staging.

**What you'll see.** The e2e workflow's secrets name the staging project. `.env.local` names
the staging project. `audit-rls` appears as a green CI step.

**Acceptance test.** A CI job that reads `NEXT_PUBLIC_SUPABASE_URL` and fails if it equals
the production project ref (recorded once, as a constant, in the workflow).

**Gated step — you create the project.** In the Supabase dashboard: new project,
`daygame-coach-staging`, same region. Paste URL, anon key, service key, and a personal
access token (for the audit script) into GitHub secrets. I will walk you through each screen.

**Teaches.** An *environment* is a complete copy of the system with its own data and its own
secrets. A *secret* is a value that opens something; it lives in exactly one place per
environment and never in the repository.

<details><summary>AI section — M3</summary>

- `.github/workflows/e2e.yml` and `ci.yml`: secrets renamed `STAGING_*`; the production-ref
  guard as a first step.
- `scripts/audit-rls.ts`: read the token from `SUPABASE_ACCESS_TOKEN` env when
  `~/.supabase/access-token` is absent (it currently only reads the file: lines 84-90).
- Apply the M0 baseline to staging as its first migration; that is also the first real proof
  that the baseline stands up an empty project.

</details>

### M4 — A database change deploys with the code, or the deploy stops

**What changes.** On every pull request, CI applies the branch's migrations to staging and
runs the integration suite against the result. On merge to `main`, CI applies them to
production **before** Vercel deploys, and a drift check compares the live migration list to
the repository and fails on any mismatch. Humans stop running `db push`.

**Why.** This is the "D" in CI/CD that the repository currently lacks: the code has deployed
itself for months while the database waited for a person. It also resolves the contradiction
between `.claude/rules/database.md` ("apply it yourself with `db push --linked`") and the
shared-tree memory ("never `db push`") — the answer is *CI pushes; nobody else does*.

**What you'll see.** A PR that adds a migration shows "Applied to staging" in its checks. A
deliberately withheld migration turns the drift check red.

**Acceptance test.** The drift check itself, exercised once with a fake pending migration.

**Teaches.** A *pipeline* is the fixed sequence of checks between "I changed something" and
"users see it". The database step is the one that was missing.

<details><summary>AI section — M4</summary>

- `ci.yml`: `supabase link --project-ref $STAGING_REF && supabase db push` on PRs;
  `supabase migration list --linked` diffed against `ls supabase/migrations` as the drift step.
- A `deploy.yml` on `main`: link production → `db push` → trigger Vercel deploy hook (Vercel's
  auto-deploy on push is turned off so the order is enforced).
- `.claude/rules/database.md:13-15` rewritten: migrations are deliverables, CI applies them;
  locally you run them only against your own staging.

</details>

### M5 — The platform is chosen against the filter, with him, and recorded

**What changes.** A one-page decision record, `docs/decisions/platform.md`: the five
requirements, the candidates, how each scores, which one and why, his input verbatim. No
code.

**Why a written record.** So that in six months, when someone asks "why this platform?", the
answer is a page and not a memory of a conversation.

**Acceptance.** The record exists; he has read it and either signed off or his objection is
recorded in it.

**Teaches.** How to make a decision you can defend later: write the criteria before you look
at the options.

### M6 — Data lives in a database nobody can reach from the internet

**What changes.** A Postgres on the chosen platform, on a private network. The baseline is
introspected into the chosen tool (Drizzle recommended — closest to the SQL your migrations
are already written in). The 23 repository files are rewritten against it. `paging.ts` and the
51-read ledger are deleted — direct Postgres has no 1,000-row cap, so that entire class of
bug ceases to exist. The 212 rules are either ported (one `SET LOCAL` per request; the
pattern already exists in the test schema) or deleted now that M1 enforces scoping in code —
Q2 below. Login still goes through Supabase until M7; its user id is the key into the new
database.

**Why after M1–M4.** M1 made the boundary real; M2 made the rewrite verifiable; M3 gave it a
place to be tested; M4 gave it a way to deploy.

**What you'll see.** No `NEXT_PUBLIC_SUPABASE_*` variable is needed to load a page. The
platform's dashboard shows the database with no public address. `src/db/paging.ts` is gone.

**Acceptance test.** Unit, integration and e2e suites green against the new database.
`grep -rn "\.range(" src/db/` → nothing. A network test from outside the platform's private
network fails to connect.

**Teaches.** A private network is a room with no door to the street. An ORM is a translator
between your language and the database's. The 1,000-row cap was never a database limit — it
was Supabase's REST layer, and it is why two real data losses happened.

<details><summary>AI section — M6</summary>

- 23 files: `ls src/db/*Repo.ts`. ~250 builder call sites. Semantics to translate: `.single()`
  throws on 0 rows in supabase-js, returns undefined in SQL; `error` objects → thrown errors
  (M1 already converted the swallowed ones); `upsert onConflict` → `ON CONFLICT`.
- `handle_new_user()` trigger cannot fire across databases → profile creation moves into the
  signup path in app code (temporary until M7 removes Supabase Auth).
- `embeddings` (32,126 rows, vectors): `pg_dump --data-only -t embeddings` from the live
  project; target must have pgvector (Railway/Fly Postgres: yes; verify on the chosen one).
- Data copy at cutover: no users, so the owner's own rows only. `pg_dump --data-only` all
  tables; load; verify counts match.
- Delete `src/db/paging.ts`, the `UNPAGED_READS_ALLOWED` block in the architecture test, and
  every `readAllRows` call site (they become plain selects).

</details>

### M7 — Login is mine

**What changes.** An auth library (Better Auth or Auth.js — his call) with users and sessions
in your own database. An email sender (Resend recommended) for confirmation and reset, which
Supabase currently provides invisibly. The five login pages and four auth files rewritten.
`@supabase/*` removed from `package.json`. The Supabase project deleted (gated).

**Why last.** It is the riskiest piece: `src/db/supabase.ts:76-140` holds sixty lines of
hard-won fixes for cookie-timing bugs reproduced this month, and it is the one piece with an
external dependency (email) that does not exist yet. Doing data first means the login move is
gated by e2e specs (`auth.spec.ts`, `password-reset.spec.ts`, `auth-errors.spec.ts`,
`security-auth.spec.ts`) that already exist and already pass.

**What you'll see.** Sign up, confirm, log in, reset password — all working, with the email
arriving from your own sender. `grep -r "@supabase" package.json` → nothing.

**Acceptance test.** The four auth e2e specs, plus `security-multi-user`, green on all
browsers in the cross-browser job.

**Gated step — deleting the Supabase project.** Only after a full backup and one week of
production on the new stack.

**Teaches.** A *session* is how the server remembers who you are between requests; a
*cookie* is where the browser keeps the proof. Replacing auth is replacing the thing every
other feature trusts, which is why it goes last and behind tests that already exist.

<details><summary>AI section — M7</summary>

- Auth surface: `src/db/auth.ts` (74), `authCookies.ts` (59), `server.ts` (58),
  `supabase-client.ts` (15); pages `app/auth/{sign-up,login,forgot-password,reset-password,sign-up-success}`.
  Operations used (verified): `signUp`, `signInWithPassword`, `signOut`×2,
  `resetPasswordForEmail`, `exchangeCodeForSession`, `updateUser`, `getSession`,
  `admin.getUserById`, and `getUser` (67, of which 50 are outside the wall until M1).
- Two places trust an unverified cookie because RLS backstops them: `proxy.ts:47-52`,
  `app/dashboard/tracking/layout.tsx:21`. Both must verify the session server-side before
  RLS is deleted (M6 Q2) — earlier if Q2 says delete.
- Users table: keep the Supabase `uid`s as `profiles.id` so nothing else changes; the 34
  foreign keys already point at `auth.users(id)` → repoint to `profiles(id)` in M6's
  introspected schema.
- Delete `tests/integration/supabase-shim.sql` — the `auth` schema stub is no longer needed.

</details>

---

## The attack pass on this plan

Per the rule this conversation produced, the plan ships with the strongest alternative to
each of its own decisions and with what was not checked.

**Strongest alternative to M0's squash:** reconstruct the true pre-January baseline and keep
the 44 files. *Why it lost:* cannot be computed except by the same diff M0 runs anyway; is
fragile where later migrations altered the 21 baseline tables (`user_goals` at least four
times); and is discarded at M6 when the schema is introspected. The comments are the real
loss, and they are one git command away.

**Strongest alternative to M6-before-M7:** login first. *Why it lost:* it is the riskiest
piece with the most hard-won fixes and an unmet external dependency (email); data-first lets
the login move be gated by tests that already exist.

**Strongest alternative to the whole plan: stay on Supabase.** Do M0–M4 and stop. *Status:
genuinely open, and the plan is built so that it stays open.* M0–M4 are identical on either
path. The decision is made at M5, against R1–R5, with him. What would tip it toward staying:
a platform that passes R1–R5 turns out to cost or complicate more than the wall it removes;
or he agrees the persistent-server requirement was a general preference and, with that gone,
is content with Supabase-behind-a-verified-audit. What would tip it toward leaving: R1 and
R5 — the database on the internet with its key in every browser — which no amount of M0–M4
changes.

**Not checked, and therefore unknown:**
- Whether the chosen platform's private networking reaches a Vercel-hosted app if the app
  stays on Vercel (M5 detail; Railway and Fly both offer it, not verified here).
- Cost of any candidate at 100 / 1,000 / 10,000 users.
- Whether `pgvector` and the 32k-row vector index migrate cleanly to the target.
- GDPR: data export and account deletion do not exist today on any stack.
- Supabase's own free-plan terms for commercial use (Vercel's were checked; Supabase's were not).
- The exact behaviour of `supabase migration repair` on a project with 44 applied versions
  (documented; not rehearsed here).
- Whether `next` 16.3.5 has any breaking change against this codebase (`npm audit fix` is a
  dry-run until M2 runs it for real).

---

## Blockers — each is a question you can answer in one line

1. **Approve the five rules?** That is the approval this plan asks for. Recommendation: yes,
   M0 first. Everything in "what this asks permission to do" is listed so any single item can
   be vetoed without re-opening the rules.
2. **When does `training-rebuild` land?** M0 cannot start until it does, because the baseline
   must include its migrations. Recommendation: tell me when it merges, or tell me to message
   that session and ask.
3. **The one metadata write in M0 (migration repair) — yes or no when we reach it?**
   Recommendation: yes; it touches Supabase's bookkeeping table only, and the before/after
   listing goes in the PR.
4. **The `CLAUDE.md` rule — hand it to the session restructuring `CLAUDE.md` now, or add it
   after their commit lands?** Recommendation: after; adding it now collides with a 224-line
   uncommitted rewrite. The text is in the last section, ready.
5. **M3's staging project — will you create it?** Recommendation: yes, with me on the call;
   it is the first real-world surface worth learning.

## Open questions — each with a recommendation, so "go with your recommendations" is a valid reply

- **Q1. Drizzle or Prisma at M6?** Drizzle — it reads like the SQL your 44 migrations are
  already written in, and introspects the baseline directly. His view overrides.
- **Q2. Keep the 212 rules (ported via `SET LOCAL`) or delete them after M1?** Keep through
  M6; delete at M7 once the database is private and login is yours. Two locks until there is
  one door.
- **Q3. Keep Vercel for the app with a private Postgres elsewhere, or move the app too?**
  Decide at M5. The code does not require a persistent server; "one platform, one bill, one
  dashboard" argues for moving the app; cost decides.
- **Q4. Email sender at M7?** Resend.
- **Q5. Delete or fix the `app/test/*` labs to clear type errors?** Delete the ones
  `MEMORY.md` does not list as live labs; fix the three it does (vision-plan, scenario-lab,
  new-goals).
- **Q6. The `embeddings` corpus (32k rows, vectors) — migrate or regenerate?** Migrate via
  `pg_dump --data-only`; regenerating costs API calls and produces different vectors.
- **Q7. The `proxy.ts` and `tracking/layout.tsx` unverified-cookie trust — fix in M1 or M7?**
  M1. It is a two-line change (`getSession` → `getUser`) and it should not wait on the rules
  being deleted.

---

## Proposed `CLAUDE.md` addition — for the four-rules restructure in progress

Another session is rewriting `CLAUDE.md` into "the four rules", and its draft of
`finished-work.md` opens with *"Rule 2 in `CLAUDE.md` says to attack your own work before
showing it."* This text is written to extend that Rule 2, not to sit beside it. To be folded
in once their commit lands (blocker 4):

```markdown
Rule 2 applies to every recommendation, verdict and "it's fine" exactly as
it applies to code. For a recommendation the failure list must name three
things: **the strongest alternative and why it lost** (stated as its
proponent would state it — if it cannot be, it has not been understood and
may not be dismissed); **what was not checked** (an unchecked axis is
unknown, never "fine"); and **the evidence against, sought before the
evidence for** (checking only what was asked is rebuttal, not verification;
when the user relays an outside view, find the evidence for it first, and
test each part of it separately — half of a critique being right does not
make the other half right).

Two rules of reasoning, explicit because both were broken repeatedly:
defects and structure are independent — a list of bugs never argues for or
against the architecture they sit on; and time and effort are costs to
report, never arguments — a fault in the foundation warrants re-architecture,
a fault built on the foundation warrants a fix, and every finding says which.

The user is learning to program. The reply stays short and gives the
verdict; the concept behind each decision goes in the plan or the doc, in
plain language, so the user could make the next one alone. Confident
reassurance that turns out wrong does more harm than "I don't know" — say
the second whenever it is true.
```
