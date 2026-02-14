#!/usr/bin/env python3
import json
import sys

file_path = 'data/06c.patched/Picking Up Girls in Barcelona  ｜  Immersion Documentary [iOSpNACA9VI].audio.asr.clean16k.conversations.json'

with open(file_path) as f:
    data = json.load(f)

convs = data.get('conversations', [])

def find_conv_by_segment(seg_num):
    """Find conversation containing a segment number"""
    for i, conv in enumerate(convs):
        segs = conv.get('segments', [])
        if segs and segs[0]['segment_index'] <= seg_num <= segs[-1]['segment_index']:
            return i, conv
    return None, None

# Question 1: Conversation 5 (segments 167-190)
print("\n" + "=" * 80)
print("QUESTION 1: Conversation 5 (segments 167-190)")
print("=" * 80)
conv_idx, conv = find_conv_by_segment(167)
if conv:
    segs = conv['segments']
    print(f"Found as Conversation index {conv_idx}")
    print(f"Segment range: {segs[0]['segment_index']}-{segs[-1]['segment_index']}")

    # Print all segments
    for seg in segs:
        override = seg.get('override_speaker_role', '')
        override_str = f" [OVERRIDE: {override}]" if override else ""
        print(f"  {seg['segment_index']:3d} | {seg['speaker']:12s}{override_str:22s} | {seg['text']}")

    # Analyze SPEAKER_13
    print("\n--- SPEAKER_13 Analysis ---")
    speaker13_segs = [s for s in segs if s['speaker'] == 'SPEAKER_13']
    print(f"Total SPEAKER_13 segments: {len(speaker13_segs)}")
    for seg in speaker13_segs:
        override = seg.get('override_speaker_role', '')
        print(f"  Seg {seg['segment_index']}: {override or 'NO OVERRIDE'} | {seg['text']}")

    # Analyze SPEAKER_05 (especially segment 182)
    print("\n--- SPEAKER_05 Analysis (focus on seg 182) ---")
    speaker05_segs = [s for s in segs if s['speaker'] == 'SPEAKER_05']
    print(f"Total SPEAKER_05 segments: {len(speaker05_segs)}")
    for seg in speaker05_segs:
        override = seg.get('override_speaker_role', '')
        marker = " <<< SEGMENT 182" if seg['segment_index'] == 182 else ""
        print(f"  Seg {seg['segment_index']}: {override or 'NO OVERRIDE'} | {seg['text']}{marker}")

# Question 2: Conversation 3 (segments 68-88)
print("\n" + "=" * 80)
print("QUESTION 2: Conversation 3 (segments 68-88)")
print("=" * 80)
conv_idx, conv = find_conv_by_segment(68)
if conv:
    segs = conv['segments']
    print(f"Found as Conversation index {conv_idx}")
    print(f"Segment range: {segs[0]['segment_index']}-{segs[-1]['segment_index']}")

    for seg in segs:
        override = seg.get('override_speaker_role', '')
        override_str = f" [OVERRIDE: {override}]" if override else ""
        marker = " <<< FOCUS" if seg['segment_index'] in [78, 81] else ""
        print(f"  {seg['segment_index']:3d} | {seg['speaker']:12s}{override_str:22s} | {seg['text']}{marker}")

# Question 3: Conversation 8 (segments 245-285)
print("\n" + "=" * 80)
print("QUESTION 3: Conversation 8 (segments 245-285)")
print("=" * 80)
conv_idx, conv = find_conv_by_segment(245)
if conv:
    segs = conv['segments']
    print(f"Found as Conversation index {conv_idx}")
    print(f"Segment range: {segs[0]['segment_index']}-{segs[-1]['segment_index']}")

    print("\n--- SPEAKER_10 Analysis ---")
    speaker10_segs = [s for s in segs if s['speaker'] == 'SPEAKER_10']
    for seg in speaker10_segs:
        override = seg.get('override_speaker_role', '')
        print(f"  Seg {seg['segment_index']:3d}: {override or 'NO OVERRIDE':10s} | {seg['text']}")

# Question 4: Conversation 12 (segments 388-427)
print("\n" + "=" * 80)
print("QUESTION 4: Conversation 12 (segments 388-427)")
print("=" * 80)
conv_idx, conv = find_conv_by_segment(388)
if conv:
    segs = conv['segments']
    print(f"Found as Conversation index {conv_idx}")
    print(f"Segment range: {segs[0]['segment_index']}-{segs[-1]['segment_index']}")

    # Focus on segment 399
    for seg in segs:
        override = seg.get('override_speaker_role', '')
        override_str = f" [OVERRIDE: {override}]" if override else ""
        marker = " <<< SEGMENT 399" if seg['segment_index'] == 399 else ""
        print(f"  {seg['segment_index']:3d} | {seg['speaker']:12s}{override_str:22s} | {seg['text'][:100]}{marker}")

# Question 5: Conversation 4 (segments 161-162)
print("\n" + "=" * 80)
print("QUESTION 5: Conversation 4 (segments 161-162)")
print("=" * 80)
conv_idx, conv = find_conv_by_segment(161)
if conv:
    segs = conv['segments']
    print(f"Found as Conversation index {conv_idx}")
    print(f"Segment range: {segs[0]['segment_index']}-{segs[-1]['segment_index']}")
    print(f"Duration: {segs[-1]['end'] - segs[0]['start']:.1f} seconds")

    for seg in segs:
        override = seg.get('override_speaker_role', '')
        override_str = f" [OVERRIDE: {override}]" if override else ""
        print(f"  {seg['segment_index']:3d} | {seg['speaker']:12s}{override_str:22s} | {seg['text']}")

# Question 6: Conversation 7 (segments 242-244)
print("\n" + "=" * 80)
print("QUESTION 6: Conversation 7 (segments 242-244)")
print("=" * 80)
conv_idx, conv = find_conv_by_segment(242)
if conv:
    segs = conv['segments']
    print(f"Found as Conversation index {conv_idx}")
    print(f"Segment range: {segs[0]['segment_index']}-{segs[-1]['segment_index']}")
    print(f"Duration: {segs[-1]['end'] - segs[0]['start']:.1f} seconds")

    for seg in segs:
        override = seg.get('override_speaker_role', '')
        override_str = f" [OVERRIDE: {override}]" if override else ""
        print(f"  {seg['segment_index']:3d} | {seg['speaker']:12s}{override_str:22s} | {seg['text']}")

# Question 7: Conversation 1 (segments 20-25)
print("\n" + "=" * 80)
print("QUESTION 7: Conversation 1 (segments 20-25)")
print("=" * 80)
conv_idx, conv = find_conv_by_segment(20)
if conv:
    segs = conv['segments']
    print(f"Found as Conversation index {conv_idx}")
    print(f"Segment range: {segs[0]['segment_index']}-{segs[-1]['segment_index']}")
    print(f"Duration: {segs[-1]['end'] - segs[0]['start']:.1f} seconds")

    for seg in segs:
        override = seg.get('override_speaker_role', '')
        override_str = f" [OVERRIDE: {override}]" if override else ""
        print(f"  {seg['segment_index']:3d} | {seg['speaker']:12s}{override_str:22s} | {seg['text']}")
