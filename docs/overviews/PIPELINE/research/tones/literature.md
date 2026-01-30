# Tones Literature Review

Status: In Progress
Updated: 30-01-2026 13:30 - Created with Steps 1-5 search results
Parent: [tones_gap.md](../../plans/tones_gap.md)

---

## Step 1-5: Search Results Summary

### Step 1: SER Acoustic Features Surveys

**Key Papers Found:**
1. [A review on speech emotion recognition: Survey, recent advances, challenges, and noise](https://www.sciencedirect.com/science/article/abs/pii/S0925231223011384) - Feb 2024, comprehensive SER overview
2. [Survey on speech emotion recognition: Features, classification schemes, databases](https://www.sciencedirect.com/science/article/abs/pii/S0031320310004619) - Foundational SER survey
3. [Multi-level acoustic feature cross-fusion](https://www.tandfonline.com/doi/full/10.1080/09540091.2024.2312103) - Feb 2024, MFCC + spectrograms + Wav2vec2
4. [Real-time SER using deep learning](https://link.springer.com/article/10.1007/s10462-024-11065-x) - 2024
5. [Speech emotion recognition with hand-crafted features](https://www.nature.com/articles/s41598-025-95734-z) - 2025, ZCR, RMSE, Chroma STFT, MFCC

**Key Finding:** "It is not clear which speech features are most powerful in distinguishing between emotions."

---

### Step 2: Paralinguistic Features and Prosody

**Key Papers Found:**
1. [The Sound of Emotional Prosody: 3 Decades of Research](https://pmc.ncbi.nlm.nih.gov/articles/PMC12231869/) - Comprehensive review
2. [Paralinguistic and spectral feature extraction for SER](https://link.springer.com/article/10.1186/s13636-023-00290-x) - ML techniques
3. [Prosody Dominates Over Semantics in Emotion Word Processing](https://pubs.asha.org/doi/10.1044/2020_JSLHR-19-00258) - Stroop study

**Key Finding:** "Emotional prosody: tone of voice conveyed through changes in pitch, loudness, timbre, speech rate, and pauses." Prosody is more salient than semantic content for emotion perception.

**Emotion Recognition Accuracy by Type:**
- Anger and sadness: perceived most easily
- Fear and happiness: moderate
- Disgust: most poorly perceived

---

### Step 3: Discrete vs Dimensional Models

**Key Papers Found:**
1. [Mapping Discrete Emotions in the Dimensional Space](https://www.mdpi.com/2079-9292/10/23/2950) - Acoustic approach
2. [Beyond Discrete Categories: Multi-Task Valence-Arousal](https://arxiv.org/pdf/2510.12819) - 2024
3. [Mapping 24 Emotions Conveyed by Brief Human Vocalization](https://pmc.ncbi.nlm.nih.gov/articles/PMC6586540/) - Rich taxonomy

**Two Main Frameworks:**
1. **Discrete emotions**: Basic categories (Ekman's 6: anger, disgust, fear, happiness, sadness, surprise)
2. **Dimensional**: Valence (negative→positive) + Arousal (low→high)

**Key Finding:** "Discrete classification collapses emotional intensity variations into a single label. The VA model preserves this granularity." But: "Individual differences matter - some people fit dimensional model better, others fit discrete better."

---

### Step 4: Pitch/Energy/Tempo Classification Accuracy

**Key Papers Found:**
1. [Speech emotion recognition using ML - systematic review](https://www.sciencedirect.com/science/article/pii/S2667305323000911) - 2023
2. [Emotion Recognition using Pitch Parameters](https://www.researchgate.net/publication/283004760_Emotion_Recognition_using_Pitch_Parameters_of_Speech)
3. [Feature selection for emotion recognition in speech](https://pmc.ncbi.nlm.nih.gov/articles/PMC12453713/) - 2024

**Reported Accuracies:**
| Study | Features | Dataset | Accuracy |
|-------|----------|---------|----------|
| Shen et al. | Energy + pitch + MFCC | Berlin | 82.5% |
| SVM linear kernel | Multiple | - | 87.7% |
| Pitch-only baseline | Pitch | - | 77% (baseline 50%) |
| Random Forest | Selected features | - | 69% avg |

**Most Relevant Features (consensus):** "Pitch, loudness, tempo and quality (stressed/breathy voice) are the most relevant paralinguistic features."

**Common Confusions:**
- Anger ↔ Happy (similar acoustic features)
- Disgust ↔ Sad/Neutral
- Fear ↔ Sad

---

### Step 5: Confusion Matrices and Confused Pairs

**Key Papers Found:**
1. [Hierarchical Clustering of Emotions Using Confusion Matrices](https://link.springer.com/chapter/10.1007/978-3-319-01931-4_22)
2. [Emotion Recognition in Subject-Independent Approach](https://www.mdpi.com/2076-3417/15/13/6958) - 2024

**Well-Recognized Emotions (high accuracy):**
| Emotion | Accuracy | Notes |
|---------|----------|-------|
| Anger | 95% | Easily distinguished from neutral, sad, fearful |
| Sadness | 100% | Distinct profile |
| Disgust | 85% | Often confused with sad/neutral |
| Neutral | 86% | Can be confused with boredom |
| Happiness | 80% | Confused with anger (both high arousal) |
| Boredom | 77% | - |
| Fear | 53% | Most challenging to detect |

**Easy-to-Distinguish Pairs (>0.85 accuracy):**
- Angry–Neutral (1.0)
- Angry–Sad (1.0)
- Disgust–Sad (0.96)
- Disgust–Neutral (0.91)
- Angry–Surprise (0.89)
- Angry–Happy (0.86)

**Hard-to-Distinguish Pairs:**
- Fear ↔ Calm
- Fear ↔ Sad
- Disgust ↔ Anger
- Happy ↔ Angry (both high arousal)
- Neutral ↔ Emotional states (general difficulty)

---

## Step 6: Common Emotion Taxonomies in SER

### Ekman's Basic 6 (most common in SER)
1. Anger
2. Disgust
3. Fear
4. Happiness
5. Sadness
6. Surprise

### Extended Sets (common additions)
- Neutral (almost always added)
- Boredom
- Contempt

### Dimensional Model (VAD)
- **Valence**: Negative ↔ Positive
- **Arousal**: Low ↔ High
- (Dominance): Submissive ↔ Dominant (less commonly used)

### 24-Emotion Taxonomy (Cowen & Keltner)
Vocal bursts convey 24 distinct emotions that vary continuously along gradients.

---

## Step 7: Reliably Detectable Emotions (>70%)

Based on literature consensus:

| Emotion | Typical Accuracy | Audio Signature |
|---------|-----------------|-----------------|
| **Anger** | 85-95% | High pitch, high energy, fast tempo |
| **Sadness** | 85-100% | Low pitch, low energy, slow tempo |
| **Happiness** | 75-85% | High pitch variation, high energy |
| **Neutral** | 80-90% | Moderate all, low variation |
| **Disgust** | 70-85% | Low pitch, moderate energy |

---

## Step 8: Hard-to-Detect Emotions (<60%)

| Emotion | Typical Accuracy | Why Difficult |
|---------|-----------------|---------------|
| **Fear** | 50-60% | Overlaps with sad (low energy) or excited (high arousal) |
| **Surprise** | 55-70% | Brief duration, overlaps with fear/happiness |
| **Contempt** | ~50% | Subtle, low distinctiveness |
| **Boredom** | 60-75% | Similar to neutral/sad |

---

## Step 9: Commonly Confused Emotion Pairs

| Pair | Confusion Rate | Shared Features |
|------|----------------|-----------------|
| Anger ↔ Happiness | High | Both high arousal, high energy |
| Fear ↔ Sadness | High | Both negative valence, can have low energy |
| Disgust ↔ Neutral | Moderate | Both low arousal |
| Fear ↔ Surprise | Moderate | Both high pitch variation |
| Boredom ↔ Sadness | High | Both low energy, slow tempo |

---

## Step 10: Feature-to-Emotion Mapping

| Feature | High Value Indicates | Low Value Indicates |
|---------|---------------------|---------------------|
| **Pitch mean** | Fear, surprise, happiness | Sadness, boredom, disgust |
| **Pitch variation (std)** | Surprise, fear, happiness | Neutral, boredom, sadness |
| **Energy mean** | Anger, happiness | Sadness, fear, boredom |
| **Energy dynamics** | Anger, surprise | Neutral, boredom |
| **Tempo (syllable rate)** | Anger, fear, surprise | Sadness, boredom |
| **Spectral brightness** | Anger, happiness | Sadness |

---

## Step 11: Mapping Our Tones to SER Categories

| Our Tone | Closest SER Emotion(s) | Research Support |
|----------|----------------------|------------------|
| **playful** | Happiness (high arousal variant) | Moderate - not standard category |
| **confident** | Neutral-positive + dominance | Weak - dimensional, not discrete |
| **warm** | Happiness (low arousal) / affection | Weak - not standard category |
| **nervous** | Fear / anxiety | Strong - well-researched |
| **grounded** | Neutral (calm) | Moderate - similar to neutral |
| **direct** | Neutral (assertive) | Weak - content-based, not acoustic |
| **flirty** | Happiness + playful | Weak - not standard category |
| **neutral** | Neutral | Strong - standard category |

---

## Step 12: Tones Without Clear SER Equivalent

| Tone | Issue |
|------|-------|
| **confident** | Dimensional (dominance) not discrete; overlaps with neutral |
| **direct** | Content/semantic, not acoustic |
| **grounded** | Overlaps heavily with confident/neutral |
| **flirty** | Not a standard SER category; overlaps with playful |
| **warm** | Affection/tenderness rarely studied in SER |

---

## Step 13: Our Tones Likely to Be Confused

Based on SER literature confusion patterns:

| Tone Pair | Expected Confusion | Rationale |
|-----------|-------------------|-----------|
| **playful ↔ flirty** | Very High | Both map to happiness variants with similar acoustic profiles |
| **confident ↔ grounded** | Very High | Both map to calm/neutral with low variation |
| **confident ↔ direct** | High | Direct is semantic; acoustically similar to confident |
| **warm ↔ playful** | Moderate | Both positive valence, different energy |
| **nervous ↔ playful** | Low | Different arousal direction despite high variation |

---

## Step 14: Literature-Based Merge Recommendations

### Strongly Supported Merges

1. **playful + flirty → playful**
   - Literature: Happiness variants are confused with each other
   - Both high valence, varied pitch/energy
   - "Flirty" has no SER research backing

2. **confident + grounded + direct → confident**
   - Literature: Neutral variants hard to distinguish
   - "Direct" is semantic, not acoustic
   - "Grounded" = extreme confident

### Keep Separate

3. **nervous** (keep)
   - Maps to fear/anxiety
   - Distinct audio profile (high pitch, fast tempo)
   - Well-researched in SER

4. **warm** (keep with caution)
   - Limited SER research
   - Distinct from playful (lower energy)
   - May need validation

5. **neutral** (keep)
   - Standard SER category
   - Baseline/default

---

## Step 15: Phase 1 Summary

### Final Proposed Tones (5)

| Tone | SER Mapping | Expected Accuracy | Key Features |
|------|-------------|-------------------|--------------|
| **playful** | Happiness (high arousal) | 70-80% | High pitch_std, high energy_dynamics, high brightness |
| **confident** | Neutral (dominant) | 75-85% | Low pitch_std, steady energy, moderate tempo |
| **warm** | Affection (needs validation) | 60-70% | Low energy_mean, low energy_dynamics, moderate pitch |
| **nervous** | Fear/anxiety | 65-75% | High pitch_mean, high tempo, high pitch_std |
| **neutral** | Neutral | 80-90% | Moderate all, lowest variation |

### Key Insights from Literature

1. **Feature predictiveness unclear** - No consensus on best features
2. **Fear is hard** - 53% accuracy typical; "nervous" may inherit this difficulty
3. **Arousal easier than valence** - High vs low arousal more distinguishable than positive vs negative
4. **Pairs better than multi-class** - Binary emotion detection works better than 6+ classes
5. **Happy ↔ Angry confusion** - Both high arousal; relevant for playful detection

### Open Risks

- **warm** has limited SER backing - may need to merge with confident or playful
- **nervous** inherits fear's detection difficulties
- Speaker normalization may be critical (different baseline pitches)

### Proceed to Phase 2

Feature analysis on our actual data will validate/refute these mappings.
