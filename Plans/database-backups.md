# Database backups: nightly, off-site, restore-tested

Status: **proposed** (written 2026-11-21). The owner said "yes to backups" on
2026-11-21. Everything below (where, how often, which tools) is Claude's
proposal until he says otherwise. Not built yet.

Checked 2026-11-22 by a Part A session (fresh sources, read-only live probes,
a dump and restore round trip on throwaway local stacks). Its findings are
folded in below and listed in "Part A findings". He said "go ahead" to
writing them in; the plan itself stays proposed.

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
| B3 | Dump tool must match server 17, and work as `backup_reader` | `pg_dump --version` here = 16.15. **Tested 2026-11-22:** `supabase db dump` (CLI 2.120 and 3.2.0) fails as a non-superuser: `permission denied to set role "postgres"` (every dump runs `SET ROLE postgres`) | P2, P3 | Generate the CLI's own script with `supabase db dump --remote … --dry-run`, delete the `--role "postgres"` line, run it inside `supabase/postgres:17.6.1.063` (pinned by digest). Tested: roles, schema and data dumped over the pooler as `backup_reader`; round trip 134/134 tables identical. Commit the generated scripts to the backups repo and regenerate only on a deliberate CLI bump |
| B4 | Can I create the private repo, set its secrets, make releases? | `gh auth status`: account reachjvc, scopes include `repo` | P2 | Yes, no owner step needed |
| B5 | Opening a backup without a person typing the passphrase | `gpg --list-secret-keys` shows the master key on this PC, passphrase-protected | P3 | New **restore-test key** (no passphrase, file mode 600, on this PC only). Each backup is locked to both keys. The PC already holds plain copies, so this adds no new exposure. GitHub never gets a private key |
| B6 | Throwaway database that behaves like Supabase | **Tested 2026-11-22:** a default `supabase start` (CLI 2.120, gotrue v2.197.0) refused live's data: 2 auth tables have newer columns, storage tables missing without storage-api. Pinned to live's versions (gotrue v2.198.0, storage v1.96.4, postgres 17.6.1.063, from a linked folder's `supabase/.temp/*-version`) it loaded with zero errors under `--single-transaction -v ON_ERROR_STOP=1` | P3 | `supabase start` in a throwaway folder with live's version files copied in (refresh by `supabase link` each run), services db + auth + storage (+ kong, pooler). Fail if the versions cannot be read |
| B7 | Free Actions minutes for a private repo | **Checked 2026-11-22** (docs.github.com billing page): Free includes $12 of compute a month since 2026-10-28 (about 2,000 Linux minutes at $0.006). Without a payment method, runs are blocked when it runs out, not billed. His 2 other private repos have 0 runs. Job ~5 min x 31 = ~$1 | P2 | Inside the free amount. Blocked runs are caught by the 30-hour age rule (G5). If GitHub ever asks for a card: **stop**, that is the owner's call |
| B8 | `supabase db dump --role-only` as a non-superuser | **Tested locally 2026-11-22:** fails with the CLI as is (B3); works with the `--role` line removed | P2 | Settled by B3's script. Phase 1 still proves it on live |
| B9 | Things the dump never contains | **Measured 2026-11-22:** trigger `on_auth_user_created` on `auth.users` (not in schema.sql); 3 cron jobs (`prune-error-reports` is in no migration); 4 vault secrets (incl. the push VAPID pair, unreadable by `backup_reader`); `supabase_migrations.schema_migrations`; storage files (0 today) | P2, P3 | Extras file and checks, see Part A findings G1-G4, G15. Vault secrets: owner-held copy, his decision later |

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
- The create statement itself is the first test on live: live's supautils differs from the local image (`privileged_role = supabase_privileged_role`), so local success does not prove it.
- Through the pooler: `select count(*) from auth.users` and `select count(*) from public.<any user table>` both return numbers.
- `begin; insert into public.<table> …; rollback;` and `delete` and `create table` all fail with "permission denied".

### Phase 2: nightly copy in GitHub (depends on: 1)

1. `gh repo create reachjvc/daygame-backups --private`. README: what it is, how to restore (plain steps), no secrets.
2. Public key files in the repo: master key + new restore-test key (Phase 3 step 1 makes it; do that first).
3. Secrets `BACKUP_DB_PASSWORD` (alone) and `BACKUP_DB_HOST_USER` (host, port, user). Never a URL holding the password: GitHub masks only the whole secret, and the CLI's `--dry-run` prints `PGPASSWORD` in plain text. First step: `echo "::add-mask::$BACKUP_DB_PASSWORD"`. No `--debug`.
4. Workflow `.github/workflows/nightly.yml`, cron `17 1 * * *` (02:17 Copenhagen winter), plus manual run:
   - No third-party actions (they would run with the secret); `actions/checkout` pinned by SHA only. Pull `supabase/postgres:17.6.1.063` by digest.
   - Run the committed dump scripts (B3) in that image with `set -euo pipefail`, absolute output paths, in an empty temp folder: roles, schema, data (`--use-copy`, excluding `public.embeddings_test`, `storage.buckets_vectors`, `storage.vector_indexes`, and the short-lived login tables `auth.refresh_tokens`, `auth.sessions`, `auth.one_time_tokens`, `auth.flow_state`, `auth.mfa_challenges`; a restore then logs everyone out).
   - Also `migrations.sql`: data of `supabase_migrations.schema_migrations` (else a restored project replays all migrations on the next ship).
   - Also `extras.sql`, generated by read-only queries: `pg_get_triggerdef` of every non-internal trigger on `auth.*`/`storage.*` tables that calls a non-platform function; one `cron.schedule(...)` per row of `cron.job`; policies on `storage.objects`. Plus `vault.secrets` names and `updated_at` (no values) in the manifest.
   - Errors from pg_dump go to a temp file; the log shows only exit codes and counts (error text can quote rows).
   - `manifest.json`: time, CLI version, server version, for each table the number of rows in its COPY block in `data.sql`, sha256 of each file.
   - Sanity checks that fail the run: any step's exit code non-zero; any file under a minimum size (a failed dump still leaves a 41-byte `data.sql`); `auth.users` row count 0; total size below 50% of the previous night's; live's table list (catalog) minus the fixed exclusion list (V1) differs from the dumped table list; any table's dump count more than 5% below live's count taken right after; `storage.objects` above 0 (no file copy exists yet); vault secret names or `updated_at` changed since the owner's copy.
   - `tar | gzip | gpg --encrypt -r <master> -r <restore-test>` to `full-YYYY-MM-DD.tar.gz.gpg`, with both full fingerprints written in the workflow (not read from a file anyone could swap); then `gpg --list-packets` must show exactly those two keys. Plain files are written only to the runner's temp folder and deleted at the end; no `set -x`; no `actions/upload-artifact` of anything unencrypted.
   - Upload as a release asset (tag `YYYY-MM-DD`); prune releases per Q2.
   - Last step: fail if `status/restore-test.json` (Phase 3) is older than 3 days or says fail.
5. On any failure: open (or comment on) one issue "Backup failing" in the backups repo with `GITHUB_TOKEN` (author github-actions[bot]; an issue opened with his own token would not notify him). Fixed text plus the run link, never log lines. Close it on the next green run.

Acceptance:
- Manual run green; release asset present; its size and the manifest's counts look like live (99 public tables on live 2026-11-21, 98 in the dump without `embeddings_test`; 9 auth users).
- The Actions log contains no row data, no password, no email address (search it).
- B8 settled: `roles.sql` either dumps, or the fallback is in place.

### Phase 3: fetch, keep, and prove it loads (depends on: 2)

1. Make the restore-test key: `gpg --quick-gen-key "daygame restore test" ed25519 sign never` + encryption subkey, no passphrase, in a separate keyring `~/.config/daygame-backup/restore-gnupg/` (mode 700). Export its public key to the backups repo.
2. New script `scripts/backup/full-restore-test.sh` in this repo (no secrets in it; config from `~/.config/daygame-backup/config`). It:
   - downloads the newest release asset with `gh release download`, checks its sha256 against the release;
   - copies it into `~/dg-backups/full-nightly/` and `OneDrive/daygame-backups/full-nightly/` (temp name + rename; retention per Q2);
   - decrypts with the restore-test keyring into a temp folder (mode 700), deleted at the end;
   - fails if the newest release is older than 30 hours (a dropped or blocked GitHub run must not let it re-test an old copy and say ok);
   - removes any leftover throwaway stack and its volumes first, and again on exit (`trap`), since they hold plain data;
   - starts a throwaway Supabase stack in its own folder with its own project id and ports (never the shared test stack other sessions use; see the worktree e2e note), pinned to live's versions (B6), services db + auth + storage;
   - loads with `psql --single-transaction -v ON_ERROR_STOP=1 -f roles.sql -f schema.sql -c 'SET session_replication_role = replica' -f data.sql -f migrations.sql -f extras.sql`; psql errors go to the temp folder, only counts and table names reach the journal;
   - right after loading: `update cron.job set active = false` (the every-minute notification job must never run in a copy);
   - **round-trip check, per table:** `COPY (select <columns from the COPY header> from <table>) TO STDOUT` from the restored DB, sorted, must equal the sorted lines of that table's COPY block in `data.sql` (column list, not `*`: column order can differ). Same for row counts against `manifest.json`, and sequence values. Any difference = fail, listing the tables;
   - **structure check:** triggers, policies, functions and cron jobs of the restored DB equal the manifest's list from live;
   - writes `status/restore-test.json` (date, asset, pass/fail, table count, failed tables, no data) to the backups repo via `gh api`;
   - stops and deletes the stack and its volumes.
3. systemd user timer `full-restore-test.timer`, 04:30, `Persistent=true` (catches up after the PC was off). Check `tools/load.sh` first and wait if the verdict is `game`, at most 4 hours, then run anyway.
4. Public repo `.gitignore`: ignore `*.sql` outside `supabase/migrations` and `tests` (the CLI writes next to the nearest `supabase/` folder, not the current folder; a dump must never be committable).

Acceptance: one green run end to end; status file committed; `~/dg-backups/full-nightly` and the OneDrive folder have the file; no plain `.sql` left anywhere after the run (`find /tmp ~/.cache -name '*.sql' -newer <start>`).

### Phase 4: failures get seen (depends on: 2, 3)

1. Add to the session-start hooks (`.claude/settings.json`) one line: `backups: last copy <date>, restore test <date> ok` or `backups BROKEN since <date>: <reason>`. Reads the backups repo's newest release and status file with `gh` (time-boxed to 5 s; prints "backups: status unknown" when offline, never blocks the session). BROKEN also when the newest copy is older than 30 hours, the restore test older than 3 days, or "unknown" has lasted 2 days. This line is the main alarm.
2. The issue from Phase 2 step 5 is a second channel only. Checked 2026-11-22: a bot-opened issue reaches him through "watching" the repo (auto-watch on repos he creates); whether by email is not documented. His GitHub inbox's newest 50 notifications were all "workflow run failed" from the main repo, so it is easy to miss.

Acceptance: break it on purpose (Phase 5, V7) and see the line say BROKEN in a new session.

### Phase 5: second agent attacks it (depends on: 1-4)

Run by a different agent with the Part B prompt. The checks are listed below.

### Phase 6: write it down (depends on: 5)

- `docs/runbooks/backups.md`: restore steps in plain words (whole DB into a fresh Supabase project; one account's life plan via the existing script), where the keys are, what to do if this PC is gone (master private key on OneDrive + passphrase in his password manager). Also what the copy does NOT hold and where each lives: auth settings (email server, redirect URLs), vault secrets (owner's copy), uploaded files (none yet), and that everyone is logged out after a restore.
- Moving to an EU project later (infra memory, proposed): Phase 1 on the new project, update one secret, run once. The restore test is also the dress rehearsal for that move.
- Keep `plan-backup.sh` running (finer, per-account restores). Do not delete older backups (only the owner decides removals).
- Update the memory notes `live-db-backup-method` and `infra-decision-2026-11-21`.

## Verification checks for the second agent (Phase 5)

Each check says what proves it. Any failure means "not done".

| ID | Check | Pass when |
|---|---|---|
| V1 | The copy is complete | Table list in `manifest.json` equals live's base tables in public, auth, storage, minus exactly: `public.embeddings_test`, `auth.schema_migrations`, `storage.migrations`, `storage.buckets_vectors`, `storage.vector_indexes`, the 5 short-lived auth tables (Phase 2). `cron.*`, `vault.*`, `net.*` are never in `data.sql`; cron jobs travel in `extras.sql`, vault secrets only in the owner's copy |
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
| V14 | Structure survives | In tonight's restored copy: trigger `on_auth_user_created` exists, the 3 cron jobs exist and are inactive, `supabase_migrations.schema_migrations` matches live, policy count matches live |
| V15 | No plain data left, no password in logs | After a run (also one killed halfway): no `bkrestore` Docker volumes, no `.sql` in temp folders, no row text in `journalctl --user`; Actions log has no password (search for a known prefix) |
| V13 | Whole-DB restore into a real fresh Supabase project | Optional, only if the owner wants a free second project made: load one copy, sign in as the owner's account on a local app pointed at it |

## Part A findings (2026-11-22)

Silent failures and leaks found by the check, each folded into the phases above.

| # | Risk | Fix (where) |
|---|---|---|
| G1 | Signup trigger on `auth.users` missing from every dump | `extras.sql` + structure check (P2, P3, V14) |
| G2 | Cron jobs missing; one exists only on live | `cron.schedule` lines in `extras.sql` (P2) |
| G3 | Vault secrets (push keys) in no backup | Owner-held encrypted copy, his decision; nightly name/date check (P2) |
| G4 | Migration history missing, replay risk | `migrations.sql` (P2) |
| G5 | Dropped or blocked GitHub run, PC re-tests old copy | 30-hour age rule (P3, P4) |
| G6 | Round trip proves reload, not completeness | Catalog vs dump list, counts vs live (P2) |
| G7 | Failed dump leaves a small non-empty file | Exit codes, minimum sizes (P2) |
| G8 | Password printed by `--dry-run`, unmasked inside a URL | Separate password secret, add-mask (P2) |
| G9 | CLI writes next to nearest `supabase/` folder; `.sql` not git-ignored | Absolute paths, temp folder, `.gitignore` (P2, P3) |
| G10 | Restore errors quote rows into the journal | Errors to temp, counts only (P3) |
| G11 | Crashed test leaves plain data in Docker volumes | Cleanup before and on exit (P3, V15) |
| G12 | Master key never checked nightly | Pinned fingerprints, `--list-packets` (P2) |
| G13 | Leaked copy would hold live login tokens | Leave out short-lived auth tables (P2) |
| G14 | Third-party actions run with the secret | None used, image by digest (P2) |
| G15 | Uploaded files never backed up | Fail when `storage.objects` > 0 (P2) |
| G16 | Restored copy runs the every-minute job | Deactivate cron after load (P3) |
| G17 | "Status unknown" forever | BROKEN after 2 days (P4) |
| G18 | Wait while gaming has no limit | Cap 4 hours (P3) |

## Part 2: rules for the session that builds it

- Live DB: only Phase 1's role statements write to it. Every test write goes in `begin; … rollback;`.
- Never print, log or commit the reader password, a private key, or dump contents. The public repo (`reachjvc/Daygame_coach`) gets only scripts and docs.
- Plain-text dumps live only in temp folders that the script deletes, and in `~/dg-backups` with mode 600.
- No spending. If any service asks for a card or a paid plan, stop and tell the owner.
- Commit repo files with `git commit --only <paths>` and ship with `node scripts/ship.mjs`.
- Before calling it done: Phase 5 by a different agent, all of V1-V12, V14, V15 green, then report in plain words.

## Prompts

**Part A: check the plan before building** (paste into a new session):

> Read `Plans/database-backups.md` in /home/jonaswsl/projects/daygame-coach. Do not build anything and do not write to the live database. Check, with fresh sources or read-only probes, every fact the plan marks "from memory" or "unconfirmed", plus: does `supabase db dump` work over the session pooler with a non-superuser role that has `pg_read_all_data` + BYPASSRLS; does a `supabase start` stack accept `data.sql` from a live dump including `auth`; GitHub Free private-repo Actions allowance and release-asset limits today; does GitHub email the owner for issues opened by his own token. List every way the plan could fail silently or leak data, each with a fix. Report: which facts held, which did not, and the changes you propose to the plan.

**Part B: attack the finished setup** (after Phases 1-4 are built):

> Read `Plans/database-backups.md` in /home/jonaswsl/projects/daygame-coach and run every check V1-V12, V14, V15 in its "Verification checks" table against the real setup (backups repo `reachjvc/daygame-backups`, the live DB read-only except `begin … rollback`, the timers on this PC). Do not trust any earlier "done". For V6 prepare the steps and ask the owner to type the passphrase himself; never see it. For each check give pass/fail with the exact command and the output that proves it. Restore every setting you changed for a test (V7, V10) and show that it is back.
