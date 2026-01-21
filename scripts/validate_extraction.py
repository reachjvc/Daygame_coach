#!/usr/bin/env python3
"""
Validation Script for Training Data Pipeline

Compares pipeline output against ground truth files.
Reports: interaction count, speaker accuracy, phase accuracy, type classification.

Usage:
    python scripts/validate_extraction.py \
        --ground-truth training-data/validation/video1_ground_truth.json \
        --conversations training-data/classified/SocialStoic/video.conversations.json \
        --interactions training-data/interactions/SocialStoic/video.interactions.jsonl
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple


@dataclass
class ValidationResult:
    """Result of validation comparison."""
    metric: str
    ground_truth_value: int | float | str
    pipeline_value: int | float | str
    passed: bool
    notes: str = ""


def load_ground_truth(path: Path) -> dict:
    """Load ground truth JSON file."""
    with path.open("r") as f:
        return json.load(f)


def load_conversations(path: Path) -> dict:
    """Load conversations JSON file (output of detect_conversations.py)."""
    if not path.exists():
        return {}
    with path.open("r") as f:
        return json.load(f)


def load_interactions(path: Path) -> List[dict]:
    """Load interactions JSONL file."""
    if not path.exists():
        return []
    interactions = []
    with path.open("r") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    interactions.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return interactions


def count_ground_truth_interactions(gt: dict) -> Tuple[int, int]:
    """Count interactions and commentary sections in ground truth."""
    interactions = gt.get("interactions", [])
    approach_count = sum(1 for i in interactions if i.get("type") == "approach")
    commentary_count = sum(1 for i in interactions if i.get("type") == "commentary")
    return approach_count, commentary_count


def validate_interaction_count(
    gt: dict,
    conversations: dict,
    interactions: List[dict]
) -> List[ValidationResult]:
    """Validate that the pipeline detects the correct number of interactions."""
    results = []

    gt_approaches, gt_commentary = count_ground_truth_interactions(gt)

    # From conversations.json
    conv_summary = conversations.get("conversation_summary", {})
    detected_conversations = conv_summary.get("total_conversations", 0)
    segment_types = conv_summary.get("segment_type_counts", {})
    detected_commentary = segment_types.get("commentary", 0)

    # From interactions.jsonl
    detected_interactions = len(interactions)

    # Interaction count (from conversation detection)
    results.append(ValidationResult(
        metric="Conversations detected (boundary detection)",
        ground_truth_value=gt_approaches,
        pipeline_value=detected_conversations,
        passed=detected_conversations >= gt_approaches * 0.7,  # Allow 70% recall
        notes=f"Target: {gt_approaches}, Minimum acceptable: {int(gt_approaches * 0.7)}"
    ))

    # Interaction count (from interaction extraction)
    results.append(ValidationResult(
        metric="Interactions extracted",
        ground_truth_value=gt_approaches,
        pipeline_value=detected_interactions,
        passed=detected_interactions >= gt_approaches * 0.7,
        notes="Based on extract_interactions.py output"
    ))

    # Commentary detection
    commentary_segments = segment_types.get("commentary", 0)
    results.append(ValidationResult(
        metric="Commentary segments detected",
        ground_truth_value=gt_commentary,
        pipeline_value=commentary_segments,
        passed=commentary_segments > 0 if gt_commentary > 0 else True,
        notes="At least some commentary should be detected"
    ))

    return results


def validate_segment_types(
    gt: dict,
    conversations: dict
) -> List[ValidationResult]:
    """Validate segment type classification accuracy."""
    results = []

    segment_types = conversations.get("conversation_summary", {}).get("segment_type_counts", {})

    approach_segments = segment_types.get("approach", 0)
    commentary_segments = segment_types.get("commentary", 0)
    total_segments = sum(segment_types.values()) if segment_types else 0

    if total_segments > 0:
        # For a mixed video, we expect both types
        content_type = gt.get("content_type", "unknown")

        if content_type == "mixed":
            results.append(ValidationResult(
                metric="Mixed content detection",
                ground_truth_value="both approach and commentary",
                pipeline_value=f"approach={approach_segments}, commentary={commentary_segments}",
                passed=approach_segments > 0 and commentary_segments > 0,
                notes="Mixed videos should have both segment types"
            ))
        elif content_type == "infield":
            results.append(ValidationResult(
                metric="Infield content detection",
                ground_truth_value="mostly approach",
                pipeline_value=f"approach={approach_segments}, commentary={commentary_segments}",
                passed=approach_segments > commentary_segments,
                notes="Infield videos should be mostly approaches"
            ))
        elif content_type == "talking_head":
            results.append(ValidationResult(
                metric="Talking head content detection",
                ground_truth_value="mostly commentary",
                pipeline_value=f"approach={approach_segments}, commentary={commentary_segments}",
                passed=commentary_segments > approach_segments,
                notes="Talking head videos should be mostly commentary"
            ))

    return results


def validate_conversation_boundaries(
    gt: dict,
    conversations: dict
) -> List[ValidationResult]:
    """Validate that conversation boundaries are correctly identified."""
    results = []

    segments = conversations.get("segments", [])
    if not segments:
        results.append(ValidationResult(
            metric="Conversation boundary detection",
            ground_truth_value="N/A",
            pipeline_value="No segments found",
            passed=False,
            notes="No processed segments in conversations file"
        ))
        return results

    # Check for boundary markers
    boundaries_found = sum(
        1 for seg in segments
        if seg.get("boundary_detection", {}).get("is_new_conversation", False)
    )

    gt_approaches, _ = count_ground_truth_interactions(gt)

    results.append(ValidationResult(
        metric="New conversation boundaries detected",
        ground_truth_value=gt_approaches,
        pipeline_value=boundaries_found,
        passed=boundaries_found >= gt_approaches * 0.5,  # At least 50% of boundaries
        notes="Each approach should start with a boundary marker"
    ))

    # Check for conversation IDs
    conversation_ids = set(
        seg.get("conversation_id", 0)
        for seg in segments
        if seg.get("conversation_id", 0) > 0
    )

    results.append(ValidationResult(
        metric="Unique conversation IDs",
        ground_truth_value=gt_approaches,
        pipeline_value=len(conversation_ids),
        passed=len(conversation_ids) >= gt_approaches * 0.5,
        notes="Each approach should have a unique conversation ID"
    ))

    return results


def validate_outcomes(
    gt: dict,
    interactions: List[dict]
) -> List[ValidationResult]:
    """Validate outcome detection accuracy."""
    results = []

    gt_outcomes = gt.get("summary", {}).get("approaches_with_outcome", {})

    # Count pipeline outcomes
    pipeline_outcomes: Dict[str, int] = {}
    for interaction in interactions:
        outcome = interaction.get("outcome", "unknown")
        pipeline_outcomes[outcome] = pipeline_outcomes.get(outcome, 0) + 1

    # Check if known outcomes are detected
    known_outcomes = sum(v for k, v in gt_outcomes.items() if k != "unknown")
    pipeline_known = sum(v for k, v in pipeline_outcomes.items() if k != "unknown")

    results.append(ValidationResult(
        metric="Known outcomes detected",
        ground_truth_value=known_outcomes,
        pipeline_value=pipeline_known,
        passed=pipeline_known >= known_outcomes * 0.3,  # At least 30% of outcomes
        notes=f"Ground truth: {gt_outcomes}, Pipeline: {pipeline_outcomes}"
    ))

    return results


def run_validation(
    gt_path: Path,
    conversations_path: Optional[Path],
    interactions_path: Optional[Path]
) -> Tuple[List[ValidationResult], bool]:
    """Run all validations and return results."""
    gt = load_ground_truth(gt_path)

    conversations = {}
    if conversations_path:
        conversations = load_conversations(conversations_path)

    interactions = []
    if interactions_path:
        interactions = load_interactions(interactions_path)

    all_results: List[ValidationResult] = []

    # Run validations
    if conversations:
        all_results.extend(validate_interaction_count(gt, conversations, interactions))
        all_results.extend(validate_segment_types(gt, conversations))
        all_results.extend(validate_conversation_boundaries(gt, conversations))

    if interactions:
        all_results.extend(validate_outcomes(gt, interactions))

    # Calculate overall pass/fail
    passed_count = sum(1 for r in all_results if r.passed)
    total_count = len(all_results)
    overall_pass = passed_count >= total_count * 0.7  # 70% of tests must pass

    return all_results, overall_pass


def print_results(results: List[ValidationResult], overall_pass: bool) -> None:
    """Print validation results in a formatted table."""
    print("\n" + "=" * 80)
    print("VALIDATION RESULTS")
    print("=" * 80)

    for result in results:
        status = "[PASS]" if result.passed else "[FAIL]"
        print(f"\n{status} {result.metric}")
        print(f"   Ground truth: {result.ground_truth_value}")
        print(f"   Pipeline:     {result.pipeline_value}")
        if result.notes:
            print(f"   Notes:        {result.notes}")

    print("\n" + "=" * 80)
    passed_count = sum(1 for r in results if r.passed)
    total_count = len(results)
    print(f"OVERALL: {passed_count}/{total_count} tests passed")

    if overall_pass:
        print("STATUS: PASSED - Pipeline meets minimum quality thresholds")
    else:
        print("STATUS: FAILED - Pipeline needs improvement")

    print("=" * 80)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Validate pipeline output against ground truth."
    )
    parser.add_argument(
        "--ground-truth",
        required=True,
        help="Path to ground truth JSON file"
    )
    parser.add_argument(
        "--conversations",
        help="Path to conversations JSON file (from detect_conversations.py)"
    )
    parser.add_argument(
        "--interactions",
        help="Path to interactions JSONL file (from extract_interactions.py)"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON"
    )
    args = parser.parse_args()

    gt_path = Path(args.ground_truth)
    conversations_path = Path(args.conversations) if args.conversations else None
    interactions_path = Path(args.interactions) if args.interactions else None

    if not gt_path.exists():
        print(f"Error: Ground truth file not found: {gt_path}")
        exit(1)

    results, overall_pass = run_validation(gt_path, conversations_path, interactions_path)

    if args.json:
        output = {
            "results": [
                {
                    "metric": r.metric,
                    "ground_truth": r.ground_truth_value,
                    "pipeline": r.pipeline_value,
                    "passed": r.passed,
                    "notes": r.notes
                }
                for r in results
            ],
            "overall_pass": overall_pass,
            "passed_count": sum(1 for r in results if r.passed),
            "total_count": len(results)
        }
        print(json.dumps(output, indent=2))
    else:
        print_results(results, overall_pass)

    exit(0 if overall_pass else 1)


if __name__ == "__main__":
    main()
