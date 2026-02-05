#!/usr/bin/env python3
"""Task 1: Video Duration Cross-Reference"""
import json, os, re

BASE_DIR = "/home/jonaswsl/projects/daygame-coach/data/test/r2/04.diarize"
TEST_VIDEOS = "/home/jonaswsl/projects/daygame-coach/docs/pipeline/test_videos.txt"

expected_durations = {}
with open(TEST_VIDEOS) as f:
    in_r2 = False
    for line in f:
        line = line.strip()
        if line.startswith("# R2"):
            in_r2 = True
            continue
        if not in_r2:
            continue
        if line.startswith("#") or not line or "|" not in line:
            continue
        parts = line.split("|")
        if len(parts) >= 4:
            video_id = parts[1].strip()
            duration_str = parts[2].strip()
            title = parts[3].strip()
            match = re.match(r"(\d+)\s*min", duration_str)
            if match:
                expected_durations[video_id] = (int(match.group(1)) * 60, duration_str, title)

print("=" * 100)
print("TASK 1: VIDEO DURATION CROSS-REFERENCE")
print("=" * 100)
print(f"\nFound {len(expected_durations)} R2 videos in test_videos.txt\n")

results = []
for dirname in sorted(os.listdir(BASE_DIR)):
    dirpath = os.path.join(BASE_DIR, dirname)
    if not os.path.isdir(dirpath):
        continue
    vid_match = re.search(r'\[([^\]]+)\]$', dirname)
    if not vid_match:
        continue
    video_id = vid_match.group(1)
    json_files = [f for f in os.listdir(dirpath) if f.endswith('.full.json')]
    if not json_files:
        continue
    with open(os.path.join(dirpath, json_files[0])) as f:
        data = json.load(f)
    segments = data.get("segments", [])
    if not segments:
        continue
    first_start = segments[0]["start"]
    last_end = segments[-1]["end"]
    diarized_span = last_end - first_start
    speakers = set(seg["speaker"] for seg in segments)
    expected_info = expected_durations.get(video_id)
    if expected_info:
        expected_sec, dur_str, title = expected_info
        diff_pct = abs(diarized_span - expected_sec) / expected_sec * 100
        flag = "*** FLAGGED ***" if diff_pct > 20 else "OK"
    else:
        expected_sec, dur_str, title, diff_pct, flag = None, "?", dirname, None, "NO EXPECTED"
    results.append({
        "title": title, "video_id": video_id, "expected_sec": expected_sec,
        "dur_str": dur_str, "diarized_span": diarized_span,
        "first_start": first_start, "last_end": last_end,
        "diff_pct": diff_pct, "flag": flag, "speakers": len(speakers),
        "segments": len(segments),
    })

print(f"{'Title':<65} {'Expected':>10} {'Actual':>10} {'Diff%':>8} {'Status':<15} {'Speakers':>8}")
print("-" * 120)
for r in results:
    expected_str = f"{r['expected_sec']//60}m{r['expected_sec']%60:02d}s" if r['expected_sec'] else "?"
    actual_min = int(r['diarized_span'] // 60)
    actual_sec = int(r['diarized_span'] % 60)
    actual_str = f"{actual_min}m{actual_sec:02d}s"
    diff_str = f"{r['diff_pct']:.1f}%" if r['diff_pct'] is not None else "N/A"
    print(f"{r['title'][:63]:<65} {expected_str:>10} {actual_str:>10} {diff_str:>8} {r['flag']:<15} {r['speakers']:>8}")

print(f"\n{'='*100}\nDETAILED BREAKDOWN:\n{'-'*100}")
for r in results:
    print(f"\n  {r['title']}")
    print(f"    Video ID:       {r['video_id']}")
    print(f"    First segment:  {r['first_start']:.2f}s")
    print(f"    Last segment:   {r['last_end']:.2f}s")
    print(f"    Diarized span:  {r['diarized_span']:.2f}s ({r['diarized_span']/60:.1f} min)")
    if r['expected_sec']:
        print(f"    Expected:       {r['expected_sec']}s ({r['expected_sec']/60:.0f} min)")
        print(f"    Difference:     {abs(r['diarized_span'] - r['expected_sec']):.1f}s ({r['diff_pct']:.1f}%)")
    print(f"    Speakers:       {r['speakers']}")
    print(f"    Segments:       {r['segments']}")

flagged = [r for r in results if r['flag'] == "*** FLAGGED ***"]
print(f"\n{'='*100}\nSUMMARY: {len(flagged)} of {len(results)} videos flagged (>20% discrepancy)")
if flagged:
    print("\nFlagged videos:")
    for r in flagged:
        print(f"  - {r['title']} ({r['video_id']}): expected {r['expected_sec']}s, got {r['diarized_span']:.0f}s ({r['diff_pct']:.1f}% off)")
