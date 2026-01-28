# Pipeline Monitoring Commands

**Created:** 28-01-2026 09:40

Quick reference for monitoring the training data pipeline.

---

## Live Progress

```bash
# Watch transcription progress (live)
tail -f data/pipeline-transcribe.log

# Watch download progress (live)
tail -f data/download.log
```

---

## Progress Counts

```bash
# Downloaded videos (folder count)
find data/01.download -maxdepth 3 -type d -name "*\[*\]*" 2>/dev/null | wc -l

# Transcribed videos
find data/02.transcribe -name "*.full.whisperx.json" 2>/dev/null | wc -l

# Audio features extracted
find data/04.audio-features -name "*.audio_features.json" 2>/dev/null | wc -l

# Speaker fusion completed
find data/05.speaker-fusion -name "*.speakers.json" 2>/dev/null | wc -l
```

---

## Check for Failures

### Download Failures (Cookie/Auth Issues)

```bash
# Check for cookie warnings in download log
grep -i "cookies.*no longer valid\|sign in\|bot\|captcha\|verify" data/download.log

# Check for failed downloads
grep -i "error\|failed\|❌" data/download.log | tail -20

# Count successful vs failed sources
echo "Successful:" && grep -c "✅ Done:" data/download.log
echo "Failed:" && grep -c "⚠️ Failed source\|❌" data/download.log
```

### Transcription Failures

```bash
# Check for transcription errors
grep -i "error\|failed\|traceback" data/pipeline-transcribe.log | tail -20

# Count processed vs skipped vs failed
grep "Done: processed=" data/pipeline-transcribe.log | tail -5

# Find videos downloaded but not transcribed
comm -23 \
  <(find data/01.download -maxdepth 2 -type d -name "*\[*\]*" -printf '%f\n' 2>/dev/null | sort) \
  <(find data/02.transcribe -maxdepth 2 -type d -printf '%f\n' 2>/dev/null | sort) \
  | head -20
```

---

## Verify Pipeline Success

```bash
# Full pipeline health check
echo "=== PIPELINE STATUS ==="
echo ""
echo "Downloads:"
echo "  Total folders: $(find data/01.download -maxdepth 3 -type d -name "*\[*\]*" 2>/dev/null | wc -l)"
echo "  Sources processed: $(ls -d data/01.download/*/ 2>/dev/null | wc -l)"
echo ""
echo "Transcriptions:"
echo "  Completed: $(find data/02.transcribe -name "*.full.whisperx.json" 2>/dev/null | wc -l)"
echo "  With diarization: $(find data/02.transcribe -name "*.spk.tsv" 2>/dev/null | wc -l)"
echo ""
echo "Audio Features:"
echo "  Completed: $(find data/04.audio-features -name "*.audio_features.json" 2>/dev/null | wc -l)"
echo ""
echo "Speaker Fusion:"
echo "  Completed: $(find data/05.speaker-fusion -name "*.speakers.json" 2>/dev/null | wc -l)"
echo ""
echo "=== RECENT ERRORS ==="
grep -h "ERROR\|FAILED\|Traceback" data/*.log 2>/dev/null | tail -10 || echo "No errors found"
```

---

## Session State

```bash
# Check download session state (anti-detection)
cat data/.download_session_state 2>/dev/null || echo "No session state"

# Reset session counter (if needed)
echo "SESSION_VIDEO_COUNT=0" > data/.download_session_state
```

---

## Process Status

```bash
# Check if processes are still running
ps aux | grep -E "02.transcribe|01.download" | grep -v grep

# Kill if needed (use with caution)
# pkill -f "02.transcribe"
# pkill -f "01.download"
```

---

## Re-run Failed Items

### Re-download specific source
```bash
./scripts/training-data/01.download "source_name" "https://youtube.com/..."
```

### Re-transcribe specific source
```bash
source .venv/bin/activate
python scripts/training-data/02.transcribe "source_name" "https://youtube.com/..." --engines whisperx --whisperx-diarize
```

### Re-run with overwrite (force reprocess)
```bash
# Add --overwrite flag to force reprocessing
python scripts/training-data/02.transcribe --sources --engines whisperx --whisperx-diarize --overwrite
```

---

## Cookie Refresh (if downloads fail)

If you see "cookies are no longer valid" errors:

1. Open YouTube in Chrome/Firefox while logged in
2. Install a cookie export extension (e.g., "Get cookies.txt LOCALLY")
3. Export cookies for youtube.com
4. Save to: `docs/data_docs/www.youtube.com_cookies.txt`
5. Restart downloads

---

## Expected Completion Times

With anti-detection settings (30-120s delays, 30 video sessions with 2-6hr pauses):

| Videos | Estimated Time |
|--------|----------------|
| 100 | ~2-4 hours |
| 500 | ~1-2 days |
| 1500 | ~4-7 days |

Transcription (with CUDA): ~20-60 seconds per video depending on length.
