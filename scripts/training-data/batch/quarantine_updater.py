#!/usr/bin/env python3
"""
quarantine_updater.py — Merge validation failures into a quarantine file.

Reads validator JSON output and extracts video IDs with error-severity issues.
Merges them into the quarantine file (append-only, never removes).

Usage:
  # Pipe cross-stage or chunk validation JSON into stdin:
  python3 validate_cross_stage.py --manifest M --json | python3 quarantine_updater.py \
    --quarantine-file data/validation/quarantine/P001.1.json --stage 07

  # Parse stage 08 report directly:
  python3 quarantine_updater.py \
    --quarantine-file data/validation/quarantine/P001.1.json \
    --stage08-report data/08.DET.taxonomy-validation/P001.1.report.json

  # Parse stage 06b verdicts:
  python3 quarantine_updater.py \
    --quarantine-file data/validation/quarantine/P001.1.json \
    --stage06b-dir data/06b.LLM.verify --manifest docs/pipeline/batches/P001.1.txt
"""

import argparse
import json
import re
import sys
import time
from pathlib import Path
from typing import Dict, List, Set

VIDEO_ID_RE = re.compile(r"[A-Za-z0-9_-]{11}")


def load_quarantine(path: Path) -> dict:
    """Load existing quarantine file or create empty structure."""
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict) and "quarantined_video_ids" in data:
                return data
        except (json.JSONDecodeError, KeyError):
            pass
    return {
        "version": 1,
        "generated_at": "",
        "quarantine_level": "error",
        "quarantined_video_count": 0,
        "quarantined_video_ids": [],
        "videos": [],
    }


def merge_quarantine(
    existing: dict,
    new_ids: Set[str],
    new_videos: List[dict],
) -> dict:
    """Merge new quarantined video IDs into existing quarantine (union, never remove)."""
    current_ids = set(existing.get("quarantined_video_ids", []))
    combined_ids = sorted(current_ids | new_ids)

    # Merge video detail records (deduplicate by video_id, append new reasons)
    existing_videos_by_id: Dict[str, dict] = {}
    for v in existing.get("videos", []):
        vid = v.get("video_id", "")
        if vid:
            existing_videos_by_id[vid] = v

    for v in new_videos:
        vid = v.get("video_id", "")
        if not vid:
            continue
        if vid in existing_videos_by_id:
            # Append new reasons and checks
            ev = existing_videos_by_id[vid]
            existing_checks = set(ev.get("checks", []))
            new_checks = set(v.get("checks", []))
            ev["checks"] = sorted(existing_checks | new_checks)
            existing_reasons = ev.get("reasons", [])
            new_reasons = v.get("reasons", [])
            # Deduplicate by (check, message)
            seen = {(r.get("check"), r.get("message")) for r in existing_reasons}
            for r in new_reasons:
                key = (r.get("check"), r.get("message"))
                if key not in seen:
                    existing_reasons.append(r)
                    seen.add(key)
            ev["reasons"] = existing_reasons
        else:
            existing_videos_by_id[vid] = v

    combined_videos = [
        existing_videos_by_id[vid]
        for vid in combined_ids
        if vid in existing_videos_by_id
    ]

    existing["generated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    existing["quarantined_video_ids"] = combined_ids
    existing["quarantined_video_count"] = len(combined_ids)
    existing["videos"] = combined_videos
    return existing


def extract_from_cross_stage_or_chunks(data: dict) -> tuple[Set[str], List[dict]]:
    """Extract error-severity video IDs from validate_cross_stage or validate_chunks JSON."""
    new_ids: Set[str] = set()
    new_videos: List[dict] = []
    video_issues: Dict[str, List[dict]] = {}

    results = data.get("results", data.get("issues", []))
    for r in results:
        severity = r.get("severity", "")
        if severity != "error":
            continue
        vid = r.get("video_id", "")
        if not vid or not VIDEO_ID_RE.fullmatch(vid):
            continue
        new_ids.add(vid)
        video_issues.setdefault(vid, []).append(r)

    for vid in sorted(new_ids):
        issues = video_issues[vid]
        checks = sorted({i.get("check", "unknown") for i in issues})
        reasons = [
            {
                "severity": "error",
                "check": i.get("check", "unknown"),
                "message": (i.get("message", ""))[:300],
            }
            for i in issues
        ]
        new_videos.append(
            {"video_id": vid, "checks": checks, "reasons": reasons}
        )

    return new_ids, new_videos


def extract_from_stage08_report(report_path: Path) -> tuple[Set[str], List[dict]]:
    """Extract per-video FAIL from stage 08 taxonomy validation report."""
    new_ids: Set[str] = set()
    new_videos: List[dict] = []

    if not report_path.exists():
        return new_ids, new_videos

    data = json.loads(report_path.read_text(encoding="utf-8"))

    # Stage 08 reports per-video issues in validation.per_video or similar
    # The report format has "unlisted_techniques" and "unlisted_topics" with per-video details
    for section in ("unlisted_techniques", "unlisted_topics"):
        items = data.get(section, {})
        if not isinstance(items, dict):
            continue
        for concept, details in items.items():
            if not isinstance(details, dict):
                continue
            frequency = details.get("frequency", 0)
            threshold = data.get("threshold", 3)
            if frequency < threshold:
                continue
            # This concept exceeds threshold — quarantine all videos that use it
            for vid in details.get("video_ids", []):
                if VIDEO_ID_RE.fullmatch(str(vid)):
                    new_ids.add(vid)

    for vid in sorted(new_ids):
        new_videos.append({
            "video_id": vid,
            "checks": ["stage08_taxonomy_fail"],
            "reasons": [{
                "severity": "error",
                "check": "stage08_taxonomy_fail",
                "message": "Video uses high-frequency unlisted concepts (Stage 08 FAIL)",
            }],
        })

    return new_ids, new_videos


def extract_from_stage06b(
    verify_dir: Path, manifest_path: Path
) -> tuple[Set[str], List[dict]]:
    """Extract REJECT verdicts from stage 06b verification files."""
    new_ids: Set[str] = set()
    new_videos: List[dict] = []

    if not verify_dir.exists() or not manifest_path.exists():
        return new_ids, new_videos

    # Read manifest to get video IDs + sources
    manifest_text = manifest_path.read_text(encoding="utf-8")
    vid_re = re.compile(r"\[([A-Za-z0-9_-]{11})\]")

    for line in manifest_text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("|", 1)
        if len(parts) != 2:
            continue
        source = parts[0].strip()
        folder = parts[1].strip()
        match = vid_re.search(folder)
        if not match:
            continue
        video_id = match.group(1)

        # Find verification file
        candidates = list(verify_dir.rglob(f"*{video_id}*.verification.json"))
        if not candidates:
            continue

        for cpath in candidates:
            try:
                payload = json.loads(cpath.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                continue
            verdict = str(
                payload.get("verdict") or payload.get("overall_verdict") or ""
            ).strip().upper()
            if verdict == "REJECT":
                new_ids.add(video_id)
                new_videos.append({
                    "video_id": video_id,
                    "checks": ["stage06b_reject"],
                    "reasons": [{
                        "severity": "error",
                        "check": "stage06b_reject",
                        "message": "Stage 06b verdict: REJECT",
                    }],
                })
                break

    return new_ids, new_videos


def main():
    parser = argparse.ArgumentParser(
        description="Merge validation failures into quarantine file"
    )
    parser.add_argument(
        "--quarantine-file", required=True, help="Path to quarantine JSON"
    )
    parser.add_argument(
        "--stage",
        help="Stage label for cross-stage/chunks JSON on stdin (e.g., 07, 09)",
    )
    parser.add_argument(
        "--stage08-report", help="Path to stage 08 taxonomy validation report"
    )
    parser.add_argument(
        "--stage06b-dir", help="Path to stage 06b verify directory"
    )
    parser.add_argument(
        "--manifest", help="Path to manifest (required with --stage06b-dir)"
    )
    args = parser.parse_args()

    quarantine_path = Path(args.quarantine_file)
    existing = load_quarantine(quarantine_path)
    old_count = len(existing.get("quarantined_video_ids", []))

    new_ids: Set[str] = set()
    new_videos: List[dict] = []

    if args.stage08_report:
        ids, vids = extract_from_stage08_report(Path(args.stage08_report))
        new_ids |= ids
        new_videos.extend(vids)
    elif args.stage06b_dir:
        if not args.manifest:
            parser.error("--stage06b-dir requires --manifest")
        ids, vids = extract_from_stage06b(
            Path(args.stage06b_dir), Path(args.manifest)
        )
        new_ids |= ids
        new_videos.extend(vids)
    elif args.stage:
        # Read JSON from stdin
        try:
            data = json.load(sys.stdin)
        except json.JSONDecodeError as e:
            print(f"ERROR: Failed to parse validator JSON from stdin: {e}", file=sys.stderr)
            sys.exit(1)
        ids, vids = extract_from_cross_stage_or_chunks(data)
        new_ids |= ids
        new_videos.extend(vids)
    else:
        parser.error("Must specify --stage, --stage08-report, or --stage06b-dir")

    actually_new = new_ids - set(existing.get("quarantined_video_ids", []))
    if not actually_new:
        print(f"[quarantine] No new videos to quarantine (total: {old_count})")
        sys.exit(0)

    merged = merge_quarantine(existing, new_ids, new_videos)
    quarantine_path.parent.mkdir(parents=True, exist_ok=True)
    quarantine_path.write_text(
        json.dumps(merged, indent=2) + "\n", encoding="utf-8"
    )

    new_total = len(merged["quarantined_video_ids"])
    added = new_total - old_count
    print(
        f"[quarantine] Quarantined {added} new video(s): "
        f"{sorted(actually_new)}. Total: {new_total}"
    )


if __name__ == "__main__":
    main()
