#!/bin/bash
# download-test-audio.sh
#
# Downloads audio for the 8 test videos that are missing audio files.
# Then runs repair_asr_wavs.sh to create clean16k.wav files.
#
# Usage: ./scripts/training-data/download-test-audio.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_INPUT="$REPO_ROOT/data/test/01.download"
COOKIES_FILE="$REPO_ROOT/docs/data_docs/www.youtube.com_cookies.txt"

echo "=============================================="
echo "Download Missing Test Video Audio"
echo "=============================================="

# Videos that need audio downloaded (channel/folder/video_id)
MISSING_VIDEOS=(
    "NICK_KRAUSER_OUTLAWDAYGAME|Outlaw Daygame -  Part 8 - Command Presence [E8LdbTsJbTY]|E8LdbTsJbTY"
    "TODD_V_OPENING|The Opening Series -- Part 1： Direct Approach & Tonality [-6V-G1CE1xc]|-6V-G1CE1xc"
    "TODD_V_THESYSTEM|How To Flirt： 3 Easy Techniques (+INFIELD VIDEO) [t8Q9rg8HjDE]|t8Q9rg8HjDE"
    "coach_kyle_how_to_approach_a_girl|Get a Date in 5 Minutes： Full Infield Interaction (Cold Approach) [e2dLEB-AwmA]|e2dLEB-AwmA"
    "coach_kyle_how_to_approach_a_girl|How to DESTROY Approach Anxiety (FOREVER) [HAxugFq6IRc]|HAxugFq6IRc"
    "natural_lifestyles_femalepsychology|Masculine Charisma for Introverts - How to handle Social Pressure around Women [XZrKbyAoFNM]|XZrKbyAoFNM"
    "natural_lifestyles_innergrowth|5 Steps To World Class Rizz (The Art Of Talking To Women) [YXVBkHFXNC8]|YXVBkHFXNC8"
    "social_stoic|How To Approach Hot Women (Infield Examples) [Sz1f6OiO5Ko]|Sz1f6OiO5Ko"
)

TOTAL=${#MISSING_VIDEOS[@]}
DOWNLOADED=0
FAILED=0

for entry in "${MISSING_VIDEOS[@]}"; do
    IFS='|' read -r channel folder video_id <<< "$entry"

    target_dir="$TEST_INPUT/$channel/$folder"
    url="https://www.youtube.com/watch?v=$video_id"

    echo "----------------------------------------------"
    echo "[$((DOWNLOADED + FAILED + 1))/$TOTAL] $folder"
    echo "  Channel: $channel"
    echo "  Video ID: $video_id"
    echo "  URL: $url"

    # Check if audio already exists
    existing_audio=$(find "$target_dir" -name "*.webm" -o -name "*.m4a" -o -name "*.mp3" -o -name "*.opus" -o -name "*.ogg" 2>/dev/null | head -1)
    if [ -n "$existing_audio" ]; then
        echo "  SKIP: Audio already exists"
        DOWNLOADED=$((DOWNLOADED+1))
        continue
    fi

    # Create target directory if needed
    mkdir -p "$target_dir"

    # Download audio only using yt-dlp
    echo "  Downloading audio..."
    if yt-dlp \
        --cookies "$COOKIES_FILE" \
        --js-runtimes node \
        --extract-audio \
        --audio-format best \
        --output "$target_dir/$folder.audio.%(ext)s" \
        --no-playlist \
        --quiet \
        --progress \
        "$url"; then
        echo "  SUCCESS"
        DOWNLOADED=$((DOWNLOADED+1))
    else
        echo "  FAILED"
        FAILED=$((FAILED+1))
    fi

    # Small delay to be polite
    sleep 2
done

echo ""
echo "=============================================="
echo "Download Complete!"
echo "  Downloaded: $DOWNLOADED"
echo "  Failed: $FAILED"
echo "=============================================="

# Now generate WAV files
echo ""
echo "Generating WAV files..."
"$SCRIPT_DIR/repair_asr_wavs.sh" "$TEST_INPUT"

echo ""
echo "Done! Audio files ready for transcription."
