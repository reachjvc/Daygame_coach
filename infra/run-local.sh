#!/usr/bin/env bash
#
# The local deployment: the app's Docker image, built from a commit, behind
# Caddy on https://localhost. This machine is staging (Plans/caddy-deploy-and-cicd.md).
#
# THIS IS NOT `npm run dev`. The owner's dev server on :3000 serves the working
# folder and is their daily driver; nothing here touches it. This serves an
# image with NODE_ENV=production, so the /test/* lab pages and /api/test/*
# routes are gone, exactly as on a deployed site.
#
# IT FAILS LOUDLY OR NOT AT ALL. Every prerequisite is checked and named, and
# the deploy itself goes through infra/deploy.sh, which rolls back on a failed
# health check.
#
# Usage:
#   infra/run-local.sh [<commit>]       build the image of <commit> (default: HEAD),
#                                       then deploy it. Prints the full commit SHA.
#   infra/run-local.sh --no-build [<commit>]
#                                       deploy the image already built for <commit>
#   infra/run-local.sh --stop           stop the app and Caddy
#   infra/run-local.sh --status         report what is and is not running

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA="$REPO/infra"
CONFIG_DIR="${DAYGAME_CONFIG_DIR:-$HOME/.config/daygame}"
RUNTIME_ENV="$CONFIG_DIR/staging.env"
DEPLOY_ENV="$CONFIG_DIR/deploy.env"
CA_OUT="$INFRA/caddy/local-root-ca.crt"
IMAGE_NAME=daygame-coach
OLD_UNIT=daygame-local.service

die() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }
say() { printf '\n==> %s\n' "$*"; }

compose() {
  APP_ENV_FILE="$RUNTIME_ENV" CADDYFILE=caddy/Caddyfile.local APP_IMAGE="${APP_IMAGE:-unset}" \
    docker compose --project-directory "$INFRA" -f "$INFRA/compose.yaml" "$@"
}

require_prereqs() {
  command -v docker >/dev/null 2>&1 || die "docker is not installed; Caddy and the app both run in it."
  docker info >/dev/null 2>&1 || die "docker is installed but this user cannot talk to it."
  docker compose version >/dev/null 2>&1 || die "the docker compose plugin is missing."
  command -v jq >/dev/null 2>&1 || die "jq is missing (infra/deploy.sh reads /api/healthz with it)."
  # The systemd deployment this replaced must not run beside it: both would
  # want the same Caddy and the same name.
  if systemctl --user is-active --quiet "$OLD_UNIT" 2>/dev/null; then
    die "the old $OLD_UNIT is still running. Stop it first: systemctl --user disable --now $OLD_UNIT"
  fi
}

ensure_env_files() {
  if [ ! -f "$RUNTIME_ENV" ] || [ ! -f "$CONFIG_DIR/build-public.env" ]; then
    say "Writing the env files from .env.local (names only are printed)"
    "$INFRA/write-env-file.sh" staging
  fi
  if [ ! -f "$DEPLOY_ENV" ]; then
    umask 077
    cat > "$DEPLOY_ENV" <<EOF
APP_ENV_FILE=$RUNTIME_ENV
CADDYFILE=caddy/Caddyfile.local
SITE_HOST=localhost
CA_CERT=$CA_OUT
EOF
    say "Wrote $DEPLOY_ENV (this machine's settings for infra/deploy.sh)"
  fi
}

start_caddy() {
  say "Starting Caddy (ports 80 and 443 published by Docker)"
  compose up -d caddy >/dev/null
  for _ in $(seq 1 30); do
    [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 http://localhost/ || true)" = 308 ] && break
    sleep 1
  done
  # Export the local CA's root so a browser or curl can be told to trust it.
  docker cp dg-caddy:/data/caddy/pki/authorities/local/root.crt "$CA_OUT" >/dev/null 2>&1 ||
    die "Caddy started but its root certificate is not at /data/caddy/pki/authorities/local/root.crt. Check: docker logs dg-caddy"
  chmod 600 "$CA_OUT"
}

verify() {
  local sha="$1" code body
  say "Verifying, the way a browser sees it"
  body="$(curl -s --cacert "$CA_OUT" https://localhost/api/healthz)"
  [ "$(jq -r '.buildId + " " + .proto' <<<"$body")" = "$sha https" ] ||
    die "https://localhost/api/healthz did not report commit $sha over https: $(jq -c '{status,buildId,proto}' <<<"$body" 2>/dev/null || echo "$body")"
  printf '    https://localhost/api/healthz  200, buildId %s, proto https\n' "$sha"
  # /test/* are lab pages and /api/test/* write real data with no login: both
  # must be gone in a production build (app/test/layout.tsx, proxy.ts).
  local url want
  while read -r url want; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --cacert "$CA_OUT" "$url")"
    [ "$code" = "$want" ] || die "$url answered $code, not $want."
    printf '    %-38s %s\n' "$url" "$code"
  done <<'CHECKS'
https://localhost/ 200
https://localhost/dashboard 307
http://localhost/ 308
https://localhost/test/crash 404
https://localhost/api/test/pending-draft 404
CHECKS
  [ -z "$(docker port dg-app 2>/dev/null)" ] || die "the app container publishes a port; it must be reachable only through Caddy."
  printf '    dg-app                         publishes no port\n'
}

status() {
  printf '\n--- containers ---\n'
  compose ps 2>&1 || true
  printf '\n--- what https://localhost serves ---\n'
  curl -s --cacert "$CA_OUT" https://localhost/api/healthz 2>/dev/null | jq -c . 2>/dev/null || echo "nothing answers"
  printf '\n--- listeners ---\n'
  ss -ltn | grep -E ':80 |:443 |:3000 ' || true
}

stop() {
  say "Stopping"
  compose down
  printf '    stopped. The dev server on :3000 was never touched.\n'
}

main() {
  local build=yes
  case "${1:-}" in
    --stop) stop; exit 0 ;;
    --status) status; exit 0 ;;
    --no-build) build=no; shift ;;
    --*) die "unknown option '$1'. Use --no-build, --stop or --status." ;;
  esac
  [ $# -le 1 ] || die "one commit at most."
  local sha
  sha="$(git -C "$REPO" rev-parse --verify --quiet "${1:-HEAD}^{commit}")" || die "'${1:-HEAD}' is not a commit."

  require_prereqs
  ensure_env_files
  say "Commit $sha"

  local image
  if [ "$build" = yes ]; then
    image="$("$INFRA/build-image.sh" "$sha")"
  else
    image="$(docker image inspect -f '{{.Id}}' "$IMAGE_NAME:$sha" 2>/dev/null)" ||
      die "no image $IMAGE_NAME:$sha here. Build it: infra/run-local.sh $sha"
  fi

  APP_IMAGE="$image" start_caddy
  say "Deploying $image through infra/deploy.sh"
  "$INFRA/deploy.sh" "$image"
  verify "$sha"

  cat <<EOF

==> Up. https://localhost serves commit $sha.

    Logs      docker logs -f dg-app      docker logs -f dg-caddy
    Status    infra/run-local.sh --status
    Stop      infra/run-local.sh --stop
EOF
}

main "$@"
