# Database backups: nightly, off-site, restore-tested

Status: **building**. Approved 2026-11-26 in his words: "lets go ahead with the
entire plan" (read as yes to every recommendation in D1-D8). Phases 1, 3.1-3.3
and 6.3 done; waiting for him: Phase 0 looks and Phase 2 (the key). When the
build is done: delete this plan, leave 2-3 lines in `docs/tech.md` section 5.

The owner's answers so far: delete nothing, keep every copy; a failure must
reach him on his phone or somewhere he really sees; two-factor sign-in is on
for his GitHub account.

## In plain words

- **What it protects:** every account and every table of the live database. Each night GitHub (not this PC) takes a full copy, proves it by loading it into a test database and comparing every row, locks it with a key only you can open, and stores it. This PC then keeps its own copy and puts one on OneDrive. Nothing is ever deleted.
- **What it costs:** $0. About a fifth of GitHub's free monthly minutes and about a tenth of Supabase's free monthly transfer. One free alarm account (healthchecks.io) is proposed.
- **What can still go wrong:** up to about a day of changes can be lost, because the copy is once a day. During the nightly job GitHub's machine holds the data unlocked. A program running on this PC as you could delete the copies here and on GitHub; an alarm fires, and only a USB copy is out of reach. If you lose both the passphrase and the key file, no copy opens. Uploaded files (none yet), the four vault secrets and the login settings are not in the copy; after a restore they are set again by hand.
- **What you do yourself (about 30 minutes):** say yes or no to stopping the old automatic deletion (before 19 December); make the new key with one script and save its passphrase in your password manager; run one script that makes the backup login; look at two settings pages (GitHub billing, OneDrive plan); confirm the test alarm reached your phone; open one test copy with your passphrase.

## Owner decisions (all approved 2026-11-26 as recommended)

| # | Question | Recommendation (proposed) | If he says no |
|---|---|---|---|
| D1 | **First, before 19 Dec 03:00:** remove the deletion block in `scripts/backup/plan-backup.sh` (lines 80-94; it keeps 30 dailies + monthly firsts and deletes the rest, first deletion due 19 Dec). | Yes. Removing it deletes nothing. | Copies older than 30 days start disappearing on 19 Dec. |
| D2 | Alarm channels: (a) GitHub email for issues assigned to him (he checks once that "Participating" notifications go to email); (b) GitHub Mobile push for assignments (optional); (c) a free healthchecks.io account he makes himself, for the case "the job never ran at all". | Yes to (a) and (c); (b) if he uses the GitHub app. | Without (c): if GitHub stops running the job entirely (blocked minutes, outage, a dropped schedule), nobody is told. |
| D3 | The 4 vault secrets (push key pair, reminder clock URL and secret) are not in any copy. After a restore: make new ones, or keep copies of the values in his password manager? | Make new ones. Cost: every device must allow notifications again. | He copies the 4 values from the Supabase dashboard into his password manager himself; Claude never sees them. |
| D4 | The old master key's passphrase sits in a plain file on this PC and in an old Claude chat log. Old copies stay locked to the old key. | He copies the old passphrase into his password manager himself (his own window). Whether to delete the plain file afterwards is his call; recommended yes, after one old copy opens with it (`gpg --decrypt <old copy> > /dev/null && echo OPENS`, in his own window). | The old copies stay readable by anything on this PC, and unreadable if the PC dies. |
| D5 | Plain full copies on this PC (`~/dg-backups/live-2026-11-21/`, plain life-plan files): lock them to the new key. Deleting the plain originals is his call. | Lock them (deletes nothing). Delete the plain originals after his test-copy drill passes. | Any program running as him can read every user's data in those files. |
| D6 | One disaster drill: restore one copy into a new, free Supabase project (new EU org, no card), sign in to a local app pointed at it. Uses the last free project slot. | Yes, once, after the attack (Phase 9) passes. He signs in himself. | The real restore path stays proven only on a local copy. |
| D7 | The backup login is the one live write. `.claude/rules/database.md` says live writes happen only through a migration or the app. | His own script makes it (Phase 4), not a migration: a migration would publish the statement in the public repo and copy it into every backup. | The plan cannot start. |
| D8 | Keep `public.embeddings_test` (302 MB test table) out of nightly copies; no Supabase Pro now. | Yes to both (as in rounds 1-2). The 2026-11-18 copy holds that table. | Pro: $25/month; its backups die with the project. |

What only he can do (not decisions): the billing look (M12: github.com/settings/billing shows no card, or an Actions budget of $0 that stops usage); the OneDrive look (M13: which plan, signed in, syncing); making the key (Phase 2); the login script (Phase 4); confirming the test alarm arrived (Phase 7); the test-copy drill (Phase 8); a USB copy of the key file (recommended).

## How it works

```
 live database ──(read-only login, TLS + SCRAM, once a night)──► GitHub runner (private repo)
                                                                   dump → checks → restore test
                                                                   → lock (master key) → store as release
                                                                   → alarm job: issue to him + dead-man ping
 this PC, daily 19:30 ──► fetch every new locked copy, check GitHub's sha256
                          → ~/dg-backups/full-nightly + OneDrive/daygame-backups/full-nightly
                          → one status line back to GitHub (read by the next night's job)
```

### Parts, and what each one is for

| Part | Job | Lost if cut |
|---|---|---|
| `backup_reader` login | Reads everything, writes nothing; password only in GitHub's secret store | The job would need the admin password |
| Private repo `reachjvc/daygame-backups`, workflow `nightly.yml` | Runs nightly off this PC; stores copies as releases (no total size limit) | Copies would depend on this PC being on |
| Restore test on the runner (`restore.sh`, `check.py`) | Loads the copy into an empty local Supabase at live's versions; compares every row, sequences, orphan rows, structure. The same `restore.sh` is the real restore tool, so the real path runs every night | "A backup never loaded back is a hope" |
| Master key (new, made by him) | The only lasting key. Public part on GitHub; private part only in his key file (OneDrive + USB) and his passphrase | Anyone with GitHub access could read copies |
| Throwaway key per run | Proves on the runner that the locked file opens and matches; dies with the runner | Nightly proof that the stored file opens |
| PC mirror (`mirror-backups.sh` + timer) | Second and third place (PC, OneDrive); watches counts, the key file, OneDrive size, the old life-plan job | Losing the GitHub account would lose every copy |
| Alarm job (issue assigned to him) | Email/push on every red night, nightly comment while broken, closes when green | He would not hear about failures |
| healthchecks.io check (D2c) | Alarms when no run reports at all | Silent stop if GitHub never runs the job |

### Cut from round 2, and what is lost

| Round-2 part | Why cut | What is lost |
|---|---|---|
| Restore-test key without a passphrase on this PC (B5) | Anyone copying two files from this PC could read every future copy (M3) | Nothing: the runner's throwaway key does the proof |
| PC decrypts and re-checks every copy | Needs a lasting key on the PC; plain files in /tmp (M3) | The PC checks GitHub's sha256 instead (same bytes as the runner proved) |
| `versions.json`, refreshed by the PC | Broke the first run and could not repair itself (H4, H5) | Nothing: the runner reads live's versions itself, with a pinned fallback |
| `status/pc-check.json` committed to the repo | "Latest" ordering broke on commit dates (M2) | Nothing: a repository variable `PC_STATUS` instead |
| Google Calendar alarm via a headless Claude run | Ran with all tools allowed, depended on usage limits, never proven (M1) | One channel; replaced by healthchecks.io (D2c) |
| Session-start line | Only Claude reads it; repo text would reach every session (M1) | Claude sessions do not announce backup state by themselves |
| Nightly auth-settings export (R6) | Needed the Supabase access token in a script and a field filter that dropped real settings (M7) | Login settings must be set by hand after a restore (README list) |
| Row counts compared with live "right after" | False alarms when anyone uses the app during the dump (M2b); pg_dump does not drop rows silently | Nothing found that it would catch; the table list is compared instead |
| Vault-change check | Would turn every night red after a planned change (H4) | Names are kept in each manifest |

## Secrets: where each one is made and everywhere it goes

Rule: no password, passphrase or private key passes through a Claude session.
Claude sees only names, fingerprints, hashes of files and pass/fail lines.

| Secret | Made by, where | Goes to | Never goes to |
|---|---|---|---|
| New master passphrase | Him, typed only into GnuPG's own prompt in his terminal (`make-master-key.sh`; caching off) | His password manager (+ paper, optional) | Any file, log, command line, chat, GitHub |
| New master private key | `make-master-key.sh`, in a temp keyring the script deletes | `master-SECRET-<date>.asc` (passphrase-protected) on OneDrive `daygame-backups/keys` and his USB stick | GitHub; this PC's keyring. Claude never opens, copies or uploads it; the mirror only hashes it |
| Master public key + fingerprints | Same script prints `MASTER_FPR`, `MASTER_SUBKEY`, `SECRET_FILE_SHA256` (not secret) | He pastes the 3 lines to Claude; backups repo `keys/`, workflow env, PC config | (public) |
| `backup_reader` password (`bkr_` + 48 hex) | `set-reader-login.sh` in his terminal, in memory only | GitHub secret `BACKUP_DB_PASSWORD` (via stdin) → only the dump and selftest steps → container env → SCRAM login | The database (gets only a SCRAM verifier), disk, logs, Claude. Renew = run the script again |
| SCRAM verifier | Same script | Live (`pg_authid`); may appear in Supabase's statement log and `pg_stat_statements` | (useless without the 192-bit password) |
| healthchecks.io ping URL | He creates the check in his browser | He pastes it into `gh secret set HC_PING_URL --repo reachjvc/daygame-backups` (hidden prompt) in his terminal → alarm job only | Claude, logs |
| healthchecks.io account password | Him | His password manager | Claude |
| Throwaway runner key | `seal.sh` on the runner, no passphrase | The runner's temp keyring, deleted at the end; the VM is destroyed | Anywhere else |
| Existing: this PC's GitHub token (`repo` scope), Supabase CLI login | Exist today | Mirror (list/download releases, set `PC_STATUS`); his login script (`db query --linked`) | New places |
| Existing: old master passphrase | Plain file on this PC + old transcript (C1) | D4: his password manager | New places |
| Project anon key | Public by design (in every browser) | Workflow env, to read live's service versions | (public) |

## Reference files (tested on throwaway copies)

The tested drafts live outside the repo, in
`~/.cache/daygame-research/backups-review/r3/drafts/` (archive
`drafts-r3.tar.gz`, sha256 `0ff8c81fb77567ab1c4f5a2b0c68a8d3206fea22bcb36d8b737bb8ddff6f15f9`).
The build copies them byte for byte; it does not redesign them.

| Draft | Goes to | sha256 (owner scripts are checked before he runs them) |
|---|---|---|
| `owner/make-master-key.sh` | public repo `scripts/backup/owner/` | `d79da0cee50651ef6a03f682aaee533115ac96c42586a41f0119494cff2a5aa0` |
| `owner/set-reader-login.sh` | public repo `scripts/backup/owner/` | `b37f540737444da72721d81dace56233ebd92889c78552f028ae40bb09e38a92` |
| `owner/open-test-copy.sh` | public repo `scripts/backup/owner/` | `91a954ccd8ee5d016c156c6909f9b0be630a75b36cce5838296c23abe73346f9` |
| `pc/mirror-backups.sh` | public repo `scripts/backup/` | `cbbe13322486ec6ae319f2b8fb7303c39d36471c52ea8d733bbe89c95ffb6ddd` |
| `pc/systemd/full-mirror.{service,timer}` | public repo `scripts/backup/systemd/`, installed to `~/.config/systemd/user/` | |
| `backups-repo/` (`.github/workflows/nightly.yml`, `bin/*`, `local/config.toml`, `README.md`) | private repo `reachjvc/daygame-backups` | |

What was tested on 2026-11-24, on two throwaway local Supabase stacks (production
schema from `tests/db/baseline.sql`, fake users and rows, live's versions gotrue
v2.198.0, storage v1.96.4, postgres 17.6.1.063), host psql 16.15:

- `set-reader-login.sh` through `supabase db query -f` (local path): role made from a SCRAM verifier; login works with `PGREQUIREAUTH=scram-sha-256`; a re-run renews it and the old password fails; refuses to run inside a Claude session.
- `selftest.sh`: as `backup_reader` all 8 probes pass (reads `auth.users`; every write refused, also with `begin read write`); under another login it stops before any probe; a wrong password prints only "password authentication failed".
- `dump.sh` in the pinned image as `backup_reader`: roles, schema, data, migration history, extras, catalog; no `PGPASSWORD` value in any script; `roles.sql` holds no password.
- `check.py` + `restore.sh` end to end: all 13 checks pass. Negative tests: a removed row (V2) is caught by the row compare and the orphan check; a cut `data.sql` (V9) fails the size, table-list and size-vs-last-night checks; a broken checker still writes a manifest marked fail; `restore.sh` refuses the live ref and a non-empty target; a failed load leaves the target empty.
- `seal.sh`: pass; a swapped key file and a changed file both fail; exactly two recipients; GnuPG refuses to overwrite an output file.
- Key compatibility: a copy locked to a key made by `make-master-key.sh` opens in GnuPG 2.2.27 (Ubuntu 22.04 container) with the passphrase; a wrong passphrase fails in a fresh keyring.
- `make-master-key.sh` and `open-test-copy.sh` with a fake prompt program: key file passphrase-protected, temp keyring removed, only fingerprints and a hash printed; the drill opens a copy with the right passphrase and fails with a wrong one.
- `mirror-backups.sh` with a fake `gh`: first fetch, nothing new, bad download (reported, newer copies still fetched, no partial left), deleted release, tampered local copy, changed key file.
- `nightly.yml`: actionlint with shellcheck clean. **Not run on GitHub** (creating a repo was out of scope).

## Phases

Each step carries one mark: **[tested on a copy]**, **[checked in docs](link)**
or **[from memory, untested]**. Models per the owner's 2026-11-18 rule (big model
plans, smaller models build): Claude build phases run on **Sonnet 5.5, effort
high**, in one session started with `claude --model sonnet`; the attack (Phase 9)
runs on a fresh **Opus 5.5, effort high** session that did not build anything.

### Phase 0: his answers (owner)

D1-D8, the billing look, the OneDrive look. D1 can be done at once if he says
yes (Phase 6 step 3), before anything else. **Model:** none.

### Phase 1: public-repo files: DONE 2026-11-26 (a7ee20e7; four hashes match on main, 136 tracked .sql files not ignored, ONEDRIVE_DIR in config)

### Phase 2: the new master key (owner)

He opens his own terminal (not a Claude window), makes a password-manager entry
"daygame backup master key" with a generated passphrase, then runs:

```
cd ~/projects/daygame-coach && echo "d79da0cee50651ef6a03f682aaee533115ac96c42586a41f0119494cff2a5aa0  scripts/backup/owner/make-master-key.sh" | sha256sum -c && bash scripts/backup/owner/make-master-key.sh
```

GnuPG asks 3 times (new, again, export). He copies `master-SECRET-<date>.asc`
to a USB stick and pastes the 3 printed lines (`MASTER_FPR`, `MASTER_SUBKEY`,
`SECRET_FILE_SHA256`) to Claude. **[tested on a copy]** with a fake prompt
program; the real terminal prompt (pinentry-curses, installed) **[from memory, untested]**.
Old-style key preferences, so copies open in GnuPG 2.2 too **[tested on a copy]**,
[docs](https://raw.githubusercontent.com/gpg/gnupg/master/doc/gpg.texi).

### Phase 3: the private backups repo (Sonnet 5.5, high; depends on 1, 2)

1-3. DONE 2026-11-26: repo private, cloned over SSH to `~/.cache/daygame-research/backups/daygame-backups`; first commit README only, `ANCHOR_SHA=39d0527d097f450e22c774a35570c6e811940bb6`; immutable releases on (PUT 204; the first read-back said false, true 5 s later, so retry once before calling it a failure).
4. Second commit: the drafts' `bin/`, `local/config.toml`, `.github/workflows/nightly.yml` **without its two `schedule:` lines** (so no nightly run, and no alarm, fires before Phase 7 turns it on), and `keys/master-public.asc` copied from `<ONEDRIVE_DIR>/keys/master-public.asc` (the PUBLIC file only). Fill the four `FILL-IN-AT-BUILD` values: `MASTER_FPR` and `MASTER_SUBKEY` exactly as the owner pasted them; `ANCHOR_SHA`; `SUPABASE_PUBLIC_KEY` from `grep -m1 '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2-` (never open `.env.local`: it also holds service keys). Check `gpg --show-keys` of the public file prints `MASTER_FPR`. Push over SSH.
5. `actionlint` on the pushed workflow; `grep -c FILL-IN-AT-BUILD` = 0.

Acceptance: `gh repo view --json visibility` = PRIVATE; immutable releases on; no secrets set yet (`gh secret list` empty).

### Phase 4: the backup login (owner; depends on 3)

In his own terminal:

```
cd ~/projects/daygame-coach && echo "b37f540737444da72721d81dace56233ebd92889c78552f028ae40bb09e38a92  scripts/backup/owner/set-reader-login.sh" | sha256sum -c && bash scripts/backup/owner/set-reader-login.sh
```

It prints two OK lines and DONE. One atomic statement creates or renews
`backup_reader` (LOGIN, BYPASSRLS, connection limit 3, `pg_read_all_data`,
read-only by default, 20 min statement limit) from a SCRAM verifier; the
password goes only to the GitHub secret. **[tested on a copy]** (local CLI path;
the CLI refuses several statements in one call, hence one `do` block). On live
through `--linked` (Management API) **[from memory, untested]**: it is the first
live test, and the next phase proves it. Log exposure: only the verifier can be
logged. [Postgres: a SCRAM string "is stored as-is"](https://www.postgresql.org/docs/17/sql-createrole.html).

### Phase 5: first runs (Sonnet 5.5, high; depends on 4)

All by `gh workflow run nightly.yml -R reachjvc/daygame-backups -f mode=<m> -f alarm=false`.

1. `mode=selftest`: all probes pass (connected as `backup_reader` over the session pooler with TLS and SCRAM required, reads `auth.users`, read-only by default, 6 write probes refused). If probe 0 fails with "authentication method requirement", the pooler does not offer SCRAM to clients: remove `-e PGREQUIREAUTH=scram-sha-256` from the workflow (keep `PGSSLMODE=require`), note it in the Status log, rerun. **[tested on a copy]** for the probes; pooler + TLS + SCRAM **[from memory, untested]**.
2. `mode=normal`: green. One release `b-<UTC stamp>-r<run id>` titled PASS with `copy-*.tar.gz.gpg` and `manifest-*.json`; manifest `verdict` pass; its `tables` count equals live's base tables minus the fixed exclusions (count live at that moment, read-only). Note the job time (estimate 10-15 min, **[from memory, untested]**; must stay well inside the ~2,000 free minutes, [docs](https://docs.github.com/en/billing/concepts/product-billing/github-actions)).
3. Log scan by script only (M14): `gh run view <id> --log -R …` piped into `grep -c 'bkr_'` (must be 0) and `grep -cE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}'` (must be 0 apart from GitHub's own lines; print only counts and, if any, the step name). Never print matches.
4. `mode=break-compare`: run red, `round-trip` fails naming the table a row was removed from; no release made. `mode=break-size`: red, `min-sizes`/`table-list`/`size-vs-last-night` fail; no release. **[tested on a copy]** (check logic); on GitHub untested.
5. A second `mode=normal` run: green; `size-vs-last-night` compared with run 2.

### Phase 6: this PC (Sonnet 5.5, high; depends on 5)

1. Config additions (`~/.config/daygame-backup/config`): `MIRROR_DIRS="$HOME/dg-backups/full-nightly <ONEDRIVE_DIR>/full-nightly"`, `MASTER_KEY_FILE=<ONEDRIVE_DIR>/keys/master-SECRET-<date>.asc`, `MASTER_KEY_SHA256=<the owner's SECRET_FILE_SHA256 line>`, `ONEDRIVE_LIMIT_MB` (4000 for the free 5 GB plan; set from his answer), `MIRROR_LOG=$HOME/dg-backups/full-nightly/mirror.log`. Install the two systemd units, `systemctl --user enable --now full-mirror.timer`, then `systemctl --user start full-mirror.service` once: log says `ok`, `gh variable get PC_STATUS -R reachjvc/daygame-backups` says `ok <today> copies=<n>`. **[tested on a copy]** (fake `gh`, fake folders); real OneDrive path **[from memory, untested]**.
2. Lock new life-plan copies to the new key: `gpg --import <ONEDRIVE_DIR>/keys/master-public.asc` (public only) and set `BACKUP_KEY_FPR=<MASTER_FPR>` in the config. Next morning: `gpg --list-packets` of the new nightly file shows `MASTER_SUBKEY` (exit code 2 without the secret key is expected). Old files stay as they are.
3. DONE 2026-11-26 (a7ee20e7): retention block removed from `scripts/backup/plan-backup.sh`; the main checkout, which the timer runs, has 0 `os.remove` lines.
4. **Only after D5 yes:** for each plain item in `~/dg-backups` (`live-2026-11-21/`, `alpha-live-test-account-2026-11-09/`, plain `*.json`), `tar | gzip | gpg -r <MASTER_FPR> -r <a throwaway key made for this>`; prove each opens with the throwaway key and matches; delete the throwaway key; never delete the plain originals (that is his separate yes).

### Phase 7: the alarm reaches him (Sonnet 5.5, medium + owner; depends on 6)

If he said yes to D2c, he first makes the healthchecks.io check (Period 1 day,
Grace 14 hours, because scheduled runs here start up to 9 hours late; Account
Settings: daily reminders on) and runs `gh secret set HC_PING_URL --repo reachjvc/daygame-backups`
in his own terminal, pasting the ping URL at the hidden prompt.
[healthchecks.io docs](https://healthchecks.io/docs/signaling_failures/).

1. Claude: `mode=break-compare`, `alarm=true`. Expect: run red; issue "Backups broken" opened by `github-actions[bot]` and assigned to `reachjvc`; healthchecks shows down. [docs: assignment subscribes him](https://docs.github.com/en/subscriptions-and-notifications/concepts/about-notifications), [mobile push](https://docs.github.com/en/subscriptions-and-notifications/get-started/configuring-notifications).
2. He says whether the email and/or push arrived on his phone, and the healthchecks email. Claude never reads his mail.
3. Claude: `mode=normal`, `alarm=true`: green, issue closed with a comment, healthchecks up.
4. Claude: put the two `schedule:` lines back, so `nightly.yml` equals the draft again (apart from the four filled values); push over SSH. The next night's scheduled run is the first one that can alarm him by itself.

### Phase 8: the test-copy drill (owner; depends on 6)

In his own terminal, with the key file from OneDrive (or the USB stick) and the
newest copy in `~/dg-backups/full-nightly/`:

```
cd ~/projects/daygame-coach && echo "91a954ccd8ee5d016c156c6909f9b0be630a75b36cce5838296c23abe73346f9  scripts/backup/owner/open-test-copy.sh" | sha256sum -c && bash scripts/backup/owner/open-test-copy.sh <key file> <copy>
```

It prints `OK: opened; all N files match …` or a FAIL line. Fresh keyring,
passphrase caching off (a cached passphrase faked a pass in testing).
**[tested on a copy]** with a fake prompt program. This is V6.

### Phase 9: attack (fresh Opus 5.5, high; depends on 5-8)

A session that built nothing runs the attack prompt at the end against the real
setup and the checks below. Until it passes, the report says "built, not yet attacked".

### Phase 10: write it down (Sonnet 5.5, medium; depends on 9)

- `docs/tech.md` section 5 (public; no separate runbook file, per the few-docs rule): the restore steps from the backups README, without key locations; what a copy does not hold; that everyone is logged out after a restore. Marked "draft" until Phase 9 passes.
- Memory notes `live-db-backup-method` and `infra-decision-2026-11-21`: point to this plan and the new repo.
- Stop rule in the runbook: before making any repo of his private, re-check this plan's minute budget (M12).

### Phase 11: hosted drill (only if D6 yes; Sonnet 5.5, high + owner)

He makes the new org (Frankfurt, free plan; stop at any card prompt) and the
project, so its database password is his alone. Claude writes the exact
commands; he runs them in his own terminal: decrypt one copy into a temp
folder (his passphrase), `read -rs PGPASSWORD && export PGPASSWORD` (the new
project's password, at a hidden prompt), then `restore.sh` with the new
project's pooler URL **without** a password in it, then delete the temp folder.
He signs in to a local app pointed at it. Keep the project until he says what
to do with it. **[from memory, untested]**

## Verification checks (Phase 9)

Each check names its proof. Any failure means "not done". Tests that change
something use temp folders or test switches, never the real copies.

| ID | Check | Pass when |
|---|---|---|
| V1 | The copy is complete | The newest manifest's `table-list` passed, and an independent read-only catalog query on live (base tables in public, auth, storage, supabase_functions minus the fixed exclusions in `bin/catalog.sql`) equals the manifest's `tables` keys |
| V2 | The copy is exact | A `break-compare` run is red naming a table; tonight's manifest says `round-trip` pass |
| V3 | The login cannot write | `selftest` run passes; reading `selftest.sh` shows every probe touches zero rows |
| V4 | Nothing leaks in public | Public repo history of this work: no secret, no dump, no private key, no `PGPASSWORD="…"`; backups repo private; log scan counts 0 |
| V5 | GitHub cannot open a copy | `gpg --list-packets` on a release asset (empty keyring) lists exactly `MASTER_SUBKEY` + one key in no keyring; `gh secret list` shows only `BACKUP_DB_PASSWORD` (+ `HC_PING_URL`) |
| V6 | It opens without this PC's keys | Phase 8 result |
| V7 | Failures reach him | Phase 7 record, with his own words that it arrived |
| V8 | A bad download or changed local copy is caught | Mirror with a temp config, `DG_GH` set to a fake `gh` and `DG_STATE_DIR` to a temp folder (so the real `PC_STATUS` is not touched): a flipped byte in a fetched file gives `digest-mismatch`, in a stored file `local-copy-differs`; real folders untouched |
| V9 | A half dump is caught | `break-size` run red |
| V10 | PC off for a week | Set `PC_STATUS` to `ok <date 8 days ago> test`; a manual run (`alarm=false`) fails `pc-copy`; rerun the mirror; the variable is back |
| V11 | Nothing is deleted | No code path deletes a copy: search workflow and scripts for `os.remove`, `unlink`, `rmtree`, `release delete`, `--clobber`, `-X DELETE`, `find … -delete`, `rm` outside temp folders; immutable releases on; `plan-backup.sh` has no retention block (after D1) |
| V12 | Live untouched | Live row counts before and after differ only by normal use; the only new role is `backup_reader` |
| V13 | Hosted drill | Only if D6 yes |
| V14 | Structure survives | Tonight's manifest: `structure` and `no-orphan-rows` pass; `extras.sql` holds `on_auth_user_created` and the 3 cron jobs |
| V15 | No plain data left, no secret in logs | Runner deletes its plain folder; this PC holds only locked files; mirror journal shows only codes; log scan 0 |
| V16 | Owner scripts unchanged | sha256 of the three owner scripts and the mirror equal "Reference files" |
| V17 | A red night does not block the next | After a failing run, the next normal run is green and compares with the failed night's manifest |

## Findings of the 2026-11-22 check: what changed

| ID | What changed, and where (or why rejected) |
|---|---|
| C1 | New master key made by him (`make-master-key.sh`, Phase 2): passphrase only in GnuPG's prompt, saved in his password manager; private key only in a passphrase-protected file on OneDrive + USB, never on this PC; all new copies locked to it; old copies stay on the old key (D4). The mirror checks daily that the key file is there and unchanged. The drill (Phase 8) comes before the attack. |
| H1 | D1 is first in his list. Phase 6 step 3 removes lines 80-94 only after his yes. V11 search widened (`os.remove`, `unlink`, `rmtree`, `--clobber`, API DELETE). The mirror alarms when release or local counts drop (tested). |
| H2 | His script sends only a SCRAM verifier, as one atomic statement through `supabase db query --linked -f`, never a migration (D7). The password never leaves his script's memory except into GitHub's secret store. Rejected: the `set local log_statement …` guard (needs rights the `postgres` role lacks on hosted, from memory; unnecessary when only a verifier can be logged). |
| H3 | Dump scripts generated offline with a fake address, `export PG…=` lines and `--role "postgres"` removed, `: "${PGPASSWORD:?}"` guard (tested). The build copies them; it never runs `--dry-run` against live. V4 searches for `PGPASSWORD="`. |
| H4 | Order: dump → checks → restore test → seal → store, always (a failed check is stored, title FAIL, marked pre-release), then the run turns red. Baselines are last night's manifest whatever its verdict, so a new normal heals after one red night (no accept file). Live's service versions read nightly by the runner, pinned fallback. Vault changes only recorded. Uploaded files stay red every night on purpose (a real gap). |
| H5 | Build prompt rewritten (below): no first-run dependency on missing files; build runs use `alarm=false`; V7 done by a test switch, not by breaking the password; runbook "draft" until the attack passes; D6 is his decision with default skip; his real steps listed; red `main` handled. |
| M1 | Alarm without any AI: an `alarm` job (`needs: backup`, `if: always()`) opens an issue assigned to him by the bot, comments every red night, closes when green; healthchecks.io dead-man (D2c) covers runs that never start. Calendar/Claude channel and session line cut. He confirms receipt once (Phase 7). |
| M2 | No "latest release": releases sorted by `createdAt`; the PC mirrors every release. Row counts vs live dropped; table list compared instead. PC copy red only after 7 days; PC problems reach GitHub through `PC_STATUS`. |
| M3 | Restore-test key dropped. The runner's throwaway key proves the file opens; the PC checks GitHub's sha256. The master key is the only lasting key. |
| M4 | Said in "In plain words". Password only in the dump and selftest steps; `PGSSLMODE=require` + `PGREQUIREAUTH=scram-sha-256`; `persist-credentials: false`; token only in the prepare, publish and alarm steps; no third-party actions; Postgres image by digest. Rejected: every service image by digest (live's auth/storage versions change; they come from Supabase, which already holds the live data) and blocking the containers' internet (untestable here, more parts, the runner itself is online). `verify-full` with Supabase's CA: proposed later, untested on the pooler. |
| M5 | Unique tag per run; no `--clobber`; GnuPG and the mirror never overwrite (tested); immutable releases; count drops alarm. A whole release can still be deleted with this PC's token: the USB copy (his) is the only copy out of reach. |
| M6 | `.gitignore` with allowlist (Phase 1). No dump ever runs on this PC; it holds only locked files. Leftover searches only in the script's own temp folders. |
| M7 | Vault: names in every manifest, D3. README and runbook list what to set by hand (vault, SMTP key, auth settings, app env) and "check a reminder arrives". Scripts and README travel inside every locked copy (`tools/`). Auth-settings export cut (see "Cut"). Realtime publication is already in `schema.sql` (tested), not a gap. |
| M8 | Read-only by default, 20 min statement limit, 5 min idle limit; all probes touch zero rows; the probe script refuses any login but `backup_reader` (tested both ways). Remaining, accepted: someone holding the password could run `prune_error_reports()` inside an explicit read-write transaction, and could read login hashes in `pg_authid`. |
| M9 | `restore.sh`: refuses the live ref and any non-empty target, one transaction (tested). The nightly test uses it, so the real path runs every night. |
| M10 | `--lock-wait-timeout=60s` in every dump, step timeouts, job limit 80 min (not 360), one concurrency group. |
| M11 | `live-size-limit` (150 MB, red, copy still stored); bytes per table in the manifest. Rejected: leaving big new tables out automatically (more parts). Remaining: if he ignores the alarm for weeks, transfer grows. |
| M12 | His billing look (Phase 0). Stop rule in the runbook (Phase 10). |
| M13 | His OneDrive look sets `ONEDRIVE_LIMIT_MB`; the mirror alarms above it; key on USB too. Remaining: the mirror cannot see whether OneDrive is actually uploading. |
| M14 | Log scans by script, counts only; the password has a public prefix `bkr_` so it can be counted without knowing it; no helper is ever given a secret or a user's email. |
| M15 | SSH clone and push, outside the public repo folder; never `gh auth refresh/login`; `ship.mjs` only for the public repo. |
| L1 | `auth.mfa_amr_claims` and `auth.saml_relay_states` left out (live: both point at left-out tables); orphan check per foreign key; structure compare limited to `public` + our triggers on auth/storage + cron + realtime + storage policies; V2/V9 switches are workflow inputs (all tested). |
| L2 | Key made with old-style preferences; tested open in GnuPG 2.2.27. |
| L3 | D5; Phase 6 step 4. |
| L4 | (a) recipients compared by subkey id, `--list-packets` exit 2 tolerated (tested); (b) key commands live in the owner script (tested); (c) one wording: the password is the only DB secret, host and user sit in the workflow; (d) counts compared with live at run time; (e) auth file dropped; (f) the password never enters Claude's shell; (g) no mode rule for OneDrive; (h) he signs in himself in D6. |

### Earlier rounds, still open before this round

| Item | Now |
|---|---|
| G3 vault values | D3 |
| G15 uploaded files | Red every night if any appear (by design) |
| B9 things a dump never holds | README "Not in a copy" + manifest vault names |
| R4/Q6 hosted drill | D6, Phase 11 |
| R6 auth settings | Cut; by hand after a restore |
| Q1, Q5 | D8 |
| Round-2 V6 after the build | Phase 8, before the attack |

## New problems this round found in its own design

| # | Problem | Fix (tested unless marked) |
|---|---|---|
| N1 | The CLI refuses several SQL statements in one call | One `do` block |
| N2 | `postgres` may not update `cron.job` | `cron.alter_job(...)` |
| N3 | Re-adding the realtime table broke the load; it is already in `schema.sql` | Removed from extras |
| N4 | Trigger text without schema names | Empty `search_path` in extras and catalog |
| N5 | `auth.saml_relay_states` points at a left-out table (live probe) | Left out |
| N6 | The dump container wrote root-owned files | `docker run --user` |
| N7 | The fallback manifest listed itself | Written outside the folder first |
| N8 | GnuPG's passphrase cache made a wrong passphrase "pass" | Drill script turns caching off |
| N9 | A GitHub hiccup in Prepare would skip the dump | Prepare's GitHub calls cannot fail the step |
| N10 | One bad local file would stop the PC fetching newer copies | Mirror notes the problem and keeps going |
| N11 | Nobody could read why a night failed (errors only inside the locked copy) | Known phrases only (connection, auth, timeout, "permission denied for table x"), never error text |
| N12 | The V2 switch edited `error_reports`, which may be empty on live | Removes one row from the first table with rows |
| N13 | Owner scripts could be run inside a Claude session, or edited later to leak | Absolute refusal inside Claude; he checks each script's sha256 before running it |
| N14 | The key script's default folder held his Windows user name (public repo) | Folder read from the private config |
| N15 | GitHub's token may refuse to tag a commit that changes workflows | Tags point at the first commit (untested) |
| N16 | Backups locked to a key Claude made itself would look fine | `MASTER_FPR` only from his own message; Phase 8 drill proves his passphrase opens them |
| N17 | The nightly schedule would start, fail and email him while the build is half done | Workflow pushed without its schedule; schedule added in Phase 7 step 4 (plan step, untested) |
| N18 | Testing the mirror (V8) would overwrite the real `PC_STATUS` | V8 runs with a fake `gh` and a temp state folder |
| N19 | The hosted drill and the README put a database password in a command line | Hidden prompt into `PGPASSWORD`; he runs those commands himself |

## What can still go wrong

- Up to about a day of changes lost; GitHub starts scheduled runs late (measured on this account: up to 9 hours).
- GitHub's runner holds the plain data during the job; Supabase's images (by tag, except Postgres) run beside it.
- This PC's GitHub token can delete whole releases; the PC user can delete local and OneDrive copies. Alarms fire; only his USB copy is out of reach.
- No passphrase and no key file: nothing opens. Paper copy of the passphrase is his choice.
- The mirror cannot see whether OneDrive uploads; OneDrive placeholders could make the key-file check fail falsely.
- A migration shipped during the dump can make one night falsely red (table list or structure).
- A failed upload loses that night's copy (red, alarmed); no retry.
- Untested until built: GitHub runner behaviour, immutable releases on this plan, SSH push of the workflow, the pooler with TLS + SCRAM, the live login statement through the Management API, the health and version endpoints with the anon key, notification delivery to his phone.

## Status log

- 2026-11-24: round 3 written (Opus 5.5). Drafts tested on throwaway copies (see "Reference files"). Nothing built; nothing written to live.
- 2026-11-26: approved ("lets go ahead with the entire plan"). Immutable releases first proven on another private repo of this account (on, read back true, off again).
- 2026-11-26: Phase 1 + Phase 6 step 3 shipped (a7ee20e7, Sonnet 5.5 build, hashes re-checked by Opus). Phase 3 steps 1-3 done. Next: the owner's Phase 0 looks and Phase 2 key.
- 2026-11-26: Supabase CLI 3.4.0 (`--linked` became `--remote`; `db query` needs `--read-only` or `--yes`) does not affect this build: `plan-backup.sh` and `set-reader-login.sh` call the installed `~/.local/bin/supabase` 2.120.0, and the runner downloads 2.120.0. Do not upgrade that binary before both scripts are updated, or the nightly life-plan export fails.

(The build session appends one dated line per phase: done / blocked, and why.)

## Build prompt (Sonnet 5.5, effort high)

Start: `claude --model sonnet` (Sonnet 5.5), effort high, in `/home/jonaswsl/projects/daygame-coach`.

> You build the database backups exactly as `Plans/database-backups.md` says. Read the whole plan and CLAUDE.md first. Do Phases 1, 3, 5, 6, 7 (your part) and 10, in that order, and nothing the plan does not list. Phases 0, 2, 4, 8 and his part of 7 are the owner's; Phase 9 is another session's; Phase 11 only if the Status log records his yes to D6.
>
> Rules:
> 1. Never create, see, print, store or move a password, passphrase or private key. Never run anything in `scripts/backup/owner/` (they refuse inside Claude anyway). Never open, copy, hash by hand or upload any `master-SECRET-*` file; only the mirror script hashes it. Never open `.env.local`; get the anon key only with the exact `grep` in Phase 3 step 4. `MASTER_FPR`, `MASTER_SUBKEY` and `SECRET_FILE_SHA256` come only from the owner's own message.
> 2. Copy the drafts from `~/.cache/daygame-research/backups-review/r3/drafts/` byte for byte. Before copying, check `sha256sum ~/.cache/daygame-research/backups-review/r3/drafts-r3.tar.gz` equals the plan's value. If a draft must change, stop and write why in the Status log; do not change an owner script at all.
> 3. Live database: no writes of any kind; read-only SELECTs only, through the linked folder named in `~/.config/daygame-backup/config`.
> 4. Delete nothing: no release, tag, backup file, OneDrive file or plain copy. `rm` only inside temp folders you made. Never `--clobber`. Never `gh auth refresh` or `gh auth login`; push the backups repo over SSH from `~/.cache/daygame-research/backups/daygame-backups`.
> 5. Every workflow run you start uses `-f alarm=false`, except the two runs in Phase 7. Push `nightly.yml` without its two `schedule:` lines in Phase 3 and put them back only in Phase 7 step 4.
> 6. Log scans only by script, printing counts (Phase 5 step 3). Never give a subagent a secret, a log excerpt or a user's email.
> 7. No spending. Any card prompt or paid plan: stop and tell the owner.
> 8. Public-repo files: `git commit --only <paths>`, ship with `node scripts/ship.mjs`. If the session-start line says main is red, find who broke it (`gh run list`, `git log`) and name it in the Status log; do not fix unrelated code; your ships wait until main is green.
> 9. When a phase needs the owner, append the Status log line, tell him in plain words exactly what to run or look at (the plan's commands, with the sha256 check), and end your turn. Continue when he answers.
> 10. If something is not covered by the plan, or a step fails twice, stop that step, write it in the Status log, and do not improvise.
> 11. Phase 6 step 3 only after the Status log records his yes to D1; step 4 only after D5.
>
> At the end, report in plain words: what is built, what each acceptance check showed, what waits for him, and "built, not yet attacked" until Phase 9 passes. Never call it safe or final.

## Attack prompt (Phase 9; fresh Opus 5.5, effort high)

> Read `Plans/database-backups.md` in /home/jonaswsl/projects/daygame-coach. Run every check V1-V17 in its "Verification checks" table against the real setup (private repo `reachjvc/daygame-backups`, the live database read-only, the timers and config on this PC). Trust no earlier "done". Never create, see or move a password, passphrase or private key; never open `master-SECRET-*` or `.env.local`, and never run the scripts in `scripts/backup/owner/`. Workflow runs you start use `-f alarm=false`. Tests that change something use temp folders, a temp config or the workflow's test switches; never touch the real copies. Do not delete anything. For each check: pass/fail, the exact command, and the output that proves it (counts and names only, no row data). Put back every setting you changed (V10) and show it is back. Report in plain words: which checks passed, which failed, and what must change.
