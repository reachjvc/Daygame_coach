# Pipeline Learnings

Running log of discoveries, failures, and fixes found while processing batches through the pipeline. Read this before doing pipeline work.

## Philosophy

Quality output is the end goal. Every pipeline decision should be evaluated against: "does this produce better training data?" Not speed, not coverage — quality. When uncertain, ask the user. Getting 50 perfect videos is worth more than 500 mediocre ones.

---

## QUALITY-TEST.1 Final Results (2026-06-06)

**20/100 fully through pipeline (stages 02→09).** Quality verified good on those 20.

| Status | Count |
|---|---|
| Full pipeline complete (09) | 20 |
| Real quarantine (quality gates) | 67 |
| Rate limit stuck | 5 |
| Stage 06 timeout | 5 |
| Stage 02 reject | 3 |

### Quality assessment (6-video deep dive on passed videos)
- Technique extraction is **real, not hallucinated** — every technique spot-checked had direct transcript support
- Speaker attribution correct across all checked videos
- 07b verification catches real problems (mislabeled techniques, hallucinated claims)
- Confidence tiers trustworthy
- Main weakness: **taxonomy gaps** — 31 techniques not enough, concepts like "misinterpretation" shoehorned into "cold_read"

### Quarantine breakdown (67 videos)
- 16 severe 06b FLAGs (real speaker/boundary quality issues)
- 6 speaker collapse overload (infield diarization failures, ≥50 affected segments)
- 6 06b contract preflight failures
- 6 06f damage overload (too many low-quality segments)
- 33 other quality gate failures across stages

### Key bottlenecks
1. **23% pass rate** — quality gates are strict but correct. Most quarantines are real.
2. **Infield = hardest.** Speaker collapse (pyannote lumps coach+target) triggers quarantine at 06 gate (≥50 collapsed segments). Per-segment overrides work but collapse count alone triggers block.
3. **Rate limit is the operational bottleneck.** Use `--parallel 3` not 10. Clean fake fail-closed outputs + quarantine file between retries.

---

## Key Gotchas (read before any pipeline work)

- `find -print0 | while read` + stdin-consuming tools (ffmpeg, grep) = path corruption. Always `</dev/null` on inner tool.
- YouTube IDs starting with `-` break `grep -q "$id"` — use `grep -F -- "$id"` or awk.
- **clean16k gap**: stages 03-05 need `*.audio.asr.clean16k.wav`, nothing creates it. Copy raw16k → clean16k for new videos.
- **Stage 06 timeout**: bumped `TIMEOUT_SECONDS_PER_SEGMENT` from 1.2→2.0 in 06/06b/06e. Infield needs 2-3x more than talking_head.
- **Use pipeline-runner**, not individual scripts. `--parallel N --from <stage>`. Handles retry, gating, resume.
- **Rate limit → fake REJECT.** 06b/06e fail-closed writes REJECT with `other_flags: ["fail_closed:llm_call_error"]`. Fix: delete bogus outputs (grep `fail_closed` in other_flags) + delete `data/validation/quarantine/<batch>.json` before retry.
- **Quarantine persists across runs.** Must delete quarantine file when retrying after rate limit recovery.
- **AVN Expo compilation**: 32 conversations tripped validation. Correctly rejected — it's a compilation.

### Stage timing (100 videos, RTX 4060)
| Stage | Time | Notes |
|---|---|---|
| 02 Transcribe | 110 min | GPU, 66s/video |
| 03 Align | 11 min | GPU |
| 04 Diarize | 45 min | GPU |
| 05 Audio-features | 152 min | CPU-heavy |
| 06-06h | ~8h total | LLM stages, use --parallel 3 |
| 07-07b | ~2h | LLM, parallel |
| 08-09 | <5 min | DET + embed |
| 10 Ingest | <1 min | Supabase insert |

---

## Stage-Elimination Investigation (2026-06-06) — grounded in code

Question: can 06b / 06e / 06g / stage 05 be cut given 23% pass + rate-limit pressure? Verified by reading scripts, not headers.

### Stage 05 (audio-features, 152 min CPU) — ELIMINABLE. Biggest safe win.
- **Zero downstream consumers of acoustic fields.** 06 reads only `pyannote_speaker`, `text`, `start`, `end` from `*.audio_features.json` (06.LLM.video-type ~L172-227, L1804). No stage reads pitch/energy/tempo/spectral/brightness. Prompts (06 L599-814, 07 `_format_segments_for_prompt`) interpolate ZERO acoustic numbers.
- `speaker_embedding` (256-dim) = dead code, never read (disabled by default in 05 anyway, L127-131). Header claim "used in 06 for tone classification" is **stale fiction**.
- The fields 06 needs (`pyannote_speaker/text/start/end`) all originate in **stage 04 (diarize)**. 05 just carries them + appends unused features.
- **Action:** replace 05's feature extraction with a cheap copy/rename of 04 output (or retarget 06 to read 04 directly). Eliminates 152 min/100-video CPU. No output changes.

### 06b (verify, 1 LLM call/video) — KEEP. Hard gate + dependency.
- `pipeline-runner.evaluate_06b_gate` (L695-739) blocks on `verdict==REJECT` (L711) + FLAG thresholds (misattribution≥5, conv≥4, boundary≥2, missing-target≥2, major-other≥1, transcript≤55).
- 06c.DET.patch (L5) auto-applies 06b's high-confidence fixes → removing 06b breaks 06c.
- Unique check: role coherence, conversation boundaries, video-type correctness, collapse-override validity. NOT redundant with 06e (orthogonal: structure vs ASR-quality).
- Drives ~22/67 quarantines (16 severe FLAG + 6 contract-preflight). Cheapest gate per value.

### 06e (quality-check) — BEST LLM-COST CUT TARGET.
- **Most expensive gate stage:** windowed `1 + ceil(segments/90)` ≈ 3-6 LLM calls/video (06e L64-65).
- Weak gating: no verdict. Only secondary use — 06h reads `low_quality_count` for a quality-overload gate (~6 quarantines) + `apply_06e_repairs.py` (optional auto-repair, conf≥0.85).
- **Action:** either cut entirely (lose transcript auto-repairs + LQ-overload guard) OR widen window 90→150 to ~halve calls. Lowest gating-value-per-LLM-call of all stages.

### 06g (damage-adjudicator) — HIGH-COST/LOW-YIELD. Simplify or skip.
- **Infield-only** (skipped w/ sentinel for non-infield, L982-1023). 1 call per seed-batch (batch=8) ≈ 2-5 calls/infield video.
- Feeds 06h: repair suggestions + nuanced transcript/speaker/phase confidence (averaged into base, L976-1003).
- Partially replaceable by deterministic fallback from 06f seed severity (0.72-0.99) — loses LLM repairs, would pass ~60% seeds at low confidence → 07 anchor gate filters most.
- Since infield is the lowest-yield category (speaker-collapse mostly quarantines it anyway), 06g is high-cost/low-return. Candidate: deterministic fallback, or skip when 06h gate likely to block.

### LLM calls/video inventory (grounded)
| Stage | LLM calls/video | Gate? | Verdict |
|---|---|---|---|
| 06 video-type | 1 | yes (routing+collapse) | keep |
| 06b verify | 1 | yes (REJECT/FLAG) | keep |
| 06e quality-check | 3-6 (windowed) | weak (06h overload) | **cut/widen** |
| 06g adjudicator | 2-5 (infield only) | indirect (06h conf) | **simplify/skip** |
| 07 content | 2-5 (windowed) | produces output | keep |
| 07b enrich-verify | 1 | yes | keep |
| 06c/06d/06f/06h/08 | 0 (DET) | — | keep |
Typical infield video ≈ 10-19 LLM calls. Cutting 06e + simplifying 06g removes the bulk of non-output LLM pressure.

### Priority order
1. **Stage 05 → passthrough** (152 min CPU, zero risk, no LLM).
2. **06e → cut or widen window** (biggest LLM-call reduction).
3. **06g → deterministic fallback or skip** (infield-only, low yield).
4. Keep 06/06b/07/07b (1 call each, all gate or produce the actual output).
- 23% pass: strictness mostly correct (deep-dive confirmed quarantines real). Only tunable for recovering usable content = infield speaker-collapse threshold (≥50, a 06 gate), not these stages.

---

## Handover Notes (2026-06-06)

### Current state
- **Background process running**: `QUALITY-TEST.1.remaining` — 77 videos through 06→09 with `--parallel 2`. PID `1679305`. Check `data/QUALITY-TEST.1.remaining3.log`. **User wants it stopped after the next few complete.** Kill with `kill 1679305`.
- **19 videos ingested** into `embeddings_test` table (571 chunks, 768-dim). Isolated from production `embeddings` table.
- Test repo: `src/db/embeddingsTestRepo.ts` — mirrors `embeddingsRepo.ts` but targets `embeddings_test` + `match_embeddings_test` RPC.
- Ingest script: `scripts/training-data/10.EXT.ingest-test.ts`

### What to do when background run finishes
1. Check `data/QUALITY-TEST.1.remaining3.log` for Pipeline Summary
2. Count new videos with stage 09 chunks (currently 19, should grow)
3. Clean fake fail-closed outputs if rate limit hit again (see Key Gotchas above)
4. Ingest any new completions: `npx tsx scripts/training-data/10.EXT.ingest-test.ts --manifest docs/pipeline/batches/QUALITY-TEST.1.07b-passed.txt`
5. Update the 07b-passed manifest first to include new passes

### Next mission: pipeline optimization
User wants to evaluate whether pipeline stages can be **eliminated or simplified**. Key questions:
1. **Do all stages add value?** 06c (patch) + 06d (sanitize) + 06f (damage-map) are DET stages that take <5s total — low cost. But 06b (verify), 06e (quality-check), 06g (damage-adjudicator) are LLM stages costing ~$0.50-2.00 per video each. Are they all necessary?
2. **23% pass rate is too low.** 67/100 quarantined. Is the pipeline too strict or is the input quality genuinely bad? Investigate quarantine reasons — are gates blocking usable content?
3. **Infield videos almost all fail** due to speaker collapse (≥50 affected segments). The per-segment overrides work well but the collapse COUNT triggers quarantine. Could the threshold be raised for infield since collapse is expected?
4. **Rate limit is the #1 operational cost.** Each video needs ~6 LLM calls (06, 06b, 06e, 06g, 07, 07b). Can any be merged or eliminated?
5. **Stage 05 (audio-features) takes 152 min** — is it used downstream? Check if 06/07 actually read audio features. If not, it's 2.5 hours of wasted compute.

### Architecture reference
- Pipeline scripts: `scripts/training-data/02.EXT.transcribe` through `10.EXT.ingest.ts`
- Pipeline runner: `scripts/training-data/batch/pipeline-runner` (orchestrator, `--parallel N --from X --to Y`)
- Prompts: `scripts/training-data/prompts/`
- Schemas: `scripts/training-data/schemas/`
- Batch manifests: `docs/pipeline/batches/QUALITY-TEST.1*.txt`
- Data: `data/<stage>/<producer>/<video>/`

### Files modified during this session
- `scripts/training-data/06.LLM.video-type` — TIMEOUT_SECONDS_PER_SEGMENT 1.2→2.0
- `scripts/training-data/06b.LLM.verify` — same timeout fix
- `scripts/training-data/06e.LLM.quality-check` — same timeout fix
- `docs/pipeline/sources.txt` — disabled channel URLs (daily_evolution, social_stoic)
- `scripts/training-data/repair-missing-wavs.sh` — created for WAV repair
- `scripts/training-data/dedup-cross-producer.sh` — created for dedup
- `src/db/embeddingsTestRepo.ts` — test embeddings repo
- `scripts/training-data/10.EXT.ingest-test.ts` — test ingest script
- `supabase/migrations/20260606_create_embeddings_test_table.sql` — test table migration (applied)
