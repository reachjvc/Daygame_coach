#!/usr/bin/env python3
"""
Simulate readiness-threshold tightening on existing readiness-summary artifacts.

This tool is intentionally conservative:
- `BLOCKED` videos stay `BLOCKED`
- `REVIEW` videos stay `REVIEW`
- only `READY` videos can move to `REVIEW` when damage metrics exceed candidate thresholds

Use this to compare candidate review thresholds before changing pipeline policy.
"""

from __future__ import annotations

import argparse
import glob
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple


@dataclass(frozen=True)
class VideoRow:
    batch_id: str
    generated_at: str
    video_id: str
    status: str
    reason_code: str
    damaged_chunk_ratio: float
    severe_damage_chunk_ratio: float
    video_damage_score: float


@dataclass(frozen=True)
class Candidate:
    review_video_damage_score: float
    review_damaged_chunk_ratio: float
    review_severe_damage_chunk_ratio: float


def _parse_float_list(text: str) -> List[float]:
    values: List[float] = []
    for raw in text.split(","):
        item = raw.strip()
        if not item:
            continue
        values.append(float(item))
    return values


def _iter_rows(
    readiness_glob: str,
    include_all_policy_epochs: bool,
) -> Iterable[VideoRow]:
    for path in sorted(glob.glob(readiness_glob)):
        payload = json.loads(Path(path).read_text(encoding="utf-8"))
        policy = payload.get("policy")
        if not isinstance(policy, dict):
            continue
        if not include_all_policy_epochs and policy.get("review_damaged_chunk_ratio") is None:
            continue

        batch_id = os.path.basename(os.path.dirname(path))
        generated_at = str(payload.get("generated_at", ""))
        for row in payload.get("videos", []) or []:
            if not isinstance(row, dict):
                continue
            status = str(row.get("status", "")).strip().upper()
            if status not in {"READY", "REVIEW", "BLOCKED"}:
                continue
            damage = row.get("damage_profile")
            if not isinstance(damage, dict):
                continue
            dcr = damage.get("damaged_chunk_ratio")
            sdcr = damage.get("severe_damage_chunk_ratio")
            vds = damage.get("video_damage_score")
            if not isinstance(dcr, (int, float)) or isinstance(dcr, bool):
                continue
            if not isinstance(sdcr, (int, float)) or isinstance(sdcr, bool):
                continue
            if not isinstance(vds, (int, float)) or isinstance(vds, bool):
                continue
            video_id = str(row.get("video_id", "")).strip()
            if not video_id:
                continue
            yield VideoRow(
                batch_id=batch_id,
                generated_at=generated_at,
                video_id=video_id,
                status=status,
                reason_code=str(row.get("reason_code", "")),
                damaged_chunk_ratio=float(dcr),
                severe_damage_chunk_ratio=float(sdcr),
                video_damage_score=float(vds),
            )


def _simulate(rows: Sequence[VideoRow], candidate: Candidate) -> Tuple[int, int, int, List[VideoRow]]:
    ready = 0
    review = 0
    blocked = 0
    moved: List[VideoRow] = []

    for row in rows:
        if row.status == "BLOCKED":
            blocked += 1
            continue
        if row.status == "REVIEW":
            review += 1
            continue

        assert row.status == "READY"
        needs_review = (
            row.video_damage_score > candidate.review_video_damage_score
            or row.damaged_chunk_ratio > candidate.review_damaged_chunk_ratio
            or row.severe_damage_chunk_ratio > candidate.review_severe_damage_chunk_ratio
        )
        if needs_review:
            review += 1
            moved.append(row)
        else:
            ready += 1

    return ready, review, blocked, moved


def _dedupe_latest(rows: Iterable[VideoRow]) -> List[VideoRow]:
    latest: Dict[str, VideoRow] = {}
    for row in rows:
        prev = latest.get(row.video_id)
        if prev is None or row.generated_at > prev.generated_at:
            latest[row.video_id] = row
    return sorted(latest.values(), key=lambda r: r.video_id)


def main() -> None:
    parser = argparse.ArgumentParser(description="Calibrate readiness review thresholds against historical summaries.")
    parser.add_argument(
        "--readiness-glob",
        default="data/validation/stage_reports/*/readiness-summary.json",
        help="Glob for readiness summary files",
    )
    parser.add_argument(
        "--include-all-policy-epochs",
        action="store_true",
        help="Include summaries from older policy epochs where ratio thresholds were unset",
    )
    parser.add_argument(
        "--review-video-damage-score-candidates",
        default="0.18,0.16,0.14,0.12",
        help="Comma-separated candidate values",
    )
    parser.add_argument(
        "--review-damaged-chunk-ratio-candidates",
        default="0.25,0.23,0.22,0.21,0.20",
        help="Comma-separated candidate values",
    )
    parser.add_argument(
        "--review-severe-damage-chunk-ratio-candidates",
        default="0.40,0.35,0.30",
        help="Comma-separated candidate values",
    )
    parser.add_argument(
        "--top-n",
        type=int,
        default=20,
        help="Show top N moved READY->REVIEW videos per candidate",
    )
    parser.add_argument(
        "--out",
        help="Optional JSON output path for machine-readable candidate results",
    )
    args = parser.parse_args()

    rows = _dedupe_latest(
        _iter_rows(
            readiness_glob=args.readiness_glob,
            include_all_policy_epochs=bool(args.include_all_policy_epochs),
        )
    )
    if not rows:
        raise SystemExit("No readiness rows found for the provided scope.")

    vds_candidates = _parse_float_list(args.review_video_damage_score_candidates)
    dcr_candidates = _parse_float_list(args.review_damaged_chunk_ratio_candidates)
    sdcr_candidates = _parse_float_list(args.review_severe_damage_chunk_ratio_candidates)

    baseline_ready = sum(1 for r in rows if r.status == "READY")
    baseline_review = sum(1 for r in rows if r.status == "REVIEW")
    baseline_blocked = sum(1 for r in rows if r.status == "BLOCKED")
    print(
        f"[calibrate-readiness] baseline READY={baseline_ready} REVIEW={baseline_review} BLOCKED={baseline_blocked} rows={len(rows)}"
    )

    results: List[dict] = []
    for vds in vds_candidates:
        for dcr in dcr_candidates:
            for sdcr in sdcr_candidates:
                candidate = Candidate(
                    review_video_damage_score=vds,
                    review_damaged_chunk_ratio=dcr,
                    review_severe_damage_chunk_ratio=sdcr,
                )
                ready, review, blocked, moved = _simulate(rows, candidate)
                moved_ids = sorted({row.video_id for row in moved})
                results.append(
                    {
                        "candidate": {
                            "review_video_damage_score": vds,
                            "review_damaged_chunk_ratio": dcr,
                            "review_severe_damage_chunk_ratio": sdcr,
                        },
                        "summary": {
                            "ready": ready,
                            "review": review,
                            "blocked": blocked,
                            "ready_to_review": len(moved_ids),
                        },
                        "moved_video_ids": moved_ids,
                    }
                )

    results.sort(
        key=lambda row: (
            row["summary"]["ready_to_review"],
            row["summary"]["review"],
            row["candidate"]["review_damaged_chunk_ratio"],
            row["candidate"]["review_video_damage_score"],
            row["candidate"]["review_severe_damage_chunk_ratio"],
        )
    )

    print("[calibrate-readiness] candidate outcomes (sorted by READY->REVIEW movement):")
    for row in results:
        c = row["candidate"]
        s = row["summary"]
        print(
            "  "
            f"vds={c['review_video_damage_score']:.3f} "
            f"dcr={c['review_damaged_chunk_ratio']:.3f} "
            f"sdcr={c['review_severe_damage_chunk_ratio']:.3f} "
            f"-> READY={s['ready']} REVIEW={s['review']} BLOCKED={s['blocked']} moved={s['ready_to_review']}"
        )
        if s["ready_to_review"] > 0:
            preview = row["moved_video_ids"][: max(0, int(args.top_n))]
            print(f"    moved_ids={','.join(preview)}")

    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_payload = {
            "baseline": {
                "ready": baseline_ready,
                "review": baseline_review,
                "blocked": baseline_blocked,
                "rows": len(rows),
            },
            "candidates": results,
        }
        out_path.write_text(json.dumps(out_payload, indent=2) + "\n", encoding="utf-8")
        print(f"[calibrate-readiness] wrote: {out_path}")


if __name__ == "__main__":
    main()
