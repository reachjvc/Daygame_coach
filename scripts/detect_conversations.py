#!/usr/bin/env python3
"""
Conversation Boundary Detection for Daygame Transcripts

Uses LLM (Ollama) to identify conversation boundaries in transcripts.
This is critical for separating distinct approaches from commentary sections.

Input: Whisper JSON with segments (or classified JSON)
Output: Same JSON with `conversation_id` and `segment_type` added to each segment

Segment types:
- approach: Part of an actual approach/interaction with a woman
- commentary: Coach talking to camera (theory, explanation, breakdown)
- transition: Brief transition between segments
"""

from __future__ import annotations

import argparse
import json
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import requests

# Ollama configuration
OLLAMA_BASE_URL = os.environ.get("OLLAMA_API_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.1")

# Batch size for LLM analysis (process segments in windows)
WINDOW_SIZE = 10
WINDOW_OVERLAP = 3

# Patterns that strongly indicate different segment types
COMMENTARY_PATTERNS = [
    r"(hey |hi )?(guys|everyone|youtube)",
    r"adam here",
    r"welcome back",
    r"(let me|i('ll| will)) (explain|break down|show you)",
    r"what you('re| are) (about to|going to) see",
    r"as you (saw|can see|noticed)",
    r"(this|that) is (what|why|how)",
    r"(the reason|the key|the trick|the point) (is|here)",
    r"notice (how|here|that)",
    r"(so|okay),? (guys|basically|to summarize)",
    r"(first|second|third)(ly)?",
    r"tip (number )?\d",
    r"mistake (number )?\d",
    r"(don't|do not) (do|want|forget)",
    r"(always|never) (do|say|approach)",
    r"thank(s| you) for (watching|listening)",
    r"(subscribe|like|comment|link)",
    r"coaching|bootcamp|program",
]

APPROACH_STARTER_PATTERNS = [
    r"^excuse me",
    r"^hey,? (just )?(one|two|quick) sec",
    r"^(hi|hey|hello),? (i )?(just )?(saw|noticed) you",
    r"^this is (so |really )?random",
    r"^i had to (come|stop|say)",
]

APPROACH_EXCHANGE_PATTERNS = [
    r"what's your name",
    r"where (are you|you) from",
    r"(nice|good|great) to meet you",
    r"can i get your (number|instagram)",
    r"you('re| are) (so |really |very )?(cute|beautiful|pretty)",
    r"do you have (instagram|whatsapp)",
]


@dataclass
class SegmentAnalysis:
    """Result of analyzing a segment's type and conversation membership."""
    segment_type: str  # "approach", "commentary", "transition"
    conversation_id: int
    is_new_conversation: bool
    confidence: float
    reasoning: str


def compile_patterns(patterns: List[str]) -> List[re.Pattern]:
    return [re.compile(p, re.IGNORECASE) for p in patterns]


class ConversationDetector:
    def __init__(self, use_llm: bool = True):
        self.use_llm = use_llm
        self.commentary_re = compile_patterns(COMMENTARY_PATTERNS)
        self.approach_start_re = compile_patterns(APPROACH_STARTER_PATTERNS)
        self.approach_exchange_re = compile_patterns(APPROACH_EXCHANGE_PATTERNS)

    def _heuristic_classify(self, text: str, prev_type: Optional[str] = None) -> Tuple[str, float]:
        """Quick heuristic classification before LLM analysis."""
        text_lower = text.lower().strip()

        # Check for commentary patterns
        commentary_score = sum(1 for p in self.commentary_re if p.search(text_lower))

        # Check for approach patterns
        approach_score = sum(1 for p in self.approach_start_re if p.search(text_lower))
        approach_score += sum(0.5 for p in self.approach_exchange_re if p.search(text_lower))

        # Short responses are likely approach exchanges
        word_count = len(text.split())
        if word_count < 8 and "?" not in text:
            approach_score += 0.5

        # Questions from coach are likely approach
        if text.strip().endswith("?") and word_count < 15:
            approach_score += 0.5

        if commentary_score > approach_score and commentary_score > 0:
            return "commentary", min(0.9, 0.5 + commentary_score * 0.1)
        elif approach_score > commentary_score and approach_score > 0:
            return "approach", min(0.9, 0.5 + approach_score * 0.1)

        # Default to previous type with low confidence
        return prev_type or "unknown", 0.3

    def _is_likely_new_approach(self, text: str) -> bool:
        """Check if this segment likely starts a new approach."""
        text_lower = text.lower().strip()
        return any(p.search(text_lower) for p in self.approach_start_re)

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
                            "num_predict": 500,
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
                print(f"[detect_conversations] Ollama error: {e}")
        return None

    def _analyze_window_with_llm(
        self,
        segments: List[Dict],
        start_idx: int,
        current_conversation_id: int,
        prev_type: str
    ) -> List[SegmentAnalysis]:
        """Use LLM to analyze a window of segments."""
        window = segments[start_idx:start_idx + WINDOW_SIZE]

        # Build context for LLM
        segment_texts = []
        for i, seg in enumerate(window):
            text = seg.get("text", "").strip()
            segment_texts.append(f"[{i}] {text}")

        prompt = f"""Analyze these transcript segments from a daygame video where a coach approaches women on the street.

Classify each segment as one of:
- "approach": Part of an actual conversation with a woman (opener, vibing, number close, etc.)
- "commentary": Coach talking to camera (explanation, theory, breakdown, intro/outro)
- "transition": Brief marker between sections

Also identify if a segment starts a NEW approach (a different woman).

Previous segment type: {prev_type}
Current conversation ID: {current_conversation_id}

Segments:
{chr(10).join(segment_texts)}

Respond with ONLY a JSON array, one object per segment:
[
  {{"index": 0, "type": "approach"|"commentary"|"transition", "new_conversation": true|false, "confidence": 0.0-1.0}},
  ...
]

Key signals:
- Openers like "excuse me", "two seconds", "I just saw you" start NEW approaches
- Short responses like "yeah", "kind of", "thank you" are likely approach exchanges (girl talking)
- References to "you guys", "as you can see", "notice how" are commentary
- New conversations start when coach approaches a different woman"""

        response = self._call_ollama(prompt)
        if not response:
            # Fallback to heuristics
            return self._analyze_window_heuristic(window, current_conversation_id, prev_type)

        # Parse LLM response
        try:
            # Extract JSON from response (handle markdown code blocks)
            json_match = re.search(r'\[[\s\S]*\]', response)
            if json_match:
                analyses = json.loads(json_match.group())
                results = []
                conv_id = current_conversation_id

                for item in analyses:
                    idx = item.get("index", 0)
                    seg_type = item.get("type", "unknown")
                    is_new = item.get("new_conversation", False)
                    confidence = item.get("confidence", 0.5)

                    if is_new and seg_type == "approach":
                        conv_id += 1

                    results.append(SegmentAnalysis(
                        segment_type=seg_type,
                        conversation_id=conv_id if seg_type == "approach" else 0,
                        is_new_conversation=is_new,
                        confidence=confidence,
                        reasoning="llm_analysis"
                    ))

                return results
        except (json.JSONDecodeError, KeyError) as e:
            print(f"[detect_conversations] Failed to parse LLM response: {e}")

        return self._analyze_window_heuristic(window, current_conversation_id, prev_type)

    def _analyze_window_heuristic(
        self,
        window: List[Dict],
        current_conversation_id: int,
        prev_type: str
    ) -> List[SegmentAnalysis]:
        """Fallback heuristic analysis when LLM is unavailable."""
        results = []
        conv_id = current_conversation_id
        last_type = prev_type

        for seg in window:
            text = seg.get("text", "").strip()
            seg_type, confidence = self._heuristic_classify(text, last_type)

            is_new = False
            if seg_type == "approach" and self._is_likely_new_approach(text):
                is_new = True
                conv_id += 1

            results.append(SegmentAnalysis(
                segment_type=seg_type,
                conversation_id=conv_id if seg_type == "approach" else 0,
                is_new_conversation=is_new,
                confidence=confidence,
                reasoning="heuristic"
            ))

            last_type = seg_type

        return results

    def detect_conversations(self, segments: List[Dict]) -> List[Dict]:
        """Main entry point: detect conversation boundaries in all segments."""
        if not segments:
            return segments

        total = len(segments)
        current_conversation_id = 0
        prev_type = "unknown"

        # Process in overlapping windows
        idx = 0
        while idx < total:
            end_idx = min(idx + WINDOW_SIZE, total)

            if self.use_llm:
                analyses = self._analyze_window_with_llm(
                    segments, idx, current_conversation_id, prev_type
                )
            else:
                window = segments[idx:end_idx]
                analyses = self._analyze_window_heuristic(
                    window, current_conversation_id, prev_type
                )

            # Apply analyses to segments (only for non-overlapping portion)
            non_overlap_count = WINDOW_SIZE - WINDOW_OVERLAP if idx > 0 else WINDOW_SIZE
            for i, analysis in enumerate(analyses[:non_overlap_count]):
                seg_idx = idx + i
                if seg_idx >= total:
                    break

                segments[seg_idx]["conversation_id"] = analysis.conversation_id
                segments[seg_idx]["segment_type"] = analysis.segment_type
                segments[seg_idx]["boundary_detection"] = {
                    "is_new_conversation": analysis.is_new_conversation,
                    "confidence": analysis.confidence,
                    "method": analysis.reasoning,
                }

                if analysis.conversation_id > current_conversation_id:
                    current_conversation_id = analysis.conversation_id
                prev_type = analysis.segment_type

            # Move to next window
            idx += WINDOW_SIZE - WINDOW_OVERLAP
            if idx >= total:
                break

            # Progress indicator
            if (idx % 50) == 0:
                print(f"[detect_conversations] Processed {idx}/{total} segments...")

        return segments


def process_file(input_path: Path, output_path: Path, use_llm: bool = True) -> Dict:
    """Load a transcript JSON, detect conversations, and save."""
    with input_path.open("r") as f:
        data = json.load(f)

    detector = ConversationDetector(use_llm=use_llm)
    segments = data.get("segments", [])

    print(f"[detect_conversations] Processing {input_path.name} ({len(segments)} segments)")

    processed_segments = detector.detect_conversations(segments)
    data["segments"] = processed_segments

    # Create summary
    conversation_ids = set()
    type_counts: Dict[str, int] = {}
    for seg in processed_segments:
        conv_id = seg.get("conversation_id", 0)
        if conv_id > 0:
            conversation_ids.add(conv_id)
        seg_type = seg.get("segment_type", "unknown")
        type_counts[seg_type] = type_counts.get(seg_type, 0) + 1

    data["conversation_summary"] = {
        "total_conversations": len(conversation_ids),
        "segment_type_counts": type_counts,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w") as f:
        json.dump(data, f, indent=2)

    print(f"[detect_conversations] Found {len(conversation_ids)} distinct conversations")
    print(f"[detect_conversations] Segment types: {type_counts}")

    return data


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Detect conversation boundaries in transcript segments."
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Input Whisper JSON file or directory"
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
        default=".conversations.json",
        help="Output file suffix (default: .conversations.json)"
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
                print(f"[detect_conversations] Warning: Ollama not available, using heuristics only")
                use_llm = False
        except requests.exceptions.RequestException:
            print(f"[detect_conversations] Warning: Cannot connect to Ollama at {OLLAMA_BASE_URL}")
            use_llm = False

    if input_path.is_dir():
        output_path.mkdir(parents=True, exist_ok=True)
        # Process both .json and .classified.json files
        files = sorted(
            f for f in input_path.rglob("*.json")
            if not f.name.endswith(args.suffix)
            and not f.name.endswith(".conversations.json")
        )

        for file in files:
            rel_path = file.relative_to(input_path)
            # Create output filename
            stem = file.stem
            if stem.endswith(".classified"):
                stem = stem[:-11]  # Remove .classified
            new_name = f"{stem}{args.suffix}"
            dest = output_path / rel_path.parent / new_name

            print(f"\n[detect_conversations] {file.name} -> {dest.name}")
            process_file(file, dest, use_llm)
    else:
        print(f"[detect_conversations] {input_path} -> {output_path}")
        process_file(input_path, output_path, use_llm)


if __name__ == "__main__":
    main()
