#!/usr/bin/env bash
#
# Bring up the local production deployment: a real `next build`, served by
# `next start` on loopback, behind Caddy on https://localhost.
#
# THIS IS NOT `npm run dev`. The owner's dev server on :3000 serves the working
# tree and is their daily driver; nothing here touches it. This serves a built
# artifact on :3100 with NODE_ENV=production, which means the /test/* lab pages
# and /api/test/* routes are gone — the same gate the deployed site has.
#
# IT FAILS LOUDLY OR NOT AT ALL. Every prerequisite is checked and named. There
# is no branch anywhere in this script that carries on with a degraded setup,
# because the thing being rehearsed is a production deployment and a deployment
# that half-worked without saying so is the failure this whole exercise exists
# to prevent.
#
# Usage:
#   infra/run-local.sh              build, then (re)start everything
#   infra/run-local.sh --no-build   restart the servers, reuse the last build
#   infra/run-local.sh --stop       stop the app and Caddy
#   infra/run-local.sh --status     report what is and is not running

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIT_NAME="daygame-local.service"
UNIT_DIR="$HOME/.config/systemd/user"
TEMPLATE="$REPO/infra/systemd/${UNIT_NAME}.template"
COMPOSE_FILE="$REPO/infra/compose.local.yaml"
APP_PORT=3100
DIST_DIR=".next-prod"
CA_OUT="$REPO/infra/caddy/local-root-ca.crt"

die() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }
say() { printf '\n==> %s\n' "$*"; }

# --------------------------------------------------------------------------
# Prerequisites, each named with what to do about it.
# --------------------------------------------------------------------------
require_prereqs() {
  command -v node >/dev/null 2>&1 || die "node is not on PATH."

  local major
  major="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$major" -ge 20 ] || die "node $major is too old; Next 16.3.5 needs >= 20.9.0."

  command -v docker >/dev/null 2>&1 || die "docker is not installed, and Caddy needs it to bind port 443 without sudo."

  docker info >/dev/null 2>&1 ||
    die "docker is installed but this user cannot talk to it. Add yourself to the docker group, or start the daemon."

  docker compose version >/dev/null 2>&1 ||
    die "the docker compose plugin is missing. Install docker-compose-plugin."

  [ -f "$TEMPLATE" ] || die "missing $TEMPLATE"
  [ -f "$COMPOSE_FILE" ] || die "missing $COMPOSE_FILE"

  # The four NEXT_PUBLIC_* values are inlined into the JavaScript bundle at
  # BUILD time, so a build with no env file produces a bundle that cannot
  # reach Supabase and fails in the browser, not here. Checked rather than
  # assumed.
  [ -f "$REPO/.env.local" ] || [ -f "$REPO/.env" ] ||
    die "no .env.local or .env in $REPO. The NEXT_PUBLIC_SUPABASE_* values are baked into the bundle at build time, so building without them produces an app that cannot sign anybody in."

  # :3000 is the owner's dev server and :3200 is the by-hand production build
  # from docs/runbooks/timetrack.md. Refusing to touch either is deliberate.
  if ss -ltn 2>/dev/null | grep -q ":$APP_PORT "; then
    systemctl --user is-active --quiet "$UNIT_NAME" ||
      die "something that is not this service is already listening on :$APP_PORT. Find it with: ss -ltnp | grep :$APP_PORT"
  fi
}

# --------------------------------------------------------------------------
# The build. Memory-capped by scripts/build.sh, webpack by default — see
# .claude memory note next-build-oom-freezes-wsl: a Turbopack build of this
# app reached 29 GB and froze the machine three times in one day.
# --------------------------------------------------------------------------
build() {
  say "Building (webpack, 12 GB ceiling, output in $DIST_DIR)"
  ( cd "$REPO" && NEXT_DIST_DIR="$DIST_DIR" npm run build )

  # `next build` rewrites tsconfig.json to add the new distDir's types to
  # `include`. Three such entries from earlier sessions are already committed
  # (.next-audit, .next-audit2). Leaving a fourth would be noise in a file
  # three sessions share, so it is reverted here, every time, deliberately.
  if ! git -C "$REPO" diff --quiet -- tsconfig.json 2>/dev/null; then
    say "Reverting the tsconfig.json entry that 'next build' added for $DIST_DIR"
    git -C "$REPO" checkout -- tsconfig.json
  fi

  [ -f "$REPO/$DIST_DIR/BUILD_ID" ] || die "the build produced no $DIST_DIR/BUILD_ID, so there is nothing to serve."
}

# --------------------------------------------------------------------------
# The app, as a lingering systemd user service.
# --------------------------------------------------------------------------
install_unit() {
  mkdir -p "$UNIT_DIR"
  sed -e "s|@@REPO@@|$REPO|g" -e "s|@@NODE@@|$(command -v node)|g" "$TEMPLATE" > "$UNIT_DIR/$UNIT_NAME"
  systemctl --user daemon-reload

  # Without lingering, this service stops when the last shell closes and does
  # not come back after a reboot — so "deployed" would mean "running while I
  # am logged in". It needed no sudo on this machine.
  if [ "$(loginctl show-user "$USER" -p Linger --value 2>/dev/null || echo no)" != "yes" ]; then
    say "Enabling lingering so the service survives logout and reboot"
    loginctl enable-linger "$USER" ||
      die "could not enable lingering. The service will still run now, but it will stop when you log out. Fix: sudo loginctl enable-linger $USER"
  fi

  systemctl --user enable "$UNIT_NAME" >/dev/null
  systemctl --user restart "$UNIT_NAME"
}

wait_for_app() {
  say "Waiting for the app on 127.0.0.1:$APP_PORT"
  for _ in $(seq 1 60); do
    if curl -fsS -o /dev/null "http://127.0.0.1:$APP_PORT/" 2>/dev/null; then
      printf '    answering\n'; return 0
    fi
    sleep 1
  done
  printf '\n--- last 40 lines from the service ---\n' >&2
  journalctl --user -u "$UNIT_NAME" -n 40 --no-pager >&2 || true
  die "the app never answered on 127.0.0.1:$APP_PORT."
}

# --------------------------------------------------------------------------
# Caddy, and the one manual step: trusting its root certificate.
# --------------------------------------------------------------------------
start_caddy() {
  say "Starting Caddy (ports 80 and 443, via Docker)"
  docker compose -f "$COMPOSE_FILE" up -d

  for _ in $(seq 1 30); do
    curl -sk -o /dev/null "https://localhost/" 2>/dev/null && break
    sleep 1
  done

  # Export the internal CA's root so a browser or curl can be told to trust
  # it. Without this every request is a certificate warning, and the habit of
  # clicking through certificate warnings is worth more than this whole
  # exercise saves.
  if docker cp dg-caddy:/data/caddy/pki/authorities/local/root.crt "$CA_OUT" 2>/dev/null; then
    say "Caddy's local root certificate: $CA_OUT"
    printf '    Trust it once (no admin rights needed):\n'
    printf '      Windows/Chrome/Edge:  certutil -user -addstore Root "%s"\n' "$(wslpath -w "$CA_OUT" 2>/dev/null || echo "$CA_OUT")"
    printf '      Firefox:              Settings > Privacy > Certificates > View > Import\n'
    printf '      Linux-side curl:      already verified below with --cacert\n'
  else
    die "Caddy started but its root certificate is not where it was expected (/data/caddy/pki/authorities/local/root.crt). Check: docker logs dg-caddy"
  fi
}

# --------------------------------------------------------------------------
# Prove it, end to end, the way a browser will see it.
# --------------------------------------------------------------------------
verify() {
  say "Verifying the whole chain"

  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --cacert "$CA_OUT" https://localhost/)"
  [ "$code" = "200" ] || die "https://localhost/ answered $code, not 200. (TLS verified against $CA_OUT, so a failure here is the app or the proxy, not the certificate.)"
  printf '    https://localhost/            200, certificate verified against the local root\n'

  code="$(curl -s -o /dev/null -w '%{http_code}' --cacert "$CA_OUT" https://localhost/dashboard)"
  [ "$code" = "307" ] || die "https://localhost/dashboard answered $code; a signed-out visitor must be redirected (307) to the login page."
  printf '    https://localhost/dashboard   307 to the login page, so the auth guard is live\n'

  # http must redirect to https, or the first visit of the day is in cleartext.
  code="$(curl -s -o /dev/null -w '%{http_code}' http://localhost/)"
  [ "$code" = "308" ] || die "http://localhost/ answered $code, not a 308 redirect to https."
  printf '    http://localhost/             308 to https\n'

  # The app must NOT be reachable except through the proxy.
  local wsl_ip
  wsl_ip="$(hostname -I | awk '{print $1}')"
  if [ -n "$wsl_ip" ] && curl -s --max-time 3 -o /dev/null "http://$wsl_ip:$APP_PORT/" 2>/dev/null; then
    die "the app answered on $wsl_ip:$APP_PORT, so it is NOT loopback-only and the proxy is not the only door in."
  fi
  printf '    %s:%s                 refused, so the app is loopback-only\n' "$wsl_ip" "$APP_PORT"
}

status() {
  printf '\n--- app (systemd user service) ---\n'
  systemctl --user --no-pager --lines=0 status "$UNIT_NAME" 2>&1 | head -5 || true
  printf '\n--- caddy ---\n'
  docker compose -f "$COMPOSE_FILE" ps 2>&1 || true
  printf '\n--- listeners ---\n'
  ss -ltn | grep -E ':80 |:443 |:3000 |:3100 ' || true
  printf '\n--- build being served ---\n'
  if [ -f "$REPO/$DIST_DIR/BUILD_ID" ]; then
    printf 'BUILD_ID %s (built %s)\n' "$(cat "$REPO/$DIST_DIR/BUILD_ID")" \
      "$(date -r "$REPO/$DIST_DIR/BUILD_ID" '+%Y-%m-%d %H:%M')"
  else
    printf 'no build in %s\n' "$DIST_DIR"
  fi
}

stop() {
  say "Stopping"
  systemctl --user stop "$UNIT_NAME" 2>/dev/null || true
  docker compose -f "$COMPOSE_FILE" down
  printf '    stopped. The dev server on :3000 was never touched.\n'
}

main() {
  case "${1:-}" in
    --stop)   stop; exit 0 ;;
    --status) status; exit 0 ;;
    --no-build) require_prereqs ;;
    "")       require_prereqs; build ;;
    *)        die "unknown argument '$1'. Use --no-build, --stop or --status." ;;
  esac

  install_unit
  wait_for_app
  start_caddy
  verify

  cat <<EOF

==> Up. https://localhost  (also https://daygame.localhost if that name
    resolves on your side of WSL)

    This is a production build: the /test/* pages and /api/test/* routes
    answer 404 here by design, exactly as they do on the deployed site.

    Logs      journalctl --user -u $UNIT_NAME -f
              docker logs -f dg-caddy
    Restart   infra/run-local.sh --no-build
    Rebuild   infra/run-local.sh
    Stop      infra/run-local.sh --stop
EOF
}

main "$@"
