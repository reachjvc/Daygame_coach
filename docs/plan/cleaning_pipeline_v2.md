# Pipeline Cleanup Plan v2
**Status:** Executed
**Updated:** 07-02-2026

## Summary

Cleanup of `/docs/pipeline/` and `/scripts/training-data/` after completing first review round. Goal: remove cruft, fix broken references, tighten structure.

---

## Phase 1: Delete Obsolete Files

### 1.1 scripts/training-data/old/ (DELETE ENTIRE FOLDER)
Contains 6 deprecated stage scripts replaced by current pipeline:
- `05.tonality` → replaced by `05.audio-features`
- `06.speakers` → merged into `06.video-type`
- `07.LLM-conversations` → replaced by `06.video-type` + `07.content`
- `08.interactions` → logic moved to `09.chunk-embed`
- `09.enrich` → replaced by `07.content`
- `10.ingest.ts` → superseded by current `10.ingest.ts`

**Action:** `rm -rf scripts/training-data/old/`

### 1.2 Empty Directories (DELETE)
- `scripts/training-data/lib/` - empty, never used
- `scripts/training-data/DiariZen/` - empty, never used

**Action:** `rm -rf scripts/training-data/lib/ scripts/training-data/DiariZen/`

### 1.3 Test/Debug Artifacts (DELETE)
- `scripts/training-data/test/06b.verify-experimental` - experimental variant
- `scripts/training-data/sonnet-test-06.py` - dev testing script
- `scripts/training-data/test_intra_segment_detection.py` - dev testing script
- `scripts/training-data/debug_06b_failed_response.txt` - debug output

**Action:**
```bash
rm -rf scripts/training-data/test/
rm scripts/training-data/sonnet-test-06.py
rm scripts/training-data/test_intra_segment_detection.py
rm scripts/training-data/debug_06b_failed_response.txt
```

### 1.4 Stage Documentation (DELETE)
Stage docs were informational only, not canonical reference:
- `docs/pipeline/stages/STAGE_08_taxonomy_validation.md`
- `docs/pipeline/stages/STAGE_09_chunk_embed.md`
- `docs/pipeline/stages/STAGE_10_ingest.md`

**Action:** `rm -rf docs/pipeline/stages/`

---

## Phase 2: Deprecate final_pipeline

The `final_pipeline` script references non-existent `08.ingest.ts` and is superseded by `sub-batch-pipeline` + `batches`.

### 2.1 Update batch-create reference
File: [batch-create:275](scripts/training-data/batch-create#L275)

**Current:**
```python
print(f"Run with: ./scripts/training-data/final_pipeline --manifest {manifest_path.relative_to(root)} --skip-ingest")
```

**Change to:**
```python
print(f"Run with: ./scripts/training-data/sub-batch-pipeline {manifest_path.relative_to(root)}")
```

### 2.2 Delete final_pipeline
**Action:** `rm scripts/training-data/final_pipeline`

---

## Phase 3: Clean deprecated/ Folder

Located at repo root: `/deprecated/`

### 3.1 Contents
- `old-stages/08.ingest.ts.bak` - backup of old ingest script
- `old-stages/09.taxonomy-report.bak` - backup of old report script
- `archive/` - various archived content
- `old/` - more old content
- `todo_hallucination_safeguard.md` - old todo doc

### 3.2 Action
Review contents briefly, then consolidate or delete:
- Delete `old-stages/` entirely (git history preserves if needed)
- Assess if `archive/` and `old/` should remain or be deleted

**Recommended:** Ask user about archive/ and old/ subfolders during implementation.

---

## Phase 4: Cleanup Remaining Cruft in docs/pipeline/

### 4.1 Files to Review/Delete

| File | Status | Action |
|------|--------|--------|
| `06c-implementation-prompt.md` | Implementation complete | DELETE - served its purpose |
| `stage_verification.md` | Only stage 02 has content, 03-07 are placeholders | KEEP - stage 02 content still useful |
| `prompt_changelog.json` | "Human reference only" | DELETE - not read by scripts, adds no value |
| `audits/claude_audit.md` | Empty template | DELETE |
| `audits/AUDIT_TEMPLATE.md` | Template | KEEP if audits are ongoing |
| `audits/codex_audit.md` | Comprehensive audit | KEEP for reference |

### 4.2 stage_verification.md Cleanup
Remove placeholder sections (lines 188-215) that say "To be written after running...". Keep only Stage 02 verification which has real content.

---

## Phase 5: Documentation Updates

### 5.1 Update ASCII Diagram
Check if `docs/pipeline/ASCII` accurately reflects current 10-stage flow. Should show:
```
01 → 02 → 03 → 04 → 05 → 06 → 06b → 06c → 07 → 08 → 09 → 10
```

### 5.2 Update claude_automation.md
Remove any references to `final_pipeline`. Ensure it documents current workflow:
- `batch-create` → creates manifest
- `sub-batch-create` → splits into sub-batches
- `sub-batch-pipeline` → runs stages on sub-batch
- `batches` → orchestrates multiple batches

---

## Files Changed (Summary)

### DELETE
```
scripts/training-data/old/                      # 6 deprecated scripts
scripts/training-data/lib/                      # empty
scripts/training-data/DiariZen/                 # empty
scripts/training-data/test/                     # test artifacts
scripts/training-data/sonnet-test-06.py
scripts/training-data/test_intra_segment_detection.py
scripts/training-data/debug_06b_failed_response.txt
scripts/training-data/final_pipeline            # deprecated orchestrator
docs/pipeline/stages/                           # all stage docs
docs/pipeline/06c-implementation-prompt.md
docs/pipeline/prompt_changelog.json
docs/pipeline/audits/claude_audit.md
deprecated/old-stages/                          # backup files
```

### MODIFY
```
scripts/training-data/batch-create              # update suggested command
docs/pipeline/stage_verification.md             # remove placeholder sections
docs/pipeline/claude_automation.md              # remove final_pipeline refs
```

### KEEP (no changes)
```
docs/pipeline/batches/                          # all 178 batch files
docs/pipeline/ASCII
docs/pipeline/test_videos.txt
docs/pipeline/audits/codex_audit.md
docs/pipeline/audits/AUDIT_TEMPLATE.md
scripts/training-data/01-10.* stages            # all core scripts
scripts/training-data/batch-*, sub-batch-*      # batch tooling
scripts/training-data/pipeline_manifest.py
scripts/training-data/validate_cross_stage.py
scripts/training-data/verify-02
scripts/training-data/schemas/                  # all schemas
```

---

## Verification

After cleanup:
1. Run `ls scripts/training-data/` - confirm clean structure
2. Run `ls docs/pipeline/` - confirm clean structure
3. Run `./scripts/training-data/batch-create --help` - should work
4. Run `./scripts/training-data/sub-batch-pipeline --help` - should work
5. Run `npm test` - ensure no references broken in tests

---

## Questions to Confirm During Implementation

1. **deprecated/archive/** and **deprecated/old/** - delete or keep?
2. **audits/AUDIT_TEMPLATE.md** - keep for future audits or delete?
