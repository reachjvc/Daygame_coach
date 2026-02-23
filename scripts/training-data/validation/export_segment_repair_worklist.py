#!/usr/bin/env python3
"""
scripts/training-data/validation/export_segment_repair_worklist.py

Build a deterministic segment-level repair worklist from a manifest ingest
quarantine report (Stage 10).

This targets the "repair only damaged windows" workflow:
  - Reads `data/validation/ingest_quarantine/*.report.json`
  - Extracts `segment_repair_candidates` when present
  - Falls back to deriving windows from readiness damage profiles on older reports
  - Emits filtered/merged windows in JSON and optional CSV
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

LOG_PREFIX = "[export-segment-repair-worklist]"
VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _safe_name(raw: str) -> str:
    cleaned = SAFE_NAME_RE.sub("_", str(raw or "").strip()).strip("_")
    return cleaned or "report"


def _load_json(path: Path) -> Optional[Dict[str, Any]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def _parse_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    return default


def _parse_ratio(value: Any) -> Optional[float]:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        num = float(value)
        if num != num or num in {float("inf"), float("-inf")}:
            return None
        if num < 0.0:
            return 0.0
        if num > 1.0:
            return 1.0
        return num
    return None


def _parse_non_negative_int(value: Any) -> Optional[int]:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value if value >= 0 else None
    if isinstance(value, float) and value.is_integer():
        iv = int(value)
        return iv if iv >= 0 else None
    return None


def _parse_content_type_ratio_rules(raw_rules: Sequence[str]) -> Dict[str, float]:
    out: Dict[str, float] = {}
    for raw in raw_rules:
        text = str(raw or "").strip()
        if not text:
            continue
        if "=" not in text:
            raise SystemExit(
                f"{LOG_PREFIX} ERROR: invalid content-type ratio rule {text!r} "
                f"(expected content_type=ratio)"
            )
        ct_raw, value_raw = text.split("=", 1)
        ct = ct_raw.strip()
        if not ct:
            raise SystemExit(f"{LOG_PREFIX} ERROR: empty content_type in rule {text!r}")
        try:
            value = float(value_raw.strip())
        except Exception:
            raise SystemExit(f"{LOG_PREFIX} ERROR: invalid ratio in rule {text!r}")
        if not (0.0 <= value <= 1.0):
            raise SystemExit(f"{LOG_PREFIX} ERROR: ratio out of range in rule {text!r} (must be within [0,1])")
        out[ct] = value
    return out


def _candidate_meets_damage_threshold(
    row: RepairCandidate,
    *,
    global_min: Optional[float],
    by_content_type: Dict[str, float],
) -> bool:
    score = row.video_damage_score
    if not isinstance(score, float):
        return global_min is None and (row.content_type is None or row.content_type not in by_content_type)
    threshold = global_min
    if row.content_type and row.content_type in by_content_type:
        threshold = by_content_type[row.content_type]
    if threshold is None:
        return True
    return score >= float(threshold)


def _dict_row_meets_damage_threshold(
    row: Dict[str, Any],
    *,
    global_min: Optional[float],
    by_content_type: Dict[str, float],
) -> bool:
    score = row.get("video_damage_score")
    score_val = float(score) if isinstance(score, (int, float)) and not isinstance(score, bool) else None
    content_type = row.get("content_type")
    content_type_key = content_type if isinstance(content_type, str) and content_type.strip() else None
    threshold = global_min
    if content_type_key and content_type_key in by_content_type:
        threshold = by_content_type[content_type_key]
    if threshold is None:
        return score_val is not None
    return score_val is not None and score_val >= float(threshold)


@dataclass(frozen=True)
class RepairCandidate:
    video_id: str
    source: Optional[str]
    content_type: Optional[str]
    status: str  # READY|REVIEW|BLOCKED
    ingest_eligible: bool
    reason: str
    video_damage_score: Optional[float]
    start_segment_id: int
    end_segment_id: int
    damaged_segment_count: int

    @property
    def window_span_segments(self) -> int:
        return max(1, self.end_segment_id - self.start_segment_id + 1)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "video_id": self.video_id,
            "source": self.source,
            "content_type": self.content_type,
            "status": self.status,
            "ingest_eligible": self.ingest_eligible,
            "reason": self.reason,
            "video_damage_score": round(self.video_damage_score, 6) if isinstance(self.video_damage_score, float) else None,
            "start_segment_id": self.start_segment_id,
            "end_segment_id": self.end_segment_id,
            "damaged_segment_count": self.damaged_segment_count,
            "window_span_segments": self.window_span_segments,
        }


def _first_source_from_sources_list(raw: Any) -> Optional[str]:
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, str) and item.strip():
                return item.strip()
    return None


def _iter_report_candidates(ingest_report: Dict[str, Any]) -> Iterable[RepairCandidate]:
    raw_candidates = ingest_report.get("segment_repair_candidates")
    if isinstance(raw_candidates, list) and raw_candidates:
        for row in raw_candidates:
            if not isinstance(row, dict):
                continue
            vid = row.get("video_id")
            if not isinstance(vid, str) or not VIDEO_ID_RE.fullmatch(vid.strip()):
                continue
            status = str(row.get("status", "")).strip().upper()
            if status not in {"REVIEW", "BLOCKED"}:
                continue
            start = _parse_non_negative_int(row.get("start_segment_id"))
            end = _parse_non_negative_int(row.get("end_segment_id"))
            if start is None or end is None:
                continue
            if end < start:
                start, end = end, start
            dmg_count = _parse_non_negative_int(row.get("damaged_segment_count"))
            if not dmg_count or dmg_count <= 0:
                dmg_count = max(1, end - start + 1)
            source = row.get("source")
            source_text = source.strip() if isinstance(source, str) and source.strip() else None
            raw_content_type = row.get("content_type")
            content_type = raw_content_type.strip() if isinstance(raw_content_type, str) and raw_content_type.strip() else None
            reason = str(row.get("reason", "")).strip() or ("blocked" if status == "BLOCKED" else "review")
            yield RepairCandidate(
                video_id=vid.strip(),
                source=source_text,
                content_type=content_type,
                status=status,
                ingest_eligible=_parse_bool(row.get("ingest_eligible"), default=(status == "REVIEW")),
                reason=reason,
                video_damage_score=_parse_ratio(row.get("video_damage_score")),
                start_segment_id=start,
                end_segment_id=end,
                damaged_segment_count=dmg_count,
            )
        return

    # Fallback for older ingest reports: derive from nested readiness damage profiles.
    for row in ingest_report.get("readiness_review_videos", []) or []:
        yield from _derive_candidates_from_readiness_video(row, default_status="REVIEW", default_ingest_eligible=True)
    for row in ingest_report.get("blocked_videos", []) or []:
        yield from _derive_candidates_from_blocked_video(row)


def _resolve_readiness_summary_from_ingest_report(ingest_report: Dict[str, Any]) -> Optional[Path]:
    stages = ingest_report.get("stages")
    if not isinstance(stages, dict):
        return None
    readiness = stages.get("readiness")
    if not isinstance(readiness, dict):
        return None
    summary = readiness.get("summary")
    if not isinstance(summary, str) or not summary.strip():
        return None
    p = Path(summary.strip())
    if not p.is_absolute():
        p = _repo_root() / p
    return p


def _iter_candidates_from_linked_readiness_summary(
    ingest_report: Dict[str, Any],
    *,
    statuses: Optional[set[str]] = None,
) -> Iterable[RepairCandidate]:
    summary_path = _resolve_readiness_summary_from_ingest_report(ingest_report)
    if summary_path is None or not summary_path.exists():
        return []
    payload = _load_json(summary_path)
    if not isinstance(payload, dict):
        return []
    videos = payload.get("videos")
    if not isinstance(videos, list):
        return []

    out: List[RepairCandidate] = []
    for row in videos:
        if not isinstance(row, dict):
            continue
        vid = row.get("video_id")
        if not isinstance(vid, str) or not VIDEO_ID_RE.fullmatch(vid.strip()):
            continue
        status = str(row.get("status", "")).strip().upper()
        if status not in {"READY", "REVIEW", "BLOCKED"}:
            continue
        if statuses and status not in statuses:
            continue
        source_raw = row.get("sources")
        source_text: Optional[str] = None
        if isinstance(source_raw, list):
            for s in source_raw:
                if isinstance(s, str) and s.strip():
                    source_text = s.strip()
                    break
        reason = str(row.get("reason_code", "")).strip() or ("blocked" if status == "BLOCKED" else "review")
        ready_for_ingest = _parse_bool(row.get("ready_for_ingest"), default=(status == "REVIEW"))
        raw_content_type = row.get("content_type")
        content_type = raw_content_type.strip() if isinstance(raw_content_type, str) and raw_content_type.strip() else None
        profile = row.get("damage_profile")
        if not isinstance(profile, dict):
            continue
        score = _parse_ratio(profile.get("video_damage_score"))
        for start, end, dmg_count in _extract_damage_windows(profile):
            out.append(
                RepairCandidate(
                    video_id=vid.strip(),
                    source=source_text,
                    content_type=content_type,
                    status=status,
                    ingest_eligible=ready_for_ingest,
                    reason=reason,
                    video_damage_score=score,
                    start_segment_id=start,
                    end_segment_id=end,
                    damaged_segment_count=dmg_count,
                )
            )
    return out


def _extract_damage_windows(profile: Dict[str, Any]) -> List[Tuple[int, int, int]]:
    windows: List[Tuple[int, int, int]] = []
    raw_windows = profile.get("damage_segment_windows")
    if isinstance(raw_windows, list):
        for row in raw_windows:
            if not isinstance(row, dict):
                continue
            start = _parse_non_negative_int(row.get("start_segment_id"))
            end = _parse_non_negative_int(row.get("end_segment_id"))
            if start is None or end is None:
                continue
            if end < start:
                start, end = end, start
            dmg_count = _parse_non_negative_int(row.get("damaged_segment_count"))
            if not dmg_count or dmg_count <= 0:
                dmg_count = max(1, end - start + 1)
            windows.append((start, end, dmg_count))
    if windows:
        return windows

    raw_ids = profile.get("damaged_segment_ids")
    if isinstance(raw_ids, list):
        ids = sorted({sid for sid in (_parse_non_negative_int(x) for x in raw_ids) if sid is not None})
        for sid in ids:
            windows.append((sid, sid, 1))
    return windows


def _windowless_damage_video_row(
    *,
    video_id: str,
    source: Optional[str],
    content_type: Optional[str],
    status: str,
    ingest_eligible: bool,
    reason: str,
    profile: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    score = _parse_ratio(profile.get("video_damage_score"))
    if score is None or score <= 0.0:
        return None
    if _extract_damage_windows(profile):
        return None

    severe_ratio = _parse_ratio(profile.get("severe_damage_chunk_ratio"))
    damaged_segment_count = _parse_non_negative_int(profile.get("damaged_segment_count"))
    return {
        "video_id": video_id,
        "source": source,
        "content_type": content_type,
        "status": status,
        "ingest_eligible": bool(ingest_eligible),
        "reason": reason,
        "video_damage_score": round(score, 6),
        "severe_damage_chunk_ratio": round(severe_ratio, 6) if severe_ratio is not None else None,
        "damaged_segment_count": damaged_segment_count if damaged_segment_count is not None else 0,
        "localization_missing": True,
    }


def _iter_windowless_damage_from_linked_readiness_summary(
    ingest_report: Dict[str, Any],
    *,
    statuses: Optional[set[str]] = None,
) -> Iterable[Dict[str, Any]]:
    summary_path = _resolve_readiness_summary_from_ingest_report(ingest_report)
    if summary_path is None or not summary_path.exists():
        return []
    payload = _load_json(summary_path)
    if not isinstance(payload, dict):
        return []
    videos = payload.get("videos")
    if not isinstance(videos, list):
        return []

    out: List[Dict[str, Any]] = []
    for row in videos:
        if not isinstance(row, dict):
            continue
        vid = row.get("video_id")
        if not isinstance(vid, str) or not VIDEO_ID_RE.fullmatch(vid.strip()):
            continue
        vid = vid.strip()
        status = str(row.get("status", "")).strip().upper()
        if status not in {"READY", "REVIEW", "BLOCKED"}:
            continue
        if statuses and status not in statuses:
            continue
        profile = row.get("damage_profile")
        if not isinstance(profile, dict):
            continue
        source_text = _first_source_from_sources_list(row.get("sources"))
        raw_content_type = row.get("content_type")
        content_type = raw_content_type.strip() if isinstance(raw_content_type, str) and raw_content_type.strip() else None
        reason = str(row.get("reason_code", "")).strip() or ("blocked" if status == "BLOCKED" else "review")
        ready_for_ingest = _parse_bool(row.get("ready_for_ingest"), default=(status == "REVIEW"))
        item = _windowless_damage_video_row(
            video_id=vid,
            source=source_text,
            content_type=content_type,
            status=status,
            ingest_eligible=ready_for_ingest,
            reason=reason,
            profile=profile,
        )
        if item:
            out.append(item)
    return out


def _iter_windowless_damage_from_ingest_report(ingest_report: Dict[str, Any]) -> Iterable[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for collection_key in ("readiness_review_videos", "blocked_videos"):
        rows = ingest_report.get(collection_key)
        if not isinstance(rows, list):
            continue
        for row in rows:
            if not isinstance(row, dict):
                continue
            vid = row.get("video_id")
            if not isinstance(vid, str) or not VIDEO_ID_RE.fullmatch(vid.strip()):
                continue
            vid = vid.strip()
            source = row.get("source")
            source_text = source.strip() if isinstance(source, str) and source.strip() else None
            raw_content_type = row.get("content_type")
            content_type = raw_content_type.strip() if isinstance(raw_content_type, str) and raw_content_type.strip() else None
            ingest_eligible = _parse_bool(row.get("ingest_eligible"), default=False)
            readiness = row.get("readiness")
            if not isinstance(readiness, dict):
                continue
            status = str(readiness.get("status", "")).strip().upper()
            if status not in {"REVIEW", "BLOCKED"}:
                continue
            profile = readiness.get("damage_profile")
            if not isinstance(profile, dict):
                continue
            reason = str(readiness.get("reason", "")).strip() or ("blocked" if status == "BLOCKED" else "review")
            item = _windowless_damage_video_row(
                video_id=vid,
                source=source_text,
                content_type=content_type,
                status=status,
                ingest_eligible=ingest_eligible,
                reason=reason,
                profile=profile,
            )
            if item:
                out.append(item)
    return out


def _collect_windowless_damage_videos(
    ingest_report: Dict[str, Any],
    *,
    statuses: Optional[set[str]] = None,
) -> List[Dict[str, Any]]:
    rows = list(_iter_windowless_damage_from_linked_readiness_summary(ingest_report, statuses=statuses))
    if not rows:
        rows = list(_iter_windowless_damage_from_ingest_report(ingest_report))
        if statuses:
            rows = [row for row in rows if str(row.get("status", "")).upper() in statuses]
    rows.sort(
        key=lambda row: (
            -(float(row.get("video_damage_score") or 0.0)),
            str(row.get("video_id") or ""),
        )
    )
    return rows


def _derive_candidates_from_readiness_video(
    row: Any,
    *,
    default_status: str,
    default_ingest_eligible: bool,
) -> Iterable[RepairCandidate]:
    if not isinstance(row, dict):
        return []

    vid = row.get("video_id")
    if not isinstance(vid, str) or not VIDEO_ID_RE.fullmatch(vid.strip()):
        return []
    vid = vid.strip()
    source = row.get("source")
    source_text = source.strip() if isinstance(source, str) and source.strip() else None
    raw_content_type = row.get("content_type")
    content_type = raw_content_type.strip() if isinstance(raw_content_type, str) and raw_content_type.strip() else None
    ingest_eligible = _parse_bool(row.get("ingest_eligible"), default=default_ingest_eligible)

    readiness = row.get("readiness")
    if not isinstance(readiness, dict):
        return []

    status = str(readiness.get("status", default_status)).strip().upper()
    if status not in {"REVIEW", "BLOCKED"}:
        return []
    reason = str(readiness.get("reason", "")).strip() or ("blocked" if status == "BLOCKED" else "review")
    profile = readiness.get("damage_profile")
    if not isinstance(profile, dict):
        return []
    score = _parse_ratio(profile.get("video_damage_score"))

    out: List[RepairCandidate] = []
    for start, end, dmg_count in _extract_damage_windows(profile):
        out.append(
            RepairCandidate(
                video_id=vid,
                source=source_text,
                content_type=content_type,
                status=status,
                ingest_eligible=ingest_eligible,
                reason=reason,
                video_damage_score=score,
                start_segment_id=start,
                end_segment_id=end,
                damaged_segment_count=dmg_count,
            )
        )
    return out


def _derive_candidates_from_blocked_video(row: Any) -> Iterable[RepairCandidate]:
    if not isinstance(row, dict):
        return []
    readiness = row.get("readiness")
    if not isinstance(readiness, dict):
        return []
    if str(readiness.get("status", "")).strip().upper() != "BLOCKED":
        return []
    derived = {
        "video_id": row.get("video_id"),
        "source": row.get("source"),
        "content_type": row.get("content_type"),
        "ingest_eligible": False,
        "readiness": readiness,
    }
    return _derive_candidates_from_readiness_video(
        derived,
        default_status="BLOCKED",
        default_ingest_eligible=False,
    )


def _merge_candidates(rows: Sequence[RepairCandidate]) -> List[RepairCandidate]:
    grouped: Dict[Tuple[Any, ...], List[RepairCandidate]] = defaultdict(list)
    for row in rows:
        key = (
            row.video_id,
            row.source,
            row.content_type,
            row.status,
            row.ingest_eligible,
            row.reason,
            round(row.video_damage_score, 6) if isinstance(row.video_damage_score, float) else None,
        )
        grouped[key].append(row)

    merged: List[RepairCandidate] = []
    for key in sorted(grouped.keys(), key=lambda x: (str(x[0]), str(x[3]), str(x[5]))):
        batch = sorted(grouped[key], key=lambda r: (r.start_segment_id, r.end_segment_id))
        current: Optional[RepairCandidate] = None
        for row in batch:
            if current is None:
                current = row
                continue
            if row.start_segment_id <= current.end_segment_id + 1:
                current = RepairCandidate(
                    video_id=current.video_id,
                    source=current.source,
                    content_type=current.content_type,
                    status=current.status,
                    ingest_eligible=current.ingest_eligible,
                    reason=current.reason,
                    video_damage_score=current.video_damage_score,
                    start_segment_id=current.start_segment_id,
                    end_segment_id=max(current.end_segment_id, row.end_segment_id),
                    damaged_segment_count=current.damaged_segment_count + row.damaged_segment_count,
                )
            else:
                merged.append(current)
                current = row
        if current is not None:
            merged.append(current)

    merged.sort(
        key=lambda r: (
            r.video_id,
            r.start_segment_id,
            r.end_segment_id,
            r.status,
            r.reason,
        )
    )
    return merged


def _resolve_ingest_report_path(
    *,
    explicit_report: Optional[str],
    manifest: Optional[str],
    source_filter: Optional[str],
) -> Path:
    if explicit_report:
        p = Path(explicit_report)
        if not p.is_absolute():
            p = _repo_root() / p
        return p

    if not manifest:
        raise SystemExit(f"{LOG_PREFIX} ERROR: provide --report or --manifest")

    manifest_path = Path(manifest)
    if not manifest_path.is_absolute():
        manifest_path = _repo_root() / manifest_path
    if not manifest_path.exists():
        raise SystemExit(f"{LOG_PREFIX} ERROR: manifest not found: {manifest_path}")

    report_dir = _repo_root() / "data" / "validation" / "ingest_quarantine"
    if not report_dir.is_dir():
        raise SystemExit(f"{LOG_PREFIX} ERROR: ingest quarantine dir not found: {report_dir}")

    stem = _safe_name(manifest_path.stem)
    label = _safe_name(f"{stem}.{source_filter}") if source_filter else stem
    matches = sorted(report_dir.glob(f"{label}.*.report.json"))
    if not matches:
        raise SystemExit(
            f"{LOG_PREFIX} ERROR: no ingest quarantine reports found for manifest={manifest_path.name} "
            f"(source={source_filter or 'all'}) in {report_dir}"
        )
    return matches[-1]


def _write_csv(path: Path, rows: Sequence[RepairCandidate]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "video_id",
                "source",
                "content_type",
                "status",
                "ingest_eligible",
                "reason",
                "video_damage_score",
                "start_segment_id",
                "end_segment_id",
                "damaged_segment_count",
                "window_span_segments",
            ],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(row.to_dict())


def _path_from_artifact_item(item: Any) -> Optional[str]:
    if not isinstance(item, dict):
        return None
    raw = item.get("path")
    if not isinstance(raw, str) or not raw.strip():
        return None
    return raw.strip()


def _collect_video_artifact_hints(
    ingest_report: Dict[str, Any],
    *,
    target_video_ids: Sequence[str],
) -> Dict[str, Dict[str, Any]]:
    target_set = set(target_video_ids)
    hints: Dict[str, Dict[str, Any]] = {vid: {} for vid in target_set}

    def ensure_bucket(vid: str) -> Dict[str, Any]:
        return hints.setdefault(vid, {})

    # Pull direct hints from ingest quarantine report (newer report schema).
    for key in ("readiness_review_videos", "blocked_videos"):
        rows = ingest_report.get(key)
        if not isinstance(rows, list):
            continue
        for row in rows:
            if not isinstance(row, dict):
                continue
            vid = row.get("video_id")
            if not isinstance(vid, str) or vid not in target_set:
                continue
            bucket = ensure_bucket(vid)
            readiness = row.get("readiness")
            if isinstance(readiness, dict):
                report_path = readiness.get("report")
                if isinstance(report_path, str) and report_path.strip():
                    bucket.setdefault("readiness_report", report_path.strip())
                damage_profile = readiness.get("damage_profile")
                if isinstance(damage_profile, dict):
                    chunks_path = damage_profile.get("chunks_path")
                    if isinstance(chunks_path, str) and chunks_path.strip():
                        bucket.setdefault("stage09_chunks", chunks_path.strip())

    # Fallback: linked readiness summary contains stage report paths for all statuses,
    # including READY rows (useful for spot-check exports).
    summary_path = _resolve_readiness_summary_from_ingest_report(ingest_report)
    if summary_path is not None and summary_path.exists():
        readiness_summary = _load_json(summary_path)
        if isinstance(readiness_summary, dict):
            videos = readiness_summary.get("videos")
            if isinstance(videos, list):
                for row in videos:
                    if not isinstance(row, dict):
                        continue
                    vid = row.get("video_id")
                    if not isinstance(vid, str) or vid not in target_set:
                        continue
                    bucket = ensure_bucket(vid)
                    reports = row.get("reports")
                    if isinstance(reports, list):
                        for raw in reports:
                            if isinstance(raw, str) and raw.strip():
                                bucket.setdefault("readiness_report", raw.strip())
                                break
                    damage_profile = row.get("damage_profile")
                    if isinstance(damage_profile, dict):
                        chunks_path = damage_profile.get("chunks_path")
                        if isinstance(chunks_path, str) and chunks_path.strip():
                            bucket.setdefault("stage09_chunks", chunks_path.strip())

    # Parse stage reports to locate concrete artifacts for retrieval/repair tooling.
    for vid in sorted(target_set):
        bucket = ensure_bucket(vid)
        report_path_raw = bucket.get("readiness_report")
        if not isinstance(report_path_raw, str) or not report_path_raw.strip():
            continue
        report_path = Path(report_path_raw.strip())
        if not report_path.is_absolute():
            report_path = _repo_root() / report_path
        stage_report = _load_json(report_path)
        if not isinstance(stage_report, dict):
            continue

        bucket.setdefault("readiness_report", str(report_path))

        inputs = stage_report.get("inputs")
        outputs = stage_report.get("outputs")
        artifact_paths: List[str] = []
        if isinstance(inputs, list):
            artifact_paths.extend([p for p in (_path_from_artifact_item(x) for x in inputs) if p])
        if isinstance(outputs, list):
            artifact_paths.extend([p for p in (_path_from_artifact_item(x) for x in outputs) if p])

        for art_path in artifact_paths:
            norm = art_path.replace("\\", "/")
            if norm.endswith(".enriched.json"):
                bucket.setdefault("stage07_enriched", art_path)
            elif norm.endswith(".chunks.json"):
                bucket.setdefault("stage09_chunks", art_path)
            elif norm.endswith(".conversations.json"):
                if "/06c.DET.patched/" in norm:
                    bucket.setdefault("stage06c_conversations", art_path)
                elif "/06d.DET.sanitized/" in norm:
                    bucket.setdefault("stage06d_conversations", art_path)
                elif "/06.LLM.video-type/" in norm:
                    bucket.setdefault("stage06_conversations", art_path)

    return hints


def _build_output(
    *,
    report_path: Path,
    ingest_report: Dict[str, Any],
    rows: Sequence[RepairCandidate],
    filters: Dict[str, Any],
) -> Dict[str, Any]:
    by_status: Counter[str] = Counter()
    by_reason: Counter[str] = Counter()
    ingest_eligible_rows = 0
    videos: Dict[str, Dict[str, Any]] = {}

    for row in rows:
        by_status[row.status] += 1
        by_reason[row.reason] += 1
        if row.ingest_eligible:
            ingest_eligible_rows += 1
        bucket = videos.setdefault(
            row.video_id,
            {
                "video_id": row.video_id,
                "source": row.source,
                "content_type": row.content_type,
                "status": row.status,
                "ingest_eligible": row.ingest_eligible,
                "reason": row.reason,
                "video_damage_score": row.video_damage_score,
                "window_count": 0,
                "window_span_segments_total": 0,
                "damaged_segment_count_total": 0,
                "windows": [],
            },
        )
        bucket["window_count"] += 1
        bucket["window_span_segments_total"] += row.window_span_segments
        bucket["damaged_segment_count_total"] += row.damaged_segment_count
        bucket["windows"].append(
            {
                "start_segment_id": row.start_segment_id,
                "end_segment_id": row.end_segment_id,
                "damaged_segment_count": row.damaged_segment_count,
                "window_span_segments": row.window_span_segments,
            }
        )

    video_rows = list(videos.values())

    report_scope = ingest_report.get("scope")
    report_summary = report_scope if isinstance(report_scope, dict) else {}
    report_stages = ingest_report.get("stages")
    report_stages = report_stages if isinstance(report_stages, dict) else {}
    requested_statuses = {
        str(s or "").strip().upper()
        for s in (filters.get("requested_statuses") or [])
        if str(s or "").strip()
    }
    windowless_damage_videos = _collect_windowless_damage_videos(
        ingest_report,
        statuses=requested_statuses if requested_statuses else None,
    )
    if bool(filters.get("ingest_eligible_only")):
        windowless_damage_videos = [row for row in windowless_damage_videos if bool(row.get("ingest_eligible"))]
    min_video_damage_score = filters.get("min_video_damage_score")
    raw_by_content_type = filters.get("min_video_damage_score_by_content_type")
    by_content_type: Dict[str, float] = {}
    if isinstance(raw_by_content_type, dict):
        for raw_ct, raw_val in raw_by_content_type.items():
            if not isinstance(raw_ct, str):
                continue
            parsed = _parse_ratio(raw_val)
            if parsed is None:
                continue
            by_content_type[raw_ct] = parsed
    threshold: Optional[float] = None
    if isinstance(min_video_damage_score, (int, float)) and not isinstance(min_video_damage_score, bool):
        threshold = float(min_video_damage_score)
    if threshold is not None or by_content_type:
        windowless_damage_videos = [
            row for row in windowless_damage_videos
            if _dict_row_meets_damage_threshold(
                row,
                global_min=threshold,
                by_content_type=by_content_type,
            )
        ]
    windowless_by_status: Counter[str] = Counter()
    for item in windowless_damage_videos:
        windowless_by_status[str(item.get("status", "") or "UNKNOWN")] += 1

    target_video_ids = [v["video_id"] for v in video_rows]
    target_video_ids.extend(
        [
            str(item.get("video_id"))
            for item in windowless_damage_videos
            if isinstance(item, dict) and isinstance(item.get("video_id"), str)
        ]
    )
    artifact_hints = _collect_video_artifact_hints(
        ingest_report,
        target_video_ids=target_video_ids,
    )
    for item in video_rows:
        vid = item["video_id"]
        hints = artifact_hints.get(vid) or {}
        if hints:
            item["artifacts"] = hints
    for item in windowless_damage_videos:
        if not isinstance(item, dict):
            continue
        vid = item.get("video_id")
        if not isinstance(vid, str):
            continue
        hints = artifact_hints.get(vid) or {}
        if hints:
            item["artifacts"] = hints
    video_rows.sort(
        key=lambda item: (
            -(float(item.get("video_damage_score") or 0.0)),
            item["video_id"],
        )
    )
    return {
        "version": 1,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "input": {
            "ingest_quarantine_report": str(report_path),
            "manifest": ingest_report.get("manifest"),
            "source_filter": ingest_report.get("source_filter"),
            "report_scope": report_summary,
            "report_stages": report_stages,
        },
        "filters": filters,
        "summary": {
            "segment_windows": len(rows),
            "videos": len(video_rows),
            "ingest_eligible_segment_windows": ingest_eligible_rows,
            "ingest_eligible_videos": sum(1 for v in video_rows if bool(v.get("ingest_eligible"))),
            "windowless_damage_videos": len(windowless_damage_videos),
            "windowless_damage_videos_by_status": dict(windowless_by_status),
            "by_status": dict(by_status),
            "by_reason": dict(by_reason),
        },
        "videos": video_rows,
        "segment_windows": [row.to_dict() for row in rows],
        "windowless_damage_videos": windowless_damage_videos,
        "video_artifacts": {
            vid: artifact_hints[vid]
            for vid in sorted(artifact_hints)
            if artifact_hints.get(vid)
        },
    }


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Export segment repair worklist from ingest quarantine report")
    p.add_argument("--report", help="Explicit ingest quarantine report JSON path")
    p.add_argument("--manifest", help="Manifest path to auto-detect latest ingest quarantine report")
    p.add_argument("--source", help="Optional source filter for --manifest auto-detect")
    p.add_argument(
        "--status",
        action="append",
        default=[],
        help="Keep only statuses in {READY,REVIEW,BLOCKED} (repeatable)",
    )
    p.add_argument(
        "--ingest-eligible-only",
        action="store_true",
        help="Keep only windows for videos still ingest-eligible (typically REVIEW with allow-ingest REVIEW)",
    )
    p.add_argument(
        "--min-video-damage-score",
        type=float,
        help="Keep only rows with video_damage_score >= threshold (0..1). Rows without score are dropped.",
    )
    p.add_argument(
        "--min-video-damage-score-by-content-type",
        action="append",
        default=[],
        metavar="TYPE=RATIO",
        help="Override min damage score threshold for a content_type (repeatable).",
    )
    p.add_argument(
        "--keep-unmerged",
        action="store_true",
        help="Do not merge overlapping/touching windows per video/reason",
    )
    p.add_argument("--out", help="Write JSON worklist to this path")
    p.add_argument("--csv-out", help="Write flat CSV windows to this path")
    p.add_argument("--json", action="store_true", help="Print JSON to stdout")
    p.add_argument("--show", type=int, default=20, help="Rows to preview in text mode")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    if args.min_video_damage_score is not None and not (0.0 <= float(args.min_video_damage_score) <= 1.0):
        raise SystemExit(f"{LOG_PREFIX} ERROR: --min-video-damage-score must be within [0,1]")
    min_damage_by_content_type = _parse_content_type_ratio_rules(args.min_video_damage_score_by_content_type or [])

    requested_statuses = {str(s or "").strip().upper() for s in (args.status or []) if str(s or "").strip()}
    invalid = sorted(requested_statuses - {"READY", "REVIEW", "BLOCKED"})
    if invalid:
        raise SystemExit(f"{LOG_PREFIX} ERROR: invalid --status values: {invalid}")

    report_path = _resolve_ingest_report_path(
        explicit_report=args.report,
        manifest=args.manifest,
        source_filter=args.source,
    )
    if not report_path.exists():
        raise SystemExit(f"{LOG_PREFIX} ERROR: report not found: {report_path}")

    ingest_report = _load_json(report_path)
    if not isinstance(ingest_report, dict):
        raise SystemExit(f"{LOG_PREFIX} ERROR: invalid ingest quarantine report JSON: {report_path}")

    extracted_from = "ingest_report"
    rows = list(_iter_report_candidates(ingest_report))

    # READY rows are not present in ingest quarantine reports; source them from the
    # linked readiness summary when explicitly requested.
    if "READY" in requested_statuses:
        ready_rows = list(_iter_candidates_from_linked_readiness_summary(ingest_report, statuses={"READY"}))
        if ready_rows:
            rows.extend(ready_rows)
            extracted_from = "ingest_report+linked_readiness_summary"

    if not rows:
        fallback_rows = list(
            _iter_candidates_from_linked_readiness_summary(
                ingest_report,
                statuses=requested_statuses if requested_statuses else None,
            )
        )
        if fallback_rows:
            rows = fallback_rows
            extracted_from = "linked_readiness_summary"
    extracted_rows = len(rows)

    if requested_statuses:
        rows = [r for r in rows if r.status in requested_statuses]
    if args.ingest_eligible_only:
        rows = [r for r in rows if r.ingest_eligible]
    if args.min_video_damage_score is not None or min_damage_by_content_type:
        threshold = float(args.min_video_damage_score) if args.min_video_damage_score is not None else None
        rows = [
            r for r in rows
            if _candidate_meets_damage_threshold(
                r,
                global_min=threshold,
                by_content_type=min_damage_by_content_type,
            )
        ]
    if not args.keep_unmerged:
        rows = _merge_candidates(rows)

    filters = {
        "requested_statuses": sorted(requested_statuses),
        "ingest_eligible_only": bool(args.ingest_eligible_only),
        "min_video_damage_score": args.min_video_damage_score,
        "min_video_damage_score_by_content_type": {
            key: round(val, 6) for key, val in sorted(min_damage_by_content_type.items())
        },
        "merge_touching_windows": not bool(args.keep_unmerged),
        "extracted_from": extracted_from,
        "extracted_rows_before_filters": extracted_rows,
        "rows_after_filters": len(rows),
    }
    out_payload = _build_output(report_path=report_path, ingest_report=ingest_report, rows=rows, filters=filters)

    if args.out:
        out_path = Path(args.out)
        if not out_path.is_absolute():
            out_path = _repo_root() / out_path
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(out_payload, indent=2) + "\n", encoding="utf-8")
        print(f"{LOG_PREFIX} JSON written: {out_path}", file=sys.stderr)
    if args.csv_out:
        csv_path = Path(args.csv_out)
        if not csv_path.is_absolute():
            csv_path = _repo_root() / csv_path
        _write_csv(csv_path, rows)
        print(f"{LOG_PREFIX} CSV written: {csv_path}", file=sys.stderr)

    if args.json:
        print(json.dumps(out_payload, indent=2))
        return

    summary = out_payload["summary"]
    print(f"{LOG_PREFIX} Report: {report_path}")
    print(
        f"{LOG_PREFIX} Segment windows: {summary['segment_windows']} "
        f"(videos={summary['videos']}, ingest_eligible_windows={summary['ingest_eligible_segment_windows']})"
    )
    if summary.get("windowless_damage_videos"):
        print(
            f"{LOG_PREFIX} Windowless damage videos: {summary['windowless_damage_videos']} "
            f"{summary.get('windowless_damage_videos_by_status', {})}"
        )
    print(f"{LOG_PREFIX} By status: {summary['by_status']}")
    if summary["by_reason"]:
        top_reasons = sorted(summary["by_reason"].items(), key=lambda item: (-item[1], item[0]))[:8]
        print(f"{LOG_PREFIX} Top reasons: {dict(top_reasons)}")

    rows_preview = out_payload["segment_windows"][: max(0, int(args.show))]
    if rows_preview:
        print(f"{LOG_PREFIX} Preview ({len(rows_preview)}):")
        for row in rows_preview:
            score = row.get("video_damage_score")
            score_text = f"{float(score):.3f}" if isinstance(score, (int, float)) else "n/a"
            print(
                f"{LOG_PREFIX}   {row['video_id']} {row['status']} "
                f"{row['start_segment_id']}-{row['end_segment_id']} "
                f"damaged={row['damaged_segment_count']} span={row['window_span_segments']} "
                f"score={score_text} eligible={row['ingest_eligible']} reason={row['reason']}"
            )
    elif out_payload.get("windowless_damage_videos"):
        preview = out_payload["windowless_damage_videos"][: max(0, int(args.show))]
        print(f"{LOG_PREFIX} Windowless damage preview ({len(preview)}):")
        for row in preview:
            score = row.get("video_damage_score")
            severe = row.get("severe_damage_chunk_ratio")
            score_text = f"{float(score):.3f}" if isinstance(score, (int, float)) else "n/a"
            severe_text = f"{float(severe):.3f}" if isinstance(severe, (int, float)) else "n/a"
            print(
                f"{LOG_PREFIX}   {row['video_id']} {row['status']} score={score_text} severe={severe_text} "
                f"damaged_count={row.get('damaged_segment_count', 0)} eligible={row.get('ingest_eligible')} "
                f"reason={row.get('reason')}"
            )


if __name__ == "__main__":
    main()
