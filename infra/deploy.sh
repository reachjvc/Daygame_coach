#!/usr/bin/env bash
#
# THE ONLY WAY ANYTHING IS DEPLOYED, by a person, by the deploy agent, on every
# machine.
#
#   infra/deploy.sh <repo>@sha256:<64 hex>     an image from a registry, by digest
#   infra/deploy.sh sha256:<64 hex>            a local image ID (rehearsal only)
#   infra/deploy.sh --retry-failed <ref>       deploy a digest marked failed, on purpose
#   infra/deploy.sh --restart <ref>            start the running image again with the
#                                              machine's current settings, e.g. after a
#                                              secret was rotated (infra/RUNBOOK.md)
#
# What it does, one log line per step:
#   1. refuses any other kind of reference: a tag can point at different code
#      tomorrow, a digest cannot;
#   2. takes a lock; if another deploy holds it, exits 0;
#   3. checks Caddy is up before touching the app, because if it is not, a
#      failed health check would blame a good image;
#   4. pulls the image and records the running one as "previous" (by the
#      reference it was started with, which is always a digest or image ID);
#   5. runs migrations (none while the database is Supabase; the step is here
#      so it is already first in line);
#   6. starts the new image;
#   7. waits up to 90 s for /api/healthz to answer 200 with the image's own
#      commit, inside the container and again through Caddy (where it must
#      also report proto "https");
#   8. on failure, starts the previous image again. If that one is healthy and
#      the new image never even answered with its own commit (it crashed, or
#      never started), the new digest is marked failed and is never retried
#      automatically. If the new image did answer with its own commit and only
#      the database check failed, a blip may be to blame: it is deferred, and a
#      second such failure marks it failed. If the previous image fails too,
#      the cause is not the image (Supabase down, a broken Caddy, the network):
#      nothing is marked and the digest is deferred. Deferred means the agent
#      leaves it alone for 15 minutes instead of retrying every minute. On a
#      first deploy there is no previous image: the failed container is left
#      stopped. Every failure exits non-zero and raises an alert;
#   9. removes old app images, never the current or the previous; keeps 3.
#
# Machine settings come from ~/.config/daygame/deploy.env (DAYGAME_CONFIG_DIR
# moves the directory; on a server DAYGAME_DEPLOY_ENV names
# /etc/daygame/deploy.env), KEY=VALUE lines, a value optionally in single quotes:
#   APP_ENV_FILE  runtime env file for the container (required)
#   CADDYFILE     Caddyfile for this machine, relative to infra/ (required)
#   SITE_HOST     the name Caddy serves, e.g. localhost (required)
#   CA_CERT       a CA file to verify Caddy's certificate with (optional;
#                 unset means the system's CAs, as on a real domain)
#   STATE_DIR     where failed digests are recorded (default ~/.local/state/daygame)
#   ACME_EMAIL    production only: Caddy's contact for Let's Encrypt
#   ACME_DIRECTORY, ACME_CA_CERT
#                 the practice server only (infra/rehearsal/run.sh): a practice
#                 ACME CA, and the file that makes Caddy trust it. Refused unless
#                 SITE_HOST ends in .test, a name that can never be real, so a
#                 real domain always gets Let's Encrypt.
#   WATCH         the tag infra/deploy-agent.sh watches (not read here)
#   PING_URL, DISK_WARN_PING_URL, DISK_CRIT_PING_URL
#                 the checks the agent and infra/disk-alert.sh ping (not read here)
#
# Plans/caddy-deploy-and-cicd.md, Phase 3 step 7.

set -euo pipefail

INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# docker compose refuses to run from a directory its user cannot read ("stat .:
# permission denied"), such as root's home when a person runs this with
# `su deploy -c` on the server. The rehearsal found it (Phase 5b).
cd "$INFRA_DIR"
COMPOSE=(docker compose --project-directory "$INFRA_DIR" -f "$INFRA_DIR/compose.yaml")
APP_CONTAINER=dg-app
CADDY_CONTAINER=dg-caddy
HEALTH_WAIT_SECONDS="${HEALTH_WAIT_SECONDS:-90}"
KEEP_IMAGES=3
APP_TITLE=daygame-coach

log() { printf '%s deploy: %s\n' "$(date -Is)" "$*" >&2; }
alert() {
  log "ALERT: $*"
  logger -p user.err -t daygame-deploy "ALERT: $*" 2>/dev/null || true
}
die() { log "refused: $*"; exit 2; }

# --- arguments ------------------------------------------------------------------
retry_failed=no restart=no
case "${1:-}" in
  --retry-failed) retry_failed=yes; shift ;;
  --restart) restart=yes; shift ;;
esac
[ $# -eq 1 ] || die "usage: infra/deploy.sh [--retry-failed | --restart] <repo>@sha256:<digest> | sha256:<image id>"
ref="$1"
if [[ "$ref" =~ ^[a-z0-9][a-z0-9._/:-]*@sha256:[0-9a-f]{64}$ ]]; then
  kind=registry
elif [[ "$ref" =~ ^sha256:[0-9a-f]{64}$ ]]; then
  kind=local
else
  die "'$ref' is neither <repo>@sha256:<64 hex> nor a local image ID sha256:<64 hex>. Tags are never deployed."
fi

# --- machine settings -------------------------------------------------------------
settings="${DAYGAME_DEPLOY_ENV:-${DAYGAME_CONFIG_DIR:-$HOME/.config/daygame}/deploy.env}"
[ -f "$settings" ] || die "no machine settings at $settings."
APP_ENV_FILE="" CADDYFILE="" SITE_HOST="" CA_CERT="" STATE_DIR="" ACME_EMAIL="" ACME_DIRECTORY="" ACME_CA_CERT=""
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in ''|'#'*) continue ;; esac
  key="${line%%=*}" value="${line#*=}"
  if [[ "$value" == \'*\' ]]; then value="${value:1:${#value}-2}"; fi
  case "$key" in
    APP_ENV_FILE|CADDYFILE|SITE_HOST|CA_CERT|STATE_DIR) printf -v "$key" '%s' "$value" ;;
    ACME_EMAIL|ACME_DIRECTORY|ACME_CA_CERT) printf -v "$key" '%s' "$value" ;;
    WATCH|PING_URL|DISK_WARN_PING_URL|DISK_CRIT_PING_URL) ;; # the agent's and the disk alert's settings
    *) die "unknown setting '$key' in $settings." ;;
  esac
done < "$settings"
[ -n "$APP_ENV_FILE" ] && [ -f "$APP_ENV_FILE" ] || die "APP_ENV_FILE '$APP_ENV_FILE' (from $settings) is not a file."
[ -n "$CADDYFILE" ] && [ -f "$INFRA_DIR/$CADDYFILE" ] || die "CADDYFILE '$CADDYFILE' (from $settings) is not a file under $INFRA_DIR."
[ -n "$SITE_HOST" ] || die "SITE_HOST is not set in $settings."
[ -z "$CA_CERT" ] || [ -f "$CA_CERT" ] || die "CA_CERT '$CA_CERT' is not a file."
if [ -n "$ACME_DIRECTORY$ACME_CA_CERT" ] && [[ "$SITE_HOST" != *.test ]]; then
  die "ACME_DIRECTORY and ACME_CA_CERT are for the practice server only, and SITE_HOST '$SITE_HOST' is not a .test name. A real domain gets its certificates from Let's Encrypt."
fi
[ -z "$ACME_CA_CERT" ] || [ -f "$ACME_CA_CERT" ] || die "ACME_CA_CERT '$ACME_CA_CERT' is not a file."
STATE_DIR="${STATE_DIR:-$HOME/.local/state/daygame}"
mkdir -p "$STATE_DIR"
FAILED="$STATE_DIR/failed-digests"
DEFERRED="$STATE_DIR/deferred-digests"
touch "$FAILED" "$DEFERRED"
export APP_ENV_FILE CADDYFILE SITE_HOST ACME_EMAIL ACME_DIRECTORY ACME_CA_CERT

if [ "$retry_failed" = no ] && grep -qxF "$ref" "$FAILED"; then
  die "$ref is marked failed in $FAILED. Deploy it again only on purpose: infra/deploy.sh --retry-failed $ref"
fi

# --- 2. one deploy at a time --------------------------------------------------------
# In the state directory, so every caller (the agent, a person, root or the
# deploy user) takes the same lock.
lock="$STATE_DIR/deploy.lock"
exec 9>"$lock"
if ! flock -n 9; then
  log "another deploy holds $lock; nothing to do"
  exit 0
fi
log "deploying $ref ($kind)"

# --- 3. Caddy first -------------------------------------------------------------------
[ "$(docker inspect -f '{{.State.Running}}' "$CADDY_CONTAINER" 2>/dev/null || echo false)" = true ] ||
  { alert "Caddy ($CADDY_CONTAINER) is not running; not touching the app"; exit 1; }
redirect="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 -H "Host: $SITE_HOST" http://127.0.0.1/ || true)"
[ "$redirect" = 308 ] ||
  { alert "Caddy answered http://$SITE_HOST/ with '$redirect', not its 308 to https; not touching the app"; exit 1; }
log "caddy is up (http://$SITE_HOST/ -> 308)"

# --- 4. the image, and what runs now ------------------------------------------------
if [ "$kind" = registry ]; then
  docker pull -q "$ref" >/dev/null || { alert "could not pull $ref"; exit 1; }
fi
docker image inspect "$ref" >/dev/null 2>&1 || die "$ref is not available locally."
revision_of() { docker image inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$1"; }
want="$(revision_of "$ref")"
[[ "$want" =~ ^[0-9a-f]{40}$ ]] || die "$ref has no commit in its org.opencontainers.image.revision label ('$want'), so its health check could not prove anything."
# Only a RUNNING app is something to roll back to. A container left stopped by a
# failed first deploy is not.
previous="$(docker inspect -f '{{if .State.Running}}{{.Config.Image}}{{end}}' "$APP_CONTAINER" 2>/dev/null || true)"
log "image ready: commit $want; previous: ${previous:-none}"

# Set when the app answered /api/healthz with the expected commit at all, even
# with a 503: proof that the image itself started.
answered_own_commit=no
healthy_now() { # $1 = expected commit
  local inside outside
  inside="$(docker exec "$APP_CONTAINER" node -e \
    "fetch('http://127.0.0.1:3000/api/healthz').then(async r => console.log(r.status, await r.text()), () => console.log(0))" 2>/dev/null || echo 0)"
  [ "$(jq -r .buildId <<<"${inside#* }" 2>/dev/null)" = "$1" ] || return 1
  answered_own_commit=yes
  [ "${inside%% *}" = 200 ] || return 1
  outside="$(curl -s --max-time 5 --resolve "$SITE_HOST:443:127.0.0.1" ${CA_CERT:+--cacert "$CA_CERT"} \
    -w '\n%{http_code}' "https://$SITE_HOST/api/healthz" 2>/dev/null || true)"
  [ "${outside##*$'\n'}" = 200 ] || return 1
  [ "$(jq -r '.buildId + " " + .proto' <<<"${outside%$'\n'*}" 2>/dev/null)" = "$1 https" ] || return 1
}

# --restart recreates the container even though its image is the same: compose
# would otherwise keep a container whose settings it does not see as changed.
UP=(up -d --no-deps)
if [ "$restart" = yes ]; then UP+=(--force-recreate); fi
start_and_check() { # $1 = ref, $2 = expected commit
  local out
  if ! out="$(APP_IMAGE="$1" "${COMPOSE[@]}" "${UP[@]}" app 2>&1)"; then
    log "could not start $1: $(tail -1 <<<"$out")"
    return 1
  fi
  local deadline=$((SECONDS + HEALTH_WAIT_SECONDS))
  while [ "$SECONDS" -lt "$deadline" ]; do
    if healthy_now "$2"; then return 0; fi
    sleep 2
  done
  return 1
}

if [ "$restart" = yes ] && [ "$previous" != "$ref" ]; then
  die "--restart starts the running image again, and $ref is not what runs (${previous:-nothing}). Deploy it without --restart."
fi
if [ "$restart" = no ] && [ -n "$previous" ] && [ "$previous" = "$ref" ] && healthy_now "$want"; then
  log "already running $ref and healthy; nothing changed"
  exit 0
fi

# --- 5. migrations --------------------------------------------------------------------
log "migrations: none (the database is Supabase, migrated outside deploys)"

# --- 6 and 7. start, then prove it -----------------------------------------------------
log "starting $ref"
if start_and_check "$ref" "$want"; then
  log "healthy: /api/healthz answers 200 with commit $want, inside and through Caddy (proto https)"
else
  # --- 8. roll back ---------------------------------------------------------------------
  started="$answered_own_commit"
  defer() { printf '%s %s\n' "$ref" "$(date +%s)" >> "$DEFERRED"; }
  log "unhealthy after ${HEALTH_WAIT_SECONDS}s: $ref (it answered with its own commit: $started)"
  if [ "$previous" = "$ref" ]; then
    defer
    if [ "$restart" = yes ]; then
      alert "$ref is unhealthy after --restart with the machine's current settings: check what changed in them; nothing marked, deferred"
    else
      alert "$ref is what was already running, and it is unhealthy: the cause is outside the image; nothing marked, deferred"
    fi
    exit 1
  fi
  if [ -z "$previous" ]; then
    APP_IMAGE="$ref" "${COMPOSE[@]}" stop app >/dev/null 2>&1 || true
    defer
    alert "first deploy of $ref failed its health check; the container is stopped, nothing was marked, deferred"
    exit 1
  fi
  log "rolling back to $previous"
  if start_and_check "$previous" "$(revision_of "$previous")"; then
    if [ "$started" = yes ] && ! grep -q "^$ref " "$DEFERRED"; then
      defer
      alert "$ref started but failed its health check, and $previous is healthy again: rolled back, not marked failed this once (a database blip?), deferred 15 minutes"
    else
      printf '%s\n' "$ref" >> "$FAILED"
      alert "$ref failed its health check and was rolled back to $previous; marked failed in $FAILED"
    fi
  else
    defer
    alert "$ref failed, and so did the previous image $previous: the cause is outside the image; nothing marked, deferred"
  fi
  exit 1
fi

# --- 9. prune --------------------------------------------------------------------------
current_id="$(docker image inspect -f '{{.Id}}' "$ref")"
previous_id=""
if [ -n "$previous" ]; then previous_id="$(docker image inspect -f '{{.Id}}' "$previous" 2>/dev/null || true)"; fi
budget=$((KEEP_IMAGES - 1))
if [ -n "$previous_id" ] && [ "$previous_id" != "$current_id" ]; then budget=$((budget - 1)); fi
removed=0
while read -r id; do
  [ -n "$id" ] || continue
  if [ "$id" = "$current_id" ] || [ "$id" = "$previous_id" ]; then continue; fi
  if [ "$budget" -gt 0 ]; then budget=$((budget - 1)); continue; fi
  if docker image rm -f "$id" >/dev/null 2>&1; then removed=$((removed + 1)); fi
done < <(docker images --no-trunc --filter "label=org.opencontainers.image.title=$APP_TITLE" \
  --format '{{.CreatedAt}}\t{{.ID}}' | sort -r | cut -f2 | awk '!seen[$0]++')
log "pruned $removed old image(s); kept the current, the previous, and the newest others up to $KEEP_IMAGES in all"
log "done: $ref is live"
