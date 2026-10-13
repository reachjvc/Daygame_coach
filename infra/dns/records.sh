#!/usr/bin/env bash
#
# Point the domain at the production server, through Cloudflare's API.
#
#   infra/dns/records.sh --dry-run <domain> [<ipv4> <ipv6>]   print the records; touch nothing
#   infra/dns/records.sh <domain> [<ipv4> <ipv6>]             set them (needs R2's token)
#
# The records, each created or updated to exactly this:
#   A, AAAA   <domain> and www.<domain> -> the server, DNS ONLY (Q11): Caddy
#             owns TLS end to end, so the orange-cloud proxy stays off.
#   CAA       <domain>  0 issue "letsencrypt.org": the one authority Caddy uses
#             (Caddyfile.production), so no other may issue for the domain.
#   TXT       <domain>  v=spf1 -all, and _dmarc.<domain>  v=DMARC1; p=reject:
#             no mail is sent from the domain yet, and these stop anybody else
#             sending mail as it. Email setup (the master plan's B3) changes them.
#
# The server's addresses come from `hcloud server describe daygame-prod` unless
# given. Hetzner gives the server a /64; its address is the /64's ::1.
#
# Reads: ~/.config/daygame/cloudflare.token (R2), ~/.config/daygame/hcloud.token (R3).
# Plans/caddy-deploy-and-cicd.md, Phase 5 step 4; run for real in Phase 6.

set -euo pipefail

CONFIG_DIR="${DAYGAME_CONFIG_DIR:-$HOME/.config/daygame}"
API=https://api.cloudflare.com/client/v4

die() { printf 'records: ERROR: %s\n' "$*" >&2; exit 1; }
plan() { printf 'records: %s\n' "$*"; }

dry_run=no
if [ "${1:-}" = "--dry-run" ]; then dry_run=yes; shift; fi
domain="${1:-}"
[[ "$domain" =~ ^[a-z0-9-]+(\.[a-z0-9-]+)+$ ]] || die "usage: infra/dns/records.sh [--dry-run] <domain> [<ipv4> <ipv6>]"
ipv4="${2:-}" ipv6="${3:-}"

if [ -z "$ipv4" ] || [ -z "$ipv6" ]; then
  if [ "$dry_run" = yes ]; then
    ipv4="${ipv4:-<server ipv4>}" ipv6="${ipv6:-<server ipv6>::1}"
  else
    [ -f "$CONFIG_DIR/hcloud.token" ] || die "give the addresses, or put Hetzner's token in $CONFIG_DIR/hcloud.token (R3)."
    server="$(HCLOUD_TOKEN="$(cat "$CONFIG_DIR/hcloud.token")" hcloud server describe daygame-prod -o json)"
    ipv4="$(jq -r '.public_net.ipv4.ip' <<<"$server")"
    ipv6="$(jq -r '.public_net.ipv6.ip' <<<"$server" | sed 's|::/64$|::1|')"
  fi
fi

# type name content — the whole desired state. Nothing here is ever proxied;
# tests/unit/infra/production.test.ts fails if that changes.
RECORDS="A $domain $ipv4
AAAA $domain $ipv6
A www.$domain $ipv4
AAAA www.$domain $ipv6
CAA $domain 0 issue \"letsencrypt.org\"
TXT $domain v=spf1 -all
TXT _dmarc.$domain v=DMARC1; p=reject"

if [ "$dry_run" = yes ]; then
  plan "dry run: Cloudflare is not contacted. Each record would be created, or updated to this, DNS only (not proxied):"
  while read -r type name content; do plan "  $type $name -> $content"; done <<<"$RECORDS"
  exit 0
fi

[ -f "$CONFIG_DIR/cloudflare.token" ] || die "no Cloudflare token at $CONFIG_DIR/cloudflare.token (R2)."
auth=(-H "Authorization: Bearer $(cat "$CONFIG_DIR/cloudflare.token")" -H "Content-Type: application/json")
cf() { curl -fsS "${auth[@]}" "$@"; }

zone="$(cf "$API/zones?name=$domain" | jq -r '.result[0].id // empty')"
[ -n "$zone" ] || die "Cloudflare has no zone named $domain for this token."

while read -r type name content; do
  if [ "$type" = CAA ]; then
    read -r flags tag value <<<"$content"
    body="$(jq -nc --arg n "$name" --argjson f "$flags" --arg t "$tag" --arg v "${value//\"/}" \
      '{type:"CAA", name:$n, ttl:3600, data:{flags:$f, tag:$t, value:$v}}')"
  else
    body="$(jq -nc --arg ty "$type" --arg n "$name" --arg c "$content" \
      '{type:$ty, name:$n, content:$c, ttl:3600} + (if $ty == "A" or $ty == "AAAA" then {proxied:false} else {} end)')"
  fi
  existing="$(cf "$API/zones/$zone/dns_records?type=$type&name=$name" | jq -r '.result[0].id // empty')"
  if [ -n "$existing" ]; then
    cf -X PUT "$API/zones/$zone/dns_records/$existing" --data "$body" >/dev/null
    plan "updated $type $name"
  else
    cf -X POST "$API/zones/$zone/dns_records" --data "$body" >/dev/null
    plan "created $type $name"
  fi
done <<<"$RECORDS"
plan "done. Check: dig @1.1.1.1 $domain A +short; dig @1.1.1.1 $domain AAAA +short"
