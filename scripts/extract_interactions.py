#!/usr/bin/env python3
"""
Interaction Extraction from Daygame Transcripts

Identifies complete approaches:
1. Finds interaction boundaries (start/end)
2. Segments into phases (opener, hook, vibe, close)
3. Labels outcomes where detectable
4. Outputs JSONL interactions with turn-level speaker/phase/audio refs
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict, dataclass
from enum import Enum
from pathlib import Path
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


@dataclass
class Interaction:
    id: str
    source_video: str
    start_time: float
    end_time: float
    turns: List[Turn]
    outcome: Outcome
    outcome_confidence: float
    content_summary: Dict[str, int]


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


def compile_patterns(patterns: List[str]) -> List[re.Pattern]:
    return [re.compile(p, re.IGNORECASE) for p in patterns]


class InteractionExtractor:
    def __init__(self) -> None:
        self.opener_re = compile_patterns(OPENER_PATTERNS)
        self.close_re = compile_patterns(CLOSE_PATTERNS)
        self.success_re = compile_patterns(SUCCESS_PATTERNS)
        self.rejection_re = compile_patterns(REJECTION_PATTERNS)
        self.blowout_re = compile_patterns(BLOWOUT_PATTERNS)

    def find_interaction_starts(self, segments: List[Dict]) -> List[int]:
        starts: List[int] = []
        for i, seg in enumerate(segments):
            text = seg.get("text", "").lower()
            content_type = (seg.get("content_type") or {}).get("type", "unknown")
            # Relaxed filter: Allow scanning all segments, as infield clips often appear in 'theory' videos
            # if content_type not in ("infield", "unknown"):
            #     continue
            for pattern in self.opener_re:
                if pattern.search(text):
                    if i == 0 or self._is_conversation_break(segments, i):
                        starts.append(i)
                        break
        return starts

    def _is_conversation_break(self, segments: List[Dict], index: int) -> bool:
        if index == 0:
            return True
        curr_seg = segments[index]
        prev_seg = segments[index - 1]
        curr_start = curr_seg.get("start", 0)
        prev_end = prev_seg.get("end", 0)
        if curr_start - prev_end > 3.0:
            return True
        prev_type = (prev_seg.get("content_type") or {}).get("type", "")
        if prev_type == "transition":
            return True
        return False

    def extract_interaction(
        self, segments: List[Dict], start_idx: int, next_start_idx: Optional[int] = None
    ) -> Optional[Interaction]:
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
            source_video="",
            start_time=turns[0].start if turns else 0.0,
            end_time=turns[-1].end if turns else 0.0,
            turns=turns,
            outcome=outcome,
            outcome_confidence=confidence,
            content_summary=self._summarize_content(interaction_segments),
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

        for pattern in self.success_re:
            if pattern.search(combined_text):
                return Outcome.NUMBER, 0.8
        for pattern in self.rejection_re:
            if pattern.search(combined_text):
                return Outcome.REJECTED, 0.8
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
    starts = extractor.find_interaction_starts(segments)
    interactions: List[Interaction] = []

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
                "source_video": interaction.source_video,
                "start_time": interaction.start_time,
                "end_time": interaction.end_time,
                "outcome": interaction.outcome.value,
                "outcome_confidence": interaction.outcome_confidence,
                "content_summary": interaction.content_summary,
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
                    }
                    for t in interaction.turns
                ],
            }
            f.write(json.dumps(obj, default=_json_default) + "\n")

    print(f"[interactions] {input_path.name}: {len(interactions)} interactions")
    return len(interactions)


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract interactions from feature JSON files.")
    parser.add_argument("--input", required=True, help="Input .features.json file or directory")
    parser.add_argument("--output", required=True, help="Output .jsonl file or directory")
    args = parser.parse_args()

    extractor = InteractionExtractor()
    in_path = Path(args.input)
    out_path = Path(args.output)

    if in_path.is_dir():
        out_path.mkdir(parents=True, exist_ok=True)
        files = sorted(in_path.rglob("*.features.json"))
        for file in files:
            rel_path = file.relative_to(in_path)
            # Construct new filename with .interactions.jsonl extension
            new_name = f"{file.stem.replace('.features','')}.interactions.jsonl"
            dest = out_path / rel_path.parent / new_name
            process_file(file, dest, extractor)
    else:
        process_file(in_path, out_path, extractor)


if __name__ == "__main__":
    main()
