#!/usr/bin/env python3
"""
Content Classification for Daygame Transcripts

Classifies transcript segments as:
- intro/outro (discard)
- theory (knowledge base)
- infield (primary training data)
- breakdown (commentary)
- transition (segment markers)

Uses regex patterns + simple context smoothing. Input is a Whisper JSON
with segments. Output is written as JSON with content_type labels and a
summary.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List

# Pattern definitions
INTRO_PATTERNS = [
    r"hey guys",
    r"what's up (everyone|guys|youtube)",
    r"welcome back",
    r"in today's video",
    r"before we (get into|start)",
    r"let's get into it",
]

OUTRO_PATTERNS = [
    r"thanks for watching",
    r"see you (in the next|next time)",
    r"don't forget to subscribe",
    r"links in the description",
]

INFIELD_STARTERS = [
    r"excuse me",
    r"hey,? (one|two|quick) (second|sec)",
    r"i (just )?(saw|noticed) you",
    r"this is (so )?random",
    r"i had to (come|stop)",
]

INFIELD_EXCHANGES = [
    r"what's your name",
    r"where (are you|you) from",
    r"can i get your (number|instagram)",
    r"nice to meet you",
    r"you('re| are) (so |really |very )?cute",
]

THEORY_PATTERNS = [
    r"the (reason|key|trick|secret) (is|to)",
    r"what (you|i) (want|need) to do",
    r"let me (explain|break down|tell you)",
    r"(most|many) guys",
    r"the psychology",
    r"(always|never) (do|say) this",
    r"tip (number )?\d",
    r"mistake (number )?\d",
]

TRANSITION_PATTERNS = [
    r"let's (see|watch|look at) (another|the next)",
    r"here's another",
    r"next (approach|interaction|one)",
    r"moving on",
    r"okay so",
]


class ContentClassifier:
    def __init__(self) -> None:
        self.compiled_patterns = {
            "intro": [re.compile(p, re.IGNORECASE) for p in INTRO_PATTERNS],
            "outro": [re.compile(p, re.IGNORECASE) for p in OUTRO_PATTERNS],
            "infield_start": [re.compile(p, re.IGNORECASE) for p in INFIELD_STARTERS],
            "infield_exchange": [re.compile(p, re.IGNORECASE) for p in INFIELD_EXCHANGES],
            "theory": [re.compile(p, re.IGNORECASE) for p in THEORY_PATTERNS],
            "transition": [re.compile(p, re.IGNORECASE) for p in TRANSITION_PATTERNS],
        }

    def classify_segment(self, text: str, context: Dict | None = None) -> Dict:
        """Classify a single text segment."""
        text_lower = text.lower().strip()
        scores = {
            "intro": 0,
            "outro": 0,
            "infield": 0,
            "theory": 0,
            "transition": 0,
        }

        for pattern in self.compiled_patterns["intro"]:
            if pattern.search(text_lower):
                scores["intro"] += 2

        for pattern in self.compiled_patterns["outro"]:
            if pattern.search(text_lower):
                scores["outro"] += 2

        for pattern in self.compiled_patterns["infield_start"]:
            if pattern.search(text_lower):
                scores["infield"] += 3

        for pattern in self.compiled_patterns["infield_exchange"]:
            if pattern.search(text_lower):
                scores["infield"] += 2

        for pattern in self.compiled_patterns["theory"]:
            if pattern.search(text_lower):
                scores["theory"] += 2

        for pattern in self.compiled_patterns["transition"]:
            if pattern.search(text_lower):
                scores["transition"] += 2

        if context:
            position = context.get("position_ratio", 0.5)
            if position < 0.1:
                scores["intro"] += 1
            if position > 0.9:
                scores["outro"] += 1

        word_count = len(text.split())
        if word_count < 5 and "?" not in text:
            scores["infield"] += 1
        if text.strip().endswith("?"):
            scores["infield"] += 1

        max_type = max(scores, key=scores.get)
        max_score = scores[max_type]
        total = sum(scores.values()) or 1
        confidence = max_score / total

        return {
            "type": max_type if max_score > 0 else "unknown",
            "confidence": confidence if max_score > 0 else 0.0,
            "scores": scores,
        }

    def classify_transcript(self, segments: List[Dict]) -> List[Dict]:
        """Classify all segments with light context smoothing."""
        total_segments = len(segments)
        results = []

        for i, segment in enumerate(segments):
            context = {
                "position_ratio": i / total_segments if total_segments else 0,
                "prev_text": segments[i - 1].get("text", "") if i > 0 else "",
                "next_text": segments[i + 1].get("text", "") if i < total_segments - 1 else "",
            }
            classification = self.classify_segment(segment.get("text", ""), context)
            segment["content_type"] = classification
            results.append(segment)

        return self._smooth_classifications(results)

    def _smooth_classifications(self, segments: List[Dict]) -> List[Dict]:
        """Smooth isolated misclassifications using neighbors."""
        for i in range(1, len(segments) - 1):
            prev_type = segments[i - 1]["content_type"]["type"]
            curr_type = segments[i]["content_type"]["type"]
            next_type = segments[i + 1]["content_type"]["type"]
            if prev_type == next_type and curr_type != prev_type:
                if segments[i]["content_type"].get("confidence", 0) < 0.7:
                    segments[i]["content_type"]["type"] = prev_type
                    segments[i]["content_type"]["smoothed"] = True
        return segments


def process_transcript_file(input_path: Path, output_path: Path) -> Dict:
    """Load a Whisper JSON, classify content, and save."""
    with input_path.open("r") as f:
        data = json.load(f)

    classifier = ContentClassifier()
    segments = data.get("segments", [])
    classified_segments = classifier.classify_transcript(segments)
    data["segments"] = classified_segments

    type_counts: Dict[str, int] = {}
    for seg in classified_segments:
        t = seg["content_type"]["type"]
        type_counts[t] = type_counts.get(t, 0) + 1
    data["content_summary"] = type_counts

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w") as f:
        json.dump(data, f, indent=2)

    return data


def main() -> None:
    parser = argparse.ArgumentParser(description="Classify transcript segments by content type.")
    parser.add_argument("--input", required=True, help="Input file or directory of Whisper JSONs.")
    parser.add_argument(
        "--output",
        required=True,
        help="Output file or directory to write classified JSONs.",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if input_path.is_dir():
        output_path.mkdir(parents=True, exist_ok=True)
        files = sorted(f for f in input_path.glob("*.json") if not f.name.endswith(".classified.json"))
        for file in files:
            out_file = output_path / f"{file.stem}.classified.json"
            print(f"[content] {file.name} -> {out_file.name}")
            process_transcript_file(file, out_file)
    else:
        print(f"[content] {input_path} -> {output_path}")
        process_transcript_file(input_path, output_path)


if __name__ == "__main__":
    main()
