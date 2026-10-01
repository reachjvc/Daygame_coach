# The app on your own box, and a pipeline that puts it there

**Written 2026-10-01.** Serves vision items **37** (the CD half of your friend's
CI/CD advice) and **43** (CI exists, CD does not; `npm audit` and secret scanning
are named there as missing). It is the **local rehearsal of M1.1, M1.7 and M1.8**
of `docs/plans/own-platform-and-app.md` — the same Caddyfile, the same artifact,
the same deploy job, proven on your machine before a Hetzner box and a domain
exist. Nothing here re-opens D1: the provider is Hetzner and that is settled.

**This plan does not touch the database.** Postgres, Better Auth, Drizzle, the 26
repositories and the 66-table schema are M2–M5 of the owning plan. Here the app
keeps talking to Supabase exactly as it does today. That is deliberate: it is the
half of the move with **no one-way doors**, and doing it first means every later
change happens underneath an app you are already using.

---

# PART 1 — For you, in plain words

## What is already done, today

**Your app is deployed on your own machine, over HTTPS, behind Caddy.** Not a dev
server — a real production build, with the lab pages switched off exactly as they
are on the live site.

Open **https://localhost**. The first visit will warn about the certificate once;
Blocker **B-CA** below is the one-line fix and takes ten seconds.

What was proven, by running it rather than by reading about it:

| Checked | Result |
|---|---|
| `https://localhost/` | 200, certificate verified against the local root |
| `https://localhost/dashboard` | 307 to the login page — the auth guard is live |
| `http://localhost/` | 308 redirect to HTTPS |
| App reachable from outside? | No. `172.30.52.163:3100` refuses; Caddy is the only door |
| `/test/*` and `/api/test/*` | 404, the production gate, same as the deployed site |
| `x-forwarded-proto` | `https` reaches the app, so session cookies get `Secure` |
| Crash recovery | Killed the server with `kill -9`; systemd had it back in **2 s** and Caddy served 200 again |
| Run it twice | Second run exits 0 with every check still passing |
| Survives a reboot? | **Configured to, not observed.** See below — I would not reboot your machine |

**The reboot claim is the one thing here I have not seen with my own eyes, and
saying so matters more than the claim.** What *is* verified: the service is
`enabled`, lingering is on, `systemctl is-enabled docker` is `enabled`, and
Caddy's restart policy is `unless-stopped`. Those are the four things a reboot
needs. What I did not do is reboot — your dev server has been up three days and
your editor is attached to this machine. **The first real reboot is the test**;
if the app is not on https://localhost afterwards,
`systemctl --user status daygame-local.service` is the first place to look.

Three commands are the whole interface:

    infra/run-local.sh              # build, then start everything
    infra/run-local.sh --no-build   # restart, reuse the last build
    infra/run-local.sh --stop       # stop

**Your dev server on :3000 was never touched and is not affected.** The two run
side by side on purpose: :3000 serves your working tree as you save, :3100 serves
a built artifact. The production build writes to `.next-prod`, so they never
fight over `.next`.

## What this costs, and what it does not

It costs nothing in money and nothing in monthly fees. It needed **no
administrator password** — which was not a given, and is why Caddy runs in Docker
(only root may bind port 443, and the Docker daemon already is root) while the app
runs as an ordinary user service.

It does **not** make the app reachable from the internet, and it does not replace
Vercel. Vercel still deploys on push and is still where the live site is. Turning
it off is B5 of the owning plan and is not in scope here.

## The five rules this plan follows

Approval is of these, not of any count or phase number.

1. **The database is not touched.** Supabase stays exactly as it is. *If wrong:*
   nothing — this is the rule that keeps today's work free of one-way doors.
2. **The box runs a build it was handed; it never compiles.** The build happens in
   GitHub Actions. *If wrong:* a Turbopack build took 29 GB and froze this
   machine three times in one day; a server with 4 GB would simply die.
3. **Nothing exists on the box that `infra/` did not put there**, except the
   secrets file. *If wrong:* a restored backup is worthless, because you cannot
   rebuild the machine it was restored onto.
4. **A red check cannot ship.** The deploy job runs on CI's result, never beside
   it. *If wrong:* a workflow that triggers on push runs in parallel with the
   tests and ships code they would have rejected.
5. **New CI gates arrive as ratchets, not as walls.** A gate that is red on the
   day it lands teaches everybody to ignore red. *If wrong:* you get what the
   492-pre-existing-lint-error episode already taught this repo — a tick nobody
   reads.

## What I decided for you

You said you would not be answering questions, so each open question below is
**decided**, with what it costs if I am wrong. Overrule any of them.

## The one thing that stops this plan

**Phase 6 cannot start until you own a domain name.** Everything up to it is
unblocked and can run today. That boundary is marked in the plan with a full
STOP line, and nothing before it depends on the domain.

---

# BLOCKERS

Every one was attempted once. The result is recorded, not guessed.

### B-SUDO — No administrator password on this machine. **Attempted. Worked around; no longer blocking.**
`sudo -n true` asks for a password, so `apt install` is not available to me and
you said you would not be assisting. Worked around completely, three ways:
`gh`, `caddy`, `actionlint` and the Docker Compose plugin were installed as
**user binaries** (`~/.local/bin`, which is first on your PATH, and
`~/.docker/cli-plugins`); Caddy binds 80/443 **through Docker**, whose daemon is
already root and whose group you are in; and the app is supervised by a
**systemd user service**, with `loginctl enable-linger` — which succeeded
without a password — making it start at boot.
**Nothing in this plan needs sudo.** If you would rather have system packages,
`sudo apt install gh caddy` replaces the first two and changes nothing else.

### B-CA — Trusting Caddy's local root certificate. **Attempted as far as possible. Needs you: 10 seconds.**
There is no public DNS name yet, so ACME cannot issue a certificate for
`localhost` and Caddy uses its own CA. The root is exported ready to use at
`infra/caddy/local-root-ca.crt`. I cannot install it for you: it belongs in the
**Windows** certificate store, outside this machine, and no administrator rights
are needed for the per-user store.

    certutil -user -addstore Root "\\wsl.localhost\Ubuntu\home\jonaswsl\projects\daygame-coach\infra\caddy\local-root-ca.crt"

Firefox keeps its own store: Settings → Privacy → Certificates → View → Import.
*Verified from here:* `curl --cacert infra/caddy/local-root-ca.crt
https://localhost/` returns 200 with the certificate fully validated, so the
chain is correct and the only missing piece is the browser's opinion of it.
*If you skip it:* one click-through per browser session, and the habit of
clicking past certificate warnings is worth more than this exercise saves.

### B-GH — `gh` is installed but not logged in. **Attempted. Needs you: one command.**
`gh auth status` → "not logged into any GitHub hosts". No `GH_TOKEN` or
`GITHUB_TOKEN` in the environment, no `~/.config/gh`. **Pushing is unaffected** —
the remote is SSH (`git@github.com:reachjvc/Daygame_coach.git`) and
`git ls-remote` answers, so CI still runs on every push I make.
What needs the login: **setting Actions secrets** (Phase 5) and reading run logs.

    gh auth login          # or: gh auth login --with-token < token.txt

*Scopes needed:* `repo` and `workflow`.
*Workaround if you would rather not:* every secret can be pasted into
Settings → Secrets and variables → Actions by hand; the plan says which ones.

### B-DNS — A domain name. **Cannot be attempted. Needs you. This is the STOP line.**
Nothing in this repo or on this machine names a domain, `cloudflared` is not
installed, and there is no Cloudflare credential anywhere (checked:
`~/.cloudflared`, every `CLOUDFLARE_*` variable). It gates **Phase 6 only**.
*Recommendation when you buy it:* Cloudflare Registrar, one A record,
**DNS-only (grey cloud), not proxied, to begin with** — see Q9.
*Also waiting on it:* B3 of the owning plan (email cannot be sent from a domain
that does not exist, and mail from a new sender lands in spam until DNS has
settled — a wait, so start it the day you buy).

### B-HETZNER — The server. **Cannot be attempted. Needs you. Gates Phase 6 with B-DNS.**
B2 of the owning plan: account, payment method, SSH key. Their verification can
take a day or two, so open it before the morning you want to deploy.
*Not blocking anything before Phase 6:* the deploy job is written and validated
against this machine first, so the only unknown left when the box arrives is the
box.

### B-SUPABASE-REDIRECT — `https://localhost` is not on Supabase's redirect allow-list. **Attempted: read, not changed. Your call — it is live auth config.**
Read from the management API today (the Supabase CLI is logged in here):

    site_url:        https://daygame-coach.vercel.app
    uri_allow_list:  https://daygame-coach.vercel.app/**
                     http://localhost:3000/**
    mailer_autoconfirm: false

So `https://localhost/**` is absent. **What that does and does not break:**
sign-up confirmation and password reset build their redirect from
`window.location.origin`, so on the local deployment those two bounce to the
Vercel URL instead of coming back. **Ordinary password login is unaffected and
works on https://localhost right now**, because it sets a cookie and uses no
redirect. So the local deployment is fully usable as you; only the two email
flows are not testable there.
*I did not change it.* `CLAUDE.md` says ask first about auth, and that is the
owner's standing rule, not something a consultant's "proceed" overrides. Adding
an entry is additive and reversible, and the whole fix is to append
`,https://localhost/**` to that list in the dashboard (Authentication → URL
Configuration).
*Cost of leaving it:* you cannot exercise sign-up or password reset against the
local build. *Cost of doing it:* a redirect target that resolves to the
visitor's own machine joins a list that already contains one.

### B-PGDUMP — `pg_dump` is version 16, your live Postgres is 17. **Attempted. Not needed by this plan; recorded because the owning plan depends on it.**
`pg_dump --version` is 16.15 and `supabase/.temp/postgres-version` says
`17.6.1.063`. `pg_dump` refuses to dump a newer server, so **B1 of the owning
plan cannot run on this machine as it stands.** The fix needs sudo
(`postgresql-client-17`) or can be sidestepped entirely by running the dump in a
container:

    docker run --rm -e PGPASSWORD=... postgres:17-alpine pg_dump ... > schema.sql

Nothing in this plan needs the dump, so it is not a blocker here — but it is the
first thing the owning plan asks for, and it would have failed on first paste.

---

# OPEN QUESTIONS — all decided

Each is mine to decide, each is recorded with the cost of being wrong.

| | Question | Decision | If I am wrong |
|---|---|---|---|
| Q1 | Does the local app run on the host or in a container? | **Host now** (done), **container at Phase 3**, so local and server run the identical artifact | A second way to run the app exists for one phase |
| Q2 | What is the deployable artifact? | **A Docker image in GHCR**, tagged with the git sha | A registry to clean up; retention is set in Phase 3 |
| Q3 | `output: "standalone"` always, or switched? | **Switched by `NEXT_OUTPUT=standalone`**, because Vercel is still the live deploy and B5 says do not disturb it until the new platform has served traffic | One env var to delete the day Vercel goes off |
| Q4 | What is "staging" before Hetzner exists? | **This machine.** The deploy job takes the host as an input, so the same job serves both | Nothing; it is one input |
| Q5 | `npm audit` — hard gate or ratchet? | **Ratchet with a committed baseline.** There are **10 findings today** (1 critical, 2 high); a hard gate would be red on day one | A high finding could sit at the baseline unnoticed; the baseline file is in the diff, which is the counter-pressure |
| Q6 | Which secret scanner? | **gitleaks** — a single binary, so it runs in Actions and locally with no sudo | A second tool later if it misses something |
| Q7 | Pin the Node version? | **Yes — `.nvmrc` and `engines`, CI reads the file.** CI says `20` and the repo says nothing, so they can drift | A version bump becomes a two-file change |
| Q8 | What deploys where? | **staging from `training-rebuild`, production from `main`**, and production additionally requires the heavy e2e suite green **once** | Production waits for a suite that has never been green — which is the point |
| Q9 | Cloudflare proxied or DNS-only? | **DNS-only (grey cloud) first.** Caddy owns TLS end to end and there is one less thing between you and a bug | You lose Cloudflare's origin-IP hiding until you turn it on; turning it on later is one click |
| Q10 | ACME challenge: HTTP-01 or DNS-01? | **HTTP-01 on the box.** It needs no Cloudflare API token anywhere on disk | DNS-01 if port 80 ever has to stay shut; it needs a custom Caddy build |
| Q11 | Where do the server's secrets live? | **One file, mode 600, owned by the deploy user, outside the image and outside the repo**, injected by Compose | Hetzner has no secret store; this is the floor, and the plan says so rather than implying a vault exists |
| Q12 | Fix the critical `next` advisory now or in a phase? | **Phase 2, step 1** — deliberately, not mid-session | See the security note below: the entry point is not reachable in this app, so the day's delay costs nothing |
| Q13 | The Playwright `webServer` timeout | **Fix it: build in its own CI step.** 120 s currently covers a whole production build | If this is not why the heavy suite is always red, we have still made the failure legible |
| Q14 | Should the local build serve `/test/*`? | **No.** The production gate is the thing being rehearsed | Lab pages stay on :3000, where they already are |

## The security position, stated plainly and unasked

`npm audit` reports **10 vulnerabilities: 1 critical, 2 high, 4 moderate, 3 low.**
This repo has a recorded failure for giving a security all-clear without a
dependency audit, so here is the audit, with reachability checked rather than
assumed:

- **CRITICAL — `next` 16.2.0–16.3.5: remote code execution in `next/og`
  `ImageResponse`.** You are on 16.3.5. **The entry point is not reachable in
  this codebase:** `grep` for `next/og`, `ImageResponse`, `opengraph-image`,
  `icon.tsx` and `apple-icon` across `app/`, `src/` and `components/` returns one
  line, `app/layout.tsx:50`, which points at a static file in `public/`. No
  generated-image route exists. **Patch anyway — `16.3.8` is a patch bump, not a
  major** — but it is not an open door today, and I am not going to rewrite
  `node_modules` underneath a dev server that has been up three days to close a
  path that nothing calls. Phase 2 does it with a build and a test run.
- **HIGH — `sharp` (libvips and libheif CVEs), reached through
  `@huggingface/transformers`.** Nothing imports `sharp` directly, and
  `next.config.mjs` sets `images.unoptimized: true`, so Next's image pipeline —
  the only thing that would hand it an untrusted image — is off. Its fix is a
  **major** bump of `@huggingface/transformers` (4.3.0), which three client
  components import. Phase 2 reports it; it is not a one-line change and should
  not be smuggled into an infrastructure phase.
- **MODERATE — `testcontainers`, `dockerode`, `uuid`.** Test-harness only.

**And one finding that is not in `npm audit`, which matters more than any of
them.** Your Supabase projects are **inside a Vercel-managed organisation**:
`supabase orgs list` returns exactly one org, `vercel_icfg_71FOm5Sa6adJPpop7W4qxxX2`
("reachjvc-1930's projects"), and both projects sit in it. **That confirms B0 of
the owning plan, which had it recorded as "needs confirming, not settled".** The
consequence is written there and is worth repeating because it is load-bearing:
that plan's rule 4, "Supabase stays paid and running", is the safety net under
every risky step — and a database billed and lifecycled through the Vercel
account you intend to cancel cannot be promised to survive the cancellation.
**Transfer the projects into a Supabase organisation you own while Vercel is
still production and nothing has moved.** Nothing in today's plan depends on it;
Phase 6 and the owning plan's M2 both do.

---

# PHASES

Each phase is a working state, names its acceptance test, and declares what it
depends on. **Phases 1–5 are unblocked.** Phase 6 is the STOP line.

## Phase 1 — The app runs on your box, over HTTPS, behind Caddy. **DONE 2026-10-01**

**Depends on:** nothing.

| Deliverable | Where |
|---|---|
| Caddy config for local HTTPS, with the HSTS foot-gun documented | `infra/caddy/Caddyfile.local` |
| Caddy as a restart-on-boot container, log-capped | `infra/compose.local.yaml` |
| The app as a lingering systemd user service, loopback-only, 30 s drain | `infra/systemd/daygame-local.service.template` |
| One script that builds, starts, and **proves** the chain | `infra/run-local.sh` |
| The exported root certificate | `infra/caddy/local-root-ca.crt` |
| How and why, for a reader who was not here | `infra/README.md` |

**Acceptance — ran, not asserted:** `infra/run-local.sh` exits 0 and its own
verification step fails loudly if any of these stops being true: `/` is 200 with
a validated certificate, `/dashboard` is a 307, `http://` is a 308, and the app
does **not** answer on the machine's LAN address. That last check is the one that
matters most and is the easiest to lose.

**Two warts, recorded rather than hidden:**
- `next build` appends its dist-dir types to `tsconfig.json`. Three such entries
  from earlier sessions are already committed (`.next-audit`, `.next-audit2`).
  `run-local.sh` reverts its own, every time.
- The signed-out sales page requests `/api/settings/time-preferences` and gets a
  401, which is one console error on first load. Pre-existing, visible on :3000
  too, not caused by this deployment. Not fixed here because it is a product bug
  in a different slice, and a one-line patch in somebody else's file is how
  shared checkouts break.

## Phase 2 — The app tells you when it is unhealthy, and refuses to start misconfigured

**Depends on:** Phase 1.

1. **`next` 16.3.5 → 16.3.8** (Q12). `npm install next@16.3.8`, then
   `npm run build` and `npm test`. Expect to restart the owner's dev server
   afterwards — say so when you do it. Leave `@huggingface/transformers` and
   `sharp` alone; report them.
   - *Acceptance:* `npm audit --json` no longer reports a critical, the build
     exits 0 with the full route table, unit tests stay green.
2. **`/api/healthz`.** Returns 200 with `{status, buildId, db, proto}` and a
   **non-200 when the database is unreachable** — it must touch Supabase, or it
   only proves Node is alive. `proto` echoes what `requestIsHttps()` concluded,
   which is the one thing that silently weakens every session cookie.
   `app/api/health/*` is the health-**tracking** feature; do not put it there.
   - *Acceptance:* a new test asserts non-200 when the database call throws; the
     route answers 200 through Caddy and reports `proto: "https"`.
3. **Fail-fast on missing runtime configuration.** **20** distinct environment
   variable names are read across `src/`, `app/`, `lib/`, `components/`,
   `scripts/` and `proxy.ts`, counted by grep today. (The owning plan says 21
   over a wider sweep; neither figure is load-bearing, and the list is what
   matters.) The four `NEXT_PUBLIC_*` ones are **build-time** and
   are inlined into the bundle; the rest are runtime. A missing runtime value
   must stop the boot with the variable's name, not surface later as a feature
   that quietly does nothing.
   - *Acceptance:* a test that boots the server with one required variable
     removed and asserts it exits non-zero naming that variable.
   - *Also here:* delete the `|| "http://localhost:11434"` Ollama fallback —
     `CLAUDE.md` forbids silent fallbacks, and this one presents as "the AI is
     slow" rather than "not configured".
4. **`.nvmrc` and `engines`** pinned to the Node in use, `20.19.6` (Q7).
   - *Acceptance:* `tests/unit/ciWorkflows.test.ts` extended — every workflow
     gets its Node version from the file, not from a literal.

## Phase 3 — One artifact, built once, run everywhere

**Depends on:** Phase 2.

1. **`output: "standalone"`, switched by `NEXT_OUTPUT=standalone`** (Q3).
   Standalone does **not** copy `public/` or `.next/static`; the Dockerfile must,
   and the official guide says so explicitly. Watch the one place the two
   bundlers disagree: `next.config.mjs` excludes the Node-only ONNX runtime and
   `sharp` under a **Turbopack-only** key while the build runs `--webpack`.
2. **`infra/Dockerfile`** — multi-stage, `node:20.19.6-alpine`, non-root user,
   `HOSTNAME=127.0.0.1`, the four build-time values as build args that **fail the
   build when absent**. The build inside the container is given a memory limit,
   and `scripts/build.sh` gets its **third case**: "inside a container whose
   memory is already capped". Today it exits 1 unless `CI` or `VERCEL` is set,
   which is the correct refusal — so the container must stop relying on `CI`
   being set by accident.
3. **`infra/compose.yaml`** — app plus Caddy, the app on loopback, secrets from
   an env file that is not in the image (Q11), `restart: unless-stopped`, log
   caps on both.
4. **The local deployment moves onto the image**, so local and server run the
   same artifact and `run-local.sh` keeps one way of working rather than two.
   - *Acceptance:* `docker compose -f infra/compose.yaml up -d` serves
     https://localhost with every Phase 1 check still passing; `docker image ls`
     shows an image under 400 MB; a second `docker compose up` changes nothing.

## Phase 4 — CI earns its minutes

**Depends on:** Phase 2 — **except step 5, which needs Phase 3's image.** Steps
1–4 and 6 can run before Phase 3. **This is the "is CI doing smart work" answer.**

**What CI already does well, and must not be lost:** it runs on **every branch**,
not two; a **lint ratchet** and a **type ratchet** that may only go down; 4,600+
unit tests; and the database suite against a real Postgres in Docker. `e2e.yml`
was restructured on **measured** evidence — 179 runs, 3h45m each, every completed
one red — into a fast per-push route sweep plus heavy jobs on pull requests and
nightly, with the two heavy jobs serialised because they share test accounts and
delete each other's rows. `tests/unit/ciWorkflows.test.ts` fails when a Playwright
project runs in **no** job. That is better than most teams manage, and none of it
is being replaced.

**What is missing, and what to add:**

1. **`concurrency` on both workflows**, keyed by ref, `cancel-in-progress: true`.
   Today a second push starts a duplicate run and the older one can report green
   after the newer one has landed.
   - *Acceptance:* `ciWorkflows.test.ts` asserts both workflows declare it.
2. **The Playwright build timeout** (Q13, and this is the likeliest cause of the
   chronic red). `playwright.config.ts:696` runs `npm run build && npm start`
   under a **120-second** `webServer.timeout`. The webpack build of this app takes
   **70 s on this machine**, which has 23 usable cores; a GitHub runner has 2. So
   the heavy jobs may be timing out while still compiling, and reporting it as a
   test failure. **This is reasoning from a local measurement, not from a run
   log** — reading the actual logs needs B-GH — so treat it as the first
   hypothesis to test, not as the known cause.
   Build in a **separate workflow step**, leave `webServer` starting only
   `npm start`, and raise the timeout.
   - *Acceptance:* one heavy run reaches the first test and a failure after that
     names a test, not a timeout. **Needs B-GH to read the run, or your eyes.**
3. **`npm audit` as a ratchet** (Q5) — `scripts/audit-ratchet.mjs` beside the two
   existing ratchets, with a committed baseline of today's 10 findings, failing
   when any severity count rises.
   - *Acceptance:* the script fails against a deliberately bumped baseline.
4. **gitleaks** (Q6) on every push, full history on a schedule.
   - *Acceptance:* a commit with a planted fake key fails the job; the plant is
     then removed and never pushed.
5. **A real build job that produces the artifact** — Phase 3's image, pushed to
   GHCR, tagged `sha-<short>`, retention stated. CI builds this app today only
   inside Playwright's web server and throws the result away.
   - *Acceptance:* the image pulls on this machine and serves https://localhost.
6. **Pin the actions used by the deploy workflow to commit SHAs**, not tags.
   `deploy.yml` will hold a key that can log into production; `@v4` is a moving
   target. The test workflows may keep tags.
   - *Acceptance:* `ciWorkflows.test.ts` asserts every `uses:` in `deploy.yml` is
     a 40-character SHA.

## Phase 5 — The pipeline, pointed at a host you choose

**Depends on:** Phases 3 and 4. **Unblocked: the host is this machine until B-DNS and B-HETZNER land.**

1. **`deploy.yml`, triggered by `workflow_run`** on CI's **completion with
   success** — never on `push` (rule 4). GitHub workflows are independent: a
   `deploy.yml` on push runs *beside* `ci.yml` and ships code the tests would
   have rejected.
2. **Staging from `training-rebuild`, production from `main`** (Q8), production
   additionally gated on the heavy e2e suite having been green once. That merge
   will be the first full-suite run against this code, so it is a precondition
   and not an assumption.
3. **The deploy step:** pull the image by sha, `compose up -d`, wait for
   `/api/healthz`, and **roll back to the previous tag if it does not answer**.
   A deploy that leaves the box serving nothing is worse than a deploy that
   refused.
4. **Secrets** (needs **B-GH** or hand-pasting): `DEPLOY_HOST`, `DEPLOY_USER`,
   `DEPLOY_SSH_KEY`, plus the runtime values. A dedicated non-root user,
   restricted to the deploy command, and `deploy.yml` must not run on any event a
   fork can trigger.
5. **Migrations precede deploys.** There is nothing to migrate while the database
   is Supabase, so the step exists, runs nothing, and is **asserted to come
   first** now rather than inserted later under pressure.
   - *Acceptance:* `ciWorkflows.test.ts` extended, exactly as M1.8 of the owning
     plan specifies — migrate precedes deploy, no workflow deploys without
     migrating, no deploy triggers independently of CI. Plus: `actionlint` is
     clean (installed today; it passes on the two existing workflows), and one
     real deploy to this machine as the staging host succeeds and one
     deliberately broken image rolls back.

---

# ████  STOP. Phase 6 needs the domain (B-DNS) and the server (B-HETZNER).  ████

**Everything above runs without you. Nothing below can start.** When you have
bought the domain and opened the Hetzner account, a session resumes here.

## Phase 6 — A real certificate, on a real box

**Depends on:** B-DNS, B-HETZNER, Phase 5.

1. One A record, **DNS-only** (Q9). `infra/caddy/Caddyfile.production`: the real
   hostname, ACME **HTTP-01** (Q10), and **HSTS — which must stay out of the local
   file**, because the header ignores the port and would force HTTPS on
   `http://localhost:3000`, breaking the dev server.
2. The Hetzner **Cloud Firewall** (outside the box, so a mistake in `ufw` cannot
   expose anything) default-denies inbound with 80, 443 and a restricted 22 open.
   sshd: `PasswordAuthentication no`, `PermitRootLogin no`, non-root deploy user.
3. `NEXT_PUBLIC_APP_URL` and the Supabase redirect allow-list both learn the new
   origin — **B-SUPABASE-REDIRECT becomes mandatory here**, not optional as it is
   locally, because the origin will no longer be a localhost the fallback can
   paper over.
4. **Acceptance, and it is the owning plan's M1.1 bar, not a weaker one:**
   reboot the box from the Hetzner console and, without logging in, the app
   answers `/api/healthz`. Scan the public IP from outside: only 80, 443 and 22
   answer; 3000, 5432 and 11434 answer nothing. A certificate renewal forced and
   observed once.

## Phase 7 — The jobs Vercel was doing for you

**Depends on:** Phase 6. Listed so they are not discovered later.

External uptime check (external, because a monitor on the box cannot report the
box is down); disk-free alerts at 25% and 10%, because the backup system is the
likeliest thing to fill the disk and a full disk stops Postgres accepting writes;
unattended security upgrades; a certificate-expiry alert at 14 days, since "it
renews by itself" cannot be tested for 60 days. Backups belong to M1b.4 of the
owning plan and arrive with Postgres, not with this.

---

# PART 2 — For execution

## Dependencies: what is installed, and what is not

| Tool | State | Notes |
|---|---|---|
| `gh` | **2.102.0, installed today** to `~/.local/bin` | Not authenticated — B-GH |
| `caddy` | **2.11.4, installed today** to `~/.local/bin` | Runs from Docker for ports 80/443 |
| `docker compose` | **v5.5.1, installed today** to `~/.docker/cli-plugins` | Was missing; `docker` itself was 29.1.3 |
| `actionlint` | **1.7.12, installed today** | Clean on both existing workflows |
| `docker` | 29.1.3, usable without sudo | `systemctl is-enabled docker` → enabled |
| `node` | 20.19.6 (nvm and `/usr/bin` agree) | Next 16.3.5 needs ≥ 20.9.0 |
| `psql` / `pg_dump` | 16.15 | Server is 17 — B-PGDUMP |
| `supabase` | 2.75.0, **logged in** | A newer 2.119.0 exists |
| `sudo` | **password required** | B-SUDO; nothing here needs it |
| systemd | PID 1, user manager works, **lingering now enabled** | So user units start at boot |

## Facts this plan rests on, each measured today

- Build: `npm run build` (webpack, 12 GB ceiling) compiles in **70 s**, generates
  **185 static pages**, exits 0, no warnings, and **did not hit the ceiling** —
  which is what exit 0 proves. The actual peak was not measured.
- `next start -H 127.0.0.1 -p 3100` is ready in **119 ms** and binds loopback
  only (`ss -ltnp` confirms `127.0.0.1:3100`).
- Caddy forwards `x-forwarded-proto: https`, `x-forwarded-host`,
  `x-forwarded-for` — observed through a header-echo server, not read from docs.
  `src/db/authCookies.ts:46` depends on exactly this.
- The owner's `next dev` has been up **3 days** on :3000 and is their daily
  driver. `.next-prod` keeps the two builds apart.
- Unit suite: green before this work started.
- `.gitignore` already covers `.next-*`, so the production build is not committed.

## Files this plan owns

Created today: `infra/caddy/Caddyfile.local`, `infra/compose.local.yaml`,
`infra/systemd/daygame-local.service.template`, `infra/run-local.sh`,
`infra/README.md`, this plan.
Created later: `infra/Dockerfile`, `infra/compose.yaml`,
`infra/caddy/Caddyfile.production`, `.github/workflows/deploy.yml`,
`scripts/audit-ratchet.mjs`, `app/api/healthz/route.ts`, `.nvmrc`.
Edited later: `next.config.mjs` (output switch), `package.json` (engines, next
bump), `playwright.config.ts` (webServer), `.github/workflows/ci.yml`,
`tests/unit/ciWorkflows.test.ts`, `scripts/build.sh` (container case).

**Three other sessions share this checkout.** `git commit --only <paths>`; never
`git add -A`; never `git stash`. `docs/plans/tests-worth-their-keep.md` is
somebody else's untracked file — leave it alone.

## What would make this plan wrong

- If `output: "standalone"` turns out to break the live Vercel build, Q3's switch
  is what contains it — but I have **not** verified Vercel's behaviour with that
  key, and I am recording that as belief, not measurement.
- If the heavy e2e suite is red for reasons other than the 120-second build
  timeout, Phase 4 step 2 improves the diagnosis and not the result. Phase 5's
  production gate then has no date, which is correct rather than convenient.
- If Hetzner's firewall or the Cloudflare proxy is configured before Phase 6's
  acceptance scan, "only 80, 443 and 22 answer" may be measuring Cloudflare
  rather than the box.
