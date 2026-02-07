#!/usr/bin/env python3
"""
scripts/training-data/validation/sample_review.py

Generate a small human-review pack (Markdown) from Stage 07 outputs.

Read-only: does not call the LLM and does not modify pipeline artifacts.

Use:
  python3 scripts/training-data/validation/sample_review.py \
    --manifest docs/pipeline/batches/CANARY.1.txt \
    --n 3 \
    --seed 1
"""

from __future__ import annotations

import argparse
import json
import random
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

LOG_PREFIX = "[sample-review]"

_BRACKET_ID_RE = re.compile(r"\[([A-Za-z0-9_-]+)\]")


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _extract_video_id(text: str) -> Optional[str]:
    m = _BRACKET_ID_RE.search(text)
    return m.group(1) if m else None


def load_manifest_entries(manifest_path: Path, source_filter: Optional[str] = None) -> List[Tuple[str, str, str]]:
    """Return list of (source, video_id, raw_folder_text)."""
    out: List[Tuple[str, str, str]] = []
    for raw in manifest_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("|", 1)
        if len(parts) != 2:
            continue
        src = parts[0].strip()
        folder = parts[1].strip()
        if source_filter and src != source_filter:
            continue
        vid = _extract_video_id(folder)
        if not vid:
            continue
        out.append((src, vid, folder))
    return out


def _video_id_for_path(p: Path) -> Optional[str]:
    return _extract_video_id(str(p))


def index_paths_by_video_id(stage_root: Path, glob_pattern: str, only_ids: set[str]) -> Dict[str, List[Path]]:
    out: Dict[str, List[Path]] = {}
    if not stage_root.exists():
        return out
    for p in stage_root.rglob(glob_pattern):
        vid = _video_id_for_path(p)
        if not vid or vid not in only_ids:
            continue
        out.setdefault(vid, []).append(p)
    return out


def pick_best_candidate(candidates: List[Path], preferred_source: Optional[str]) -> Path:
    def rank(p: Path) -> Tuple[int, int, float, str]:
        source_bonus = 1 if (preferred_source and preferred_source in p.parts) else 0
        depth = len(p.parts)
        try:
            mtime = p.stat().st_mtime
        except OSError:
            mtime = 0.0
        return (source_bonus, depth, mtime, str(p))

    return sorted(candidates, key=rank, reverse=True)[0]


def load_json(path: Path) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def compress_turn_phases(turn_phases: List[Dict[str, Any]]) -> List[str]:
    """Compress [{segment, phase}, ...] into strings like '12-19:open'."""
    items: List[Tuple[int, str]] = []
    for tp in turn_phases or []:
        if not isinstance(tp, dict):
            continue
        seg = tp.get("segment")
        phase = tp.get("phase")
        if isinstance(seg, int) and isinstance(phase, str) and phase:
            items.append((seg, phase))
    items.sort()

    if not items:
        return []

    out: List[str] = []
    start_seg, start_phase = items[0]
    prev_seg = start_seg
    prev_phase = start_phase

    for seg, phase in items[1:]:
        if phase == prev_phase and seg == prev_seg + 1:
            prev_seg = seg
            continue
        if start_seg == prev_seg:
            out.append(f"{start_seg}:{prev_phase}")
        else:
            out.append(f"{start_seg}-{prev_seg}:{prev_phase}")
        start_seg = prev_seg = seg
        prev_phase = phase

    if start_seg == prev_seg:
        out.append(f"{start_seg}:{prev_phase}")
    else:
        out.append(f"{start_seg}-{prev_seg}:{prev_phase}")
    return out


def format_segments_md(segments: List[Dict[str, Any]], max_lines: int) -> str:
    lines: List[str] = []
    for seg in segments[:max_lines]:
        seg_id = seg.get("id", "?")
        speaker = seg.get("speaker_role") or seg.get("speaker_id") or "unknown"
        text = (seg.get("text") or "").strip()
        lines.append(f"- [{seg_id}] {speaker}: {text}")
    remaining = len(segments) - max_lines
    if remaining > 0:
        lines.append(f"- ... ({remaining} more segment(s))")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a small Markdown review pack from Stage 07 outputs")
    parser.add_argument("--manifest", required=True, help="Batch/sub-batch manifest file")
    parser.add_argument("--source", help="Only include one source within the manifest")
    parser.add_argument("--n", type=int, default=3, help="Number of approach conversations to sample")
    parser.add_argument("--seed", type=int, default=1, help="Random seed")
    parser.add_argument("--max-segments", type=int, default=80, help="Max segments to print per conversation")
    parser.add_argument("--output", help="Write Markdown to this path instead of stdout")

    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.is_absolute():
        manifest_path = repo_root() / manifest_path
    if not manifest_path.exists():
        raise SystemExit(f"Manifest not found: {manifest_path}")

    entries = load_manifest_entries(manifest_path, source_filter=args.source)
    if not entries:
        raise SystemExit("No videos found in manifest (after source filter)")

    ids = {vid for _, vid, _ in entries}
    source_by_vid = {vid: src for src, vid, _ in entries}
    folder_by_vid = {vid: folder for _, vid, folder in entries}

    s07_root = repo_root() / "data" / "07.content"
    idx_s07 = index_paths_by_video_id(s07_root, "*.enriched.json", ids)

    videos: Dict[str, Dict[str, Any]] = {}
    missing: List[str] = []
    for vid in sorted(ids):
        candidates = idx_s07.get(vid) or []
        if not candidates:
            missing.append(vid)
            continue
        best = pick_best_candidate(candidates, source_by_vid.get(vid))
        data = load_json(best)
        if not data:
            missing.append(vid)
            continue
        data["_source_file"] = str(best)
        videos[vid] = data

    approach_items: List[Tuple[str, int, Dict[str, Any]]] = []
    for vid, data in videos.items():
        for e in data.get("enrichments", []) or []:
            if isinstance(e, dict) and e.get("type") == "approach":
                conv_id = e.get("conversation_id")
                if isinstance(conv_id, int):
                    approach_items.append((vid, conv_id, e))

    if not approach_items:
        raise SystemExit("No approach enrichments found in Stage 07 outputs")

    rnd = random.Random(args.seed)
    n = max(1, min(args.n, len(approach_items)))
    sample = rnd.sample(approach_items, n)

    lines: List[str] = []
    lines.append(f"# Stage 07 Sample Review Pack")
    lines.append("")
    lines.append(f"- Generated: {time.strftime('%Y-%m-%dT%H:%M:%SZ')}")
    lines.append(f"- Manifest: `{manifest_path}`")
    if args.source:
        lines.append(f"- Source filter: `{args.source}`")
    lines.append(f"- Sample size: {n} approach conversation(s) (seed={args.seed})")
    if missing:
        lines.append(f"- Missing Stage 07 outputs for: {missing}")
    lines.append("")

    for i, (vid, conv_id, e) in enumerate(sample, 1):
        src = source_by_vid.get(vid, "")
        folder = folder_by_vid.get(vid, "")
        data = videos[vid]
        s07_path = data.get("_source_file", "")

        segments = [s for s in data.get("segments", []) or [] if s.get("conversation_id") == conv_id]

        lines.append(f"## {i}. {vid} (conv {conv_id})")
        lines.append("")
        lines.append(f"- Source: `{src}`")
        lines.append(f"- Folder: `{folder}`")
        lines.append(f"- Stage07: `{s07_path}`")
        lines.append(f"- Segments in conversation: {len(segments)}")
        lines.append("")

        lines.append("### Enrichment")
        lines.append("")
        lines.append(f"- Description: {e.get('description')}")
        lines.append(f"- Topics: {e.get('topics_discussed')}")
        lines.append(f"- Investment: {e.get('investment_level')}")
        lines.append(f"- Hook: {e.get('hook_point')}")
        lines.append(f"- Phase confidence: {e.get('phase_confidence')}")
        lines.append(f"- Turn phases (compressed): {compress_turn_phases(e.get('turn_phases', []) or [])}")
        lines.append("")

        lines.append("### Techniques Used")
        lines.append("")
        for t in e.get("techniques_used", []) or []:
            if not isinstance(t, dict):
                continue
            lines.append(
                f"- {t.get('technique')} @ seg {t.get('segment')}: {t.get('example')}"
            )
        if not (e.get("techniques_used") or []):
            lines.append("- (none)")
        lines.append("")

        unlisted = e.get("unlisted_concepts", {}) if isinstance(e.get("unlisted_concepts"), dict) else {}
        if unlisted.get("techniques") or unlisted.get("topics"):
            lines.append("### Unlisted Concepts")
            lines.append("")
            lines.append(f"- Techniques: {unlisted.get('techniques', [])}")
            lines.append(f"- Topics: {unlisted.get('topics', [])}")
            lines.append("")

        lines.append("### Transcript (conversation segments)")
        lines.append("")
        lines.append(format_segments_md(segments, max_lines=args.max_segments))
        lines.append("")

    md = "\n".join(lines).rstrip() + "\n"

    if args.output:
        out_path = Path(args.output)
        if not out_path.is_absolute():
            out_path = repo_root() / out_path
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(md, encoding="utf-8")
        print(f"{LOG_PREFIX} Wrote: {out_path}")
    else:
        print(md)


if __name__ == "__main__":
    main()

