# Self-hosting behind Caddy, and a GitHub Actions pipeline that deploys it

**Status:** Phases 0–5 executed 2026-10-13 (session daygame-coach-6e, renamed daygame-coach-c5 after
WSL restarted). Phases 1–3 and 5 done. Phase 4 done except steps 4.6–4.7: this machine cannot pull a
private GHCR image yet, because the GitHub CLI login has no `read:packages` scope (B-GH, half open).
Staging publishing was switched on, and its first live run stopped at the privacy check as designed:
the package GitHub created was **public**. Publishing is switched off again until the owner makes
the package private (B-GHCR, R5).
Evidence is quoted under each phase; what is still open is in "Blocker state after Phases 1–5" and
under the STOP line. Phases 6–7 wait for the STOP line (a domain and a server).

**Written 2026-10-13** for an outside consultant who does not know this project, and for the AI session
that executes it. The `/goal` prompts are at the end. Three independent reviewers checked the plan
before it was committed; the fixes they caused are part of the plan now, not a separate list.

**Replaces `docs/plans/local-deploy-and-cd-pipeline.md` (2026-10-01).** That plan's Phase 1, the local
deployment, is still true and still running. Its later phases are re-planned here, because four of
their assumptions turned out to be wrong (see "What the 2026-10-01 plan got wrong").

**Where it sits.** It delivers vision items 14, 37 and 43 (`docs/product/vision.md`) and the hosting
half of item 36. In the owner's master plan for leaving Vercel and Supabase
(`docs/plans/own-platform-and-app.md`) it is M1.1 (build and boot), M1.7 (secrets, health check,
monitoring) and M1.8 (deploy pipeline). M1.0 ("the same app on your own server, still talking to
Supabase") is its acceptance test after the STOP line. **It does not touch the database.** Supabase
stays exactly as it is.

**Who owns what.** The browser test workflow, `.github/workflows/e2e.yml`, belongs to
`Plans/tests-worth-their-keep.md`, which another session rewrote today; its Phase 9 rebuilds that
workflow. This plan edits `e2e.yml` in exactly one place, the runner pin in step 2.3, agreed with that
plan's session first. The fix for the leaking test reports (C9) belongs to the session
`daygame-coach-bf`, which the owner asked to do it on 2026-10-13; this plan does not touch those files.
Everything else this plan adds to CI goes into `ci.yml` or into new files.

---

# PART 1 — In plain words

## Words used here

| Word | Meaning |
|---|---|
| Caddy | The web server in front of the app. It handles HTTPS and certificates by itself. |
| CI / CD | CI runs the checks on every push. CD delivers what passed to a server. |
| GHCR | GitHub's container registry, where the Docker images are stored. |
| Image, digest | A Docker image is the packaged app. Its digest (`sha256:…`) names one exact build. |
| Ratchet | A count that may only go down. A new problem fails the check; old ones are recorded in a baseline. |
| HSTS | A header telling browsers "only ever use HTTPS for this site". Right on a real domain, harmful on `localhost`. |
| ACME, HTTP-01 | How Caddy proves to Let's Encrypt that it controls the domain, so it can get a certificate. |
| CAA, SPF, DMARC | DNS records. CAA says which authority may issue certificates. SPF and DMARC say who may send email for the domain. |
| Tailscale | A private network between your own devices. Here it replaces public SSH. |
| cloud-init | The first-boot script a new server runs. |
| `proto` | Whether the visitor's connection was HTTPS, as Caddy reports it to the app (`x-forwarded-proto`). |
| B0, B3, B5, B7, D4, M1.x | Items in the master plan `docs/plans/own-platform-and-app.md`. Each is explained where it appears. |

## The short answer

1. **The local deployment with Caddy already exists and is running.** Checked today: https://localhost
   answers through Caddy, a signed-out visit to a private page is redirected to login, plain http is
   upgraded to https, and the app answers only through Caddy. This plan moves it onto the same kind of
   Docker image production will run. Every image is built from a commit, never from the working folder
   that several sessions share.
2. **CI is half smart.** The fast half (lint and type ratchets, about 6,500 unit tests, database tests
   on a real Postgres, a sweep that opens every page) runs on every push, takes about eight minutes and
   is green. The slow half, about 1,200 browser test runs, **has not run once since 2026-09-26**. Its
   last 63 runs were all red. The nightly run meant to replace it has **never fired**. GitHub reads
   schedules only from the default branch, `main`; `main` is about 430 commits behind and does not
   contain the schedule. Fixing that suite is another plan's job; this plan reports it and makes
   production wait for a person who can see it.
3. **CD, as designed here.** GitHub Actions builds one Docker image per environment, only after the
   checks on that commit have passed. It pushes the image to a private registry. Each machine runs a
   small deploy agent. The agent sees the new image within a minute, deploys it, checks
   `/api/healthz`, and **rolls back automatically** if the check fails. This works on this machine
   before any domain or server exists. Two things only you can give, a GitHub CLI login and the
   environment file, may be needed to finish it (blockers B-GH and B-ENV).
4. **The plan stops at the domain and the server.** The domain is the Cloudflare purchase you
   mentioned. The server is Hetzner. The owner chose that provider on 2026-09-27, and it is not
   reopened here.
5. **What we need from you is one sitting, listed at the STOP line:** buy the domain, open the Hetzner
   account, log the GitHub CLI in, and a short list of clicks.

## What exists today

Every row was checked on 2026-10-13, not copied from earlier notes.

| Thing | State | How it was checked |
|---|---|---|
| Local deployment (`infra/`) | Running since 2026-10-01. The app is a systemd user service on 127.0.0.1:3100; Caddy runs in Docker on ports 80 and 443 | `infra/run-local.sh --status`; `curl`: `/` 200, `/dashboard` 307, `http://` 308 |
| What it serves | A build from 2026-10-01 12:52. No committed app code changed since. The build was made from the shared working folder, so it may hold other sessions' unfinished edits from that hour; ten app files are being edited by other sessions right now. That is why Phase 3 builds from commits only. | `git log --since` on app paths: empty; `git status` |
| Owner's dev server | `npm run dev` on :3000, up 15 days. Whatever started it has since exited, so it belongs to no running session. It is the owner's daily driver, and this plan never restarts it. | `ps` (its parent is `/init`) |
| Caddy's local certificate | Valid to 2036. **Not trusted by Windows yet**, so the browser warns | `certutil -user -store Root` → not found |
| Repository | **Public** on GitHub. Default branch `main`; daily work happens on `training-rebuild` | GitHub API |
| `main` vs `training-rebuild` | `main` is 432 commits behind and can fast-forward cleanly. Its last 10 CI runs (2026-09-09 → 09-17) are red. Vercel deploys `main`. | `git rev-list`, `git merge-base --is-ancestor`, GitHub API |
| Production today | https://daygame-coach.vercel.app. It uses Supabase project `supabase-daygame` (US East), the **same project** that this machine's dev server and local deployment use | project reference found in Vercel's served JavaScript and in the local build |
| Second Supabase project | `CI_daygame` (EU West), created the day CI was set up. **Probably** what CI's secrets point at. GitHub secrets cannot be read back, so this is inference. | `supabase projects list` |
| Published CI artifacts | Three `playwright-report-fast` artifacts from today, downloadable by any signed-in GitHub user until 2026-10-20 | GitHub API (names and sizes only) |
| GitHub CLI | Installed (2.102.0), **not logged in** | `gh auth status` |
| `sudo` | Needs a password. Nothing in this plan needs it. | `sudo -n true` |

## Is CI doing smart work? The verdict

**Smart — keep it:**
- It runs on every branch, not only `main`.
- Lint errors and type errors may only go down (ratchets), so old errors never block new work again.
- About 6,500 unit tests run in about three minutes. Database tests run against a real Postgres in
  Docker.
- A route sweep opens every page on every push and catches pages that crash outright.
- `tests/unit/ciWorkflows.test.ts` fails if a browser test project stops being run by any job. That is
  a check on the checks, which most teams do not have.
- The whole push signal is green and takes about eight minutes.

**Not smart — fix it.** Each row was measured today.

| # | Problem | Evidence | Who fixes it |
|---|---|---|---|
| C1 | The heavy browser suite never runs. It runs only on pull requests into `main`/`beta` (none so far), on pushes to `main` (none since 2026-09-17), on a nightly schedule (never fired) or by a manual dispatch (never used; GitHub shows no "Run workflow" button, because `main`'s copy of the file has no such trigger). | GitHub API: 0 scheduled, 0 pull-request and 0 manual runs, ever. GitHub's docs: `schedule`, `workflow_dispatch` and `workflow_run` need the workflow file on the default branch. A workflow that has run before can still be dispatched from the CLI. | `tests-worth-their-keep.md` (its Phase 9). R8 below switches the nightly on. |
| C2 | When the heavy suite last ran, it was red: 63 of 63 runs from 2026-09-24 to 09-26. The last one ran 206 minutes of tests and then failed. | API job and step timings | `tests-worth-their-keep.md` |
| C3 | The branch production deploys from (`main`) is red and 432 commits old. | API | R8 at the STOP line |
| C4 | CI never produces the thing that ships. Vercel builds its own copy, and the build inside Playwright is thrown away. | workflow files | Phases 3–4. Afterwards the route sweep still tests Playwright's own build of the same commit, not the image. Running it against the image is a follow-up for `tests-worth-their-keep.md`'s Phase 9, which already builds once. |
| C5 | No dependency audit and no secret scanning. Today there are **22 dependency advisories (1 critical, 8 high)**, up from 10 on 2026-10-01. A full-history secret scan finds 3 hits, all test fixtures. | `npm audit`; `gitleaks git` | Phases 1–2 |
| C6 | CI runs on Node 20, which reached end of life on 2026-04-30. Runs print a deprecation warning for the GitHub actions they use. | run annotations | Phases 1–2 for `ci.yml`. `e2e.yml` belongs to the other plan. |
| C7 | `ubuntu-latest` moves to Ubuntu 26.04 **from 2026-10-19**, six days after this was written. Browser dependencies and Docker on a new OS release are what break first. | run annotation | Phase 2 (pin `ubuntu-24.04`) |
| C8 | `ci.yml` has no `concurrency` (two quick pushes run two full pipelines, and the older can finish last) and no explicit `permissions` (the token's rights depend on a repository setting). | workflow files | Phase 2 |
| C9 | **On this public repository, CI publishes Playwright reports as artifacts that any signed-in GitHub user can download, and every report holds a test password.** The report names each step after the value typed (`Fill "<value>"`), so the login step's password is in it even without a trace. Traces add network requests and session cookies on top. | `e2e.yml` uploads the report with `if: always()`; the step titles were verified locally by session `daygame-coach-bf` | Session `daygame-coach-bf` (the fix, under way 2026-10-13); B9 of `tests-worth-their-keep.md` (the live reports); R12 (changing the passwords) |

**One finding corrects the earlier plan.** It suspected the heavy suite was red because Playwright gives
the build only 120 seconds. That is refuted. The fast job uses the same 120-second budget and builds and
starts the app inside it on every push. The heavy job ran 206 minutes of tests before it failed. The
cause of the red is in the tests or the app, not in the timeout.

## How the finished system works

```
push to training-rebuild
  ├─ ci.yml: checks (lint · types · unit · database · audit ratchet · secret scan)
  │     └─ image-staging: waits for e2e.yml's run on the same commit to pass,
  │        builds the image, boots it and smoke-tests it, scans it, then pushes it
  │                 ──► ghcr.io/reachjvc/daygame-coach-staging  (private)
  └─ e2e.yml: route sweep (owned by tests-worth-their-keep.md)

this machine:  deploy agent, every 60 s ── pulls the new digest
               deploy.sh: start it → /api/healthz → keep it, or roll back
               Caddy (local certificate) ──► https://localhost

push to main   (after the STOP line)
  ├─ ci.yml: checks
  │     └─ image-production ── waits for the owner's approval click in GitHub
  │              ──► ghcr.io/reachjvc/daygame-coach-production (private)
  │              ──► the Hetzner server's deploy agent ──► https://<your domain>
  │                   Caddy (Let's Encrypt certificate, HSTS)
  │        verify-production: polls https://<your domain>/api/healthz until it reports this commit
  └─ e2e.yml: route sweep and the heavy suite (its result is visible beside the approval)
```

Nothing in GitHub can log into a server. Servers pull; GitHub only builds and publishes.

## The rules this plan follows — approve these

1. **The database is not touched.** Supabase stays exactly as it is. *If wrong:* nothing. This rule
   keeps the work free of one-way doors.
2. **Servers run only images CI built from a commit.** This machine may also build, but only from a
   commit or from an isolated scratch copy of one, never from the shared working folder. *If wrong:* a
   build freezes a 4 GB server (a build on this machine once took 29 GB), or a deployment contains
   another session's half-finished edit.
3. **One deploy path, with an automatic rollback.** People, the agent and every machine all use
   `infra/deploy.sh`. *If wrong:* two paths drift apart, and the one used in an emergency is the
   untested one.
4. **A red check cannot publish.** Staging waits for `ci.yml`'s checks and `e2e.yml`'s run on the same
   commit; production also needs the owner's click. *If wrong:* code the tests rejected reaches a
   server.
5. **Machines pull; GitHub holds no key that opens a server.** *If wrong:* deploy results are read from
   `/api/healthz` and the machine's log instead of the GitHub job, and they arrive up to a minute later.
6. **Nothing exists on a server that `infra/` did not put there**, except the secrets file. Changes
   after the first boot arrive the same way, through one script. *If wrong:* a server cannot be
   rebuilt, so nothing on it can be restored.
7. **New CI gates arrive as ratchets, not walls.** *If wrong:* a gate that is red on its first day
   teaches everybody to ignore red.

## What the 2026-10-01 plan got wrong

| It said | What is true | Consequence |
|---|---|---|
| Deploy with a `deploy.yml` triggered by `workflow_run` | `workflow_run` fires only for workflow files on `main`. `main` is 432 commits behind, and only the owner may move it. | It would never have fired. Replaced by jobs inside `ci.yml` (rule 4). |
| Staging deploys to this machine over SSH | GitHub's runners cannot reach a WSL machine behind a home router | Replaced by the pull agent (rule 5) |
| Pin Node 20.19.6 | Node 20 is end-of-life | Node 24 LTS |
| Container: `HOSTNAME=127.0.0.1` on `node:20-alpine` | Inside a container, 127.0.0.1 cannot be reached by Caddy. `onnxruntime-node` ships Linux binaries for glibc only (checked in `node_modules`), and Alpine uses musl. | Bind 0.0.0.0 inside the container and publish no port; use a Debian-based image |
| Likely cause of the red heavy suite: the 120-second build timeout | Refuted, see above | Dropped |
| `infra/caddy/Caddyfile.local` cites `docs/plans/local-deploy-caddy-and-cicd.md` | That file never existed | Pointer now leads here |

## Security, stated plainly and unasked

**First, the stage.** There are no users and no payments, so only one item below (the published test
reports) needs action this week. The rest is hygiene to finish before Phase 6 puts a server on the
internet, which is the moment exposure begins.

- **Published test reports (C9) — act first.** On this public repository every uploaded Playwright
  report is downloadable by any signed-in GitHub user. Even without a trace, the report names each step
  after the value it typed (`Fill "<value>"`), so every report uploaded so far holds the password typed
  at login. The session `daygame-coach-bf` verified this locally on 2026-10-13. The leak is being fixed
  by that session, not by this plan: a helper that sets passwords without naming them, trace settings
  switched off under CI, the trace upload removed, and a test that fails if either comes back. The
  live reports and the password change are B9 of `tests-worth-their-keep.md` and R12 below. **The test
  accounts' passwords should be treated as public and changed.**
- **Dependencies.** The critical advisory (remote code execution in `next/og`) is not reachable here,
  because nothing generates images. But the same patch release, `next` 16.3.8, also fixes two
  cache-poisoning advisories, one of them specific to self-hosted Next.js, which is what this plan
  builds. So the patch lands in Phase 1, before anything is public. The `sharp`/libvips advisories
  come in through `@huggingface/transformers`; fixing them needs a major upgrade of that library.
  Image optimisation is switched off in this app, so they are reported and left to their own change.
- **The image stays private.** A Next.js build writes secret keys into its output: the draft-mode
  preview keys (`prerender-manifest.json` and the middleware bundle) and the Server Actions encryption
  key (`server-reference-manifest.json`). Both were found in this machine's build output today. **Today
  the impact of a leak would be small:** the app uses no draft mode and has no inline Server Actions,
  so a leaked preview key buys an attacker forced re-renders and cache bypass, not data. It stops being
  small the day someone adds either feature. So:
  - the registry stays private, and each machine gets a read-only token;
  - each server sets its own `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` at runtime, which overrides the
    baked key;
  - Caddy strips the request headers that a leaked preview key would need (`x-prerender-revalidate*`,
    `x-middleware-subrequest`);
  - image builds never export or restore a build cache, because pull requests from forks can read
    some caches.
- **Secrets in a public repository.** Anything pushed is public at once. The history is clean today (3
  scanner hits, all test fixtures). Phase 2 adds a secret scan to CI **and** to the pre-push hook,
  because a CI scan reports a leak only after it is already public. Tests enforce that the image build
  receives no secret and that no `.env` file ends up in the image. The image is scanned before it is
  pushed, not after.
- **The servers.**
  - Only ports 80 and 443 are open to the internet, over IPv4 and IPv6.
  - SSH works only through Tailscale, from the owner's devices, through a policy that lets the server
    reach nothing on your private network (Q10).
  - Deploys need no inbound access at all.
  - The app container runs as a non-root user, with a read-only filesystem, no Linux capabilities and
    no route to the cloud metadata service.
  - Secrets live in one file per server. Be clear about what that protects: the `deploy` user can run
    Docker, and that is equivalent to root, so the file is readable by root-level accounts only. That
    is true of every option on a single server.
- **The approval click is a process gate, not a security wall.** Any workflow job that can publish
  images could, if someone edited it, publish a production image. Only the owner and this project's
  own sessions can push branches; pull requests from forks get no write token.
- **Trusting Caddy's local certificate on Windows (B-CA)** lets that certificate authority sign
  certificates your browser accepts for any site. Its private key stays in a Docker volume on this
  machine. That is the normal trade for local HTTPS, but it is the machine owner's decision, so it was
  not done for you.
- **Not in this plan, but load-bearing.** Both Supabase projects sit inside a Vercel-managed
  organisation, so cancelling Vercel may take the database with it. Transfer the organisation before
  Vercel is switched off (B0 of the master plan).

---

# BLOCKERS — things only a person can do

Each one was attempted on 2026-10-13, or is a refusal the executor is told to expect. The result is
what happened, not a guess.

| ID | What | Attempted, and what happened | Blocks | Recommendation |
|---|---|---|---|---|
| B-GH | Log the GitHub CLI in | `gh auth status`: not logged in. No token in the environment, no `~/.config/gh`, no GitHub CLI on the Windows side. A browser login started with a 25-second limit waited for a person to enter a code, as expected. | Steps 4.4–4.7; reading CI job logs; B9 of `tests-worth-their-keep.md` | In the WSL terminal: `gh auth login -s read:packages`, choose SSH. Two minutes. If the executor's attempt to pass values into `gh variable set` is refused, run `infra/github-config.sh` yourself (R4). |
| B-ENV | Scripts that read `.env.local` | Reading `.env.local` directly was refused today by the safety classifier. Running a script that reads it (as `infra/run-local.sh` already does) worked on 2026-10-01. A script that copies secrets into a second file may be refused. | Phase 3 onwards, if refused | If refused, run `infra/write-env-file.sh` once yourself (R13). It writes the runtime file and a file of the three public build values, both mode 600, outside the repository. |
| B-GHCR | Read-only registry tokens for the deploy agents (the image is private) | Nothing to test yet: no image exists. GitHub's own pages disagree on whether a package that a workflow creates starts private, so step 4.3 proves it with an empty placeholder image before any real image is pushed. | Step 4.5 (this machine) and Phase 6 (server) | Two classic tokens with only `read:packages`, 1-year expiry: one for this machine, one for the server (R5). GitHub's registry accepts only classic tokens. Until R5, this machine may use the GitHub CLI's own token. |
| B-DNS | Buy the domain on Cloudflare and create a DNS-only API token for it | No domain and no Cloudflare credential anywhere (`~/.cloudflared`, environment, repository). A purchase needs payment. | **STOP line**: Phase 6 | Cloudflare Registrar. Token with "Edit zone DNS" for that one zone, 30-day expiry. |
| B-HETZNER | Hetzner Cloud account, payment and API token | `hcloud` CLI installed today (1.68.0); `hcloud context list` is empty. An account needs payment and identity checks. | **STOP line**: Phase 6 | Open it first: Hetzner's account check can take one to two days. |
| B-TAILSCALE | A tag and access policy for the server, and a one-off auth key | Tailscale is installed on Windows. Nothing can create a key or change your policy without your login. | Phase 6 | Add `tag:prod` with the policy in Q10, then create a one-off, pre-approved, tagged key with 1-hour expiry (R6). |
| B-MAIN | Fast-forward `main` to `training-rebuild` | Possible without conflicts: `git merge-base --is-ancestor` is true, and `main` is 0 ahead and 432 behind. The same push was refused by the safety classifier on 2026-10-12 as modifying a shared resource, so it was not retried. It also redeploys the live Vercel site with current code. | The nightly heavy suite (C1); production deploys (Phase 6) | You run `git push origin training-rebuild:main` (R8). To revert: `git push --force-with-lease origin c1680654:main` |
| B-SUPABASE-REDIRECT | Add `https://localhost/**` now, and `https://<domain>/**` in Phase 6, to Supabase's redirect allow-list | Reading the setting was refused today by the safety classifier as a production read, and was not routed around. The last reading (2026-10-01) listed only the Vercel URL and `http://localhost:3000`. | Sign-up confirmation and password reset on any new address. Ordinary login works. | Supabase dashboard → Authentication → URL Configuration → add the two entries (R7) |
| B-CA | Trust Caddy's local certificate in Windows | Checked: not trusted. The command and path were verified on 2026-10-01 (`certutil -dump` through the network path). It was not installed, because it changes what your browser trusts, which is the machine owner's call. | Only a certificate warning on https://localhost | In Windows: `certutil -user -addstore Root "\\wsl.localhost\Ubuntu\home\jonaswsl\projects\daygame-coach\infra\caddy\local-root-ca.crt"`, or skip it (Q19) |
| B-DEVSERVER | Move the owner's dev server to Node 24 and the patched `next` | Not attempted on purpose. The dev server on :3000 is the owner's own process; a restart by an AI session would either be refused or leave the server dying with that session. | Nothing in this plan. Until then :3000 runs Node 20 and `next` 16.3.5 while CI and the image run the new versions. | R11: `nvm alias default 24.21.0`, then `npm ci` and restart `npm run dev` when convenient |
| B-CI-ARTIFACTS | Act on published reports that hold a test password (C9) | Listed the live artifacts today: three reports, live until 2026-10-20. Downloading one needs a login. The fix belongs to session `daygame-coach-bf`; the live reports are B9 of `tests-worth-their-keep.md`. It is listed here only so your return visit covers it. | Nothing in this plan | R12 |
| B-PEER-TREE | Another session's unfinished change breaks a check that runs on our commit, such as the pre-commit unit tests | May happen during execution; it cannot be attempted in advance | Committing, until the other session fixes its change | The executor records the failing test and the file, messages that session, and continues with work that needs no commit. It never edits another session's files. |
| B-REBOOT | See the local deployment come back after a restart | Uptime is 24 days, so this has never been observed. Not forced: restarting WSL would cut off the owner's editor and two other working sessions. | Nothing. The claim stays "configured, not observed". | Next time WSL restarts, run `infra/run-local.sh --status`. |
| B-UPTIME | An account with an external uptime monitor | Cannot be attempted: it needs your email and a sign-up | Phase 7 | healthchecks.io or UptimeRobot, free tier |
| B-SUDO | Administrator rights on this machine | `sudo -n true` asks for a password | **Nothing.** Worked around: tools live in `~/.local/bin`, Caddy binds port 443 through Docker, and services run as systemd user units. | None needed |

---

## Blocker state after Phases 1–5 (2026-10-13, end of execution)

| ID | State now | Evidence |
|---|---|---|
| B-GH | **Half open.** `gh` is logged in as reachjvc (done by the owner during the day), so `infra/github-config.sh` ran (step 4.4). Its token scopes are `gist, read:org, repo`: **no `read:packages`**, so this machine cannot pull the private image (steps 4.6–4.7). | `gh auth status`: "Token scopes: 'gist', 'read:org', 'repo'"; `gh api user/packages?package_type=container`: "You need at least read:packages scope to list packages. (HTTP 403)" |
| B-ENV | **Not hit.** `infra/write-env-file.sh staging` ran and wrote both files (mode 600, names only on screen). A direct `ls` of `.env.local` was refused and not routed around. | "ls from '/home/jonaswsl/projects/daygame-coach/.env.local' was blocked by a deny rule." |
| B-SHARED-DEPS (new) | **Closed by the owner.** Copying `package.json`, `package-lock.json` and `.nvmrc` into the shared folder was refused once; the owner then approved it in this session ("Yes, apply and commit"), and it landed in cdd7446a. | "Permission for this action was denied by the Claude Code auto mode classifier. Reason: [Modify Shared Resources]." |
| B-PEER-TREE | **Hit three times, each cleared by the peer.** The pre-commit hook failed on other sessions' uncommitted test work: `e2e-isolation.test.ts` and `lintRatchet.test.ts` (daygame-coach-ac, 14:17), then `e2e-isolation.test.ts` "stateful E2E tests must use serial mode" (daygame-coach-7c, fixed in b8d823d0). CI's type ratchet was red from 7e66dd8a (`tests/e2e/blackbox-seed-race.spec.ts:96` TS2769) until c86b601c; the CI run on efe1ab1f, before any commit of this plan in that window, failed the same step. | messages in this session; CI runs 38408000694 and 38408593068 (Type-check ratchet: failure) |
| B-REBOOT | **Closed: observed.** WSL restarted at 17:49 (not by this plan). Without anyone acting, `dg-app` and `dg-caddy` came back healthy, `https://localhost/api/healthz` answered 200 with the deployed commit, and the agent timer fired 30 s after boot. | `who -b`: "system boot 2026-10-13 17:49"; healthz `{"status":"ok","buildId":"d9e675e4805b40e0ec3abd2ba7ba3704fc7758ed","db":"ok","proto":"https"}`; journal "17:50:01 agent: infra checkout e10f08ee60af; watching …" |
| B-DISK (new) | **Open, owner's.** C: holds WSL's virtual disk and is 99 % full (30 GB free). A full C: detached WSL and killed every session today (recorded by the site-structure plan's session). This plan's buildx builder held **30 GB of build cache** on that disk at the time, so its image builds very likely contributed. The cache was pruned to 4 GB, and `infra/build-image.sh` now refuses to build below 20 GB free on C: and trims the cache after every build (a1f82f6b). Space freed inside WSL is reused but does not shrink the file on C:. | `df -h /mnt/c`: "1.9T 1.8T 30G 99%"; `docker buildx prune --builder dg-capped --keep-storage 4gb`: "Total: 26.49GB" |
| B-DEVSERVER | **Open, and the dev server is down.** The WSL restart at 17:49 stopped the owner's `npm run dev` on :3000. This plan does not start it (R11). | `curl http://localhost:3000/`: 000 after the restart (200 before) |
| B-CI-ARTIFACTS / R12 | **R12 done by daygame-coach-bf**: the three test accounts have new passwords, every session revoked, the 10 reports holding the old ones deleted, `.env.local` and the CI secrets updated. New report artifacts keep being uploaded by e2e.yml (23 now); since f92a16f1 they type passwords through `fillSecret`, so their step names hold none (not downloaded here). | bf's message 2026-10-13; `gh api repos/reachjvc/Daygame_coach/actions/artifacts`: "total_count=23" |
| B-GHCR | **Open, and now concrete.** The first live `image-staging` run pushed an empty placeholder to create `ghcr.io/reachjvc/daygame-coach-staging`; GitHub made the new package **public**, as this plan's "What would make this plan wrong" foresaw, and the privacy check stopped the job before any real image. The package holds only that placeholder: one text file, nothing from the app. CI no longer creates packages (8c17898d), and `STAGING_PUBLISH` is `off` again. | run 38429479662: "ghcr.io/reachjvc/daygame-coach-staging:placeholder can be read without logging in: the package is PUBLIC. Stopping before any image is pushed."; anonymous manifest request: 200 |
| B-DNS, B-HETZNER, B-TAILSCALE, B-MAIN, B-SUPABASE-REDIRECT, B-CA, B-UPTIME | Unchanged: open, the owner's (R1–R10). | — |

# OPEN QUESTIONS — every one decided, with the cost if the decision is wrong

| # | Question | Decision (recommendation) | Alternative | Cost if wrong |
|---|---|---|---|---|
| Q1 | How does a new build reach a machine? | **The machine pulls.** A systemd timer runs `infra/deploy-agent.sh` every 60 s; it deploys a new image through `deploy.sh`, checks health, and rolls back on failure. GitHub only builds and publishes. This works on this machine, GitHub holds no server key, and port 22 stays closed. | GitHub Actions logs in over SSH and deploys (the master plan's default, its B7) | Deploy results appear in `/api/healthz` and the machine log, up to a minute late, rather than in the job. Switching later is one job calling the same `deploy.sh`. |
| Q2 | How does publishing wait for the browser checks, which live in another workflow? | **Keep `e2e.yml` separate; it belongs to `tests-worth-their-keep.md`.** `image-staging` waits for `e2e.yml`'s run on the same commit through a short API check (`scripts/ci/await-workflow.mjs`). Cross-workflow triggers cannot do this, because they fire only from `main`. | Merge `e2e.yml` into `ci.yml` | A polling step of up to 45 minutes inside the staging job. The merge would have collided with the other plan's Phase 9. |
| Q3 | Which Node version? | **24 LTS (24.21.0)**, supported until April 2028 | 22 (supported until April 2027) | One major upgrade, proven by every test suite before it lands |
| Q4 | Which container base image? | **Debian slim (`node:24.21.0-…-slim`), pinned by digest** | Alpine | A bigger image. Alpine would break `onnxruntime-node`, which ships glibc builds only. |
| Q5 | Public or private image, and how many packages? | **Private, two packages:** `daygame-coach-staging` and `daygame-coach-production`, so pruning one environment can never delete the other's rollback image. Built without provenance or SBOM attachments, so every stored version is one tagged image. The newest 10 of each are kept. | One public package | One token per machine to create and renew. GitHub's billing for private container storage is unclear; if a quota bites, pushes fail loudly and pruning keeps usage small. |
| Q6 | Where do configuration values live? | **Public build values** (Supabase URL, anon key, app URL) as GitHub *environment* variables of `staging` and `production`. **The on/off switches** `STAGING_PUBLISH` and `PRODUCTION_PUBLISH`, and `SITE_DOMAIN`, as *repository* variables: a job's own `if:` cannot read environment variables. | A committed file | Needs B-GH before the first CI image |
| Q7 | Must production wait for the heavy suite? | **Production needs `ci.yml`'s checks and the image's own smoke test, then the owner's approval click.** `e2e.yml`'s result for the commit is beside the button. It becomes a hard requirement when `tests-worth-their-keep.md` reaches its Phase 9 acceptance (one pull-request run green). This deviates from the master plan's M1.8 ("green once is a precondition"): that suite has not run since 2026-09-26 and was red 63 times in a row, so a hard gate would mean no production until another plan finishes. | A hard gate now | A commit that fails browser tests can reach production if the owner approves without looking. |
| Q8 | Where is the server? | **Hetzner Ashburn (US East)**, while the database is Supabase in US East. Every page makes several database calls, and an EU server would add about 90 ms to each. Revisit when the database moves (master plan M2). | Falkenstein, Nuremberg or Helsinki | One server rebuild later. It is cheap, because rule 6 makes the server reproducible. |
| Q9 | One server or two? | **One production server; this machine is staging.** There are no users yet. | Two servers (the master plan's default) | About €5 a month and twice the upkeep, deferred until there are users |
| Q10 | How do you reach the server? | **Tailscale SSH only. OpenSSH is turned off, and port 22 is closed to the internet.** The server carries `tag:prod`: tagged devices do not expire. The Tailscale policy lets the owner reach `tag:prod` port 22 in "check" mode (a browser confirmation every 12 hours), and lets `tag:prod` reach nothing. Deploys need no SSH (Q1). For emergencies there is Hetzner's web console; it needs a root password reset first, which Phase 6 rehearses once. | Key-only OpenSSH on port 22 with fail2ban | During a Tailscale outage you use the web console. |
| Q11 | Turn on Cloudflare's proxy (orange cloud)? | **Off (DNS only) to start.** Caddy owns TLS end to end, which leaves one less layer to debug. | On: it hides the server's IP and absorbs attacks, but needs `trusted_proxies` so the app sees real visitor IPs | No IP hiding until it is turned on, which is one click |
| Q12 | How does Caddy prove it owns the domain? | **HTTP-01 with Let's Encrypt as the only issuer**, so no Cloudflare token sits on the server and the CAA record can name one authority | DNS-01 (a custom Caddy build and a token on the server) | Port 80 must stay open, which it does anyway for the http-to-https redirect |
| Q13 | Infrastructure as code? | **Shell scripts with `--dry-run`**: `hcloud` for the server and firewall, the Cloudflare API for DNS, and `sync-infra.sh` for every file on the server, at a named commit | OpenTofu or Terraform | Fine for one server and five records; revisit at two servers |
| Q14 | Where do server secrets live? | **One env file per server, mode 640 root:deploy**, outside the repository and the image, copied over Tailscale | A SOPS/age-encrypted file in git | Root-level accounts can read it, as on every single-server setup |
| Q15 | How does the heavy suite get its nightly run? | **It is `tests-worth-their-keep.md`'s job.** The nightly needs the workflow file on `main`, so R8 (fast-forwarding `main`) is the owner's part. | Make `training-rebuild` the default branch | No nightly until the owner acts |
| Q16 | Switch this machine's default Node to 24? | **Yes, by the owner (R11)**, so the dev server runs what production runs. The executor never changes it. | Keep 20 for daily work | Another project on this machine that needs 20 runs `nvm use 20`. Revert: `nvm alias default 20.19.6`. |
| Q17 | Which runner image? | **Pin `ubuntu-24.04`** before 2026-10-19; move to 26.04 deliberately later | Ride `ubuntu-latest` | Missing 26.04's improvements for a while |
| Q18 | What server size and CPU type? | **The smallest shared x86 server with at least 4 GB RAM**, about €5–10 a month (check current prices). x86, because CI builds x86 images. | ARM: cheaper, but needs ARM images | A few euros a month |
| Q19 | Trust the local certificate? | **Only if you will use https://localhost.** From Phase 6 on, the real domain has a real certificate. | Trust it now | A warning click on localhost |
| Q20 | Which database does staging talk to? | **The same Supabase project as production.** That is the status quo: the dev server already does. Staging here means "the next build", not separate data; separate data arrives with the database move. Every future migration must therefore work with the previous image and with Vercel's `main` at the same time. | The `CI_daygame` project, which needs its service key on this machine | A staging bug can write to real data, the same exposure the dev server has every day |
| Q21 | Who keeps pinned versions (action commits, image digests) current? | **Dependabot, but only after `tests-worth-their-keep.md`'s Phase 9 has rebuilt `e2e.yml`.** Its pull requests touch every workflow, and its runs get no repository secrets. Until then, `infra/RUNBOOK.md` lists a monthly check. | Dependabot now | Pins can go stale for a few weeks |

---

# PHASES

Each phase ends in a working state, names its acceptance checks (run, not asserted), and says what it
depends on. Where a step needs a blocker, the phase says what to do instead, and work continues.

## Phase 0 — Inventory, tools, blocker attempts. **Status: done 2026-10-13**

- Installed to `~/.local/bin`, each download verified against the publisher's checksum file or GitHub's
  recorded digest: `gitleaks` 8.30.1, `shellcheck` 0.11.0, `hadolint` 2.15.1, `jq` 1.8.2, `hcloud`
  1.68.0. Installed `docker buildx` 0.37.2 to `~/.docker/cli-plugins`, because it was missing.
  Installed Node 24.21.0 through nvm **without** changing the default, which is still 20.19.6.
- Already present: `gh` 2.102.0, `caddy` 2.11.4, `actionlint` 1.7.12, `docker compose` 5.5.1, Docker
  29.1.3.
- Proven on this machine:
  - a buildx builder created with `--driver docker-container --driver-opt memory=12g --driver-opt
    memory-swap=12g` really is capped (`HostConfig.Memory=12884901888`);
  - `cloud-init schema --config-file` validates a file inside a throwaway `ubuntu:24.04` container
    (cloud-init 26.1).
- Local deployment verified as running; CI audited (above); every blocker attempted (above).
- Pointers fixed. The old plan carries a "superseded" banner, and `infra/README.md`,
  `infra/caddy/Caddyfile.local` and `tests/unit/infra/localDeploy.test.ts` now point here.

## Phase 1 — Patched, pinned and observable. **Status: done 2026-10-13**

**Depends on:** nothing. **Working state:** the app reports its own health and version, refuses to
start when misconfigured, and has no critical advisory in what ships.

1. **The leaking test reports (C9) are fixed elsewhere.** Session `daygame-coach-bf` owns that fix (see
   Security), so this plan does not edit `tests/e2e/`, the trace settings, or `e2e.yml`'s upload steps.
   Before Phase 4 publishes anything, check with `git log` that the fix has landed. If it has not,
   record that in the blocker table and continue.
2. **Set up an isolated worktree** for everything that changes dependencies, Node or the build:
   `git worktree add --detach <scratchpad>/wt HEAD`, then use Node 24 by path
   (`PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH`; `nvm` is not loaded in non-interactive shells)
   and run `npm ci` there. Gates and deliberate-break checks run in the worktree. Finished changes reach
   the shared folder as a patch, applied only to files that `git diff` shows clean. **The shared
   folder's `node_modules` is never changed by this plan**, so the owner's dev server and the running
   local deployment are untouched.
3. **Upgrade `next` 16.3.5 → 16.3.8 and `eslint-config-next` 16.0.10 → 16.3.8, both exact.** In the
   worktree, run `npm install --save-exact next@16.3.8 eslint-config-next@16.3.8`, then `npm audit fix`
   (never `--force`).
   *Acceptance, in the worktree:* `npm audit` shows no critical in shipped dependencies; the lint
   ratchet, the type ratchet, `npm test` and `npm run build` pass. Then apply the `package.json` and
   `package-lock.json` patch to the shared folder. The shared `node_modules` keeps 16.3.5 until the
   owner runs R11. Tell the peers so.
4. **Move to Node 24.** Write `.nvmrc` = `24.21.0` and add `"engines": {"node": ">=24 <25"}` to
   `package.json`. Every gate in step 3 already ran on Node 24, which is the proof. The owner's default
   Node and dev server move with R11.
5. **Give every build one identity: the full 40-character commit SHA.** Move `buildId()` out of
   `next.config.mjs` into `scripts/build-id.mjs`:
   - order: `BUILD_SHA` (set by CI and Docker), then `VERCEL_GIT_COMMIT_SHA`, then `git rev-parse HEAD`;
   - if none answers, the build **fails** and names `BUILD_SHA` — never "unknown".

   Docker builds also set `NEXT_DEPLOYMENT_ID` from the same value. Per Next 16's `deploymentId` guide,
   a browser tab left open across a deploy then reloads instead of asking for files that are gone.
   Change `next.config.mjs` in one edit, because each edit restarts the owner's `next dev`.
   *Acceptance:* a unit test covers all four cases, including the failure message.
6. **Add `/api/healthz`.** The route is `app/api/healthz/route.ts`; the database probe is
   `src/db/readinessProbe.ts`, because only `src/db/` may import Supabase. **`healthRepo.ts` and
   `app/api/health/` are the health-tracking feature — a different thing.**
   - It returns `{status, buildId, db, proto}`.
   - 200 when a cheap query with the anon key answers within 2 s, 503 otherwise.
   - The probe's result is cached for 10 s, so the endpoint cannot be used to hammer the database.
   - It shows no error text, sets `Cache-Control: no-store`, needs no authentication and contains no
     secrets.
   - `proto` is what `requestIsHttps()` concludes.
   - The `proxy.ts` matcher does not intercept it (checked).
   *Acceptance:* unit tests cover 200, 503 when the probe throws, 503 when it times out, the cache, and
   `proto`. `curl localhost:3000/api/healthz` cannot be the acceptance check: :3000 serves the shared
   folder and runs Node 20. The live check is Phase 3's.
7. **Fail fast on missing runtime configuration.** `scripts/check-runtime-env.mjs` is the one list of
   every environment variable the app needs. Each one is classed as *build-time public*, *required at
   runtime* or *optional feature*. The list has two parts:
   - the 19 names read through `process.env.X` today;
   - an **implicit** part for variables that libraries read themselves. It starts with
     `ANTHROPIC_API_KEY`, which `@ai-sdk/anthropic` reads in `src/qa/providers/claude.ts` and two other
     files without any `process.env` text.

   An optional feature must say "not configured" when used; it never falls back silently. The container
   runs this script before the server starts. Two unit tests guard the list: one fails on a
   `process.env.X` that is not listed, the other on an import of a known self-configuring SDK whose
   variable is not listed. Replace the two `|| "http://localhost:11434"` defaults
   (`src/qa/config.ts:9`, `src/inner-game/config.ts:244`) with an explicit "not configured" error.
   `OLLAMA_API_URL` is present in `.env.local` (key name checked today), so the owner's local features
   keep working.
   *Acceptance:* the script exits non-zero and names a required variable that was removed. Each scan
   test fails on a deliberate unlisted case, in the worktree only, never in the shared folder.
8. **Commit and push.** Commit with `git commit --only <paths>`, push, and read the CI result with
   `curl` (Part 2 says how). *Phase acceptance:* CI is green on the pushed commit, or a failure caused
   outside this plan's diff is recorded with its evidence.

### Phase 1 evidence (2026-10-13)

- **1.1** `git log`: f92a16f1 "CI's public test reports carried the test accounts' passwords"
  (12:19), by daygame-coach-bf. R12 was then done by the same session (see the blocker state).
- **1.2** `git worktree add --detach <scratchpad>/wt HEAD`, Node 24.21.0 by path, `npm ci`: "added 957
  packages". It was recreated after WSL restarted at 17:49 and wiped `/tmp`.
- **1.3** `npm audit --omit=dev` before: `"critical": 1`; after the upgrade and `npm audit fix`:
  `{"low":3,"moderate":6,"high":2,"critical":0,"total":11}`. On Node 24 in the worktree: "Lint errors:
  322, none new."; "Type errors: 98, none new."; "Tests 4558 passed | 1 skipped (4559)"; `npm run
  build`: "✓ Compiled successfully in 71s", exit 0 (built with placeholder public values, because
  `.env.local` is not readable from the worktree). Applying the patch to the shared folder was refused
  by the classifier (B-SHARED-DEPS) and then approved by the owner: cdd7446a. **Incident, stated:**
  one copy of `package.json`/`package-lock.json` from a stale worktree base overwrote a peer's
  committed removal of testcontainers (3aaea00e) in the working folder for a few seconds; it was
  restored with `git checkout HEAD --` before anything was committed, and the patch was regenerated
  on the current base. The shared `node_modules` was never changed. Peers were told.
- **1.4** `.nvmrc` = 24.21.0 and `"engines": {"node": ">=24 <25"}`, in cdd7446a. Note for R8: Vercel
  reads `engines`, so the next deploy of `main` builds on Node 24.
- **1.5** `scripts/build-id.mjs`, dbe09f12; `tests/unit/infra/buildId.test.ts`: "Tests 6 passed" (all
  four sources, the failure naming BUILD_SHA, and a short SHA refused). The same edit of
  `next.config.mjs` carries step 3.1's self-hosted switch, to restart the owner's dev server once;
  `http://localhost:3000` answered 200 before and after it.
- **1.6** `app/api/healthz/route.ts` and `src/db/readinessRepo.ts` (named `readinessProbe.ts` in this
  step; renamed after review, because all database access goes through `src/db/*Repo.ts`; a HEAD query on the public
  `values` catalogue): "Tests 9 passed" (200, 503 on a throw, false after 2 s with the query aborted,
  one probe per 10 s shared by concurrent callers, failures cached too, proto from the first hop).
  The live check is Phase 3's.
- **1.7** `scripts/check-runtime-env.mjs`: with `SUPABASE_SERVICE_ROLE_KEY` removed it printed
  "check-runtime-env: SUPABASE_SERVICE_ROLE_KEY is required and not set — error reports, tracking,
  embeddings and backups write with it." and exited 1. Deliberate breaks in the worktree: an unlisted
  `process.env.UNLISTED_PROBE_X` failed with `"UNLISTED_PROBE_X (src/shared/ollama.ts)"`; an import of
  `@ai-sdk/openai` failed with `"OPENAI_API_KEY, read by @ai-sdk/openai (src/shared/ollama.ts)"`. Both
  Ollama defaults are gone (`src/shared/ollama.ts` says "Ollama is not configured"). The container
  also refuses `ENABLE_TEST_ROUTES=true`.
- **1.8** dbe09f12 turned CI's lint ratchet red ("3 lint error(s) that are not in
  eslint-baseline.json", `no-redeclare` from two `/* global */` comments; run 38401588068, reported
  by daygame-coach-ac) — this plan's fault, fixed in 0831d87c. The type ratchet then stayed red from
  a peer's 7e66dd8a until c86b601c (B-PEER-TREE). First green CI with this plan's code: 88e71125, run
  38411441358 "CI completed success".

## Phase 2 — CI earns its minutes. **Status: done 2026-10-13**

**Depends on:** Phase 1 (`.nvmrc`, and the patched `next`). **Working state:** `ci.yml` is honest about
what it ran, checks dependencies and secrets, and cannot be surprised by a runner upgrade.

1. **Scope.** This phase changes `ci.yml`, adds new scripts and tests, and makes one edit to `e2e.yml`
   (step 3). `tests/unit/ciWorkflows.test.ts` also belongs to the other plan; new assertions go into
   `tests/unit/ci/pipelineRules.test.ts`.
2. **Modernise `ci.yml`.**
   - **Concurrency:**
     `group: ci-${{ github.event_name }}-${{ github.ref }}${{ github.ref == 'refs/heads/main' && format('-{0}', github.run_id) || '' }}`
     with `cancel-in-progress: ${{ (github.event_name == 'push' || github.event_name == 'pull_request') && github.ref != 'refs/heads/main' }}`.
     Superseded pushes stop. Runs on `main` never cancel or queue each other, because a production run
     may sit waiting for approval.
   - `permissions: contents: read` at the top; publishing jobs add only what they need.
   - `runs-on: ubuntu-24.04` (C7).
   - `actions/checkout` and `actions/setup-node` move to their current major (v7 on 2026-10-13). Read
     the tags with `git ls-remote`, not the rate-limited API. `setup-node` reads
     `node-version-file: .nvmrc`.
3. **This plan's only edit to `e2e.yml`: `runs-on: ubuntu-24.04`**, because the Ubuntu 26.04 switch on
   2026-10-19 lands before the other plan's Phase 9. It is agreed with both sessions that touch that
   file (`daygame-coach-ac` and `daygame-coach-bf`), and the other plan's Phase 9 keeps it. Still send
   them a one-line `SendMessage` before editing, because sessions change. **If it is still 2026-10-18 or earlier when the executor gets here,
   do this step first,** before Phase 1's other steps.
4. **Add a dependency audit, as a ratchet** (rule 7). `scripts/audit-ratchet.mjs` plus
   `audit-baseline.json`, which records advisory IDs per package version.
   - It **fails** when the pushed lockfile adds or changes a package version that carries an advisory,
     or when any critical sits in shipped dependencies (`--omit=dev`).
   - Advisories newly published against versions that did not change only produce a warning in the run
     summary. Otherwise the whole repository would turn red overnight with no commit at fault, and
     staging publishing would stop with it.
   - When an advisory disappears, it says which baseline line to delete.
   - If `npm audit` itself cannot run (network), it retries once and then **fails**: "could not check"
     is never a pass.
   - Add `npm run audit:ratchet` and include it in `npm run ci` and in `ci.yml`'s `checks` job.
   *Acceptance:* unit tests with fixture JSON cover each rule above, plus empty and malformed output.
5. **Scan for secrets before and after a push.**
   - `.gitleaksignore` holds the 3 known fixture findings, each with a comment saying why.
   - `ci.yml` checks out with `fetch-depth: 0`, downloads gitleaks 8.30.1, verifies its checksum, and
     runs `gitleaks git --redact --exit-code 1` over the full history (about 10 s).
   - `.husky/pre-push` reads git's ref lines from stdin **before** its ratchets run, and skips deletion
     lines. For a new branch (remote SHA all zeros, or not present locally — check with
     `git cat-file -e`) it scans `--log-opts="<local> --not --remotes"`; otherwise it scans
     `<remote>..<local>`.
   - This scan **blocks** the push. The hook's ratchet part stays advisory, for the reason its own
     comment gives: the ratchets measure the shared working folder, while this scan measures exactly the
     commits being published.
   - Call `$HOME/.local/bin/gitleaks` by absolute path when it is not on `PATH`. If it is missing, fail
     with install instructions; never skip.
   *Acceptance:* in a scratch clone outside the repository, with `core.hooksPath .husky` set and a
   scratch bare repository as its remote, a commit containing a fake key is refused by the hook and by
   `gitleaks git`. The clone and the bare repository are then deleted. Nothing is pushed to GitHub.
6. **Add `tests/unit/ci/pipelineRules.test.ts`.** It fails when:
   - any workflow uses `pull_request_target` or `workflow_run`;
   - `ci.yml` lacks top-level `permissions: contents: read` or the concurrency rule;
   - a publishing job runs on `pull_request`, or uses any secret except `GITHUB_TOKEN`;
   - a publishing job uses a third-party action not pinned to a 40-character SHA.

   Guarding the test reports themselves is `daygame-coach-bf`'s test, not this one.

   Each rule is broken once on purpose in the worktree, seen to fail, and restored.
7. *Phase acceptance:*
   - `actionlint` is clean; it runs `shellcheck` over every `run:` block.
   - The pushed `ci.yml` run is green in under 12 minutes.
   - Pushing again while that run is still in progress cancels it (checked once through the API).

### Phase 2 evidence (2026-10-13)

- **2.2** 5036e193: `permissions: contents: read`, the concurrency rule, `ubuntu-24.04`, checkout and
  setup-node v7 with `node-version-file: .nvmrc`; the job is now called `checks`. The peer's
  `supabase/setup-cli` step (3aaea00e) was merged in unchanged.
- **2.3** Done first, on 2026-10-13. Both owners of `e2e.yml` agreed by message. Because the file then
  also held daygame-coach-ac's uncommitted project-list edits, ac committed it with the three
  `runs-on: ubuntu-24.04` lines in 9274a742, crediting this step.
- **2.4** `scripts/audit-ratchet.mjs` + `audit-baseline.json` (5 vulnerable versions):
  "Dependency audit: 5 vulnerable package version(s), none new."; `tests/unit/ci/auditRatchet.test.ts`
  "Tests 13 passed" (each rule, plus empty, non-JSON, error and non-report output, and a fake `npm`
  that fails twice: "could not check, so this is a failure, not a pass", 2 attempts).
- **2.5** `gitleaks git` over 751 commits: "leaks found: 3", all non-secrets, now in `.gitleaksignore`:
  "no leaks found". Scratch clone with `core.hooksPath .husky` and a scratch bare remote: a clean
  push passed ("no leaks found", "* [new branch] main -> main"); a commit with a fake `ghp_` token was
  refused as a range ("pre-push: gitleaks found a secret in the commits for refs/heads/main
  (refs/heads/main). Push refused.", exit 1) and as a new branch (refs/heads/feature, exit 1);
  `gitleaks git` also found it ("leaks found: 1"); the bare repository held only the clean commit; a
  missing gitleaks refused the push with install instructions; a deletion was skipped. Both were
  deleted. The old `.husky/pre-push` had been removed in c9a9d65b ("never blocked; CI is the gate"),
  so the new one is the secret scan alone. Every push since ran it, e.g. "2 commits scanned … no
  leaks found".
- **2.6** `tests/unit/ci/pipelineRules.test.ts`, each rule broken once on the real files in the
  worktree and seen to fail: `pull_request_target` and `workflow_run` triggers; top-level permissions
  removed; `cancel-in-progress: true`; `ubuntu-latest`; the gitleaks checksum line removed; and, once
  the staging job existed, a pull-request condition, a `secrets.DEPLOY_PAT`, an unpinned
  `actions/checkout@v7`, an unpinned action inside the composite action, and a build cache.
- **2.7** `actionlint`: clean. e10f08ee: `checks` succeeded in 227 s ("Secret scan: success",
  "Dependency audit ratchet: success"). Cancellation, seen through the API: the run for d8c955ee
  (38414887900) was cancelled when e10f08ee was pushed: "Canceling since a higher priority waiting
  request for ci-push-refs/heads/training-rebuild exists".

## Phase 3 — One artifact: a Docker image built from a commit, and this machine runs it. **Status: done 2026-10-13**

**Depends on:** Phase 1. **Working state:** https://localhost serves an image built from a named commit,
behind Caddy, and a bad deploy undoes itself.

1. **In `next.config.mjs`, apply the self-hosting settings only when `NEXT_OUTPUT=standalone`:**
   `output: "standalone"` and `experimental.isrFlushToDisk: false`. On a read-only filesystem Next can
   then keep regenerated pages in memory, instead of failing to write them into the image. Vercel's
   build stays untouched while it is still production.
2. **Write `infra/Dockerfile`** (Q4) in three stages:
   - *deps:* `HUSKY=0 npm ci`.
   - *build:*
     - the build arguments `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
       `NEXT_PUBLIC_APP_URL` and `BUILD_SHA` are required, and the build stops if any is empty;
     - set `NEXT_OUTPUT=standalone` and `NEXT_DEPLOYMENT_ID=$BUILD_SHA`, and label the image
       `org.opencontainers.image.revision=$BUILD_SHA`;
     - `scripts/build.sh` gains a third case, `BUILD_CONTEXT=container`: webpack only, Node heap
       capped, no systemd scope;
     - never set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` at build time.
   - *runtime:*
     - copy the standalone server, `.next/static` and `public/` (standalone copies neither of the last
       two by itself);
     - run as user `node`, with `HOSTNAME=0.0.0.0` and `PORT=3000` inside the container — it stays
       private because no port is published;
     - add a `HEALTHCHECK` against `/api/healthz`;
     - start with `sh -c 'node scripts/check-runtime-env.mjs && exec node server.js'`. The `exec`
       matters: without it the stop signal stops at `sh`, and Next never drains in-flight requests.
3. **Write `.dockerignore` as an allow-list:** everything excluded, then the build's inputs included
   again. A new secret file then can never slip in by default. Paths the app reads at runtime are found
   by running the route sweep against the container (step 10), not guessed.
4. **Write `infra/build-image.sh`.** It has two modes:
   - `infra/build-image.sh <commit>` builds from `git archive <commit>`: tracked files at that commit
     only. Acceptance checks use this mode.
   - `--worktree <dir>` builds from the isolated worktree, for quick iteration before a commit.

   Both go through a buildx builder named `dg-capped`, created with `--driver docker-container
   --driver-opt memory=12g --driver-opt memory-swap=12g`. The script refuses to build if `docker
   inspect` does not show the limit. It reads `~/.config/daygame/build-public.env`, written by step 6,
   and never prints values. It never exports or imports a build cache.
5. **Write `infra/compose.yaml`**, the same file on every machine, with `name: infra` so it takes over
   the running Caddy cleanly.
   - `app`:
     - image `${APP_IMAGE:?}` and `env_file: ${APP_ENV_FILE:?}`;
     - `init: true`, `restart: unless-stopped` and `stop_grace_period: 30s`;
     - a read-only root filesystem, with size-capped tmpfs mounts: `/tmp` 64 MB and `.next/cache`
       256 MB. Never mount anything over `.next/server`, which holds the prerendered pages. tmpfs counts
       against the memory limit;
     - `cap_drop: [ALL]`, `no-new-privileges` and a 2 GB memory limit;
     - capped logs;
     - **no `ports:`**.
   - `caddy`:
     - `caddy:2.11-alpine`, pinned by digest;
     - ports 80, 443 and 443/udp;
     - the existing volumes `infra_caddy_data` and `infra_caddy_config`, so the local root certificate
       does not change;
     - Caddyfile `${CADDYFILE:?}`;
     - capped logs and `restart: unless-stopped`.
   - Both join one private network with IPv6 enabled. Without it, every IPv6 visitor would appear to
     the app as the network gateway. Caddy reaches the app as `app:3000`.
   - `infra/caddy/common.caddy` holds what both Caddyfiles share:
     - compression and a 10 MB body limit;
     - no `Server` or `X-Powered-By` header;
     - the request headers `x-prerender-revalidate*`, `x-middleware-subrequest` and
       `x-next-revalidate*` stripped (see Security);
     - `reverse_proxy app:3000` with a 10-second retry window during restarts.

     `Caddyfile.local` imports it, keeps `local_certs`, and sends **no HSTS**.
6. **Write `infra/write-env-file.sh <environment>`.** From `.env.local` it writes, mode 600, to
   `~/.config/daygame/`:
   - `<environment>.env`: the runtime variables from `check-runtime-env.mjs`'s list, minus the test
     accounts and the two Claude-CLI switches (`USE_CLAUDE_CODE`, `CLAUDE_PATH`, which cannot work in a
     container), plus a freshly generated `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`;
   - `build-public.env`: the three public build values.

   If the classifier refuses to run it, that is B-ENV: record it, and the owner runs it once (R13).
   **Known loss, stated:** features that shell out to the Claude CLI do not work in the container.
   That is the master plan's D4 (moving those features to the Anthropic API), not this plan's.
7. **Write `infra/deploy.sh <repo>@sha256:<digest>`, the only way anything is deployed.**
   1. Refuse anything but a `repo@sha256:<64 hex>` reference, or a local image ID in rehearsal.
   2. Take a lock with `flock -n` on a file under the runtime directory. If it is already held, exit 0
      and log it.
   3. Check that Caddy is healthy before touching the app. If not, stop: the fault is not the image's.
   4. Pull the image. Record the running container's image digest as "previous" (`docker inspect`),
      never a tag, which would already point at the new image.
   5. Run migrations. This step exists and runs nothing while the database is Supabase; it is already
      first in line when it is needed. Any future migration must also work with the previous image and
      with Vercel's `main` (Q20).
   6. Run `docker compose up -d app`.
   7. Wait up to 90 s for `/api/healthz` to report 200 **and** the build ID from the image's
      `org.opencontainers.image.revision` label. Check it inside the container network and again
      through Caddy.
   8. If it fails and there is a previous image: start the previous one and check it. If the previous
      one is healthy, mark the new digest failed (never retried automatically) and exit non-zero. If the
      previous one also fails, mark nothing — the cause is outside the image (Supabase down, a broken
      Caddy, a network blip) — then alert and exit non-zero. On the very first deploy there is no
      previous image: leave the failed container stopped, alert, and exit non-zero.
   9. Remove old images, never the current or the previous one; keep 3 in all.

   Every step writes one log line.
8. **Update `tests/unit/infra/localDeploy.test.ts` first, in the same commit as the switch-over.** The
   test reads the files that step 9 deletes, so a separate commit would break every session's
   pre-commit hook. It must now fail when:
   - the app gets a `ports:` entry;
   - HSTS appears in the local Caddyfile, or is missing from the production one;
   - a restart policy, a log cap, the persistent Caddy volume or the tmpfs size caps disappear;
   - the Dockerfile runs as root, drops `exec`, or stops requiring a build argument;
   - `.dockerignore` stops excluding `.env*`;
   - compose stops failing on a missing variable (`:?`);
   - `common.caddy` stops stripping the preview headers.
9. **Switch this machine over.** `infra/run-local.sh` becomes: build the image from a commit (it prints
   the commit), write the env file if missing, run `deploy.sh`, then verify. It keeps `--status`,
   `--stop`, `--no-build` and the export of the local root certificate. Then stop and disable
   `daygame-local.service`, and delete its unit file, its template and `compose.local.yaml`.
   **Flagged:** this removes the old way of running. It can come back from git history if needed.
10. *Acceptance.* Run all of these and quote the outputs under this phase.
    - **The deploy.** `infra/run-local.sh <commit>` exits 0. `https://localhost/api/healthz` answers
      200 with `proto: "https"` and `buildId` equal to the full SHA that `run-local.sh` printed. Compare
      against that printed SHA, not `HEAD`: other sessions move `HEAD`. `/` is 200, `/dashboard` 307,
      `http://` 308, and `/test/*` 404.
    - **From Windows.** `/mnt/c/Windows/System32/curl.exe -k https://localhost/api/healthz` answers
      200. Caddy moved from host networking to published ports, so Windows-to-WSL forwarding is
      re-checked.
    - **Not on the network.** `docker port` prints nothing for the app, its container has no port
      bindings, and nothing listens on :3100 any more. Do not check :3000: that is the owner's dev
      server, which listens on every address by design.
    - **The image.** It holds no `.env*` file (`find / -xdev -name '.env*'` inside it finds nothing).
      It runs as a non-zero uid. Its size is recorded.
    - **Rollback.** Build a broken image `FROM` the good one, with a start command that exits at once.
      Deploy it: `deploy.sh` exits non-zero, the good image is serving again, and only the broken digest
      is marked failed.
    - **Crash.** Kill the server process from the host: `kill -9 $(docker inspect -f '{{.State.Pid}}'
      <app>)`. It is healthy again within 15 s. Do not use `docker kill`: Docker treats that as a manual
      stop and does not restart the container.
    - **Idempotent.** A second run on the same commit changes nothing.
    - **Route sweep against the container.**
      `PW_BASE_URL=https://localhost npx playwright test --project=sweep-desktop --output <scratchpad>/pw`
      passes, with the HTML report also sent to the scratchpad. This needs a small
      `playwright.config.ts` change: when `PW_BASE_URL` is an https localhost address, set both
      `use.ignoreHTTPSErrors` and `webServer.ignoreHTTPSErrors`, so Playwright sees the running server
      instead of starting `npm run dev` in the shared folder.
    - **Lint and the dev server.** `hadolint` and `shellcheck` are clean, and `http://localhost:3000`
      answered 200 before and after.

### Phase 3 evidence (2026-10-13)

Files: 88e71125 (all of steps 2–9; step 1 landed with Phase 1), then d9e675e4. Decisions taken
while building, each stated: Debian 13 `node:24.21.0-trixie-slim` and `caddy:2.11.7-alpine`, both
by digest (2.11.4 was current when the plan was written); `USER 1000:1000` (hadolint DL3066);
`data/woman-responses/prompts/` is let into the build because `src/scenarios/keepitgoing/chat.ts`
reads it through `process.cwd()`, and Next's tracing then copies it into the image.

- **The first two deploys failed safely**, and `deploy.sh` did its job: compose read
  `CADDYFILE=caddy/Caddyfile.local` as a volume name ("refers to undefined volume"), and once that was
  fixed every file in the image was 0600 (EACCES on `scripts/check-runtime-env.mjs`) because
  `run-local.sh` leaked `umask 077` into the build. "ALERT: first deploy of sha256:a63c47f3… failed its
  health check; the container is stopped, nothing was marked". Both fixed in d9e675e4, with a test.
- **The deploy.** `infra/run-local.sh d9e675e4805b40e0ec3abd2ba7ba3704fc7758ed`: "run-local exit=0".
  It printed "Commit d9e675e4805b40e0ec3abd2ba7ba3704fc7758ed" and "deploy: healthy: /api/healthz
  answers 200 with commit d9e675e4805b40e0ec3abd2ba7ba3704fc7758ed, inside and through Caddy (proto
  https)". Its checks: "https://localhost/api/healthz 200, buildId
  d9e675e4805b40e0ec3abd2ba7ba3704fc7758ed, proto https"; "/ 200"; "/dashboard 307"; "http://localhost/
  308"; "/test/crash 404"; "/api/test/pending-draft 404"; "dg-app publishes no port". The old
  `daygame-local.service` was stopped, disabled and its unit file deleted before the switch.
- **From Windows.** `curl.exe -k https://localhost/api/healthz`:
  `{"status":"ok","buildId":"d9e675e4805b40e0ec3abd2ba7ba3704fc7758ed","db":"ok","proto":"https"}`,
  "HTTP 200".
- **Not on the network.** `docker port dg-app`: empty; `PortBindings={} NetworkMode=infra_web`;
  nothing listens on :3100.
- **The image.** 1,180,019,888 bytes; `Config.User` 1000:1000; `find / -xdev -name '.env*'`: nothing;
  `id -u` 1000.
- **Rollback.** A broken image `FROM` the good one (`CMD … exit 3`), deployed with `infra/deploy.sh`:
  "unhealthy after 90s", "rolling back to sha256:f6f7d70e…", "ALERT: sha256:d05fa3c9… failed its health
  check and was rolled back …; marked failed", "deploy exit=1"; afterwards the good image runs and
  healthz reports d9e675e4…; `failed-digests` holds only the broken ID.
- **Crash.** `kill -9` of the container's PID 1 from the host: "healthy again after 1.744569899 s:
  HTTP 200 …", "restart count 0 -> 1".
- **Idempotent.** A second `run-local.sh` on the same commit rebuilt from cache to the same image ID
  and "deploy: already running sha256:f6f7d70e… and healthy; nothing changed"; same container ID and
  start time before and after.
- **Route sweep against the container.** `PW_BASE_URL=https://localhost npx playwright test
  --project=sweep-desktop --output <scratchpad>/pw` (HTML report to the scratchpad): "54 passed
  (1.5m)". It used the running server; the dev server was not started.
- **The proxy's headers.** A throwaway Caddy with `common.caddy`'s `request_header` lines echoed
  `sub=[] pre=[] pre2=[] next=[] keep=[yes]` for a request carrying `x-middleware-subrequest`,
  `x-prerender-revalidate`, `x-prerender-revalidate-if-generated` and `x-next-revalidate-tag-token`.
  Responses from https://localhost carry no `Server` or `X-Powered-By` and no HSTS.
- **Lint and the dev server.** `hadolint infra/Dockerfile` and `shellcheck` over every `infra/**/*.sh`:
  clean. `http://localhost:3000`: 200 before the switch and after the sweep.
- **Reboot (B-REBOOT).** Observed at 17:49, see the blocker state: the deployment came back by
  itself.
- **Deviation from step 7.8, after review.** A digest is marked failed only when the new image never
  answered `/api/healthz` with its own commit (it crashed or never started) while the previous image
  is healthy. If it did answer with its own commit and only the check failed, a database blip may be
  to blame: it is rolled back and deferred, and a second such failure marks it. Failures caused
  outside the image are deferred, and the agent retries a deferred digest after 15 minutes instead of
  every minute. Re-checked after the change: a crash-type broken image was "unhealthy after 90s …
  (it answered with its own commit: no)", rolled back and marked failed. The deploy lock moved into
  the state directory, so root and the deploy user share it.

## Phase 4 — CD to staging: CI publishes; this machine deploys itself. **Status: done except 4.6–4.7, blocked: B-GH (no `read:packages`)**

**Depends on:** Phases 2 and 3. Steps 4.4–4.7 need B-GH. **Working state:** a push to `training-rebuild`
reaches https://localhost with no person involved.

1. **Write the agent.** `infra/deploy-agent.sh` reads the digest of the tag it watches.
   - It accepts the digest only if it matches `sha256:[0-9a-f]{64}`, so an empty answer is never "new".
   - If the digest is new and not marked failed, it calls `deploy.sh`.
   - A registry login error or a failed deploy makes it exit non-zero, so the unit shows as failed.
   - Units: `infra/systemd/daygame-deploy.service.template` and a `.timer` with `OnStartupSec=30s`
     (user unit) or `OnBootSec=30s` (system unit), `OnUnitActiveSec=60s` and `AccuracySec=1s`. Without
     the first line, the timer would never fire after a reboot.
2. **Rehearse without GitHub.** Run a throwaway registry (`registry:2`, pinned by digest, on
   127.0.0.1:5000). If `docker buildx imagetools` refuses plain HTTP there, read the digest from the
   registry's `Docker-Content-Digest` header with `curl` for this rehearsal only. Then:
   1. Push the image of a commit as `localhost:5000/daygame-coach-staging:staging` and point the agent
      at it. It deploys.
   2. Push a newer image. It deploys within 2 minutes.
   3. Push a broken one. It is rolled back, marked failed, and not retried.
   4. Push a fixed one. It deploys.

   Then remove the registry.
   *Acceptance:* all four outcomes are quoted from the agent's journal.
3. **Add `scripts/ci/await-workflow.mjs` and an `image-staging` job to `ci.yml`.**
   - **When:** `needs: checks`; only on a push to `training-rebuild`; only when the repository variable
     `STAGING_PUBLISH` is `on`. `environment: staging`. Permissions: `contents: read`,
     `packages: write`, `actions: read`.
   - **Wait for the browser checks:** the first step polls the GitHub API until `e2e.yml`'s run for the
     same commit has finished, and fails unless it passed (timeout 45 minutes). The script is
     unit-tested with fixture responses.
   - **Privacy, before any real image:** if the package does not exist yet, push an empty
     `FROM scratch` placeholder. On every run, confirm that an anonymous inspect of the package is
     **denied**, using an empty Docker configuration. If it is allowed, fail and stop: the package is
     public and must be deleted (R5).
   - **Build:** every action in this job is pinned to a full 40-character commit SHA. Build from the
     environment's variables plus `BUILD_SHA=${{ github.sha }}`, with `provenance: false`,
     `sbom: false`, no build cache and `load: true`. A step fails loudly and names any empty
     variable. Use no secret except `GITHUB_TOKEN`.
   - **Before pushing:** boot the image with a dummy runtime file, check `/api/healthz` answers (the
     database check may fail; the server must start), and look inside for `.env*` files. Push only if
     both pass.
   - **Push:** tag `staging-<sha>` and `staging`. Then prune with a short `gh api` script that keeps
     the newest 10 tagged versions of this package only.
   - **While `STAGING_PUBLISH` is off:** the `checks` job writes one line to the run summary,
     *"Staging publishing is off: blocker B-GH, Plans/caddy-deploy-and-cicd.md"*. It is visible, not
     silent.
   - `pipelineRules.test.ts` asserts all of this.
4. **Configure GitHub (needs B-GH).** Use `infra/github-config.sh`, a script that never prints values.
   - Create the `staging` environment, deployable from `training-rebuild` only.
   - Set its variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
     `NEXT_PUBLIC_APP_URL=https://localhost`, read from `build-public.env`.
   - Set the repository variable `STAGING_PUBLISH=on`.
   - In the repository's Actions settings, require approval for workflow runs from all outside
     contributors.

   If any part is refused, record it; you run the script yourself at the return visit (R4).
5. **The published reports (C9) are not this plan's to clean up.** They are B9 of
   `tests-worth-their-keep.md`. This plan never downloads or deletes artifacts.
6. **Give this machine registry access (needs B-GH).** Until R5's token exists:
   `gh auth token | docker login ghcr.io -u reachjvc --password-stdin`. This stores the CLI's broader
   token in `~/.docker/config.json`. The same token already sits in `~/.config/gh/`, so this is no new
   kind of exposure. Replace it with R5's read-only token when that exists.
7. **Point the agent at `ghcr.io/reachjvc/daygame-coach-staging:staging` and enable the timer.**
   *Acceptance:* a pushed commit goes green in CI and its image appears. Within 3 minutes of the image
   job finishing, `https://localhost/api/healthz` reports that commit. Quote the agent's journal line.
   **Do not push broken code to the shared branch to test rollback;** step 2 proved it.
   If B-GH is still open, steps 1–3 are done (the job is merged and switched off), steps 4–7 move to
   the return visit, and the status reads "blocked on B-GH; local-registry rehearsal passed".

### Phase 4 evidence (2026-10-13)

- **4.1** `infra/deploy-agent.sh` and the two systemd templates, d8c955ee. The rehearsal found that
  systemd's PATH has no `~/.local/bin` (where `jq` is), so the template sets PATH (a1f82f6b).
- **4.2** Throwaway `registry:2` (pinned by digest) on 127.0.0.1:5000; the user timer watching
  `localhost:5000/daygame-coach-staging:staging`. (Whether `docker buildx imagetools` or the agent's
  curl fallback read the plain-HTTP registry was not logged.) From the agent's journal:
  1. "16:38:04 agent: new digest: localhost:5000/daygame-coach-staging@sha256:063b8755… (running:
     sha256:f6f7d70e…)" … "16:38:10 deploy: healthy: /api/healthz answers 200 with commit
     d9e675e4805b40e0ec3abd2ba7ba3704fc7758ed, inside and through Caddy (proto https)" … "done".
  2. A newer image (commit d8c955ee44be179df5d43b9857b591beb92d0452) pushed at about 17:59:20: "18:00:11
     agent: new digest: …@sha256:16a42f7e…", "18:00:15 deploy: done" — well inside 2 minutes.
  3. A broken image: "18:01:12 agent: new digest: …@sha256:86c28006…", "18:02:43 deploy: unhealthy
     after 90s", "rolling back to …@sha256:16a42f7e…", "ALERT: … failed its health check and was
     rolled back …; marked failed", then "18:02:46 agent: …@sha256:86c28006… is marked failed; not
     retrying it".
  4. A fixed image: "18:03:46 agent: new digest: …@sha256:70ceffb2…", "18:03:50 deploy: healthy …",
     "done: … is live".
  The registry container and its volume were removed afterwards (and only that volume: the other
  dangling volumes are peers' Postgres data). The WSL restart fell between outcomes 1 and 2.
- **4.3** `scripts/ci/await-workflow.mjs` ("Tests 10 passed": no run yet, other workflows ignored,
  in progress, every conclusion, newest run, renamed workflow, timeout, three API errors) and the
  `image-staging` job with `.github/actions/publish-image`, a composite action shared with
  production so the two cannot drift, d8c955ee. The privacy check asks the registry anonymously
  (token, then manifest), because an empty `DOCKER_CONFIG` also hides the buildx plugin and would have
  made "could not check" look like "private"; checked against GHCR: a public image answers 200, a
  private or missing one "DENIED" and 401. While the switch was off, the `checks` job printed
  "Staging publishing is off" (e10f08ee: "Staging publishing is off: success", image-staging
  skipped).
- **4.4** `infra/github-config.sh` (after B-GH's login appeared): "environment staging: deployable
  from training-rebuild only", three variables set, "repository variable STAGING_PUBLISH=on",
  "workflow runs from all outside contributors need approval". Read back through the API:
  `branch:training-rebuild`; `["NEXT_PUBLIC_APP_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_URL"]`; `STAGING_PUBLISH=on`; `all_external_contributors`. Every session was
  told that each push now runs `image-staging`, which fails when e2e.yml failed on the same commit.
  **The first live run** (38429479662, on a peer's commit ad528b66; the run on this plan's 0ba9f54c had
  been cancelled by that push): `checks` success, then `image-staging` waited for e2e.yml, pushed the
  placeholder, and stopped: "…:placeholder can be read without logging in: the package is PUBLIC.
  Stopping before any image is pushed." The privacy check worked; creating the package from CI cannot
  give a private one in a public repository. `STAGING_PUBLISH` was set back to `off`
  (`gh variable set STAGING_PUBLISH --body off`), and the composite action now refuses to create a
  package: an existing tag must be proven private first. To resume: R5, then
  `gh variable set STAGING_PUBLISH --body on`.
- **4.5** Not this plan's (B9 of tests-worth-their-keep.md).
- **4.6–4.7 blocked: B-GH.** The CLI token has no `read:packages` ("You need at least read:packages
  scope to list packages. (HTTP 403)"), so `gh auth token | docker login ghcr.io` would not let this
  machine pull the private image. The agent's settings already watch
  `ghcr.io/reachjvc/daygame-coach-staging:staging`; its timer is **disabled** until R4/R5, so it does
  not fail every minute. To finish: R4, then `gh auth token | docker login ghcr.io -u reachjvc
  --password-stdin` (or R5's token), then `systemctl --user enable --now daygame-deploy.timer`.

## Phase 5
## Phase 5 — Production, prepared to the last step without a domain or a server. **Status: done 2026-10-13**

**Depends on:** Phase 3 and steps 4.1–4.3. **Working state:** once the domain and server exist,
production is a matter of running scripts that have already been dry-run.

1. **Write `infra/caddy/Caddyfile.production`.**
   - Site `{$SITE_DOMAIN}`, with `www.` redirecting to it; ACME email `{$ACME_EMAIL}`.
   - Let's Encrypt as the only issuer, to match the CAA record in step 4.
   - Server timeouts: `read_body 30s`, `read_header 10s`, `idle 2m`. No write timeout, so streamed
     pages keep working.
   - HSTS for one year, without preload; `X-Content-Type-Options: nosniff`;
     `Referrer-Policy: strict-origin-when-cross-origin`.
   - Access log to stdout. It imports `common.caddy`.
   - Let's Encrypt stopped sending expiry emails in June 2025, so certificate warnings come only from
     Phase 7's monitor.
   *Acceptance:* `caddy validate` passes in the pinned Caddy image, with a placeholder domain.
2. **Write `infra/server/cloud-init.yaml` as a minimal first boot.** Ubuntu 24.04 with:
   - a `deploy` user: no password, no sudo, in the docker group, which makes it root-equivalent (see
     Security);
   - Docker from Docker's own apt repository, with `daemon.json` setting `live-restore: true` and the
     same storage setting as this machine (`overlay2`), so staging rehearses what production runs;
   - unattended upgrades covering Ubuntu **plus** the Docker and Tailscale repositories, with a 04:00
     reboot window;
   - journald capped at 500 MB;
   - `ssh_pwauth: false`, and OpenSSH disabled;
   - Tailscale with Tailscale SSH, joined with the single-use, one-hour, `tag:prod` key (Q10);
   - firewall rules in Docker's `DOCKER-USER` chain that drop traffic from containers to
     `169.254.169.254` (the metadata service) and `100.64.0.0/10` (the tailnet).

   Anything in cloud-init can be read back from inside the server, so nothing longer-lived than that
   one-hour key goes there.
   *Acceptance:* `cloud-init schema --config-file` passes inside a throwaway `ubuntu:24.04` container
   (proven to work in Phase 0).
3. **Write `infra/server/sync-infra.sh <commit>` (`--dry-run` shows the plan).** It is the only way files
   reach the server, at first boot and every time after.
   - It copies the compose file, the Caddyfiles, `deploy.sh`, the agent and its units from
     `git archive <commit>` over Tailscale SSH.
   - It writes `/etc/daygame/infra-version` and restarts only what changed.
   - The agent logs the infra version on every run.
4. **Write `infra/server/provision.sh` and `infra/dns/records.sh`** (both with `--dry-run`).
   - `provision.sh` uses `hcloud`. It uploads nothing secret, and is idempotent by name. It creates:
     - a firewall with inbound 80/tcp, 443/tcp and 443/udp from `0.0.0.0/0` **and** `::/0` — no port
       22;
     - the owner's SSH **public** key in the Hetzner project. OpenSSH stays off on the server, but the
       key stops Hetzner emailing a root password, and Hetzner's rescue mode logs in with it;
     - the server (Q8, Q18), attached to that firewall.
   - `infra/server/push-env.sh` copies the secrets file and the registry token from R5 over Tailscale
     SSH, to `/etc/daygame/production.env` (mode 640 root:deploy) and the `deploy` user's Docker login.
   - `records.sh` sets, through the Cloudflare API:
     - A and AAAA records for the apex and `www`, **DNS-only** (Q11);
     - CAA `0 issue "letsencrypt.org"`;
     - SPF `v=spf1 -all` and DMARC `p=reject`. No mail is sent from the domain yet, and this stops
       anybody else sending mail as you. Email setup (the master plan's B3) changes these later.
5. **Add the production jobs to `ci.yml`.**
   - `image-production`:
     - it `needs: checks`, has `if: ${{ !cancelled() }}`, and runs only on a push to `main`, and only
       when `PRODUCTION_PUBLISH` is `on`;
     - `environment: production`, with the owner as required reviewer (Q7), and job-level
       `concurrency: {group: publish-production, cancel-in-progress: false}`;
     - it refuses to publish if `github.sha` is no longer `main`'s tip;
     - it builds, smoke-tests, scans and pushes exactly like `image-staging`, to
       `daygame-coach-production` with tags `production-<sha>` and `production`;
     - it writes `e2e.yml`'s result for the commit into the run summary.
   - `verify-production`:
     - `needs: image-production`, with
       `if: ${{ !cancelled() && needs.image-production.result == 'success' }}`;
     - **no** `environment:` key, which would demand a second approval;
     - it reads the repository variable `SITE_DOMAIN` and polls `https://$SITE_DOMAIN/api/healthz`
       until `buildId` matches the commit, or fails after 10 minutes.
6. **Write `tests/unit/infra/production.test.ts`.** It fails when any of these stops being true:
   - production sends HSTS and has the timeouts;
   - cloud-init keeps password login and OpenSSH off and has the `DOCKER-USER` drops;
   - the firewall script never opens 22, 3000, 5432, 11434 or 2019, and always covers IPv6;
   - no DNS record is proxied;
   - the production jobs keep the conditions above.
7. *Phase acceptance:* every script above has run with `--dry-run`, and its planned actions are quoted.
   Tests, `actionlint`, `shellcheck` (over `infra/**/*.sh`) and `hadolint` are clean. **No real
   Cloudflare, Hetzner or GitHub-settings resource was touched.**

### Phase 5 evidence (2026-10-13)

All in 0ba9f54c. Decisions taken while building: the production jobs' condition is
`!cancelled() && needs.checks.result == 'success' && …`, because `!cancelled()` alone would let a run
with failed checks publish (rule 4); Caddy gets `SITE_DOMAIN` and `ACME_EMAIL` from the server's
`deploy.env` through compose; the default server type is `cpx21` (the shared x86 type with 4 GB in
Ashburn; check current prices); cloud-init embeds the Docker and Tailscale signing keys, their
fingerprints checked when written in.

- **5.1** `caddy validate` in `caddy:2.11.7-alpine@sha256:d8542f48…` with `SITE_DOMAIN=example.com`:
  "Valid configuration". Without the variables Caddy refuses ("parsing caddyfile tokens for 'email':
  wrong argument count"), which is the intended loud failure.
- **5.2** `cloud-init schema --config-file` in a throwaway `ubuntu:24.04` (cloud-init 26.1): "Valid
  schema /ci.yaml".
- **5.3** `infra/server/sync-infra.sh --dry-run 0ba9f54c`: "At commit 0ba9f54ca981… it would install on
  root@daygame-prod:" the five files under `/opt/daygame/infra/`, both units in `/etc/systemd/system/`,
  "/etc/daygame/infra-version = 0ba9f54ca981…", then "restart only what changed".
- **5.4** `infra/server/provision.sh --dry-run`: "firewall daygame-web: inbound 80/tcp, 443/tcp, 443/udp
  from 0.0.0.0/0 and ::/0; nothing else, no 22"; "would run: hcloud server create --name daygame-prod
  --type cpx21 --image ubuntu-24.04 --location ash --ssh-key daygame-owner --firewall daygame-web
  --user-data-from-file …". `infra/server/push-env.sh --dry-run example.com ops@example.com`: the
  secrets file, `deploy.env` (quoted line by line, no secrets) and the read-only GHCR login.
  `infra/dns/records.sh --dry-run example.com`: A and AAAA for the apex and www "DNS only (not
  proxied)", "CAA example.com -> 0 issue "letsencrypt.org"", "TXT example.com -> v=spf1 -all", "TXT
  _dmarc.example.com -> v=DMARC1; p=reject". `infra/github-config.sh --dry-run` printed its plan
  before step 4.4 ran it.
- **5.5** `image-production` and `verify-production` in ci.yml; `actionlint` clean.
- **5.6** `tests/unit/infra/production.test.ts`: "Tests 21 passed". Each rule broken once on purpose
  and seen to fail: HSTS removed, `ssh_pwauth: true`, the metadata DROP removed, port 22 opened, a rule
  without `::/0`, a proxied record, publishing without green checks, and `cancel-in-progress: true`.
- **5.7** Tests, `actionlint`, `shellcheck` over `infra/**/*.sh` and `hadolint` clean (final run
  below). No Cloudflare or Hetzner resource was touched. GitHub settings were changed only by step
  4.4, after B-GH's login existed.

### Final gates (2026-10-13), on a3e7ba7e77a25eb1f725bc94ed81ef7d526d7ec0

Run in the isolated worktree on Node 24.21.0: `npm run lint:ratchet` "Lint errors: 291, none new.";
`node scripts/typecheck-ratchet.mjs` "Type errors: 91, none new."; `npm test` "Test Files 366
passed (366)", "Tests 4652 passed | 1 skipped (4653)"; `npm run audit:ratchet` "Dependency audit: 5
vulnerable package version(s), none new."; `actionlint` exit 0; `shellcheck` over all ten
`infra/**/*.sh` exit 0; `hadolint infra/Dockerfile` exit 0. CI run 38433989945 on that commit:
"CI completed success" (`checks` success in 280 s; the image jobs skipped while publishing is off).
`infra/run-local.sh a3e7ba7e77a25eb1f725bc94ed81ef7d526d7ec0`: "Commit
a3e7ba7e77a25eb1f725bc94ed81ef7d526d7ec0", "https://localhost/api/healthz 200, buildId
a3e7ba7e77a25eb1f725bc94ed81ef7d526d7ec0, proto https", "run-local exit=0"; from Windows the same
JSON with "HTTP 200". The builder's cache was trimmed back to 3.96 GB after that build; C: had 28 GB
free.

### Reviews (2026-10-13), on d659ac47..HEAD, this plan's files only

- **`/code-review`**: 15 findings. Fixed in 8c17898d: the image search ran as uid 1000, so `find`
  exited 1 and killed the step under `bash -e` (now as root); CI created the package, which comes out
  public (now refused); the prune could delete untagged parts of an index (now only `<prefix>-<sha>`
  versions); a deploy failing for an outside reason was retried every minute (now deferred 15
  minutes); the lock path differed between root and the deploy user (now in `STATE_DIR`); a good
  digest could be marked failed after a database blip or when redeploying what already runs (see
  Phase 3's deviation note); `sync-infra.sh` recreated the app outside `deploy.sh` (now never touches
  it); the unit's 300 s start timeout could kill a rollback (now 900 s); `run-local.sh` ignored
  `DAYGAME_CONFIG_DIR` for `deploy.sh` and could be undone by the agent (now passes the file and
  refuses while the timer runs); `push-env.sh` swallowed an SSH failure and could replace the server's
  key (now stops); `records.sh` overwrote whichever TXT record came first, such as a verification
  token (now matches the record's kind and stops on several); the probe lived outside a `*Repo.ts`
  (now `readinessRepo.ts`); `deploy.sh` and the agent now read quoted values like the other scripts.
  **Recorded, not changed:** `scripts/training-data/11.EXT.retrieval-smoke.ts:181` keeps its own
  `|| "http://localhost:11434"`; it is a local pipeline script outside this plan, where a local Ollama
  is the norm.
- **`/security-review`** could not run on this checkout: "fatal: ambiguous argument 'origin/HEAD...':
  unknown revision or path not in the working tree." (there is no `origin/HEAD` ref, and setting one
  would change shared git metadata). The same review was run by a subagent on the exact range and
  files: **no high or medium finding**. Its three low findings are fixed: the privacy check now
  counts as private only a 401/403 from the token endpoint or from the manifest, so a registry outage
  can no longer read as "private" (tested against GHCR: the public staging package fails, the missing
  production one passes); the Cloudflare token goes to curl as a header file and the Tailscale key is
  substituted in the shell, so neither is ever on a command line; `sync-infra.sh` reads `deploy.env`
  instead of sourcing it as root, and `push-env.sh` accepts only a plain e-mail address.

---

# ████ STOP — the AI returns to you here ████

**Everything above runs without you. Nothing below can start until these are done.** Expect one
sitting of about forty minutes, plus Hetzner's verification wait, so do R3 first.

| | What you do | Where it goes |
|---|---|---|
| R1 | Buy the domain on Cloudflare Registrar | Tell the AI the name |
| R2 | Cloudflare → My Profile → API Tokens → "Edit zone DNS", zone = that domain, expiry 30 days | `~/.config/daygame/cloudflare.token`, then `chmod 600` |
| R3 | Hetzner Cloud: account, payment method, a project, and an API token (read & write) | `~/.config/daygame/hcloud.token`, `chmod 600` |
| R4 | `gh auth login -s read:packages`, if B-GH is still open. If step 4.4 was refused, also run `infra/github-config.sh`. | WSL terminal |
| R5 | Two classic GitHub tokens with only `read:packages`, 1-year expiry: one for this machine, one for the server (B-GHCR) | `~/.config/daygame/ghcr-read-wsl.token` and `ghcr-read-server.token`, `chmod 600` |
| R6 | Tailscale: add `tag:prod` and the policy from Q10 (you → `tag:prod` port 22 in check mode; `tag:prod` → nothing), then a one-off, pre-approved, `tag:prod` auth key with 1-hour expiry | `~/.config/daygame/tailscale.authkey`, `chmod 600` |
| R7 | Supabase → Authentication → URL Configuration → add `https://<domain>/**` and `https://localhost/**` | — |
| R8 | `git push origin training-rebuild:main`. This also redeploys the Vercel site with current code. | WSL terminal, inside the repository |
| R9 | Optional: trust the local certificate (the B-CA command above) | Windows |
| R10 | The email address for certificate and uptime alerts | Tell the AI |
| R11 | When convenient: `nvm alias default 24.21.0`, then in the repository `npm ci`, then restart `npm run dev` (B-DEVSERVER) | WSL terminal |
| R12 | Change the passwords of the test accounts CI signs in with (`TEST_USER`, and `TEST_USER_B` and `TEST_USER_TRAINING`, whose reports were published by earlier runs). Update them in `.env.local` and in the CI secrets, and delete the live report artifacts (B9 of `tests-worth-their-keep.md`). Also confirm which Supabase project CI's secrets point at. | Supabase dashboard; GitHub → Settings → Secrets; WSL terminal after R4 |
| R13 | Only if B-ENV was refused: run `infra/write-env-file.sh staging` once | WSL terminal |

**State of each return item at the end of Phases 1–5 (2026-10-13):**

| | State |
|---|---|
| R1 domain | Open |
| R2 Cloudflare token | Open |
| R3 Hetzner | Open |
| R4 GitHub CLI | **Half done**: logged in, but without `read:packages`. Run `gh auth refresh -s read:packages`. `infra/github-config.sh` has already run (step 4.4). Then log Docker in and enable the agent timer (Phase 4 evidence, 4.6–4.7). |
| R5 read-only registry tokens | Open, **and first**: on github.com → your profile → Packages → `daygame-coach-staging` → Package settings, change the visibility to **private** and make sure this repository has **Write** access under "Manage Actions access". Then `gh variable set STAGING_PUBLISH --body on`. The production package does not exist yet: create it the same way before Phase 6 (push any image to it with a token that may write packages, then make it private). Then the two read-only tokens. |
| R6 Tailscale | Open |
| R7 Supabase redirect URLs | Open |
| R8 fast-forward `main` | Open. Note: Vercel will build `main` on Node 24 (`engines`). |
| R9 trust the local certificate | Open (optional) |
| R10 alert email | Open |
| R11 Node 24 and `npm ci` for the dev server | Open. **The dev server is down** since WSL restarted at 17:49; start it after R11. |
| R12 test passwords | **Done** by daygame-coach-bf |
| R13 env file | **Not needed**: `infra/write-env-file.sh staging` ran in this session |
| New: B-DISK | Free space on C: (30 GB left, 99 %). WSL crash dumps in `C:\Users\jonas\AppData\Local\Temp\wsl-crashes` are a safe first 3.9 GB (per the site-structure plan). |

Then start a new session with the Phase 6 prompt at the end of this file.

---

## Phase 6 — Production is live on your domain

**Depends on:** R1–R8 and R10, and Phases 1–5. **The owner must be present** for: the Tailscale browser
check, the production approval click (about 10 minutes after a push to `main`, once `ci.yml`'s checks
finish), and confirming the emails in steps 6 and 7.

1. Run `provision.sh` for real. Then connect over Tailscale SSH (one browser check by the owner) and run
   `cloud-init status --wait`.
2. Run `sync-infra.sh <commit>`, then `push-env.sh`. `push-env.sh` sends the runtime values with
   `NEXT_PUBLIC_APP_URL` set to the domain, and the R5 token. It also sends a
   `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` that is generated once for this server and kept on later runs.
3. Run `records.sh` for real. `dig @1.1.1.1 <domain>` (A and AAAA) must show the server.
4. Set up the GitHub `production` environment:
   - its variables: the Supabase public values and `NEXT_PUBLIC_APP_URL`;
   - the owner as required reviewer;
   - deployable from `main` only.

   Then set the repository variables `SITE_DOMAIN` and `PRODUCTION_PUBLISH=on`.
5. The server's agent watches `daygame-coach-production:production`. The flow is: push to `main` →
   `ci.yml` checks → the owner approves → image → the agent deploys → `verify-production` turns green.
6. *Acceptance.* This is the master plan's M1.1/M1.7 bar, not a weaker one. Quote every result.
   - `https://<domain>/api/healthz` answers 200 with the commit, a Let's Encrypt certificate and the
     HSTS header, over IPv4 and IPv6 (`curl -4`, `curl -6`).
   - **Reboot from the Hetzner console:** healthz answers again without anyone logging in, and the
     agent's journal shows it ran after boot.
   - **A scan from outside** (this machine, and one GitHub runner) over both address families finds only
     80 and 443 open, plus 443/udp for HTTP/3. Ports 22, 3000, 5432, 11434 and 2019 are closed.
   - From inside the app container, `169.254.169.254` and a tailnet address cannot be reached.
   - The certificate is re-issued once on purpose: remove it from the Caddy data volume, restart Caddy,
     and watch the log.
   - The console's root-password reset is rehearsed once, and written into the runbook.
   - Login works on the domain. A password-reset link opens on the domain (after R7); the owner confirms
     the email in this session.
7. The owner moves daily use onto the domain, which is the master plan's M1.0, "used for a day". To roll
   back, point the DNS records away again; Vercel is untouched throughout.

## Phase 7 — The jobs Vercel used to do for free

**Depends on:** Phase 6 and B-UPTIME.

1. **External uptime check** on `/api/healthz` every 5 minutes, plus a certificate-expiry warning 14 days
   ahead, alerting R10's address. It must be external: a monitor on the server cannot report that the
   server is down.
2. **Dead-man's switch.** The deploy agent pings a check after every run. It pings the check's failure
   address when it exits non-zero. 15 minutes of silence alerts.
3. **Disk-space alerts** at 25 % and 10 % free. Confirm the log caps and the image pruning.
4. **Unattended upgrades** verified with `unattended-upgrade --dry-run`, covering the Docker and
   Tailscale repositories.
5. **`infra/RUNBOOK.md`:** how to deploy, roll back to a named digest, rotate each secret and token, use
   the console after a root-password reset, rebuild the server from nothing with
   `provision.sh` + `sync-infra.sh` + `push-env.sh`, check pinned versions monthly (Q21), and what to
   do on a 503.
6. *Acceptance:* each alert is fired once on purpose, the owner confirms in this session that it
   arrived, and the system is then restored.

**Not in this plan, on purpose:**
- the database move, Better Auth and Drizzle (master plan M2–M5);
- switching Vercel off (its B5);
- the browser suite, its nightly run and its workflow (`tests-worth-their-keep.md`);
- moving the Claude-CLI features to the API (D4/M1.6);
- the `@huggingface/transformers` major upgrade.

---

# PART 2 — For the executing session

## Ground rules

- **This checkout is shared with at least two other sessions.**
  - Never run `git stash`, `git add -A`, `git add .`, `git commit -a` or `--no-verify`.
  - Commit with `git commit --only <paths>`, which commits whole files. So edit a shared file
    (`package.json`, `package-lock.json`, `next.config.mjs`, `playwright.config.ts`,
    `.github/workflows/*`, `.husky/*`, `Plans/tests-worth-their-keep.md`) only when
    `git diff <file>` shows it clean. Check again just before committing. If a peer's hunk has
    appeared, message them and agree who commits; never commit or revert their hunk.
  - Leave nothing staged.
  - If the pre-commit hook fails because of another session's change, record **B-PEER-TREE** with the
    failing test's name. Do not edit their files; continue with work that does not need a commit.
- **Dependency, Node and build changes, and every deliberate-break check, happen in the isolated
  worktree (step 1.2), never in the shared folder.** Remove the worktree and run `git worktree prune`
  when done.
- **Never kill, start or restart the dev server on :3000, and never change the default Node.** Those are
  the owner's (R11). Message peers with `SendMessage` before changes they will feel. If `ListAgents` is
  not available, use the sender names from cross-session messages you have received. If you have
  none, record that you could not message them.
- **Never read or print `.env.local` values.** The scripts read the file. The safety layer refuses
  direct reads (B-ENV).
- **Hands off shared and live systems.** Never write to the live database or change Supabase settings;
  the `never.py` hook and the classifier both refuse. Never push to `main`, change repository settings
  before B-GH, or restart WSL.
- **Builds go through the capped paths only:** `npm run build` or `infra/build-image.sh`, never
  `npx next build` directly.
- **Read Next's own docs before writing Next configuration.** Use `node_modules/next/dist/docs/`, mainly
  `01-app/02-guides/self-hosting.md` and the `output` and `deploymentId` pages. This Next version
  differs from older ones.
- **Reading CI without B-GH.** `curl https://api.github.com/repos/reachjvc/Daygame_coach/actions/runs?head_sha=<sha>`
  and `…/check-runs/<id>/annotations` need no login for a public repository. The limit is 60 requests an
  hour, shared with other sessions on this machine. Wait 8 minutes after a push, then poll every
  2 minutes. When `x-ratelimit-remaining` drops below 5, wait for the reset. Get action tags and SHAs
  with `git ls-remote`.
- **After each phase:** commit, push, read the CI result, then write `**Status:** done <date>` and the
  acceptance evidence under that phase here. A status-only commit to this file may carry `[skip ci]`.
- **A refusal from the permission layer is a blocker, not a puzzle.** Quote it in the blocker table, do
  not work around it, and continue with the next step that does not depend on it.
- **Before calling the work done:** note the commit you started from. Run `/code-review` and
  `/security-review` on `<start>..HEAD`, limited to this plan's files. Then re-read each phase's
  acceptance list against what was actually run. (`docs/known-failures.md`, the old end-of-turn
  checklist, was deleted on 2026-10-13.) Plans in `Plans/` are not covered by the automatic rules for
  `docs/plans/`, so these steps are written here instead.

## Tools on this machine

| Tool | Version | Installed | Used in |
|---|---|---|---|
| gh | 2.102.0 | 2026-10-01, `~/.local/bin` | Steps 4.4–4.7, Phase 6 |
| caddy | 2.11.4 | 2026-10-01 (it runs from Docker) | `caddy validate` |
| actionlint | 1.7.12 | 2026-10-01 | every workflow change |
| docker / compose / buildx | 29.1.3 / 5.5.1 / **0.37.2** | buildx 2026-10-13 | Phases 3–6 |
| gitleaks | **8.30.1** | 2026-10-13 | Phase 2 |
| shellcheck | **0.11.0** | 2026-10-13 | Phases 2–5 |
| hadolint | **2.15.1** | 2026-10-13 | Phase 3 |
| jq | **1.8.2** | 2026-10-13 | scripts |
| hcloud | **1.68.0** | 2026-10-13 | Phases 5–6 |
| Node | 20.19.6 (default) and **24.21.0** | 24.21.0 on 2026-10-13 | Phase 1 (by path) |
| supabase CLI | 2.75.0 (2.120.0 exists) | — | not used by this plan |

## Files

**Created:**
- `.nvmrc`, `audit-baseline.json`, `.gitleaksignore`, `.dockerignore`
- `scripts/build-id.mjs`, `scripts/check-runtime-env.mjs`, `scripts/audit-ratchet.mjs`,
  `scripts/ci/await-workflow.mjs`
- `app/api/healthz/route.ts`, `src/db/readinessRepo.ts` (named `readinessProbe.ts` until the review)
- `infra/Dockerfile`, `infra/compose.yaml`, `infra/caddy/common.caddy`,
  `infra/caddy/Caddyfile.production`
- `infra/build-image.sh`, `infra/write-env-file.sh`, `infra/deploy.sh`, `infra/deploy-agent.sh`,
  `infra/github-config.sh`
- `infra/systemd/daygame-deploy.{service,timer}.template`
- `infra/server/{cloud-init.yaml,sync-infra.sh,provision.sh,push-env.sh}`, `infra/dns/records.sh`
- `infra/RUNBOOK.md`
- `tests/unit/ci/pipelineRules.test.ts`, `tests/unit/infra/production.test.ts`, plus a unit test for
  each script

**Edited:**
- `package.json`, `package-lock.json`, `next.config.mjs`, `scripts/build.sh`, `playwright.config.ts`
- `.github/workflows/ci.yml`, and `.github/workflows/e2e.yml` in one coordinated place (the runner pin)
- `.husky/pre-push`, `src/qa/config.ts`, `src/inner-game/config.ts`
- `infra/run-local.sh`, `infra/caddy/Caddyfile.local`, `infra/README.md`
- `tests/unit/infra/localDeploy.test.ts`, `Plans/tests-worth-their-keep.md` (dated notes only),
  and this plan

**Deleted:** `infra/compose.local.yaml`, `infra/systemd/daygame-local.service.template`, and the
installed user unit.

**Also created during execution, beyond the list above:** `.github/actions/publish-image/action.yml`
(the build-prove-publish steps both image jobs share), `src/shared/ollama.ts` (the one owner of the
Ollama URL rule), `.husky/pre-push` (created rather than edited: the old hook was deleted in
c9a9d65b), and the tests `tests/unit/infra/{buildId,healthz,runtimeEnv,deployScripts,production}.test.ts`
and `tests/unit/ci/{pipelineRules,auditRatchet,awaitWorkflow}.test.ts`. `yaml` 2.9.1 became an exact
devDependency for the workflow tests. `app/api/errors/route.ts` and `OfflineShell.tsx` had comments
pointing at the old build ID code corrected.

## What would make this plan wrong

- **If GitHub makes the workflow-created package public by inheriting the repository's visibility,**
  step 4.3's placeholder check fails before any real image exists. Then the owner deletes that package,
  creates it once with a token allowed to write packages, keeps it private, and gives this repository
  write access to it in the package's settings. The plan then carries on.
- **If `actionlint` 1.7.12 does not know a newer workflow key,** silence that one rule by its message,
  never globally.
- **If the heavy suite is red because of the app rather than the tests,** Q7's approval click carries
  real risk. That is why `e2e.yml`'s result is written beside it.
- **If GitHub meters private container storage on this account,** pushes fail loudly. Prune harder; Q5's
  reason for staying private still holds.
- **If `tests-worth-their-keep.md`'s Phase 9 renames the `E2E Tests` workflow,** `await-workflow.mjs`
  must follow. It matches the workflow by its file path, `.github/workflows/e2e.yml`, to make that
  unlikely.

---

## Execution prompts

These are kept beside the plan they execute, so a session that has never seen this conversation can
run them.

### Now: Phases 1–5. Paste after `/goal`.

```
Execute Plans/caddy-deploy-and-cicd.md, Phases 1 to 5 in order, and stop at its STOP line. Read the whole plan first, including Part 2's ground rules, and follow them. The goal is met only when all of these are true and shown in this session: (1) every step of Phases 1-5 is marked in the plan either done, with its acceptance check actually run (the command and its decisive output line quoted under that phase), or "blocked: <ID>" with the exact refusal, missing credential or failing evidence quoted; nothing after the STOP line has been started. (2) On the final pushed commit, run from the isolated worktree: npm run lint:ratchet, node scripts/typecheck-ratchet.mjs, npm test, npm run audit:ratchet, actionlint, shellcheck on every infra/**/*.sh, and hadolint infra/Dockerfile all pass, and that commit's ci.yml run on training-rebuild is green, read from the GitHub API. (3) https://localhost serves an image built from a named commit: /api/healthz answers 200 with proto "https" and buildId equal to the full SHA run-local.sh printed, and Phase 3's rollback, crash, network, Windows and route-sweep checks were run and quoted. (4) The deploy agent was proven against a throwaway local registry (deploy; broken image rolled back and not retried; fixed image deployed) and, if B-GH is closed, against the private GHCR package from a real CI run. (5) The plan file and every phase's work are committed with git commit --only <paths> and pushed to origin training-rebuild; Status lines and the blocker table say what actually happened; /code-review and /security-review were run on <start SHA>..HEAD for this plan's files, with every finding fixed or recorded; the worktree is removed and git worktree prune has run. (6) The final reply starts with what is now true and what is not, then lists the return checklist R1-R13 with each item's state. Escape clause: if (2), (3) or (4) cannot be met because of a permission refusal, an open blocker, or a CI failure or cancellation caused outside this plan's diff (quote the job, step, annotation and commit author from the API), record it as a blocker in the plan and that condition counts as met; re-push at most twice for the same failure. While working: other sessions share this checkout. Never git stash, git add -A or --no-verify. Edit a shared file only when git diff shows it clean, and commit only your own files. Make dependency, Node, build and deliberate-break changes in the isolated worktree, never in the shared folder. Never kill, start or restart the :3000 dev server, and never change the default Node (owner item R11). Never read or print .env.local values. Never write to the live database, change Supabase settings or repository settings before B-GH, push to main, or restart WSL. Build only through npm run build or infra/build-image.sh. When the permission system refuses something, record it with the exact message, do not route around it, and continue with the next step that does not depend on it. Put doubt in the first line of every report, not the last.
```

### After the STOP line: Phases 6–7. Paste after `/goal`.

```
Resume Plans/caddy-deploy-and-cicd.md after its STOP line and execute Phases 6 and 7. The owner must be present for parts of this: Tailscale's browser check, the production approval click, and confirming emails. First check every return item R1-R13 against the thing itself (token files exist with mode 600, gh auth status, the domain resolves at Cloudflare, the Tailscale policy has tag:prod) and record any missing item as a blocker before starting. The goal is met only when all of these are true and shown in this session: (1) https://<domain>/api/healthz answers 200 over IPv4 and IPv6 with a commit that arrived through the pipeline (push to main, ci.yml checks, owner approval, private image, the server's deploy agent, verify-production green). (2) Every Phase 6 acceptance check was run and quoted: Let's Encrypt certificate and HSTS; reboot from the Hetzner console with healthz and the agent's journal back without anyone logging in; an outside scan over both address families showing only 80 and 443 (plus 443/udp); the app container unable to reach 169.254.169.254 or the tailnet; certificate re-issuance observed once; the console root-password reset rehearsed; login and a password-reset link working on the domain, with the owner's confirmation quoted. (3) Every Phase 7 alert fired once, the owner confirmed in this session that it arrived, the system was restored, and infra/RUNBOOK.md exists. (4) All work is committed with git commit --only and pushed, the Status lines are updated, and /code-review and /security-review were run with findings fixed or recorded. (5) The final reply starts with what is true and lists anything still blocked. Same ground rules as Part 2 of the plan. Never put a token in the repository, a commit, a workflow log or cloud-init, except the single-use Tailscale key.
```
