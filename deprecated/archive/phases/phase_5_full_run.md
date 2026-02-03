# Phase 5: Full Pipeline Run

Status: Not Started
Parent: [plan_pipeline.md](../plans/plan_pipeline.md)
Depends on: Phases 0-4 complete

## Checklist

```
[ ] Step 1: Backup plan defined
[ ] Step 2: Version freeze plan (prompt/model/schema/taxonomy)
[ ] Step 3: 04.segment-enrich full run plan
[ ] Step 4: 05.conversations full run plan
[ ] Step 5: 06a.structure full run plan
[ ] Step 6: 06b.content full run plan
[ ] Step 7: 06c.outcomes full run plan
[ ] Step 8: 07.ingest full run plan
[ ] Step 9: Full-run QA sampling plan
[ ] Step 10: User approved
```

---

## Purpose

Run all pipeline stages on the full dataset (456 files) after pilots pass.

---

## Full-Run Plan (High-Level)

1. Backup data/ before full run.
2. Freeze prompt/model/schema/taxonomy versions.
3. Run 04.segment-enrich on all sources.
4. Validate schema + counts.
5. Run 05.conversations on all sources.
6. Validate schema + counts.
7. Run 06a.structure on all sources.
8. Validate schema + counts.
9. Run 06b.content on all sources.
10. Validate schema + counts.
11. Run 06c.outcomes on all sources.
12. Validate schema + counts.
13. Run 07.ingest.
14. Final QA sampling and user approval.

---

## Version Freeze (Plan)

During full run, the following must remain fixed:
- prompt versions
- model versions
- schema versions
- taxonomy version

If any version changes, abort and restart full run.

---

## QA Sampling Plan (Full Run)

- Stratified sample across video types and lengths.
- Minimum sample size:
  - 96 labels for ±10% at 95% confidence
  - Prefer 385 labels for ±5% at 95% confidence
- Use evaluation harness to produce report.
- Gate: user approval required before cleanup.

---

## Validation Report (Plan)

```markdown
## Phase 5 Validation Report

### File Counts
| Stage | Files | Expected | Status |
|-------|-------|----------|--------|
| 04.segment-enrich | X | 456 | [OK/FAIL] |
| 05.conversations | X | 456 | [OK/FAIL] |
| 06a.structure | X | 456 | [OK/FAIL] |
| 06b.content | X | 456 | [OK/FAIL] |
| 06c.outcomes | X | 456 | [OK/FAIL] |

### Schema Validation
- 04: X/Y valid
- 05: X/Y valid
- 06a: X/Y valid
- 06b: X/Y valid
- 06c: X/Y valid

### Sampling Metrics
- Speaker label accuracy: X% (target 95%)
- Video type accuracy: X% (target 95%)
- Segment classification: X% (target 90%)
- Technique recall: X% (target 90%)
- Topic recall: X% (target 85%)
- Phase accuracy: X% (target 95%)

### User Task
Review QA report + 3 sample files.
Reply: APPROVED or list issues.
```

---

## Exit Criteria

Before proceeding to Phase 6:
- [ ] Version freeze plan defined
- [ ] Full-run plan defined
- [ ] QA sampling plan defined
- [ ] User has approved Phase 5 plan
