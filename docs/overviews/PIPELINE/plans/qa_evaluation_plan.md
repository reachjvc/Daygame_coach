# QA Validation Plan (End-to-End)

Status: Draft
Updated: 30-01-2026 20:15 - Changed to end-to-end validation (single gate after Phase 4)

## Goal

Validate pipeline quality using a single validation gate after ALL phases complete on test videos.

---

## Approach: End-to-End Validation

```
Phase 0: Setup artifacts
    ↓
Phases 1-4: Run on 20 test videos (automated schema validation only, no user gates)
    ↓
SINGLE VALIDATION GATE: User reviews comprehensive report
    ↓
If issues: trace back → fix → re-run ALL phases
    ↓
Approved: Run on 456 files
```

**Key principle**: User cares about the FINAL output, not intermediate stages.

---

## Automated Validation (During Pipeline Run)

Each phase performs automated checks. If these fail, the pipeline stops.

| Phase | Automated Checks |
|-------|------------------|
| Phase 1 | Schema valid, all speaker_ids mapped, all tone windows valid |
| Phase 2 | Schema valid, all segments have conversation_id + type |
| Phase 3a | Schema valid, all interactions have phases |
| Phase 3b | Schema valid, all techniques/topics from taxonomy |
| Phase 3c | Schema valid, outcome enum valid, consistency checks |
| Phase 4 | 100% merge success, schema valid, no duplicates |

**If automated checks pass → continue to next phase (no user gate).**

---

## Data Collected During Pipeline Run

Each phase collects validation data for the end-to-end report:

### From Phase 1
- Low-confidence speaker labels (< 0.8)
- Low-confidence tone windows (< 0.7)
- Speaker distribution summary
- Tone distribution summary

### From Phase 2
- Low-confidence video types (< 0.85)
- Low-confidence segment types (< 0.8)
- Video type distribution
- Segment type distribution

### From Phase 3
- Low-confidence phase boundaries (< 0.8)
- Low-confidence techniques/topics (< 0.7)
- Low-confidence outcomes (< 0.75)
- Taxonomy coverage report
- Phase distribution
- Outcome distribution

### From Phase 4
- Merge success rate
- Chunk counts per interaction
- Any validation failures

---

## Comprehensive Validation Report (After Phase 4)

```markdown
# End-to-End Validation Report

## Pipeline Summary
- Test videos processed: 20
- Phase 1 outputs: X files
- Phase 2 outputs: X files
- Phase 3 outputs: X files (06a/06b/06c)
- Phase 4: X interactions ingested

## Confidence Overview
| Label Type | High Confidence | Flagged (Low) |
|------------|-----------------|---------------|
| Speaker labels | X% | Y items |
| Tone windows | X% | Y items |
| Video types | X% | Y items |
| Segment types | X% | Y items |
| Phase boundaries | X% | Y items |
| Techniques | X% | Y items |
| Topics | X% | Y items |
| Outcomes | X% | Y items |

## Distribution Summaries

### Speakers
| Label | Count | % | Reasonable? |
|-------|-------|---|-------------|
| coach | X | X% | [ ] |
| target | Y | Y% | [ ] |
| voiceover | Z | Z% | [ ] |

### Video Types
| Type | Count | % | Reasonable? |
|------|-------|---|-------------|
| infield | X | X% | [ ] |
| talking_head | Y | Y% | [ ] |
| podcast | Z | Z% | [ ] |

### Outcomes
| Outcome | Count | % |
|---------|-------|---|
| number | X | X% |
| instagram | Y | Y% |
| rejection | Z | Z% |
| ... | ... | ... |

### Taxonomy Coverage
- Techniques used: X/37
- Techniques never seen: [list]
- Topics used: X/28
- Topics never seen: [list]

## Flagged Items (All Phases)

### Low-Confidence Items
1. {file} - Phase 1 - speaker_id: X - confidence: 0.65 - label: coach
2. {file} - Phase 2 - video_type - confidence: 0.72 - label: infield
3. ...

### Consistency Warnings
1. {file} - outcome=number but no close phase
2. ...

## Spot-Check Samples (Random High-Confidence)

### Speaker Labels (5 samples)
1. {file} - speaker: coach - confidence: 0.95 - Correct? [ ]
2. ...

### Video Types (5 samples)
1. {file} - type: infield - confidence: 0.92 - Correct? [ ]
2. ...

### Techniques (5 samples)
1. {file} - technique: push_pull - turn: 7 - Correct? [ ]
2. ...

### Outcomes (5 samples)
1. {file} - outcome: number - confidence: 0.88 - Correct? [ ]
2. ...

## User Action Required

1. Review flagged items - do any reveal systematic errors?
2. Verify spot-check samples - are high-confidence items actually correct?
3. Confirm distributions - do percentages make sense for your data?
4. Check taxonomy coverage - are missing techniques/topics expected?

Reply: APPROVED or describe issues found.
```

---

## Single Approval Gate

After Phase 4 completes on test videos:

1. AI generates comprehensive validation report
2. User reviews:
   - Flagged low-confidence items
   - Random spot-check samples
   - Distribution summaries
   - Taxonomy coverage
3. User either:
   - **APPROVES** → proceed to full run on 456 files
   - **REJECTS** → AI traces issues to root cause phase, fixes, re-runs ALL phases

---

## Tracing Issues to Root Cause

If user finds problems:

| Problem | Likely Root Cause | Fix |
|---------|-------------------|-----|
| Wrong speaker labels | Phase 1 prompt or cluster analysis | Adjust 04_speaker_labeling prompt |
| Wrong video types | Phase 2 detection logic | Adjust 05_video_type prompt |
| Wrong phases | Phase 3a boundary detection | Adjust 06a_structure prompt |
| Wrong techniques | Phase 3b extraction or taxonomy | Adjust 06b_content prompt or taxonomy |
| Wrong outcomes | Phase 3c extraction | Adjust 06c_outcomes prompt |

After fix → re-run ALL phases on test videos → generate new report → user reviews again.

---

## Storage

- `data/test/reports/end_to_end_validation.md`
- `data/test/reports/end_to_end_validation.json`
- `data/test/reports/flagged_items.json`
- `data/test/reports/spot_check_samples.json`
