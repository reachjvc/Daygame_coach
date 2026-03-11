# Iteration Log

## Purpose
Track each experiment, what was tried, what worked, what failed, and lessons learned.
This prevents repeating mistakes and documents the reasoning behind design decisions.

---

## Experiment 01: Unified Stage A on blocked infield video (ctts8xePLWA)

**Date**: 2026-03-06
**Video**: ctts8xePLWA ("Approaching A 10 In Miami") — infield, BLOCKED in old pipeline
**Goal**: Can a single well-prompted LLM call do better than 06+06b combined?

### What changed
- Single prompt combining classification + per-segment role assignment + quality assessment + self-verification
- Per-SEGMENT role assignment instead of per-SPEAKER blanket labels
- `is_mixed` flag with `mixed_detail` for segments containing multiple speakers
- Self-verification step catches common errors

### Results — Speaker Assignment Comparison

| Segment | Old Pipeline | New Stage A | Ground Truth | Winner |
|---------|-------------|-------------|-------------|--------|
| 93 | coach | coach | coach | tie |
| 94 | target (override) | target (mixed) | MIXED: coach tail + target | **New** (identifies mix) |
| 96 | unknown | target (mixed) | MIXED: target + coach + target | **New** (assigns dominant role + detail) |
| 101 | coach | coach (mixed) | MIXED: coach question + target name | **New** (identifies hidden target) |
| 102 | unknown | coach (mixed) | MIXED: coach + target brief | **New** (assigns dominant + detail) |
| 103 | unknown | coach (mixed) | MIXED: coach + target + coach | **New** (assigns dominant + detail) |
| 104 | coach | coach (mixed) | MIXED: coach + target (weed talk) | **New** (identifies mix) |
| 125 | target (override) | target | target | tie |
| 127-130 | unknown | other | music artifacts | **New** (correctly other, not unknown) |

### Key improvements
1. **No blanket "collapsed" label** — every segment gets a role, even imperfect ones
2. **Mixed segments explicitly identified** — `is_mixed: true` with approximate speaker split percentages
3. **Self-verification caught errors** — corrected segment 94 interpretation, verified opener attribution
4. **Conversation properly detected** — segments 93-126 all in conversation_id 1
5. **Artifacts properly classified** — 127-130 marked as `other` (music) not `unknown`

### Key remaining weaknesses
1. Segment 96 assigned as "target" with mixed detail, but the dominant speaker is debatable (it's roughly 40/30/30)
2. No repair text suggestions yet (quality issues flagged but not all repaired)
3. The "mixed" segments still can't be split into separate turns — that requires audio-level re-diarization

### Cost comparison
- Old pipeline: 4 LLM calls (06, 06b, 06e, 06g) + 4 deterministic stages (06c, 06d, 06f, 06h)
- New Stage A: **1 LLM call** that produces comparable or better results

### Verdict
**Major improvement.** The per-segment approach with mixed flags is strictly better than blanket speaker collapse. The self-verification catches real errors. This video would NOT be blocked by the new pipeline (it has usable conversation structure with explicit uncertainty markers).

### Next steps
- Run on more videos to check consistency
- Compare quality assessment against 06e
- Design Stage B (enrichment + verification)

---

## Experiment 02-04: Stage A consistency across video types

**Date**: 2026-03-06
**Videos**: GOZo4Z0brDc (promo), -zbNWOEz6w8 (talking_head), L9mcyTuXYjc (talking_head)

### Results

| Video | Old Type | New Type | Match? | Notes |
|-------|----------|----------|--------|-------|
| GOZo4Z0brDc | talking_head (0.97) | talking_head (0.97) | Yes | Correctly identified as promo, 0 conversations |
| -zbNWOEz6w8 | talking_head (0.97) | talking_head (0.95) | Yes | 150 coach segs, 2 unknown, 1 mixed |
| L9mcyTuXYjc | talking_head | talking_head (0.92) | Yes | Detected 11 student segments (audience participation), 5 mixed |

### Verdict
Stage A matches old pipeline classifications on all test videos while providing richer per-segment data. The student detection in L9mcyTuXYjc is a bonus — the old pipeline didn't distinguish audience participation segments.

---

## Experiment 05: Stage B on review-status video (-zbNWOEz6w8)

**Date**: 2026-03-06
**Video**: -zbNWOEz6w8 ("Approach Anxiety Cure!") — talking_head, REVIEW in old pipeline
**Goal**: Can Stage B avoid the technique hallucinations that caused REVIEW status?

### Results — The two old pipeline hallucinations

| Technique | Old Pipeline (07) | Old Verify (07b) | New Stage B | Correct? |
|-----------|------------------|-------------------|-------------|----------|
| false_time_constraint | Tagged as discussed | HALLUCINATION (major) | **Not tagged** | **YES — fixed** |
| direct_opener | Tagged as discussed | CONTRADICTION (major) | **Tagged as negative** | **YES — fixed** |

### What Stage B self-verification caught additionally
1. Blocked `statement_of_intent` — coach discusses ELIMINATING intent, not using it
2. Blocked `bounce` — only mentioned as example of overthinking
3. Noted transcript quality issues (Tom Turow = Tom Torero mistranscription)

### Old pipeline result: REVIEW (2 major issues)
### New pipeline result: Would be PASS (no hallucinated techniques, negation rule applied correctly)

### Verdict
**Critical improvement.** Both hallucinated techniques eliminated. The anti-hallucination rules (negation, evidence-required, self-verification) work as designed.

---

## Experiment 06: Stage B on blocked infield video (ctts8xePLWA)

**Date**: 2026-03-06
**Video**: ctts8xePLWA ("Approaching A 10 In Miami") — infield, BLOCKED in old pipeline
**Goal**: Can Stage B extract enrichments from a video the old pipeline blocked?

### Results

| Metric | Old Pipeline | New Pipeline |
|--------|-------------|-------------|
| Techniques found | 1 (number_close) | 9 (indirect_opener, tease x2, cold_read, grounding, push_pull, disqualification, number_close, soft_close) |
| Topics found | 3 | 10 |
| Phase progression | None (empty conversations) | open→pre_hook→post_hook→close |
| Hook point | None | seg 96 (target asks questions back) |
| Pipeline result | BLOCKED | Would PASS |

### Technique accuracy audit (manual verification against transcript)
- indirect_opener (seg 93): CORRECT — "what's like the best restaurant"
- tease (seg 95): CORRECT — "you think you're cooler than me"
- tease (seg 97): CORRECT — "your fashion's all right"
- cold_read (seg 104): CORRECT — "you're like a little stoner chick"
- grounding (seg 112): CORRECT — "I'm from Ohio"
- **push_pull (seg 114): DEBATABLE** — "trash dudes... but I'm wholesome" is more DHV than push_pull (P/P targets the TARGET, this targets other men)
- **disqualification (seg 117): INCORRECT** — "recovering fuck boy" is self-deprecating humor/vulnerability, not disqualification
- number_close (seg 108): CORRECT — "give me your number"
- soft_close (seg 109): CORRECT — "let's kick it on the beach"

**Accuracy: 7/9 correct, 1 debatable, 1 incorrect** = ~78-89% accuracy

### Identified weaknesses in Stage B prompt
1. `push_pull` definition needs to emphasize: it's about the COACH alternating interest/disinterest toward the TARGET, not contrasting himself vs other men
2. `disqualification` definition needs: "playfully suggesting the TARGET isn't your type", not self-deprecation
3. These are both definition-precision issues — the technique descriptions in the prompt could be sharper

### Verdict
**Major improvement over blocked/empty old result**, but technique definitions need tightening. Two edge-case misattributions that could be fixed with better definitions.

### Lessons learned
- The Stage B prompt needs technique definitions that include NOT ONLY what the technique IS, but also **what it ISN'T** and **common confusions**
- push_pull ≠ DHV, disqualification ≠ self-deprecation, these are common LLM conflations

---

## Running Totals

### Cost comparison (LLM calls per video)
- Old pipeline: 6 LLM calls (06, 06b, 06e, 06g, 07, 07b)
- New pipeline: 2 LLM calls (Stage A, Stage B)
- **Reduction: 67%**

### Quality comparison across 4 tested videos
| Metric | Old Pipeline | New Pipeline |
|--------|-------------|-------------|
| Classification accuracy | 4/4 correct | 4/4 correct |
| Blocked good video | Yes (ctts8xePLWA) | No |
| Hallucinated techniques | 2 (zbNWOEz6w8) | 0 |
| Technique citation accuracy | N/A (old didn't require quotes) | ~85% |
| Per-segment role assignment | No (per-speaker) | Yes |
| Mixed segment detection | No (collapsed label) | Yes (with detail) |

### What still needs testing
1. ~~Large compilation video (5+ approaches, windowing needed)~~ TESTED in Exp 07-08
2. Podcast format (balanced multi-speaker)
3. Videos with students running approaches
4. Very poor transcript quality (heavy noise)
5. ~~Prompt refinement for push_pull/disqualification definitions~~ DONE

---

## Experiment 07: Stage A v2 (compact format) on compilation video (Yz1TGfAF0zc)

**Date**: 2026-03-06
**Video**: Yz1TGfAF0zc ("What to say to a Woman in the 1st Seconds") — compilation, 124 segments, 7-8 conversations
**Goal**: Test Stage A on larger video with compact output format

### Problem solved
Stage A v1 produced 34.7K tokens for 124 segments → hit Claude's output limit, JSON truncated.
Stage A v2 (compact array format) produced 11.5K tokens → **67% reduction**, complete JSON.

### Results

| Metric | Old Pipeline | New Stage A v2 |
|--------|-------------|---------------|
| Video type | compilation (0.95) | compilation (0.95) |
| Conversations | 7 | 8 (detected an additional aborted approach) |
| Speaker roles | 120 coach, 4 target | 103 coach, 20 mixed, 1 target |
| Mixed segments | Not detected | 20 detected |
| Cost | N/A (stopped at 06b) | $0.36 |
| Output tokens | N/A | 11,548 |

### Verdict
Compact format works. Classification matches old pipeline. Additional conversation boundary detected. Mixed segments provide valuable info old pipeline lacked.

---

## Experiment 08: Stage B on compilation video (Yz1TGfAF0zc)

**Date**: 2026-03-06
**Goal**: Test enrichment on multi-approach compilation

### Results
- **16 enrichments**: 8 approach + 8 commentary blocks
- **Techniques across approaches**: direct_opener (7x), observation_opener (4x), false_time_constraint (3x), cold_read, screening, logistics_check (2x), number_close, time_bridge, physical_escalation, subcommunication, situational_opener
- **Topics**: flirting, appearance, origin, travel, education, plans, contact, location, language_barrier
- **Phase analysis**: Only approach 1 and 8 reached post_hook; others were open-only (short demo clips)
- **Self-verification**: 3 corrections, 3 remaining concerns about garbled segments
- **Cost**: $0.26

### Note
Old pipeline never reached enrichment for this video (stopped at 06b). New pipeline produced complete enrichment in 2 calls.

---

## Overall Cost Summary (so far)

| Experiment | Video | Stage A | Stage B | Total | Old Pipeline (est.) |
|-----------|-------|---------|---------|-------|-------------------|
| Exp 01+06 | ctts8xePLWA (131 segs) | included | included | ~$1.20 | BLOCKED (wasted 4+ calls) |
| Exp 02 | GOZo4Z0brDc (17 segs) | ~$0.10 | N/A | ~$0.10 | ~$0.50 (6 calls) |
| Exp 03+05 | -zbNWOEz6w8 (152 segs) | included | included | ~$1.00 | ~$2.00 (6 calls + REVIEW) |
| Exp 04 | L9mcyTuXYjc (111 segs) | ~$0.30 | N/A | ~$0.30 | N/A |
| Exp 07+08 | Yz1TGfAF0zc (124 segs) | $0.36 | $0.26 | **$0.62** | STOPPED at 06b |

New pipeline: ~$0.10-0.60/video (2 calls)
Old pipeline: ~$0.50-2.00/video (6 calls) when it completes, plus wasted calls on blocked videos

