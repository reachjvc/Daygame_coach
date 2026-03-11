#!/usr/bin/env python3
"""Prepare input for Stage B (enrichment) from Stage A output + audio features."""

import json
import sys
import os


def prepare_stage_b_input(stage_a_path: str, audio_features_path: str) -> dict:
    """Build Stage B input from Stage A output and raw transcript."""
    with open(stage_a_path) as f:
        stage_a = json.load(f)

    with open(audio_features_path) as f:
        af = json.load(f)

    # Build compact Stage A segments summary
    # Handle both old format (list of dicts) and new compact format (list of arrays)
    defaults = stage_a.get("segment_defaults", {})
    default_type = defaults.get("segment_type", "commentary")
    default_conv = defaults.get("conversation_id", 0)
    default_quality = defaults.get("quality", "clean")

    seg_lines = []
    for seg in stage_a["segments"]:
        if isinstance(seg, list):
            # Compact format: [id, role] or [id, role, {overrides}]
            seg_id = seg[0]
            role = seg[1]
            overrides = seg[2] if len(seg) > 2 and isinstance(seg[2], dict) else {}
            seg_type = overrides.get("type", default_type)
            conv_id = overrides.get("conv", default_conv)
            quality = overrides.get("quality", default_quality)
            is_mixed = "mixed" in overrides
        else:
            # Old dict format
            seg_id = seg["id"]
            role = seg.get("speaker_role", "?")
            seg_type = seg.get("segment_type", default_type)
            conv_id = seg.get("conversation_id", default_conv)
            quality = seg.get("quality", default_quality)
            is_mixed = seg.get("is_mixed", False)

        parts = [f"[{seg_id}]", f"role={role}", f"type={seg_type}", f"conv={conv_id}"]
        if is_mixed:
            parts.append("MIXED")
        if quality != "clean":
            parts.append(f"quality={quality}")
        seg_lines.append(" ".join(parts))

    # Build full transcript with timestamps
    transcript_lines = []
    for seg in af["segments"]:
        idx = af["segments"].index(seg)
        speaker = seg["pyannote_speaker"]
        start = seg["start"]
        end = seg["end"]
        text = seg["text"]
        transcript_lines.append(f"[{idx}] {speaker} ({start:.1f}-{end:.1f}): {text}")

    return {
        "video_type": stage_a["video_type"]["type"],
        "stage_a_segments": "\n".join(seg_lines),
        "transcript": "\n".join(transcript_lines),
        "conversations": stage_a.get("conversations", []),
    }


def fill_prompt(template_path: str, title: str, channel: str, input_data: dict) -> str:
    """Fill the Stage B prompt template."""
    with open(template_path) as f:
        template = f.read()

    prompt = template.replace("{{VIDEO_TYPE}}", input_data["video_type"])
    prompt = prompt.replace("{{TITLE}}", title)
    prompt = prompt.replace("{{CHANNEL}}", channel)
    prompt = prompt.replace("{{STAGE_A_SEGMENTS}}", input_data["stage_a_segments"])
    prompt = prompt.replace("{{TRANSCRIPT}}", input_data["transcript"])

    return prompt


if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: prepare_stage_b.py <stage_a_parsed.json> <audio_features.json> <title> <channel>")
        sys.exit(1)

    stage_a_path = sys.argv[1]
    audio_features_path = sys.argv[2]
    title = sys.argv[3]
    channel = sys.argv[4]

    input_data = prepare_stage_b_input(stage_a_path, audio_features_path)

    template_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "stage_b_enrich.prompt.md")
    prompt = fill_prompt(template_path, title, channel, input_data)

    print(prompt)
