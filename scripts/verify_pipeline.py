#!/usr/bin/env python3
"""
Pipeline Verification Script

Checks the generated training data for:
1. Existence of files
2. Valid JSON syntax
3. Presence of NaN values (which crash Node.js)
4. Distribution of labels (Speakers, Tones)
"""

import json
import sys
from pathlib import Path

def verify_jsonl(path: Path):
    print(f"🔍 Checking {path}...")
    if not path.exists():
        print(f"❌ File missing: {path}")
        return False

    count = 0
    nans = 0
    speakers = {}
    tones = {}
    invalid = 0
    
    with path.open("r") as f:
        for i, line in enumerate(f):
            # Check for NaN literally in the string before parsing
            if "NaN" in line:
                nans += 1
            try:
                data = json.loads(line)
                count += 1
                
                spk = data.get("speaker", "unknown")
                speakers[spk] = speakers.get(spk, 0) + 1
                
                tone = data.get("tone", "neutral")
                tones[tone] = tones.get(tone, 0) + 1
                
            except json.JSONDecodeError:
                print(f"❌ Invalid JSON at line {i+1}")
                invalid += 1

    print(f"✅ Valid Lines: {count}")
    if nans > 0:
        print(f"⚠️  CRITICAL: Found {nans} lines with 'NaN'. This WILL crash your website.")
    else:
        print(f"✅ Data Safety: No NaN values found.")
        
    print(f"📊 Stats:")
    print(f"   Speakers: {speakers}")
    print(f"   Tones:    {tones}")
    print("-" * 40)
    return invalid == 0 and nans == 0

if __name__ == "__main__":
    # Check the main file your website likely uses
    ok_main = verify_jsonl(Path("training-data/processed/training_data.jsonl"))
    
    # Check the chat scenario file if you are using it
    ok_scenario = verify_jsonl(Path("training-data/processed/scenario_training.jsonl"))

    raise SystemExit(0 if (ok_main and ok_scenario) else 1)
