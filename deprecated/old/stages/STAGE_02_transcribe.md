# Stage 02: Transcribe
**Status:** R1 APPROVED
**Updated:** 03-02-2026 17:15

**Script**: `scripts/training-data/02.transcribe`

---

## Overview

Transcribes audio to text using faster-whisper with the large-v3 model.

## Input
- `data/01.download/<source>/<video>/*.audio.asr.raw16k.wav`

## Output
- `data/02.transcribe/<source>/<video>/`
  - `*.full.json` - Full transcription with word timestamps and segments
  - `*.txt` - Plain text transcript
  - `.flagged.json` - Hallucination flags (if detected)

## Key Features
- Model: `large-v3` with `condition_on_previous_text=False` (default)
- Word-level timestamps for all segments
- Hallucination detection: flags videos with 3+ consecutive identical sentences
- Uses raw audio (not denoised) to capture quieter voices
- Trade-off: Minor capitalization inconsistencies on proper nouns

## Usage
```bash
# Single video
./scripts/training-data/02.transcribe "source_name" "https://youtube.com/watch?v=..."

# With hallucination-resistant settings
./scripts/training-data/02.transcribe --audio <wav_file> --out <output.json> --no-condition-on-prev

# Overwrite existing
./scripts/training-data/02.transcribe --audio <wav_file> --out <output.json> --overwrite
```

## Known Issues

| Issue | Description | Remediation |
|-------|-------------|-------------|
| Hallucination loops | `condition_on_previous_text=True` causes repeated sentences on noisy audio | Use `--no-condition-on-prev` flag |

## Quality Targets

- Proper nouns correctly capitalized (Sydney Sweeney, Austin, Texas)
- Brand names correct (ThriveDayGame, not Thrivedaygame)
- No hallucination loops (3+ repeated sentences)

---

## Verification Status

| Round | Videos | Status | Pass | Fail | Notes |
|-------|--------|--------|------|------|-------|
| R1 | 5 | APPROVED | 5 | 0 | User verified 03-02-2026 |
| R2 | 15 | PENDING | - | - | |

---

## R1 Results - Re-run (03-02-2026 16:15)

### Summary
- **Pass**: 5/5 (100%)
- **Fail**: 0/5 (0%)
- **Hallucinations**: 0

### Detailed Results

| # | Video | Duration | Segments | Max Repeat | Result |
|---|-------|----------|----------|------------|--------|
| 1 | daily_evolution/dz8w8XUBDXU | 514s | 105 | 1 | ✓ PASS |
| 2 | coach_kyle_infield/4x9bvKaVWBc | 698s | 159 | 1 | ✓ PASS |
| 3 | social_stoic/G2sWa8X0EjA | 616s | 126 | 1 | ✓ PASS |
| 4 | austen_summers_meets_girls/H3_8iPikhDw | 402s | 113 | 2 | ✓ PASS |
| 5 | natural_lifestyles_meetingGirlsIRL/WSFSpbFCPZo | 899s | 248 | 1 | ✓ PASS |

### Analysis

**Fix Applied**: Changed default to `condition_on_previous_text=False` which prevents Whisper from getting stuck in hallucination loops.

**Segment Count Changes** (vs old run):
- social_stoic: 175 → 126 (cleaner, no repeated hallucinated segments)
- natural_lifestyles: 185 → 248 (captures more actual speech, including quieter voices)

### Previous Run (Failed)

| # | Video | Result | Issue |
|---|-------|--------|-------|
| 3 | social_stoic/G2sWa8X0EjA | ✗ FAIL | Hallucination: "I'm holding them" x104 repeats |
| 5 | natural_lifestyles_meetingGirlsIRL/WSFSpbFCPZo | ✗ FAIL | Hallucination: "I don't know" x68 repeats |
