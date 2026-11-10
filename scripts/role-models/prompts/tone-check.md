# Tone check

Read `_rules.md` first; it is part of this prompt.

Read every sentence of tagline, startedFrom, definingMoment, shadow, principles and councilQuestion. Flag a
sentence that:

- **preaches**: tells the reader what is right ("we should never forget…", "a lesson in humility");
- **excuses**: cancels a fact ("a man of his time", "but this was common then", "though he later regretted it"
  used as an eraser rather than as a dated fact);
- **flatters**: praise with no source ("legendary", "unmatched", "the greatest");
- **demonises**: loaded words in place of facts ("monster", "evil", "notorious", "disgraceful");
- **shames the reader** for admiring the man or for his desires;
- **invents**: dialogue, inner thoughts, or a detail not in the sources.

The shadow must read like a careful biographer's plain account: dated facts, who says what, no adjectives of
judgement. A dated later act ("In 1859 he freed…") is a fact and may stand next to the shadow fact, not in
place of it.

Output (inside review.json, see `devils-advocate.md`):

```json
"tone": [{ "field": "shadow", "sentence": "…", "problem": "excuses", "fixedTo": "…" }]
```

Fix every flagged sentence in the final file.
