# Pipeline Iteration History (D0–D14b)

> Extracted from `pipeline_validation_runbook.md` to reduce agent context consumption.
> This is a reference file — the runbook is the operational source of truth.
> Last updated: 2026-02-15

#### Iterative V2 Queue (AI-Implementable)

##### Iterations D0–D6 (All Complete)

| Iter | What | Key Outcome |
|------|------|-------------|
| D0 | Baseline lock + metric harness | Reproducible baseline snapshot for P018.3 + P018.4 |
| D1 | `06d.DET.sanitize` (flag-only) | Teaser duplicate + mixed-mode detection; `sanitize.report.json` |
| D2 | Stage 07 evidence allowlist | Hard-filter to `stage07_evidence_segment_ids`; zero evidence leaks on P018.3/P018.4 |
| D3 | Collapsed-speaker target hygiene | `target_speaker_ids_confident` in 06d; hook/investment gating in 07; collapsed speakers excluded |
| D4 | Mixed-mode splitter | Deterministic split at commentary boundary; synthetic child excluded from evidence |
| D5 | `06e.LLM.reverify` wrapper | Reverify on sanitized output; `--timeout-seconds` support; no REJECT on P018.3/P018.4 |
| D6 | Taxonomy precision | Commentary-only concepts non-blocking in Stage 08; no FAIL on P018.3/P018.4 |

##### Iterations D7–D11 (All Complete)

| Iter | What | Key Outcome |
|------|------|-------------|
| D7 | `06f.DET.damage-map` | Per-segment damage records + conversation summaries; trace contract enforcement in validator |
| D8 | `06g.LLM.damage-adjudicator` | Targeted LLM adjudication on risky seeds; strict JSON schema; determinism replay mode |
| D9 | `06h.DET.confidence-propagation` | Merges 06f+06g into per-segment confidence tiers; anchor allowlist metadata for Stage 07 |
| D10 | Confidence-aware 07/09/10 | High-confidence anchors only in Stage 07; chunk confidence scoring in 09; dual-lane ingest in 10 |
| D11 | Recurrence prevention rails | Hard budgets (`--max-damaged-token-ratio`, `--max-dropped-anchor-ratio`), drift histograms, audit sampling, fail-fast timeout/retry on all LLM stages |

Remaining across D7–D11:
- D7: expand deterministic seed coverage as upstream damage signals are formalized.
- D8: run full live-LLM determinism checks (`n=2`) on P018.3+P018.4 and calibrate thresholds.
- D9: tune `conversation_block_threshold` on larger hardening batches.
- D10: run retrieval regression eval after full D7-D11 path runs.
- D11: run 100+ video hardening batch and lock production thresholds.

Environment note: `09.EXT.chunk-embed.ts` requires local Ollama (`http://localhost:11434`).

##### Iteration D12: High-Confidence Transcript Artifact Repair (Complete)

Stage 07 now outputs optional `repair_text`/`repair_confidence` per artifact. Repairs accepted at `>=0.90` confidence; repaired artifacts downgraded to `info` severity. Pipeline v1.10, prompt v1.6.0.
Key result: `tyI2OZCVhT8` seg 41 repaired (conf=0.92), warnings 2→1. `validate_manifest.py` supports `--reverify-root`.

##### Iteration D13: Video-Type Routing + Multi-Call Chunked Enrichment (Complete)

###### D13a: Video-Type Routing (Complete)

Routing is deterministic: `conversation_id > 0` segments → infield lane, else non-infield.
`--force-lane infield|non_infield` CLI override available. Pipeline v1.11.
Verified: CANARY.1 routes 4 infield + 3 non-infield correctly.

###### D13b: Multi-Call Conversation-Aware Windowing (Infield Lane)

Problem:
- Stage 07 makes a single LLM call per video regardless of segment count.
- On large videos (300+ segments), the LLM runs out of attention budget. Artifact detection is non-deterministic: run 1 flags segs 98+276, run 2 flags segs 98+171, missing 276 entirely.
- This is not a prompt problem — it's a capacity problem. One pass over 326 segments cannot reliably catch every artifact, and no amount of deterministic pre-screening will fix this at 1500 videos.

Decision lock (from conversation analysis, 2026-02-15):
- **Conversation-aware windowing is the primary strategy** (not fixed-size). Decided because:
  - 38/48 conversations are contiguous (no commentary interruptions).
  - Most conversations are under 100 segments (cluster at 48-98).
  - Only 6 conversations exceed 100 segments (max 180). These need at most 2 windows.
  - Keeping conversations whole produces cleaner enrichment than splitting mid-conversation.
- **No cost-tolerance tracking**. Not a requirement.

Architecture:
```
Infield video (N segments)
  → walk conversations chronologically (with interleaved commentary)
  → pack into windows of ~100 core segments:
      - keep conversations intact when they fit
      - group small adjacent conversations + surrounding commentary into one window
      - if a single conversation exceeds window_size:
          split at largest commentary gap within it,
          or at midpoint if no gap
  → for each window:
      context_before = ~20 segments from previous window  (read-only)
      core           = window segments                     (extract from these)
      context_after  = ~20 segments from next window       (read-only)
      → LLM call with all three sections clearly labeled
  → merge pass: combine enrichments, deduplicate, resolve window-boundary conflicts
```

Windowing rules:
1. Each window targets ~100 core segments (tunable via `--window-size`).
2. A conversation that fits within remaining window budget is added whole (with its surrounding commentary).
3. Commentary blocks between conversations travel with the conversation they precede (or the last conversation if trailing).
4. If a conversation exceeds `window_size`, split at the largest commentary gap. If no gap, split at midpoint. Each half becomes a separate window.
5. Overlap context: ~20 segments (`--overlap`), marked `CONTEXT ONLY — do not extract from these`.
6. Small video bypass: videos with total segments < `window_size + overlap` use a single call.

Merge strategy:
- When two windows both flag the same segment or extract the same technique, deduplicate.
- When they conflict (different role for same segment), prefer the window where the segment is in the core range (not overlap).
- Commentary enrichments from the window that contains the commentary as core segments win.

What stays vs what could be simplified after this:
- **Keep**: 06, 06b, 06c, 06e (verify/patch/reverify chain — genuine peer review, not heuristics)
- **Keep**: 06d (sanitize — teaser dedup and evidence allowlist are simple, reliable data ops)
- **Evaluate after D13**: 06f/06g/06h (DET.damage-map/LLM.damage-adjudicator/DET.confidence-propagation). If multi-call Stage 07 catches artifacts reliably and assigns confidence directly, the damage pipeline may become redundant. Don't remove yet — run both in parallel on P018.3/P018.4 and compare coverage.

Pass criteria:
- Same video run twice with multi-call produces consistent artifact detection (>= 90% overlap in flagged segments).
- Artifact count on `1ok1oovp0K0` is >= what any single previous run found (no regressions from narrower windows).
- Enrichment quality (techniques, topics, phases) is non-regressing vs single-call baseline.

Test plan:
1. Implement with `--window-size 100 --overlap 20` defaults.
2. Run on `P018.4` (`1ok1oovp0K0`, 326 segments → ~4 windows) twice. Compare artifact lists.
3. Run on `P018.3` (3 videos, 85-125 segments each — should mostly single-call). Confirm no regressions.
4. Compare enrichment output diff against current single-call baseline.

Implementation status (`2026-02-15`):
- implemented:
  - `build_chronological_items()`: extracts chronological content item building into reusable function.
  - `build_windows()`: conversation-aware windowing with recursive split for oversized conversations.
    - Small video bypass (total <= window_size + overlap → single call, identical to current behavior).
    - Commentary blocks travel with the conversation they precede.
    - Recursive split at midpoint for conversations exceeding window_size (handles any conversation size).
    - Overlap context between adjacent windows (configurable via `--overlap`).
  - `build_windowed_infield_prompt()`: per-window prompt with CONTEXT BEFORE/CORE CONTENT/CONTEXT AFTER sections.
    - Core content uses existing ANCHOR_OK/CONTEXT_ONLY/EVIDENCE_EXCLUDED markers.
    - Context sections are read-only (no extraction).
  - `merge_windowed_results()`: combines per-window enrichments.
    - Approach enrichments: group by conversation_id, merge techniques/topics/phases, deduplicate.
    - Commentary enrichments: core version wins over overlap version.
    - Transcript artifacts + low quality segments: union, deduplicate by segment.
  - Multi-window path in `process_video_file()`:
    - All windows must succeed or entire video fails (no partial enrichments).
    - Post-processing (normalization, evidence allowlist, phase confidence) runs once on merged result.
  - Windowing metadata in output: `metadata.windowing` with per-window stats.
  - CLI: `--window-size` (default 100), `--overlap` (default 20).
  - Pipeline version bumped to `07.content-v1.13`, prompt version to `1.7.0`.
- verified:
  - `python3 -m py_compile scripts/training-data/07.LLM.content` passes.
  - `npm test` passes (1078 tests).
  - CLI `--help` shows new flags.
- bugs fixed during live validation: trailing-commentary grouping, block_index merge collisions, commentary block boundary preservation.
- live validation results (`2026-02-15`):
  - Baseline: single-call v1.10. Windowed: multi-call v1.13. Snapshot in `data/validation/drift/D13b.single-call-baseline.json`.
  - Aggregate (all 4 P018.3+P018.4 videos): enrichments 27→28, techniques 20→33, topics 61→65, **artifacts 0→12, low-quality 0→20**.
  - `1ok1oovp0K0` (326 segs, 4 windows): headline win — artifact detection went from 0 to 14 flagged segments.
  - Small videos (<120 segs): single-call bypass, no regression. Prompt v1.7.0 improvements independent of windowing.
  - Determinism (2 passes on 1ok1oovp0K0): enrichment structure 100% stable, flagged segment overlap 73% (LLM non-determinism, acceptable).
  - Schema note: windowed prompt uses `techniques`/`topics` field names; legacy uses `techniques_used`/`topics_discussed`. Consumers must check both until unified.
  - Pipeline version: `07.content-v1.13`, prompt version: `1.7.0`. Validation: P018.4 PASS, P018.3 PASS.

###### D13c: Post-Stage-06 Manifest Split + Non-Infield Lane

Decision (locked):
- After Stage 06 completes on a full manifest, split it into two sub-manifests:
  - **`<manifest>.infield.txt`**: videos with 1+ approach conversations → full pipeline (06b→...→10).
  - **`<manifest>.non_infield.txt`**: videos with 0 approach conversations → parked.
- **Infield videos are the priority.** They flow through the full hardening pipeline immediately.
- **Non-infield videos are processed separately, on demand**, through a simpler path:
  `06.LLM.video-type → 07.LLM.content → 08.DET.taxonomy-validation → 09.EXT.chunk-embed → 10.EXT.ingest`
  Stages 06b through 06h are skipped entirely (no conversations to verify/patch/sanitize/damage-map).
- The user decides when to run non-infield. They are never auto-processed.

Implementation:
- New script: `scripts/training-data/DET.split-manifest` (deterministic, no LLM).
  - Input: `--manifest <path>` + Stage 06 data root (default `data/06.LLM.video-type`).
  - For each video in manifest: load `.conversations.json`, count `conversation_id > 0` segments.
  - Output: two manifest files alongside the original:
    - `docs/pipeline/batches/<name>.infield.txt`
    - `docs/pipeline/batches/<name>.non_infield.txt`
  - Also print summary: `N infield, M non_infield` for operator awareness.
- Subsequent pipeline commands use the split manifests:
  - `./scripts/training-data/06b.LLM.verify --manifest docs/pipeline/batches/<name>.infield.txt`
  - (later, when desired) `./scripts/training-data/07.LLM.content --manifest docs/pipeline/batches/<name>.non_infield.txt --skip-verification`

Non-infield Stage 07 path:
- Uses existing `build_talking_head_prompt()` (topic sections, techniques discussed, transcript quality).
- No verification gate needed (`--skip-verification`): there are no 06b/06e artifacts to check.
- No evidence allowlists, no damage maps, no confidence propagation.
- Stage 07 `routing_lane=non_infield` in output metadata for downstream traceability.
- Stages 08/09/10 work unchanged on the enriched output.

Operator workflow:
```bash
# 1. Run Stage 06 on full manifest
./scripts/training-data/06.LLM.video-type --manifest docs/pipeline/batches/CANARY.1.txt

# 2. Split into infield + non-infield
./scripts/training-data/DET.split-manifest --manifest docs/pipeline/batches/CANARY.1.txt

# 3. Full pipeline on infield only
./scripts/training-data/06b.LLM.verify   --manifest docs/pipeline/batches/CANARY.1.infield.txt
./scripts/training-data/06c.DET.patch    --manifest docs/pipeline/batches/CANARY.1.infield.txt
# ... 06d → 06e → 06f → 06g → 06h → 07 → 08 → 09 → 10

# 4. Later, when desired: non-infield through simpler path
./scripts/training-data/07.LLM.content --manifest docs/pipeline/batches/CANARY.1.non_infield.txt --skip-verification
# ... 08 → 09 → 10
```

Implementation status: **Complete.** Split results: CANARY.1 (4/3), HOLDOUT.1 (3/4), HARDENING.1 (6/0).


## V2 Run Results (2026-02-15)

Successful V2 end-to-end run (`2026-02-15`, Claude Code session):
- `P018.3` (3 videos): **first complete V2 pipeline run**
  - environment: Claude CLI healthy (both opus and sonnet respond to preflight)
  - 06b.verify verdicts: `APPROVE=1` (`5gfclo7crNI`), `FLAG=1` (`tyI2OZCVhT8`), `REJECT=1` (`KURlBcRF6-M`)
  - 06c.patch:
    - `KURlBcRF6-M`: 1 fix applied (split conv 1 at seg 31 → conv 2), 5 flags not fixed
    - `tyI2OZCVhT8`: 2 fixes applied (seg 21 target→coach, seg 31 coach→target), 2 flags not fixed
    - `5gfclo7crNI`: 0 fixes (APPROVE, no changes needed)
  - 06d.sanitize: all 3 clean (0 teaser, 0 mixed-mode, 0 excluded)
  - 06e.reverify verdicts: `APPROVE=1` (`5gfclo7crNI`), `FLAG=2` (`tyI2OZCVhT8`, `KURlBcRF6-M`)
    - `KURlBcRF6-M` improved from REJECT → FLAG after patching
  - 06f.damage-map: 1 damaged segment total (`tyI2OZCVhT8`), all trace contracts PASS
  - 06g.damage-adjudicator: 1 seed adjudicated, 0 repairs accepted
  - 06h.confidence-propagation:
    - `KURlBcRF6-M`: high=109, medium=16, low=0, blocked_conversations=0
    - `tyI2OZCVhT8`: high=82, medium=0, low=1, blocked_conversations=0
    - `5gfclo7crNI`: high=85, medium=0, low=0, blocked_conversations=0
  - 07.content (reverify_patched gate, input from 06h):
    - 12 conversations enriched, all 3 videos pass validation
    - `5gfclo7crNI`: 0 errors, 0 warnings
    - `tyI2OZCVhT8`: 0 errors, 1 warning (transcript_artifact seg 41 — promo splice)
    - `KURlBcRF6-M`: 0 errors, 3 warnings (transcript_artifacts segs 9, 63, 116 — ASR hallucinations)
  - validate_manifest (reverify_patched, max_damaged_token_ratio=0.10, max_dropped_anchor_ratio=0.25):
    - gate: 3/3 allowed, 0 blocked, 0 policy violations
    - errors=1 (KURlBcRF6-M damaged_token_ratio 0.167 > 0.10), warnings=4
    - overall damaged_token_ratio=0.067, dropped_anchor_ratio=0.071
  - validate_stage_report readiness: READY=1 (`5gfclo7crNI`), REVIEW=1 (`tyI2OZCVhT8`), BLOCKED=1 (`KURlBcRF6-M`)
  - 08.taxonomy-validation: WARNING (non-blocking; high-freq commentary-only concepts only)
  - operational note (RESOLVED): `validate_manifest.py` now supports `--reverify-root data/06e.LLM.reverify` to read reverify artifacts from the V2 path directly. No copy workaround needed.
- `P018.4` (1 video): **complete V2 pipeline run** (`2026-02-15`)
  - Stage 06 generated fresh (sonnet, 300s timeout, 326 segments → infield, 1 conversation, 98 approach + 228 commentary)
  - 06b.verify verdict: `FLAG` (5 misattributions, 1 boundary issue, 2 other flags)
  - 06c.patch: 4 fixes applied (seg 1 coach→target, seg 241 coach→target, seg 102 target→coach, seg 296 target→other), 4 flags not fixed
  - 06d.sanitize: teaser=6 (segs 0-5), mixed_mode=0, excluded=6
  - 06e.reverify verdict: `FLAG` (not REJECT — passes gate)
  - 06f.damage-map: 7 damaged segments, trace contract PASS
  - 06g.damage-adjudicator: 7 seeds, 0 repairs accepted, 0 determinism mismatches
  - 06h.confidence-propagation: high=318, medium=2, low=6, blocked_conversations=0
  - 07.content (reverify_patched gate, input from 06h):
    - 16 enrichments (1 approach + 15 commentary), validation PASSED
    - 0 errors, 2 warnings (transcript_artifact segs 98, 276)
    - 6 normalization repairs, 2 evidence-allowlist drops
  - validate_manifest (reverify_patched, --reverify-root data/06e.LLM.reverify, max_damaged_token_ratio=0.10, max_dropped_anchor_ratio=0.25):
    - gate: 1/1 allowed, 0 blocked, 0 policy violations
    - errors=0, warnings=2
    - damaged_token_ratio=0.039, dropped_anchor_ratio=0.065 (both within budget)
  - validate_stage_report readiness: REVIEW=1 (`1ok1oovp0K0`, reason=transcript_artifact)
  - 08.taxonomy-validation: WARNING (non-blocking; `pacing_and_matching` 2x, `comfort_with_silence` 2x in approach; 9 commentary-only concepts)


##### Iteration D14: Artifact Severity Graduation + Chunk Cross-Referencing (NEXT)

**Priority: HIGH — artifact severity is implemented, chunk cross-referencing is the next build.**

###### D14a: Artifact Damage Severity (Implemented)

Problem:
- Stage 09 applies a flat ×0.75 chunk confidence penalty for ANY transcript artifact.
- A doubled word ("there's there's") gets the same penalty as genuine gibberish.
- Default masking removes ALL artifact segments from chunk text, including minor issues
  where the text is fully understandable. This makes retrieval worse, not better.

Changes (`2026-02-15`, pipeline v1.14, chunk confidence v2):
- Stage 07 now stamps `damage_severity` on each artifact based on `artifact_type`:
  - `nonsense` → `high` (genuine gibberish, unrecoverable)
  - `language_confusion` → `medium` (wrong language, partially understandable)
  - `word_repetition` → `low` (trivial stutter, fully understandable)
  - Unknown types default to `medium`.
- Stage 09 graduates chunk confidence penalty:
  - `high` → ×0.70 (was ×0.75 for everything)
  - `medium` → ×0.85
  - `low` → ×0.97 (near-zero penalty)
- Stage 09 masking now severity-gated: default only masks `high` severity artifacts.
  `--mask-all-transcript-artifacts` restores old behavior.
  `--no-mask-transcript-artifacts` still disables all masking.
- Stage 09 `CHUNK_CONFIDENCE_VERSION` bumped to 2.
- Stage 10 passes through `worstArtifactSeverity` metadata.
- `src/qa/retrieval.ts` unchanged — reads `chunkConfidence` float, graduated penalty flows through.

Impact on 1ok1oovp0K0 artifacts (example):
- seg 98 (`nonsense`, high) → masked from chunk, ×0.70 penalty. Correct — gibberish.
- seg 133 (`nonsense`, high) → masked, ×0.70. Correct — mishearing.
- seg 200 (`word_repetition`, low) → kept in chunk, ×0.97. Correct — run-on but readable.
- seg 264 (`word_repetition`, low) → kept in chunk, ×0.97. Correct — extra word, trivial.
- seg 299 (`word_repetition`, low) → kept in chunk, ×0.97. Correct — stutter.

Validation: re-run Stage 09 on P018.4, verify chunk confidence scores reflect graduated penalties.

###### D14b: Chunk Cross-Referencing (Commentary ↔ Conversation Linking)

Problem:
- Commentary chunks and approach conversation chunks are independent in the embedding DB.
- A coach's explanation of *why* a technique worked lives in a commentary chunk with no
  explicit link to the conversation chunk where the technique was actually used.
- Retrieval can surface one without the other. The system should know that if it pulls
  chunk X (approach) from a video, chunk Y (commentary about that approach) is highly
  relevant and should be surfaced together for stronger output.

Design:
- Stage 09 adds cross-reference metadata to chunks:
  - Approach chunks: `relatedCommentaryBlockIndices: [1, 2]` — which commentary blocks discuss this conversation
  - Commentary chunks: `relatedConversationId: N`, `blockIndex: N`
- Linking strategy: `buildCommentaryConversationLinks()` in Stage 09 uses segment ID proximity:
  - Commentary before all conversations → links to first conversation
  - Commentary after all conversations → links to last conversation
  - Commentary between two conversations → links to preceding (debrief heuristic)
  - Interleaved commentary (same conversation on both sides) → links to that conversation
  - No conversations in video → null
- Retrieval (`src/qa/retrieval.ts`): when a chunk is retrieved, co-retrieves cross-referenced chunks.
  - INTERACTION chunk → fetches commentary with matching `relatedConversationId`, appends as "Coach Commentary"
  - COMMENTARY chunk → fetches conversation chunks with matching `conversationId`, appends as "Related Conversation"
- Stage 10 passes through new metadata fields to DB (JSONB, no schema migration needed).
- `fetchCommentaryForConversation()` added to `src/db/embeddingsRepo.ts` using JSONB containment.

Pass criteria:
- For any retrieved approach chunk, the system can identify and co-retrieve the coach's
  commentary about that specific conversation.
- For any retrieved commentary chunk, the system can identify the conversation it discusses.
- Retrieval quality on coaching queries ("how do I handle X") improves when both the
  example and the explanation are returned together.

Implementation status (`2026-02-15`):
- implemented:
  - `buildCommentaryConversationLinks()` in Stage 09 — deterministic segment-proximity linking
  - New chunk metadata: `blockIndex`, `relatedConversationId` (commentary), `relatedCommentaryBlockIndices` (approach)
  - Stage 09 metadata assembly wires new fields into chunk output
  - Stage 10 metadata pass-through for all three new fields
  - `fetchCommentaryForConversation()` in `src/db/embeddingsRepo.ts` (JSONB containment query)
  - Commentary co-retrieval in `src/qa/retrieval.ts` after existing context stitching
  - Backward compatible: old chunks without new fields → no co-retrieval, no errors
- verified:
  - `npm test` passes (1082 tests)
  - `node --import tsx/esm scripts/training-data/09.EXT.chunk-embed.ts --help` exits clean
  - `node --import tsx/esm scripts/training-data/10.EXT.ingest.ts --help` exits clean
- remaining:
  - Re-run Stage 09 on P018.4 to verify chunk JSON includes new metadata fields
  - Re-run Stage 10 dry-run to verify pass-through
  - Full retrieval eval after ingest to measure co-retrieval quality impact

