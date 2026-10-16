# Runbook — keeping the server running

Written for the owner and for any AI session that looks after the server. Each
section says what to do in plain words first, then the commands. Everything
marked **rehearsed** was run on a practice copy of the production server on
2026-10-16 (`infra/rehearsal/run.sh`, Plans/caddy-deploy-and-cicd.md Phase 5b)
and worked as written. Nothing here was run on a real server yet: that is Phase 6.

## Where things are

| What | Production server (`daygame-prod`) | This machine (staging) |
|---|---|---|
| Get in | `ssh root@daygame-prod` over Tailscale SSH | you are on it |
| Scripts and compose file | `/opt/daygame/infra/` (from `sync-infra.sh`) | `infra/` in the checkout |
| Settings, no secrets | `/etc/daygame/deploy.env` | `~/.config/daygame/deploy.env` |
| Secrets | `/etc/daygame/production.env` | `~/.config/daygame/staging.env` |
| Which commit the scripts came from | `/etc/daygame/infra-version` | the checkout |
| Digests marked failed or deferred | `/var/lib/daygame/` | `~/.local/state/daygame/` |
| The agent's log | `journalctl -u daygame-deploy` | `journalctl --user -u daygame-deploy` |
| The disk alert's log | `journalctl -u daygame-disk` | not installed |
| The app's and Caddy's logs | `docker logs dg-app`, `docker logs dg-caddy` | the same |

On the server, `deploy.sh` runs as the `deploy` user and needs to be told where
the settings are. Every server command below that starts with `as-deploy` means:

    su -s /bin/bash deploy -c 'DAYGAME_DEPLOY_ENV=/etc/daygame/deploy.env <command>'

## Deploying

**Normally you do nothing.** A push to `main` runs the checks; GitHub then asks
you to approve the production image; the server's agent sees the new image
within a minute, deploys it, checks `/api/healthz`, and puts the old one back
by itself if the check fails. The `verify-production` job turns green when the
site reports the new commit. **Rehearsed:** the agent's first deploy on a new
server, and a broken image rolled back within 3 seconds of failing its check.

By hand, on the server, with a digest (never a tag):

    as-deploy /opt/daygame/infra/deploy.sh ghcr.io/reachjvc/daygame-coach-production@sha256:<digest>

## Rolling back to a named digest

**In plain words:** mark the bad version as failed, so the agent does not put it
back a minute later, then deploy the good one. The next push to `main` replaces
both. **Rehearsed** (`run.sh pin`), including the undo.

1. Find the digest of the version to go back to. Each one is tagged with its
   commit:

       gh api /users/reachjvc/packages/container/daygame-coach-production/versions \
         --jq '.[] | "\(.name) \(.metadata.container.tags | join(",")) \(.created_at)"'

2. On the server: mark what runs now, then deploy the older one.

       running="$(docker inspect -f '{{.Config.Image}}' dg-app)"
       as-deploy "echo '$running' >> /var/lib/daygame/failed-digests"
       as-deploy /opt/daygame/infra/deploy.sh ghcr.io/reachjvc/daygame-coach-production@sha256:<older digest>

   The agent's next run then says "is marked failed; not retrying it".

3. To undo it, remove that line from `/var/lib/daygame/failed-digests`. Within a
   minute the agent deploys the tag again.

## When the site answers 503, or not at all

**503 from `/api/healthz`** (`"db":"unreachable"`): the app runs, but it cannot
reach the database. The fault is at Supabase, not on the server.

- Check https://status.supabase.com and the Supabase dashboard (a paused or
  over-quota project answers like this).
- While this lasts, deploys are put back and retried after 15 minutes, never
  marked failed (`deploy.sh` step 8). Nothing to undo afterwards.

**502, a timeout, or nothing at all:**

1. Is the server there? If Tailscale SSH does not answer, use Hetzner's web
   console and reboot. The server comes back by itself. **Rehearsed:** healthy
   again 17 seconds after a reboot, the agent's first run 34 seconds after boot.
2. On the server:

       docker ps --format '{{.Names}} {{.Status}}'
       docker logs --tail 50 dg-app
       journalctl -u daygame-deploy -n 30 --no-pager

3. If the app container stopped or misbehaves, start the same image again:

       as-deploy "/opt/daygame/infra/deploy.sh --restart $(docker inspect -f '{{.Config.Image}}' dg-app)"

4. If Caddy is down (`dg-caddy` missing or restarting): `docker logs dg-caddy`.
   A certificate problem shows there. Run `infra/server/sync-infra.sh <commit>`
   from this machine to put Caddy's files back.

## Rotating secrets and tokens

**The pattern:** change the value where it lives, send it to the server with
`push-env.sh`, then restart the app with `deploy.sh --restart` so the container
reads it. `push-env.sh` runs on this machine and reads `.env.local`.

    infra/server/push-env.sh <domain> <alert email>
    ssh root@daygame-prod
    as-deploy "/opt/daygame/infra/deploy.sh --restart $(docker inspect -f '{{.Config.Image}}' dg-app)"

Set `PING_URL`, `DISK_WARN_PING_URL` and `DISK_CRIT_PING_URL` on that
`push-env.sh` line every time (see "Alerts"); a run without them turns the
alerts off.

| Secret | Where it lives | How to rotate |
|---|---|---|
| Supabase service-role key | `.env.local` → the server's secrets file | Rotate in the Supabase dashboard, put it in `.env.local`, then the pattern. Staging: `infra/write-env-file.sh staging`, then `infra/deploy.sh --restart <running ref>`. |
| Supabase URL and anon key | also **baked into every image** at build time | As above, **and** update the GitHub environment variables (`infra/github-config.sh` for staging; the production environment's variables in GitHub), then push a commit so a new image is built. |
| Server Actions key (`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`) | generated once per server, kept on every `push-env.sh` run | Delete its line on the server **and** in `~/.config/daygame/production.env`, then the pattern: a new one is generated. Forms open in a browser fail once and work after a reload. **Rehearsed** (`run.sh rotate`): new key, and the app ran with it after `--restart`. |
| Registry token (R5) | `~/.config/daygame/ghcr-read-server.token` → the deploy user's Docker login | Make a new classic token with only `read:packages`, put it in the file (`chmod 600`), run `push-env.sh` (no restart needed), then delete the old token on GitHub. **Rehearsed:** with the login removed, the agent failed and alerted; `push-env.sh` restored it. This machine: `docker login ghcr.io -u reachjvc --password-stdin < ~/.config/daygame/ghcr-read-wsl.token`. |
| Cloudflare token (R2) | `~/.config/daygame/cloudflare.token`, this machine only | Replace the file, delete the old token in Cloudflare. Nothing on the server uses it. |
| Tailscale key (R6) | used once, at first boot | Nothing to rotate: it expires within the hour. A rebuilt server needs a new one-off key. Not rehearsed: the practice server had no tailnet. |

## Alerts

Three checks at an uptime service such as healthchecks.io (B-UPTIME, the
owner's account), each with its own ping URL:

- `PING_URL`, the dead-man's switch: the agent pings it every minute, and
  `<url>/fail` when a run fails. Set the check's period to 1 minute and its
  grace to 15 minutes: silence means the server, its timer or its agent stopped.
- `DISK_WARN_PING_URL`: pinged every 15 minutes, `/fail` below 25 % free.
- `DISK_CRIT_PING_URL`: the same at 10 %.

Unset, each is off and the machine's log says so every run. Send them with
`push-env.sh` (environment variables of the same names). **Rehearsed** (`run.sh
alerts`): a listener on the practice server received `/ping/agent` and
`/ping/agent/fail`, `/disk-25/fail` at 19 % free and `/disk-10/fail` at 4 %
free, then both OK again after the space was freed. A separate HTTP monitor on
`https://<domain>/api/healthz` with a certificate-expiry warning comes in Phase 7.

## Rebuilding the server from nothing

**In the order the rehearsal proved** (Phase 5b). The old order, files first and
secrets second, failed halfway: `sync-infra.sh` now refuses until `push-env.sh`
has run.

1. **Owner only, costs money:** `infra/server/provision.sh` in your own terminal,
   after its `--dry-run` and a look at the price (Phase 6 step 1). For a rebuild,
   delete the old server in the Hetzner console first.
2. `ssh root@daygame-prod cloud-init status --wait --long` — wait for `done`,
   `errors: []`. **Rehearsed:** 79 seconds.
3. `infra/server/push-env.sh <domain> <alert email>`, with the three alert URLs.
   If `~/.config/daygame/production.env` still exists, the old Server Actions
   key is kept, so open forms keep working.
4. `infra/server/sync-infra.sh <commit>` — Caddy starts, then the two timers.
5. The agent deploys the newest production image about a minute later.
   **Rehearsed:** 73 seconds from the agent's pickup to healthy, most of it the
   first image pull.
6. Check: `curl -sI https://<domain>/api/healthz` shows `HTTP/2 200` and
   `strict-transport-security`, and the JSON reports the commit.

The certificates are issued again by Let's Encrypt on a new server. Its limit is
5 identical certificates a week, which a few rebuilds do not reach.

The Hetzner console's root-password reset, the way in when Tailscale is down:
**rehearsed in Phase 6.**

## Changing the infrastructure itself

Any change to `infra/` reaches the server only through
`infra/server/sync-infra.sh <commit>`, which installs what changed and restarts
only that: Caddy for a Caddy file or `compose.yaml`, the timers for a unit,
nothing for a script, never the app. **Rehearsed:** the same commit twice
printed "changed: nothing"; a Caddy-only commit recreated Caddy and left the
app's container as it was.

**Rerun the rehearsal first** (below) for any change to `compose.yaml`, the
Caddyfiles, `cloud-init.yaml`, `deploy.sh`, the agent or the units.

## Rerunning the rehearsal

A practice production server on this machine, in about ten minutes, for free:
the real Ubuntu 24.04 image, the real `cloud-init.yaml`, set up only through
`push-env.sh` and `sync-infra.sh`. The differences from production are listed
at the top of `infra/rehearsal/run.sh`, and `up` prints them as a diff. It needs
about 5 GB of disk while it runs, 4 GB of memory, the GitHub CLI logged in with
`read:packages`, and nothing on 127.0.0.1 ports 18022, 18080, 18443 and 18015.

    REHEARSAL_DIR=<scratch dir> infra/rehearsal/run.sh up
    REHEARSAL_DIR=<scratch dir> infra/rehearsal/run.sh setup <commit>
    REHEARSAL_DIR=<scratch dir> infra/rehearsal/run.sh check
    REHEARSAL_DIR=<scratch dir> infra/rehearsal/run.sh reboot
    REHEARSAL_DIR=<scratch dir> infra/rehearsal/run.sh rollback
    REHEARSAL_DIR=<scratch dir> infra/rehearsal/run.sh pin sha256:<an older staging digest>
    REHEARSAL_DIR=<scratch dir> infra/rehearsal/run.sh rotate
    REHEARSAL_DIR=<scratch dir> infra/rehearsal/run.sh reissue
    REHEARSAL_DIR=<scratch dir> infra/rehearsal/run.sh alerts
    REHEARSAL_DIR=<scratch dir> infra/rehearsal/run.sh down

`down` always runs last: it deletes the VM, its disk, the practice CA, the SSH
key and the copy of the GitHub token. From a git worktree, set `ENV_SOURCE` to
the main checkout's `.env.local`.

## The monthly check of pinned versions (Q21)

Every version below is pinned on purpose: an update is a decision, made with
the tests and, for the server's parts, the rehearsal. Once a month, look for
newer releases and security notices, change one pin at a time, and run
`npm test`; for the first four, rerun the rehearsal too.

| Pin | Where | How to see the newest |
|---|---|---|
| Node base image `node:24.x-trixie-slim@sha256:…` | `infra/Dockerfile` | `docker buildx imagetools inspect node:24-trixie-slim` |
| Caddy `caddy:2.x-alpine@sha256:…` | `infra/compose.yaml` | `docker buildx imagetools inspect caddy:2-alpine`; https://github.com/caddyserver/caddy/releases |
| The Docker and Tailscale signing keys | `infra/server/cloud-init.yaml` | their fingerprints, against https://download.docker.com/linux/ubuntu/gpg and https://pkgs.tailscale.com/stable/ubuntu/noble.noarmor.gpg |
| Ubuntu 24.04 (`ubuntu-24.04` at Hetzner) | `infra/server/provision.sh` | supported until 2029; Ubuntu updates itself through unattended upgrades |
| GitHub actions, by 40-character commit | `.github/workflows/ci.yml`, `.github/actions/publish-image/action.yml` | `git ls-remote --tags https://github.com/<owner>/<action>` |
| gitleaks version and checksum | `.github/workflows/ci.yml`, `.husky/pre-push` | https://github.com/gitleaks/gitleaks/releases |
| The rehearsal's Ubuntu and Pebble images | `infra/rehearsal/` | `docker buildx imagetools inspect ubuntu:24.04`; https://github.com/letsencrypt/pebble/releases |
| npm packages | `package-lock.json` | `npm outdated`; the audit ratchet runs on every push |

Dependabot takes this over once `Plans/tests-worth-their-keep.md` Phase 9 has
rebuilt the browser-test workflow.
