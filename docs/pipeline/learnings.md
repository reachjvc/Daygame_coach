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

## QUALITY-TEST.1 Resume (2026-06-07) — 49/100 fully done

**Resumed remaining at `--parallel 5` after quota reset. 30/50 in-flight passed → 49/100 now through stage 09.**

| Status | Count |
|---|---|
| Fully done (stage 09) | 49 |
| Quarantined (real gate failures) | ~44 |
| Potentially rescuable (non-quota, flaky) | 3 |

- Quota held the whole run (no outage). 19→49 done in one pass.
- 3 borderline quarantines worth a future retry (NOT quota, NOT deterministic-quality): `Y2hyrJ7ez1A` + `zWyau0QVSpA` (06e "Invalid/unparseable JSON response" on a single window — likely flaky Opus generation), `-5We8Qvv2Cg` (07 `validator_inputs_missing`: missing 06c/07 artifact, fail-closed block).
- `JdReE9lr6-4`: rescued a transient 06e parse-error (cleared quarantine + re-ran) → it then hit a REAL `06f low_quality_overload` gate (39% low-quality segs). Confirms the rescue-then-let-gates-decide flow is correct; don't assume a cleared transient will pass.

### NEW GOTCHA — `--from 06` reopens ALL quarantines for manifest videos
- On restart, pipeline-runner prints `Restart from 06: ignoring N same-stage/downstream quarantine entries (retained 0/N)` and **wipes the quarantine file**, re-attempting every quarantined video. Re-running deterministic gate-failures (speaker-collapse, 06f overload, severe FLAGs) just burns quota — they re-fail identically.
- **Fix to resume ONLY in-flight without re-burning quota:** build an in-flight-only manifest = remaining manifest **minus** the real-quarantine IDs, then run that. Videos not in the manifest keep their quarantine rows (retained, not reopened).
- Snippet: `comm -23 <(manifest_ids) <(done_ids) | comm -23 - <(quarantine_ids)` → in-flight set.

### Other gotchas this session
- **End-of-run validation hook fails (exit 2) with a custom `--manifest`.** The delegated `--validate` step reroutes to `sub-batch-ops` and needs a real sub-batch ID; a custom manifest makes it error. **Cosmetic only — pipeline processing already succeeded** (check "Pipeline Summary: Passed X/Y" above the validation error). Non-zero exit ≠ pipeline failure here.
- **Don't background-launch the runner with a trailing `&` inside a `run_in_background` Bash call** — the wrapper exits immediately, orphaning the python (harness stops tracking it, no completion notification). Launch it as the foreground command of the background task instead.

---

## Pre-Ingest Quality Screen (2026-06-07) — IMPLEMENTED. 06h `blocked=False` is necessary, NOT sufficient

Passing the 06h gate (`quality_gate.blocked=False`) does NOT mean a video is ingest-ready. Manual review of the 30 QT1 passes caught 5 issue-classes the gate let through. A fail-closed screen now runs automatically inside the ingest — all signals come from already-produced files (06 video-type, 06h `*.confidence.report.json`, 09 `*.chunks.json`), **zero new LLM cost**.

- Logic + thresholds: `scripts/training-data/lib/ingestQaScreen.ts` (pure `screenVideo()` + IO). Test: `tests/unit/pipeline/ingestQaScreen.test.ts` (vitest, 14 cases).
- Wired into `10.EXT.ingest-test.ts`: PASS/ADVISORY auto-ingest; REVIEW needs `--allow-review`; BLOCK never ingests (exit 2 unless `--ack-blocks`). Writes `data/validation/ingest-qa/<manifest>.{verdicts.json,report.md}`.

| # | Issue | Implemented signal | Severity | Example |
|---|---|---|---|---|
| 1 | Thin / negligible content | `chunkCount <= 4` **OR** (`segments < 60` AND `high-tier ratio < 0.95`) — short+damaged that escaped the size-gated lq check (lq gate only fires at >=60 segs) | **BLOCK** | 6fHFpEjahnc: 3 chunks, 11 segs, 90.9% high |
| 2 | Type-classification uncertainty | 06 `video_type.confidence < 0.80` **OR** 06h `video_type` != dominant 09 `[TYPE:]` tag | **REVIEW** | EogjdB3msWA: 06=infield@0.70, 06h/09=talking_head |
| 4 | Low post-repair confidence | `tier_counts.high / segments_total < 0.95` | **REVIEW** | H-_FULmTJXc 92.3% |
| — | Unverifiable (missing 06h report) | 06h signals absent/unparseable | **REVIEW** (fail-closed) | — |

**Design principle: every check maps to a RESIDUAL problem in the final corpus, never a proxy.** Two planned flags were dropped after checking the data:
- **Compilation — NOT flagged.** Chunks are scoped per conversation (`metadata.conversationId` + `conversationChunkIndex`/`Total`), so a chunk never spans two clips — verified on VRsmSr3-EBU: conv1 (5 INTERACTION) → conv2 (3) → 5 isolated COMMENTARY. Over-segmented compilations are already killed upstream at the stage-06 conversation-count gate.
- **Heavy-repair (high `lq_total_ratio`) — NOT flagged.** Raw pre-repair damage says nothing about final quality. The 8 heavy-repair QT1 videos (lq 0.30–0.40) ended ~100% high-tier with **<2% left unrepaired** (06h even rejected the low-confidence repairs). Residual damage — the thing that matters — is already covered by #4 (high-tier <0.95 → REVIEW) and the 06h gate's own unrepaired-ratio block. ("Repaired" + low residual == not a problem.) The only uncaught risk is a *confidently-wrong* repair (06e mistranscribes, 06h accepts ≥0.85); pre-repair volume isn't a proxy for that — catching it needs a repair-correctness sample-audit, a separate task.

**Key fix vs first draft:** #1 keys off FINAL high-tier ratio, NOT raw `lq_ratio` — a short video with high raw lq that 06e repaired to ~100% high (e.g. xfVhG9qwB38: 40 segs, lq 0.35, 100% high) is NOT blocked. Earlier "EogjdB3msWA = type mismatch" was wrong: 06h/09 agree (talking_head); the real signal is the LOW 06-stage confidence (0.70), so the rule keys off that.

**Validated on the 30 new QT1 passes:** BLOCK 1 (6fHFpEjahnc), REVIEW 2 (EogjdB3msWA, H-_FULmTJXc), PASS 27 — matches manual review. (No advisories: both compilations and all 8 heavy-repair videos are PASS.)

Rule of thumb: the headline number ("49/100 done") is misleading until screened — "done at 09" != "ingest-quality".

---

## Infield Investigation (2026-06-12) — most infield quarantines are GATE ARTIFACTS

Plan: `docs/plans/infield-pipeline-improvement.md`. Re-derived from data, not summaries.
- **18 infield** in QT1 (not 16). **3 reached 09**: kVNih9mOvsE, EogjdB3msWA, H-_FULmTJXc. 15 quarantined.
- Kill histogram: collapse-overload×5, 06b-flag-severe×4, 06b-low-transcript×3, 07-validator-missing×1, 06h-gate×1, 06e-crash×1.
- **3 confirmed bugs, all cheap to fix (Phase 1):**
  1. 06b counts no-op misattributions (`current==suggested`) as damage. yTWnGdzgz7w = 6/6 coach→coach no-ops → killed. 06c already skips no-ops (`06c.DET.patch:431`). Gate at `pipeline-runner:746` counts raw `len(misattributions)`.
  2. 06b gate runs (`pipeline-runner:1333`, returns) BEFORE 06c applies fixes (conf≥0.7). h-wWMx5Ssac/9tcvr26JP10/TeZg-eAknDs killed for having *correctable* labels.
  3. 06 collapse gate blocks on raw `total_segments_affected>=50` (`pipeline-runner:839`), ignores `reassignment_rate`/`unknown_count` (both in meta, `06.LLM.video-type:1748`). K8_TBjaiNUk = 151 affected, rate 1.0, 0 unknown, score 72 → killed despite perfect repair.
- Plus: score-cliff ≤55 penalizes short clips (X6VydswgnfY = 32s coherent), and one localized "Pew!" intro block (NhaqeRwLPJY segs 0–111, 112/112) tanks holistic score 38.
- **"Broken" collapse cases (42/52/55) are coherent dialogue MIS-SPLIT by diarization, not garbled ASR.** → diarizer track (Area 2), not write-offs.
- **Stage 04 doesn't tune diarization AT ALL**: WhisperX bundled `DiarizationPipeline`, no num_speakers/threshold, unpinned model (`04.EXT.diarize:495`). Collapse = default-threshold under-clustering. Levers untried: pyannote-direct + lower clustering threshold, community-1, enrolled-coach TS-VAD (coach is same person across all videos). Do NOT denoise ASR audio (regresses Whisper).
- Need a ~30-video human-labeled infield ground-truth set to make threshold changes empirical (Phase 0).

---

## Infield Phase-1 Gate Fixes — IMPLEMENTED + 5-video test (2026-06-12)

Implemented the 5 Phase-1 fixes from `docs/plans/infield-pipeline-improvement.md`:
- **1a/1b** `pipeline-runner` `evaluate_06b_gate`: `_count_residual_misattributions()` counts only misattributions 06c will NOT auto-apply (skips no-ops where current==suggested, skips conf>=0.7 swaps 06c fixes). Fixes the no-op overcount AND the 06b-before-06c ordering in one place.
- **1c** `evaluate_06_gate`: blocks on UNREPAIRED collapse (`unknown_count>=25` OR `reassignment_rate<0.85 & affected>=50`), not raw count. Constants near L56-72.
- **1d** short-clip exemption (`segments<15`) from the low-transcript-score cliff.
- **1e** `02.EXT.transcribe._trim_edge_artifacts()`: drops a leading/trailing run of a short repeated token (music artifact like "Pew!"). Conservative: edges only, tokens<=6 chars, vocab<=2, run>=10 tokens. NOTE: at stage 02 the artifact is ONE fat segment ("Pew!"x110); it only becomes 112 separate segments AFTER stage-03 alignment. Trimmer handles both shapes.

Tests: `tests/unit/pipeline/test_pipeline_runner_stage06_gate.py` (14, all pass), new `test_transcribe_edge_trim.py` (8, all pass). Pre-existing unrelated failures: `test_06h_confidence.py` TestQualityOverloadGate (2) — tests expect 0.50/0.34, code uses 0.48/0.33 (stale tests, not my change; not in `.test-known-failures.json`).

**5-video end-to-end test (real pipeline, isolated sub-batches):**
| Fix | Video | Result |
|---|---|---|
| 1a no-op | yTWnGdzgz7w | ✓ → 09, 61 chunks (6 no-op misattr no longer block) |
| 1b ordering | h-wWMx5Ssac | ✓ → 09; **verified 06c applied all 7 swaps** in patched output |
| 1c collapse (moderate) | 4n7tesaFEdI | ✓ → 09, 9 chunks (affected 53, rate .96) |
| 1c collapse (large) | K8_TBjaiNUk | ✗ passed 06 gate but **re-caught at 06f** (high_severity_seeds=151>=120) |
| 1d short-clip | X6VydswgnfY | cliff cleared, but held by a LEGIT `mixed_speaker_segment` major flag (2/7 segs mixed) — fail-closed working |
| 1e intro-trim | NhaqeRwLPJY | ✓ → 09, 8 chunks; **transcript_score 38→62** (337→225 segs after trim) |

**Net: 4/5 recovered to stage 09 with coherent, attribution-correct data.** Two follow-on findings:
1. **06f damage-seed gate has the SAME count-not-quality problem as the old 06 collapse gate** — K8's 151 reassigned-collapse segments become 151 high-severity 06f seeds (but low_quality_ratio only 0.16). Large reassigned collapses get re-blocked at 06f. Needs the same residual-vs-count treatment (`evaluate_06f_gate`, `STAGE06F_DAMAGE_SEED_HIGH_BLOCK_THRESHOLD=120`). 4n7t (53 affected) stayed under the threshold so it passed — so 1c recovers MODERATE collapses; large ones need the 06f fix too.
2. X6VydswgnfY confirms gates still protect quality: 1d cleared the brevity cliff but an independent real mixed-speaker defect (no 06c-fixable) correctly held it. Throughput != quality.

Caveat: thresholds (collapse 0.85/25, short-clip 15) are hand-picked from a handful of examples — provisional until the Phase-0 infield ground-truth eval set validates them.

### Follow-up: 06f collapse-echo fix (2026-06-14)
The 06f overload gate had the SAME proxy-count bug. K8's 151 high-severity damage seeds were 149 `seed_speaker_collapsed`-only echoes (verified in `data/06f.DET.damage-map`) of the collapse Stage 06 already reassigned (rate 1.0) — only 2 were genuine (`seed_transcript_artifact`), and actual low-quality was 24/157=15%. Fix: `evaluate_06f_gate` skips seeds whose `damage_reason_codes` are a subset of `{seed_speaker_collapsed}` (constant `STAGE06F_COLLAPSE_SEED_REASON_CODE`). Collapse is adjudicated once, at the Stage 06 gate; 06f no longer re-litigates it. Genuine damage seeds / mixed-reason seeds still count (fail-closed). Tests added (3) in `test_pipeline_runner_stage06_gate.py`. K8 now passes the 06f gate → with this, large reassigned collapses recover too.

### K8 STOP POINT: 06h confidence gate is a REAL signal, not a proxy (2026-06-15)
After fixing the 06 + 06f count gates, K8 reaches the **06h video-confidence gate and is correctly held**: `video_confidence 0.736 < 0.85`. Verified WHY in `data/06h.../confidence.report.json`: 157 segs = **5 high / 150 medium / 2 low**; `axis_weights speaker=0.475`; `damage_type_counts seed_speaker_collapsed=151`. The collapse-reassigned segments are capped at MEDIUM speaker-confidence, dragging the video to 0.736. This is NOT a mechanical echo like the count gates — it's a graded measure of genuine uncertainty: K8's speaker labels are content-REASSIGNMENT (LLM inference), not clean diarization, so moderate confidence is defensible. The 06h `quality_gate.blocked=False` (low-quality only 12.7%); the block is purely the speaker-confidence floor.
**Decision: do NOT lower the 0.85 infield threshold by hand.** Whether collapse-heavy infield should pass at a lower bar is a per-type-threshold question that needs the Phase-0 ground-truth eval set (have a human confirm whether K8's reassigned speaker labels are actually correct). This is the boundary between "fixing proxy-count bugs" (done) and "tuning real quality thresholds" (needs evidence). Gates fixed so far recover MODERATE collapses (4n7t) + the no-op/ordering/short-clip/intro cases; LARGE collapses (K8) are now correctly gated on real confidence, pending the eval set.

---

## Stage 04 turn-boundary re-segmentation — FIXES two-speakers-fused-in-one-chunk (2026-06-15)
Root cause of X6VydswgnfY-style `mixed_speaker_segment`: whisperx `assign_word_speakers` stamps ONE speaker per ASR segment. When a 5s chunk contains the coach's question + target's reply, one speaker wins the whole chunk and the other is lost — unrecoverable downstream. **Verified the boundaries DO exist**: re-ran pyannote on X6, raw turns for seg0 (0-5.2s) = SPEAKER_00(0.03-0.62) / SPEAKER_02(0.84-3.63) / SPEAKER_00(3.63-4.50) / SPEAKER_02(4.50-7.96). Stage 04 was discarding them. (Earlier claim "pyannote never detected it" was WRONG — only the per-word labels are uniform because assign_word_speakers collapses to per-segment majority; the RAW turns have the boundaries.)
Fix: `04.EXT.diarize._resegment_segments_by_turns()` re-cuts each ASR segment at turn boundaries using word timestamps; tiny blip-runs (<2 words & <0.4s) merge back to avoid fragmenting clean speech; clean single-speaker segments unchanged. Wired into `diarize()` after assignment. Tests: `test_diarize_resegment.py` (5). 
Result on X6: 7→17 segments, "where are you"→coach / "from colombia..."→target (was all target), major mixed_speaker flags GONE, video reaches stage 09. Tradeoff: introduces a milder inverse artifact `diarization_split_same_person` (minor severity, occasionally over-splits one speaker on imperfect pyannote turns) — net big win, improves automatically when diarization improves (Phase 2 community-1/source-sep). NOTE: only takes effect on stage-04 RE-RUN — to apply across the corpus, re-run stage 04 for infield videos.
X6 still BLOCKed at the pre-ingest thin-content screen (17 segs, 88.2% high-tier) — a genuine 32s-clip call, NOT the speaker bug (which is fixed).

## Substantive vs cosmetic low-quality — 06f overload gate over-counted punctuation (2026-06-17)
The talking-head backlog was mostly blocked by `stage06f_low_quality_overload` — but **56-96% of the "low quality" segments are cosmetic** (06e reason "Missing capitalization and punctuation" / "Missing punctuation between clauses"), NOT garbled/mistranscribed. 06e flags them as repair candidates and repairs them; the transcript is coherent (e.g. dmsus9VLFGE score 78). The 06f gate counted RAW low_quality (cosmetic + substantive), so videos got quarantined for missing commas. Verified across 12 videos: genuine (non-cosmetic) low-quality ratio is 2-14%, far under the 0.33 gate.
Fix: `evaluate_06f_gate` now counts SUBSTANTIVE low-quality only via `_count_substantive_low_quality()` (reads 06e `low_quality_segments`, excludes reasons matching `STAGE06E_COSMETIC_LQ_REASON_MARKERS=("punctuat","capital")`); falls back to raw summary count if the per-segment list is absent (fail-closed). Genuine garbled still blocks. Tests (3) in `test_pipeline_runner_stage06_gate.py`. All 12 previously-failed videos now pass the 06f gate.
OPEN: cosmetic punctuation may also seed low_quality damage in 06f damage-map → lower 06h confidence tiers → could cause ingest REVIEW (low high-tier ratio) even after passing 06f. If the NEXT15 batch shows that, extend the cosmetic/substantive split into 06f damage-map seeding + 06h (the user's "multiple sorts of ratings" — cosmetic dimension shouldn't penalize confidence either).

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

### 06e (quality-check) — KEEP. Earlier "best cut target" was WRONG (gating lens missed its repair value).
- Windowed `1 + ceil(segments/90)` ≈ 3-6 LLM calls/video (06e L64-65). No verdict → "no hard gate" (never quarantines a video by itself; only feeds 06h's overload count + repairs).
- **But its VALUE is repair quality, not gating.** Across 199 passed videos: 489 SEMANTIC repairs (383 word-mistranscription, 154 garbled, 94 nonsense, 30 lang-confusion) beyond 5k punctuation fixes.
- **Repairs ARE applied and reach the product.** 06h applies conf≥0.85 repairs (L552-787) → flow into 07 enrichment + 09 embeddings. Verified end-to-end: video 0OBcvThsXJw "Gay game"→"Day game" (06d raw → 06h applied → 09 chunks show 19× "day game", 0× "gay game").
- Strongest examples (all in PASSED videos, land in final data): "Gay game"→"Day game", "digging"→"day game", "in a game overhauls"→"inner game overhauls", "go for the clothes"→"go for the close", "Harvard Score"→"Harvard Square", "only pants"→"OnlyFans", "the four brain"→"the forebrain". These are CORE corpus terms — without 06e the QA chatbot retrieves garbage on its main topic.
- **Action:** KEEP. If rate limit truly blocks, widen window 90→~130 (cuts calls, modest context-dilution risk) and spot-check repair quality. Do NOT cut — it directly cleans the training corpus, which is the pipeline's entire purpose (quality > speed).

### 06g (damage-adjudicator) — runs on SURVIVING infield only; high yield. Evaluate on quality merit, not waste.
- **Infield-only** (skipped w/ sentinel for non-infield, L982-1023). 1 call per seed-batch (batch=8) ≈ 2-5 calls/infield video.
- Feeds 06h: repair suggestions + nuanced transcript/speaker/phase confidence (averaged into base, L976-1003).
- **CORRECTION (data-grounded):** earlier "infield mostly quarantines, 06g wasted" was WRONG. Funnel of 76 infield: 06→76, 06b→71, **06g→37**, 06h→37, 07→34, 09→**28**. Infield pass rate = 28/76 = **37%, HIGHER than overall 23%**. The big kill (71→37) happens BEFORE 06g, so those cost zero 06g tokens. Of the 37 that reach 06g, **28 pass (76%)** → 06g runs almost entirely on videos that survive.
- So 06g is NOT spending tokens on doomed videos. Decide it on quality merit: does LLM repair/confidence beat a deterministic fallback from 06f seed severity (0.72-0.99)? Open question, not a clear cut.

### LLM calls/video inventory (grounded)
| Stage | LLM calls/video | Gate? | Verdict |
|---|---|---|---|
| 06 video-type | 1 | yes (routing+collapse) | keep |
| 06b verify | 1 | yes (REJECT/FLAG) | keep |
| 06e quality-check | 3-6 (windowed) | weak gate, but HIGH repair value | keep (widen if rate-limited) |
| 06g adjudicator | 2-5 (infield only) | indirect (06h conf) | keep unless fallback proven equal |
| 07 content | 2-5 (windowed) | produces output | keep |
| 07b enrich-verify | 1 | yes | keep |
| 06c/06d/06f/06h/08 | 0 (DET) | — | keep |
Typical infield video ≈ 10-19 LLM calls. Cutting 06e + simplifying 06g removes the bulk of non-output LLM pressure.

### COST LEVER = MODEL, not stage count (verified 2026-06-06)
- **All 6 LLM stages run on OPUS.** argparse default `opus` in 06 (L2168), 06b (L1734), 06e (L951), 06g (L1498), 07 (L5737), 07b (L1582). pipeline-runner `build_command` (L405-438) never passes `--model` → stages use their opus default. [verified]
- **No token metering in production:** all stages use `--output-format text` → CLI usage block discarded. 06b alone has latent usage-parsing code (L588-608) for json format. [verified]
- Call counts: 06=1, 06b=1, 06e=⌈seg/90⌉ windows, 06g=infield seed-batches, 07=⌈seg/100⌉ windows, 07b=1. Median 140 seg/video (range 20-455, n=16). [verified]
- Rough input-token estimate (UNVERIFIED constants): 07 ~5k, 06e ~3.3k, 06b ~2.7k, 06 ~2.6k, 07b ~2.4k, 06g ~0.5k tok/video ≈ 16k total, all on Opus. Replace with real numbers via json output-format A/B.
- **Implication:** stage-cuts save little + cost quality (06e/06g proven valuable). The real lever is downgrading stages that don't need Opus-grade reasoning. Opus also burns subscription rate-limit fastest → directly causes the #1 operational pain. Opus→Sonnet ≈5x cheaper tokens, Opus→Haiku ≈15x.
- **Plan = measure-then-A/B (not theorize):** (1) flip candidate stages to `--output-format json`, log usage; (2) 5 videos spanning sizes; (3) run opus vs sonnet vs haiku per candidate stage, capture real tokens; (4) diff cheaper-model output vs opus on concrete signals (06e: catches Gay→Day fixes? 06b: same verdict? 06: same type/roles? 07: same techniques?); (5) downgrade where output matches opus, keep opus where it diverges. Candidates: 06e/06g/06b/06 → likely Sonnet; 07/07b → keep Opus until proven.

### Model A/B experiment (2026-06-06, IN PROGRESS)
- **Metering method (zero edits to prod scripts):** wrapper at `/tmp/meter/claude` forces `--output-format json`, logs real usage (in/out/cache/cost) to `/tmp/meter/usage.jsonl`, returns `.result` text to caller. Stages honor `CLAUDE_BINARY` env. Run a stage directly: `CLAUDE_BINARY=/tmp/meter/claude METER_TAG=... <stage> --input <06d.json> --output <dir> --model <m> --overwrite`. Wrapper unsets CLAUDECODE (nested-session guard).
- **5 test videos (passed QT1, span sizes):** 36 u0pB8xubTcg, 68 1VOlZ9jyGQA, 134 JVKzf3lPCN4, 252 183envaOYvs, 465 zV0uOZASgNo (all talking_head — passed QT1 set has no infield).
- **First datapoint — 06e on 36-seg video (1 window) [verified, but n=1]:** haiku $0.023 / sonnet $0.102 / opus $0.186. Output tokens ~equal (4.3-5k) so spread = price tier (opus ~8x haiku, ~1.8x sonnet). QUALITY: sonnet caught SAME semantic repair as opus (seg27); **haiku found 0 semantic repairs = quality regression**. Direction: 06e opus→sonnet viable, opus→haiku NOT. Confirm on larger videos before concluding.
- Cache noise: per-run cache_create/read varies (server-side 5min TTL shared across runs) → single-run cost noisy; use output-token×price for clean comparison.
- **COST IS QUOTA, NOT MONEY:** pipeline uses `claude` CLI on the user's Max subscription (no ANTHROPIC_API_KEY in env, verified). `total_cost_usd` = notional API list price = proxy for Max usage-limit/rate-limit consumption (the real bottleneck). Opus burns quota fastest.
- **06e FULL RESULT (4 valid videos; 465-seg discarded — runs crashed at window 90-179, only 2/~6 windows completed):**
  - Cost (quota-proxy, 4 vids): haiku $0.54 / sonnet $1.05 / opus $2.31 → opus ~2.2x sonnet, ~4.3x haiku.
  - Quality: models do NOT agree. sonnet caught only ~50% of opus's semantic repairs (1/1, 2/4, 0/1, 6/11); haiku worse. Opus not a stable gold standard either (found 1 on 134-seg where haiku found 6).
  - **Concrete quality loss:** on 252-seg, opus caught `seg30 "something to stay"→"to say"` (real homophone fix, present in production corpus); SONNET MISSED IT. → downgrading 06e loses real repairs.
  - **VERDICT: keep 06e on Opus.** Both my earlier guesses WRONG (refuted by data): "06e is the cut target" AND "sonnet matches opus." Cheaper models trade measurable corpus quality for quota on this subtle-judgment task.
- **DO NOT generalize 06e's result to other stages.** 06e = subtle homophone judgment (model-sensitive). 06b (rule-check vs explicit criteria) and 06 (classification) are different task types that may downgrade cleanly. Test separately before any verdict.
- **Experiments cost quota too:** this 06e A/B already spent ~$5.5 quota-proxy. Budget further A/Bs.

### Priority order
1. **Stage 05 → passthrough** (152 min CPU, zero risk, no LLM).
2. **06e → KEEP** (widen window only if rate-limited). Repairs core corpus terms that reach final embeddings; cutting it degrades the product. Earlier "cut" recommendation refuted by data.
3. **06g → keep** unless a deterministic fallback is proven equal in quality. NOT low-yield: runs only on infield that survived 06b, 76% of which pass.
4. Keep 06/06b/07/07b (1 call each, all gate or produce the actual output).
- **CONCLUSION: no LLM stage is safe to cut.** Each either gates (06,06b), produces the product (07), guards it (07b,06b), or cleans/repairs the corpus (06e,06g). Token cost is real but every stage earns it. Rate-limit relief = lower --parallel + widen windows, NOT removing stages.
- Infield pass rate = 37% (28/76), HIGHER than overall 23%. Big infield kill is at 06/06b (before 06g). Lever to recover more = infield speaker-collapse threshold (≥50, a 06 gate).

---

## Handover Notes (2026-06-06)

### Current state (updated 2026-06-07)
- **No pipeline process running.** Last run (in-flight resume, `--parallel 5`, log `data/QUALITY-TEST.1.remaining6.log`) completed: 30/50 passed → **49/100 fully through stage 09**.
- In-flight manifest used: `docs/pipeline/batches/QUALITY-TEST.1.inflight.txt` (50 = remaining 77 − 27 real quarantines).
- **Ingest is STILL at 19** in `embeddings_test` — the **30 new stage-09 passes are NOT yet ingested.** Next step: refresh the 07b-passed manifest, then run the ingest script (see below).
- **19 (old) videos ingested** into `embeddings_test` table (571 chunks, 768-dim). Isolated from production `embeddings` table.
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

---

## Infield Phase 1 DONE + applied (2026-06-18) — QT1 86/100 at stage 09

Phase 1 gate fixes (`docs/plans/infield-pipeline-improvement.md` 1a–1e) are **fully implemented** and now **applied to every stuck QT1 infield**. Net: 11 of 15 quarantined infield recovered by the gate fixes; +2 more this session.

- **Don't trust 06h `quality_gate.blocked=False` in the report file.** The runner's `--from 07` does a **06h gate REPLAY** that enforces `video_confidence >= 0.85` — a check the standalone report's `blocked` field does NOT capture. 4 collapse videos (9tcvr26JP10 0.73, fO1NVRiSy9s 0.83, oZjZU0kksK8 0.82, grq-TNERVuA) pass the (fixed) collapse gate but BLOCK at 06h on real low post-repair confidence. Verify by running the gate, not reading the artifact.
- **Re-running quarantined videos through the FIXED gate is the Phase-1 application step** — but most re-confirm as genuine: low transcript score (40–52, non-short → no short-clip exemption) and severe FLAGs are real damage, not artifacts. Only false-kills recover (8J_TuB6GwlI: old "low transcript 52" → re-scored clean, 525 high-tier).
- **The 14 still-missing are all genuine:** 3 stage-02 rejects (audio is 90–95% whisper hallucination / a 32s clip — `02.EXT.transcribe` fail-closed SKIPs; not fixable), 4 collapse→06h-confidence (Phase 2 diarization), 6 genuine 06b blocks, 1 deterministic stage-06 validation fail (w4GAi9RhMYc: bad audio_features.json).
- **Clean 06e/06g stalls (not quarantined) are resumable** with `pipeline-runner <m> --from 06e` — `-CZtcqqEDdk` resumed to a full PASS. Watch 06g: it can loop retrying one schema-invalid segment (records fail-closed `llm_failure` row and continues).
- Further infield recovery = Phase 2 only (pyannote-direct threshold escalation / TS-VAD), which per fail-closed discipline needs Phase 0 ground-truth eval set FIRST.

---

## QT2 batch (2026-06-19) — 100 fresh videos, primarily-infield selection

Built `docs/pipeline/batches/QT2.txt`: 100 unprocessed videos (0 overlap w/ QT1), selected ~65 infield-by-channel + 35 theory. Ran full pipeline 02→09.

- **EXT 02→05** (GPU, chained, ~6h overnight): 98/100 (2 stage-02 hallucination rejects).
- **LLM 06→09**: hit the **Claude usage limit at 06e** mid-run (the rate-limit bottleneck again). Resumed AFTER reset — but `pipeline-runner QT2` (default) prints **"Restart from 06: ignoring N quarantine entries (retained 0/N)"** and reopens ALL quarantines + re-runs 06/06b with `--overwrite` → re-burns fresh quota. **The runner passes `--overwrite` to every stage in its `--from`→09 range, so it never skips completed stages.** Correct resume: kill it, build an **in-flight-only manifest** (QT2 minus real-quarantine IDs from the first log minus dead), and run `--from <actual-stall-stage>` (here `--from 06e`, since all 61 in-flight had 06d). That resumed 06e→09 with no waste, no outage → 57/61 passed.
- **Result: 57/100 at stage 09, 53 ingest-ready** (PASS 53 / REVIEW 2 / BLOCK 2). ~57% vs QT1's lower initial rate — infield gate fixes help.
- **Selection lesson:** infield-by-channel ≠ infield-by-content. Stage-06 typed the 100 as talking_head 44, compilation 20, **infield 16**, podcast 7. Most "infield-channel" videos are compilations or coach-narration-over-clips. True infield (16) stayed hardest: 5 PASS / 2 REVIEW / 9 quarantined.
- Ingested 53 QT2 PASS → `embeddings_test` now **133 videos (80 QT1 + 53 QT2), 5612 chunks**.

---

## CRITICAL: pipeline-runner false "LLM outage" abort = CLAUDECODE nested-session block (2026-06-23)
The runner's LLM preflight calls the `claude` CLI. If launched from inside a Claude Code session, `CLAUDECODE` is set and `claude` refuses ("cannot be launched inside another Claude Code session") → the runner misreads this as a global outage and prints **"Aborting before per-video execution to avoid mass execution-error quarantine during global LLM outages/limits"** even when quota is FINE. **Always launch pipeline LLM runs with `( unset CLAUDECODE; ./scripts/training-data/batch/pipeline-runner ... )`.** Verify real quota separately with `( unset CLAUDECODE; claude -p "Reply OK" )` before assuming an outage. Real quota limits show an explicit `You've hit your limit · resets <time>` from the CLI; the bare "Aborting before per-video execution" with no reset time is the false CLAUDECODE one.

---

## QT3 batch DONE (2026-06-23) — 69/100 stage 09, 65 ingested. Operational lessons.
100 fresh videos (`QT3.txt`), primarily-infield-by-channel (heavy on daily_evolution infield-titled). Final: **69/100 at stage 09, 65 PASS ingested** (2355 chunks). DB now **198 videos (QT1 80 + QT2 53 + QT3 65), 7967 chunks, 0 extraneous**.
- **Big compilation-heavy batches don't fit one quota window.** QT3's videos have many segments (06b prompts to 160k chars, 06e per-segment on 1000+ segs) → quota dies mid-run repeatedly. The grind took several windows. **Future: process in ~20-30 video chunks that complete within a window, so progress banks instead of being lost to mid-run outage.**
- **Resume efficiently by stage, never blanket --from 06b.** Re-running the expensive 06b for videos that already have good verdicts wastes the most-limited quota. Split not-@09 in-flight: good-06b+06d → `--from 06e` (cheap, recovered 26/32); good-06b-no-06d → `--from 06c`; corrupted/missing-06b → `--from 06b`.
- **Outage during 06b corrupts verdicts to fail-closed REJECT** ("Verification LLM failed... You've hit your limit"). These are NOT real rejects — detect via the summary string and re-run. (QT3 first pass: 83/84 "rejects" were this.)
- **`unset CLAUDECODE` is mandatory** (see prior note) — and beware a SECOND false-abort cause: **the runner's LLM preflight times out (120s×2) when the Anthropic API is degraded** (intermittent 500s / slow). That prints the same "Aborting before per-video execution" line. Distinguish: burst-probe `claude -p "Reply OK"` — if it 500s or is slow, the API is degraded (wait); if 5/5 fast OK, just relaunch (preflight will pass).

---

## QT4 batch (2026-06-24) — 100 infield-focused, EXT phase running
Built `docs/pipeline/batches/QT4.txt`: 100 unprocessed videos, 0 overlap with QT1/QT2/QT3 or any prior stage-02 attempt.
- **Status of the prior 300 (verified from data, not summaries — intersected manifest YouTube IDs against `data/09.EXT.chunks/`):** stage-09 reached: QT1 86, QT2 57, QT3 69 = **212/300**. Quarantined/blocked: 14+43+31 = **88/300**.
- **Selection constraint:** dedicated infield channels (playing_with_fire_infield, coach_kyle_infield, austen_summers_meets_girls, NL_meetingGirlsIRL) are now **fully consumed** by QT1–3 (0 unprocessed). Of 985 unprocessed downloaded videos, 877 are daily_evolution. So infield-by-content is ~entirely daily_evolution now. QT4 = 87 daily_evolution (all literal "INFIELD" titles) + 13 infield-leaning from other channels (coach_kyle approach×3, TODD_V infield footage, etc.) for channel spread. Expect the QT2/QT3 caveat to hold: infield-by-title ≠ infield-by-content; stage-06 will re-type many as compilation/talking_head.
- **Pre-flight:** all 100 have raw16k+clean16k audio (no clean16k gap). One pick (SZgkkTImrCY, Todd V) had only metadata, no audio → swapped for daily_evolution yrgCgJUhPrU.
- **EXT 02→05 launched** (GPU, bg) → `data/QT4.ext.log`. After it completes, run LLM 06→09 with `( unset CLAUDECODE; pipeline-runner QT4 --parallel 5 )` — and per QT3 lesson, process in ~20-30 video chunks per quota window so progress banks instead of dying mid-run.

### QT4 DONE (2026-06-25) — 50/100 stage 09, 41 ingested. Infield selection validated; tight-retry-loop gotcha.
Final: **50/100 at stage 09** (QT4.1 13, QT4.2 13, QT4.3 11, QT4.4 13). EXT 02→05 = 100/100 (no stage-02 rejects). Ingest: QA screen = 41 PASS + 8 REVIEW + 1 BLOCK. After user sign-off, ingested **49/50 (41 PASS + 8 REVIEW via `--allow-review`) = 851 chunks**; only the 1 thin BLOCK (WFPURH2z6N8, 4 chunks) excluded. `embeddings_test` now **8897 chunks**. (Ingest is idempotent/per-video replace — re-running with `--allow-review` only added the 8 REVIEW deltas, no dupes.) Held REVIEW (low post-repair high-tier <80% or video_type conf <0.80): 1M4dQg5peV8, 8reXU39JMQo, 9lkrnS53O_c, FB1cW1uMNPk, J_Vl8gpctKw, cMmtGVn9eNM, fNl30KAQJDA, mD1A2Jgargo; BLOCK (thin, 4 chunks): WFPURH2z6N8.
- **Infield selection finally worked: stage-06 typed 60/100 as infield** (vs QT2/QT3's ~16) — the literal-"INFIELD"-in-title filter is a far better infield proxy than infield-by-channel. True-infield pass rate 24/60 = 40% (consistent with historical ~37%); talking_head 14/14, compilation 12/23.
- **NEW GOTCHA — a tight retry-loop on the runner's flaky preflight makes it WORSE, not better.** The runner's LLM preflight (`claude --model opus -p ... --strict-mcp-config --no-session-persistence`, 120s×2) intermittently times out even when the *identical command run by hand returns in 7–9s* and direct quota probes are clean. A wrapper that relaunched the runner every ~5 min on each preflight-abort drove it to **persistent** 120s timeouts (QT4.3/4.4 failed 8/8 and 5/5). **Fix that actually worked: launch each chunk FRESH and SEQUENTIALLY, one at a time, no rapid retries** — every fresh launch (QT4.1, QT4.2, QT4.3-resume, QT4.4) cleared preflight first try and ran to completion. Rapid killed-preflight relaunches appear to degrade the API session/rate-bucket; space launches out.
- **Real quota mid-run still writes `llm_outage_during_stage` rows (NOT real quarantines).** QT4.3 died at 06e on a real limit → 19 outage rows + fail-closed 06b/06e outputs. Resume = delete the fail-closed/outage outputs (`grep fail_closed|llm_call_error|llm_outage`) + `rm` the chunk quarantine file, then `--from 06b` (06 video-type survived the outage). Re-ran clean → 11/25.

### QT5 DONE (2026-06-25) — 71/100 stage 09, 66 ingested. Infield well is DRAWING DOWN.
Next 100, same fresh-sequential LLM approach. Final: **71/100 at stage 09** (QT5.1 13, QT5.2 20, QT5.3 24-after-resume, QT5.4 14). Ingested **66 (65 PASS + 1 REVIEW) = 1176 chunks**; 5 thin BLOCKs excluded. `embeddings_test` now **10,073 chunks**.
- **Outage resume confirmed again:** QT5.3 died at 06e/07 (real limit) → cleaned + `--from 06b` → 24/25 (this time the outage wrote NO fail-closed files, just aborted clean — 0 to delete). QT5.4 hit a longer (daily, "resets Jun 26 10pm") limit; 4 videos still stalled (`-niMKo_fHfg` 08, `398QNJ1VYtI` 07, `AKpAECnkfYA` 07, `BQvRaHF4DT8` 06g) — resume `--from 06b` after the reset.
### QT6 DONE (2026-07-07) — 87/99 stage 09, talking_head-heavy. Two lessons.
Next 100 (99 after dropping a no-audio pick), run **20 at a time** (5 chunks). Final **87/99 at stage 09** — 88% pass because it's talking_head-heavy (only ~7 typed infield; pool spent). NOT yet ingested — see DB note below.
- **RESUME STAGE DEPENDS ON WHERE THE OUTAGE HIT vs whether stage 06 finished.** QT6.5's outage hit during its FIRST 06→09 pass, at 06b — but 06 had NOT completed for the later videos (15/19 had no `06.LLM.video-type` output). Resuming `--from 06b` FALSE-QUARANTINED them (06b needs 06 as input → contract fail → 3/19). Fix: `--from 06` → 17/19. **Rule: if the chunk never finished its first 06 pass (missing `data/06.LLM.video-type/*/<id>*conversations.json`), resume `--from 06`, NOT 06b.** (QT4.3/QT5.3 stalled at 06e+ where 06 WAS done, so `--from 06b` was correct there.) Detect by checking for the 06 output before picking the resume stage — don't trust the pass count.
- **CRITICAL — Supabase test project auto-PAUSED after ~1 week idle (free tier).** After an 11-day gap (Jun 25→Jul 6), `vcjzbmtcgmjrvvklzqaq.supabase.co` stopped resolving in DNS entirely (`curl: (6) Could not resolve host`), and `10.EXT.ingest-test.ts` fails with `TypeError: fetch failed` in `deleteTestEmbeddingsBySource`. This blocks stage-10 ingest ONLY — stages 02–09 are all local (files on disk), so processing continues fine. Resolution is USER-ONLY: restore/unpause the project in the Supabase dashboard. Distinguish from a transient blip: general internet works (google 200) but the project subdomain won't resolve. Pending ingest when it's back: QT5 backlog (6 videos, 71→77) + QT6 (87 videos).

### INFIELD POOL DEPLETION (important for future batches): QT5 stage-06 typed only **30/100 infield** (vs QT4's 60) — the literal-"INFIELD"-title daily_evolution videos are now exhausted (only 3 left pre-QT5). QT5 fell back to the next tier (picking-up/nightgame/grocery/daygame) which is mostly coach-narration → 63 typed talking_head. Higher total throughput (71, because talking_head passes ~92%) but lower infield purity (12 infield reached 09). **For QT6+: the daily_evolution infield-footage well is largely spent. To keep doing infield-focused batches, need NEW infield channel sources** (more playing_with_fire / coach_kyle_infield / austen / NL meetingGirlsIRL uploads, or new infield channels added to sources.txt + downloaded). Otherwise future batches will be predominantly talking_head theory.

---

## Phase-2 diarization spike — pyannote-direct (force >=2 speakers) (2026-06-24)
Added `--diarizer pyannote-direct --min-speakers N --max-speakers N --clustering-threshold F` to `04.EXT.diarize`
(loads pyannote/speaker-diarization-3.1 directly, torch.load weights_only=False patch for the 2.6 unpickle block,
converts Annotation→turns, reuses existing assign/resegment). Ran 28 collapse/attribution infield+compilation quarantines through it (04→05→06→09).
- **Collapse eliminated on ALL 28** (every video now diarizes to >=2 speakers; was 1). `min_speakers=2` is the knob.
- **5 recovered to stage 09 (4 ingested)** — e.g. grq-TNERVuA flipped from collapse/reject → 06b **APPROVE** "roles correctly assigned throughout."
- **BUT only ~18% pass outright.** Forcing 2 clusters SEPARATES speakers but doesn't guarantee CORRECT assignment — 06b still rejects when the split mislabels segments. Plan's prediction confirmed: num_speakers alone isn't the full fix.
- **~4 near-misses stuck at the 06h 0.85 gate** (06b-APPROVED, final_conf 0.80–0.84: fO1NVRiSy9s/eFmMa8svM70=0.836). The diarizer raised them but the 0.85 cutoff (unvalidated) is now the blocker, not diarization.
- **Rest still fail on audio quality** (low-transcript hallucination) — diarization can't fix.
- Next levers for a bigger win: clustering-threshold sweep, pyannote community-1, and **coach voice-enrollment (TS-VAD)** — coach is constant across all videos = the structural fix. Needs the Phase-0 ground-truth set to validate the 0.85 threshold + measure DER.
DB after spike: **202 videos, 8046 chunks**.

---

## Stall root-cause audit + two IMPLEMENTED fixes (2026-07-08)
Audited all 191 not-done across QT1–QT7 (ran the runner's real `evaluate_06b_gate` per video, read 06/06h outputs + transcripts). Only ~30/191 (16%) are genuinely-bad content; the rest are recoverable outage-stalls (64) or blocked on **questionable criteria** (97). Two criteria fixes shipped this session:

### Fix 1 — Stage-06 `transcript_confidence.score` prompt reframed (over-blocks infield/compilation)
- **Root cause:** the ≤55 06b gate (`stage06b_flag_low_transcript_quality`) is the single biggest stall — **68 videos, 65 of them infield/compilation**, half clustered at 51–55. The score is a SUBJECTIVE 1–100 LLM judgment (06.LLM.video-type prompt), and the old prompt tanked the whole-video number for diarization/speaker-split, cosmetic punctuation, and short/overlapping infield turns — none of which are ASR word-garbage, and all separately adjudicated downstream (06c/06e/06f/06h + pre-ingest QA). The score is consumed ONLY by the 06b gate (verified) → reworking it is RAG/embedding-safe.
- **Change:** rewrote the rubric (full `ANALYZE_VIDEO_PROMPT` + sampled `ANALYZE_VIDEO_GLOBAL_PROMPT`) to score **% of content that is usable** = words correctly transcribed AND coach-vs-target ROLE roughly right. Penalizes ASR word-garbage (primary) + **role swaps/merges in proportion** (NOT free — coach's words shown as target's still counts); explicitly does NOT penalize punctuation/caps, short/overlapping turns, or one speaker split across multiple IDs when the ROLE is still correct.
- **⚠️ OPEN — threshold is now unanchored (circularity):** `STAGE06B_FLAG_LOW_TRANSCRIPT_SCORE_BLOCK_THRESHOLD=55.0` was implicitly tuned to the OLD prompt's scoring. Changing what the number MEANS unmoors 55. **Did NOT change it.** Must recalibrate empirically when quota's back: re-run the new prompt on known-good passes + a sample of the 68 blocked + a few known-bad, then set the threshold on the rubric's meaning (% usable). Don't trust 55 until then.

### Fix 2 — LLM per-attribution confidence, honored by 06h (infield 0.85-floor over-penalty)
- **Root cause:** 06h did NOT honor per-attribution certainty. It applied a blanket structural discount to collapse-reassigned infield segments — `speaker *= 0.48/0.80/0.95` (`_damage_multiplier`) — keyed on collapse RATE, not on whether the LLM was sure about a given line. So "What's your name?"→coach (obvious) took the same haircut as a genuine guess, dragging videos under the 0.85 floor.
- **Change:** stage 06 now emits `speaker_role_override_confidence` (0–1) per overridden segment (full + chunk prompts, normalize + output plumbing, schema). 06h **honors it directly** as the speaker base and skips the ambiguity multiplier (`s_mult=1.0`) when present; **legacy artifacts without it fall back to the old floor×multiplier (backward-compatible, fail-closed).** 06c drops the confidence when it rewrites an override (stale → 06h uses floor). Tests: `TestHonoredOverrideConfidence` (3) in `test_06h_confidence.py` — all pass. (2 pre-existing `TestQualityOverloadGate` failures are the stale 0.48/0.33-vs-0.50/0.34 tests, unrelated.)
- **Only takes effect on stage-06 RE-RUN** — existing 06h artifacts/chunks lack the field. To benefit, re-run infield 06→06h. User will validate label quality once many infield videos exist; for now the directive is "best LLM guess" (trust it, calibrate later — same calibration question as the 0.85 floor, now concrete).

### Also found (NOT yet fixed) — RAG ignores the confidence it's given
- The "where are the mistakes" signal DOES reach the DB: 06f/06h write per-chunk `chunk_confidence_score`/`damage_score`/`contains_repaired_text` + `damaged_segment_ids`/`damage_segment_windows` into `metadata jsonb` (both ingest scripts), and the RPC returns it.
- BUT `retrieval.ts:404` reads `metadata.chunkConfidence` (camelCase) while ingest writes `chunk_confidence_score` (snake_case) → **the confidence-downrank is DEAD CODE (field-name mismatch)**, and the localized damage fields are never read. Sub-0.3 chunks are dropped at stage 09 (worst never ingested). Fix pending user go-ahead.

### Empirical recheck of the 68 low-transcript-blocked (2026-07-09) — BOTH thresholds set from data
Re-ran the 68 through 06→09 with the reworked prompt (`docs/pipeline/batches/LOWTX.{1..4}.txt`, chunks of 17). **The full-68 run does NOT fit one quota window** — it outaged twice mid-run, writing fake `fail_closed` REJECTs (16 the first time) that masqueraded as quality quarantines. LESSON: always scrub `out of extra usage|Verification LLM failed|fail_closed` artifacts before reading recovery numbers, or you'll misread outage as rejection (I did, briefly). Scrub by YouTube ID via Python — the shell `grep -F "$id"` breaks on ids with leading `-`.
- **Fix 1 threshold RESOLVED: `STAGE06B_FLAG_LOW_TRANSCRIPT_SCORE_BLOCK_THRESHOLD` 55→35.** Reading the actual transcripts of the 9 lowest blocked videos showed the old LLM reasoning *catastrophized* ("severely garbled/cannot follow" for transcripts that read fine — the prose described speaker-collapse, not word-garble). Genuine word-garble sits ≤~25 (party-chaos `JzYOhgT1MEM` new score 25) vs followable ≥38. 35 = fail-closed backstop for pervasive whole-video garble only; collapse now routes to 06h (its proper owner). New prompt scores are HONEST — it did not inflate (`OntdnFF7HSM` stayed 42 for real role-merge; garble stayed 25) — so the threshold isn't gaming the gate.
- **Fix 3 NEW: 06h `VIDEO_GATE_THRESHOLD` (confidence_model.py) 0.85→0.80.** With Fix 2's honored confidence live, confidently-reassigned collapses **self-sorted to 0.92–0.99** (e.g. `Q1EKi27lV1M` 0.935 — the "one target split across 3 IDs, role intact" case; `1sGggEyTJTE`/`a5pPmkB-A7I` 0.938), leaving a clean residual. Tier audit of the 14 videos in 0.64–0.85: everything **≥0.80 is 64–87% high-tier** (good), below 0.80 trends to junk (down to 4%). 0.80 recovers 7 good, blocks 7 poor. This is the evidence the old learnings said the 0.85 floor needed — Fix 2 made it obtainable without a human eval set (06h now measures the LLM's own trusted certainty).
- **Recovery on the 68 — FINAL: 34/68 fully at stage 09** (from a gate that previously passed 0/68). Breakdown of the other 34: 7 correctly held at 06h <0.80 (genuinely poor, 4–40% high-tier); 2 caught by a REAL 06b severe-FLAG (major_other / conversation_flags≥4 — a different, legit quality check, not the transcript gate); ~4 real raw-collapse-unrepaired (Phase-2 diarization); remaining ~21 pre-06h are a MIX of genuinely-blocked + still outage-stranded (the full 68 needs 3–4 quota windows — it outaged repeatedly; those need one more clean resume to separate real-block from stranded).
- **Operational lessons this run:** (1) the 68 collapse-heavy infield do NOT fit one quota window — process in ~15–20 chunks. (2) Rapid concurrent runner launches DEGRADE the flaky preflight (120s timeouts) — the QT4 lesson holds: launch ONE fresh run at a time, spaced out; a fresh single launch clears preflight first try. (3) `--from 06h` triggers an upstream 06b gate REPLAY, so real 06b severe-FLAGs re-catch there. RESUME the remainder: scrub outage artifacts (Python, by YouTube ID), `rm data/validation/quarantine/LOWTX*.json`, then ONE `pipeline-runner LOWTX.N --from 06b --parallel 5` at a time.

## CRITICAL cron/HF-token gotcha — stage 04 diarize silently fails without HF_TOKEN (2026-07-16)
Running the pipeline via a **cron guard** (auto-restart across machine reboots) exposed a hidden env dependency: **stage 04 diarize requires `HF_TOKEN`** (`04.EXT.diarize:_get_hf_token` reads env only: HF_TOKEN/HUGGINGFACE_TOKEN/WHISPERX_HF_TOKEN → else `SystemExit("Diarization requires HF token")`). An interactive shell has it (profile-sourced) but **cron's minimal env does NOT**, so guard-launched EXT runs diarized `processed=0` for every un-cached video and marched on (ext_chunk uses `|| true`), even printing a premature "EXT-ALL COMPLETE". Symptom: videos pile up with stage 03 (align) but no stage 04 (diarize) → never reach stage 05 → never enter LLM. In QT8 this stranded **240/581** videos (stage02=578, stage03=578, **stage04=338**, stage05=338).
- **Fix:** persist the token to a local, gitignored, chmod-600 file `~/.daygame-pipeline.env` (`export HF_TOKEN=...`, outside the repo tree so it can't be committed) and `source` it at the top of `qt8-pipeline.sh`. Now cron-launched diarize gets the token. Verified: diarize resumed processing (chunk 18+, "DONE ...22.7s", zero "requires HF token").
- **General lesson: any script run from cron must not assume the interactive shell env.** Anything sourced from `~/.bashrc`/`.profile`/`.env.local` (HF_TOKEN, PATH additions, nvm) is absent under cron. Load required secrets/PATH explicitly inside the script.
- Also: `ext_chunk`'s `|| true` (added so one bad stage doesn't abort the whole sweep) MASKS systematic stage failures like this. When EXT "completes" but stage-N counts drop sharply between consecutive stages, a stage is silently failing — check per-stage `find` counts, not the "COMPLETE" marker.

## Self-polluting glob stalled the QT8 driver after days (2026-07-23)
The `qt8-pipeline.sh` LLM driver built its chunk list with `CHUNKS=( $(ls docs/pipeline/batches/QT8.*.txt | sed 's#.*/QT8\.([0-9]+)\.txt#\1#') )`. But `llm_chunk` WRITES `docs/pipeline/batches/QT8.<N>.inflight.txt` per chunk — which ALSO matches `QT8.*.txt`. The sed only rewrote the numeric ones, so `.inflight.txt` files entered CHUNKS verbatim as bogus "chunk ids" (full paths). As inflight files accumulated (one per processed chunk), `$n` became a path → `out="…/QT8.$n.inflight.txt"` produced `QT8.docs/pipeline/batches/QT8.1.inflight.txt.inflight.txt` (No such file), sweeps found no real work, and the driver spun `LLM sweep NNNN idle, waiting 5m for EXT` forever (sweep 1582). It ran fine for days until enough inflight files existed to break it. **Fix:** filter the glob to numeric-only — `... | grep -E '/QT8\.[0-9]+\.txt$' | sed ...`. Lesson: a script that WRITES manifest files next to the ones it GLOBS will eventually eat its own output — scope the glob precisely (or write derived files to a different dir).
Also fixed same session: (a) `local n="$1" src="…$n…"` cross-ref fails under `set -u` unless the driver's global `n` happens to match — split into separate `local` statements; (b) `inflight_manifest` must only include stage-05-ready videos so a stage-02 reject (never reaches 05) doesn't make `chunk_all_at_05` skip its whole chunk and strand chunk-mates; (c) mark such rejects settled; (d) LLM driver breaks when a sweep finds no ready work AND `EXT-ALL COMPLETE` is present (don't wait-for-EXT forever).

---

## Scenario-Engine Dataset Extraction (2026-07-25) — corpus → scenario moments

`scripts/scenario-engine/engine.ts` (single entrypoint: extract | split | distill | test | report; state in `data/scenario-mining/engine-state.json`, human report `REPORT.md`). Turns stage-09 chunks (PASS/REVIEW-screened via ingest-qa verdicts) into career-response + cold-read "moments" with free labels (coach's actual next line, closed/fizzled outcome). Pure logic in `lib/extract.ts` (unit-tested, `tests/unit/scenario-engine/`).

Gotchas found while building (all verified in data):
- **Duplicate footage needs shingle CONTAINMENT, not prefix-hash or Jaccard.** Same clip republished in different-length videos: symmetric Jaccard on the known dupe pair (e2dLEB-AwmA=7taia9-erqA) was only 0.22; 5-gram containment 0.61. Threshold 0.5 chosen empirically: real cross-video dupes ≥0.51, densest legitimate overlap 0.48 (jeFPE9bzjow = one scripted opener run on 7 DIFFERENT girls — a compilation, must NOT dedupe; hence also never dedupe same-videoId pairs). 8 dupes removed of 246 convs.
- **"Girl: I'm a ..." regex needs an occupational-suffix constraint + blocklist** ("I'm a devil/virgin/ambivert" FPs) and misses coach-initiated reveals entirely — match both directions.
- **`you give (me|off)` needs a vibes-noun anchor** — matched "if you give me a fake name". "you seem cool/nice" needs a pleasantry blocklist (compliments, not committed reads).
- **Claude CLI headless from the Next dev server**: `ANTHROPIC_API_KEY` in `.env.local` overrides the CLI's OAuth and breaks it, and an open stdin pipe stalls it 3s — `src/shared/claudeHeadless.ts` strips the env var and closes stdin. Engine-from-shell worked while the same call from the dev server failed; test in BOTH contexts.

### Engine validation results (2026-07-25, held-out 30%)
Metrics in `data/scenario-mining/REPORT.md`. Key result: **nice-guy distractors NEVER ranked #1 (29/29)** — the "too polite" judge failure mode is measurably absent. Real-line top-1 ~62-63% (chance 25%); most misses prefer a real coach line from ANOTHER situation (context softness, not taste failure); coach-swap separation 2.0 (orig 4.3 vs swapped 2.3) shows context sensitivity. **Outcome-prediction test is currently uninformative**: held-out labeled set was 100% closed (degenerate base rate) and labels are noisy (close regex missed "SMS you" — fixed, needs re-extract). POV-check (`principles/career.pov-check.md`): adversarial her-side re-read demoted 4 of 7 distilled moves to correlated-not-causal; core reframe = job-reveal is a READ point (her early reciprocity predicts outcome), not a leverage point. Judge/sim design should score calibration-to-her-state over move-execution.
