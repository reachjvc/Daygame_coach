#!/usr/bin/env python3
"""
Check processing progress for all channels.
Usage: python scripts/check_progress.py
"""
from pathlib import Path

def count_files(directory, patterns):
    if not directory.exists():
        return 0
    count = 0
    for pattern in patterns:
        count += len(list(directory.glob(pattern)))
    return count

def count_lines(path):
    if not path.exists():
        return 0
    try:
        with path.open("r", encoding="utf-8") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0

def main():
    root = Path("training-data")
    raw_audio_root = root / "raw-audio"
    
    if not raw_audio_root.exists():
        print(f"❌ Raw audio directory not found: {raw_audio_root}")
        return

    # Find all channels (subdirectories in raw-audio)
    channels = [d.name for d in raw_audio_root.iterdir() if d.is_dir()]
    
    if not channels:
        print("❌ No channels found in training-data/raw-audio/")
        return

    print(f"{'CHANNEL':<30} | {'AUDIO':<6} | {'TRANS':<6} | {'FEAT':<6} | {'INT':<6}")
    print("-" * 70)

    for channel in sorted(channels):
        audio_dir = raw_audio_root / channel
        transcript_dir = root / "transcripts" / channel
        features_dir = root / "features" / channel
        interactions_dir = root / "interactions" / channel

        n_audio = count_files(audio_dir, ["*.opus", "*.mp3", "*.wav", "*.m4a", "*.webm", "*.mkv", "*.mp4"])
        # Count raw Whisper JSONs only (exclude *.classified.json)
        if transcript_dir.exists():
            n_trans = len([p for p in transcript_dir.glob("*.json") if not p.name.endswith(".classified.json")])
        else:
            n_trans = 0
        n_feat = count_files(features_dir, ["*.features.json"])
        n_int = count_files(interactions_dir, ["*.interactions.jsonl"])

        print(f"{channel:<30} | {n_audio:<6} | {n_trans:<6} | {n_feat:<6} | {n_int:<6}")

    print("-" * 70)
    print("AUDIO: Raw audio files downloaded")
    print("TRANS: Whisper transcripts generated")
    print("FEAT:  Audio features extracted (Pitch/Energy)")
    print("INT:   Interactions extracted (Conversations)")
    
    # Check final aggregated training data files
    processed_dir = root / "processed"
    final_training_data = processed_dir / "training_data.jsonl"
    scenario_training_data = processed_dir / "scenario_training.jsonl"
    
    print("\nFinal Aggregated Data:")
    print(f"  {final_training_data.name}: {count_lines(final_training_data)} lines")
    print(f"  {scenario_training_data.name}: {count_lines(scenario_training_data)} lines")

if __name__ == "__main__":
    main()
