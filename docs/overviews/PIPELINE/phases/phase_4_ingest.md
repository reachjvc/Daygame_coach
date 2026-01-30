# Phase 4: 07.ingest

Status: Not Started
Parent: [plan_pipeline.md](../plans/plan_pipeline.md)
Depends on: Phase 3 complete

## Checklist

```
[ ] Step 1: Script migration plan defined
[ ] Step 2: Input sources updated (06a + 06b + 06c)
[ ] Step 3: Merge strategy defined
[ ] Step 4: Lineage metadata plan defined (prompt/model/schema/taxonomy)
[ ] Step 5: Validation before insert plan defined
[ ] Step 6: Dry-run test plan defined
[ ] Step 7: Small batch test plan defined
[ ] Step 8: Data integrity plan defined
[ ] Step 9: User approved
```

---

## Purpose

Merge 06a/06b/06c outputs, chunk by phase, generate embeddings, store in Supabase.

| | |
|---|---|
| **Inputs** | data/06a.structure/, data/06b.content/, data/06c.outcomes/ |
| **Output** | Supabase embeddings table |
| **Quality Target** | 100% data integrity |

---

## Migration from 10.ingest.ts (Plan)

### Path Changes
| Old | New |
|-----|-----|
| Input: data/09.enrich/ | data/06a + 06b + 06c |
| Script: 10.ingest.ts | 07.ingest.ts |

### Code Changes Required (Plan)
1. Update INPUT_ROOT to read 06a/06b/06c.
2. Implement merge logic by interaction_id.
3. Update metadata extraction to match split schemas.
4. Add pre-insert validation.

---

## Merge Strategy (Plan)

### Join Keys
- video_id + conversation_id + interaction_id

### Required Joins
- Each interaction must exist in all three outputs.
- Missing data => hard fail before ingestion.

### Merge Output (In-Memory)
- Combine structure + content + outcome into unified interaction object.
- Pass unified object to chunking + embedding pipeline.

---

## Lineage Metadata (Plan)

Each embedding record must include:
- pipeline_version
- prompt_version(s)
- model_version(s)
- schema_version(s)
- taxonomy_version
- source_file + interaction_id

---

## Chunking Strategy (Plan)

### By Phase
Each interaction phase becomes a separate chunk:
- opener, attraction, connection, close

### Chunk Content
- Turns within phase
- Techniques + topics within phase
- Outcome + quality summary

---

## Validation Before Insert (Plan)

### Required Checks
1. All interactions present in 06a/06b/06c.
2. Content not empty (min 10 chars).
3. Embedding dimension correct (1536 if OpenAI).
4. Required metadata present (including lineage fields).
5. No duplicate chunks.

### On Failure
- Stop the ingest.
- Log which interaction failed and why.

---

## Testing Plan

### Dry-Run
- Identify files to ingest.
- Build merged interactions.
- Validate without DB writes.

### Small Batch
- Ingest 3 files.
- Verify chunk counts and metadata.

### Integrity Check
- Compare interactions vs chunks (expected ~4 chunks per interaction).

---

## Validation Report (Plan)

```markdown
## Phase 4 Validation Report

### Merge Health
- Interactions merged: X
- Missing joins: X

### Validation
- Records validated: X/X
- Duplicate chunks: 0

### Test Ingest
- Files: 3
- Chunks created: X
- Spot-check: correct

### User Task
Verify 3 records in Supabase.
Reply: APPROVED or list issues.
```

---

## Exit Criteria

Before proceeding to Phase 5:
- [ ] Merge strategy defined
- [ ] Lineage metadata plan defined
- [ ] Validation plan defined
- [ ] Test plans defined
- [ ] User has approved Phase 4 plan
