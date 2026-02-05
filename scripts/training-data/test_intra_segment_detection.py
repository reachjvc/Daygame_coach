#!/usr/bin/env python3
"""
Test script for _detect_intra_segment_repetition().

Loads existing Stage 02 test data and verifies:
1. The known "yeah" x10 hallucination in segment 183 is detected
2. No false positives across the other 12 test videos
"""

import json
import sys
from pathlib import Path

# Import the function from the 02.transcribe script
# Since 02.transcribe has no .py extension, we need importlib with explicit loader
import importlib.util
import importlib.machinery

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
TEST_DATA_ROOT = REPO_ROOT / "data" / "test" / "r2" / "02.transcribe"

_script_path = str(SCRIPT_DIR / "02.transcribe")
loader = importlib.machinery.SourceFileLoader("transcribe", _script_path)
spec = importlib.util.spec_from_loader("transcribe", loader)
transcribe_mod = importlib.util.module_from_spec(spec)

# Prevent the script's __main__ block from executing during import
sys.modules["transcribe"] = transcribe_mod
try:
    spec.loader.exec_module(transcribe_mod)
except SystemExit:
    pass  # Script may call SystemExit if missing deps (torch, whisper) — we only need the pure-python functions

_detect_intra_segment_repetition = transcribe_mod._detect_intra_segment_repetition


def test_known_hallucination():
    """Test: segment 183 of 'How To Turn Small Talk' should be flagged with 'yeah' x10."""
    video_dir = TEST_DATA_ROOT / "How To Turn Small Talk into Deep Connection (Daygame Coaching Infield) [DPieYj7nji0]"
    json_file = video_dir / "How To Turn Small Talk into Deep Connection (Daygame Coaching Infield) [DPieYj7nji0].full.json"

    if not json_file.exists():
        print(f"SKIP: Test data not found: {json_file}")
        return False

    with json_file.open("r", encoding="utf-8") as f:
        data = json.load(f)

    segments = data.get("segments", data) if isinstance(data, dict) else data
    findings = _detect_intra_segment_repetition(segments)

    # Should find at least one issue
    assert len(findings) > 0, f"Expected findings but got none"

    # Should flag segment 183 with "yeah"
    seg_183_findings = [f for f in findings if f["segment_index"] == 183]
    assert len(seg_183_findings) > 0, f"Expected finding for segment 183, got findings for segments: {[f['segment_index'] for f in findings]}"

    finding = seg_183_findings[0]
    assert finding["repeated_word"] == "yeah", f"Expected 'yeah' but got '{finding['repeated_word']}'"
    assert finding["count"] == 10, f"Expected count=10 but got count={finding['count']}"

    # Check time range covers the "yeah" repetition
    assert finding["time_range"][0] >= 572.0, f"Expected start >= 572.0s but got {finding['time_range'][0]}"
    assert finding["time_range"][1] <= 579.0, f"Expected end <= 579.0s but got {finding['time_range'][1]}"

    # Check the longest duration captures the suspicious 3.2s "yeah"
    assert finding["longest_word_duration"] > 3.0, f"Expected longest_word_duration > 3.0s but got {finding['longest_word_duration']}"

    print(f"PASS: test_known_hallucination")
    print(f"  Found: segment {finding['segment_index']}, '{finding['repeated_word']}' x{finding['count']}, "
          f"time {finding['time_range'][0]:.1f}s-{finding['time_range'][1]:.1f}s, "
          f"longest_word_dur={finding['longest_word_duration']:.3f}s")
    return True


def test_no_false_positives():
    """Test: no other test videos should be flagged at threshold 5."""
    target_video = "How To Turn Small Talk into Deep Connection"
    passed = True

    video_dirs = sorted(TEST_DATA_ROOT.iterdir())
    tested = 0

    for video_dir in video_dirs:
        if not video_dir.is_dir():
            continue

        # Find the .full.json file
        json_files = list(video_dir.glob("*.full.json"))
        if not json_files:
            continue

        json_file = json_files[0]

        with json_file.open("r", encoding="utf-8") as f:
            data = json.load(f)

        segments = data.get("segments", data) if isinstance(data, dict) else data
        findings = _detect_intra_segment_repetition(segments)
        tested += 1

        if target_video in video_dir.name:
            # This one should have findings (already tested above)
            continue

        if findings:
            # Filter: only report findings from the word repetition check (count >= 5)
            # Single-word suspicious duration findings (count=1) are acceptable
            repetition_findings = [f for f in findings if f["count"] >= 5]
            if repetition_findings:
                print(f"FAIL: False positive in '{video_dir.name}':")
                for f in repetition_findings:
                    print(f"  Seg {f['segment_index']}: '{f['repeated_word']}' x{f['count']}")
                passed = False
            else:
                # Only suspicious duration findings — acceptable
                for f in findings:
                    print(f"  INFO: '{video_dir.name}' seg {f['segment_index']}: "
                          f"suspicious duration ({f['longest_word_duration']:.1f}s) for '{f['repeated_word']}'")

    if passed:
        print(f"PASS: test_no_false_positives ({tested} videos tested, 0 false positives)")
    return passed


def main():
    print("=" * 60)
    print("Testing _detect_intra_segment_repetition()")
    print("=" * 60)

    results = []
    results.append(("test_known_hallucination", test_known_hallucination()))
    results.append(("test_no_false_positives", test_no_false_positives()))

    print()
    print("=" * 60)
    all_passed = all(r[1] for r in results)
    for name, passed in results:
        print(f"  {'PASS' if passed else 'FAIL'}: {name}")

    if all_passed:
        print("\nAll tests passed.")
    else:
        print("\nSome tests FAILED.")
        sys.exit(1)


if __name__ == "__main__":
    main()
