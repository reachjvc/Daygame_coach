#!/usr/bin/env python3
"""
Training Data Verification (pre-flight / smoke test)

This script validates the on-disk artifacts used by the training-data pipeline:
- raw audio files exist
- Whisper JSON transcripts exist for audio files
- feature files exist for transcripts
- interactions exist for feature files
- key JSON/JSONL files are parseable and contain no literal "NaN"

Usage:
  python3 scripts/verify_training_data.py
  python3 scripts/verify_training_data.py --channel "SocialStoic"
  python3 scripts/verify_training_data.py --strict
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


AUDIO_EXTS = {".opus", ".mp3", ".wav", ".m4a", ".webm", ".mkv", ".mp4"}


def is_audio(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in AUDIO_EXTS


def stem(path: Path) -> str:
    return path.name[: -len(path.suffix)] if path.suffix else path.name


def raw_whisper_jsons(dir_path: Path) -> list[Path]:
    if not dir_path.exists():
        return []
    return sorted(p for p in dir_path.glob("*.json") if not p.name.endswith(".classified.json"))


def feature_jsons(dir_path: Path) -> list[Path]:
    if not dir_path.exists():
        return []
    return sorted(dir_path.glob("*.features.json"))


def interaction_jsonls(dir_path: Path) -> list[Path]:
    if not dir_path.exists():
        return []
    return sorted(dir_path.glob("*.interactions.jsonl"))


def contains_literal_nan(text: str) -> bool:
    return "NaN" in text


@dataclass
class ChannelReport:
    channel: str
    audio_count: int
    transcript_count: int
    feature_count: int
    interaction_count: int
    missing_transcripts: list[str]
    missing_features: list[str]
    invalid_json: list[str]
    nan_jsonl_files: list[str]


def verify_channel(root: Path, channel: str, validate_json: bool, strict: bool) -> ChannelReport:
    audio_dir = root / "raw-audio" / channel
    transcript_dir = root / "transcripts" / channel
    features_dir = root / "features" / channel
    interactions_dir = root / "interactions" / channel

    audio_files = sorted(p for p in audio_dir.iterdir() if is_audio(p)) if audio_dir.exists() else []
    transcript_files = raw_whisper_jsons(transcript_dir)
    feature_files = feature_jsons(features_dir)
    interaction_files = interaction_jsonls(interactions_dir)

    audio_stems = {stem(p) for p in audio_files}
    transcript_stems = {stem(p) for p in transcript_files}
    feature_stems = {stem(p).replace(".features", "") for p in feature_files}

    missing_transcripts = sorted(audio_stems - transcript_stems)
    missing_features = sorted(transcript_stems - feature_stems)

    invalid_json: list[str] = []
    nan_jsonl_files: list[str] = []

    if validate_json:
        for p in transcript_files:
            try:
                data = json.loads(p.read_text(encoding="utf-8"))
                if not isinstance(data, dict) or "segments" not in data:
                    invalid_json.append(str(p))
            except Exception:
                invalid_json.append(str(p))

        for p in feature_files:
            try:
                raw = p.read_text(encoding="utf-8")
                if contains_literal_nan(raw):
                    nan_jsonl_files.append(str(p))
                    continue
                data = json.loads(raw)
                if not isinstance(data, dict) or "segments" not in data:
                    invalid_json.append(str(p))
            except Exception:
                invalid_json.append(str(p))

    # Also scan output JSONL files for literal NaN (Node will crash on it).
    processed = root / "processed"
    for jsonl_path in [processed / "training_data.jsonl", processed / "scenario_training.jsonl"]:
        if not jsonl_path.exists():
            continue
        raw = jsonl_path.read_text(encoding="utf-8", errors="replace")
        if contains_literal_nan(raw):
            nan_jsonl_files.append(str(jsonl_path))

    report = ChannelReport(
        channel=channel,
        audio_count=len(audio_files),
        transcript_count=len(transcript_files),
        feature_count=len(feature_files),
        interaction_count=len(interaction_files),
        missing_transcripts=missing_transcripts,
        missing_features=missing_features,
        invalid_json=invalid_json,
        nan_jsonl_files=nan_jsonl_files,
    )

    if strict:
        # In strict mode, any missing artifacts or invalid JSON is an error.
        if report.missing_transcripts or report.missing_features or report.invalid_json or report.nan_jsonl_files:
            raise ValueError("strict verification failed")

    return report


def print_report(report: ChannelReport) -> None:
    print("")
    print(f"CHANNEL: {report.channel}")
    print(f"  audio:        {report.audio_count}")
    print(f"  transcripts:  {report.transcript_count}")
    print(f"  features:     {report.feature_count}")
    print(f"  interactions: {report.interaction_count}")
    if report.missing_transcripts:
        print(f"  ⚠️  missing transcripts: {len(report.missing_transcripts)}")
    if report.missing_features:
        print(f"  ⚠️  missing features: {len(report.missing_features)}")
    if report.invalid_json:
        print(f"  ❌ invalid JSON files: {len(report.invalid_json)}")
    if report.nan_jsonl_files:
        print(f"  ❌ files containing literal 'NaN': {len(report.nan_jsonl_files)}")


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify training-data pipeline artifacts on disk.")
    parser.add_argument("--channel", help="Verify only a single channel name (folder under training-data/raw-audio)")
    parser.add_argument("--strict", action="store_true", help="Exit non-zero on any missing/invalid artifacts")
    parser.add_argument("--no-validate-json", action="store_true", help="Skip parsing JSON files (faster)")
    args = parser.parse_args(list(argv) if argv is not None else None)

    root = Path("training-data")
    if not root.exists():
        print("❌ training-data/ not found", file=sys.stderr)
        return 1

    raw_audio_root = root / "raw-audio"
    if not raw_audio_root.exists():
        print("❌ training-data/raw-audio/ not found", file=sys.stderr)
        return 1

    channels = [args.channel] if args.channel else [d.name for d in raw_audio_root.iterdir() if d.is_dir()]
    if not channels:
        print("❌ No channels found under training-data/raw-audio/", file=sys.stderr)
        return 1

    validate_json = not args.no_validate_json
    print("================================")
    print("🔎 TRAINING DATA VERIFICATION")
    print("================================")
    print(f"Strict: {args.strict}")
    print(f"Validate JSON: {validate_json}")

    any_errors = False
    for channel in sorted(channels):
        try:
            report = verify_channel(root, channel, validate_json=validate_json, strict=args.strict)
            print_report(report)
            if report.missing_transcripts or report.missing_features or report.invalid_json or report.nan_jsonl_files:
                any_errors = True
        except Exception as e:
            any_errors = True
            print_report(
                ChannelReport(
                    channel=channel,
                    audio_count=0,
                    transcript_count=0,
                    feature_count=0,
                    interaction_count=0,
                    missing_transcripts=[],
                    missing_features=[],
                    invalid_json=[str(e)],
                    nan_jsonl_files=[],
                )
            )

    print("")
    if any_errors:
        print("⚠️  Verification found issues.")
        return 1 if args.strict else 0

    print("✅ Verification passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

