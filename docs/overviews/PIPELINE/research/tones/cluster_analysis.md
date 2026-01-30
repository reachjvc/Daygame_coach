# Tone Cluster Analysis Results

Status: Complete
Updated: 30-01-2026 15:00 - Phase 3 complete
Parent: [tones_gap.md](../../plans/tones_gap.md)

---

## Summary

| Metric | Value |
|--------|-------|
| Samples analyzed | 76,224 filtered segments |
| Features used | 5 (pitch_mean, pitch_std, energy_dynamics, syllable_rate, brightness) |
| Optimal k (silhouette) | 7 (score=0.186) |
| Chosen k for tones | 5 |

---

## Silhouette Score Comparison

| k | Silhouette Score | Notes |
|---|------------------|-------|
| 5 | 0.1824 | Target for 5 tones |
| 6 | 0.1858 | Slightly better |
| 7 | 0.1859 | Best, but too many clusters |

**Note**: Silhouette scores are relatively low (~0.18), indicating moderate cluster overlap. This is expected for continuous speech features.

---

## Cluster Centroids (k=5)

| Cluster | pitch_mean | pitch_std | energy_dyn | syllable_rate | brightness | Size | % |
|---------|------------|-----------|------------|---------------|------------|------|---|
| 0 | 200.03 | 12.35 | 7.72 | **7.49** | 1294.01 | 15,671 | 20.6% |
| 1 | 185.51 | **25.61** | **15.76** | 4.75 | 1388.03 | 17,702 | 23.2% |
| 2 | 173.03 | 15.19 | 9.47 | 5.55 | 1119.33 | 23,364 | 30.7% |
| 3 | 350.23 | **118.17** | 11.64 | 5.68 | 1306.45 | 2,145 | 2.8% |
| 4 | 207.70 | 18.09 | 10.59 | 5.90 | 1747.27 | 17,342 | 22.8% |

**Bold** = distinguishing feature for that cluster.

---

## Tone Mapping Results

| Cluster | Mapped Tone | Key Features | Rationale |
|---------|-------------|--------------|-----------|
| 0 | **nervous** | syllable_rate=7.5, pitch_std=12.4 | Fast speech with low variation = rushed/anxious |
| 1 | **playful** | pitch_std=25.6, energy_dyn=15.8 | High variation, high dynamics = animated |
| 2 | **confident** | pitch_std=15.2, energy_dyn=9.5 | Moderate, steady delivery |
| 3 | **playful** | pitch_std=118.2 (extreme) | Highly animated/expressive outliers |
| 4 | **neutral** | All features near median | Baseline speech pattern |

### Distribution

| Tone | Clusters | Total Segments | Percentage |
|------|----------|----------------|------------|
| **playful** | 1, 3 | 19,847 | 26.0% |
| **confident** | 2 | 23,364 | 30.7% |
| **neutral** | 4 | 17,342 | 22.8% |
| **nervous** | 0 | 15,671 | 20.6% |
| **warm** | - | 0 | 0.0% |

---

## Key Findings

### 1. "Warm" Does Not Emerge Naturally

No cluster has the expected "warm" profile (low energy_dynamics + low pitch_std + moderate syllable_rate). The closest is Cluster 0, but it has high syllable_rate (7.5) which maps to "nervous" instead.

**Options:**
- A) Drop "warm" from taxonomy (reduce to 4 tones)
- B) Merge "warm" into "confident" (both are calm/steady)
- C) Define "warm" as confident + low brightness (additional feature)

**Recommendation**: Option B - merge warm into confident. Both represent calm, steady delivery.

### 2. Playful is Well-Represented (26%)

High pitch variation and high energy dynamics clearly separate playful speech. This validates the literature finding that "happiness/playful" is reliably detectable.

### 3. Nervous Captures Fast Speech (20.6%)

The "nervous" cluster captures fast, monotone delivery (high syllable_rate, low pitch_std). This is useful for coaching - identifies rushed delivery that may indicate anxiety.

### 4. Confident is the Largest Cluster (30.7%)

Steady, moderate delivery is the most common pattern. This makes sense for daygame coaching content where coaches aim for confident delivery.

### 5. Cluster 3 is an Outlier (2.8%)

Extreme pitch variation (118 Hz std) represents highly expressive speech - could be exaggerated playfulness, singing, or audio artifacts. Mapped to "playful" but worth noting as potentially noisy.

---

## Revised Tone Recommendation

Based on clustering results, recommend **4 tones** instead of 5:

| Tone | % of Data | Audio Signature |
|------|-----------|-----------------|
| **playful** | 26% | High pitch_std (>20), high energy_dyn (>13) |
| **confident** | 31% | Low pitch_std (<18), moderate energy_dyn (9-12) |
| **nervous** | 21% | High syllable_rate (>7), low pitch_std |
| **neutral** | 23% | All features near median |

**Dropped**: "warm" (does not emerge as distinct cluster)

---

## Threshold Rules (Final)

```python
def classify_tone(pitch_std, energy_dyn, syllable_rate):
    if pitch_std > 50:  # Extreme variation
        return "playful"
    if pitch_std > 20 and energy_dyn > 13:
        return "playful"
    if syllable_rate > 7 and pitch_std < 15:
        return "nervous"
    if pitch_std < 18 and 9 <= energy_dyn <= 12:
        return "confident"
    return "neutral"
```

---

## Next Steps

1. **Decision**: Confirm 4 tones (drop warm) or keep 5 (merge warm+confident)
2. **Validation**: Select 40 segments (10 per tone) for human validation
3. **Update taxonomy**: Apply decision to v1.json
