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
| 3 | Heavy-repair reliance | `low_quality_total_ratio >= 0.30` (rescued by 06e, not raw-clean) | ADVISORY | Husc_BTKyF4 0.40; WEe2aq3qKmc 0.39 |
| 5 | Compilation (cross-clip boundaries) | 06h `video_type == compilation` | ADVISORY | 1Ottjy_7jzk; VRsmSr3-EBU |
| — | Unverifiable (missing 06h report) | 06h signals absent/unparseable | **REVIEW** (fail-closed) | — |

**Key fix vs first draft:** #1 keys off FINAL high-tier ratio, NOT raw `lq_ratio` — a short video with high raw lq that 06e repaired to ~100% high (e.g. xfVhG9qwB38: 40 segs, lq 0.35, 100% high) is NOT blocked. Earlier "EogjdB3msWA = type mismatch" was wrong: 06h/09 agree (talking_head); the real signal is the LOW 06-stage confidence (0.70), so the rule keys off that.

**Validated on the 30 new QT1 passes:** BLOCK 1 (6fHFpEjahnc), REVIEW 2 (EogjdB3msWA, H-_FULmTJXc), ADVISORY 10, PASS 17 — matches manual review exactly.

Rule of thumb: the headline number ("49/100 done") is misleading until screened — "done at 09" != "ingest-quality".

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
