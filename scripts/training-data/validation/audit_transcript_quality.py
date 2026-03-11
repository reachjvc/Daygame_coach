#!/usr/bin/env python3
"""
Audit Stage 06 transcript quality / speaker-collapse vs Stage 06b outcomes.

Purpose:
- quantify when transcript/diarization quality is strongly predictive of 06b failures
- identify a high-risk candidate set for targeted re-transcription experiments
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

VIDEO_ID_RE = re.compile(r"\[([A-Za-z0-9_-]{11})\]")


def _latest_by_video(pattern: str) -> Dict[str, str]:
    latest: Dict[str, str] = {}
    for path in glob.glob(pattern, recursive=True):
        match = VIDEO_ID_RE.search(os.path.basename(path))
        if not match:
            continue
        video_id = match.group(1)
        prev = latest.get(video_id)
        if prev is None or os.path.getmtime(path) > os.path.getmtime(prev):
            latest[video_id] = path
    return latest


def _score_bucket(score: Optional[float]) -> str:
    if score is None:
        return "missing"
    if score <= 35:
        return "<=35"
    if score <= 45:
        return "36-45"
    if score <= 55:
        return "46-55"
    if score <= 70:
        return "56-70"
    return "71+"


def _collapse_bucket(total_affected: int) -> str:
    if total_affected <= 0:
        return "none"
    if total_affected < 20:
        return "1-19"
    if total_affected < 50:
        return "20-49"
    if total_affected < 100:
        return "50-99"
    return "100+"


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit transcript quality and collapse risk against 06b outcomes.")
    parser.add_argument(
        "--stage06-glob",
        default="data/06.LLM.video-type/**/*.conversations.json",
        help="Glob for Stage 06 outputs",
    )
    parser.add_argument(
        "--stage06b-glob",
        default="data/06b.LLM.verify/**/*.verification.json",
        help="Glob for Stage 06b outputs",
    )
    parser.add_argument(
        "--risk-transcript-score-max",
        type=float,
        default=45.0,
        help="Transcript score threshold for high-risk candidate set",
    )
    parser.add_argument(
        "--risk-collapse-total-min",
        type=int,
        default=50,
        help="Collapsed affected segment threshold for high-risk candidate set",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=30,
        help="Max high-risk candidates to print",
    )
    parser.add_argument(
        "--out",
        help="Optional JSON output file",
    )
    args = parser.parse_args()

    stage06_latest = _latest_by_video(args.stage06_glob)
    stage06b_latest = _latest_by_video(args.stage06b_glob)

    verdict_by_score_bucket: Dict[str, Counter[str]] = defaultdict(Counter)
    verdict_by_collapse_bucket: Dict[str, Counter[str]] = defaultdict(Counter)
    high_risk_rows: List[dict] = []
    total_rows = 0

    for video_id, stage06_path in stage06_latest.items():
        payload06 = json.loads(Path(stage06_path).read_text(encoding="utf-8"))
        transcript_confidence = payload06.get("transcript_confidence")
        transcript_score: Optional[float] = None
        if isinstance(transcript_confidence, dict):
            raw_score = transcript_confidence.get("score")
            if isinstance(raw_score, (int, float)) and not isinstance(raw_score, bool):
                transcript_score = float(raw_score)

        collapse_meta = payload06.get("speaker_collapse")
        collapse_total = 0
        collapse_detected = False
        if isinstance(collapse_meta, dict) and bool(collapse_meta.get("detected")):
            collapse_detected = True
            raw_total = collapse_meta.get("total_segments_affected", 0)
            if isinstance(raw_total, (int, float)) and not isinstance(raw_total, bool):
                collapse_total = int(raw_total)

        verdict = "MISSING"
        stage06b_path = stage06b_latest.get(video_id)
        if stage06b_path is not None:
            payload06b = json.loads(Path(stage06b_path).read_text(encoding="utf-8"))
            verdict = str(
                payload06b.get("verdict") or payload06b.get("overall_verdict") or "MISSING"
            ).strip().upper()

        total_rows += 1
        verdict_by_score_bucket[_score_bucket(transcript_score)][verdict] += 1
        verdict_by_collapse_bucket[_collapse_bucket(collapse_total)][verdict] += 1

        high_risk = False
        if transcript_score is not None and transcript_score <= float(args.risk_transcript_score_max):
            high_risk = True
        if collapse_detected and collapse_total >= int(args.risk_collapse_total_min):
            high_risk = True
        if high_risk and verdict != "APPROVE":
            high_risk_rows.append(
                {
                    "video_id": video_id,
                    "transcript_score": transcript_score,
                    "collapse_detected": collapse_detected,
                    "collapse_total_affected": collapse_total,
                    "stage06_path": stage06_path,
                    "stage06b_path": stage06b_path,
                    "stage06b_verdict": verdict,
                }
            )

    high_risk_rows.sort(
        key=lambda row: (
            -int(row.get("collapse_total_affected") or 0),
            float(row.get("transcript_score") if row.get("transcript_score") is not None else 999.0),
            str(row.get("video_id") or ""),
        )
    )

    print(f"[audit-transcript-quality] rows={total_rows}")
    print("[audit-transcript-quality] verdict by transcript score bucket:")
    for bucket in ["<=35", "36-45", "46-55", "56-70", "71+", "missing"]:
        counts = verdict_by_score_bucket.get(bucket)
        if counts:
            print(f"  {bucket}: {dict(counts)}")

    print("[audit-transcript-quality] verdict by collapse-affected bucket:")
    for bucket in ["none", "1-19", "20-49", "50-99", "100+"]:
        counts = verdict_by_collapse_bucket.get(bucket)
        if counts:
            print(f"  {bucket}: {dict(counts)}")

    print(
        "[audit-transcript-quality] high-risk candidates "
        f"(score<={args.risk_transcript_score_max} or collapse>={args.risk_collapse_total_min}, non-APPROVE): "
        f"{len(high_risk_rows)}"
    )
    for row in high_risk_rows[: max(0, int(args.top))]:
        print(
            "  "
            f"{row['video_id']} verdict={row['stage06b_verdict']} "
            f"score={row['transcript_score']} collapse={row['collapse_total_affected']}"
        )

    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "rows": total_rows,
            "verdict_by_score_bucket": {
                bucket: dict(counter) for bucket, counter in verdict_by_score_bucket.items()
            },
            "verdict_by_collapse_bucket": {
                bucket: dict(counter) for bucket, counter in verdict_by_collapse_bucket.items()
            },
            "high_risk_candidates": high_risk_rows,
        }
        out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        print(f"[audit-transcript-quality] wrote: {out_path}")


if __name__ == "__main__":
    main()
