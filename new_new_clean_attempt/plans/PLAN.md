# New Pipeline Design Plan

## Status: Phase 5 (End-to-End Comparison) — VALIDATED on 5+ videos

## Problem Statement

Current pipeline: 12 stages (6 LLM calls), expensive, produces errors that cascade. Key pain points:
- **6 separate LLM calls** per video (06, 06b, 06e, 06g, 07, 07b) — costly
- **"Do then verify" pattern repeated twice** — 06→06b verifies, 07→07b verifies
- **Diarization artifacts are #1 error source** — within-segment speaker bleed, misattributions
- **Verification catches errors but can't always fix them** — quarantines ~40% of videos
- **Technique hallucination** — Stage 07 maps concepts to wrong techniques

## New Pipeline Architecture

### Stage A: Unified Classification (replaces 06 + 06b + 06e + 06g)
**1 LLM call** that performs:
1. Video type classification (infield/compilation/talking_head/podcast)
2. Per-SEGMENT speaker role assignment (not per-speaker blanket labels)
3. Mixed-speaker segment detection with detail
4. Conversation boundary detection
5. Transcript quality assessment per segment
6. Self-verification

Key innovations:
- Per-segment roles → no "collapsed" speaker label that kills downstream analysis
- `is_mixed` flag with approximate speaker split percentages → preserves information
- Compact array output format → handles 500+ segments without hitting output limits
- Self-verification step catches common errors before they propagate

### Stage B: Unified Enrichment (replaces 07 + 07b)
**1 LLM call** that performs:
1. Technique extraction with evidence (segment ID + exact quote)
2. Topic identification
3. Phase analysis (for approaches)
4. Hook point and investment level detection
5. Anti-hallucination self-verification

Key innovations:
- **Negation rule**: "Coach says NOT to do X" → `techniques_discussed_negatively`, not a positive tag
- **This-video rule**: technique mentioned for a DIFFERENT video → not tagged here
- **Evidence-required rule**: every claim must cite segment + quote
- **Evidence strength**: `demonstrated` vs `taught` vs `mention` distinguishes depth
- **Technique disambiguation**: push_pull ≠ DHV, disqualification ≠ self-deprecation (with explicit notes in taxonomy)

### Deterministic Cleanup (between Stage A and B)
- Apply quality repairs from Stage A
- Compute confidence bands (simplified from 06h)
- Pre-filter: skip Stage B for very short promos (<60 seconds, 0 conversations)

## Results (Experiments 01-08)

### Classification Quality
| Video | Type | Old Pipeline | New Pipeline | Winner |
|-------|------|-------------|-------------|--------|
| ctts8xePLWA | infield | BLOCKED (speaker collapse) | Passed with mixed flags | **New** |
| GOZo4Z0brDc | talking_head | Passed | Passed (identical) | Tie |
| -zbNWOEz6w8 | talking_head | Passed | Passed (identical) | Tie |
| L9mcyTuXYjc | talking_head | Passed | Passed + student detection | **New** |
| Yz1TGfAF0zc | compilation | Stopped at 06b | Full classification + 8 convs | **New** |

### Enrichment Quality
| Video | Old Pipeline | New Pipeline | Winner |
|-------|-------------|-------------|--------|
| ctts8xePLWA | 1 technique, BLOCKED | 9 techniques with evidence | **New** (dramatically) |
| -zbNWOEz6w8 | 2 hallucinated techniques → REVIEW | 0 hallucinations, negation rule works | **New** |
| Yz1TGfAF0zc | Never reached enrichment | 16 enrichments, 8 approaches | **New** |

### Cost
| Video | Old Pipeline (est.) | New Pipeline | Savings |
|-------|-------------------|-------------|---------|
| Small video (17 segs) | ~$0.50 | ~$0.10 | 80% |
| Medium video (130 segs) | ~$1.50 | ~$0.60 | 60% |
| Large video (150 segs) | ~$2.00 | ~$1.00 | 50% |

## Known Limitations

1. **Technique accuracy ~85%**: 2 of 9 techniques debatable on one video (push_pull, disqualification). Improved with better definitions but not perfect.
2. **Mixed segments can't be split**: Per-segment roles + mixed flags are much better than old pipeline, but actual speaker separation still requires audio-level re-diarization.
3. **Very large videos (500+ segments)**: Need to test windowing. Stage A compact format should handle it, but Stage B may need chunking.
4. **No few-shot examples yet**: Prompt quality could be further improved with real data examples.

## What's Left

### Phase 6: Expand Test Set (NEXT)
- Test on 10+ more videos across all types
- Find failure modes
- Iterate on prompt

### Phase 7: Pipeline Runner
- Write a new `run_new_pipeline.sh` that chains Stage A → cleanup → Stage B
- Support manifest-driven batching
- Support parallel execution

### Phase 8: Production Integration
- Schema alignment with existing downstream consumers (stage 09 chunking)
- Migration path from old pipeline data
- Logging and monitoring

## Files

```
new_new_clean_attempt/
├── plans/PLAN.md (this file)
├── logs/iteration-log.md (detailed experiment log)
├── prompts/
│   ├── stage_a_classify.prompt.md (Stage A prompt)
│   └── stage_b_enrich.prompt.md (Stage B prompt)
├── scripts/
│   ├── prepare_input.py (Stage A input builder)
│   ├── prepare_stage_b.py (Stage B input builder)
│   ├── run_stage_a.sh (Stage A runner)
│   └── compare_enrichments.py (comparison tool)
└── data/
    ├── baseline/ (copied old pipeline outputs for comparison)
    └── experiments/ (new pipeline experiment results)
        ├── exp01_ctts8xePLWA/ (blocked infield)
        ├── exp02_GOZo4Z0brDc/ (promo)
        ├── exp03_zbNWOEz6w8/ (talking head A)
        ├── exp04_L9mcyTuXYjc/ (talking head B)
        ├── exp05_zbNWOEz6w8_stageB/ (enrichment on talking head)
        ├── exp06_ctts8xePLWA_stageB/ (enrichment on infield)
        ├── exp07_Yz1TGfAF0zc/ (compilation classification)
        └── exp08_Yz1TGfAF0zc_stageB/ (compilation enrichment)
```
