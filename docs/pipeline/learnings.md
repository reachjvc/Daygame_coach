# Pipeline Learnings

Running log of discoveries, failures, and fixes found while processing batches through the pipeline. Read this before doing pipeline work.

## Philosophy

Quality output is the end goal. Every pipeline decision should be evaluated against: "does this produce better training data?" Not speed, not coverage — quality. When uncertain, ask the user. Getting 50 perfect videos is worth more than 500 mediocre ones.

---

## 2026-05-30 — QUALITY-TEST.1 batch created

**Batch**: `docs/pipeline/batches/QUALITY-TEST.1.txt` (100 videos, 21 producers)
**Purpose**: Validate full pipeline (stages 02→10) output quality before scaling.

### Pre-pipeline state
- 1,610 unique downloaded videos, all with correct WAV format (pcm_s16le, 16kHz, mono)
- 334 previously transcribed (stage 02), none from this batch
- 224 videos blocked by YouTube age restriction (stale cookies since 2026-03-07)

### Download repair (same day)
- **39 videos** had downloaded audio but missing WAV conversion — fixed with standalone FFmpeg loop
- Root cause: `ffmpeg` consumes stdin in pipe loops, corrupting null-delimited paths. Fix: redirect `</dev/null` on ffmpeg calls
- **59 GB duplicates** removed — yt-dlp channel downloads create nested grouping folders that duplicate per-video folders. Cleaned from stages 01-07b
- **75 cross-producer duplicates** removed — same video in multiple playlists. Kept in first producer alphabetically, added IDs to removed producer's archive to prevent re-download
- Disabled channel URLs in `sources.txt` to prevent re-creation

### Key gotcha
- `find -print0 | while read` + any tool that reads stdin (ffmpeg, grep) = path corruption. Always `</dev/null` on the inner tool
- YouTube IDs starting with `-` break `grep -q "$id"` — use `grep -F -- "$id"` or awk
- **clean16k gap**: stages 03-05 require `*.audio.asr.clean16k.wav` but nothing in stages 01-02 creates it. Origin unknown (possibly a removed denoising step). Same format as raw16k, slightly different content. For new videos: copy raw16k → clean16k. Pipeline runs fine on raw audio.
- Stage 02: 3/100 correctly rejected (hallucination/empty). 1 borderline (`6fHFpEjahnc`, 33% hallucination) passed — current threshold too lenient for very short videos
- **Stage 06 timeout**: `TIMEOUT_SECONDS_PER_SEGMENT=1.2` too low for infield videos with 400-500 segments. LLM needs more time for multi-speaker analysis. Bumped to 2.0 (gives ~18min for 500-seg videos, under 30min max). Infield consistently takes 2-3x longer than talking_head per segment.
- **AVN Expo compilation**: 32 conversations tripped `infield_conversation_count_extreme` gate (threshold=12). Correctly rejected — it's a compilation, not single infield. Excluded from batch.
- **Use pipeline-runner, not individual scripts.** `./pipeline-runner <manifest> --parallel 10 --from <stage>` runs LLM stages concurrently. Calling scripts individually = sequential = 3-5x slower. Pipeline-runner also handles retry, gating, and resume.

---

## Pipeline Output Assessment (pre-QUALITY-TEST.1 run)

### Attrition is catastrophic
334 videos enter stage 02 → **57 reach stage 09 chunks** (17% survival). Drop points:
- 02→05: ~25% lost (diarization/alignment failures)
- 06→07: **51% drop** — stage 07 content extraction is the bottleneck
- 07→07b: 11% drop (hallucinated evidence, thin support)
- 07b→09: only 57 of 145 verified videos chunked

### Infield content = zero output
All infield videos (live approaches — the most valuable content) drop at stage 07. Diarization fails → can't detect open/hook/investment phases → LLM can't extract structure → video dropped. Only talking_head (monologue) survives.

### Confidence is computed late, needed early
06h computes segment confidence but stage 06 decisions are already made without it. Evidence allowlisting (ANCHOR_OK / CONTEXT_ONLY / EVIDENCE_EXCLUDED) is binary, not graduated. No per-enrichment confidence — only per-segment.

### Stage 07 hallucination risk
LLM can cite non-ANCHOR_OK segments. Post-hoc filtering drops evidence but enrichment claim stays. No mechanism to downgrade enrichment confidence when evidence is excluded.

### What "good" looks like (evaluation criteria for QUALITY-TEST.1)
1. **Transcription accuracy** (02): spot-check 10 videos against audio
2. **Speaker identification** (04/06): is coach always coach? Any role swaps?
3. **Content extraction** (07): are techniques real? Evidence grounded in transcript?
4. **Confidence honesty** (06h): do "high confidence" segments deserve it?
5. **Survival rate**: target >70% of batch reaching stage 07 (currently 68%)
6. **Segment quality**: >90% of segments in surviving videos should be high-confidence

### Key question before running
Should we fix the infield dropout problem first, or run talking_head only and iterate?
