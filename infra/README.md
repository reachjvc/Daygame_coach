# infra/ — the machine, written down

**What this is.** Everything needed to run this app as a deployment rather than
as a dev server. Today that machine is the owner's WSL box; the same files are
the rehearsal for the Hetzner server in `docs/plans/own-platform-and-app.md`.

**The rule this directory exists to make true:** *nothing exists on the box that
these files did not put there, except the secrets file.* A restored backup is
only worth something if the machine it is restored onto can be rebuilt, so the
backup plan is only as good as the machine plan.

The plan that owns this work, including its blockers and its decisions, is
`docs/plans/local-deploy-and-cd-pipeline.md`.

## Run it

    infra/run-local.sh              # build, then (re)start app + proxy
    infra/run-local.sh --no-build   # restart, reuse the last build
    infra/run-local.sh --status      # what is running, and which build
    infra/run-local.sh --stop       # stop both

Then open **https://localhost**.

The script checks every prerequisite by name and refuses rather than carrying on
degraded. If it stops, the message says what to do.

## What runs where, and why it is split

| Piece | How it runs | Why |
|---|---|---|
| The app | systemd **user** service, `127.0.0.1:3100` | No privileges needed; restarts on crash (verified: `kill -9` recovered in 2 s); configured to start at boot via `loginctl enable-linger`, which has not yet been observed across a real reboot |
| Caddy | **Docker** container, host network, ports 80 + 443 | Only root may bind ports below 1024. There is no passwordless sudo here; the Docker daemon is already root and the owner is in the `docker` group, so a container binds 443 with no password |

That split looks backwards — the proxy containerised, the app not — and it is
the only arrangement that needs no administrator rights. Phase 3 of the plan
moves the app into a container too, so that local and server run one artifact.

## This is not the dev server

| | `npm run dev` | `infra/run-local.sh` |
|---|---|---|
| Port | 3000 | 3100, behind Caddy on 443 |
| Serves | the working tree, as you save | a built artifact |
| `NODE_ENV` | development | **production** |
| `/test/*`, `/api/test/*` | available | **404 by design** |
| Build dir | `.next` | `.next-prod` |

Both run at the same time and never touch each other's build directory. The dev
server on :3000 is the owner's daily driver; nothing here stops, restarts or
reconfigures it.

## The certificate

There is no public domain yet, so ACME cannot issue for `localhost` and Caddy
uses its own CA. The root is exported to `caddy/local-root-ca.crt` on every run.
Trust it once — no administrator rights needed:

    certutil -user -addstore Root "\\wsl.localhost\Ubuntu\home\jonaswsl\projects\daygame-coach\infra\caddy\local-root-ca.crt"

Firefox has its own store: Settings → Privacy → Certificates → View → Import.

`caddy_data` is a **named Docker volume** on purpose. It holds the CA's root key;
delete it and Caddy mints a new root, the one you trusted stops matching, and a
site that worked yesterday shows a certificate error.

**There is deliberately no HSTS in the local config.** That header applies to a
host and ignores the port, so serving it for `localhost` would make the browser
force HTTPS on `http://localhost:3000` as well — and the dev server has no
certificate. One header would break the daily driver in a way that looks like a
dead dev server. HSTS belongs on the real domain.

## What stops this drifting

`tests/unit/infra/localDeploy.test.ts` reads these files the way Caddy and
systemd read them and fails when a rule here stops being true: the port named in
three places disagreeing, `-H 127.0.0.1` going missing, the LAN-address check
disappearing from `run-local.sh`, HSTS appearing in the local Caddyfile (or
missing from the production one, once it exists), or Caddy losing its restart
policy, its log cap or its persistent certificate volume. It was checked by
breaking two of those rules on purpose and watching it fail, then reverting.

## Things that will bite

- **`next build` edits `tsconfig.json`**, adding the dist dir to `include`.
  `run-local.sh` reverts its own entry every time; three from earlier sessions
  are already committed.
- **Sign-up and password reset bounce to Vercel** on the local deployment, because
  `https://localhost/**` is not on Supabase's redirect allow-list and those two
  flows build their redirect from `window.location.origin`. Ordinary password
  login works. See the plan's blocker `B-SUPABASE-REDIRECT`.
- **`journalctl --user -u daygame-local.service -f`** is where the app's output
  goes; `docker logs -f dg-caddy` is the proxy's. Both are capped.
