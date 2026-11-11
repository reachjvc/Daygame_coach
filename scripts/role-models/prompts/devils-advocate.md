# Devil's advocate, and the final person file

Read `_rules.md` first; it is part of this prompt. Also read `quote-check.md` and `tone-check.md`: you run both.

You get the research agent's `draft.json` and `notes.md`, and the blind agent's `blind.json`, in the person's
research folder. Your job is to break the draft, then write what survives as the final person file.

1. **Argue against every value.** For each value, search for the strongest case that it is false: documented
   behaviour that contradicts it, a biographer who disputes it, a source that does not say what the claim says.
   Open the cited sources and check each `claim` and `locator` yourself. Then decide:
   - a **pattern** of contrary behaviour, or evidence that does not hold up: **drop** the value;
   - a **single lapse**: keep the value; the lapse may go in the shadow;
   - survives only in a narrow sense (e.g. Integrity as "clean hands" while the plain reading, fair dealing,
     can be argued against strongly): **drop** the value, keep the narrow facts as evidence elsewhere or in
     the shadow, and record the narrow word under `missingWords`;
   - holds: keep.
2. **Blind comparison.** Words in both draft and blind pick are *core*. A word only the draft picked stays only
   if it has at least three pieces of evidence from at least three different sources (add evidence you have
   verified, from the blind pick or your own search); otherwise drop it. A word only the blind pick chose may be
   added if its evidence survives your check and the rules, and there is room (at most five).
   `blindAgreement` = (number of final values the blind pick also chose) / (number of final values), rounded to
   two decimals.
3. **Quotes.** Re-run `quote-check.md` on every quote yourself. Drop any that fails.
4. **Every factual sentence** of startedFrom, definingMoment and shadow: check it against its source. Fix or cut
   what the source does not support. Search once more for a well-sourced dark side the shadow leaves out, and
   for a claim in it that is not sourced.
5. **Tone.** Run `tone-check.md`; fix every flag.
6. **Status.**
   - `validated`: three to five values survive, every quote checks, every sentence checks, screen `ok` or
     `shadow`.
   - `flagged`: the screen is `owner-decides` (whatever else holds). Everything else must still be finished.
   - `excluded`: the screen is `out`.
   - `draft`: fewer than three values survive, or a required part cannot be sourced. Say what is missing.
7. **Write** `<research folder>/review.json`:

```json
{
  "id": "<id>",
  "values": [{ "word": "…", "verdict": "keep|drop|added", "core": true, "argumentAgainst": "…", "why": "…" }],
  "quotes": [{ "text": "first eight words…", "verdict": "keep|drop", "why": "…" }],
  "factFixes": [{ "field": "…", "before": "…", "after": "…", "why": "…" }],
  "tone": [],
  "blindPick": ["…"],
  "blindAgreement": 0.0,
  "missingWords": [{ "word": "…", "why": "…", "neededBecause": "…" }],
  "status": "…",
  "statusWhy": "…",
  "checkedOn": "<date>"
}
```

   and the final person file at `src/role-models/data/people/<id>.json` in the worktree given in your task,
   with `review.devilsAdvocate` = two to four plain sentences: what you attacked, what fell, what held.
   Carry `missingWords` from notes.md, blind.json and your own work into review.json.
8. Run `npx tsx scripts/role-models/check-person.ts src/role-models/data/people/<id>.json` and fix everything
   it reports. Do not run the unit suite and do not edit any other repo file.
