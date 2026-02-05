#!/usr/bin/env python3
"""
Spot-check diarization quality across R2 test videos.
Tasks:
  1. Q&A Merge Errors in infield videos (same speaker consecutive, Q then response)
  2. Short segments with mismatched text (duration < 0.15s, > 3 words)
  3. UNKNOWN segments in James Marshall (all 15, with 3-segment context)
  4. Barcelona 17-speaker analysis (duration per speaker, non-dominant segments)
  5. Virtua Resi #1 - minority speaker segments
"""

import json
import os
import re
from pathlib import Path

BASE = Path("/home/jonaswsl/projects/daygame-coach/data/test/r2/04.diarize")

# Response starters that suggest a different person is speaking
RESPONSE_STARTERS = re.compile(
    r"^(Yeah|Yes|No|Nah|Sure|Okay|OK|Oh|Ah|Hmm|Mm|Well|Right|Exactly|"
    r"I'm|I was|I do|I don't|I have|I live|I work|I think|I love|I like|"
    r"My |Me |We |That's|It's|Thank|Thanks|Really|Actually|"
    r"Six|Seven|Eight|Nine|Ten|Twenty|Thirty|"
    r"From |In |At |On |Just |About )",
    re.IGNORECASE,
)


def load_video(folder_name):
    """Load full.json for a video by folder name."""
    folder = BASE / folder_name
    json_files = list(folder.glob("*.full.json"))
    if not json_files:
        print(f"  WARNING: No .full.json found in {folder}")
        return None
    with open(json_files[0]) as f:
        return json.load(f)


def fmt_seg(seg, idx=None):
    """Format a segment for display."""
    idx_str = f"[{idx:>4d}]" if idx is not None else ""
    start = seg["start"]
    end = seg["end"]
    dur = end - start
    speaker = seg.get("speaker", "?")
    text = seg.get("text", "").strip()
    return f"{idx_str} {start:8.2f}-{end:8.2f} ({dur:5.2f}s) {speaker:<12s} | {text}"


def print_context(segments, center_idx, before=2, after=2, marker=">>>"):
    """Print segments around center_idx with a marker on the center."""
    lo = max(0, center_idx - before)
    hi = min(len(segments), center_idx + after + 1)
    for i in range(lo, hi):
        prefix = marker if i == center_idx else "   "
        print(f"    {prefix} {fmt_seg(segments[i], i)}")


def print_context_pair(segments, idx1, idx2, before=2, after=2):
    """Print context around a pair of consecutive segments."""
    lo = max(0, idx1 - before)
    hi = min(len(segments), idx2 + after + 1)
    for i in range(lo, hi):
        if i == idx1 or i == idx2:
            prefix = ">>>"
        else:
            prefix = "   "
        print(f"    {prefix} {fmt_seg(segments[i], i)}")


def is_short_reply(text):
    """Check if text looks like a short reply (< 8 words)."""
    return len(text.split()) <= 8


def is_response_like(text):
    """Check if text starts with a response-like pattern."""
    return bool(RESPONSE_STARTERS.match(text.strip()))


# ============================================================
# TASK 1: Q&A Merge Errors in Infield Videos
# ============================================================
def task1():
    print("=" * 100)
    print("TASK 1: Q&A MERGE ERRORS - Same speaker has question then response-like segment")
    print("=" * 100)

    videos = [
        'Approach ANY GIRL in Public LIKE a PRO! (INFIELD) [mv2X8Yhg9M0]',
        'James Marshall picks up 3 shy girls (how to relax, connect & seduce them) [IS2SoUgqDLE]',
        "Picking Up 3 Girls In 10 minutes (the busy man's dating method) [KtmnHDVbmss]",
        '7 Minute Pull [nFjdyAHcTgA]',
        'How To Turn Small Talk into Deep Connection (Daygame Coaching Infield) [DPieYj7nji0]',
    ]

    for video_name in videos:
        print(f"\n{'─' * 95}")
        print(f"VIDEO: {video_name}")
        print(f"{'─' * 95}")

        data = load_video(video_name)
        if not data:
            continue
        segments = data["segments"]

        suspects = []
        for i in range(len(segments) - 1):
            seg_a = segments[i]
            seg_b = segments[i + 1]

            sp_a = seg_a.get("speaker", "")
            sp_b = seg_b.get("speaker", "")
            text_a = seg_a.get("text", "").strip()
            text_b = seg_b.get("text", "").strip()

            # Same speaker, consecutive
            if sp_a != sp_b:
                continue

            # First ends with "?"
            if not text_a.rstrip().endswith("?"):
                continue

            # Next segment looks like a response
            if is_response_like(text_b) or is_short_reply(text_b):
                suspects.append((i, i + 1))

        print(f"  Found {len(suspects)} suspect Q&A merge(s)")
        for pair_num, (idx_a, idx_b) in enumerate(suspects, 1):
            print(f"\n  -- Suspect #{pair_num} --")
            print_context_pair(segments, idx_a, idx_b, before=2, after=2)
        print()


# ============================================================
# TASK 2: Short Segments with Mismatched Text
# ============================================================
def task2():
    print("\n" + "=" * 100)
    print("TASK 2: SHORT SEGMENTS WITH MISMATCHED TEXT (duration < 0.15s, > 3 words)")
    print("=" * 100)

    for folder in sorted(BASE.iterdir()):
        if not folder.is_dir():
            continue
        data = load_video(folder.name)
        if not data:
            continue
        segments = data["segments"]

        suspects = []
        for i, seg in enumerate(segments):
            dur = seg["end"] - seg["start"]
            text = seg.get("text", "").strip()
            word_count = len(text.split())
            if dur < 0.15 and word_count > 3:
                suspects.append(i)

        if suspects:
            print(f"\n{'─' * 95}")
            print(f"VIDEO: {folder.name}")
            print(f"  Found {len(suspects)} short segment(s) with too much text")
            for idx in suspects:
                seg = segments[idx]
                dur = seg["end"] - seg["start"]
                text = seg.get("text", "").strip()
                word_count = len(text.split())
                print(f"\n  -- Segment #{idx} ({dur:.3f}s, {word_count} words) --")
                print_context(segments, idx, before=2, after=2, marker=">>>")


# ============================================================
# TASK 3: UNKNOWN Segments in James Marshall
# ============================================================
def task3():
    print("\n" + "=" * 100)
    print("TASK 3: ALL UNKNOWN SEGMENTS IN JAMES MARSHALL (with 3-segment context)")
    print("=" * 100)

    video_name = 'James Marshall picks up 3 shy girls (how to relax, connect & seduce them) [IS2SoUgqDLE]'
    data = load_video(video_name)
    if not data:
        return
    segments = data["segments"]

    unknowns = [(i, seg) for i, seg in enumerate(segments) if seg.get("speaker") == "UNKNOWN"]
    print(f"  Total UNKNOWN segments: {len(unknowns)}")

    for num, (idx, seg) in enumerate(unknowns, 1):
        print(f"\n  -- UNKNOWN #{num} (index {idx}) --")
        print_context(segments, idx, before=3, after=3, marker=">>>")


# ============================================================
# TASK 4: Barcelona 17-Speaker Analysis
# ============================================================
def task4():
    print("\n" + "=" * 100)
    print("TASK 4: BARCELONA 17-SPEAKER ANALYSIS")
    print("=" * 100)

    video_name = "Picking Up Girls in Barcelona  \uff5c  Immersion Documentary [iOSpNACA9VI]"
    data = load_video(video_name)
    if not data:
        return
    segments = data["segments"]

    # Build per-speaker stats
    speaker_data = {}
    for i, seg in enumerate(segments):
        sp = seg.get("speaker", "?")
        if sp not in speaker_data:
            speaker_data[sp] = {"count": 0, "duration": 0.0, "first_idx": i, "last_idx": i, "segments": []}
        speaker_data[sp]["count"] += 1
        speaker_data[sp]["duration"] += seg["end"] - seg["start"]
        speaker_data[sp]["last_idx"] = i
        speaker_data[sp]["segments"].append((i, seg))

    print(f"\n  {'Speaker':<14s} {'Segments':>8s} {'Duration':>10s} {'% of total':>10s}")
    print(f"  {'─' * 46}")
    total_dur = sum(d["duration"] for d in speaker_data.values())
    for sp in sorted(speaker_data.keys()):
        d = speaker_data[sp]
        pct = (d["duration"] / total_dur * 100) if total_dur > 0 else 0
        print(f"  {sp:<14s} {d['count']:>8d} {d['duration']:>9.1f}s {pct:>9.1f}%")
    print(f"  {'TOTAL':<14s} {sum(d['count'] for d in speaker_data.values()):>8d} {total_dur:>9.1f}s")

    # Non-dominant speakers (not SPEAKER_15)
    print(f"\n  Non-dominant speaker details (first and last segment text):")
    print(f"  {'─' * 90}")
    for sp in sorted(speaker_data.keys()):
        if sp == "SPEAKER_15":
            continue
        d = speaker_data[sp]
        segs = d["segments"]
        first_i, first_seg = segs[0]
        last_i, last_seg = segs[-1]
        print(f"\n  {sp} ({d['count']} segments, {d['duration']:.1f}s):")
        print(f"    FIRST [{first_i:>4d}] {first_seg['start']:8.2f}-{first_seg['end']:8.2f}: {first_seg['text'].strip()[:120]}")
        if len(segs) > 1:
            print(f"    LAST  [{last_i:>4d}] {last_seg['start']:8.2f}-{last_seg['end']:8.2f}: {last_seg['text'].strip()[:120]}")


# ============================================================
# TASK 5: Virtua Resi #1 - Minority Speaker Segments
# ============================================================
def task5():
    print("\n" + "=" * 100)
    print("TASK 5: VIRTUA RESI #1 - MINORITY SPEAKER SEGMENTS")
    print("=" * 100)

    video_name = 'Virtua Resi #1 - Gutter Game [LCMW0fFEKQk]'
    data = load_video(video_name)
    if not data:
        return
    segments = data["segments"]

    # Build speaker stats
    speaker_data = {}
    for i, seg in enumerate(segments):
        sp = seg.get("speaker", "?")
        if sp not in speaker_data:
            speaker_data[sp] = {"count": 0, "duration": 0.0, "segments": []}
        speaker_data[sp]["count"] += 1
        speaker_data[sp]["duration"] += seg["end"] - seg["start"]
        speaker_data[sp]["segments"].append((i, seg))

    total_segs = sum(d["count"] for d in speaker_data.values())
    total_dur = sum(d["duration"] for d in speaker_data.values())
    print(f"\n  Speaker summary:")
    for sp in sorted(speaker_data.keys()):
        d = speaker_data[sp]
        pct_seg = d["count"] / total_segs * 100
        pct_dur = d["duration"] / total_dur * 100 if total_dur > 0 else 0
        print(f"    {sp}: {d['count']} segments ({pct_seg:.1f}%), {d['duration']:.1f}s ({pct_dur:.1f}% of speech)")

    # Print all segments for minority speakers
    for sp in ["SPEAKER_01", "SPEAKER_02", "UNKNOWN"]:
        if sp not in speaker_data:
            print(f"\n  {sp}: Not found in this video")
            continue
        segs = speaker_data[sp]["segments"]
        print(f"\n  {'─' * 90}")
        print(f"  ALL {sp} SEGMENTS ({len(segs)} total, {speaker_data[sp]['duration']:.1f}s):")
        for seg_num, (idx, seg) in enumerate(segs, 1):
            dur = seg["end"] - seg["start"]
            print(f"\n    -- {sp} segment #{seg_num} (index {idx}, {dur:.2f}s) --")
            # Show 2 segments before and after for context
            lo = max(0, idx - 2)
            hi = min(len(segments), idx + 3)
            for j in range(lo, hi):
                s = segments[j]
                prefix = ">>>" if j == idx else "   "
                sdur = s["end"] - s["start"]
                print(f"      {prefix} [{j:>4d}] {s['start']:8.2f}-{s['end']:8.2f} ({sdur:5.2f}s) {s.get('speaker','?'):<12s} | {s.get('text','').strip()[:100]}")


if __name__ == "__main__":
    task1()
    task2()
    task3()
    task4()
    task5()
    print("\n" + "=" * 100)
    print("SPOT-CHECK COMPLETE")
    print("=" * 100)
