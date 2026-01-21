#!/usr/bin/env python3
"""
Speaker Classification for Daygame Audio

Classifies each segment as:
- coach (male)
- target (female)
- voiceover
- ambiguous/unknown

Uses a hybrid approach:
1. Audio features (pitch, brightness) - original method
2. Text content patterns (questions, responses) - new
3. Conversation structure (alternating speakers) - new
4. Segment type context (from detect_conversations.py) - new

Produces baselines per speaker class and writes updated feature files with speaker labels.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np


# Text patterns for speaker classification
COACH_TEXT_PATTERNS = [
    # Openers
    r"^(excuse me|hey|hi),?(\s|$)",
    r"^(one|two|quick) (second|sec)",
    r"^i (just )?(saw|noticed) you",
    r"^this is (so |really )?random",
    r"^i had to (come|stop|say)",
    # Questions coaches typically ask
    r"what's your name",
    r"where (are you|you) from",
    r"what (do you do|are you up to|brings you)",
    r"how (long|old|tall)",
    r"do you (have|live|work|study)",
    r"can i (get|have|take) your",
    r"why don't (you|we)",
    r"let('s| me| us)",
    # Statements of intent
    r"i (like|love|noticed) (your|how|that)",
    r"you (look|seem|have)",
    r"i('m| am) (going to|gonna)",
    r"we (should|could|can)",
    # Commentary patterns (coach talking to camera)
    r"(hey |hi )?(guys|everyone)",
    r"as you (can see|saw|noticed)",
    r"notice (how|that|here)",
    r"the (reason|key|trick|point)",
    r"what you('re| are) (about to|going to)",
    r"(this|that) is (what|why|how|the)",
]

GIRL_TEXT_PATTERNS = [
    # Short responses
    r"^(yeah|yes|no|maybe|kind of|sort of|i guess|i think so|thank you|thanks)(\.|,|!|\?)?$",
    r"^(oh|wow|really|nice|cool|okay|ok|sure|right|exactly)(\.|,|!|\?)?$",
    r"^(haha|hehe|lol)$",
    # Self-descriptions (often in response to coach questions)
    r"^i('m| am) (from|a|an|studying|working)",
    r"^i (work|study|live|do|have)",
    r"^my (name|job|work) is",
    r"^it's .{1,30}$",  # Short answers like "It's Maria"
    # Reactions
    r"^that's (nice|cool|sweet|funny|cute|interesting)",
    r"^you('re| are) (so |very |really )?(funny|nice|sweet|cute)",
    # Questions girls typically ask back
    r"^(and |so )?(what about you|how about you|you\?)",
    r"^where are you from",
    r"^what('s| is) your (name|job)",
]


def classify_by_text(text: str, prev_speaker: Optional[str] = None) -> Dict:
    """
    Classify speaker based on text content patterns.

    Returns:
        Dict with keys: speaker, confidence, reasons
    """
    text_lower = text.lower().strip()
    word_count = len(text.split())

    coach_score = 0
    girl_score = 0
    reasons: List[str] = []

    # Check coach patterns
    for pattern in COACH_TEXT_PATTERNS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            coach_score += 2
            reasons.append(f"coach_pattern:{pattern[:20]}")

    # Check girl patterns
    for pattern in GIRL_TEXT_PATTERNS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            girl_score += 2
            reasons.append(f"girl_pattern:{pattern[:20]}")

    # Short responses are more likely to be girl
    if word_count <= 5 and "?" not in text:
        girl_score += 1
        reasons.append("short_response")

    # Very short responses (1-2 words) strongly suggest girl
    if word_count <= 2 and len(text) < 15:
        girl_score += 2
        reasons.append("very_short_response")

    # Questions from someone are more likely coach (initiating)
    if text.strip().endswith("?") and word_count > 3:
        coach_score += 1
        reasons.append("asking_question")

    # Long statements/explanations are more likely coach
    if word_count > 20:
        coach_score += 1
        reasons.append("long_statement")

    # Use alternation as a tiebreaker
    if prev_speaker and coach_score == girl_score:
        if prev_speaker == "coach":
            girl_score += 0.5
            reasons.append("alternation_from_coach")
        elif prev_speaker == "target":
            coach_score += 0.5
            reasons.append("alternation_from_target")

    total = coach_score + girl_score
    if total == 0:
        return {"speaker": "unknown", "confidence": 0.0, "reasons": reasons}

    if coach_score > girl_score:
        confidence = min(0.9, coach_score / (total + 1))
        return {"speaker": "coach", "confidence": confidence, "reasons": reasons}
    elif girl_score > coach_score:
        confidence = min(0.9, girl_score / (total + 1))
        return {"speaker": "target", "confidence": confidence, "reasons": reasons}

    return {"speaker": "ambiguous", "confidence": 0.3, "reasons": reasons}


def classify_speaker_audio(features: Dict) -> Dict:
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


def classify_speaker_hybrid(
    segment: Dict,
    prev_speaker: Optional[str] = None,
    segment_type: Optional[str] = None
) -> Dict:
    """
    Hybrid speaker classification combining audio and text features.

    Priority:
    1. If segment_type is "commentary", classify as coach/voiceover
    2. Use text patterns
    3. Use audio features
    4. Use alternation heuristic
    """
    text = segment.get("text", "").strip()
    features = segment.get("features", {})

    # Commentary segments are always coach (voiceover)
    if segment_type == "commentary":
        return {
            "label": "coach",
            "confidence": 0.85,
            "reasons": ["commentary_segment"],
            "method": "segment_type"
        }

    # Get text-based classification
    text_result = classify_by_text(text, prev_speaker)

    # Get audio-based classification
    audio_result = classify_speaker_audio(features)

    # Combine results
    text_speaker = text_result.get("speaker", "unknown")
    text_conf = text_result.get("confidence", 0.0)
    audio_speaker = audio_result.get("speaker", "unknown")
    audio_conf = audio_result.get("confidence", 0.0)

    combined_reasons = text_result.get("reasons", []) + audio_result.get("reasons", [])

    # If both agree, high confidence
    if text_speaker == audio_speaker and text_speaker not in ("unknown", "ambiguous"):
        return {
            "label": text_speaker,
            "confidence": min(0.95, (text_conf + audio_conf) / 2 + 0.2),
            "reasons": combined_reasons,
            "method": "hybrid_agreement"
        }

    # Text has priority for certain patterns
    if text_conf > 0.6 and text_speaker not in ("unknown", "ambiguous"):
        return {
            "label": text_speaker,
            "confidence": text_conf,
            "reasons": combined_reasons,
            "method": "text_priority"
        }

    # Audio has priority if text is inconclusive
    if audio_conf > 0.5 and audio_speaker not in ("unknown", "ambiguous"):
        return {
            "label": audio_speaker,
            "confidence": audio_conf,
            "reasons": combined_reasons,
            "method": "audio_priority"
        }

    # Fallback to alternation
    if prev_speaker == "coach":
        return {
            "label": "target",
            "confidence": 0.4,
            "reasons": combined_reasons + ["alternation_fallback"],
            "method": "alternation"
        }
    elif prev_speaker == "target":
        return {
            "label": "coach",
            "confidence": 0.4,
            "reasons": combined_reasons + ["alternation_fallback"],
            "method": "alternation"
        }

    return {
        "label": "unknown",
        "confidence": 0.2,
        "reasons": combined_reasons,
        "method": "unknown"
    }


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


def process_file(path: Path, output_path: Path, baselines: Dict[str, List[float]], use_hybrid: bool = True) -> None:
    with path.open("r") as f:
        data = json.load(f)

    segments = data.get("segments", [])
    prev_speaker: Optional[str] = None

    for segment in segments:
        # Check for voiceover first (audio-based)
        if detect_voiceover(segment):
            segment["speaker"] = {"label": "voiceover", "confidence": 0.7, "reasons": ["voiceover_pattern"]}
            prev_speaker = "coach"  # voiceover is coach
            continue

        if use_hybrid:
            # Use hybrid classification (text + audio + context)
            segment_type = segment.get("segment_type")  # From detect_conversations.py
            classification = classify_speaker_hybrid(segment, prev_speaker, segment_type)
            segment["speaker"] = {
                "label": classification["label"],
                "confidence": classification["confidence"],
                "reasons": classification.get("reasons", []),
                "method": classification.get("method", "unknown"),
            }
        else:
            # Legacy: audio-only classification
            classification = classify_speaker_audio(segment.get("features"))
            segment["speaker"] = {
                "label": classification["speaker"],
                "confidence": classification["confidence"],
                "reasons": classification.get("reasons", []),
            }

        label = segment["speaker"]["label"]
        prev_speaker = label if label in ("coach", "target") else prev_speaker

        # Collect baselines for coach/target
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
