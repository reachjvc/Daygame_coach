#!/usr/bin/env python3
"""
scripts/training-data/validation/validate_manifest.py

Manifest/sub-batch validation harness (read-only).

Given a batch/sub-batch manifest (docs/pipeline/batches/*.txt), this script:
  - Checks 06b.verify coverage + verdict distribution
  - Checks presence of 06c.patched and 07.content artifacts for each video
  - Runs cross-stage validation (06/06c vs 07) for all available pairs

This is intended to be the "one command" sanity check after running LLM stages.
It does not call the LLM. By default it is read-only; optional stage-report emission
(`--emit-stage-reports`) writes validation report artifacts.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
import time
from collections import Counter, defaultdict
from dataclasses import asdict
from pathlib import Path
from typing import Any, DefaultDict, Dict, Iterable, List, Optional, Set, Tuple

import validate_cross_stage

LOG_PREFIX = "[manifest-validate]"

_BRACKET_ID_RE = re.compile(r"\[([A-Za-z0-9_-]+)\]")
_VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
_WAIVER_VIDEO_OR_WILDCARD_RE = re.compile(r"^(\*|[A-Za-z0-9_-]{11})$")
_STABLE_SOURCE_KEY_RE = re.compile(r".+[\\/][A-Za-z0-9_-]{11}\.txt$")
_SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _extract_video_id_from_text(text: str) -> Optional[str]:
    m = _BRACKET_ID_RE.search(text)
    return m.group(1) if m else None


def _video_id_for_file(p: Path) -> Optional[str]:
    return _extract_video_id_from_text(str(p)) or validate_cross_stage._extract_video_id_from_json(p)  # type: ignore[attr-defined]


def _safe_report_name(raw: str) -> str:
    cleaned = _SAFE_NAME_RE.sub("_", (raw or "").strip()).strip("_")
    return cleaned or "report"


def _load_manifest_entries(manifest_path: Path, source: Optional[str] = None) -> List[Tuple[str, str, str]]:
    """Return list of (source, video_id, raw_folder_text)."""
    entries: List[Tuple[str, str, str]] = []
    for raw in manifest_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("|", 1)
        if len(parts) != 2:
            continue
        src = parts[0].strip()
        folder = parts[1].strip()
        if source and src != source:
            continue
        vid = _extract_video_id_from_text(folder)
        if not vid:
            continue
        entries.append((src, vid, folder))
    return entries


def _index_paths_by_video_id(
    stage_root: Path,
    glob_pattern: str,
    only_ids: Set[str],
) -> Dict[str, List[Path]]:
    out: DefaultDict[str, List[Path]] = defaultdict(list)
    if not stage_root.exists():
        return {}
    for p in stage_root.rglob(glob_pattern):
        vid = _video_id_for_file(p)
        if not vid or vid not in only_ids:
            continue
        out[vid].append(p)
    return dict(out)


def _pick_best_candidate(candidates: List[Path], preferred_source: Optional[str]) -> Path:
    def rank(p: Path) -> Tuple[int, int, str]:
        source_bonus = 1 if (preferred_source and preferred_source in p.parts) else 0
        depth = len(p.parts)
        return (source_bonus, depth, str(p))

    return sorted(candidates, key=rank, reverse=True)[0]


def _load_json(path: Path) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _load_verdict(verification_path: Path) -> Optional[str]:
    data = _load_json(verification_path)
    if not data:
        return None
    verdict = data.get("verdict")
    return verdict if isinstance(verdict, str) and verdict else None


def _load_waiver_rules(waiver_path: Path) -> Set[Tuple[str, str]]:
    """
    Load waiver rules as (video_id, check) tuples.

    Supported JSON formats:
      {"waivers":[{"video_id":"abc123...", "check":"some_check"}, ...]}
      [{"video_id":"abc123...", "check":"some_check"}, ...]

    Wildcards:
      video_id="*" or check="*"
    """
    try:
        data = json.loads(waiver_path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ValueError(f"Could not read waiver file: {exc}") from exc

    items: List[Any]
    if isinstance(data, dict):
        waivers = data.get("waivers")
        if not isinstance(waivers, list):
            raise ValueError("Waiver file object must contain a 'waivers' list")
        items = waivers
    elif isinstance(data, list):
        items = data
    else:
        raise ValueError("Waiver file must be a JSON object or list")

    rules: Set[Tuple[str, str]] = set()
    for idx, item in enumerate(items):
        if not isinstance(item, dict):
            raise ValueError(f"Waiver at index {idx} is not an object")
        unknown = sorted(set(item.keys()) - {"video_id", "check", "note", "expires_at"})
        if unknown:
            raise ValueError(f"Waiver at index {idx} has unknown keys: {unknown}")
        vid = item.get("video_id")
        chk = item.get("check")
        if not isinstance(vid, str) or not vid.strip():
            raise ValueError(f"Waiver at index {idx} missing non-empty 'video_id'")
        if not _WAIVER_VIDEO_OR_WILDCARD_RE.fullmatch(vid.strip()):
            raise ValueError(
                f"Waiver at index {idx} has invalid 'video_id'={vid!r}; expected '*' or 11-char video id"
            )
        if not isinstance(chk, str) or not chk.strip():
            raise ValueError(f"Waiver at index {idx} missing non-empty 'check'")
        note = item.get("note")
        if note is not None and not isinstance(note, str):
            raise ValueError(f"Waiver at index {idx} has invalid 'note'; expected string when present")
        expires_at = item.get("expires_at")
        if expires_at is not None and not isinstance(expires_at, str):
            raise ValueError(f"Waiver at index {idx} has invalid 'expires_at'; expected string when present")
        rules.add((vid.strip(), chk.strip()))

    return rules


def _is_waived(issue: Dict[str, Any], rules: Set[Tuple[str, str]]) -> bool:
    if not rules:
        return False
    vid = str(issue.get("video_id", "")).strip() or "*"
    chk = str(issue.get("check", "")).strip() or "*"
    return (
        (vid, chk) in rules
        or ("*", chk) in rules
        or (vid, "*") in rules
        or ("*", "*") in rules
    )


def _validate_chunks_payload(chunks_path: Path) -> List[str]:
    data = _load_json(chunks_path)
    if not isinstance(data, dict):
        return ["unreadable_json"]

    errs: List[str] = []
    source_key = data.get("sourceKey")
    video_id = data.get("videoId")
    channel = data.get("channel")

    if not isinstance(source_key, str) or not source_key.strip():
        errs.append("missing_sourceKey")
    elif not _STABLE_SOURCE_KEY_RE.fullmatch(source_key.strip()):
        errs.append("invalid_sourceKey_format")

    if not isinstance(video_id, str) or not _VIDEO_ID_RE.fullmatch(video_id.strip()):
        errs.append("missing_or_invalid_videoId")
    if not isinstance(channel, str) or not channel.strip():
        errs.append("missing_channel")

    if (
        isinstance(source_key, str)
        and source_key.strip()
        and isinstance(video_id, str)
        and _VIDEO_ID_RE.fullmatch(video_id.strip())
        and isinstance(channel, str)
        and channel.strip()
    ):
        normalized_key = source_key.strip().replace("\\", "/")
        expected_key = f"{channel.strip()}/{video_id.strip()}.txt"
        if normalized_key != expected_key:
            errs.append("sourceKey_channel_video_mismatch")

    chunks = data.get("chunks")
    if not isinstance(chunks, list) or not chunks:
        return ["chunks_missing_or_empty"]

    emb_dim: Optional[int] = None
    expected_chunk_count = len(chunks)
    seen_chunk_indices: Set[int] = set()
    declared_total_chunks: Optional[int] = None

    for i, chunk in enumerate(chunks):
        if not isinstance(chunk, dict):
            errs.append(f"chunk[{i}]_not_object")
            continue

        content = chunk.get("content")
        if not isinstance(content, str) or not content.strip():
            errs.append(f"chunk[{i}]_empty_content")

        emb = chunk.get("embedding")
        if not isinstance(emb, list) or not emb:
            errs.append(f"chunk[{i}]_missing_embedding")
        else:
            for j, val in enumerate(emb):
                if not isinstance(val, (int, float)) or not math.isfinite(float(val)):
                    errs.append(f"chunk[{i}]_embedding[{j}]_not_finite")
                    break
            if emb_dim is None:
                emb_dim = len(emb)
            elif len(emb) != emb_dim:
                errs.append(f"chunk[{i}]_embedding_dim_mismatch")

        md = chunk.get("metadata")
        if not isinstance(md, dict):
            errs.append(f"chunk[{i}]_missing_metadata")
            continue
        if not isinstance(md.get("segmentType"), str) or not str(md.get("segmentType", "")).strip():
            errs.append(f"chunk[{i}]_missing_segmentType")
        chunk_index = md.get("chunkIndex")
        total_chunks = md.get("totalChunks")
        if not isinstance(chunk_index, int):
            errs.append(f"chunk[{i}]_missing_chunkIndex")
        elif chunk_index < 0:
            errs.append(f"chunk[{i}]_invalid_chunkIndex")
        if not isinstance(total_chunks, int):
            errs.append(f"chunk[{i}]_missing_totalChunks")
        elif total_chunks <= 0:
            errs.append(f"chunk[{i}]_invalid_totalChunks")

        if isinstance(total_chunks, int) and total_chunks > 0:
            if declared_total_chunks is None:
                declared_total_chunks = total_chunks
            elif total_chunks != declared_total_chunks:
                errs.append(f"chunk[{i}]_totalChunks_inconsistent")

        if (
            isinstance(chunk_index, int)
            and chunk_index >= 0
            and isinstance(total_chunks, int)
            and total_chunks > 0
            and chunk_index >= total_chunks
        ):
            errs.append(f"chunk[{i}]_chunkIndex_out_of_bounds_totalChunks")

        if isinstance(chunk_index, int) and chunk_index >= 0:
            if chunk_index >= expected_chunk_count:
                errs.append(f"chunk[{i}]_chunkIndex_out_of_bounds_chunkCount")
            elif chunk_index in seen_chunk_indices:
                errs.append(f"chunk[{i}]_duplicate_chunkIndex")
            else:
                seen_chunk_indices.add(chunk_index)

    if declared_total_chunks is not None and declared_total_chunks != expected_chunk_count:
        errs.append("totalChunks_not_equal_chunk_count")

    if expected_chunk_count > 0:
        missing_indices: List[int] = []
        for idx in range(expected_chunk_count):
            if idx not in seen_chunk_indices:
                missing_indices.append(idx)
                if len(missing_indices) >= 5:
                    break
        if missing_indices:
            suffix = ",..." if expected_chunk_count - len(seen_chunk_indices) > len(missing_indices) else ""
            errs.append(f"missing_chunkIndex_values:{','.join(str(i) for i in missing_indices)}{suffix}")

    # Keep output concise for large files.
    if len(errs) > 12:
        return errs[:12] + [f"... {len(errs) - 12} more"]
    return errs


def _issue_to_stage_check(issue: Dict[str, Any]) -> Dict[str, str]:
    sev_raw = str(issue.get("severity", "info")).strip().lower()
    sev = sev_raw if sev_raw in {"error", "warning", "info"} else "info"
    check = str(issue.get("check", "unknown")).strip() or "unknown"
    message = str(issue.get("message", "")).strip() or "(no message)"
    return {
        "severity": sev,
        "check": check,
        "message": message,
    }


def _build_video_stage_report(
    *,
    video_id: str,
    source: str,
    stem: str,
    manifest_path: Path,
    raw_issues: List[Dict[str, Any]],
    artifact_paths: Set[str],
    started_at: str,
    finished_at: str,
    elapsed_sec: float,
) -> Dict[str, Any]:
    checks = [_issue_to_stage_check(i) for i in raw_issues]
    errors = sum(1 for c in checks if c["severity"] == "error")
    warnings = sum(1 for c in checks if c["severity"] == "warning")
    infos = sum(1 for c in checks if c["severity"] == "info")
    waived = sum(1 for i in raw_issues if bool(i.get("waived")))

    if errors > 0:
        status = "FAIL"
        reason_code = next((c["check"] for c in checks if c["severity"] == "error"), "unknown_error")
    elif warnings > 0:
        status = "WARN"
        reason_code = next((c["check"] for c in checks if c["severity"] == "warning"), "unknown_warning")
    else:
        status = "PASS"
        reason_code = "ok"

    report = {
        "stage": "manifest-validation",
        "status": status,
        "reason_code": reason_code,
        "video_id": video_id,
        "source": source,
        "stem": stem,
        "batch_id": manifest_path.stem,
        "manifest_path": str(manifest_path),
        "inputs": [{"path": str(manifest_path)}],
        "outputs": [{"path": p} for p in sorted(artifact_paths)],
        "checks": checks,
        "metrics": {
            "errors": errors,
            "warnings": warnings,
            "info": infos,
            "waived": waived,
        },
        "timestamps": {
            "started_at": started_at,
            "finished_at": finished_at,
            "elapsed_sec": round(max(elapsed_sec, 0.0), 3),
        },
        "versions": {
            "pipeline_version": "manifest-validation-v1",
            "prompt_version": None,
            "model": None,
            "schema_version": "1.0.0",
            "git_sha": None,
        },
    }
    return report


def _default_stage_reports_dir(manifest_path: Path, source_filter: Optional[str]) -> Path:
    suffix = f".{source_filter}" if source_filter else ""
    name = _safe_report_name(f"{manifest_path.stem}{suffix}")
    return repo_root() / "data" / "validation" / "stage_reports" / name


def main() -> None:
    parser = argparse.ArgumentParser(description="Manifest validation harness (06b/06c/07 cross-stage)")
    parser.add_argument("--manifest", required=True, help="Batch/sub-batch manifest file (docs/pipeline/batches/*.txt)")
    parser.add_argument("--source", help="Only validate one source within the manifest")
    parser.add_argument("--allow-flag", action="store_true", help="Treat 06b FLAG verdicts as allowed (matches 07.content --allow-flag)")
    parser.add_argument(
        "--skip-stage01-presence",
        action="store_true",
        help="Do not fail when Stage 01 .wav artifacts are missing (useful for archived/migrated datasets)",
    )
    parser.add_argument(
        "--check-stage09-chunks",
        action="store_true",
        help="Also require Stage 09 chunk artifacts and validate basic chunk payload integrity",
    )
    parser.add_argument(
        "--check-stage08-report",
        action="store_true",
        help="Also require a valid Stage 08 manifest report (and fail on FAIL status)",
    )
    parser.add_argument(
        "--waiver-file",
        help="Optional JSON file with issue waivers ({\"waivers\":[{\"video_id\":\"...\",\"check\":\"...\"}]})",
    )
    parser.add_argument(
        "--emit-stage-reports",
        action="store_true",
        help="Write per-video stage reports under data/validation/stage_reports/",
    )
    parser.add_argument(
        "--stage-reports-dir",
        help="Directory for --emit-stage-reports output (defaults to data/validation/stage_reports/<manifest>)",
    )
    parser.add_argument("--strict", action="store_true", help="Fail on warnings (not just errors)")
    parser.add_argument("--json", action="store_true", help="Output JSON report (stdout)")
    parser.add_argument("--show", type=int, default=30, help="Max issue lines to print in text mode")

    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    if not manifest_path.is_absolute():
        manifest_path = repo_root() / manifest_path
    if not manifest_path.exists():
        print(f"{LOG_PREFIX} ERROR: Manifest file not found: {manifest_path}", file=sys.stderr)
        sys.exit(2)

    waiver_rules: Set[Tuple[str, str]] = set()
    waiver_file_path: Optional[Path] = None
    if args.waiver_file:
        waiver_file_path = Path(args.waiver_file)
        if not waiver_file_path.is_absolute():
            waiver_file_path = repo_root() / waiver_file_path
        if not waiver_file_path.exists():
            print(f"{LOG_PREFIX} ERROR: Waiver file not found: {waiver_file_path}", file=sys.stderr)
            sys.exit(2)
        try:
            waiver_rules = _load_waiver_rules(waiver_file_path)
        except ValueError as exc:
            print(f"{LOG_PREFIX} ERROR: Invalid waiver file {waiver_file_path}: {exc}", file=sys.stderr)
            sys.exit(2)

    entries = _load_manifest_entries(manifest_path, source=args.source)
    if not entries:
        print(f"{LOG_PREFIX} No entries found in manifest: {manifest_path}")
        sys.exit(0)

    manifest_ids: Set[str] = {vid for _, vid, _ in entries}
    source_by_vid: Dict[str, str] = {vid: src for src, vid, _ in entries}
    folder_by_vid: Dict[str, str] = {vid: folder for src, vid, folder in entries}

    data_root = repo_root() / "data"
    s01_root = data_root / "01.download"
    s06_root = data_root / "06.video-type"
    s06c_root = data_root / "06c.patched"
    s07_root = data_root / "07.content"
    s06b_root = data_root / "06b.verify"
    s09_root = data_root / "09.chunks"

    idx_s01_wav = _index_paths_by_video_id(s01_root, "*.wav", manifest_ids)
    idx_s06 = _index_paths_by_video_id(s06_root, "*.conversations.json", manifest_ids)
    idx_s06c = _index_paths_by_video_id(s06c_root, "*.conversations.json", manifest_ids)
    idx_s07 = _index_paths_by_video_id(s07_root, "*.enriched.json", manifest_ids)
    idx_s07_val = _index_paths_by_video_id(s07_root, "*.validation.json", manifest_ids)
    idx_s06b = _index_paths_by_video_id(s06b_root, "*.verification.json", manifest_ids)
    idx_s09 = _index_paths_by_video_id(s09_root, "*.chunks.json", manifest_ids) if args.check_stage09_chunks else {}

    verdict_counts: Counter = Counter()
    missing_verify: List[str] = []
    missing_s01: List[str] = []
    missing_s06c: List[str] = []
    missing_s07: List[str] = []
    missing_s09: List[str] = []

    issues: List[Dict[str, Any]] = []
    check_counts: Counter = Counter()
    validated_pairs = 0
    cross_stage_errors = 0
    cross_stage_warnings = 0
    stage09_checked_files = 0
    stage09_invalid_files = 0
    stage08_checked = False
    stage08_status: Optional[str] = None
    stage08_report_path: Optional[Path] = None

    # Stage 07 quality signals (from per-file validation + normalization metadata)
    stage07_val_errors = 0
    stage07_val_warnings = 0
    stage07_warning_types: Counter = Counter()
    stage07_normalization_repairs_total = 0
    stage07_videos_with_repairs = 0

    blocked_by_gate = 0
    allowed_by_gate = 0
    gate_reject = 0
    gate_reject_patched_allowed = 0
    gate_flag_blocked = 0
    gate_flag_allowed = 0
    video_artifacts: Dict[str, Dict[str, Optional[str]]] = {}
    stage_reports_emitted = 0
    stage_reports_dir: Optional[Path] = None

    start = time.time()
    started_at_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(start))
    if args.emit_stage_reports:
        if args.stage_reports_dir:
            stage_reports_dir = Path(args.stage_reports_dir)
            if not stage_reports_dir.is_absolute():
                stage_reports_dir = repo_root() / stage_reports_dir
        else:
            stage_reports_dir = _default_stage_reports_dir(manifest_path, args.source)

    if args.check_stage08_report:
        stage08_checked = True
        report_stem = _safe_report_name(manifest_path.stem)
        stage08_report_path = data_root / "08.taxonomy-validation" / f"{report_stem}.report.json"
        expected_source = f"manifest:{manifest_path.name}"

        if not stage08_report_path.exists():
            issues.append({
                "video_id": "*",
                "source": args.source or "all",
                "severity": "error",
                "check": "missing_stage08_report",
                "message": f"Missing Stage 08 report for manifest: {stage08_report_path}",
            })
            check_counts["error:missing_stage08_report"] += 1
        else:
            report_data = _load_json(stage08_report_path)
            if not isinstance(report_data, dict):
                issues.append({
                    "video_id": "*",
                    "source": args.source or "all",
                    "severity": "error",
                    "check": "invalid_stage08_report",
                    "message": "Stage 08 report is unreadable or not a JSON object",
                    "stage08_report": str(stage08_report_path),
                })
                check_counts["error:invalid_stage08_report"] += 1
            else:
                if report_data.get("stage") != "08.taxonomy-validation":
                    issues.append({
                        "video_id": "*",
                        "source": args.source or "all",
                        "severity": "error",
                        "check": "invalid_stage08_report_stage",
                        "message": f"Stage 08 report has unexpected stage={report_data.get('stage')!r}",
                        "stage08_report": str(stage08_report_path),
                    })
                    check_counts["error:invalid_stage08_report_stage"] += 1

                if report_data.get("source") != expected_source:
                    issues.append({
                        "video_id": "*",
                        "source": args.source or "all",
                        "severity": "error",
                        "check": "invalid_stage08_report_scope",
                        "message": (
                            f"Stage 08 report source mismatch: expected {expected_source!r}, "
                            f"found {report_data.get('source')!r}"
                        ),
                        "stage08_report": str(stage08_report_path),
                    })
                    check_counts["error:invalid_stage08_report_scope"] += 1

                validation = report_data.get("validation")
                if not isinstance(validation, dict):
                    issues.append({
                        "video_id": "*",
                        "source": args.source or "all",
                        "severity": "error",
                        "check": "invalid_stage08_report_validation",
                        "message": "Stage 08 report missing validation object",
                        "stage08_report": str(stage08_report_path),
                    })
                    check_counts["error:invalid_stage08_report_validation"] += 1
                else:
                    status = validation.get("status")
                    stage08_status = status if isinstance(status, str) else None
                    reason = validation.get("reason")
                    reason_text = reason.strip() if isinstance(reason, str) else ""

                    if status not in {"PASS", "WARNING", "FAIL"}:
                        issues.append({
                            "video_id": "*",
                            "source": args.source or "all",
                            "severity": "error",
                            "check": "invalid_stage08_report_status",
                            "message": f"Stage 08 report has invalid validation.status={status!r}",
                            "stage08_report": str(stage08_report_path),
                        })
                        check_counts["error:invalid_stage08_report_status"] += 1
                    elif status == "FAIL":
                        issues.append({
                            "video_id": "*",
                            "source": args.source or "all",
                            "severity": "error",
                            "check": "stage08_validation_fail",
                            "message": (
                                f"Stage 08 report status is FAIL"
                                + (f": {reason_text}" if reason_text else "")
                            ),
                            "stage08_report": str(stage08_report_path),
                        })
                        check_counts["error:stage08_validation_fail"] += 1
                    elif status == "WARNING":
                        issues.append({
                            "video_id": "*",
                            "source": args.source or "all",
                            "severity": "warning",
                            "check": "stage08_validation_warning",
                            "message": (
                                f"Stage 08 report status is WARNING"
                                + (f": {reason_text}" if reason_text else "")
                            ),
                            "stage08_report": str(stage08_report_path),
                        })
                        check_counts["warning:stage08_validation_warning"] += 1

                details = report_data.get("details")
                files_processed = details.get("files_processed") if isinstance(details, dict) else None
                if not isinstance(files_processed, int) or files_processed <= 0:
                    issues.append({
                        "video_id": "*",
                        "source": args.source or "all",
                        "severity": "error",
                        "check": "invalid_stage08_report_files_processed",
                        "message": f"Stage 08 report has invalid details.files_processed={files_processed!r}",
                        "stage08_report": str(stage08_report_path),
                    })
                    check_counts["error:invalid_stage08_report_files_processed"] += 1
                files_unreadable = details.get("files_unreadable") if isinstance(details, dict) else None
                if not isinstance(files_unreadable, int) or files_unreadable < 0:
                    issues.append({
                        "video_id": "*",
                        "source": args.source or "all",
                        "severity": "error",
                        "check": "invalid_stage08_report_files_unreadable",
                        "message": f"Stage 08 report has invalid details.files_unreadable={files_unreadable!r}",
                        "stage08_report": str(stage08_report_path),
                    })
                    check_counts["error:invalid_stage08_report_files_unreadable"] += 1
                elif files_unreadable > 0:
                    issues.append({
                        "video_id": "*",
                        "source": args.source or "all",
                        "severity": "error",
                        "check": "stage08_unreadable_enriched_files",
                        "message": f"Stage 08 report indicates {files_unreadable} unreadable Stage 07 enriched file(s)",
                        "stage08_report": str(stage08_report_path),
                    })
                    check_counts["error:stage08_unreadable_enriched_files"] += 1

                manifest_cov = details.get("manifest_coverage") if isinstance(details, dict) else None
                if not isinstance(manifest_cov, dict):
                    issues.append({
                        "video_id": "*",
                        "source": args.source or "all",
                        "severity": "error",
                        "check": "invalid_stage08_report_manifest_coverage",
                        "message": "Stage 08 report missing details.manifest_coverage",
                        "stage08_report": str(stage08_report_path),
                    })
                    check_counts["error:invalid_stage08_report_manifest_coverage"] += 1
                else:
                    missing_videos = manifest_cov.get("missing_videos")
                    matched_video_ids = manifest_cov.get("matched_video_ids")
                    if not isinstance(missing_videos, int) or missing_videos < 0:
                        issues.append({
                            "video_id": "*",
                            "source": args.source or "all",
                            "severity": "error",
                            "check": "invalid_stage08_report_missing_videos",
                            "message": f"Stage 08 report has invalid manifest_coverage.missing_videos={missing_videos!r}",
                            "stage08_report": str(stage08_report_path),
                        })
                        check_counts["error:invalid_stage08_report_missing_videos"] += 1
                    elif missing_videos > 0:
                        issues.append({
                            "video_id": "*",
                            "source": args.source or "all",
                            "severity": "error",
                            "check": "stage08_manifest_coverage_incomplete",
                            "message": f"Stage 08 report indicates incomplete manifest coverage (missing_videos={missing_videos})",
                            "stage08_report": str(stage08_report_path),
                        })
                        check_counts["error:stage08_manifest_coverage_incomplete"] += 1

                    if not isinstance(matched_video_ids, int) or matched_video_ids <= 0:
                        issues.append({
                            "video_id": "*",
                            "source": args.source or "all",
                            "severity": "error",
                            "check": "invalid_stage08_report_matched_video_ids",
                            "message": f"Stage 08 report has invalid manifest_coverage.matched_video_ids={matched_video_ids!r}",
                            "stage08_report": str(stage08_report_path),
                        })
                        check_counts["error:invalid_stage08_report_matched_video_ids"] += 1

    for vid in sorted(manifest_ids):
        src = source_by_vid.get(vid, "")
        folder_text = folder_by_vid.get(vid, "")

        s01_candidates = idx_s01_wav.get(vid) or []
        s06c_candidates = idx_s06c.get(vid) or []
        s06_candidates = idx_s06.get(vid) or []
        s07_candidates = idx_s07.get(vid) or []
        s07v_candidates = idx_s07_val.get(vid) or []
        v_candidates = idx_s06b.get(vid) or []
        s09_candidates = idx_s09.get(vid) or []

        s01_path = _pick_best_candidate(s01_candidates, src) if s01_candidates else None
        s06c_path = _pick_best_candidate(s06c_candidates, src) if s06c_candidates else None
        s06_path = _pick_best_candidate(s06_candidates, src) if s06_candidates else None
        s07_path = _pick_best_candidate(s07_candidates, src) if s07_candidates else None
        s07v_path = _pick_best_candidate(s07v_candidates, src) if s07v_candidates else None
        v_path = _pick_best_candidate(v_candidates, src) if v_candidates else None
        s09_path = _pick_best_candidate(s09_candidates, src) if s09_candidates else None
        video_artifacts[vid] = {
            "s01": str(s01_path) if s01_path else None,
            "s06": str(s06_path) if s06_path else None,
            "s06c": str(s06c_path) if s06c_path else None,
            "s07": str(s07_path) if s07_path else None,
            "s07_validation": str(s07v_path) if s07v_path else None,
            "verify": str(v_path) if v_path else None,
            "s09": str(s09_path) if s09_path else None,
        }

        if not s06c_path:
            missing_s06c.append(vid)
        if not s07_path:
            missing_s07.append(vid)
        if args.check_stage09_chunks and not s09_path:
            missing_s09.append(vid)
            issues.append({
                "video_id": vid,
                "source": src,
                "severity": "error",
                "check": "missing_stage09_chunks",
                "message": "No Stage 09 chunks artifact found for this video_id",
                "manifest_folder": folder_text,
            })
            check_counts["error:missing_stage09_chunks"] += 1
        elif args.check_stage09_chunks and s09_path:
            stage09_checked_files += 1
            s09_errs = _validate_chunks_payload(s09_path)
            if s09_errs:
                stage09_invalid_files += 1
                issues.append({
                    "video_id": vid,
                    "source": src,
                    "severity": "error",
                    "check": "stage09_chunks_invalid",
                    "message": f"Stage 09 chunk payload invalid: {s09_errs}",
                    "s09": str(s09_path),
                })
                check_counts["error:stage09_chunks_invalid"] += 1

        # Stage 01 download integrity: at least one .wav exists for this video id (raw16k/clean16k/legacy).
        if not s01_candidates:
            missing_s01.append(vid)
            sev = "warning" if args.skip_stage01_presence else "error"
            msg = (
                "No Stage 01 .wav found for this video_id "
                "(download incomplete/mis-filed or Stage 01 artifacts are not retained)"
            )
            issues.append({
                "video_id": vid,
                "source": src,
                "severity": sev,
                "check": "missing_stage01_audio",
                "message": msg,
                "manifest_folder": folder_text,
            })
            check_counts[f"{sev}:missing_stage01_audio"] += 1

        # Stage 07 per-file validation handling
        if s07_path and not s07v_path:
            issues.append({
                "video_id": vid,
                "source": src,
                "severity": "warning",
                "check": "missing_stage07_validation",
                "message": "Stage 07 enriched output exists but no .validation.json was found",
                "s07": str(s07_path),
            })
            check_counts["warning:missing_stage07_validation"] += 1

        if (not s07_path) and s07v_path:
            issues.append({
                "video_id": vid,
                "source": src,
                "severity": "error",
                "check": "stage07_partial_write",
                "message": "Stage 07 validation exists but enriched output is missing (partial write / validation failure)",
                "s07_validation": str(s07v_path),
            })
            check_counts["error:stage07_partial_write"] += 1

        if s07v_path:
            s07v = _load_json(s07v_path)
            if not s07v:
                issues.append({
                    "video_id": vid,
                    "source": src,
                    "severity": "warning",
                    "check": "unreadable_stage07_validation",
                    "message": "Could not read Stage 07 validation JSON",
                    "s07_validation": str(s07v_path),
                })
                check_counts["warning:unreadable_stage07_validation"] += 1
            else:
                summary = s07v.get("summary", {})
                v_err = summary.get("errors", 0)
                v_warn = summary.get("warnings", 0)
                if isinstance(v_err, int) and v_err:
                    stage07_val_errors += v_err
                    issues.append({
                        "video_id": vid,
                        "source": src,
                        "severity": "error",
                        "check": "stage07_validation_errors",
                        "message": f"Stage 07 validation reports {v_err} error(s)",
                        "s07_validation": str(s07v_path),
                    })
                    check_counts["error:stage07_validation_errors"] += 1
                if isinstance(v_warn, int) and v_warn:
                    stage07_val_warnings += v_warn

                    # Summarize warning types for this video (avoid spamming per-warning issues).
                    w_counts: Counter = Counter()
                    for r in s07v.get("results", []) or []:
                        if r.get("severity") == "warning":
                            w_counts[r.get("check", "unknown")] += 1
                            stage07_warning_types[r.get("check", "unknown")] += 1

                    issues.append({
                        "video_id": vid,
                        "source": src,
                        "severity": "warning",
                        "check": "stage07_validation_warnings",
                        "message": f"Stage 07 validation reports {v_warn} warning(s): {dict(w_counts)}",
                        "s07_validation": str(s07v_path),
                    })
                    check_counts["warning:stage07_validation_warnings"] += 1

        verdict: Optional[str] = None
        if not v_path:
            missing_verify.append(vid)
        else:
            verdict = _load_verdict(v_path)
            if verdict:
                verdict_counts[verdict] += 1

        # Gate accounting (mirrors 07.content logic)
        if verdict == "APPROVE":
            allowed_by_gate += 1
        elif verdict == "FLAG":
            if args.allow_flag:
                allowed_by_gate += 1
                gate_flag_allowed += 1
            else:
                blocked_by_gate += 1
                gate_flag_blocked += 1
        elif verdict == "REJECT":
            gate_reject += 1

            patched_clean = False
            if s06c_path:
                s06c_data = _load_json(s06c_path)
                pm = s06c_data.get("patch_metadata") if isinstance(s06c_data, dict) else None
                if isinstance(pm, dict):
                    fixes = pm.get("fixes_applied_count", 0)
                    flags = pm.get("flags_not_fixed_count", 0)
                    if isinstance(fixes, int) and isinstance(flags, int) and fixes > 0 and flags == 0:
                        patched_clean = True

            if patched_clean and args.allow_flag:
                allowed_by_gate += 1
                gate_reject_patched_allowed += 1
            else:
                blocked_by_gate += 1
        else:
            blocked_by_gate += 1

        # Run cross-stage validation when we have both sides.
        # Prefer 06c.patched, fall back to 06.video-type if needed.
        s06_for_cross = s06c_path or s06_path
        if s06_for_cross and s07_path:
            s06_data = _load_json(s06_for_cross)
            s07_data = _load_json(s07_path)
            if not s06_data or not s07_data:
                issues.append({
                    "video_id": vid,
                    "source": src,
                    "severity": "error",
                    "check": "unreadable_json",
                    "message": "Could not read stage JSON for cross-stage validation",
                    "s06": str(s06_for_cross),
                    "s07": str(s07_path),
                })
                check_counts["unreadable_json"] += 1
                cross_stage_errors += 1
                continue

            validated_pairs += 1
            results = validate_cross_stage.validate_cross_stage(s06_data, s07_data, vid)
            for r in results:
                if r.severity == "info":
                    continue
                issues.append({
                    "video_id": vid,
                    "source": src,
                    "severity": r.severity,
                    "check": r.check,
                    "message": r.message,
                    "s06": str(s06_for_cross),
                    "s07": str(s07_path),
                })
                check_counts[f"{r.severity}:{r.check}"] += 1
                if r.severity == "error":
                    cross_stage_errors += 1
                elif r.severity == "warning":
                    cross_stage_warnings += 1

            # Stage 07 normalization metadata (best-effort drift repairs)
            meta = s07_data.get("metadata", {}) if isinstance(s07_data, dict) else {}
            repairs = meta.get("normalization_repairs_count", 0)
            if isinstance(repairs, int) and repairs > 0:
                stage07_videos_with_repairs += 1
                stage07_normalization_repairs_total += repairs
                issues.append({
                    "video_id": vid,
                    "source": src,
                    "severity": "warning",
                    "check": "stage07_normalization_repairs",
                    "message": f"Stage 07 applied {repairs} normalization repair(s) before validation",
                    "s07": str(s07_path),
                })
                check_counts["warning:stage07_normalization_repairs"] += 1

        # Sanity: Stage 07 output existing despite REJECT verdict is suspicious unless 06c.patch
        # applied fixes cleanly (in which case 07.content may legitimately proceed).
        if verdict == "REJECT" and s07_path:
            patched_clean = False
            if s06c_path:
                s06c_data = _load_json(s06c_path)
                pm = s06c_data.get("patch_metadata") if isinstance(s06c_data, dict) else None
                if isinstance(pm, dict):
                    fixes = pm.get("fixes_applied_count", 0)
                    flags = pm.get("flags_not_fixed_count", 0)
                    if isinstance(fixes, int) and isinstance(flags, int) and fixes > 0 and flags == 0:
                        patched_clean = True

            if not patched_clean:
                issues.append({
                    "video_id": vid,
                    "source": src,
                    "severity": "warning",
                    "check": "stage07_present_despite_reject",
                    "message": "Stage 07 output exists but 06b verdict is REJECT (was --skip-verification used?)",
                    "s07": str(s07_path),
                    "verify": str(v_path) if v_path else None,
                })
                check_counts["warning:stage07_present_despite_reject"] += 1

    waivers_applied = 0
    if waiver_rules:
        for issue in issues:
            sev = issue.get("severity")
            if sev not in {"error", "warning"}:
                continue
            if _is_waived(issue, waiver_rules):
                issue["waived"] = True
                issue["original_severity"] = sev
                issue["severity"] = "info"
                waivers_applied += 1

    # Recompute check counts after waiver application to keep summary/gates consistent.
    check_counts = Counter()
    for issue in issues:
        sev = issue.get("severity")
        chk = issue.get("check", "unknown")
        if sev in {"error", "warning"}:
            check_counts[f"{sev}:{chk}"] += 1

    if args.emit_stage_reports and stage_reports_dir is not None:
        try:
            stage_reports_dir.mkdir(parents=True, exist_ok=True)
            issues_by_vid: DefaultDict[str, List[Dict[str, Any]]] = defaultdict(list)
            global_issues: List[Dict[str, Any]] = []
            for issue in issues:
                vid = str(issue.get("video_id", "")).strip()
                if vid == "*":
                    global_issues.append(issue)
                elif vid in manifest_ids:
                    issues_by_vid[vid].append(issue)

            for vid in sorted(manifest_ids):
                raw_issues = list(global_issues) + list(issues_by_vid.get(vid, []))
                artifact_paths: Set[str] = set()

                for p in (video_artifacts.get(vid) or {}).values():
                    if isinstance(p, str) and p.strip():
                        artifact_paths.add(p)

                for issue in raw_issues:
                    for key in ("s01", "s06", "s06c", "s07", "s07_validation", "verify", "s09", "stage08_report"):
                        p = issue.get(key)
                        if isinstance(p, str) and p.strip():
                            artifact_paths.add(p)

                report_obj = _build_video_stage_report(
                    video_id=vid,
                    source=source_by_vid.get(vid, ""),
                    stem=folder_by_vid.get(vid, vid),
                    manifest_path=manifest_path,
                    raw_issues=raw_issues,
                    artifact_paths=artifact_paths,
                    started_at=started_at_iso,
                    finished_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    elapsed_sec=time.time() - start,
                )
                out_path = stage_reports_dir / f"{vid}.manifest-validation.report.json"
                out_path.write_text(json.dumps(report_obj, indent=2) + "\n", encoding="utf-8")
                stage_reports_emitted += 1
        except Exception as exc:
            print(f"{LOG_PREFIX} ERROR: Could not emit stage reports to {stage_reports_dir}: {exc}", file=sys.stderr)
            sys.exit(2)

    elapsed = time.time() - start

    errors = sum(1 for i in issues if i.get("severity") == "error")
    warnings = sum(1 for i in issues if i.get("severity") == "warning")

    # In text mode, compute a simple pass/fail heuristic that matches how we'd use this in CI.
    # "Complete" here means: for manifest videos, 06c + 07 + 06b verification exist.
    complete = (
        len(missing_verify) == 0
        and len(missing_s06c) == 0
        and len(missing_s07) == 0
        and (not args.check_stage09_chunks or len(missing_s09) == 0)
    )
    passed = complete and errors == 0 and (warnings == 0 if args.strict else True)

    report = {
        "validated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "manifest": str(manifest_path),
        "source_filter": args.source or None,
        "video_count": len(manifest_ids),
        "artifact_presence": {
            "missing_01_download": len(missing_s01),
            "missing_06b_verify": len(missing_verify),
            "missing_06c_patched": len(missing_s06c),
            "missing_07_content": len(missing_s07),
            **({"missing_09_chunks": len(missing_s09)} if args.check_stage09_chunks else {}),
        },
        "stage01_presence_required": not bool(args.skip_stage01_presence),
        "stage08_report_required": bool(args.check_stage08_report),
        "stage09_chunks_required": bool(args.check_stage09_chunks),
        "verification_verdicts": dict(verdict_counts),
        "verification_gate": {
            "allow_flag": bool(args.allow_flag),
            "allowed": allowed_by_gate,
            "blocked": blocked_by_gate,
            "reject": gate_reject,
            "reject_patched_allowed": gate_reject_patched_allowed,
            "flag_allowed": gate_flag_allowed,
            "flag_blocked": gate_flag_blocked,
        },
        "stage07_validation": {
            "errors": stage07_val_errors,
            "warnings": stage07_val_warnings,
            "warning_types": dict(stage07_warning_types),
            "normalization_repairs_total": stage07_normalization_repairs_total,
            "videos_with_repairs": stage07_videos_with_repairs,
        },
        "cross_stage": {
            "validated_pairs": validated_pairs,
            "errors": cross_stage_errors,
            "warnings": cross_stage_warnings,
        },
        "stage09_validation": (
            {
                "checked_files": stage09_checked_files,
                "invalid_files": stage09_invalid_files,
            }
            if args.check_stage09_chunks
            else None
        ),
        "stage08_validation": (
            {
                "checked": stage08_checked,
                "status": stage08_status,
                "report": str(stage08_report_path) if stage08_report_path else None,
            }
            if args.check_stage08_report
            else None
        ),
        "stage_reports": {
            "enabled": bool(args.emit_stage_reports),
            "dir": str(stage_reports_dir) if stage_reports_dir else None,
            "emitted": stage_reports_emitted,
        },
        "waivers": {
            "enabled": bool(waiver_rules),
            "file": str(waiver_file_path) if waiver_file_path else None,
            "rules": len(waiver_rules),
            "applied": waivers_applied,
        },
        "issues_summary": {
            "errors": errors,
            "warnings": warnings,
        },
        "check_counts": dict(check_counts),
        "passed": passed,
        "strict": bool(args.strict),
        "elapsed_sec": round(elapsed, 2),
        "issues": issues,
    }

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(f"{LOG_PREFIX} Manifest: {manifest_path}")
        print(f"{LOG_PREFIX} Videos: {len(manifest_ids)}")
        if args.source:
            print(f"{LOG_PREFIX} Source filter: {args.source}")

        print(f"{LOG_PREFIX} 06b.verify verdicts: {dict(verdict_counts) or '{}'}")
        print(
            f"{LOG_PREFIX} Gate: allowed={allowed_by_gate}, blocked={blocked_by_gate} "
            f"(REJECT={gate_reject}, REJECT_patched_allowed={gate_reject_patched_allowed}, "
            f"FLAG_allowed={gate_flag_allowed}, FLAG_blocked={gate_flag_blocked}, allow_flag={args.allow_flag})"
        )

        print(
            f"{LOG_PREFIX} Presence: missing 01.download={len(missing_s01)}, "
            f"missing 06b.verify={len(missing_verify)}, "
            f"missing 06c.patched={len(missing_s06c)}, missing 07.content={len(missing_s07)}"
            + (f", missing 09.chunks={len(missing_s09)}" if args.check_stage09_chunks else "")
        )
        if args.skip_stage01_presence:
            print(f"{LOG_PREFIX} Stage 01 presence check: optional (--skip-stage01-presence)")
        if args.check_stage09_chunks:
            print(
                f"{LOG_PREFIX} Stage 09 chunk check: enabled "
                f"(checked={stage09_checked_files}, invalid={stage09_invalid_files})"
            )
        if args.check_stage08_report:
            print(
                f"{LOG_PREFIX} Stage 08 report check: enabled "
                f"(status={stage08_status or 'unknown'}, report={str(stage08_report_path) if stage08_report_path else 'n/a'})"
            )
        if args.emit_stage_reports:
            print(
                f"{LOG_PREFIX} Stage reports: enabled "
                f"(emitted={stage_reports_emitted}, dir={stage_reports_dir})"
            )
        if waiver_rules:
            print(
                f"{LOG_PREFIX} Waivers: enabled "
                f"(rules={len(waiver_rules)}, applied={waivers_applied}, file={waiver_file_path})"
            )

        print(
            f"{LOG_PREFIX} Cross-stage: validated_pairs={validated_pairs}, "
            f"errors={cross_stage_errors}, warnings={cross_stage_warnings}"
        )
        if stage07_val_errors or stage07_val_warnings or stage07_normalization_repairs_total:
            print(
                f"{LOG_PREFIX} Stage07 validation: errors={stage07_val_errors}, warnings={stage07_val_warnings}, "
                f"normalization_repairs={stage07_normalization_repairs_total}"
            )
        print(f"{LOG_PREFIX} Issues total: errors={errors}, warnings={warnings}")
        print(f"{LOG_PREFIX} Result: {'PASS' if passed else 'FAIL'} ({elapsed:.1f}s)")

        if issues:
            # Show most severe first (error then warning), then stable by check/video id.
            def sort_key(i: Dict[str, Any]) -> Tuple[int, str, str]:
                sev = i.get("severity")
                sev_rank = 0 if sev == "error" else 1
                return (sev_rank, str(i.get("check", "")), str(i.get("video_id", "")))

            print("")
            shown = 0
            for i in sorted(issues, key=sort_key):
                if shown >= args.show:
                    remaining = len(issues) - shown
                    print(f"{LOG_PREFIX} ... ({remaining} more issue(s) not shown; use --json for full list)")
                    break
                vid = i.get("video_id", "")
                check = i.get("check", "")
                msg = i.get("message", "")
                sev = (i.get("severity") or "").upper()
                print(f"{LOG_PREFIX} {sev} [{vid}] {check}: {msg}")
                shown += 1

    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
