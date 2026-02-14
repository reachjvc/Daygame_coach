#!/usr/bin/env python3
"""
scripts/training-data/validation/validate_stage_report.py

Deterministic validator for Stage Report contract files.

This enforces the contract defined in:
  scripts/training-data/schemas/stage_report.schema.json

No external dependencies (jsonschema) are required.
"""

from __future__ import annotations

import ast
import argparse
import json
import re
import sys
import time
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

LOG_PREFIX = "[validate-stage-report]"
VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
_BRACKET_ID_RE = re.compile(r"\[([A-Za-z0-9_-]+)\]")

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
POLICY_WARNING_BUDGET_EXCLUDED_CHECKS: Set[str] = {
    # These warnings are useful context but should not consume readiness warning budgets.
    "missing_stage01_audio",
    "stage07_normalization_repairs",
    "stage08_validation_warning",
    "stage08_video_warning",
}

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


@dataclass
class ReportRecord:
    path: Path
    data: Dict[str, Any]
    valid: bool


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


def _load_manifest_ids(manifest_path: Path, source: Optional[str]) -> Set[str]:
    ids: Set[str] = set()
    for raw in manifest_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("|", 1)
        if len(parts) != 2:
            continue
        src = parts[0].strip()
        if source and src != source:
            continue
        folder = parts[1].strip()
        m = _BRACKET_ID_RE.search(folder)
        if m:
            ids.add(m.group(1))
    return ids


def _video_id_from_filename_hint(path: Path) -> Optional[str]:
    first = path.name.split(".", 1)[0]
    if VIDEO_ID_RE.fullmatch(first):
        return first
    m = re.search(r"([A-Za-z0-9_-]{11})", path.name)
    if m and VIDEO_ID_RE.fullmatch(m.group(1)):
        return m.group(1)
    return None


def _video_id_from_report(record: ReportRecord) -> Optional[str]:
    vid = record.data.get("video_id")
    if isinstance(vid, str) and VIDEO_ID_RE.fullmatch(vid.strip()):
        return vid.strip()
    return _video_id_from_filename_hint(record.path)


def _parse_warning_check_budget(raw: str) -> Tuple[str, int]:
    text = str(raw).strip()
    if not text:
        raise ValueError("empty value")

    check = ""
    budget_raw = ""
    for sep in ("=", ":"):
        if sep in text:
            check, budget_raw = text.split(sep, 1)
            break
    else:
        raise ValueError("expected '<check>=<max>'")

    check = check.strip()
    budget_raw = budget_raw.strip()
    if not check:
        raise ValueError("missing check name")
    if not budget_raw.isdigit():
        raise ValueError("max must be an integer >= 0")
    return check, int(budget_raw)


def _parse_stage07_warning_breakdown(message: str) -> Counter[str]:
    """
    Parse Stage 07 warning breakdowns encoded in the check message, e.g.:
      "Stage 07 validation reports 2 warning(s): {'transcript_artifact': 2}"
    Returns an empty counter when the message has no parseable breakdown.
    """
    text = str(message)
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        return Counter()

    payload = text[start : end + 1]
    try:
        parsed = ast.literal_eval(payload)
    except Exception:
        return Counter()
    if not isinstance(parsed, dict):
        return Counter()

    out: Counter[str] = Counter()
    for raw_check, raw_count in parsed.items():
        if not isinstance(raw_check, str):
            continue
        check = raw_check.strip()
        if not check:
            continue

        count: Optional[int] = None
        if isinstance(raw_count, bool):
            count = None
        elif isinstance(raw_count, int):
            count = raw_count
        elif isinstance(raw_count, float) and raw_count.is_integer():
            count = int(raw_count)
        elif isinstance(raw_count, str) and raw_count.strip().isdigit():
            count = int(raw_count.strip())
        if count is None or count <= 0:
            continue
        out[check] += count

    return out


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


def _compute_readiness(
    *,
    report_records: List[ReportRecord],
    unreadable_by_vid: Dict[str, int],
    report_dir: Optional[Path],
    manifest_path: Optional[Path],
    source_filter: Optional[str],
    manifest_ids: Optional[Set[str]],
    missing_manifest_ids: Set[str],
    block_warning_checks: Set[str],
    max_warning_checks: Optional[int],
    max_warning_checks_by_type: Dict[str, int],
    allow_review_ingest: bool,
) -> Dict[str, Any]:
    reports_by_vid: Dict[str, List[ReportRecord]] = defaultdict(list)
    for rec in report_records:
        vid = _video_id_from_report(rec)
        if not vid:
            continue
        reports_by_vid[vid].append(rec)

    candidate_ids: List[str]
    if manifest_ids is not None:
        candidate_ids = sorted(manifest_ids)
    else:
        candidate_ids = sorted(set(reports_by_vid.keys()) | set(unreadable_by_vid.keys()))

    by_status: Counter[str] = Counter()
    allow_ingest = 0
    videos: List[Dict[str, Any]] = []
    allow_ingest_statuses = {"READY", "REVIEW"} if allow_review_ingest else {"READY"}

    for vid in candidate_ids:
        recs = reports_by_vid.get(vid, [])
        unreadable = unreadable_by_vid.get(vid, 0)
        invalid_reports = unreadable + sum(1 for r in recs if not r.valid)

        fail_reports = 0
        warn_reports = 0
        pass_reports = 0
        error_checks = 0
        warning_checks = 0
        info_checks = 0
        policy_warning_checks = 0
        reasons: List[str] = []
        report_paths: List[str] = []
        sources: Set[str] = set()
        warning_signal_counts: Counter[str] = Counter()
        policy_warning_signal_counts: Counter[str] = Counter()

        for rec in recs:
            report_paths.append(str(rec.path))
            status = rec.data.get("status")
            if status == "FAIL":
                fail_reports += 1
            elif status == "WARN":
                warn_reports += 1
            elif status == "PASS":
                pass_reports += 1

            source = rec.data.get("source")
            if isinstance(source, str) and source.strip():
                sources.add(source.strip())

            reason_code = rec.data.get("reason_code")
            if isinstance(reason_code, str) and reason_code.strip():
                reasons.append(reason_code.strip())

            checks = rec.data.get("checks")
            if not isinstance(checks, list):
                continue
            for item in checks:
                if not isinstance(item, dict):
                    continue
                sev = item.get("severity")
                chk = item.get("check")
                if isinstance(chk, str) and chk.strip():
                    reasons.append(chk.strip())
                if sev == "error":
                    error_checks += 1
                elif sev == "warning":
                    warning_checks += 1
                    chk_name = chk.strip() if isinstance(chk, str) and chk.strip() else ""
                    msg = item.get("message")
                    expanded_warning_counts: Counter[str] = Counter()
                    if chk_name == "stage07_validation_warnings" and isinstance(msg, str):
                        expanded_warning_counts = _parse_stage07_warning_breakdown(msg)

                    if expanded_warning_counts:
                        for sub_check, sub_count in expanded_warning_counts.items():
                            warning_signal_counts[sub_check] += sub_count
                            if sub_check not in POLICY_WARNING_BUDGET_EXCLUDED_CHECKS:
                                policy_warning_signal_counts[sub_check] += sub_count
                                policy_warning_checks += sub_count
                    elif chk_name:
                        warning_signal_counts[chk_name] += 1
                        if chk_name not in POLICY_WARNING_BUDGET_EXCLUDED_CHECKS:
                            policy_warning_signal_counts[chk_name] += 1
                            policy_warning_checks += 1
                    else:
                        # Unnamed warnings still count against the generic warning budget.
                        policy_warning_checks += 1
                elif sev == "info":
                    info_checks += 1

        if vid in missing_manifest_ids:
            status = "BLOCKED"
            reason_code = "missing_stage_report"
        elif invalid_reports > 0:
            status = "BLOCKED"
            reason_code = "invalid_stage_report"
        elif fail_reports > 0 or error_checks > 0:
            status = "BLOCKED"
            reason_code = next((r for r in reasons if r), "report_fail")
        elif policy_warning_checks > 0:
            status = "REVIEW"
            if policy_warning_signal_counts:
                # Use the dominant actionable warning check as REVIEW reason.
                reason_code = sorted(
                    policy_warning_signal_counts.items(),
                    key=lambda item: (-item[1], item[0]),
                )[0][0]
            else:
                reason_code = "warnings_present"
        else:
            status = "READY"
            reason_code = "ok"

        # Optional policy hardening: escalate selected warning patterns into BLOCKED.
        if status != "BLOCKED":
            blocked_warning_hit = next(
                (chk for chk in sorted(block_warning_checks) if warning_signal_counts.get(chk, 0) > 0),
                None,
            )
            if blocked_warning_hit:
                status = "BLOCKED"
                reason_code = f"policy_block_warning_check:{blocked_warning_hit}"
            else:
                per_check_exceeded = next(
                    (
                        (chk, warning_signal_counts.get(chk, 0), limit)
                        for chk, limit in sorted(max_warning_checks_by_type.items(), key=lambda item: item[0])
                        if warning_signal_counts.get(chk, 0) > limit
                    ),
                    None,
                )
                if per_check_exceeded is not None:
                    chk, seen, limit = per_check_exceeded
                    status = "BLOCKED"
                    reason_code = f"policy_warning_check_budget_exceeded:{chk}:{seen}>{limit}"
                elif max_warning_checks is not None and policy_warning_checks > max_warning_checks:
                    status = "BLOCKED"
                    reason_code = "policy_warning_budget_exceeded"

        ready_for_ingest = status in allow_ingest_statuses
        if ready_for_ingest:
            allow_ingest += 1
        by_status[status] += 1

        videos.append({
            "video_id": vid,
            "status": status,
            "ready_for_ingest": ready_for_ingest,
            "reason_code": reason_code,
            "report_counts": {
                "total": len(recs) + unreadable,
                "pass": pass_reports,
                "warn": warn_reports,
                "fail": fail_reports,
                "invalid": invalid_reports,
                "unreadable": unreadable,
            },
            "check_counts": {
                "errors": error_checks,
                "warnings": warning_checks,
                "policy_warnings": policy_warning_checks,
                "info": info_checks,
                "warning_types": dict(warning_signal_counts),
                "policy_warning_types": dict(policy_warning_signal_counts),
            },
            "sources": sorted(sources),
            "reports": sorted(report_paths),
        })

    return {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "scope": {
            "manifest": str(manifest_path) if manifest_path else None,
            "source_filter": source_filter or None,
            "report_dir": str(report_dir) if report_dir else None,
            "video_count": len(candidate_ids),
        },
        "policy": {
            "ready": "all reports valid and PASS with no error/warning checks",
            "review": "reports valid with WARN/warning checks but no FAIL/error checks",
            "blocked": "missing report coverage, invalid report, FAIL status, or error checks",
            "allow_ingest_statuses": sorted(allow_ingest_statuses),
            "block_warning_checks": sorted(block_warning_checks),
            "max_warning_checks": max_warning_checks,
            "max_warning_checks_by_type": {k: max_warning_checks_by_type[k] for k in sorted(max_warning_checks_by_type)},
            "warning_budget_excluded_checks": sorted(POLICY_WARNING_BUDGET_EXCLUDED_CHECKS),
        },
        "summary": {
            "videos": len(videos),
            "by_status": dict(by_status),
            "allow_ingest": allow_ingest,
            "blocked": by_status.get("BLOCKED", 0),
        },
        "videos": videos,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate stage report files (deterministic, no external deps).")
    parser.add_argument("--file", action="append", help="Path to a stage report JSON file (repeatable)")
    parser.add_argument("--dir", help="Directory to scan recursively for report files")
    parser.add_argument("--glob", default="*.report.json", help="Glob pattern for --dir scan (default: *.report.json)")
    parser.add_argument("--manifest", help="Optional manifest file to enforce stage-report coverage")
    parser.add_argument("--source", help="Optional source filter applied to --manifest")
    parser.add_argument(
        "--emit-readiness-summary",
        action="store_true",
        help="Emit deterministic per-video readiness summary (READY/REVIEW/BLOCKED)",
    )
    parser.add_argument(
        "--readiness-summary-out",
        help="Output path for --emit-readiness-summary (default: <dir>/readiness-summary.json or ./readiness-summary.json)",
    )
    parser.add_argument(
        "--block-warning-check",
        action="append",
        default=[],
        help="Warning check name to escalate from REVIEW to BLOCKED (repeatable)",
    )
    parser.add_argument(
        "--max-warning-checks",
        type=int,
        help="Escalate to BLOCKED when a video has more than this many warning checks (all checks combined)",
    )
    parser.add_argument(
        "--max-warning-check",
        action="append",
        default=[],
        help=(
            "Escalate to BLOCKED when a warning check exceeds its budget. "
            "Format: <check>=<max> (or <check>:<max>), repeatable."
        ),
    )
    parser.add_argument(
        "--block-review-ingest",
        action="store_true",
        help="Deprecated alias for READY-only ingest policy (default behavior)",
    )
    parser.add_argument(
        "--allow-review-ingest",
        action="store_true",
        help="Allow REVIEW videos as ingest-ready in readiness summary policy",
    )
    parser.add_argument("--json", action="store_true", help="Output JSON report")
    parser.add_argument("--show", type=int, default=40, help="Max issue lines in text mode")
    args = parser.parse_args()

    if args.max_warning_checks is not None and args.max_warning_checks < 0:
        print(f"{LOG_PREFIX} ERROR: --max-warning-checks must be >= 0", file=sys.stderr)
        sys.exit(2)
    if args.block_review_ingest and args.allow_review_ingest:
        print(f"{LOG_PREFIX} ERROR: --block-review-ingest and --allow-review-ingest are mutually exclusive", file=sys.stderr)
        sys.exit(2)
    block_warning_checks = {str(c).strip() for c in (args.block_warning_check or []) if str(c).strip()}
    max_warning_checks_by_type: Dict[str, int] = {}
    for raw in args.max_warning_check or []:
        try:
            check, budget = _parse_warning_check_budget(raw)
        except ValueError as exc:
            print(
                f"{LOG_PREFIX} ERROR: invalid --max-warning-check value '{raw}': {exc}",
                file=sys.stderr,
            )
            sys.exit(2)
        prev = max_warning_checks_by_type.get(check)
        if prev is not None and prev != budget:
            print(
                f"{LOG_PREFIX} ERROR: conflicting --max-warning-check budgets for '{check}' "
                f"({prev} vs {budget})",
                file=sys.stderr,
            )
            sys.exit(2)
        max_warning_checks_by_type[check] = budget

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
    report_records: List[ReportRecord] = []
    unreadable_by_vid: Counter[str] = Counter()

    for p in files:
        data = _load_json(p)
        if data is None:
            unreadable += 1
            issues.append(Issue("error", str(p), "unreadable_json", "Could not read JSON object"))
            vid_hint = _video_id_from_filename_hint(p)
            if vid_hint:
                unreadable_by_vid[vid_hint] += 1
            continue
        validated += 1
        local_issues = validate_stage_report(data, p)
        issues.extend(local_issues)
        has_error = any(i.severity == "error" for i in local_issues)
        report_records.append(ReportRecord(path=p, data=data, valid=not has_error))

    manifest_ids: Optional[Set[str]] = None
    manifest_path: Optional[Path] = None
    missing_manifest_ids: Set[str] = set()
    manifest_covered_ids: Set[str] = set()
    if args.manifest:
        manifest_path = Path(args.manifest)
        if not manifest_path.exists():
            print(f"{LOG_PREFIX} ERROR: Manifest not found: {manifest_path}", file=sys.stderr)
            sys.exit(2)
        try:
            manifest_ids = _load_manifest_ids(manifest_path, args.source)
        except Exception as exc:
            print(f"{LOG_PREFIX} ERROR: Could not parse manifest {manifest_path}: {exc}", file=sys.stderr)
            sys.exit(2)

        for rec in report_records:
            vid = _video_id_from_report(rec)
            if vid:
                manifest_covered_ids.add(vid)
        manifest_covered_ids.update(unreadable_by_vid.keys())
        missing_manifest_ids = set(manifest_ids) - manifest_covered_ids
        for vid in sorted(missing_manifest_ids):
            issues.append(
                Issue(
                    "error",
                    str(manifest_path),
                    "missing_stage_report",
                    f"No stage report found for manifest video_id={vid}",
                )
            )

    allow_review_ingest = bool(args.allow_review_ingest)
    readiness_summary = _compute_readiness(
        report_records=report_records,
        unreadable_by_vid=dict(unreadable_by_vid),
        report_dir=Path(args.dir) if args.dir else None,
        manifest_path=manifest_path,
        source_filter=args.source,
        manifest_ids=manifest_ids,
        missing_manifest_ids=missing_manifest_ids,
        block_warning_checks=block_warning_checks,
        max_warning_checks=args.max_warning_checks,
        max_warning_checks_by_type=max_warning_checks_by_type,
        allow_review_ingest=allow_review_ingest,
    )
    readiness_out: Optional[Path] = None
    if args.emit_readiness_summary:
        if args.readiness_summary_out:
            readiness_out = Path(args.readiness_summary_out)
        elif args.dir:
            readiness_out = Path(args.dir) / "readiness-summary.json"
        else:
            readiness_out = Path("readiness-summary.json")
        readiness_out.parent.mkdir(parents=True, exist_ok=True)
        readiness_out.write_text(json.dumps(readiness_summary, indent=2) + "\n", encoding="utf-8")

    errors = sum(1 for i in issues if i.severity == "error")
    warnings = sum(1 for i in issues if i.severity == "warning")
    report = {
        "version": 1,
        "validated_files": validated,
        "unreadable_files": unreadable,
        "issues_summary": {"errors": errors, "warnings": warnings},
        "issues": [i.to_dict() for i in issues],
        "manifest": (
            {
                "path": str(manifest_path) if manifest_path else None,
                "scope_size": len(manifest_ids or set()),
                "covered_videos": len((manifest_ids or set()) & manifest_covered_ids),
                "missing_videos": sorted(missing_manifest_ids),
            }
            if manifest_ids is not None
            else None
        ),
        "readiness_summary": readiness_summary,
        "readiness_summary_out": str(readiness_out) if readiness_out else None,
        "passed": errors == 0,
    }

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(f"{LOG_PREFIX} Files validated: {validated}")
        print(f"{LOG_PREFIX} Unreadable files: {unreadable}")
        if manifest_ids is not None:
            print(
                f"{LOG_PREFIX} Manifest coverage: scope={len(manifest_ids)}, "
                f"covered={len((manifest_ids or set()) & manifest_covered_ids)}, "
                f"missing={len(missing_manifest_ids)}"
            )
        print(
            f"{LOG_PREFIX} Readiness: READY={readiness_summary['summary']['by_status'].get('READY', 0)}, "
            f"REVIEW={readiness_summary['summary']['by_status'].get('REVIEW', 0)}, "
            f"BLOCKED={readiness_summary['summary']['by_status'].get('BLOCKED', 0)}"
        )
        readiness_videos = readiness_summary.get("videos")
        if isinstance(readiness_videos, list):
            blocked_rows = [
                row for row in readiness_videos
                if isinstance(row, dict) and row.get("status") == "BLOCKED"
            ]
            review_rows = [
                row for row in readiness_videos
                if isinstance(row, dict) and row.get("status") == "REVIEW"
            ]
            if blocked_rows:
                limit = min(args.show, len(blocked_rows))
                print(f"{LOG_PREFIX} Readiness blocked videos: {len(blocked_rows)} (showing {limit})")
                for row in blocked_rows[:limit]:
                    vid = str(row.get("video_id", "?"))
                    reason = str(row.get("reason_code", "")).strip() or "blocked"
                    src_hint = ""
                    sources = row.get("sources")
                    if isinstance(sources, list):
                        first_src = next((s for s in sources if isinstance(s, str) and s.strip()), None)
                        if isinstance(first_src, str):
                            src_hint = first_src.strip()
                    report_hint = ""
                    reports = row.get("reports")
                    if isinstance(reports, list):
                        first_report = next((r for r in reports if isinstance(r, str) and r.strip()), None)
                        if isinstance(first_report, str):
                            report_hint = first_report.strip()
                    extra = f", source={src_hint}" if src_hint else ""
                    where = f", report={report_hint}" if report_hint else ""
                    print(f"{LOG_PREFIX}   BLOCKED [{vid}] reason={reason}{extra}{where}")
                if len(blocked_rows) > limit:
                    print(f"{LOG_PREFIX}   ... ({len(blocked_rows) - limit} more blocked videos)")
            if review_rows:
                limit = min(args.show, len(review_rows))
                print(f"{LOG_PREFIX} Readiness review videos: {len(review_rows)} (showing {limit})")
                for row in review_rows[:limit]:
                    vid = str(row.get("video_id", "?"))
                    reason = str(row.get("reason_code", "")).strip() or "review"
                    print(f"{LOG_PREFIX}   REVIEW [{vid}] reason={reason}")
                if len(review_rows) > limit:
                    print(f"{LOG_PREFIX}   ... ({len(review_rows) - limit} more review videos)")
        if readiness_out:
            print(f"{LOG_PREFIX} Readiness summary written: {readiness_out}")
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
