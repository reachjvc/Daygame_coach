# Tones Research Summary (8d)

Status: Complete
Updated: 30-01-2026 22:00 - Consolidated from individual research files

---

## Final Decision: 5 Tones

| Tone | % | Threshold | Audio Signature |
|------|---|-----------|-----------------|
| **playful** | 13% | pitch_std > 22 AND energy_dyn > 13 | Animated, dynamic delivery |
| **confident** | 14% | pitch_std < 18 AND energy_dyn 8-13 AND syl_rate 5-6.5 | Measured, steady delivery |
| **nervous** | 14% | syl_rate > 6.8 AND pitch_std < 16 | Fast, monotone delivery |
| **energetic** | 12% | brightness > 1700 OR energy_dyn > 15 | High vocal effort/arousal |
| **neutral** | 47% | Default | Modal baseline |

**Dropped**: warm (no cluster), grounded (=confident), direct (semantic), flirty (=playful)

---

## Key Findings

### 1. Multi-K Clustering (76,224 segments)
- k=3 has best silhouette (0.22) but too coarse
- k=5-7 optimal for tone taxonomy
- ~2-3% "outlier" cluster is mixed-speaker segments, not a tone

### 2. Feature Independence
- No high correlations (>0.7) between 5 features
- playful ∩ nervous = 0% (mutually exclusive)
- confident ∩ nervous = 0% (mutually exclusive)

### 3. "Energetic" Discovery
- Spectral brightness = vocal effort (phonetics literature)
- High-frequency energy = arousal/activation (SER literature)
- Added as new tone to capture engaged delivery

### 4. "Warm" Does Not Exist Acoustically
- Literature describes warmth as timbre-based
- Our 5 features don't capture timbre
- No cluster matches warm profile

---

## Analysis Script

```bash
# Regenerate analysis data:
/home/jonaswsl/projects/daygame-coach/.venv/bin/python3 \
  scripts/training-data/analysis/tone_feature_analysis.py full
```

---

## Source Literature

- [Bright Voice Quality - ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S089219972200234X)
- [Voice Quality - Cambridge Phonetics](https://www.cambridge.org/core/books/abs/cambridge-handbook-of-phonetics/voice-quality/)
- [Perceptual cues in vocal expressions - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4178283/)
- [Vocal expressions of positive emotions - Springer](https://link.springer.com/article/10.3758/s13423-019-01701-x)
