#!/usr/bin/env python3
"""
scripts/training-data/validation/validate_stage_contract.py

Deterministic preflight validator for stage dependency contracts.

Given a manifest scope and a target stage, this script verifies that all
required upstream artifacts exist for non-quarantined videos.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

LOG_PREFIX = "[validate-stage-contract]"

VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
BRACKET_VIDEO_ID_RE = re.compile(r"\[([A-Za-z0-9_-]{11})\]")
CHUNKS_BASENAME_VIDEO_ID_RE = re.compile(r"^([A-Za-z0-9_-]{11})\.chunks\.json$")

STAGE_ARTIFACTS: Dict[str, Tuple[str, str, bool]] = {
    "05": ("05.EXT.audio-features", "*.audio_features.json", False),
    "06": ("06.LLM.video-type", "*.conversations.json", False),
    "06b": ("06b.LLM.verify", "*.verification.json", False),
    "06c": ("06c.DET.patched", "*.conversations.json", False),
    "06d": ("06d.DET.sanitized", "*.conversations.json", False),
    "06e": ("06e.LLM.quality-check", "*.quality-check.json", False),
    "06f": ("06f.DET.damage-map", "*.damage-map.json", False),
    "06g": ("06g.LLM.damage-adjudicator", "*.damage-adjudication.json", False),
    "06h": ("06h.DET.confidence-propagation", "*.conversations.json", False),
    "07": ("07.LLM.content", "*.enriched.json", False),
    "07b": ("07b.LLM.enrichment-verify", "*.enrichment-verify.json", False),
    "08": ("08.DET.taxonomy-validation", "*.report.json", False),
    "09": ("09.EXT.chunks", "*.chunks.json", True),
}

STAGE_DEPENDENCIES: Dict[str, List[str]] = {
    "06": ["05"],
    "06b": ["06"],
    "06c": ["06", "06b"],
    "06d": ["06c"],
    "06e": ["06d"],
    "06f": ["06d"],
    "06g": ["06f"],
    "06h": ["06d", "06f"],
    "07": ["06h"],
    "07b": ["07", "06c", "06e"],
    "08": ["07", "07b"],
    "09": ["07", "07b"],
}


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def safe_name(raw: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", (raw or "").strip()).strip("_") or "report"


def _extract_video_id_from_text(text: str) -> Optional[str]:
    m = BRACKET_VIDEO_ID_RE.search(text or "")
    if not m:
        return None
    vid = m.group(1)
    return vid if VIDEO_ID_RE.fullmatch(vid) else None


def _extract_video_id_from_json(path: Path) -> Optional[str]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    if not isinstance(payload, dict):
        return None
    for key in ("video_id", "videoId"):
        raw = payload.get(key)
        if isinstance(raw, str):
            val = raw.strip()
            if VIDEO_ID_RE.fullmatch(val):
                return val
    source_key = payload.get("sourceKey")
    if isinstance(source_key, str):
        m = re.search(r"[\\/](?P<vid>[A-Za-z0-9_-]{11})\.txt$", source_key)
        if m:
            return m.group("vid")
    return None


def _video_id_for_file(path: Path, *, allow_json_probe: bool) -> Optional[str]:
    vid = _extract_video_id_from_text(str(path))
    if vid:
        return vid

    m = CHUNKS_BASENAME_VIDEO_ID_RE.match(path.name)
    if m:
        return m.group(1)

    if allow_json_probe:
        return _extract_video_id_from_json(path)
    return None


def _load_manifest_video_ids(manifest_path: Path, source_filter: Optional[str]) -> Set[str]:
    out: Set[str] = set()
    for raw in manifest_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("|", 1)
        if len(parts) != 2:
            continue
        source = parts[0].strip()
        folder = parts[1].strip()
        if source_filter and source != source_filter:
            continue
        vid = _extract_video_id_from_text(folder)
        if vid:
            out.add(vid)
    return out


def _default_quarantine_candidates(
    manifest_path: Path,
    source_filter: Optional[str],
) -> List[Path]:
    root = repo_root() / "data" / "validation" / "quarantine"
    stem = safe_name(manifest_path.stem)
    out: List[Path] = []
    if source_filter:
        out.append(root / f"{safe_name(f'{stem}.{source_filter}')}.json")
    out.append(root / f"{stem}.json")
    return out


def _load_quarantine_ids(quarantine_path: Path) -> Set[str]:
    try:
        payload = json.loads(quarantine_path.read_text(encoding="utf-8"))
    except Exception:
        return set()

    out: Set[str] = set()

    def add_id(value: Any) -> None:
        if isinstance(value, str):
            vid = value.strip()
            if VIDEO_ID_RE.fullmatch(vid):
                out.add(vid)

    if isinstance(payload, list):
        for item in payload:
            add_id(item)
        return out
    if not isinstance(payload, dict):
        return out

    for key in ("quarantined_video_ids", "video_ids"):
        raw = payload.get(key)
        if isinstance(raw, list):
            for item in raw:
                add_id(item)

    videos = payload.get("videos")
    if isinstance(videos, list):
        for item in videos:
            if isinstance(item, dict):
                add_id(item.get("video_id"))
            else:
                add_id(item)
    return out


def _resolve_quarantine_ids(
    manifest_path: Path,
    source_filter: Optional[str],
    explicit_quarantine_path: Optional[Path],
) -> Tuple[Set[str], Optional[Path]]:
    candidates: List[Path] = []
    if explicit_quarantine_path is not None:
        candidates.append(explicit_quarantine_path)
    else:
        candidates.extend(_default_quarantine_candidates(manifest_path, source_filter))

    for path in candidates:
        if path.exists():
            return _load_quarantine_ids(path), path
    return set(), None


def _collect_stage_video_ids(stage: str) -> Set[str]:
    stage_dir, pattern, allow_json_probe = STAGE_ARTIFACTS[stage]
    root = repo_root() / "data" / stage_dir
    if not root.exists():
        return set()
    out: Set[str] = set()
    for path in root.rglob(pattern):
        vid = _video_id_for_file(path, allow_json_probe=allow_json_probe)
        if vid:
            out.add(vid)
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate stage dependency contract for manifest scope.")
    parser.add_argument("--manifest", required=True, help="Batch/sub-batch manifest path.")
    parser.add_argument("--stage", required=True, help="Target stage key (06, 06b, 06c, ..., 09).")
    parser.add_argument("--source", help="Optional source filter within the manifest.")
    parser.add_argument("--quarantine-file", help="Optional quarantine JSON path.")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.is_absolute():
        manifest_path = repo_root() / manifest_path
    if not manifest_path.exists():
        print(f"{LOG_PREFIX} ERROR: Manifest not found: {manifest_path}", file=sys.stderr)
        sys.exit(2)

    stage_key = str(args.stage).strip()
    if stage_key not in STAGE_DEPENDENCIES:
        print(
            f"{LOG_PREFIX} ERROR: Unknown stage '{stage_key}' "
            f"(valid: {', '.join(sorted(STAGE_DEPENDENCIES.keys(), key=lambda s: (len(s), s)))})",
            file=sys.stderr,
        )
        sys.exit(2)

    explicit_quarantine_path: Optional[Path] = None
    if args.quarantine_file:
        explicit_quarantine_path = Path(args.quarantine_file)
        if not explicit_quarantine_path.is_absolute():
            explicit_quarantine_path = repo_root() / explicit_quarantine_path

    manifest_ids = _load_manifest_video_ids(manifest_path, args.source)
    quarantine_ids, quarantine_path = _resolve_quarantine_ids(
        manifest_path=manifest_path,
        source_filter=args.source,
        explicit_quarantine_path=explicit_quarantine_path,
    )
    effective_ids = manifest_ids - quarantine_ids

    dependencies = STAGE_DEPENDENCIES[stage_key]
    dependency_rows: List[Dict[str, Any]] = []
    failing = False
    for dep in dependencies:
        present_ids = _collect_stage_video_ids(dep)
        missing_ids = sorted(effective_ids - present_ids)
        row = {
            "stage": dep,
            "required_count": len(effective_ids),
            "present_count": len(effective_ids & present_ids),
            "missing_count": len(missing_ids),
            "missing_video_ids": missing_ids,
        }
        dependency_rows.append(row)
        if missing_ids:
            failing = True

    payload = {
        "manifest": str(manifest_path),
        "source_filter": args.source,
        "target_stage": stage_key,
        "dependencies": dependency_rows,
        "summary": {
            "manifest_video_count": len(manifest_ids),
            "quarantined_video_count": len(manifest_ids & quarantine_ids),
            "effective_video_count": len(effective_ids),
            "status": "fail" if failing else "pass",
        },
        "inputs": {
            "quarantine_file": str(quarantine_path) if quarantine_path else None,
        },
    }

    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print(f"{LOG_PREFIX} Manifest: {manifest_path}")
        print(f"{LOG_PREFIX} Stage: {stage_key}")
        print(
            f"{LOG_PREFIX} Scope: manifest={len(manifest_ids)}, "
            f"quarantined={len(manifest_ids & quarantine_ids)}, effective={len(effective_ids)}"
        )
        if quarantine_path:
            print(f"{LOG_PREFIX} Quarantine: {quarantine_path}")
        if not dependencies:
            print(f"{LOG_PREFIX} No dependency checks defined for stage {stage_key}.")
        for row in dependency_rows:
            dep = row["stage"]
            status = "PASS" if row["missing_count"] == 0 else "FAIL"
            print(
                f"{LOG_PREFIX} {dep}: {status} "
                f"(present={row['present_count']}/{row['required_count']}, missing={row['missing_count']})"
            )
            if row["missing_video_ids"]:
                preview = ", ".join(row["missing_video_ids"][:8])
                if len(row["missing_video_ids"]) > 8:
                    preview += ", ..."
                print(f"{LOG_PREFIX}   missing_video_ids: {preview}")
        print(f"{LOG_PREFIX} Result: {'FAIL' if failing else 'PASS'}")

    sys.exit(1 if failing else 0)


if __name__ == "__main__":
    main()
