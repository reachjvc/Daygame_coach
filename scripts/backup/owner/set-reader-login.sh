#!/usr/bin/env bash
# set-reader-login.sh: RUN BY THE OWNER, in his own terminal window. Never by Claude.
#
# Makes (first run) or renews (later runs) the read-only database login
# `backup_reader` that the nightly GitHub job uses, and gives its password to
# GitHub as the secret BACKUP_DB_PASSWORD of the private backups repo.
#
# The password is made here, lives only in this script's memory, and goes to
# exactly one place: GitHub's secret store (through `gh secret set` on stdin).
# The database receives only a SCRAM-SHA-256 verifier (a salted hash), never
# the password. Nothing is printed except OK/FAIL lines.
#
# Usage (from any folder):
#   bash scripts/backup/owner/set-reader-login.sh
# Needs: this PC's existing Supabase CLI login and linked folder (read from
# ~/.config/daygame-backup/config: SUPABASE_LINKED_DIR), and gh logged in.
#
# Test hooks (used only by the throwaway-copy test, never needed by the owner):
#   DG_DB_EXEC   command that runs one SQL file against the target database
#   DG_GH        gh command to use
set -euo pipefail
umask 077

REPO="reachjvc/daygame-backups"
CONFIG="${DAYGAME_BACKUP_CONFIG:-$HOME/.config/daygame-backup/config}"

if [ -n "${CLAUDECODE:-}" ]; then
  echo "FAIL: this looks like a Claude session. The owner runs this in his own window." >&2
  exit 1
fi

if [ -z "${DG_DB_EXEC:-}" ]; then
  # shellcheck disable=SC1090
  source "$CONFIG"
  : "${SUPABASE_LINKED_DIR:?missing in $CONFIG}"
  DB_EXEC() { (cd "$SUPABASE_LINKED_DIR" && supabase db query --linked -f "$1" >/dev/null 2>&1); }
else
  DB_EXEC() { $DG_DB_EXEC "$1" >/dev/null 2>&1; }
fi
GH="${DG_GH:-gh}"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# 1. Password: "bkr_" + 48 hex characters (192 random bits). The fixed prefix
#    is public on purpose: log scans can count "bkr_" without knowing the value.
pw="bkr_$(openssl rand -hex 24)"

# 2. SCRAM-SHA-256 verifier, computed here (RFC 5802/7677, as PostgreSQL stores it).
verifier=$(printf '%s' "$pw" | python3 -I -c '
import sys, os, hashlib, hmac, base64
pw = sys.stdin.buffer.read(); salt = os.urandom(16); it = 4096
sp = hashlib.pbkdf2_hmac("sha256", pw, salt, it)
ck = hmac.new(sp, b"Client Key", "sha256").digest()
sk = hmac.new(sp, b"Server Key", "sha256").digest()
b = lambda x: base64.b64encode(x).decode()
print(f"SCRAM-SHA-256${it}:{b(salt)}${b(hashlib.sha256(ck).digest())}:{b(sk)}")')

# 3. ONE statement (the CLI refuses several in one call: tested 2026-11-24),
#    atomic: create the role if missing, then set everything. Safe to re-run.
cat > "$work/reader.sql" <<SQL
do \$reader\$ begin
  if not exists (select 1 from pg_roles where rolname = 'backup_reader') then
    create role backup_reader;
  end if;
  alter role backup_reader with login bypassrls connection limit 3 valid until 'infinity' password '$verifier';
  grant pg_read_all_data to backup_reader;
  alter role backup_reader set default_transaction_read_only = on;
  alter role backup_reader set statement_timeout = '20min';
  alter role backup_reader set idle_in_transaction_session_timeout = '5min';
end \$reader\$;
SQL
if DB_EXEC "$work/reader.sql"; then
  echo "OK   database login backup_reader created or renewed"
else
  echo "FAIL database step (nothing was given to GitHub). Tell Claude: 'reader login step 3 failed'." >&2
  exit 1
fi

# 4. Password to GitHub, on stdin only.
if printf '%s' "$pw" | $GH secret set BACKUP_DB_PASSWORD --repo "$REPO" >/dev/null 2>&1; then
  echo "OK   GitHub secret BACKUP_DB_PASSWORD set in $REPO"
else
  echo "FAIL GitHub step. The database has a new password GitHub does not know; run this script again." >&2
  exit 1
fi
unset pw verifier
echo "DONE Tell Claude: 'reader login done'. Nothing else to copy."
