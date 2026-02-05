# Pipeline Stage Verification Prompts
**Status:** Active
**Updated:** 05-02-2026

## How to use

Each stage has two parts:
1. A **verification script** (`scripts/training-data/verify-XX`) that runs deterministic checks and writes a JSON report
2. An **LLM prompt** that reads the report and does content judgment on pre-extracted text

Workflow:
1. Run the script: `./scripts/training-data/verify-02 <batch_dir>`
2. Copy the LLM prompt below, substitute `{{BATCH_DIR}}`
3. Give the prompt to Claude (or another LLM with file access)
4. Review the output — act on any BLOCK or FLAG items before proceeding

---

## Stage 02: Transcribe

### Step 1: Run the verification script

```bash
./scripts/training-data/verify-02 {{BATCH_DIR}}
```

This produces `{{BATCH_DIR}}/.verify-report.json` containing:
- Structural validation (JSON schema checks) for every video
- Statistics (segment count, word count, WPM, coverage, gaps) for every video
- Hallucination detection (cross-segment repetition, intra-segment word repetition, suspicious word durations, high-WPM segments) for every video
- Language detection (non-ASCII density) for every video
- Flagged file cross-check (.flagged.json staleness)
- Pre-extracted spot-check segments (first 3, last 3, longest, highest WPM, hallucination context) for every video
- Per-video verdict (PASS/FLAG/BLOCK) and batch verdict

All numbers in this report are computed by the script. Do not recompute them.

### Step 2: LLM content review

```
You are reviewing the output of a Stage 02 transcription verification script.

Read the file: {{BATCH_DIR}}/.verify-report.json

This report was produced by a deterministic script that already checked every
video for structural validity, statistical outliers, hallucination patterns,
and language issues. All numbers in the report are trustworthy — do not
recompute them.

Your job is CONTENT JUDGMENT on the pre-extracted text segments. The script
cannot assess whether text is coherent speech or hallucinated nonsense — only
you can do that.

---

STEP 1: REPORT OVERVIEW

Read the top-level summary and batch_verdict. Report:
- Total videos, pass/flag/block counts
- Batch verdict
- Whether .flagged.json is present and current

---

STEP 2: REVIEW ALL BLOCK VIDEOS

For every video where verdict == "BLOCK":
- Report what caused the BLOCK (from the "blocks" array)
- This is a hard stop — these must be fixed before the batch can proceed

---

STEP 3: REVIEW ALL FLAG VIDEOS (deep review)

For every video where verdict == "FLAG":

A) Read the "flags" array. List every flag.

B) Read spot_check_segments.first_3 — are these coherent speech? Does the
   video start with recognizable human speech (greeting, introduction,
   narration)? Or is it gibberish/noise artifacts?

C) Read spot_check_segments.last_3 — same check. Does the video end
   naturally (farewell, outro, trailing off) or does it cut off mid-sentence
   or degenerate into repetition?

D) Read spot_check_segments.longest — is this natural speech or a
   hallucinated run-on? Flag if:
   - Same phrase or filler word repeated throughout
   - Text doesn't resemble any natural speech pattern
   - Text is internally contradictory or nonsensical

E) Read spot_check_segments.highest_wpm — if WPM > 400, is this natural
   fast speech (e.g., excited conversation, rapid-fire Q&A) or hallucinated
   rapid text?

F) Read spot_check_segments.hallucination_context — for each flagged segment:
   - Read the 3 segments before and after (provided in "context")
   - Is the surrounding context coherent?
   - Is the hallucination an isolated artifact (Whisper glitch in an otherwise
     clean transcript) or part of a larger degraded section?
   - Classify: harmless artifact / moderate concern / severe problem

   For the "harmless artifact" classification to apply, ALL of these must be true:
   - Surrounding segments are coherent
   - The artifact covers <5% of total segments
   - The artifact does not change the meaning of surrounding speech

G) If the video has non-English segments (language.non_english_segments):
   - Is this expected for the content (e.g., multilingual conversation,
     foreign location)?
   - Or does it indicate Whisper language confusion (gibberish mapped to
     accented characters)?

For each FLAG video, give your assessment: ACCEPTABLE / NEEDS REVIEW / REJECT
with a 1-sentence reason.

---

STEP 4: SAMPLE REVIEW OF PASS VIDEOS

Select 10% of PASS videos (minimum 3, maximum 10) at random.
For each sampled video:

A) Read spot_check_segments.first_3 and last_3 — coherent?

B) Read spot_check_segments.longest — natural speech?

C) Read spot_check_segments.highest_wpm — if WPM > 300, is it plausible?

If any sampled PASS video looks suspicious, flag it and recommend the sample
rate be increased for this batch.

---

STEP 5: CROSS-BATCH PATTERNS

Look across all videos in the report for patterns:
- Are multiple videos from the same source flagged? (extract source from dir name)
- Is there a cluster of similar hallucination types?
- Are low-WPM videos concentrated in one source?

Report any patterns found.

---

OUTPUT FORMAT

### 1. Summary
Batch verdict, video counts, flagged file status. (Copy from report, do not recompute.)

### 2. BLOCK items
List each, with what must be fixed.

### 3. FLAG video assessments

| Video ID | Flags | Opening | Closing | Longest | Hallucination | Assessment |
|---|---|---|---|---|---|---|
| [id] | [count] | OK/issue | OK/issue | OK/issue | classification | ACCEPTABLE/NEEDS REVIEW/REJECT |

For each non-ACCEPTABLE video, explain why in 1-2 sentences.

### 4. PASS sample check
List sampled videos and whether they passed spot-check. Flag any surprises.

### 5. Cross-batch patterns
Any source-level or pattern-level concerns.

### 6. Final recommendation
- APPROVE: Batch is ready to proceed to Stage 03
- PARTIAL APPROVE: Remove specific videos, rest can proceed
- HOLD: Too many issues, batch needs reprocessing or manual review

---

RULES:
- Do NOT recompute any numbers. The script already did that. Use the numbers
  from the report as-is.
- When quoting segment text, copy it exactly from the report's
  spot_check_segments fields. Do not paraphrase.
- If a video has no spot_check_segments (e.g., it was BLOCK due to missing
  file), skip the content review for that video.
- Your value-add is JUDGMENT on text quality, not arithmetic. Focus there.
```

---

## Stage 03: Align

*To be written after running Stage 03 verification on a real batch and understanding what to check.*

---

## Stage 04: Diarize

*To be written after running Stage 04 verification on a real batch and understanding what to check.*

---

## Stage 05: Audio Features

*To be written after running Stage 05 verification on a real batch and understanding what to check.*

---

## Stage 06: Video Type

*To be written after running Stage 06 verification on a real batch and understanding what to check.*

---

## Stage 07: Content Enrichment

*To be written after running Stage 07 verification on a real batch and understanding what to check.*
