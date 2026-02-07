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

### Stage 08 — Taxonomy Validation
- [ ] Run on 12 videos
- [ ] Verify exit code 0 (PASS), review any unlisted concepts
- [ ] Sign-off

### Stage 09 — Chunk & Embed
- [ ] Run on 12 videos
- [ ] Verify .chunks.json files created with embeddings
- [ ] Sign-off

### Stage 10 — Ingest
- [ ] Run on 12 videos
- [ ] Verify chunks in Supabase, vector search works
- [ ] Sign-off

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

---

## End Goal: Smart RAG Retrieval

Current RAG does basic vector similarity on dialogue text. End goal is intelligent retrieval using all pipeline metadata.

### Target Architecture

```
INGESTION (Stage 09):
  Embed WITH metadata prefix:
  "[TOPIC: career] [TECHNIQUE: qualification] [PHASE: pre_hook]
   Coach: What do you study? Girl: Medicine..."

QUERY TIME:
  User question → LLM query parsing → structured intent
       ↓
  {topic: "career", keyword: "medicine", intent: "response script"}
       ↓
  Metadata filter: WHERE topics ? 'career' AND content ~ 'medicine'
  + Vector search: ORDER BY embedding <-> query_embedding
       ↓
  Top chunks + relevant metadata → Claude
```

### Requirements

| Component | Status | Description |
|-----------|--------|-------------|
| Store metadata | ✅ Done | topics, techniques, phase in Supabase JSONB |
| Embed metadata | ❌ TODO | Re-embed with metadata prefix in Stage 09 |
| Query parsing | ❌ TODO | LLM/rules to extract intent from question |
| Metadata filters | ❌ TODO | Use parsed intent to filter before vector search |
| Show metadata to Claude | ❌ TODO | Include relevant techniques/topics in prompt |

### Why This Matters

User asks: "what to say when she studies medicine"

| Approach | Result |
|----------|--------|
| Current (vector only) | Might return generic career talk |
| With metadata + parsing | Finds exact chunk where girl said "medicine" |

### Implementation Order

1. Wire up metadata filters in retrieval.ts (use existing stored metadata)
2. Add query parsing (rules first, LLM later)
3. Re-embed with metadata prefix (requires Stage 09 re-run)
4. Show relevant metadata to Claude in prompt
