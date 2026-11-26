#!/usr/bin/env bash
# mirror-backups.sh: daily on this PC (systemd user timer full-mirror.timer).
#
# Copies every backup in the private repo reachjvc/daygame-backups that is not
# here yet into each folder of MIRROR_DIRS, checks each download against the
# sha256 GitHub computed for it, and reports ONE status line to the backups
# repo (repository variable PC_STATUS) that the nightly GitHub job reads.
#
# Never overwrites and never deletes a backup: new files arrive under a temp
# name and are renamed with `mv -n`; an existing file that differs is an alarm.
# Holds no secrets and opens nothing: the copies stay locked.
#
# CONFIG (~/.config/daygame-backup/config, outside the repo):
#   MIRROR_DIRS          space-separated folders (local + OneDrive)
#   MASTER_KEY_FILE      the owner's master-SECRET-<date>.asc on OneDrive
#   MASTER_KEY_SHA256    its sha256, printed by make-master-key.sh
#   LOG_FILE             the life-plan backup's log (its last "ok" must be < 3 days old)
#   ONEDRIVE_DIR         OneDrive backup folder whose size is watched
#   ONEDRIVE_LIMIT_MB    alarm above this size (owner's plan minus headroom)
#   MIRROR_LOG           this script's own log
set -uo pipefail
umask 077
REPO="reachjvc/daygame-backups"
CONFIG="${DAYGAME_BACKUP_CONFIG:-$HOME/.config/daygame-backup/config}"
# shellcheck disable=SC1090
source "$CONFIG" || { echo "cannot read $CONFIG" >&2; exit 1; }
GH="${DG_GH:-gh}"
STATE="${DG_STATE_DIR:-$HOME/.local/state/daygame-backup}"
mkdir -p "$STATE"
today=$(date -u +%F)

problem=""
note() { [ -n "$problem" ] || problem=$1; }   # keep going; the first problem is reported at the end

report() {  # $1 = ok|fail, $2 = short fixed code
  $GH variable set PC_STATUS --repo "$REPO" --body "$1 $today $2" >/dev/null 2>&1 \
    || echo "$(date -Is) could not write PC_STATUS" >> "$MIRROR_LOG"
  echo "$(date -Is) $1 $2" >> "$MIRROR_LOG"
  [ "$1" = ok ] || exit 1
  exit 0
}

# 1. What GitHub holds: name, sha256, tag of every locked copy and manifest.
list=$($GH api --paginate "repos/$REPO/releases?per_page=100" \
  --jq '.[] | select(.draft | not) | .tag_name as $t | .assets[]
        | select(.name | test("^(copy|manifest)-.*\\.(tar\\.gz\\.gpg|json)$"))
        | [$t, .name, (.digest // "")] | @tsv' 2>/dev/null) || report fail list-failed
remote=$(printf '%s\n' "$list" | grep -c '\.tar\.gz\.gpg' || true)

# 2. Fetch what is missing, into every folder.
for dir in $MIRROR_DIRS; do
  mkdir -p "$dir" || { note mkdir; continue; }
  while IFS=$'\t' read -r tag name digest; do
    [ -n "$name" ] || continue
    want=${digest#sha256:}
    if [ -z "$want" ] || [ "$want" = "$digest" ]; then note no-digest; continue; fi
    if [ -e "$dir/$name" ]; then
      have=$(sha256sum "$dir/$name" | cut -d' ' -f1)
      [ "$have" = "$want" ] || note local-copy-differs     # never overwritten; a person looks
      continue
    fi
    tmp="$dir/.$name.partial"
    rm -f "$tmp"
    if ! $GH release download "$tag" --repo "$REPO" --pattern "$name" --output "$tmp" >/dev/null 2>&1; then
      rm -f "$tmp"; note download-failed; continue
    fi
    got=$(sha256sum "$tmp" | cut -d' ' -f1)
    if [ "$got" != "$want" ]; then rm -f "$tmp"; note digest-mismatch; continue; fi
    mv -n "$tmp" "$dir/$name"
    if [ -e "$tmp" ]; then rm -f "$tmp"; note rename-refused; fi
  done <<< "$list"
done

# 3. Counts may only grow (M5: a deleted release or local copy is an alarm).
prev_remote=$(cat "$STATE/remote-count" 2>/dev/null || echo 0)
if [ "$remote" -ge "$prev_remote" ]; then echo "$remote" > "$STATE/remote-count"; else note release-count-dropped; fi
i=0
for dir in $MIRROR_DIRS; do
  i=$((i + 1))
  n=$(find "$dir" -maxdepth 1 -name 'copy-*.tar.gz.gpg' | wc -l)
  p=$(cat "$STATE/local-count-$i" 2>/dev/null || echo 0)
  if [ "$n" -ge "$p" ]; then echo "$n" > "$STATE/local-count-$i"; else note local-count-dropped; fi
done

# 4. The off-PC master key file is still there and unchanged (C1).
if [ ! -s "$MASTER_KEY_FILE" ]; then note key-file-missing
elif [ "$(sha256sum "$MASTER_KEY_FILE" | cut -d' ' -f1)" != "$MASTER_KEY_SHA256" ]; then note key-file-changed; fi

# 5. OneDrive folder size (M13).
mb=$(du -sm "$ONEDRIVE_DIR" 2>/dev/null | cut -f1)
[ -n "$mb" ] && [ "$mb" -le "$ONEDRIVE_LIMIT_MB" ] || note onedrive-size

# 6. The older life-plan backup still runs (its failures were only in its own log).
last=$(grep ' ok ' "$LOG_FILE" 2>/dev/null | tail -1 | cut -c1-10)
[ -n "$last" ] && [ $(( ($(date -u +%s) - $(date -u -d "$last" +%s)) / 86400 )) -le 3 ] || note lifeplan-stale

if [ -n "$problem" ]; then report fail "$problem"; else report ok "copies=$remote"; fi
