# Bulk-generated data

Applies when a script, extraction or agent fan-out produces many records a
person will later read — `src/*/data/*.ts`, corpus files, pipeline outputs.
Rule 1 in `CLAUDE.md` covers reading the output in full. These are the specific
traps.

1. **Never filter on a field that isn't the content.** Selecting by handle,
   filename or first-180-characters is the signal you are about to ship this
   bug. *18 quotes were whitelisted off 190-character previews; 7 were wrong.*
2. **Never infer a mapping from one example.** `VICE_BY_FILE` assumed all
   fifteen corpus files were single-vice because file 01 was; two were not.
   Check the boundary cases: the largest file, the last one, the odd-named one.
3. **Assert on meaning, not shape.** A test that a quote is *about* the vice it
   is filed under beats twenty tests that a field is non-empty. Pattern:
   `tests/unit/vice/testimonials.test.ts` — narrow, deliberately a floor, fires
   on the class of error that actually happened.
4. **Report what the tests constrain, not the number that passed.** "3,615
   passing" said nothing about whether a single quote was on topic.
