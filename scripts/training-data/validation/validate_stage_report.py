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
SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")

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
SIGNAL_CLASS_ALLOWED = {
    "artifact_contract",
    "contamination_risk",
    "conversation_structure",
    "other_quality",
    "quarantine_gate",
    "routing_mismatch",
    "taxonomy_coverage",
    "transcript_quality",
}
REMEDIATION_PATH_ALLOWED = {
    "contract_repair",
    "conversation_review",
    "manual_review",
    "quarantine",
    "routing_policy_review",
    "taxonomy_review",
    "transcript_review",
}
POLICY_WARNING_BUDGET_EXCLUDED_CHECKS: Set[str] = {
    # These warnings are useful context but should not consume readiness warning budgets.
    "missing_stage01_audio",
    "segment_text_modified",
    "stage07_normalization_repairs",
    "stage07_validation_warnings",
    "stage08_validation_warning",
    "stage08_video_warning",
}

ARTIFACT_KEYS = {"path", "sha256", "bytes"}
CHECK_REQUIRED_KEYS = {"severity", "check", "message"}
CHECK_OPTIONAL_KEYS = {"signal_class", "remediation_path"}
CHECK_KEYS = CHECK_REQUIRED_KEYS | CHECK_OPTIONAL_KEYS
TIMESTAMP_KEYS = {"started_at", "finished_at", "elapsed_sec"}
VERSION_KEYS = {"pipeline_version", "prompt_version", "model", "schema_version", "git_sha"}

DAMAGE_SCORE_MODERATE_THRESHOLD = 0.15
DAMAGE_SCORE_SEVERE_THRESHOLD = 0.30


def _canonical_issue_severity(legacy_severity: str) -> str:
    sev = str(legacy_severity or "").strip().lower()
    if sev in {"critical", "major", "minor", "info"}:
        return sev
    if sev == "error":
        return "major"
    if sev == "warning":
        return "minor"
    return "info"


def _canonical_gate_decision(issue_severity: str) -> str:
    if issue_severity in {"critical", "major"}:
        return "block"
    if issue_severity == "minor":
        return "review"
    return "pass"


def _canonical_gate_from_status(status: str) -> str:
    text = str(status or "").strip().upper()
    if text == "BLOCKED":
        return "block"
    if text == "REVIEW":
        return "review"
    return "pass"


def _safe_name(raw: str) -> str:
    cleaned = SAFE_NAME_RE.sub("_", str(raw or "").strip()).strip("_")
    return cleaned or "report"


def _default_gate_path(
    manifest_path: Optional[Path],
    source_filter: Optional[str],
    report_dir: Optional[Path],
) -> Path:
    if manifest_path is not None:
        root = _repo_root() / "data" / "validation" / "gates"
        stem = _safe_name(manifest_path.stem)
        if source_filter:
            stem = _safe_name(f"{stem}.{source_filter}")
        return root / f"{stem}.gate.json"
    if report_dir is not None:
        return report_dir / "canonical-gate.json"
    return Path("canonical-gate.json")


def _canonical_issue_code(raw: str) -> str:
    text = re.sub(r"[^a-z0-9_]+", "_", str(raw or "").strip().lower()).strip("_")
    return text or "unspecified_issue"


def _remediation_path_for_signal_class(signal_class: str) -> str:
    mapping = {
        "artifact_contract": "contract_repair",
        "contamination_risk": "transcript_review",
        "conversation_structure": "conversation_review",
        "other_quality": "manual_review",
        "quarantine_gate": "quarantine",
        "routing_mismatch": "routing_policy_review",
        "taxonomy_coverage": "taxonomy_review",
        "transcript_quality": "transcript_review",
    }
    return mapping.get(signal_class, "manual_review")


def _parse_counter_mapping(raw: Any) -> Counter[str]:
    out: Counter[str] = Counter()
    if not isinstance(raw, dict):
        return out
    for key, value in raw.items():
        if not isinstance(key, str):
            continue
        label = key.strip()
        if not label:
            continue
        count: Optional[int] = None
        if isinstance(value, bool):
            count = None
        elif isinstance(value, int):
            count = value
        elif isinstance(value, float) and value.is_integer():
            count = int(value)
        elif isinstance(value, str) and value.strip().isdigit():
            count = int(value.strip())
        if count is None or count <= 0:
            continue
        out[label] += count
    return out


def _signal_class_for_readiness_reason(reason_code: str, warning_classes: Counter[str]) -> str:
    reason = str(reason_code or "").strip()
    if reason in {"preexisting_quarantine", "stage06b_reject", "quarantined"}:
        return "quarantine_gate"
    if reason in {"stage06b_flag_low_transcript_quality", "stage06b_flag_severe"}:
        return "transcript_quality"
    if reason == "stage06b_contract_preflight_fail":
        return "artifact_contract"
    if reason in SIGNAL_CLASS_ALLOWED:
        return reason
    if reason.startswith("policy_block_warning_class:"):
        candidate = reason.split(":", 1)[1].strip()
        if candidate in SIGNAL_CLASS_ALLOWED:
            return candidate
    if reason.startswith("policy_warning_class_budget_exceeded:"):
        parts = reason.split(":")
        if len(parts) >= 2 and parts[1] in SIGNAL_CLASS_ALLOWED:
            return parts[1]
    if reason.startswith("policy_block_warning_class_by_content_type:"):
        parts = reason.split(":")
        if len(parts) >= 3 and parts[2] in SIGNAL_CLASS_ALLOWED:
            return parts[2]
    if reason.startswith("policy_block_warning_check:"):
        chk = reason.split(":", 1)[1].strip()
        return _warning_class_for_check(chk)
    if reason.startswith("policy_warning_check_budget_exceeded:"):
        parts = reason.split(":")
        if len(parts) >= 2:
            return _warning_class_for_check(parts[1])
    if reason.startswith("policy_block_video_damage_score:") or reason.startswith("policy_review_video_damage_score:"):
        return "transcript_quality"
    if reason.startswith("policy_block_damaged_segment_count:") or reason.startswith("policy_review_damaged_segment_count:"):
        return "transcript_quality"
    if reason.startswith("policy_block_windowless_video_damage_score:") or reason.startswith("policy_review_windowless_video_damage_score:"):
        return "transcript_quality"
    if reason.startswith("policy_block_severe_damage_chunk_ratio:") or reason.startswith("policy_review_severe_damage_chunk_ratio:"):
        return "transcript_quality"
    if reason in {"missing_stage_report", "invalid_stage_report", "report_fail"}:
        return "artifact_contract"
    if warning_classes:
        return sorted(warning_classes.items(), key=lambda item: (-item[1], item[0]))[0][0]
    return "other_quality"


def _canonical_signals_from_readiness_video(video: Dict[str, Any]) -> List[Dict[str, Any]]:
    vid = str(video.get("video_id", "")).strip()
    status = str(video.get("status", "")).strip().upper()
    gate = _canonical_gate_from_status(status)
    reason_code = str(video.get("reason_code", "")).strip() or "unspecified_reason"
    check_counts = video.get("check_counts")
    warning_classes = Counter()
    if isinstance(check_counts, dict):
        warning_classes = _parse_counter_mapping(check_counts.get("warning_classes"))
    signal_class = _signal_class_for_readiness_reason(reason_code, warning_classes)
    issue_severity = "major" if gate == "block" else ("minor" if gate == "review" else "info")

    signals: List[Dict[str, Any]] = []
    if not (gate == "pass" and reason_code == "ok"):
        signals.append(
            {
                "issue_code": _canonical_issue_code(f"readiness_{reason_code}"),
                "issue_severity": issue_severity,
                "gate_decision": gate,
                "scope_type": "video",
                "origin_stage": "stage-report-validation",
                "video_id": vid,
                "signal_class": signal_class,
                "remediation_path": _remediation_path_for_signal_class(signal_class),
                "message": f"Readiness status={status or 'UNKNOWN'} reason={reason_code}",
                "legacy": {
                    "status": status,
                    "reason_code": reason_code,
                },
            }
        )

    for cls in sorted(warning_classes):
        if cls not in SIGNAL_CLASS_ALLOWED:
            continue
        count = int(warning_classes.get(cls, 0))
        if count <= 0:
            continue
        warning_gate = "pass" if gate == "pass" else "review"
        warning_severity = "info" if warning_gate == "pass" else "minor"
        signals.append(
            {
                "issue_code": _canonical_issue_code(f"warning_class_{cls}"),
                "issue_severity": warning_severity,
                "gate_decision": warning_gate,
                "scope_type": "video",
                "origin_stage": "stage-report-validation",
                "video_id": vid,
                "signal_class": cls,
                "remediation_path": _remediation_path_for_signal_class(cls),
                "message": f"Stage-report warning class '{cls}' count={count}",
                "legacy": {
                    "status": status,
                    "reason_code": reason_code,
                    "count": count,
                },
            }
        )
    return signals


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


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _parse_number(value: Any) -> Optional[float]:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        num = float(value)
        if num == num and num not in {float("inf"), float("-inf")}:
            return num
    return None


def _extract_video_id_from_chunks_path(path: Path) -> Optional[str]:
    name = path.name
    if name.endswith(".chunks.json"):
        candidate = name[: -len(".chunks.json")]
        if VIDEO_ID_RE.fullmatch(candidate):
            return candidate
    return _video_id_from_filename_hint(path)


def _merge_segment_windows(
    windows: List[Tuple[int, int, int]],
) -> List[Dict[str, int]]:
    if not windows:
        return []
    merged: List[Tuple[int, int, int]] = []
    for start, end, damaged in sorted(windows, key=lambda row: (row[0], row[1])):
        if not merged:
            merged.append((start, end, max(1, damaged)))
            continue
        p_start, p_end, p_damaged = merged[-1]
        if start <= p_end + 1:
            merged[-1] = (p_start, max(p_end, end), p_damaged + max(1, damaged))
        else:
            merged.append((start, end, max(1, damaged)))
    return [
        {
            "start_segment_id": start,
            "end_segment_id": end,
            "damaged_segment_count": damaged,
        }
        for start, end, damaged in merged
    ]


def _build_damage_segment_windows(segment_ids: List[int], *, context_radius: int = 1) -> List[Dict[str, int]]:
    if not segment_ids:
        return []
    unique_ids = sorted({sid for sid in segment_ids if isinstance(sid, int)})
    if not unique_ids:
        return []
    windows: List[Tuple[int, int, int]] = []
    for sid in unique_ids:
        start = sid - max(0, context_radius)
        end = sid + max(0, context_radius)
        windows.append((start, end, 1))
    return _merge_segment_windows(windows)


def _parse_damage_segment_windows(raw_windows: Any) -> List[Dict[str, int]]:
    windows: List[Tuple[int, int, int]] = []
    if not isinstance(raw_windows, list):
        return []
    for row in raw_windows:
        if not isinstance(row, dict):
            continue
        start = row.get("start_segment_id")
        end = row.get("end_segment_id")
        if not isinstance(start, int) or not isinstance(end, int):
            continue
        if end < start:
            start, end = end, start
        raw_count = row.get("damaged_segment_count")
        if isinstance(raw_count, int) and raw_count > 0:
            damaged_count = raw_count
        else:
            damaged_count = max(1, end - start + 1)
        windows.append((start, end, damaged_count))
    return _merge_segment_windows(windows)


def _derive_damage_profile_from_chunks_data(data: Dict[str, Any]) -> Dict[str, Any]:
    chunks = data.get("chunks")
    if not isinstance(chunks, list):
        chunks = []

    quality_profile = data.get("qualityProfile")
    profile_source = "chunks_derived"
    if isinstance(quality_profile, dict):
        profile_source = "qualityProfile"

    chunk_count = len(chunks)
    scored_chunks = 0
    chunk_scores: List[float] = []
    damaged_chunk_count = 0
    moderate_damage_chunk_count = 0
    severe_damage_chunk_count = 0
    damaged_segment_ids: Set[int] = set()
    windows: List[Dict[str, int]] = []

    for chunk in chunks:
        if not isinstance(chunk, dict):
            continue
        metadata = chunk.get("metadata")
        if not isinstance(metadata, dict):
            continue

        score_num = _parse_number(metadata.get("damage_score"))
        if score_num is None:
            confidence_num = _parse_number(metadata.get("chunk_confidence_score"))
            if confidence_num is not None:
                score_num = 1.0 - confidence_num
        if score_num is not None:
            score = _clamp01(score_num)
            chunk_scores.append(score)
            scored_chunks += 1
            if score > 0.0:
                damaged_chunk_count += 1
            if score >= DAMAGE_SCORE_MODERATE_THRESHOLD:
                moderate_damage_chunk_count += 1
            if score >= DAMAGE_SCORE_SEVERE_THRESHOLD:
                severe_damage_chunk_count += 1

        raw_ids = metadata.get("damaged_segment_ids")
        if isinstance(raw_ids, list):
            for raw_id in raw_ids:
                if isinstance(raw_id, int):
                    damaged_segment_ids.add(raw_id)

        windows.extend(_parse_damage_segment_windows(metadata.get("damage_segment_windows")))

    if chunk_scores:
        video_damage_score = sum(chunk_scores) / len(chunk_scores)
    else:
        video_damage_score = 0.0

    if chunk_count > 0:
        damaged_chunk_ratio = damaged_chunk_count / chunk_count
        moderate_damage_chunk_ratio = moderate_damage_chunk_count / chunk_count
        severe_damage_chunk_ratio = severe_damage_chunk_count / chunk_count
        score_coverage = scored_chunks / chunk_count
    else:
        damaged_chunk_ratio = 0.0
        moderate_damage_chunk_ratio = 0.0
        severe_damage_chunk_ratio = 0.0
        score_coverage = 0.0

    if not windows and damaged_segment_ids:
        windows = _build_damage_segment_windows(sorted(damaged_segment_ids), context_radius=1)
    elif windows:
        windows = _parse_damage_segment_windows(windows)

    if isinstance(quality_profile, dict):
        num = _parse_number(quality_profile.get("video_damage_score"))
        if num is not None:
            video_damage_score = _clamp01(num)

        chunk_count_num = quality_profile.get("chunk_count")
        if isinstance(chunk_count_num, int) and chunk_count_num >= 0:
            chunk_count = chunk_count_num

        damaged_count_num = quality_profile.get("damaged_chunk_count")
        if isinstance(damaged_count_num, int) and damaged_count_num >= 0:
            damaged_chunk_count = damaged_count_num

        ratio_num = _parse_number(quality_profile.get("damaged_chunk_ratio"))
        if ratio_num is not None:
            damaged_chunk_ratio = _clamp01(ratio_num)

        raw_profile_ids = quality_profile.get("damaged_segment_ids")
        if isinstance(raw_profile_ids, list):
            profile_ids = sorted({sid for sid in raw_profile_ids if isinstance(sid, int)})
            if profile_ids:
                damaged_segment_ids = set(profile_ids)

        profile_windows = _parse_damage_segment_windows(quality_profile.get("damage_segment_windows"))
        if profile_windows:
            windows = profile_windows

    if moderate_damage_chunk_count <= 0 and chunk_count > 0:
        moderate_damage_chunk_count = int(round(moderate_damage_chunk_ratio * chunk_count))
    if severe_damage_chunk_count <= 0 and chunk_count > 0:
        severe_damage_chunk_count = int(round(severe_damage_chunk_ratio * chunk_count))

    return {
        "profile_source": profile_source,
        "chunk_count": chunk_count,
        "scored_chunk_count": scored_chunks,
        "missing_score_chunk_count": max(0, chunk_count - scored_chunks),
        "score_coverage": round(score_coverage, 6),
        "video_damage_score": round(video_damage_score, 6),
        "damaged_chunk_count": max(0, damaged_chunk_count),
        "damaged_chunk_ratio": round(_clamp01(damaged_chunk_ratio), 6),
        "moderate_damage_chunk_count": max(0, moderate_damage_chunk_count),
        "moderate_damage_chunk_ratio": round(_clamp01(moderate_damage_chunk_ratio), 6),
        "severe_damage_chunk_count": max(0, severe_damage_chunk_count),
        "severe_damage_chunk_ratio": round(_clamp01(severe_damage_chunk_ratio), 6),
        "damaged_segment_count": len(damaged_segment_ids),
        "damaged_segment_ids": sorted(damaged_segment_ids),
        "damage_segment_windows": windows,
    }


def _index_stage09_chunks_by_video(
    report_records: List[ReportRecord],
    source_filter: Optional[str],
    expected_video_ids: Optional[Set[str]] = None,
) -> Dict[str, Path]:
    index: Dict[str, Path] = {}
    chunks_root = _repo_root() / "data" / "09.EXT.chunks"
    if not chunks_root.is_dir():
        return index

    candidate_sources: Set[str] = set()
    if isinstance(source_filter, str) and source_filter.strip():
        candidate_sources.add(source_filter.strip())
    for rec in report_records:
        source = rec.data.get("source")
        if isinstance(source, str) and source.strip():
            candidate_sources.add(source.strip())

    roots: List[Path] = []
    if candidate_sources:
        for source in sorted(candidate_sources):
            src_root = chunks_root / source
            if src_root.is_dir():
                roots.append(src_root)
    else:
        roots.append(chunks_root)

    for root in roots:
        for path in sorted(root.rglob("*.chunks.json")):
            vid = _extract_video_id_from_chunks_path(path)
            if not vid:
                continue
            if vid not in index:
                index[vid] = path

    missing_expected = set(expected_video_ids or set()) - set(index.keys())

    # Fallback global scan only for unresolved ids (or when no explicit expectation exists).
    if roots != [chunks_root] and (not expected_video_ids or missing_expected):
        for path in sorted(chunks_root.rglob("*.chunks.json")):
            vid = _extract_video_id_from_chunks_path(path)
            if not vid or vid in index:
                continue
            if expected_video_ids and vid not in missing_expected:
                continue
            index[vid] = path
            if expected_video_ids:
                missing_expected.discard(vid)
                if not missing_expected:
                    break

    return index


def _resolve_damage_profile(
    video_id: str,
    chunks_by_video: Dict[str, Path],
) -> Optional[Dict[str, Any]]:
    chunks_path = chunks_by_video.get(video_id)
    if not chunks_path:
        return None
    payload = _load_json(chunks_path)
    if not isinstance(payload, dict):
        return {
            "chunks_path": str(chunks_path),
            "profile_source": "unreadable_chunks",
            "chunk_count": 0,
            "scored_chunk_count": 0,
            "missing_score_chunk_count": 0,
            "score_coverage": 0.0,
            "video_damage_score": 1.0,
            "damaged_chunk_count": 0,
            "damaged_chunk_ratio": 0.0,
            "moderate_damage_chunk_count": 0,
            "moderate_damage_chunk_ratio": 0.0,
            "severe_damage_chunk_count": 0,
            "severe_damage_chunk_ratio": 0.0,
            "damaged_segment_count": 0,
            "damaged_segment_ids": [],
            "damage_segment_windows": [],
        }

    profile = _derive_damage_profile_from_chunks_data(payload)
    profile["chunks_path"] = str(chunks_path)
    profile["channel"] = payload.get("channel") if isinstance(payload.get("channel"), str) else None
    return profile


def _damage_profile_has_localized_damage(profile: Any) -> bool:
    if not isinstance(profile, dict):
        return False
    raw_windows = profile.get("damage_segment_windows")
    if isinstance(raw_windows, list):
        for row in raw_windows:
            if not isinstance(row, dict):
                continue
            start = _parse_number(row.get("start_segment_id"))
            end = _parse_number(row.get("end_segment_id"))
            if start is not None and end is not None:
                return True
    raw_ids = profile.get("damaged_segment_ids")
    if isinstance(raw_ids, list):
        for raw in raw_ids:
            if _parse_number(raw) is not None:
                return True
    return False


def _default_quarantine_candidates(manifest_path: Path, source_filter: Optional[str]) -> List[Path]:
    root = _repo_root() / "data" / "validation" / "quarantine"
    stem = _safe_name(manifest_path.stem)
    candidates: List[Path] = []
    if source_filter:
        candidates.append(root / f"{stem}.{_safe_name(source_filter)}.json")
    candidates.append(root / f"{stem}.json")
    return candidates


def _load_quarantine_ids(quarantine_path: Path) -> Set[str]:
    payload = _load_json(quarantine_path)
    if not isinstance(payload, dict):
        raise ValueError("quarantine file is not a JSON object")

    for key in ("quarantined_video_ids", "video_ids"):
        raw = payload.get(key)
        if isinstance(raw, list):
            out: Set[str] = set()
            for item in raw:
                if not isinstance(item, str):
                    continue
                vid = item.strip()
                if VIDEO_ID_RE.fullmatch(vid):
                    out.add(vid)
            return out
    return set()


def _resolve_quarantine_ids(
    *,
    manifest_path: Optional[Path],
    source_filter: Optional[str],
    explicit_quarantine_path: Optional[Path],
) -> Tuple[Set[str], Optional[Path]]:
    candidates: List[Path] = []
    if explicit_quarantine_path is not None:
        candidates.append(explicit_quarantine_path)
    elif manifest_path is not None:
        candidates.extend(_default_quarantine_candidates(manifest_path, source_filter))

    for path in candidates:
        if not path.exists():
            if explicit_quarantine_path is not None:
                raise ValueError(f"Quarantine file not found: {path}")
            continue
        ids = _load_quarantine_ids(path)
        return ids, path
    return set(), None


def _load_content_type_from_conversations(path: Path) -> Optional[str]:
    data = _load_json(path)
    if not isinstance(data, dict):
        return None
    # Stage 06 stores this under `video_type`; policy terminology uses
    # "content type" to avoid ambiguity with ingest lanes.
    raw = data.get("video_type")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    if isinstance(raw, dict):
        raw_type = raw.get("type")
        if isinstance(raw_type, str) and raw_type.strip():
            return raw_type.strip()
    return None


def _resolve_content_type(video_id: str, recs: List[ReportRecord]) -> Optional[str]:
    """
    Resolve Stage 06/06c content type for a video_id, preferring source/stem paths
    referenced by the stage reports and falling back to id-based search.
    """
    data_root = _repo_root() / "data"
    stage_dirs = ("06c.DET.patched", "06.LLM.video-type")

    for rec in recs:
        source = rec.data.get("source")
        stem = rec.data.get("stem")
        if not isinstance(source, str) or not source.strip():
            continue
        if not isinstance(stem, str) or not stem.strip():
            continue
        source = source.strip()
        stem = stem.strip()
        for stage_dir in stage_dirs:
            source_root = data_root / stage_dir / source
            stem_dir = source_root / stem
            if stem_dir.is_dir():
                for path in sorted(stem_dir.glob("*.conversations.json")):
                    content_type = _load_content_type_from_conversations(path)
                    if content_type:
                        return content_type
            if source_root.is_dir():
                for path in source_root.rglob(f"*{video_id}*.conversations.json"):
                    content_type = _load_content_type_from_conversations(path)
                    if content_type:
                        return content_type

    for stage_dir in stage_dirs:
        stage_root = data_root / stage_dir
        if not stage_root.is_dir():
            continue
        for path in stage_root.rglob(f"*{video_id}*.conversations.json"):
            content_type = _load_content_type_from_conversations(path)
            if content_type:
                return content_type
    return None


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


def _parse_content_type_warning_class_budget(raw: str) -> Tuple[str, str, int]:
    """
    Parse '<content_type>:<warning_class>=<max>' into (content_type, warning_class, max).
    """
    text = str(raw).strip()
    if not text:
        raise ValueError("empty value")
    if "=" not in text:
        raise ValueError("expected '<content_type>:<warning_class>=<max>'")
    left, budget_raw = text.split("=", 1)
    left = left.strip()
    budget_raw = budget_raw.strip()
    if ":" not in left:
        raise ValueError("expected '<content_type>:<warning_class>=<max>'")
    content_type, warning_class = left.split(":", 1)
    content_type = content_type.strip()
    warning_class = warning_class.strip()
    if not content_type:
        raise ValueError("missing content_type")
    if not warning_class:
        raise ValueError("missing warning_class")
    if not budget_raw.isdigit():
        raise ValueError("max must be an integer >= 0")
    return content_type, warning_class, int(budget_raw)


def _parse_content_type_warning_class(raw: str) -> Tuple[str, str]:
    """
    Parse '<content_type>:<warning_class>' into (content_type, warning_class).
    """
    text = str(raw).strip()
    if not text:
        raise ValueError("empty value")
    if ":" not in text:
        raise ValueError("expected '<content_type>:<warning_class>'")
    content_type, warning_class = text.split(":", 1)
    content_type = content_type.strip()
    warning_class = warning_class.strip()
    if not content_type:
        raise ValueError("missing content_type")
    if not warning_class:
        raise ValueError("missing warning_class")
    return content_type, warning_class


def _parse_content_type_ratio_threshold(raw: str) -> Tuple[str, float]:
    """
    Parse '<content_type>=<ratio>' into (content_type, ratio).
    """
    text = str(raw).strip()
    if not text:
        raise ValueError("empty value")
    if "=" not in text:
        raise ValueError("expected '<content_type>=<ratio>'")
    content_type, ratio_raw = text.split("=", 1)
    content_type = content_type.strip()
    ratio_raw = ratio_raw.strip()
    if not content_type:
        raise ValueError("missing content_type")
    try:
        ratio = float(ratio_raw)
    except Exception as exc:
        raise ValueError("ratio must be numeric within [0,1]") from exc
    if not (0.0 <= ratio <= 1.0):
        raise ValueError("ratio must be within [0,1]")
    return content_type, ratio


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


def _warning_class_for_check(check: str) -> str:
    chk = str(check or "").strip().lower()
    if not chk:
        return "other_quality"
    if chk in {"stage06b_flag_low_transcript_quality", "stage06b_flag_severe"}:
        return "transcript_quality"
    if chk == "stage06b_contract_preflight_fail":
        return "artifact_contract"
    if chk.startswith("transcript_artifact_"):
        return "contamination_risk"
    if chk in {"transcript_artifact", "segment_text_modified", "stage07_normalization_repairs", "stage07_validation_warnings"}:
        return "transcript_quality"
    if chk in {"stage07_transcript_artifact_risk"}:
        return "contamination_risk"
    if chk in {"prompt_variant_mismatch", "video_type_mismatch"}:
        return "routing_mismatch"
    if chk.startswith("stage08_"):
        return "taxonomy_coverage"
    if chk in {"conversation_not_contiguous", "compilation_with_single_conversation"}:
        return "conversation_structure"
    if chk.startswith("missing_") or chk.startswith("invalid_"):
        return "artifact_contract"
    return "other_quality"


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
    missing = sorted(CHECK_REQUIRED_KEYS - set(item.keys()))
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
    signal_class = item.get("signal_class")
    if signal_class is not None:
        if not isinstance(signal_class, str) or signal_class not in SIGNAL_CLASS_ALLOWED:
            issues.append(
                Issue(
                    "error",
                    path,
                    "check_invalid_signal_class",
                    f"{loc}.signal_class must be one of {sorted(SIGNAL_CLASS_ALLOWED)} when present",
                )
            )
    remediation_path = item.get("remediation_path")
    if remediation_path is not None:
        if not isinstance(remediation_path, str) or remediation_path not in REMEDIATION_PATH_ALLOWED:
            issues.append(
                Issue(
                    "error",
                    path,
                    "check_invalid_remediation_path",
                    f"{loc}.remediation_path must be one of {sorted(REMEDIATION_PATH_ALLOWED)} when present",
                )
            )


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
    quarantine_ids: Set[str],
    quarantine_file: Optional[Path],
    block_warning_checks: Set[str],
    block_warning_classes: Set[str],
    max_warning_checks: Optional[int],
    max_warning_checks_by_type: Dict[str, int],
    max_warning_checks_by_class: Dict[str, int],
    block_warning_class_by_content_type: Dict[str, Set[str]],
    review_warning_class_budget_by_content_type: Dict[str, Dict[str, int]],
    allow_ingest_statuses: Set[str],
    review_video_damage_score: Optional[float],
    block_video_damage_score: Optional[float],
    review_damaged_segment_count: Optional[int],
    block_damaged_segment_count: Optional[int],
    review_damaged_chunk_ratio: Optional[float],
    block_damaged_chunk_ratio: Optional[float],
    review_windowless_video_damage_score: Optional[float],
    block_windowless_video_damage_score: Optional[float],
    review_windowless_video_damage_score_by_content_type: Dict[str, float],
    block_windowless_video_damage_score_by_content_type: Dict[str, float],
    review_severe_damage_chunk_ratio: Optional[float],
    block_severe_damage_chunk_ratio: Optional[float],
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
    by_gate: Counter[str] = Counter()
    allow_ingest = 0
    videos_with_damage_profile = 0
    videos: List[Dict[str, Any]] = []
    allowed_statuses = {
        str(status or "").strip().upper()
        for status in allow_ingest_statuses
        if str(status or "").strip()
    }
    if not allowed_statuses:
        allowed_statuses = {"READY"}
    chunks_by_video = _index_stage09_chunks_by_video(
        report_records,
        source_filter,
        expected_video_ids=set(candidate_ids),
    )

    for vid in candidate_ids:
        recs = reports_by_vid.get(vid, [])
        unreadable = unreadable_by_vid.get(vid, 0)
        invalid_reports = unreadable + sum(1 for r in recs if not r.valid)
        content_type = _resolve_content_type(vid, recs)
        damage_profile = _resolve_damage_profile(vid, chunks_by_video)
        if isinstance(damage_profile, dict):
            videos_with_damage_profile += 1
        is_quarantined = vid in quarantine_ids

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
        warning_signal_class_counts: Counter[str] = Counter()
        policy_warning_signal_class_counts: Counter[str] = Counter()
        policy_warning_checks_by_class: Dict[str, Counter[str]] = defaultdict(Counter)

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
                    raw_signal_class = item.get("signal_class")
                    provided_signal_class = (
                        raw_signal_class
                        if isinstance(raw_signal_class, str) and raw_signal_class in SIGNAL_CLASS_ALLOWED
                        else ""
                    )
                    expanded_warning_counts: Counter[str] = Counter()
                    if chk_name in {"stage07_validation_warnings", "stage07_transcript_artifact_risk"} and isinstance(msg, str):
                        expanded_warning_counts = _parse_stage07_warning_breakdown(msg)

                    if expanded_warning_counts:
                        for sub_check, sub_count in expanded_warning_counts.items():
                            warning_signal_counts[sub_check] += sub_count
                            signal_class = _warning_class_for_check(sub_check)
                            warning_signal_class_counts[signal_class] += sub_count
                            if (
                                chk_name not in POLICY_WARNING_BUDGET_EXCLUDED_CHECKS
                                and sub_check not in POLICY_WARNING_BUDGET_EXCLUDED_CHECKS
                            ):
                                policy_warning_signal_counts[sub_check] += sub_count
                                policy_warning_signal_class_counts[signal_class] += sub_count
                                policy_warning_checks_by_class[signal_class][sub_check] += sub_count
                                policy_warning_checks += sub_count
                    elif chk_name:
                        warning_signal_counts[chk_name] += 1
                        signal_class = provided_signal_class or _warning_class_for_check(chk_name)
                        warning_signal_class_counts[signal_class] += 1
                        if chk_name not in POLICY_WARNING_BUDGET_EXCLUDED_CHECKS:
                            policy_warning_signal_counts[chk_name] += 1
                            policy_warning_signal_class_counts[signal_class] += 1
                            policy_warning_checks_by_class[signal_class][chk_name] += 1
                            policy_warning_checks += 1
                    else:
                        # Unnamed warnings still count against the generic warning budget.
                        signal_class = provided_signal_class or "other_quality"
                        warning_signal_class_counts[signal_class] += 1
                        policy_warning_signal_class_counts[signal_class] += 1
                        policy_warning_checks += 1
                elif sev == "info":
                    info_checks += 1

        review_budget_for_type = (
            review_warning_class_budget_by_content_type.get(content_type, {})
            if content_type
            else {}
        )
        block_warning_classes_for_type = sorted(
            block_warning_class_by_content_type.get(content_type, set())
            if content_type
            else set()
        )
        applied_review_budget = {
            cls: int(limit)
            for cls, limit in sorted(review_budget_for_type.items())
            if isinstance(cls, str) and cls
        }
        review_warning_class_excess: Counter[str] = Counter()
        for cls, seen in policy_warning_signal_class_counts.items():
            budget = int(review_budget_for_type.get(cls, 0) or 0)
            excess = int(seen) - budget
            if excess > 0:
                review_warning_class_excess[cls] = excess
        review_warning_checks = sum(review_warning_class_excess.values())

        if is_quarantined:
            status = "BLOCKED"
            reason_code = "preexisting_quarantine"
        elif vid in missing_manifest_ids:
            status = "BLOCKED"
            reason_code = "missing_stage_report"
        elif invalid_reports > 0:
            status = "BLOCKED"
            reason_code = "invalid_stage_report"
        elif fail_reports > 0 or error_checks > 0:
            status = "BLOCKED"
            reason_code = next((r for r in reasons if r), "report_fail")
        elif review_warning_checks > 0:
            status = "REVIEW"
            if review_warning_class_excess:
                top_review_class = sorted(
                    review_warning_class_excess.items(),
                    key=lambda item: (-item[1], item[0]),
                )[0][0]
                top_class_checks = policy_warning_checks_by_class.get(top_review_class)
                if top_review_class == "other_quality" and top_class_checks:
                    reason_code = sorted(
                        top_class_checks.items(),
                        key=lambda item: (-item[1], item[0]),
                    )[0][0]
                else:
                    # Prefer class-level reason so review semantics stay stable even
                    # when raw warning check names evolve.
                    reason_code = top_review_class
            elif policy_warning_signal_counts:
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
                blocked_warning_class_hit = next(
                    (
                        cls
                        for cls in sorted(block_warning_classes)
                        if warning_signal_class_counts.get(cls, 0) > 0
                    ),
                    None,
                )
                if blocked_warning_class_hit:
                    status = "BLOCKED"
                    reason_code = f"policy_block_warning_class:{blocked_warning_class_hit}"
                else:
                    blocked_warning_class_for_type = next(
                        (
                            cls
                            for cls in block_warning_classes_for_type
                            if warning_signal_class_counts.get(cls, 0) > 0
                        ),
                        None,
                    )
                    if blocked_warning_class_for_type is not None:
                        status = "BLOCKED"
                        reason_code = (
                            "policy_block_warning_class_by_content_type:"
                            f"{content_type or 'unknown'}:{blocked_warning_class_for_type}"
                        )
                    else:
                        per_class_exceeded = next(
                            (
                                (cls, warning_signal_class_counts.get(cls, 0), limit)
                                for cls, limit in sorted(max_warning_checks_by_class.items(), key=lambda item: item[0])
                                if warning_signal_class_counts.get(cls, 0) > limit
                            ),
                            None,
                        )
                        if per_class_exceeded is not None:
                            cls, seen, limit = per_class_exceeded
                            status = "BLOCKED"
                            reason_code = f"policy_warning_class_budget_exceeded:{cls}:{seen}>{limit}"
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

        # Optional policy hardening: use Stage 09-derived damage profile to
        # escalate non-blocked videos when quality degradation is substantial.
        if status != "BLOCKED" and isinstance(damage_profile, dict):
            video_damage_score = _parse_number(damage_profile.get("video_damage_score"))
            raw_damaged_segment_count = damage_profile.get("damaged_segment_count")
            damaged_segment_count: Optional[int] = None
            if isinstance(raw_damaged_segment_count, bool):
                damaged_segment_count = None
            elif isinstance(raw_damaged_segment_count, int):
                damaged_segment_count = raw_damaged_segment_count
            elif isinstance(raw_damaged_segment_count, float) and raw_damaged_segment_count.is_integer():
                damaged_segment_count = int(raw_damaged_segment_count)
            elif isinstance(raw_damaged_segment_count, str) and raw_damaged_segment_count.strip().isdigit():
                damaged_segment_count = int(raw_damaged_segment_count.strip())
            damaged_chunk_ratio = _parse_number(damage_profile.get("damaged_chunk_ratio"))
            severe_damage_chunk_ratio = _parse_number(damage_profile.get("severe_damage_chunk_ratio"))
            has_localized_damage = _damage_profile_has_localized_damage(damage_profile)
            review_windowless_threshold = review_windowless_video_damage_score_by_content_type.get(
                content_type or "",
                review_windowless_video_damage_score,
            )
            block_windowless_threshold = block_windowless_video_damage_score_by_content_type.get(
                content_type or "",
                block_windowless_video_damage_score,
            )

            if (
                block_windowless_threshold is not None
                and video_damage_score is not None
                and not has_localized_damage
                and video_damage_score > float(block_windowless_threshold)
            ):
                status = "BLOCKED"
                reason_code = (
                    "policy_block_windowless_video_damage_score:"
                    f"{video_damage_score:.3f}>{float(block_windowless_threshold):.3f}"
                )
            elif (
                block_video_damage_score is not None
                and video_damage_score is not None
                and video_damage_score > float(block_video_damage_score)
            ):
                status = "BLOCKED"
                reason_code = (
                    "policy_block_video_damage_score:"
                    f"{video_damage_score:.3f}>{float(block_video_damage_score):.3f}"
                )
            elif (
                block_damaged_segment_count is not None
                and damaged_segment_count is not None
                and damaged_segment_count > int(block_damaged_segment_count)
            ):
                status = "BLOCKED"
                reason_code = (
                    "policy_block_damaged_segment_count:"
                    f"{damaged_segment_count}>{int(block_damaged_segment_count)}"
                )
            elif (
                block_damaged_chunk_ratio is not None
                and damaged_chunk_ratio is not None
                and damaged_chunk_ratio > float(block_damaged_chunk_ratio)
            ):
                status = "BLOCKED"
                reason_code = (
                    "policy_block_damaged_chunk_ratio:"
                    f"{damaged_chunk_ratio:.3f}>{float(block_damaged_chunk_ratio):.3f}"
                )
            elif (
                block_severe_damage_chunk_ratio is not None
                and severe_damage_chunk_ratio is not None
                and severe_damage_chunk_ratio > float(block_severe_damage_chunk_ratio)
            ):
                status = "BLOCKED"
                reason_code = (
                    "policy_block_severe_damage_chunk_ratio:"
                    f"{severe_damage_chunk_ratio:.3f}>{float(block_severe_damage_chunk_ratio):.3f}"
                )
            elif status == "READY":
                if (
                    review_windowless_threshold is not None
                    and video_damage_score is not None
                    and not has_localized_damage
                    and video_damage_score > float(review_windowless_threshold)
                ):
                    status = "REVIEW"
                    reason_code = (
                        "policy_review_windowless_video_damage_score:"
                        f"{video_damage_score:.3f}>{float(review_windowless_threshold):.3f}"
                    )
                elif (
                    review_video_damage_score is not None
                    and video_damage_score is not None
                    and video_damage_score > float(review_video_damage_score)
                ):
                    status = "REVIEW"
                    reason_code = (
                        "policy_review_video_damage_score:"
                        f"{video_damage_score:.3f}>{float(review_video_damage_score):.3f}"
                    )
                elif (
                    review_damaged_segment_count is not None
                    and damaged_segment_count is not None
                    and damaged_segment_count > int(review_damaged_segment_count)
                ):
                    status = "REVIEW"
                    reason_code = (
                        "policy_review_damaged_segment_count:"
                        f"{damaged_segment_count}>{int(review_damaged_segment_count)}"
                    )
                elif (
                    review_damaged_chunk_ratio is not None
                    and damaged_chunk_ratio is not None
                    and damaged_chunk_ratio > float(review_damaged_chunk_ratio)
                ):
                    status = "REVIEW"
                    reason_code = (
                        "policy_review_damaged_chunk_ratio:"
                        f"{damaged_chunk_ratio:.3f}>{float(review_damaged_chunk_ratio):.3f}"
                    )
                elif (
                    review_severe_damage_chunk_ratio is not None
                    and severe_damage_chunk_ratio is not None
                    and severe_damage_chunk_ratio > float(review_severe_damage_chunk_ratio)
                ):
                    status = "REVIEW"
                    reason_code = (
                        "policy_review_severe_damage_chunk_ratio:"
                        f"{severe_damage_chunk_ratio:.3f}>{float(review_severe_damage_chunk_ratio):.3f}"
                    )

        ready_for_ingest = status in allowed_statuses
        gate_decision = _canonical_gate_from_status(status)
        if ready_for_ingest:
            allow_ingest += 1
        by_status[status] += 1
        by_gate[gate_decision] += 1

        videos.append({
            "video_id": vid,
            "status": status,
            "gate_decision": gate_decision,
            "ready_for_ingest": ready_for_ingest,
            "quarantined": is_quarantined,
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
                "review_warnings": review_warning_checks,
                "info": info_checks,
                "warning_types": dict(warning_signal_counts),
                "policy_warning_types": dict(policy_warning_signal_counts),
                "warning_classes": dict(warning_signal_class_counts),
                "policy_warning_classes": dict(policy_warning_signal_class_counts),
                "review_warning_class_excess": dict(review_warning_class_excess),
                "content_type_review_budget": applied_review_budget,
                "content_type_block_warning_classes": block_warning_classes_for_type,
            },
            "damage_profile": damage_profile,
            "content_type": content_type,
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
            "quarantine_file": str(quarantine_file) if quarantine_file else None,
            "quarantined_video_count": len(set(candidate_ids) & quarantine_ids),
        },
        "policy": {
            "ready": "all reports valid and PASS with no error/warning checks",
            "review": "reports valid with WARN/warning checks but no FAIL/error checks",
            "blocked": (
                "missing report coverage, explicit quarantine membership, invalid report, "
                "FAIL status, or error checks"
            ),
            "allow_ingest_statuses": sorted(allowed_statuses),
            "block_warning_checks": sorted(block_warning_checks),
            "block_warning_classes": sorted(block_warning_classes),
            "max_warning_checks": max_warning_checks,
            "max_warning_checks_by_type": {k: max_warning_checks_by_type[k] for k in sorted(max_warning_checks_by_type)},
            "max_warning_checks_by_class": {k: max_warning_checks_by_class[k] for k in sorted(max_warning_checks_by_class)},
            "block_warning_class_by_content_type": {
                content_type: sorted(block_warning_class_by_content_type[content_type])
                for content_type in sorted(block_warning_class_by_content_type)
            },
            "review_warning_class_budget_by_content_type": {
                vt: {k: v for k, v in sorted(class_map.items())}
                for vt, class_map in sorted(review_warning_class_budget_by_content_type.items())
            },
            "warning_budget_excluded_checks": sorted(POLICY_WARNING_BUDGET_EXCLUDED_CHECKS),
            "review_video_damage_score": review_video_damage_score,
            "block_video_damage_score": block_video_damage_score,
            "review_damaged_segment_count": review_damaged_segment_count,
            "block_damaged_segment_count": block_damaged_segment_count,
            "review_damaged_chunk_ratio": review_damaged_chunk_ratio,
            "block_damaged_chunk_ratio": block_damaged_chunk_ratio,
            "review_windowless_video_damage_score": review_windowless_video_damage_score,
            "block_windowless_video_damage_score": block_windowless_video_damage_score,
            "review_windowless_video_damage_score_by_content_type": {
                k: round(float(v), 6)
                for k, v in sorted(review_windowless_video_damage_score_by_content_type.items())
            },
            "block_windowless_video_damage_score_by_content_type": {
                k: round(float(v), 6)
                for k, v in sorted(block_windowless_video_damage_score_by_content_type.items())
            },
            "review_severe_damage_chunk_ratio": review_severe_damage_chunk_ratio,
            "block_severe_damage_chunk_ratio": block_severe_damage_chunk_ratio,
        },
        "summary": {
            "videos": len(videos),
            "by_status": dict(by_status),
            "by_gate_decision": dict(by_gate),
            "allow_ingest": allow_ingest,
            "blocked": by_status.get("BLOCKED", 0),
            "videos_with_damage_profile": videos_with_damage_profile,
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
        "--quarantine-file",
        help=(
            "Optional quarantine JSON path. "
            "If omitted and --manifest is set, auto-detects data/validation/quarantine/<manifest>[.<source>].json"
        ),
    )
    parser.add_argument(
        "--review-video-damage-score",
        type=float,
        help=(
            "Escalate READY -> REVIEW when Stage 09 video_damage_score exceeds this threshold (0..1). "
            "Disabled when omitted."
        ),
    )
    parser.add_argument(
        "--block-video-damage-score",
        type=float,
        help=(
            "Escalate non-blocked videos -> BLOCKED when Stage 09 video_damage_score exceeds this threshold (0..1). "
            "Disabled when omitted."
        ),
    )
    parser.add_argument(
        "--review-damaged-segment-count",
        type=int,
        help=(
            "Escalate READY -> REVIEW when Stage 09 damaged_segment_count exceeds this threshold. "
            "Disabled when omitted."
        ),
    )
    parser.add_argument(
        "--block-damaged-segment-count",
        type=int,
        help=(
            "Escalate non-blocked videos -> BLOCKED when Stage 09 damaged_segment_count exceeds this threshold. "
            "Disabled when omitted."
        ),
    )
    parser.add_argument(
        "--review-damaged-chunk-ratio",
        type=float,
        help=(
            "Escalate READY -> REVIEW when damaged_chunk_ratio exceeds this threshold (0..1). "
            "A chunk is 'damaged' when damage_score > 0."
        ),
    )
    parser.add_argument(
        "--block-damaged-chunk-ratio",
        type=float,
        help=(
            "Escalate non-blocked videos -> BLOCKED when damaged_chunk_ratio exceeds this threshold (0..1). "
            "A chunk is 'damaged' when damage_score > 0."
        ),
    )
    parser.add_argument(
        "--review-windowless-video-damage-score",
        type=float,
        help=(
            "Escalate READY -> REVIEW when video_damage_score exceeds this threshold but no "
            "damage_segment_windows / damaged_segment_ids were localized (0..1)."
        ),
    )
    parser.add_argument(
        "--block-windowless-video-damage-score",
        type=float,
        help=(
            "Escalate non-blocked videos -> BLOCKED when video_damage_score exceeds this threshold but no "
            "damage_segment_windows / damaged_segment_ids were localized (0..1)."
        ),
    )
    parser.add_argument(
        "--review-windowless-video-damage-score-by-content-type",
        action="append",
        default=[],
        help=(
            "Content-type override for windowless READY->REVIEW threshold. "
            "Format: <content_type>=<ratio>, repeatable."
        ),
    )
    parser.add_argument(
        "--block-windowless-video-damage-score-by-content-type",
        action="append",
        default=[],
        help=(
            "Content-type override for windowless non-blocked->BLOCKED threshold. "
            "Format: <content_type>=<ratio>, repeatable."
        ),
    )
    parser.add_argument(
        "--review-severe-damage-chunk-ratio",
        type=float,
        help=(
            "Escalate READY -> REVIEW when severe_damage_chunk_ratio exceeds this threshold (0..1). "
            "A chunk is 'severe' when damage_score >= 0.30."
        ),
    )
    parser.add_argument(
        "--block-severe-damage-chunk-ratio",
        type=float,
        help=(
            "Escalate non-blocked videos -> BLOCKED when severe_damage_chunk_ratio exceeds this threshold (0..1). "
            "A chunk is 'severe' when damage_score >= 0.30."
        ),
    )
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
        "--emit-canonical-gate",
        action="store_true",
        help="Emit canonical gate artifact derived from readiness decisions",
    )
    parser.add_argument(
        "--canonical-gate-out",
        help=(
            "Output path for --emit-canonical-gate "
            "(default: data/validation/gates/<manifest>.gate.json when --manifest is set)"
        ),
    )
    parser.add_argument(
        "--block-warning-check",
        action="append",
        default=[],
        help="Warning check name to escalate from REVIEW to BLOCKED (repeatable)",
    )
    parser.add_argument(
        "--block-warning-class",
        action="append",
        default=[],
        help="Warning class to escalate from REVIEW to BLOCKED (repeatable)",
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
        "--max-warning-class",
        action="append",
        default=[],
        help=(
            "Escalate to BLOCKED when a warning class exceeds its budget. "
            "Format: <class>=<max> (or <class>:<max>), repeatable."
        ),
    )
    parser.add_argument(
        "--review-warning-class-budget-by-content-type",
        action="append",
        default=[],
        help=(
            "Treat class warnings up to budget as PASS for that content type. "
            "Format: <content_type>:<class>=<max>, repeatable."
        ),
    )
    parser.add_argument(
        "--block-warning-class-by-content-type",
        action="append",
        default=[],
        help=(
            "Escalate to BLOCKED when a warning class appears for a content type. "
            "Format: <content_type>:<class>, repeatable."
        ),
    )
    parser.add_argument("--json", action="store_true", help="Output JSON report")
    parser.add_argument("--show", type=int, default=40, help="Max issue lines in text mode")
    args = parser.parse_args()
    if args.canonical_gate_out and not args.emit_canonical_gate:
        args.emit_canonical_gate = True

    if args.max_warning_checks is not None and args.max_warning_checks < 0:
        print(f"{LOG_PREFIX} ERROR: --max-warning-checks must be >= 0", file=sys.stderr)
        sys.exit(2)
    block_warning_checks = {str(c).strip() for c in (args.block_warning_check or []) if str(c).strip()}
    block_warning_classes = {str(c).strip() for c in (args.block_warning_class or []) if str(c).strip()}
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

    max_warning_checks_by_class: Dict[str, int] = {}
    for raw in args.max_warning_class or []:
        try:
            warning_class, budget = _parse_warning_check_budget(raw)
        except ValueError as exc:
            print(
                f"{LOG_PREFIX} ERROR: invalid --max-warning-class value '{raw}': {exc}",
                file=sys.stderr,
            )
            sys.exit(2)
        prev = max_warning_checks_by_class.get(warning_class)
        if prev is not None and prev != budget:
            print(
                f"{LOG_PREFIX} ERROR: conflicting --max-warning-class budgets for '{warning_class}' "
                f"({prev} vs {budget})",
                file=sys.stderr,
            )
            sys.exit(2)
        max_warning_checks_by_class[warning_class] = budget

    review_warning_class_budget_by_content_type: Dict[str, Dict[str, int]] = {}
    for raw in args.review_warning_class_budget_by_content_type or []:
        try:
            content_type, warning_class, budget = _parse_content_type_warning_class_budget(raw)
        except ValueError as exc:
            print(
                f"{LOG_PREFIX} ERROR: invalid --review-warning-class-budget-by-content-type value '{raw}': {exc}",
                file=sys.stderr,
            )
            sys.exit(2)
        per_type = review_warning_class_budget_by_content_type.setdefault(content_type, {})
        prev = per_type.get(warning_class)
        if prev is not None and prev != budget:
            print(
                f"{LOG_PREFIX} ERROR: conflicting review class budget for '{content_type}:{warning_class}' "
                f"({prev} vs {budget})",
                file=sys.stderr,
            )
            sys.exit(2)
        per_type[warning_class] = budget

    block_warning_class_by_content_type: Dict[str, Set[str]] = {}
    for raw in args.block_warning_class_by_content_type or []:
        try:
            content_type, warning_class = _parse_content_type_warning_class(raw)
        except ValueError as exc:
            print(
                f"{LOG_PREFIX} ERROR: invalid --block-warning-class-by-content-type value '{raw}': {exc}",
                file=sys.stderr,
            )
            sys.exit(2)
        if warning_class not in SIGNAL_CLASS_ALLOWED:
            print(
                f"{LOG_PREFIX} ERROR: invalid warning class '{warning_class}' for "
                f"--block-warning-class-by-content-type; expected one of {sorted(SIGNAL_CLASS_ALLOWED)}",
                file=sys.stderr,
            )
            sys.exit(2)
        per_type = block_warning_class_by_content_type.setdefault(content_type, set())
        per_type.add(warning_class)

    review_windowless_video_damage_score_by_content_type: Dict[str, float] = {}
    for raw in args.review_windowless_video_damage_score_by_content_type or []:
        try:
            content_type, threshold = _parse_content_type_ratio_threshold(raw)
        except ValueError as exc:
            print(
                f"{LOG_PREFIX} ERROR: invalid --review-windowless-video-damage-score-by-content-type value '{raw}': {exc}",
                file=sys.stderr,
            )
            sys.exit(2)
        prev = review_windowless_video_damage_score_by_content_type.get(content_type)
        if prev is not None and float(prev) != float(threshold):
            print(
                f"{LOG_PREFIX} ERROR: conflicting review windowless damage threshold for '{content_type}' "
                f"({prev} vs {threshold})",
                file=sys.stderr,
            )
            sys.exit(2)
        review_windowless_video_damage_score_by_content_type[content_type] = float(threshold)

    block_windowless_video_damage_score_by_content_type: Dict[str, float] = {}
    for raw in args.block_windowless_video_damage_score_by_content_type or []:
        try:
            content_type, threshold = _parse_content_type_ratio_threshold(raw)
        except ValueError as exc:
            print(
                f"{LOG_PREFIX} ERROR: invalid --block-windowless-video-damage-score-by-content-type value '{raw}': {exc}",
                file=sys.stderr,
            )
            sys.exit(2)
        prev = block_windowless_video_damage_score_by_content_type.get(content_type)
        if prev is not None and float(prev) != float(threshold):
            print(
                f"{LOG_PREFIX} ERROR: conflicting block windowless damage threshold for '{content_type}' "
                f"({prev} vs {threshold})",
                file=sys.stderr,
            )
            sys.exit(2)
        block_windowless_video_damage_score_by_content_type[content_type] = float(threshold)

    allow_ingest_statuses: Set[str] = {"READY"}

    for flag_name in (
        "review_video_damage_score",
        "block_video_damage_score",
        "review_damaged_chunk_ratio",
        "block_damaged_chunk_ratio",
        "review_windowless_video_damage_score",
        "block_windowless_video_damage_score",
        "review_severe_damage_chunk_ratio",
        "block_severe_damage_chunk_ratio",
    ):
        value = getattr(args, flag_name)
        if value is None:
            continue
        if not (0.0 <= float(value) <= 1.0):
            cli_name = "--" + flag_name.replace("_", "-")
            print(f"{LOG_PREFIX} ERROR: {cli_name} must be within [0,1]", file=sys.stderr)
            sys.exit(2)

    for flag_name in ("review_damaged_segment_count", "block_damaged_segment_count"):
        value = getattr(args, flag_name)
        if value is None:
            continue
        if int(value) < 0:
            cli_name = "--" + flag_name.replace("_", "-")
            print(f"{LOG_PREFIX} ERROR: {cli_name} must be >= 0", file=sys.stderr)
            sys.exit(2)

    if (
        args.review_video_damage_score is not None
        and args.block_video_damage_score is not None
        and float(args.block_video_damage_score) < float(args.review_video_damage_score)
    ):
        print(
            f"{LOG_PREFIX} ERROR: --block-video-damage-score must be >= --review-video-damage-score",
            file=sys.stderr,
        )
        sys.exit(2)

    if (
        args.review_damaged_segment_count is not None
        and args.block_damaged_segment_count is not None
        and int(args.block_damaged_segment_count) < int(args.review_damaged_segment_count)
    ):
        print(
            f"{LOG_PREFIX} ERROR: --block-damaged-segment-count must be >= --review-damaged-segment-count",
            file=sys.stderr,
        )
        sys.exit(2)

    if (
        args.review_damaged_chunk_ratio is not None
        and args.block_damaged_chunk_ratio is not None
        and float(args.block_damaged_chunk_ratio) < float(args.review_damaged_chunk_ratio)
    ):
        print(
            f"{LOG_PREFIX} ERROR: --block-damaged-chunk-ratio must be >= --review-damaged-chunk-ratio",
            file=sys.stderr,
        )
        sys.exit(2)

    if (
        args.review_windowless_video_damage_score is not None
        and args.block_windowless_video_damage_score is not None
        and float(args.block_windowless_video_damage_score) < float(args.review_windowless_video_damage_score)
    ):
        print(
            f"{LOG_PREFIX} ERROR: --block-windowless-video-damage-score must be >= --review-windowless-video-damage-score",
            file=sys.stderr,
        )
        sys.exit(2)

    for content_type in sorted(
        set(review_windowless_video_damage_score_by_content_type) | set(block_windowless_video_damage_score_by_content_type)
    ):
        review_th = review_windowless_video_damage_score_by_content_type.get(content_type)
        block_th = block_windowless_video_damage_score_by_content_type.get(content_type)
        if review_th is not None and block_th is not None and float(block_th) < float(review_th):
            print(
                f"{LOG_PREFIX} ERROR: block windowless threshold must be >= review threshold for content_type '{content_type}'",
                file=sys.stderr,
            )
            sys.exit(2)

    if (
        args.review_severe_damage_chunk_ratio is not None
        and args.block_severe_damage_chunk_ratio is not None
        and float(args.block_severe_damage_chunk_ratio) < float(args.review_severe_damage_chunk_ratio)
    ):
        print(
            f"{LOG_PREFIX} ERROR: --block-severe-damage-chunk-ratio must be >= --review-severe-damage-chunk-ratio",
            file=sys.stderr,
        )
        sys.exit(2)

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

    explicit_quarantine_path: Optional[Path] = None
    if args.quarantine_file:
        explicit_quarantine_path = Path(args.quarantine_file)
        if not explicit_quarantine_path.is_absolute():
            explicit_quarantine_path = _repo_root() / explicit_quarantine_path
    try:
        quarantine_ids, quarantine_path = _resolve_quarantine_ids(
            manifest_path=manifest_path,
            source_filter=args.source,
            explicit_quarantine_path=explicit_quarantine_path,
        )
    except ValueError as exc:
        print(f"{LOG_PREFIX} ERROR: {exc}", file=sys.stderr)
        sys.exit(2)

    readiness_summary = _compute_readiness(
        report_records=report_records,
        unreadable_by_vid=dict(unreadable_by_vid),
        report_dir=Path(args.dir) if args.dir else None,
        manifest_path=manifest_path,
        source_filter=args.source,
        manifest_ids=manifest_ids,
        missing_manifest_ids=missing_manifest_ids,
        quarantine_ids=quarantine_ids,
        quarantine_file=quarantine_path,
        block_warning_checks=block_warning_checks,
        block_warning_classes=block_warning_classes,
        max_warning_checks=args.max_warning_checks,
        max_warning_checks_by_type=max_warning_checks_by_type,
        max_warning_checks_by_class=max_warning_checks_by_class,
        block_warning_class_by_content_type=block_warning_class_by_content_type,
        review_warning_class_budget_by_content_type=review_warning_class_budget_by_content_type,
        allow_ingest_statuses=allow_ingest_statuses,
        review_video_damage_score=args.review_video_damage_score,
        block_video_damage_score=args.block_video_damage_score,
        review_damaged_segment_count=args.review_damaged_segment_count,
        block_damaged_segment_count=args.block_damaged_segment_count,
        review_damaged_chunk_ratio=args.review_damaged_chunk_ratio,
        block_damaged_chunk_ratio=args.block_damaged_chunk_ratio,
        review_windowless_video_damage_score=args.review_windowless_video_damage_score,
        block_windowless_video_damage_score=args.block_windowless_video_damage_score,
        review_windowless_video_damage_score_by_content_type=review_windowless_video_damage_score_by_content_type,
        block_windowless_video_damage_score_by_content_type=block_windowless_video_damage_score_by_content_type,
        review_severe_damage_chunk_ratio=args.review_severe_damage_chunk_ratio,
        block_severe_damage_chunk_ratio=args.block_severe_damage_chunk_ratio,
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

    canonical_gate_payload: Optional[Dict[str, Any]] = None
    canonical_gate_out: Optional[Path] = None
    if args.emit_canonical_gate:
        if args.canonical_gate_out:
            canonical_gate_out = Path(args.canonical_gate_out)
        else:
            canonical_gate_out = _default_gate_path(
                manifest_path=manifest_path,
                source_filter=args.source,
                report_dir=Path(args.dir) if args.dir else None,
            )
        videos_payload: List[Dict[str, Any]] = []
        summary_counts: Counter[str] = Counter()
        signal_class_counts: Counter[str] = Counter()
        readiness_videos = readiness_summary.get("videos")
        if isinstance(readiness_videos, list):
            for row in readiness_videos:
                if not isinstance(row, dict):
                    continue
                vid = str(row.get("video_id", "")).strip()
                if not vid or not VIDEO_ID_RE.fullmatch(vid):
                    continue
                gate = _canonical_gate_from_status(str(row.get("status", "")))
                if gate not in {"pass", "review", "block"}:
                    gate = "pass"
                summary_counts[gate] += 1
                signals = _canonical_signals_from_readiness_video(row)
                for signal in signals:
                    signal_class = str(signal.get("signal_class", "")).strip()
                    if signal_class:
                        signal_class_counts[signal_class] += 1
                sources_raw = row.get("sources")
                source = None
                if isinstance(sources_raw, list):
                    first_source = next(
                        (s for s in sources_raw if isinstance(s, str) and s.strip()),
                        None,
                    )
                    if isinstance(first_source, str):
                        source = first_source.strip()
                videos_payload.append(
                    {
                        "video_id": vid,
                        "source": source,
                        "gate_decision": gate,
                        "signals": signals,
                        "legacy": {
                            "status": row.get("status"),
                            "reason_code": row.get("reason_code"),
                            "content_type": row.get("content_type"),
                            "ready_for_ingest": row.get("ready_for_ingest"),
                        },
                    }
                )

        manifest_ref: Optional[str] = None
        if manifest_path is not None:
            manifest_ref = str(manifest_path)
        elif args.dir:
            manifest_ref = str(Path(args.dir))
        else:
            manifest_ref = "stage-report-scope"

        canonical_gate_payload = {
            "version": 1,
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "manifest": manifest_ref,
            "source_filter": args.source or None,
            "summary": {
                "video_count": len(videos_payload),
                "pass": int(summary_counts.get("pass", 0)),
                "review": int(summary_counts.get("review", 0)),
                "block": int(summary_counts.get("block", 0)),
                "signal_class_counts": dict(signal_class_counts),
                "decision_source": "stage_report_readiness",
            },
            "videos": videos_payload,
        }

        canonical_gate_out.parent.mkdir(parents=True, exist_ok=True)
        canonical_gate_out.write_text(
            json.dumps(canonical_gate_payload, indent=2) + "\n",
            encoding="utf-8",
        )

    errors = sum(1 for i in issues if i.severity == "error")
    warnings = sum(1 for i in issues if i.severity == "warning")
    normalized_issues: List[Dict[str, str]] = []
    canonical_gate_counts: Counter[str] = Counter()
    canonical_severity_counts: Counter[str] = Counter()
    for issue in issues:
        row = issue.to_dict()
        issue_severity = _canonical_issue_severity(issue.severity)
        gate_decision = _canonical_gate_decision(issue_severity)
        issue_code = re.sub(r"[^a-z0-9_]+", "_", str(row.get("check", "")).strip().lower()).strip("_")
        row["issue_code"] = issue_code or "unspecified_issue"
        row["issue_severity"] = issue_severity
        row["gate_decision"] = gate_decision
        row["scope_type"] = "batch" if row.get("check") == "missing_stage_report" else "video"
        row["origin_stage"] = "stage-report-validation"
        normalized_issues.append(row)
        canonical_gate_counts[gate_decision] += 1
        canonical_severity_counts[issue_severity] += 1

    report = {
        "version": 1,
        "validated_files": validated,
        "unreadable_files": unreadable,
        "issues_summary": {"errors": errors, "warnings": warnings},
        "canonical_summary": {
            "gate_decisions": dict(canonical_gate_counts),
            "issue_severity": dict(canonical_severity_counts),
        },
        "issues": normalized_issues,
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
        "quarantine": {
            "file": str(quarantine_path) if quarantine_path else None,
            "video_ids": len(quarantine_ids),
        },
        "readiness_summary": readiness_summary,
        "readiness_summary_out": str(readiness_out) if readiness_out else None,
        "canonical_gate_out": str(canonical_gate_out) if canonical_gate_out else None,
        "canonical_gate_summary": (canonical_gate_payload or {}).get("summary"),
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
        if canonical_gate_out is not None and canonical_gate_payload is not None:
            gate_summary = canonical_gate_payload.get("summary", {})
            print(
                f"{LOG_PREFIX} Canonical gate emitted: pass={gate_summary.get('pass', 0)}, "
                f"review={gate_summary.get('review', 0)}, block={gate_summary.get('block', 0)}, "
                f"out={canonical_gate_out}"
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
