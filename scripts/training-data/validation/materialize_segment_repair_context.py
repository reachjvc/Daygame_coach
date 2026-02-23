#!/usr/bin/env python3
"""
scripts/training-data/validation/materialize_segment_repair_context.py

Materialize segment-level context packets from a repair worklist exported by
`export_segment_repair_worklist.py`.

Reads the worklist's per-video artifact hints (Stage 06c/06d/06 and Stage 07),
then extracts the exact segment windows (optionally expanded) into a single JSON
payload for targeted repair/reverify tooling.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

LOG_PREFIX = "[materialize-segment-repair-context]"
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


def _parse_int(value: Any) -> Optional[int]:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return None


def _select_segment_source_path(artifacts: Dict[str, Any]) -> Optional[str]:
    for key in ("stage06c_conversations", "stage06d_conversations", "stage06_conversations"):
        raw = artifacts.get(key)
        if isinstance(raw, str) and raw.strip():
            return raw.strip()
    return None


def _load_segments_by_id(path_text: Optional[str]) -> Tuple[Dict[int, Dict[str, Any]], List[int], Optional[str]]:
    if not path_text:
        return {}, [], None
    p = Path(path_text)
    if not p.is_absolute():
        p = _repo_root() / p
    payload = _load_json(p)
    if not isinstance(payload, dict):
        return {}, [], str(p)
    segs = payload.get("segments")
    if not isinstance(segs, list):
        return {}, [], str(p)
    out: Dict[int, Dict[str, Any]] = {}
    for seg in segs:
        if not isinstance(seg, dict):
            continue
        sid = _parse_int(seg.get("id"))
        if sid is None:
            continue
        out[sid] = seg
    return out, sorted(out.keys()), str(p)


def _segment_projection(seg06x: Optional[Dict[str, Any]], seg07: Optional[Dict[str, Any]], *, in_target: bool) -> Dict[str, Any]:
    base = seg06x if isinstance(seg06x, dict) else {}
    enrich = seg07 if isinstance(seg07, dict) else {}
    sid = _parse_int((base or enrich).get("id"))
    start = (base or enrich).get("start")
    end = (base or enrich).get("end")
    text06 = base.get("text") if isinstance(base.get("text"), str) else None
    text07 = enrich.get("text") if isinstance(enrich.get("text"), str) else None
    out: Dict[str, Any] = {
        "id": sid,
        "start": float(start) if isinstance(start, (int, float)) else None,
        "end": float(end) if isinstance(end, (int, float)) else None,
        "speaker_role": base.get("speaker_role") if isinstance(base.get("speaker_role"), str) else (
            enrich.get("speaker_role") if isinstance(enrich.get("speaker_role"), str) else None
        ),
        "segment_type": base.get("segment_type") if isinstance(base.get("segment_type"), str) else (
            enrich.get("segment_type") if isinstance(enrich.get("segment_type"), str) else None
        ),
        "conversation_id": _parse_int(base.get("conversation_id")) if _parse_int(base.get("conversation_id")) is not None else _parse_int(enrich.get("conversation_id")),
        "in_target_window": in_target,
        "text": text06 if isinstance(text06, str) else text07,
    }
    if isinstance(text06, str):
        out["text_stage06x"] = text06
    if isinstance(text07, str):
        out["text_stage07"] = text07
        out["text_modified_between_06x_07"] = bool(isinstance(text06, str) and text06 != text07)
    if isinstance(enrich.get("confidence_tier"), str):
        out["confidence_tier"] = enrich.get("confidence_tier")
    if isinstance(enrich.get("segment_confidence"), (int, float)):
        out["segment_confidence"] = float(enrich.get("segment_confidence"))
    if isinstance(enrich.get("contains_repaired_text"), bool):
        out["contains_repaired_text"] = bool(enrich.get("contains_repaired_text"))
    if isinstance(enrich.get("contamination_sources"), list):
        vals = [x for x in enrich.get("contamination_sources") if isinstance(x, str) and x.strip()]
        if vals:
            out["contamination_sources"] = vals
    if isinstance(enrich.get("damage_reason_codes"), list):
        vals = [x for x in enrich.get("damage_reason_codes") if isinstance(x, str) and x.strip()]
        if vals:
            out["damage_reason_codes"] = vals
    return out


def _materialize_context(
    *,
    worklist: Dict[str, Any],
    radius: int,
    video_limit: Optional[int],
    window_limit: Optional[int],
) -> Dict[str, Any]:
    videos = worklist.get("videos")
    if not isinstance(videos, list):
        videos = []
    top_level_video_artifacts = worklist.get("video_artifacts")
    if not isinstance(top_level_video_artifacts, dict):
        top_level_video_artifacts = {}

    packets: List[Dict[str, Any]] = []
    missing_artifact_counts: Counter[str] = Counter()
    windows_processed = 0

    selected_videos = videos[: video_limit] if isinstance(video_limit, int) and video_limit >= 0 else videos
    for video_row in selected_videos:
        if not isinstance(video_row, dict):
            continue
        vid = video_row.get("video_id")
        if not isinstance(vid, str) or not VIDEO_ID_RE.fullmatch(vid.strip()):
            continue
        artifacts = video_row.get("artifacts")
        if not isinstance(artifacts, dict):
            fallback_artifacts = top_level_video_artifacts.get(vid)
            if isinstance(fallback_artifacts, dict):
                artifacts = fallback_artifacts
        if not isinstance(artifacts, dict):
            missing_artifact_counts["missing_artifacts"] += 1
            continue

        seg06x_path = _select_segment_source_path(artifacts)
        seg06x_map, seg06x_ids, seg06x_path_resolved = _load_segments_by_id(seg06x_path)
        if not seg06x_map:
            missing_artifact_counts["missing_stage06x_segments"] += 1
            continue

        seg07_map, _, seg07_path_resolved = _load_segments_by_id(
            artifacts.get("stage07_enriched") if isinstance(artifacts.get("stage07_enriched"), str) else None
        )
        if not seg07_map:
            missing_artifact_counts["missing_stage07_segments"] += 1

        windows = video_row.get("windows")
        if not isinstance(windows, list):
            continue
        local_windows = windows[: window_limit] if isinstance(window_limit, int) and window_limit >= 0 else windows

        for idx, win in enumerate(local_windows):
            if not isinstance(win, dict):
                continue
            start = _parse_int(win.get("start_segment_id"))
            end = _parse_int(win.get("end_segment_id"))
            if start is None or end is None:
                continue
            if end < start:
                start, end = end, start
            ext_start = max(0, start - max(0, radius))
            ext_end = end + max(0, radius)
            selected_ids = [sid for sid in seg06x_ids if ext_start <= sid <= ext_end]
            if not selected_ids:
                continue

            segment_rows: List[Dict[str, Any]] = []
            for sid in selected_ids:
                segment_rows.append(
                    _segment_projection(
                        seg06x_map.get(sid),
                        seg07_map.get(sid),
                        in_target=(start <= sid <= end),
                    )
                )

            packets.append(
                {
                    "video_id": vid,
                    "source": video_row.get("source"),
                    "status": video_row.get("status"),
                    "ingest_eligible": bool(video_row.get("ingest_eligible")),
                    "reason": video_row.get("reason"),
                    "video_damage_score": video_row.get("video_damage_score"),
                    "window_index": idx,
                    "target_window": {
                        "start_segment_id": start,
                        "end_segment_id": end,
                        "damaged_segment_count": win.get("damaged_segment_count"),
                        "window_span_segments": win.get("window_span_segments"),
                    },
                    "expanded_window": {
                        "start_segment_id": ext_start,
                        "end_segment_id": ext_end,
                        "context_radius_segments": max(0, radius),
                    },
                    "artifacts": {
                        "stage06x_segments": seg06x_path_resolved,
                        "stage07_segments": seg07_path_resolved,
                        "readiness_report": artifacts.get("readiness_report"),
                        "stage09_chunks": artifacts.get("stage09_chunks"),
                    },
                    "segments": segment_rows,
                }
            )
            windows_processed += 1

    summary = worklist.get("summary") if isinstance(worklist.get("summary"), dict) else {}
    windowless_damage_videos = worklist.get("windowless_damage_videos")
    if not isinstance(windowless_damage_videos, list):
        windowless_damage_videos = []
    return {
        "version": 1,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "worklist_input": worklist.get("input"),
        "worklist_filters": worklist.get("filters"),
        "materialization": {
            "context_radius_segments": max(0, radius),
            "video_limit": video_limit,
            "window_limit_per_video": window_limit,
            "worklist_summary": summary,
            "windows_materialized": windows_processed,
            "windowless_damage_videos": len(windowless_damage_videos),
            "missing_artifact_counts": dict(missing_artifact_counts),
        },
        "windows": packets,
        "windowless_damage_videos": windowless_damage_videos,
    }


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Materialize segment repair context from repair worklist JSON")
    p.add_argument("--worklist", help="Explicit repair worklist JSON path")
    p.add_argument("--manifest", help="Manifest path to resolve default repair worklist path")
    p.add_argument("--source", help="Optional source filter for --manifest worklist path")
    p.add_argument("--radius", type=int, default=0, help="Extra context radius in segment IDs (default: 0)")
    p.add_argument("--max-videos", type=int, help="Limit videos processed")
    p.add_argument("--max-windows", type=int, help="Limit windows per video")
    p.add_argument("--out", help="Write output JSON to this path")
    p.add_argument("--json", action="store_true", help="Print JSON to stdout")
    p.add_argument("--show", type=int, default=10, help="Preview packets in text mode")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    if args.radius is not None and args.radius < 0:
        raise SystemExit(f"{LOG_PREFIX} ERROR: --radius must be >= 0")
    if args.max_videos is not None and args.max_videos < 0:
        raise SystemExit(f"{LOG_PREFIX} ERROR: --max-videos must be >= 0")
    if args.max_windows is not None and args.max_windows < 0:
        raise SystemExit(f"{LOG_PREFIX} ERROR: --max-windows must be >= 0")

    worklist_path = _resolve_worklist_path(args.worklist, args.manifest, args.source)
    if not worklist_path.exists():
        raise SystemExit(f"{LOG_PREFIX} ERROR: worklist not found: {worklist_path}")
    worklist = _load_json(worklist_path)
    if not isinstance(worklist, dict):
        raise SystemExit(f"{LOG_PREFIX} ERROR: invalid worklist JSON: {worklist_path}")

    payload = _materialize_context(
        worklist=worklist,
        radius=int(args.radius or 0),
        video_limit=args.max_videos,
        window_limit=args.max_windows,
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

    mat = payload["materialization"]
    print(f"{LOG_PREFIX} Worklist: {worklist_path}")
    print(
        f"{LOG_PREFIX} Windows materialized: {mat['windows_materialized']} "
        f"(radius={mat['context_radius_segments']}, missing={mat['missing_artifact_counts']})"
    )
    windows = payload.get("windows") or []
    preview = windows[: max(0, int(args.show))]
    if preview:
        print(f"{LOG_PREFIX} Preview ({len(preview)}):")
        for row in preview:
            tgt = row.get("target_window") or {}
            exp = row.get("expanded_window") or {}
            segs = row.get("segments") or []
            print(
                f"{LOG_PREFIX}   {row.get('video_id')} {row.get('status')} "
                f"target={tgt.get('start_segment_id')}-{tgt.get('end_segment_id')} "
                f"expanded={exp.get('start_segment_id')}-{exp.get('end_segment_id')} "
                f"segments={len(segs)} reason={row.get('reason')}"
            )


if __name__ == "__main__":
    main()
