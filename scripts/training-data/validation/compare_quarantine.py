#!/usr/bin/env python3
"""
Compare two quarantine JSON artifacts.

The comparison is strict on:
- quarantined video IDs
- per-video checks
- per-video reason tuples (severity, check, message)

Usage:
  python3 scripts/training-data/validation/compare_quarantine.py \
    --left data/validation/quarantine/P002.9.sequential.json \
    --right data/validation/quarantine/P002.9.parallel.json \
    --json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

LOG_PREFIX = "[compare-quarantine]"


def _load_payload(path: Path) -> Dict[str, Any]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ValueError(f"Could not parse JSON: {exc}") from exc
    if not isinstance(raw, dict):
        raise ValueError("Top-level JSON must be an object")
    return raw


def _normalize_reason(reason: Dict[str, Any]) -> Tuple[str, str, str]:
    severity = str(reason.get("severity", "")).strip().lower()
    check = str(reason.get("check", "")).strip()
    message = str(reason.get("message", "")).strip()
    return (severity, check, message)


def _parse_quarantine(path: Path) -> Tuple[Set[str], Dict[str, Dict[str, Set[Any]]]]:
    data = _load_payload(path)

    ids: Set[str] = set()
    raw_ids = data.get("quarantined_video_ids")
    if isinstance(raw_ids, list):
        for item in raw_ids:
            if isinstance(item, str):
                val = item.strip()
                if val:
                    ids.add(val)

    videos: Dict[str, Dict[str, Set[Any]]] = {}
    raw_videos = data.get("videos")
    if isinstance(raw_videos, list):
        for row in raw_videos:
            if not isinstance(row, dict):
                continue
            vid = row.get("video_id")
            if not isinstance(vid, str):
                continue
            vid = vid.strip()
            if not vid:
                continue
            checks: Set[str] = set()
            reasons: Set[Tuple[str, str, str]] = set()

            raw_checks = row.get("checks")
            if isinstance(raw_checks, list):
                for c in raw_checks:
                    if isinstance(c, str):
                        val = c.strip()
                        if val:
                            checks.add(val)

            raw_reasons = row.get("reasons")
            if isinstance(raw_reasons, list):
                for reason in raw_reasons:
                    if isinstance(reason, dict):
                        reasons.add(_normalize_reason(reason))

            videos[vid] = {"checks": checks, "reasons": reasons}
            ids.add(vid)

    for vid in ids:
        videos.setdefault(vid, {"checks": set(), "reasons": set()})

    return ids, videos


def compare(left_path: Path, right_path: Path) -> Dict[str, Any]:
    left_ids, left_map = _parse_quarantine(left_path)
    right_ids, right_map = _parse_quarantine(right_path)

    only_left = sorted(left_ids - right_ids)
    only_right = sorted(right_ids - left_ids)
    common = sorted(left_ids & right_ids)

    check_diffs: List[Dict[str, Any]] = []
    reason_diffs: List[Dict[str, Any]] = []

    for vid in common:
        left_checks = left_map[vid]["checks"]
        right_checks = right_map[vid]["checks"]
        missing_on_right = sorted(left_checks - right_checks)
        missing_on_left = sorted(right_checks - left_checks)
        if missing_on_left or missing_on_right:
            check_diffs.append(
                {
                    "video_id": vid,
                    "only_left_checks": missing_on_right,
                    "only_right_checks": missing_on_left,
                }
            )

        left_reasons = left_map[vid]["reasons"]
        right_reasons = right_map[vid]["reasons"]
        reasons_only_left = sorted(left_reasons - right_reasons)
        reasons_only_right = sorted(right_reasons - left_reasons)
        if reasons_only_left or reasons_only_right:
            reason_diffs.append(
                {
                    "video_id": vid,
                    "only_left_reasons": [
                        {"severity": sev, "check": chk, "message": msg}
                        for sev, chk, msg in reasons_only_left
                    ],
                    "only_right_reasons": [
                        {"severity": sev, "check": chk, "message": msg}
                        for sev, chk, msg in reasons_only_right
                    ],
                }
            )

    has_diff = bool(only_left or only_right or check_diffs or reason_diffs)
    return {
        "left": str(left_path),
        "right": str(right_path),
        "summary": {
            "left_video_count": len(left_ids),
            "right_video_count": len(right_ids),
            "video_ids_only_left": len(only_left),
            "video_ids_only_right": len(only_right),
            "check_diffs": len(check_diffs),
            "reason_diffs": len(reason_diffs),
            "match": not has_diff,
        },
        "diff": {
            "video_ids_only_left": only_left,
            "video_ids_only_right": only_right,
            "check_diffs": check_diffs,
            "reason_diffs": reason_diffs,
        },
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compare two quarantine artifacts")
    parser.add_argument("--left", required=True, help="Left quarantine JSON path")
    parser.add_argument("--right", required=True, help="Right quarantine JSON path")
    parser.add_argument("--json", action="store_true", help="Print JSON output")
    parser.add_argument(
        "--allow-diff",
        action="store_true",
        help="Exit 0 even when diffs are found",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    left_path = Path(args.left)
    right_path = Path(args.right)

    if not left_path.exists():
        raise SystemExit(f"{LOG_PREFIX} Left file not found: {left_path}")
    if not right_path.exists():
        raise SystemExit(f"{LOG_PREFIX} Right file not found: {right_path}")

    try:
        report = compare(left_path, right_path)
    except ValueError as exc:
        raise SystemExit(f"{LOG_PREFIX} ERROR: {exc}") from exc

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        s = report["summary"]
        print(f"{LOG_PREFIX} left={report['left']}")
        print(f"{LOG_PREFIX} right={report['right']}")
        print(f"{LOG_PREFIX} left_video_count={s['left_video_count']}")
        print(f"{LOG_PREFIX} right_video_count={s['right_video_count']}")
        print(f"{LOG_PREFIX} ids_only_left={s['video_ids_only_left']}")
        print(f"{LOG_PREFIX} ids_only_right={s['video_ids_only_right']}")
        print(f"{LOG_PREFIX} check_diffs={s['check_diffs']}")
        print(f"{LOG_PREFIX} reason_diffs={s['reason_diffs']}")
        print(f"{LOG_PREFIX} match={s['match']}")

    if report["summary"]["match"] or args.allow_diff:
        sys.exit(0)
    sys.exit(1)


if __name__ == "__main__":
    main()
