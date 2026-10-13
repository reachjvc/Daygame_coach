# infra/ — the machine, written down

**What this is.** Everything needed to run this app as a deployment rather than
as a dev server. Today that machine is the owner's WSL box, which is staging;
the same files run the production server in Phase 6 of the plan.

**The rule this directory exists to make true:** *nothing exists on a machine
that these files did not put there, except the secrets file.* A restored backup
is only worth something if the machine it is restored onto can be rebuilt, so
the backup plan is only as good as the machine plan.

The plan that owns this work, including its blockers and its decisions, is
`Plans/caddy-deploy-and-cicd.md` (it replaced `docs/plans/local-deploy-and-cd-pipeline.md`
on 2026-10-13).

## Run it

    infra/run-local.sh [<commit>]             # build the image of a commit (default HEAD), deploy it
    infra/run-local.sh --no-build [<commit>]  # deploy the image already built for that commit
    infra/run-local.sh --status               # what is running, and which commit
    infra/run-local.sh --stop                 # stop the app and Caddy

Then open **https://localhost**. The script prints the full commit SHA it built,
and `https://localhost/api/healthz` reports the same SHA as `buildId`.

The script checks every prerequisite by name and refuses rather than carrying on
degraded. If it stops, the message says what to do.

## The pieces

| File | What it is |
|---|---|
| `Dockerfile` | The app as one image, built from one commit. Debian slim (onnxruntime-node needs glibc), Node 24, non-root, `exec`s the server so a stop signal drains it. |
| `../.dockerignore` | An allow-list: a new file reaches an image only when added there on purpose; `.env*` never. |
| `build-image.sh` | Builds the image from `git archive <commit>` in the 12 GB-capped buildx builder `dg-capped`. A build on this machine once took 29 GB. |
| `write-env-file.sh` | Writes `~/.config/daygame/staging.env` (runtime secrets) and `build-public.env` from `.env.local`, mode 600, printing names only. |
| `compose.yaml` | The app and Caddy, the same file on every machine. The app publishes no port, runs read-only with no capabilities, 2 GB. |
| `caddy/common.caddy` | What both Caddyfiles share: compression, body limit, no version banners, the preview headers stripped, `reverse_proxy app:3000`. |
| `caddy/Caddyfile.local` | localhost with Caddy's own CA. No HSTS. |
| `caddy/Caddyfile.production` | The real domain: Let's Encrypt only, HSTS, timeouts. |
| `deploy.sh` | **The only deploy path.** Digest in, health checked inside and through Caddy, rolled back on failure. |
| `deploy-agent.sh` + `systemd/daygame-deploy.*` | Every minute: is there a new digest on the watched tag? Then `deploy.sh`. |
| `github-config.sh` | Sets the `staging` environment, its public variables and `STAGING_PUBLISH=on`. |
| `server/cloud-init.yaml` | The production server's first boot: Docker, Tailscale SSH, no OpenSSH, containers kept off the metadata service and the tailnet. |
| `server/provision.sh` | Creates the Hetzner firewall (80/443 only, IPv4 and IPv6), key and server. `--dry-run` first. |
| `server/sync-infra.sh` | The only way files reach the server, from `git archive <commit>`; restarts only what changed. |
| `server/push-env.sh` | Sends the server its secrets file, settings and read-only registry login. |
| `dns/records.sh` | Cloudflare records: DNS only, CAA for Let's Encrypt, SPF and DMARC that refuse mail. |

## This is not the dev server

| | `npm run dev` | `infra/run-local.sh` |
|---|---|---|
| Port | 3000 | 443 through Caddy; the app itself publishes none |
| Serves | the working folder, as you save | an image built from one commit |
| `NODE_ENV` | development | **production** |
| `/test/*`, `/api/test/*` | available | **404 by design** |
| Node | the machine's default | 24, inside the image |

Both run at the same time. The dev server on :3000 is the owner's daily driver;
nothing here stops, restarts or reconfigures it.

## The certificate

There is no public domain yet, so ACME cannot issue for `localhost` and Caddy
uses its own CA. The root is exported to `caddy/local-root-ca.crt` on every run.
Trust it once — no administrator rights needed:

    certutil -user -addstore Root "\\wsl.localhost\Ubuntu\home\jonaswsl\projects\daygame-coach\infra\caddy\local-root-ca.crt"

Firefox has its own store: Settings → Privacy → Certificates → View → Import.

`caddy_data` is a **named Docker volume** (`infra_caddy_data`) on purpose. It
holds the CA's root key; delete it and Caddy mints a new root, the one you
trusted stops matching, and a site that worked yesterday shows a certificate
error. `compose.yaml` keeps the project name `infra` so the volume carried over
from the systemd deployment this replaced.

**There is deliberately no HSTS in the local config.** That header applies to a
host and ignores the port, so serving it for `localhost` would make the browser
force HTTPS on `http://localhost:3000` as well — and the dev server has no
certificate. HSTS belongs on the real domain, and only there.

## What stops this drifting

`tests/unit/infra/localDeploy.test.ts` reads these files the way Docker, compose
and Caddy read them, and fails when a rule stops being true: a port published
for the app, HSTS on localhost, a restart policy, log cap, tmpfs cap or the
certificate volume going missing, the Dockerfile running as root or dropping
`exec` or a required build argument, `.dockerignore` letting `.env*` in, compose
no longer failing on a missing setting, or `common.caddy` no longer stripping
the preview headers. `tests/unit/infra/production.test.ts` does the same for the
production files.

## Things that will bite

- **Sign-up and password reset bounce to Vercel** on the local deployment, because
  `https://localhost/**` is not on Supabase's redirect allow-list and those two
  flows build their redirect from `window.location.origin`. Ordinary password
  login works. See the plan's blocker `B-SUPABASE-REDIRECT`.
- **Features that shell out to the Claude CLI do not work in the container**, and
  neither does Ollama on this machine's own localhost: inside the container,
  localhost is the container. The master plan's D4 moves the Claude features to
  the API.
- **Logs:** `docker logs -f dg-app` and `docker logs -f dg-caddy`; the deploy
  agent's in `journalctl --user -u daygame-deploy`. All capped.
