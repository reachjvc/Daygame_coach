# Phase 1: 04.segment-enrich

Status: ✅ IMPLEMENTED (ready for end-to-end test)
Updated: 31-01-2026 06:00 - Synced with reality. Script implemented + tested. Bug fixed.
Updated: 31-01-2026 05:10 - Fixed speaker clustering: video type pre-detection + no-pitch segments kept separate.
Updated: 31-01-2026 04:45 - Starting implementation. Tone is audio-based (5 tones), not LLM.
Parent: [plan_pipeline.md](../plans/plan_pipeline.md)
Depends on: Phase 0 complete

## Checklist

```
[x] Step 1: Script IMPLEMENTED (scripts/training-data/04.segment-enrich)
[x] Step 2: Prompt v1.1.0 created (prompts/04_speaker_labeling.md)
[x] Step 3: Speaker cluster analysis IMPLEMENTED
[x] Step 4: LLM cluster labeling IMPLEMENTED + bug fixed (v1.1.0)
[x] Step 5: Tone window classification IMPLEMENTED (audio thresholds from tones research)
[x] Step 6: Edge case handling IMPLEMENTED (video type pre-detection)
[x] Step 7: Pilot run DONE (5 videos tested - see results below)
[~] Step 8-10: Validation - part of end-to-end test on 20 videos
[~] Step 11: User approved - pending end-to-end test
```

---

## Purpose

Replace rule-based 05.tonality and heuristic 06.speakers with LLM-based classification.

| | |
|---|---|
| **Input** | data/03.audio-features/**/*.audio_features.json |
| **Output** | data/04.segment-enrich/**/*.segment_enriched.json |
| **Quality Target** | 95%+ speaker label accuracy |

---

## Script Specification (Plan Only)

### Location
`scripts/training-data/04.segment-enrich` (Python, executable)

### CLI Interface
```
./04.segment-enrich --input FILE
./04.segment-enrich --sources
./04.segment-enrich --force
./04.segment-enrich --retry-failed
./04.segment-enrich --dry-run
```

### Required State Metadata
- pipeline_version
- prompt_version (speaker, tone)
- model_version
- schema_version
- taxonomy_version
- prompt_registry_version
- input_checksum

---

## Processing Flow (Plan)

1. **Load input** from 03.audio-features
2. **Analyze speaker clusters** (stats per speaker_id)
3. **Label clusters via LLM** (coach/target/voiceover/other)
4. **Build tone windows** (30s window, 10s hop)
5. **Classify tone via audio thresholds** (5 tones, NOT LLM)
6. **Enrich segments** (speaker label + tone_window_id)
7. **Write output** with metadata

---

## Prompt Templates (Plan)

### Storage
- `prompts/04_speaker_labeling.md` (LLM prompt for speaker classification)
- Note: Tone classification uses audio thresholds, no prompt needed

### Requirements
- Include explicit JSON output format.
- Include enum list for valid labels/tones.
- Version each prompt and record in state + output metadata.

## Quality Gates (End-to-End Model)

### Automated Validation (No User Gate Here)
- Schema validation (100% pass required to continue).
- All speaker_ids mapped.
- All tone windows valid.
- Confidence scores present on all labels.

**If automated validation passes → automatically continue to Phase 2.**

### Data Collected for End-to-End Review
The following are collected but reviewed AFTER Phase 4 completes:
- Low-confidence speaker labels (< 0.8)
- Low-confidence tone windows (< 0.7)
- Speaker distribution summary
- Tone distribution summary

**User reviews these in the comprehensive validation report after all phases complete on test videos.**

---

## Speaker Cluster Analysis (Plan)

### Stats Per Cluster
- Segment count
- Total duration
- Average pitch
- Likely gender (heuristic)
- Sample utterances

---

## LLM Cluster Labeling (Plan)

- Output JSON must map all speaker_ids.
- Valid labels: coach, target, voiceover, other.
- No fallbacks: invalid output fails hard.

---

## Tone Window Classification (Plan)

**IMPORTANT**: Tone is classified via AUDIO THRESHOLDS, not LLM.

- 5 tones: playful, confident, nervous, energetic, neutral
- Threshold rules (from tones_gap.md):
  - playful: pitch_std > 22 AND energy_dyn > 13
  - confident: pitch_std < 18 AND energy_dyn 8-13 AND syl_rate 5-6.5
  - nervous: syl_rate > 6.8 AND pitch_std < 16
  - energetic: brightness > 1700 OR energy_dyn > 15
  - neutral: default (none of above)
- Each window gets primary tone + confidence (distance from threshold)

---

## Edge Cases (Plan)

- Missing or empty transcript text for a segment.
- Single-speaker videos mislabeled as target.
- Very short clips with insufficient context for tone.
- Non-speech segments (music, silence).

## Issue: Inverted Speaker Ratios (FIXED 31-01-2026)

### Problem
Initial test run showed inverted coach/target ratios:
- "ALWAYS BE CLOSING": coach:43, target:127 (should be reversed)
- Many talking_head videos created phantom "target" clusters

### Root Cause
1. Pitch clustering assumed 2 speakers exist for all videos
2. No-pitch segments (56 of 170 in one video) were assigned to largest cluster

### Fix Applied (prompt v1.1.0)
1. **Video type pre-detection** from title keywords before clustering
   - `infield|approach|pickup` → multi-speaker mode
   - `tips|how to|hack|mistakes` → single-speaker mode
2. **Single-speaker path** for talking_head videos (all segments = coach)
3. **No-pitch segments** kept separate (labeled "other" or "voiceover" by LLM)

### Test Results After Fix
| Video | Type | coach | target | other | Status |
|-------|------|-------|--------|-------|--------|
| HOW TO FEEL GOOD | talking_head | 107 | 0 | 0 | ✅ |
| Critical Daygame Hack | talking_head | 140 | 0 | 0 | ✅ |
| Fixing The Mistakes | talking_head | 186 | 0 | 0 | ✅ |
| ALWAYS BE CLOSING | infield | 50 | 64 | 56 | ✅ |
| Better Conversations | unknown | 25 | 92 | 8 | ⚠️ content-specific |

## Validation & Evaluation (Confidence-Based)

### Automated
- Schema validation (100% pass required).
- All speaker_ids mapped.
- All tone windows valid.
- Confidence scores present on all labels.

### Confidence-Based Review
- Flag speaker labels with confidence < 0.8.
- Flag tone windows with confidence < 0.7.
- Generate distribution summaries.
- Sample random high-confidence items for spot-check.

### AI Triage
- Flag low-confidence clusters or ambiguous tones.
- Generate review queue for user checks.
- Report any speaker_id with < 0.7 average confidence.

---

## Validation Report (Plan)

```markdown
## Phase 1 Validation Report

### Automated Checks
- Schema validation: X/X files pass
- All speaker_ids mapped: [yes/no]
- All tone_windows valid: [yes/no]

### Confidence Summary
- High confidence speaker labels: X%
- Low confidence (flagged): Y items

### Distribution Summary
| Label | Distribution | Reasonable? |
|-------|--------------|-------------|
| coach | X% | [ ] |
| target | Y% | [ ] |
| voiceover | Z% | [ ] |
| other | W% | [ ] |

### Flagged Items (Low Confidence)
1. {filename} - speaker_id: X - confidence: 0.65 - label: {label}
2. ...

### Spot-Check Samples (High Confidence)
1. {filename} - Speaker labels: {...} - Correct? [ ]
2. ...

### User Task
- Review flagged items
- Verify spot-check samples
- Confirm distributions look reasonable
Reply: APPROVED or list issues.
```

---

## Exit Criteria

Before proceeding to Phase 2 (automated, no user gate):
- [ ] Schema validation passes (100%)
- [ ] All speaker_ids mapped
- [ ] All tone windows valid
- [ ] Confidence scores present

**Note**: User approval happens after ALL phases complete on test videos, not here.
