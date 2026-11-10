# Quote check

Read `_rules.md` first; it is part of this prompt.

For every quote (and every `words` evidence that quotes him):

1. Find the quote in the original text: fetch the full text (Gutenberg, Wikisource, Internet Archive, Perseus,
   the publisher's preview, the transcript) and locate the exact words. For a translation, check the named
   translator's wording, not another translator's.
2. If you cannot open the original, a sourced entry that cites the exact place (Wikiquote's *sourced* section
   with its citation, Quote Investigator, a scholarly edition quoted in a reputable source) is acceptable;
   record which one.
3. Search "<first words of the quote>" misattributed / fake / "never said". Check Wikiquote's "Disputed" and
   "Misattributed" sections and Quote Investigator. Any hit there: drop the quote.
4. Exact words only. Trimming with "…" is allowed only where the cut does not change the meaning.
5. Living author or modern translation: under 40 words.

Record each check in notes.md:

```
### quote: "<first eight words>"
- found at: <exact place> (<url>)
- wording matches: yes | no (difference: …)
- misattribution search: <queries run, what came back>
- verdict: keep | drop (why)
```

Only `keep` quotes go in the file.
