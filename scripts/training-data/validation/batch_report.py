#!/usr/bin/env python3
"""
scripts/training-data/validation/batch_report.py

Batch statistics report and drift detection.

Generates aggregate statistics for a batch of processed videos and
compares against prior batches to detect distribution drift.

Use:
  A) Report for a specific source:
     python batch_report.py --source daily_evolution --batch-id R1

  B) Report for all sources:
     python batch_report.py --all --batch-id R1

  C) Compare against prior batches:
     python batch_report.py --all --batch-id P001 --compare

  D) JSON output:
     python batch_report.py --all --batch-id R1 --json

  E) Restrict to a batch/sub-batch manifest:
     python batch_report.py --all --manifest docs/pipeline/batches/P001.1.txt --batch-id P001.1
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
import time
from collections import Counter
from statistics import median
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

LOG_PREFIX = "[batch-report]"

_BRACKET_ID_RE = re.compile(r"\[([A-Za-z0-9_-]+)\]")

SEMANTIC_JUDGE_DEFAULT_PROMPT_VERSION = "1.2.9"
SEMANTIC_JUDGE_DEFAULT_MAX_SEGMENTS = 200


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _load_manifest_ids(manifest_path: Path, source: Optional[str] = None) -> Set[str]:
    """Load docs/pipeline/batches/*.txt manifest and return the set of video ids."""
    ids: Set[str] = set()
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
            ids.add(m.group(1))
    return ids


def _load_manifest_entries(manifest_path: Path, source: Optional[str] = None) -> List[Tuple[str, str]]:
    """Return list of (source, video_id) for all manifest rows."""
    out: List[Tuple[str, str]] = []
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
        if not m:
            continue
        out.append((src, m.group(1)))
    return out


def _extract_video_id(data: Dict[str, Any]) -> Optional[str]:
    vid = data.get("video_id")
    if isinstance(vid, str) and vid:
        return vid
    src = data.get("_source_file")
    if isinstance(src, str):
        m = _BRACKET_ID_RE.search(src)
        if m:
            return m.group(1)
    return None


def _filter_by_manifest(files: List[Dict], manifest_ids: Set[str]) -> List[Dict]:
    if not manifest_ids:
        return files
    out: List[Dict] = []
    for data in files:
        vid = _extract_video_id(data)
        if vid and vid in manifest_ids:
            out.append(data)
    return out


def _video_id_for_path(p: Path) -> Optional[str]:
    m = _BRACKET_ID_RE.search(str(p))
    return m.group(1) if m else None


def stable_hash(obj: Any) -> str:
    payload = json.dumps(obj, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _infer_source_from_stage07_path(p: str) -> Optional[str]:
    """Infer source name from a Stage 07 path like .../data/07.LLM.content/<source>/..."""
    try:
        parts = Path(p).parts
        idx = parts.index("07.LLM.content")
        # Only infer a source when there is an extra path component between
        # 07.LLM.content and the filename. Root-flat layout has no source segment.
        if idx + 2 < len(parts):
            src = parts[idx + 1]
            if src and src != "07.LLM.content":
                return src
    except Exception:
        pass
    return None


def _build_stage07_semantic_request_index(
    enriched_files: List[Dict[str, Any]],
    preferred_source_by_vid: Optional[Dict[str, str]] = None,
) -> Dict[Tuple[str, int], Dict[str, Any]]:
    """Build an index of the current Stage 07 "approach" conversations for fingerprint checks."""
    out: Dict[Tuple[str, int], Dict[str, Any]] = {}
    for ef in enriched_files:
        vid = ef.get("video_id")
        if not isinstance(vid, str) or not vid:
            continue

        source = ef.get("source")
        if isinstance(source, str):
            src_clean = source.strip()
            # Guard against malformed source metadata (observed in some legacy/root-flat
            # artifacts where this field is accidentally set to a filename/path-ish value).
            if (
                not src_clean
                or "/" in src_clean
                or "\\" in src_clean
                or ".audio.asr." in src_clean
                or src_clean.endswith(".json")
                or "[" in src_clean
            ):
                source = None
            else:
                source = src_clean
        if not isinstance(source, str) or not source:
            p = ef.get("_source_file")
            if isinstance(p, str):
                inferred = _infer_source_from_stage07_path(p)
                if inferred:
                    source = inferred
        if (not isinstance(source, str) or not source) and preferred_source_by_vid:
            preferred = preferred_source_by_vid.get(vid)
            if isinstance(preferred, str) and preferred.strip():
                source = preferred.strip()
        if not isinstance(source, str):
            source = ""

        segments = ef.get("segments", []) or []
        conv_seg_ids: Dict[int, List[int]] = {}
        for s in segments:
            if not isinstance(s, dict):
                continue
            cid = s.get("conversation_id")
            sid = s.get("id")
            if isinstance(cid, int) and cid > 0 and isinstance(sid, int):
                conv_seg_ids.setdefault(cid, []).append(sid)

        for e in ef.get("enrichments", []) or []:
            if not isinstance(e, dict) or e.get("type") != "approach":
                continue
            cid = e.get("conversation_id")
            if not isinstance(cid, int) or cid <= 0:
                continue
            seg_ids = sorted(conv_seg_ids.get(cid, []))
            out[(vid, cid)] = {
                "video_id": vid,
                "source": source,
                "conversation_id": cid,
                "enrichment": e,
                "transcript_segments": seg_ids,
            }
    return out


def _index_paths_by_video_id(
    stage_root: Path,
    glob_pattern: str,
    only_ids: Optional[Set[str]] = None,
) -> Dict[str, List[Path]]:
    out: Dict[str, List[Path]] = {}
    if not stage_root.exists():
        return out
    for p in stage_root.rglob(glob_pattern):
        vid = _video_id_for_path(p)
        if not vid:
            continue
        if only_ids and vid not in only_ids:
            continue
        out.setdefault(vid, []).append(p)
    return out


def _pick_best_candidate(candidates: List[Path], preferred_source: Optional[str]) -> Path:
    def rank(p: Path) -> Tuple[int, int, int, float, str]:
        source_bonus = 1 if (preferred_source and preferred_source in p.parts) else 0
        name = p.name.lower()
        quality_bonus = 2 if ".audio.asr.clean16k" in name else (1 if ".audio.asr.raw16k" in name else 0)
        depth = len(p.parts)
        try:
            mtime = p.stat().st_mtime
        except OSError:
            mtime = 0.0
        return (source_bonus, quality_bonus, depth, mtime, str(p))

    return sorted(candidates, key=rank, reverse=True)[0]


def _load_json_files(
    stage_root: Path,
    glob_pattern: str,
    *,
    stage_name: str,
    source_filter: Optional[str],
    only_ids: Optional[Set[str]],
    preferred_source_by_vid: Optional[Dict[str, str]] = None,
) -> List[Dict]:
    root = stage_root / source_filter if source_filter else stage_root
    idx = _index_paths_by_video_id(root, glob_pattern, only_ids=only_ids)
    files: List[Dict] = []
    for vid in sorted(idx.keys()):
        candidates = idx[vid]
        preferred_source = preferred_source_by_vid.get(vid) if preferred_source_by_vid else source_filter
        best = _pick_best_candidate(candidates, preferred_source)
        try:
            data = json.loads(best.read_text())
            data["_source_file"] = str(best)
            data["_stage"] = stage_name
            files.append(data)
        except (json.JSONDecodeError, IOError) as e:
            print(f"{LOG_PREFIX} WARNING: Could not read {best}: {e}")
    return files


def batch_reports_dir() -> Path:
    d = repo_root() / "data" / "batch_reports"
    d.mkdir(parents=True, exist_ok=True)
    return d


def load_enriched_files(source: Optional[str] = None) -> List[Dict]:
    """Load enriched.json files from data/07.LLM.content/, de-duped by video_id."""
    content_root = repo_root() / "data" / "07.LLM.content"
    return _load_json_files(
        content_root,
        "*.enriched.json",
        stage_name="07.LLM.content",
        source_filter=source,
        only_ids=None,
    )


def load_conversations_files(source: Optional[str] = None) -> List[Dict]:
    """Load conversations.json files, preferring 06c.DET.patched when present."""
    patched_root = repo_root() / "data" / "06c.DET.patched"
    vtype_root = repo_root() / "data" / "06.LLM.video-type"

    idx_06c = _index_paths_by_video_id(
        patched_root / source if source else patched_root,
        "*.conversations.json",
        only_ids=None,
    )
    idx_06 = _index_paths_by_video_id(
        vtype_root / source if source else vtype_root,
        "*.conversations.json",
        only_ids=None,
    )

    files: List[Dict] = []
    for vid in sorted(set(idx_06c.keys()) | set(idx_06.keys())):
        candidates = idx_06c.get(vid) or idx_06.get(vid) or []
        if not candidates:
            continue
        stage_name = "06c.DET.patched" if vid in idx_06c else "06.LLM.video-type"
        best = _pick_best_candidate(candidates, preferred_source=source)
        try:
            data = json.loads(best.read_text())
            data["_source_file"] = str(best)
            data["_stage"] = stage_name
            files.append(data)
        except (json.JSONDecodeError, IOError) as e:
            print(f"{LOG_PREFIX} WARNING: Could not read {best}: {e}")
    return files


def load_validation_files(source: Optional[str] = None) -> List[Dict]:
    """Load .validation.json files (de-duped by video_id)."""
    validations: List[Dict] = []
    for stage_dir in ["06.LLM.video-type", "07.LLM.content"]:
        root = repo_root() / "data" / stage_dir
        validations.extend(_load_json_files(
            root,
            "*.validation.json",
            stage_name=stage_dir,
            source_filter=source,
            only_ids=None,
        ))
    return validations


def load_semantic_judgements(batch_id: str, manifest_ids: Optional[Set[str]] = None) -> List[Dict[str, Any]]:
    """Load semantic judge outputs from data/validation_judgements/<batch_id>/*.judge.json."""
    root = repo_root() / "data" / "validation_judgements" / batch_id
    if not root.exists():
        return []
    out: List[Dict[str, Any]] = []
    for f in sorted(root.glob("*.judge.json")):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except Exception:
            continue
        vid = data.get("video_id")
        if manifest_ids and (not isinstance(vid, str) or vid not in manifest_ids):
            continue
        data["_source_file"] = str(f)
        out.append(data)
    return out


def compute_batch_stats(
    conversations_files: List[Dict],
    enriched_files: List[Dict],
    validation_files: List[Dict],
    semantic_judgements: Optional[List[Dict[str, Any]]] = None,
    manifest_source_by_vid: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """Compute aggregate statistics for a batch."""

    stats: Dict[str, Any] = {}

    # --- Stage 06 statistics ---
    video_type_counts: Counter = Counter()
    conversations_per_infield: List[int] = []
    unknown_speaker_count = 0
    student_speaker_count = 0
    videos_with_students = 0
    total_speaker_count = 0

    for conv_file in conversations_files:
        vtype = conv_file.get("video_type", {})
        vtype_str = vtype.get("type", "") if isinstance(vtype, dict) else str(vtype)
        video_type_counts[vtype_str] += 1

        convs = conv_file.get("conversations", [])
        if vtype_str in ("infield", "compilation"):
            conversations_per_infield.append(len(convs))

        labels = conv_file.get("speaker_labels", {})
        has_student = False
        for label in labels.values():
            total_speaker_count += 1
            role = label.get("role")
            if role == "unknown":
                unknown_speaker_count += 1
            elif role == "student":
                student_speaker_count += 1
                has_student = True
        if has_student:
            videos_with_students += 1

    stats["stage_06"] = {
        "videos_processed": len(conversations_files),
        "video_type_distribution": dict(video_type_counts),
        "mean_conversations_per_infield": (
            sum(conversations_per_infield) / max(len(conversations_per_infield), 1)
            if conversations_per_infield else 0
        ),
        "unknown_speaker_rate": (
            unknown_speaker_count / max(total_speaker_count, 1)
        ),
        "student_speaker_rate": (
            student_speaker_count / max(total_speaker_count, 1)
        ),
        "videos_with_students": videos_with_students,
        "student_video_rate": (
            videos_with_students / max(len(conversations_files), 1)
        ),
    }

    # --- Stage 07 statistics ---
    technique_counts: Counter = Counter()
    topic_counts: Counter = Counter()
    phase_counts: Counter = Counter()
    hook_count = 0
    approach_count = 0
    investment_counts: Counter = Counter()
    evidence_lengths: List[int] = []
    unlisted_techniques: Counter = Counter()
    unlisted_topics: Counter = Counter()
    topics_per_approach: List[int] = []
    techniques_per_approach: List[int] = []
    turn_phase_coverage: List[float] = []
    phase_confidence_means: List[float] = []

    total_low_quality_segments = 0
    total_lq_repaired = 0
    total_transcript_artifacts = 0
    normalization_repairs_total = 0
    videos_with_repairs = 0

    for enriched_file in enriched_files:
        meta = enriched_file.get("metadata", {})
        repairs = meta.get("normalization_repairs_count", 0)
        if isinstance(repairs, int) and repairs > 0:
            videos_with_repairs += 1
            normalization_repairs_total += repairs

        lq_list = enriched_file.get("low_quality_segments", []) or []
        total_low_quality_segments += len(lq_list)
        total_lq_repaired += sum(1 for lq in lq_list if isinstance(lq, dict) and lq.get("repaired"))
        total_transcript_artifacts += len(enriched_file.get("transcript_artifacts", []) or [])

        # Build conversation segment counts for phase coverage (uses Stage 06/06c conversation_id in segments).
        conv_seg_counts: Counter = Counter()
        for seg in enriched_file.get("segments", []) or []:
            cid = seg.get("conversation_id")
            if isinstance(cid, int) and cid > 0:
                conv_seg_counts[cid] += 1

        enrichments = enriched_file.get("enrichments", [])

        for e in enrichments:
            if e.get("type") == "approach":
                approach_count += 1
                if e.get("hook_point"):
                    hook_count += 1
                inv = e.get("investment_level")
                if inv:
                    investment_counts[inv] += 1

                topics_per_approach.append(len(e.get("topics_discussed", []) or []))
                techniques_per_approach.append(len(e.get("techniques_used", []) or []))

                # Phase coverage: how many conversation segments got a phase label.
                conv_id = e.get("conversation_id")
                if isinstance(conv_id, int) and conv_id > 0:
                    seg_total = conv_seg_counts.get(conv_id, 0)
                    if seg_total > 0:
                        turn_phase_coverage.append(len(e.get("turn_phases", []) or []) / seg_total)

                pc = e.get("phase_confidence", {})
                if isinstance(pc, dict) and pc:
                    vals = [v for v in pc.values() if isinstance(v, (int, float))]
                    if vals:
                        phase_confidence_means.append(sum(vals) / len(vals))

            # Techniques
            for tech in e.get("techniques_used", []):
                technique_counts[tech.get("technique", "")] += 1
                example = tech.get("example", "")
                if example:
                    evidence_lengths.append(len(example))
            for tech in e.get("techniques_discussed", []):
                technique_counts[tech.get("technique", "")] += 1

            # Topics
            for topic in e.get("topics_discussed", []):
                if isinstance(topic, str):
                    topic_counts[topic] += 1

            # Phases
            for tp in e.get("turn_phases", []):
                phase = tp.get("phase", "")
                if phase:
                    phase_counts[phase] += 1

            # Unlisted concepts
            unlisted = e.get("unlisted_concepts", {})
            if isinstance(unlisted, dict):
                for t in unlisted.get("techniques", []):
                    unlisted_techniques[str(t)] += 1
                for t in unlisted.get("topics", []):
                    unlisted_topics[str(t)] += 1

    stats["stage_07"] = {
        "videos_enriched": len(enriched_files),
        "total_approaches": approach_count,
        "technique_frequency": dict(technique_counts.most_common()),
        "topic_frequency": dict(topic_counts.most_common()),
        "phase_distribution": dict(phase_counts),
        "hook_rate": hook_count / max(approach_count, 1),
        "investment_distribution": dict(investment_counts),
        "mean_topics_per_approach": (
            sum(topics_per_approach) / max(len(topics_per_approach), 1)
            if topics_per_approach else 0
        ),
        "median_topics_per_approach": median(topics_per_approach) if topics_per_approach else 0,
        "mean_techniques_per_approach": (
            sum(techniques_per_approach) / max(len(techniques_per_approach), 1)
            if techniques_per_approach else 0
        ),
        "median_techniques_per_approach": median(techniques_per_approach) if techniques_per_approach else 0,
        "mean_turn_phase_coverage": (
            sum(turn_phase_coverage) / max(len(turn_phase_coverage), 1)
            if turn_phase_coverage else 0
        ),
        "median_turn_phase_coverage": median(turn_phase_coverage) if turn_phase_coverage else 0,
        "mean_phase_confidence": (
            sum(phase_confidence_means) / max(len(phase_confidence_means), 1)
            if phase_confidence_means else 0
        ),
        "mean_evidence_length": (
            sum(evidence_lengths) / max(len(evidence_lengths), 1)
            if evidence_lengths else 0
        ),
        "unlisted_techniques": dict(unlisted_techniques.most_common(20)),
        "unlisted_topics": dict(unlisted_topics.most_common(20)),
        "total_low_quality_segments": total_low_quality_segments,
        "total_lq_repaired": total_lq_repaired,
        "total_transcript_artifacts": total_transcript_artifacts,
        "videos_with_normalization_repairs": videos_with_repairs,
        "normalization_repairs_total": normalization_repairs_total,
    }

    # --- Validation statistics ---
    total_errors = 0
    total_warnings = 0
    warning_types: Counter = Counter()
    error_types: Counter = Counter()

    stage_validation: Dict[str, Dict[str, Any]] = {}

    for vf in validation_files:
        summary = vf.get("summary", {})
        total_errors += summary.get("errors", 0)
        total_warnings += summary.get("warnings", 0)

        stage = vf.get("_stage", "unknown")
        if stage not in stage_validation:
            stage_validation[stage] = {
                "total_validations": 0,
                "total_errors": 0,
                "total_warnings": 0,
                "error_types": Counter(),
                "warning_types": Counter(),
            }
        stage_validation[stage]["total_validations"] += 1
        stage_validation[stage]["total_errors"] += summary.get("errors", 0)
        stage_validation[stage]["total_warnings"] += summary.get("warnings", 0)

        for result in vf.get("results", []):
            if result.get("severity") == "error":
                error_types[result.get("check", "unknown")] += 1
                stage_validation[stage]["error_types"][result.get("check", "unknown")] += 1
            elif result.get("severity") == "warning":
                warning_types[result.get("check", "unknown")] += 1
                stage_validation[stage]["warning_types"][result.get("check", "unknown")] += 1

    stats["validation"] = {
        "total_validations": len(validation_files),
        "total_errors": total_errors,
        "total_warnings": total_warnings,
        "error_types": dict(error_types.most_common()),
        "warning_types": dict(warning_types.most_common()),
        "by_stage": {
            stage: {
                "total_validations": d["total_validations"],
                "total_errors": d["total_errors"],
                "total_warnings": d["total_warnings"],
                "error_types": dict(d["error_types"].most_common()),
                "warning_types": dict(d["warning_types"].most_common()),
            }
            for stage, d in stage_validation.items()
        },
    }

    # --- Semantic judge statistics (optional) ---
    if semantic_judgements:
        # Detect "fresh" by comparing request_fingerprint against the current Stage 07
        # enrichment + segment ids, not by file mtimes (Stage 07 revalidate rewrites files
        # even when content is unchanged).
        s07_req_by_vid_conv = _build_stage07_semantic_request_index(
            enriched_files,
            preferred_source_by_vid=manifest_source_by_vid,
        )
        fresh: List[Dict[str, Any]] = []
        stale = 0
        stale_missing_or_deleted = 0
        stale_fingerprint_mismatch = 0
        for j in semantic_judgements:
            vid = j.get("video_id")
            cid = j.get("conversation_id")
            if not isinstance(vid, str) or not isinstance(cid, int):
                stale += 1
                stale_missing_or_deleted += 1
                continue

            req = s07_req_by_vid_conv.get((vid, cid))
            if not req:
                stale += 1
                stale_missing_or_deleted += 1
                continue

            req_meta = j.get("request", {}) if isinstance(j.get("request"), dict) else {}
            prompt_version = req_meta.get("prompt_version")
            if not isinstance(prompt_version, str) or not prompt_version:
                prompt_version = SEMANTIC_JUDGE_DEFAULT_PROMPT_VERSION
            max_segments = req_meta.get("max_segments")
            if not isinstance(max_segments, int) or max_segments <= 0:
                max_segments = SEMANTIC_JUDGE_DEFAULT_MAX_SEGMENTS

            expected_fingerprint = stable_hash({
                "video_id": req["video_id"],
                "source": req["source"],
                "conversation_id": req["conversation_id"],
                "enrichment": req["enrichment"],
                "transcript_segments": req["transcript_segments"],
                "prompt_version": prompt_version,
                "max_segments": max_segments,
            })
            if j.get("request_fingerprint") != expected_fingerprint:
                stale += 1
                stale_fingerprint_mismatch += 1
                continue

            fresh.append(j)

        overall_scores: List[int] = []
        major_errors = 0
        hallucinations = 0
        dim_totals: Counter = Counter()
        dim_counts: Counter = Counter()

        for j in fresh:
            scores = j.get("scores", {}) if isinstance(j.get("scores"), dict) else {}
            try:
                overall_scores.append(int(scores.get("overall_score_0_100", 0)))
            except Exception:
                pass
            flags = j.get("flags", {}) if isinstance(j.get("flags"), dict) else {}
            if flags.get("major_errors") is True:
                major_errors += 1
            if flags.get("hallucination_suspected") is True:
                hallucinations += 1

            for dim in ["technique_accuracy", "topic_accuracy", "phase_accuracy", "summary_quality", "overall_usefulness"]:
                v = scores.get(dim)
                if isinstance(v, (int, float)):
                    dim_totals[dim] += float(v)
                    dim_counts[dim] += 1

        stats["semantic_judge"] = {
            "total_judgements": len(semantic_judgements),
            "fresh_judgements": len(fresh),
            "stale_judgements": stale,
            "stale_missing_or_deleted": stale_missing_or_deleted,
            "stale_fingerprint_mismatch": stale_fingerprint_mismatch,
            "mean_overall_score_0_100": (
                sum(overall_scores) / max(len(overall_scores), 1) if overall_scores else 0
            ),
            "major_error_rate": major_errors / max(len(fresh), 1),
            "hallucination_rate": hallucinations / max(len(fresh), 1),
            "mean_dimension_scores_0_5": {
                dim: (dim_totals[dim] / dim_counts[dim]) if dim_counts[dim] else 0
                for dim in ["technique_accuracy", "topic_accuracy", "phase_accuracy", "summary_quality", "overall_usefulness"]
            },
        }

    return stats


def chi_squared_test(observed: Dict[str, int], expected: Dict[str, int]) -> float:
    """Simple chi-squared statistic for comparing two distributions.

    Returns the chi-squared value (higher = more different).
    Not a proper p-value calculation — just a rough comparison metric.
    """
    all_keys = set(list(observed.keys()) + list(expected.keys()))
    total_obs = max(sum(observed.values()), 1)
    total_exp = max(sum(expected.values()), 1)

    chi_sq = 0.0
    for key in all_keys:
        obs_frac = observed.get(key, 0) / total_obs
        exp_frac = expected.get(key, 0) / total_exp
        # Scale to total_obs for comparison
        obs_val = obs_frac * total_obs
        exp_val = exp_frac * total_obs
        if exp_val > 0:
            chi_sq += (obs_val - exp_val) ** 2 / exp_val

    return chi_sq


def z_score(value: float, mean: float, std: float) -> float:
    """Compute z-score."""
    if std == 0:
        return 0.0
    return (value - mean) / std


def compare_with_prior_batches(
    current_stats: Dict, batch_id: str
) -> List[Dict[str, Any]]:
    """Compare current batch statistics against prior batch reports."""
    reports_dir = batch_reports_dir()
    prior_reports: List[Dict] = []

    for f in sorted(reports_dir.glob("batch_*.json")):
        if f.stem == f"batch_{batch_id}":
            continue
        try:
            prior_reports.append(json.loads(f.read_text()))
        except (json.JSONDecodeError, IOError):
            pass

    if not prior_reports:
        return [{"check": "no_prior_batches", "message": "No prior batches to compare against"}]

    drift_flags: List[Dict[str, Any]] = []

    # Compare technique distributions
    current_techniques = current_stats.get("stage_07", {}).get("technique_frequency", {})
    if current_techniques:
        # Aggregate prior technique distributions
        prior_technique_totals: Counter = Counter()
        for report in prior_reports:
            for tech, count in report.get("stats", {}).get("stage_07", {}).get("technique_frequency", {}).items():
                prior_technique_totals[tech] += count

        if prior_technique_totals:
            chi_sq = chi_squared_test(current_techniques, dict(prior_technique_totals))
            # Rough threshold: chi-sq > 2*k (where k = number of categories) suggests drift
            k = len(set(list(current_techniques.keys()) + list(prior_technique_totals.keys())))
            if k > 0 and chi_sq > 2 * k:
                drift_flags.append({
                    "check": "technique_distribution_drift",
                    "chi_squared": round(chi_sq, 2),
                    "threshold": round(2 * k, 2),
                    "message": f"Technique distribution differs from prior batches (chi²={chi_sq:.1f} > {2*k:.1f})"
                })

    # Compare hook rate
    current_hook_rate = current_stats.get("stage_07", {}).get("hook_rate", 0)
    prior_hook_rates = [
        r.get("stats", {}).get("stage_07", {}).get("hook_rate", 0)
        for r in prior_reports
    ]
    if prior_hook_rates and len(prior_hook_rates) >= 2:
        mean_hr = sum(prior_hook_rates) / len(prior_hook_rates)
        std_hr = (sum((x - mean_hr) ** 2 for x in prior_hook_rates) / len(prior_hook_rates)) ** 0.5
        if std_hr > 0:
            z = z_score(current_hook_rate, mean_hr, std_hr)
            if abs(z) > 2:
                drift_flags.append({
                    "check": "hook_rate_drift",
                    "z_score": round(z, 2),
                    "current": round(current_hook_rate, 3),
                    "prior_mean": round(mean_hr, 3),
                    "message": f"Hook rate {current_hook_rate:.1%} deviates from prior mean {mean_hr:.1%} (z={z:.1f})"
                })

    # Compare conversations per infield
    current_conv_mean = current_stats.get("stage_06", {}).get("mean_conversations_per_infield", 0)
    prior_conv_means = [
        r.get("stats", {}).get("stage_06", {}).get("mean_conversations_per_infield", 0)
        for r in prior_reports
    ]
    if prior_conv_means and len(prior_conv_means) >= 2:
        mean_cm = sum(prior_conv_means) / len(prior_conv_means)
        std_cm = (sum((x - mean_cm) ** 2 for x in prior_conv_means) / len(prior_conv_means)) ** 0.5
        if std_cm > 0:
            z = z_score(current_conv_mean, mean_cm, std_cm)
            if abs(z) > 2:
                drift_flags.append({
                    "check": "conversations_per_infield_drift",
                    "z_score": round(z, 2),
                    "current": round(current_conv_mean, 2),
                    "prior_mean": round(mean_cm, 2),
                    "message": f"Mean conversations/infield {current_conv_mean:.1f} deviates from {mean_cm:.1f} (z={z:.1f})"
                })

    if not drift_flags:
        drift_flags.append({
            "check": "no_drift_detected",
            "message": f"No significant drift detected compared to {len(prior_reports)} prior batch(es)"
        })

    return drift_flags


def _to_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def evaluate_semantic_gate(
    stats: Dict[str, Any],
    *,
    min_fresh: Optional[int],
    min_mean_overall: Optional[float],
    max_major_error_rate: Optional[float],
    max_hallucination_rate: Optional[float],
    fail_on_stale: bool,
) -> Dict[str, Any]:
    enabled = fail_on_stale or any(
        v is not None
        for v in (min_fresh, min_mean_overall, max_major_error_rate, max_hallucination_rate)
    )

    thresholds = {
        "min_fresh_judgements": min_fresh,
        "min_mean_overall_score_0_100": min_mean_overall,
        "max_major_error_rate": max_major_error_rate,
        "max_hallucination_rate": max_hallucination_rate,
        "fail_on_stale": fail_on_stale,
    }

    if not enabled:
        return {
            "enabled": False,
            "passed": True,
            "thresholds": thresholds,
            "observed": {},
            "failures": [],
        }

    sem = stats.get("semantic_judge", {})
    if not isinstance(sem, dict):
        sem = {}

    total = _to_int(sem.get("total_judgements"), 0)
    fresh = _to_int(sem.get("fresh_judgements"), total)
    stale = _to_int(sem.get("stale_judgements"), max(total - fresh, 0))
    mean_overall = _to_float(sem.get("mean_overall_score_0_100"), 0.0)
    major_error_rate = _to_float(sem.get("major_error_rate"), 0.0)
    hallucination_rate = _to_float(sem.get("hallucination_rate"), 0.0)

    observed = {
        "total_judgements": total,
        "fresh_judgements": fresh,
        "stale_judgements": stale,
        "mean_overall_score_0_100": mean_overall,
        "major_error_rate": major_error_rate,
        "hallucination_rate": hallucination_rate,
    }

    failures: List[Dict[str, Any]] = []
    if total <= 0:
        failures.append({
            "check": "missing_semantic_judgements",
            "message": "No semantic judge outputs were found for this batch scope",
        })
    else:
        if fail_on_stale and stale > 0:
            failures.append({
                "check": "stale_judgements_present",
                "expected": {"stale_judgements": 0},
                "observed": {"stale_judgements": stale},
                "message": f"Found stale semantic judgements: stale={stale}",
            })
        if min_fresh is not None and fresh < min_fresh:
            failures.append({
                "check": "fresh_judgements_below_threshold",
                "expected": {"fresh_judgements_gte": min_fresh},
                "observed": {"fresh_judgements": fresh},
                "message": f"Fresh semantic judgements below threshold: fresh={fresh} < min={min_fresh}",
            })
        if min_mean_overall is not None and mean_overall < min_mean_overall:
            failures.append({
                "check": "mean_overall_below_threshold",
                "expected": {"mean_overall_score_0_100_gte": min_mean_overall},
                "observed": {"mean_overall_score_0_100": mean_overall},
                "message": (
                    f"Mean semantic score below threshold: mean={mean_overall:.1f} < min={min_mean_overall:.1f}"
                ),
            })
        if max_major_error_rate is not None and major_error_rate > max_major_error_rate:
            failures.append({
                "check": "major_error_rate_above_threshold",
                "expected": {"major_error_rate_lte": max_major_error_rate},
                "observed": {"major_error_rate": major_error_rate},
                "message": (
                    f"Major error rate above threshold: rate={major_error_rate:.3f} > max={max_major_error_rate:.3f}"
                ),
            })
        if max_hallucination_rate is not None and hallucination_rate > max_hallucination_rate:
            failures.append({
                "check": "hallucination_rate_above_threshold",
                "expected": {"hallucination_rate_lte": max_hallucination_rate},
                "observed": {"hallucination_rate": hallucination_rate},
                "message": (
                    f"Hallucination rate above threshold: rate={hallucination_rate:.3f} > max={max_hallucination_rate:.3f}"
                ),
            })

    return {
        "enabled": True,
        "passed": len(failures) == 0,
        "thresholds": thresholds,
        "observed": observed,
        "failures": failures,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch statistics report and drift detection")
    parser.add_argument("--source", help="Report for a specific source")
    parser.add_argument("--all", action="store_true", help="Report for all sources")
    parser.add_argument("--manifest", help="Only include videos listed in a batch/sub-batch manifest file")
    parser.add_argument("--batch-id", required=True, help="Batch identifier (e.g., R1, R2, P001)")
    parser.add_argument("--compare", action="store_true", help="Compare against prior batches")
    parser.add_argument("--json", action="store_true", help="Output JSON report")
    parser.add_argument(
        "--no-write",
        action="store_true",
        help="Do not write report file to data/batch_reports (stdout only)",
    )
    parser.add_argument(
        "--semantic-min-fresh",
        type=int,
        help="Optional semantic gate: require at least this many fresh semantic judgements",
    )
    parser.add_argument(
        "--semantic-min-mean-overall",
        type=float,
        help="Optional semantic gate: require mean overall semantic score >= this value (0..100)",
    )
    parser.add_argument(
        "--semantic-max-major-error-rate",
        type=float,
        help="Optional semantic gate: require major_error_rate <= this value (0..1)",
    )
    parser.add_argument(
        "--semantic-max-hallucination-rate",
        type=float,
        help="Optional semantic gate: require hallucination_rate <= this value (0..1)",
    )
    parser.add_argument(
        "--semantic-fail-on-stale",
        action="store_true",
        help="Optional semantic gate: fail when stale semantic judgements are present",
    )

    args = parser.parse_args()

    if args.semantic_min_fresh is not None and args.semantic_min_fresh < 0:
        print(f"{LOG_PREFIX} ERROR: --semantic-min-fresh must be >= 0", file=sys.stderr)
        sys.exit(2)
    if args.semantic_min_mean_overall is not None and not (0.0 <= args.semantic_min_mean_overall <= 100.0):
        print(f"{LOG_PREFIX} ERROR: --semantic-min-mean-overall must be in [0, 100]", file=sys.stderr)
        sys.exit(2)
    if args.semantic_max_major_error_rate is not None and not (0.0 <= args.semantic_max_major_error_rate <= 1.0):
        print(f"{LOG_PREFIX} ERROR: --semantic-max-major-error-rate must be in [0, 1]", file=sys.stderr)
        sys.exit(2)
    if args.semantic_max_hallucination_rate is not None and not (0.0 <= args.semantic_max_hallucination_rate <= 1.0):
        print(f"{LOG_PREFIX} ERROR: --semantic-max-hallucination-rate must be in [0, 1]", file=sys.stderr)
        sys.exit(2)

    if not args.source and not args.all:
        parser.print_help()
        sys.exit(1)

    source = args.source if args.source else None

    manifest_ids: Set[str] = set()
    manifest_source_by_vid: Dict[str, str] = {}
    manifest_path: Optional[Path] = None
    if args.manifest:
        manifest_path = Path(args.manifest)
        if not manifest_path.is_absolute():
            manifest_path = repo_root() / manifest_path
        if not manifest_path.exists():
            print(f"{LOG_PREFIX} ERROR: Manifest file not found: {manifest_path}", file=sys.stderr)
            sys.exit(1)
        manifest_ids = _load_manifest_ids(manifest_path, source=source)
        if not manifest_ids:
            print(f"{LOG_PREFIX} No video ids found in manifest: {manifest_path}")
            sys.exit(0)
        for src_name, vid in _load_manifest_entries(manifest_path, source=source):
            manifest_source_by_vid.setdefault(vid, src_name)

    # Load data
    conversations_files = load_conversations_files(source)
    enriched_files = load_enriched_files(source)
    validation_files = load_validation_files(source)

    if manifest_ids:
        conversations_files = _filter_by_manifest(conversations_files, manifest_ids)
        enriched_files = _filter_by_manifest(enriched_files, manifest_ids)
        validation_files = _filter_by_manifest(validation_files, manifest_ids)

    if not conversations_files and not enriched_files:
        semantic_gate_requested = args.semantic_fail_on_stale or any(
            v is not None
            for v in (
                args.semantic_min_fresh,
                args.semantic_min_mean_overall,
                args.semantic_max_major_error_rate,
                args.semantic_max_hallucination_rate,
            )
        )
        if semantic_gate_requested:
            print(
                f"{LOG_PREFIX} ERROR: Semantic gate requested but no Stage 06/07 data found for the selected scope",
                file=sys.stderr,
            )
            print(
                f"{LOG_PREFIX} Hint: run Stage 06/07 (and semantic_judge.py) for this manifest/source before gating",
                file=sys.stderr,
            )
            sys.exit(1)
        print(f"{LOG_PREFIX} No data found to report on")
        sys.exit(0)

    semantic_judgements = load_semantic_judgements(args.batch_id, manifest_ids if manifest_ids else None)

    # Compute statistics
    stats = compute_batch_stats(
        conversations_files,
        enriched_files,
        validation_files,
        semantic_judgements=semantic_judgements,
        manifest_source_by_vid=manifest_source_by_vid if manifest_source_by_vid else None,
    )

    # Compare with prior batches
    drift_flags = []
    if args.compare:
        drift_flags = compare_with_prior_batches(stats, args.batch_id)

    # Build report
    report = {
        "batch_id": args.batch_id,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_filter": source or "all",
        **({"manifest": str(manifest_path), "manifest_videos": len(manifest_ids)} if manifest_path else {}),
        "stats": stats,
    }
    if drift_flags:
        report["drift_detection"] = drift_flags
    semantic_gate = evaluate_semantic_gate(
        stats,
        min_fresh=args.semantic_min_fresh,
        min_mean_overall=args.semantic_min_mean_overall,
        max_major_error_rate=args.semantic_max_major_error_rate,
        max_hallucination_rate=args.semantic_max_hallucination_rate,
        fail_on_stale=args.semantic_fail_on_stale,
    )
    if semantic_gate.get("enabled"):
        report["semantic_gate"] = semantic_gate

    # Save report
    if not args.no_write:
        report_path = batch_reports_dir() / f"batch_{args.batch_id}.json"
        report_path.write_text(json.dumps(report, indent=2))
        print(f"{LOG_PREFIX} Report saved to: {report_path}")

    # Output
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        s06 = stats.get("stage_06", {})
        s07 = stats.get("stage_07", {})
        val = stats.get("validation", {})
        sem = stats.get("semantic_judge", {})

        print(f"\n{LOG_PREFIX} Batch Report: {args.batch_id}")
        print(f"{'='*60}")

        print(f"\nStage 06 (Video Type + Conversations):")
        print(f"  Videos processed:         {s06.get('videos_processed', 0)}")
        print(f"  Video types:              {s06.get('video_type_distribution', {})}")
        print(f"  Mean convs/infield:       {s06.get('mean_conversations_per_infield', 0):.1f}")
        print(f"  Unknown speaker rate:     {s06.get('unknown_speaker_rate', 0):.1%}")
        print(f"  Student speaker rate:     {s06.get('student_speaker_rate', 0):.1%}")
        print(f"  Videos with students:     {s06.get('videos_with_students', 0)} ({s06.get('student_video_rate', 0):.1%})")

        print(f"\nStage 07 (Content Enrichment):")
        print(f"  Videos enriched:          {s07.get('videos_enriched', 0)}")
        print(f"  Total approaches:         {s07.get('total_approaches', 0)}")
        print(f"  Hook rate:                {s07.get('hook_rate', 0):.1%}")
        print(f"  Investment distribution:  {s07.get('investment_distribution', {})}")
        print(f"  Mean evidence length:     {s07.get('mean_evidence_length', 0):.0f} chars")
        print(f"  Mean topics/approach:     {s07.get('mean_topics_per_approach', 0):.1f} (median {s07.get('median_topics_per_approach', 0)})")
        print(f"  Mean techniques/approach: {s07.get('mean_techniques_per_approach', 0):.1f} (median {s07.get('median_techniques_per_approach', 0)})")
        print(f"  Phase coverage:           {s07.get('mean_turn_phase_coverage', 0):.1%} (median {s07.get('median_turn_phase_coverage', 0):.1%})")
        print(f"  Mean phase confidence:    {s07.get('mean_phase_confidence', 0):.2f}")
        print(f"  Transcript artifacts:     {s07.get('total_transcript_artifacts', 0)}")
        print(f"  Low-quality segments:     {s07.get('total_low_quality_segments', 0)} (repaired={s07.get('total_lq_repaired', 0)})")
        print(
            f"  Normalization repairs:    {s07.get('normalization_repairs_total', 0)} "
            f"(videos={s07.get('videos_with_normalization_repairs', 0)})"
        )

        top_techniques = list(s07.get("technique_frequency", {}).items())[:10]
        if top_techniques:
            print(f"\n  Top 10 techniques:")
            for tech, count in top_techniques:
                print(f"    {tech}: {count}")

        unlisted_tech = s07.get("unlisted_techniques", {})
        if unlisted_tech:
            print(f"\n  Unlisted techniques (taxonomy gaps):")
            for tech, count in list(unlisted_tech.items())[:10]:
                print(f"    {tech}: {count}")

        print(f"\nValidation:")
        print(f"  Total validations:        {val.get('total_validations', 0)}")
        print(f"  Total errors:             {val.get('total_errors', 0)}")
        print(f"  Total warnings:           {val.get('total_warnings', 0)}")
        if val.get("error_types"):
            print(f"  Error types:              {val.get('error_types', {})}")
        if val.get("warning_types"):
            print(f"  Warning types:            {val.get('warning_types', {})}")

        by_stage = val.get("by_stage", {})
        if by_stage:
            print(f"\n  Validation breakdown by stage:")
            for stage, s in sorted(by_stage.items()):
                print(
                    f"    {stage}: errors={s.get('total_errors', 0)} "
                    f"warnings={s.get('total_warnings', 0)} "
                    f"(n={s.get('total_validations', 0)})"
                )

        if drift_flags:
            print(f"\nDrift Detection:")
            for flag in drift_flags:
                print(f"  [{flag.get('check')}] {flag.get('message')}")

        if sem:
            print(f"\nSemantic Judge (sampled):")
            print(f"  Total judgements:        {sem.get('total_judgements', 0)}")
            fresh = sem.get("fresh_judgements", sem.get("total_judgements", 0))
            stale = sem.get("stale_judgements", 0)
            if stale:
                print(f"  Fresh judgements:        {fresh} (stale={stale})")
            if fresh <= 0:
                print(f"  NOTE: No fresh judgements (Stage 07 outputs are newer). Rerun semantic_judge.py.")
            else:
                print(f"  Mean overall score:      {sem.get('mean_overall_score_0_100', 0):.1f} / 100")
                print(f"  Major error rate:        {sem.get('major_error_rate', 0):.1%}")
                print(f"  Hallucination rate:      {sem.get('hallucination_rate', 0):.1%}")
                dims = sem.get('mean_dimension_scores_0_5', {})
                if dims:
                    print(f"  Mean dimension scores:   {dims}")

        if semantic_gate.get("enabled"):
            gate_status = "PASS" if semantic_gate.get("passed") else "FAIL"
            print(f"\nSemantic Gate: {gate_status}")
            for failure in semantic_gate.get("failures", []):
                print(f"  [{failure.get('check')}] {failure.get('message')}")

    if semantic_gate.get("enabled") and not semantic_gate.get("passed"):
        sys.exit(1)


if __name__ == "__main__":
    main()
