# Stage 03: Align
**Status:** R1 APPROVED
**Updated:** 03-02-2026 19:30

**Script**: `scripts/training-data/03.align`

---

## Overview

**What it claims:** Sentence-level alignment using whisperx.

**What it actually does:** Word-level forced alignment. Refines word timestamps to match audio waveform more precisely. Does NOT re-segment at sentence boundaries.

> ⚠️ **IMPORTANT:** 49% of segments still end mid-sentence after this stage. Sentence segmentation will be handled in Stage 08c (chunking) using NLP.

## Input
- `data/02.transcribe/<source>/<video>/*.full.json`
- `data/01.download/<source>/<video>/*.audio.asr.raw16k.wav`

## Output
- `data/03.align/<source>/<video>/`
  - `*.full.json` - Segments with refined word timestamps
  - `*.txt` - Plain text
  - `.failed.json` - Processing failures (if any)

## What This Stage Provides

| Feature | Status |
|---------|--------|
| Word-level timestamps refined | ✓ Yes |
| Timestamps aligned to audio waveform | ✓ Yes |
| Sentence-level boundaries | ✗ No (misleading name) |
| Text preserved 100% | ✓ Yes |

## Value for Downstream Stages

| Stage | Value |
|-------|-------|
| 04.diarize | **High** - precise word timestamps help speaker assignment |
| 05.audio-features | **High** - precise timing for feature extraction |
| 06+ LLM stages | Low - LLMs don't need precise timestamps |
| 08c.chunk | None - still need sentence segmentation |

## Usage
```bash
# Single file mode (used for test data)
./scripts/training-data/03.align --input transcription.json --audio audio.wav --out output.json

# Batch mode
./scripts/training-data/03.align "source_name" "https://youtube.com/watch?v=..."
```

## Known Issues

| Issue | Description | Remediation |
|-------|-------------|-------------|
| ZeroDivisionError | Videos with wordless segments | Filter handled in script |
| Alignment failure | Some short segments fail to align | Falls back to original timestamps |
| Mid-sentence segments | 49% of segments end mid-sentence | Handled in Stage 08c |

## Quality Targets

- ~~Sentence-level segment boundaries~~ (not achieved, see note above)
- ✓ Word timestamps refined
- ✓ Text 100% preserved
- ✓ No processing failures

---

## Verification Status

| Round | Videos | Status | Pass | Fail | Notes |
|-------|--------|--------|------|------|-------|
| R1 | 5 | APPROVED | 5 | 0 | Word timestamps refined, 2 segments failed alignment in WSFSpbFCPZo |
| R2 | 15 | PENDING | - | - | |

### R1 Results (03-02-2026)

| Video ID | Segments 02→03 | Words | Word Timestamps | Issues |
|----------|----------------|-------|-----------------|--------|
| H3_8iPikhDw | 113→139 | 865 | 100% | 1 natural gap (12s) |
| G2sWa8X0EjA | 126→162 | 1890 | 100% | None |
| 4x9bvKaVWBc | 159→187 | 2759 | 100% | None |
| WSFSpbFCPZo | 248→328 | 2241 | 99.4% | 2 failed alignments |
| dz8w8XUBDXU | 105→118 | 1640 | 100% | None |

**Sentence boundary analysis:**
- 51% of segments end with proper punctuation (.?!)
- 49% end mid-sentence (inherited from Stage 02)

---

## Changelog

- 03-02-2026 19:30 - R1 APPROVED. Updated doc to reflect actual behavior (word alignment, not sentence alignment)
- 03-02-2026 - Initial creation
