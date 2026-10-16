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
#   deploy.sh, deploy-agent.sh, disk-alert.sh          root-owned, read-only to others
#   /etc/systemd/system/daygame-deploy.{service,timer} the agent, as the deploy user
#   /etc/systemd/system/daygame-disk.{service,timer}   the disk alert, as the deploy user
#   /etc/daygame/infra-version                         the commit, logged by the agent
# and then restarts only what changed, Caddy before the timers, so the agent's
# first run finds Caddy up:
#   a Caddy file          -> Caddy is recreated (its admin API is off, so no reload)
#   compose.yaml          -> Caddy is recreated. The app is never touched here:
#                            infra/deploy.sh is its only path, with a health
#                            check and a rollback, and it applies the new file
#                            at the next deploy.
#   a unit                -> daemon-reload, and the timers are (re)started
#   a script              -> nothing; the timer runs the new one next minute
#
# Secrets never pass through here: infra/server/push-env.sh sends those, and it
# runs FIRST on a new server. Caddy and the agent read /etc/daygame/deploy.env,
# which push-env.sh writes, so without it this stops before installing anything
# (the rehearsal found that the other order fails halfway: Plans/
# caddy-deploy-and-cicd.md, Phase 5b).
# SERVER (default daygame-prod) is the server's Tailscale name.
# Plans/caddy-deploy-and-cicd.md, Phase 5 step 3; run for real in Phase 6.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVER="${SERVER:-daygame-prod}"
DEST=/opt/daygame/infra
FILES=(infra/compose.yaml infra/caddy/common.caddy infra/caddy/Caddyfile.production infra/deploy.sh infra/deploy-agent.sh infra/disk-alert.sh)
UNITS=(daygame-deploy.service daygame-deploy.timer daygame-disk.service daygame-disk.timer)
TIMERS=()
for u in "${UNITS[@]}"; do [[ "$u" != *.timer ]] || TIMERS+=("$u"); done

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
templates=()
for u in "${UNITS[@]}"; do templates+=("infra/systemd/$u.template"); done
git -C "$REPO" archive --format=tar "$sha" "${FILES[@]}" "${templates[@]}" | tar -x -m -C "$stage"
mkdir -p "$stage/units"
for u in "${UNITS[@]}"; do
  case "$u" in
    # A system service runs as the deploy user, which may use Docker.
    *.service) sed -e "s|@@INFRA@@|$DEST|g" -e "s|@@DEPLOY_ENV@@|/etc/daygame/deploy.env|g" \
                 -e 's|^\[Service\]$|[Service]\nUser=deploy\nGroup=deploy|' \
                 "$stage/infra/systemd/$u.template" > "$stage/units/$u" ;;
    *) cp "$stage/infra/systemd/$u.template" "$stage/units/$u" ;;
  esac
done
printf '%s\n' "$sha" > "$stage/infra-version"

if [ "$dry_run" = yes ]; then
  plan "dry run: the server is not contacted. At commit $sha it would install on root@$SERVER:"
  for f in "${FILES[@]}"; do plan "  $f -> $DEST/${f#infra/} ($(sha256sum "$stage/$f" | cut -c1-12))"; done
  for u in "${UNITS[@]}"; do plan "  infra/systemd/$u.template -> /etc/systemd/system/$u ($(sha256sum "$stage/units/$u" | cut -c1-12))"; done
  plan "  (the services run as User=deploy)"
  plan "  /etc/daygame/infra-version = $sha"
  plan "then restart only what changed, Caddy first: Caddy for a Caddy file or compose.yaml, daemon-reload and the timers for a unit; nothing for a script; never the app, which only infra/deploy.sh touches"
  plan "it stops before installing anything if the server has no /etc/daygame/deploy.env: infra/server/push-env.sh runs first"
  exit 0
fi

ssh_root() { ssh -o ConnectTimeout=20 "root@$SERVER" "$@"; }

# push-env.sh first: Caddy and the agent cannot run without the settings it writes.
ssh_root "test -f /etc/daygame/deploy.env" ||
  die "root@$SERVER has no /etc/daygame/deploy.env yet (or could not be reached). Run infra/server/push-env.sh first; nothing was installed."
# This is what starts Caddy, so it checks what deploy.sh checks: a practice CA
# only for a .test name. A real domain gets its certificates from Let's Encrypt.
if ssh_root "grep -qE '^(ACME_DIRECTORY|ACME_CA_CERT)=' /etc/daygame/deploy.env && ! grep -qE '^SITE_HOST=[A-Za-z0-9.-]+\.test\$' /etc/daygame/deploy.env"; then
  die "root@$SERVER's deploy.env names a practice ACME CA, and its SITE_HOST is not a .test name. Run infra/server/push-env.sh again; nothing was installed."
fi

# What is there now, by checksum, so only changed files count as changes.
remote_sums="$(ssh_root "cd $DEST 2>/dev/null && sha256sum ${FILES[*]#infra/} 2>/dev/null; cd /etc/systemd/system && sha256sum ${UNITS[*]} 2>/dev/null" || true)"
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
  tmp=\$(mktemp -d); tar -x -m -C \"\$tmp\"
  install -d -m 755 $DEST $DEST/caddy
  for f in ${FILES[*]#infra/}; do
    case \"\$f\" in *.sh) mode=755 ;; *) mode=644 ;; esac
    install -o root -g root -m \"\$mode\" \"\$tmp/infra/\$f\" $DEST/\$f
  done
  # A unit is rewritten only when it differs: rewriting an unchanged one makes
  # systemd report it changed on disk until the next daemon-reload. Its owner
  # and mode are set either way.
  for u in ${UNITS[*]}; do
    cmp -s \"\$tmp/units/\$u\" /etc/systemd/system/\$u || install -m 644 \"\$tmp/units/\$u\" /etc/systemd/system/\$u
    chown root:root /etc/systemd/system/\$u; chmod 644 /etc/systemd/system/\$u
  done
  install -m 644 \"\$tmp/infra-version\" /etc/daygame/infra-version
  rm -rf \"\$tmp\""
plan "installed; /etc/daygame/infra-version = $sha"

# deploy.env is read, never executed as root: only these keys, and only values
# made of plain characters, reach compose's environment. APP_IMAGE only
# satisfies compose's interpolation; the app is not started here.
compose="cd $DEST && env \$(grep -E '^(APP_ENV_FILE|CADDYFILE|SITE_HOST|ACME_EMAIL|ACME_DIRECTORY|ACME_CA_CERT)=[A-Za-z0-9._@/:+-]+\$' /etc/daygame/deploy.env) APP_IMAGE=unused docker compose -f compose.yaml"
# Caddy first, so the agent's first run finds it up. Both steps below run on
# every sync, changed or not: each is a no-op when everything is in place, and
# a sync that stopped halfway last time (the files installed, Caddy or the
# timers not started) is finished by the next one.
if printf '%s\n' "${changed[@]}" | grep -q '^infra/caddy/'; then
  # Compose cannot see a change inside a mounted file; recreate on purpose.
  ssh_root "$compose up -d --quiet-pull --no-deps --force-recreate caddy"
  plan "a Caddy file changed: Caddy recreated"
else
  ssh_root "$compose up -d --quiet-pull --no-deps caddy"
  plan "Caddy is up (compose recreates it only if compose.yaml changed it; the app takes a new compose.yaml at its next deploy)"
fi
if printf '%s\n' "${changed[@]}" | grep -q '^unit:'; then
  ssh_root "systemctl daemon-reload && systemctl enable --now ${TIMERS[*]} && systemctl restart ${TIMERS[*]}"
  plan "units reloaded; ${TIMERS[*]} restarted"
else
  ssh_root "systemctl enable --now ${TIMERS[*]}"
  plan "${TIMERS[*]} enabled and running"
fi
plan "done"
