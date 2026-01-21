#!/usr/bin/env python3
"""
Semantic Tagging for Daygame Transcripts

Uses Ollama to extract semantic tags from transcript chunks:
- topics: ["career", "hobby", "origin", "relationship_status", ...]
- topic_values: {"career": "medicine", "origin": "Germany", ...}
- techniques: ["push_pull", "qualification", "cold_read", ...]
- phase: "opener" | "hook" | "vibe" | "close"

Input: JSON with segments (ideally after detect_conversations.py)
Output: Same JSON with semantic tags added to each segment
"""

from __future__ import annotations

import argparse
import json
import os
import re
import time
from pathlib import Path
from typing import Dict, List, Optional

import requests

# Ollama configuration
OLLAMA_BASE_URL = os.environ.get("OLLAMA_API_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.1")

# Known technique categories
KNOWN_TECHNIQUES = [
    "direct_opener",
    "indirect_opener",
    "situational_opener",
    "push_pull",
    "qualification",
    "disqualification",
    "cold_read",
    "tease",
    "role_play",
    "statement_of_intent",
    "false_time_constraint",
    "assumptive_close",
    "soft_close",
    "number_close",
    "instagram_close",
    "instant_date",
    "kino",
    "reward_frame",
    "compliance_test",
    "neg",
    "callback_humor",
    "storytelling",
    "DHV",  # Demonstrate Higher Value
    "emotion_spike",
    "grounding",
]

# Known topic categories
KNOWN_TOPICS = [
    "origin",        # Where she's from
    "career",        # Job/work
    "hobby",         # Activities, interests
    "age",           # Age discussion
    "appearance",    # Looks, style, outfit
    "personality",   # Character traits
    "relationship",  # Relationship status
    "travel",        # Travel experiences
    "food_drinks",   # Food, coffee, drinks
    "plans",         # Current plans, where going
    "contact",       # Getting number/instagram
    "logistics",     # Meeting up, instant date
]

# Phase patterns for quick classification
PHASE_PATTERNS = {
    "opener": [
        r"^(excuse me|hey|hi),?(\s|$)",
        r"^(one|two|quick) (second|sec)",
        r"i (just )?(saw|noticed) you",
        r"this is (so )?random",
        r"i had to (come|stop|say)",
        r"you caught my (eye|attention)",
    ],
    "hook": [
        r"what's your name",
        r"where (are you|you) from",
        r"nice to meet you",
    ],
    "vibe": [
        r"(i like|i love|i noticed)",
        r"that's (cool|nice|interesting)",
        r"you (seem|look|sound)",
        r"(tell me|what about)",
    ],
    "close": [
        r"can i (get|have|take) your",
        r"(give|put in) your number",
        r"what's your (number|instagram)",
        r"we should (hang out|grab|get)",
        r"let('s| us) (exchange|swap)",
        r"(meet|see) (you |)later",
        r"instant date",
    ],
}


def compile_phase_patterns():
    return {
        phase: [re.compile(p, re.IGNORECASE) for p in patterns]
        for phase, patterns in PHASE_PATTERNS.items()
    }


class SemanticTagger:
    def __init__(self, use_llm: bool = True):
        self.use_llm = use_llm
        self.phase_patterns = compile_phase_patterns()

    def _detect_phase_heuristic(self, text: str, prev_phase: Optional[str] = None) -> str:
        """Detect phase using pattern matching."""
        text_lower = text.lower().strip()

        for phase, patterns in self.phase_patterns.items():
            for pattern in patterns:
                if pattern.search(text_lower):
                    return phase

        # Use conversation flow
        if prev_phase == "opener":
            return "hook"
        elif prev_phase == "hook":
            return "vibe"
        elif prev_phase == "vibe":
            return "vibe"  # Stay in vibe until close

        return prev_phase or "unknown"

    def _call_ollama(self, prompt: str, retries: int = 3) -> Optional[str]:
        """Call Ollama API with retry logic."""
        for attempt in range(retries):
            try:
                response = requests.post(
                    f"{OLLAMA_BASE_URL}/api/generate",
                    json={
                        "model": OLLAMA_MODEL,
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.3,
                            "num_predict": 400,
                        }
                    },
                    timeout=60
                )
                if response.ok:
                    return response.json().get("response", "")
            except requests.exceptions.RequestException as e:
                if attempt < retries - 1:
                    time.sleep(1)
                    continue
                print(f"[tag_semantics] Ollama error: {e}")
        return None

    def _tag_with_llm(self, segments: List[Dict], start_idx: int, batch_size: int = 5) -> List[Dict]:
        """Use LLM to tag a batch of segments."""
        batch = segments[start_idx:start_idx + batch_size]

        segment_texts = []
        for i, seg in enumerate(batch):
            speaker = seg.get("speaker", {}).get("label", "unknown")
            text = seg.get("text", "").strip()
            segment_texts.append(f"[{i}] ({speaker}): {text}")

        techniques_list = ", ".join(KNOWN_TECHNIQUES[:15])
        topics_list = ", ".join(KNOWN_TOPICS)

        prompt = f"""Analyze these daygame conversation segments and extract semantic tags.

Segments:
{chr(10).join(segment_texts)}

For each segment, identify:
1. phase: opener, hook, vibe, or close
2. techniques: from [{techniques_list}, ...]
3. topics: from [{topics_list}]
4. topic_values: specific values like {{"origin": "Germany", "career": "student"}}

Return ONLY a JSON array:
[
  {{"index": 0, "phase": "...", "techniques": [...], "topics": [...], "topic_values": {{}}}},
  ...
]

Only include techniques/topics actually present. Be concise."""

        response = self._call_ollama(prompt)
        if not response:
            return self._tag_heuristic(batch)

        try:
            json_match = re.search(r'\[[\s\S]*\]', response)
            if json_match:
                analyses = json.loads(json_match.group())
                results = []
                for item in analyses:
                    results.append({
                        "phase": item.get("phase", "unknown"),
                        "techniques": item.get("techniques", []),
                        "topics": item.get("topics", []),
                        "topic_values": item.get("topic_values", {}),
                        "method": "llm"
                    })
                return results
        except (json.JSONDecodeError, KeyError) as e:
            print(f"[tag_semantics] Failed to parse LLM response: {e}")

        return self._tag_heuristic(batch)

    def _tag_heuristic(self, segments: List[Dict]) -> List[Dict]:
        """Fallback heuristic tagging."""
        results = []
        prev_phase = None

        for seg in segments:
            text = seg.get("text", "").strip()
            phase = self._detect_phase_heuristic(text, prev_phase)

            # Simple topic detection
            topics = []
            topic_values = {}
            text_lower = text.lower()

            if re.search(r"where (are you|you) from|from (here|where)", text_lower):
                topics.append("origin")
            if re.search(r"what (do you do|is your job|work)", text_lower):
                topics.append("career")
            if re.search(r"(your name|my name|i'm |i am )\w+", text_lower):
                topics.append("introduction")
            if re.search(r"(instagram|insta|number|whatsapp)", text_lower):
                topics.append("contact")
            if re.search(r"(coffee|drink|cocktail|grab|meet)", text_lower):
                topics.append("logistics")

            results.append({
                "phase": phase,
                "techniques": [],  # Hard to detect heuristically
                "topics": topics,
                "topic_values": topic_values,
                "method": "heuristic"
            })

            prev_phase = phase

        return results

    def tag_segments(self, segments: List[Dict]) -> List[Dict]:
        """Main entry point: tag all segments with semantic information."""
        if not segments:
            return segments

        total = len(segments)
        batch_size = 5

        idx = 0
        while idx < total:
            if self.use_llm:
                tags = self._tag_with_llm(segments, idx, batch_size)
            else:
                batch = segments[idx:idx + batch_size]
                tags = self._tag_heuristic(batch)

            # Apply tags to segments
            for i, tag_data in enumerate(tags):
                seg_idx = idx + i
                if seg_idx >= total:
                    break

                segments[seg_idx]["semantic_tags"] = {
                    "phase": tag_data.get("phase", "unknown"),
                    "techniques": tag_data.get("techniques", []),
                    "topics": tag_data.get("topics", []),
                    "topic_values": tag_data.get("topic_values", {}),
                    "tagging_method": tag_data.get("method", "unknown"),
                }

            idx += batch_size

            if (idx % 50) == 0:
                print(f"[tag_semantics] Tagged {idx}/{total} segments...")

        return segments


def process_file(input_path: Path, output_path: Path, use_llm: bool = True) -> Dict:
    """Load a transcript JSON, add semantic tags, and save."""
    with input_path.open("r") as f:
        data = json.load(f)

    tagger = SemanticTagger(use_llm=use_llm)
    segments = data.get("segments", [])

    print(f"[tag_semantics] Processing {input_path.name} ({len(segments)} segments)")

    tagged_segments = tagger.tag_segments(segments)
    data["segments"] = tagged_segments

    # Create summary
    phase_counts: Dict[str, int] = {}
    technique_counts: Dict[str, int] = {}
    topic_counts: Dict[str, int] = {}

    for seg in tagged_segments:
        tags = seg.get("semantic_tags", {})
        phase = tags.get("phase", "unknown")
        phase_counts[phase] = phase_counts.get(phase, 0) + 1

        for tech in tags.get("techniques", []):
            technique_counts[tech] = technique_counts.get(tech, 0) + 1

        for topic in tags.get("topics", []):
            topic_counts[topic] = topic_counts.get(topic, 0) + 1

    data["semantic_summary"] = {
        "phase_distribution": phase_counts,
        "techniques_found": technique_counts,
        "topics_covered": topic_counts,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w") as f:
        json.dump(data, f, indent=2)

    print(f"[tag_semantics] Phase distribution: {phase_counts}")
    print(f"[tag_semantics] Techniques found: {len(technique_counts)}")
    print(f"[tag_semantics] Topics covered: {len(topic_counts)}")

    return data


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Add semantic tags to transcript segments."
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Input JSON file or directory (ideally .conversations.json)"
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Output JSON file or directory"
    )
    parser.add_argument(
        "--no-llm",
        action="store_true",
        help="Use only heuristics (no LLM calls)"
    )
    parser.add_argument(
        "--suffix",
        default=".tagged.json",
        help="Output file suffix (default: .tagged.json)"
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)
    use_llm = not args.no_llm

    if use_llm:
        # Test Ollama connection
        try:
            response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
            if not response.ok:
                print(f"[tag_semantics] Warning: Ollama not available, using heuristics only")
                use_llm = False
        except requests.exceptions.RequestException:
            print(f"[tag_semantics] Warning: Cannot connect to Ollama at {OLLAMA_BASE_URL}")
            use_llm = False

    if input_path.is_dir():
        output_path.mkdir(parents=True, exist_ok=True)
        # Process .conversations.json files preferentially
        files = sorted(input_path.rglob("*.conversations.json"))
        if not files:
            files = sorted(
                f for f in input_path.rglob("*.json")
                if not f.name.endswith(args.suffix)
                and not f.name.endswith(".tagged.json")
            )

        for file in files:
            rel_path = file.relative_to(input_path)
            stem = file.stem
            if stem.endswith(".conversations"):
                stem = stem[:-14]
            new_name = f"{stem}{args.suffix}"
            dest = output_path / rel_path.parent / new_name

            print(f"\n[tag_semantics] {file.name} -> {dest.name}")
            process_file(file, dest, use_llm)
    else:
        print(f"[tag_semantics] {input_path} -> {output_path}")
        process_file(input_path, output_path, use_llm)


if __name__ == "__main__":
    main()
