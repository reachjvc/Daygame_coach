#!/usr/bin/env python3
"""
Critical investigation: James Marshall "3 shy girls" diarization quality check.
Expected: at least 4 distinct speakers (James + 3 girls).
Concern: SPEAKER_00 dominates at ~79% of 582 segments — possible speaker collapse.
"""

import json
from collections import defaultdict
from pathlib import Path

JSON_PATH = Path(
    "/home/jonaswsl/projects/daygame-coach/data/test/r2/04.diarize/"
    "James Marshall picks up 3 shy girls (how to relax, connect & seduce them) [IS2SoUgqDLE]/"
    "James Marshall picks up 3 shy girls (how to relax, connect & seduce them) [IS2SoUgqDLE].full.json"
)

def fmt_time(seconds):
    """Format seconds as MM:SS.s"""
    m, s = divmod(seconds, 60)
    return f"{int(m):02d}:{s:05.2f}"

def section_header(title):
    width = 90
    print("\n" + "=" * width)
    print(f"  {title}")
    print("=" * width)


def main():
    data = load_data()
    segments = data.get("segments", data) if isinstance(data, dict) else data

    # Normalize: handle both list-of-segments and dict-with-segments
    if isinstance(segments, dict) and "segments" in segments:
        segments = segments["segments"]

    print(f"Loaded {len(segments)} segments from:\n  {JSON_PATH.name}\n")

    # =========================================================================
    # 1. Full speaker distribution (count + duration)
    # =========================================================================
    section_header("1. SPEAKER DISTRIBUTION (segments + duration)")

    speaker_count = defaultdict(int)
    speaker_duration = defaultdict(float)
    speaker_segments = defaultdict(list)

    for seg in segments:
        spk = seg.get("speaker", "UNKNOWN")
        start = seg.get("start", 0)
        end = seg.get("end", 0)
        duration = end - start
        speaker_count[spk] += 1
        speaker_duration[spk] += duration
        speaker_segments[spk].append(seg)

    total_segs = sum(speaker_count.values())
    total_dur = sum(speaker_duration.values())

    print(f"\n{'Speaker':<15} {'Segments':>10} {'Seg %':>8} {'Duration(s)':>12} {'Dur %':>8}")
    print("-" * 60)
    for spk in sorted(speaker_count.keys()):
        c = speaker_count[spk]
        d = speaker_duration[spk]
        print(f"{spk:<15} {c:>10} {c/total_segs*100:>7.1f}% {d:>11.1f}s {d/total_dur*100:>7.1f}%")
    print("-" * 60)
    print(f"{'TOTAL':<15} {total_segs:>10} {'100.0%':>8} {total_dur:>11.1f}s {'100.0%':>8}")

    # =========================================================================
    # 2. Non-SPEAKER_00 speaker timelines
    # =========================================================================
    section_header("2. NON-SPEAKER_00 SPEAKER TIMELINES")

    for spk in sorted(speaker_segments.keys()):
        if spk == "SPEAKER_00":
            continue
        segs = speaker_segments[spk]
        first = segs[0]
        last = segs[-1]
        print(f"\n--- {spk} ---")
        print(f"  Appears: {fmt_time(first['start'])} -> {fmt_time(last['end'])}")
        print(f"  Segments: {len(segs)}, Duration: {speaker_duration[spk]:.1f}s")
        print(f"  All segments with text:")
        for s in segs:
            text = s.get("text", "").strip()
            print(f"    [{fmt_time(s['start'])} - {fmt_time(s['end'])}] {text}")

    # =========================================================================
    # 3. Scene boundary detection (gaps > 10s)
    # =========================================================================
    section_header("3. SCENE BOUNDARIES (gaps > 10s between consecutive segments)")

    all_sorted = sorted(segments, key=lambda s: s.get("start", 0))
    gaps = []
    for i in range(1, len(all_sorted)):
        prev_end = all_sorted[i - 1].get("end", 0)
        curr_start = all_sorted[i].get("start", 0)
        gap = curr_start - prev_end
        if gap > 10:
            gaps.append({
                "index": i,
                "gap_start": prev_end,
                "gap_end": curr_start,
                "gap_seconds": gap,
                "before_text": all_sorted[i - 1].get("text", "").strip(),
                "before_speaker": all_sorted[i - 1].get("speaker", "?"),
                "after_text": all_sorted[i].get("text", "").strip(),
                "after_speaker": all_sorted[i].get("speaker", "?"),
            })

    if gaps:
        print(f"\nFound {len(gaps)} gaps > 10s:\n")
        for g in gaps:
            print(f"  GAP: {fmt_time(g['gap_start'])} -> {fmt_time(g['gap_end'])}  "
                  f"({g['gap_seconds']:.1f}s)")
            print(f"    Before [{g['before_speaker']}]: \"{g['before_text'][:80]}\"")
            print(f"    After  [{g['after_speaker']}]: \"{g['after_text'][:80]}\"")
            print()
    else:
        print("\n  No gaps > 10s found. Checking gaps > 5s instead...\n")
        for i in range(1, len(all_sorted)):
            prev_end = all_sorted[i - 1].get("end", 0)
            curr_start = all_sorted[i].get("start", 0)
            gap = curr_start - prev_end
            if gap > 5:
                print(f"  GAP: {fmt_time(prev_end)} -> {fmt_time(curr_start)}  "
                      f"({gap:.1f}s)")
                print(f"    Before [{all_sorted[i-1].get('speaker','?')}]: "
                      f"\"{all_sorted[i-1].get('text','').strip()[:80]}\"")
                print(f"    After  [{all_sorted[i].get('speaker','?')}]: "
                      f"\"{all_sorted[i].get('text','').strip()[:80]}\"")
                print()

    # =========================================================================
    # 4. Speaker diversity in different time windows
    # =========================================================================
    section_header("4. SPEAKER DIVERSITY BY TIME WINDOW")

    windows = [(0, 100), (300, 400), (600, 700), (900, 1000)]
    for w_start, w_end in windows:
        window_segs = [s for s in all_sorted
                       if s.get("start", 0) >= w_start and s.get("start", 0) < w_end]
        if not window_segs:
            print(f"\n  [{fmt_time(w_start)} - {fmt_time(w_end)}]: NO SEGMENTS")
            continue

        w_speakers = defaultdict(int)
        for s in window_segs:
            w_speakers[s.get("speaker", "?")] += 1

        print(f"\n  [{fmt_time(w_start)} - {fmt_time(w_end)}]: "
              f"{len(window_segs)} segments, {len(w_speakers)} distinct speakers")
        for spk, cnt in sorted(w_speakers.items()):
            print(f"    {spk}: {cnt} segments")
        print(f"\n  Sample dialogue from this window:")
        for s in window_segs[:15]:
            spk = s.get("speaker", "?")
            text = s.get("text", "").strip()
            print(f"    [{fmt_time(s['start'])}] {spk}: {text}")

    # =========================================================================
    # 5. First 200 seconds: speaker count & Q&A pattern analysis
    # =========================================================================
    section_header("5. FIRST 200s: DISTINCT SPEAKERS & Q&A PATTERN ANALYSIS")

    first200 = [s for s in all_sorted if s.get("start", 0) < 200]
    f200_speakers = set(s.get("speaker", "?") for s in first200)
    print(f"\n  Distinct speakers in first 200s: {len(f200_speakers)} -> {sorted(f200_speakers)}")

    # Show first 20 segments of dialogue
    print(f"\n  First 20 segments of dialogue:")
    for i, s in enumerate(first200[:20]):
        spk = s.get("speaker", "?")
        text = s.get("text", "").strip()
        start = s.get("start", 0)
        end = s.get("end", 0)
        print(f"    {i+1:>2}. [{fmt_time(start)}-{fmt_time(end)}] {spk}: {text}")

    # Look for Q&A pattern: alternating speakers vs monologue
    print(f"\n  Speaker turn analysis (first 200s):")
    turns = 0
    run_length = 1
    max_run = 0
    max_run_speaker = ""
    for i in range(1, len(first200)):
        if first200[i].get("speaker") != first200[i - 1].get("speaker"):
            turns += 1
            if run_length > max_run:
                max_run = run_length
                max_run_speaker = first200[i - 1].get("speaker", "?")
            run_length = 1
        else:
            run_length += 1
    if run_length > max_run:
        max_run = run_length
        max_run_speaker = first200[-1].get("speaker", "?") if first200 else "?"

    print(f"    Total segments: {len(first200)}")
    print(f"    Speaker turns (changes): {turns}")
    print(f"    Longest same-speaker run: {max_run} segments ({max_run_speaker})")
    if len(first200) > 1:
        turn_rate = turns / (len(first200) - 1) * 100
        print(f"    Turn rate: {turn_rate:.1f}% (higher = more conversational)")

    # =========================================================================
    # 6. VERDICT
    # =========================================================================
    section_header("6. VERDICT")

    sp00_pct = speaker_count.get("SPEAKER_00", 0) / total_segs * 100
    num_speakers = len(speaker_count)

    print(f"\n  Total distinct speakers: {num_speakers}")
    print(f"  SPEAKER_00 dominance: {sp00_pct:.1f}% of segments")
    print(f"  Expected minimum speakers: 4 (James + 3 girls)")

    if num_speakers < 4:
        print(f"\n  *** CRITICAL: Only {num_speakers} speakers detected. "
              f"Expected >= 4 for James + 3 girls.")
        print(f"  *** The diarizer likely COLLAPSED multiple speakers into SPEAKER_00.")
    else:
        print(f"\n  Speaker count ({num_speakers}) meets minimum threshold.")

    if sp00_pct > 70:
        print(f"\n  *** WARNING: SPEAKER_00 at {sp00_pct:.1f}% is abnormally high.")
        print(f"  *** In a multi-pickup video, no single speaker should exceed ~50-60%.")
        print(f"  *** This strongly suggests speaker collapse (James + girl(s) merged).")

    # Check if any non-SPEAKER_00 speaker could plausibly be a girl
    print(f"\n  Non-SPEAKER_00 speakers and their viability as 'girl' speakers:")
    for spk in sorted(speaker_segments.keys()):
        if spk == "SPEAKER_00":
            continue
        segs = speaker_segments[spk]
        dur = speaker_duration[spk]
        print(f"    {spk}: {len(segs)} segs, {dur:.1f}s total"
              f" -- {'Plausible' if dur > 30 else 'Too short to be a full interaction'}")


def load_data():
    with open(JSON_PATH, "r") as f:
        return json.load(f)


if __name__ == "__main__":
    main()
