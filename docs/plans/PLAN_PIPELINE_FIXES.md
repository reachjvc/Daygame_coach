# Pipeline Fixes Plan
**Status:** ACTIVE
**Created:** 2026-01-28

## Summary

The training data pipeline has several issues preventing reliable execution. This plan documents the problems and required fixes.

---

## Current State

| Stage | Expected | Actual | Status |
|-------|----------|--------|--------|
| 01.download | All sources | 704 videos (3 sources) | Blocked by cookies |
| 02.transcribe | All downloaded | 227 transcripts | Working |
| 03.audio-features | All transcripts | 1 file | NOT RUN |
| 04.content | All transcripts | 0 files | NOT RUN |
| 05.speaker-fusion | All transcripts | 1 file | NOT RUN |
| 06-09 | All transcripts | 0 files | NOT RUN |
| 10.ingest | All enriched | 0 | NOT RUN |

---

## Issues Found

### ISSUE 1: Pipeline Stages 03-09 Never Executed

**Problem:** Only `02.transcribe --sources` was run, not `final_pipeline`. This means:
- 227 transcripts exist
- Only 1 audio feature file exists
- Only 1 speaker fusion file exists
- Stages 04-09 never ran

**Root Cause:** Operator ran transcription in isolation instead of full pipeline.

**Fix:**
1. Use `./scripts/training-data/final_pipeline --sources` to run complete pipeline
2. OR run each stage manually in sequence:
   ```bash
   source .venv/bin/activate
   python scripts/training-data/03.audio-features --sources
   python scripts/training-data/04.content --sources
   python scripts/training-data/05.speaker-fusion --sources  # or 05.tonality
   # ... etc
   ```

**Verification:**
```bash
# Should all match transcript count (227)
find data/03.audio-features -name "*.audio_features.json" | wc -l
find data/05.speaker-fusion -name "*.speakers.json" | wc -l
```

---

### ISSUE 2: Python Scripts Require venv Activation

**Problem:** Running scripts directly without venv causes import errors:
```
ModuleNotFoundError: No module named 'numpy'
```

**Root Cause:** Scripts don't auto-activate venv. The shebang `#!/usr/bin/env python3` uses system Python.

**Fix Options:**
1. Always activate venv before running:
   ```bash
   source .venv/bin/activate
   python scripts/training-data/03.audio-features ...
   ```
2. OR update scripts to use venv Python directly:
   ```bash
   #!/home/jonaswsl/projects/daygame-coach/.venv/bin/python3
   ```
3. OR wrap in shell scripts that activate venv first

**Recommendation:** Use option 1 (always activate) for now. Document in TRAINING_DATA.md.

---

### ISSUE 3: Ollama LLM Timeouts on Complex Prompts

**Problem:** `test-llm-quality.py` tests timeout after 180-300 seconds:
- Topic extraction: Timed out
- Content classification: Timed out
- Speaker identification: Works (40s)

**Root Cause:** Complex multi-segment prompts overwhelm llama3.1 model.

**Potential Fixes:**
1. Reduce batch size in prompts (fewer segments per call)
2. Use simpler/faster model for bulk processing
3. Increase timeout for complex operations
4. Split complex tasks into smaller chunks

**Testing:** Check if Ollama is responsive:
```bash
ollama run llama3.1 "Say hello"
```

---

### ISSUE 4: LLM-Only Speaker Accuracy Too Low (73.3%)

**Problem:** `test-llm-quality.py` shows LLM speaker identification at 73.3%.

**Context:** This tests LLM in isolation. The full speaker fusion pipeline (05.speaker-fusion) achieves 96.7% by combining:
- Pyannote diarization
- Pitch-based gender classification
- LLM inference
- Conversation flow priors

**Status:** NOT A BLOCKER - the fusion approach works.

**Note:** The test file tests LLM alone for research purposes. Production uses fusion.

---

### ISSUE 5: Cookies Expired (Known/Acceptable)

**Problem:** YouTube downloads fail with "Sign in to confirm you're not a bot"

**Fix:** User updating cookies at `docs/data_docs/www.youtube.com_cookies.txt`

**Verify cookies work:**
```bash
yt-dlp --cookies docs/data_docs/www.youtube.com_cookies.txt --simulate "https://www.youtube.com/watch?v=PyK3K0ES5VM"
```

---

## Bugs Fixed (2026-01-28)

### FIX 1: 01.download - SESSION_START_TIME unbound variable
**File:** `scripts/training-data/01.download`
**Problem:** When session state file was empty/partial, `SESSION_START_TIME` was unbound
**Fix:** Added default values after sourcing state file

### FIX 2: 03.audio-features - Transcript naming mismatch
**File:** `scripts/training-data/03.audio-features`
**Problem:** Script looked for `<stem>.json` matching WAV filename, but transcripts are named `<video>.full.json`
**Fix:** Added pattern matching to strip audio suffixes and try multiple transcript patterns

### FIX 3: 05.tonality - Audio features filename pattern
**File:** `scripts/training-data/05.tonality`
**Problem:** Expected `*.features.json` but audio-features creates `*.audio_features.json`
**Fix:** Changed pattern to `*.audio_features.json` throughout the script

---

## Action Plan

### Phase 1: Immediate Fixes

- [x] **Update cookies** - User updated
- [x] **Fix pipeline bugs** - 3 bugs fixed (see above)
- [x] **Test single video through full pipeline** - Verified all 9 stages work
- [ ] **Run stages 03-09 on existing transcripts**
  ```bash
  source .venv/bin/activate
  python scripts/training-data/03.audio-features --sources
  python scripts/training-data/05.tonality --sources
  # Continue with remaining stages...
  ```

### Phase 2: Pipeline Hardening

- [ ] **Add pre-flight checks to final_pipeline**
  - Check venv is activated
  - Check Ollama is running
  - Check cookies file exists and is recent
  - Check disk space

- [ ] **Add progress checkpoints**
  - Pipeline state file tracking which stages completed per source
  - Resume from last successful stage on restart

- [ ] **Add validation between stages**
  - Verify output counts match input counts
  - Alert if any stage produces zero outputs

### Phase 3: Testing Before Long Runs

- [ ] **Create quick validation script**
  ```bash
  ./scripts/training-data/validate-pipeline.sh
  # Runs 1-2 videos through full pipeline
  # Reports any failures
  ```

- [ ] **Add dry-run mode to final_pipeline**
  - Show what would be processed without processing
  - Verify all dependencies available

---

## Commands Reference

### Check Pipeline Health
```bash
echo "Downloads: $(find data/01.download -maxdepth 3 -type d -name "*\[*\]*" 2>/dev/null | wc -l)"
echo "Transcripts: $(find data/02.transcribe -name "*.full.whisperx.json" 2>/dev/null | wc -l)"
echo "Audio Features: $(find data/04.audio-features -name "*.audio_features.json" 2>/dev/null | wc -l)"
echo "Speaker Fusion: $(find data/05.speaker-fusion -name "*.speakers.json" 2>/dev/null | wc -l)"
```

### Run Missing Stages
```bash
source .venv/bin/activate
# Run audio features for all transcribed videos
python scripts/training-data/03.audio-features --sources

# Run speaker fusion
python scripts/training-data/05.speaker-fusion --sources
```

### Test Speaker Fusion
```bash
source .venv/bin/activate
python scripts/training-data/05.speaker-fusion --test
# Expected: ≥95% accuracy
```

### Resume Downloads (after cookie fix)
```bash
./scripts/training-data/01.download --sources docs/sources.txt >> data/download.log 2>&1 &
tail -f data/download.log
```

---

## Files

- Pipeline scripts: `scripts/training-data/01-10.*`
- Full orchestrator: `scripts/training-data/final_pipeline`
- Monitoring commands: `docs/data_docs/PIPELINE_MONITORING.md`
- Training data docs: `docs/data_docs/TRAINING_DATA.md`
