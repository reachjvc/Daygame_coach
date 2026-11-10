# Step 1 — Screen

Read `_rules.md` first; it is part of this prompt.

Before the research, decide which group the person is in (see "Screen" in `_rules.md`). Look specifically for:
fictional status; living politician / campaigner / founder of a living religion; any credible account of sexual
contact with someone under 16, or of sexual violence; and the dark side the candidate list names (if any).
Search for each of these by name; do not rely on memory. The candidate list's notes are first guesses, not
findings: confirm or correct them.

Write `<research folder>/screen.json`:

```json
{
  "id": "<id>",
  "result": "ok | shadow | owner-decides | out",
  "reason": "one plain sentence",
  "ownerCase": null,
  "shadowLeads": ["each dark-side fact you found, one line, with its source"],
  "checkedOn": "<date>"
}
```

`ownerCase` is filled only when `result` is `owner-decides`:

```json
{
  "kind": "under-16 | sexual-violence",
  "facts": ["plain dated facts, one per line, each with [source id]"],
  "disputed": ["what is contested and by whom"],
  "sources": [{ "id": "…", "title": "…", "author": "…", "year": 0, "url": "…" }],
  "wouldSay": "the two to four sentences the person file's shadow would carry about it"
}
```

No recommendation anywhere: the owner marks each case In or Out himself.

If `result` is `out`, stop after writing screen.json and say why in your final message. Every other result goes
on to the dossier, `owner-decides` included.
