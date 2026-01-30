#!/usr/bin/env python3
"""
Tone Feature Analysis Script
Part of tones_gap.md research plan (Steps 19-40)

Analyzes audio features from 03.audio-features to:
1. Extract feature vectors per segment
2. Calculate distributions
3. Run cluster analysis
4. Map clusters to proposed tones
"""

import json
import os
from pathlib import Path
from dataclasses import dataclass
from typing import Optional
import numpy as np
from collections import defaultdict

# Configuration
DATA_ROOT = Path("/home/jonaswsl/projects/daygame-coach/data/03.audio-features")
OUTPUT_DIR = Path("/home/jonaswsl/projects/daygame-coach/docs/overviews/PIPELINE/research/tones")


@dataclass
class SegmentFeatures:
    """Flat feature vector for a single segment."""
    file_path: str
    segment_idx: int
    start: float
    end: float
    text: str
    duration_sec: float

    # Pitch features
    pitch_mean: float
    pitch_std: float
    pitch_range: float
    pitch_direction: float
    voiced_ratio: float

    # Energy features
    energy_mean: float
    energy_std: float
    energy_dynamics: float

    # Tempo features
    syllable_rate: float

    # Spectral features
    brightness: float

    # Quality flags
    low_energy: bool
    speech_activity_ratio: float


def load_all_features() -> list[dict]:
    """Load all audio feature JSON files."""
    all_files = []
    for root, dirs, files in os.walk(DATA_ROOT):
        for f in files:
            if f.endswith(".audio_features.json"):
                file_path = Path(root) / f
                all_files.append(file_path)

    print(f"Found {len(all_files)} audio feature files")

    all_data = []
    for fp in all_files:
        try:
            with open(fp, 'r') as f:
                data = json.load(f)
                data['_file_path'] = str(fp)
                all_data.append(data)
        except Exception as e:
            print(f"Error loading {fp}: {e}")

    return all_data


def extract_feature_vector(segment: dict, file_path: str, idx: int) -> Optional[SegmentFeatures]:
    """Extract flat feature vector from a segment."""
    features = segment.get('features', {})
    pitch = features.get('pitch', {})
    energy = features.get('energy', {})
    tempo = features.get('tempo', {})
    spectral = features.get('spectral', {})
    quality = features.get('quality', {})

    # Skip if missing critical features
    if not pitch or not energy:
        return None

    try:
        return SegmentFeatures(
            file_path=file_path,
            segment_idx=idx,
            start=segment.get('start', 0),
            end=segment.get('end', 0),
            text=segment.get('text', ''),
            duration_sec=segment.get('duration_sec', 0),

            pitch_mean=pitch.get('mean_hz', 0),
            pitch_std=pitch.get('std_hz', 0),
            pitch_range=pitch.get('range_hz', 0),
            pitch_direction=pitch.get('direction', 0),
            voiced_ratio=pitch.get('voiced_ratio', 0),

            energy_mean=energy.get('mean_db', 0),
            energy_std=energy.get('std_db', 0),
            energy_dynamics=energy.get('dynamics_db', 0),

            syllable_rate=tempo.get('syllable_rate', 0),

            brightness=spectral.get('brightness_hz', 0),

            low_energy=quality.get('low_energy', False),
            speech_activity_ratio=quality.get('speech_activity_ratio', 0),
        )
    except Exception as e:
        print(f"Error extracting features: {e}")
        return None


def filter_segments(segments: list[SegmentFeatures]) -> list[SegmentFeatures]:
    """Filter out low-quality segments."""
    filtered = []
    for s in segments:
        # Filter criteria
        if s.voiced_ratio < 0.3:
            continue
        if s.duration_sec < 0.5:
            continue
        if s.low_energy:
            continue
        if s.pitch_mean == 0:  # No pitch detected
            continue
        if s.speech_activity_ratio < 0.3:
            continue

        filtered.append(s)

    return filtered


def calculate_stats(values: list[float]) -> dict:
    """Calculate distribution statistics."""
    arr = np.array(values)
    return {
        'count': len(arr),
        'mean': float(np.mean(arr)),
        'std': float(np.std(arr)),
        'min': float(np.min(arr)),
        'max': float(np.max(arr)),
        'p10': float(np.percentile(arr, 10)),
        'p25': float(np.percentile(arr, 25)),
        'p50': float(np.percentile(arr, 50)),
        'p75': float(np.percentile(arr, 75)),
        'p90': float(np.percentile(arr, 90)),
    }


def run_analysis():
    """Main analysis function."""
    print("=== Tone Feature Analysis ===\n")

    # Step 20: Load all features
    print("Step 20: Loading all audio feature files...")
    all_data = load_all_features()
    print(f"Loaded {len(all_data)} files\n")

    # Step 21: Extract feature vectors
    print("Step 21: Extracting feature vectors...")
    all_segments = []
    for data in all_data:
        file_path = data.get('_file_path', '')
        for idx, segment in enumerate(data.get('segments', [])):
            feat = extract_feature_vector(segment, file_path, idx)
            if feat:
                all_segments.append(feat)
    print(f"Extracted {len(all_segments)} segments\n")

    # Step 22: Filter segments
    print("Step 22: Filtering low-quality segments...")
    filtered = filter_segments(all_segments)
    print(f"After filtering: {len(filtered)} segments ({len(filtered)/len(all_segments)*100:.1f}%)\n")

    # Step 23: Summary
    print("Step 23: Extraction complete")
    print(f"  Total files: {len(all_data)}")
    print(f"  Total segments: {len(all_segments)}")
    print(f"  Filtered segments: {len(filtered)}")
    print()

    # Steps 24-28: Calculate distributions
    print("Steps 24-28: Calculating distributions...")

    distributions = {
        'pitch_mean': calculate_stats([s.pitch_mean for s in filtered]),
        'pitch_std': calculate_stats([s.pitch_std for s in filtered]),
        'energy_dynamics': calculate_stats([s.energy_dynamics for s in filtered]),
        'syllable_rate': calculate_stats([s.syllable_rate for s in filtered]),
        'brightness': calculate_stats([s.brightness for s in filtered]),
    }

    for name, stats in distributions.items():
        print(f"\n{name}:")
        print(f"  mean={stats['mean']:.2f}, std={stats['std']:.2f}")
        print(f"  range=[{stats['min']:.2f}, {stats['max']:.2f}]")
        print(f"  percentiles: p10={stats['p10']:.2f}, p50={stats['p50']:.2f}, p90={stats['p90']:.2f}")

    # Step 29: Correlation matrix
    print("\n\nStep 29: Calculating correlations...")
    feature_arrays = {
        'pitch_mean': np.array([s.pitch_mean for s in filtered]),
        'pitch_std': np.array([s.pitch_std for s in filtered]),
        'energy_dynamics': np.array([s.energy_dynamics for s in filtered]),
        'syllable_rate': np.array([s.syllable_rate for s in filtered]),
        'brightness': np.array([s.brightness for s in filtered]),
    }

    feature_names = list(feature_arrays.keys())
    n_features = len(feature_names)

    print("\nCorrelation matrix:")
    print("                  ", end="")
    for name in feature_names:
        print(f"{name[:12]:>13}", end="")
    print()

    correlations = []
    for i, name1 in enumerate(feature_names):
        print(f"{name1:18}", end="")
        for j, name2 in enumerate(feature_names):
            corr = np.corrcoef(feature_arrays[name1], feature_arrays[name2])[0, 1]
            print(f"{corr:13.2f}", end="")
            if i < j:
                correlations.append((name1, name2, corr))
        print()

    print("\nHigh correlations (|r| > 0.7):")
    for n1, n2, r in correlations:
        if abs(r) > 0.7:
            print(f"  {n1} ↔ {n2}: r={r:.2f}")

    print("\nLow correlations (|r| < 0.3):")
    for n1, n2, r in correlations:
        if abs(r) < 0.3:
            print(f"  {n1} ↔ {n2}: r={r:.2f}")

    # Save results
    results = {
        'total_files': len(all_data),
        'total_segments': len(all_segments),
        'filtered_segments': len(filtered),
        'filter_rate': len(filtered) / len(all_segments),
        'distributions': distributions,
        'correlations': [(n1, n2, float(r)) for n1, n2, r in correlations],
    }

    output_file = OUTPUT_DIR / "feature_analysis_results.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to {output_file}")

    return filtered, results


def run_clustering(filtered: list[SegmentFeatures], distributions: dict):
    """Phase 3: Cluster analysis (Steps 31-40)."""
    from sklearn.cluster import KMeans
    from sklearn.metrics import silhouette_score

    print("\n\n=== Phase 3: Cluster Analysis ===\n")

    # Step 31: Normalize features to z-scores
    print("Step 31: Normalizing features to z-scores...")
    feature_names = ['pitch_mean', 'pitch_std', 'energy_dynamics', 'syllable_rate', 'brightness']

    raw_data = np.array([
        [s.pitch_mean, s.pitch_std, s.energy_dynamics, s.syllable_rate, s.brightness]
        for s in filtered
    ])

    # Z-score normalization
    means = np.mean(raw_data, axis=0)
    stds = np.std(raw_data, axis=0)
    normalized = (raw_data - means) / stds

    print(f"  Normalized {len(normalized)} samples with {len(feature_names)} features")
    print(f"  Normalization stats:")
    for i, name in enumerate(feature_names):
        print(f"    {name}: mean={means[i]:.2f}, std={stds[i]:.2f}")

    # Steps 32-34: Run k-means for k=5,6,7
    results = {}
    for k in [5, 6, 7]:
        print(f"\nStep {31+k-4}: Running k-means with k={k}...")
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(normalized)

        # Cluster sizes
        cluster_sizes = np.bincount(labels)
        within_var = kmeans.inertia_

        print(f"  Cluster sizes: {cluster_sizes}")
        print(f"  Within-cluster variance (inertia): {within_var:.2f}")

        results[k] = {
            'labels': labels,
            'centroids': kmeans.cluster_centers_,
            'sizes': cluster_sizes.tolist(),
            'inertia': within_var,
        }

    # Step 35: Calculate silhouette scores
    print("\nStep 35: Calculating silhouette scores...")
    silhouettes = {}
    for k in [5, 6, 7]:
        score = silhouette_score(normalized, results[k]['labels'])
        silhouettes[k] = score
        print(f"  k={k}: silhouette={score:.4f}")

    # Step 36: Select optimal k
    print("\nStep 36: Selecting optimal k...")
    best_k = max(silhouettes, key=silhouettes.get)
    print(f"  Best k={best_k} with silhouette={silhouettes[best_k]:.4f}")

    # Use k=5 for tone mapping (our target)
    chosen_k = 5
    print(f"  Using k={chosen_k} for tone mapping (target: 5 tones)")

    # Step 37: Calculate mean feature values per cluster
    print(f"\nStep 37: Cluster centroids (k={chosen_k})...")
    centroids = results[chosen_k]['centroids']

    # Denormalize centroids for interpretability
    denorm_centroids = centroids * stds + means

    print("\n  Cluster centroids (denormalized):")
    print(f"  {'Cluster':>8}", end="")
    for name in feature_names:
        print(f"{name[:12]:>14}", end="")
    print()

    for i, centroid in enumerate(denorm_centroids):
        print(f"  {i:>8}", end="")
        for val in centroid:
            print(f"{val:14.2f}", end="")
        print()

    # Step 38: Map clusters to tones
    print("\nStep 38: Mapping clusters to tones...")

    # Tone mapping logic based on feature profiles
    # Adjusted thresholds based on actual cluster centroids
    tone_mapping = {}
    labels = results[chosen_k]['labels']

    for i, centroid in enumerate(denorm_centroids):
        pitch_mean, pitch_std, energy_dyn, syllable_rate, brightness = centroid

        # Determine tone based on feature profile (order matters!)
        if pitch_std > 50:  # Outlier cluster (extreme variation)
            tone = "playful"  # Could be highly animated speech
        elif pitch_std > 20 and energy_dyn > 13:
            tone = "playful"
        elif syllable_rate > 7 and pitch_std < 15:
            tone = "nervous"  # Fast but monotone = nervous
        elif energy_dyn < 9 and pitch_std < 15:
            tone = "warm"  # Soft, steady delivery
        elif pitch_std < 18 and 9 <= energy_dyn <= 12:
            tone = "confident"
        else:
            tone = "neutral"

        tone_mapping[i] = tone
        cluster_size = results[chosen_k]['sizes'][i]
        pct = cluster_size / len(labels) * 100
        print(f"  Cluster {i} → {tone:12} (n={cluster_size:,}, {pct:.1f}%)")
        print(f"           pitch_std={pitch_std:.1f}, energy_dyn={energy_dyn:.1f}, "
              f"syllable_rate={syllable_rate:.1f}")

    # Step 39: Check for ambiguous clusters
    print("\nStep 39: Checking for ambiguous clusters...")
    tone_counts = {}
    for cluster_id, tone in tone_mapping.items():
        tone_counts[tone] = tone_counts.get(tone, 0) + 1

    ambiguous = []
    for tone, count in tone_counts.items():
        if count > 1:
            ambiguous.append(f"{tone} mapped to {count} clusters")

    if ambiguous:
        print(f"  AMBIGUOUS: {', '.join(ambiguous)}")
    else:
        print("  No ambiguous mappings - each tone maps to exactly one cluster")

    missing_tones = set(['playful', 'confident', 'warm', 'nervous', 'neutral']) - set(tone_mapping.values())
    if missing_tones:
        print(f"  MISSING TONES: {missing_tones}")

    # Save clustering results
    cluster_results = {
        'chosen_k': chosen_k,
        'silhouette_scores': silhouettes,
        'best_k_by_silhouette': best_k,
        'cluster_sizes': results[chosen_k]['sizes'],
        'centroids_denormalized': denorm_centroids.tolist(),
        'normalization': {
            'means': means.tolist(),
            'stds': stds.tolist(),
            'feature_names': feature_names,
        },
        'tone_mapping': tone_mapping,
        'tone_counts': tone_counts,
    }

    output_file = OUTPUT_DIR / "cluster_analysis_results.json"
    with open(output_file, 'w') as f:
        json.dump(cluster_results, f, indent=2)
    print(f"\nClustering results saved to {output_file}")

    return cluster_results


def run_multi_k_discovery(filtered: list[SegmentFeatures]):
    """
    Tone Discovery Phase 1: Multi-K clustering exploration.
    Runs k-means for k=3-10 and analyzes each clustering.
    """
    from sklearn.cluster import KMeans
    from sklearn.metrics import silhouette_score

    print("\n\n=== TONE DISCOVERY: Multi-K Clustering ===\n")

    # Prepare normalized features
    feature_names = ['pitch_mean', 'pitch_std', 'energy_dynamics', 'syllable_rate', 'brightness']
    raw_data = np.array([
        [s.pitch_mean, s.pitch_std, s.energy_dynamics, s.syllable_rate, s.brightness]
        for s in filtered
    ])

    means = np.mean(raw_data, axis=0)
    stds = np.std(raw_data, axis=0)
    normalized = (raw_data - means) / stds

    print(f"Analyzing {len(normalized)} samples with {len(feature_names)} features\n")

    # Step 1-4: Run k-means for k=3-10
    results = {}
    for k in range(3, 11):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(normalized)
        sil_score = silhouette_score(normalized, labels)
        sizes = np.bincount(labels)

        # Denormalize centroids
        centroids = kmeans.cluster_centers_ * stds + means

        results[k] = {
            'labels': labels,
            'centroids': centroids,
            'sizes': sizes.tolist(),
            'inertia': kmeans.inertia_,
            'silhouette': sil_score,
        }

    # Print summary table
    print("=" * 80)
    print(f"{'k':>3} | {'Silhouette':>10} | {'Inertia':>12} | {'Min %':>7} | {'Max %':>7} | Cluster Sizes")
    print("-" * 80)

    for k in range(3, 11):
        r = results[k]
        sizes_pct = [s / len(filtered) * 100 for s in r['sizes']]
        sizes_str = ', '.join([f"{s:.1f}%" for s in sorted(sizes_pct, reverse=True)])
        print(f"{k:>3} | {r['silhouette']:>10.4f} | {r['inertia']:>12.0f} | "
              f"{min(sizes_pct):>6.1f}% | {max(sizes_pct):>6.1f}% | {sizes_str}")

    print("=" * 80)

    # Find best k by silhouette
    best_k = max(range(3, 11), key=lambda k: results[k]['silhouette'])
    print(f"\nBest k by silhouette: k={best_k} (score={results[best_k]['silhouette']:.4f})")

    # Elbow analysis (inertia drop)
    print("\nInertia drop analysis (elbow detection):")
    for k in range(4, 11):
        drop = results[k-1]['inertia'] - results[k]['inertia']
        drop_pct = drop / results[k-1]['inertia'] * 100
        marker = " ← diminishing returns" if drop_pct < 5 else ""
        print(f"  k={k-1}→{k}: -{drop:.0f} ({drop_pct:.1f}%){marker}")

    # Detailed analysis for k=5,6,7
    print("\n" + "=" * 80)
    print("DETAILED CLUSTER PROFILES")
    print("=" * 80)

    for k in [5, 6, 7]:
        print(f"\n--- k={k} (silhouette={results[k]['silhouette']:.4f}) ---\n")
        centroids = results[k]['centroids']
        sizes = results[k]['sizes']

        print(f"{'Cluster':>8} | {'pitch_mean':>10} | {'pitch_std':>9} | "
              f"{'energy_dyn':>10} | {'syl_rate':>8} | {'brightness':>10} | {'Size':>8} | Profile")
        print("-" * 100)

        for i, centroid in enumerate(centroids):
            pm, ps, ed, sr, br = centroid
            pct = sizes[i] / len(filtered) * 100

            # Auto-label based on profile
            profile = interpret_profile(ps, ed, sr, br)

            print(f"{i:>8} | {pm:>10.1f} | {ps:>9.1f} | {ed:>10.1f} | "
                  f"{sr:>8.1f} | {br:>10.0f} | {pct:>7.1f}% | {profile}")

    # Cluster 3 investigation (extreme pitch_std)
    print("\n" + "=" * 80)
    print("OUTLIER INVESTIGATION: Segments with pitch_std > 80")
    print("=" * 80)

    outlier_segments = [s for s in filtered if s.pitch_std > 80]
    print(f"\nFound {len(outlier_segments)} segments ({len(outlier_segments)/len(filtered)*100:.2f}%)")

    if outlier_segments:
        # Analyze outlier characteristics
        outlier_pm = np.mean([s.pitch_mean for s in outlier_segments])
        outlier_ps = np.mean([s.pitch_std for s in outlier_segments])
        outlier_ed = np.mean([s.energy_dynamics for s in outlier_segments])
        outlier_sr = np.mean([s.syllable_rate for s in outlier_segments])
        outlier_br = np.mean([s.brightness for s in outlier_segments])

        print(f"\nOutlier profile averages:")
        print(f"  pitch_mean: {outlier_pm:.1f} Hz (vs normal {means[0]:.1f})")
        print(f"  pitch_std:  {outlier_ps:.1f} Hz (vs normal {means[1]:.1f})")
        print(f"  energy_dyn: {outlier_ed:.1f} dB (vs normal {means[2]:.1f})")
        print(f"  syl_rate:   {outlier_sr:.1f} (vs normal {means[3]:.1f})")
        print(f"  brightness: {outlier_br:.0f} Hz (vs normal {means[4]:.0f})")

        # Sample outlier segments
        print(f"\nSample outlier segments (first 10):")
        for s in outlier_segments[:10]:
            print(f"  - {s.file_path.split('/')[-1]} @ {s.start:.1f}s: "
                  f"pitch_std={s.pitch_std:.0f}, text='{s.text[:50]}...'")

    # Save results
    output = {
        'total_segments': len(filtered),
        'normalization': {'means': means.tolist(), 'stds': stds.tolist()},
        'results_by_k': {
            k: {
                'silhouette': results[k]['silhouette'],
                'inertia': results[k]['inertia'],
                'sizes': results[k]['sizes'],
                'sizes_pct': [s / len(filtered) * 100 for s in results[k]['sizes']],
                'centroids': results[k]['centroids'].tolist(),
            }
            for k in range(3, 11)
        },
        'best_k_silhouette': best_k,
        'outlier_count': len(outlier_segments),
        'outlier_pct': len(outlier_segments) / len(filtered) * 100,
    }

    output_file = OUTPUT_DIR / "multi_k_analysis_results.json"
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)
    print(f"\nResults saved to {output_file}")

    # Deep dive into outliers
    print("\n" + "=" * 80)
    print("OUTLIER DEEP DIVE: Categorizing extreme pitch variation segments")
    print("=" * 80)

    # Group outliers by source file
    file_counts = defaultdict(list)
    for s in outlier_segments:
        fname = s.file_path.split('/')[-1].replace('.audio_features.json', '')
        file_counts[fname].append(s)

    print(f"\nOutliers by source file (top 20):")
    sorted_files = sorted(file_counts.items(), key=lambda x: len(x[1]), reverse=True)[:20]
    for fname, segments in sorted_files:
        avg_pm = np.mean([s.pitch_mean for s in segments])
        avg_ps = np.mean([s.pitch_std for s in segments])
        print(f"  {len(segments):>4} segments: {fname[:60]}...")
        print(f"         avg pitch_mean={avg_pm:.0f} Hz, pitch_std={avg_ps:.0f} Hz")

    # Categorize by pitch_mean (proxy for speaker type)
    print(f"\nOutlier pitch_mean distribution:")
    pm_ranges = [
        (0, 200, "Low (likely male)"),
        (200, 300, "Mid (could be either)"),
        (300, 400, "High (likely female or animated male)"),
        (400, 1000, "Very high (female/child/artifact)"),
    ]
    for lo, hi, label in pm_ranges:
        count = len([s for s in outlier_segments if lo <= s.pitch_mean < hi])
        print(f"  {label:40}: {count:>5} ({count/len(outlier_segments)*100:.1f}%)")

    return results


def interpret_profile(pitch_std, energy_dyn, syllable_rate, brightness):
    """Interpret a feature profile into a descriptive label."""
    labels = []

    # Pitch variation
    if pitch_std > 80:
        labels.append("EXTREME-VARIED")
    elif pitch_std > 25:
        labels.append("animated")
    elif pitch_std < 10:
        labels.append("monotone")

    # Energy dynamics
    if energy_dyn > 14:
        labels.append("dynamic")
    elif energy_dyn < 8:
        labels.append("steady")

    # Speech rate
    if syllable_rate > 7:
        labels.append("rushed")
    elif syllable_rate < 4.5:
        labels.append("deliberate")

    # Brightness
    if brightness > 1700:
        labels.append("bright")
    elif brightness < 1100:
        labels.append("soft")

    if not labels:
        return "neutral"

    return " + ".join(labels)


def run_feature_profiles(filtered: list[SegmentFeatures]):
    """
    Tone Discovery Phase 2: Feature profile analysis.
    Analyzes extreme feature values and feature combinations.
    """
    print("\n\n=== TONE DISCOVERY: Feature Profile Analysis ===\n")

    # Extract feature arrays
    pitch_std = np.array([s.pitch_std for s in filtered])
    energy_dyn = np.array([s.energy_dynamics for s in filtered])
    syllable_rate = np.array([s.syllable_rate for s in filtered])
    brightness = np.array([s.brightness for s in filtered])
    pitch_mean = np.array([s.pitch_mean for s in filtered])

    n = len(filtered)

    # Step 16-20: Extreme feature profiles
    print("=" * 80)
    print("EXTREME FEATURE PROFILES")
    print("=" * 80)

    extremes = [
        ("High pitch_std (>P95, animated)", pitch_std, np.percentile(pitch_std, 95), ">"),
        ("Low pitch_std (<P5, monotone)", pitch_std, np.percentile(pitch_std, 5), "<"),
        ("High syllable_rate (>P95, rushed)", syllable_rate, np.percentile(syllable_rate, 95), ">"),
        ("Low syllable_rate (<P5, deliberate)", syllable_rate, np.percentile(syllable_rate, 5), "<"),
        ("High brightness (>P90, bright)", brightness, np.percentile(brightness, 90), ">"),
        ("Low brightness (<P10, soft)", brightness, np.percentile(brightness, 10), "<"),
        ("High energy_dyn (>P90, dynamic)", energy_dyn, np.percentile(energy_dyn, 90), ">"),
        ("Low energy_dyn (<P10, steady)", energy_dyn, np.percentile(energy_dyn, 10), "<"),
    ]

    print(f"\n{'Profile':<45} | {'Threshold':>10} | {'Count':>8} | {'%':>6}")
    print("-" * 80)

    extreme_results = []
    for name, arr, thresh, op in extremes:
        if op == ">":
            mask = arr > thresh
        else:
            mask = arr < thresh
        count = np.sum(mask)
        pct = count / n * 100
        print(f"{name:<45} | {thresh:>10.1f} | {count:>8} | {pct:>5.1f}%")
        extreme_results.append({"name": name, "threshold": thresh, "count": int(count), "pct": pct})

    # Step 21-23: 2D Feature Quadrant Analysis
    print("\n" + "=" * 80)
    print("2D FEATURE QUADRANT ANALYSIS")
    print("=" * 80)

    # Quadrant 1: pitch_std × energy_dynamics
    print("\n--- Quadrant: pitch_std × energy_dynamics ---")
    ps_med = np.median(pitch_std)
    ed_med = np.median(energy_dyn)
    print(f"Medians: pitch_std={ps_med:.1f}, energy_dyn={ed_med:.1f}\n")

    quadrants_1 = [
        ("High var + High dyn (ANIMATED)", (pitch_std > ps_med) & (energy_dyn > ed_med)),
        ("High var + Low dyn (???)", (pitch_std > ps_med) & (energy_dyn <= ed_med)),
        ("Low var + High dyn (ASSERTIVE?)", (pitch_std <= ps_med) & (energy_dyn > ed_med)),
        ("Low var + Low dyn (SOFT/CALM)", (pitch_std <= ps_med) & (energy_dyn <= ed_med)),
    ]

    for name, mask in quadrants_1:
        count = np.sum(mask)
        pct = count / n * 100
        # Get avg features for this quadrant
        avg_ps = np.mean(pitch_std[mask])
        avg_ed = np.mean(energy_dyn[mask])
        avg_sr = np.mean(syllable_rate[mask])
        print(f"  {name:35}: {count:>6} ({pct:>5.1f}%) | avg_syl_rate={avg_sr:.1f}")

    # Quadrant 2: syllable_rate × pitch_std
    print("\n--- Quadrant: syllable_rate × pitch_std ---")
    sr_med = np.median(syllable_rate)
    print(f"Medians: syllable_rate={sr_med:.1f}, pitch_std={ps_med:.1f}\n")

    quadrants_2 = [
        ("Fast + varied (EXCITED)", (syllable_rate > sr_med) & (pitch_std > ps_med)),
        ("Fast + monotone (RUSHED/NERVOUS)", (syllable_rate > sr_med) & (pitch_std <= ps_med)),
        ("Slow + varied (DRAMATIC)", (syllable_rate <= sr_med) & (pitch_std > ps_med)),
        ("Slow + monotone (DELIBERATE)", (syllable_rate <= sr_med) & (pitch_std <= ps_med)),
    ]

    for name, mask in quadrants_2:
        count = np.sum(mask)
        pct = count / n * 100
        avg_ed = np.mean(energy_dyn[mask])
        print(f"  {name:35}: {count:>6} ({pct:>5.1f}%) | avg_energy_dyn={avg_ed:.1f}")

    # Quadrant 3: brightness × energy_dynamics
    print("\n--- Quadrant: brightness × energy_dynamics ---")
    br_med = np.median(brightness)
    print(f"Medians: brightness={br_med:.0f}, energy_dyn={ed_med:.1f}\n")

    quadrants_3 = [
        ("Bright + Dynamic (ENERGETIC)", (brightness > br_med) & (energy_dyn > ed_med)),
        ("Bright + Steady (SHARP/TENSE)", (brightness > br_med) & (energy_dyn <= ed_med)),
        ("Soft + Dynamic (???)", (brightness <= br_med) & (energy_dyn > ed_med)),
        ("Soft + Steady (CALM/WARM?)", (brightness <= br_med) & (energy_dyn <= ed_med)),
    ]

    for name, mask in quadrants_3:
        count = np.sum(mask)
        pct = count / n * 100
        print(f"  {name:35}: {count:>6} ({pct:>5.1f}%)")

    # Step 24-25: Multi-feature combinations
    print("\n" + "=" * 80)
    print("MULTI-FEATURE COMBINATIONS (Potential Tones)")
    print("=" * 80)

    # Define potential tone profiles with thresholds
    tone_profiles = [
        {
            "name": "playful",
            "criteria": "pitch_std > 22 AND energy_dyn > 13",
            "mask": (pitch_std > 22) & (energy_dyn > 13) & (pitch_std < 80),  # exclude outliers
        },
        {
            "name": "confident",
            "criteria": "pitch_std < 18 AND energy_dyn 8-13 AND syl_rate 5-6.5",
            "mask": (pitch_std < 18) & (energy_dyn >= 8) & (energy_dyn <= 13) &
                    (syllable_rate >= 5) & (syllable_rate <= 6.5),
        },
        {
            "name": "nervous",
            "criteria": "syl_rate > 6.8 AND pitch_std < 16",
            "mask": (syllable_rate > 6.8) & (pitch_std < 16),
        },
        {
            "name": "bright",
            "criteria": "brightness > 1650",
            "mask": (brightness > 1650),
        },
        {
            "name": "monotone",
            "criteria": "pitch_std < 8 AND energy_dyn < 9",
            "mask": (pitch_std < 8) & (energy_dyn < 9),
        },
        {
            "name": "rushed",
            "criteria": "syl_rate > 7.2",
            "mask": (syllable_rate > 7.2),
        },
        {
            "name": "deliberate",
            "criteria": "syl_rate < 4.5 AND pitch_std > 12",
            "mask": (syllable_rate < 4.5) & (pitch_std > 12),
        },
        {
            "name": "soft",
            "criteria": "energy_dyn < 7 AND brightness < 1200",
            "mask": (energy_dyn < 7) & (brightness < 1200),
        },
    ]

    print(f"\n{'Tone':<15} | {'Criteria':<50} | {'Count':>8} | {'%':>6}")
    print("-" * 90)

    for profile in tone_profiles:
        count = np.sum(profile["mask"])
        pct = count / n * 100
        print(f"{profile['name']:<15} | {profile['criteria']:<50} | {count:>8} | {pct:>5.1f}%")

    # Check for overlap between profiles
    print("\n--- Overlap Analysis ---")
    playful_mask = (pitch_std > 22) & (energy_dyn > 13) & (pitch_std < 80)
    confident_mask = (pitch_std < 18) & (energy_dyn >= 8) & (energy_dyn <= 13) & (syllable_rate >= 5) & (syllable_rate <= 6.5)
    nervous_mask = (syllable_rate > 6.8) & (pitch_std < 16)
    bright_mask = (brightness > 1650)

    overlaps = [
        ("playful ∩ bright", playful_mask, bright_mask),
        ("confident ∩ bright", confident_mask, bright_mask),
        ("nervous ∩ bright", nervous_mask, bright_mask),
        ("playful ∩ nervous", playful_mask, nervous_mask),
        ("confident ∩ nervous", confident_mask, nervous_mask),
    ]

    print(f"\n{'Overlap':<25} | {'Count':>8} | {'% of smaller':>12}")
    print("-" * 55)
    for name, mask1, mask2 in overlaps:
        overlap = mask1 & mask2
        count = np.sum(overlap)
        smaller = min(np.sum(mask1), np.sum(mask2))
        overlap_pct = count / smaller * 100 if smaller > 0 else 0
        print(f"{name:<25} | {count:>8} | {overlap_pct:>11.1f}%")

    # Calculate uncategorized segments
    any_tone = playful_mask | confident_mask | nervous_mask | bright_mask
    uncategorized = ~any_tone & (pitch_std < 80)  # exclude multi-speaker outliers
    uncategorized_count = np.sum(uncategorized)
    print(f"\nUncategorized segments: {uncategorized_count} ({uncategorized_count/n*100:.1f}%)")
    print("  → These would be labeled 'neutral'")

    # Save results
    output = {
        "extreme_profiles": extreme_results,
        "tone_profiles": [
            {"name": p["name"], "criteria": p["criteria"], "count": int(np.sum(p["mask"])),
             "pct": float(np.sum(p["mask"]) / n * 100)}
            for p in tone_profiles
        ],
    }

    output_file = OUTPUT_DIR / "feature_profiles_results.json"
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)
    print(f"\nResults saved to {output_file}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "discovery":
        # Run discovery analysis only
        filtered, results = run_analysis()
        run_multi_k_discovery(filtered)
    elif len(sys.argv) > 1 and sys.argv[1] == "profiles":
        # Run feature profile analysis
        filtered, results = run_analysis()
        run_feature_profiles(filtered)
    elif len(sys.argv) > 1 and sys.argv[1] == "full":
        # Run everything
        filtered, results = run_analysis()
        run_multi_k_discovery(filtered)
        run_feature_profiles(filtered)
    else:
        # Original behavior
        filtered, results = run_analysis()
        cluster_results = run_clustering(filtered, results['distributions'])
