#!/usr/bin/env python3
"""Prepare input for the new Stage A prompt from audio features data."""

import json
import sys
import os

def prepare_input(audio_features_path: str) -> dict:
    """Extract transcript + metadata from audio features file."""
    with open(audio_features_path) as f:
        data = json.load(f)

    segments = data["segments"]
    duration = data["total_duration_sec"]

    # Build transcript lines
    lines = []
    for i, seg in enumerate(segments):
        speaker = seg["pyannote_speaker"]
        start = seg["start"]
        end = seg["end"]
        text = seg["text"]
        lines.append(f"[{i}] {speaker} ({start:.1f}-{end:.1f}): {text}")

    return {
        "duration": duration,
        "segment_count": len(segments),
        "transcript": "\n".join(lines),
        "segments_raw": segments
    }


def fill_prompt(template_path: str, title: str, channel: str, input_data: dict) -> str:
    """Fill the prompt template with actual data."""
    with open(template_path) as f:
        template = f.read()

    prompt = template.replace("{{TITLE}}", title)
    prompt = prompt.replace("{{CHANNEL}}", channel)
    prompt = prompt.replace("{{DURATION}}", f"{input_data['duration']:.0f}")
    prompt = prompt.replace("{{SEGMENT_COUNT}}", str(input_data["segment_count"]))
    prompt = prompt.replace("{{TRANSCRIPT}}", input_data["transcript"])

    return prompt


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: prepare_input.py <audio_features.json> <title> <channel>")
        sys.exit(1)

    audio_path = sys.argv[1]
    title = sys.argv[2]
    channel = sys.argv[3]

    input_data = prepare_input(audio_path)

    template_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "stage_a_classify.prompt.md")
    prompt = fill_prompt(template_path, title, channel, input_data)

    # Write prompt to stdout
    print(prompt)
