#!/usr/bin/env bash
# Remove cross-producer duplicate videos.
# For each duplicate YouTube ID appearing in two producers:
#   - Keep the video in the first producer (alphabetically)
#   - Delete the video dir from the second producer (stage 01 + downstream)
#   - Add the ID to the second producer's archive to prevent re-download
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DOWNLOAD_DIR="$ROOT_DIR/data/01.download"

removed=0
archived=0

# Build duplicate list to temp file first (avoids pipe/stdin conflicts)
tmpfile=$(mktemp)
trap 'rm -f "$tmpfile"' EXIT

find "$DOWNLOAD_DIR" -name "*.audio.asr.raw16k.wav" -print0 | perl -0 -ne '
  if (m{/data/01\.download/([^/]+)/.*\[([A-Za-z0-9_-]{11})\]}) {
    print "$2|$1\n";
  }
' | sort | awk -F'|' '{
  if ($1 in first) { print $1 "|" first[$1] "|" $2 }
  else { first[$1] = $2 }
}' > "$tmpfile"

while IFS='|' read -r ytid keep_producer remove_producer; do

  # Find the video directory to remove
  remove_dir=$(find "$DOWNLOAD_DIR/$remove_producer" -mindepth 1 -maxdepth 1 -type d -name "*${ytid}*" -print -quit 2>/dev/null)
  if [ -z "$remove_dir" ]; then
    echo "SKIP: $ytid not found in $remove_producer"
    continue
  fi

  # Delete from stage 01
  echo "REMOVE: $ytid from $remove_producer (keeping in $keep_producer)"
  rm -rf "$remove_dir"
  removed=$((removed + 1))

  # Delete from downstream stages
  for stage_dir in "$ROOT_DIR"/data/0{2,3,4,5,6,7}*/; do
    if [ -d "$stage_dir" ]; then
      downstream=$(find "$stage_dir/$remove_producer" -mindepth 1 -maxdepth 1 -type d -name "*${ytid}*" -print -quit 2>/dev/null)
      if [ -n "$downstream" ]; then
        rm -rf "$downstream"
        echo "  cleaned: $(basename "$stage_dir")/$remove_producer"
      fi
    fi
  done

  # Add to archive to prevent re-download
  archive="$DOWNLOAD_DIR/$remove_producer/.youtube-dl-archive.audio.txt"
  if [ -f "$archive" ]; then
    if ! grep -q "$ytid" "$archive" 2>/dev/null; then
      echo "youtube $ytid" >> "$archive"
      archived=$((archived + 1))
    fi
  fi

done < "$tmpfile"

echo ""
echo "=== DEDUP SUMMARY ==="
echo "Removed: $removed video directories"
echo "Archive entries added: $archived"
