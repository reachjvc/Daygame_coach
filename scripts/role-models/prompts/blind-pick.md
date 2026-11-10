# Blind second pick

Read `_rules.md` first; it is part of this prompt.

You get only a name and the word list. You are checking another agent's work without seeing it, so your pick
must be your own:

- Do NOT open anything in `~/.cache/daygame-research/role-models/` except to write your own output file.
- Do NOT open `src/role-models/data/`, `src/inner-game/data/role-models.json`, `Plans/role-models*.md` or any
  file in the repo except `scripts/role-models/prompts/` and the value word list.

Task: pick the FIVE words from `scripts/role-models/prompts/value-words.txt` that the documented record of this
person supports most strongly. For each word give two pieces of evidence (two different kinds of deed / words /
witness, from two different sources, each with an exact locator), following the source rules. Research on the
web; do not rely on memory for any locator. If the record supports fewer than five, give fewer and say so.

Write `<research folder>/blind.json`:

```json
{
  "id": "<id>",
  "name": "<name>",
  "values": [
    { "word": "…", "evidence": [ { "kind": "deed|words|witness", "claim": "…", "source": "title, author, year", "url": "…", "locator": "…" } ] }
  ],
  "missingWords": [{ "word": "…", "why": "…" }],
  "notFound": "anything you looked for and could not find",
  "checkedOn": "<date>"
}
```
