#!/usr/bin/env python3
"""
Ground Truth Enrichment Script

NOTE: This script has moved to:
  scripts/training-data/09.enrich

This file is kept as a compatibility shim. When run as a script, it forwards
execution to the new location.

The new script reads from data/08.interactions/ and writes to data/09.enrich/

Usage (new):
    ./scripts/training-data/09.enrich "daily_evolution"
    ./scripts/training-data/09.enrich --sources

Legacy usage (still supported via shim):
    python scripts/enrich_ground_truth.py --channel SocialStoic
"""

from __future__ import annotations

import runpy
import sys
from pathlib import Path

_MOVED_SCRIPT = Path(__file__).resolve().parent / "training-data" / "09.enrich"
if __name__ == "__main__" and _MOVED_SCRIPT.exists():
    sys.argv[0] = str(_MOVED_SCRIPT)
    runpy.run_path(str(_MOVED_SCRIPT), run_name="__main__")
    raise SystemExit(0)

# Legacy imports kept for backwards compatibility if imported as a module
import argparse
import json
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import requests

# Configuration
OLLAMA_BASE_URL = os.environ.get("OLLAMA_API_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.1")
TRAINING_DATA_DIR = Path("training-data")

# Known techniques for prompting
KNOWN_TECHNIQUES = [
    "direct_opener", "indirect_opener", "situational_opener", "observation_opener",
    "push_pull", "qualification", "disqualification", "cold_read", "tease",
    "role_play", "statement_of_intent", "false_time_constraint", "assumptive_close",
    "soft_close", "number_close", "instagram_close", "instant_date", "instant_date_attempt",
    "kino", "reward_frame", "compliance_test", "neg", "callback_humor",
    "storytelling", "DHV", "emotion_spike", "grounding", "high_five",
    "question_stacking", "feedback_request", "front_stop", "side_stop",
]

KNOWN_TOPICS = [
    "origin", "career", "hobby", "age", "appearance", "personality",
    "relationship", "travel", "food_drinks", "plans", "contact", "logistics",
    "instagram", "whatsapp", "tattoos", "gym", "height", "flexibility",
    "style", "hair", "eyes", "smile", "energy", "vibe",
]


@dataclass
class TranscriptLine:
    line_number: int
    text: str
    timestamp_approx: Optional[str] = None


def load_transcript(transcript_path: Path) -> List[TranscriptLine]:
    """Load transcript and return lines with line numbers."""
    lines = []
    with open(transcript_path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f, start=1):
            text = line.strip()
            if text:  # Skip empty lines but keep line numbers accurate
                lines.append(TranscriptLine(line_number=i, text=text))
            else:
                lines.append(TranscriptLine(line_number=i, text=""))
    return lines


def load_interactions(interactions_path: Path) -> List[Dict]:
    """Load interactions from JSONL file."""
    interactions = []
    with open(interactions_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    interactions.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return interactions


def find_line_numbers(
    transcript_lines: List[TranscriptLine],
    turn_texts: List[str],
    start_time: float,
    end_time: float
) -> Tuple[Optional[int], Optional[int]]:
    """
    Find the line numbers in the transcript that correspond to the interaction.
    Uses fuzzy matching since transcripts may have slight differences.
    """
    if not turn_texts:
        return None, None

    first_text = turn_texts[0][:50].lower().strip()
    last_text = turn_texts[-1][:50].lower().strip()

    start_line = None
    end_line = None

    for tl in transcript_lines:
        text_lower = tl.text.lower().strip()
        if not text_lower:
            continue

        # Find start
        if start_line is None:
            if first_text[:30] in text_lower or text_lower[:30] in first_text:
                start_line = tl.line_number

        # Find end (keep updating until we pass the last text)
        if start_line is not None:
            if last_text[:30] in text_lower or text_lower[:30] in last_text:
                end_line = tl.line_number
            # If we found start and end, also check if this line is after start
            elif end_line is None and tl.line_number > start_line:
                # Keep going until we find a better match
                pass

    # If we found start but not end, estimate based on turn count
    if start_line is not None and end_line is None:
        end_line = min(start_line + len(turn_texts), len(transcript_lines))

    return start_line, end_line


def estimate_timestamp(line_number: int, total_lines: int, video_duration_sec: float = 600) -> str:
    """Estimate timestamp based on line position (rough approximation)."""
    if total_lines == 0:
        return "0:00"
    ratio = line_number / total_lines
    total_seconds = int(ratio * video_duration_sec)
    minutes = total_seconds // 60
    seconds = total_seconds % 60
    return f"{minutes}:{seconds:02d}"


def call_ollama(prompt: str, retries: int = 3) -> Optional[str]:
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
                        "temperature": 0.2,
                        "num_predict": 2000,
                    }
                },
                timeout=120
            )
            if response.ok:
                return response.json().get("response", "")
        except requests.exceptions.RequestException as e:
            if attempt < retries - 1:
                time.sleep(2)
                continue
            print(f"[enrich] Ollama error: {e}")
    return None


def analyze_interaction_with_llm(
    interaction: Dict,
    transcript_context: str,
    interaction_idx: int
) -> Dict:
    """Use LLM to analyze an interaction and extract rich metadata."""

    turns = interaction.get("turns", [])
    turn_texts = []
    for t in turns:
        speaker = t.get("speaker", "unknown")
        text = t.get("text", "").strip()
        if text:
            turn_texts.append(f"{speaker}: {text}")

    conversation_text = "\n".join(turn_texts)

    techniques_str = ", ".join(KNOWN_TECHNIQUES[:20])
    topics_str = ", ".join(KNOWN_TOPICS)

    prompt = f"""Analyze this daygame interaction and extract metadata.

INTERACTION #{interaction_idx}:
{conversation_text}

CONTEXT (surrounding transcript):
{transcript_context[:1500]}

Extract the following in JSON format:
1. "type": "approach" or "commentary" (commentary = coach explaining to camera, not talking to a girl)
2. "description": Short description (10-15 words) of what happens
3. "phases": Object with opener/hook/vibe/close, each having start_turn and end_turn indices (0-indexed into the turns above), or null if that phase isn't present
4. "outcome": One of: "number", "instagram", "instant_date", "blowout", "rejected", "walked_away", "unknown"
5. "topics_mentioned": Array from [{topics_str}] - only include topics actually discussed
6. "techniques_used": Array from [{techniques_str}, ...] - only include techniques actually demonstrated

Return ONLY valid JSON:
{{
  "type": "approach",
  "description": "...",
  "phases": {{
    "opener": {{"start_turn": 0, "end_turn": 2}},
    "hook": {{"start_turn": 3, "end_turn": 5}},
    "vibe": {{"start_turn": 6, "end_turn": 15}},
    "close": null
  }},
  "outcome": "unknown",
  "topics_mentioned": ["origin", "career"],
  "techniques_used": ["direct_opener", "cold_read"]
}}"""

    response = call_ollama(prompt)
    if not response:
        return {
            "type": "approach",
            "description": f"Interaction {interaction_idx}",
            "phases": {"opener": None, "hook": None, "vibe": None, "close": None},
            "outcome": interaction.get("outcome", "unknown"),
            "topics_mentioned": [],
            "techniques_used": [],
        }

    # Extract JSON from response
    try:
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            return json.loads(json_match.group())
    except (json.JSONDecodeError, AttributeError):
        pass

    return {
        "type": "approach",
        "description": f"Interaction {interaction_idx}",
        "phases": {"opener": None, "hook": None, "vibe": None, "close": None},
        "outcome": interaction.get("outcome", "unknown"),
        "topics_mentioned": [],
        "techniques_used": [],
    }


def detect_commentary_sections(
    transcript_lines: List[TranscriptLine],
    interactions: List[Dict]
) -> List[Dict]:
    """
    Detect commentary sections (coach talking to camera) between interactions.
    """
    commentary_sections = []

    # Get all interaction line ranges
    interaction_ranges = []
    for interaction in interactions:
        turns = interaction.get("turns", [])
        if not turns:
            continue
        turn_texts = [t.get("text", "") for t in turns]
        start_line, end_line = find_line_numbers(
            transcript_lines, turn_texts,
            interaction.get("start_time", 0),
            interaction.get("end_time", 0)
        )
        if start_line and end_line:
            interaction_ranges.append((start_line, end_line))

    # Sort by start line
    interaction_ranges.sort(key=lambda x: x[0])

    # Find gaps
    prev_end = 1
    for start, end in interaction_ranges:
        if start > prev_end + 2:  # Gap of at least 2 lines
            gap_lines = [
                tl.text for tl in transcript_lines
                if prev_end <= tl.line_number < start and tl.text.strip()
            ]
            if gap_lines:
                gap_text = " ".join(gap_lines[:5])  # First 5 lines for analysis
                commentary_sections.append({
                    "start_line": prev_end,
                    "end_line": start - 1,
                    "preview": gap_text[:200],
                })
        prev_end = end + 1

    return commentary_sections


def enrich_single_video(
    interactions_path: Path,
    transcript_path: Path,
    output_path: Path,
    video_title: Optional[str] = None,
    source_playlist: Optional[str] = None,
) -> Dict:
    """Process a single video and create enriched ground truth JSON."""

    print(f"[enrich] Processing: {interactions_path.name}")

    # Load data
    transcript_lines = load_transcript(transcript_path)
    interactions = load_interactions(interactions_path)

    if not interactions:
        print(f"[enrich] No interactions found in {interactions_path}")
        return {}

    # Derive metadata
    if not video_title:
        video_title = interactions_path.stem.replace(".interactions", "")
    if not source_playlist:
        source_playlist = interactions_path.parent.name

    total_lines = len(transcript_lines)

    # Get full transcript text for context
    full_transcript = "\n".join(
        f"{tl.line_number}: {tl.text}" for tl in transcript_lines if tl.text
    )

    # Process each interaction
    enriched_interactions = []

    for idx, interaction in enumerate(interactions, start=1):
        turns = interaction.get("turns", [])
        turn_texts = [t.get("text", "") for t in turns]

        # Find line numbers
        start_line, end_line = find_line_numbers(
            transcript_lines,
            turn_texts,
            interaction.get("start_time", 0),
            interaction.get("end_time", 0)
        )

        # Get surrounding context for LLM
        context_start = max(1, (start_line or 1) - 5)
        context_end = min(total_lines, (end_line or total_lines) + 5)
        context_lines = [
            f"{tl.line_number}: {tl.text}"
            for tl in transcript_lines
            if context_start <= tl.line_number <= context_end and tl.text
        ]
        transcript_context = "\n".join(context_lines)

        # Analyze with LLM
        analysis = analyze_interaction_with_llm(
            interaction, transcript_context, idx
        )

        # Convert phase turn indices to line numbers
        phases_with_lines = {}
        for phase_name in ["opener", "hook", "vibe", "close"]:
            phase_data = analysis.get("phases", {}).get(phase_name)
            if phase_data and isinstance(phase_data, dict):
                start_turn = phase_data.get("start_turn", 0)
                end_turn = phase_data.get("end_turn", 0)

                # Estimate line numbers from turn indices
                if start_line and end_line and len(turns) > 0:
                    lines_per_turn = (end_line - start_line) / max(len(turns), 1)
                    phase_start = int(start_line + start_turn * lines_per_turn)
                    phase_end = int(start_line + (end_turn + 1) * lines_per_turn)
                    phases_with_lines[phase_name] = {
                        "start_line": phase_start,
                        "end_line": min(phase_end, end_line or phase_end)
                    }
                else:
                    phases_with_lines[phase_name] = None
            else:
                phases_with_lines[phase_name] = None

        enriched = {
            "id": idx,
            "type": analysis.get("type", "approach"),
            "description": analysis.get("description", f"Interaction {idx}"),
            "start_line": start_line,
            "end_line": end_line,
            "start_time_approx": estimate_timestamp(start_line or 1, total_lines) if start_line else None,
            "end_time_approx": estimate_timestamp(end_line or 1, total_lines) if end_line else None,
            "phases": phases_with_lines,
            "outcome": analysis.get("outcome", interaction.get("outcome", "unknown")),
            "topics_mentioned": analysis.get("topics_mentioned", []),
            "techniques_used": analysis.get("techniques_used", []),
        }

        enriched_interactions.append(enriched)
        print(f"  [{idx}/{len(interactions)}] {analysis.get('type', 'approach')}: {analysis.get('description', '')[:50]}")

    # Detect commentary sections
    commentary_sections = detect_commentary_sections(transcript_lines, interactions)

    # Add commentary sections to interactions list
    commentary_id = len(enriched_interactions) + 1
    for section in commentary_sections:
        # Get text preview
        preview_lines = [
            tl.text for tl in transcript_lines
            if section["start_line"] <= tl.line_number <= section["end_line"] and tl.text
        ]
        preview = " ".join(preview_lines[:3])[:100]

        enriched_interactions.append({
            "id": commentary_id,
            "type": "commentary",
            "description": f"Commentary: {preview}...",
            "start_line": section["start_line"],
            "end_line": section["end_line"],
            "start_time_approx": estimate_timestamp(section["start_line"], total_lines),
            "end_time_approx": estimate_timestamp(section["end_line"], total_lines),
        })
        commentary_id += 1

    # Sort by start_line
    enriched_interactions.sort(key=lambda x: x.get("start_line") or 0)

    # Re-number IDs after sorting
    for i, interaction in enumerate(enriched_interactions, start=1):
        interaction["id"] = i

    # Create summary
    approach_count = sum(1 for i in enriched_interactions if i.get("type") == "approach")
    commentary_count = sum(1 for i in enriched_interactions if i.get("type") == "commentary")

    outcomes = {}
    all_techniques = set()
    for i in enriched_interactions:
        if i.get("type") == "approach":
            outcome = i.get("outcome", "unknown")
            outcomes[outcome] = outcomes.get(outcome, 0) + 1
            all_techniques.update(i.get("techniques_used", []))

    # Build final output
    output = {
        "video_title": video_title,
        "source_playlist": source_playlist,
        "content_type": "mixed" if commentary_count > 0 else "infield",
        "transcript_file": str(transcript_path),
        "interactions": enriched_interactions,
        "summary": {
            "total_interactions": approach_count,
            "total_commentary_sections": commentary_count,
            "approaches_with_outcome": outcomes,
            "techniques_demonstrated": sorted(list(all_techniques)),
        },
        "notes": f"Auto-generated ground truth. {approach_count} approaches, {commentary_count} commentary sections detected."
    }

    # Write output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"[enrich] Saved: {output_path}")
    return output


def process_channel(channel: str, workers: int = 4) -> None:
    """Process all videos in a channel."""

    interactions_dir = TRAINING_DATA_DIR / "interactions" / channel
    transcripts_dir = TRAINING_DATA_DIR / "transcripts" / channel
    output_dir = TRAINING_DATA_DIR / "enriched" / channel

    if not interactions_dir.exists():
        print(f"[enrich] Interactions directory not found: {interactions_dir}")
        return

    if not transcripts_dir.exists():
        print(f"[enrich] Transcripts directory not found: {transcripts_dir}")
        return

    # Find all interaction files
    interaction_files = list(interactions_dir.glob("*.interactions.jsonl"))

    if not interaction_files:
        print(f"[enrich] No interaction files found in {interactions_dir}")
        return

    print(f"[enrich] Found {len(interaction_files)} videos to process in {channel}")

    # Build work items
    work_items = []
    for int_file in interaction_files:
        video_name = int_file.stem.replace(".interactions", "")
        transcript_file = transcripts_dir / f"{video_name}.txt"
        output_file = output_dir / f"{video_name}.ground_truth.json"

        # Skip if already processed
        if output_file.exists():
            print(f"[enrich] Skipping (exists): {video_name}")
            continue

        if not transcript_file.exists():
            print(f"[enrich] Transcript not found for: {video_name}")
            continue

        work_items.append((int_file, transcript_file, output_file, video_name, channel))

    if not work_items:
        print(f"[enrich] All videos already processed for {channel}")
        return

    print(f"[enrich] Processing {len(work_items)} videos with {workers} workers...")

    # Process with thread pool
    def process_item(item):
        int_file, transcript_file, output_file, video_name, channel = item
        try:
            return enrich_single_video(int_file, transcript_file, output_file, video_name, channel)
        except Exception as e:
            print(f"[enrich] Error processing {video_name}: {e}")
            return None

    if workers > 1:
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {executor.submit(process_item, item): item for item in work_items}
            for future in as_completed(futures):
                item = futures[future]
                try:
                    future.result()
                except Exception as e:
                    print(f"[enrich] Failed: {item[3]} - {e}")
    else:
        for item in work_items:
            process_item(item)


def main():
    parser = argparse.ArgumentParser(
        description="Enrich pipeline output into ground-truth format using Ollama"
    )
    parser.add_argument(
        "--interactions",
        help="Path to .interactions.jsonl file"
    )
    parser.add_argument(
        "--transcript",
        help="Path to transcript .txt file"
    )
    parser.add_argument(
        "--output",
        help="Output path for .ground_truth.json"
    )
    parser.add_argument(
        "--channel",
        help="Process all videos in a channel (e.g., 'SocialStoic')"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Process all channels"
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Number of parallel workers (default: 1, use 1 to avoid rate limits)"
    )

    args = parser.parse_args()

    # Test Ollama connection
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        if not response.ok:
            print(f"[enrich] Warning: Ollama not responding properly")
    except requests.exceptions.RequestException:
        print(f"[enrich] Error: Cannot connect to Ollama at {OLLAMA_BASE_URL}")
        print(f"[enrich] Make sure Ollama is running: ollama serve")
        return

    if args.all:
        # Process all channels
        interactions_base = TRAINING_DATA_DIR / "interactions"
        if interactions_base.exists():
            channels = [d.name for d in interactions_base.iterdir() if d.is_dir()]
            for channel in sorted(channels):
                print(f"\n{'='*60}")
                print(f"Processing channel: {channel}")
                print(f"{'='*60}")
                process_channel(channel, args.workers)
    elif args.channel:
        process_channel(args.channel, args.workers)
    elif args.interactions and args.transcript:
        int_path = Path(args.interactions)
        trans_path = Path(args.transcript)

        if args.output:
            out_path = Path(args.output)
        else:
            out_path = int_path.parent / f"{int_path.stem.replace('.interactions', '')}.ground_truth.json"

        enrich_single_video(int_path, trans_path, out_path)
    else:
        parser.print_help()
        print("\nExamples:")
        print("  # Single video:")
        print("  python scripts/enrich_ground_truth.py \\")
        print("    --interactions training-data/interactions/SocialStoic/Video.interactions.jsonl \\")
        print("    --transcript training-data/transcripts/SocialStoic/Video.txt")
        print("")
        print("  # All videos in a channel:")
        print("  python scripts/enrich_ground_truth.py --channel SocialStoic --workers 2")
        print("")
        print("  # All channels:")
        print("  python scripts/enrich_ground_truth.py --all --workers 2")


if __name__ == "__main__":
    main()
