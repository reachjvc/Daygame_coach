#!/usr/bin/env python3
"""
Audit marginal stage contribution from quarantine artifacts.

This provides a quick evidence view of which stages are producing hard blocks,
so we can reason about LLM stage necessity with data instead of intuition.
"""

from __future__ import annotations

import argparse
import glob
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set, Tuple

STAGE_CHECK_RE = re.compile(r"^stage(?P<stage>06b|06e|06g|06h|06f|07b|07|08|09|06)(?:_|$)")
LLM_STAGES = {"06", "06b", "06e", "06g", "07", "07b"}


def _iter_quarantine_rows(pattern: str) -> Iterable[Tuple[str, dict]]:
    for path in sorted(glob.glob(pattern)):
        payload = json.loads(Path(path).read_text(encoding="utf-8"))
        rows = payload.get("videos", [])
        if not isinstance(rows, list):
            continue
        for row in rows:
            if not isinstance(row, dict):
                continue
            yield path, row


def _extract_stage(check: str) -> Optional[str]:
    m = STAGE_CHECK_RE.match(check.strip())
    if not m:
        return None
    return m.group("stage")


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit stage-level quarantine contribution.")
    parser.add_argument(
        "--quarantine-glob",
        default="data/validation/quarantine/*.json",
        help="Glob of quarantine files to analyze",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=20,
        help="Top checks/stages to print",
    )
    parser.add_argument(
        "--out",
        help="Optional JSON output path",
    )
    args = parser.parse_args()

    check_counts: Counter[str] = Counter()
    stage_counts: Counter[str] = Counter()
    stage_video_ids: Dict[str, Set[str]] = defaultdict(set)
    llm_stage_video_ids: Dict[str, Set[str]] = defaultdict(set)
    video_stages: Dict[str, Set[str]] = defaultdict(set)
    total_videos: Set[str] = set()

    for _path, row in _iter_quarantine_rows(args.quarantine_glob):
        video_id = str(row.get("video_id", "")).strip()
        if not video_id:
            continue
        total_videos.add(video_id)
        reasons = row.get("reasons", [])
        if not isinstance(reasons, list):
            reasons = []
        for reason in reasons:
            if not isinstance(reason, dict):
                continue
            check = str(reason.get("check", "")).strip()
            if not check:
                continue
            check_counts[check] += 1
            stage = _extract_stage(check)
            if stage is None:
                continue
            stage_counts[stage] += 1
            stage_video_ids[stage].add(video_id)
            video_stages[video_id].add(stage)
            if stage in LLM_STAGES:
                llm_stage_video_ids[stage].add(video_id)

    print(f"[audit-llm-stage-value] quarantined videos: {len(total_videos)}")
    print("[audit-llm-stage-value] top checks:")
    for check, count in check_counts.most_common(max(1, int(args.top))):
        print(f"  {count:4d}  {check}")

    print("[audit-llm-stage-value] stage contribution (by reason count):")
    for stage, count in stage_counts.most_common(max(1, int(args.top))):
        print(f"  {count:4d}  stage{stage}  videos={len(stage_video_ids.get(stage, set()))}")

    print("[audit-llm-stage-value] LLM stage coverage (unique videos):")
    for stage in sorted(LLM_STAGES):
        vids = llm_stage_video_ids.get(stage, set())
        print(f"  stage{stage}: videos={len(vids)}")

    exclusive_llm_stage_counts: Counter[str] = Counter()
    for video_id, stages in video_stages.items():
        llm_stages = sorted(stage for stage in stages if stage in LLM_STAGES)
        if len(llm_stages) == 1:
            exclusive_llm_stage_counts[llm_stages[0]] += 1

    print("[audit-llm-stage-value] LLM-exclusive quarantines (video blocked by exactly one LLM stage):")
    if exclusive_llm_stage_counts:
        for stage, count in exclusive_llm_stage_counts.most_common():
            print(f"  stage{stage}: {count}")
    else:
        print("  none")

    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "quarantined_video_count": len(total_videos),
            "check_counts": dict(check_counts),
            "stage_counts": dict(stage_counts),
            "stage_video_counts": {
                stage: len(video_ids) for stage, video_ids in stage_video_ids.items()
            },
            "llm_stage_video_counts": {
                stage: len(video_ids) for stage, video_ids in llm_stage_video_ids.items()
            },
            "llm_stage_exclusive_video_counts": dict(exclusive_llm_stage_counts),
        }
        out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        print(f"[audit-llm-stage-value] wrote: {out_path}")


if __name__ == "__main__":
    main()
