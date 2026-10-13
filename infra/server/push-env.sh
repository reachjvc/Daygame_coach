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
# Plans/caddy-deploy-and-cicd.md, Phase 5 step 4; run for real in Phase 6.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONFIG_DIR="${DAYGAME_CONFIG_DIR:-$HOME/.config/daygame}"
SERVER="${SERVER:-daygame-prod}"
WATCH=ghcr.io/reachjvc/daygame-coach-production:production

die() { printf 'push-env: ERROR: %s\n' "$*" >&2; exit 1; }
plan() { printf 'push-env: %s\n' "$*"; }

dry_run=no
if [ "${1:-}" = "--dry-run" ]; then dry_run=yes; shift; fi
domain="${1:-}" email="${2:-}"
if ! [[ "$domain" =~ ^[a-z0-9-]+(\.[a-z0-9-]+)+$ ]] || ! [[ "$email" =~ ^[^@[:space:]]+@[^@[:space:]]+$ ]]; then
  die "usage: infra/server/push-env.sh [--dry-run] <domain> <acme-email>"
fi

settings="APP_ENV_FILE=/etc/daygame/production.env
CADDYFILE=caddy/Caddyfile.production
SITE_HOST=$domain
ACME_EMAIL=$email
STATE_DIR=/var/lib/daygame
WATCH=$WATCH"

if [ "$dry_run" = yes ]; then
  plan "dry run: the server is not contacted and no secret is read."
  plan "would write ~/.config/daygame/production.env with infra/write-env-file.sh production $domain (names only on screen)"
  plan "would install it on root@$SERVER as /etc/daygame/production.env, mode 640 root:deploy, keeping the server's NEXT_SERVER_ACTIONS_ENCRYPTION_KEY if it has one"
  plan "would install /etc/daygame/deploy.env, mode 640 root:deploy:"
  while IFS= read -r line; do plan "    $line"; done <<<"$settings"
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
printf '%s\n' "$settings" | ssh_root "install -m 640 -o root -g deploy /dev/stdin /etc/daygame/deploy.env"
plan "installed /etc/daygame/deploy.env"
ssh_root "su -s /bin/sh deploy -c 'docker login ghcr.io -u reachjvc --password-stdin'" < "$CONFIG_DIR/ghcr-read-server.token" >/dev/null
plan "the deploy user is logged into ghcr.io (read:packages)"
