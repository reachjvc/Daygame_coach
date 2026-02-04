# Stage 04: Diarize
**Status:** FRESH START
**Updated:** 04-02-2026

**Script**: `scripts/training-data/04.diarize`

---

## Changelog
- 04-02-2026: Documented known speaker merge limitation (~1.5% error rate)
- 04-02-2026: Reverted to pyannote (DiariZen installation issues)
- 03-02-2026: Attempted switch to DiariZen (failed - not installed)

---

## Overview

Performs speaker diarization using pyannote to identify different speakers.

## Input
- `data/03.align/<source>/<video>/*.full.json`
- `data/01.download/<source>/<video>/*.asr.clean16k.wav` (audio)

## Output
- `data/04.diarize/<source>/<video>/`
  - `*.full.json` - Segments with speaker labels (SPEAKER_00, SPEAKER_01)
  - `*.txt` - Plain text

## Key Features
- Requires HuggingFace token (`HF_TOKEN` environment variable)
- Outputs speaker labels: SPEAKER_00, SPEAKER_01, etc.
- Turn merging: collapses adjacent same-speaker turns
- Smart speaker assignment for overlapping segments

## Usage
```bash
# Single video (requires HF_TOKEN)
HF_TOKEN=hf_xxx ./scripts/training-data/04.diarize "source_name" "https://..."

# Overwrite existing
HF_TOKEN=hf_xxx ./scripts/training-data/04.diarize "source_name" "https://..." --overwrite
```

## Performance

**With pyannote 3.4.0 on RTX 4060 (CUDA):**
- Processing speed: ~33x realtime
- ~20s processing per 10-minute video
- Full pipeline estimate: ~8 hours for all 966 videos

**Previous (pyannote 2.x on CPU):**
- Processing speed: 0.71x realtime (bottleneck)
- ~600s processing per 843s video

## Quality Targets

- 2 speakers detected for infield videos
- Speaker boundaries accurate
- Consistent SPEAKER_00/SPEAKER_01 assignment

---

## Verification Status

| Round | Videos | Status | Pass | Fail | Notes |
|-------|--------|--------|------|------|-------|
| R1 | 5 | DONE | 5 | 0 | See details below |
| R2 | 15 | PENDING | - | - | |

### R1 Results (04-02-2026)

| Video | Duration | Speakers | Result |
|-------|----------|----------|--------|
| A Basic Daygame Approach | 401s | 3 (SPEAKER_00, SPEAKER_01, UNKNOWN) | ✅ |
| How To Approach Groups Of Girls | 616s | 2 (SPEAKER_00, SPEAKER_02) | ✅ |
| How to approach a woman with friends | 698s | 3 (SPEAKER_00, SPEAKER_01, SPEAKER_02) | ✅ |
| How to get Rejected like a BOSS | 899s | 8 speakers | ✅ (compilation) |
| Purpose/Masculinity/Fitness/Pickup | 514s | 1 (SPEAKER_00) | ✅ (monologue) |

**Processing times:** 12-27s per video on CUDA (pyannote 3.4.0, RTX 4060)

---

## Known Limitations

### Speaker Merge in Rapid Dialogue (~1.5% error rate)

Pyannote occasionally merges two speakers into one during rapid Q&A exchanges, particularly with:
- Very short responses ("Yes", "Chile", "18")
- Similar voice characteristics between speakers
- Outdoor/noisy audio

**Example (wrong):**
```
SPEAKER_01: "Where are you from?"
SPEAKER_01: "Chile"              ← Should be different speaker
```

**Detection:** An LLM can identify these errors via semantic understanding - Q&A pairs where the same speaker asks and answers their own question.

**Mitigation:** Stage 08b (LLM Content Enrichment) MUST include speaker correction as a preprocessing step. The LLM should:
1. Scan for Q&A patterns where same speaker answers their own direct question
2. Swap speaker labels for the response segment
3. Log corrections for verification

**Observed error rates (R1 test set):**
| Video Type | Issues | Segments | Rate |
|------------|--------|----------|------|
| Dialogue-heavy | 12 | 816 | 1.47% |
| Monologue | 0 | 118 | 0% |

**Specific instances identified in R1:**
- A Basic Daygame: 6 issues (73s, 78s, 159s, 205s, 212s, 221s)
- Woman with friends: 1 issue (338s)
- Rejected like a BOSS: 5 issues (45s, 80s, 131s, 250s, 475s)

---

## Failed Attempts

### DiariZen (03-02-2026)
Attempted to switch to DiariZen for faster diarization. Failed due to installation complexity (requires separate conda environment, specific PyTorch version). Reverted to pyannote.
