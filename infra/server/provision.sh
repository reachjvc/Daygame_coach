#!/usr/bin/env bash
#
# Create the production server at Hetzner, idempotently by name.
#
#   infra/server/provision.sh --dry-run    print every action; touch nothing
#   infra/server/provision.sh              do it (needs R3's token, R6's key)
#
# IT SPENDS THE OWNER'S MONEY, SO ONLY THE OWNER RUNS IT FOR REAL. Without
# --dry-run it stops unless a person at a terminal types "yes" after seeing
# what will be created. An AI session has no terminal, so it can only run the
# dry run; handing over a token is not consent to spend.
#
# It creates, each only if no resource of that name exists yet:
#   - the firewall daygame-web: inbound 80/tcp, 443/tcp and 443/udp from
#     0.0.0.0/0 AND ::/0. No port 22: OpenSSH is off on the server and the
#     only way in is Tailscale SSH (Q10). Deploys need no inbound access.
#   - the owner's SSH PUBLIC key, so Hetzner does not email a root password
#     and its rescue mode can log in. It is never used for OpenSSH.
#   - the server: Ubuntu 24.04, Ashburn (Q8), the smallest shared x86 type
#     with at least 4 GB (Q18), first-booted with infra/server/cloud-init.yaml.
#
# Nothing secret is uploaded except the single-use, one-hour Tailscale key,
# which cloud-init needs to join the tailnet (Q10).
#
# Reads:  ~/.config/daygame/hcloud.token       (R3)
#         ~/.config/daygame/tailscale.authkey  (R6)
#         ~/.ssh/id_ed25519.pub                (override: SSH_PUBLIC_KEY)
# Settings: SERVER_TYPE (default cpx21, check current prices), LOCATION (default ash).
#
# Plans/caddy-deploy-and-cicd.md, Phase 5 step 4; run for real in Phase 6.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="${DAYGAME_CONFIG_DIR:-$HOME/.config/daygame}"
NAME=daygame-prod
FIREWALL=daygame-web
KEY_NAME=daygame-owner
SERVER_TYPE="${SERVER_TYPE:-cpx21}"
LOCATION="${LOCATION:-ash}"
IMAGE=ubuntu-24.04
SSH_PUBLIC_KEY="${SSH_PUBLIC_KEY:-$HOME/.ssh/id_ed25519.pub}"

die() { printf 'provision: ERROR: %s\n' "$*" >&2; exit 1; }
plan() { printf 'provision: %s\n' "$*"; }

dry_run=no
case "${1:-}" in
  --dry-run) dry_run=yes ;;
  "") ;;
  *) die "usage: infra/server/provision.sh [--dry-run]" ;;
esac

# The owner's yes, typed at a terminal, before anything is read or created.
if [ "$dry_run" = no ]; then
  if ! { true </dev/tty; } 2>/dev/null; then
    die "this creates a server that costs money every month, so only a person at a terminal can run it. Run it yourself, or use --dry-run to see the plan."
  fi
  printf 'This creates the server %s (%s, %s) at Hetzner, billed monthly; check the price of %s at https://www.hetzner.com/cloud before going on.\nType yes to create it: ' \
    "$NAME" "$SERVER_TYPE" "$LOCATION" "$SERVER_TYPE" >/dev/tty
  read -r answer </dev/tty
  [ "$answer" = yes ] || die "not confirmed; nothing was created."
fi

# The inbound rules, in one place. tests/unit/infra/production.test.ts reads
# this list: it must never name 22, 3000, 5432, 11434 or 2019, and every port
# must be open over IPv6 too.
RULES='[
  {"direction":"in","protocol":"tcp","port":"80","source_ips":["0.0.0.0/0","::/0"],"description":"http, redirect and ACME"},
  {"direction":"in","protocol":"tcp","port":"443","source_ips":["0.0.0.0/0","::/0"],"description":"https"},
  {"direction":"in","protocol":"udp","port":"443","source_ips":["0.0.0.0/0","::/0"],"description":"http/3"}
]'

if [ "$dry_run" = yes ]; then
  hc() { plan "would run: hcloud $*"; }
  exists() { return 1; }
  plan "dry run: nothing at Hetzner is read or changed; every resource is shown as missing"
else
  command -v hcloud >/dev/null 2>&1 || die "hcloud is not installed (~/.local/bin/hcloud 1.68.0)."
  [ -f "$CONFIG_DIR/hcloud.token" ] || die "no Hetzner token at $CONFIG_DIR/hcloud.token (return item R3)."
  HCLOUD_TOKEN="$(cat "$CONFIG_DIR/hcloud.token")"
  export HCLOUD_TOKEN
  hc() { hcloud "$@"; }
  exists() { hcloud "$1" describe "$2" >/dev/null 2>&1; }
fi

[ -f "$SSH_PUBLIC_KEY" ] || die "no SSH public key at $SSH_PUBLIC_KEY (set SSH_PUBLIC_KEY)."
if grep -q "PRIVATE KEY" "$SSH_PUBLIC_KEY"; then die "$SSH_PUBLIC_KEY is a private key. Only a .pub file may be uploaded."; fi

if [ "$dry_run" = yes ]; then
  authkey="tskey-auth-REDACTED"
else
  [ -f "$CONFIG_DIR/tailscale.authkey" ] || die "no Tailscale auth key at $CONFIG_DIR/tailscale.authkey (return item R6)."
  authkey="$(cat "$CONFIG_DIR/tailscale.authkey")"
  [[ "$authkey" =~ ^tskey-auth-[A-Za-z0-9-]+$ ]] || die "$CONFIG_DIR/tailscale.authkey does not hold a tskey-auth-... key."
fi

rules_file="$(mktemp)"
user_data="$(mktemp)"
trap 'rm -f "$rules_file" "$user_data"' EXIT
printf '%s\n' "$RULES" > "$rules_file"

# --- firewall ---------------------------------------------------------------------
if exists firewall "$FIREWALL"; then
  plan "firewall $FIREWALL exists; setting its rules to the list above"
  hc firewall replace-rules "$FIREWALL" --rules-file "$rules_file"
else
  plan "firewall $FIREWALL: inbound 80/tcp, 443/tcp, 443/udp from 0.0.0.0/0 and ::/0; nothing else, no 22"
  hc firewall create --name "$FIREWALL" --rules-file "$rules_file"
fi

# --- the owner's public key ---------------------------------------------------------
if exists ssh-key "$KEY_NAME"; then
  plan "ssh key $KEY_NAME exists"
else
  plan "ssh key $KEY_NAME from $SSH_PUBLIC_KEY (public half only)"
  hc ssh-key create --name "$KEY_NAME" --public-key-from-file "$SSH_PUBLIC_KEY"
fi

# --- the server ---------------------------------------------------------------------
if exists server "$NAME"; then
  plan "server $NAME exists; not touched (rebuilding a server is a decision, not a side effect)"
else
  chmod 600 "$user_data"
  # Substituted in the shell, not by sed, so the key is never a command-line
  # argument that `ps` can show.
  template="$(cat "$HERE/cloud-init.yaml")"
  printf '%s\n' "${template//@@TAILSCALE_AUTHKEY@@/$authkey}" > "$user_data"
  if grep -q '@@TAILSCALE_AUTHKEY@@' "$user_data"; then die "the Tailscale key was not filled into cloud-init."; fi
  plan "server $NAME: $SERVER_TYPE, $IMAGE, $LOCATION, firewall $FIREWALL, key $KEY_NAME, cloud-init from infra/server/cloud-init.yaml with the one-hour Tailscale key"
  hc server create --name "$NAME" --type "$SERVER_TYPE" --image "$IMAGE" --location "$LOCATION" \
    --ssh-key "$KEY_NAME" --firewall "$FIREWALL" --user-data-from-file "$user_data"
fi
plan "done. Next: ssh root@$NAME (Tailscale SSH) 'cloud-init status --wait', then infra/server/sync-infra.sh <commit>"
