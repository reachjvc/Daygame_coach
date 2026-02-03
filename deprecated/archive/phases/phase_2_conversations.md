# Phase 2: 05.conversations

Status: Not Started
Parent: [plan_pipeline.md](../plans/plan_pipeline.md)
Depends on: Phase 1 complete

## Checklist

```
[ ] Step 1: Script migration plan defined
[ ] Step 2: Input/output paths updated (plan)
[ ] Step 3: Fallbacks removed (plan)
[ ] Step 4: State metadata plan added
[ ] Step 5: Prompt templates + versioning planned (video type + segment type)
[ ] Step 6: Video type detection plan updated (title + transcript + metadata)
[ ] Step 7: Ambiguity handling + review queue plan defined
[ ] Step 8: Edge case handling plan defined
[ ] Step 9: Pilot run plan (10 videos) defined
[ ] Step 10: Gold set evaluation plan defined
[ ] Step 11: User approved
```

---

## Purpose

Detect video type, classify segments, assign conversation boundaries.

| | |
|---|---|
| **Input** | data/04.segment-enrich/**/*.segment_enriched.json |
| **Output** | data/05.conversations/**/*.conversations.json |
| **Quality Targets** | 95% video type, 90% segment classification |

---

## Migration from 07.LLM-conversations (Plan)

### Path Changes
| Old | New |
|-----|-----|
| Input: data/06.speakers/ | data/04.segment-enrich/ |
| Output: data/07.LLM-conversations/ | data/05.conversations/ |
| Extension: *.speakers.json | *.segment_enriched.json |

### Code Changes Required (Plan)
1. Update INPUT_ROOT and OUTPUT_ROOT constants
2. Update input file extension matching
3. Add state management (import from utils.py)
4. Add CLI flags (--force, --retry-failed, --dry-run)
5. Add schema validation on output
6. Remove fallback code paths

### Required State Metadata
- pipeline_version
- prompt_version (video type, segment type)
- model_version
- schema_version
- taxonomy_version
- prompt_registry_version
- input_checksum

---

## Video Type Detection (Plan)

### Inputs
- Title
- Transcript snippets
- Speaker distribution
- Metadata (channel, description if available)

### Types
- infield
- talking_head
- podcast
- compilation

### Logic
1. Title + transcript heuristics for strong signals.
2. Speaker distribution check (target presence implies infield).
3. LLM confirmation when ambiguous.

---

## Prompt Templates (Plan)

### Storage
- `prompts/05_video_type.md`
- `prompts/05_segment_type.md`

### Requirements
- Explicit JSON output format.
- Include enum list for valid types.
- Version each prompt and record in state + output metadata.

---

## Segment Classification (Plan)

### Types
- approach, commentary, transition, intro, outro

### Logic
- Use speaker labels from Phase 1.
- LLM resolves ambiguity when coach-only segments appear.

---

## Conversation Boundary Detection (Plan)

### Rules
- New conversation starts on new target, long gap, or scene change.
- conversation_id=0 reserved for commentary/non-approach segments.

---

## Quality Gates (End-to-End Model)

### Automated Validation (No User Gate Here)
- Schema validation (100% pass required to continue).
- All segments have conversation_id.
- All segments have segment_type.
- Video type assigned with confidence score.

**If automated validation passes → automatically continue to Phase 3.**

### Data Collected for End-to-End Review
The following are collected but reviewed AFTER Phase 4 completes:
- Low-confidence video types (< 0.85)
- Low-confidence segment types (< 0.8)
- Video type distribution summary
- Segment type distribution summary

**User reviews these in the comprehensive validation report after all phases complete on test videos.**

---

## Ambiguity Handling (Plan)

1. Define confidence threshold for automatic assignment.
2. Below threshold => add to review queue.
3. Review queue must be cleared before full run.

---

## Edge Cases (Plan)

- Missing transcript or metadata.
- Videos with mixed formats (compilation).
- Multiple targets in one segment.
- Long silences or transitions that mimic conversation breaks.

---

## Validation Report (Plan)

```markdown
## Phase 2 Validation Report

### Automated Checks
- Schema validation: X/X files pass
- All segments have conversation_id + segment_type: [yes/no]

### Confidence Summary
- High confidence video types: X%
- High confidence segment types: Y%
- Low confidence (flagged): Z items

### Distribution Summary
| Video Type | Count | % |
|------------|-------|---|
| infield | X | X% |
| talking_head | Y | Y% |
| podcast | Z | Z% |
| compilation | W | W% |

### Flagged Items (Low Confidence)
1. {filename} - video_type: {type} - confidence: 0.72
2. ...

### Spot-Check Samples (High Confidence)
1. {filename} - Type: {type} - Conversations: {count} - Correct? [ ]
2. ...

### User Task
- Review flagged items
- Verify spot-check samples
- Confirm distributions look reasonable
Reply: APPROVED or list issues.
```

---

## Exit Criteria

Before proceeding to Phase 3 (automated, no user gate):
- [ ] Schema validation passes (100%)
- [ ] All segments have conversation_id + segment_type
- [ ] Video type assigned to all files
- [ ] Confidence scores present

**Note**: User approval happens after ALL phases complete on test videos, not here.
