#!/usr/bin/env python3
"""
Test script for conversation classification quality.

Compares LLM-conversations output against ground truth expectations.
Measures:
- Approach ratio accuracy (should be ~0 for talking_head, higher for infield)
- Segment-level classification accuracy on annotated samples
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any


def load_ground_truth() -> Dict[str, Any]:
    gt_path = Path("data/07.LLM-conversations-test/ground-truth/expected.json")
    return json.load(open(gt_path))


def score_output(output_path: Path, ground_truth: Dict[str, Any]) -> Dict[str, Any]:
    """Score a single output file against ground truth."""

    # Find matching ground truth
    filename = output_path.name.replace(".conversations.json", ".json")
    gt_videos = ground_truth.get("videos", {})

    if filename not in gt_videos:
        return {"error": f"No ground truth for {filename}"}

    gt = gt_videos[filename]
    expected_ratio = gt.get("expected_approach_ratio", 0.0)
    content_type = gt.get("content_type", "unknown")

    # Load output
    data = json.load(open(output_path))
    segments = data.get("segments", [])
    summary = data.get("conversation_summary", {})

    # Calculate actual approach ratio
    type_counts = summary.get("segment_type_counts", {})
    total = sum(type_counts.values())
    approach_count = type_counts.get("approach", 0)
    actual_ratio = approach_count / total if total > 0 else 0.0

    # Score: how close is actual ratio to expected ratio?
    ratio_error = abs(actual_ratio - expected_ratio)

    # For talking_head/podcast, any approach is a false positive
    if content_type in ["talking_head", "podcast"]:
        false_positives = approach_count
        precision = 0.0 if approach_count > 0 else 1.0
    else:
        false_positives = 0  # Can't calculate without full annotation
        precision = None

    # Check annotated sample segments
    sample_correct = 0
    sample_total = 0
    sample_details = []

    for seg_idx_str, expected in gt.get("sample_segments", {}).items():
        seg_idx = int(seg_idx_str)
        if seg_idx < len(segments):
            actual_type = segments[seg_idx].get("segment_type", "unknown")
            expected_type = expected.get("expected_type", "unknown")
            is_correct = actual_type == expected_type
            sample_total += 1
            if is_correct:
                sample_correct += 1
            sample_details.append({
                "index": seg_idx,
                "expected": expected_type,
                "actual": actual_type,
                "correct": is_correct,
                "reason": expected.get("reason", "")
            })

    sample_accuracy = sample_correct / sample_total if sample_total > 0 else 0.0

    return {
        "filename": filename,
        "content_type": content_type,
        "total_segments": total,
        "expected_approach_ratio": expected_ratio,
        "actual_approach_ratio": round(actual_ratio, 3),
        "ratio_error": round(ratio_error, 3),
        "approach_count": approach_count,
        "false_positives": false_positives if content_type in ["talking_head", "podcast"] else "N/A",
        "sample_accuracy": round(sample_accuracy, 3),
        "sample_correct": sample_correct,
        "sample_total": sample_total,
        "sample_details": sample_details,
        "type_counts": type_counts
    }


def run_test(output_dir: str) -> None:
    """Run quality test on all outputs in a directory."""

    output_path = Path(output_dir)
    if not output_path.exists():
        print(f"Error: Output directory not found: {output_path}")
        sys.exit(1)

    ground_truth = load_ground_truth()

    # Find all conversation output files
    output_files = list(output_path.glob("*.conversations.json"))
    if not output_files:
        print(f"No .conversations.json files found in {output_path}")
        sys.exit(1)

    print("=" * 70)
    print("CONVERSATION CLASSIFICATION QUALITY TEST")
    print("=" * 70)
    print()

    results = []
    for f in sorted(output_files):
        result = score_output(f, ground_truth)
        results.append(result)

        if "error" in result:
            print(f"[SKIP] {f.name}: {result['error']}")
            continue

        # Determine pass/fail
        is_pass = True
        status = "PASS"

        # For talking_head/podcast, fail if any false positives
        if result["content_type"] in ["talking_head", "podcast"]:
            if result["false_positives"] > 0:
                is_pass = False
                status = "FAIL"

        # Sample accuracy should be >= 80%
        if result["sample_accuracy"] < 0.8:
            is_pass = False
            status = "FAIL"

        print(f"[{status}] {result['filename']}")
        print(f"      Type: {result['content_type']}")
        print(f"      Segments: {result['total_segments']}")
        print(f"      Approach ratio: {result['actual_approach_ratio']} (expected: {result['expected_approach_ratio']})")
        print(f"      Type counts: {result['type_counts']}")

        if result["content_type"] in ["talking_head", "podcast"]:
            print(f"      False positives: {result['false_positives']}")

        print(f"      Sample accuracy: {result['sample_correct']}/{result['sample_total']} ({result['sample_accuracy']*100:.0f}%)")

        # Show sample details if failures
        if not is_pass:
            print("      Sample details:")
            for s in result["sample_details"]:
                mark = "✓" if s["correct"] else "✗"
                print(f"        {mark} [{s['index']}] expected={s['expected']}, actual={s['actual']}")
                if not s["correct"]:
                    print(f"            reason: {s['reason']}")
        print()

    # Summary
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)

    passed = sum(1 for r in results if "error" not in r and
                 (r["content_type"] not in ["talking_head", "podcast"] or r["false_positives"] == 0) and
                 r["sample_accuracy"] >= 0.8)
    total = sum(1 for r in results if "error" not in r)

    print(f"Passed: {passed}/{total}")

    # Overall metrics for talking_head/podcast videos
    th_results = [r for r in results if "error" not in r and r["content_type"] in ["talking_head", "podcast"]]
    if th_results:
        total_fp = sum(r["false_positives"] for r in th_results)
        print(f"Total false positives (talking_head/podcast): {total_fp}")

    if passed < total:
        print("\nTest FAILED - see details above")
        sys.exit(1)
    else:
        print("\nTest PASSED")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test-conversation-quality.py <output_dir>")
        print("Example: python test-conversation-quality.py data/07.LLM-conversations-test/baseline")
        sys.exit(1)

    run_test(sys.argv[1])
