#!/usr/bin/env python3
"""
scripts/training-data/validate_cross_stage.py

Cross-stage consistency validation between Stage 06 (or 06c patched) and Stage 07 outputs.

Runs after both stages complete for a video (or batch of videos).
Checks that Stage 07 output is consistent with Stage 06/06c output.
Prefers 06c.patched data when available, falls back to 06.video-type.

Use:
  A) Validate a single video pair:
     python validate_cross_stage.py \
       --s06 data/06c.patched/source/video.conversations.json \
       --s07 data/07.content/source/video.enriched.json

  B) Validate all videos in a source:
     python validate_cross_stage.py --source daily_evolution

  C) Validate all sources:
     python validate_cross_stage.py --all

  D) Output JSON report:
     python validate_cross_stage.py --all --json
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

LOG_PREFIX = "[cross-stage]"


@dataclass
class ValidationResult:
    severity: str  # "error", "warning", "info"
    check: str
    message: str
    video_id: str = ""

    def to_dict(self) -> Dict[str, str]:
        return {
            "severity": self.severity,
            "check": self.check,
            "message": self.message,
            "video_id": self.video_id,
        }


def validate_cross_stage(
    s06_data: Dict, s07_data: Dict, video_id: str = ""
) -> List[ValidationResult]:
    """Validate consistency between Stage 06 and Stage 07 outputs."""
    results: List[ValidationResult] = []

    # --- 1. Video type consistency ---
    s06_video_type = s06_data.get("video_type", {})
    s06_type = s06_video_type.get("type", "") if isinstance(s06_video_type, dict) else str(s06_video_type)

    s07_video_type = s07_data.get("video_type", {})
    s07_type = s07_video_type.get("type", "") if isinstance(s07_video_type, dict) else str(s07_video_type)

    s07_prompt_variant = s07_data.get("metadata", {}).get("prompt_variant", "")

    if s06_type != s07_type:
        results.append(ValidationResult(
            "error", "video_type_mismatch",
            f"Stage 06 says '{s06_type}' but Stage 07 says '{s07_type}'",
            video_id,
        ))

    if s07_prompt_variant:
        expected_variant = "infield" if s06_type in ("infield", "compilation") else "talking_head"
        if s07_prompt_variant != expected_variant:
            results.append(ValidationResult(
                "warning", "prompt_variant_mismatch",
                f"Stage 06 type '{s06_type}' should use '{expected_variant}' prompt "
                f"but Stage 07 used '{s07_prompt_variant}'",
                video_id,
            ))

    # --- 2. Segment text integrity ---
    s06_segments = s06_data.get("segments", [])
    s07_segments = s07_data.get("segments", [])

    if len(s06_segments) != len(s07_segments):
        results.append(ValidationResult(
            "warning", "segment_count_changed",
            f"Stage 06 has {len(s06_segments)} segments, Stage 07 has {len(s07_segments)}",
            video_id,
        ))
    else:
        text_mismatches = 0
        for i, (s06_seg, s07_seg) in enumerate(zip(s06_segments, s07_segments)):
            s06_text = s06_seg.get("text", "").strip()
            s07_text = s07_seg.get("text", "").strip()
            if s06_text != s07_text:
                text_mismatches += 1

        if text_mismatches > 0:
            results.append(ValidationResult(
                "warning", "segment_text_modified",
                f"{text_mismatches}/{len(s06_segments)} segments have different text between stages",
                video_id,
            ))

    # --- 3. Conversation coverage ---
    s06_conversations = s06_data.get("conversations", [])
    s06_conv_ids = {c["conversation_id"] for c in s06_conversations}

    s07_enrichments = s07_data.get("enrichments", [])
    s07_approach_conv_ids = {
        e.get("conversation_id") for e in s07_enrichments
        if e.get("type") == "approach" and e.get("conversation_id") is not None
    }

    missing_convs = s06_conv_ids - s07_approach_conv_ids
    extra_convs = s07_approach_conv_ids - s06_conv_ids - {0, None}

    if missing_convs:
        results.append(ValidationResult(
            "warning", "missing_enrichments",
            f"Conversations from Stage 06 not enriched in Stage 07: {sorted(missing_convs)}",
            video_id,
        ))

    if extra_convs:
        results.append(ValidationResult(
            "error", "phantom_enrichments",
            f"Stage 07 enriches conversations not in Stage 06: {sorted(extra_convs)}",
            video_id,
        ))

    # --- 4. Commentary segments in approach enrichments ---
    # Check that Stage 07 approach enrichments don't include segments
    # that Stage 06 classified as commentary
    s06_commentary_seg_ids = {
        s.get("id") for s in s06_segments
        if s.get("segment_type") == "commentary" or s.get("conversation_id", 0) == 0
    }

    for enrichment in s07_enrichments:
        if enrichment.get("type") != "approach":
            continue
        for tp in enrichment.get("turn_phases", []):
            seg_idx = tp.get("segment")
            if seg_idx is not None and seg_idx in s06_commentary_seg_ids:
                results.append(ValidationResult(
                    "warning", "commentary_in_approach",
                    f"Stage 07 approach enrichment for conv {enrichment.get('conversation_id')} "
                    f"references segment {seg_idx} which Stage 06 classified as commentary",
                    video_id,
                ))
                break  # one warning per enrichment is enough

    # --- 5. Speaker labels consistency ---
    s06_labels = s06_data.get("speaker_labels", {})
    s07_labels = s07_data.get("speaker_labels", {})

    if s06_labels and s07_labels:
        for speaker_id, s06_label in s06_labels.items():
            s07_label = s07_labels.get(speaker_id, {})
            s06_role = s06_label.get("role", "")
            s07_role = s07_label.get("role", "")
            if s06_role and s07_role and s06_role != s07_role:
                # Don't warn if stage 06 marked as collapsed — stage 07 may refine
                if s06_role == "collapsed":
                    continue
                results.append(ValidationResult(
                    "warning", "speaker_label_changed",
                    f"Speaker {speaker_id} role changed: Stage 06='{s06_role}', Stage 07='{s07_role}'",
                    video_id,
                ))

    if not any(r.severity == "error" for r in results):
        results.append(ValidationResult("info", "cross_stage_passed", "All cross-stage checks passed", video_id))

    return results


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def find_video_pairs(source: Optional[str] = None) -> List[Tuple[Path, Path, str]]:
    """Find matching Stage 06/07 output file pairs."""
    s06_root = repo_root() / "data" / "06c.patched"
    if not s06_root.exists():
        s06_root = repo_root() / "data" / "06.video-type"
    s07_root = repo_root() / "data" / "07.content"

    pairs: List[Tuple[Path, Path, str]] = []

    search_dirs = [s06_root / source] if source else list(s06_root.iterdir()) if s06_root.exists() else []

    for source_dir in search_dirs:
        if not source_dir.is_dir():
            continue
        source_name = source_dir.name

        for s06_file in sorted(source_dir.rglob("*.conversations.json")):
            # Find matching Stage 07 file
            stem = s06_file.stem
            if stem.endswith(".conversations"):
                stem = stem[:-len(".conversations")]
            s07_file = s07_root / source_name / f"{stem}.enriched.json"

            if s07_file.exists():
                video_id = stem
                pairs.append((s06_file, s07_file, video_id))

    return pairs


def main() -> None:
    parser = argparse.ArgumentParser(description="Cross-stage validation between Stage 06/06c and 07")
    parser.add_argument("--s06", help="Stage 06 or 06c output file (conversations.json)")
    parser.add_argument("--s07", help="Stage 07 output file (enriched.json)")
    parser.add_argument("--source", help="Validate all videos in a source directory")
    parser.add_argument("--all", action="store_true", help="Validate all sources")
    parser.add_argument("--json", action="store_true", help="Output JSON report")

    args = parser.parse_args()

    all_results: List[ValidationResult] = []

    if args.s06 and args.s07:
        # Single file pair mode
        s06_path = Path(args.s06)
        s07_path = Path(args.s07)

        if not s06_path.exists():
            print(f"{LOG_PREFIX} ERROR: Stage 06 file not found: {s06_path}", file=sys.stderr)
            sys.exit(1)
        if not s07_path.exists():
            print(f"{LOG_PREFIX} ERROR: Stage 07 file not found: {s07_path}", file=sys.stderr)
            sys.exit(1)

        s06_data = json.loads(s06_path.read_text())
        s07_data = json.loads(s07_path.read_text())
        video_id = s06_data.get("video_id", s06_path.stem)

        all_results = validate_cross_stage(s06_data, s07_data, video_id)

    elif args.source or args.all:
        pairs = find_video_pairs(args.source if args.source else None)

        if not pairs:
            print(f"{LOG_PREFIX} No matching Stage 06/07 file pairs found")
            sys.exit(0)

        print(f"{LOG_PREFIX} Found {len(pairs)} video pairs to validate")

        for s06_path, s07_path, video_id in pairs:
            s06_data = json.loads(s06_path.read_text())
            s07_data = json.loads(s07_path.read_text())
            results = validate_cross_stage(s06_data, s07_data, video_id)
            all_results.extend(results)

    else:
        parser.print_help()
        sys.exit(1)

    # Output results
    total_errors = sum(1 for r in all_results if r.severity == "error")
    total_warnings = sum(1 for r in all_results if r.severity == "warning")

    if args.json:
        report = {
            "validated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "summary": {
                "total_checks": len(all_results),
                "errors": total_errors,
                "warnings": total_warnings,
                "passed": total_errors == 0,
            },
            "results": [r.to_dict() for r in all_results if r.severity != "info"],
        }
        print(json.dumps(report, indent=2))
    else:
        for r in all_results:
            if r.severity == "error":
                print(f"{LOG_PREFIX} ERROR [{r.video_id}] {r.check}: {r.message}")
            elif r.severity == "warning":
                print(f"{LOG_PREFIX} WARN  [{r.video_id}] {r.check}: {r.message}")

        print(f"\n{LOG_PREFIX} Summary: {total_errors} error(s), {total_warnings} warning(s)")
        if total_errors == 0:
            print(f"{LOG_PREFIX} Cross-stage validation PASSED")
        else:
            print(f"{LOG_PREFIX} Cross-stage validation FAILED")
            sys.exit(1)


if __name__ == "__main__":
    main()
