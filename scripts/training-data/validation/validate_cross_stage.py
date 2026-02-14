#!/usr/bin/env python3
"""
scripts/training-data/validation/validate_cross_stage.py

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
import re
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
    s06_segments_by_id = {
        seg.get("id"): seg for seg in s06_segments
        if isinstance(seg, dict) and isinstance(seg.get("id"), int)
    }

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
        conv_id = enrichment.get("conversation_id")
        for tp in enrichment.get("turn_phases", []):
            seg_idx = tp.get("segment")
            if seg_idx is None:
                continue

            # Stage 07 contract: turn_phases[].segment is global segments[].id.
            if seg_idx not in s06_segments_by_id:
                results.append(ValidationResult(
                    "error", "phase_segment_missing",
                    f"turn_phases references segment id {seg_idx} that does not exist in Stage 06",
                    video_id,
                ))
                continue

            ref_seg = s06_segments_by_id[seg_idx]
            ref_conv_id = ref_seg.get("conversation_id")
            if conv_id is not None and ref_conv_id != conv_id:
                results.append(ValidationResult(
                    "error", "phase_conversation_mismatch",
                    f"turn_phases segment {seg_idx} belongs to conv {ref_conv_id}, "
                    f"but enrichment is conv {conv_id}",
                    video_id,
                ))

            if seg_idx in s06_commentary_seg_ids:
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
    return Path(__file__).resolve().parents[3]


def canonical_stem(path: Path) -> str:
    """Normalize stage filename to canonical <title> [video_id].audio.asr.* stem."""
    stem = path.stem
    if stem.endswith(".conversations"):
        stem = stem[: -len(".conversations")]
    if stem.endswith(".enriched"):
        stem = stem[: -len(".enriched")]
    return stem


def maybe_source_name(path: Path, stage_root: Path) -> Optional[str]:
    try:
        rel = path.relative_to(stage_root)
    except ValueError:
        return None
    parts = rel.parts
    if len(parts) >= 2:
        return parts[0]
    return None


def extract_video_id_from_name(name: str) -> str:
    match = re.search(r"\[([A-Za-z0-9_-]{11})\]", name)
    if match:
        return match.group(1)
    return name


def path_includes_source(path: Path, source: str) -> bool:
    token = Path(source).name
    return token in path.parts


def is_root_flat(path: Path, stage_root: Path) -> bool:
    try:
        rel = path.relative_to(stage_root)
    except ValueError:
        return False
    return len(rel.parts) == 1


def find_video_pairs(source: Optional[str] = None) -> List[Tuple[Path, Path, str]]:
    """Find matching Stage 06/07 output file pairs across root/source/video layouts."""
    root = repo_root()
    s06c_root = root / "data" / "06c.patched"
    s06_root = root / "data" / "06.video-type"
    s07_root = root / "data" / "07.content"

    s06_candidates: List[Path] = []
    if s06c_root.exists():
        s06_candidates.extend(sorted(s06c_root.rglob("*.conversations.json")))
    if not s06_candidates and s06_root.exists():
        s06_candidates.extend(sorted(s06_root.rglob("*.conversations.json")))
    if source:
        active_root = s06c_root if s06c_root.exists() else s06_root
        s06_candidates = [
            p for p in s06_candidates
            if path_includes_source(p, source) or is_root_flat(p, active_root)
        ]

    if not s07_root.exists():
        return []
    s07_candidates = sorted(s07_root.rglob("*.enriched.json"))
    if source:
        s07_candidates = [
            p for p in s07_candidates
            if path_includes_source(p, source) or is_root_flat(p, s07_root)
        ]

    s07_by_stem: Dict[str, List[Path]] = {}
    for s07 in s07_candidates:
        s07_by_stem.setdefault(canonical_stem(s07), []).append(s07)

    pairs: List[Tuple[Path, Path, str]] = []
    seen: set[Tuple[str, str]] = set()

    for s06_file in s06_candidates:
        stem = canonical_stem(s06_file)
        candidates = s07_by_stem.get(stem, [])
        if not candidates:
            continue

        s06_source = maybe_source_name(s06_file, s06c_root if s06c_root.exists() else s06_root)
        chosen = candidates[0]
        if s06_source:
            source_matched = [
                c for c in candidates
                if maybe_source_name(c, s07_root) == s06_source
            ]
            if source_matched:
                chosen = source_matched[0]

        key = (str(s06_file), str(chosen))
        if key in seen:
            continue
        seen.add(key)
        video_id = extract_video_id_from_name(stem)
        pairs.append((s06_file, chosen, video_id))

    return sorted(pairs, key=lambda x: (str(x[0]), str(x[1])))


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
