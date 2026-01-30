# Tone Feature Analysis Results

Status: Complete
Updated: 30-01-2026 14:30 - Phase 2 complete
Parent: [tones_gap.md](../../plans/tones_gap.md)

---

## Data Summary

| Metric | Value |
|--------|-------|
| Audio feature files | 456 |
| Total segments | 113,188 |
| Filtered segments | 76,224 (67.3%) |

### Filter Criteria Applied
- `voiced_ratio >= 0.3`
- `duration_sec >= 0.5`
- `low_energy == false`
- `pitch_mean > 0`
- `speech_activity_ratio >= 0.3`

---

## Feature Distributions

### Pitch Mean (Hz)
| Stat | Value |
|------|-------|
| Mean | 194.35 |
| Std | 56.96 |
| Min | 65.41 |
| Max | 1002.77 |
| P10 | 140.21 |
| P50 | 185.93 |
| P90 | 251.78 |

**Interpretation**: Median ~186 Hz suggests mixed male/female speakers. Wide range indicates diverse speaker population.

### Pitch Std (Hz) - Variation
| Stat | Value |
|------|-------|
| Mean | 20.59 |
| Std | 23.97 |
| Min | 0.00 |
| Max | 386.50 |
| P10 | 1.17 |
| P50 | 15.96 |
| P90 | 39.28 |

**Interpretation**: High variability. P90=39 Hz suggests animated/playful speech has pitch_std > 40.

### Energy Dynamics (dB)
| Stat | Value |
|------|-------|
| Mean | 10.89 |
| Std | 3.84 |
| Min | 0.64 |
| Max | 28.53 |
| P10 | 6.21 |
| P50 | 10.54 |
| P90 | 16.07 |

**Interpretation**: Energy dynamics measure volume variation. P90=16 dB suggests animated speech has dynamics > 16.

### Syllable Rate (syllables/sec)
| Stat | Value |
|------|-------|
| Mean | 5.84 |
| Std | 1.28 |
| Min | 0.50 |
| Max | 12.46 |
| P10 | 4.28 |
| P50 | 5.78 |
| P90 | 7.49 |

**Interpretation**: Normal speech ~5-6 syllables/sec. P90=7.5 suggests nervous/fast speech.

### Spectral Brightness (Hz)
| Stat | Value |
|------|-------|
| Mean | 1365.94 |
| Std | 325.02 |
| Min | 414.51 |
| Max | 3433.62 |
| P10 | 967.72 |
| P50 | 1341.63 |
| P90 | 1790.85 |

**Interpretation**: Brightness indicates vocal "edge". Higher brightness = more energetic/tense delivery.

---

## Correlation Matrix

|                  | pitch_mean | pitch_std | energy_dyn | syllable_rate | brightness |
|------------------|------------|-----------|------------|---------------|------------|
| **pitch_mean**   | 1.00       | 0.39      | -0.04      | 0.07          | 0.13       |
| **pitch_std**    | 0.39       | 1.00      | 0.22       | -0.14         | -0.00      |
| **energy_dyn**   | -0.04      | 0.22      | 1.00       | -0.45         | 0.14       |
| **syllable_rate**| 0.07       | -0.14     | -0.45      | 1.00          | -0.01      |
| **brightness**   | 0.13       | -0.00     | 0.14       | -0.01         | 1.00       |

### Key Findings

**No High Correlations (>0.7)**: All features are reasonably independent - good for discriminative power.

**Moderate Correlations:**
- `pitch_mean ↔ pitch_std`: r=0.39 (higher pitch speakers have more variation)
- `energy_dynamics ↔ syllable_rate`: r=-0.45 (faster speech = less dynamic range)

**Low Correlations (<0.3)**: Most feature pairs are independent, confirming they capture different aspects of speech.

---

## Proposed Tone Thresholds (Initial)

Based on distributions and literature review:

| Tone | Key Features | Threshold Logic |
|------|--------------|-----------------|
| **playful** | High pitch_std, high energy_dynamics | pitch_std > 30 AND energy_dyn > 14 |
| **confident** | Low pitch_std, moderate energy_dynamics | pitch_std < 15 AND energy_dyn 8-14 |
| **warm** | Low energy_dynamics, moderate syllable_rate | energy_dyn < 8 AND syllable_rate < 5.5 |
| **nervous** | High syllable_rate, high pitch_std | syllable_rate > 7 AND pitch_std > 25 |
| **neutral** | All features near median | Default when no other tone matches |

### Threshold Percentiles

| Tone | Threshold | Percentile Basis |
|------|-----------|------------------|
| playful pitch_std > 30 | ~P80 | Top 20% variation |
| playful energy_dyn > 14 | ~P80 | Top 20% dynamics |
| confident pitch_std < 15 | ~P45 | Bottom 45% variation |
| warm energy_dyn < 8 | ~P25 | Bottom 25% dynamics |
| nervous syllable_rate > 7 | ~P85 | Top 15% speed |

---

## Implications for Clustering

1. **5 features, 5 tones**: One dominant feature per tone should work well
2. **No redundant features**: All can contribute to discrimination
3. **Clear separation possible**: Features have distinct ranges for different tones
4. **Speaker normalization may help**: Pitch mean varies widely (65-1000 Hz)

---

## Next Steps

1. Run k-means clustering (k=5,6,7) on normalized features
2. Compare cluster centroids to proposed tone profiles
3. Calculate silhouette scores to validate cluster quality
4. Map clusters to tones based on feature profiles
