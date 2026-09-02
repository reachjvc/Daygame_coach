# prompt_0 (baseline)

Extracted from `src/scenarios/keepitgoing/chat.ts` on 2026-02-09.

This is the production evaluator prompt before any Phase 7 iterations.

## Files

- `EVAL_SYSTEM_PROMPT.md` - The main evaluation prompt (lines 76-151 of chat.ts)
- `BUCKET_CONSTRAINTS.md` - Interest-bucket-specific rules (getBucketConstraints function, lines 601-718)

## Source Locations

- `EVAL_SYSTEM_PROMPT` constant: chat.ts:76-151
- `getBucketConstraints()` function: chat.ts:601-718

## Usage

When running a diagnostic:
1. Read the extraction file for the video
2. For each turn, use EVAL_SYSTEM_PROMPT to evaluate the coach's line
3. Use BUCKET_CONSTRAINTS to understand expected woman behavior at each interest level
4. Score < 7 on a coach line = blind spot (evaluator doesn't recognize good game)

## Next Version

To create prompt_1:
1. Copy this folder to `prompt_1/`
2. Modify the prompts based on blind spot analysis
3. Update this README with changelog
