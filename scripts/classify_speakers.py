#!/usr/bin/env python3
"""
Speaker Classification for Daygame Audio

Classifies each segment as:
- coach (male)
- target (female)
- voiceover
- ambiguous/unknown

Uses pitch/energy/spectral heuristics; detects voiceover-like segments; produces
baselines per speaker class and writes updated feature files with speaker labels.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np


def classify_speaker(features: Dict) -> Dict:
    """Heuristic speaker classification using pitch and spectral cues."""
    if not features or not features.get("pitch"):
        return {"speaker": "unknown", "confidence": 0.0, "reasons": ["no_pitch_data"]}

    pitch = features["pitch"]
    spectral = features.get("spectral", {})

    pitch_mean = pitch.get("mean_hz")
    pitch_range = pitch.get("range_hz", 0.0) or 0.0
    brightness = spectral.get("brightness_hz", 0.0) or 0.0

    score_male = 0
    score_female = 0
    reasons: List[str] = []

    if pitch_mean is not None:
        if pitch_mean < 140:
            score_male += 3
            reasons.append("low_pitch")
        elif pitch_mean < 180:
            score_male += 1
            reasons.append("medium_low_pitch")
        elif pitch_mean > 220:
            score_female += 3
            reasons.append("high_pitch")
        elif pitch_mean > 180:
            score_female += 1
            reasons.append("medium_high_pitch")

    if pitch_range > 100:
        score_female += 1
        reasons.append("high_pitch_variability")

    if brightness > 2000:
        score_female += 1
        reasons.append("bright_voice")
    elif brightness < 1500:
        score_male += 1
        reasons.append("darker_voice")

    total = score_male + score_female
    if total == 0:
        return {"speaker": "unknown", "confidence": 0.0, "reasons": reasons}

    if score_male > score_female:
        confidence = score_male / (total + 1)
        return {"speaker": "coach", "confidence": confidence, "reasons": reasons}
    if score_female > score_male:
        confidence = score_female / (total + 1)
        return {"speaker": "target", "confidence": confidence, "reasons": reasons}

    return {"speaker": "ambiguous", "confidence": 0.5, "reasons": reasons}


def detect_voiceover(segment: Dict) -> bool:
    """Detect voiceover/commentary heuristically."""
    features = segment.get("features", {})
    energy = features.get("energy", {})
    quality = features.get("quality", {})

    dynamics = energy.get("dynamics_db", 10)
    duration = float(segment.get("end", 0) - segment.get("start", 0))
    low_energy = quality.get("low_energy", False)

    if dynamics < 3:
        return True
    if duration > 30:
        return True
    if low_energy:
        return True
    return False


def _json_default(o):
    """JSON serializer for numpy types."""
    # This is needed because the 'features' dict contains numpy floats.
    try:
        import numpy as np

        if isinstance(o, np.generic):
            return o.item()
    except ImportError:
        pass
    raise TypeError(f"Object of type {o.__class__.__name__} is not JSON serializable")


def process_file(path: Path, output_path: Path, baselines: Dict[str, List[float]]) -> None:
    with path.open("r") as f:
        data = json.load(f)

    segments = data.get("segments", [])
    for segment in segments:
        if detect_voiceover(segment):
            segment["speaker"] = {"label": "voiceover", "confidence": 0.7, "reasons": ["voiceover_pattern"]}
            continue

        classification = classify_speaker(segment.get("features"))
        segment["speaker"] = {
            "label": classification["speaker"],
            "confidence": classification["confidence"],
            "reasons": classification.get("reasons", []),
        }

        label = segment["speaker"]["label"]
        if label in ("coach", "target"):
            pitch_mean = (segment.get("features", {}).get("pitch") or {}).get("mean_hz")
            energy_mean = (segment.get("features", {}).get("energy") or {}).get("mean_db")
            tempo_rate = (segment.get("features", {}).get("tempo") or {}).get("syllable_rate")
            if pitch_mean is not None:
                baselines.setdefault(label, {}).setdefault("pitch", []).append(pitch_mean)
            if energy_mean is not None:
                baselines.setdefault(label, {}).setdefault("energy", []).append(energy_mean)
            if tempo_rate is not None:
                baselines.setdefault(label, {}).setdefault("tempo", []).append(tempo_rate)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w") as f:
        json.dump(data, f, indent=2, default=_json_default)


def reduce_baselines(baselines: Dict[str, Dict[str, List[float]]]) -> Dict:
    """Compute mean/std for each metric per speaker class."""
    reduced: Dict[str, Dict[str, Dict[str, float]]] = {}
    for speaker, metrics in baselines.items():
        reduced[speaker] = {}
        for metric, values in metrics.items():
            arr = np.array(values, dtype=float)
            reduced[speaker][metric] = {
                "count": int(arr.size),
                "mean": float(np.mean(arr)) if arr.size else None,
                "std": float(np.std(arr)) if arr.size else None,
                "p10": float(np.percentile(arr, 10)) if arr.size else None,
                "p90": float(np.percentile(arr, 90)) if arr.size else None,
            }
    return reduced


def main() -> None:
    parser = argparse.ArgumentParser(description="Classify speakers in feature JSON files.")
    parser.add_argument("--input", required=True, help="Input file or directory of .features.json files")
    parser.add_argument("--output", required=True, help="Output file or directory")
    parser.add_argument(
        "--baseline-output",
        default=None,
        help="Optional path to write aggregated baselines (defaults to output/_baselines.json in dir mode)",
    )
    args = parser.parse_args()

    in_path = Path(args.input)
    out_path = Path(args.output)
    baseline_out = Path(args.baseline_output) if args.baseline_output else None
    baselines: Dict[str, Dict[str, List[float]]] = {}

    if in_path.is_dir():
        out_path.mkdir(parents=True, exist_ok=True)
        files = sorted(in_path.rglob("*.features.json"))
        for file in files:
            # Calculate relative path to preserve folder structure
            rel_path = file.relative_to(in_path)
            dest = out_path / rel_path
            print(f"[speaker] {file.name} -> {dest.name}")
            process_file(file, dest, baselines)
        if baseline_out is None:
            baseline_out = out_path.parent / "_baselines.json"
    else:
        print(f"[speaker] {in_path} -> {out_path}")
        process_file(in_path, out_path, baselines)
        if baseline_out is None:
            baseline_out = out_path.parent / "_baselines.json"

    if baselines:
        reduced = reduce_baselines(baselines)
        baseline_out.parent.mkdir(parents=True, exist_ok=True)
        with baseline_out.open("w") as f:
            json.dump(reduced, f, indent=2)
        print(f"[speaker] baselines -> {baseline_out}")


if __name__ == "__main__":
    main()
