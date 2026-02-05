#!/usr/bin/env python3
"""
Standalone Sonnet test runner for Stage 06.

Imports the 06.video-type module, monkey-patches call_claude to use --model sonnet,
and runs all 12 R2 videos in parallel. Outputs to data/sonnet_test/06/.

Does NOT modify the original 06.video-type script.

Usage:
    python scripts/training-data/sonnet-test-06.py
"""

import importlib.machinery
import importlib.util
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

# ---- Import 06.video-type as a module ----
SCRIPT_DIR = Path(__file__).resolve().parent
MODULE_PATH = SCRIPT_DIR / "06.video-type"

spec = importlib.util.spec_from_file_location(
    "video_type_06",
    str(MODULE_PATH),
    submodule_search_locations=[],
    loader=importlib.util.spec_from_loader(
        "video_type_06",
        importlib.machinery.SourceFileLoader("video_type_06", str(MODULE_PATH)),
    ).loader,
)
mod = importlib.util.module_from_spec(spec)

# Register module before loading (required for dataclasses)
sys.modules["video_type_06"] = mod

# Prevent the module from running main() on import
sys.argv = [str(MODULE_PATH)]
spec.loader.exec_module(mod)

# ---- Monkey-patch call_claude to use --model sonnet ----
original_find_binary = mod.find_claude_binary


def call_claude_sonnet(prompt: str, retries: int = 3, timeout: int = 300) -> Optional[str]:
    """Identical to original call_claude but adds --model sonnet."""
    claude_bin = original_find_binary()
    if not claude_bin:
        raise RuntimeError("Claude CLI binary not found")

    for attempt in range(retries):
        try:
            print(f"[sonnet-test] Calling claude --model sonnet (attempt {attempt + 1}/{retries})...")
            result = subprocess.run(
                [claude_bin, "-p", prompt, "--output-format", "text", "--model", "sonnet"],
                capture_output=True,
                text=True,
                timeout=timeout,
            )
            if result.returncode == 0:
                return result.stdout.strip()
            else:
                if attempt < retries - 1:
                    wait = 2 ** attempt
                    print(f"[sonnet-test] Claude CLI error, retrying in {wait}s...")
                    print(f"[sonnet-test]   stderr: {result.stderr[:200]}")
                    time.sleep(wait)
                    continue
                raise RuntimeError(f"Claude CLI failed: {result.stderr[:500]}")
        except subprocess.TimeoutExpired:
            if attempt < retries - 1:
                print(f"[sonnet-test] Timeout, retrying...")
                time.sleep(2 ** attempt)
                continue
            raise RuntimeError(f"Claude CLI timeout after {timeout}s")
        except FileNotFoundError:
            raise RuntimeError("'claude' command not found.")
    return None


# Apply monkey-patch
mod.call_claude = call_claude_sonnet

# ---- Configuration ----
REPO_ROOT = Path(__file__).resolve().parents[2]
INPUT_DIR = REPO_ROOT / "data" / "05.audio-features" / "r2batch"
OUTPUT_DIR = REPO_ROOT / "data" / "sonnet_test" / "06"

MAX_PARALLEL = 4  # Run up to 4 at once (avoid rate limits)


def process_one(input_file: Path) -> dict:
    """Process a single video file through Stage 06 with Sonnet."""
    video_name = input_file.parent.name
    output_file = OUTPUT_DIR / video_name / mod.compute_output_path(input_file, OUTPUT_DIR / video_name).name

    # Skip if already completed
    if output_file.exists():
        print(f"[sonnet-test] SKIP (exists): {video_name}")
        return {"video": video_name, "status": "skipped", "elapsed": 0}

    print(f"\n[sonnet-test] START: {video_name}")
    start = time.time()

    try:
        result = mod.process_file(input_file, output_file, dry_run=False)
        elapsed = time.time() - start
        print(f"[sonnet-test] DONE: {video_name} ({elapsed:.1f}s) - type={result.get('video_type')}, convs={result.get('conversations')}")
        return {"video": video_name, "status": "ok", "elapsed": elapsed, **result}
    except Exception as e:
        elapsed = time.time() - start
        print(f"[sonnet-test] FAILED: {video_name} ({elapsed:.1f}s) - {e}")
        return {"video": video_name, "status": "error", "error": str(e), "elapsed": elapsed}


def main():
    # Find all 12 R2 input files
    input_files = sorted(INPUT_DIR.rglob("*.clean16k.audio_features.json"))
    print(f"[sonnet-test] Found {len(input_files)} R2 input files")
    print(f"[sonnet-test] Output dir: {OUTPUT_DIR}")
    print(f"[sonnet-test] Parallel workers: {MAX_PARALLEL}")
    print()

    if not input_files:
        print("[sonnet-test] No input files found!")
        sys.exit(1)

    # Create output dir
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Run in parallel
    results = []
    total_start = time.time()

    with ThreadPoolExecutor(max_workers=MAX_PARALLEL) as executor:
        futures = {executor.submit(process_one, f): f for f in input_files}
        for future in as_completed(futures):
            results.append(future.result())

    total_elapsed = time.time() - total_start

    # Summary
    print(f"\n{'='*60}")
    print(f"[sonnet-test] SUMMARY")
    print(f"{'='*60}")
    ok = [r for r in results if r["status"] == "ok"]
    failed = [r for r in results if r["status"] == "error"]
    print(f"  Total: {len(results)}")
    print(f"  OK:    {len(ok)}")
    print(f"  Failed: {len(failed)}")
    print(f"  Total time: {total_elapsed:.1f}s")
    print()

    for r in sorted(results, key=lambda x: x["video"]):
        status = "OK" if r["status"] == "ok" else "FAIL"
        elapsed = r.get("elapsed", 0)
        vtype = r.get("video_type", "?")
        convs = r.get("conversations", "?")
        print(f"  [{status}] {r['video'][:60]:60s} {elapsed:6.1f}s  type={vtype}  convs={convs}")

    if failed:
        print(f"\nFailed videos:")
        for r in failed:
            print(f"  {r['video']}: {r.get('error', '?')}")

    print(f"\n[sonnet-test] Outputs written to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
