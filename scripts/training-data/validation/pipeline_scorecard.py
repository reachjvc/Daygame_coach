#!/usr/bin/env python3
"""
scripts/training-data/validation/pipeline_scorecard.py

Generate a deterministic pipeline scorecard for a manifest/sub-batch scope.

This script is read-only relative to pipeline stage artifacts. It inspects
existing outputs and validator summaries to produce one machine-readable JSON
scorecard that can be compared across iterations.
"""

from __future__ import annotations

import argparse
from collections import Counter
import json
import re
import statistics
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set, Tuple

LOG_PREFIX = "[pipeline-scorecard]"

VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
BRACKET_VIDEO_ID_RE = re.compile(r"\[([A-Za-z0-9_-]{11})\]")
CHUNKS_BASENAME_VIDEO_ID_RE = re.compile(r"^([A-Za-z0-9_-]{11})\.chunks\.json$")
SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")

STAGE_SPECS: Dict[str, Tuple[str, str]] = {
    "stage06": ("06.LLM.video-type", "*.conversations.json"),
    "stage06b": ("06b.LLM.verify", "*.verification.json"),
    "stage06c": ("06c.DET.patched", "*.conversations.json"),
    "stage06d": ("06d.DET.sanitized", "*.conversations.json"),
    "stage06e": ("06e.LLM.quality-check", "*.quality-check.json"),
    "stage06f": ("06f.DET.damage-map", "*.damage-map.json"),
    "stage06g": ("06g.LLM.damage-adjudicator", "*.damage-adjudication.json"),
    "stage06h": ("06h.DET.confidence-propagation", "*.confidence.report.json"),
    "stage07": ("07.LLM.content", "*.enriched.json"),
    "stage07b": ("07b.LLM.enrichment-verify", "*.enrichment-verify.json"),
    "stage09": ("09.EXT.chunks", "*.chunks.json"),
}


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def safe_name(raw: str) -> str:
    cleaned = SAFE_NAME_RE.sub("_", (raw or "").strip()).strip("_")
    return cleaned or "report"


def _extract_video_id_from_text(text: str) -> Optional[str]:
    m = BRACKET_VIDEO_ID_RE.search(text or "")
    if m:
        vid = m.group(1)
        return vid if VIDEO_ID_RE.fullmatch(vid) else None
    return None


def _extract_video_id_from_json(path: Path) -> Optional[str]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    if not isinstance(data, dict):
        return None

    for key in ("video_id", "videoId"):
        raw = data.get(key)
        if isinstance(raw, str):
            val = raw.strip()
            if VIDEO_ID_RE.fullmatch(val):
                return val

    source_key = data.get("sourceKey")
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


def load_manifest_entries(
    manifest_path: Path,
    source_filter: Optional[str],
) -> List[Tuple[str, str, str]]:
    entries: List[Tuple[str, str, str]] = []
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
        if not vid:
            continue
        entries.append((source, folder, vid))
    return entries


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


def load_quarantine_ids(
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
        if not path.exists():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(data, dict):
            continue
        out: Set[str] = set()
        for key in ("quarantined_video_ids", "video_ids"):
            raw = data.get(key)
            if not isinstance(raw, list):
                continue
            for item in raw:
                if isinstance(item, str):
                    vid = item.strip()
                    if VIDEO_ID_RE.fullmatch(vid):
                        out.add(vid)
        return out, path

    return set(), None


def _default_stage_reports_dir(manifest_path: Path, source_filter: Optional[str]) -> Path:
    root = repo_root() / "data" / "validation" / "stage_reports"
    stem = safe_name(manifest_path.stem)
    if source_filter:
        return root / safe_name(f"{stem}.{source_filter}")
    return root / stem


def _find_stage_reports_dir(manifest_path: Path, source_filter: Optional[str]) -> Optional[Path]:
    primary = _default_stage_reports_dir(manifest_path, source_filter)
    if primary.exists():
        return primary
    return None


def _default_stage08_report_path(manifest_path: Path, source_filter: Optional[str]) -> Path:
    root = repo_root() / "data" / "08.DET.taxonomy-validation"
    stem = safe_name(manifest_path.stem)
    name = safe_name(f"{stem}.{source_filter}") if source_filter else stem
    return root / f"{name}.report.json"


def _find_stage08_report_path(manifest_path: Path, source_filter: Optional[str]) -> Optional[Path]:
    primary = _default_stage08_report_path(manifest_path, source_filter)
    if primary.exists():
        return primary
    return None


def _default_gate_candidates(manifest_path: Path, source_filter: Optional[str]) -> List[Path]:
    root = repo_root() / "data" / "validation" / "gates"
    stem = safe_name(manifest_path.stem)
    out: List[Path] = []
    if source_filter:
        out.append(root / f"{safe_name(f'{stem}.{source_filter}')}.gate.json")
    out.append(root / f"{stem}.gate.json")
    return out


def load_canonical_gate_payload(
    manifest_path: Path,
    source_filter: Optional[str],
) -> Tuple[Optional[Dict[str, Any]], Optional[Path]]:
    for path in _default_gate_candidates(manifest_path, source_filter):
        if not path.exists():
            continue
        payload = _load_json(path)
        if not isinstance(payload, dict):
            continue
        if not isinstance(payload.get("videos"), list):
            continue
        return payload, path
    return None, None


def _iter_files(root: Path, glob_pattern: str) -> Iterable[Path]:
    if not root.exists():
        return []
    return root.rglob(glob_pattern)


def _collect_stage_video_ids(stage_key: str) -> Set[str]:
    stage_dir, pattern = STAGE_SPECS[stage_key]
    root = repo_root() / "data" / stage_dir
    allow_json_probe = stage_key in {"stage09"}
    ids: Set[str] = set()
    for path in _iter_files(root, pattern):
        vid = _video_id_for_file(path, allow_json_probe=allow_json_probe)
        if vid:
            ids.add(vid)
    return ids


def _extract_json_payload(raw: str) -> Optional[Dict[str, Any]]:
    text = (raw or "").strip()
    if not text:
        return None
    try:
        obj = json.loads(text)
        return obj if isinstance(obj, dict) else None
    except Exception:
        pass

    # Fallback: first complete JSON object in stream.
    start = text.find("{")
    if start < 0:
        return None
    depth = 0
    for i in range(start, len(text)):
        ch = text[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                snippet = text[start : i + 1]
                try:
                    obj = json.loads(snippet)
                except Exception:
                    return None
                return obj if isinstance(obj, dict) else None
    return None


def _run_json_command(cmd: Sequence[str]) -> Tuple[Optional[Dict[str, Any]], int, str]:
    proc = subprocess.run(
        list(cmd),
        capture_output=True,
        text=True,
    )
    payload = _extract_json_payload(proc.stdout)
    if payload is None:
        payload = _extract_json_payload(proc.stderr)
    stderr = (proc.stderr or "").strip()
    return payload, int(proc.returncode), stderr


def _load_json(path: Optional[Path]) -> Optional[Dict[str, Any]]:
    if path is None or not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def _parse_finite_float(value: Any) -> Optional[float]:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        num = float(value)
        if num == num and num not in {float("inf"), float("-inf")}:
            return num
    return None


def _parse_ratio(value: Any) -> Optional[float]:
    num = _parse_finite_float(value)
    if num is None:
        return None
    if num < 0.0:
        return 0.0
    if num > 1.0:
        return 1.0
    return num


def _parse_non_negative_int(value: Any) -> Optional[int]:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value if value >= 0 else None
    if isinstance(value, float) and value.is_integer():
        iv = int(value)
        return iv if iv >= 0 else None
    return None


def _count_damage_localizations(profile: Any) -> Tuple[int, int]:
    if not isinstance(profile, dict):
        return (0, 0)

    window_count = 0
    raw_windows = profile.get("damage_segment_windows")
    if isinstance(raw_windows, list):
        for row in raw_windows:
            if not isinstance(row, dict):
                continue
            start = _parse_non_negative_int(row.get("start_segment_id"))
            end = _parse_non_negative_int(row.get("end_segment_id"))
            if start is None or end is None:
                continue
            window_count += 1

    id_count = 0
    raw_ids = profile.get("damaged_segment_ids")
    if isinstance(raw_ids, list):
        seen: Set[int] = set()
        for raw in raw_ids:
            sid = _parse_non_negative_int(raw)
            if sid is None:
                continue
            seen.add(sid)
        id_count = len(seen)

    return (window_count, id_count)


def _collect_confidence_stats(target_ids: Set[str]) -> Dict[str, Any]:
    stage_dir, pattern = STAGE_SPECS["stage06h"]
    root = repo_root() / "data" / stage_dir

    band_counts = {"high": 0, "medium": 0, "low": 0}
    conv_scores: List[float] = []
    video_scores: List[float] = []
    trace_ids: Set[str] = set()

    for trace_path in _iter_files(root, "*.confidence.trace.json"):
        trace_vid = _video_id_for_file(trace_path, allow_json_probe=False)
        if trace_vid and trace_vid in target_ids:
            trace_ids.add(trace_vid)

    for path in _iter_files(root, pattern):
        vid = _video_id_for_file(path, allow_json_probe=False)
        if not vid or vid not in target_ids:
            continue
        data = _load_json(path)
        if not data:
            continue

        summary = data.get("summary")
        if isinstance(summary, dict):
            tier_counts = summary.get("tier_counts")
            if isinstance(tier_counts, dict):
                high = int(tier_counts.get("high", 0) or 0)
                medium = int(tier_counts.get("medium", 0) or 0)
                low = int(tier_counts.get("low", 0) or 0)
                band_counts["high"] += max(high, 0)
                band_counts["medium"] += max(medium, 0)
                band_counts["low"] += max(low, 0)

                total = max(high, 0) + max(medium, 0) + max(low, 0)
                if total > 0:
                    proxy = ((0.90 * high) + (0.65 * medium) + (0.35 * low)) / float(total)
                    video_scores.append(proxy)

        conversation_summaries = data.get("conversation_summaries")
        if isinstance(conversation_summaries, list):
            local_scores: List[float] = []
            for row in conversation_summaries:
                if not isinstance(row, dict):
                    continue
                raw = row.get("conversation_confidence_score")
                if isinstance(raw, (int, float)):
                    value = float(raw)
                    conv_scores.append(value)
                    local_scores.append(value)
            if local_scores:
                video_scores.append(sum(local_scores) / float(len(local_scores)))

    conv_mean = statistics.fmean(conv_scores) if conv_scores else 0.0
    video_mean = statistics.fmean(video_scores) if video_scores else 0.0
    trace_expected = len(target_ids)
    trace_present = len(trace_ids)
    trace_ratio = (trace_present / float(trace_expected)) if trace_expected else 1.0

    return {
        "segment_band_counts": band_counts,
        "conversation_confidence_mean": round(float(conv_mean), 4),
        "video_confidence_mean": round(float(video_mean), 4),
        "trace_files_present": trace_present,
        "trace_files_expected": trace_expected,
        "trace_coverage_ratio": round(float(trace_ratio), 4),
    }


def _collect_chunk_below_floor_ratio(target_ids: Set[str], floor: float = 0.30) -> Tuple[float, str]:
    stage_dir, pattern = STAGE_SPECS["stage09"]
    root = repo_root() / "data" / stage_dir
    scores: List[float] = []
    below = 0
    pref_total = 0
    dropped_total = 0
    telemetry_files = 0

    for path in _iter_files(root, pattern):
        vid = _video_id_for_file(path, allow_json_probe=True)
        if not vid or vid not in target_ids:
            continue
        data = _load_json(path)
        if not data:
            continue

        pref = data.get("preFilterChunkCount")
        dropped = data.get("droppedChunksBelowFloor")
        if isinstance(pref, int) and isinstance(dropped, int) and pref >= 0 and dropped >= 0 and dropped <= pref:
            pref_total += pref
            dropped_total += dropped
            telemetry_files += 1

        chunks = data.get("chunks")
        if not isinstance(chunks, list):
            continue
        for chunk in chunks:
            if not isinstance(chunk, dict):
                continue
            raw = chunk.get("chunk_confidence_score")
            if raw is None:
                meta = chunk.get("metadata")
                if isinstance(meta, dict):
                    raw = meta.get("chunk_confidence_score")
            if isinstance(raw, (int, float)):
                score = float(raw)
                scores.append(score)
                if score < floor:
                    below += 1

    if telemetry_files > 0:
        if pref_total <= 0:
            return 0.0, "pre_filter_chunks"
        return round(dropped_total / float(pref_total), 4), "pre_filter_chunks"

    if not scores:
        return 0.0, "produced_chunks"
    return round(below / float(len(scores)), 4), "produced_chunks"


def _count_legacy_unmapped(
    target_ids: Set[str],
    stage_reports_dir: Optional[Path],
    readiness_summary: Optional[Dict[str, Any]],
) -> int:
    unmapped = 0

    # 06b enums
    verify_root = repo_root() / "data" / "06b.LLM.verify"
    allowed_verdict = {"APPROVE", "FLAG", "REJECT"}
    allowed_conv_verdict = {"OK", "FLAG", "ISSUE"}
    allowed_boundary_severity = {"minor", "moderate", "major"}

    for path in _iter_files(verify_root, "*.verification.json"):
        vid = _video_id_for_file(path, allow_json_probe=False)
        if not vid or vid not in target_ids:
            continue
        data = _load_json(path)
        if not data:
            continue

        verdict = data.get("verdict")
        if isinstance(verdict, str):
            if verdict.strip().upper() not in allowed_verdict:
                unmapped += 1

        convs = data.get("conversation_verdicts")
        if isinstance(convs, list):
            for row in convs:
                if not isinstance(row, dict):
                    continue
                raw = row.get("verdict")
                if isinstance(raw, str):
                    if raw.strip().upper() not in allowed_conv_verdict:
                        unmapped += 1

        boundary = data.get("boundary_issues")
        if isinstance(boundary, list):
            for row in boundary:
                if not isinstance(row, dict):
                    continue
                raw = row.get("severity")
                if isinstance(raw, str):
                    if raw.strip().lower() not in allowed_boundary_severity:
                        unmapped += 1

    # 06f severities
    damage_root = repo_root() / "data" / "06f.DET.damage-map"
    allowed_damage_severity = {"low", "medium", "high"}
    for path in _iter_files(damage_root, "*.damage-map.json"):
        vid = _video_id_for_file(path, allow_json_probe=False)
        if not vid or vid not in target_ids:
            continue
        data = _load_json(path)
        if not data:
            continue
        segments = data.get("segments")
        if isinstance(segments, list):
            for row in segments:
                if not isinstance(row, dict):
                    continue
                raw = row.get("severity")
                if isinstance(raw, str):
                    if raw.strip().lower() not in allowed_damage_severity:
                        unmapped += 1

    # stage report enums
    if stage_reports_dir and stage_reports_dir.exists():
        for path in stage_reports_dir.rglob("*.manifest-validation.report.json"):
            vid = _video_id_for_file(path, allow_json_probe=True)
            if not vid or vid not in target_ids:
                continue
            data = _load_json(path)
            if not data:
                continue
            status = data.get("status")
            if isinstance(status, str):
                if status.strip().upper() not in {"PASS", "WARN", "FAIL"}:
                    unmapped += 1
            checks = data.get("checks")
            if isinstance(checks, list):
                for row in checks:
                    if not isinstance(row, dict):
                        continue
                    sev = row.get("severity")
                    if isinstance(sev, str):
                        if sev.strip().lower() not in {"error", "warning", "info"}:
                            unmapped += 1

    # readiness enums
    if isinstance(readiness_summary, dict):
        videos = readiness_summary.get("videos")
        if isinstance(videos, list):
            for row in videos:
                if not isinstance(row, dict):
                    continue
                vid = row.get("video_id")
                if not isinstance(vid, str) or vid not in target_ids:
                    continue
                status = row.get("status")
                if isinstance(status, str):
                    if status.strip().upper() not in {"READY", "REVIEW", "BLOCKED"}:
                        unmapped += 1

    return unmapped


def _compute_contract_health(
    non_quarantined_ids: Set[str],
    stage_present_ids: Dict[str, Set[str]],
) -> Tuple[int, int]:
    deps: Dict[str, List[str]] = {
        "stage06c": ["stage06", "stage06b"],
        "stage06d": ["stage06c"],
        "stage06e": ["stage06d"],
        "stage06f": ["stage06d"],
        "stage06g": ["stage06f"],
        "stage06h": ["stage06d", "stage06f"],
        "stage07": ["stage06h"],
        "stage09": ["stage07"],
    }

    missing_required_input_count = 0
    silent_pass_count = 0

    for stage_key, dep_keys in deps.items():
        present = stage_present_ids.get(stage_key, set())
        for vid in present:
            if vid not in non_quarantined_ids:
                continue
            missing = [dep for dep in dep_keys if vid not in stage_present_ids.get(dep, set())]
            if missing:
                missing_required_input_count += 1
                silent_pass_count += 1

    return missing_required_input_count, silent_pass_count


def build_scorecard(
    manifest_path: Path,
    source_filter: Optional[str],
    run_id: Optional[str],
    explicit_quarantine_path: Optional[Path],
) -> Dict[str, Any]:
    entries = load_manifest_entries(manifest_path, source_filter=source_filter)
    manifest_ids = {vid for _, _, vid in entries}

    quarantine_ids, quarantine_path = load_quarantine_ids(
        manifest_path=manifest_path,
        source_filter=source_filter,
        explicit_quarantine_path=explicit_quarantine_path,
    )
    quarantined_scope_ids = manifest_ids & quarantine_ids
    non_quarantined_ids = manifest_ids - quarantined_scope_ids

    stage_present_ids: Dict[str, Set[str]] = {}
    for stage_key in STAGE_SPECS.keys():
        stage_present_ids[stage_key] = _collect_stage_video_ids(stage_key)

    coverage: Dict[str, Dict[str, int]] = {}
    for stage_key in (
        "stage06",
        "stage06b",
        "stage06c",
        "stage06d",
        "stage06e",
        "stage06f",
        "stage06g",
        "stage06h",
        "stage07",
        "stage09",
    ):
        present = len(stage_present_ids.get(stage_key, set()) & non_quarantined_ids)
        expected = len(non_quarantined_ids)
        coverage[stage_key] = {"present": present, "expected": expected}

    stage08_report_path = _find_stage08_report_path(manifest_path, source_filter)
    stage08_expected = 1 if len(non_quarantined_ids) > 0 else 0
    coverage["stage08_reports"] = {
        "present": 1 if stage08_report_path and stage08_report_path.exists() else 0,
        "expected": stage08_expected,
    }

    stage_reports_dir = _find_stage_reports_dir(manifest_path, source_filter)
    readiness_summary_path = stage_reports_dir / "readiness-summary.json" if stage_reports_dir else None
    readiness_summary = _load_json(readiness_summary_path)
    canonical_gate_payload, canonical_gate_path = load_canonical_gate_payload(
        manifest_path=manifest_path,
        source_filter=source_filter,
    )

    pass_count = 0
    review_count = 0
    block_count = 0
    readiness_counts: Dict[str, int] = {"pass": 0, "review": 0, "block": 0}
    canonical_counts: Dict[str, int] = {"pass": 0, "review": 0, "block": 0}
    readiness_by_vid: Dict[str, str] = {}
    canonical_by_vid: Dict[str, str] = {}
    decision_mismatch_count = 0
    review_videos_by_content_type: Counter[str] = Counter()
    warning_class_counts_by_content_type: Dict[str, Counter[str]] = {}
    review_budget_by_content_type: Dict[str, Dict[str, int]] = {}
    allow_ingest_statuses: Set[str] = {"READY"}
    readiness_ingest_eligible_count = 0
    readiness_ingest_eligible_by_status: Counter[str] = Counter()
    signal_class_counts: Counter[str] = Counter()
    readiness_damage_profile_count = 0
    readiness_damage_score_sum = 0.0
    readiness_damage_score_max = 0.0
    readiness_severe_ratio_sum = 0.0
    readiness_severe_ratio_max = 0.0
    readiness_damage_review_threshold: Optional[float] = None
    readiness_damage_block_threshold: Optional[float] = None
    readiness_severe_review_threshold: Optional[float] = None
    readiness_severe_block_threshold: Optional[float] = None
    readiness_damage_review_threshold_exceeded = 0
    readiness_damage_block_threshold_exceeded = 0
    readiness_severe_review_threshold_exceeded = 0
    readiness_severe_block_threshold_exceeded = 0
    readiness_damage_positive_score_count = 0
    readiness_damage_positive_score_localized_count = 0
    readiness_damage_positive_score_windowless_count = 0
    readiness_damage_localized_window_video_count = 0
    readiness_damage_localized_id_only_video_count = 0
    readiness_damage_top_videos: List[Dict[str, Any]] = []
    readiness_damage_windowless_top_videos: List[Dict[str, Any]] = []
    gating_source = "none"
    canonical_decision_source: Optional[str] = None
    if isinstance(readiness_summary, dict):
        policy = readiness_summary.get("policy")
        if isinstance(policy, dict):
            raw_allow = policy.get("allow_ingest_statuses")
            if isinstance(raw_allow, list):
                parsed_allow: Set[str] = set()
                for raw_status in raw_allow:
                    if not isinstance(raw_status, str):
                        continue
                    status_norm = raw_status.strip().upper()
                    if status_norm in {"READY", "REVIEW", "BLOCKED"}:
                        parsed_allow.add(status_norm)
                if parsed_allow:
                    allow_ingest_statuses = parsed_allow
            raw_budget = policy.get("review_warning_class_budget_by_content_type")
            if isinstance(raw_budget, dict):
                for raw_ct, raw_map in raw_budget.items():
                    if not isinstance(raw_ct, str):
                        continue
                    ct = raw_ct.strip() or "unknown"
                    if not isinstance(raw_map, dict):
                        continue
                    parsed: Dict[str, int] = {}
                    for raw_cls, raw_limit in raw_map.items():
                        if not isinstance(raw_cls, str):
                            continue
                        cls = raw_cls.strip()
                        if not cls:
                            continue
                        try:
                            limit = int(raw_limit)
                        except Exception:
                            continue
                        parsed[cls] = limit
                    if parsed:
                        review_budget_by_content_type[ct] = parsed
            readiness_damage_review_threshold = _parse_ratio(policy.get("review_video_damage_score"))
            readiness_damage_block_threshold = _parse_ratio(policy.get("block_video_damage_score"))
            readiness_severe_review_threshold = _parse_ratio(policy.get("review_severe_damage_chunk_ratio"))
            readiness_severe_block_threshold = _parse_ratio(policy.get("block_severe_damage_chunk_ratio"))
        videos = readiness_summary.get("videos")
        if isinstance(videos, list):
            for row in videos:
                if not isinstance(row, dict):
                    continue
                vid = row.get("video_id")
                if not isinstance(vid, str) or vid not in non_quarantined_ids:
                    continue
                content_type_raw = row.get("content_type")
                if isinstance(content_type_raw, str) and content_type_raw.strip():
                    content_type = content_type_raw.strip()
                else:
                    content_type = "unknown"
                status = str(row.get("status", "")).strip().upper()
                gate = ""
                if status == "READY":
                    gate = "pass"
                elif status == "REVIEW":
                    gate = "review"
                    review_videos_by_content_type[content_type] += 1
                elif status == "BLOCKED":
                    gate = "block"
                if gate:
                    readiness_counts[gate] += 1
                    readiness_by_vid[vid] = gate
                ready_raw = row.get("ready_for_ingest")
                ready_for_ingest = (
                    bool(ready_raw)
                    if isinstance(ready_raw, bool)
                    else status in allow_ingest_statuses
                )
                if ready_for_ingest:
                    readiness_ingest_eligible_count += 1
                    readiness_ingest_eligible_by_status[status or "UNKNOWN"] += 1
                damage_profile = row.get("damage_profile")
                if isinstance(damage_profile, dict):
                    video_damage_score = _parse_ratio(damage_profile.get("video_damage_score"))
                    severe_ratio = _parse_ratio(damage_profile.get("severe_damage_chunk_ratio"))
                    damaged_segment_count_raw = damage_profile.get("damaged_segment_count")
                    localized_window_count, localized_id_count = _count_damage_localizations(damage_profile)
                    has_localized_windows = localized_window_count > 0
                    has_localized_ids_only = (localized_window_count == 0 and localized_id_count > 0)
                    has_any_localization = has_localized_windows or has_localized_ids_only
                    damaged_segment_count = None
                    if isinstance(damaged_segment_count_raw, int) and damaged_segment_count_raw >= 0:
                        damaged_segment_count = damaged_segment_count_raw

                    if video_damage_score is not None or severe_ratio is not None:
                        readiness_damage_profile_count += 1
                        score_val = float(video_damage_score or 0.0)
                        severe_val = float(severe_ratio or 0.0)
                        readiness_damage_score_sum += score_val
                        readiness_damage_score_max = max(readiness_damage_score_max, score_val)
                        readiness_severe_ratio_sum += severe_val
                        readiness_severe_ratio_max = max(readiness_severe_ratio_max, severe_val)
                        if has_localized_windows:
                            readiness_damage_localized_window_video_count += 1
                        elif has_localized_ids_only:
                            readiness_damage_localized_id_only_video_count += 1
                        if score_val > 0.0:
                            readiness_damage_positive_score_count += 1
                            if has_any_localization:
                                readiness_damage_positive_score_localized_count += 1
                            else:
                                readiness_damage_positive_score_windowless_count += 1
                                readiness_damage_windowless_top_videos.append(
                                    {
                                        "video_id": vid,
                                        "content_type": content_type,
                                        "status": status or "UNKNOWN",
                                        "reason_code": str(row.get("reason_code", "") or ""),
                                        "video_damage_score": round(score_val, 6),
                                        "severe_damage_chunk_ratio": round(severe_val, 6),
                                        "damaged_segment_count": (
                                            damaged_segment_count if damaged_segment_count is not None else 0
                                        ),
                                        "localized_window_count": localized_window_count,
                                        "localized_segment_id_count": localized_id_count,
                                    }
                                )
                        if (
                            readiness_damage_review_threshold is not None
                            and video_damage_score is not None
                            and video_damage_score > readiness_damage_review_threshold
                        ):
                            readiness_damage_review_threshold_exceeded += 1
                        if (
                            readiness_damage_block_threshold is not None
                            and video_damage_score is not None
                            and video_damage_score > readiness_damage_block_threshold
                        ):
                            readiness_damage_block_threshold_exceeded += 1
                        if (
                            readiness_severe_review_threshold is not None
                            and severe_ratio is not None
                            and severe_ratio > readiness_severe_review_threshold
                        ):
                            readiness_severe_review_threshold_exceeded += 1
                        if (
                            readiness_severe_block_threshold is not None
                            and severe_ratio is not None
                            and severe_ratio > readiness_severe_block_threshold
                        ):
                            readiness_severe_block_threshold_exceeded += 1

                        readiness_damage_top_videos.append(
                            {
                                "video_id": vid,
                                "content_type": content_type,
                                "status": status or "UNKNOWN",
                                "reason_code": str(row.get("reason_code", "") or ""),
                                "video_damage_score": round(score_val, 6),
                                "severe_damage_chunk_ratio": round(severe_val, 6),
                                "damaged_segment_count": damaged_segment_count if damaged_segment_count is not None else 0,
                            }
                        )
                check_counts = row.get("check_counts")
                if isinstance(check_counts, dict):
                    warning_classes = check_counts.get("warning_classes")
                    if isinstance(warning_classes, dict):
                        bucket = warning_class_counts_by_content_type.setdefault(content_type, Counter())
                        for raw_cls, raw_count in warning_classes.items():
                            if not isinstance(raw_cls, str):
                                continue
                            cls = raw_cls.strip()
                            if not cls:
                                continue
                            try:
                                count = int(raw_count)
                            except Exception:
                                continue
                            if count > 0:
                                bucket[cls] += count
    if isinstance(canonical_gate_payload, dict):
        summary = canonical_gate_payload.get("summary")
        if isinstance(summary, dict):
            source_raw = summary.get("decision_source")
            if isinstance(source_raw, str) and source_raw.strip():
                canonical_decision_source = source_raw.strip()
        videos = canonical_gate_payload.get("videos")
        if isinstance(videos, list):
            for row in videos:
                if not isinstance(row, dict):
                    continue
                vid = row.get("video_id")
                if not isinstance(vid, str) or vid not in non_quarantined_ids:
                    continue
                gate = str(row.get("gate_decision", "")).strip().lower()
                if gate == "pass":
                    canonical_counts["pass"] += 1
                elif gate == "review":
                    canonical_counts["review"] += 1
                elif gate == "block":
                    canonical_counts["block"] += 1
                if gate in {"pass", "review", "block"}:
                    canonical_by_vid[vid] = gate
                signals = row.get("signals")
                if isinstance(signals, list):
                    for signal in signals:
                        if not isinstance(signal, dict):
                            continue
                        signal_class = str(signal.get("signal_class", "")).strip()
                        if signal_class:
                            signal_class_counts[signal_class] += 1
    if readiness_by_vid:
        pass_count = readiness_counts["pass"]
        review_count = readiness_counts["review"]
        block_count = readiness_counts["block"]
        gating_source = "readiness_summary"
    elif canonical_by_vid:
        pass_count = canonical_counts["pass"]
        review_count = canonical_counts["review"]
        block_count = canonical_counts["block"]
        gating_source = canonical_decision_source or "canonical_gate"

    if readiness_by_vid and canonical_by_vid:
        shared = sorted(set(readiness_by_vid.keys()) & set(canonical_by_vid.keys()))
        for vid in shared:
            if readiness_by_vid[vid] != canonical_by_vid[vid]:
                decision_mismatch_count += 1

    # Validator-backed quality metrics
    validation_dir = repo_root() / "scripts" / "training-data" / "validation"
    source_args = ["--source", source_filter] if source_filter else []

    cross_data, _, _ = _run_json_command(
        [
            sys.executable,
            str(validation_dir / "validate_cross_stage.py"),
            "--manifest",
            str(manifest_path),
            *source_args,
            "--json",
        ]
    )
    cross_summary = cross_data.get("summary", {}) if isinstance(cross_data, dict) else {}
    cross_total = int(cross_summary.get("total_checks", 0) or 0)
    cross_errors = int(cross_summary.get("errors", 0) or 0)
    cross_stage_error_rate = round((cross_errors / float(cross_total)) if cross_total > 0 else 0.0, 4)

    manifest_data, _, _ = _run_json_command(
        [
            sys.executable,
            str(validation_dir / "validate_manifest.py"),
            "--manifest",
            str(manifest_path),
            *source_args,
            "--json",
        ]
    )
    stage07_val = manifest_data.get("stage07_validation", {}) if isinstance(manifest_data, dict) else {}
    stage07_validation_error_count = int(stage07_val.get("errors", 0) or 0)
    stage07_validation_warning_count = int(stage07_val.get("warnings", 0) or 0)

    chunks_data, _, _ = _run_json_command(
        [
            sys.executable,
            str(validation_dir / "validate_chunks.py"),
            "--manifest",
            str(manifest_path),
            *source_args,
            "--json",
        ]
    )
    chunks_issues = chunks_data.get("issues_summary", {}) if isinstance(chunks_data, dict) else {}
    chunk_validation_error_count = int(chunks_issues.get("errors", 0) or 0)

    gate_contract_parse_failures = 0
    if stage_reports_dir and stage_reports_dir.exists():
        stage_report_data, _, _ = _run_json_command(
            [
                sys.executable,
                str(validation_dir / "validate_stage_report.py"),
                "--dir",
                str(stage_reports_dir),
                "--manifest",
                str(manifest_path),
                *source_args,
                "--json",
            ]
        )
        if isinstance(stage_report_data, dict):
            issues_summary = stage_report_data.get("issues_summary", {})
            if isinstance(issues_summary, dict):
                gate_contract_parse_failures = int(issues_summary.get("errors", 0) or 0)

    confidence = _collect_confidence_stats(non_quarantined_ids)
    below_floor_drop_ratio, below_floor_drop_ratio_basis = _collect_chunk_below_floor_ratio(
        non_quarantined_ids,
        floor=0.30,
    )

    missing_required_input_count, silent_pass_count = _compute_contract_health(
        non_quarantined_ids=non_quarantined_ids,
        stage_present_ids=stage_present_ids,
    )

    legacy_unmapped_enum_count = _count_legacy_unmapped(
        target_ids=non_quarantined_ids,
        stage_reports_dir=stage_reports_dir,
        readiness_summary=readiness_summary,
    )

    readiness_damage_top_videos_sorted = sorted(
        readiness_damage_top_videos,
        key=lambda row: float(row.get("video_damage_score", 0.0) or 0.0),
        reverse=True,
    )[:10]
    readiness_damage_windowless_top_videos_sorted = sorted(
        readiness_damage_windowless_top_videos,
        key=lambda row: float(row.get("video_damage_score", 0.0) or 0.0),
        reverse=True,
    )[:10]
    readiness_damage_mean_score = (
        round(readiness_damage_score_sum / float(readiness_damage_profile_count), 6)
        if readiness_damage_profile_count > 0
        else 0.0
    )
    readiness_damage_mean_severe_ratio = (
        round(readiness_severe_ratio_sum / float(readiness_damage_profile_count), 6)
        if readiness_damage_profile_count > 0
        else 0.0
    )
    readiness_damage_windowless_positive_score_ratio = round(
        (
            readiness_damage_positive_score_windowless_count / float(readiness_damage_positive_score_count)
            if readiness_damage_positive_score_count > 0
            else 0.0
        ),
        6,
    )
    if readiness_by_vid:
        ingest_eligible_videos = readiness_ingest_eligible_count
    else:
        ingest_eligible_videos = pass_count
    ingest_eligible_ratio = round(
        (ingest_eligible_videos / float(len(non_quarantined_ids))) if non_quarantined_ids else 0.0,
        6,
    )

    manifest_rel = manifest_path
    try:
        manifest_rel = manifest_path.relative_to(repo_root())
    except Exception:
        pass

    scorecard: Dict[str, Any] = {
        "manifest": str(manifest_rel),
        "source_filter": source_filter,
        "run_id": run_id,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "coverage": coverage,
        "gating": {
            "quarantined_videos": len(quarantined_scope_ids),
            "blocked_videos": block_count,
            "review_videos": review_count,
            "pass_videos": pass_count,
            "ingest_eligible_videos": ingest_eligible_videos,
            "ingest_eligible_ratio": ingest_eligible_ratio,
            "signal_class_counts": dict(signal_class_counts),
            "decision_source": gating_source,
            "canonical_decision_source": canonical_decision_source,
            "readiness_decision_counts": readiness_counts,
            "canonical_decision_counts": canonical_counts,
            "decision_mismatch_count": decision_mismatch_count,
            "review_videos_by_content_type": {
                ct: int(review_videos_by_content_type.get(ct, 0))
                for ct in sorted(review_videos_by_content_type)
            },
            "warning_class_counts_by_content_type": {
                ct: {
                    cls: int(count)
                    for cls, count in sorted(counter.items())
                }
                for ct, counter in sorted(warning_class_counts_by_content_type.items())
            },
            "review_budget_by_content_type": {
                ct: {
                    cls: int(limit)
                    for cls, limit in sorted(class_map.items())
                }
                for ct, class_map in sorted(review_budget_by_content_type.items())
            },
            "allow_ingest_statuses": sorted(allow_ingest_statuses),
            "readiness_ingest_eligible_by_status": {
                status: int(readiness_ingest_eligible_by_status.get(status, 0))
                for status in sorted(readiness_ingest_eligible_by_status)
            },
            "readiness_damage": {
                "videos_with_profile": readiness_damage_profile_count,
                "mean_video_damage_score": readiness_damage_mean_score,
                "max_video_damage_score": round(readiness_damage_score_max, 6),
                "mean_severe_damage_chunk_ratio": readiness_damage_mean_severe_ratio,
                "max_severe_damage_chunk_ratio": round(readiness_severe_ratio_max, 6),
                "videos_with_positive_damage_score": readiness_damage_positive_score_count,
                "videos_with_localized_damage_windows": readiness_damage_localized_window_video_count,
                "videos_with_localized_damage_segment_ids_only": readiness_damage_localized_id_only_video_count,
                "positive_damage_videos_with_localization": readiness_damage_positive_score_localized_count,
                "positive_damage_videos_without_localized_windows": readiness_damage_positive_score_windowless_count,
                "positive_damage_windowless_ratio": readiness_damage_windowless_positive_score_ratio,
                "policy_thresholds": {
                    "review_video_damage_score": readiness_damage_review_threshold,
                    "block_video_damage_score": readiness_damage_block_threshold,
                    "review_severe_damage_chunk_ratio": readiness_severe_review_threshold,
                    "block_severe_damage_chunk_ratio": readiness_severe_block_threshold,
                },
                "threshold_exceeded_videos": {
                    "review_video_damage_score": readiness_damage_review_threshold_exceeded,
                    "block_video_damage_score": readiness_damage_block_threshold_exceeded,
                    "review_severe_damage_chunk_ratio": readiness_severe_review_threshold_exceeded,
                    "block_severe_damage_chunk_ratio": readiness_severe_block_threshold_exceeded,
                },
                "top_windowless_damage_scores": readiness_damage_windowless_top_videos_sorted,
                "top_video_damage_scores": readiness_damage_top_videos_sorted,
            },
        },
        "quality": {
            "cross_stage_error_rate": cross_stage_error_rate,
            "stage07_validation_error_count": stage07_validation_error_count,
            "stage07_validation_warning_count": stage07_validation_warning_count,
        },
        "confidence": confidence,
        "retrieval": {
            "chunk_validation_error_count": chunk_validation_error_count,
            "below_floor_drop_ratio": below_floor_drop_ratio,
            "below_floor_drop_ratio_basis": below_floor_drop_ratio_basis,
        },
        "contract_health": {
            "missing_required_input_count": missing_required_input_count,
            "silent_pass_count": silent_pass_count,
            "legacy_unmapped_enum_count": legacy_unmapped_enum_count,
            "gate_contract_parse_failures": gate_contract_parse_failures,
        },
        "inputs": {
            "video_count_manifest": len(manifest_ids),
            "video_count_non_quarantined": len(non_quarantined_ids),
            "quarantine_file": str(quarantine_path) if quarantine_path else None,
            "canonical_gate": str(canonical_gate_path) if canonical_gate_path else None,
            "gating_source": gating_source,
            "stage_reports_dir": str(stage_reports_dir) if stage_reports_dir else None,
            "readiness_summary": str(readiness_summary_path) if readiness_summary_path else None,
            "stage08_report": str(stage08_report_path) if stage08_report_path else None,
        },
    }
    return scorecard


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a pipeline quality scorecard")
    parser.add_argument("--manifest", required=True, help="Manifest file path (e.g., docs/pipeline/batches/P002.9.txt)")
    parser.add_argument("--source", help="Optional source filter for manifest scope")
    parser.add_argument("--run-id", help="Optional run identifier for provenance")
    parser.add_argument("--out", help="Output path for scorecard JSON")
    parser.add_argument("--quarantine-file", help="Explicit quarantine file path")
    parser.add_argument(
        "--max-positive-damage-windowless-ratio",
        type=float,
        help="Alert/fail threshold for readiness_damage.positive_damage_windowless_ratio (0..1).",
    )
    parser.add_argument(
        "--fail-on-alerts",
        action="store_true",
        help="Exit non-zero if any configured alert threshold is exceeded.",
    )
    return parser.parse_args()


def _apply_alerts(
    scorecard: Dict[str, Any],
    *,
    max_positive_damage_windowless_ratio: Optional[float],
) -> List[Dict[str, Any]]:
    alerts: List[Dict[str, Any]] = []
    gating = scorecard.get("gating")
    gating = gating if isinstance(gating, dict) else {}
    readiness_damage = gating.get("readiness_damage")
    if not isinstance(readiness_damage, dict):
        readiness_damage = {}

    metric = _parse_ratio(readiness_damage.get("positive_damage_windowless_ratio"))
    if max_positive_damage_windowless_ratio is not None and metric is not None and metric > max_positive_damage_windowless_ratio:
        alerts.append(
            {
                "id": "positive_damage_windowless_ratio",
                "severity": "review",
                "metric_path": "gating.readiness_damage.positive_damage_windowless_ratio",
                "metric_value": round(metric, 6),
                "threshold_max": round(float(max_positive_damage_windowless_ratio), 6),
                "message": (
                    "Positive-damage videos without localized windows exceed threshold; "
                    "localization coverage likely regressed."
                ),
            }
        )

    readiness_damage["alerts"] = alerts
    gating["readiness_damage"] = readiness_damage
    scorecard["gating"] = gating
    scorecard["alerts"] = alerts
    return alerts


def main() -> None:
    args = parse_args()
    if (
        args.max_positive_damage_windowless_ratio is not None
        and not (0.0 <= float(args.max_positive_damage_windowless_ratio) <= 1.0)
    ):
        raise SystemExit(f"{LOG_PREFIX} --max-positive-damage-windowless-ratio must be within [0,1]")

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

    scorecard = build_scorecard(
        manifest_path=manifest_path,
        source_filter=args.source,
        run_id=args.run_id,
        explicit_quarantine_path=quarantine_path,
    )
    alerts = _apply_alerts(
        scorecard,
        max_positive_damage_windowless_ratio=(
            float(args.max_positive_damage_windowless_ratio)
            if args.max_positive_damage_windowless_ratio is not None
            else None
        ),
    )

    output_path: Optional[Path] = None
    if args.out:
        output_path = Path(args.out)
        if not output_path.is_absolute():
            output_path = repo_root() / output_path
    elif args.run_id:
        output_path = repo_root() / "data" / "validation" / "runs" / args.run_id / "scorecard.json"

    if output_path is not None:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(scorecard, indent=2) + "\n", encoding="utf-8")
        print(f"{LOG_PREFIX} Scorecard written: {output_path}", file=sys.stderr)

    print(json.dumps(scorecard, indent=2))
    if args.fail_on_alerts and alerts:
        print(f"{LOG_PREFIX} Alerts triggered: {len(alerts)}", file=sys.stderr)
        raise SystemExit(2)


if __name__ == "__main__":
    main()
