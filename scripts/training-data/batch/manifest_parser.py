"""
Shared manifest utilities for pipeline batch processing.

Manifest format (docs/pipeline/batches/P001.txt):
  # Comments start with #
  # Format: source_name | video_folder_name
  coach_kyle_infield | How to approach a woman... [4x9bvKaVWBc]
  daily_evolution | Title Here [xyz789]
"""

import re
from pathlib import Path
from typing import Dict, Optional, Set


def extract_video_id(name: str) -> Optional[str]:
    """Extract video ID from a folder or file name containing [VIDEO_ID]."""
    match = re.search(r"\[([a-zA-Z0-9_-]+)\]", name)
    return match.group(1) if match else None


def load_manifest(manifest_path: str | Path, source_name: Optional[str] = None) -> Set[str]:
    """Load manifest file and return set of video IDs.

    Args:
        manifest_path: Path to the manifest file.
        source_name: If provided, only return video IDs for this source.

    Returns:
        Set of video IDs from the manifest.
    """
    video_ids: Set[str] = set()
    with open(manifest_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("|", 1)
            if len(parts) != 2:
                continue
            src = parts[0].strip()
            folder = parts[1].strip()
            if source_name and src != source_name:
                continue
            vid_id = extract_video_id(folder)
            if vid_id:
                video_ids.add(vid_id)
    return video_ids


def load_manifest_sources(manifest_path: str | Path) -> Dict[str, Set[str]]:
    """Load manifest and return dict of source_name → set of video IDs.

    Returns:
        Dict mapping source names to sets of video IDs.
    """
    sources: Dict[str, Set[str]] = {}
    with open(manifest_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("|", 1)
            if len(parts) != 2:
                continue
            src = parts[0].strip()
            folder = parts[1].strip()
            vid_id = extract_video_id(folder)
            if vid_id:
                if src not in sources:
                    sources[src] = set()
                sources[src].add(vid_id)
    return sources


def manifest_filter_dirs(video_dirs: list, manifest_ids: Set[str]) -> list:
    """Filter a list of video directory Paths to only those in the manifest.

    Args:
        video_dirs: List of Path objects for video directories.
        manifest_ids: Set of video IDs from the manifest.

    Returns:
        Filtered list of Paths.
    """
    if not manifest_ids:
        return video_dirs

    filtered = [d for d in video_dirs if extract_video_id(d.name) in manifest_ids]
    if not filtered:
        return filtered

    selected_by_video_id: Dict[str, Path] = {}
    for path in filtered:
        vid = extract_video_id(path.name)
        if not vid:
            continue
        current = selected_by_video_id.get(vid)
        if current is None:
            selected_by_video_id[vid] = path
            continue
        selected_by_video_id[vid] = _pick_preferred_path(current, path)

    return sorted(selected_by_video_id.values(), key=lambda p: str(p))


def manifest_filter_files(files: list, manifest_ids: Set[str]) -> list:
    """Filter a list of file Paths to only those matching manifest video IDs.

    Args:
        files: List of Path objects for files.
        manifest_ids: Set of video IDs from the manifest.

    Returns:
        Filtered list of Paths.
    """
    if not manifest_ids:
        return files

    filtered = [f for f in files if extract_video_id(f.name) in manifest_ids]
    if not filtered:
        return filtered

    # A source can occasionally contain duplicate copies of the same video id
    # (e.g. mirrored folder trees). Keep exactly one file per video id so
    # per-video manifests do not fan out into duplicate LLM calls.
    selected_by_video_id: Dict[str, Path] = {}
    for path in filtered:
        vid = extract_video_id(path.name)
        if not vid:
            continue
        current = selected_by_video_id.get(vid)
        if current is None:
            selected_by_video_id[vid] = path
            continue
        selected_by_video_id[vid] = _pick_preferred_path(current, path)

    return sorted(selected_by_video_id.values(), key=lambda p: str(p))


def _pick_preferred_path(path_a: Path, path_b: Path) -> Path:
    """Pick the preferred candidate between two duplicate-id paths."""
    try:
        mtime_a = path_a.stat().st_mtime
    except OSError:
        mtime_a = 0.0
    try:
        mtime_b = path_b.stat().st_mtime
    except OSError:
        mtime_b = 0.0

    if mtime_a == mtime_b:
        return path_a if str(path_a) >= str(path_b) else path_b
    return path_a if mtime_a > mtime_b else path_b
