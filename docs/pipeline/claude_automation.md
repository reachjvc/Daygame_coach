# Pipeline Automation Plan
**Status:** Active
**Updated:** 06-02-2026

---

## Ground Rules

- **No manual review at scale.** 1500 videos. Failures = bugs to fix, not items to flag.
- **No heuristics.** All judgment calls use LLM. Claude Max covers the cost.

**Pipeline source of truth:** [`docs/pipeline/ASCII`](docs/pipeline/ASCII)

---

## Verification Principle

> **Read the actual data.** Open output files, read alongside transcript, confirm every claim. If output says "coach" — is it the coach? Treat pipeline as guilty until proven innocent.

---

## R2 Progress (12 videos)

### Stage 02 — PASSED ✓
Signed off 05-02-2026. 3 Todd V videos excluded (age-restricted). 2 minor warnings allowed through.

### Stage 06 — Video Type + Conversations
- [ ] Run on 12 videos
- [ ] Verify: video type, speaker labels, conversation boundaries
- [ ] Sign-off

### Stage 06b — Verify
- [ ] Run on 12 videos
- [ ] Review verdicts: APPROVE or justified FLAG
- [ ] Sign-off

### Stage 06c — Patch
- [ ] Verify fixes applied (misattrib ≥0.70, video_type ≥0.85, boundary ≥0.90)
- [ ] Verify APPROVE copied unchanged, FLAG gets fixes, other_flags logged
- [ ] Sign-off

### Stage 07 — Content Enrichment
- [ ] Run on 12 videos
- [ ] Verify techniques in transcript, phases progress correctly
- [ ] Sign-off

### Stage 08 — Ingest
- [ ] Run on 12 videos
- [ ] Verify chunks, metadata, vector search
- [ ] Sign-off

### Stage 09 — Taxonomy Report
- [ ] Run, review unlisted concepts with 3+ occurrences

### End-to-End
- [ ] Run `batch_report.py --all --batch-id R2`
- [ ] User approval

---

## After R2: Production Batches

1. **Finalize** — lock prompt versions, thresholds, validation rules
2. **P001** — 100 videos, 10% sample review
3. **Iterate** — fix issues before P002
4. **Scale** — P002, P003... until 1500 done

**Per batch:**
- `batch_report.py --all --batch-id PXXX --compare`
- `09.taxonomy-report` — review unlisted concepts
- 10% random + all validation-flagged

---

## Automation Status

- [x] Validation: jsonschema + invariants in 06/07
- [x] Cross-stage: `validate_cross_stage.py` gates 07→08
- [x] Failure budget: 3 consecutive or >20% → halt
- [x] Evidence: fuzzy match >30% mismatch → block
- [x] Batch report: stats + drift detection
- [ ] Rate limit handling (test on R2)
