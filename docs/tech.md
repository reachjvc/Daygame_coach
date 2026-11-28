# Tech: build, test, ship, keep the data safe

For Claude sessions. Keep all replies to him short and non-technical. His CLAUDE.md ("Technical safety") comes first.
Rules for one folder live in `.claude/rules/` (they load by themselves when you touch that folder) and are not repeated here:
tests in `testing.md`, database code in `database.md`, screens in `ui.md`, plans in `plans.md`, "done" in `finished-work.md`.

## 1. How a change reaches the live site

There is one way: `node scripts/ship.mjs`, run from your own branch.
- It puts your commits on top of the newest main, on a `ship-*` branch, and waits for "CI passed" and "E2E passed".
- Both green: main moves to exactly that commit, and Vercel puts main live. Red: main stays as it was.
- GitHub refuses every other push to main, his account included. Never loosen that.
- Only a full run is named "E2E passed" (main, beta, ship-*, a dispatch without `grep`). A plain branch push is named "E2E quick passed", so it can never stand in for the full suite.
- A red test is fixed, or its change is reverted. Never skipped.
- Ship without asking. Commit everything you write in the same turn, plans too ("everything should be committed, always", 2026-11-20).
- Before shipping: `node scripts/typecheck-ratchet.mjs` and `npm run lint:ratchet`. The pre-commit hook runs the related unit tests and lints the staged files. The pre-push hook scans for secrets (gitleaks) and refuses the push if gitleaks is missing. The repo is public.
- Models: "make sure that you end up using lesser models for the execution, and big models for the planning phase itself" (his, 2026-11-18).

Working in the shared folder:
- Several sessions use the same checkout at once, and its local main can be out of date. Build on your own branch in a git worktree from GitHub's main (`git fetch origin && git worktree add -b <b> <dir> origin/main`, then symlink `node_modules`). An old worktree holds the docs of its own commit: rebase it on `origin/main` before you read its rules.
- In the shared folder commit with `git commit --only <paths>`. Never `git add -A`, never `git stash`.
- A doc other chats are also editing is never a reason to skip a change he asked for. Add your own lines; never remove or rewrite another chat's lines.
- Never `git worktree remove --force` before checking that its last commit landed.

## 2. Traps that cost real time before

Shipping:
- Vercel's deploy limit: about 60 pushes in a day gave "retry in 24 hours". Batch commits. If it comes back, `vercel ls daygame-coach`: rows of 20-second "Error" deploys mean a CLI loop is running somewhere.
- Late deploy: a push without a Vercel status can go live late, over newer code (rollback on 2026-11-09). After "live", check healthz again later. If its buildId is older than main, redeploy main.
- Known flaky test: `tests/e2e/audit-ping.spec.ts` F12 (Log Out inside the Undo time) seeds an answer 1 h back on the real clock, so it fails between 00:00 and 01:00 UTC and blocks every ship in that hour.

Test database and dev servers:
- One shared test database (Docker stack `supabase_db_daygame-tests`) for every checkout. `test-stack.mjs up`, or the integration config, run from a new worktree can rebuild it under other sessions' runs.
- Its base is `tests/db/baseline.sql` (stamped 20261110130000) plus the newer migrations; the migration history cannot be replayed from nothing (`supabase db reset` fails). Refresh the base with `scripts/db/baseline.sh` once production has newer migrations (`--check` shows drift). Never hand-write a test schema: one once hid a feature that never saved.
- To test a new migration: `docker exec -i supabase_db_daygame-tests psql -U postgres -v ON_ERROR_STOP=1 < file`, then run a copy of the integration config without its `globalSetup` line, with `TEST_STACK_ENV` set.
- A test acts as if your migration is missing: check the column with psql, delete `tests/db/supabase/.temp/assembled.sha256`, then `node scripts/db/test-stack.mjs up`.
- The app from a worktree: `next dev --webpack -p <port>` with `NEXT_DIST_DIR=.next-<name>` (Turbopack panics on a symlinked `node_modules`). Give it the test stack's keys (`node scripts/db/test-stack.mjs env`), never `.env.local`: that is the live database.
- Playwright beside a dev server: set `E2E_STACK_ENV` and `PW_BASE_URL`, use your own `--output` and `--workers=1`. Check the port is free first.
- The service worker (offline Time Log) runs only in a production build: `npm run build && npx next start -p 3200`.
- To look at the Time Log without his data: signed out, cookies cleared, `localhost:3000/test/toggl`. Sync answers 401; the data stays in that browser.

Shell:
- Never `pkill -f <pattern>`: it kills your own shell. Kill by PID.
- `/security-review` fails here (no `origin/HEAD`). Run the review through a subagent on `<start>..HEAD`.

## 3. Tests

All test rules: `.claude/rules/testing.md` (it loads by itself when you touch `tests/`; read it before writing any test).

## 4. The live database

Supabase, Free plan. It holds his real data and every user's: sex life, addiction, health and mood, special-category data under EU law (GDPR Article 9). Rules for database code: `.claude/rules/database.md`.
- Reading is fine: `npx supabase db query --remote --read-only "<select>"`, from a linked scratch folder (the checkout is not linked). SELECT only. Never add `--yes`: it runs the statement with full write rights.
- Two CLIs: `npx supabase` fetches 3.x, where `--remote` replaced `--linked`; the installed `~/.local/bin/supabase` is 2.120.0 (uses `--linked`). The backup scripts and the GitHub backup job need 2.120.0: don't upgrade it until they are changed.
- Never run `supabase projects api-keys` (it prints the service key) and never open `.env.local` (it holds service keys).
- Never add `net` or `extensions` to the exposed schemas in the Supabase dashboard. The `net` queue briefly holds the notification clock's secret.
- No password, passphrase or private key passes through a Claude session. Never take his passwords.
- True now (checked 2026-11-26): RLS is on for all 98 public tables in the production schema copy (`tests/db/baseline.sql`, 10 Nov), and in every newer migration that makes a table.
- Known weak spots and their status: Claude's private notes (`~/research/tech-private/`), never in this public repo.

## 5. Backups

True now (checked on disk 2026-11-26):
- Supabase's Free plan makes no backups.
- One nightly job on his PC at 03:00 (`plan-backup.timer`, `scripts/backup/plan-backup.sh`) copies the life-plan tables only, encrypted, to the PC and OneDrive. It failed on 18 Nov and 24 Nov; a failure goes only to its log, so nobody is told. Nothing is ever deleted (his answer; auto-delete removed in a7ee20e7).
- Time Log only, by hand: `npx tsx scripts/backup-timetrack.ts`. Put back: `scripts/restore-timetrack.ts` (dry run unless `--confirm`, never deletes, but overwrites every live row the file holds, so an old file undoes later edits). Try restores on the test database only.
- Everything else has no copy yet, except old one-off dumps on his PC.

Being built (his yes 2026-11-26, "lets go ahead with the entire plan"): each night GitHub copies the whole database with a read-only login, proves the copy row by row, locks it with a key only he holds; his PC keeps a copy and puts one on OneDrive. $0. A failure must reach his phone. Plan and status: `Plans/database-backups.md` (delete it when done, leave 2-3 lines here).

## 6. Time Log safety nets

Built 2026-11-27. Report page: https://claude.ai/artifact/7EqXmUoW66a2nLuW5kD3hN. Questions page: https://claude.ai/artifact/2N94W1DoweJ3JYw9yS6Rcf.
- His goal: the Time Log stops getting worse without him knowing.
- His bug, in his words (2026-11-28): "it just looks buggy when i reopen it, because it continues for a split second the previous running thing, even if it was closed on another browser/device". Being fixed 2026-11-28.
- His rules (2026-11-14): nothing changes on the PC unless it makes the PC better or more like the phone. Pulling an entry's edge away leaves a gap; the neighbour does not stretch (PC too). The phone hides Week view, the money and team reports, Billable, the empty bell, the row ⋮ menu, Team and the footer.
- What guards it, on every push, inside "E2E passed": `tests/e2e/timelog-guard/` (`stories.spec.ts` = his 10 everyday tasks, Claude's list until he checks it; `phone-pc-differences.spec.ts`; `reopen.spec.ts`; `audit-a1/a2/a3.spec.ts`), CI job `timelog-guard`; screen photos in `tests/e2e/timelog-guard/photos/` (job `timelog-photos`, run only with `bash scripts/timelog-photos.sh`); clock traps in `tests/unit/timetrack/clock-traps/`.
- A photo that must change on purpose: show him old and new on a page, update (`--update-snapshots`) only after his yes. Never raise the 1% tolerance.
- Open bugs are `test.fail` lines in those specs (12 as of 2026-11-27); delete the line when its bug is fixed. Older ones (2026-11-19): Back from "Stop at…" leaves the tracker; Pomodoro has no Stop; a past entry that overlaps the running timer counts twice; the home-screen app was never tested.
- Test lock (his yes 2026-11-28): changes to these tests need an `Owner-approved:` line quoting his yes. Being built 2026-11-28. Still waiting for his yes: Q3, a Vercel deployment check.

## 7. The live site

- Runs on Vercel, from main: https://10kdaysclub.com (also https://daygame-coach.vercel.app). Database and login: Supabase.
- Vercel Pro ($20/month): the free plan is for non-commercial use, and the site sells coaching. He buys it himself ("As it looks now, i will buy vercel pro", 2026-11-28).
- What is live: `https://10kdaysclub.com/api/healthz` gives `buildId`, the commit. Compare it with `git rev-parse origin/main`.
- After each production deploy, `.github/workflows/live-check.yml` opens the public pages, read-only.
- Crashes: `npx tsx scripts/list-errors.ts --hours 24` (table `error_reports`, kept 30 days, no typed text or emails).
- Notifications ring from one database clock, `notifications-clock`, every minute. Stop all of them now: `select cron.unschedule('notifications-clock');` (deletes nothing). Start again: `select cron.schedule('notifications-clock', '* * * * *', 'select public.notifications_clock_tick()');`.
- Every address the app is served on must be on Supabase's redirect allow-list, or sign-up and password reset break.
- Never run the rollbacks `20261030120000_thought_frequencies.down.sql` or `20261030130000_thoughts_clock.down.sql`. They drop tables the Time Log needs.
- Account names and the database id are in Claude's private notes, not here.

## 8. Servers on his PC

- His dev server on :3000 is the user service `daygame-dev` (`systemctl --user restart daygame-dev`). Starting `npm run dev` as well makes a second server on :3001. Both use the LIVE database.
- A timer (`daygame-deploy`, every minute) runs the newest main's Docker image at https://localhost, also on the LIVE database. He keeps it running (2026-11-28: "i dont see the problem in something running on my localhost"). CI builds that image on every push to main (`image-staging`, repo variable `STAGING_PUBLISH=on`). The Supabase URL and anon key are baked into each image: rotating them needs new GitHub variables and a new image. `tests/unit/infra/*` check the Docker files.
- Not in use: the production-server half of `infra/` (Hetzner server, DNS, production image). Old runbook: `git show 18efdb10:infra/RUNBOOK.md`.

## 9. The app

His CLAUDE.md: the app is "one of the next big priorities". Nothing built yet.
- What it must do (his examples, 2026-09-26): a real installed app, not a website that looks like one; notifications arrive when the app is closed; a timer runs "with the screen dark or the phone in a pocket while it keeps counting". Build for the app from the start, so login is not rebuilt twice.
- Phones: "I carry an android, app must work for both" (2026-11-28). His Android is the test device; iPhone must work too.
- Next: a small proposal (for example an Expo app on today's Supabase backend). Claude's larger AWS plan was withdrawn on 2026-11-21 (`git show 18efdb10:Plans/platform.md`).
- The repo stays public: private would end the free GitHub Actions minutes ("we cannot make the repo private due to costs", 2026-11-28).
</content>
</invoke>
