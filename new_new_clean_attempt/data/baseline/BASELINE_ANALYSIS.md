# Baseline Analysis — 5 Selected Videos

## Video Selection

| # | YouTube ID | Title | Type | Pipeline Result | Why Selected |
|---|-----------|-------|------|----------------|-------------|
| 1 | GOZo4Z0brDc | 5 RAW Daygame Infields | talking_head (promo) | PASS | 36-sec ad that passed; zero training value; 6 LLM calls wasted |
| 2 | ctts8xePLWA | Approaching A 10 In Miami | infield | BLOCK | Diarization collapse → all-or-nothing speaker label → 07b LLM returned nothing → fail-closed |
| 3 | L9mcyTuXYjc | Advice For Your First Cold Approach EVER | talking_head | PASS | Clean talking head, good baseline for comparison |
| 4 | -zbNWOEz6w8 | Approach Anxiety Cure! The Final Solution! | talking_head (w/ infield refs) | REVIEW | Good transcript quality, but Stage 07 hallucinated 2 technique tags |
| 5 | JKWRj2hwbT4 | How to Fix Rejection in 5 minutes | compilation | BLOCK | TBD - need to analyze |

## Deep Analysis

### Video 1: GOZo4Z0brDc (PASS — but zero value)
- **Content**: 36-second promotional clip. One speaker, no approaches, just an ad for a different video.
- **Pipeline accuracy**: Classification correct (talking_head, 0.97 confidence). But wasted 6 LLM calls.
- **Enrichment quality**: Tagged `physical_escalation` because coach mentions "daygame make out" — but that's in a DIFFERENT video he's advertising. 07b flagged this as minor evidence_alignment_mismatch but still PASSED.
- **Key takeaway**: Short promos should be filtered before entering LLM stages. Also, technique tags should require the technique to be TAUGHT/DEMONSTRATED in THIS video, not merely mentioned.

### Video 2: ctts8xePLWA (BLOCKED — but has real value)
- **Content**: ~6 min commentary + genuine 2.5 min infield approach + music outro. The approach is real and complete (indirect open → banter → number close).
- **Root cause of block**:
  1. Diarization produced 2 speaker IDs. Target has short responses interleaved in coach's speech.
  2. Stage 06 saw ~5 of 9 SPEAKER_01 segments had mixed content → declared ENTIRE speaker "collapsed" (0.3 confidence)
  3. This meant NO segments got proper target role → enrichment couldn't build conversation turns → conversations array empty
  4. Stage 07b LLM returned no output (likely because empty conversations) → fail-closed BLOCK
- **Was block correct?**: Technically yes (no usable turn structure). But the approach-level data IS valuable. The pipeline threw out real content because of a diarization limitation.
- **Key takeaway**: Per-segment role assignment (not per-speaker blanket labels) would preserve clean segments. The "collapsed" label is too aggressive.

### Video 3: -zbNWOEz6w8 (REVIEW — easily fixable)
- **Content**: Coaching monologue about approach anxiety. High-quality content, 152 segments, clean transcript (150/152 high confidence).
- **Root cause of review**: Stage 07 hallucinated 2 technique tags:
  1. `false_time_constraint` — LLM confused "eliminating intent" with "false time constraint" (completely different concepts)
  2. `direct_opener` — coach explicitly says DON'T do direct openers, but LLM tagged it as direct_opener anyway
- **07b caught both correctly** — true positives, properly flagged as major issues
- **Key takeaway**: Stage 07 needs better guardrails against technique hallucination. Anti-patterns ("this is NOT X") and few-shot examples would help. The fix is in the prompting.

## Error Taxonomy (from 3 videos)

| Error Type | Example | Root Cause | Fix Direction |
|-----------|---------|-----------|--------------|
| Wasted compute | 36-sec promo gets 6 LLM calls | No pre-filtering | Duration/content gate before LLM stages |
| Blanket speaker collapse | SPEAKER_01 declared "collapsed" entirely | Per-speaker not per-segment role assignment | Per-segment role decisions |
| Technique hallucination | "eliminating intent" → false_time_constraint | Loose concept mapping | Few-shot examples, anti-patterns in prompt |
| Technique inversion | "DON'T do direct openers" → direct_opener tag | LLM ignoring negation | Explicit "if coach says NOT to do X, do not tag X" rule |
| Weak evidence passed | "make out" in different video → physical_escalation | No "taught in THIS video" requirement | Stricter evidence rules |
| Fail-closed on infra error | 07b LLM returned nothing → BLOCK | No retry for empty responses | Distinguish infra failure from quality failure |
