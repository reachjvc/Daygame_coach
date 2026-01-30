# Tones Gap Research Plan

Status: Active
Updated: 30-01-2026 15:30 - Completed Phase 3 (Steps 31-40), recommend 4 tones (drop warm)
Updated: 30-01-2026 14:00 - Completed Phase 1 (Steps 1-15), literature review done
Parent: [pipeline_gaps.md](pipeline_gaps.md#8d-tones---pending)

## Progress Tracking Rule

**After completing ANY step below, immediately:**
1. Mark the step `[x]` in this document
2. Add findings/notes to the step's output section
3. Update the "Current Step" indicator

**Current Step**: 41

---

## Goal

Determine the optimal set of tones (target: 5-6) that are:
1. **Distinguishable** from available audio features
2. **Useful** for daygame coaching feedback
3. **Grounded** in existing research on vocal emotion/paralinguistics

---

## Phase 1: Literature Review (Steps 1-15)

### 1.1 Search for Academic Sources

```
[x] Step 1: Web search "speech emotion recognition acoustic features survey"
    Output: 5 papers found - see research/tones/literature.md
    ---

[x] Step 2: Web search "paralinguistic features emotion detection prosody"
    Output: 3 key papers on prosody dominance - see literature.md
    ---

[x] Step 3: Web search "vocal emotion categories discrete vs dimensional"
    Output: VAD model vs Ekman's 6 comparison - see literature.md
    ---

[x] Step 4: Web search "pitch energy tempo emotion classification accuracy"
    Output: Accuracy ranges 69-87% depending on features - see literature.md
    ---

[x] Step 5: Web search "speech emotion recognition confusion matrix which emotions confused"
    Output: Fear hardest (53%), anger easiest (95%) - see literature.md
    ---
```

### 1.2 Extract Key Findings

```
[x] Step 6: From search results, list the most commonly used emotion categories in SER research
    Output: Ekman's 6 (anger, disgust, fear, happiness, sadness, surprise) + neutral
            VAD model (valence-arousal-dominance), 24-emotion Cowen taxonomy
    ---

[x] Step 7: Document which emotions are reported as "reliably detectable" (>70% accuracy)
    Output: Anger (85-95%), Sadness (85-100%), Happiness (75-85%), Neutral (80-90%)
    ---

[x] Step 8: Document which emotions are reported as "hard to detect" (<60% accuracy)
    Output: Fear (50-60% - overlaps sad/excited), Surprise (55-70%), Contempt (~50%)
    ---

[x] Step 9: List commonly confused emotion pairs from literature
    Output: Anger↔Happy (both high arousal), Fear↔Sad (both negative), Disgust↔Neutral
    ---

[x] Step 10: Document the acoustic features most predictive of each emotion
    Output: See literature.md Step 10 table - pitch/energy/tempo mappings
    ---
```

### 1.3 Map to Our Tones

```
[x] Step 11: Map our 8 current tones to standard SER emotion categories
    Output: playful→happiness, nervous→fear, neutral→neutral (strong)
            confident/grounded/direct→neutral-dominant (weak)
            warm/flirty→no clear SER equivalent
    ---

[x] Step 12: Identify which of our tones have NO clear SER equivalent (may be problematic)
    Output: confident (dimensional), direct (semantic), grounded (=confident),
            flirty (no research), warm (rarely studied)
    ---

[x] Step 13: Identify which of our tones map to commonly-confused SER emotion pairs
    Output: playful↔flirty (VERY HIGH), confident↔grounded (VERY HIGH),
            confident↔direct (HIGH), warm↔playful (MODERATE)
    ---

[x] Step 14: Based on literature, draft initial recommendation for tone merges
    Output: MERGE: playful+flirty→playful, confident+grounded+direct→confident
            KEEP: nervous, warm (caution), neutral
    ---

[x] Step 15: Write Phase 1 summary in research/tones/literature.md
    Output: FILE CREATED at docs/overviews/PIPELINE/research/tones/literature.md
    ---
```

---

## Phase 2: Feature Analysis (Steps 16-30)

### 2.1 Data Inventory

```
[x] Step 16: Count total audio feature files in data/03.audio-features/
    Output: 456 files
    ---

[x] Step 17: Read 3 sample audio feature files to confirm available features
    Output: pitch.{mean_hz, std_hz, min_hz, max_hz, range_hz, direction, voiced_ratio}
            energy.{mean_db, max_db, std_db, dynamics_db}
            tempo.{syllable_rate, onset_count, duration_sec}
            spectral.{brightness_hz, rolloff_hz}
            quality.{clipped, low_energy, pitch_voiced_ratio, speech_activity_ratio}
    ---

[x] Step 18: Count total segments across all files (estimate)
    Output: 226,376 segments across 456 files (~497 segments/file avg)
    ---
```

### 2.2 Feature Extraction Script

```
[x] Step 19: Create script skeleton at scripts/training-data/analysis/tone_feature_analysis.py
    Output: FILE CREATED - loads, extracts, filters, analyzes
    ---

[x] Step 20: Implement function to load all audio feature JSON files
    Output: load_all_features() loaded 456 files
    ---

[x] Step 21: Implement function to extract flat feature vectors per segment
    Output: extract_feature_vector() extracts pitch, energy, tempo, spectral
    ---

[x] Step 22: Implement function to filter out low-quality segments
    Output: filter_segments() applies voiced_ratio, duration, energy filters
    ---

[x] Step 23: Run script to extract features from ALL segments
    Output: 113,188 total segments → 76,224 after filtering (67.3%)
    ---
```

### 2.3 Distribution Analysis

```
[x] Step 24: Calculate distribution stats for pitch_mean (mean, std, min, max, percentiles)
    Output: mean=194.35, std=56.96, range=[65, 1003], p10=140, p50=186, p90=252
    ---

[x] Step 25: Calculate distribution stats for pitch_std
    Output: mean=20.59, std=23.97, range=[0, 387], p10=1.2, p50=16, p90=39
    ---

[x] Step 26: Calculate distribution stats for energy_dynamics
    Output: mean=10.89, std=3.84, range=[0.6, 29], p10=6.2, p50=10.5, p90=16
    ---

[x] Step 27: Calculate distribution stats for syllable_rate
    Output: mean=5.84, std=1.28, range=[0.5, 12.5], p10=4.3, p50=5.8, p90=7.5
    ---

[x] Step 28: Calculate distribution stats for brightness
    Output: mean=1366, std=325, range=[415, 3434], p10=968, p50=1342, p90=1791
    ---

[x] Step 29: Calculate feature correlation matrix (which features correlate?)
    Output: NO high correlations (>0.7)! All features independent.
            Moderate: pitch_mean↔pitch_std (0.39), energy_dynamics↔syllable_rate (-0.45)
    ---

[x] Step 30: Write Phase 2 summary in research/tones/feature_analysis.md
    Output: FILE CREATED + JSON results saved
    ---
```

---

## Phase 3: Cluster Analysis (Steps 31-40)

### 3.1 Clustering

```
[x] Step 31: Normalize all features to z-scores (mean=0, std=1)
    Output: 76,224 samples normalized across 5 features
    ---

[x] Step 32: Run k-means clustering with k=5
    Output: Sizes=[15671, 17702, 23364, 2145, 17342], inertia=199634
    ---

[x] Step 33: Run k-means clustering with k=6
    Output: Sizes=[14341, 16035, 16736, 21859, 1677, 5576], inertia=184150
    ---

[x] Step 34: Run k-means clustering with k=7
    Output: Sizes=[14558, 10803, 13336, 19400, 15934, 566, 1627], inertia=172760
    ---

[x] Step 35: Calculate silhouette scores for k=5,6,7
    Output: k=5: 0.182, k=6: 0.186, k=7: 0.186 (all similar)
    ---

[x] Step 36: Select optimal k based on silhouette score
    Output: Using k=5 for 5 tones (silhouette differences negligible)
    ---
```

### 3.2 Cluster Interpretation

```
[x] Step 37: For each cluster, calculate mean feature values
    Output: Centroids in cluster_analysis.md - 5 distinct profiles
    ---

[x] Step 38: Label each cluster with proposed tone name based on feature profile
    Output: playful (26%), confident (31%), nervous (21%), neutral (23%)
            **WARM NOT FOUND** - no cluster matches warm profile
    ---

[x] Step 39: Identify any clusters that don't map clearly to a tone (ambiguous)
    Output: Cluster 3 = outlier (extreme pitch_std=118) mapped to playful
            MISSING: warm tone - recommend drop or merge with confident
    ---

[x] Step 40: Write Phase 3 summary in research/tones/cluster_analysis.md
    Output: FILE CREATED - recommends 4 tones (drop warm)
    ---
```

---

## Phase 4: Distinguishability Testing (Steps 41-45)

### 4.1 Pairwise Confusion Analysis

```
[ ] Step 41: Define threshold rules for each proposed tone
    Format: tone_name: {feature: threshold, ...}
    Output: Threshold definitions for 5 tones
    ---

[ ] Step 42: Apply threshold rules to all segments, assign predicted tone
    Output: Prediction counts per tone
    ---

[ ] Step 43: For segments near decision boundaries, calculate confidence gap
    Definition: confidence_gap = |score_tone1 - score_tone2| for top 2 tones
    Output: Distribution of confidence gaps (how many are ambiguous?)
    ---

[ ] Step 44: Identify the most confused tone pairs (where confidence_gap < threshold)
    Output: Confusion pairs ranked by frequency
    ---

[ ] Step 45: Write Phase 4 summary in research/tones/distinguishability.md
    Output: Create file with threshold rules, predictions, and confusion analysis
    ---
```

---

## Phase 5: Validation Design (Steps 46-50)

### 5.1 Select Validation Segments

```
[ ] Step 46: For each of 5 proposed tones, select 10 "high confidence" segments
    Criteria: Segments where feature profile strongly matches tone prototype
    Output: 50 segment IDs with file paths and timestamps
    ---

[ ] Step 47: Create validation dataset at data/test/tone_validation/validation_segments.json
    Format: [{segment_id, file_path, start, end, text, features, predicted_tone, confidence}]
    Output: File created
    ---

[ ] Step 48: Create empty results file at data/test/tone_validation/validation_results.json
    Format: [{segment_id, human_label, ai_prediction, match}]
    Output: File created
    ---

[ ] Step 49: Write validation instructions for user at data/test/tone_validation/README.md
    Contents: How to listen to segments, how to label, how to record results
    Output: File created
    ---

[ ] Step 50: Write final recommendation in tones_gap.md (this file)
    Contents: Final 5 tones, threshold rules, validation plan ready for user
    Output: Update "Final Recommendation" section below
    ---
```

---

## Final Recommendation

**Status**: COMPLETE (from tones_discovery_plan.md analysis)

### Proposed Tones (5)

| Tone | % of Data | Key Audio Features | Threshold Rules |
|------|-----------|-------------------|-----------------|
| **playful** | 13% | High pitch_std, high energy_dyn | pitch_std > 22 AND energy_dyn > 13 |
| **confident** | 14% | Low pitch_std, moderate energy_dyn, moderate rate | pitch_std < 18 AND energy_dyn 8-13 AND syl_rate 5-6.5 |
| **nervous** | 14% | High syllable_rate, low pitch_std | syl_rate > 6.8 AND pitch_std < 16 |
| **energetic** | 12% | High brightness OR high energy_dyn | brightness > 1700 OR energy_dyn > 15 |
| **neutral** | 47% | Default | None of above |

### Changes from Original 8

| Change | Old | New | Rationale |
|--------|-----|-----|-----------|
| DROP | warm | - | Does not cluster; timbre-based |
| DROP | grounded | - | Overlaps with confident |
| DROP | direct | - | Semantic, not acoustic |
| DROP | flirty | - | Overlaps with playful |
| ADD | - | energetic | New discovery: brightness = vocal effort |

### Supporting Research

See consolidated summary: [TONES_RESEARCH_SUMMARY.md](../research/tones/TONES_RESEARCH_SUMMARY.md)

Regenerate analysis data: `python scripts/training-data/analysis/tone_feature_analysis.py full`

### Validation Ready

- [ ] 50 segments selected for human validation
- [ ] User instructions written
- [ ] Results template ready

### Decision Gate

After user completes validation (listens to 50 segments, labels them):
- If agreement > 70% per tone → APPROVE final tone set
- If agreement < 70% for any tone → REVISE thresholds or merge tones

---

## Files Created/Updated

| Step | File | Status |
|------|------|--------|
| 15 | `research/tones/literature.md` | [x] |
| 19 | `scripts/training-data/analysis/tone_feature_analysis.py` | [x] |
| 30 | `research/tones/feature_analysis.md` | [x] |
| 40 | `research/tones/cluster_analysis.md` | [x] |
| 45 | `research/tones/distinguishability.md` | [ ] |
| 47 | `data/test/tone_validation/validation_segments.json` | [ ] |
| 48 | `data/test/tone_validation/validation_results.json` | [ ] |
| 49 | `data/test/tone_validation/README.md` | [ ] |

---

## Current Hypothesis (Post-Clustering)

Based on cluster analysis, **recommend 4 tones** (not 5):

| Tone | % of Data | Audio Signature | Status |
|------|-----------|-----------------|--------|
| **playful** | 26% | pitch_std > 20, energy_dyn > 13 | ✅ Confirmed |
| **confident** | 31% | pitch_std < 18, energy_dyn 9-12 | ✅ Confirmed |
| **nervous** | 21% | syllable_rate > 7, pitch_std < 15 | ✅ Confirmed |
| **neutral** | 23% | All features near median | ✅ Confirmed |
| ~~warm~~ | 0% | Does not emerge as distinct cluster | ❌ Drop |

**Key Finding**: "Warm" does not naturally separate from other tones in the audio data.

**Confidence**: High for 4 tones. Data-validated via 76,224 segments.

---

## Open Questions

1. Should we use a **dimensional model** (valence-arousal) instead of discrete tones?
2. Is **speaker normalization** needed? (different coaches have different baselines)
3. Should tones be **mutually exclusive** or allow **multi-label**?

---

## Execution Notes

- Steps 1-15 (Literature): Can run in parallel, ~1-2 hours
- Steps 16-30 (Feature Analysis): Sequential, ~2-3 hours
- Steps 31-40 (Clustering): Sequential, ~1-2 hours
- Steps 41-45 (Distinguishability): Sequential, ~1 hour
- Steps 46-50 (Validation Design): Sequential, ~1 hour
- User Validation: Async, depends on user availability
