#!/usr/bin/env bash
#
# THE DEPLOY AGENT: run every minute by a systemd timer
# (infra/systemd/daygame-deploy.{service,timer}.template). It asks the registry
# which image the watched tag points at, and when that is a new digest that has
# not failed before, it hands the digest to infra/deploy.sh, the only deploy
# path. GitHub never logs into a machine; machines pull.
#
# Settings: WATCH in the same file infra/deploy.sh reads
# (~/.config/daygame/deploy.env, or DAYGAME_DEPLOY_ENV), e.g.
#   WATCH=ghcr.io/reachjvc/daygame-coach-staging:staging
#
# Exit status is what the systemd unit shows: non-zero when the registry could
# not be asked (a login error included) or when a deploy failed.
#
# Plans/caddy-deploy-and-cicd.md, Phase 4 step 1.

set -euo pipefail

INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_CONTAINER=dg-app
settings="${DAYGAME_DEPLOY_ENV:-${DAYGAME_CONFIG_DIR:-$HOME/.config/daygame}/deploy.env}"
DEFER_SECONDS=900

log() { printf '%s agent: %s\n' "$(date -Is)" "$*" >&2; }

[ -f "$settings" ] || { log "no settings at $settings"; exit 1; }
# The same KEY=value format infra/deploy.sh reads; a value may be in single quotes.
setting() { sed -n "s/^$1=//p" "$settings" | tail -1 | sed "s/^'\(.*\)'\$/\1/"; }
watch="$(setting WATCH)"
state_dir="$(setting STATE_DIR)"
state_dir="${state_dir:-$HOME/.local/state/daygame}"
[[ "$watch" =~ ^[a-z0-9][a-z0-9._/:-]*:[A-Za-z0-9._-]+$ ]] || { log "WATCH '$watch' in $settings is not <repo>:<tag>"; exit 1; }
repo="${watch%:*}"

version_file="${INFRA_VERSION_FILE:-/etc/daygame/infra-version}"
if [ -f "$version_file" ]; then infra_version="$(cat "$version_file")"; else infra_version="checkout $(git -C "$INFRA_DIR" rev-parse --short=12 HEAD 2>/dev/null || echo unknown)"; fi
log "infra $infra_version; watching $watch"

# The digest the tag points at now. buildx asks the registry with the
# credentials of `docker login`. A plain-HTTP rehearsal registry on this
# machine is read through its API instead, and only that one.
digest=""
if out="$(docker buildx imagetools inspect "$watch" --format '{{json .Manifest}}' 2>&1)"; then
  digest="$(jq -r '.digest // empty' <<<"$out" 2>/dev/null || true)"
elif [[ "$repo" =~ ^(localhost|127\.0\.0\.1):[0-9]+/ ]]; then
  registry="${repo%%/*}" name="${repo#*/}" tag="${watch##*:}"
  digest="$(curl -fsSI \
    -H 'Accept: application/vnd.oci.image.index.v1+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.docker.distribution.manifest.v2+json' \
    "http://$registry/v2/$name/manifests/$tag" | tr -d '\r' | sed -n 's/^[Dd]ocker-[Cc]ontent-[Dd]igest: //p')" || true
else
  log "could not read $watch from the registry: $(tail -1 <<<"$out")"
  exit 1
fi

# An empty or odd answer is never "new".
if ! [[ "$digest" =~ ^sha256:[0-9a-f]{64}$ ]]; then
  log "the registry gave no valid digest for $watch ('$digest')"
  exit 1
fi
target="$repo@$digest"

running="$(docker inspect -f '{{if .State.Running}}{{.Config.Image}}{{end}}' "$APP_CONTAINER" 2>/dev/null || true)"
if [ "$running" = "$target" ]; then
  log "up to date: $target"
  exit 0
fi
if grep -qxF "$target" "$state_dir/failed-digests" 2>/dev/null; then
  log "$target is marked failed; not retrying it (a newer push will replace it)"
  exit 0
fi
# A deploy that failed for a reason outside the image is retried, but not
# every minute: each attempt recreates the app twice.
last="$(awk -v t="$target" '$1 == t {print $2}' "$state_dir/deferred-digests" 2>/dev/null | tail -1)"
if [ -n "$last" ] && [ "$(( $(date +%s) - last ))" -lt "$DEFER_SECONDS" ]; then
  log "$target was deferred at $(date -d "@$last" -Is); retrying after $(date -d "@$((last + DEFER_SECONDS))" -Is)"
  exit 0
fi

log "new digest: $target (running: ${running:-nothing})"
exec "$INFRA_DIR/deploy.sh" "$target"
