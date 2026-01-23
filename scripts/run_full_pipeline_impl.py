#!/usr/bin/env python3
"""
Full Training Data Pipeline with Progress Tracking and Resume Capability

This script processes infield videos through all pipeline stages:
1. Transcription (Whisper) - if not already done
2. Content Classification - labels intro/infield/theory/outro
3. Audio Feature Extraction - pitch, energy, tempo
4. Speaker Classification - coach vs girl
5. Tonality Classification - playful, confident, etc.
6. Conversation Detection (LLM) - identifies distinct approaches
7. Interaction Extraction - groups segments into conversations
8. Ground Truth Enrichment (LLM) - deep analysis with techniques/topics

Usage:
    # Process all files in a channel
    ./scripts/run_full_pipeline.sh --channel NaturalLifestyles-Infield

    # Process a single file (for testing)
    ./scripts/run_full_pipeline.sh --file "training-data/raw-audio/NaturalLifestyles-Infield/Video.webm"

    # Resume from where you left off
    ./scripts/run_full_pipeline.sh --channel NaturalLifestyles-Infield --resume

    # Skip LLM steps (faster, for testing)
    ./scripts/run_full_pipeline.sh --channel NaturalLifestyles-Infield --no-llm

    # Process only files that need specific stages
    ./scripts/run_full_pipeline.sh --channel NaturalLifestyles-Infield --from-stage conversations
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set

# Pipeline stages in order
STAGES = [
    "transcription",      # Whisper: raw-audio -> transcripts
    "classification",     # classify_content.py: transcripts -> classified
    "features",           # extract_audio_features.py: raw-audio + classified -> features
    "speakers",           # classify_speakers.py: features -> features (updated)
    "tonality",           # classify_tonality.py: features -> features (updated)
    "conversations",      # detect_conversations.py (LLM): features -> features (updated)
    "interactions",       # extract_interactions.py: features -> interactions
    "enrichment",         # enrich_ground_truth.py (LLM): interactions -> enriched
]

LLM_STAGES = {"conversations", "enrichment"}

STATUS_FILE = Path("training-data/pipeline_status.json")


def load_status() -> Dict:
    """Load pipeline status from JSON file."""
    if STATUS_FILE.exists():
        with open(STATUS_FILE) as f:
            return json.load(f)
    return {"version": 1, "files": {}, "last_updated": None}


def save_status(status: Dict) -> None:
    """Save pipeline status to JSON file."""
    status["last_updated"] = datetime.now().isoformat()
    STATUS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(STATUS_FILE, "w") as f:
        json.dump(status, f, indent=2)


def get_file_key(file_path: Path) -> str:
    """Generate a unique key for a file based on its path."""
    try:
        return str(file_path.relative_to("training-data"))
    except ValueError:
        return str(file_path)


def get_completed_stages(status: Dict, file_key: str) -> Set[str]:
    """Get set of completed stages for a file."""
    file_status = status.get("files", {}).get(file_key, {})
    return set(file_status.get("completed_stages", []))


def mark_stage_complete(status: Dict, file_key: str, stage: str, file_path: Path) -> None:
    """Mark a stage as complete for a file."""
    if "files" not in status:
        status["files"] = {}
    if file_key not in status["files"]:
        status["files"][file_key] = {
            "path": str(file_path),
            "completed_stages": [],
            "started": datetime.now().isoformat(),
        }
    if stage not in status["files"][file_key]["completed_stages"]:
        status["files"][file_key]["completed_stages"].append(stage)
    status["files"][file_key]["last_stage"] = stage
    status["files"][file_key]["last_updated"] = datetime.now().isoformat()


def find_audio_files(channel: str) -> List[Path]:
    """Find all audio files for a channel."""
    audio_dir = Path(f"training-data/raw-audio/{channel}")
    if not audio_dir.exists():
        print(f"ERROR: Audio directory not found: {audio_dir}")
        return []

    extensions = [".opus", ".webm", ".mp3", ".m4a", ".wav", ".mkv", ".mp4"]
    files = []
    for ext in extensions:
        files.extend(audio_dir.glob(f"*{ext}"))

    return sorted(files)


def get_base_name(audio_file: Path) -> str:
    """Get base name without extension for a file."""
    name = audio_file.name
    for ext in [".opus", ".webm", ".mp3", ".m4a", ".wav", ".mkv", ".mp4"]:
        if name.endswith(ext):
            return name[:-len(ext)]
    return audio_file.stem


def file_exists_and_valid(path: Path, min_size: int = 10) -> bool:
    """Check if a file exists and has minimum size."""
    return path.exists() and path.stat().st_size >= min_size


def run_command(cmd: List[str], description: str, timeout: int = 600) -> bool:
    """Run a command and return success status."""
    print(f"      Running: {description}")
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        if result.returncode != 0:
            # Show error but truncate if too long
            err = result.stderr[:500] if result.stderr else result.stdout[:500]
            print(f"      ERROR: {err}")
            return False
        return True
    except subprocess.TimeoutExpired:
        print(f"      ERROR: Command timed out after {timeout}s")
        return False
    except Exception as e:
        print(f"      ERROR: {e}")
        return False


def process_file(
    audio_file: Path,
    channel: str,
    status: Dict,
    skip_llm: bool = False,
    from_stage: Optional[str] = None,
    verbose: bool = False
) -> bool:
    """Process a single file through all pipeline stages."""
    base_name = get_base_name(audio_file)
    file_key = get_file_key(audio_file)
    completed = get_completed_stages(status, file_key)

    # Determine which stages to run
    stages_to_run = STAGES.copy()
    if from_stage and from_stage in STAGES:
        start_idx = STAGES.index(from_stage)
        stages_to_run = STAGES[start_idx:]

    if skip_llm:
        stages_to_run = [s for s in stages_to_run if s not in LLM_STAGES]

    # Define file paths
    transcript_json = Path(f"training-data/transcripts/{channel}/{base_name}.json")
    classified_json = Path(f"training-data/classified/{channel}/{base_name}.classified.json")
    features_json = Path(f"training-data/features/{channel}/{base_name}.features.json")
    interactions_jsonl = Path(f"training-data/interactions/{channel}/{base_name}.interactions.jsonl")
    enriched_json = Path(f"training-data/enriched/{channel}/{base_name}.ground_truth.json")
    transcript_txt = Path(f"training-data/transcripts/{channel}/{base_name}.txt")

    print(f"\n  [{base_name[:55]}...]")

    for stage in stages_to_run:
        # Skip if already completed (unless forcing from a specific stage)
        if stage in completed and not from_stage:
            if verbose:
                print(f"    [{stage}] Already complete, skipping")
            continue

        success = False
        llm_marker = " (LLM)" if stage in LLM_STAGES else ""

        if stage == "transcription":
            if file_exists_and_valid(transcript_json, 100):
                success = True
                if verbose:
                    print(f"    [{stage}] Already exists")
            else:
                print(f"    [{stage}]{llm_marker}")
                # Run transcription via shell script
                success = run_command(
                    ["bash", "-c", f"source scripts/training_data_env.sh && ./scripts/transcribe_channel.sh \"{channel}\" \"{audio_file}\""],
                    "Whisper transcription",
                    timeout=1800  # 30 min for long videos
                )
                if not success:
                    success = file_exists_and_valid(transcript_json, 100)

        elif stage == "classification":
            if file_exists_and_valid(classified_json, 100):
                success = True
                if verbose:
                    print(f"    [{stage}] Already exists")
            elif file_exists_and_valid(transcript_json, 100):
                print(f"    [{stage}]{llm_marker}")
                Path(f"training-data/classified/{channel}").mkdir(parents=True, exist_ok=True)
                success = run_command(
                    ["python3", "scripts/classify_content.py",
                     "--input", str(transcript_json),
                     "--output", str(classified_json)],
                    "Content classification"
                )

        elif stage == "features":
            if file_exists_and_valid(features_json, 100):
                success = True
                if verbose:
                    print(f"    [{stage}] Already exists")
            elif file_exists_and_valid(classified_json, 100):
                print(f"    [{stage}]{llm_marker}")
                Path(f"training-data/features/{channel}").mkdir(parents=True, exist_ok=True)
                success = run_command(
                    ["python3", "scripts/extract_audio_features.py",
                     "--audio", str(audio_file),
                     "--timestamps", str(classified_json),
                     "--output", str(features_json)],
                    "Audio feature extraction"
                )

        elif stage == "speakers":
            if not file_exists_and_valid(features_json, 100):
                if verbose:
                    print(f"    [{stage}] Skipping - no features file")
                continue
            # Check if speakers already classified
            try:
                with open(features_json) as f:
                    data = json.load(f)
                if data.get("segments") and data["segments"][0].get("speaker", {}).get("label"):
                    success = True
                    if verbose:
                        print(f"    [{stage}] Already classified")
            except:
                pass
            if not success:
                print(f"    [{stage}]{llm_marker}")
                success = run_command(
                    ["python3", "scripts/classify_speakers.py",
                     "--input", str(features_json),
                     "--output", str(features_json)],
                    "Speaker classification"
                )

        elif stage == "tonality":
            if not file_exists_and_valid(features_json, 100):
                if verbose:
                    print(f"    [{stage}] Skipping - no features file")
                continue
            try:
                with open(features_json) as f:
                    data = json.load(f)
                if data.get("segments") and data["segments"][0].get("tone", {}).get("primary"):
                    success = True
                    if verbose:
                        print(f"    [{stage}] Already classified")
            except:
                pass
            if not success:
                print(f"    [{stage}]{llm_marker}")
                success = run_command(
                    ["python3", "scripts/classify_tonality.py",
                     "--input", str(features_json),
                     "--output", str(features_json)],
                    "Tonality classification"
                )

        elif stage == "conversations":
            if not file_exists_and_valid(features_json, 100):
                if verbose:
                    print(f"    [{stage}] Skipping - no features file")
                continue
            try:
                with open(features_json) as f:
                    data = json.load(f)
                if data.get("conversation_summary"):
                    success = True
                    if verbose:
                        print(f"    [{stage}] Already detected")
            except:
                pass
            if not success:
                print(f"    [{stage}]{llm_marker}")
                conv_output = features_json.parent / f"{base_name}.features.conversations.json"
                success = run_command(
                    ["python3", "scripts/detect_conversations.py",
                     "--input", str(features_json),
                     "--output", str(conv_output)],
                    "Conversation detection",
                    timeout=1800  # 30 min for LLM processing
                )
                if success and conv_output.exists():
                    conv_output.replace(features_json)

        elif stage == "interactions":
            if file_exists_and_valid(interactions_jsonl, 10):
                success = True
                if verbose:
                    print(f"    [{stage}] Already exists")
            elif file_exists_and_valid(features_json, 100):
                print(f"    [{stage}]{llm_marker}")
                Path(f"training-data/interactions/{channel}").mkdir(parents=True, exist_ok=True)
                success = run_command(
                    ["python3", "scripts/extract_interactions.py",
                     "--input", str(features_json),
                     "--output", str(interactions_jsonl)],
                    "Interaction extraction"
                )

        elif stage == "enrichment":
            if file_exists_and_valid(enriched_json, 100):
                success = True
                if verbose:
                    print(f"    [{stage}] Already exists")
            elif file_exists_and_valid(interactions_jsonl, 10) and file_exists_and_valid(transcript_txt, 10):
                print(f"    [{stage}]{llm_marker}")
                Path(f"training-data/enriched/{channel}").mkdir(parents=True, exist_ok=True)
                success = run_command(
                    ["python3", "scripts/enrich_ground_truth.py",
                     "--interactions", str(interactions_jsonl),
                     "--transcript", str(transcript_txt),
                     "--output", str(enriched_json)],
                    "Ground truth enrichment",
                    timeout=1800  # 30 min for LLM
                )
            else:
                if verbose:
                    print(f"    [{stage}] Skipping - missing interactions or transcript")
                continue

        if success:
            mark_stage_complete(status, file_key, stage, audio_file)
            save_status(status)
            if not verbose:
                print(f"    [{stage}] OK")
        else:
            print(f"    [{stage}] FAILED")
            return False

    return True


def update_training_data_md():
    """Update TRAINING_DATA.md with current timestamp."""
    md_path = Path("docs/TRAINING_DATA.md")
    if not md_path.exists():
        return

    content = md_path.read_text()

    # Update timestamp with full datetime
    now = datetime.now()
    timestamp = now.strftime("%Y-%m-%d %H:%M:%S")

    # Replace the "Last Updated" line
    import re
    content = re.sub(
        r"\*\*Last Updated:\*\* .*",
        f"**Last Updated:** {timestamp}",
        content
    )

    md_path.write_text(content)
    print(f"\nUpdated docs/TRAINING_DATA.md timestamp to {timestamp}")


def print_summary(status: Dict, channel: str):
    """Print a summary of pipeline progress."""
    print("\n" + "=" * 60)
    print("PIPELINE SUMMARY")
    print("=" * 60)

    audio_files = find_audio_files(channel)
    total_found = len(audio_files)
    tracked_files = 0
    fully_complete = 0
    stage_counts = {stage: 0 for stage in STAGES}

    orphaned_tracked = 0
    if total_found > 0:
        # Prefer counting progress against files present on disk, not just files already tracked.
        for audio_file in audio_files:
            file_key = get_file_key(audio_file)
            file_status = status.get("files", {}).get(file_key)
            if not file_status:
                continue
            tracked_files += 1
            completed = set(file_status.get("completed_stages", []))
            for stage in completed:
                if stage in stage_counts:
                    stage_counts[stage] += 1
            if completed >= set(STAGES):
                fully_complete += 1

        audio_keys = {get_file_key(p) for p in audio_files}
        for file_key, file_status in status.get("files", {}).items():
            if channel in file_key or channel in file_status.get("path", ""):
                if file_key not in audio_keys:
                    orphaned_tracked += 1
    else:
        # Fallback: if files aren't available on disk, report based on the status file alone.
        for file_key, file_status in status.get("files", {}).items():
            if channel in file_key or channel in file_status.get("path", ""):
                tracked_files += 1
                completed = set(file_status.get("completed_stages", []))
                for stage in completed:
                    if stage in stage_counts:
                        stage_counts[stage] += 1
                if completed >= set(STAGES):
                    fully_complete += 1

    print(f"\nChannel: {channel}")
    print(f"Files found on disk: {total_found}")
    print(f"Files tracked in status: {tracked_files}")
    if total_found > 0:
        print(f"Untracked files: {total_found - tracked_files}")
    if orphaned_tracked:
        print(f"Orphaned status entries: {orphaned_tracked}")
    denom_complete = total_found if total_found > 0 else tracked_files
    if denom_complete > 0:
        print(f"Fully complete: {fully_complete}/{denom_complete}")
    else:
        print(f"Fully complete: {fully_complete}")
    print(f"\nStage completion:")
    denom = total_found if total_found > 0 else tracked_files
    for stage in STAGES:
        pct = (stage_counts[stage] / denom * 100) if denom > 0 else 0
        bar = "#" * int(pct / 5) + "-" * (20 - int(pct / 5))
        llm_marker = " (LLM)" if stage in LLM_STAGES else ""
        print(f"  {stage:15} [{bar}] {stage_counts[stage]:3}/{denom} ({pct:.0f}%){llm_marker}")


def main():
    parser = argparse.ArgumentParser(
        description="Full training data pipeline with progress tracking",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process all files in a channel
  ./scripts/run_full_pipeline.sh --channel NaturalLifestyles-Infield

  # Process a single file for testing
  ./scripts/run_full_pipeline.sh --file "training-data/raw-audio/.../Video.webm"

  # Resume from where you left off
  ./scripts/run_full_pipeline.sh --channel NaturalLifestyles-Infield --resume

  # Skip LLM steps (faster testing)
  ./scripts/run_full_pipeline.sh --channel NaturalLifestyles-Infield --no-llm

  # Start from a specific stage
  ./scripts/run_full_pipeline.sh --channel NaturalLifestyles-Infield --from-stage conversations

  # Just show current progress
  ./scripts/run_full_pipeline.sh --channel NaturalLifestyles-Infield --status-only
        """
    )
    parser.add_argument("--channel", help="Channel name to process")
    parser.add_argument("--file", help="Single file to process")
    parser.add_argument("--resume", action="store_true", help="Resume from last checkpoint (skip completed stages)")
    parser.add_argument("--no-llm", action="store_true", help="Skip LLM stages (conversations, enrichment)")
    parser.add_argument("--from-stage", choices=STAGES, help="Start from a specific stage (re-run from this point)")
    parser.add_argument("--status-only", action="store_true", help="Just show progress status")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--limit", type=int, help="Limit number of files to process")

    args = parser.parse_args()

    if not args.channel and not args.file:
        parser.error("Either --channel or --file is required")

    # Load status
    status = load_status()

    # Determine channel
    channel = args.channel
    if args.file:
        file_path = Path(args.file)
        parts = file_path.parts
        if "raw-audio" in parts:
            idx = parts.index("raw-audio")
            if idx + 1 < len(parts):
                channel = parts[idx + 1]

    # Status only mode
    if args.status_only:
        print_summary(status, channel)
        return

    # Find files to process
    if args.file:
        files = [Path(args.file)]
    else:
        files = find_audio_files(channel)

    if not files:
        print(f"No audio files found for channel: {channel}")
        return

    if args.limit:
        files = files[:args.limit]

    print("=" * 60)
    print(f"FULL PIPELINE - {channel}")
    print("=" * 60)
    print(f"Files to process: {len(files)}")
    print(f"Resume mode: {args.resume}")
    print(f"Skip LLM: {args.no_llm}")
    if args.from_stage:
        print(f"Starting from stage: {args.from_stage}")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Process files
    success_count = 0
    fail_count = 0

    for i, audio_file in enumerate(files, 1):
        print(f"\n[{i}/{len(files)}] {audio_file.name[:50]}...")

        try:
            success = process_file(
                audio_file,
                channel,
                status,
                skip_llm=args.no_llm,
                from_stage=args.from_stage if not args.resume else None,
                verbose=args.verbose
            )
            if success:
                success_count += 1
            else:
                fail_count += 1
        except KeyboardInterrupt:
            print("\n\nInterrupted by user. Progress has been saved.")
            save_status(status)
            break
        except Exception as e:
            print(f"  ERROR: {e}")
            fail_count += 1

        # Save status after each file
        save_status(status)

    # Update TRAINING_DATA.md
    update_training_data_md()

    # Print summary
    print_summary(status, channel)

    print(f"\n" + "=" * 60)
    print("COMPLETE")
    print("=" * 60)
    print(f"Successful: {success_count}")
    print(f"Failed: {fail_count}")
    print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
