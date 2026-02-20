#!/usr/bin/env python3
"""
Validate Stage 06h confidence trace artifacts.

Checks:
- trace file presence for manifest video IDs
- basic schema-conformant field structure and bounds
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

LOG_PREFIX = "[validate-confidence-trace]"
VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
BRACKET_VIDEO_ID_RE = re.compile(r"\[([A-Za-z0-9_-]{11})\]")


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _extract_video_id(text: str) -> Optional[str]:
    m = BRACKET_VIDEO_ID_RE.search(text or "")
    if not m:
        return None
    vid = m.group(1).strip()
    return vid if VIDEO_ID_RE.fullmatch(vid) else None


def load_manifest_video_ids(manifest_path: Path, source_filter: Optional[str]) -> List[str]:
    out: List[str] = []
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
        vid = _extract_video_id(folder)
        if vid:
            out.append(vid)
    return out


def load_quarantine_ids(path: Optional[Path]) -> Set[str]:
    if path is None or not path.exists():
        return set()
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return set()
    if not isinstance(payload, dict):
        return set()
    raw_ids = payload.get("quarantined_video_ids")
    if not isinstance(raw_ids, list):
        return set()
    out: Set[str] = set()
    for item in raw_ids:
        if isinstance(item, str):
            vid = item.strip()
            if VIDEO_ID_RE.fullmatch(vid):
                out.add(vid)
    return out


def _in_unit_interval(value: Any) -> bool:
    if not isinstance(value, (int, float)):
        return False
    val = float(value)
    return 0.0 <= val <= 1.0


def _valid_band(value: Any) -> bool:
    return isinstance(value, str) and value.strip().lower() in {"high", "medium", "low"}


def _valid_gate(value: Any) -> bool:
    return isinstance(value, str) and value.strip().lower() in {"pass", "review", "block"}


def _issue(video_id: str, path: Optional[Path], severity: str, check: str, message: str) -> Dict[str, Any]:
    return {
        "severity": severity,
        "check": check,
        "message": message,
        "video_id": video_id,
        "path": str(path) if path else None,
    }


def _validate_trace_payload(video_id: str, path: Path, payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    issues: List[Dict[str, Any]] = []

    version = payload.get("version")
    if not isinstance(version, int) or version < 1:
        issues.append(_issue(video_id, path, "error", "invalid_trace_version", "version must be integer >= 1"))

    scope = payload.get("scope")
    if not isinstance(scope, dict):
        issues.append(_issue(video_id, path, "error", "missing_scope", "scope object is required"))
    else:
        scope_vid = scope.get("video_id")
        if not isinstance(scope_vid, str) or not VIDEO_ID_RE.fullmatch(scope_vid.strip()):
            issues.append(_issue(video_id, path, "error", "invalid_scope_video_id", "scope.video_id must be an 11-char video id"))
        elif scope_vid.strip() != video_id:
            issues.append(_issue(video_id, path, "error", "scope_video_id_mismatch", f"scope.video_id={scope_vid} does not match manifest video_id={video_id}"))
        manifest_val = scope.get("manifest")
        if not isinstance(manifest_val, str) or not manifest_val.strip():
            issues.append(_issue(video_id, path, "warning", "scope_manifest_unspecified", "scope.manifest should be a non-empty string"))

    segments = payload.get("segments")
    if not isinstance(segments, list):
        issues.append(_issue(video_id, path, "error", "missing_segments", "segments[] is required"))
        segments = []
    for idx, row in enumerate(segments):
        if not isinstance(row, dict):
            issues.append(_issue(video_id, path, "error", "segment_row_not_object", f"segments[{idx}] must be an object"))
            continue
        if not isinstance(row.get("segment_id"), int):
            issues.append(_issue(video_id, path, "error", "segment_missing_id", f"segments[{idx}].segment_id must be integer"))
        if not _in_unit_interval(row.get("base_confidence")):
            issues.append(_issue(video_id, path, "error", "segment_base_confidence_out_of_bounds", f"segments[{idx}].base_confidence must be in [0,1]"))
        if not _in_unit_interval(row.get("final_confidence")):
            issues.append(_issue(video_id, path, "error", "segment_final_confidence_out_of_bounds", f"segments[{idx}].final_confidence must be in [0,1]"))
        if not _valid_band(row.get("confidence_band")):
            issues.append(_issue(video_id, path, "error", "segment_invalid_band", f"segments[{idx}].confidence_band must be high|medium|low"))
        penalties = row.get("penalties")
        if not isinstance(penalties, list):
            issues.append(_issue(video_id, path, "error", "segment_penalties_not_array", f"segments[{idx}].penalties must be an array"))
            continue
        for pidx, penalty in enumerate(penalties):
            if not isinstance(penalty, dict):
                issues.append(_issue(video_id, path, "error", "penalty_not_object", f"segments[{idx}].penalties[{pidx}] must be an object"))
                continue
            if not _in_unit_interval(penalty.get("multiplier")):
                issues.append(_issue(video_id, path, "error", "penalty_invalid_multiplier", f"segments[{idx}].penalties[{pidx}].multiplier must be in [0,1]"))
            if not _in_unit_interval(penalty.get("before")):
                issues.append(_issue(video_id, path, "error", "penalty_invalid_before", f"segments[{idx}].penalties[{pidx}].before must be in [0,1]"))
            if not _in_unit_interval(penalty.get("after")):
                issues.append(_issue(video_id, path, "error", "penalty_invalid_after", f"segments[{idx}].penalties[{pidx}].after must be in [0,1]"))

    conversations = payload.get("conversations")
    if isinstance(conversations, list):
        for idx, row in enumerate(conversations):
            if not isinstance(row, dict):
                issues.append(_issue(video_id, path, "error", "conversation_row_not_object", f"conversations[{idx}] must be an object"))
                continue
            if not isinstance(row.get("conversation_id"), int):
                issues.append(_issue(video_id, path, "error", "conversation_missing_id", f"conversations[{idx}].conversation_id must be integer"))
            if not _in_unit_interval(row.get("final_confidence")):
                issues.append(_issue(video_id, path, "error", "conversation_confidence_out_of_bounds", f"conversations[{idx}].final_confidence must be in [0,1]"))
            if not _valid_band(row.get("confidence_band")):
                issues.append(_issue(video_id, path, "error", "conversation_invalid_band", f"conversations[{idx}].confidence_band must be high|medium|low"))
            gate = row.get("gate_decision")
            if gate is not None and not _valid_gate(gate):
                issues.append(_issue(video_id, path, "error", "conversation_invalid_gate", f"conversations[{idx}].gate_decision must be pass|review|block"))

    video_summary = payload.get("video_summary")
    if isinstance(video_summary, dict):
        if not _in_unit_interval(video_summary.get("final_confidence")):
            issues.append(_issue(video_id, path, "error", "video_summary_confidence_out_of_bounds", "video_summary.final_confidence must be in [0,1]"))
        if not _valid_band(video_summary.get("confidence_band")):
            issues.append(_issue(video_id, path, "error", "video_summary_invalid_band", "video_summary.confidence_band must be high|medium|low"))
        gate = video_summary.get("gate_decision")
        if gate is not None and not _valid_gate(gate):
            issues.append(_issue(video_id, path, "error", "video_summary_invalid_gate", "video_summary.gate_decision must be pass|review|block"))
    else:
        issues.append(_issue(video_id, path, "warning", "missing_video_summary", "video_summary object is missing"))

    return issues


def _find_trace_for_video(trace_root: Path, video_id: str) -> Optional[Path]:
    candidates = sorted(trace_root.rglob(f"*{video_id}*.confidence.trace.json"))
    return candidates[0] if candidates else None


def build_report(
    manifest_path: Path,
    source_filter: Optional[str],
    quarantine_file: Optional[Path],
    strict_missing: bool,
) -> Dict[str, Any]:
    manifest_ids = load_manifest_video_ids(manifest_path, source_filter)
    quarantine_ids = load_quarantine_ids(quarantine_file)
    effective_ids = [vid for vid in manifest_ids if vid not in quarantine_ids]

    trace_root = repo_root() / "data" / "06h.DET.confidence-propagation"
    issues: List[Dict[str, Any]] = []
    processed = 0

    for vid in effective_ids:
        trace_path = _find_trace_for_video(trace_root, vid)
        if trace_path is None:
            sev = "error" if strict_missing else "warning"
            issues.append(_issue(vid, None, sev, "missing_confidence_trace", "No confidence trace file found for video"))
            continue
        try:
            payload = json.loads(trace_path.read_text(encoding="utf-8"))
        except Exception as exc:
            issues.append(_issue(vid, trace_path, "error", "unreadable_confidence_trace", f"Could not parse trace JSON: {exc}"))
            continue
        if not isinstance(payload, dict):
            issues.append(_issue(vid, trace_path, "error", "invalid_confidence_trace_payload", "Trace payload must be a JSON object"))
            continue
        processed += 1
        issues.extend(_validate_trace_payload(vid, trace_path, payload))

    errors = sum(1 for item in issues if str(item.get("severity")).lower() == "error")
    warnings = sum(1 for item in issues if str(item.get("severity")).lower() == "warning")
    passed = errors == 0

    return {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "manifest": str(manifest_path),
        "source_filter": source_filter,
        "quarantine_file": str(quarantine_file) if quarantine_file else None,
        "summary": {
            "manifest_videos": len(manifest_ids),
            "quarantined_videos": len([v for v in manifest_ids if v in quarantine_ids]),
            "effective_videos": len(effective_ids),
            "trace_files_processed": processed,
            "errors": errors,
            "warnings": warnings,
            "passed": passed,
        },
        "issues": issues,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate Stage 06h confidence trace artifacts")
    parser.add_argument("--manifest", required=True, help="Manifest path")
    parser.add_argument("--source", help="Optional source filter")
    parser.add_argument("--quarantine-file", help="Optional quarantine JSON path")
    parser.add_argument(
        "--strict-missing",
        action="store_true",
        help="Treat missing trace files as errors (default: warning during migration).",
    )
    parser.add_argument("--json", action="store_true", help="Emit JSON report")
    parser.add_argument("--show", type=int, default=30, help="Max issue lines to print in text mode")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.is_absolute():
        manifest_path = repo_root() / manifest_path
    if not manifest_path.exists():
        raise SystemExit(f"{LOG_PREFIX} Manifest not found: {manifest_path}")

    quarantine_path: Optional[Path] = None
    if args.quarantine_file:
        quarantine_path = Path(args.quarantine_file)
        if not quarantine_path.is_absolute():
            quarantine_path = repo_root() / quarantine_path
        if not quarantine_path.exists():
            raise SystemExit(f"{LOG_PREFIX} Quarantine file not found: {quarantine_path}")

    report = build_report(
        manifest_path=manifest_path,
        source_filter=args.source,
        quarantine_file=quarantine_path,
        strict_missing=bool(args.strict_missing),
    )

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        summary = report["summary"]
        print(f"{LOG_PREFIX} Manifest: {manifest_path}")
        print(f"{LOG_PREFIX} Videos: manifest={summary['manifest_videos']}, effective={summary['effective_videos']}, traces={summary['trace_files_processed']}")
        print(f"{LOG_PREFIX} Issues: errors={summary['errors']}, warnings={summary['warnings']}")
        result = "PASS" if summary["passed"] else "FAIL"
        print(f"{LOG_PREFIX} Result: {result}")
        shown = 0
        for issue in report.get("issues", []):
            if shown >= max(0, int(args.show)):
                break
            severity = str(issue.get("severity", "")).upper()
            vid = issue.get("video_id", "*")
            check = issue.get("check", "unknown_check")
            msg = issue.get("message", "")
            print(f"{LOG_PREFIX} {severity} [{vid}] {check}: {msg}")
            shown += 1

    if report["summary"]["passed"]:
        sys.exit(0)
    sys.exit(1)


if __name__ == "__main__":
    main()
