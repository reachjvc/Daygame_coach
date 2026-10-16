#!/usr/bin/env bash
#
# THE PRODUCTION SERVER, REHEARSED ON THIS MACHINE, before any server is rented.
#
#   infra/rehearsal/run.sh up               boot a fresh practice server from infra/server/cloud-init.yaml
#   infra/rehearsal/run.sh setup <commit>   set it up as Phase 6 will: push-env.sh, then sync-infra.sh
#   infra/rehearsal/run.sh check            the acceptance checks that change nothing
#   infra/rehearsal/run.sh reboot           reboot it; time how long until healthz answers again
#   infra/rehearsal/run.sh rollback         deploy a broken image through deploy.sh, as the deploy user
#   infra/rehearsal/run.sh pin <digest>     roll back by hand to an older digest, then undo it
#   infra/rehearsal/run.sh rotate           rotate the Server Actions key; deploy.sh --restart
#   infra/rehearsal/run.sh reissue          delete Caddy's certificates, restart Caddy, watch it re-issue
#   infra/rehearsal/run.sh alerts           fire the dead-man's switch and both disk alerts at a listener
#   infra/rehearsal/run.sh ssh [command]    a root shell on it
#   infra/rehearsal/run.sh start            start it again on its disk, e.g. after this machine restarted
#   infra/rehearsal/run.sh down             delete the VM, its disk, Pebble, the practice CA and the token file
#
# The VM is the real Ubuntu 24.04 cloud image (signature and checksum checked),
# shaped like the default server type (cpx21: 3 vCPU, 4 GB, 80 GB), run by
# QEMU/KVM inside a container, so nothing here needs sudo. Its ports reach this
# machine on 127.0.0.1 only, and never on 80 or 443, which staging's Caddy holds.
#
# ONLY THESE DIFFERENCES FROM PRODUCTION, each printed as a diff by `up` and
# `setup`. Any other difference that turns out to be needed is a bug in the
# real files: fix it there, never here.
#   1. Access. There is no tailnet key (R6 is the owner's), so `tailscale up` is
#      left out, and root SSH stays on, key-only, with a throwaway key, reachable
#      only through the forwarded port. The scripts run unchanged: SERVER names
#      the VM, and an `ssh` wrapper first on PATH adds the key and the port.
#   2. Certificates come from Pebble, a practice ACME CA, over real HTTP-01 and
#      TLS-ALPN-01 validation, for practice.daygame.test. Caddy trusts Pebble
#      through ACME_DIRECTORY and ACME_CA_CERT, and deploy.sh checks Caddy's
#      certificate with CA_CERT: settings that infra/server/push-env.sh writes
#      only for a .test name. The practice CA file is the one file installed by
#      hand, at /etc/daygame/practice-ca.pem.
#   3. The registry. R5's tokens and the production package do not exist yet,
#      so the VM watches the private staging package with the GitHub CLI's own
#      token, from a mode-600 file that `down` deletes.
#   4. IPv6 is not rehearsed (QEMU's user network has none); Phase 6 checks it.
#
# Settings: REHEARSAL_DIR (default ~/.cache/daygame-rehearsal) holds every file:
# the image, the disk, the keys, the practice CA, the token. ENV_SOURCE names
# the .env.local that infra/write-env-file.sh reads (default: this checkout's).
# Plans/caddy-deploy-and-cicd.md, Phase 5b step 3.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
DIR="${REHEARSAL_DIR:-${XDG_CACHE_HOME:-$HOME/.cache}/daygame-rehearsal}"
export ENV_SOURCE="${ENV_SOURCE:-$REPO/.env.local}"

VM=dg-rehearsal-vm
PEBBLE=dg-rehearsal-pebble
# Its own network, on a range the VM never uses. QEMU shows the VM a forwarded
# connection's real source address, and on Docker's default bridge that is a
# 172.17.x address: the VM's own Docker owns 172.17.0.0/16, so its replies
# went into docker0 and SSH hung as soon as cloud-init installed Docker.
NETWORK=dg-rehearsal NETWORK_SUBNET=10.89.0.0/24
RUNNER=daygame-rehearsal-qemu
PEBBLE_IMAGE=ghcr.io/letsencrypt/pebble:2.10.1@sha256:ddf230642b1a584f519f32e347de1b05a6e4c1f6c35c1863b33effeab5f78199
IMAGES=https://cloud-images.ubuntu.com/releases/noble/release
IMAGE_FILE=ubuntu-24.04-server-cloudimg-amd64.img
# "UEC Image Automatic Signing Key <cdimage@ubuntu.com>", which signs Ubuntu's cloud images.
UBUNTU_SIGNER=D2EB44626FDDC30B513D5BB71A5D6C4C7DB87C81
SERVER=daygame-practice
SITE=practice.daygame.test
EMAIL=ops@daygame.test
WATCH=ghcr.io/reachjvc/daygame-coach-staging:staging
SSH_PORT=18022 HTTP_PORT=18080 HTTPS_PORT=18443 PEBBLE_PORT=18015
# The VM reaches the container it runs in, where Pebble listens, at QEMU's host address.
ACME_DIRECTORY=https://10.0.2.2:14000/dir
CA_FILE=/etc/daygame/practice-ca.pem
LISTENER=http://127.0.0.1:9999

say() { printf 'rehearsal: %s\n' "$*"; }
die() { printf 'rehearsal: ERROR: %s\n' "$*" >&2; exit 1; }
# Commands are built here on purpose and run on the VM as written.
# shellcheck disable=SC2029
vm() { PATH="$DIR/bin:$PATH" ssh "root@$SERVER" "$@"; }
in_runner() { docker run --rm -v "$DIR:/vm" "$RUNNER" "$@"; }
stamp() { date +%s > "$DIR/timing.$1"; }
since() { echo $(( $(date +%s) - $(cat "$DIR/timing.$1") )); }

# --- difference 1, generated from the real file ----------------------------------------
practice_user_data() {
  local src="$REPO/infra/server/cloud-init.yaml" out="$DIR/seed/user-data"
  sed -e 's/^disable_root: true$/disable_root: false/' \
      -e '/^  - \[systemctl, disable, --now, ssh.socket, ssh.service\]$/d' \
      -e '/^  - \[systemctl, mask, ssh.socket, ssh.service\]$/d' \
      -e '/^  - \[tailscale, up, /d' \
      "$src" > "$out"
  # Exactly the four lines above, or the real file changed and this must follow.
  [ "$(diff "$src" "$out" | grep -c '^[<>]')" = 5 ] ||
    die "infra/server/cloud-init.yaml no longer matches what difference 1 edits; update practice_user_data."
}

wait_for_ssh() {
  local deadline=$((SECONDS + ${1:-600}))
  until vm -o ConnectTimeout=5 true 2>/dev/null; do
    [ "$SECONDS" -lt "$deadline" ] || die "the VM did not answer SSH in time; see $DIR/console.log"
    sleep 5
  done
}

healthz_on_vm() {
  vm "curl -s --max-time 5 --resolve $SITE:443:127.0.0.1 --cacert $CA_FILE https://$SITE/api/healthz" 2>/dev/null || true
}

cmd_up() {
  for c in docker curl gpg ssh ssh-keygen openssl; do command -v "$c" >/dev/null || die "$c is missing."; done
  [ -e /dev/kvm ] || die "/dev/kvm is missing: no hardware virtualisation here."
  if [ -d /mnt/c ]; then
    free_gb="$(df -BG --output=avail /mnt/c | tail -1 | tr -dc 0-9)"
    [ "$free_gb" -ge 50 ] || die "only ${free_gb} GB free on C:, below 50 GB (B-DISK). Not downloading."
  fi
  if docker container inspect "$VM" >/dev/null 2>&1; then die "a practice server already runs; '$0 down' first."; fi
  mkdir -p "$DIR"/{img,seed,ssh,pebble,bin,config}
  chmod 700 "$DIR" "$DIR/config" "$DIR/ssh" "$DIR/pebble"

  say "the image: $IMAGES/$IMAGE_FILE, checked against SHA256SUMS and its signature"
  curl -fsSL -o "$DIR/img/SHA256SUMS" "$IMAGES/SHA256SUMS"
  curl -fsSL -o "$DIR/img/SHA256SUMS.gpg" "$IMAGES/SHA256SUMS.gpg"
  export GNUPGHOME="$DIR/gnupg"
  mkdir -p "$GNUPGHOME" && chmod 700 "$GNUPGHOME"
  gpg --batch --quiet --keyserver hkps://keyserver.ubuntu.com --recv-keys "$UBUNTU_SIGNER"
  gpg --batch --status-fd 1 --verify "$DIR/img/SHA256SUMS.gpg" "$DIR/img/SHA256SUMS" 2>/dev/null |
    grep -q "^\[GNUPG:\] VALIDSIG $UBUNTU_SIGNER " || die "SHA256SUMS is not signed by $UBUNTU_SIGNER."
  say "SHA256SUMS: good signature from $UBUNTU_SIGNER"
  [ -f "$DIR/img/$IMAGE_FILE" ] || curl -fsSL -o "$DIR/img/$IMAGE_FILE" "$IMAGES/$IMAGE_FILE"
  (cd "$DIR/img" && sha256sum -c --ignore-missing --quiet SHA256SUMS) || die "$IMAGE_FILE does not match SHA256SUMS."
  say "$IMAGE_FILE: checksum OK"

  docker build -q -t "$RUNNER" "$HERE" >/dev/null
  docker pull -q "$PEBBLE_IMAGE" >/dev/null

  say "a throwaway SSH key, and a practice CA for Pebble's own HTTPS (both deleted by 'down')"
  ssh-keygen -q -t ed25519 -N '' -C daygame-rehearsal -f "$DIR/ssh/id"
  cat > "$DIR/bin/ssh" <<SSH
#!/bin/sh
exec /usr/bin/ssh -F /dev/null -i "$DIR/ssh/id" -o IdentitiesOnly=yes -o HostName=127.0.0.1 -p $SSH_PORT \\
  -o UserKnownHostsFile="$DIR/ssh/known_hosts" -o StrictHostKeyChecking=accept-new -o LogLevel=ERROR "\$@"
SSH
  chmod 755 "$DIR/bin/ssh"
  (
    cd "$DIR/pebble"
    openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -days 7 -subj "/CN=daygame practice CA" \
      -addext basicConstraints=critical,CA:TRUE -addext keyUsage=critical,keyCertSign \
      -keyout ca.key -out ca.pem 2>/dev/null
    openssl req -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -subj "/CN=pebble" -keyout tls.key -out tls.csr 2>/dev/null
    printf 'subjectAltName=IP:10.0.2.2,IP:127.0.0.1,DNS:localhost\nextendedKeyUsage=serverAuth\n' > tls.ext
    openssl x509 -req -in tls.csr -CA ca.pem -CAkey ca.key -CAcreateserial -days 7 -extfile tls.ext -out tls.pem 2>/dev/null
    chmod 644 tls.key tls.pem ca.pem
    cat > pebble-config.json <<'JSON'
{"pebble": {"listenAddress": "0.0.0.0:14000", "managementListenAddress": "0.0.0.0:15000",
  "certificate": "/practice/tls.pem", "privateKey": "/practice/tls.key",
  "httpPort": 80, "tlsPort": 443, "ocspResponderURL": "", "externalAccountBindingRequired": false}}
JSON
  )

  say "difference 1: cloud-init, generated from infra/server/cloud-init.yaml:"
  practice_user_data
  diff -u --label infra/server/cloud-init.yaml --label practice/user-data "$REPO/infra/server/cloud-init.yaml" "$DIR/seed/user-data" || true
  # Hetzner hands its SSH key and the name to cloud-init the same way, as metadata.
  printf 'instance-id: %s-%s\nlocal-hostname: %s\npublic-keys:\n  - %s\n' \
    "$SERVER" "$(date +%s)" "$SERVER" "$(cat "$DIR/ssh/id.pub")" > "$DIR/seed/meta-data"

  in_runner qemu-img create -q -f qcow2 -F qcow2 -b "/vm/img/$IMAGE_FILE" /vm/disk.qcow2 80G
  in_runner genisoimage -quiet -output /vm/seed.iso -volid cidata -joliet -rock /vm/seed/user-data /vm/seed/meta-data

  docker network inspect "$NETWORK" >/dev/null 2>&1 || docker network create --subnet "$NETWORK_SUBNET" "$NETWORK" >/dev/null
  stamp boot
  start_vm
}

# The VM and Pebble, on the disk as it is, then wait for cloud-init.
start_vm() {
  docker run -d --name "$VM" --network "$NETWORK" --device /dev/kvm -v "$DIR:/vm" \
    -p "127.0.0.1:$SSH_PORT:22" -p "127.0.0.1:$HTTP_PORT:80" -p "127.0.0.1:$HTTPS_PORT:443" \
    -p "127.0.0.1:$HTTPS_PORT:443/udp" -p "127.0.0.1:$PEBBLE_PORT:15000" \
    --add-host "$SITE:127.0.0.1" --add-host "www.$SITE:127.0.0.1" \
    "$RUNNER" qemu-system-x86_64 -enable-kvm -cpu host -smp 3 -m 4096 -display none \
      -drive file=/vm/disk.qcow2,if=virtio -drive file=/vm/seed.iso,if=virtio,format=raw,readonly=on \
      -netdev user,id=n0,hostfwd=tcp::22-:22,hostfwd=tcp::80-:80,hostfwd=tcp::443-:443,hostfwd=udp::443-:443 \
      -device virtio-net-pci,netdev=n0 -serial file:/vm/console.log -monitor unix:/vm/monitor.sock,server,nowait >/dev/null
  # Pebble shares the VM container's network: it validates practice.daygame.test
  # on 127.0.0.1:80 and :443, which QEMU forwards into the VM.
  docker run -d --name "$PEBBLE" --network "container:$VM" -e PEBBLE_VA_NOSLEEP=1 -e PEBBLE_WFE_NONCEREJECT=0 \
    -v "$DIR/pebble:/practice:ro" "$PEBBLE_IMAGE" -config /practice/pebble-config.json >/dev/null
  say "booting (3 vCPU, 4 GB, 80 GB); console in $DIR/console.log"
  wait_for_ssh 900
  say "SSH answers after $(since boot) s; waiting for cloud-init"
  vm cloud-init status --wait --long || true
  say "cloud-init finished $(since boot) s after boot"
}

cmd_setup() {
  [ $# -eq 1 ] || die "usage: $0 setup <commit>"
  sha="$(git -C "$REPO" rev-parse --verify --quiet "$1^{commit}")" || die "'$1' is not a commit."
  say "difference 3: the GitHub CLI's token as the registry token, mode 600, deleted by 'down'"
  (umask 077 && gh auth token > "$DIR/config/ghcr-read-server.token")
  say "difference 2: Pebble's issuing root and the practice CA -> $CA_FILE"
  curl -fsS --cacert "$DIR/pebble/ca.pem" "https://127.0.0.1:$PEBBLE_PORT/roots/0" > "$DIR/pebble/issuer-root.pem"
  cat "$DIR/pebble/ca.pem" "$DIR/pebble/issuer-root.pem" > "$DIR/pebble/bundle.pem"
  vm "install -m 644 /dev/stdin $CA_FILE" < "$DIR/pebble/bundle.pem"
  stamp setup
  say "push-env.sh, then sync-infra.sh at $sha (Phase 6's order)"
  push_env
  PATH="$DIR/bin:$PATH" SERVER="$SERVER" "$REPO/infra/server/sync-infra.sh" "$sha"
  say "waiting for the agent's first deploy"
  local deadline=$((SECONDS + 900)) h=""
  until h="$(healthz_on_vm)"; [ "$(jq -r .status <<<"$h" 2>/dev/null)" = ok ]; do
    [ "$SECONDS" -lt "$deadline" ] || die "no healthy app 15 minutes after setup"
    sleep 10
  done
  say "healthy $(since setup) s after setup, $(since boot) s after boot: $h"
}

# The settings difference 2 and 3 need, plus any PING_URL / DISK_*_PING_URL set by the caller.
push_env() {
  PATH="$DIR/bin:$PATH" SERVER="$SERVER" DAYGAME_CONFIG_DIR="$DIR/config" \
    WATCH="$WATCH" ACME_DIRECTORY="$ACME_DIRECTORY" ACME_CA_CERT="$CA_FILE" CA_CERT="$CA_FILE" \
    "$REPO/infra/server/push-env.sh" "$SITE" "$EMAIL"
}

cmd_check() {
  say "cloud-init:"; vm cloud-init status --long | sed 's/^/  /'
  say "docker:"; vm "docker info --format 'live-restore={{.LiveRestoreEnabled}} storage={{.Driver}}'" | sed 's/^/  /'
  say "the deploy user:"
  vm "id deploy; passwd -S deploy; sudo -l -U deploy 2>&1 | tail -1" | sed 's/^/  /'
  say "the agent's deploys:"
  vm "journalctl -u daygame-deploy --no-pager -o cat | grep -E 'new digest|healthy:|done:|ALERT|up to date' | head -5" | sed 's/^/  /'
  say "through Caddy, inside the VM:"
  vm "curl -sS -D - -o /tmp/healthz --resolve $SITE:443:127.0.0.1 --cacert $CA_FILE https://$SITE/api/healthz | grep -iE '^(HTTP|strict-transport)'; cat /tmp/healthz; echo" | sed 's/^/  /'
  vm "curl -sS -o /dev/null -w 'http://$SITE/ -> %{http_code} %{redirect_url}\n' -H 'Host: $SITE' http://127.0.0.1/" | sed 's/^/  /'
  vm "curl -sS -o /dev/null -w 'https://www.$SITE/ -> %{http_code} %{redirect_url}\n' --resolve www.$SITE:443:127.0.0.1 --cacert $CA_FILE https://www.$SITE/" | sed 's/^/  /'
  say "through the forwarded port, from this machine:"
  curl -sS -o /dev/null -w "  https://$SITE:$HTTPS_PORT/api/healthz -> %{http_code}\n" --resolve "$SITE:$HTTPS_PORT:127.0.0.1" \
    --cacert "$DIR/pebble/bundle.pem" "https://$SITE:$HTTPS_PORT/api/healthz"
  say "the certificate:"
  vm "echo | openssl s_client -connect 127.0.0.1:443 -servername $SITE 2>/dev/null | openssl x509 -noout -issuer -subject -dates" | sed 's/^/  /'
  say "listening sockets:"; vm "ss -tulpnH | awk '{print \$1, \$5, \$7}'" | sed 's/^/  /'
  say "containers kept off the metadata service and the tailnet (DOCKER-USER):"
  vm "iptables -L DOCKER-USER -v -n -x | grep DROP" | sed 's/^/  before: /'
  vm "for ip in 169.254.169.254 100.64.0.1; do docker exec dg-app node -e \"fetch('http://'+process.argv[1]+'/', {signal: AbortSignal.timeout(3000)}).then(r => console.log(process.argv[1], 'REACHED', r.status), e => console.log(process.argv[1], 'not reachable:', e.cause?.code ?? e.name))\" \$ip; done" | sed 's/^/  /'
  vm "iptables -L DOCKER-USER -v -n -x | grep DROP" | sed 's/^/  after:  /'
  say "unattended upgrades: the allowed origins that are not Ubuntu's, and the repositories they must match"
  vm "unattended-upgrade --dry-run --debug 2>&1 | grep -oE 'Allowed origins are: .*' | sed 's/, /\n/g' | grep -E '^origin=(Docker|Tailscale)'" | sed 's/^/  allowed: /'
  vm "apt-cache policy | grep -oE 'o=(Docker|Tailscale),.*l=[^,]+' | sort -u" | sed 's/^/  repository: /'
}

cmd_reboot() {
  local before
  before="$(vm 'cat /proc/sys/kernel/random/boot_id')"
  stamp reboot
  vm 'systemctl reboot' || true
  sleep 10
  wait_for_ssh 600
  [ "$(vm 'cat /proc/sys/kernel/random/boot_id')" != "$before" ] || die "the VM did not reboot"
  local deadline=$((SECONDS + 600)) h=""
  until h="$(healthz_on_vm)"; [ "$(jq -r .status <<<"$h" 2>/dev/null)" = ok ]; do
    [ "$SECONDS" -lt "$deadline" ] || die "not healthy 10 minutes after the reboot"
    sleep 3
  done
  say "rebooted; healthz answers $(since reboot) s after the reboot command, without anyone logging in: $h"
  # The agent's timer fires 30 s after boot (OnStartupSec): wait for that run.
  vm "until journalctl -u daygame-deploy -b --no-pager -o cat | grep -q 'agent: up to date\|agent: new digest'; do sleep 2; done"
  vm "echo booted: \$(uptime -s); journalctl -u daygame-deploy -b --no-pager -o cat | grep -E 'agent:' | head -3; iptables -L DOCKER-USER -n | grep DROP" | sed 's/^/  /'
}

cmd_rollback() {
  local good broken
  good="$(vm "docker inspect -f '{{.Config.Image}}' dg-app")"
  say "building a broken image FROM $good, as the deploy user"
  broken="$(vm "su -s /bin/sh deploy -c 'printf \"FROM $good\nCMD [\\\"sh\\\", \\\"-c\\\", \\\"exit 3\\\"]\n\" | docker build -q -'")"
  say "deploying $broken through deploy.sh, as the deploy user"
  vm "su -s /bin/sh deploy -c 'DAYGAME_DEPLOY_ENV=/etc/daygame/deploy.env /opt/daygame/infra/deploy.sh $broken'; echo deploy exit=\$?" | sed 's/^/  /' || true
  vm "echo running: \$(docker inspect -f '{{.Config.Image}}' dg-app); echo failed-digests:; cat /var/lib/daygame/failed-digests" | sed 's/^/  /'
  say "healthz now: $(healthz_on_vm)"
}

cmd_reissue() {
  vm "docker exec dg-caddy sh -c 'find /data/caddy/certificates -name \"*.crt\"'" | sed 's/^/  before: /'
  local t
  t="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  vm "docker exec dg-caddy rm -rf /data/caddy/certificates && docker restart dg-caddy >/dev/null"
  sleep 20
  vm "docker logs --since $t dg-caddy 2>&1 | grep -E 'certificate obtained|obtaining certificate|could not get|error' | grep -oE '\"(msg|identifier|error)\":\"[^\"]*\"' | paste -sd' ' | fold -w 240" | sed 's/^/  /'
  vm "echo | openssl s_client -connect 127.0.0.1:443 -servername $SITE 2>/dev/null | openssl x509 -noout -serial -dates" | sed 's/^/  after: /'
  say "challenges Pebble validated since the start: $(docker logs "$PEBBLE" 2>&1 | grep -oE '(http|tls-alpn)-01' | sort | uniq -c | paste -sd' ')"
  say "healthz now: $(healthz_on_vm)"
}

# Leave $1 % of / free (100: add nothing), then run the disk alert once. It
# exits 1 below a level, which is the point, so that is not a failure here.
fill_to() {
  vm "read -r size avail <<<\"\$(df -B1 --output=size,avail / | tail -1)\"; want=\$(( avail - size * $1 / 100 ))
      if [ $1 -lt 100 ] && [ \$want -gt 0 ]; then fallocate -l \$want /var/tmp/fill-$1; fi
      echo \"\$(df -h --output=avail,pcent / | tail -1) used\"; systemctl start daygame-disk.service 2>/dev/null || true" | sed 's/^/  /'
}

# The Server Actions key, by hash: it must survive every push-env.sh run.
actions_key_hash() {
  vm "sed -n \"s/^NEXT_SERVER_ACTIONS_ENCRYPTION_KEY='\\(.*\\)'\$/\\1/p\" /etc/daygame/production.env | sha256sum | cut -c1-16"
}
running_ref() { vm "docker inspect -f '{{.Config.Image}}' dg-app"; }
as_deploy() { vm "su -s /bin/bash deploy"; } # the commands come on stdin

# Rotating a secret, the way infra/RUNBOOK.md says: here the Server Actions key.
cmd_rotate() {
  local before ref
  before="$(actions_key_hash)" ref="$(running_ref)"
  say "the key is removed on the server and from this machine's copy; push-env.sh then generates a new one"
  vm "sed -i '/^NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=/d' /etc/daygame/production.env"
  sed -i '/^NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=/d' "$DIR/config/production.env"
  push_env
  say "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY by hash: before $before, after $(actions_key_hash)"
  say "deploy.sh --restart $ref, as the deploy user"
  as_deploy <<<"DAYGAME_DEPLOY_ENV=/etc/daygame/deploy.env /opt/daygame/infra/deploy.sh --restart $ref" 2>&1 | sed 's/^/  /'
  say "the key the app now runs with, by hash: $(vm "docker exec dg-app printenv NEXT_SERVER_ACTIONS_ENCRYPTION_KEY | sha256sum | cut -c1-16")"
  say "healthz now: $(healthz_on_vm)"
}

# Rolling back by hand to a named digest, the way infra/RUNBOOK.md says.
cmd_pin() {
  [ $# -eq 1 ] && [[ "$1" =~ ^sha256:[0-9a-f]{64}$ ]] || die "usage: $0 pin sha256:<an older digest of ${WATCH%:*}>"
  local current older="${WATCH%:*}@$1"
  current="$(running_ref)"
  say "marking the running $current failed, so the agent leaves the rollback alone; then deploy.sh $older"
  as_deploy <<<"echo '$current' >> /var/lib/daygame/failed-digests && DAYGAME_DEPLOY_ENV=/etc/daygame/deploy.env /opt/daygame/infra/deploy.sh $older" 2>&1 | sed 's/^/  /'
  say "the agent's next run:"
  vm "systemctl start daygame-deploy.service; journalctl -u daygame-deploy -n 12 --no-pager -o cat | grep 'agent:' | tail -2" | sed 's/^/  /'
  say "healthz now: $(healthz_on_vm)"
  say "undoing it: the mark removed, and the agent's next run deploys the tag again"
  as_deploy <<<"grep -vxF '$current' /var/lib/daygame/failed-digests > /var/lib/daygame/failed-digests.new; mv /var/lib/daygame/failed-digests.new /var/lib/daygame/failed-digests"
  vm "systemctl start daygame-deploy.service; journalctl -u daygame-deploy -n 20 --no-pager -o cat | grep -E 'agent: new digest|deploy: (healthy|done)' | tail -3" | sed 's/^/  /'
  say "healthz now: $(healthz_on_vm)"
}

cmd_alerts() {
  local key_before
  key_before="$(actions_key_hash)"
  say "a listener on the VM's $LISTENER that records every request"
  vm "systemctl stop practice-listener 2>/dev/null; rm -f /root/pings.log; systemd-run --unit=practice-listener --quiet python3 -c '
import http.server
class H(http.server.BaseHTTPRequestHandler):
    def handle_one(self):
        body = self.rfile.read(int(self.headers.get(\"Content-Length\") or 0)).decode()
        with open(\"/root/pings.log\", \"a\") as f: f.write(f\"{self.command} {self.path} {body}\".strip() + chr(10))
        self.send_response(200); self.end_headers()
    do_GET = do_POST = do_HEAD = handle_one
    def log_message(self, *a): pass
http.server.HTTPServer((\"127.0.0.1\", 9999), H).serve_forever()'; sleep 1"
  say "push-env.sh again, now with the three check URLs pointed at the listener"
  PING_URL="$LISTENER/ping/agent" DISK_WARN_PING_URL="$LISTENER/ping/disk-25" DISK_CRIT_PING_URL="$LISTENER/ping/disk-10" push_env
  say "dead-man's switch, success: the agent's next run"
  vm "systemctl start daygame-deploy.service; journalctl -u daygame-deploy -n 12 --no-pager -o cat | grep 'agent:' | tail -2"
  say "dead-man's switch, failure: the deploy user's registry login removed, so the agent cannot read the tag"
  vm "su -s /bin/sh deploy -c 'docker logout ghcr.io' >/dev/null; systemctl start daygame-deploy.service 2>/dev/null || true; journalctl -u daygame-deploy -n 12 --no-pager -o cat | grep 'agent:' | tail -3"
  say "disk alerts: free space as it is, then filled below 25 %, then below 10 %, then emptied"
  vm "rm -f /var/tmp/fill-*"
  fill_to 100; fill_to 20; fill_to 5
  vm "rm -f /var/tmp/fill-*"; fill_to 100
  vm "journalctl -u daygame-disk --no-pager -o cat | grep 'disk:' | tail -12" | sed 's/^/  /'
  say "what the listener received:"
  vm "cat /root/pings.log" | sed 's/^/  /'
  say "restoring the registry login: push-env.sh once more"
  PING_URL="$LISTENER/ping/agent" DISK_WARN_PING_URL="$LISTENER/ping/disk-25" DISK_CRIT_PING_URL="$LISTENER/ping/disk-10" push_env
  say "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY by hash: before the two push-env.sh runs $key_before, after $(actions_key_hash)"
  vm "systemctl start daygame-deploy.service; journalctl -u daygame-deploy -n 12 --no-pager -o cat | grep 'agent:' | tail -2" | sed 's/^/  /'
}

cmd_down() {
  docker rm -f "$PEBBLE" "$VM" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
  # The VM's files were written by root inside the runner; remove them the same way.
  if [ -d "$DIR" ] && docker image inspect "$RUNNER" >/dev/null 2>&1; then
    docker run --rm -v "$DIR:/vm" "$RUNNER" sh -c 'rm -rf /vm/* /vm/.[!.]*' || true
  fi
  rm -rf "$DIR"
  docker image rm "$RUNNER" "$PEBBLE_IMAGE" >/dev/null 2>&1 || true
  say "deleted: the VM, its disk, Pebble, the practice CA, the SSH key and the token file ($DIR)"
}

case "${1:-}" in
  up) cmd_up ;;
  setup) shift; cmd_setup "$@" ;;
  check) cmd_check ;;
  reboot) cmd_reboot ;;
  rollback) cmd_rollback ;;
  pin) shift; cmd_pin "$@" ;;
  rotate) cmd_rotate ;;
  reissue) cmd_reissue ;;
  alerts) cmd_alerts ;;
  ssh) shift; vm "$@" ;;
  start) docker rm -f "$PEBBLE" "$VM" >/dev/null 2>&1 || true
         docker network inspect "$NETWORK" >/dev/null 2>&1 || docker network create --subnet "$NETWORK_SUBNET" "$NETWORK" >/dev/null
         stamp boot; start_vm ;;
  down) cmd_down ;;
  *) die "usage: $0 up | setup <commit> | check | reboot | rollback | pin <digest> | rotate | reissue | alerts | ssh [command] | start | down" ;;
esac
