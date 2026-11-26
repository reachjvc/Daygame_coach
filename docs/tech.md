# Tech: build, test, ship, keep the data safe

For Claude sessions. The owner is not technical: tell him things in plain words.
His CLAUDE.md ("Technical safety") comes first. This file holds the rest.
"(Claude's proposal)" means not decided. Only his yes, in his own words, decides (his rule, 2026-11-18).
Say what you checked and what is from memory (his rule).

## 1. How a change reaches the live site

There is one way: `node scripts/ship.mjs`, run from your own branch.
- It puts your commits on top of the newest main, on a `ship-*` branch, and waits for "CI passed" and "E2E passed".
- Both green: main moves to exactly that commit, and Vercel puts main live. Red: main stays as it was.
- GitHub refuses every other push to main, his account included. Never loosen that.
- Only a full run is named "E2E passed" (main, beta, ship-*, a dispatch without `grep`). A plain branch push is named "E2E quick passed", so it can never stand in for the full suite (hole closed 2026-11-27).
- A red test is fixed, or its change is reverted. Never skipped.
- Ship without asking. Commit everything you write in the same turn, plans too ("everything should be committed, always", 2026-11-20).
- Before shipping: `node scripts/typecheck-ratchet.mjs` and `npm run lint:ratchet`. The pre-commit hook runs the related unit tests and lints the staged files.
- The pre-push hook scans for secrets (gitleaks) and refuses the push if gitleaks is missing. The repo is public.
- Before calling code done: `/code-review`. Add a security review for RLS, auth, payments or permissions.

Working in the shared folder:
- Several sessions use the same checkout at once. Build on a branch in a git worktree (`git worktree add -b <b> <dir> main`, then symlink `node_modules`).
- In the shared folder commit with `git commit --only <paths>`. Never `git add -A`, never `git stash`.
- Models: "make sure that you end up using lesser models for the execution, and big models for the planning phase itself" (his, 2026-11-18). Claude's mapping: the big model plans and reviews, Sonnet builds, Haiku does mechanical checks.

## 2. Traps that cost real time before

- Vercel's deploy limit: about 60 pushes in a day gave "retry in 24 hours". Batch commits. If it comes back, `vercel ls daygame-coach`: rows of 20-second "Error" deploys mean a CLI loop is running somewhere.
- Late deploy: a push without a Vercel status can go live late, over newer code (rollback on 2026-11-09). After "live", check healthz again later. If its buildId is older than main, redeploy main.
- One shared test database (Docker stack `supabase_db_daygame-tests`) for every checkout. `test-stack.mjs up`, or the integration config, run from a new worktree can rebuild it under other sessions' runs.
- To test a new migration: `docker exec -i supabase_db_daygame-tests psql -U postgres -v ON_ERROR_STOP=1 < file`, then run a copy of the integration config without its `globalSetup` line, with `TEST_STACK_ENV` set.
- A test acts as if your migration is missing: check the column with psql, delete `tests/db/supabase/.temp/assembled.sha256`, then `node scripts/db/test-stack.mjs up`.
- The app from a worktree: `next dev --webpack -p <port>` with `NEXT_DIST_DIR=.next-<name>` (Turbopack panics on a symlinked `node_modules`). Give it the test stack's keys (`node scripts/db/test-stack.mjs env`), never `.env.local`: that is the live database.
- Playwright beside a dev server: set `E2E_STACK_ENV` and `PW_BASE_URL`, use your own `--output` and `--workers=1`. Check the port is free first.
- To look at the Time Log without his data: signed out, cookies cleared, `localhost:3000/test/toggl`. Sync answers 401; the data stays in that browser.
- Never `pkill -f <pattern>`: it kills your own shell. Kill by PID.
- Every `spawnSync` in a test gets `NODE_ENV: "test"` in its env.
- `/security-review` fails here (no `origin/HEAD`). Run the review through a subagent on `<start>..HEAD`.
- Never `git worktree remove --force` before checking that its last commit landed.
- An old worktree holds the docs of its own commit, not today's. Before working in one, rebase it on the newest main (`git rebase origin/main`) so you read the current rules.
- The service worker (offline Time Log) runs only in a production build: `npm run build && npx next start -p 3200`.
- The migration history cannot be replayed from nothing (`supabase db reset` fails). That is why the test database is built from `tests/db/baseline.sql` plus the newer migrations.
- The test database's base is `tests/db/baseline.sql` (stamped 20261110130000). Refresh it with `scripts/db/baseline.sh` once production has newer migrations (`--check` shows drift). Never hand-write a test schema: one once hid a feature that never saved.
- Supabase reads stop at 1,000 rows without a warning. Use `readAllRows` and `chunkIds` from `src/db/paging.ts`.

## 3. Tests

`*.test.ts`: Vitest, `tests/unit/`. `*.integration.test.ts`: Vitest, `tests/integration/`. `*.spec.ts`: Playwright, `tests/e2e/`.
- One clear thing per test. Its name says what it proves.
- Same result on every run: no random data, no real clock (freeze it), no fixed sleeps (wait for a condition).
- Not brittle: check what the user sees or what the data says, not class names or exact layout.
- Call the code users trigger (the repo or service function), not raw SQL. Insert-then-read-back tests Postgres, not us.
- Never pass by doing nothing. No silent `return`: use `test.skip(condition, reason)`. Setup helpers throw when setup fails.
- A refused write names its constraint or SQLSTATE, never a bare `.rejects.toThrow()`.
- Never write to the live database. Database tests run on the local test stack (`scripts/db/test-stack.mjs`).
- Each test makes its own user (`newUser()`, `tests/db/harness.ts`). Nothing is wiped, so files run in parallel. With `TEST_SHARED_USER=1` the cross-user tests must go red.
- Every e2e spec imports `test` from `tests/e2e/fixtures/test.ts` (a fresh test account per worker). Tags add devices: `@phone`, `@engine`, `@timing`.
- A bug gets a test that fails before the fix and passes after it. A failing test: fix the cause in the code, not the test.
- Ratchets only go down: lint, types, write coverage (see `.claude/rules/testing.md`). Never raise one to get past your own failure.

## 4. Database safety

The live database and login run on Supabase, Free plan. It holds his real data and every user's.
The data is about sex life, addiction, health and mood: special-category data under EU law (GDPR Article 9).
- Reading is fine: `npx supabase db query --remote --read-only "<select>"`, from a linked scratch folder (the checkout is not linked). SELECT only. Never add `--yes`: it runs the statement with full write rights (newer CLIs ask for it; the answer is `--read-only`). Two CLIs: `npx supabase` fetches 3.x, where `--remote` replaced `--linked`; the installed `~/.local/bin/supabase` is 2.120.0 (uses `--linked`). The backup scripts and the GitHub backup job need 2.120.0: don't upgrade it until they are changed.
- Never run `supabase projects api-keys` (it prints the service key) and never open `.env.local` (it holds service keys).
- Live writes happen only through a migration or the app. Never from a test or a script.
- Migrations: write `supabase/migrations/<timestamp>_*.sql`, ask him, then apply. Run `supabase migration list --remote` first (CLI 3.x: without `--remote` both commands target the local database): `db push --remote` applies every pending migration, other sessions' too.
- All database code goes through `src/db/*Repo.ts`.
- Row security (RLS) binds only the app's client. The service key, the SQL editor and scripts bypass it. A rule that must always hold is a CHECK, NOT NULL, foreign key or trigger.
- Never add `net` or `extensions` to the exposed schemas in the Supabase dashboard. The `net` queue briefly holds the notification clock's secret.
- No password, passphrase or private key passes through a Claude session. Never take his passwords.

True now (checked 2026-11-26):
- RLS is on for all 98 public tables in the production schema copy (`tests/db/baseline.sql`, 10 Nov), and in every newer migration that makes a table.
- AI spend per user: only the Scenarios chat checks a cap (20 cents, `src/api_ai/config.ts`). Q&A and openers call Claude with no per-user cap.
- One migration has waited for his yes since 2026-09-23: `supabase/pending-owner-approval/` (deleting or correcting a finished workout in one step; it adds two permissions).

## 5. Backups

True now (checked on disk 2026-11-26):
- Supabase's Free plan makes no backups.
- One nightly job on his PC at 03:00 (`plan-backup.timer`, `scripts/backup/plan-backup.sh`) copies the life-plan tables only, encrypted, to the PC and OneDrive. It failed on 18 Nov and 24 Nov; a failure goes only to its log, so nobody is told.
- Its old auto-delete was removed on 2026-11-26 (D1, commit a7ee20e7): nothing is deleted. His answer: delete nothing.
- Time Log only, by hand: `npx tsx scripts/backup-timetrack.ts`. Put back: `scripts/restore-timetrack.ts` (dry run unless `--confirm`, never deletes, but overwrites every live row the file holds, so an old file undoes later edits). Try restores on the test database only.
- Everything else (accounts, goals, quit tools, tracking) has no copy except old one-off dumps on his PC (see D5).

**Being built now.** On 2026-11-26 he approved the whole plan: "lets go ahead with the entire plan". The plan and
its status per phase: `Plans/database-backups.md` (delete it when the build is done; leave 2-3 lines here). Check
page "Backup Plan Check, Round 3" https://claude.ai/artifact/FEU5eytturiPhW5oa8BuKV: its fixes come first (no marks from him yet).
- Each night GitHub copies the whole database with a read-only login and proves the copy: it loads it into an
  empty database and compares every row. The copy is locked with a key only he holds, kept in a private repo; his
  PC fetches each copy and puts one on OneDrive. Nothing is deleted. $0.
- His answers: delete nothing, keep every copy. A failure must reach him on his phone or somewhere he really sees.
- His own steps: GitHub billing check, make the key, run the read-only login script, confirm the test alarm
  reached his phone, open one test copy, key file on a USB stick.

## 6. Time Log safety nets

Claude's proposal, 2026-11-19. Step 3 is built (not yet checked by him): `tests/e2e/timelog-guard/`, run on every push by the CI job `timelog-guard` (projects `timelog-guard-phone` and `timelog-guard-desktop`; `E2E passed` waits for it). Rest not started. Full plan: `git show 18efdb10:Plans/time-log-safety-nets.md`.
- His goal: the Time Log stops getting worse without him knowing.
- His bug: he opens the Time Log on his phone after a timer ran (on the phone or the PC), and sometimes it shows the wrong thing. No crash is logged for it.
- His Time Log rule (2026-11-14): nothing changes on the PC unless it makes the PC better or more like the phone. Claude's way to keep it: phone changes in shared files behind `isMobile`/`sm:`, PC screenshots before and after.
- His decision (2026-11-14): pulling an entry's edge away leaves a gap; the neighbour does not stretch (PC too).
- His phone/PC split (2026-11-14): the phone hides Week view, the money and team reports, Billable, the empty bell, the row ⋮ menu, Team and the footer.
- Open bugs (as of 2026-11-19): Back from "Stop at…" leaves the tracker; Pomodoro has no Stop; a past entry that overlaps the running timer counts twice; the home-screen app was never tested.
Next steps, in order:
1. Ask him what exactly he sees on reopen, how often, and in the browser or the home-screen app. A screenshot next time.
2. Reproduce it with a two-device browser test, repeated 30 times. Commit the failing test, then the fix.
3. His 10 everyday Time Log tasks as tests at phone and PC size (he checks the list).
4. Clock traps with a fake clock: midnight, summer/winter time, timers over 24 hours.
Screen photos (built, not yet checked by him): `tests/e2e/timelog-guard/photos/`, six screens at phone and PC size, run on every push by the CI job `timelog-photos` (`E2E passed` waits for it). Run them with `bash scripts/timelog-photos.sh` (needs `E2E_STACK_ENV` and `PW_BASE_URL`, header of the script): only inside its pinned Docker image, never `npx playwright test` directly (the spec throws).
Rule: when a photo must change on purpose, show him the old and the new on an artifact page and update it (`--update-snapshots`) only after his yes. Never raise the 1% tolerance to get past a red run.
Claude's doubt: screen-photo tests and the test lock cost the most; do them last. "Hold the live site back when the Time Log check fails" is mostly true already: since 20 Nov main takes only commits that passed E2E.

## 7. The live site

- Runs on Vercel, from main: https://10kdaysclub.com (also https://daygame-coach.vercel.app). Database and login: Supabase.
- What is live: `https://10kdaysclub.com/api/healthz` gives `buildId`, the commit. Compare it with `git rev-parse origin/main`.
- After each production deploy, `.github/workflows/live-check.yml` opens the public pages, read-only.
- Crashes: `npx tsx scripts/list-errors.ts --hours 24` (table `error_reports`, kept 30 days, no typed text or emails).
- Notifications ring from one database clock, `notifications-clock`, every minute. Stop all of them now: `select cron.unschedule('notifications-clock');` (deletes nothing). Start again: `select cron.schedule('notifications-clock', '* * * * *', 'select public.notifications_clock_tick()');`.
- Every address the app is served on must be on Supabase's redirect allow-list, or sign-up and password reset break.
- Never run the rollbacks `20261030120000_thought_frequencies.down.sql` or `20261030130000_thoughts_clock.down.sql`. They drop tables the Time Log needs.
- Rate limits count in the memory of one server copy. Vercel runs many copies, so each limit is looser than its number.
- Account names and the database id are in Claude's private notes, not here.

## 8. infra/ (Docker): half in use

- In use: every push to main builds a Docker image in CI (`image-staging`, repo variable `STAGING_PUBLISH=on`).
- In use: a timer on his PC (`daygame-deploy`, every minute) runs that image at https://localhost. It uses the LIVE database.
- In use: his dev server on :3000 is the user service `daygame-dev` (`systemctl --user restart daygame-dev`). Starting `npm run dev` as well makes a second server on :3001. It also uses the live database.
- `tests/unit/infra/*` check the Docker files. The Supabase URL and anon key are baked into each image: rotating them needs new GitHub variables and a new image.
- Not in use: the production-server half (Hetzner server, DNS, rehearsal, production image). Hosting was reopened on 2026-11-18. Old runbook: `git show 18efdb10:infra/RUNBOOK.md`.

## 9. The app

His CLAUDE.md: the app is "one of the next big priorities". Nothing built.
- What the app must do (his examples, Claude's summary, 2026-09-26): a real installed app, not a website that
  looks like one; notifications arrive when the app is closed; a timer runs "with the screen dark or the phone in a
  pocket while it keeps counting". Decided with him then: build for the app from the start, so login is not
  rebuilt twice.
- Claude's AWS plan of 2026-11-18 (`git show 18efdb10:Plans/platform.md`) was withdrawn by Claude on 2026-11-21 as
  overbuilt for this stage. Next: a new, smaller proposal (for example an Expo app on today's Supabase backend).
- Making this repo private would end the free GitHub Actions minutes: about $3,700 a month at today's use
  (Claude's estimate, 2026-11-21; re-check).

## 10. Open questions only he can answer

- The app: which phone he carries (iPhone or Android), so it becomes the test device.
- Vercel Pro ($20/month, COSTS MONEY): Vercel's free Hobby plan is for non-commercial use, and the site sells coaching (Claude's reading, 2026-11-21; re-check the terms). Claude: yes, before the first sale.
- Time Log: what does he see on reopen? Which 10 tasks does he do every day? Claude: ask both in one message.
- Time Log Q2: lock the Time Log tests, so no session can change them without a commit line quoting his yes? Claude: yes.
- The copy at https://localhost runs on live data, and the server plan it served is parked. Keep it running? Claude: switch the timer off until hosting is decided (check with him).
- The parked workout migration (section 4): apply it? Claude: leave it parked until Training work comes back.
- A per-user AI spend cap on every AI feature, not only the Scenarios chat? Claude: yes, before any paid launch.
