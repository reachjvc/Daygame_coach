#!/usr/bin/env bash
#
# Send the production server its secrets and settings, over Tailscale SSH.
#
#   infra/server/push-env.sh --dry-run <domain> <acme-email>   print the plan; touch nothing
#   infra/server/push-env.sh <domain> <acme-email>             do it
#
# Writes on the server:
#   /etc/daygame/production.env  mode 640 root:deploy. The runtime values from
#                                .env.local (scripts/check-runtime-env.mjs's
#                                list, through infra/write-env-file.sh), with
#                                NEXT_PUBLIC_APP_URL=https://<domain> and a
#                                NEXT_SERVER_ACTIONS_ENCRYPTION_KEY generated
#                                once for this server and kept on later runs.
#   /etc/daygame/deploy.env      mode 640 root:deploy, no secrets: the settings
#                                infra/deploy.sh and the agent read.
#   the deploy user's Docker login to ghcr.io, with R5's read-only token.
#
# Who can read the secrets file, plainly: root, and the deploy user, which can
# run Docker and so is root-equivalent anyway (Security section, Q14).
#
# Reads: ~/.config/daygame/ghcr-read-server.token (R5). SERVER (default
# daygame-prod, the server's Tailscale name).
# Optional: ~/.config/daygame/alerts.env, mode 600, with any of
#   PING_URL, DISK_WARN_PING_URL, DISK_CRIT_PING_URL
#                 the checks the deploy agent and the disk alert ping (Phase 7).
#                 Read from a file, never the command line, so every run sends
#                 them (none is dropped by forgetting it) and they stay out of
#                 shell history; a dry run shows only which are set. Without the
#                 file those alerts are off, and the machine's log says so.
# Optional, from the environment, written into deploy.env when set:
#   WATCH, ACME_DIRECTORY, ACME_CA_CERT, CA_CERT
#                 the practice server only (infra/rehearsal/run.sh): another tag
#                 to watch, a practice ACME CA and the files that trust it.
#                 Refused unless the domain ends in .test, a name that can never
#                 be real, so a real server always watches production and gets
#                 its certificates from Let's Encrypt.
# Plans/caddy-deploy-and-cicd.md, Phase 5 step 4; run for real in Phase 6.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONFIG_DIR="${DAYGAME_CONFIG_DIR:-$HOME/.config/daygame}"
SERVER="${SERVER:-daygame-prod}"
PRODUCTION_WATCH=ghcr.io/reachjvc/daygame-coach-production:production

die() { printf 'push-env: ERROR: %s\n' "$*" >&2; exit 1; }
plan() { printf 'push-env: %s\n' "$*"; }

dry_run=no
if [ "${1:-}" = "--dry-run" ]; then dry_run=yes; shift; fi
domain="${1:-}" email="${2:-}"
if ! [[ "$domain" =~ ^[a-z0-9-]+(\.[a-z0-9-]+)+$ ]] || ! [[ "$email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]+$ ]]; then
  die "usage: infra/server/push-env.sh [--dry-run] <domain> <acme-email>"
fi

if [ -n "${WATCH:-}${ACME_DIRECTORY:-}${ACME_CA_CERT:-}${CA_CERT:-}" ] && [[ "$domain" != *.test ]]; then
  die "WATCH, ACME_DIRECTORY, ACME_CA_CERT and CA_CERT are for the practice server only, and '$domain' is not a .test name."
fi
settings="APP_ENV_FILE=/etc/daygame/production.env
CADDYFILE=caddy/Caddyfile.production
SITE_HOST=$domain
ACME_EMAIL=$email
STATE_DIR=/var/lib/daygame
WATCH=${WATCH:-$PRODUCTION_WATCH}"
# Each optional value is plain URL or path characters, so it can never break the
# file or reach a shell as anything but itself.
for key in ACME_DIRECTORY ACME_CA_CERT CA_CERT; do
  value="${!key:-}"
  [ -n "$value" ] || continue
  [[ "$value" =~ ^[A-Za-z0-9._~:/@%+=-]+$ ]] || die "$key holds characters a settings file cannot carry safely."
  settings+=$'\n'"$key=$value"
done
alerts=""
if [ -f "$CONFIG_DIR/alerts.env" ]; then
  [ "$(stat -c %a "$CONFIG_DIR/alerts.env")" = 600 ] || die "$CONFIG_DIR/alerts.env must be mode 600 (chmod 600 it): its URLs let anyone ping the checks."
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|'#'*) continue ;; esac
    key="${line%%=*}" value="${line#*=}"
    case "$key" in PING_URL|DISK_WARN_PING_URL|DISK_CRIT_PING_URL) ;; *) die "unknown key '$key' in $CONFIG_DIR/alerts.env." ;; esac
    # <url>/fail is appended to it, so no query, fragment or trailing slash.
    [[ "$value" =~ ^https?://[A-Za-z0-9._~:/@%+=-]+[^/]$ ]] || die "$key in $CONFIG_DIR/alerts.env is not a plain URL without a trailing slash."
    alerts+=$'\n'"$key=$value"
  done < "$CONFIG_DIR/alerts.env"
fi

if [ "$dry_run" = yes ]; then
  plan "dry run: the server is not contacted and no secret is read."
  plan "would write ~/.config/daygame/production.env with infra/write-env-file.sh production $domain (names only on screen)"
  plan "would install it on root@$SERVER as /etc/daygame/production.env, mode 640 root:deploy, keeping the server's NEXT_SERVER_ACTIONS_ENCRYPTION_KEY if it has one"
  plan "would install /etc/daygame/deploy.env, mode 640 root:deploy:"
  while IFS= read -r line; do plan "    $line"; done <<<"$settings"
  while IFS= read -r line; do [ -z "$line" ] || plan "    ${line%%=*}=<set, from $CONFIG_DIR/alerts.env>"; done <<<"$alerts"
  [ -n "$alerts" ] || plan "    (no alert URLs: $CONFIG_DIR/alerts.env does not exist, so the alerts stay off)"
  plan "would log the deploy user into ghcr.io as reachjvc with ~/.config/daygame/ghcr-read-server.token (read:packages only), password on stdin"
  exit 0
fi

[ -f "$CONFIG_DIR/ghcr-read-server.token" ] || die "no registry token at $CONFIG_DIR/ghcr-read-server.token (R5)."
ssh_root() { ssh -o ConnectTimeout=20 "root@$SERVER" "$@"; }

# Keep the server's own Server Actions key: it was generated for this server.
# A missing file (the first push) answers empty; a failed connection stops here,
# because carrying on would replace the server's key with another one.
existing_key="$(ssh_root "if [ -f /etc/daygame/production.env ]; then sed -n \"s/^NEXT_SERVER_ACTIONS_ENCRYPTION_KEY='\\(.*\\)'\$/\\1/p\" /etc/daygame/production.env; fi")" ||
  die "could not read the server's settings over Tailscale SSH; nothing was sent."
SERVER_ACTIONS_KEY="$existing_key" "$REPO/infra/write-env-file.sh" production "$domain"

ssh_root "install -m 640 -o root -g deploy /dev/stdin /etc/daygame/production.env" < "$CONFIG_DIR/production.env"
plan "installed /etc/daygame/production.env (640 root:deploy)"
printf '%s%s\n' "$settings" "$alerts" | ssh_root "install -m 640 -o root -g deploy /dev/stdin /etc/daygame/deploy.env"
plan "installed /etc/daygame/deploy.env"
ssh_root "su -s /bin/sh deploy -c 'docker login ghcr.io -u reachjvc --password-stdin'" < "$CONFIG_DIR/ghcr-read-server.token" >/dev/null
plan "the deploy user is logged into ghcr.io (read:packages)"
