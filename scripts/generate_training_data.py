#!/usr/bin/env python3
"""
Generate Training Data

Aggregates processed feature files into a single JSONL dataset.
Combines text, audio features, speaker labels, and tonality.
"""

import argparse
import json
from pathlib import Path


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

def main() -> None:
    parser = argparse.ArgumentParser(description="Generate JSONL training data from feature files.")
    parser.add_argument("--input", required=True, help="Directory containing feature JSON files")
    parser.add_argument("--output", required=True, help="Output .jsonl file path")
    args = parser.parse_args()

    input_dir = Path(args.input)
    output_file = Path(args.output)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    count = 0
    feature_files = set(input_dir.rglob("*.features.json"))
    audio_feature_files = set(input_dir.rglob("*.audio_features.json"))
    files = list(sorted(feature_files | audio_feature_files))
    print(f"🔍 Found {len(files)} feature files in {input_dir}")

    total_segments_processed = 0
    total_segments_skipped = 0

    with output_file.open("w") as out_f:
        # Process all feature files in the directory
        for feature_file in files:
            try:
                with feature_file.open("r", encoding="utf-8") as f:
                    data = json.load(f)

                source_audio = data.get("source_audio", "")

                for segment in data.get("segments", []):
                    # Skip segments without features or text
                    if not segment.get("features") or not segment.get("text"):
                        total_segments_skipped += 1
                        continue
                    total_segments_processed += 1

                    # Construct the training example
                    example = {
                        "text": segment.get("text", "").strip(),
                        "audio_file": source_audio,
                        "start": segment.get("start"),
                        "end": segment.get("end"),
                        "speaker": segment.get("speaker", {}).get("label", "unknown"),
                        "tone": segment.get("tone", {}).get("primary", "neutral"),
                        "tone_confidence": segment.get("tone", {}).get("confidence", 0),
                        "features": segment.get("features"),
                    }

                    out_f.write(json.dumps(example, default=_json_default) + "\n")
                    count += 1
            except Exception as e:
                print(f"Error processing {feature_file.name}: {e}")

    print(f"✅ Successfully generated {count} training examples in: {output_file}")
    if total_segments_skipped > 0 or total_segments_processed > 0:
        print(f"ℹ️  Processed {total_segments_processed} segments and skipped {total_segments_skipped} segments (missing features or text).")


if __name__ == "__main__":
    main()
