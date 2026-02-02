#!/usr/bin/env python3
"""
Compare transcription quality across different models.

Usage:
    python scripts/training-data/compare-transcripts.py

Reads from: data/02.transcribe-test/
Outputs: comparison markdown to stdout
"""

import json
import re
from pathlib import Path
from collections import defaultdict
from difflib import SequenceMatcher

# Models to compare (in order)
MODELS = ["distil-v3", "large-v3", "large-v3-turbo", "whisper-large"]

# Video IDs and their types
VIDEOS = {
    "KddKqbIhUwE": {"name": "ALWAYS BE CLOSING", "type": "infield"},
    "zOc19KfIcFk": {"name": "Critical Daygame Hack", "type": "talking_head"},
    "0B2hALxnzKk": {"name": "Fixing Mistakes", "type": "talking_head"},
    "JOhR3sQstIs": {"name": "HOW TO FEEL GOOD", "type": "talking_head"},
    "B5AikkHrzuk": {"name": "Better Conversations", "type": "talking_head"},
}


def load_transcript(test_dir: Path, video_id: str, model: str) -> dict | None:
    """Load transcript JSON for a video/model combination."""
    # Try different file patterns
    patterns = [
        f"{video_id}.{model}.full.json",
        f"{video_id}.{model}.full.faster.json",
        f"{video_id}.{model}.full.whisper.json",
    ]

    for pattern in patterns:
        path = test_dir / pattern
        if path.exists():
            with open(path, "r") as f:
                data = json.load(f)
                # Also get txt file for full text
                txt_patterns = [
                    path.with_suffix("").with_suffix(".txt"),
                    path.with_name(pattern.replace(".json", ".txt")),
                ]
                for txt_path in txt_patterns:
                    if txt_path.exists():
                        data["full_text"] = txt_path.read_text().strip()
                        break
                return data
    return None


def get_segment_count(data: dict) -> int:
    """Get number of segments in transcript."""
    return len(data.get("segments", []))


def get_char_count(data: dict) -> int:
    """Get character count of full text."""
    text = data.get("full_text") or data.get("text", "")
    return len(text)


def get_word_count(data: dict) -> int:
    """Get word count of full text."""
    text = data.get("full_text") or data.get("text", "")
    return len(text.split())


def normalize_text(text: str) -> str:
    """Normalize text for comparison (lowercase, remove extra spaces)."""
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def find_differences(texts: dict[str, str], window_size: int = 50) -> list[dict]:
    """Find word-level differences between transcripts."""
    differences = []

    # Use the first available transcript as reference
    ref_model = None
    ref_text = None
    for model in MODELS:
        if model in texts and texts[model]:
            ref_model = model
            ref_text = normalize_text(texts[model])
            break

    if not ref_text:
        return differences

    ref_words = ref_text.split()

    # Compare each other model to reference
    for model, text in texts.items():
        if not text or model == ref_model:
            continue

        norm_text = normalize_text(text)
        model_words = norm_text.split()

        # Use SequenceMatcher to find differences
        matcher = SequenceMatcher(None, ref_words, model_words)

        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag in ("replace", "delete", "insert"):
                # Get context around the difference
                ref_excerpt = " ".join(ref_words[max(0, i1-3):i2+3])
                model_excerpt = " ".join(model_words[max(0, j1-3):j2+3])

                if ref_excerpt != model_excerpt:
                    differences.append({
                        "ref_model": ref_model,
                        "comp_model": model,
                        "ref_text": ref_excerpt,
                        "comp_text": model_excerpt,
                        "position": i1,
                    })

    return differences


def find_named_entity_differences(texts: dict[str, str]) -> list[dict]:
    """Find differences in capitalized words (likely named entities)."""
    differences = []

    # Extract capitalized words from each transcript
    entities = {}
    for model, text in texts.items():
        if not text:
            continue
        # Find words that are capitalized in the original (before normalization)
        caps = set(re.findall(r"\b[A-Z][a-z]+\b", text))
        entities[model] = caps

    # Find entities that don't appear in all models
    all_entities = set()
    for ents in entities.values():
        all_entities.update(ents)

    for entity in sorted(all_entities):
        present_in = [m for m, ents in entities.items() if entity in ents]
        if len(present_in) < len(entities):
            differences.append({
                "entity": entity,
                "present_in": present_in,
                "missing_from": [m for m in entities.keys() if m not in present_in],
            })

    return differences


def generate_markdown_report(test_dir: Path) -> str:
    """Generate markdown comparison report."""
    lines = []
    lines.append("# Transcription Quality Comparison\n")
    lines.append(f"Generated from: `{test_dir}`\n")

    # Overall summary table
    lines.append("## Summary\n")
    lines.append("| Video | Type | " + " | ".join([f"{m} segs" for m in MODELS]) + " |")
    lines.append("|-------|------|" + "|".join(["-----" for _ in MODELS]) + "|")

    all_data = {}
    for video_id, info in VIDEOS.items():
        all_data[video_id] = {}
        row = [info["name"], info["type"]]

        for model in MODELS:
            data = load_transcript(test_dir, video_id, model)
            all_data[video_id][model] = data
            if data:
                row.append(str(get_segment_count(data)))
            else:
                row.append("-")

        lines.append("| " + " | ".join(row) + " |")

    lines.append("")

    # Word count comparison
    lines.append("## Word Counts\n")
    lines.append("| Video | " + " | ".join(MODELS) + " |")
    lines.append("|-------|" + "|".join(["-----" for _ in MODELS]) + "|")

    for video_id, info in VIDEOS.items():
        row = [info["name"]]
        for model in MODELS:
            data = all_data[video_id].get(model)
            if data:
                row.append(str(get_word_count(data)))
            else:
                row.append("-")
        lines.append("| " + " | ".join(row) + " |")

    lines.append("")

    # Per-video detailed comparison
    for video_id, info in VIDEOS.items():
        lines.append(f"## Video: {info['name']} ({info['type']})\n")
        lines.append(f"YouTube ID: `{video_id}`\n")

        # Collect texts
        texts = {}
        for model in MODELS:
            data = all_data[video_id].get(model)
            if data:
                texts[model] = data.get("full_text") or data.get("text", "")

        if len(texts) < 2:
            lines.append("*Not enough models to compare*\n")
            continue

        # Named entity differences
        entity_diffs = find_named_entity_differences(texts)
        if entity_diffs:
            lines.append("### Named Entity Differences\n")
            lines.append("| Entity | Present In | Missing From |")
            lines.append("|--------|------------|--------------|")
            for diff in entity_diffs[:20]:  # Limit to 20
                lines.append(f"| {diff['entity']} | {', '.join(diff['present_in'])} | {', '.join(diff['missing_from'])} |")
            lines.append("")

        # Text excerpt comparison (first 500 chars)
        lines.append("### Text Excerpt (first ~100 words)\n")
        for model in MODELS:
            if model in texts:
                excerpt = " ".join(texts[model].split()[:100])
                lines.append(f"**{model}:**")
                lines.append(f"```")
                lines.append(excerpt)
                lines.append(f"```\n")

        lines.append("---\n")

    return "\n".join(lines)


def main():
    test_dir = Path("data/02.transcribe-test")
    if not test_dir.exists():
        print(f"Error: {test_dir} not found")
        return 1

    report = generate_markdown_report(test_dir)
    print(report)

    # Also save to file
    output_path = test_dir / "COMPARISON.md"
    output_path.write_text(report)
    print(f"\nReport saved to: {output_path}", file=__import__("sys").stderr)

    return 0


if __name__ == "__main__":
    exit(main())
