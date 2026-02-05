#!/usr/bin/env python3
"""Task 5: Segment Count Sanity"""
import json, os
from collections import Counter

BASE_DIR = "/home/jonaswsl/projects/daygame-coach/data/test/r2/04.diarize"

print("=" * 120)
print("TASK 5: SEGMENT COUNT SANITY CHECK")
print("=" * 120)

results = []
for dirname in sorted(os.listdir(BASE_DIR)):
    dirpath = os.path.join(BASE_DIR, dirname)
    if not os.path.isdir(dirpath):
        continue
    json_files = [f for f in os.listdir(dirpath) if f.endswith('.full.json')]
    if not json_files:
        continue
    with open(os.path.join(dirpath, json_files[0])) as f:
        data = json.load(f)
    segments = data.get("segments", [])
    if not segments:
        continue

    total_words = 0
    wc_per_seg = []
    seg_durs = []
    spk_counts = Counter()
    for seg in segments:
        words = seg.get("words", [])
        wc = len(words)
        if wc == 0 and seg.get("text"):
            wc = len(seg["text"].strip().split())
        wc_per_seg.append(wc)
        total_words += wc
        seg_durs.append(seg["end"] - seg["start"])
        spk_counts[seg["speaker"]] += 1

    avg_w = total_words / len(segments)
    med_w = sorted(wc_per_seg)[len(wc_per_seg) // 2]
    total_dur = segments[-1]["end"] - segments[0]["start"]

    flags = []
    if avg_w < 3:
        flags.append("OVER-SEGMENTED (avg words < 3)")
    if avg_w > 25:
        flags.append("UNDER-SEGMENTED (avg words > 25)")
    empty = sum(1 for w in wc_per_seg if w == 0)
    if empty > 0:
        flags.append(f"EMPTY SEGMENTS ({empty})")
    very_short = sum(1 for d in seg_durs if d < 0.5)
    if very_short > len(segments) * 0.1:
        flags.append(f"MANY SHORT SEGS ({very_short} < 0.5s)")
    very_long = sum(1 for d in seg_durs if d > 30)
    if very_long > 0:
        flags.append(f"LONG SEGS ({very_long} > 30s)")

    results.append({
        "title": dirname, "total_segments": len(segments), "total_words": total_words,
        "avg_words": avg_w, "median_words": med_w, "min_words": min(wc_per_seg),
        "max_words": max(wc_per_seg), "avg_duration": sum(seg_durs)/len(seg_durs),
        "min_duration": min(seg_durs), "max_duration": max(seg_durs),
        "total_duration": total_dur, "speakers": len(spk_counts),
        "speaker_dist": dict(spk_counts), "flags": flags, "empty_segments": empty,
        "seg_durations": seg_durs, "word_counts": wc_per_seg,
    })

print(f"\n{'Title':<70} {'Segs':>5} {'Words':>6} {'Avg W':>6} {'Med W':>6} {'AvgDur':>7} {'Spkrs':>6} {'Flags'}")
print("-" * 140)
for r in results:
    ts = r["title"][:68]
    fs = ", ".join(r["flags"]) if r["flags"] else "OK"
    print(f"{ts:<70} {r['total_segments']:>5} {r['total_words']:>6} {r['avg_words']:>6.1f} {r['median_words']:>6} {r['avg_duration']:>6.1f}s {r['speakers']:>6} {fs}")

print(f"\n{'='*120}\nDETAILED BREAKDOWN:\n{'='*120}")
for r in results:
    fm = " *** FLAGGED ***" if r["flags"] else ""
    print(f"\n  {r['title']}{fm}")
    print(f"    Total segments:       {r['total_segments']}")
    print(f"    Total words:          {r['total_words']}")
    print(f"    Total duration:       {r['total_duration']:.1f}s ({r['total_duration']/60:.1f} min)")
    print(f"    Words per segment:    avg={r['avg_words']:.1f}, median={r['median_words']}, min={r['min_words']}, max={r['max_words']}")
    print(f"    Segment duration:     avg={r['avg_duration']:.2f}s, min={r['min_duration']:.2f}s, max={r['max_duration']:.2f}s")
    print(f"    Speakers:             {r['speakers']} {r['speaker_dist']}")
    print(f"    Empty segments:       {r['empty_segments']}")
    if r["flags"]:
        print(f"    FLAGS:                {', '.join(r['flags'])}")
    bins = {"0 words": 0, "1-3 words": 0, "4-10 words": 0, "11-25 words": 0, "26-50 words": 0, "51+ words": 0}
    for wc in r["word_counts"]:
        if wc == 0: bins["0 words"] += 1
        elif wc <= 3: bins["1-3 words"] += 1
        elif wc <= 10: bins["4-10 words"] += 1
        elif wc <= 25: bins["11-25 words"] += 1
        elif wc <= 50: bins["26-50 words"] += 1
        else: bins["51+ words"] += 1
    print(f"    Word count distribution:")
    for bn, cnt in bins.items():
        bar = "#" * min(cnt * 2, 80)
        pct = cnt / r["total_segments"] * 100
        print(f"      {bn:>12}: {cnt:4d} ({pct:5.1f}%) {bar}")

print(f"\n{'='*120}\nOVERALL SUMMARY:\n{'-'*80}")
flagged = [r for r in results if r["flags"]]
ok = [r for r in results if not r["flags"]]
print(f"\n  Total videos analyzed: {len(results)}")
print(f"  Videos OK:            {len(ok)}")
print(f"  Videos flagged:       {len(flagged)}")
if flagged:
    print(f"\n  FLAGGED VIDEOS:")
    for r in flagged:
        print(f"    - {r['title'][:70]}")
        for fl in r["flags"]:
            print(f"        {fl}")
avg_all = [r["avg_words"] for r in results]
print(f"\n  Avg words/segment across all videos: {sum(avg_all)/len(avg_all):.1f}")
print(f"  Range: {min(avg_all):.1f} - {max(avg_all):.1f}")
