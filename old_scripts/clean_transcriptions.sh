#!/bin/bash
# scripts/clean_transcriptions.sh
# Fix common transcription errors in manually edited files
#
# Usage:
#   ./scripts/clean_transcriptions.sh                      # Clean all transcripts
#   ./scripts/clean_transcriptions.sh "SocialStoic"        # Clean specific channel
#   ./scripts/clean_transcriptions.sh --dry-run            # Preview changes without applying

set -euo pipefail

CHANNEL="${1:-}"
DRY_RUN=false

if [ "$1" == "--dry-run" ]; then
  DRY_RUN=true
fi

TRANSCRIPTS_DIR="training-data/transcripts"

if [ -n "$CHANNEL" ] && [ "$CHANNEL" != "--dry-run" ]; then
  TRANSCRIPTS_DIR="training-data/transcripts/$CHANNEL"
fi

echo "🧹 Cleaning transcriptions in: $TRANSCRIPTS_DIR"
echo "   Dry run: $DRY_RUN"
echo ""

# Common fixes:
# 1. Remove [INAUDIBLE] placeholders
# 2. Fix "um" and "uh" fillers (optional—can preserve authenticity)
# 3. Remove multiple spaces
# 4. Clean up common OCR/transcription errors

find "$TRANSCRIPTS_DIR" -name "*.txt" -type f | while read -r file; do
  echo "Processing: $file"
  
  if [ "$DRY_RUN" = true ]; then
    # Show what would be changed
    echo "  Sample of changes:"
    grep -n "\[INAUDIBLE\]" "$file" | head -3 || echo "  (no [INAUDIBLE] found)"
    grep -n "  " "$file" | head -3 || echo "  (no double spaces found)"
  else
    # Apply fixes
    # Remove [INAUDIBLE] and [NOISE]
    sed -i 's/\[INAUDIBLE\]//g; s/\[NOISE\]//g' "$file"
    
    # Replace multiple spaces with single space
    sed -i 's/  */ /g' "$file"
    
    # Remove leading/trailing whitespace from lines
    sed -i 's/^[[:space:]]*//; s/[[:space:]]*$//' "$file"
    
    echo "  ✓ Cleaned"
  fi
done

if [ "$DRY_RUN" = false ]; then
  echo ""
  echo "✅ Transcription cleanup complete!"
  echo "   Next: ./scripts/quick_ingest.sh"
else
  echo ""
  echo "📋 Dry run complete. Re-run without --dry-run to apply changes."
fi
