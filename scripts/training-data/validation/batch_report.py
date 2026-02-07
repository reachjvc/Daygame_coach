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
import json
import math
import re
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

LOG_PREFIX = "[batch-report]"

_BRACKET_ID_RE = re.compile(r"\[([A-Za-z0-9_-]+)\]")


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


def batch_reports_dir() -> Path:
    d = repo_root() / "data" / "batch_reports"
    d.mkdir(parents=True, exist_ok=True)
    return d


def load_enriched_files(source: Optional[str] = None) -> List[Dict]:
    """Load all enriched.json files from data/07.content/."""
    content_root = repo_root() / "data" / "07.content"
    search_dirs = [content_root / source] if source else [content_root]

    files: List[Dict] = []
    for search_dir in search_dirs:
        if not search_dir.exists():
            continue
        for f in sorted(search_dir.rglob("*.enriched.json")):
            try:
                data = json.loads(f.read_text())
                data["_source_file"] = str(f)
                files.append(data)
            except (json.JSONDecodeError, IOError) as e:
                print(f"{LOG_PREFIX} WARNING: Could not read {f}: {e}")
    return files


def load_conversations_files(source: Optional[str] = None) -> List[Dict]:
    """Load all conversations.json files from data/06.video-type/."""
    vtype_root = repo_root() / "data" / "06.video-type"
    search_dirs = [vtype_root / source] if source else [vtype_root]

    files: List[Dict] = []
    for search_dir in search_dirs:
        if not search_dir.exists():
            continue
        for f in sorted(search_dir.rglob("*.conversations.json")):
            try:
                data = json.loads(f.read_text())
                data["_source_file"] = str(f)
                files.append(data)
            except (json.JSONDecodeError, IOError) as e:
                print(f"{LOG_PREFIX} WARNING: Could not read {f}: {e}")
    return files


def load_validation_files(source: Optional[str] = None) -> List[Dict]:
    """Load all .validation.json files from both stage directories."""
    validations: List[Dict] = []
    for stage_dir in ["06.video-type", "07.content"]:
        root = repo_root() / "data" / stage_dir
        search_dirs = [root / source] if source else [root]
        for search_dir in search_dirs:
            if not search_dir.exists():
                continue
            for f in sorted(search_dir.rglob("*.validation.json")):
                try:
                    data = json.loads(f.read_text())
                    data["_source_file"] = str(f)
                    data["_stage"] = stage_dir
                    validations.append(data)
                except (json.JSONDecodeError, IOError):
                    pass
    return validations


def compute_batch_stats(
    conversations_files: List[Dict],
    enriched_files: List[Dict],
    validation_files: List[Dict],
) -> Dict[str, Any]:
    """Compute aggregate statistics for a batch."""

    stats: Dict[str, Any] = {}

    # --- Stage 06 statistics ---
    video_type_counts: Counter = Counter()
    conversations_per_infield: List[int] = []
    unknown_speaker_count = 0
    total_speaker_count = 0

    for conv_file in conversations_files:
        vtype = conv_file.get("video_type", {})
        vtype_str = vtype.get("type", "") if isinstance(vtype, dict) else str(vtype)
        video_type_counts[vtype_str] += 1

        convs = conv_file.get("conversations", [])
        if vtype_str in ("infield", "compilation"):
            conversations_per_infield.append(len(convs))

        labels = conv_file.get("speaker_labels", {})
        for label in labels.values():
            total_speaker_count += 1
            if label.get("role") == "unknown":
                unknown_speaker_count += 1

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

    for enriched_file in enriched_files:
        enrichments = enriched_file.get("enrichments", [])

        for e in enrichments:
            if e.get("type") == "approach":
                approach_count += 1
                if e.get("hook_point"):
                    hook_count += 1
                inv = e.get("investment_level")
                if inv:
                    investment_counts[inv] += 1

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
        "mean_evidence_length": (
            sum(evidence_lengths) / max(len(evidence_lengths), 1)
            if evidence_lengths else 0
        ),
        "unlisted_techniques": dict(unlisted_techniques.most_common(20)),
        "unlisted_topics": dict(unlisted_topics.most_common(20)),
    }

    # --- Validation statistics ---
    total_errors = 0
    total_warnings = 0
    warning_types: Counter = Counter()
    error_types: Counter = Counter()

    for vf in validation_files:
        summary = vf.get("summary", {})
        total_errors += summary.get("errors", 0)
        total_warnings += summary.get("warnings", 0)

        for result in vf.get("results", []):
            if result.get("severity") == "error":
                error_types[result.get("check", "unknown")] += 1
            elif result.get("severity") == "warning":
                warning_types[result.get("check", "unknown")] += 1

    stats["validation"] = {
        "total_validations": len(validation_files),
        "total_errors": total_errors,
        "total_warnings": total_warnings,
        "error_types": dict(error_types.most_common()),
        "warning_types": dict(warning_types.most_common()),
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

    args = parser.parse_args()

    if not args.source and not args.all:
        parser.print_help()
        sys.exit(1)

    source = args.source if args.source else None

    manifest_ids: Set[str] = set()
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

    # Load data
    conversations_files = load_conversations_files(source)
    enriched_files = load_enriched_files(source)
    validation_files = load_validation_files(source)

    if manifest_ids:
        conversations_files = _filter_by_manifest(conversations_files, manifest_ids)
        enriched_files = _filter_by_manifest(enriched_files, manifest_ids)
        validation_files = _filter_by_manifest(validation_files, manifest_ids)

    if not conversations_files and not enriched_files:
        print(f"{LOG_PREFIX} No data found to report on")
        sys.exit(0)

    # Compute statistics
    stats = compute_batch_stats(conversations_files, enriched_files, validation_files)

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

        print(f"\n{LOG_PREFIX} Batch Report: {args.batch_id}")
        print(f"{'='*60}")

        print(f"\nStage 06 (Video Type + Conversations):")
        print(f"  Videos processed:         {s06.get('videos_processed', 0)}")
        print(f"  Video types:              {s06.get('video_type_distribution', {})}")
        print(f"  Mean convs/infield:       {s06.get('mean_conversations_per_infield', 0):.1f}")
        print(f"  Unknown speaker rate:     {s06.get('unknown_speaker_rate', 0):.1%}")

        print(f"\nStage 07 (Content Enrichment):")
        print(f"  Videos enriched:          {s07.get('videos_enriched', 0)}")
        print(f"  Total approaches:         {s07.get('total_approaches', 0)}")
        print(f"  Hook rate:                {s07.get('hook_rate', 0):.1%}")
        print(f"  Investment distribution:  {s07.get('investment_distribution', {})}")
        print(f"  Mean evidence length:     {s07.get('mean_evidence_length', 0):.0f} chars")

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

        if drift_flags:
            print(f"\nDrift Detection:")
            for flag in drift_flags:
                print(f"  [{flag.get('check')}] {flag.get('message')}")


if __name__ == "__main__":
    main()
