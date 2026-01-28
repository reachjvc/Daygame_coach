#!/usr/bin/env python3
"""
Generate Scenario-based Training Data

Converts extracted interactions from .jsonl format into a structured
conversational format (e.g., for fine-tuning chat models).
Each interaction becomes a single training example with a list of messages.
"""

import argparse
import json
from pathlib import Path


def format_for_finetuning(interaction: dict) -> dict | None:
    """Formats a single interaction into a message list for fine-tuning."""
    messages = []

    # Optional: Add a system prompt
    system_prompt = (
        "This is a daygame interaction. The 'user' is the coach/student practicing "
        "and the 'assistant' is the target person being approached. "
        f"The outcome of this interaction was: {interaction.get('outcome', 'unknown')}."
    )
    messages.append({"role": "system", "content": system_prompt})

    for turn in interaction.get("turns", []):
        speaker = turn.get("speaker")
        text = turn.get("text", "").strip()

        if not text or speaker not in ("coach", "target"):
            continue

        role = "user" if speaker == "coach" else "assistant"
        messages.append({"role": role, "content": text})

    # We only want conversations with at least one turn from each speaker
    if len(messages) > 2:  # system + at least two turns
        return {"messages": messages}
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate scenario-based training data from interaction files.")
    parser.add_argument("input_dir", help="Directory containing .interactions.jsonl files")
    parser.add_argument("output_file", help="Output .jsonl file for training data")
    args = parser.parse_args()

    input_path = Path(args.input_dir)
    output_path = Path(args.output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    count = 0
    files = list(sorted(input_path.rglob("*.interactions.jsonl")))
    print(f"🔍 Found {len(files)} interaction files in {input_path}")

    with output_path.open("w") as f_out:
        # Recursive search for interaction files
        for jsonl_file in files:
            try:
                with jsonl_file.open("r") as f_in:
                    for line in f_in:
                        try:
                            interaction = json.loads(line)
                            if formatted_example := format_for_finetuning(interaction):
                                f_out.write(json.dumps(formatted_example) + "\n")
                                count += 1
                        except json.JSONDecodeError:
                            continue
            except Exception as e:
                print(f"Error reading {jsonl_file}: {e}")

    print(f"✅ Successfully generated {count} conversational examples in: {output_path}")
    if count == 0:
        print("⚠️  Generated 0 examples. This usually means no interactions were found or speakers are 'unknown'.")
        print("    Ensure you have run scripts/training-data/06.speakers and scripts/training-data/08.interactions.")


if __name__ == "__main__":
    main()
