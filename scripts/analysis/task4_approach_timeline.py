#!/usr/bin/env python3
"""Task 4: Approach ANY GIRL - Full Speaker Timeline"""
import json, os
from collections import Counter

BASE_DIR = "/home/jonaswsl/projects/daygame-coach/data/test/r2/04.diarize"
VIDEO_DIR = "Approach ANY GIRL in Public LIKE a PRO! (INFIELD) [mv2X8Yhg9M0]"

dirpath = os.path.join(BASE_DIR, VIDEO_DIR)
json_files = [f for f in os.listdir(dirpath) if f.endswith('.full.json')]
with open(os.path.join(dirpath, json_files[0])) as f:
    data = json.load(f)
segments = data["segments"]
speaker_counts = Counter(seg["speaker"] for seg in segments)

print("=" * 120)
print("TASK 4: 'Approach ANY GIRL in Public LIKE a PRO! (INFIELD)' - FULL SPEAKER TIMELINE")
print("=" * 120)
print(f"\nTotal segments: {len(segments)}")
print(f"Video span: {segments[0]['start']:.1f}s - {segments[-1]['end']:.1f}s ({(segments[-1]['end'] - segments[0]['start'])/60:.1f} min)")
print(f"\nSpeaker distribution:")
for spk, count in sorted(speaker_counts.items()):
    total_words = sum(len(seg.get("words", [])) for seg in segments if seg["speaker"] == spk)
    total_duration = sum(seg["end"] - seg["start"] for seg in segments if seg["speaker"] == spk)
    pct = total_duration / (segments[-1]["end"] - segments[0]["start"]) * 100
    print(f"  {spk}: {count} segments, {total_words} words, {total_duration:.1f}s ({pct:.1f}% of video)")

def ft(seconds):
    return f"{int(seconds//60):2d}:{int(seconds%60):02d}"

print(f"\n{'='*120}\nFULL TIMELINE:\n{'='*120}")
prev_speaker = None
for i, seg in enumerate(segments):
    text = seg["text"].strip()
    tp = text[:80] + ("..." if len(text) > 80 else "")
    sc = " <-- SPEAKER CHANGE" if prev_speaker is not None and seg["speaker"] != prev_speaker else ""
    print(f"  [{ft(seg['start'])} - {ft(seg['end'])}] {seg['speaker']}: \"{tp}\"{sc}")
    prev_speaker = seg["speaker"]

print(f"\n{'='*120}\nSPEAKER TRANSITION ANALYSIS:\n{'-'*80}")
transitions = []
for i in range(1, len(segments)):
    if segments[i]["speaker"] != segments[i-1]["speaker"]:
        transitions.append({"from": segments[i-1]["speaker"], "to": segments[i]["speaker"], "at": segments[i]["start"], "idx": i})

print(f"\nTotal speaker transitions: {len(transitions)}")
print(f"\nTransition pairs:")
tc = Counter((t["from"], t["to"]) for t in transitions)
for (fr, to), count in sorted(tc.items(), key=lambda x: -x[1]):
    print(f"  {fr} -> {to}: {count} times")

print(f"\nTransition timeline:")
for t in transitions:
    print(f"  At {ft(t['at'])}: {t['from']} -> {t['to']} (segment {t['idx']})")

print(f"\nSPEAKER BLOCKS (continuous sections):\n{'-'*80}")
block_start = 0
for i in range(1, len(segments)):
    if segments[i]["speaker"] != segments[i-1]["speaker"]:
        bs = segments[block_start:i]
        bd = bs[-1]["end"] - bs[0]["start"]
        bw = sum(len(s.get("words", [])) for s in bs)
        ft_text = bs[0]["text"].strip()[:50]
        print(f"  [{ft(bs[0]['start'])} - {ft(bs[-1]['end'])}] {segments[block_start]['speaker']} ({len(bs)} segs, {bd:.0f}s, {bw} words): \"{ft_text}...\"")
        block_start = i
bs = segments[block_start:]
bd = bs[-1]["end"] - bs[0]["start"]
bw = sum(len(s.get("words", [])) for s in bs)
ft_text = bs[0]["text"].strip()[:50]
print(f"  [{ft(bs[0]['start'])} - {ft(bs[-1]['end'])}] {segments[block_start]['speaker']} ({len(bs)} segs, {bd:.0f}s, {bw} words): \"{ft_text}...\"")
