**Status:** COMPLETE
**Updated:** 05-02-2026

# Task: Add Intra-Segment Hallucination Detection (2 Layers)

## Background

Stage 02 (transcribe) has a hallucination detector that catches repeated **sentences across segments** (e.g., "Thank you." repeated 10 times as separate segments). But it misses repeated **words within a single segment**.

**Real example found in test data:**
- Video: "How To Turn Small Talk into Deep Connection [DPieYj7nji0]"
- Stage 02 output segment 183 (570.14s - 578.92s):
  ```
  "what was missing are you charging right now yeah yeah yeah yeah yeah yeah yeah yeah yeah yeah"
  ```
- Word timestamps show the 3rd "yeah" spans 3.2 seconds (573.76→576.98) — Whisper filled a gap with "yeah"
- This was **not flagged** because the detector only compares whole segment texts across segments
- The hallucination survives unchanged through stages 03→04→05

## Layer 1: Stage 02 — Deterministic intra-segment word repetition check

### File: `scripts/training-data/02.transcribe`

### What to add

Add a new function `_detect_intra_segment_repetition()` near the existing `_detect_repetition_hallucination()` (line 131).

**Logic:**
1. For each segment, examine the `words` array (word-level timestamps already exist in every segment)
2. Count consecutive runs of the **same word** (case-insensitive)
3. If any word appears **5+ times consecutively**, flag it
4. Also flag if any single word has duration > 2.0 seconds (suspicious gap-fill)
5. Return a list of findings (one per affected segment), each with:
   - `segment_index`: which segment
   - `repeated_word`: the word
   - `count`: consecutive occurrences
   - `time_range`: [start, end] of the repeated run
   - `longest_word_duration`: max duration of a single instance

**Signature:**
```python
def _detect_intra_segment_repetition(
    segments: List[Dict[str, Any]],
    min_word_repeats: int = 5,
    suspicious_word_duration: float = 2.0,
) -> List[Dict[str, Any]]:
```

### Integration points

1. **Call it** at line ~560, right after the existing `_detect_repetition_hallucination()` call:
   ```python
   # existing line 560:
   hallucination = _detect_repetition_hallucination(segments, min_repeats=3)
   # ADD:
   intra_seg_issues = _detect_intra_segment_repetition(segments)
   if intra_seg_issues:
       log(f"[02.transcribe] FLAGGED: Intra-segment word repetition detected!")
       for issue in intra_seg_issues:
           log(f"[02.transcribe]   Seg {issue['segment_index']}: "
               f"\"{issue['repeated_word']}\" x{issue['count']} "
               f"({issue['time_range'][0]:.1f}s-{issue['time_range'][1]:.1f}s)")
   ```

2. **Feed into `_classify_transcript_quality()`**: Extend the function signature to accept `intra_seg_issues` as an optional parameter. Add a WARNING severity rule:
   - If intra_seg_issues is non-empty → severity = "WARNING" (if not already worse)
   - Reason string: `"intra-segment word repetition in {N} segment(s): \"{word}\" x{count}"`

3. **Include in return value** at line ~587: Add `"intra_segment_repetition": intra_seg_issues` alongside the existing `"hallucination"` key

4. **Include in `.flagged.json` entries** around line ~657-672: When intra_seg_issues exist, add them to the flag entry:
   ```python
   if intra_seg_issues:
       flag_entry["reason"] = flag_entry.get("reason", "intra_segment_repetition")
       flag_entry["intra_segment_issues"] = intra_seg_issues
   ```

### Test: verify against known data

After implementing, run on the test data to verify it catches the known case:
```bash
./scripts/training-data/02.transcribe --audio \
  "data/test/r2/01.download/r2batch/How To Turn Small Talk into Deep Connection (Daygame Coaching Infield) [DPieYj7nji0]/How To Turn Small Talk into Deep Connection (Daygame Coaching Infield) [DPieYj7nji0].audio.asr.raw16k.wav" \
  --out /tmp/test-hallucination-check.full.json
```

The output should show a WARNING for segment 183 with "yeah" x10.

BUT: the 02.transcribe step is slow (requires Whisper model loading). A faster verification is to write a small unit test or standalone script that:
1. Reads the existing `data/test/r2/02.transcribe/How To Turn Small Talk.../...full.json`
2. Calls `_detect_intra_segment_repetition()` on its segments
3. Asserts it finds the "yeah" x10 issue in segment 183

---

## Layer 2: Stage 07 — LLM-based transcript artifact detection

### File: `scripts/training-data/07.content`

### What to add

Add a `transcript_artifacts` field to the LLM prompt output, asking Claude to flag segments with suspected Whisper hallucination artifacts.

### Prompt changes

In **both** `build_infield_prompt()` (line 525) and `build_talking_head_prompt()` (line 694):

1. Add this instruction block to the `=== ANALYSIS INSTRUCTIONS ===` section (after the existing unlisted_concepts instruction):

```
TRANSCRIPT QUALITY: Flag any segments that appear to contain Whisper transcription artifacts:
- Repeated filler words that don't fit conversational context (e.g., "yeah yeah yeah yeah yeah" filling a gap)
- Nonsensical repeated phrases
- Text that appears to be hallucinated rather than real speech
Report in "transcript_artifacts" at the TOP LEVEL of your JSON response (not per-enrichment).
Format: [{"segment_index": N, "type": "word_repetition"|"nonsense"|"language_confusion", "description": "brief explanation"}]
Return empty array [] if no artifacts detected. Do NOT flag natural speech patterns (e.g., someone genuinely saying "yes, yes" twice).
```

2. Add `"transcript_artifacts": []` to the JSON example in each prompt.

### Schema/validation changes

1. **No schema file change needed** — Stage 07 doesn't have its own schema file (it uses inline validation in `validate_enrichment_output()`). Just ensure the output parser preserves the field.

2. In `validate_enrichment_output()` (line 204), add a check:
   ```python
   # --- N. Transcript artifact reporting ---
   artifacts = output.get("transcript_artifacts", [])
   if artifacts:
       for artifact in artifacts:
           results.append(ValidationResult(
               "warning", "transcript_artifact",
               f"Seg {artifact.get('segment_index', '?')}: {artifact.get('type', '?')} — "
               f"{artifact.get('description', 'no description')}"
           ))
   ```
   This makes artifacts appear in the `.validation.json` output for human review.

3. In the output assembly code (around line 860-900 in the function that builds the final output dict), make sure `transcript_artifacts` from the LLM response is included in the output:
   ```python
   output["transcript_artifacts"] = parsed_enrichments_response.get("transcript_artifacts", [])
   ```
   Note: the LLM response parser (`parse_enrichment_response()` at line 778) expects a JSON array of enrichments. The `transcript_artifacts` field is at the **top level**, so the prompt output format needs to change from a bare array `[...]` to a wrapper object `{"enrichments": [...], "transcript_artifacts": [...]}`. Update the prompt's output format instruction accordingly, AND update `parse_enrichment_response()` to handle both formats (bare array for backward compat, or wrapper object).

### Prompt output format change

Change the prompt from:
```
OUTPUT FORMAT: Return a JSON array containing one object for each approach conversation...
```
To:
```
OUTPUT FORMAT: Return a JSON object with two keys:
- "enrichments": Array containing one object for each approach/commentary/section
- "transcript_artifacts": Array of transcript quality issues (empty [] if none)
Output ONLY valid JSON.
```

Update the example accordingly — wrap the existing array in `{"enrichments": [...], "transcript_artifacts": []}`.

### Parser change

In `parse_enrichment_response()` (line 778), handle both formats:
```python
parsed = json.loads(response_text)
if isinstance(parsed, dict):
    enrichments = parsed.get("enrichments", [])
    transcript_artifacts = parsed.get("transcript_artifacts", [])
elif isinstance(parsed, list):
    enrichments = parsed  # backward compat
    transcript_artifacts = []
```
Return both (or store artifacts on a module-level variable, or return a tuple).

---

## Verification

After implementing both layers, verify with the test data:

1. **Layer 1 check**: The existing 02.transcribe output JSON at `data/test/r2/02.transcribe/How To Turn Small Talk.../...full.json` should be detected by `_detect_intra_segment_repetition()`. Write a quick test.

2. **Layer 2 check**: When Stage 07 is eventually run on the test batch, the "yeah" x10 in segment 183 should appear in `transcript_artifacts` in the enriched output.

3. **False positive check**: Run Layer 1 against ALL 12 non-flagged videos. Expected: only the "How To Turn Small Talk" video should be flagged. The "Yes. Yes. Yes." in other videos should NOT trigger (those are across segments, max 3 consecutive within a segment).

## Important notes

- Do NOT change the behavior for CRITICAL/WARNING severity thresholds in stage 02. Intra-segment repetition should only produce WARNING, never CRITICAL (it's a small portion of any transcript).
- Do NOT remove or modify the existing `_detect_repetition_hallucination()` function — it still catches cross-segment hallucinations. The new function supplements it.
- Follow the project's architecture rules in CLAUDE.md — run `npm test` after changes.
- The 07.content prompt change is a prompt_version bump (currently "1.0.0" → "1.1.0"). Update `PROMPT_VERSION` at line 146.
