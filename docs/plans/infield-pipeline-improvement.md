# Infield Pipeline Improvement Plan

Status: **Phase 1 DONE + applied (2026-06-18).** Phases 0/2/3/4 not started.
Batch under study: QUALITY-TEST.1 (100 videos). All numbers below re-derived from `data/` + scripts, not from prior summaries.

---

## PROGRESS LOG

### 2026-06-18 — Phase 1 verified done, re-applied to all stuck infield
Phase 1 gate fixes (1a–1e) are **fully implemented** in `pipeline-runner` + `02.EXT.transcribe`:
`_count_residual_misattributions` (1a), collapse residual gate on `unknown_count`/`reassignment_rate` (1c),
`STAGE06B_SHORT_CLIP_SEGMENT_FLOOR` (1d), `_trim_edge_artifacts` (1e); 1b folded into the 1a residual count.
Test: `tests/unit/pipeline/test_pipeline_runner_stage06_gate.py`.

**Recovery measured against the 15 quarantined infield: 11 already at stage 09** (4n7tesaFEdI, K8_TBjaiNUk,
yTWnGdzgz7w, h-wWMx5Ssac, TeZg-eAknDs, NhaqeRwLPJY, UmhMBv40HU8, X6VydswgnfY, -5We8Qvv2Cg, 68kUvx1TUdY, zWyau0QVSpA).

**This session — re-ran every still-stuck QT1 video through the fixed gates:**
- `-CZtcqqEDdk` (clean 06e stall, not quarantined) → resumed 06e→09, **PASS**.
- `8J_TuB6GwlI` (old low-transcript false-kill) → re-gate → **PASS** (525 high-tier segs).
- Re-gate re-quarantined 6 under the FIXED gates for GENUINE reasons (transcript score 40–52 non-short, or
  real severe FLAGs): clWClbCY9jI, tX9j5cLK63I, 0m3iRVM4FZk, A6dFLFMNK_I, _Am8ItTeNoQ, p8NGf6VWOfo. **Confirmed real.**
- `w4GAi9RhMYc` re-run from 06 → re-fails stage-06 validation deterministically (bad `audio_features.json`). Real.

**QT1 now 86/100 at stage 09.** Phase 1 recovery is exhausted. The remaining 14:
| Bucket | N | IDs |
|---|---|---|
| Stage-02 reject (audio 90–95% hallucination / 32s clip) — dead | 3 | PwvM7HhnUEA, nMHYVtW1V_8, wv-U9drRpAo |
| Pass collapse gate, fail 06h video-confidence <0.85 (Phase 2) | 4 | 9tcvr26JP10, fO1NVRiSy9s, grq-TNERVuA, oZjZU0kksK8 |
| Genuine 06b block under fixed gate (low transcript / severe FLAG) | 6 | clWClbCY9jI, tX9j5cLK63I, 0m3iRVM4FZk, A6dFLFMNK_I, _Am8ItTeNoQ, p8NGf6VWOfo |
| Stage-06 validation fail (deterministic) | 1 | w4GAi9RhMYc |

Further recovery needs **Phase 2 (diarization re-architecture)** — only path left, and per fail-closed discipline
it requires **Phase 0 (ground-truth eval set)** first so threshold/diarizer changes are measured, not guessed.

### 2026-06-18 (cont.) — Surgical 06h reassignment-credit fix (Area 1 extension)
Implemented: 06h now **credits a near-completely reassigned collapse** (reassignment_rate ≥ 0.95 AND
unknown_count ≤ 10 — same residual signals as the stage-06 collapse gate). For those, override segments get
`SPEAKER_OVERRIDE_FLOOR_TRUSTED_REASSIGN=0.92` + `SPEAKER_AMBIGUITY_MULT_INFIELD_TRUSTED_REASSIGN=0.95`
instead of 0.85/0.80. Files: `validation/confidence_model.py`, `06h.DET.confidence-propagation`. Tests added:
`test_06h_confidence.py::TestTrustedReassignment` (4 cases, pass). Fail-closed preserved: a poorly-reassigned
collapse gets NO boost.

**Effect (measured):** removes the over-harsh speaker-axis *proxy* penalty — grq-TNERVuA high-tier segs 29→124.
But it does **NOT** pass the 4 collapse cases (grq 0.76, fO1NVRiSy9s 0.83, oZjZU0kksK8 0.825, 9tcvr26JP10 0.77 <
0.85). **Why:** the residual drag is **06g's independent, content-based speaker_confidence** (median 0.65 over
294 segs — it judges whether each role label matches local dialogue context, told to be conservative). That is a
**real quality signal, not a proxy** — overriding it would be a §15 bypass of a quality decision. So the surgical
fix is correct and kept (improves confidence metadata on passing infield), but the 4 stay blocked legitimately.
**Moving them further = Phase 2 (better diarization → 06g genuinely more confident), NOT gutting 06g or dropping 0.85.**
QT1 unchanged at 86/100; recovery without Phase 2 is exhausted.

---

## PART A — HUMAN-FIRST

### The problem
Infield videos (live street pickups, 2+ speakers, noisy) are the weakest category. They mostly die at stages 06/06b. But the deep-dive shows **most of these deaths are gate artifacts, not genuinely bad data** — the transcripts read as coherent, correctly-transcribed dialogue that the gates kill on proxy counts (collapse count, raw flag count, brevity) instead of on actual residual quality.

### What I verified (corrected vs the brief)
- **18 infield videos** in the 100 (brief said ~16). Type from stage 06 `video_type.type`.
- **3 reached stage 09**, not 1: `kVNih9mOvsE` (0.95/score72), `EogjdB3msWA` (infield@0.70→talking_head@06h), `H-_FULmTJXc` (0.90/64). 15 quarantined.
- Gate histogram for the 15 quarantined infield:

  | Killing gate | N | Videos |
  |---|---|---|
  | `stage06_speaker_collapse_overload` | 5 | 4n7tesaFEdI, K8_TBjaiNUk, _Am8ItTeNoQ, grq-TNERVuA, tX9j5cLK63I |
  | `stage06b_flag_severe` | 4 | yTWnGdzgz7w, h-wWMx5Ssac, 9tcvr26JP10, TeZg-eAknDs |
  | `stage06b_flag_low_transcript_quality` | 3 | NhaqeRwLPJY, UmhMBv40HU8, X6VydswgnfY |
  | `stage07_validator_inputs_missing` | 1 | -5We8Qvv2Cg |
  | `stage06h_video_gate_block` | 1 | 68kUvx1TUdY |
  | `stage06e_execution_error` | 1 | zWyau0QVSpA |

### The headline finding
**At least 7 of the 15 quarantines (likely 9) are false kills the pipeline could recover with cheap, low-risk gate fixes — no diarizer change needed.** Diarization re-architecture is a separate, higher-effort track that recovers the genuinely-collapsed remainder.

Two confirmed gate bugs and one ordering bug, all grounded in code + data:

1. **06b counts no-op "misattributions" as damage.** `yTWnGdzgz7w` was killed on 6 misattributions — *all 6 are `coach→coach` no-ops* (suggested_role == current_role, conf 0.72–0.92). The very next stage, 06c.DET.patch, **explicitly skips no-ops** (`06c.DET.patch:431`). The gate is stricter and wronger than the patcher that runs 1 stage later.

2. **06b gate runs BEFORE 06c, killing videos 06c would auto-fix.** `pipeline-runner:1333` evaluates the 06b gate and `return`s on quarantine; 06c (which applies misattribution fixes at conf≥0.7, `06c.DET.patch:86`) only runs as the next loop iteration. For `h-wWMx5Ssac` (7 real swaps, conf 0.78–0.95), `9tcvr26JP10` (7 real swaps, conf 0.70–0.95), `TeZg-eAknDs` (18 fixes: 17 unknown→coach + 1 swap, conf 0.90–0.92), 06c would have applied every fix. They're killed for *having correctable labels*, not for residual damage.

3. **06 collapse gate counts affected segments, ignores whether reassignment worked.** `pipeline-runner:839` blocks when `total_segments_affected >= 50`. The collapse meta already carries `reassignment_rate` and `unknown_count` (`06.LLM.video-type:1748`) — the gate ignores both. `K8_TBjaiNUk`: 151 affected, **151 reassigned, 0 unknown, rate 1.0, score 72** → killed. `4n7tesaFEdI`: 53 affected, rate 0.962, 2 unknown, score 62 → killed. These are *successfully repaired*, blocked on raw count.

Plus two brevity/locality false-kills:
4. **Low-transcript-score cliff (≤55) penalizes short clips, not damage.** `X6VydswgnfY`: score 55, **32-second source clip** (info.json duration=32), 7 segments, fully coherent ("where are you from / Colombia… this is my whatsapp"). Tiny ≠ broken.
5. **One localized ASR artifact tanks a holistic score.** `NhaqeRwLPJY`: score 38, but segments 0–111 are a contiguous **112/112 "Pew!" block** (intro music the ASR hallucinated); segments 112–336 are clean dialogue. One trimmable defect sinks the whole video.

Genuinely hard (NOT cheap-recoverable) — the diarization track:
- `tX9j5cLK63I` (42, mic bleed — coach's mic picks up a 3rd person), `_Am8ItTeNoQ` (52, student+target fused on one cluster), `grq-TNERVuA` (55, both speakers collapsed, 294 segs). Even these read as **coherent dialogue mis-split by diarization, not garbled ASR** — so they're candidates for a better diarizer, not write-offs.

Root config fact: **stage 04 doesn't tune diarization at all.** It calls WhisperX's bundled `DiarizationPipeline` with **no `num_speakers`, no clustering threshold, no params** (`04.EXT.diarize:495`), default model. Collapse = default-threshold under-clustering on noisy 2-speaker audio. We haven't tried the easy levers yet.

### What I propose (4 areas)
1. **Fix the gates (cheap, high-confidence, do first).** Make every infield gate fire on *residual* quality, not proxies: count only fixable-vs-residual misattributions, run 06c before gating, gate collapse on `unknown_count`/`reassignment_rate` not raw count, exempt short clips from the score cliff, trim ASR intro artifacts before scoring.
2. **Improve diarization for true collapse (higher effort).** Call pyannote directly (not the WhisperX wrapper) to access the clustering threshold; add a collapse-detect → escalate-threshold → community-1 retry fallback; reserve a separate-venv Sortformer for the residual. Exploit that **the coach is the same person across all videos** (target-speaker enrollment) as the high-ceiling bet.
3. **Detect infield earlier + stabilize type.** Cheap metadata/diarization signals to route infield to infield-tuned settings before stage 06, and reconcile 06-vs-06h type disagreement.
4. **Per-type thresholds, validated by a ground-truth set.** Infield is expected noisier; tune its gates against a small human-labeled eval set so changes are measured, not guessed.

### Expected impact
Phase 1 (gate fixes) alone should move **~7–9 of 15 quarantined infield to ingest-ready** with near-zero quality risk (each fix is verified against the actual files). Phase 2 targets the ~5 collapse cases. The eval set makes every threshold change auditable.

### Risks / tradeoffs
- Loosening gates risks admitting real damage → **every loosening is paired with a residual-quality check and validated on the ground-truth set; fail-closed is preserved** (we gate on residual damage instead of a proxy, not "gate less"). A robustness *fallback* (retry diarizer) is allowed; a *bypass* of a quality decision is not.
- Calling pyannote directly / pinning the model is a behavior change to a stable stage → gated behind an A/B on the collapse cases with DER measured on labeled audio.
- NeMo/Sortformer conflicts with the pinned torch 2.8 venv → isolated subprocess venv only, fallback-only.

---

## PART B — PER-AREA DETAIL (current behavior → root cause → options → measure)

### Area 1 — Gate correctness (Phase 1)

**1a. 06b no-op misattribution counting.**
- Current: `evaluate_06b_gate` counts `len(payload["misattributions"])` raw (`pipeline-runner:746`), threshold ≥5 → block.
- Evidence: `yTWnGdzgz7w` 6/6 are `coach→coach` no-ops. 06c skips these (`06c.DET.patch:431`).
- Fix: count only misattributions where `suggested_role != current_role` AND `confidence < MIN_MISATTRIBUTION_CONFIDENCE` (0.7) — i.e. **residual** misattributions 06c won't auto-apply. High-confidence real swaps are corrections, not damage; no-ops are noise.
- Measure: re-run gate logic over the 4 `06b_flag_severe` files; expect yTWnGdzgz7w→pass, and the 3 real-swap videos→pass-after-06c (see 1b).

**1b. 06b-before-06c ordering.**
- Current: gate at `pipeline-runner:1333` returns before 06c runs.
- Fix options: (A) run 06c immediately after 06b and **re-evaluate the gate on the post-patch conversations** (clean, fail-closed: only truly-unfixable residual blocks). (B) keep ordering but have the gate simulate 06c's apply-rule when counting (the residual-count fix in 1a effectively does this). Recommend **A** — single source of truth, no logic duplication.
- Measure: h-wWMx5Ssac / 9tcvr26JP10 / TeZg-eAknDs reach 09 with corrected roles; spot-check 5 reassigned segments each against transcript.

**1c. 06 collapse gate counts, not repair success.**
- Current: block on `total_segments_affected >= 50` (`pipeline-runner:839`); `reassignment_rate`/`unknown_count` ignored.
- Fix: block only when collapse is **unrepaired** — e.g. `unknown_count >= N` OR `reassignment_rate < R` (tune N/R on eval set; start `reassignment_rate < 0.85` OR `unknown_count >= 25`). A fully-reassigned collapse (rate 1.0, 0 unknown) must pass regardless of count.
- Evidence: K8_TBjaiNUk (rate 1.0, 0 unknown), 4n7tesaFEdI (rate 0.962, 2 unknown) → should pass. tX9j5cLK63I (rate 0.932 but score 42 + mic bleed) → still caught by the transcript-score/residual path, not by raw count.
- Measure: 5 collapse videos re-gated; K8/4n7t pass, the 3 mic-bleed/fusion cases routed to Area 2 (diarization) or held by residual checks.

**1d. Short-clip exemption on the score cliff.**
- Current: 06b FLAG + transcript_score ≤55 → block (`pipeline-runner:731`). Penalizes brevity.
- Fix: exempt clips below a duration/segment floor (e.g. duration < 60s OR segments < 15) from the ≤55 cliff **when** the transcript is internally coherent (no 06b severe residual, no collapse-unknown). Short+coherent ≠ damaged. (Note: the pre-ingest QA screen already flags thin content downstream, so this won't admit negligible clips — `ingestQaScreen.ts` BLOCKs chunkCount≤4.)
- Evidence: X6VydswgnfY (32s, 7 segs, coherent, score 55). UmhMBv40HU8 (score 52, 11-seg collapse) — check separately, may be genuinely thin.
- Measure: X6VydswgnfY passes the gate but is then correctly screened by ingestQaScreen if too thin; confirm end state is intentional (not a silent pass).

**1e. ASR intro/outro artifact trim.**
- Current: stage 02 detects repetition hallucination and *refuses to write* critical transcripts (`02.EXT.transcribe:709`), but a localized intro block that doesn't trip the whole-file critical rule survives and poisons the holistic score.
- Fix: deterministic intro/outro artifact detector+trimmer — contiguous leading/trailing run of identical low-information tokens (e.g. "Pew!", music onomatopoeia) → drop those segments before stage 06 scoring; log what was trimmed (no silent drop).
- Evidence: NhaqeRwLPJY (112/112 leading "Pew!", then clean). Re-score after trim should jump well above 38.
- Measure: NhaqeRwLPJY re-scored post-trim ≥ threshold; trim log shows exactly segments 0–111 removed; segments 112+ intact.

### Area 2 — Diarization for true collapse (Phase 2)

- Current: WhisperX bundled `DiarizationPipeline`, no params, unpinned model (`04.EXT.diarize:495`). clean16k = raw16k copy (no denoise). Collapse = default-threshold under-clustering.
- Research conclusions (sources in investigation log):
  - **Forcing `num_speakers=2` alone does NOT fix collapse** — it constrains output count, not clustering. The lever is the **AHC clustering `threshold`** (lower it to split more aggressively). Requires calling pyannote directly; the WhisperX wrapper doesn't surface it.
  - **pyannote `community-1`** pipeline is a near-drop-in upgrade with "marked reductions in speaker confusion" + overlap-aware segmentation; same venv family.
  - **Do NOT denoise the audio sent to Whisper** (well-evidenced ASR regression); if denoising, apply only to a *diarization-branch copy*.
  - **NeMo Streaming Sortformer** (CC-BY-4.0, 2-spk DER ~6%) — strong but over-segments conversation and is noise-weak; isolate in a separate venv, fallback-only.
  - **Target-speaker (TS-VAD) with an enrolled coach voiceprint** = structurally correct: coach is the same person across all videos, turning symmetric clustering into "is this the coach?" detection. Highest ceiling; it's a build.
- Recommendation (ordered, fail-closed fallback, not bypass):
  1. Call pyannote directly; add **collapse-detect (one cluster >~90% speech) → re-run with lowered threshold + `num_speakers=2` backstop → community-1 → (separate-venv Sortformer)**. Only flagged videos pay the re-run cost.
  2. Pin the pyannote model version (stop silent drift).
  3. Medium-term: enrolled-coach TS-VAD as the high-ceiling fix.
- Measure: DER on the labeled eval set (Area 4) before/after; collapse-recovery rate on the 5 collapse videos; confirm ASR text unchanged (diarization-only branch).

### Area 3 — Early infield detection + type stability (Phase 3)

- Current: type known only at stage 06 (LLM), sometimes unstable (EogjdB3msWA infield@0.70→talking_head@06h, yet passed). Low-confidence types (0.60–0.70) common in the quarantined set.
- Options for early signal (cheap → richer): channel/title/description keywords ("infield", "approach", channel known-infield) → stage 04 diarization stats (rapid 2-speaker turn-taking, speech-time balance, overlap rate) → a light pre-06 classifier. Goal: route likely-infield to infield-tuned diarization (Area 2) and gate thresholds (Area 4) before the expensive LLM stage.
- Type instability: when 06 and 06h disagree, prefer the higher-confidence / downstream-consistent label and record the disagreement (already surfaced by ingestQaScreen REVIEW).
- Measure: precision/recall of the early signal vs stage-06 type on all 96 videos that reached 06.

### Area 4 — Per-type thresholds + ground-truth eval set (spans all phases)

- Current gates audited (infield-relevant): collapse count =50 (`pipeline-runner:56`), 06b misattribution =5 (`:50`), 06b low-transcript-score =55 (`:55`), 06h video_confidence ~0.85 (in 06h; e.g. 68kUvx1TUdY blocked at 0.847), plus the holistic LLM `transcript_score` itself.
- Meta-question — **how do we know a threshold is right?** We don't, currently. Proposal: a **human-labeled infield ground-truth set** (below). Tune each gate to maximize precision/recall of "genuinely unusable" vs "usable" against it. Decide per-type vs global from the data: infield expected noisier → likely per-type collapse + score thresholds, global elsewhere.
- The 68kUvx1TUdY case (0.847 < 0.85) is a borderline genuine near-miss — leave to the eval set to confirm the threshold rather than nudging blind.

#### Proposed ground-truth eval set
- **Scope:** all 18 QUALITY-TEST.1 infield videos + ~10–15 more infield from other batches = ~30 labeled.
- **Labels per video:** (a) usable / borderline / unusable for training; (b) correct video_type; (c) for a sampled ~20 segments, correct speaker_role (coach/target/student/other) → yields both gate-precision/recall AND diarization DER.
- **Use:** every Phase-1/2/4 threshold or diarizer change is scored against this set before merge. No threshold moves without a measured precision/recall delta.
- **Effort:** ~1 focused labeling pass; reuse the existing audio + 06 segment text for fast labeling.

---

## PART C — PHASED ROADMAP (cheap/high-confidence first)

Each phase = a testable, working pipeline state. Single-command-first: all changes fold into existing stages / pipeline-runner gates — no new ad-hoc commands.

**Phase 0 — Ground-truth eval set.** Label ~30 infield videos (usable/borderline/unusable + sampled speaker_role + type). Deliverable: `data/validation/infield-ground-truth.json` + a scorer that reports gate precision/recall and DER.
- Acceptance: scorer runs against current pipeline outputs and reproduces the current 3-pass/15-quarantine split with per-gate precision/recall numbers.

**Phase 1 — Gate correctness (no diarizer change).** Implement 1a–1e. All five are residual-quality fixes; fail-closed preserved.
- Acceptance: re-run stages 06b/06c/06 gates over the 15 quarantined infield; ≥7 move to pass (yTWnGdzgz7w, h-wWMx5Ssac, 9tcvr26JP10, TeZg-eAknDs, K8_TBjaiNUk, 4n7tesaFEdI, NhaqeRwLPJY post-trim) with 0 regressions on the 3 already-passing and on the talking_head set. Each recovered video spot-checked: ≥5 reassigned segments correct vs transcript. Precision/recall vs Phase-0 set does not drop for any gate.

**Phase 2 — Diarization fallback for true collapse.** pyannote-direct + collapse-detect→threshold-escalate→community-1 retry; pin model. Sortformer separate-venv reserved.
- Acceptance: on the 5 collapse videos, collapse-recovery (rate→1.0 or DER drop) measured on Phase-0 labels; ≥2 of the 3 hard cases (tX9j5cLK63I/_Am8ItTeNoQ/grq-TNERVuA) improve to passable; ASR text byte-identical (diarization-only branch); no DER regression on the recoverable collapse cases or talking_head.

**Phase 3 — Early infield detection + type stability.** Pre-06 infield signal routes infield-tuned settings; 06/06h disagreement reconciliation.
- Acceptance: early signal achieves ≥0.9 recall on stage-06 infield labels across the 96 videos; infield-routed videos use infield thresholds; type-disagreement cases logged not silently dropped.

**Phase 4 — Per-type threshold finalization.** Lock infield gate thresholds chosen on the Phase-0 set; document per-type vs global decisions with the precision/recall evidence.
- Acceptance: every changed threshold has a recorded precision/recall delta on the eval set; fail-closed verified (no bypass of any quality decision); learnings.md updated.

---

## PART D — AI EXECUTION REFERENCE (file:line)

Gates (all in `scripts/training-data/batch/pipeline-runner`):
- Constants L50–L64 (misattribution=5, low-transcript=55.0, collapse=50, 06f seeds).
- `evaluate_06b_gate` L695–813 — **1a** patch `misattribution_count` L746 to filter `suggested!=current` AND `confidence<0.7`; needs to read per-misattribution `confidence`/`suggested_role`/`current_role` from the verification payload.
- 06b gate call + early `return` L1333–1344 — **1b** option A: invoke 06c then re-evaluate (or move gate to post-06c).
- `evaluate_06_gate` L816–864 — **1c** replace `total_segments_affected >= 50` block (L839) with `unknown_count`/`reassignment_rate` residual test; meta fields produced at `06.LLM.video-type:1748`.
- `evaluate_06b_gate` low-transcript block L731–742 — **1d** add short-clip exemption (read duration from `data/01.download/.../*.info.json`, segments from stage 06).

06c apply rules (reference for 1a/1b parity): `scripts/training-data/06c.DET.patch:85–88` (thresholds), `:394–453` (misattribution apply: skips no-ops L431, skips conf<0.7 L438).

Collapse meta source: `scripts/training-data/06.LLM.video-type:1699–1757` (`resolve_speaker_roles`).

ASR artifact trim (**1e**): `scripts/training-data/02.EXT.transcribe` — existing repetition detectors L134–307, critical-skip L709; add localized leading/trailing artifact-run trimmer feeding stage 06 input.

Diarization (**Area 2**): `scripts/training-data/04.EXT.diarize:481–547` (WhisperX `DiarizationPipeline` instantiation L495, overlap-assign fallback L392–464). Switch to direct pyannote `Pipeline.from_pretrained` + `instantiate({"clustering": {"threshold": ...}})`; add collapse-detect on per-speaker speech-time share.

Pre-ingest screen (interaction check): `scripts/training-data/lib/ingestQaScreen.ts` — confirm thin-content BLOCK (chunkCount≤4) still catches anything Phase-1 1d admits.

Eval set: new `data/validation/infield-ground-truth.json` + scorer (single command, writes one report).

Constraints: Python stages via `.venv/bin/python`. No new top-level commands — fold into existing stages/runner. Screenshots → `.playwright-mcp/`. Run `npm test` after any TS change. Update `docs/pipeline/learnings.md` per phase.
