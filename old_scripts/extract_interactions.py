#!/usr/bin/env python3
"""
Interaction Extraction from Daygame Transcripts

Identifies complete approaches using:
1. conversation_id from detect_conversations.py (preferred)
2. Heuristic boundary detection (fallback)

Then:
- Segments into phases (opener, hook, vibe, close)
- Labels outcomes where detectable
- Outputs JSONL interactions with turn-level speaker/phase/audio refs
"""

from __future__ import annotations

"""
NOTE: This script has moved to:
  scripts/training-data/08.interactions

This file is kept as a compatibility shim. When run as a script, it forwards
execution to the new location.
"""

import runpy
import sys
from pathlib import Path


_MOVED_SCRIPT = Path(__file__).resolve().parent / "training-data" / "08.interactions"
if __name__ == "__main__" and _MOVED_SCRIPT.exists():
    sys.argv[0] = str(_MOVED_SCRIPT)
    runpy.run_path(str(_MOVED_SCRIPT), run_name="__main__")
    raise SystemExit(0)

import argparse
import json
import re
from dataclasses import asdict, dataclass
from enum import Enum
from typing import Dict, List, Optional, Tuple


class InteractionPhase(Enum):
    OPENER = "opener"
    HOOK = "hook"
    VIBE = "vibe"
    CLOSE = "close"
    UNKNOWN = "unknown"


class Outcome(Enum):
    NUMBER = "number"
    INSTAGRAM = "instagram"
    INSTANT_DATE = "instant_date"
    DATE = "date"
    REJECTED = "rejected"
    BLOWOUT = "blowout"
    WALKED_AWAY = "walked_away"
    UNKNOWN = "unknown"


@dataclass
class Turn:
    speaker: str  # coach/target/voiceover/unknown
    text: str
    start: float
    end: float
    phase: InteractionPhase
    audio_clip: Dict
    tone: Optional[Dict] = None
    features: Optional[Dict] = None
    speaker_cluster_id: Optional[str] = None
    semantic_tags: Optional[Dict] = None


@dataclass
class Interaction:
    id: str
    conversation_id: int
    source_video: str
    start_time: float
    end_time: float
    turns: List[Turn]
    outcome: Outcome
    outcome_confidence: float
    content_summary: Dict[str, int]
    techniques: List[str]
    topics: List[str]


OPENER_PATTERNS = [
    r"excuse me",
    r"hey,? (one|two|quick) sec",
    r"i (just )?(saw|noticed) you",
    r"this is (so )?random",
    r"i had to (come|stop|say)",
    r"you caught my (eye|attention)",
    r"i like your (style|outfit|hair|jacket|coat|dress|shoes|boots|energy|vibe)",
    r"you look (really |very |so )?(nice|cool|cute|adorable|elegant)",
    r"hey,? how are you",
    r"hi,? who are you",
]

CLOSE_PATTERNS = [
    r"(can i |let me |i('ll| will) )?(get|have|take) your (number|instagram|insta|snap)",
    r"(give|put in) (me )?your number",
    r"what's your (number|instagram|insta)",
    r"we should (hang out|grab|get)",
    r"let('s| us) (exchange|swap) (numbers|instagrams)",
]

SUCCESS_PATTERNS = [
    r"(yeah|yes|sure|okay),? (here|it's|my)",
    r"i('ll| will) (give|put|type)",
    r"(just )?call me",
    r"(here you go|there you go)",
    r"(what's|give me) your(s| number)",
]

REJECTION_PATTERNS = [
    r"i have a boyfriend",
    r"i('m| am) (married|engaged|taken|seeing someone)",
    r"(no|sorry),? (thanks|thank you|i('m| am) (good|okay|fine))",
    r"i('m| am) (not interested|in a hurry|busy)",
    r"(leave me alone|go away|not interested)",
]

BLOWOUT_PATTERNS = [
    r"(walks away|walked away|she left)",
    r"(ignored|ignoring)",
    r"(no response|didn't respond)",
    r"\[walks away\]",
]


INSTANT_DATE_PATTERNS = [
    r"(grab|get) (a )?(coffee|drink|cocktail)",
    r"join me for",
    r"let's (go|walk|grab)",
    r"come with me",
    r"instant date",
]


def compile_patterns(patterns: List[str]) -> List[re.Pattern]:
    return [re.compile(p, re.IGNORECASE) for p in patterns]


class InteractionExtractor:
    def __init__(self) -> None:
        self.opener_re = compile_patterns(OPENER_PATTERNS)
        self.close_re = compile_patterns(CLOSE_PATTERNS)
        self.success_re = compile_patterns(SUCCESS_PATTERNS)
        self.rejection_re = compile_patterns(REJECTION_PATTERNS)
        self.blowout_re = compile_patterns(BLOWOUT_PATTERNS)
        self.instant_date_re = compile_patterns(INSTANT_DATE_PATTERNS)

    def group_by_conversation_id(self, segments: List[Dict]) -> Dict[int, List[Dict]]:
        """Group segments by conversation_id (from detect_conversations.py)."""
        groups: Dict[int, List[Dict]] = {}
        for seg in segments:
            conv_id = seg.get("conversation_id", 0)
            # Only include approach segments (conv_id > 0)
            if conv_id > 0:
                if conv_id not in groups:
                    groups[conv_id] = []
                groups[conv_id].append(seg)
        return groups

    def has_conversation_ids(self, segments: List[Dict]) -> bool:
        """Check if segments have conversation_id assigned."""
        for seg in segments:
            if seg.get("conversation_id", 0) > 0:
                return True
        return False

    def find_interaction_starts(self, segments: List[Dict]) -> List[int]:
        """Fallback: find interaction starts using opener patterns."""
        starts: List[int] = []
        for i, seg in enumerate(segments):
            text = seg.get("text", "").lower()
            content_type = (seg.get("content_type") or {}).get("type", "unknown")
            for pattern in self.opener_re:
                if pattern.search(text):
                    if i == 0 or self._is_conversation_break(segments, i):
                        starts.append(i)
                        break
        return starts

    def _is_conversation_break(self, segments: List[Dict], index: int) -> bool:
        """Check if there's a conversation break before this segment."""
        if index == 0:
            return True
        curr_seg = segments[index]
        prev_seg = segments[index - 1]

        # Check for new conversation boundary marker
        if curr_seg.get("boundary_detection", {}).get("is_new_conversation", False):
            return True

        # Check for time gap
        curr_start = curr_seg.get("start", 0)
        prev_end = prev_seg.get("end", 0)
        if curr_start - prev_end > 3.0:
            return True

        # Check for segment type change
        prev_type = prev_seg.get("segment_type", "")
        curr_type = curr_seg.get("segment_type", "")
        if prev_type == "commentary" and curr_type == "approach":
            return True

        return False

    def extract_interaction_from_group(
        self, conversation_id: int, segments: List[Dict]
    ) -> Optional[Interaction]:
        """Extract an interaction from a group of segments with the same conversation_id."""
        if len(segments) < 2:
            return None

        turns: List[Turn] = []
        current_phase = InteractionPhase.OPENER
        all_techniques: List[str] = []
        all_topics: List[str] = []

        for seg in segments:
            text = seg.get("text", "").strip()
            speaker_info = seg.get("speaker") or {}
            speaker = speaker_info.get("label", "unknown")
            audio_clip = seg.get("audio_clip") or {
                "file": "",
                "start": seg.get("start", 0.0),
                "end": seg.get("end", 0.0),
            }

            # Use semantic tags if available, otherwise determine phase
            semantic_tags = seg.get("semantic_tags", {})
            if semantic_tags.get("phase") and semantic_tags["phase"] != "unknown":
                phase_str = semantic_tags["phase"]
                phase = InteractionPhase(phase_str) if phase_str in [p.value for p in InteractionPhase] else current_phase
            else:
                phase = self._determine_phase(text, current_phase, speaker)
            current_phase = phase

            # Collect techniques and topics
            all_techniques.extend(semantic_tags.get("techniques", []))
            all_topics.extend(semantic_tags.get("topics", []))

            turns.append(
                Turn(
                    speaker=speaker,
                    text=text,
                    start=float(seg.get("start", 0.0)),
                    end=float(seg.get("end", 0.0)),
                    phase=phase,
                    audio_clip=audio_clip,
                    tone=seg.get("tone"),
                    features=seg.get("features"),
                    speaker_cluster_id=seg.get("speaker_cluster_id"),
                    semantic_tags=semantic_tags if semantic_tags else None,
                )
            )

        outcome, confidence = self._determine_outcome(turns)

        return Interaction(
            id=f"interaction_{conversation_id}",
            conversation_id=conversation_id,
            source_video="",
            start_time=turns[0].start if turns else 0.0,
            end_time=turns[-1].end if turns else 0.0,
            turns=turns,
            outcome=outcome,
            outcome_confidence=confidence,
            content_summary=self._summarize_content(segments),
            techniques=list(set(all_techniques)),
            topics=list(set(all_topics)),
        )

    def extract_interaction(
        self, segments: List[Dict], start_idx: int, next_start_idx: Optional[int] = None
    ) -> Optional[Interaction]:
        """Fallback: extract interaction from segment range (legacy method)."""
        end_idx = next_start_idx if next_start_idx is not None else len(segments)
        interaction_segments = segments[start_idx:end_idx]
        if len(interaction_segments) < 2:
            return None

        turns: List[Turn] = []
        current_phase = InteractionPhase.OPENER

        for seg in interaction_segments:
            text = seg.get("text", "").strip()
            speaker_info = seg.get("speaker") or {}
            speaker = speaker_info.get("label", "unknown")
            audio_clip = seg.get("audio_clip") or {
                "file": "",
                "start": seg.get("start", 0.0),
                "end": seg.get("end", 0.0),
            }

            phase = self._determine_phase(text, current_phase, speaker)
            current_phase = phase

            turns.append(
                Turn(
                    speaker=speaker,
                    text=text,
                    start=float(seg.get("start", 0.0)),
                    end=float(seg.get("end", 0.0)),
                    phase=phase,
                    audio_clip=audio_clip,
                    tone=seg.get("tone"),
                    features=seg.get("features"),
                    speaker_cluster_id=seg.get("speaker_cluster_id"),
                )
            )

        outcome, confidence = self._determine_outcome(turns)

        return Interaction(
            id=f"interaction_{start_idx}",
            conversation_id=0,
            source_video="",
            start_time=turns[0].start if turns else 0.0,
            end_time=turns[-1].end if turns else 0.0,
            turns=turns,
            outcome=outcome,
            outcome_confidence=confidence,
            content_summary=self._summarize_content(interaction_segments),
            techniques=[],
            topics=[],
        )

    def _summarize_content(self, segments: List[Dict]) -> Dict[str, int]:
        summary: Dict[str, int] = {}
        for seg in segments:
            t = (seg.get("content_type") or {}).get("type", "unknown")
            summary[t] = summary.get(t, 0) + 1
        return summary

    def _determine_phase(self, text: str, current_phase: InteractionPhase, speaker: str) -> InteractionPhase:
        text_lower = text.lower()
        for pattern in self.close_re:
            if pattern.search(text_lower):
                return InteractionPhase.CLOSE

        if current_phase == InteractionPhase.OPENER:
            if speaker == "target" and len(text.split()) > 5:
                return InteractionPhase.HOOK
            return InteractionPhase.OPENER

        if current_phase == InteractionPhase.HOOK:
            if speaker == "target" and ("?" in text or len(text.split()) > 10):
                return InteractionPhase.VIBE
            return InteractionPhase.HOOK

        if current_phase == InteractionPhase.CLOSE:
            return InteractionPhase.CLOSE

        if current_phase == InteractionPhase.VIBE:
            return InteractionPhase.VIBE

        return current_phase

    def _determine_outcome(self, turns: List[Turn]) -> Tuple[Outcome, float]:
        last_turns = turns[-5:] if len(turns) >= 5 else turns
        combined_text = " ".join(t.text.lower() for t in last_turns)
        all_text = " ".join(t.text.lower() for t in turns)

        # Check for instant date first (higher priority)
        for pattern in self.instant_date_re:
            if pattern.search(all_text):
                # Verify it happened (look for positive response)
                if re.search(r"(let's do it|yeah|okay|sure|sounds good)", combined_text):
                    return Outcome.INSTANT_DATE, 0.85

        # Check for number/instagram success
        for pattern in self.success_re:
            if pattern.search(combined_text):
                # Determine if it was instagram specifically
                if re.search(r"instagram|insta", all_text):
                    return Outcome.INSTAGRAM, 0.8
                return Outcome.NUMBER, 0.8

        # Check for rejection
        for pattern in self.rejection_re:
            if pattern.search(combined_text):
                return Outcome.REJECTED, 0.8

        # Check for blowout
        for pattern in self.blowout_re:
            if pattern.search(combined_text):
                return Outcome.BLOWOUT, 0.7

        return Outcome.UNKNOWN, 0.3


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


def process_file(input_path: Path, output_path: Path, extractor: InteractionExtractor) -> int:
    with input_path.open("r") as f:
        data = json.load(f)

    segments = data.get("segments", [])
    interactions: List[Interaction] = []

    # Prefer conversation_id-based extraction (from detect_conversations.py)
    if extractor.has_conversation_ids(segments):
        print(f"[interactions] Using conversation_id-based extraction")
        groups = extractor.group_by_conversation_id(segments)

        for conv_id in sorted(groups.keys()):
            group_segments = groups[conv_id]
            interaction = extractor.extract_interaction_from_group(conv_id, group_segments)
            if interaction:
                interaction.source_video = str(input_path)
                interactions.append(interaction)
    else:
        # Fallback to opener pattern-based extraction
        print(f"[interactions] Using fallback opener pattern extraction")
        starts = extractor.find_interaction_starts(segments)

        for i, start_idx in enumerate(starts):
            next_idx = starts[i + 1] if i + 1 < len(starts) else None
            interaction = extractor.extract_interaction(segments, start_idx, next_idx)
            if interaction:
                interaction.source_video = str(input_path)
                interactions.append(interaction)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w") as f:
        for interaction in interactions:
            obj = {
                "id": interaction.id,
                "conversation_id": interaction.conversation_id,
                "source_video": interaction.source_video,
                "start_time": interaction.start_time,
                "end_time": interaction.end_time,
                "outcome": interaction.outcome.value,
                "outcome_confidence": interaction.outcome_confidence,
                "content_summary": interaction.content_summary,
                "techniques": interaction.techniques,
                "topics": interaction.topics,
                "turns": [
                    {
                        "speaker": t.speaker,
                        "text": t.text,
                        "start": t.start,
                        "end": t.end,
                        "phase": t.phase.value,
                        "audio_clip": t.audio_clip,
                        "tone": t.tone,
                        "features": t.features,
                        "speaker_cluster_id": t.speaker_cluster_id,
                        "semantic_tags": t.semantic_tags,
                    }
                    for t in interaction.turns
                ],
            }
            f.write(json.dumps(obj, default=_json_default) + "\n")

    print(f"[interactions] {input_path.name}: {len(interactions)} interactions")
    return len(interactions)


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract interactions from feature JSON files.")
    parser.add_argument("--input", required=True, help="Input .features.json or .conversations.json file/directory")
    parser.add_argument("--output", required=True, help="Output .jsonl file or directory")
    parser.add_argument(
        "--prefer-conversations",
        action="store_true",
        help="Prefer .conversations.json files over .features.json"
    )
    args = parser.parse_args()

    extractor = InteractionExtractor()
    in_path = Path(args.input)
    out_path = Path(args.output)

    if in_path.is_dir():
        out_path.mkdir(parents=True, exist_ok=True)

        # Find all processable files
        if args.prefer_conversations:
            # Prefer .conversations.json files
            files = sorted(in_path.rglob("*.conversations.json"))
            if not files:
                files = sorted(in_path.rglob("*.features.json"))
        else:
            # Default: process .features.json files
            files = sorted(in_path.rglob("*.features.json"))
            # Also check for .conversations.json
            conv_files = sorted(in_path.rglob("*.conversations.json"))
            if conv_files:
                files = conv_files

        for file in files:
            rel_path = file.relative_to(in_path)
            # Construct new filename with .interactions.jsonl extension
            stem = file.stem
            for suffix in [".features", ".conversations", ".tagged", ".classified"]:
                if stem.endswith(suffix):
                    stem = stem[:-len(suffix)]
            new_name = f"{stem}.interactions.jsonl"
            dest = out_path / rel_path.parent / new_name
            process_file(file, dest, extractor)
    else:
        process_file(in_path, out_path, extractor)


if __name__ == "__main__":
    main()
