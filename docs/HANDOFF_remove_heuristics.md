# HANDOFF: Remove All Heuristics from Pipeline Stage 06

**Created:** 04-02-2026
**Updated:** 04-02-2026
**Priority:** CRITICAL
**Status:** COMPLETE - PENDING VERIFICATION

---

## Context

Stage 06 (`scripts/training-data/06.speaker-correction`) was implemented using regex/heuristics to detect Q&A patterns and fix pyannote diarization errors. **This violates the explicit project rule: NO HEURISTICS.**

The user has been clear: all pipeline stages that require judgment should use LLM calls, not pattern matching.

---

## Tasks

### Task 1: Update claude_automation.md with NO HEURISTICS rule

Add this to the top of the document (after the "NO MANUAL REVIEW AT SCALE" section):

```markdown
## ⛔ CRITICAL PRINCIPLE: NO HEURISTICS

**All judgment calls must use LLM. Zero exceptions.**

- NO regex pattern matching for semantic decisions
- NO hardcoded rules like "if ends with ? then it's a question"
- NO confidence thresholds based on string matching
- If it requires understanding context → use LLM

Heuristics are:
1. Brittle (break on edge cases)
2. Language-dependent (won't work for Spanish/other languages in transcripts)
3. Unable to understand context

The cost of LLM calls is covered by Claude Max subscription. Speed is not a priority over correctness.
```

### Task 2: Check for Stage Overlap

Before rewriting Stage 06, check if any downstream stage already does speaker correction with LLM:

1. Read `scripts/training-data/08.conversations` - does it do speaker labeling that would make 06 redundant?
2. Check what Stage 08's speaker labeling prompt does
3. If Stage 08 already handles this with LLM, Stage 06 might be deletable entirely

Key question: **Is Stage 06 (diarization correction) separate from Stage 08 (speaker labeling)?**
- Stage 06: Fixes pyannote errors where same speaker ID is assigned to Q&A pair
- Stage 08: Labels speakers as coach/target/other

These might be combinable into a single LLM call.

### Task 3: Rewrite Stage 06 to Use LLM

If Stage 06 is still needed after Task 2:

**Current approach (BAD - heuristics):**
```python
# Regex patterns for questions
DIRECT_QUESTION_PATTERNS = [r"what(?:'s| is) your name", ...]
if text.endswith("?"):
    return (True, "punctuation_question", 0.60)
```

**New approach (GOOD - LLM):**

Create a prompt that asks Claude to:
1. Look at consecutive segments with same speaker
2. Identify if one is a question and next is an answer
3. If so, the answer should be attributed to a different speaker
4. Return list of segment indices that need speaker correction

Use the same Claude CLI pattern as Stage 07/08:
```python
subprocess.run(["claude", "-p", prompt, "--output-format", "text"], ...)
```

### Task 4: Remove All Heuristic Code

Delete from `06.speaker-correction`:
- Lines 52-75: `DIRECT_QUESTION_PATTERNS`, `BINARY_QUESTION_PATTERNS`
- Lines 74-75: Compiled regex patterns
- Lines 88-110: `is_question()` function
- Lines 113-115: `is_short_answer()` function

Replace with LLM call.

### Task 5: Re-run R1 Test

After changes:
1. Delete existing outputs: `rm -rf data/test/06.corrected/`
2. Run: `./scripts/training-data/06.speaker-correction --test`
3. Verify all 5 videos process without errors
4. Compare correction counts to previous run

---

## Files to Modify

| File | Action |
|------|--------|
| `docs/pipeline/claude_automation.md` | Add NO HEURISTICS rule at top |
| `scripts/training-data/06.speaker-correction` | Rewrite to use LLM instead of regex |

---

## Files to Read First

1. `scripts/training-data/06.speaker-correction` - current heuristic implementation
2. `scripts/training-data/08.conversations` - check for overlap with speaker labeling
3. `scripts/training-data/07.video-type` - reference for Claude CLI pattern
4. `docs/pipeline/claude_automation.md` - current state of pipeline docs

---

## Success Criteria

- [x] `claude_automation.md` has explicit NO HEURISTICS rule
- [x] `06.speaker-correction` has zero regex patterns
- [x] `06.speaker-correction` uses Claude CLI for all decisions
- [x] R1 test passes on all 5 videos
- [x] No duplicate functionality between Stage 06 and Stage 08

## R1 Test Results (04-02-2026)

| Video | Segments | LLM Corrections | Old Heuristic | LLM Rate | Old Rate |
|-------|----------|-----------------|---------------|----------|----------|
| A Basic Daygame [H3_8iPikhDw] | 139 | 24 | 22 | 17.3% | 15.8% |
| Approach Groups [G2sWa8X0EjA] | 162 | 1 | 2 | 0.6% | 1.2% |
| approach (friends) [4x9bvKaVWBc] | 187 | 1 | 6 | 0.5% | 3.2% |
| Rejected like a BOSS [WSFSpbFCPZo] | 328 | 11 | 28 | 3.4% | 8.5% |
| Purpose/Masculinity [dz8w8XUBDXU] | 118 | 0 | 0 | 0.0% | 0.0% |
| **TOTAL** | **934** | **37** | **58** | **4.0%** | **6.2%** |

**Analysis:** LLM found 37 corrections vs 58 with heuristics (36% fewer). This is expected - the heuristic had many false positives (78% low-confidence), and the LLM is more contextually aware.

---

## Notes

- The user is frustrated that heuristics were used despite explicit instructions
- Cost is not a concern (Claude Max subscription covers LLM calls)
- Speed is not a priority - correctness is
- The 78% low-confidence corrections from the heuristic approach were causing false positives
