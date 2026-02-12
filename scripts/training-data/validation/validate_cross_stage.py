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

  E) Validate a sub-batch manifest:
     python validate_cross_stage.py --manifest docs/pipeline/batches/P001.1.txt
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Iterable, Set

LOG_PREFIX = "[cross-stage]"

_VIDEO_ID_RE = re.compile(r"\[([A-Za-z0-9_-]{11})\]")
_BRACKET_ID_RE = re.compile(r"\[([A-Za-z0-9_-]+)\]")


def _load_manifest_entries(
    manifest_path: Path, source: Optional[str] = None
) -> List[Tuple[str, str, str]]:
    """Load docs/pipeline/batches/*.txt manifest as (source, video_id, folder_text)."""
    entries: List[Tuple[str, str, str]] = []
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
            entries.append((src, m.group(1), folder))
    return entries


def _load_manifest_ids(manifest_path: Path, source: Optional[str] = None) -> Set[str]:
    """Backward-compatible helper for callers that only need video ids."""
    return {vid for _, vid, _ in _load_manifest_entries(manifest_path, source=source)}


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

    # --- 0. Video id consistency ---
    s06_vid = s06_data.get("video_id")
    s07_vid = s07_data.get("video_id")
    if s06_vid and s07_vid and s06_vid != s07_vid:
        results.append(ValidationResult(
            "warning", "video_id_mismatch",
            f"Stage 06 video_id '{s06_vid}' != Stage 07 video_id '{s07_vid}'",
            video_id or (s06_vid or s07_vid or ""),
        ))

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

    s06_seg_by_id: Dict[int, Dict[str, Any]] = {}
    for seg in s06_segments:
        seg_id = seg.get("id")
        if isinstance(seg_id, int):
            s06_seg_by_id[seg_id] = seg

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
    # Derive conv ids from segments (ground truth) instead of relying on the summary list,
    # since 06c patching can modify segments[].conversation_id and the summary can drift.
    s06_conv_ids: Set[int] = set()
    for seg in s06_segments:
        conv_id = seg.get("conversation_id", 0)
        if isinstance(conv_id, int) and conv_id > 0:
            s06_conv_ids.add(conv_id)

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
        conv_seg_ids = {
            s.get("id")
            for s in s06_segments
            if isinstance(s.get("id"), int) and s.get("conversation_id") == conv_id
        }

        for tp in enrichment.get("turn_phases", []):
            seg_idx = tp.get("segment")
            if seg_idx is not None and seg_idx not in s06_seg_by_id:
                results.append(ValidationResult(
                    "warning", "turn_phase_unknown_segment",
                    f"Stage 07 turn_phases references segment {seg_idx} which does not exist in Stage 06 segments[].id",
                    video_id,
                ))
                break

            if seg_idx is not None and conv_id is not None:
                s06_seg = s06_seg_by_id.get(seg_idx)
                if s06_seg and s06_seg.get("conversation_id") != conv_id:
                    results.append(ValidationResult(
                        "warning", "turn_phase_wrong_conversation",
                        f"Stage 07 conv {conv_id} turn_phases references segment {seg_idx} "
                        f"but Stage 06 assigns it to conv {s06_seg.get('conversation_id')}",
                        video_id,
                    ))
                    break

            if seg_idx is not None and seg_idx in s06_commentary_seg_ids:
                results.append(ValidationResult(
                    "warning", "commentary_in_approach",
                    f"Stage 07 approach enrichment for conv {enrichment.get('conversation_id')} "
                    f"references segment {seg_idx} which Stage 06 classified as commentary",
                    video_id,
                ))
                break  # one warning per enrichment is enough

        # Techniques used should also reference valid segments for this conversation.
        for tech in enrichment.get("techniques_used", []) or []:
            if not isinstance(tech, dict):
                continue
            seg_idx = tech.get("segment")
            if seg_idx is None:
                continue
            if seg_idx not in s06_seg_by_id:
                results.append(ValidationResult(
                    "warning", "technique_unknown_segment",
                    f"Stage 07 techniques_used references segment {seg_idx} which does not exist in Stage 06 segments[].id",
                    video_id,
                ))
                break
            if conv_id is not None:
                s06_seg = s06_seg_by_id.get(seg_idx)
                if s06_seg and s06_seg.get("conversation_id") != conv_id:
                    results.append(ValidationResult(
                        "warning", "technique_wrong_conversation",
                        f"Stage 07 conv {conv_id} techniques_used references segment {seg_idx} "
                        f"but Stage 06 assigns it to conv {s06_seg.get('conversation_id')}",
                        video_id,
                    ))
                    break

        # Phase coverage sanity: warn if we have a conversation but no phase references.
        if conv_id is not None and conv_seg_ids:
            phase_seg_ids = {
                tp.get("segment")
                for tp in enrichment.get("turn_phases", []) or []
                if isinstance(tp, dict) and isinstance(tp.get("segment"), int)
            }
            if phase_seg_ids and not (phase_seg_ids & conv_seg_ids):
                results.append(ValidationResult(
                    "warning", "turn_phases_no_conv_segments",
                    f"Stage 07 conv {conv_id} turn_phases does not reference any segments from that conversation "
                    f"(possible index semantic drift)",
                    video_id,
                ))

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

    # --- 6. Transcript quality indices (indexing contract sanity) ---
    # Stage 07 emits low_quality_segments[].segment and transcript_artifacts[].segment_index.
    # These should reference global Stage 06/07 segment ids; if they don't, the evidence becomes non-actionable.
    for lq in s07_data.get("low_quality_segments", []) or []:
        if not isinstance(lq, dict):
            continue
        seg_idx = lq.get("segment")
        if isinstance(seg_idx, int) and seg_idx not in s06_seg_by_id:
            results.append(ValidationResult(
                "warning", "low_quality_unknown_segment",
                f"Stage 07 low_quality_segments references segment {seg_idx} which does not exist in Stage 06 segments[].id",
                video_id,
            ))

    for art in s07_data.get("transcript_artifacts", []) or []:
        if not isinstance(art, dict):
            continue
        seg_idx = art.get("segment_index")
        if isinstance(seg_idx, int) and seg_idx not in s06_seg_by_id:
            results.append(ValidationResult(
                "warning", "transcript_artifact_unknown_segment",
                f"Stage 07 transcript_artifacts references segment_index {seg_idx} which does not exist in Stage 06 segments[].id",
                video_id,
            ))

    if not any(r.severity == "error" for r in results):
        results.append(ValidationResult("info", "cross_stage_passed", "All cross-stage checks passed", video_id))

    return results


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]

def _extract_video_id_from_path(p: Path) -> Optional[str]:
    m = _VIDEO_ID_RE.search(str(p))
    return m.group(1) if m else None


def _extract_video_id_from_json(p: Path) -> Optional[str]:
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None
    vid = data.get("video_id")
    return vid if isinstance(vid, str) and vid else None


def _video_id_for_file(p: Path) -> Optional[str]:
    return _extract_video_id_from_path(p) or _extract_video_id_from_json(p)


def _index_by_video_id(files: Iterable[Path]) -> Dict[str, List[Path]]:
    out: Dict[str, List[Path]] = {}
    for p in files:
        vid = _video_id_for_file(p)
        if not vid:
            continue
        out.setdefault(vid, []).append(p)
    return out


def _pick_best_candidate(candidates: List[Path], preferred_source: Optional[str]) -> Path:
    def rank(p: Path) -> Tuple[int, int, str]:
        # Prefer candidates whose path includes the source folder name (when available),
        # and prefer deeper (more specific) layouts (source-video > source-flat > root-flat).
        source_bonus = 1 if (preferred_source and preferred_source in p.parts) else 0
        depth = len(p.parts)
        return (source_bonus, depth, str(p))

    return sorted(candidates, key=rank, reverse=True)[0]


def _path_has_source(path_obj: Path, source: str) -> bool:
    return source in path_obj.parts


def _layout_mode(stage_root: Path, path_obj: Path) -> str:
    """Classify file layout relative to stage root."""
    try:
        rel = path_obj.relative_to(stage_root)
    except Exception:
        return "unknown"
    parts = rel.parts
    if len(parts) <= 1:
        return "root-flat"
    if len(parts) == 2:
        return "source-flat"
    return "source-video"


def find_video_pairs(source: Optional[str] = None) -> List[Tuple[Path, Path, str]]:
    """Find matching Stage 06/07 output file pairs."""
    s06c_root = repo_root() / "data" / "06c.patched"
    s06_root = repo_root() / "data" / "06.video-type"
    s07_root = repo_root() / "data" / "07.content"

    if not s07_root.exists():
        return []

    # Index Stage 06 candidates by video_id (prefer patched artifacts when present).
    s06c_files = sorted(s06c_root.rglob("*.conversations.json")) if s06c_root.exists() else []
    s06_files = sorted(s06_root.rglob("*.conversations.json")) if s06_root.exists() else []

    s06c_by_vid = _index_by_video_id(s06c_files)
    s06_by_vid = _index_by_video_id(s06_files)

    # Enumerate Stage 07 outputs (layout-agnostic).
    if source and (s07_root / source).exists():
        s07_files = sorted((s07_root / source).rglob("*.enriched.json"))
    else:
        s07_files = sorted(s07_root.rglob("*.enriched.json"))
        if source:
            # If the caller requested a source but Stage 07 layout is root-flat,
            # we can only best-effort filter by path parts.
            s07_files = [p for p in s07_files if source in p.parts]

    pairs: List[Tuple[Path, Path, str]] = []
    for s07_file in s07_files:
        vid = _video_id_for_file(s07_file)
        if not vid:
            continue

        candidates = s06c_by_vid.get(vid) or s06_by_vid.get(vid)
        if not candidates:
            continue

        s06_file = _pick_best_candidate(candidates, preferred_source=source)
        pairs.append((s06_file, s07_file, vid))

    return pairs


def main() -> None:
    parser = argparse.ArgumentParser(description="Cross-stage validation between Stage 06/06c and 07")
    parser.add_argument("--s06", help="Stage 06 or 06c output file (conversations.json)")
    parser.add_argument("--s07", help="Stage 07 output file (enriched.json)")
    parser.add_argument("--manifest", help="Validate only videos listed in a batch/sub-batch manifest file")
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

    elif args.manifest:
        manifest_path = Path(args.manifest)
        if not manifest_path.is_absolute():
            manifest_path = repo_root() / manifest_path
        if not manifest_path.exists():
            print(f"{LOG_PREFIX} ERROR: Manifest file not found: {manifest_path}", file=sys.stderr)
            sys.exit(1)

        manifest_entries = _load_manifest_entries(manifest_path, source=args.source)
        if not manifest_entries:
            print(f"{LOG_PREFIX} No video ids found in manifest: {manifest_path}")
            sys.exit(0)

        s06c_root = repo_root() / "data" / "06c.patched"
        s06_root = repo_root() / "data" / "06.video-type"
        s07_root = repo_root() / "data" / "07.content"

        s06c_files = sorted(s06c_root.rglob("*.conversations.json")) if s06c_root.exists() else []
        s06_files = sorted(s06_root.rglob("*.conversations.json")) if s06_root.exists() else []
        s07_files = sorted(s07_root.rglob("*.enriched.json")) if s07_root.exists() else []

        s06c_by_vid = _index_by_video_id(s06c_files)
        s06_by_vid = _index_by_video_id(s06_files)
        s07_by_vid = _index_by_video_id(s07_files)

        pairs: List[Tuple[Path, Path, str]] = []
        pair_keys: Set[Tuple[str, str, str]] = set()
        coverage_results: List[ValidationResult] = []

        for src, vid, folder_text in sorted(manifest_entries, key=lambda x: (x[0], x[1], x[2])):
            s07_candidates_all = s07_by_vid.get(vid, [])
            s07_candidates_src = [p for p in s07_candidates_all if _path_has_source(p, src)]

            # Stage 06 selection follows normal pipeline preference:
            # prefer 06c.patched if present, then fall back to 06.video-type.
            s06c_candidates_all = s06c_by_vid.get(vid, [])
            s06_candidates_all = s06_by_vid.get(vid, [])
            s06c_candidates_src = [p for p in s06c_candidates_all if _path_has_source(p, src)]
            s06_candidates_src = [p for p in s06_candidates_all if _path_has_source(p, src)]

            # Pick Stage 07 candidate (source-specific first; then best global fallback).
            s07_path: Optional[Path] = None
            if s07_candidates_src:
                s07_path = _pick_best_candidate(s07_candidates_src, preferred_source=src)
            elif s07_candidates_all:
                s07_path = _pick_best_candidate(s07_candidates_all, preferred_source=src)

            # Pick Stage 06 candidate (patched-first).
            s06_path: Optional[Path] = None
            if s06c_candidates_src:
                s06_path = _pick_best_candidate(s06c_candidates_src, preferred_source=src)
            elif s06c_candidates_all:
                s06_path = _pick_best_candidate(s06c_candidates_all, preferred_source=src)
            elif s06_candidates_src:
                s06_path = _pick_best_candidate(s06_candidates_src, preferred_source=src)
            elif s06_candidates_all:
                s06_path = _pick_best_candidate(s06_candidates_all, preferred_source=src)

            # Coverage diagnostics: Stage 07
            if not s07_candidates_all:
                coverage_results.append(ValidationResult(
                    "error",
                    "manifest_missing_stage07_output",
                    f"Manifest entry source='{src}' folder='{folder_text}' has no Stage 07 enriched output for video_id '{vid}'",
                    vid,
                ))
            elif not s07_candidates_src:
                s07_layouts = sorted({_layout_mode(s07_root, p) for p in s07_candidates_all})
                has_non_root = any(mode not in ("root-flat", "unknown") for mode in s07_layouts)
                if has_non_root:
                    coverage_results.append(ValidationResult(
                        "error",
                        "manifest_stage07_source_mismatch",
                        f"Stage 07 output exists for video_id '{vid}' but not under source '{src}' "
                        f"(layouts={s07_layouts}; example={s07_candidates_all[0]})",
                        vid,
                    ))
                else:
                    coverage_results.append(ValidationResult(
                        "warning",
                        "manifest_stage07_source_ambiguous_root_flat",
                        f"Stage 07 output for video_id '{vid}' is root-flat/ambiguous for source '{src}' "
                        f"(layouts={s07_layouts}; example={s07_candidates_all[0]})",
                        vid,
                    ))

            # Coverage diagnostics: Stage 06 (06c preferred; 06 fallback)
            if not s06c_candidates_all and not s06_candidates_all:
                coverage_results.append(ValidationResult(
                    "error",
                    "manifest_missing_stage06_output",
                    f"Manifest entry source='{src}' folder='{folder_text}' has no Stage 06/06c conversations output for video_id '{vid}'",
                    vid,
                ))
            elif not s06c_candidates_src and not s06_candidates_src:
                s06_layouts = sorted(
                    {f"06c:{_layout_mode(s06c_root, p)}" for p in s06c_candidates_all}
                    | {f"06:{_layout_mode(s06_root, p)}" for p in s06_candidates_all}
                )
                has_non_root = any(
                    not mode.endswith("root-flat") and not mode.endswith("unknown")
                    for mode in s06_layouts
                )
                example = s06c_candidates_all[0] if s06c_candidates_all else s06_candidates_all[0]
                if has_non_root:
                    coverage_results.append(ValidationResult(
                        "error",
                        "manifest_stage06_source_mismatch",
                        f"Stage 06/06c output exists for video_id '{vid}' but not under source '{src}' "
                        f"(layouts={s06_layouts}; example={example})",
                        vid,
                    ))
                else:
                    coverage_results.append(ValidationResult(
                        "warning",
                        "manifest_stage06_source_ambiguous_root_flat",
                        f"Stage 06/06c output for video_id '{vid}' is root-flat/ambiguous for source '{src}' "
                        f"(layouts={s06_layouts}; example={example})",
                        vid,
                    ))

            if s06_path and s07_path:
                key = (str(s06_path), str(s07_path), vid)
                if key not in pair_keys:
                    pair_keys.add(key)
                    pairs.append((s06_path, s07_path, vid))

        if not pairs:
            coverage_results.append(ValidationResult(
                "error",
                "manifest_no_pairs_resolved",
                "No matching Stage 06/07 pairs could be resolved for manifest entries",
                "",
            ))

        all_results.extend(coverage_results)

        if not args.json:
            print(f"{LOG_PREFIX} Found {len(pairs)}/{len(manifest_entries)} manifest entry pair(s) to validate")
            if coverage_results:
                cov_errors = sum(1 for r in coverage_results if r.severity == "error")
                cov_warnings = sum(1 for r in coverage_results if r.severity == "warning")
                print(f"{LOG_PREFIX} Manifest coverage diagnostics: {cov_errors} error(s), {cov_warnings} warning(s)")

        for s06_path, s07_path, video_id in pairs:
            s06_data = json.loads(s06_path.read_text())
            s07_data = json.loads(s07_path.read_text())
            results = validate_cross_stage(s06_data, s07_data, video_id)
            all_results.extend(results)

    elif args.source or args.all:
        pairs = find_video_pairs(args.source if args.source else None)

        if not pairs:
            print(f"{LOG_PREFIX} No matching Stage 06/07 file pairs found")
            sys.exit(0)

        if not args.json:
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
