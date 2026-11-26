#!/usr/bin/env bash
# make-master-key.sh: RUN BY THE OWNER, in his own terminal window. Never by Claude.
#
# Makes the NEW master backup key. Every new backup is locked to it.
# The passphrase is typed only into GnuPG's own prompt in this window; it is
# never shown, stored, or passed to any program you can read later.
#
# Before you start: open your password manager and make a new entry
# "daygame backup master key". Let it generate a long passphrase, save it,
# then copy it from there when GnuPG asks (3 times: new, again, export).
#
# Usage:  bash scripts/backup/owner/make-master-key.sh [folder for the key files]
#         (default folder: <ONEDRIVE_DIR from ~/.config/daygame-backup/config>/keys)
# Writes: master-public.asc (safe to share) and master-SECRET-<date>.asc
#         (useless without the passphrase; keep it on OneDrive AND a USB stick).
# The key exists nowhere else afterwards: this script deletes its own work folder.
set -euo pipefail
umask 077
if [ -n "${CLAUDECODE:-}" ]; then
  echo "FAIL: this looks like a Claude session. The owner runs this in his own window." >&2; exit 1
fi
OUT="${1:-}"
if [ -z "$OUT" ]; then   # default: the OneDrive backup folder named in the private config
  # shellcheck disable=SC1090
  source "${DAYGAME_BACKUP_CONFIG:-$HOME/.config/daygame-backup/config}" 2>/dev/null || true
  [ -n "${ONEDRIVE_DIR:-}" ] && OUT="$ONEDRIVE_DIR/keys"
fi
[ -n "$OUT" ] || { echo "FAIL: no folder given and none in the config; nothing changed." >&2; exit 1; }
mkdir -p "$OUT"
stamp=$(date +%Y-%m-%d)
[ ! -e "$OUT/master-SECRET-$stamp.asc" ] || { echo "FAIL: $OUT/master-SECRET-$stamp.asc exists already; nothing changed." >&2; exit 1; }
G=$(mktemp -d)
export GNUPGHOME="$G"
trap 'gpgconf --homedir "$G" --kill all >/dev/null 2>&1; rm -rf "$G"' EXIT
# Old-style preferences: files locked to this key open with GnuPG 2.2 and other
# OpenPGP tools too (tested 2026-11-24), not only GnuPG 2.4.
echo "default-preference-list AES256 AES192 AES SHA512 SHA384 SHA256 ZLIB BZIP2 ZIP Uncompressed" > "$G/gpg.conf"
printf 'pinentry-program %s\ndefault-cache-ttl 0\nmax-cache-ttl 0\n' "${DG_TEST_PINENTRY:-/usr/bin/pinentry-curses}" > "$G/gpg-agent.conf"
GPG_TTY=$(tty 2>/dev/null || echo /dev/null); export GPG_TTY

echo "Step 1 of 2: GnuPG asks for the NEW passphrase, then the same again."
gpg --batch --quiet --quick-generate-key "daygame backups master $stamp" default default never 2>/dev/null
FPR=$(gpg --list-keys --with-colons | awk -F: '/^fpr/{print $10; exit}')
SUB=$(gpg --list-keys --with-colons | awk -F: '/^sub/{print $5; exit}')
gpg --quiet --armor --export "$FPR" > "$OUT/master-public.asc.partial" 2>/dev/null
echo "Step 2 of 2: GnuPG asks for the passphrase once more, to save the secret key file."
gpg --batch --quiet --armor --export-secret-keys "$FPR" > "$OUT/master-SECRET-$stamp.asc.partial"
[ -s "$OUT/master-SECRET-$stamp.asc.partial" ] || { echo "FAIL: export empty; nothing saved." >&2; rm -f "$OUT"/*.partial; exit 1; }
mv -n "$OUT/master-SECRET-$stamp.asc.partial" "$OUT/master-SECRET-$stamp.asc"
mv -f "$OUT/master-public.asc.partial" "$OUT/master-public.asc"
echo
echo "DONE. Copy master-SECRET-$stamp.asc to a USB stick too. Tell Claude these 3 lines (not secret):"
echo "MASTER_FPR=$FPR"
echo "MASTER_SUBKEY=$SUB"
echo "SECRET_FILE_SHA256=$(sha256sum "$OUT/master-SECRET-$stamp.asc" | cut -d' ' -f1)"
