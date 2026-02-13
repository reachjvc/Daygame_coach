# Pipeline Validation Plans: Merge & Optimization Analysis

**Date:** 2026-02-07
**Purpose:** Critical comparison of Claude vs Codex validation plans, recommendations for merge

---

## Executive Summary (Codex Review of Claude Merge Notes)

| Dimension | Claude | Codex | Winner |
|-----------|--------|-------|--------|
| Qualitative analysis | Deep (5 FLAG videos, root causes) | Targeted (contract gaps + cross-stage mismatches) | Claude |
| Deterministic contracts | Weak | Strong (schemas, reason codes) | Codex |
| Prompt improvements | Specific text proposals | Abstract backlog | Claude |
| RAG-ready rubric | Binary, blocking-focused | Tiered, actionable | Codex |
| Output layout analysis | Absent | Comprehensive | Codex |
| Stage 09/10 idempotency | Not addressed | Stable key proposal | Codex |
| Test video selection | Concrete with video IDs | Abstract criteria | Claude |
| Implementation roadmap | Flat checklist | Prioritized P0/P1/P2 | Codex |
| Schema proposals | None | 3 JSON schemas drafted | Codex |

**Verdict:** Both plans are complementary. Claude provides ground-truth qualitative insights; Codex provides contract infrastructure and scale safety. Neither alone is sufficient.

---

## 1) Critical Analysis: Claude's Plan

### Strengths

1. **Deep FLAG analysis** (Section 11.1.1)
   - 5 videos analyzed in detail with specific segment IDs
   - Root causes identified: video type confusion, opener misattribution, diarization blending
   - Quantified: 40% FLAG rate vs 8% target

2. **Specific prompt improvements** (Section 9.5-9.6)
   - Proposed exact prompt text for video type decision rules
   - Opener attribution fix: "opener speaker = coach regardless of speaker_id"
   - Fragment conversation rule: ">=10s with coach+target"
   - Complexity/effort estimates per fix

3. **Confidence threshold calibration** (Section 10)
   - Observed FP/FN rates per threshold
   - Data-driven recommendations to lower thresholds by 0.10
   - Secondary validation rule proposals

4. **Source-level FLAG analysis** (Section 11.2)
   - Identified 100% FLAG rate on infield sources vs 0% on podcast/talking_head
   - Localized problem: pipeline works for non-infield content

### Weaknesses

1. **No deterministic contract infrastructure**
   - No stage report schema
   - No reason code enum
   - No machine-readable gating logic

2. **Binary RAG-ready rubric**
   - READY vs NOT-READY only
   - No middle tier for "good enough with warnings"
   - Overly strict: any 06b-derived issue blocks

3. **Output layout ignored**
   - No analysis of root-flat vs source-flat vs source-video
   - Cross-stage pairing assumed to work

4. **Stage 09/10 idempotency not addressed**
   - Title-derived sourceKey problem not identified
   - Orphan embedding risk not discussed

5. **Stage 07 gate policy too strict**
   - Only APPROVE proceeds = 45% of videos blocked
   - Doesn't leverage 06c patching to recover FLAG videos
   - Note: strict gating can be a valid production choice (quality/cost control), but the plan should specify how to run Stage 07 in evaluation mode (to measure whether patched FLAG videos are salvageable) without rewriting gating logic ad-hoc.

---

## 2) Critical Analysis: Codex's Plan

### Strengths

1. **Schema-first contracts**
   - Stage report schema (Appendix B)
   - Verification schema v2 (Appendix C)
   - Enriched output schema draft (Appendix D)
   - Chunks output schema draft (Appendix E)

2. **"No silent pass" enforcement**
   - Reason code enum with 16 specific codes
   - Evidence bundle contract per stage
   - Partial write detection

3. **Tiered RAG-ready labels**
   - RAG_READY / RAG_READY_WITH_WARNINGS / NOT_READY
   - Deterministic computation from reports
   - Warning policy explicitly defined

4. **Output layout analysis**
   - Identified 3 layout modes causing pairing failures
   - Proposed canonical layout (source-video)
   - Migration strategy with backwards compatibility

5. **Stage 07 gate policy proposal**
   - Block REJECT only; allow FLAG after patching
   - More videos proceed to enrichment
   - Explicit waiver mechanism for exceptions

6. **Stable idempotency keys**
   - sourceKey = `<channel>/<video_id>.txt`
   - Prevents orphan embeddings on title changes
   - video_id as primary key, titles as display-only

7. **Inter-stage semantic drift**
   - Identified Stage 07 → 09 segment ID contract bug
   - turn_phases[].segment is global ID but Stage 09 treats as local index
   - Root cause of phases becoming "unknown"

8. **Collapsed speaker contract**
   - speaker_labels.*.role may be "collapsed"
   - segments[].speaker_role must never be "collapsed"
   - Explicit override audit trail requirements

9. **Prioritized implementation roadmap**
   - P0: correctness/scale blockers
   - P1: observability/RAG-ready computation
   - P2: regression harness/drift detection

### Weaknesses

1. **Abstract prompt improvements**
   - Lists what to fix but not how
   - No specific prompt text proposals
   - No effort estimates

2. **Limited FLAG video analysis**
   - References Claude's analysis rather than doing own
   - No new video-level insights

3. **Confidence thresholds not calibrated**
   - Proposes data-driven calibration but doesn't do it
   - No observed FP/FN rates

4. **Test videos not selected**
   - Criteria listed but no specific video IDs
   - Manifest format clarification helpful but incomplete

5. **Some baseline values are explicitly “snapshot/illustrative”**
   - This is correct discipline, but it means Claude’s measured rates and Codex’s suggested metrics must be reconciled into a single “baseline measurement protocol” section in the merged plan to avoid arguing from mismatched numbers.

---

## 3) Key Disagreements (Must Resolve)

### 3.1 Stage 07 Verification Gate Policy

| Approach | Claude | Codex |
|----------|--------|-------|
| Policy | Only APPROVE proceeds | Block REJECT only; FLAG allowed after patch |
| Impact | 45% videos blocked at 07 | More videos proceed |
| Risk | Under-enriched corpus | Lower-quality enrichments |

**Recommendation:** Adopt Codex's approach.
- 40% FLAG rate is too high to block
- 06c patching exists to repair FLAG issues
- Add re-verify option: run 06b on patched output if paranoid
- Use tiered RAG-ready to mark FLAG-derived videos

**Codex nuance:** treat this as a policy with modes:
- `production_strict`: APPROVE-only proceeds to 07 (max quality/cost control).
- `evaluation_permissive`: allow FLAG-through-after-patch (to measure salvage rate and identify systemic issues).

### 3.2 RAG-Ready Rubric

| Approach | Claude | Codex |
|----------|--------|-------|
| Tiers | 2 (READY / NOT-READY) | 3 (READY / WITH_WARNINGS / NOT_READY) |
| Strictness | High (blocks on 06b issues) | Moderate (allows warns, marks them) |

**Recommendation:** Adopt Codex's 3-tier system.
- Ingest more data faster
- Track quality debt explicitly
- Filter retrieval by tier if needed

### 3.3 "Mixed Speaker" Representation

Both agree: do not add `mixed` to conversations schema.

**Recommendation:** Adopt Codex's artifact flag approach.
- Encode as `other_flags[]` in 06b
- Do not auto-patch
- Quarantine or mark as warning

### 3.4 Output Layout

| Approach | Claude | Codex |
|----------|--------|-------|
| Analysis | None | Comprehensive |
| Recommendation | N/A | source-video for 01-07 |

**Recommendation:** Adopt Codex's layout analysis, but separate “make tools correct now” from “canonicalize layout later”.
- Decide a canonical layout (recommendation: source-video for 01-07) so stage reports and tooling have one “home” to target.
- Must-do immediately regardless: layout-agnostic discovery + pairing by `video_id`/stem (root-flat + source-flat + source-video) to support legacy artifacts during migration.

### 3.5 Stage 09/10 Idempotency

| Approach | Claude | Codex |
|----------|--------|-------|
| sourceKey | Not discussed | `<channel>/<video_id>.txt` |
| Risk mitigation | None | Prevents orphan embeddings |

**Recommendation:** Adopt Codex's stable key proposal.
- video_id is immutable
- Titles/stems are display-only
- Delete+replace works reliably

---

## 4) Merged Recommendations

### 4.1 Take from Codex (Infrastructure)

| Item | Section | Why |
|------|---------|-----|
| Stage report schema | Appendix B | Enables deterministic gating |
| Verification schema v2 | Appendix C | Fixes enum drift |
| Reason code enum | 7.2.1 | Machine-readable failures |
| Tiered RAG-ready | 7.3.1 | Actionable labeling |
| Quarantine + waivers | 7.2.2 | Auditable exceptions |
| Output layout rules | 2.2 | Fixes pairing |
| Stable sourceKey | 8.12 | Idempotent ingest |
| Collapsed speaker contract | 8.6 | Schema enforcement |
| P0/P1/P2 prioritization | 13 | Sequence work correctly |
| Stage 07 gate policy | 2.5.3 | `reverify_patched` for production runs (baseline `06b.verify` + `06b.reverify` gate), with `allow_flag` as explicit override |

### 4.2 Take from Claude (Qualitative)

| Item | Section | Why |
|------|---------|-----|
| FLAG video analysis | 11.1.1 | Ground truth examples |
| Prompt text proposals | 9.5-9.6 | Actionable fixes |
| Video type decision rules | 9.5 | Specific prompt text |
| Opener attribution rule | 9.6 | Specific prompt text |
| Fragment conversation rule | 9.6 | Specific prompt text |
| Confidence calibration data | 10 | FP/FN observations |
| Test video selection | 11.1 | Specific video IDs |
| Source-level FLAG rates | 11.2 | Prioritization data |
| Error taxonomy frequencies | 4.2-4.3 | Root cause breakdown |
| Sharpness rubric | 9.2 | Quality dimensions |
| Complexity estimates | 9.4 | Effort planning |

### 4.3 New Items (Neither Has)

This section in the Claude draft over-stated “neither has”. Adjusted view:

| Item | Status Across Plans | Rationale |
|------|---------------------|-----------|
| Re-verify patched step (06b on 06c output) | Implemented (`scripts/training-data/06b.reverify`, wired in Stage 07/validator/orchestrator) | Enables strict production gating while preserving explicit override paths for iteration |
| Prompt version tracking | Already in Codex (explicit); implied in Claude | Required for drift attribution; needs a single versioning convention across 06/06b/07 |
| Token telemetry | Present in both (Codex detailed; Claude mentions) | Needed for cost control decisions and regression analysis |
| Batch stop conditions | Already in Codex | Prevents runaway bad batches; needs to be adopted in merged execution checklist |

### 4.4 Must-Merge Correctness Findings (Codex-Only, High Leverage)

These are “quiet correctness bugs” that can invalidate downstream evaluation if left unfixed.

| Finding | Why It Matters | Where To Fix (High Level) |
|---------|----------------|---------------------------|
| **Stage 07 → Stage 09 phase indexing drift** (07 writes global `segments[].id` into `turn_phases[].segment`; 09 consumes it as local index) | Silently degrades phases to `unknown`, hurting phase-based chunking and metadata prefixing even when stages appear “successful” | Update Stage 09 to map phases using global segment ids (or emit both global+local ids explicitly and consume the right one) |
| **06c.patch boundary fixes vs docstring** (boundary fixes are auto-applied today; `conversations[]` summary not recomputed) | Can produce semantically inconsistent outputs (segments’ `conversation_id` changed but top-level `conversations[]` stale), which corrupts enrichment/chunking | Either stop auto-applying boundary fixes or recompute `conversations[]` and run post-patch invariants |
| **Stage 07 transcript-quality indices are ambiguous** (some fields are not remapped from conversation-local indices to global ids) | Validation/evidence can point at the wrong segment, reducing trust and making fixes hard to localize | Include global `segments[].id` in prompt or extend remapping to all index-bearing fields |
| **Cross-stage validator discovery and semantics gaps** | Can report “0 pairs found” or mislabel video ids; can mis-evaluate coverage if it trusts `conversations[]` instead of `segments[]` | Make discovery layout-agnostic; treat `segments[]` as ground truth; add segment-id existence + conversation-id consistency checks |
| **`sub-batch-pipeline --view` layout assumptions** | Operator tooling can “miss” artifacts and cause false-negative audits | Make view discovery recursive and layout-aware for 06–07 stages |
| **“Dry run” modes that still write state/debug files** | Makes auditing/CI unsafe; creates confusing state even when user thinks they are not writing | Ensure `--dry-run` is truly no-write; redirect debug artifacts out of `scripts/` and under `data/<stage>/.../debug/` |
| **`batch_report.py` always writes to `data/batch_reports/*`** | Prevents truly read-only measurement/audits; violates “planning-only” expectation during review | Add `--no-write` / `--stdout-only` mode so baselines can be measured without artifact churn |

### 4.5 Merge Mechanics (Practical)

If the goal is a single “master plan” document that can be implemented without re-litigating fundamentals, use this merge procedure:

1. Use `docs/pipeline/audits/claude_pipeline_validation.md` as the narrative backbone (it already contains concrete examples, prompt text, and effort estimates).
2. Copy Codex’s “planning-only / safety” guardrails and make them the top-of-doc constraint block.
3. Replace Claude Section 7 (“Validation Strategy”) with Codex Section 7 content (evidence bundle contract + reason codes; quarantine + waivers; tiered RAG-ready computation).
4. In the stage-by-stage section, keep Claude’s table formatting but inject Codex’s stage-specific contract items (layout modes + pairing rules; 06b → 06c enum/schema alignment and “no mixed”; 06c post-patch validation + recompute `conversations[]` if boundary fixes remain auto-applied; 07 → 09 global segment-id contract).
5. Add Codex appendices (stage report schema, verification schema v2 drafts) as the “spec layer” so implementation can be unblocked without re-deriving schemas.
6. Consolidate Open Questions into one numbered list and resolve contradictions explicitly (Stage 08 gating scope + threshold; Stage 09/10 key stability + migration).
7. Keep Claude’s “FLAG video analysis” and “prompt text proposals” as the “evidence layer” (they justify why the specs and validators are needed; they seed threshold calibration and A/B prompt tests).

---

## 5) Merged Implementation Phases

### Phase P0: Correctness (Blocks Scale)

**From Codex:**
1. Decide canonical layout (recommendation: source-video for 01-07) and implement layout-agnostic discovery during migration
2. Upgrade verification.schema.json to v2 with strict enums
3. Add post-06c schema validation; block 07 on invalid patches
4. Fix cross-stage validator pair discovery across layout modes
5. Fix Stage 09 to consume global segment IDs from turn_phases

**From Claude:**
6. Apply video type decision rules to 06 prompt
7. Apply opener attribution fix to 06 prompt
8. Apply fragment conversation rule to 06 prompt

### Phase P1: Observability (RAG-Ready Computation)

**From Codex:**
1. Adopt stage_report.schema.json for all stages
2. Implement "no silent pass" enforcement
3. Compute tiered RAG-ready labels from reports
4. Adopt quarantine + waiver mechanism
5. Switch sourceKey to video_id-based stable key

**From Claude:**
6. Calibrate confidence thresholds on a larger labeled set (use Claude’s 5-video analysis as a seed, not the full calibration)
7. Add opener-phrase detection as secondary validation

### Phase P2: Regression (Drift Detection)

**From Codex:**
1. CI job running pipeline on small manifest
2. Batch drift comparisons with regression budgets
3. Prompt/schema versioning discipline

**From Claude:**
4. Track source-level FLAG rates per batch
5. Monitor video type distribution drift

---

## 6) Decisions Required

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | Stage 07 gate policy | APPROVE-only vs `allow_flag` vs `reverify_patched` | **Resolved:** `reverify_patched` for production-quality gating; `allow_flag` remains an explicit override |
| 2 | RAG-ready tiers | 2-tier vs 3-tier | 3-tier (Codex) |
| 3 | Canonical layout | source-flat vs source-video | source-video (Codex) |
| 4 | sourceKey format | title-based vs video_id-based | video_id-based (Codex) |
| 5 | Mixed speaker handling | new enum vs artifact flag | artifact flag (both agree) |
| 6 | Stage 08 gating scope | batch-wide vs per-video | **Open decision**. Recommendation: start with batch-scoped reporting + conservative gating, then evolve toward per-video quarantine to avoid “batch hostage” failures. |
| 7 | Re-verify patched | yes vs no | **Resolved:** yes (implemented as `06b.reverify` + `reverify_patched` policy) |

---

## 7) Which Plan is Best?

**Neither alone meets all objectives.**

| Objective | Better Plan |
|-----------|-------------|
| Evaluate quality at each stage | Claude (specific examples) |
| Localize where failures introduced | Claude (FLAG analysis) |
| Prevent silent passes | Codex (schemas, reason codes) |
| Confidently label RAG-ready | Codex (tiered, deterministic) |
| Propose improvements | Claude (specific prompt text) |
| Specify automated detection | Codex (validators, P0/P1/P2) |
| Reduce errors | Both (Claude: what; Codex: how) |
| Improve output sharpness | Claude (sharpness rubric) |

**Final verdict:**
- **Codex provides the foundation** (contracts, schemas, infrastructure)
- **Claude provides the content** (what to fix, specific examples, prompt text)
- **Merge both** following the recommendations above

---

## 8) Merged Quick Wins (Do First)

1. **Apply 06 prompt video type rules** (Claude 9.5) — 2h, fixes 30% of FLAGs
2. **Apply 06 opener attribution rule** (Claude 9.6) — 30m, fixes 15% of misattributions
3. **Apply 06 fragment conversation rule** (Claude 9.6) — 30m, fixes 10% of boundary issues
4. **Upgrade 06b schema to v2** (Codex Appendix C) — 3h, fixes schema drift
5. **Add post-06c schema validation** (Codex 8.8) — 2h, blocks invalid patches
6. **Do not blanket-lower thresholds yet** (Claude 10 + Codex 10)
   - Recommendation: implement post-06c validation first, then recalibrate using a larger labeled set.
   - If you want an immediate change, do it behind an opt-in flag and add secondary deterministic checks (opener-phrase detection, min-duration rules) as Claude suggests.
7. **Fix Stage 09 segment ID consumption** (Codex 8.12) — 2h, fixes phase labeling

**Total quick wins:** time estimates are plausible but speculative. Treat expected FLAG-rate reduction as a hypothesis until re-measured on R1/R2.

---

## 9) Merged Top Blockers

1. **40% FLAG rate** (Claude measured) — fixed by prompt improvements + looser gate policy
2. **Schema/enum contract drift** (Codex identified) — fixed by verification schema v2
3. **Output layout inconsistency** (Codex identified) — fixed by canonical layout + pairing by video_id
4. **Stage 07→09 semantic drift** (Codex identified) — fixed by segment ID contract alignment
5. **Title-based sourceKey instability** (Codex identified) — fixed by video_id-based key

---

## 10) Next Steps

1. User decides on 7 decisions in Section 6
2. Create merged implementation checklist from Section 5
3. Execute Phase P0 quick wins
4. Re-measure baseline after P0
5. Execute Phase P1
6. Execute Phase P2
