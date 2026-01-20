#!/usr/bin/env python3
"""
Tonality Classification for Daygame Audio

Classifies each segment's tone based on audio features and text.
- playful
- confident
- warm
- nervous
- neutral

Reads feature files, adds a 'tone' dictionary, and overwrites them.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict


def classify_tone(features: Dict, text: str) -> Dict:
    """Rule-based tone classification using audio features + text."""
    if not features:
        return {"primary": "unknown", "confidence": 0.0, "scores": {}}

    tones = {
        "playful": 0,
        "confident": 0,
        "warm": 0,
        "nervous": 0,
        "neutral": 1,  # Default score
    }

    pitch = features.get("pitch") or {}
    energy = features.get("energy") or {}
    tempo = features.get("tempo") or {}
    text_lower = text.lower()

    # Playful indicators
    if pitch.get("range_hz", 0) > 80:
        tones["playful"] += 2
    if pitch.get("direction", 0) > 0.1:  # More significant rising intonation
        tones["playful"] += 1

    # Confident indicators
    if energy.get("mean_db", -100) > -20:
        tones["confident"] += 2
    if 3 < tempo.get("syllable_rate", 0) < 5.5:
        tones["confident"] += 1
    if pitch.get("std_hz", 100) < 30:
        tones["confident"] += 1

    # Nervous indicators
    if tempo.get("syllable_rate", 0) > 6:
        tones["nervous"] += 2
    if (pitch.get("mean_hz") or 150) > 180:  # Assuming male baseline
        tones["nervous"] += 1
    if "um" in text_lower or "uh" in text_lower:
        tones["nervous"] += 2

    # Warm indicators
    if energy.get("dynamics_db", 0) > 6:
        tones["warm"] += 1
    if 100 < (pitch.get("mean_hz") or 150) < 140:
        tones["warm"] += 1

    # Find dominant tone
    max_tone = max(tones, key=tones.get)
    max_score = tones[max_tone]

    # If neutral is still the max, it's neutral.
    if max_tone == "neutral" and max_score == 1:
        return {"primary": "neutral", "confidence": 1.0, "scores": tones}

    total_score = sum(tones.values())
    confidence = max_score / total_score if total_score > 0 else 0.0

    return {"primary": max_tone, "confidence": confidence, "scores": tones}


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


def process_file(path: Path, output_path: Path) -> None:
    with path.open("r") as f:
        data = json.load(f)

    segments = data.get("segments", [])
    for segment in segments:
        speaker_label = (segment.get("speaker") or {}).get("label", "unknown")
        if speaker_label == "voiceover":
            continue

        segment["tone"] = classify_tone(segment.get("features", {}), segment.get("text", ""))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w") as f:
        json.dump(data, f, indent=2, default=_json_default)


def main() -> None:
    parser = argparse.ArgumentParser(description="Classify segment tone in feature JSON files.")
    parser.add_argument("--input", required=True, help="Input directory of .features.json files")
    parser.add_argument("--output", required=True, help="Output directory to write classified files")
    args = parser.parse_args()

    in_path = Path(args.input)
    out_path = Path(args.output)
    out_path.mkdir(parents=True, exist_ok=True)

    for file in sorted(in_path.rglob("*.features.json")):
        # Calculate relative path to preserve folder structure
        rel_path = file.relative_to(in_path)
        dest = out_path / rel_path
        print(f"[tonality] {file.name} -> {dest.name}")
        process_file(file, dest)


if __name__ == "__main__":
    main()