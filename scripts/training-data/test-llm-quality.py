#!/usr/bin/env python3
"""
scripts/training-data/test-llm-quality.py

LLM Quality Test for Training Data Pipeline v2

Tests ACCURACY not just coverage:
- Speaker identification accuracy against ground truth
- Topic extraction completeness and correctness
- Unknown topic discovery for taxonomy expansion
- Content type classification accuracy

Prioritizes accuracy over speed.

Usage:
    ./scripts/training-data/test-llm-quality.py [--model MODEL] [--verbose]
"""

import argparse
import json
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Test video
TEST_VIDEO = {
    "name": "Daygame Is This Simple!？ 🥳 (+Daygame Infield) [utuuVOXJunM]",
    "source": "daily_evolution"
}

# Ground truth for speaker identification (first 30 segments)
# Determined by conversation flow analysis
SPEAKER_GROUND_TRUTH = {
    0: "COACH",   # "Hey, how's we going?" - opener
    1: "GIRL",    # "Hello." - response
    2: "COACH",   # "Do you work at the La Vaca Street Bar?" - question
    3: "GIRL",    # "No." - answer
    4: "COACH",   # "Oh, you don't?" - follow-up
    5: "GIRL",    # "No." - answer
    6: "COACH",   # "Okay." - acknowledgment
    7: "COACH",   # "I saw you, I was like..." - longer explanation
    8: "GIRL",    # "No, I've always wanted to be a bartender" - answer
    9: "COACH",   # "What are you doing instead?" - question
    10: "COACH",  # "Are you like a dancer or something?" - question
    11: "COACH",  # "No, I'm just playing." - coach continues
    12: "GIRL",   # "I used to be though." - girl responds
    13: "COACH",  # "Hey, no shame." - coach response
    14: "GIRL",   # "No, like ballet." - clarification
    15: "COACH",  # "Oh, okay." - acknowledgment
    16: "COACH",  # "That kind of does." - coach continues
    17: "COACH",  # "Okay, nice." - acknowledgment
    18: "COACH",  # "Okay, nice." - continues
    19: "COACH",  # "I'm Erin." - introduction
    20: "GIRL",   # "Erin." - repeats name
    21: "COACH",  # "Nice to meet you." - pleasantry
    22: "GIRL",   # "Nice to meet you." - response
    23: "GIRL",   # "No, I don't." - answer
    24: "GIRL",   # "I'm actually just here for ACO." - explains
    25: "COACH",  # Acknowledgment
    26: "GIRL",   # About Austin
    27: "COACH",  # Question
    28: "GIRL",   # "Laredo" - answer
    29: "COACH",  # Response
}

# Ground truth for topics in first 40 segments
TOPIC_GROUND_TRUTH = {
    "career": {"values": ["bartender"], "approx_segments": [2, 8]},
    "hobby": {"values": ["ballet", "dancer"], "approx_segments": [10, 12, 14]},
    "origin": {"values": ["Laredo"], "approx_segments": [28]},
    "travel": {"values": ["Austin"], "approx_segments": [24, 26]},
    "event": {"values": ["ACO"], "approx_segments": [24]},  # Unknown category
    "media": {"values": ["Breaking Bad"], "approx_segments": [30, 34, 38]},  # Unknown
}

# Known topic categories
KNOWN_CATEGORIES = [
    "career", "origin", "hobby", "travel", "plans", "appearance",
    "personality", "age", "relationship", "fitness", "style"
]


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def load_transcript(source: str, video_name: str) -> Optional[Dict]:
    root = repo_root()
    for engine in ["whisperx", "whisper", "faster", ""]:
        suffix = f".{engine}" if engine else ""
        path = root / "data" / "02.transcribe" / source / video_name / f"{video_name}.full{suffix}.json"
        if path.exists():
            with open(path) as f:
                return json.load(f)
    return None


def call_ollama(prompt: str, model: str, timeout: int = 300) -> Tuple[str, float]:
    start = time.time()
    try:
        result = subprocess.run(
            ["ollama", "run", model],
            input=prompt,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return result.stdout.strip(), time.time() - start
    except Exception as e:
        print(f"  [ERROR] {e}")
        return "", time.time() - start


def parse_json_from_response(response: str) -> Optional[Dict]:
    """Extract JSON from LLM response."""
    # Try code blocks first
    if "```" in response:
        try:
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
            else:
                json_str = response.split("```")[1].split("```")[0].strip()
            return json.loads(json_str)
        except:
            pass

    # Try finding JSON object
    try:
        start = response.find("{")
        end = response.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(response[start:end])
    except:
        pass

    return None


def parse_speaker_output(response: str, num_segments: int) -> Dict[int, str]:
    """Parse speaker identification output."""
    results = {}
    for line in response.strip().split('\n'):
        # Match [N]: SPEAKER or N: SPEAKER
        match = re.search(r'\[?(\d+)\]?[:\s]+(\w+)', line)
        if match:
            idx = int(match.group(1))
            speaker = match.group(2).upper()
            if speaker in ["COACH", "GIRL"] and 0 <= idx < num_segments:
                results[idx] = speaker
    return results


def test_speaker_accuracy(segments: List[Dict], model: str, verbose: bool = False) -> Dict:
    """Test speaker identification accuracy."""
    print("\n" + "=" * 60)
    print("TEST 1: Speaker Identification Accuracy")
    print("=" * 60)

    # Use first 30 segments
    test_segments = segments[:30]
    lines = [f'[{i}]: {seg.get("text", "").strip()}' for i, seg in enumerate(test_segments)]
    transcript_text = '\n'.join(lines)

    prompt = f'''Identify the speaker for each segment in this daygame approach.

CONTEXT: A male COACH approaches a woman (GIRL) on the street.
IMPORTANT: Don't assume strict alternation - the coach may speak multiple lines in a row.

TRANSCRIPT:
{transcript_text}

For EACH segment [0] to [29], identify the speaker:
- COACH: initiates conversation, asks questions, makes longer statements, gives compliments
- GIRL: responds to questions, shorter answers, shares personal info when asked

Output format (one per line):
[0]: COACH
[1]: GIRL
...continue for all 30 segments...'''

    response, elapsed = call_ollama(prompt, model)
    parsed = parse_speaker_output(response, 30)

    if verbose:
        print(f"\nResponse:\n{response[:1000]}")

    # Calculate accuracy
    correct = 0
    errors = []
    for i in range(min(30, len(SPEAKER_GROUND_TRUTH))):
        if i in parsed and i in SPEAKER_GROUND_TRUTH:
            if parsed[i] == SPEAKER_GROUND_TRUTH[i]:
                correct += 1
            else:
                errors.append({
                    "segment": i,
                    "expected": SPEAKER_GROUND_TRUTH[i],
                    "got": parsed[i],
                    "text": test_segments[i].get("text", "")[:50]
                })

    coverage = len(parsed)
    accuracy = (correct / coverage * 100) if coverage > 0 else 0

    print(f"\nResults:")
    print(f"  Coverage: {coverage}/30 segments")
    print(f"  Accuracy: {correct}/{coverage} = {accuracy:.1f}%")
    print(f"  Time: {elapsed:.1f}s")

    if errors and verbose:
        print(f"\nErrors:")
        for e in errors[:5]:
            print(f"  [{e['segment']}] Expected {e['expected']}, got {e['got']}: '{e['text']}'")

    return {
        "coverage": coverage,
        "correct": correct,
        "accuracy": round(accuracy, 1),
        "time_sec": round(elapsed, 1),
        "errors": errors
    }


def test_topic_extraction(segments: List[Dict], model: str, verbose: bool = False) -> Dict:
    """Test topic extraction with unknown category discovery."""
    print("\n" + "=" * 60)
    print("TEST 2: Topic Extraction & Unknown Category Discovery")
    print("=" * 60)

    # Use first 40 segments
    test_segments = segments[:40]
    lines = [f'[{i}]: {seg.get("text", "").strip()}' for i, seg in enumerate(test_segments)]
    transcript_text = '\n'.join(lines)

    prompt = f'''Extract ALL topics discussed in this daygame approach conversation.

TRANSCRIPT:
{transcript_text}

KNOWN TOPIC CATEGORIES:
- career: job, profession, studies (value examples: "bartender", "doctor", "student")
- origin: where from, hometown, nationality (value examples: "Brazil", "Texas", "London")
- hobby: activities, interests, sports (value examples: "ballet", "yoga", "painting")
- travel: places visited or going to (value examples: "visiting Paris")
- plans: upcoming activities, events (value examples: "going to a concert")
- appearance: comments on looks, style
- personality: character traits observed
- age: age-related discussion
- relationship: dating status, partners

INSTRUCTIONS:
1. Extract EVERY topic mentioned with its specific VALUE (not just category)
2. If a topic doesn't clearly fit known categories, add to "unknown_topics"
3. For unknown topics, suggest a category name that could be added to our taxonomy
4. Include segment IDs where each topic appears

Output JSON:
{{
  "known_topics": [
    {{"category": "career", "value": "bartender", "segment_ids": [2, 8], "confidence": "high"}}
  ],
  "unknown_topics": [
    {{"suggested_category": "media", "value": "Breaking Bad", "segment_ids": [30], "reasoning": "TV show discussion - could be useful category for shared interests"}}
  ],
  "missed_topics": "List any topics you're uncertain about"
}}'''

    response, elapsed = call_ollama(prompt, model, timeout=180)
    data = parse_json_from_response(response)

    if verbose:
        print(f"\nResponse:\n{response[:1500]}")

    if not data:
        print("  [ERROR] Failed to parse JSON response")
        return {"error": "parse_failed", "time_sec": round(elapsed, 1)}

    known = data.get("known_topics", [])
    unknown = data.get("unknown_topics", [])

    # Check against ground truth
    found_categories = set()
    found_values = set()
    for t in known:
        cat = t.get("category", "").lower()
        val = t.get("value", "").lower()
        found_categories.add(cat)
        found_values.add(val)

    expected_categories = set(TOPIC_GROUND_TRUTH.keys()) & set(KNOWN_CATEGORIES)
    expected_values = set()
    for cat_data in TOPIC_GROUND_TRUTH.values():
        for v in cat_data.get("values", []):
            expected_values.add(v.lower())

    # Calculate metrics
    category_recall = len(found_categories & expected_categories) / len(expected_categories) if expected_categories else 0
    value_matches = sum(1 for v in expected_values if any(v in fv for fv in found_values))

    print(f"\nResults:")
    print(f"  Known topics found: {len(known)}")
    print(f"  Unknown topics discovered: {len(unknown)}")
    print(f"  Category recall: {category_recall:.0%}")
    print(f"  Time: {elapsed:.1f}s")

    print(f"\nKnown topics:")
    for t in known:
        print(f"  - {t.get('category')}: {t.get('value')} (segments: {t.get('segment_ids')})")

    print(f"\nUnknown topics (taxonomy expansion candidates):")
    for t in unknown:
        print(f"  - Suggested: '{t.get('suggested_category')}'")
        print(f"    Value: {t.get('value')}")
        print(f"    Reasoning: {t.get('reasoning', 'N/A')}")

    return {
        "known_topics": len(known),
        "unknown_topics": len(unknown),
        "category_recall": round(category_recall * 100, 1),
        "time_sec": round(elapsed, 1),
        "unknown_categories_suggested": [t.get("suggested_category") for t in unknown],
        "raw_topics": {"known": known, "unknown": unknown}
    }


def test_content_type(segments: List[Dict], model: str, verbose: bool = False) -> Dict:
    """Test content type classification."""
    print("\n" + "=" * 60)
    print("TEST 3: Content Type Classification")
    print("=" * 60)

    # Test last 20 segments (should include commentary/outro)
    test_segments = segments[-20:]
    start_idx = len(segments) - 20
    lines = [f'[{start_idx + i}]: {seg.get("text", "").strip()}' for i, seg in enumerate(test_segments)]
    transcript_text = '\n'.join(lines)

    prompt = f'''Classify the content type for each segment.

CONTEXT: This is from the end of a daygame coaching video.

TRANSCRIPT:
{transcript_text}

Content types:
- infield: actual approach conversation between coach and girl
- commentary: coach explaining something to camera/audience
- outro: closing remarks, subscribe reminders
- transition: moving between sections

For EACH segment, output:
[segment_id]: content_type

Example:
[120]: commentary
[121]: infield
...'''

    response, elapsed = call_ollama(prompt, model)

    if verbose:
        print(f"\nResponse:\n{response[:1000]}")

    # Parse results
    results = {}
    for line in response.strip().split('\n'):
        match = re.search(r'\[?(\d+)\]?[:\s]+(\w+)', line)
        if match:
            idx = int(match.group(1))
            ctype = match.group(2).lower()
            if ctype in ["infield", "commentary", "outro", "transition", "intro"]:
                results[idx] = ctype

    coverage = len(results)

    # Count types
    type_counts = {}
    for t in results.values():
        type_counts[t] = type_counts.get(t, 0) + 1

    print(f"\nResults:")
    print(f"  Coverage: {coverage}/20 segments")
    print(f"  Type distribution: {type_counts}")
    print(f"  Time: {elapsed:.1f}s")

    # We expect the end of video to have commentary (coach talking to camera)
    commentary_count = type_counts.get("commentary", 0)
    has_expected_commentary = commentary_count >= 5  # Expect at least 5 commentary segments at end

    return {
        "coverage": coverage,
        "type_counts": type_counts,
        "has_expected_commentary": has_expected_commentary,
        "time_sec": round(elapsed, 1)
    }


def generate_report(results: Dict, model: str) -> str:
    """Generate quality test report."""
    date = datetime.now().strftime("%Y-%m-%d %H:%M")

    report = f"""# LLM Quality Test Results

**Date:** {date}
**Model:** {model}

---

## Summary

"""

    # Speaker accuracy
    speaker = results.get("speaker", {})
    speaker_acc = speaker.get("accuracy", 0)
    if speaker_acc >= 80:
        report += f"✅ **Speaker identification:** {speaker_acc}% accuracy (target: ≥80%)\n"
    else:
        report += f"🔴 **Speaker identification:** {speaker_acc}% accuracy (target: ≥80%)\n"

    # Topic extraction
    topics = results.get("topics", {})
    topic_recall = topics.get("category_recall", 0)
    unknown_count = topics.get("unknown_topics", 0)
    report += f"✅ **Topic extraction:** {topic_recall}% category recall, {unknown_count} unknown categories discovered\n"

    # Content type
    content = results.get("content_type", {})
    report += f"✅ **Content classification:** {content.get('coverage', 0)}/20 segments classified\n"

    report += """
---

## Detailed Results

### Speaker Identification
"""
    report += f"- Coverage: {speaker.get('coverage', 0)}/30 segments\n"
    report += f"- Accuracy: {speaker.get('correct', 0)}/{speaker.get('coverage', 0)} = **{speaker_acc}%**\n"
    report += f"- Time: {speaker.get('time_sec', 0)}s\n"

    if speaker.get("errors"):
        report += "\nErrors (first 5):\n"
        for e in speaker["errors"][:5]:
            report += f"- [{e['segment']}] Expected {e['expected']}, got {e['got']}\n"

    report += """
### Topic Extraction
"""
    report += f"- Known topics found: {topics.get('known_topics', 0)}\n"
    report += f"- Unknown topics discovered: {unknown_count}\n"
    report += f"- Category recall: {topic_recall}%\n"

    if topics.get("unknown_categories_suggested"):
        report += "\n**Suggested new categories (for taxonomy expansion):**\n"
        for cat in topics["unknown_categories_suggested"]:
            report += f"- `{cat}`\n"

    report += """
### Content Type Classification
"""
    report += f"- Coverage: {content.get('coverage', 0)}/20 segments\n"
    report += f"- Distribution: {content.get('type_counts', {})}\n"
    report += f"- Has expected commentary: {content.get('has_expected_commentary', False)}\n"

    report += """
---

## Recommendations

"""
    if speaker_acc >= 80 and topic_recall >= 70:
        report += f"✅ **{model} is suitable for production use**\n\n"
        report += "Next steps:\n"
        report += "1. Implement Stage 05 with this model\n"
        report += "2. Add discovered categories to taxonomy after review\n"
        report += "3. Test on Video B (longer video) for scale validation\n"
    else:
        report += "🔴 **Additional tuning required**\n\n"
        if speaker_acc < 80:
            report += f"- Speaker accuracy ({speaker_acc}%) below target (80%)\n"
        if topic_recall < 70:
            report += f"- Topic recall ({topic_recall}%) needs improvement\n"

    report += "\n---\n\n*Generated by test-llm-quality.py*\n"

    return report


def main():
    parser = argparse.ArgumentParser(description="Test LLM quality for segment analysis")
    parser.add_argument("--model", default="llama3.1", help="Model to test (default: llama3.1)")
    parser.add_argument("--verbose", action="store_true", help="Show detailed output")
    args = parser.parse_args()

    print(f"[quality-test] LLM Quality Test")
    print(f"[quality-test] Model: {args.model}")
    print(f"[quality-test] Focus: ACCURACY over speed")
    print()

    # Load transcript
    transcript = load_transcript(TEST_VIDEO["source"], TEST_VIDEO["name"])
    if not transcript:
        print(f"[ERROR] Transcript not found")
        return 1

    segments = transcript.get("segments", [])
    print(f"[quality-test] Loaded: {len(segments)} segments")

    results = {}

    # Run tests
    results["speaker"] = test_speaker_accuracy(segments, args.model, args.verbose)
    results["topics"] = test_topic_extraction(segments, args.model, args.verbose)
    results["content_type"] = test_content_type(segments, args.model, args.verbose)

    # Generate report
    report = generate_report(results, args.model)

    # Save report
    root = repo_root()
    report_path = root / "docs" / "data" / "llm-quality-test.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w") as f:
        f.write(report)

    # Save raw results
    results_path = root / "docs" / "data" / "llm-quality-results.json"
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2, default=str)

    print("\n" + "=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)
    print(f"Speaker accuracy: {results['speaker'].get('accuracy', 0)}%")
    print(f"Topic category recall: {results['topics'].get('category_recall', 0)}%")
    print(f"Unknown categories discovered: {results['topics'].get('unknown_topics', 0)}")
    print()
    print(f"Report: {report_path}")
    print(f"Results: {results_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
