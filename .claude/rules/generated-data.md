# Bulk-generated data

Applies whenever a script, extraction or agent fan-out produces many records that
a person will later read — `src/*/data/*.ts`, corpus files, pipeline outputs.

## The failure this exists to prevent

381 testimonials were extracted from a 2,186-quote corpus and shipped. Every test
passed. The user read the first screen and found errors immediately:

- vice assigned per source *file*, when two of fifteen files covered several vices
- 18 quotes chosen by whitelisting handles off 190-character previews; 7 wrong
- 15 entries were two quotes glued with `" … "` by the extractor
- 3 were the research agent's own third-person write-up, shown as testimony

Nothing here was subtle. It was invisible because every check ran on structure —
"has a URL", "length > 40", "handle is non-empty" — and none ran on meaning.

## Rules

1. **Read the output the way the user will, in full, before saying done.** Not a
   count, not a preview, not a test summary. For N records read a random 20
   end-to-end; the defect rate you find is the defect rate you shipped.
2. **Never filter on a field that isn't the content.** Selecting by handle,
   filename or first-180-chars is the signal that you are about to ship this bug.
3. **Never infer a mapping from one example.** `VICE_BY_FILE` assumed all fifteen
   corpus files were single-vice because file 01 was. Check the boundary cases —
   the largest file, the last one, the one with the odd name.
4. **Assert on meaning, not shape.** A test that a quote is *about* the vice it is
   filed under is worth twenty tests that a field is non-empty. See
   `tests/unit/vice/testimonials.test.ts` for the pattern: narrow, deliberately a
   floor, and it fires on the class of error that actually happened.
5. **Report what the tests constrain, not the number that passed.** "3,615
   passing" said nothing about whether a single quote was on topic.
