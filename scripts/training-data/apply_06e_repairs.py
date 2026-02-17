#!/usr/bin/env python3
"""
Apply transcript artifact repairs from 06e quality-check to upstream (06d) and downstream (07) data files.

Only applies repairs with confidence >= 0.85 AND a non-null repair_text.
Updates the 06e file itself to mark repairs as applied.

Usage:
    python3 scripts/training-data/apply_06e_repairs.py --dry-run   # Preview changes
    python3 scripts/training-data/apply_06e_repairs.py              # Apply changes
"""

import json
import glob
import os
import re
import sys
from datetime import datetime, timezone

SOURCE = "NICK_KRAUSER_OUTLAWDAYGAME"
MIN_CONFIDENCE = 0.85
BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

QC_GLOB   = f"data/06e.LLM.quality-check/{SOURCE}/*/*.quality-check.json"
CONV_GLOB = f"data/06d.DET.sanitized/{SOURCE}/*/*.conversations.json"
ENR_GLOB  = f"data/07.LLM.content/{SOURCE}/*/*.enriched.json"


def get_video_id(path):
    """Extract video_id from directory name like 'Title [videoId]'."""
    dirname = os.path.basename(os.path.dirname(path))
    m = re.search(r'\[([^\]]+)\]', dirname)
    return m.group(1) if m else None


def build_index(pattern):
    """Build dict: video_id -> filepath."""
    idx = {}
    for f in glob.glob(os.path.join(BASE, pattern)):
        vid = get_video_id(f)
        if vid:
            idx[vid] = f
    return idx


def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')


def main():
    dry_run = "--dry-run" in sys.argv

    if dry_run:
        print("=" * 70)
        print("DRY RUN — no files will be modified")
        print("=" * 70)
    else:
        print("=" * 70)
        print("APPLYING REPAIRS — files will be modified")
        print("=" * 70)
    print()

    qc_idx = build_index(QC_GLOB)
    conv_idx = build_index(CONV_GLOB)
    enr_idx = build_index(ENR_GLOB)

    total_applied = 0
    total_skipped = 0
    total_already = 0
    repairs_log = []

    for video_id in sorted(qc_idx.keys()):
        qc_path = qc_idx[video_id]
        qc_data = load_json(qc_path)
        artifacts = qc_data.get("transcript_artifacts", [])

        # Filter to high-confidence repairable artifacts
        candidates = [
            a for a in artifacts
            if (a.get("repair_confidence") or 0) >= MIN_CONFIDENCE
            and a.get("repair_text") is not None
            and not a.get("repaired", False)
        ]

        if not candidates:
            continue

        video_dir = os.path.basename(os.path.dirname(qc_path))
        print(f"--- {video_dir} ---")
        print(f"    {len(candidates)} repairable artifact(s)")

        # Load 06d and 07 data
        conv_path = conv_idx.get(video_id)
        enr_path = enr_idx.get(video_id)

        conv_data = load_json(conv_path) if conv_path else None
        enr_data = load_json(enr_path) if enr_path else None

        qc_modified = False

        for artifact in candidates:
            seg_idx = artifact["segment_index"]
            repair_text = artifact["repair_text"]
            confidence = artifact["repair_confidence"]
            art_type = artifact.get("artifact_type", "unknown")

            # --- Check 06d ---
            old_text_06d = None
            applied_06d = False
            if conv_data and seg_idx < len(conv_data["segments"]):
                seg = conv_data["segments"][seg_idx]
                old_text_06d = seg["text"]
                if old_text_06d == repair_text:
                    print(f"    seg[{seg_idx}] 06d: already matches (skipping)")
                    total_already += 1
                else:
                    applied_06d = True

            # --- Check 07 ---
            old_text_07 = None
            applied_07 = False
            if enr_data and seg_idx < len(enr_data["segments"]):
                seg = enr_data["segments"][seg_idx]
                old_text_07 = seg["text"]
                if old_text_07 == repair_text:
                    print(f"    seg[{seg_idx}] 07:  already matches (skipping)")
                    total_already += 1
                else:
                    applied_07 = True
            elif not enr_path:
                print(f"    seg[{seg_idx}] 07:  no enriched file for this video")

            if not applied_06d and not applied_07:
                total_skipped += 1
                continue

            # Print the change
            old_text = old_text_06d or old_text_07
            targets = []
            if applied_06d:
                targets.append("06d")
            if applied_07:
                targets.append("07")

            print(f"    seg[{seg_idx}] conf={confidence} type={art_type} -> {', '.join(targets)}")
            print(f"      OLD: {old_text[:150]}")
            print(f"      NEW: {repair_text[:150]}")

            if not dry_run:
                if applied_06d:
                    conv_data["segments"][seg_idx]["text"] = repair_text
                if applied_07:
                    enr_data["segments"][seg_idx]["text"] = repair_text

                artifact["repaired"] = True
                artifact["repair_action_applied"] = "auto_06e_repair_script"
                artifact["repair_applied_at"] = datetime.now(timezone.utc).isoformat()
                qc_modified = True

            repairs_log.append({
                "video_id": video_id,
                "segment_index": seg_idx,
                "confidence": confidence,
                "type": art_type,
                "old_text": (old_text or "")[:200],
                "new_text": repair_text[:200],
                "targets": targets,
            })
            total_applied += 1

        # Save modified files
        if not dry_run and qc_modified:
            save_json(conv_path, conv_data)
            print(f"    SAVED: {os.path.relpath(conv_path, BASE)}")

            if enr_data:
                save_json(enr_path, enr_data)
                print(f"    SAVED: {os.path.relpath(enr_path, BASE)}")

            save_json(qc_path, qc_data)
            print(f"    SAVED: {os.path.relpath(qc_path, BASE)}")

        print()

    # Summary
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"  Repairs applied:       {total_applied}")
    print(f"  Already matching:      {total_already}")
    print(f"  Skipped (no change):   {total_skipped}")
    print()

    if dry_run and total_applied > 0:
        print("Run without --dry-run to apply these changes.")


if __name__ == "__main__":
    main()
