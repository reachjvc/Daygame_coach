#!/usr/bin/env python3
"""
scripts/training-data/test-llm-strategies.py

LLM Strategy Comparison Test for Training Data Pipeline v2

Tests different strategies to improve LLM segment classification coverage:
1. Prompt variations - explicit "classify EVERY segment" instructions
2. Chunking - process 20-30 segments at a time
3. Multi-pass - separate prompts for each task
4. Model comparison - test larger models if available

Target: ≥80% segment classification coverage

Usage:
    ./scripts/training-data/test-llm-strategies.py [--strategy all|prompt|chunk|multipass] [--model MODEL]
"""

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Test video configuration (using the shorter one for faster iteration)
TEST_VIDEO = {
    "name": "Daygame Is This Simple!？ 🥳 (+Daygame Infield) [utuuVOXJunM]",
    "source": "daily_evolution",
    "duration_min": 5.1
}

# Available models to test
MODELS = {
    "small": ["llama3.2", "llama3.1"],
    "medium": ["llama3.1:8b", "mistral", "mixtral:8x7b"],
    "large": ["llama3.1:70b", "qwen2.5:72b"]
}

DEFAULT_MODEL = "llama3.2"

# Technique and topic taxonomies
TECHNIQUES = [
    "direct_opener", "indirect_opener", "situational_opener", "observation_opener",
    "push_pull", "tease", "cold_read", "role_play", "disqualification", "neg", "dhv",
    "qualification", "statement_of_intent", "grounding", "storytelling", "vulnerability",
    "kino", "proximity", "eye_contact", "compliance_test",
    "number_close", "instagram_close", "instant_date", "bounce"
]

TOPICS = ["career", "origin", "hobby", "travel", "appearance", "personality", "age", "plans", "relationship", "fitness", "style"]
CONTENT_TYPES = ["intro", "outro", "commentary", "infield", "transition"]


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def load_transcript(source: str, video_name: str) -> Optional[Dict[str, Any]]:
    """Load transcript from the data directory."""
    root = repo_root()
    for engine in ["whisperx", "whisper", "faster", ""]:
        suffix = f".{engine}" if engine else ""
        transcript_path = root / "data" / "02.transcribe" / source / video_name / f"{video_name}.full{suffix}.json"
        if transcript_path.exists():
            with open(transcript_path, "r", encoding="utf-8") as f:
                return json.load(f)
    return None


def format_segments(segments: List[Dict], start_idx: int = 0) -> str:
    """Format segments with IDs for LLM analysis."""
    lines = []
    for i, seg in enumerate(segments):
        idx = start_idx + i
        text = seg.get("text", "").strip()
        start = seg.get("start", 0)
        speaker = seg.get("speaker", "UNKNOWN")
        if text:
            lines.append(f"[{idx}] {start:.1f}s {speaker}: {text}")
    return "\n".join(lines)


def call_ollama(prompt: str, model: str, timeout: int = 300) -> Tuple[str, float]:
    """Call Ollama and return (response, time_seconds)."""
    start = time.time()
    try:
        result = subprocess.run(
            ["ollama", "run", model],
            input=prompt,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        elapsed = time.time() - start
        if result.returncode != 0:
            print(f"  [ERROR] Ollama error: {result.stderr[:200]}")
            return "", elapsed
        return result.stdout.strip(), elapsed
    except subprocess.TimeoutExpired:
        return "", time.time() - start
    except Exception as e:
        print(f"  [ERROR] {e}")
        return "", time.time() - start


def parse_json(response: str):
    """Parse JSON from response. Returns dict, list, or None."""
    # Try direct parse first
    try:
        return json.loads(response)
    except:
        pass

    # Try markdown code blocks
    for prefix in ["```json", "```"]:
        if prefix in response:
            try:
                json_str = response.split(prefix)[1].split("```")[0].strip()
                return json.loads(json_str)
            except:
                pass

    # Try to find JSON object {...}
    try:
        start = response.find("{")
        end = response.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(response[start:end])
    except:
        pass

    # Try to find JSON array [...]
    try:
        start = response.find("[")
        end = response.rfind("]") + 1
        if start >= 0 and end > start:
            return json.loads(response[start:end])
    except:
        pass

    return None


def count_classified_segments(analysis, total_segments: int) -> Tuple[int, float]:
    """Count how many segments were classified. Returns (count, percentage)."""
    if not analysis:
        return 0, 0.0

    # Handle both array and object responses
    if isinstance(analysis, list):
        segments = analysis
    elif isinstance(analysis, dict):
        segments = analysis.get("segments", [])
    else:
        return 0, 0.0

    classified = sum(1 for s in segments if s.get("content_type") or s.get("type"))

    return classified, (classified / total_segments * 100) if total_segments > 0 else 0.0


# =============================================================================
# STRATEGY 1: Prompt Variations
# =============================================================================

def build_explicit_prompt(transcript_text: str, num_segments: int) -> str:
    """Build prompt with EXPLICIT instruction to classify every segment."""
    return f"""You are analyzing a daygame coaching video transcript with {num_segments} segments.

CRITICAL INSTRUCTION: You MUST classify ALL {num_segments} segments. Every single segment from [0] to [{num_segments - 1}] must appear in your output. Missing segments is a FAILURE.

TRANSCRIPT:
{transcript_text}

For EACH of the {num_segments} segments above, provide:
1. content_type: One of {json.dumps(CONTENT_TYPES)}
2. speaker_role: COACH, GIRL, STUDENT, or VOICEOVER

Also identify:
- Topics discussed (with specific values like "career: medicine", "origin: Brazil")
- Techniques used (from: {json.dumps(TECHNIQUES[:15])}...)

IMPORTANT: Your "segments" array MUST have EXACTLY {num_segments} entries, one for each segment [0] through [{num_segments - 1}].

Respond with ONLY valid JSON:
{{
  "segments": [
    {{"id": 0, "content_type": "intro", "speaker_role": "COACH"}},
    {{"id": 1, "content_type": "commentary", "speaker_role": "COACH"}},
    ... (ALL {num_segments} segments)
  ],
  "topics": [
    {{"type": "career", "value": "medicine", "segment_ids": [23, 24]}}
  ],
  "techniques": [
    {{"name": "direct_opener", "segment_ids": [5, 6]}}
  ]
}}"""


def build_minimal_prompt(transcript_text: str, num_segments: int) -> str:
    """Build minimal prompt focused ONLY on segment classification."""
    return f"""Classify each segment in this transcript.

TRANSCRIPT ({num_segments} segments):
{transcript_text}

For EVERY segment [0] to [{num_segments - 1}], output:
- id: segment number
- type: intro, outro, commentary, infield, or transition
- speaker: COACH, GIRL, or OTHER

Output ONLY JSON array with exactly {num_segments} objects:
[
  {{"id": 0, "type": "intro", "speaker": "COACH"}},
  {{"id": 1, "type": "commentary", "speaker": "COACH"}},
  ...
]"""


def build_numbered_list_prompt(transcript_text: str, num_segments: int) -> str:
    """Build prompt asking for numbered list output."""
    return f"""Classify each line of this transcript.

{transcript_text}

For EACH line above (numbered [0] to [{num_segments - 1}]), state the content type.
Types: intro, outro, commentary, infield, transition

Output format - provide ALL {num_segments} classifications:
0: intro
1: commentary
2: commentary
...
{num_segments - 1}: outro

Begin your classification of all {num_segments} segments:"""


def run_prompt_strategy(segments: List[Dict], model: str) -> Dict[str, Any]:
    """Test different prompt variations."""
    print("\n" + "="*60)
    print("STRATEGY 1: Prompt Variations")
    print("="*60)

    transcript_text = format_segments(segments)
    num_segments = len(segments)
    results = {}

    prompts = {
        "original": build_original_prompt(transcript_text),
        "explicit": build_explicit_prompt(transcript_text, num_segments),
        "minimal": build_minimal_prompt(transcript_text, num_segments),
        "numbered": build_numbered_list_prompt(transcript_text, num_segments)
    }

    for name, prompt in prompts.items():
        print(f"\n[{name}] Testing prompt ({len(prompt)} chars)...")
        response, elapsed = call_ollama(prompt, model)

        if name == "numbered":
            # Parse numbered list format
            classified = parse_numbered_response(response, num_segments)
            coverage = (classified / num_segments * 100) if num_segments > 0 else 0
        else:
            analysis = parse_json(response)
            classified, coverage = count_classified_segments(analysis, num_segments)

        print(f"  Result: {classified}/{num_segments} segments ({coverage:.1f}%) in {elapsed:.1f}s")

        results[name] = {
            "classified": classified,
            "total": num_segments,
            "coverage_pct": round(coverage, 1),
            "time_sec": round(elapsed, 1),
            "prompt_chars": len(prompt)
        }

    return results


def build_original_prompt(transcript_text: str) -> str:
    """Original prompt from test-llm-comparison.py for baseline comparison."""
    return f"""You are analyzing a daygame coaching video transcript.

TRANSCRIPT:
{transcript_text}

Analyze this video and provide a JSON response with:
1. Speaker identification (COACH, GIRL_1, etc.)
2. Content classification for each segment (intro, outro, commentary, infield, transition)
3. Topics discussed with values (e.g., "career": "medicine")
4. Techniques used

Respond with valid JSON:
{{
  "segments": [
    {{"id": 0, "content_type": "intro", "speaker_role": "COACH"}}
  ],
  "topics": [{{"type": "career", "value": "medicine", "segment_ids": [23]}}],
  "techniques": [{{"name": "direct_opener", "segment_ids": [5]}}]
}}"""


def parse_numbered_response(response: str, num_segments: int) -> int:
    """Parse numbered list response format."""
    classified = 0
    lines = response.strip().split('\n')
    for line in lines:
        # Look for patterns like "0: intro" or "0 - commentary"
        line = line.strip()
        if ':' in line or '-' in line:
            parts = line.replace('-', ':').split(':')
            if len(parts) >= 2:
                try:
                    idx = int(parts[0].strip())
                    if 0 <= idx < num_segments:
                        content_type = parts[1].strip().lower()
                        if any(ct in content_type for ct in CONTENT_TYPES):
                            classified += 1
                except:
                    pass
    return classified


# =============================================================================
# STRATEGY 2: Chunking
# =============================================================================

def run_chunking_strategy(segments: List[Dict], model: str, chunk_size: int = 25, overlap: int = 5) -> Dict[str, Any]:
    """Test processing segments in smaller chunks."""
    print("\n" + "="*60)
    print(f"STRATEGY 2: Chunking ({chunk_size} segments per chunk, {overlap} overlap)")
    print("="*60)

    num_segments = len(segments)
    all_classifications = {}
    total_time = 0
    chunks_processed = 0

    # Process in chunks
    start_idx = 0
    while start_idx < num_segments:
        end_idx = min(start_idx + chunk_size, num_segments)
        chunk = segments[start_idx:end_idx]
        chunk_text = format_segments(chunk, start_idx)

        prompt = f"""Classify these {len(chunk)} transcript segments.

SEGMENTS:
{chunk_text}

For EACH segment [{start_idx}] to [{end_idx - 1}], provide:
- id: segment number
- type: intro, outro, commentary, infield, or transition
- speaker: COACH, GIRL, or OTHER

Output JSON array with {len(chunk)} entries:
[{{"id": {start_idx}, "type": "...", "speaker": "..."}}, ...]"""

        print(f"\n  Chunk {chunks_processed + 1}: segments [{start_idx}-{end_idx-1}]...")
        response, elapsed = call_ollama(prompt, model, timeout=120)
        total_time += elapsed

        analysis = parse_json(response)
        if analysis:
            # Handle both array and object responses
            seg_list = analysis if isinstance(analysis, list) else analysis.get("segments", [])
            for seg in seg_list:
                seg_id = seg.get("id")
                if seg_id is not None and (seg.get("type") or seg.get("content_type")):
                    all_classifications[seg_id] = seg

        chunks_processed += 1

        # Move to next chunk with overlap
        start_idx = end_idx - overlap if end_idx < num_segments else num_segments

    classified = len(all_classifications)
    coverage = (classified / num_segments * 100) if num_segments > 0 else 0

    print(f"\n  Total: {classified}/{num_segments} segments ({coverage:.1f}%) in {total_time:.1f}s ({chunks_processed} chunks)")

    return {
        "classified": classified,
        "total": num_segments,
        "coverage_pct": round(coverage, 1),
        "time_sec": round(total_time, 1),
        "chunks_processed": chunks_processed,
        "chunk_size": chunk_size,
        "overlap": overlap
    }


# =============================================================================
# STRATEGY 3: Multi-Pass
# =============================================================================

def run_multipass_strategy(segments: List[Dict], model: str) -> Dict[str, Any]:
    """Test separate passes for each task."""
    print("\n" + "="*60)
    print("STRATEGY 3: Multi-Pass (separate prompts per task)")
    print("="*60)

    transcript_text = format_segments(segments)
    num_segments = len(segments)
    total_time = 0
    results = {}

    # Pass 1: Content type classification only
    print("\n  Pass 1: Content type classification...")
    prompt1 = f"""Classify each segment's content type.

TRANSCRIPT:
{transcript_text}

For EVERY segment [0] to [{num_segments - 1}], output the content type.
Types: intro, outro, commentary, infield, transition

Output JSON array with {num_segments} entries:
[
  {{"id": 0, "type": "intro"}},
  {{"id": 1, "type": "commentary"}},
  ...
]"""

    response1, elapsed1 = call_ollama(prompt1, model)
    total_time += elapsed1
    content_types = parse_json(response1)
    ct_list = content_types if isinstance(content_types, list) else (content_types.get("segments", []) if content_types else [])
    content_classified = len([s for s in ct_list if s.get("type") or s.get("content_type")])
    print(f"    → {content_classified}/{num_segments} classified in {elapsed1:.1f}s")

    # Pass 2: Speaker identification only
    print("\n  Pass 2: Speaker identification...")
    prompt2 = f"""Identify the speaker for each segment.

TRANSCRIPT:
{transcript_text}

For EVERY segment [0] to [{num_segments - 1}], identify the speaker.
Speakers: COACH (male instructor), GIRL (female being approached), OTHER

Output JSON array with {num_segments} entries:
[
  {{"id": 0, "speaker": "COACH"}},
  {{"id": 1, "speaker": "GIRL"}},
  ...
]"""

    response2, elapsed2 = call_ollama(prompt2, model)
    total_time += elapsed2
    speakers = parse_json(response2)
    sp_list = speakers if isinstance(speakers, list) else (speakers.get("segments", []) if speakers else [])
    speaker_classified = len([s for s in sp_list if s.get("speaker")])
    print(f"    → {speaker_classified}/{num_segments} classified in {elapsed2:.1f}s")

    # Pass 3: Topic extraction
    print("\n  Pass 3: Topic extraction...")
    prompt3 = f"""Extract topics discussed in this transcript.

TRANSCRIPT:
{transcript_text}

Find all topics mentioned with their specific values:
- career: what job/study (e.g., "medicine", "law student")
- origin: where from (e.g., "Brazil", "London")
- hobby: activities (e.g., "yoga", "painting")
- travel: places mentioned
- plans: upcoming activities

Output JSON:
{{
  "topics": [
    {{"type": "career", "value": "medicine", "segment_ids": [23, 24]}},
    {{"type": "origin", "value": "Brazil", "segment_ids": [15]}}
  ]
}}"""

    response3, elapsed3 = call_ollama(prompt3, model)
    total_time += elapsed3
    topics_data = parse_json(response3)
    topics_found = len(topics_data.get("topics", [])) if topics_data else 0
    topics_with_values = len([t for t in (topics_data.get("topics", []) if topics_data else []) if t.get("value")])
    print(f"    → {topics_found} topics found ({topics_with_values} with values) in {elapsed3:.1f}s")

    # Merge results
    merged_segments = {}
    for seg in ct_list:
        seg_id = seg.get("id")
        if seg_id is not None:
            merged_segments[seg_id] = {"id": seg_id, "type": seg.get("type") or seg.get("content_type")}

    for seg in sp_list:
        seg_id = seg.get("id")
        if seg_id is not None:
            if seg_id in merged_segments:
                merged_segments[seg_id]["speaker"] = seg.get("speaker")
            else:
                merged_segments[seg_id] = {"id": seg_id, "speaker": seg.get("speaker")}

    # Count segments with at least type classification
    classified = len([s for s in merged_segments.values() if s.get("type")])
    coverage = (classified / num_segments * 100) if num_segments > 0 else 0

    print(f"\n  Combined: {classified}/{num_segments} segments ({coverage:.1f}%) in {total_time:.1f}s total")

    return {
        "classified": classified,
        "total": num_segments,
        "coverage_pct": round(coverage, 1),
        "time_sec": round(total_time, 1),
        "pass1_content": content_classified,
        "pass2_speaker": speaker_classified,
        "pass3_topics": topics_found,
        "pass3_topics_with_values": topics_with_values
    }


# =============================================================================
# STRATEGY 4: Model Comparison
# =============================================================================

def check_available_models() -> List[str]:
    """Check which Ollama models are available."""
    try:
        result = subprocess.run(["ollama", "list"], capture_output=True, text=True)
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')[1:]  # Skip header
            return [line.split()[0] for line in lines if line.strip()]
    except:
        pass
    return []


def run_model_comparison(segments: List[Dict], models_to_test: List[str]) -> Dict[str, Any]:
    """Compare different models on the same task."""
    print("\n" + "="*60)
    print("STRATEGY 4: Model Comparison")
    print("="*60)

    transcript_text = format_segments(segments)
    num_segments = len(segments)

    # Use the explicit prompt for comparison
    prompt = build_explicit_prompt(transcript_text, num_segments)

    results = {}
    available = check_available_models()
    print(f"\n  Available models: {', '.join(available)}")

    for model in models_to_test:
        # Check if model is available (exact or prefix match)
        model_available = any(m.startswith(model.split(':')[0]) for m in available)
        if not model_available:
            print(f"\n  [{model}] Not available, skipping...")
            results[model] = {"error": "not_available"}
            continue

        print(f"\n  [{model}] Testing...")
        response, elapsed = call_ollama(prompt, model, timeout=600)

        analysis = parse_json(response)
        classified, coverage = count_classified_segments(analysis, num_segments)

        print(f"    → {classified}/{num_segments} ({coverage:.1f}%) in {elapsed:.1f}s")

        results[model] = {
            "classified": classified,
            "total": num_segments,
            "coverage_pct": round(coverage, 1),
            "time_sec": round(elapsed, 1)
        }

    return results


# =============================================================================
# Main
# =============================================================================

def generate_report(results: Dict[str, Any], video_name: str) -> str:
    """Generate markdown report of all test results."""
    date = datetime.now().strftime("%Y-%m-%d %H:%M")

    report = f"""# LLM Strategy Test Results

**Date:** {date}
**Video:** {video_name}
**Target:** ≥80% segment classification coverage

---

## Summary

"""

    # Find best result
    best_strategy = None
    best_coverage = 0

    for strategy, data in results.items():
        if isinstance(data, dict):
            cov = data.get("coverage_pct", 0)
            if cov > best_coverage:
                best_coverage = cov
                best_strategy = strategy

    if best_coverage >= 80:
        report += f"✅ **SUCCESS:** {best_strategy} achieved {best_coverage}% coverage\n\n"
    else:
        report += f"🔴 **BLOCKED:** Best coverage was {best_coverage}% ({best_strategy}), need ≥80%\n\n"

    report += "---\n\n"

    # Strategy 1: Prompt Variations
    if "prompt_variations" in results:
        report += "## Strategy 1: Prompt Variations\n\n"
        report += "| Prompt | Classified | Coverage | Time |\n"
        report += "|--------|------------|----------|------|\n"
        for name, data in results["prompt_variations"].items():
            report += f"| {name} | {data['classified']}/{data['total']} | **{data['coverage_pct']}%** | {data['time_sec']}s |\n"
        report += "\n"

    # Strategy 2: Chunking
    if "chunking" in results:
        data = results["chunking"]
        report += "## Strategy 2: Chunking\n\n"
        report += f"- **Chunk size:** {data.get('chunk_size', 'N/A')} segments\n"
        report += f"- **Overlap:** {data.get('overlap', 'N/A')} segments\n"
        report += f"- **Chunks processed:** {data.get('chunks_processed', 'N/A')}\n"
        report += f"- **Coverage:** {data['classified']}/{data['total']} (**{data['coverage_pct']}%**)\n"
        report += f"- **Time:** {data['time_sec']}s\n\n"

    # Strategy 3: Multi-Pass
    if "multipass" in results:
        data = results["multipass"]
        report += "## Strategy 3: Multi-Pass\n\n"
        report += f"- **Pass 1 (content):** {data.get('pass1_content', 'N/A')} classified\n"
        report += f"- **Pass 2 (speaker):** {data.get('pass2_speaker', 'N/A')} classified\n"
        report += f"- **Pass 3 (topics):** {data.get('pass3_topics', 'N/A')} found ({data.get('pass3_topics_with_values', 0)} with values)\n"
        report += f"- **Combined coverage:** {data['classified']}/{data['total']} (**{data['coverage_pct']}%**)\n"
        report += f"- **Total time:** {data['time_sec']}s\n\n"

    # Strategy 4: Model Comparison
    if "model_comparison" in results:
        report += "## Strategy 4: Model Comparison\n\n"
        report += "| Model | Classified | Coverage | Time |\n"
        report += "|-------|------------|----------|------|\n"
        for model, data in results["model_comparison"].items():
            if "error" in data:
                report += f"| {model} | - | N/A | (not available) |\n"
            else:
                report += f"| {model} | {data['classified']}/{data['total']} | **{data['coverage_pct']}%** | {data['time_sec']}s |\n"
        report += "\n"

    report += """---

## Next Steps

"""

    if best_coverage >= 80:
        report += """1. ✅ Coverage target met - proceed with pipeline implementation
2. Update PIPELINE.md with winning strategy
3. Implement chosen strategy in 05.analysis stage
"""
    else:
        report += """1. 🔴 Coverage still insufficient
2. Try larger models (70B) if available
3. Consider hybrid approach (chunking + multi-pass)
4. Investigate if transcript quality is the issue
5. Create human ground truth for validation
"""

    report += "\n---\n\n*Generated by test-llm-strategies.py*\n"

    return report


def main():
    parser = argparse.ArgumentParser(description="Test LLM strategies for segment classification")
    parser.add_argument("--strategy", choices=["all", "prompt", "chunk", "multipass", "models"],
                        default="all", help="Strategy to test")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Model to use")
    parser.add_argument("--chunk-size", type=int, default=25, help="Chunk size for chunking strategy")
    args = parser.parse_args()

    print("[test] LLM Strategy Comparison Test")
    print(f"[test] Model: {args.model}")
    print(f"[test] Strategy: {args.strategy}")
    print()

    # Load transcript
    transcript = load_transcript(TEST_VIDEO["source"], TEST_VIDEO["name"])
    if not transcript:
        print(f"[ERROR] Transcript not found for: {TEST_VIDEO['name']}")
        return 1

    segments = transcript.get("segments", [])
    print(f"[test] Loaded transcript: {len(segments)} segments")

    results = {}

    # Run requested strategies
    if args.strategy in ["all", "prompt"]:
        results["prompt_variations"] = run_prompt_strategy(segments, args.model)

    if args.strategy in ["all", "chunk"]:
        results["chunking"] = run_chunking_strategy(segments, args.model, args.chunk_size)

    if args.strategy in ["all", "multipass"]:
        results["multipass"] = run_multipass_strategy(segments, args.model)

    if args.strategy in ["all", "models"]:
        models_to_test = ["llama3.2", "llama3.1", "mistral", "mixtral:8x7b"]
        results["model_comparison"] = run_model_comparison(segments, models_to_test)

    # Generate report
    report = generate_report(results, TEST_VIDEO["name"])

    # Save report
    report_path = repo_root() / "docs" / "data" / "llm-strategy-test.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)

    print(f"\n{'='*60}")
    print(f"[test] Report saved to: {report_path}")

    # Save raw results
    results_path = repo_root() / "docs" / "data" / "llm-strategy-results.json"
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"[test] Raw results saved to: {results_path}")

    # Print summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)

    best_coverage = 0
    best_strategy = None

    for strategy, data in results.items():
        if isinstance(data, dict):
            if "coverage_pct" in data:
                cov = data["coverage_pct"]
                print(f"  {strategy}: {cov}%")
                if cov > best_coverage:
                    best_coverage = cov
                    best_strategy = strategy
            elif strategy == "prompt_variations":
                for name, pdata in data.items():
                    cov = pdata["coverage_pct"]
                    print(f"  {strategy}/{name}: {cov}%")
                    if cov > best_coverage:
                        best_coverage = cov
                        best_strategy = f"{strategy}/{name}"
            elif strategy == "model_comparison":
                for model, mdata in data.items():
                    if "coverage_pct" in mdata:
                        cov = mdata["coverage_pct"]
                        print(f"  {strategy}/{model}: {cov}%")
                        if cov > best_coverage:
                            best_coverage = cov
                            best_strategy = f"{strategy}/{model}"

    print()
    if best_coverage >= 80:
        print(f"✅ SUCCESS: {best_strategy} achieved {best_coverage}% coverage")
    else:
        print(f"🔴 BLOCKED: Best coverage was {best_coverage}% ({best_strategy})")
        print("   Target: ≥80%")

    return 0


if __name__ == "__main__":
    sys.exit(main())
