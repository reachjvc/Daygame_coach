# Pipeline Remediation Procedures
**Status:** Active
**Updated:** 03-02-2026 - Initial creation

This document describes remediation procedures for known failure types. Alternative scripts are created case-by-case as failures occur.

---

## Quick Reference

| Error Type | Stage | Remediation |
|------------|-------|-------------|
| Hallucination loops | 02.transcribe | `--no-condition-on-prev --overwrite` |
| ZeroDivisionError | 03.align | Re-run 02.transcribe with `--no-condition-on-prev` |
| Timeout (50+ min) | 03.align | Skip or manually chunk audio |

---

## Stage 02: Transcribe

### Hallucination Loops

**Symptoms**: 3+ consecutive repeated sentences in transcript (e.g., "Yeah" x29, "Thank you" x358)

**Root Cause**: Whisper `condition_on_previous_text=True` causes feedback loops on noisy audio

**Detection**: Automatic - flagged to `.flagged.json` when detected

**Remediation**:
```bash
# 1. Find flagged video
cat data/02.transcribe/<source>/.flagged.json

# 2. Re-run with hallucination-resistant settings
./scripts/training-data/02.transcribe --audio data/01.download/<source>/<video>/*.wav \
  --out data/02.transcribe/<source>/<video>/<video>.full.json \
  --no-condition-on-prev --overwrite

# 3. Re-run downstream stages (03, 04)
./scripts/training-data/03.align ...
./scripts/training-data/04.diarize ...

# 4. Log remediation
# Update .remediated.json and clear from .flagged.json
```

**Trade-off**: May have minor capitalization inconsistencies on proper nouns

---

## Stage 03: Align

### ZeroDivisionError

**Symptoms**: Processing fails with ZeroDivisionError

**Root Cause**: Videos with wordless segments (empty text but valid timing)

**Detection**: Logged to `.failed.json`

**Remediation**:
```bash
# The issue often stems from problematic transcription
# Re-run 02.transcribe with hallucination-resistant settings
./scripts/training-data/02.transcribe --audio data/01.download/<source>/<video>/*.wav \
  --out data/02.transcribe/<source>/<video>/<video>.full.json \
  --no-condition-on-prev --overwrite

# Then re-run 03.align
./scripts/training-data/03.align ...
```

### Timeout (50+ min files)

**Symptoms**: Process hangs for >17 minutes on long files

**Root Cause**: whisperx.align has memory/time issues with very long files

**Detection**: Process hangs, requires manual kill

**Remediation Options**:
1. **Skip**: Mark as unfixable and skip
2. **Manual chunk**: Split audio into smaller segments and process separately

```bash
# Option 2: Manual chunking with ffmpeg
ffmpeg -i input.wav -f segment -segment_time 1800 -c copy chunk_%03d.wav

# Process each chunk separately
# Merge results manually
```

---

## Stage 04: Diarize

### No Speakers Detected

**Symptoms**: Output shows only SPEAKER_00 or no speakers

**Root Cause**: Audio quality issues or single-speaker video

**Remediation**: Manual review - may be legitimate single-speaker content

### Wrong Speaker Assignment

**Symptoms**: Coach and target labels swapped

**Root Cause**: Minority speaker detection heuristic failed

**Remediation**: Fixed in downstream 06.segment-enrich with turn-taking corrections

---

## General Remediation Workflow

1. **Identify**: Check `.failed.json` and `.flagged.json` files
2. **Diagnose**: Determine error type and root cause
3. **Remediate**: Apply appropriate fix from this document
4. **Verify**: Check output quality after remediation
5. **Document**: Update `.remediated.json` and this file if new procedure

---

## Alternative Scripts

*Created case-by-case as failures occur*

### None yet

---

## Changelog

- 03-02-2026 - Initial creation with known remediation procedures
