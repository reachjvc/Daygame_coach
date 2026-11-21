# Database backups: nightly, off-site, restore-tested

Status: **proposed** (written 2026-11-21). The owner said "yes to backups" on
2026-11-21. Everything below (where, how often, which tools) is Claude's
proposal until he says otherwise. Not built yet.

This plan is written so a second agent can (a) check it before anything is
built (Part A prompt at the end) and (b) attack the finished setup to prove it
works (Part B prompt at the end).

## In plain words

Today, if Supabase lost or deleted the live database, almost everything would
be gone. Only the life plan has a nightly copy, and it only runs when this PC
is on. There is one full copy from 2026-11-18 and one from this morning, both
taken by hand.

After this plan:

1. Every night GitHub (not this PC) takes a **full copy of the live database**
   (all tables, all accounts), locks it with the backup key, and stores it in
   a new **private** GitHub repository. GitHub never holds the key to open it.
2. Every night this PC fetches that copy, keeps it in `~/dg-backups` and in
   OneDrive, **opens it and loads it into a throwaway database**, and checks
   that every row of every table came back identical. A backup that has never
   been loaded back is a hope, not a backup.
3. If either step fails or stops happening, it shows up where it gets seen
   (see Phase 4). Note: the "Nightly checks" job on main has been red since
   2026-10-31 and nobody noticed for three weeks. A GitHub email alone is not
   enough.

Costs nothing: no new paid plan, no card. The one thing it cannot do: bring
back changes made between the last night's copy and the failure (up to ~24
hours). Supabase Pro's daily backups would not change that either; point-in-time
recovery is a paid add-on and not proposed at this stage.

## What exists today (measured 2026-11-21)

| Thing | State |
|---|---|
| Live DB | Supabase `supabase-daygame` (ref `vcjzbmtcgmjrvvklzqaq`), us-east-1, Free plan, Postgres 17.6.1.063, 347 MB of which `public.embeddings_test` is 302 MB |
| Supabase backups | none (`supabase backups list` empty on Free) |
| Life-plan nightly | `scripts/backup/plan-backup.sh`, systemd user timer `plan-backup.timer` 03:00, gpg to key `EAD7CED1B9584EA057069E8BAF587F92544CCD17`, copies in `~/dg-backups/nightly` + `OneDrive/daygame-backups`; log shows ok every night since 2026-11-18 |
| Full copies | `~/dg-backups/full-2026-11-18/` (+ encrypted on OneDrive, 139 MB, incl. embeddings) and `~/dg-backups/live-2026-11-21/` (plain text; I set its files to mode 600 today, they were 644) |
| Restore ever tested? | life-plan restore script exists (`scripts/restore-life-plan.ts`); a full restore has never been proven |
| Owner's recent changes | domain `10kdaysclub.com` now on Cloudflare nameservers; Vercel still Hobby; Supabase still the one US org/project. The plan does not depend on these, and keeps working after a move to the EU (Phase 6). |

## Blockers (each attempted once)

| ID | What | Attempted, and what came back | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | A login that can read everything but write nothing | Read-only query: `postgres` holds `pg_read_all_data` **with admin option** and has `rolbypassrls = true` | P1 | Create `backup_reader` (LOGIN, BYPASSRLS, `pg_read_all_data`). pg_dump needs BYPASSRLS or it stops at tables with row security |
| B2 | GitHub runners have no IPv6; the direct DB host is IPv6-only (from memory) | Linked folder's `pooler-url`: `aws-1-us-east-1.pooler.supabase.com:5432` (session mode, IPv4). Supabase docs (checked): custom roles work on the pooler as `<role>.<project-ref>`, no extra registration | P2 | Use the session pooler on port 5432, user `backup_reader.vcjzbmtcgmjrvvklzqaq` |
| B3 | Dump tool must match server 17 | `pg_dump --version` here = 16.15 (too old for 17) | P2, P3 | Use `supabase db dump` (it runs a matching pg_dump in Docker), as in Supabase's own guide (checked: roles / schema / data as three files, data with `--use-copy`) |
| B4 | Can I create the private repo, set its secrets, make releases? | `gh auth status`: account reachjvc, scopes include `repo` | P2 | Yes, no owner step needed |
| B5 | Opening a backup without a person typing the passphrase | `gpg --list-secret-keys` shows the master key on this PC, passphrase-protected | P3 | New **restore-test key** (no passphrase, file mode 600, on this PC only). Each backup is locked to both keys. The PC already holds plain copies, so this adds no new exposure. GitHub never gets a private key |
| B6 | Throwaway database that behaves like Supabase | Docker Hub: `supabase/postgres:17.6.1.063` exists (~1 GB). Docker present here | P3 | First try a `supabase start` stack in a throwaway folder (it runs the auth migrations, so `auth.users` has the same columns as live). Fallback: the bare image with the auth schema included in the test's schema load |
| B7 | Free Actions minutes for a private repo | GitHub docs (checked): Free plan 2,000 min/month for private repos. One unconfirmed post says it became a $12 credit on 2026-10-28. Job ~3 min x 31 = ~100 min | P2 | Inside the free amount either way. If GitHub ever asks for a card: **stop**, that is the owner's call |
| B8 | `supabase db dump --role-only` as a non-superuser | Not attempted (needs B1's role first) | P2 | Phase 2 acceptance. Fallback: take `roles.sql` once via `--linked`, store it, and have the nightly job fail when the list of roles in `pg_roles` changes |

No owner action is needed. Creating `backup_reader` is a write to the live DB;
his "yes to backups" covers it, and `drop role backup_reader` undoes it.

## Open questions (each with a recommendation)

| # | Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|---|
| Q1 | Copy `public.embeddings_test` (302 MB, a test table) every night? | No. Keep the 2026-11-18 copy of it | Monthly copy | Rebuild test embeddings (hours of compute), no user data lost |
| Q2 | How long to keep copies | Newest 30 nightly + first of each month for 12 months (same as the life-plan backup) | 14 + 6 | Storage only; nothing is billed |
| Q3 | Restore test every night or weekly | Every night at 04:30, right after the download (~5 min CPU, skipped and caught up when the PC was off) | Weekly | A broken backup is noticed up to 6 days later |
| Q4 | Where a failure shows | (a) The session-start line every Claude session prints (like "main is red"), (b) a GitHub issue opened in the backups repo, which emails him | Email only | Silent failure for weeks (see the red nightly job since 2026-10-31) |
| Q5 | Supabase Pro | Not now. Later, when paying customers' data is on it (infra memory, proposed) | Now ($25/month) | His money; does not replace this plan anyway: Pro backups die with the project |

## Phases

### Phase 1: read-only login (depends on: nothing)

1. Generate a 40-character password in the shell; never print it.
2. On live, one statement set: `create role backup_reader login bypassrls connection limit 3 password '…'; grant pg_read_all_data to backup_reader; alter role backup_reader valid until 'infinity';` (the last part avoids Supavisor's EAUTHQUERY error for expired roles).
3. Store the URL `postgresql://backup_reader.vcjzbmtcgmjrvvklzqaq:<pw>@aws-1-us-east-1.pooler.supabase.com:5432/postgres` in `~/.config/daygame-backup/reader-url` (mode 600) and later as a secret in the backups repo. Never in the public repo, never in a log.

Acceptance:
- Through the pooler: `select count(*) from auth.users` and `select count(*) from public.<any user table>` both return numbers.
- `begin; insert into public.<table> …; rollback;` and `delete` and `create table` all fail with "permission denied".

### Phase 2: nightly copy in GitHub (depends on: 1)

1. `gh repo create reachjvc/daygame-backups --private`. README: what it is, how to restore (plain steps), no secrets.
2. Public key files in the repo: master key + new restore-test key (Phase 3 step 1 makes it; do that first).
3. Secret `BACKUP_DB_URL` (from Phase 1).
4. Workflow `.github/workflows/nightly.yml`, cron `17 1 * * *` (02:17 Copenhagen winter), plus manual run:
   - Install the Supabase CLI at an exact pinned version.
   - `supabase db dump --db-url "$BACKUP_DB_URL" -f roles.sql --role-only`, then `-f schema.sql`, then `-f data.sql --data-only --use-copy -x public.embeddings_test`.
   - `manifest.json`: time, CLI version, server version, for each table the number of rows in its COPY block in `data.sql`, sha256 of each file.
   - Sanity checks that fail the run: any file empty; `auth.users` row count 0; total size below 50% of the previous night's (a dump that silently lost tables).
   - `tar | gzip | gpg --encrypt -r <master> -r <restore-test>` to `full-YYYY-MM-DD.tar.gz.gpg`. Plain files are written only to the runner's temp folder and deleted at the end; no `set -x`; no `actions/upload-artifact` of anything unencrypted.
   - Upload as a release asset (tag `YYYY-MM-DD`); prune releases per Q2.
   - Last step: fail if `status/restore-test.json` (Phase 3) is older than 3 days or says fail.
5. On any failure: open (or comment on) one issue "Backup failing" in the backups repo; close it on the next green run.

Acceptance:
- Manual run green; release asset present; its size and the manifest's counts look like live (97+ public tables, 9 auth users today).
- The Actions log contains no row data, no password, no email address (search it).
- B8 settled: `roles.sql` either dumps, or the fallback is in place.

### Phase 3: fetch, keep, and prove it loads (depends on: 2)

1. Make the restore-test key: `gpg --quick-gen-key "daygame restore test" ed25519 sign never` + encryption subkey, no passphrase, in a separate keyring `~/.config/daygame-backup/restore-gnupg/` (mode 700). Export its public key to the backups repo.
2. New script `scripts/backup/full-restore-test.sh` in this repo (no secrets in it; config from `~/.config/daygame-backup/config`). It:
   - downloads the newest release asset with `gh release download`, checks its sha256 against the release;
   - copies it into `~/dg-backups/full-nightly/` and `OneDrive/daygame-backups/full-nightly/` (temp name + rename; retention per Q2);
   - decrypts with the restore-test keyring into a temp folder (mode 700), deleted at the end;
   - starts a throwaway Supabase stack in its own folder with its own project id and ports (never the shared test stack other sessions use; see the worktree e2e note), only the db + auth services;
   - loads `roles.sql` (ignore "already exists"), `schema.sql`, then `data.sql` with `session_replication_role = replica`;
   - **round-trip check, per table:** `COPY (select * from <table>) TO STDOUT` from the restored DB, sorted, must equal the sorted lines of that table's COPY block in `data.sql`. Same for row counts against `manifest.json`. Any difference = fail, listing the tables;
   - writes `status/restore-test.json` (date, asset, pass/fail, table count, failed tables, no data) to the backups repo via `gh api`;
   - stops and deletes the stack and its volumes.
3. systemd user timer `full-restore-test.timer`, 04:30, `Persistent=true` (catches up after the PC was off). Check `tools/load.sh` first and wait if the verdict is `game`.

Acceptance: one green run end to end; status file committed; `~/dg-backups/full-nightly` and the OneDrive folder have the file; no plain `.sql` left anywhere after the run (`find /tmp ~/.cache -name '*.sql' -newer <start>`).

### Phase 4: failures get seen (depends on: 2, 3)

1. Add to the session-start hooks (`.claude/settings.json`) one line: `backups: last copy <date>, restore test <date> ok` or `backups BROKEN since <date>: <reason>`. Reads the backups repo's newest release and status file with `gh` (time-boxed to 5 s; prints "backups: status unknown" when offline, never blocks the session).
2. The issue from Phase 2 step 5 emails him (GitHub's own notification; from memory that issues in his own repo notify him, check in Phase 5).

Acceptance: break it on purpose (Phase 5, V7) and see the line say BROKEN in a new session.

### Phase 5: second agent attacks it (depends on: 1-4)

Run by a different agent with the Part B prompt. The checks are listed below.

### Phase 6: write it down (depends on: 5)

- `docs/runbooks/backups.md`: restore steps in plain words (whole DB into a fresh Supabase project; one account's life plan via the existing script), where the keys are, what to do if this PC is gone (master private key on OneDrive + passphrase in his password manager).
- Moving to an EU project later (infra memory, proposed): Phase 1 on the new project, update one secret, run once. The restore test is also the dress rehearsal for that move.
- Keep `plan-backup.sh` running (finer, per-account restores). Do not delete older backups (only the owner decides removals).
- Update the memory notes `live-db-backup-method` and `infra-decision-2026-11-21`.

## Verification checks for the second agent (Phase 5)

Each check says what proves it. Any failure means "not done".

| ID | Check | Pass when |
|---|---|---|
| V1 | The copy is complete | Table list in `manifest.json` equals live's `information_schema.tables` (base tables in public, auth, storage, vault, cron), minus `embeddings_test` only |
| V2 | The copy is exact | Restore test round-trip passes on tonight's copy. Then edit one row inside the restored DB and rerun only the compare step: it must FAIL and name that table |
| V3 | The login cannot write | Inserts, updates, deletes, DDL as `backup_reader` all refused (inside `begin … rollback`) |
| V4 | Nothing leaks in public | Public repo has no new secret, no dump file, no key private part (`git log -p` of the change); backups repo is private (`gh repo view --json visibility`); Actions logs have no row data, password or email |
| V5 | GitHub cannot open it | `gpg --list-packets` on the asset shows exactly the two expected key IDs; no private key in any repo secret (`gh secret list`) |
| V6 | It opens without this PC | On a clean machine or container: import only the master private key from OneDrive, type the passphrase (ask the owner, never see it), decrypt one asset. Owner step; the agent prepares it |
| V7 | Failures are loud | Point the secret at a wrong password, run the workflow: run red, issue opened, new session line says BROKEN. Restore the secret, rerun: green, issue closed |
| V8 | A corrupt file is caught | Flip one byte of a downloaded copy and run the restore test on it: FAIL (sha256 or gpg) |
| V9 | A half-empty dump is caught | Run the dump job once with a test switch that drops `data.sql` to one table: the 50% size check fails it |
| V10 | PC off for days | Stop the timer, move the status file's date back 4 days: the nightly workflow goes red. Re-enable: catches up |
| V11 | Retention right | Dry-run the prune on a fake list of 400 dates: keeps 30 newest + 12 month-firsts, nothing else |
| V12 | Live untouched | Live row counts before and after the whole test session differ only by normal use; no new tables, roles other than `backup_reader` |
| V13 | Whole-DB restore into a real fresh Supabase project | Optional, only if the owner wants a free second project made: load one copy, sign in as the owner's account on a local app pointed at it |

## Part 2: rules for the session that builds it

- Live DB: only Phase 1's role statements write to it. Every test write goes in `begin; … rollback;`.
- Never print, log or commit the reader password, a private key, or dump contents. The public repo (`reachjvc/Daygame_coach`) gets only scripts and docs.
- Plain-text dumps live only in temp folders that the script deletes, and in `~/dg-backups` with mode 600.
- No spending. If any service asks for a card or a paid plan, stop and tell the owner.
- Commit repo files with `git commit --only <paths>` and ship with `node scripts/ship.mjs`.
- Before calling it done: Phase 5 by a different agent, all of V1-V12 green, then report in plain words.

## Prompts

**Part A: check the plan before building** (paste into a new session):

> Read `Plans/database-backups.md` in /home/jonaswsl/projects/daygame-coach. Do not build anything and do not write to the live database. Check, with fresh sources or read-only probes, every fact the plan marks "from memory" or "unconfirmed", plus: does `supabase db dump` work over the session pooler with a non-superuser role that has `pg_read_all_data` + BYPASSRLS; does a `supabase start` stack accept `data.sql` from a live dump including `auth`; GitHub Free private-repo Actions allowance and release-asset limits today; does GitHub email the owner for issues opened by his own token. List every way the plan could fail silently or leak data, each with a fix. Report: which facts held, which did not, and the changes you propose to the plan.

**Part B: attack the finished setup** (after Phases 1-4 are built):

> Read `Plans/database-backups.md` in /home/jonaswsl/projects/daygame-coach and run every check V1-V12 in its "Verification checks" table against the real setup (backups repo `reachjvc/daygame-backups`, the live DB read-only except `begin … rollback`, the timers on this PC). Do not trust any earlier "done". For V6 prepare the steps and ask the owner to type the passphrase himself; never see it. For each check give pass/fail with the exact command and the output that proves it. Restore every setting you changed for a test (V7, V10) and show that it is back.
