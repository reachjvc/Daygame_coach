#!/usr/bin/env bash
#
# DISK SPACE ALERTS: run every 15 minutes by daygame-disk.timer
# (infra/systemd/daygame-disk.{service,timer}.template, installed on a server by
# infra/server/sync-infra.sh).
#
# Two levels, each its own check, so each reaches the owner once when it is
# crossed (a check alerts when it changes state, not on every ping):
#   DISK_WARN_PING_URL  pinged while every watched filesystem has at least 25 %
#                       free, and <url>/fail below that
#   DISK_CRIT_PING_URL  the same at 10 %
# Both live in the machine's settings file, the one infra/deploy.sh reads
# (DAYGAME_DEPLOY_ENV). The message says which filesystem and how much is free.
# A level whose URL is unset is off, and the log says so. A ping has a short
# timeout; whatever it does, the run's outcome is the disk's state.
#
# Watched: / and Docker's data directory, which hold the images, the logs and
# the journal (each capped, so a full disk means something unexpected grew).
# Exit status: 0 when every level has room, 1 when any level is crossed, so the
# unit shows the state too.
#
# Plans/caddy-deploy-and-cicd.md, Phase 5b step 4 (Phase 7's alerts, without the accounts).

set -euo pipefail

settings="${DAYGAME_DEPLOY_ENV:-${DAYGAME_CONFIG_DIR:-$HOME/.config/daygame}/deploy.env}"
PATHS=(/ "${DOCKER_DATA:-/var/lib/docker}")

log() { printf '%s disk: %s\n' "$(date -Is)" "$*" >&2; }

[ -f "$settings" ] || { log "no settings at $settings"; exit 1; }
setting() { sed -n "s/^$1=//p" "$settings" | tail -1 | sed "s/^'\(.*\)'\$/\1/"; }

# The fullest watched filesystem: "<percent free> <mount point>".
lowest=""
for path in "${PATHS[@]}"; do
  [ -e "$path" ] || continue
  read -r size avail mount < <(df -Pk "$path" | awk 'NR == 2 {print $2, $4, $6}')
  [ "${size:-0}" -gt 0 ] || continue
  free=$((avail * 100 / size))
  if [ -z "$lowest" ] || [ "$free" -lt "${lowest%% *}" ]; then lowest="$free $mount"; fi
done
[ -n "$lowest" ] || { log "could not read the free space of ${PATHS[*]}"; exit 1; }
free="${lowest%% *}" mount="${lowest#* }"
log "$mount has $free % free (the fullest of ${PATHS[*]})"

crossed=0
# The URL is a credential of sorts (anyone holding it can ping), so it is never
# logged and never on a command line: curl reads it from its config on stdin.
check() { # $1 = level in percent, $2 = its setting's name
  local url outcome=ok message
  url="$(setting "$2")"
  if [ "$free" -lt "$1" ]; then
    outcome=fail crossed=1
    message="$(hostname): $mount has $free % free, below $1 %"
    logger -p "user.$([ "$1" -le 10 ] && echo crit || echo warning)" -t daygame-disk "$message" 2>/dev/null || true
  else
    message="$(hostname): $mount has $free % free"
  fi
  if [ -z "$url" ]; then
    log "the $1 % alert is off: $2 is not set"
    return 0
  fi
  [ "$outcome" = ok ] || url="$url/fail"
  if printf 'url = "%s"\n' "$url" | curl -fsS --max-time 10 -o /dev/null --data-raw "$message" -K - 2>/dev/null; then
    log "the $1 % check pinged ($outcome)"
  else
    log "could not ping the $1 % check ($outcome)"
  fi
}
check 25 DISK_WARN_PING_URL
check 10 DISK_CRIT_PING_URL
exit "$crossed"
