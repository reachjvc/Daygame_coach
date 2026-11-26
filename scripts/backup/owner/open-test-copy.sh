#!/usr/bin/env bash
# open-test-copy.sh: RUN BY THE OWNER, in his own terminal window. Never by Claude.
# Proves that a backup opens with ONLY the secret key file and your passphrase,
# in a fresh empty keyring (nothing else on this PC is used). Prints only
# counts and OK/FAIL. Deletes everything it unpacked.
# Usage: bash scripts/backup/owner/open-test-copy.sh <master-SECRET-....asc> <backup .tar.gz.gpg>
set -euo pipefail
umask 077
if [ -n "${CLAUDECODE:-}" ]; then
  echo "FAIL: this looks like a Claude session. The owner runs this in his own window." >&2; exit 1
fi
KEY=${1:?secret key file}; COPY=${2:?backup file}
G=$(mktemp -d); V=$(mktemp -d)
trap 'gpgconf --homedir "$G" --kill all >/dev/null 2>&1; rm -rf "$G" "$V"' EXIT
export GNUPGHOME="$G"
# no passphrase caching, so a cached passphrase can never fake a pass
printf 'pinentry-program %s\ndefault-cache-ttl 0\nmax-cache-ttl 0\n' "${DG_TEST_PINENTRY:-/usr/bin/pinentry-curses}" > "$G/gpg-agent.conf"
GPG_TTY=$(tty 2>/dev/null || echo /dev/null); export GPG_TTY
gpg --batch --quiet --import "$KEY" 2>/dev/null
echo "GnuPG now asks for the backup passphrase (from your password manager)."
if ! gpg --batch --quiet --decrypt "$COPY" 2>/dev/null | tar -C "$V" -xzf -; then
  echo "FAIL: the copy did not open (wrong passphrase, wrong key file, or damaged copy)."; exit 1
fi
python3 -I - "$V" <<'PY'
import hashlib, json, os, sys
v = sys.argv[1]; m = json.load(open(os.path.join(v, "manifest.json")))
bad = [n for n, f in m["files"].items()
       if hashlib.sha256(open(os.path.join(v, n), "rb").read()).hexdigest() != f["sha256"]]
if bad:
    print("FAIL: opened, but", len(bad), "file(s) differ from the list inside"); sys.exit(1)
print(f"OK: opened; all {len(m['files'])} files match; {len(m['tables'])} tables; checks were: {m['verdict']}")
PY
echo "Tell Claude: 'test copy opened OK' (or the FAIL line)."
