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
from typing import Any, Dict, List, Optional, Set, Tuple

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


def _extract_video_id_from_row(row: Dict[str, Any]) -> Optional[str]:
    candidates: List[Any] = [row.get("video_id")]

    scope = row.get("scope")
    if isinstance(scope, dict):
        candidates.append(scope.get("video_id"))

    source_key = row.get("sourceKey") or row.get("source_key")
    if isinstance(source_key, str):
        m = re.search(r"[\\/](?P<vid>[A-Za-z0-9_-]{11})\.txt$", source_key)
        if m:
            candidates.append(m.group("vid"))

    for value in candidates:
        if isinstance(value, str):
            vid = value.strip()
            if VIDEO_ID_RE.fullmatch(vid):
                return vid
    return None


def _is_blocking_issue(row: Dict[str, Any]) -> bool:
    gate_decision = str(row.get("gate_decision", "")).strip().lower()
    if gate_decision:
        return gate_decision == "block"

    issue_severity = str(row.get("issue_severity", "")).strip().lower()
    if issue_severity:
        return issue_severity in {"critical", "major"}
    return False


def _is_canonical_issue(row: Dict[str, Any]) -> bool:
    issue_code = row.get("issue_code")
    if not isinstance(issue_code, str) or not issue_code.strip():
        return False
    has_gate = isinstance(row.get("gate_decision"), str) and bool(str(row.get("gate_decision")).strip())
    has_severity = isinstance(row.get("issue_severity"), str) and bool(str(row.get("issue_severity")).strip())
    return has_gate or has_severity


def _reason_check_name(row: Dict[str, Any], stage_label: Optional[str]) -> str:
    for key in ("issue_code", "check"):
        raw = row.get(key)
        if isinstance(raw, str) and raw.strip():
            return raw.strip()
    if stage_label:
        return f"stage{stage_label}_block"
    return "unknown"


def _reason_message(row: Dict[str, Any]) -> str:
    for key in ("message", "reasoning", "detail", "description"):
        raw = row.get(key)
        if isinstance(raw, str) and raw.strip():
            return raw.strip()[:300]
    return "Blocking validation issue"


def extract_from_cross_stage_or_chunks(
    data: dict,
    stage_label: Optional[str] = None,
) -> Tuple[Set[str], List[dict]]:
    """Extract blocking video IDs from canonical validator JSON."""
    new_ids: Set[str] = set()
    new_videos: List[dict] = []
    video_issues: Dict[str, List[dict]] = {}

    results = data.get("results", data.get("issues", []))
    if not isinstance(results, list):
        results = []
    for r in results:
        if not isinstance(r, dict):
            continue
        if not _is_canonical_issue(r):
            continue
        if not _is_blocking_issue(r):
            continue
        vid = _extract_video_id_from_row(r)
        if not vid:
            continue
        new_ids.add(vid)
        video_issues.setdefault(vid, []).append(r)

    # Also accept canonical gate-style payloads with top-level "videos".
    videos_rows = data.get("videos")
    if isinstance(videos_rows, list):
        for row in videos_rows:
            if not isinstance(row, dict):
                continue
            if not _is_canonical_issue(row):
                continue
            vid = _extract_video_id_from_row(row)
            if not vid:
                continue
            gate_decision = str(row.get("gate_decision", "")).strip().lower()
            if gate_decision and gate_decision != "block":
                continue
            if not gate_decision and not _is_blocking_issue(row):
                continue
            new_ids.add(vid)
            video_issues.setdefault(vid, []).append(row)

    for vid in sorted(new_ids):
        issues = video_issues[vid]
        checks = sorted({_reason_check_name(i, stage_label) for i in issues})
        reasons = [
            {
                "severity": "error",
                "check": _reason_check_name(i, stage_label),
                "message": _reason_message(i),
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
        ids, vids = extract_from_cross_stage_or_chunks(data, stage_label=args.stage)
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
