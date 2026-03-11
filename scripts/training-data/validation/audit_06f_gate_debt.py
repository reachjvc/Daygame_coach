#!/usr/bin/env python3
"""Audit historical videos against current Stage 06f overload gate policy.

This script identifies videos that would trigger current 06f overload rules
from existing 06e/06f artifacts but are not currently quarantined by a 06f gate
reason. It helps quantify leniency debt from runs completed before tighter gates.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


REPO_ROOT = Path(__file__).resolve().parents[3]
STAGE06E_ROOT = REPO_ROOT / "data/06e.LLM.quality-check"
STAGE06F_ROOT = REPO_ROOT / "data/06f.DET.damage-map"
QUARANTINE_ROOT = REPO_ROOT / "data/validation/quarantine"
DEFAULT_OUT = REPO_ROOT / "data/validation/runs/06f_gate_debt_audit.latest.json"


# Keep thresholds aligned with scripts/training-data/batch/pipeline-runner
STAGE06F_DAMAGE_SEED_TOTAL_BLOCK_THRESHOLD = 180
STAGE06F_DAMAGE_SEED_HIGH_BLOCK_THRESHOLD = 120
STAGE06F_LQ_TOTAL_BLOCK_ABSOLUTE_THRESHOLD = 130
STAGE06F_LQ_TOTAL_BLOCK_RATIO_THRESHOLD = 0.33
STAGE06F_LQ_TOTAL_BLOCK_RATIO_MIN_COUNT = 60
STAGE06F_LQ_TOTAL_BLOCK_EXTREME_RATIO_THRESHOLD = 0.48
STAGE06F_LQ_TOTAL_BLOCK_EXTREME_RATIO_MIN_COUNT = 25

GATE_CHECK_KEYS = {"stage06f_low_quality_overload", "stage06f_damage_seed_overload"}

VIDEO_ID_RE = re.compile(r"\[([A-Za-z0-9_-]{11})\]")


def _load_json(path: Path) -> Optional[Dict[str, Any]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if isinstance(data, dict):
        return data
    return None


def _iter_stage06e_files(root: Path) -> Iterable[Path]:
    yield from root.rglob("*.quality-check.json")


def _extract_video_id(path: Path) -> Optional[str]:
    m = VIDEO_ID_RE.search(path.name)
    if not m:
        return None
    return m.group(1)


def _infer_source(stage_root: Path, file_path: Path) -> Optional[str]:
    try:
        rel = file_path.relative_to(stage_root)
    except ValueError:
        return None
    if len(rel.parts) < 2:
        return None
    return rel.parts[0]


def _load_quarantine_checks(root: Path) -> Dict[str, set]:
    checks_by_video: Dict[str, set] = defaultdict(set)
    for qpath in sorted(root.glob("*.json")):
        payload = _load_json(qpath)
        if not payload:
            continue
        rows: List[Dict[str, Any]] = []
        for key in ("quarantined", "videos"):
            candidate = payload.get(key)
            if isinstance(candidate, list):
                rows.extend([item for item in candidate if isinstance(item, dict)])
        for row in rows:
            if not isinstance(row, dict):
                continue
            video_id = str(row.get("video_id", "")).strip()
            if not video_id:
                continue
            for check in row.get("checks", []) or []:
                if isinstance(check, str) and check.strip():
                    checks_by_video[video_id].add(check.strip())
    return checks_by_video


def _compute_seed_counts(stage06f_payload: Optional[Dict[str, Any]]) -> Tuple[int, int]:
    if not stage06f_payload:
        return 0, 0
    rows = stage06f_payload.get("segments")
    if not isinstance(rows, list):
        return 0, 0
    total = 0
    high = 0
    for row in rows:
        if not isinstance(row, dict):
            continue
        segment_id = row.get("segment_id")
        if isinstance(segment_id, bool) or not isinstance(segment_id, int):
            continue
        total += 1
        if str(row.get("severity", "")).strip().lower() == "high":
            high += 1
    return total, high


def _compute_lq_metrics(stage06e_payload: Dict[str, Any]) -> Tuple[int, int, float]:
    summary = stage06e_payload.get("summary")
    if not isinstance(summary, dict):
        return 0, 0, 0.0
    raw_lq = summary.get("low_quality_count", 0)
    raw_total = summary.get("segments_total", 0)
    if not isinstance(raw_lq, (int, float)) or isinstance(raw_lq, bool):
        return 0, 0, 0.0
    if not isinstance(raw_total, (int, float)) or isinstance(raw_total, bool):
        return int(raw_lq), 0, 0.0
    lq = int(raw_lq)
    total = int(raw_total)
    ratio = (float(lq) / float(total)) if total > 0 else 0.0
    return lq, total, ratio


def _evaluate_gate_triggers(
    *,
    lq_count: int,
    total_segments: int,
    lq_ratio: float,
    total_seed_count: int,
    high_seed_count: int,
) -> List[str]:
    triggers: List[str] = []
    if total_seed_count >= STAGE06F_DAMAGE_SEED_TOTAL_BLOCK_THRESHOLD:
        triggers.append(f"seed_total>={STAGE06F_DAMAGE_SEED_TOTAL_BLOCK_THRESHOLD}")
    if high_seed_count >= STAGE06F_DAMAGE_SEED_HIGH_BLOCK_THRESHOLD:
        triggers.append(f"seed_high>={STAGE06F_DAMAGE_SEED_HIGH_BLOCK_THRESHOLD}")

    if lq_count >= STAGE06F_LQ_TOTAL_BLOCK_ABSOLUTE_THRESHOLD:
        triggers.append(f"lq_abs>={STAGE06F_LQ_TOTAL_BLOCK_ABSOLUTE_THRESHOLD}")
    if lq_count >= STAGE06F_LQ_TOTAL_BLOCK_RATIO_MIN_COUNT and lq_ratio >= STAGE06F_LQ_TOTAL_BLOCK_RATIO_THRESHOLD:
        triggers.append(
            "lq_ratio>="
            f"{STAGE06F_LQ_TOTAL_BLOCK_RATIO_THRESHOLD:.2f}"
            f"_mincount_{STAGE06F_LQ_TOTAL_BLOCK_RATIO_MIN_COUNT}"
        )
    if lq_count >= STAGE06F_LQ_TOTAL_BLOCK_EXTREME_RATIO_MIN_COUNT and lq_ratio >= STAGE06F_LQ_TOTAL_BLOCK_EXTREME_RATIO_THRESHOLD:
        triggers.append(
            "lq_extreme_ratio>="
            f"{STAGE06F_LQ_TOTAL_BLOCK_EXTREME_RATIO_THRESHOLD:.2f}"
            f"_mincount_{STAGE06F_LQ_TOTAL_BLOCK_EXTREME_RATIO_MIN_COUNT}"
        )
    return triggers


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="Output JSON path.")
    parser.add_argument("--top", type=int, default=40, help="Top triggered-not-quarantined rows to keep.")
    args = parser.parse_args()

    checks_by_video = _load_quarantine_checks(QUARANTINE_ROOT)

    scanned = 0
    triggered = 0
    triggered_not_quarantined = 0
    triggered_rows: List[Dict[str, Any]] = []
    trigger_counter: Counter = Counter()

    for stage06e_path in _iter_stage06e_files(STAGE06E_ROOT):
        stage06e_payload = _load_json(stage06e_path)
        if not stage06e_payload:
            continue
        video_id = _extract_video_id(stage06e_path)
        source = _infer_source(STAGE06E_ROOT, stage06e_path)
        if not video_id or not source:
            continue

        scanned += 1
        lq_count, total_segments, lq_ratio = _compute_lq_metrics(stage06e_payload)

        stage06f_candidates = list((STAGE06F_ROOT / source).rglob(f"*{video_id}*.damage-map.json"))
        stage06f_path = max(stage06f_candidates, key=lambda p: p.stat().st_mtime, default=None)
        stage06f_payload = _load_json(stage06f_path) if stage06f_path else None
        total_seed_count, high_seed_count = _compute_seed_counts(stage06f_payload)

        triggers = _evaluate_gate_triggers(
            lq_count=lq_count,
            total_segments=total_segments,
            lq_ratio=lq_ratio,
            total_seed_count=total_seed_count,
            high_seed_count=high_seed_count,
        )
        if not triggers:
            continue

        triggered += 1
        for key in triggers:
            trigger_counter[key] += 1

        checks = sorted(checks_by_video.get(video_id, set()))
        has_06f_quarantine = bool(GATE_CHECK_KEYS.intersection(checks))
        if not has_06f_quarantine:
            triggered_not_quarantined += 1
            triggered_rows.append(
                {
                    "video_id": video_id,
                    "source": source,
                    "lq_count": lq_count,
                    "total_segments": total_segments,
                    "lq_ratio": round(lq_ratio, 6),
                    "total_seed_count": total_seed_count,
                    "high_seed_count": high_seed_count,
                    "triggers": triggers,
                    "current_checks": checks,
                    "stage06e_path": str(stage06e_path.relative_to(REPO_ROOT)),
                    "stage06f_path": str(stage06f_path.relative_to(REPO_ROOT)) if stage06f_path else None,
                }
            )

    triggered_rows.sort(key=lambda row: (row["lq_count"], row["lq_ratio"]), reverse=True)
    if args.top > 0:
        triggered_rows = triggered_rows[: args.top]

    out = {
        "scanned_stage06e_files": scanned,
        "triggered_by_current_06f_policy": triggered,
        "triggered_not_currently_quarantined_by_06f": triggered_not_quarantined,
        "trigger_counts": dict(trigger_counter),
        "thresholds": {
            "seed_total_block": STAGE06F_DAMAGE_SEED_TOTAL_BLOCK_THRESHOLD,
            "seed_high_block": STAGE06F_DAMAGE_SEED_HIGH_BLOCK_THRESHOLD,
            "lq_abs_block": STAGE06F_LQ_TOTAL_BLOCK_ABSOLUTE_THRESHOLD,
            "lq_ratio_block": STAGE06F_LQ_TOTAL_BLOCK_RATIO_THRESHOLD,
            "lq_ratio_min_count": STAGE06F_LQ_TOTAL_BLOCK_RATIO_MIN_COUNT,
            "lq_extreme_ratio_block": STAGE06F_LQ_TOTAL_BLOCK_EXTREME_RATIO_THRESHOLD,
            "lq_extreme_ratio_min_count": STAGE06F_LQ_TOTAL_BLOCK_EXTREME_RATIO_MIN_COUNT,
        },
        "top_triggered_not_quarantined": triggered_rows,
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, indent=2), encoding="utf-8")

    print(f"scanned_stage06e_files={scanned}")
    print(f"triggered_by_current_06f_policy={triggered}")
    print(f"triggered_not_currently_quarantined_by_06f={triggered_not_quarantined}")
    print(f"report={out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
