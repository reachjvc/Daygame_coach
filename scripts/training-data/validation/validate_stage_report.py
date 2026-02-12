#!/usr/bin/env python3
"""
scripts/training-data/validation/validate_stage_report.py

Deterministic validator for Stage Report contract files.

This enforces the contract defined in:
  scripts/training-data/schemas/stage_report.schema.json

No external dependencies (jsonschema) are required.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

LOG_PREFIX = "[validate-stage-report]"
VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")

TOP_REQUIRED: Set[str] = {
    "stage",
    "status",
    "reason_code",
    "video_id",
    "source",
    "stem",
    "inputs",
    "outputs",
    "checks",
    "metrics",
    "timestamps",
    "versions",
}
TOP_ALLOWED: Set[str] = TOP_REQUIRED | {"batch_id", "manifest_path"}
STATUS_ALLOWED = {"PASS", "WARN", "FAIL"}
CHECK_SEVERITY_ALLOWED = {"error", "warning", "info"}

ARTIFACT_KEYS = {"path", "sha256", "bytes"}
CHECK_KEYS = {"severity", "check", "message"}
TIMESTAMP_KEYS = {"started_at", "finished_at", "elapsed_sec"}
VERSION_KEYS = {"pipeline_version", "prompt_version", "model", "schema_version", "git_sha"}


@dataclass
class Issue:
    severity: str
    path: str
    check: str
    message: str

    def to_dict(self) -> Dict[str, str]:
        return {
            "severity": self.severity,
            "path": self.path,
            "check": self.check,
            "message": self.message,
        }


def _iter_files(root: Path, glob_pattern: str) -> Iterable[Path]:
    if not root.exists():
        return []
    return sorted(root.rglob(glob_pattern))


def _load_json(path: Path) -> Optional[Dict[str, Any]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def _validate_artifact(item: Any, *, path: str, loc: str, issues: List[Issue]) -> None:
    if not isinstance(item, dict):
        issues.append(Issue("error", path, "invalid_artifact_item", f"{loc} must be an object"))
        return
    unknown = sorted(set(item.keys()) - ARTIFACT_KEYS)
    if unknown:
        issues.append(Issue("error", path, "artifact_unknown_keys", f"{loc} has unknown keys: {unknown}"))
    artifact_path = item.get("path")
    if not isinstance(artifact_path, str) or not artifact_path.strip():
        issues.append(Issue("error", path, "artifact_missing_path", f"{loc} missing non-empty path"))
    sha = item.get("sha256")
    if sha is not None and (not isinstance(sha, str) or not sha.strip()):
        issues.append(Issue("error", path, "artifact_invalid_sha256", f"{loc}.sha256 must be a non-empty string when present"))
    size = item.get("bytes")
    if size is not None and (not isinstance(size, int) or size < 0):
        issues.append(Issue("error", path, "artifact_invalid_bytes", f"{loc}.bytes must be an integer >= 0 when present"))


def _validate_check_item(item: Any, *, path: str, idx: int, issues: List[Issue]) -> None:
    loc = f"checks[{idx}]"
    if not isinstance(item, dict):
        issues.append(Issue("error", path, "invalid_check_item", f"{loc} must be an object"))
        return
    unknown = sorted(set(item.keys()) - CHECK_KEYS)
    if unknown:
        issues.append(Issue("error", path, "check_unknown_keys", f"{loc} has unknown keys: {unknown}"))
    missing = sorted(CHECK_KEYS - set(item.keys()))
    if missing:
        issues.append(Issue("error", path, "check_missing_required", f"{loc} missing keys: {missing}"))
    sev = item.get("severity")
    if sev not in CHECK_SEVERITY_ALLOWED:
        issues.append(Issue("error", path, "check_invalid_severity", f"{loc}.severity must be one of {sorted(CHECK_SEVERITY_ALLOWED)}"))
    chk = item.get("check")
    if not isinstance(chk, str) or not chk.strip():
        issues.append(Issue("error", path, "check_invalid_check", f"{loc}.check must be a non-empty string"))
    msg = item.get("message")
    if not isinstance(msg, str) or not msg.strip():
        issues.append(Issue("error", path, "check_invalid_message", f"{loc}.message must be a non-empty string"))


def validate_stage_report(data: Dict[str, Any], path: Path) -> List[Issue]:
    issues: List[Issue] = []
    path_str = str(path)

    unknown = sorted(set(data.keys()) - TOP_ALLOWED)
    if unknown:
        issues.append(Issue("error", path_str, "top_unknown_keys", f"Unknown top-level keys: {unknown}"))
    missing = sorted(TOP_REQUIRED - set(data.keys()))
    if missing:
        issues.append(Issue("error", path_str, "top_missing_required", f"Missing required top-level keys: {missing}"))

    stage = data.get("stage")
    if not isinstance(stage, str) or not stage.strip():
        issues.append(Issue("error", path_str, "invalid_stage", "stage must be a non-empty string"))
    status = data.get("status")
    if status not in STATUS_ALLOWED:
        issues.append(Issue("error", path_str, "invalid_status", f"status must be one of {sorted(STATUS_ALLOWED)}"))
    reason_code = data.get("reason_code")
    if not isinstance(reason_code, str) or not reason_code.strip():
        issues.append(Issue("error", path_str, "invalid_reason_code", "reason_code must be a non-empty string"))

    video_id = data.get("video_id")
    if not isinstance(video_id, str) or not VIDEO_ID_RE.fullmatch(video_id.strip()):
        issues.append(Issue("error", path_str, "invalid_video_id", "video_id must match ^[A-Za-z0-9_-]{11}$"))
    source = data.get("source")
    if not isinstance(source, str) or not source.strip():
        issues.append(Issue("error", path_str, "invalid_source", "source must be a non-empty string"))
    stem = data.get("stem")
    if not isinstance(stem, str) or not stem.strip():
        issues.append(Issue("error", path_str, "invalid_stem", "stem must be a non-empty string"))

    for key in ("batch_id", "manifest_path"):
        val = data.get(key)
        if val is not None and not isinstance(val, str):
            issues.append(Issue("error", path_str, f"invalid_{key}", f"{key} must be a string or null"))

    for list_key in ("inputs", "outputs"):
        seq = data.get(list_key)
        if not isinstance(seq, list):
            issues.append(Issue("error", path_str, f"invalid_{list_key}", f"{list_key} must be an array"))
            continue
        for idx, item in enumerate(seq):
            _validate_artifact(item, path=path_str, loc=f"{list_key}[{idx}]", issues=issues)

    checks = data.get("checks")
    if not isinstance(checks, list):
        issues.append(Issue("error", path_str, "invalid_checks", "checks must be an array"))
    else:
        for idx, item in enumerate(checks):
            _validate_check_item(item, path=path_str, idx=idx, issues=issues)

    metrics = data.get("metrics")
    if not isinstance(metrics, dict):
        issues.append(Issue("error", path_str, "invalid_metrics", "metrics must be an object"))

    ts = data.get("timestamps")
    if not isinstance(ts, dict):
        issues.append(Issue("error", path_str, "invalid_timestamps", "timestamps must be an object"))
    else:
        unknown_ts = sorted(set(ts.keys()) - TIMESTAMP_KEYS)
        if unknown_ts:
            issues.append(Issue("error", path_str, "timestamps_unknown_keys", f"timestamps has unknown keys: {unknown_ts}"))
        missing_ts = sorted(TIMESTAMP_KEYS - set(ts.keys()))
        if missing_ts:
            issues.append(Issue("error", path_str, "timestamps_missing_required", f"timestamps missing keys: {missing_ts}"))
        for key in ("started_at", "finished_at"):
            val = ts.get(key)
            if not isinstance(val, str) or not val.strip():
                issues.append(Issue("error", path_str, f"invalid_timestamps_{key}", f"timestamps.{key} must be a non-empty string"))
        elapsed = ts.get("elapsed_sec")
        if not isinstance(elapsed, (int, float)) or elapsed < 0:
            issues.append(Issue("error", path_str, "invalid_timestamps_elapsed_sec", "timestamps.elapsed_sec must be a number >= 0"))

    versions = data.get("versions")
    if not isinstance(versions, dict):
        issues.append(Issue("error", path_str, "invalid_versions", "versions must be an object"))
    else:
        unknown_ver = sorted(set(versions.keys()) - VERSION_KEYS)
        if unknown_ver:
            issues.append(Issue("error", path_str, "versions_unknown_keys", f"versions has unknown keys: {unknown_ver}"))
        pipeline_version = versions.get("pipeline_version")
        if not isinstance(pipeline_version, str) or not pipeline_version.strip():
            issues.append(Issue("error", path_str, "invalid_pipeline_version", "versions.pipeline_version must be a non-empty string"))
        for key in ("prompt_version", "model", "schema_version", "git_sha"):
            val = versions.get(key)
            if val is not None and not isinstance(val, str):
                issues.append(Issue("error", path_str, f"invalid_versions_{key}", f"versions.{key} must be a string or null"))

    return issues


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate stage report files (deterministic, no external deps).")
    parser.add_argument("--file", action="append", help="Path to a stage report JSON file (repeatable)")
    parser.add_argument("--dir", help="Directory to scan recursively for report files")
    parser.add_argument("--glob", default="*.report.json", help="Glob pattern for --dir scan (default: *.report.json)")
    parser.add_argument("--json", action="store_true", help="Output JSON report")
    parser.add_argument("--show", type=int, default=40, help="Max issue lines in text mode")
    args = parser.parse_args()

    files: List[Path] = []
    if args.file:
        files.extend(Path(p) for p in args.file)
    if args.dir:
        files.extend(_iter_files(Path(args.dir), args.glob))
    # De-dupe while preserving deterministic ordering.
    files = sorted({p.resolve() for p in files}, key=lambda p: str(p))

    if not files:
        print(f"{LOG_PREFIX} ERROR: Provide --file and/or --dir", file=sys.stderr)
        sys.exit(2)

    issues: List[Issue] = []
    validated = 0
    unreadable = 0

    for p in files:
        data = _load_json(p)
        if data is None:
            unreadable += 1
            issues.append(Issue("error", str(p), "unreadable_json", "Could not read JSON object"))
            continue
        validated += 1
        issues.extend(validate_stage_report(data, p))

    errors = sum(1 for i in issues if i.severity == "error")
    warnings = sum(1 for i in issues if i.severity == "warning")
    report = {
        "version": 1,
        "validated_files": validated,
        "unreadable_files": unreadable,
        "issues_summary": {"errors": errors, "warnings": warnings},
        "issues": [i.to_dict() for i in issues],
        "passed": errors == 0,
    }

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(f"{LOG_PREFIX} Files validated: {validated}")
        print(f"{LOG_PREFIX} Unreadable files: {unreadable}")
        print(f"{LOG_PREFIX} Issues: errors={errors}, warnings={warnings}")
        print(f"{LOG_PREFIX} Result: {'PASS' if errors == 0 else 'FAIL'}")
        if issues:
            shown = 0
            for i in issues:
                if shown >= args.show:
                    remaining = len(issues) - shown
                    print(f"{LOG_PREFIX} ... ({remaining} more issue(s) not shown; use --json for full list)")
                    break
                print(f"{LOG_PREFIX} {i.severity.upper()} [{i.check}] {i.path}: {i.message}")
                shown += 1

    sys.exit(0 if errors == 0 else 1)


if __name__ == "__main__":
    main()
