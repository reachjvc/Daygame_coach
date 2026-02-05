#!/usr/bin/env python3
"""Task 3: 'How To Feel Worthy' Speaker Analysis"""
import json, os
from collections import Counter

BASE_DIR = "/home/jonaswsl/projects/daygame-coach/data/test/r2/04.diarize"
VIDEO_DIR = "How To Feel Worthy Around Hot Women (by Understanding What They REALLY Want) [IZX3a0tLuAg]"

dirpath = os.path.join(BASE_DIR, VIDEO_DIR)
json_files = [f for f in os.listdir(dirpath) if f.endswith('.full.json')]
with open(os.path.join(dirpath, json_files[0])) as f:
    data = json.load(f)
segments = data["segments"]
speaker_counts = Counter(seg["speaker"] for seg in segments)

print("=" * 120)
print("TASK 3: 'How To Feel Worthy Around Hot Women' - SPEAKER ANALYSIS")
print("=" * 120)
print(f"\nTotal segments: {len(segments)}")
print(f"\nSpeaker distribution:")
for spk, count in sorted(speaker_counts.items()):
    total_words = sum(len(seg.get("words", [])) for seg in segments if seg["speaker"] == spk)
    total_duration = sum(seg["end"] - seg["start"] for seg in segments if seg["speaker"] == spk)
    print(f"  {spk}: {count} segments, {total_words} words, {total_duration:.1f}s total duration")

dominant = max(speaker_counts, key=speaker_counts.get)
print(f"\nDominant speaker: {dominant} ({speaker_counts[dominant]} segments)")
non_dominant = {spk for spk in speaker_counts if spk != dominant}
print(f"Non-dominant speakers: {non_dominant}")
target_indices = [i for i, seg in enumerate(segments) if seg["speaker"] in non_dominant]
print(f"\nFound {len(target_indices)} segments from non-dominant speakers")
print("\n" + "=" * 120)

def fmt(seg, idx, is_target=False):
    marker = ">>>" if is_target else "   "
    text = seg["text"].strip()
    return f"  {marker} [{idx:3d}] [{seg['start']:7.1f}s - {seg['end']:7.1f}s] {seg['speaker']}: \"{text}\""

printed_ranges = set()
for target_idx in target_indices:
    cs = max(0, target_idx - 2)
    ce = min(len(segments) - 1, target_idx + 2)
    current_range = set(range(cs, ce + 1))
    if current_range.issubset(printed_ranges):
        continue
    print(f"\n--- Context around segment {target_idx} ({segments[target_idx]['speaker']}) ---")
    for i in range(cs, ce + 1):
        is_t = segments[i]["speaker"] in non_dominant
        print(fmt(segments[i], i, is_t))
        printed_ranges.add(i)

print("\n" + "=" * 120)
print("\nANALYSIS SUMMARY:")
print("-" * 80)
for spk in sorted(non_dominant):
    spk_indices = [i for i, seg in enumerate(segments) if seg["speaker"] == spk]
    if not spk_indices:
        print(f"\n  {spk}: No segments found")
        continue
    spk_segs = [segments[i] for i in spk_indices]
    avg_dur = sum(s["end"] - s["start"] for s in spk_segs) / len(spk_segs)
    avg_w = sum(len(s.get("words", [])) for s in spk_segs) / len(spk_segs)
    time_range = f"{spk_segs[0]['start']:.1f}s - {spk_segs[-1]['end']:.1f}s"
    print(f"\n  {spk}:")
    print(f"    Segment count:     {len(spk_segs)}")
    print(f"    Time range:        {time_range}")
    print(f"    Avg duration:      {avg_dur:.2f}s")
    print(f"    Avg words/segment: {avg_w:.1f}")
    print(f"    Segment indices:   {spk_indices}")
    if len(spk_indices) > 1:
        gaps = [spk_indices[j+1] - spk_indices[j] for j in range(len(spk_indices)-1)]
        print(f"    Gaps between segments: {gaps}")
        if max(gaps) <= 3:
            print(f"    Pattern: CLUSTERED (likely a real speaker section)")
        else:
            print(f"    Pattern: SCATTERED (may be diarization artifacts)")
    short_segs = [s for s in spk_segs if s["end"] - s["start"] < 1.0]
    if short_segs:
        print(f"    WARNING: {len(short_segs)} segments shorter than 1 second (possible artifacts)")
        for s in short_segs:
            print(f"      - [{s['start']:.1f}s - {s['end']:.1f}s]: \"{s['text'].strip()[:80]}\"")
