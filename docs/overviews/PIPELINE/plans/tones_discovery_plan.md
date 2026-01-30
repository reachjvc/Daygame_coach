# Tones Discovery Research Plan

Status: Active
Updated: 30-01-2026 20:00 - Created with discovery-focused approach
Parent: [tones_gap.md](tones_gap.md)

---

## Goal Shift: Validation → Discovery

Previous approach (Steps 1-40): Validate/reduce our 8 tones to 4-5.
New approach (this plan): **Discover what tones the data naturally supports**, potentially including tones we hadn't considered.

**Key Question**: What distinct vocal delivery patterns exist in our data, and what should we call them?

---

## Current Knowledge Summary

### What We Know
- 76,224 filtered segments from 456 audio files
- 5 independent features: pitch_mean, pitch_std, energy_dynamics, syllable_rate, brightness
- K-means k=5 yields 5 distinct clusters with silhouette=0.182
- Cluster 3 (2.8%) has extreme pitch_std=118 - currently lumped into "playful" but likely distinct
- "warm" profile (low energy, low variation) does NOT emerge as a cluster

### Current Cluster Profiles (k=5)
| Cluster | pitch_mean | pitch_std | energy_dyn | syllable_rate | brightness | Size | Current Label |
|---------|------------|-----------|------------|---------------|------------|------|---------------|
| 0 | 200 | 12 | 7.7 | **7.5** | 1294 | 20.6% | nervous |
| 1 | 186 | **26** | **16** | 4.8 | 1388 | 23.2% | playful |
| 2 | 173 | 15 | 9.5 | 5.6 | 1119 | 30.7% | confident |
| 3 | **350** | **118** | 12 | 5.7 | 1306 | 2.8% | playful (outlier?) |
| 4 | 208 | 18 | 11 | 5.9 | 1747 | 22.8% | neutral |

### Open Questions
1. Is Cluster 3 actually "playful" or something else entirely (animated/singing/artifact)?
2. What does k=6,7,8 reveal? Are there sub-clusters within confident/neutral?
3. Are there vocal states beyond emotions that we should consider?
4. What combinations of features create meaningful perceptual differences?

---

## Phase 1: Expanded Clustering (Steps 1-15)

### 1.1 Multi-K Exploration

```
[ ] Step 1: Run k-means for k=3,4,5,6,7,8,9,10
    Goal: Find natural breaking points in the data
    Output: Silhouette scores, inertia curves, cluster sizes for each k
    ---

[ ] Step 2: Plot elbow curve (inertia vs k)
    Goal: Identify where adding clusters stops providing value
    Output: Elbow plot, recommended k range
    ---

[ ] Step 3: For each k, examine cluster sizes
    Goal: Identify k values with balanced vs imbalanced clusters
    Output: Table showing min/max cluster size ratios
    Note: Very small clusters (<2%) may indicate outliers vs real patterns
    ---

[ ] Step 4: Compare silhouette scores across k values
    Goal: Find optimal cluster separation
    Output: Silhouette plot, best k by silhouette
    ---

[ ] Step 5: Select 3 candidate k values for deep analysis
    Criteria: Best silhouette, best balance, most interpretable
    Output: k1, k2, k3 selected for Phase 2
    ---
```

### 1.2 Cluster Stability Analysis

```
[ ] Step 6: Run k-means 10 times with different random seeds (k=best)
    Goal: Check if clusters are stable or random artifacts
    Output: Stability metric per cluster (how often same segments group together)
    ---

[ ] Step 7: Compare cluster assignments across runs
    Goal: Identify "core" members vs "borderline" members
    Output: Per-segment stability score (0-100%)
    ---

[ ] Step 8: Flag unstable clusters (stability <70%)
    Goal: These clusters may not represent real patterns
    Output: List of stable vs unstable clusters
    ---
```

### 1.3 Alternative Clustering Methods

```
[ ] Step 9: Run DBSCAN clustering (density-based)
    Goal: Find clusters without specifying k, detect outliers
    Parameters: eps=0.5, min_samples=50 (tune as needed)
    Output: Number of clusters found, noise point percentage
    ---

[ ] Step 10: Compare DBSCAN clusters to k-means clusters
    Goal: See if density-based method finds different structure
    Output: Overlap matrix between methods
    ---

[ ] Step 11: Run hierarchical clustering, cut at different heights
    Goal: See natural grouping hierarchy
    Output: Dendrogram, clusters at heights h=2,3,4,5
    ---

[ ] Step 12: Identify consensus clusters (appear in all methods)
    Goal: These are the most robust patterns
    Output: List of consensus cluster profiles
    ---
```

### 1.4 Outlier Investigation

```
[ ] Step 13: Extract Cluster 3 segments (pitch_std > 80)
    Goal: Understand what's causing extreme pitch variation
    Output: 50 sample segments with file paths and timestamps
    ---

[ ] Step 14: Categorize Cluster 3 segments by inspection
    Categories to check:
    - Singing/humming
    - Exaggerated theatrical delivery
    - Female speakers (higher pitch range)
    - Audio quality issues (clipping, noise)
    - Genuine animated/excited speech
    Output: Category breakdown with examples
    ---

[ ] Step 15: Decide: Include or exclude Cluster 3 from tone taxonomy
    If real pattern: Name it (e.g., "animated", "theatrical")
    If artifact: Filter out or label as noise
    Output: Decision with rationale
    ---
```

---

## Phase 2: Feature-Driven Discovery (Steps 16-30)

### 2.1 Extreme Feature Profiles

```
[ ] Step 16: Identify segments with extreme pitch_std (top 5%)
    Profile: pitch_std > P95 (39 Hz)
    Output: Count, audio characteristics, potential label
    ---

[ ] Step 17: Identify segments with extreme syllable_rate (top 5%)
    Profile: syllable_rate > P95 (7.5 syl/sec)
    Output: Count, audio characteristics, potential label
    Hypothesis: "rushed" or "anxious" delivery
    ---

[ ] Step 18: Identify segments with low syllable_rate (bottom 5%)
    Profile: syllable_rate < P5
    Output: Count, audio characteristics, potential label
    Hypothesis: "deliberate" or "slow" delivery
    ---

[ ] Step 19: Identify segments with low pitch_std (bottom 10%)
    Profile: pitch_std < P10 (1.2 Hz)
    Output: Count, audio characteristics, potential label
    Hypothesis: "monotone" delivery
    ---

[ ] Step 20: Identify segments with high brightness (top 10%)
    Profile: brightness > P90 (1790 Hz)
    Output: Count, audio characteristics, potential label
    Hypothesis: "sharp/edgy" or "tense" delivery
    ---
```

### 2.2 Feature Combination Profiles

```
[ ] Step 21: Map 2D space: pitch_std × energy_dynamics
    Divide into quadrants, count segments in each
    Output: 4-quadrant distribution with interpretations:
    - High pitch_std + High energy: Animated/Expressive
    - High pitch_std + Low energy: ???
    - Low pitch_std + High energy: Assertive/Direct?
    - Low pitch_std + Low energy: Calm/Soft?
    ---

[ ] Step 22: Map 2D space: syllable_rate × pitch_std
    Divide into quadrants, count segments in each
    Output: 4-quadrant distribution with interpretations:
    - Fast + varied: Excited/Nervous
    - Fast + monotone: Rushed/Mechanical
    - Slow + varied: Dramatic/Thoughtful
    - Slow + monotone: Deliberate/Bored
    ---

[ ] Step 23: Map 2D space: energy_dynamics × syllable_rate
    Output: Correlation analysis (currently r=-0.45)
    Why does more dynamic speech tend to be slower?
    ---

[ ] Step 24: Create 3D feature space visualization
    Axes: pitch_std, energy_dynamics, syllable_rate
    Color by current cluster assignment
    Output: Plot image, observations about cluster separation
    ---

[ ] Step 25: Identify "empty zones" in feature space
    Goal: Find feature combinations that don't exist in data
    Output: List of absent profiles (e.g., "fast + calm + varied")
    Insight: Tones for empty zones won't be useful
    ---
```

### 2.3 Literature: Beyond Emotions

```
[ ] Step 26: Web search "vocal delivery styles speech communication"
    Goal: Find non-emotion vocal categories from communication studies
    Output: List of vocal delivery styles (e.g., conversational, formal, intimate)
    ---

[ ] Step 27: Web search "paralinguistic cues social meaning prosody"
    Goal: Find social/relational vocal cues
    Output: List of social vocal cues (e.g., dominance, affiliation, certainty)
    ---

[ ] Step 28: Web search "speech act detection prosody acoustic features"
    Goal: Find speech act categories detectable from audio
    Output: List of speech acts (e.g., statement, question, command, request)
    ---

[ ] Step 29: Web search "voice quality breathy creaky modal phonetics"
    Goal: Find voice quality categories beyond pitch/energy
    Output: List of voice qualities and their acoustic correlates
    Note: We may not have features to detect these
    ---

[ ] Step 30: Compile candidate tones from literature
    Combine emotion categories + delivery styles + social cues
    Output: Master list of 15-20 candidate tones with definitions
    ---
```

---

## Phase 3: Candidate Tone Evaluation (Steps 31-40)

### 3.1 Acoustic Feasibility

```
[ ] Step 31: For each candidate tone, list required acoustic features
    Format: {tone: [feature1 > threshold1, feature2 < threshold2, ...]}
    Output: Feature requirements matrix
    ---

[ ] Step 32: Check if our 5 features can detect each candidate tone
    Mark each tone as: Detectable / Partial / Not Detectable
    Output: Feasibility matrix
    ---

[ ] Step 33: Estimate segment counts for each detectable tone
    Apply feature thresholds to our 76K segments
    Output: Tone distribution predictions
    Note: Tones with <5% of data may not be useful
    ---

[ ] Step 34: Identify overlapping tones (same acoustic profile)
    Goal: Find tones that can't be distinguished acoustically
    Output: Overlap pairs to merge or choose between
    ---

[ ] Step 35: Narrow to 6-8 candidate tones that are:
    - Acoustically detectable with our features
    - Have sufficient data representation (>5%)
    - Don't overlap with each other
    - Useful for daygame coaching feedback
    Output: Refined candidate tone list
    ---
```

### 3.2 Coaching Usefulness Filter

```
[ ] Step 36: For each candidate tone, answer: Is this useful coaching feedback?
    Questions:
    - Would a coach want to know if someone uses this tone?
    - Can a learner consciously practice/modify this tone?
    - Does this tone correlate with approach success/failure?
    Output: Usefulness score (1-5) per tone
    ---

[ ] Step 37: Filter out tones with usefulness < 3
    Output: Final candidate list (target: 5-7 tones)
    ---

[ ] Step 38: Assign thresholds to each tone
    Based on cluster centroids and percentile analysis
    Output: Threshold rules in Python format
    ---

[ ] Step 39: Apply thresholds to all segments, get distribution
    Output: Final tone distribution (should sum to 100%)
    ---

[ ] Step 40: Compare to original 8 tones and k=5 clusters
    Output: Mapping table showing old → new tone assignments
    ---
```

---

## Phase 4: Validation Prep (Steps 41-50)

### 4.1 Sample Selection

```
[ ] Step 41: For each final tone, select 10 "high confidence" segments
    Criteria: Features clearly match tone thresholds
    Output: 50-70 segment IDs with file paths, timestamps
    ---

[ ] Step 42: For each final tone, select 5 "borderline" segments
    Criteria: Features near threshold boundaries
    Output: 25-35 additional segments for edge case testing
    ---

[ ] Step 43: Create validation dataset JSON
    Path: data/test/tone_validation/discovery_segments.json
    Format: [{segment_id, file, start, end, text, features, predicted_tone, confidence}]
    ---
```

### 4.2 Listening Test Design

```
[ ] Step 44: Write listening test instructions
    Include: Tone definitions, examples, how to rate
    Path: data/test/tone_validation/LISTENING_TEST.md
    ---

[ ] Step 45: Create results template
    Path: data/test/tone_validation/results_template.json
    Format: [{segment_id, tone1_rating, tone2_rating, ..., notes}]
    ---
```

### 4.3 Documentation

```
[ ] Step 46: Write final tone definitions
    For each tone: Name, acoustic signature, coaching meaning, examples
    Output: Add to research/tones/tone_definitions.md
    ---

[ ] Step 47: Create tone decision tree diagram
    Visual flowchart showing how features → tone assignment
    Output: Mermaid diagram or image
    ---

[ ] Step 48: Update tones_gap.md with final recommendation
    Mark 8d as complete, summarize findings
    ---

[ ] Step 49: Update taxonomy v1.json with new tones
    Replace old 8-tone list with validated tones
    ---

[ ] Step 50: Sync all pipeline docs
    Update: pipeline_gaps.md, phase_0_preparation.md, plan_pipeline.md
    Mark 8d.Tones as RESOLVED
    ---
```

---

## New Tone Candidates to Explore

Based on literature and clustering, here are candidate tones beyond the original 8:

| Candidate | Acoustic Profile | Literature Basis | Coaching Relevance |
|-----------|------------------|------------------|-------------------|
| **animated** | pitch_std > 50, energy_dyn > 12 | Happiness (high arousal) | Shows enthusiasm |
| **monotone** | pitch_std < 5, energy_dyn < 8 | Neutral/bored | May indicate nervousness |
| **rushed** | syllable_rate > 7.5, pitch_std < 20 | Fear/anxiety | Common beginner mistake |
| **deliberate** | syllable_rate < 4.5, pitch_std > 15 | Calm/authoritative | Advanced technique |
| **bright** | brightness > P90, energy_dyn > 12 | Anger/excitement | High energy vibe |
| **soft** | energy_dyn < 8, syllable_rate < 5.5 | Affection/intimacy | Rapport building |
| **assertive** | pitch_std < 15, energy_dyn > 12, syllable_rate 5-6 | Dominance | Frame control |

---

## Decision Framework

After completing Steps 1-50, the final tone set should satisfy:

1. **Acoustic Distinguishability**: Each tone has a unique feature profile
2. **Data Representation**: Each tone covers >5% of segments
3. **Cluster Alignment**: Tones align with natural data clusters
4. **Coaching Utility**: Each tone provides actionable feedback
5. **Learner Actionability**: A student can consciously modify their tone

---

## Files to Create/Update

| Step | File | Purpose |
|------|------|---------|
| 1-5 | research/tones/multi_k_analysis.md | Clustering results for k=3-10 |
| 16-25 | research/tones/feature_profiles.md | Extreme/combination feature analysis |
| 26-30 | research/tones/literature_expanded.md | Non-emotion vocal categories |
| 46 | research/tones/tone_definitions.md | Final tone definitions |
| 43 | data/test/tone_validation/discovery_segments.json | Validation samples |
| 49 | data/taxonomy/v1.json | Updated taxonomy |

---

## Execution Notes

- Phase 1 (Steps 1-15): Requires running updated analysis script, ~2 hours
- Phase 2 (Steps 16-30): Analysis + literature search, ~3 hours
- Phase 3 (Steps 31-40): Evaluation and filtering, ~2 hours
- Phase 4 (Steps 41-50): Validation prep and documentation, ~2 hours

Total: ~9 hours of research time

---

## Current Step: 1

Ready to begin with expanded clustering analysis.
