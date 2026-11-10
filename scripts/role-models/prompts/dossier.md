# Step 2 — Dossier and draft person file

Read `_rules.md` first; it is part of this prompt.

Build the evidence, then the person file, as `<research folder>/draft.json`. Its shape is
`src/role-models/schema.ts`; a complete example is `tests/fixtures/role-models/good.json`. Long notes, longer
extracts and every URL you used go in `<research folder>/notes.md`.

1. **Sources.** At least one primary and at least two independent secondary sources (see `_rules.md`). Give each
   a short id (`meditations-long`, `birley-1987`, `britannica`). `year` = publication year of the edition used.
2. **Values: three to five words from `value-words.txt`.** For each, at least two pieces of evidence of two
   different kinds, from two different sources:
   - `deed`: something he did, documented (what, when, where), from a secondary or primary source;
   - `words`: where he says he holds it, from his own text, with the exact place;
   - `witness`: a reliable biographer or reference work calling him that, with the exact place.
   `claim` is one plain sentence a reader can check; `locator` is the exact place (book.section, chapter, page,
   date, timestamp, or the section heading of a web page). Pick the values the record supports most strongly,
   not the ones the internet repeats. A value with only one kind of evidence is left out.
   Aim for five strong values: the devil's advocate will drop the weakest.
3. **Principles: three to five.** Each a rule he lived by, in plain modern words (one sentence), traced to the
   exact place he states it or a source shows him acting on it. Not slogans the internet attaches to him.
4. **Quotes: one to four.** Follow `quote-check.md` for each before you keep it. In the file: `text` (exact),
   `sourceId`, `locator`, `translation` for translated text. Put the original-language or longer context in
   notes.md.
5. **Where he started (`startedFrom`)**, **defining moment**, **shadow**, **tagline**, **council question**,
   **readings**: follow `profile.md`.
6. **likenessSources** (optional): if you come across a free portrait or bust of him (public domain, CC0,
   CC BY, CC BY-SA) note its page link, author and licence. Do not search for one on purpose and do not
   download anything.
7. **born / died**: years as numbers (negative for BC) or a short string ("c. 4 BC"). A year no reliable
   source gives is `null`, never a guess; `died` is `null` for the living.
8. **areaIds**: one to three of `lm_health, lm_fitness, lm_mindset, lm_emotions, lm_relationship, lm_mission,
   lm_money, lm_family, lm_friends, lm_fun, lm_contribution, lm_spirituality`: the life areas where his example
   clearly helps a reader.
9. **pronoun**: add `"pronoun": "she"` for a woman; leave it out for a man.
10. **review**: `status: "draft"`, `screen: { result, notes }` from screen.json (notes = its reason, plus the
   owner case facts in one line if any), `blindAgreement: null`, `devilsAdvocate: ""`, `checkedOn`.
11. Add to notes.md a section `## missingWords` listing values he clearly lived that the list lacks (word, why,
   evidence), or "none".

Then run `npx tsx scripts/role-models/check-person.ts <research folder>/draft.json` from the worktree and fix
everything it reports.
