#!/usr/bin/env python3
"""
scripts/training-data/validation/export_windowless_damage_fallback_manifest.py

Build a coarse fallback reverify manifest for videos with positive damage scores but
no localized damage windows/segment IDs ("windowless" damage).

Input is a repair/spotcheck worklist emitted by export_segment_repair_worklist.py.
This preserves the pipeline's primary path (segment-localized repair) while giving
an automated second path when localization fails.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional

LOG_PREFIX = "[export-windowless-fallback-manifest]"
SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")
VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _safe_name(raw: str) -> str:
    return SAFE_NAME_RE.sub("_", str(raw or "").strip()).strip("_") or "report"


def _load_json(path: Path) -> Optional[Dict[str, Any]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def _resolve_worklist_path(explicit: Optional[str], manifest: Optional[str], source: Optional[str]) -> Path:
    if explicit:
        p = Path(explicit)
        if not p.is_absolute():
            p = _repo_root() / p
        return p
    if not manifest:
        raise SystemExit(f"{LOG_PREFIX} ERROR: provide --worklist or --manifest")
    manifest_path = Path(manifest)
    if not manifest_path.is_absolute():
        manifest_path = _repo_root() / manifest_path
    label = _safe_name(manifest_path.stem if not source else f"{manifest_path.stem}.{source}")
    return _repo_root() / "data" / "validation" / "repair_worklists" / f"{label}.repair-worklist.json"


def _parse_finite_float(value: Any) -> Optional[float]:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        num = float(value)
        if num == num and num not in {float("inf"), float("-inf")}:  # finite
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


def _parse_int(value: Any) -> Optional[int]:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return None


def _resolve_artifact_path(raw: Any) -> Optional[Path]:
    if not isinstance(raw, str) or not raw.strip():
        return None
    p = Path(raw.strip())
    if not p.is_absolute():
        p = _repo_root() / p
    return p


def _normalize_artifacts_map(worklist: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    out: Dict[str, Dict[str, Any]] = {}
    top = worklist.get("video_artifacts")
    if isinstance(top, dict):
        for raw_vid, raw_art in top.items():
            if not isinstance(raw_vid, str) or not VIDEO_ID_RE.fullmatch(raw_vid):
                continue
            if isinstance(raw_art, dict):
                out[raw_vid] = dict(raw_art)

    videos = worklist.get("videos")
    if isinstance(videos, list):
        for row in videos:
            if not isinstance(row, dict):
                continue
            vid = row.get("video_id")
            if not isinstance(vid, str) or not VIDEO_ID_RE.fullmatch(vid):
                continue
            artifacts = row.get("artifacts")
            if not isinstance(artifacts, dict):
                continue
            bucket = out.setdefault(vid, {})
            for key, val in artifacts.items():
                if key not in bucket and isinstance(val, (str, int, float, bool, list, dict)):
                    bucket[key] = val
    return out


def _extract_chunk_probe_candidates(
    artifacts: Dict[str, Any],
    *,
    max_chunks: int,
    chunk_confidence_max: Optional[float],
) -> List[Dict[str, Any]]:
    if max_chunks <= 0:
        return []
    chunks_path = _resolve_artifact_path(artifacts.get("stage09_chunks"))
    if chunks_path is None or not chunks_path.exists():
        return []
    payload = _load_json(chunks_path)
    if not isinstance(payload, dict):
        return []
    chunks = payload.get("chunks")
    if not isinstance(chunks, list):
        return []

    rows: List[Dict[str, Any]] = []
    for idx, item in enumerate(chunks):
        if not isinstance(item, dict):
            continue
        md = item.get("metadata") if isinstance(item.get("metadata"), dict) else {}
        conf = _parse_ratio(md.get("chunk_confidence_score"))
        if conf is None:
            conf = _parse_ratio(md.get("chunkConfidenceScore"))
        if chunk_confidence_max is not None and conf is not None and conf > chunk_confidence_max:
            continue

        chunk_index = _parse_int(md.get("chunkIndex"))
        if chunk_index is None:
            chunk_index = idx
        start_sec = _parse_finite_float(md.get("startSec"))
        end_sec = _parse_finite_float(md.get("endSec"))
        asr_lq = _parse_int(md.get("asrLowQualitySegmentCount"))
        damaged_ids = md.get("damaged_segment_ids") if isinstance(md.get("damaged_segment_ids"), list) else []
        related_conversation_id = _parse_int(md.get("relatedConversationId"))
        problematic_reason = md.get("problematicReason") if isinstance(md.get("problematicReason"), str) else None
        segment_type = md.get("segmentType") if isinstance(md.get("segmentType"), str) else None
        block_index = _parse_int(md.get("blockIndex"))

        rows.append(
            {
                "chunk_index": int(chunk_index),
                "chunk_confidence_score": round(conf, 6) if conf is not None else None,
                "start_sec": round(start_sec, 3) if start_sec is not None else None,
                "end_sec": round(end_sec, 3) if end_sec is not None else None,
                "segment_type": segment_type,
                "problematic_reason": problematic_reason,
                "asr_low_quality_segment_count": max(0, int(asr_lq)) if isinstance(asr_lq, int) else 0,
                "damaged_segment_id_count": len([x for x in damaged_ids if _parse_int(x) is not None]),
                "related_conversation_id": related_conversation_id,
                "block_index": block_index,
            }
        )

    rows.sort(
        key=lambda r: (
            r.get("chunk_confidence_score") is None,
            float(r.get("chunk_confidence_score") or 1.1),
            -int(r.get("asr_low_quality_segment_count") or 0),
            int(r.get("chunk_index") or 0),
        )
    )
    return rows[:max_chunks]


def _recommended_strategy(artifacts: Dict[str, Any], chunk_probes: List[Dict[str, Any]]) -> str:
    if chunk_probes:
        return "chunk_probe_reverify"
    if isinstance(artifacts.get("stage09_chunks"), str) and str(artifacts.get("stage09_chunks")).strip():
        return "chunk_scan_reverify"
    if any(isinstance(artifacts.get(k), str) and str(artifacts.get(k)).strip() for k in (
        "stage06c_conversations", "stage06d_conversations", "stage06_conversations", "stage07_enriched"
    )):
        return "segment_sweep_reverify"
    return "manual_full_video_review"


def _task_actions(strategy: str) -> List[str]:
    if strategy == "chunk_probe_reverify":
        return [
            "Reverify the listed low-confidence chunks first",
            "If issues confirm, expand to neighboring chunks and regenerate localization",
        ]
    if strategy == "chunk_scan_reverify":
        return [
            "Run chunk-level confidence/damage scan to regenerate localized windows",
            "Escalate to segment sweep only if chunk scan remains non-localizing",
        ]
    if strategy == "segment_sweep_reverify":
        return [
            "Run conversation/segment sweep reverify on 06c/07 artifacts",
            "Regenerate damage localization and rerun readiness",
        ]
    return [
        "Manual full-video review required (no chunk/segment artifacts available)",
        "Capture localized windows so future retries can use targeted repair",
    ]


def _build_manifest(
    worklist_path: Path,
    worklist: Dict[str, Any],
    *,
    statuses: Optional[set[str]],
    ingest_eligible_only: bool,
    max_videos: Optional[int],
    max_chunks_per_video: int,
    chunk_confidence_max: Optional[float],
) -> Dict[str, Any]:
    raw_rows = worklist.get("windowless_damage_videos")
    rows = raw_rows if isinstance(raw_rows, list) else []
    artifacts_by_vid = _normalize_artifacts_map(worklist)

    tasks: List[Dict[str, Any]] = []
    by_status: Counter[str] = Counter()
    by_strategy: Counter[str] = Counter()
    for row in rows:
        if not isinstance(row, dict):
            continue
        vid = row.get("video_id")
        if not isinstance(vid, str) or not VIDEO_ID_RE.fullmatch(vid):
            continue
        status = str(row.get("status", "")).strip().upper() or "UNKNOWN"
        if statuses and status not in statuses:
            continue
        ingest_eligible = bool(row.get("ingest_eligible"))
        if ingest_eligible_only and not ingest_eligible:
            continue
        artifacts = artifacts_by_vid.get(vid, {})
        chunk_probes = _extract_chunk_probe_candidates(
            artifacts,
            max_chunks=max_chunks_per_video,
            chunk_confidence_max=chunk_confidence_max,
        )
        strategy = _recommended_strategy(artifacts, chunk_probes)
        task = {
            "video_id": vid,
            "source": row.get("source") if isinstance(row.get("source"), str) else None,
            "content_type": row.get("content_type") if isinstance(row.get("content_type"), str) else None,
            "status": status,
            "ingest_eligible": ingest_eligible,
            "reason": row.get("reason") if isinstance(row.get("reason"), str) else None,
            "video_damage_score": round(float(row["video_damage_score"]), 6)
            if isinstance(row.get("video_damage_score"), (int, float)) and not isinstance(row.get("video_damage_score"), bool)
            else None,
            "severe_damage_chunk_ratio": round(float(row["severe_damage_chunk_ratio"]), 6)
            if isinstance(row.get("severe_damage_chunk_ratio"), (int, float)) and not isinstance(row.get("severe_damage_chunk_ratio"), bool)
            else None,
            "damaged_segment_count": int(row.get("damaged_segment_count") or 0),
            "strategy": strategy,
            "recommended_actions": _task_actions(strategy),
            "chunk_probe_candidates": chunk_probes,
            "artifacts": artifacts,
        }
        tasks.append(task)
        by_status[status] += 1
        by_strategy[strategy] += 1

    tasks.sort(
        key=lambda t: (
            -(float(t.get("video_damage_score") or 0.0)),
            str(t.get("video_id") or ""),
        )
    )
    if isinstance(max_videos, int) and max_videos >= 0:
        tasks = tasks[:max_videos]
        by_status = Counter(str(t.get("status") or "UNKNOWN") for t in tasks)
        by_strategy = Counter(str(t.get("strategy") or "unknown") for t in tasks)

    worklist_summary = worklist.get("summary") if isinstance(worklist.get("summary"), dict) else {}
    return {
        "version": 1,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "input": {
            "worklist": str(worklist_path),
            "worklist_input": worklist.get("input"),
            "worklist_filters": worklist.get("filters"),
            "worklist_summary": worklist_summary,
        },
        "filters": {
            "requested_statuses": sorted(statuses) if statuses else [],
            "ingest_eligible_only": bool(ingest_eligible_only),
            "max_videos": max_videos,
            "max_chunks_per_video": max_chunks_per_video,
            "chunk_confidence_max": chunk_confidence_max,
        },
        "summary": {
            "windowless_damage_videos": len(tasks),
            "ingest_eligible_videos": sum(1 for t in tasks if bool(t.get("ingest_eligible"))),
            "by_status": dict(by_status),
            "by_strategy": dict(by_strategy),
        },
        "tasks": tasks,
    }


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Export coarse fallback reverify manifest for windowless damage videos")
    p.add_argument("--worklist", help="Explicit repair/spotcheck worklist JSON path")
    p.add_argument("--manifest", help="Manifest path to resolve default repair worklist path")
    p.add_argument("--source", help="Optional source filter for --manifest worklist path")
    p.add_argument("--status", action="append", default=[], help="Keep only statuses in {READY,REVIEW,BLOCKED}")
    p.add_argument("--ingest-eligible-only", action="store_true", help="Keep only ingest-eligible videos")
    p.add_argument("--max-videos", type=int, help="Limit number of videos in output")
    p.add_argument("--max-chunks-per-video", type=int, default=5, help="Max chunk probes per video (default: 5)")
    p.add_argument(
        "--chunk-confidence-max",
        type=float,
        default=0.85,
        help="Only include chunk probes at or below this confidence score (default: 0.85).",
    )
    p.add_argument("--out", help="Write JSON manifest to this path")
    p.add_argument("--json", action="store_true", help="Print JSON to stdout")
    p.add_argument("--show", type=int, default=10, help="Preview rows in text mode")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    if args.max_videos is not None and args.max_videos < 0:
        raise SystemExit(f"{LOG_PREFIX} ERROR: --max-videos must be >= 0")
    if args.max_chunks_per_video is not None and args.max_chunks_per_video < 0:
        raise SystemExit(f"{LOG_PREFIX} ERROR: --max-chunks-per-video must be >= 0")
    if args.chunk_confidence_max is not None and not (0.0 <= float(args.chunk_confidence_max) <= 1.0):
        raise SystemExit(f"{LOG_PREFIX} ERROR: --chunk-confidence-max must be within [0,1]")

    requested_statuses = {str(s or "").strip().upper() for s in (args.status or []) if str(s or "").strip()}
    invalid = sorted(requested_statuses - {"READY", "REVIEW", "BLOCKED"})
    if invalid:
        raise SystemExit(f"{LOG_PREFIX} ERROR: invalid --status values: {invalid}")

    worklist_path = _resolve_worklist_path(args.worklist, args.manifest, args.source)
    if not worklist_path.exists():
        raise SystemExit(f"{LOG_PREFIX} ERROR: worklist not found: {worklist_path}")
    worklist = _load_json(worklist_path)
    if not isinstance(worklist, dict):
        raise SystemExit(f"{LOG_PREFIX} ERROR: invalid worklist JSON: {worklist_path}")

    payload = _build_manifest(
        worklist_path,
        worklist,
        statuses=requested_statuses if requested_statuses else None,
        ingest_eligible_only=bool(args.ingest_eligible_only),
        max_videos=args.max_videos,
        max_chunks_per_video=int(args.max_chunks_per_video or 0),
        chunk_confidence_max=(float(args.chunk_confidence_max) if args.chunk_confidence_max is not None else None),
    )

    if args.out:
        out_path = Path(args.out)
        if not out_path.is_absolute():
            out_path = _repo_root() / out_path
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        print(f"{LOG_PREFIX} JSON written: {out_path}", file=sys.stderr)

    if args.json:
        print(json.dumps(payload, indent=2))
        return

    summary = payload.get("summary") or {}
    print(f"{LOG_PREFIX} Worklist: {worklist_path}")
    print(
        f"{LOG_PREFIX} Windowless tasks: {summary.get('windowless_damage_videos', 0)} "
        f"(ingest_eligible={summary.get('ingest_eligible_videos', 0)})"
    )
    print(f"{LOG_PREFIX} By status: {summary.get('by_status', {})}")
    print(f"{LOG_PREFIX} By strategy: {summary.get('by_strategy', {})}")

    tasks = payload.get("tasks") or []
    preview = tasks[: max(0, int(args.show))]
    if preview:
        print(f"{LOG_PREFIX} Preview ({len(preview)}):")
        for row in preview:
            score = row.get("video_damage_score")
            score_text = f"{float(score):.3f}" if isinstance(score, (int, float)) else "n/a"
            print(
                f"{LOG_PREFIX}   {row.get('video_id')} {row.get('status')} score={score_text} "
                f"strategy={row.get('strategy')} chunk_probes={len(row.get('chunk_probe_candidates') or [])} "
                f"eligible={row.get('ingest_eligible')} reason={row.get('reason')}"
            )


if __name__ == "__main__":
    main()
