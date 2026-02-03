# Phase 6: Final Validation & Cleanup

Status: Not Started
Parent: [plan_pipeline.md](../plans/plan_pipeline.md)
Depends on: Phase 5 complete

## Checklist

```
[ ] Step 1: Final quality report plan defined
[ ] Step 2: User final spot-check plan defined
[ ] Step 3: Dataset version + data card plan defined
[ ] Step 4: Old data folders archive plan defined
[ ] Step 5: Old scripts archive plan defined
[ ] Step 6: Documentation update plan defined
[ ] Step 7: Temporary files cleanup plan defined
[ ] Step 8: Pipeline marked complete (plan)
```

---

## Purpose

Final validation, archive old files, update docs.

---

## Step 1: Final Quality Report (Plan)

```markdown
## Final Quality Report

### Data Counts
| Stage | Files | Expected | Status |
|-------|-------|----------|--------|
| 04.segment-enrich | X | 456 | [pass/fail] |
| 05.conversations | X | 456 | [pass/fail] |
| 06a.structure | X | 456 | [pass/fail] |
| 06b.content | X | 456 | [pass/fail] |
| 06c.outcomes | X | 456 | [pass/fail] |

### Schema Validation
- 04: X/Y valid
- 05: X/Y valid
- 06a: X/Y valid
- 06b: X/Y valid
- 06c: X/Y valid

### Quality Metrics (sampled)
| Metric | Result | Target | Status |
|--------|--------|--------|--------|
| Speaker label accuracy | X% | 95% | [pass/fail] |
| Video type accuracy | X% | 95% | [pass/fail] |
| Segment classification | X% | 90% | [pass/fail] |
| Technique recall | X% | 90% | [pass/fail] |
| Topic recall | X% | 85% | [pass/fail] |
| Phase accuracy | X% | 95% | [pass/fail] |

### Distribution Analysis
Speaker labels, video types, techniques, topics, outcomes.
```

---

## Step 2: User Final Spot-Check (Plan)

- Present 10 random files with summaries.
- User reviews 3-5 files end-to-end.
- Reply: FINAL APPROVAL or list issues.

---

## Step 3: Dataset Version + Data Card (Plan)

- Assign final dataset version tag.
- Produce a data card with:
  - sources
  - processing pipeline versions
  - quality metrics
  - known limitations

---

## Step 4: Archive Old Data Folders (Plan)

Archive legacy folders only after approval:
- 05.tonality
- 06.speakers
- 07.LLM-conversations
- 08.interactions
- 09.enrich

---

## Step 5: Archive Old Scripts (Plan)

Archive legacy scripts:
- 05.tonality
- 06.speakers
- 07.LLM-conversations
- 08.interactions
- 09.enrich
- 10.ingest.ts

---

## Step 6: Update Documentation (Plan)

Update:
- `docs/overviews/overview_pipeline.md` status and counts
- `docs/overviews/plan_pipeline.md` phase checkboxes

Final structure should show 06a/06b/06c.

---

## Step 7: Cleanup (Plan)

- Remove temporary test artifacts
- Trim old logs
- Remove tmp/bak files

---

## Step 8: Mark Complete (Plan)

- Set all phases to complete in plan_pipeline.md
- Add reminder to delete archive after 30 days

---

## Exit Criteria

Pipeline complete when:
- [ ] All quality targets met
- [ ] User has given final approval
- [ ] Dataset version + data card complete
- [ ] Old folders archived (not deleted)
- [ ] Docs updated
- [ ] Temp files cleaned
