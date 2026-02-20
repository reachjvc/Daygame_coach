#!/usr/bin/env python3
"""
Simulate pipeline-runner quarantine decisions on a manifest without rerunning stages.

This script mirrors the parallel per-video quarantine checks used in `pipeline-runner`:
- Stage 06b REJECT verdict detection
- Stage 07 validator-based blocking extraction
- Stage 09 validator-based blocking extraction

It is intended for sequential-vs-parallel parity analysis.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

SCRIPT_PATH = Path(__file__).resolve()
BATCH_DIR = SCRIPT_PATH.parents[1] / "batch"
if str(BATCH_DIR) not in sys.path:
    sys.path.insert(0, str(BATCH_DIR))

from quarantine_updater import extract_from_cross_stage_or_chunks, merge_quarantine

VIDEO_ID_RE = re.compile(r"\[([A-Za-z0-9_-]{11})\]")


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _load_manifest_entries(manifest_path: Path) -> List[Tuple[str, str, str]]:
    out: List[Tuple[str, str, str]] = []
    for raw in manifest_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("|", 1)
        if len(parts) != 2:
            continue
        source = parts[0].strip()
        folder = parts[1].strip()
        m = VIDEO_ID_RE.search(folder)
        if not m:
            continue
        out.append((source, folder, m.group(1)))
    return out


def _extract_json_payload(raw: str) -> Optional[Dict[str, Any]]:
    text = (raw or "").strip()
    if not text:
        return None
    try:
        data = json.loads(text)
        return data if isinstance(data, dict) else None
    except Exception:
        pass
    start = text.find("{")
    if start < 0:
        return None
    depth = 0
    for idx in range(start, len(text)):
        ch = text[idx]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                snippet = text[start : idx + 1]
                try:
                    data = json.loads(snippet)
                except Exception:
                    return None
                return data if isinstance(data, dict) else None
    return None


def _run_validator(cmd: List[str]) -> Optional[Dict[str, Any]]:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    payload = _extract_json_payload(proc.stdout)
    if payload is None:
        payload = _extract_json_payload(proc.stderr)
    return payload


def _check_06b_reject(video_id: str, source: str) -> bool:
    root = repo_root() / "data" / "06b.LLM.verify"
    verify_dir = root / source
    if not verify_dir.exists():
        verify_dir = root

    for cpath in verify_dir.rglob(f"*{video_id}*.verification.json"):
        try:
            payload = json.loads(cpath.read_text(encoding="utf-8"))
        except Exception:
            continue
        verdict = str(payload.get("verdict") or payload.get("overall_verdict") or "").strip().upper()
        if verdict == "REJECT":
            return True
    return False


def _empty_quarantine() -> Dict[str, Any]:
    return {
        "version": 1,
        "generated_at": "",
        "quarantine_level": "error",
        "quarantined_video_count": 0,
        "quarantined_video_ids": [],
        "videos": [],
    }


def _add_manual_reason(
    payload: Dict[str, Any],
    video_id: str,
    check: str,
    message: str,
) -> Dict[str, Any]:
    row = {
        "video_id": video_id,
        "checks": [check],
        "reasons": [
            {
                "severity": "error",
                "check": check,
                "message": message,
            }
        ],
    }
    return merge_quarantine(payload, {video_id}, [row])


def _index_videos(rows: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    out: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        vid = row.get("video_id")
        if isinstance(vid, str) and vid.strip():
            out[vid.strip()] = row
    return out


def simulate(manifest_path: Path, validator_scope: str) -> Dict[str, Any]:
    entries = _load_manifest_entries(manifest_path)
    root = repo_root()
    py = sys.executable
    validation_dir = root / "scripts" / "training-data" / "validation"

    quarantine = _empty_quarantine()
    temp_files_used = 0

    cross_ids_full: Set[str] = set()
    chunk_ids_full: Set[str] = set()
    cross_rows_full: Dict[str, Dict[str, Any]] = {}
    chunk_rows_full: Dict[str, Dict[str, Any]] = {}

    if validator_scope == "full":
        cross_payload = _run_validator(
            [
                py,
                str(validation_dir / "validate_cross_stage.py"),
                "--manifest",
                str(manifest_path),
                "--json",
            ]
        )
        if isinstance(cross_payload, dict):
            ids, rows = extract_from_cross_stage_or_chunks(cross_payload, stage_label="07")
            cross_ids_full = ids
            cross_rows_full = _index_videos(rows)

        chunks_payload = _run_validator(
            [
                py,
                str(validation_dir / "validate_chunks.py"),
                "--manifest",
                str(manifest_path),
                "--json",
            ]
        )
        if isinstance(chunks_payload, dict):
            ids, rows = extract_from_cross_stage_or_chunks(chunks_payload, stage_label="09")
            chunk_ids_full = ids
            chunk_rows_full = _index_videos(rows)

    for source, folder, video_id in entries:
        if _check_06b_reject(video_id, source):
            quarantine = _add_manual_reason(
                quarantine,
                video_id,
                "stage06b_reject",
                "Stage 06b verdict: REJECT",
            )

        if validator_scope == "full":
            if video_id in cross_ids_full:
                row = cross_rows_full.get(video_id)
                if row:
                    quarantine = merge_quarantine(quarantine, {video_id}, [row])
            if video_id in chunk_ids_full:
                row = chunk_rows_full.get(video_id)
                if row:
                    quarantine = merge_quarantine(quarantine, {video_id}, [row])
            continue

        fd, tmp_manifest = tempfile.mkstemp(prefix=f"sim_{video_id}_", suffix=".txt")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                handle.write(f"{source} | {folder}\n")
            temp_files_used += 1

            cross_payload = _run_validator(
                [
                    py,
                    str(validation_dir / "validate_cross_stage.py"),
                    "--manifest",
                    tmp_manifest,
                    "--json",
                ]
            )
            if isinstance(cross_payload, dict):
                ids, videos = extract_from_cross_stage_or_chunks(cross_payload, stage_label="07")
                if ids:
                    quarantine = merge_quarantine(quarantine, ids, videos)

            chunks_payload = _run_validator(
                [
                    py,
                    str(validation_dir / "validate_chunks.py"),
                    "--manifest",
                    tmp_manifest,
                    "--json",
                ]
            )
            if isinstance(chunks_payload, dict):
                ids, videos = extract_from_cross_stage_or_chunks(chunks_payload, stage_label="09")
                if ids:
                    quarantine = merge_quarantine(quarantine, ids, videos)
        finally:
            try:
                Path(tmp_manifest).unlink(missing_ok=True)
            except Exception:
                pass

    quarantine["generated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    quarantine["meta"] = {
        "mode": "parallel_simulation",
        "validator_scope": validator_scope,
        "manifest": str(manifest_path),
        "videos_scanned": len(entries),
        "temp_manifests": temp_files_used,
    }
    return quarantine


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Simulate parallel quarantine decisions for a manifest")
    parser.add_argument("--manifest", required=True, help="Manifest path")
    parser.add_argument("--out", required=True, help="Output quarantine JSON path")
    parser.add_argument(
        "--validator-scope",
        choices=["full", "per-video"],
        default="full",
        help="Validation scope used by stage07/09 checks (default: full).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest_path = Path(args.manifest)
    if not manifest_path.is_absolute():
        manifest_path = repo_root() / manifest_path
    if not manifest_path.exists():
        raise SystemExit(f"Manifest not found: {manifest_path}")

    out_path = Path(args.out)
    if not out_path.is_absolute():
        out_path = repo_root() / out_path
    out_path.parent.mkdir(parents=True, exist_ok=True)

    quarantine = simulate(manifest_path, validator_scope=args.validator_scope)
    out_path.write_text(json.dumps(quarantine, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "manifest": str(manifest_path),
                "out": str(out_path),
                "quarantined_video_count": quarantine.get("quarantined_video_count", 0),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
