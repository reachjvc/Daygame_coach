#!/usr/bin/env bash
# Nightly encrypted backup of the life-plan tables (every account).
#
# HOW TO RESTORE (plain steps)
#   1. Get the encrypted file: ~/dg-backups/nightly/ or the OneDrive folder
#      "daygame-backups" (files life-plan-YYYY-MM-DD.json.gz.gpg).
#   2. If this PC is gone: import the private key from OneDrive
#      (KEY-private-protected.asc) with `gpg --import`, then decrypt with the
#      backup passphrase from your password manager.
#   3. Decrypt:  gpg --decrypt life-plan-YYYY-MM-DD.json.gz.gpg | gunzip > backup.json
#   4. Dry look (writes nothing, shows counts; add --confirm to write):
#        npx tsx scripts/restore-life-plan.ts backup.json --target <database url>
#      Restore one account: add --user <id>. If the target already has rows for
#      that account, add --replace (it deletes them first, inside one transaction).
#   5. The live project is refused unless --live-i-mean-it is also given.
#
# CONFIG lives outside the repo: ~/.config/daygame-backup/config with
#   BACKUP_KEY_FPR      fingerprint of the backup public key
#   SUPABASE_LINKED_DIR folder where `supabase link` was done (read-only SELECTs)
#   BACKUP_DIRS         space-separated output folders
#   LOG_FILE            failure log
# Encryption needs only the public key. Never writes to the database.
set -uo pipefail

CONFIG="${DAYGAME_BACKUP_CONFIG:-$HOME/.config/daygame-backup/config}"
# shellcheck disable=SC1090
source "$CONFIG" || { echo "cannot read $CONFIG" >&2; exit 1; }

fail() {
  echo "$(date -Is) FAIL: $*" >> "$LOG_FILE"
  echo "FAIL: $*" >&2
  rm -f "${TMP:-/nonexistent}"
  exit 1
}

TMP=$(mktemp "${TMPDIR:-/tmp}/plan-backup.XXXXXX") || fail "mktemp"
TODAY=$(date +%F)
NAME="life-plan-$TODAY.json.gz.gpg"

# Export: discover tables, one json_agg per table, assemble in python.
cd "$SUPABASE_LINKED_DIR" || fail "linked dir missing"
export SQL_LIST="select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' and table_name like 'life_plan%' order by 1"
python3 - "$TMP" <<'PY' || fail "export failed"
import json, subprocess, sys, os, datetime

def q(sql):
    p = subprocess.run(["supabase", "db", "query", "--linked", sql, "-o", "json"],
                       capture_output=True, text=True)
    if p.returncode != 0:
        raise SystemExit("query failed: " + p.stderr[-200:])
    t = p.stdout
    i = min(x for x in (t.find("["), t.find("{")) if x >= 0)
    d = json.JSONDecoder().raw_decode(t[i:])[0]
    return d["rows"] if isinstance(d, dict) else d

names = [r["table_name"] for r in q(os.environ["SQL_LIST"])]
if not names:
    raise SystemExit("no tables found")
tables = {}
for n in names:
    rows = q(f"select coalesce(json_agg(x), '[]'::json) as j from public.{n} x")
    j = rows[0]["j"]
    tables[n] = json.loads(j) if isinstance(j, str) else j
out = {"taken_at": datetime.datetime.now(datetime.timezone.utc).isoformat(), "tables": tables}
with open(sys.argv[1], "w") as f:
    json.dump(out, f)
PY

# Encrypt (public key only), then place into each folder via temp + rename.
STAGED=$(mktemp "${TMPDIR:-/tmp}/plan-backup-enc.XXXXXX") || fail "mktemp"
trap 'rm -f "$TMP" "$STAGED"' EXIT
gzip -9 -c "$TMP" | gpg --batch --yes --trust-model always --encrypt -r "$BACKUP_KEY_FPR" -o "$STAGED" \
  || fail "encrypt failed"
[ -s "$STAGED" ] || fail "empty encrypted file"

for dir in $BACKUP_DIRS; do
  mkdir -p "$dir" || fail "mkdir $dir"
  cp "$STAGED" "$dir/.$NAME.partial" || fail "copy to $dir"
  mv -f "$dir/.$NAME.partial" "$dir/$NAME" || fail "rename in $dir"
  # Retention: newest 30 dailies + the first file of each of the last 12 months.
  python3 - "$dir" <<'PY' || fail "retention in $dir"
import os, re, sys
d = sys.argv[1]
files = sorted(f for f in os.listdir(d) if re.fullmatch(r"life-plan-\d{4}-\d\d-\d\d\.json\.gz\.gpg", f))
keep = set(files[-30:])
firsts = {}
for f in files:
    firsts.setdefault(f[10:17], f)
for m in sorted(firsts)[-12:]:
    keep.add(firsts[m])
for f in files:
    if f not in keep:
        os.remove(os.path.join(d, f))
PY
done
echo "$(date -Is) ok $NAME" >> "$LOG_FILE"
