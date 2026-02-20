"""
Shared helpers for loading and checking quarantine lists.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Optional, Set

VIDEO_ID_RE = re.compile(r"[A-Za-z0-9_-]{11}")
VIDEO_ID_BRACKET_RE = re.compile(r"\[([A-Za-z0-9_-]{11})\]")


def extract_video_id_from_path(input_path: Path) -> Optional[str]:
    for token in (input_path.name, input_path.parent.name, input_path.stem):
        m = VIDEO_ID_BRACKET_RE.search(token)
        if m:
            return m.group(1)
        if VIDEO_ID_RE.fullmatch(token.strip()):
            return token.strip()
    return None


def load_quarantine_video_ids(quarantine_file: Path) -> Set[str]:
    """Load quarantine video IDs from JSON file.

    Supported formats:
      {"quarantined_video_ids":["id1", ...]}
      {"video_ids":["id1", ...]}
      {"videos":[{"video_id":"id1"}, "id2", ...]}
      ["id1", "id2", ...]
    """
    try:
        raw = json.loads(quarantine_file.read_text(encoding="utf-8"))
    except Exception as e:
        raise RuntimeError(f"Could not read quarantine file {quarantine_file}: {e}") from e

    ids: Set[str] = set()

    def add_id(value: Any) -> None:
        if isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9_-]{11}", value.strip()):
            ids.add(value.strip())

    if isinstance(raw, list):
        for item in raw:
            add_id(item)
        return ids

    if not isinstance(raw, dict):
        return ids

    for key in ("quarantined_video_ids", "video_ids"):
        arr = raw.get(key)
        if isinstance(arr, list):
            for item in arr:
                add_id(item)

    videos = raw.get("videos")
    if isinstance(videos, list):
        for item in videos:
            if isinstance(item, dict):
                add_id(item.get("video_id"))
            else:
                add_id(item)

    return ids


def get_quarantine_block_reason(input_path: Path, quarantine_ids: Set[str]) -> Optional[str]:
    if not quarantine_ids:
        return None
    vid = extract_video_id_from_path(input_path)
    if vid and vid in quarantine_ids:
        return f"quarantined video_id={vid}"
    return None
