# Phase 3: 06a.structure / 06b.content / 06c.outcomes

Status: Not Started
Parent: [plan_pipeline.md](../plans/plan_pipeline.md)
Depends on: Phase 2 complete

## Checklist

```
[ ] Step 1: 06a.structure plan defined
[ ] Step 2: 06a prompt template + versioning plan defined
[ ] Step 3: 06a pilot + gold set evaluation plan defined
[ ] Step 4: Gate A user approval (06a)
[ ] Step 5: 06b.content plan defined
[ ] Step 6: 06b prompt template + taxonomy enforcement plan defined
[ ] Step 7: 06b pilot + gold set evaluation plan defined
[ ] Step 8: Gate B user approval (06b)
[ ] Step 9: 06c.outcomes plan defined
[ ] Step 10: 06c prompt template + consistency checks plan defined
[ ] Step 11: 06c pilot + gold set evaluation plan defined
[ ] Step 12: Edge case handling plan defined
[ ] Step 13: Gate C user approval (06c)
```

---

## Purpose

Split interaction extraction into three smaller, higher-quality steps.

| Step | Input | Output | Quality Target |
|------|-------|--------|----------------|
| 06a.structure | 05.conversations | 06a.structure | Phase accuracy 95%+ |
| 06b.content | 06a.structure | 06b.content | Technique recall 90%+ / Topic recall 85%+ |
| 06c.outcomes | 06a + 06b | 06c.outcomes | Outcome accuracy tracked |

---

## 06a.structure (Plan)

### Purpose
Identify interaction boundaries and phases without techniques/topics.

### Input
`data/05.conversations/**/*.conversations.json`

### Output
`data/06a.structure/**/*.structure.json`

### Processing Flow (Plan)
1. Load conversations.
2. Group segments by conversation_id (skip 0).
3. Format turn-by-turn transcript per conversation.
4. LLM extracts phases + boundaries only.
5. Validate turn indices and structure schema.

### Prompt Template (Plan)
- `prompts/06a_structure.md`
- JSON-only output with phase boundaries.
- Versioned and recorded in state + output metadata.

### Output Highlights
- interaction_id (stable within video)
- conversation_id
- turns[] with speaker + text
- phases with start/end turn

### Automated Validation (No User Gate Here)
- Schema validation (100% pass required).
- All interactions have phases defined.
- Turn indices valid and within bounds.

**If automated validation passes → automatically continue to 06b.**

### Data Collected for End-to-End Review
- Low-confidence phase boundaries (< 0.8)
- Phase distribution summary

---

## 06b.content (Plan)

### Purpose
Extract techniques and topics using taxonomy-only outputs.

### Input
`data/06a.structure/**/*.structure.json`

### Output
`data/06b.content/**/*.content.json`

### Processing Flow (Plan)
1. Load 06a structure outputs.
2. For each interaction, run LLM on transcript.
3. Constrain outputs to taxonomy.
4. Normalize and flag unknowns.

### Prompt Template (Plan)
- `prompts/06b_content.md`
- JSON-only output with technique/topic arrays.
- Versioned and recorded in state + output metadata.

### Consistency Checks (Plan)
1. Technique/topic turn_index must fall within a phase boundary.
2. If outside, add to review queue.
3. Unknown labels are not allowed; they must be flagged.

### Output Highlights
- techniques_used[] with turn_index + evidence
- topics_discussed[] with turn_index + evidence
- taxonomy_version

### Automated Validation (No User Gate Here)
- Schema validation (100% pass required).
- All techniques/topics from taxonomy.
- Turn indices within phase boundaries.

**If automated validation passes → automatically continue to 06c.**

### Data Collected for End-to-End Review
- Low-confidence techniques/topics (< 0.7)
- Taxonomy coverage (which items never appear?)
- Technique/topic distribution summary

---

## 06c.outcomes (Plan)

### Purpose
Extract outcomes and quality summaries, validate consistency.

### Input
- `data/06a.structure/**/*.structure.json`
- `data/06b.content/**/*.content.json`

### Output
`data/06c.outcomes/**/*.outcomes.json`

### Processing Flow (Plan)
1. Join 06a + 06b by video_id + conversation_id + interaction_id.
2. LLM extracts outcome + quality summary.
3. Validate outcome enum and quality format.
4. Consistency checks (outcome aligns with phases).

### Prompt Template (Plan)
- `prompts/06c_outcomes.md`
- JSON-only output with outcome + quality summary.
- Versioned and recorded in state + output metadata.

### Consistency Checks (Plan)
1. Outcome should align with presence/absence of close phase.
2. If outcome is number/instagram, ensure close phase exists.
3. If rejection, ensure close phase is absent or brief.

### Output Highlights
- outcome enum
- interaction_quality (score + strengths + improvements)
- outcome_confidence

### Automated Validation (No User Gate Here)
- Schema validation (100% pass required).
- Outcome enum valid.
- Consistency checks pass (outcome aligns with phases).

**If automated validation passes → automatically continue to Phase 4.**

### Data Collected for End-to-End Review
- Low-confidence outcomes (< 0.75)
- Outcome distribution summary
- Consistency check failures

---

## Validation Reports (Plan)

Each substep collects data for the end-to-end validation report:
- Schema validation results (must pass to continue)
- Low-confidence items (flagged for user review)
- Distribution summaries
- Consistency check results

**User reviews all collected data AFTER Phase 4 completes on test videos.**

---

## Edge Cases (Plan)

- Very short interactions (< 5 turns).
- Extremely long interactions (> 50 turns).
- Missing or ambiguous close phase.
- Techniques referenced without clear turn evidence.
- Multiple outcomes implied in transcript.

---

## Exit Criteria

Before proceeding to Phase 4 (automated, no user gate):
- [ ] 06a schema validation passes
- [ ] 06b schema validation passes
- [ ] 06c schema validation passes
- [ ] All consistency checks pass

**Note**: User approval happens after ALL phases complete on test videos, not here.
