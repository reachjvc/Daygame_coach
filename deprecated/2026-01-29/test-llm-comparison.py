#!/usr/bin/env python3
"""
scripts/training-data/test-llm-comparison.py

LLM Model Comparison Test for Training Data Pipeline v2

Compares llama3.2 vs llama3.1 for semantic analysis quality.
Tests processing time, memory usage, and output quality.

Usage:
    ./scripts/training-data/test-llm-comparison.py
"""

import json
import os
import subprocess
import time
import tracemalloc
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Test videos configuration
TEST_VIDEOS = {
    "video_a": {
        "name": "Daygame Is This Simple!？ 🥳 (+Daygame Infield) [utuuVOXJunM]",
        "source": "daily_evolution",
        "duration_min": 5.1,
        "description": "Short video (~5 min) with simple structure and infield"
    },
    "video_b": {
        "name": "Alpha Chad Picks Up A Girl + 2 Daygame Infields [ulw-Zd06RM0]",
        "source": "daily_evolution",
        "duration_min": 20.7,
        "description": "Medium video (~20 min) with multiple approaches"
    }
}

MODELS = ["llama3.2", "llama3.1"]

# Technique taxonomy for validation
TECHNIQUES = {
    "openers": ["direct_opener", "indirect_opener", "situational_opener", "observation_opener"],
    "attraction": ["push_pull", "tease", "cold_read", "role_play", "disqualification", "neg", "dhv", "preselection"],
    "connection": ["qualification", "statement_of_intent", "grounding", "storytelling", "vulnerability", "callback_humor"],
    "physical": ["kino", "proximity", "eye_contact", "false_time_constraint", "compliance_test"],
    "closing": ["number_close", "instagram_close", "soft_close", "assumptive_close", "instant_date", "bounce"],
    "mechanics": ["front_stop", "side_stop", "seated_approach"]
}

ALL_TECHNIQUES = []
for category in TECHNIQUES.values():
    ALL_TECHNIQUES.extend(category)

TOPIC_TYPES = ["career", "origin", "hobby", "travel", "appearance", "personality", "age", "plans", "relationship", "fitness", "style"]


def repo_root() -> Path:
    """Get repository root directory."""
    return Path(__file__).resolve().parents[2]


def load_transcript(source: str, video_name: str) -> Optional[Dict[str, Any]]:
    """Load transcript from the data directory."""
    root = repo_root()

    # Try whisperx first, then other engines
    for engine in ["whisperx", "whisper", "faster"]:
        transcript_path = root / "data" / "02.transcribe" / source / video_name / f"{video_name}.full.{engine}.json"
        if transcript_path.exists():
            print(f"[test] Loading transcript: {transcript_path.name}")
            with open(transcript_path, "r", encoding="utf-8") as f:
                return json.load(f)

    # Try the primary transcript
    transcript_path = root / "data" / "02.transcribe" / source / video_name / f"{video_name}.full.json"
    if transcript_path.exists():
        print(f"[test] Loading transcript: {transcript_path.name}")
        with open(transcript_path, "r", encoding="utf-8") as f:
            return json.load(f)

    return None


def format_transcript_for_llm(transcript: Dict[str, Any]) -> str:
    """Format transcript text with segment IDs for LLM analysis."""
    segments = transcript.get("segments", [])
    lines = []
    for i, seg in enumerate(segments):
        text = seg.get("text", "").strip()
        start = seg.get("start", 0)
        speaker = seg.get("speaker", "UNKNOWN")
        if text:
            lines.append(f"[{i}] {start:.1f}s {speaker}: {text}")
    return "\n".join(lines)


def build_analysis_prompt(transcript_text: str) -> str:
    """Build the semantic analysis prompt."""
    return f"""You are analyzing a daygame coaching video transcript.
The video contains approaches where a coach talks to women on the street.

TRANSCRIPT:
{transcript_text}

Analyze this video and provide a comprehensive JSON response with:

1. SPEAKER IDENTIFICATION
   - Rename SPEAKER_00, SPEAKER_01, etc. to COACH, GIRL_1, GIRL_2, STUDENT_1, etc.
   - Use conversation patterns to identify speakers (who initiates = likely coach)

2. CONVERSATION BOUNDARIES
   - Identify each distinct approach/conversation
   - Mark where one conversation ends and another begins
   - Include commentary sections (coach talking to camera)

3. CONTENT CLASSIFICATION
   For each segment, classify as:
   - "intro" (channel intro, greeting viewers)
   - "outro" (subscribe reminders, end cards)
   - "commentary" (coach explaining to camera)
   - "infield" (actual approach conversation)
   - "transition" (moving between approaches)

4. PHASE DETECTION (for infield segments)
   - "opener" (initial approach)
   - "hook" (girl shows interest)
   - "vibe" (extended conversation)
   - "close" (getting contact/date)

5. TONALITY (for coach segments)
   - "playful", "confident", "warm", "direct", "flirty", "grounded", "neutral"

6. TOPIC EXTRACTION - CRITICAL: Include VALUES not just labels!
   Examples:
   - {{"type": "career", "value": "medicine", "segment_ids": [23, 24, 25]}}
   - {{"type": "origin", "value": "Brazil", "segment_ids": [15, 16]}}
   - {{"type": "hobby", "value": "painting", "segment_ids": [30, 31, 32]}}

   Topic types: career, origin, hobby, travel, appearance, personality, age, plans, relationship, fitness, style

7. TECHNIQUE DETECTION
   For each technique used, provide:
   - Technique name from: {json.dumps(ALL_TECHNIQUES[:20])}... (and similar pickup techniques)
   - Segment IDs where it was used
   - Brief explanation of how it was executed

8. INTERACTIONS
   Group segments into complete interactions with:
   - Start/end segment IDs
   - Outcome (number, instagram, instant_date, rejected, blowout, unknown)
   - Topics discussed (with values)
   - Techniques used

Respond with valid JSON matching this schema:
{{
  "speakers": {{
    "SPEAKER_00": {{"role": "COACH", "confidence": 0.95}},
    "SPEAKER_01": {{"role": "GIRL_1", "confidence": 0.88}}
  }},
  "conversations": [
    {{
      "id": 1,
      "type": "approach",
      "start_segment": 5,
      "end_segment": 28,
      "description": "Description of this approach"
    }}
  ],
  "segments": [
    {{
      "id": 0,
      "content_type": "intro",
      "phase": null,
      "speaker_role": "COACH",
      "tonality": "confident"
    }}
  ],
  "topics": [
    {{
      "type": "career",
      "value": "medicine",
      "segment_ids": [23, 24, 25],
      "conversation_id": 1
    }}
  ],
  "techniques": [
    {{
      "name": "direct_opener",
      "segment_ids": [5],
      "conversation_id": 1,
      "explanation": "Coach opens with direct compliment"
    }}
  ],
  "interactions": [
    {{
      "id": 1,
      "conversation_id": 1,
      "start_segment": 5,
      "end_segment": 28,
      "outcome": "number",
      "topics": [{{"type": "career", "value": "medicine"}}],
      "techniques": ["direct_opener", "push_pull"]
    }}
  ]
}}

IMPORTANT: Return ONLY valid JSON, no other text."""


def call_ollama(prompt: str, model: str) -> Tuple[str, float, float]:
    """
    Call Ollama with the given prompt and model.
    Returns: (response_text, processing_time_sec, peak_memory_mb)
    """
    tracemalloc.start()
    start_time = time.time()

    try:
        result = subprocess.run(
            ["ollama", "run", model],
            input=prompt,
            capture_output=True,
            text=True,
            timeout=600  # 10 minute timeout
        )

        processing_time = time.time() - start_time
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        peak_memory_mb = peak / 1024 / 1024

        if result.returncode != 0:
            print(f"[test] ERROR: Ollama returned {result.returncode}")
            print(f"[test] stderr: {result.stderr}")
            return "", processing_time, peak_memory_mb

        return result.stdout.strip(), processing_time, peak_memory_mb

    except subprocess.TimeoutExpired:
        tracemalloc.stop()
        print(f"[test] ERROR: Ollama timed out after 10 minutes")
        return "", time.time() - start_time, 0
    except Exception as e:
        tracemalloc.stop()
        print(f"[test] ERROR: {type(e).__name__}: {e}")
        return "", time.time() - start_time, 0


def parse_json_response(response: str) -> Optional[Dict[str, Any]]:
    """Parse JSON from LLM response, handling common issues."""
    # Try direct parse first
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        pass

    # Try to extract JSON from markdown code blocks
    if "```json" in response:
        try:
            json_str = response.split("```json")[1].split("```")[0].strip()
            return json.loads(json_str)
        except (IndexError, json.JSONDecodeError):
            pass

    if "```" in response:
        try:
            json_str = response.split("```")[1].split("```")[0].strip()
            return json.loads(json_str)
        except (IndexError, json.JSONDecodeError):
            pass

    # Try to find JSON object
    try:
        start = response.find("{")
        end = response.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(response[start:end])
    except json.JSONDecodeError:
        pass

    return None


def evaluate_output(analysis: Optional[Dict[str, Any]], transcript: Dict[str, Any]) -> Dict[str, Any]:
    """Evaluate the quality of the LLM output."""
    if analysis is None:
        return {
            "valid_json": False,
            "conversations_found": 0,
            "topics_with_values": 0,
            "topics_without_values": 0,
            "techniques_identified": 0,
            "valid_techniques": 0,
            "speaker_mappings": 0,
            "segments_classified": 0,
            "interactions_found": 0,
            "quality_notes": ["Failed to parse JSON response"]
        }

    num_segments = len(transcript.get("segments", []))

    # Count conversations
    conversations = analysis.get("conversations", [])

    # Count topics with values
    topics = analysis.get("topics", [])
    topics_with_values = sum(1 for t in topics if t.get("value") and t.get("type"))
    topics_without_values = sum(1 for t in topics if not t.get("value") and t.get("type"))

    # Count techniques
    techniques = analysis.get("techniques", [])
    valid_techniques = sum(1 for t in techniques if t.get("name", "").lower() in [x.lower() for x in ALL_TECHNIQUES])

    # Count speaker mappings
    speakers = analysis.get("speakers", {})
    speaker_mappings = sum(1 for s in speakers.values() if s.get("role"))

    # Count classified segments
    segments = analysis.get("segments", [])
    segments_classified = sum(1 for s in segments if s.get("content_type"))

    # Count interactions
    interactions = analysis.get("interactions", [])

    # Quality notes
    notes = []
    if topics_without_values > 0:
        notes.append(f"{topics_without_values} topics missing values")
    if len(techniques) > 0 and valid_techniques < len(techniques) * 0.5:
        notes.append(f"Many unrecognized techniques ({len(techniques) - valid_techniques}/{len(techniques)})")
    if segments_classified < num_segments * 0.5:
        notes.append(f"Only {segments_classified}/{num_segments} segments classified")
    if not conversations:
        notes.append("No conversations identified")
    if not interactions:
        notes.append("No interactions structured")

    return {
        "valid_json": True,
        "conversations_found": len(conversations),
        "topics_with_values": topics_with_values,
        "topics_without_values": topics_without_values,
        "techniques_identified": len(techniques),
        "valid_techniques": valid_techniques,
        "speaker_mappings": speaker_mappings,
        "segments_classified": segments_classified,
        "segments_total": num_segments,
        "interactions_found": len(interactions),
        "quality_notes": notes if notes else ["Output looks good"]
    }


def run_comparison_test(video_key: str, video_config: Dict[str, Any]) -> Dict[str, Any]:
    """Run comparison test on a single video."""
    print(f"\n{'='*60}")
    print(f"Testing: {video_config['name']}")
    print(f"Description: {video_config['description']}")
    print(f"{'='*60}")

    # Load transcript
    transcript = load_transcript(video_config["source"], video_config["name"])
    if transcript is None:
        return {
            "video": video_config["name"],
            "error": "Transcript not found",
            "results": {}
        }

    transcript_text = format_transcript_for_llm(transcript)
    prompt = build_analysis_prompt(transcript_text)

    print(f"[test] Transcript loaded: {len(transcript.get('segments', []))} segments")
    print(f"[test] Prompt length: {len(prompt)} characters")

    results = {}

    for model in MODELS:
        print(f"\n[test] Running {model}...")

        response, processing_time, peak_memory = call_ollama(prompt, model)

        print(f"[test] {model}: {processing_time:.1f}s, {peak_memory:.1f}MB peak memory")

        # Parse response
        analysis = parse_json_response(response)

        # Evaluate output
        evaluation = evaluate_output(analysis, transcript)

        results[model] = {
            "processing_time_sec": round(processing_time, 1),
            "processing_time_min": round(processing_time / 60, 2),
            "peak_memory_mb": round(peak_memory, 1),
            "response_length": len(response),
            "evaluation": evaluation,
            "raw_response": response[:2000] + "..." if len(response) > 2000 else response
        }

        # Save raw output for comparison
        output_dir = repo_root() / "docs" / "data" / "llm-comparison-outputs"
        output_dir.mkdir(parents=True, exist_ok=True)

        output_file = output_dir / f"{video_key}_{model.replace('.', '_')}.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump({
                "video": video_config["name"],
                "model": model,
                "prompt_length": len(prompt),
                "response": response,
                "analysis": analysis,
                "evaluation": evaluation
            }, f, indent=2, ensure_ascii=False)
        print(f"[test] Saved output to: {output_file.name}")

    return {
        "video": video_config["name"],
        "duration_min": video_config["duration_min"],
        "transcript_segments": len(transcript.get("segments", [])),
        "results": results
    }


def generate_report(all_results: Dict[str, Any]) -> str:
    """Generate the markdown comparison report."""
    date = datetime.now().strftime("%Y-%m-%d")

    report = f"""# LLM Comparison Test Results

## Test Date: {date}

## Summary

This test compares **llama3.2** vs **llama3.1** for semantic analysis of daygame coaching videos.

"""

    for video_key, result in all_results.items():
        if "error" in result:
            report += f"""## {video_key.replace("_", " ").title()}: {result['video']}

**Error:** {result['error']}

---

"""
            continue

        video_name = result["video"]
        duration = result["duration_min"]
        segments = result["transcript_segments"]

        report += f"""## {video_key.replace("_", " ").title()}: {video_name} (~{duration:.0f} min)

**Transcript:** {segments} segments

"""

        # Build comparison table
        report += "| Metric | llama3.2 | llama3.1 |\n"
        report += "|--------|----------|----------|\n"

        r32 = result["results"].get("llama3.2", {})
        r31 = result["results"].get("llama3.1", {})

        e32 = r32.get("evaluation", {})
        e31 = r31.get("evaluation", {})

        report += f"| Processing time | {r32.get('processing_time_min', 'N/A')} min | {r31.get('processing_time_min', 'N/A')} min |\n"
        report += f"| Memory peak | {r32.get('peak_memory_mb', 'N/A')} MB | {r31.get('peak_memory_mb', 'N/A')} MB |\n"
        report += f"| Valid JSON | {'Yes' if e32.get('valid_json') else 'No'} | {'Yes' if e31.get('valid_json') else 'No'} |\n"
        report += f"| Conversations found | {e32.get('conversations_found', 'N/A')} | {e31.get('conversations_found', 'N/A')} |\n"
        report += f"| Topics with values | {e32.get('topics_with_values', 'N/A')} | {e31.get('topics_with_values', 'N/A')} |\n"
        report += f"| Techniques identified | {e32.get('techniques_identified', 'N/A')} (valid: {e32.get('valid_techniques', 'N/A')}) | {e31.get('techniques_identified', 'N/A')} (valid: {e31.get('valid_techniques', 'N/A')}) |\n"
        report += f"| Speaker mappings | {e32.get('speaker_mappings', 'N/A')} | {e31.get('speaker_mappings', 'N/A')} |\n"
        report += f"| Segments classified | {e32.get('segments_classified', 'N/A')}/{e32.get('segments_total', 'N/A')} | {e31.get('segments_classified', 'N/A')}/{e31.get('segments_total', 'N/A')} |\n"
        report += f"| Interactions | {e32.get('interactions_found', 'N/A')} | {e31.get('interactions_found', 'N/A')} |\n"

        report += "\n### Quality Notes\n"

        notes_32 = e32.get("quality_notes", ["N/A"])
        notes_31 = e31.get("quality_notes", ["N/A"])

        report += f"- **llama3.2:** {'; '.join(notes_32)}\n"
        report += f"- **llama3.1:** {'; '.join(notes_31)}\n"

        report += "\n---\n\n"

    # Overall recommendation
    report += """## Recommendation

Based on the above results:

**[TO BE FILLED AFTER MANUAL REVIEW]**

Consider:
1. Processing time vs output quality tradeoff
2. Accuracy of topic value extraction (critical for RAG)
3. Technique identification accuracy
4. JSON format consistency

---

*Generated by test-llm-comparison.py*
"""

    return report


def main():
    """Main entry point."""
    print("[test] LLM Model Comparison Test")
    print("[test] Comparing llama3.2 vs llama3.1 for semantic analysis")
    print()

    # Check which videos have transcripts
    root = repo_root()
    available_videos = {}

    for key, config in TEST_VIDEOS.items():
        transcript_dir = root / "data" / "02.transcribe" / config["source"] / config["name"]
        if transcript_dir.exists():
            available_videos[key] = config
            print(f"[test] ✓ {key}: {config['name']}")
        else:
            print(f"[test] ✗ {key}: {config['name']} (not transcribed)")

    if not available_videos:
        print("\n[test] ERROR: No test videos have transcripts available.")
        print("[test] Please run transcription first:")
        for key, config in TEST_VIDEOS.items():
            print(f'  ./scripts/training-data/02.transcribe "{config["source"]}" "https://www.youtube.com/watch?v={config["name"].split("[")[-1].rstrip("]")}"')
        return 1

    print(f"\n[test] Running comparison on {len(available_videos)} video(s)...")

    all_results = {}
    for key, config in available_videos.items():
        all_results[key] = run_comparison_test(key, config)

    # Generate report
    report = generate_report(all_results)

    # Save report
    report_path = root / "docs" / "data" / "llm-comparison-test.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)

    print(f"\n[test] Report saved to: {report_path}")
    print("[test] Raw outputs saved to: docs/data/llm-comparison-outputs/")
    print("\n[test] DONE - Please review results and update recommendation in the report.")

    return 0


if __name__ == "__main__":
    exit(main())
