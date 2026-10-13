#!/usr/bin/env bash
#
# THE ONLY WAY FILES REACH THE SERVER, at first boot and every time after.
#
#   infra/server/sync-infra.sh --dry-run <commit>   print the plan; touch nothing
#   infra/server/sync-infra.sh <commit>             do it, over Tailscale SSH
#
# From `git archive <commit>` (tracked files at that commit, never the working
# folder) it installs on the server:
#   /opt/daygame/infra/compose.yaml, caddy/common.caddy, caddy/Caddyfile.production,
#   deploy.sh, deploy-agent.sh                         root-owned, read-only to others
#   /etc/systemd/system/daygame-deploy.{service,timer} the agent, as the deploy user
#   /etc/daygame/infra-version                         the commit, logged by the agent
# and then restarts only what changed:
#   a Caddy file          -> Caddy is recreated (its admin API is off, so no reload)
#   compose.yaml          -> Caddy is recreated. The app is never touched here:
#                            infra/deploy.sh is its only path, with a health
#                            check and a rollback, and it applies the new file
#                            at the next deploy.
#   a unit                -> daemon-reload, and the timer is (re)started
#   a script              -> nothing; the timer runs the new one next minute
#
# Secrets never pass through here: infra/server/push-env.sh sends those.
# SERVER (default daygame-prod) is the server's Tailscale name.
# Plans/caddy-deploy-and-cicd.md, Phase 5 step 3; run for real in Phase 6.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVER="${SERVER:-daygame-prod}"
DEST=/opt/daygame/infra
FILES=(infra/compose.yaml infra/caddy/common.caddy infra/caddy/Caddyfile.production infra/deploy.sh infra/deploy-agent.sh)
UNITS=(daygame-deploy.service daygame-deploy.timer)

die() { printf 'sync-infra: ERROR: %s\n' "$*" >&2; exit 1; }
plan() { printf 'sync-infra: %s\n' "$*"; }

dry_run=no
if [ "${1:-}" = "--dry-run" ]; then dry_run=yes; shift; fi
[ $# -eq 1 ] || die "usage: infra/server/sync-infra.sh [--dry-run] <commit>"
sha="$(git -C "$REPO" rev-parse --verify --quiet "$1^{commit}")" || die "'$1' is not a commit."

# Everything that will be installed, staged locally from the commit.
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
umask 022
git -C "$REPO" archive --format=tar "$sha" "${FILES[@]}" infra/systemd/daygame-deploy.service.template infra/systemd/daygame-deploy.timer.template |
  tar -x -C "$stage"
mkdir -p "$stage/units"
# The system unit runs the agent as the deploy user, which may use Docker.
sed -e "s|@@INFRA@@|$DEST|g" -e "s|@@DEPLOY_ENV@@|/etc/daygame/deploy.env|g" \
  -e 's|^\[Service\]$|[Service]\nUser=deploy\nGroup=deploy|' \
  "$stage/infra/systemd/daygame-deploy.service.template" > "$stage/units/daygame-deploy.service"
cp "$stage/infra/systemd/daygame-deploy.timer.template" "$stage/units/daygame-deploy.timer"
printf '%s\n' "$sha" > "$stage/infra-version"

if [ "$dry_run" = yes ]; then
  plan "dry run: the server is not contacted. At commit $sha it would install on root@$SERVER:"
  for f in "${FILES[@]}"; do plan "  $f -> $DEST/${f#infra/} ($(sha256sum "$stage/$f" | cut -c1-12))"; done
  for u in "${UNITS[@]}"; do plan "  infra/systemd/$u.template -> /etc/systemd/system/$u ($(sha256sum "$stage/units/$u" | cut -c1-12))"; done
  plan "  (the service runs as User=deploy)"
  plan "  /etc/daygame/infra-version = $sha"
  plan "then restart only what changed: Caddy for a Caddy file or compose.yaml, daemon-reload and the timer for a unit; nothing for a script; never the app, which only infra/deploy.sh touches"
  exit 0
fi

ssh_root() { ssh -o ConnectTimeout=20 "root@$SERVER" "$@"; }

# What is there now, by checksum, so only changed files count as changes.
remote_sums="$(ssh_root "cd $DEST 2>/dev/null && sha256sum compose.yaml caddy/common.caddy caddy/Caddyfile.production deploy.sh deploy-agent.sh 2>/dev/null; cd /etc/systemd/system && sha256sum ${UNITS[*]} 2>/dev/null" || true)"
changed=()
for f in "${FILES[@]}"; do
  want="$(sha256sum "$stage/$f" | cut -d' ' -f1)"
  grep -q "^$want  ${f#infra/}\$" <<<"$remote_sums" || changed+=("$f")
done
for u in "${UNITS[@]}"; do
  want="$(sha256sum "$stage/units/$u" | cut -d' ' -f1)"
  grep -q "^$want  $u\$" <<<"$remote_sums" || changed+=("unit:$u")
done
plan "changed at $sha: ${changed[*]:-nothing}"

tar -C "$stage" -c infra units infra-version | ssh_root "
  set -e
  tmp=\$(mktemp -d); tar -x -C \"\$tmp\"
  install -d -m 755 $DEST $DEST/caddy
  for f in compose.yaml caddy/common.caddy caddy/Caddyfile.production; do install -m 644 \"\$tmp/infra/\$f\" $DEST/\$f; done
  for f in deploy.sh deploy-agent.sh; do install -m 755 \"\$tmp/infra/\$f\" $DEST/\$f; done
  for u in ${UNITS[*]}; do install -m 644 \"\$tmp/units/\$u\" /etc/systemd/system/\$u; done
  install -m 644 \"\$tmp/infra-version\" /etc/daygame/infra-version
  rm -rf \"\$tmp\""
plan "installed; /etc/daygame/infra-version = $sha"

# deploy.env is read, never executed as root: only these keys, and only values
# made of plain characters, reach compose's environment. APP_IMAGE only
# satisfies compose's interpolation; the app is not started here.
compose="cd $DEST && env \$(grep -E '^(APP_ENV_FILE|CADDYFILE|SITE_HOST|ACME_EMAIL)=[A-Za-z0-9._@/:+-]+\$' /etc/daygame/deploy.env) APP_IMAGE=unused docker compose -f compose.yaml"
for c in "${changed[@]}"; do
  case "$c" in
    unit:*) ssh_root "systemctl daemon-reload && systemctl enable --now daygame-deploy.timer && systemctl restart daygame-deploy.timer"
            plan "units reloaded; the deploy timer is running"; break ;;
  esac
done
if printf '%s\n' "${changed[@]}" | grep -qx infra/compose.yaml; then
  ssh_root "$compose up -d --no-deps caddy"
  plan "compose.yaml changed: Caddy recreated; the app takes the new file at its next deploy (infra/deploy.sh)"
elif printf '%s\n' "${changed[@]}" | grep -q '^infra/caddy/'; then
  ssh_root "$compose up -d --no-deps --force-recreate caddy"
  plan "a Caddy file changed: Caddy recreated"
fi
plan "done"
