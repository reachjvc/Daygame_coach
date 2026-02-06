#!/usr/bin/env python3
"""
Fix broken filenames missing closing ] before .audio

Renames files like:
  Video Title [abc123.audio.asr.clean16k.wav
To:
  Video Title [abc123].audio.asr.clean16k.wav

Usage:
  ./fix-bracket-filenames.py --dry-run    # Preview changes
  ./fix-bracket-filenames.py              # Apply changes
"""

import argparse
import re
from pathlib import Path


def find_broken_files(root: Path) -> list[tuple[Path, Path]]:
    """Find files missing ] before .audio and compute new names."""
    renames = []

    # Pattern: [VIDEO_ID.audio (missing ] before .audio)
    # Should be: [VIDEO_ID].audio
    pattern = re.compile(r'^(.+\[[A-Za-z0-9_-]+)(\.audio\..+)$')

    for f in root.rglob('*'):
        if not f.is_file():
            continue
        if '.audio.' not in f.name:
            continue
        # Skip if already has ] before .audio
        if '].audio.' in f.name:
            continue

        match = pattern.match(f.name)
        if match:
            prefix = match.group(1)  # "Video Title [abc123"
            suffix = match.group(2)  # ".audio.asr.clean16k.wav"
            new_name = f"{prefix}]{suffix}"
            new_path = f.parent / new_name
            renames.append((f, new_path))

    return renames


def main():
    parser = argparse.ArgumentParser(description="Fix broken filenames missing ] before .audio")
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without renaming')
    parser.add_argument('--root', default='data/01.download', help='Root directory to scan')
    args = parser.parse_args()

    root = Path(args.root)
    if not root.exists():
        print(f"Error: {root} does not exist")
        return 1

    renames = find_broken_files(root)

    if not renames:
        print("No broken filenames found.")
        return 0

    print(f"Found {len(renames)} files to rename")
    print()

    if args.dry_run:
        print("DRY RUN - no changes will be made\n")
        for old, new in renames[:20]:
            print(f"  {old.name}")
            print(f"  → {new.name}")
            print()
        if len(renames) > 20:
            print(f"  ... and {len(renames) - 20} more")
        return 0

    # Apply renames
    success = 0
    errors = []

    for old, new in renames:
        try:
            if new.exists():
                errors.append((old, f"Target already exists: {new}"))
                continue
            old.rename(new)
            success += 1
        except Exception as e:
            errors.append((old, str(e)))

    print(f"Renamed: {success}")
    print(f"Errors:  {len(errors)}")

    if errors:
        print("\nErrors:")
        for old, err in errors[:10]:
            print(f"  {old.name}: {err}")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more")

    return 0 if not errors else 1


if __name__ == '__main__':
    exit(main())
