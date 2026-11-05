# 08-v3: data for the one-pager prototype (v3)

Built by `board/build_v3.py` into the prototype. Rules: `../RULEBOOK.md`.

| File | Holds |
|---|---|
| `kinds.json` | the menu of number kinds (rule 14), with the recommended picks |
| `pages/<id>.json` | one pilot page: numbers by kind, beliefs, plan actions, timeline rows |
| `general.json` | the general numbers, shown the same on every page |
| `felt/<id>.json` | the felt-difficulty curve from that addiction's quit forum (counts and scores only) |
| `drafts/` | writer drafts and reviewer verdicts, kept as the audit trail |
| `decisions.json` | the decisions on the review page, each with its reason |

## A number

```jsonc
{
  "kind": "hope-free-now",            // an id from kinds.json
  "big": "42%",                       // the figure, one number or one compared pair
  "headline": "…",                    // 22 words or fewer, at most 2 figures, says the group
  "mirror": "…",                      // 14 words or fewer, second person, a thought about quitting (never a screening question)
  "severity": "dependent",            // RULEBOOK rule 3: dependent | disorder | treatment | resolved | self-hooked | heavy | users
  "counted": "people who had ever been hooked on alcohol",   // plain words, 12 or fewer
  "basis": {
    "design": "…", "who": "…",
    "n": "…",                         // the people behind THIS figure, not the whole study
    "where": "…", "when": "…",
    "measured": "…"                   // what exactly was counted
  },
  "caveat": "…",                      // what the number does not mean
  "projection": false,                // true when the figure is modelled, not counted
  "weak": null,                       // or one plain sentence: why this number is weak
  "ref": { "cite": "…", "url": "…", "pmid": "…", "fetched": true,
           "quote": "…" },            // word for word from the fetched page, 30 words or fewer
  "origin": "07-mirror-stats/alcohol.json who '14 years'",   // or "new"
  "check": { "by": "…", "on": "2026-11-05", "verdict": "ok", "notes": "…" }
}
```

## A belief (his two-column form, rule 22)

```jsonc
{
  "kind": "stuck",                    // stuck | hard | need | harmless | moderation | identity
  "limiting": "I've been drinking for years. I'm stuck with it.",
  "counterpart": "Most people hooked on alcohol get free in the end.",   // something the reader can also genuinely believe
  "test": "…",                        // a real-life test: what to do this week, and what to notice
  "proof": "…",                       // 40 words or fewer, sourced
  "severity": "dependent",            // which reader the proof is about (rule 4 for moderation beliefs)
  "refs": [ { "cite": "…", "url": "…", "pmid": "…", "fetched": true, "quote": "…" } ],
  "origin": "06-template.json alcohol belief 4 (marked Keep)",          // or "new"
  "keep": true,
  "check": { "by": "…", "on": "…", "verdict": "ok", "notes": "…" }
}
```

## The plan (rule 21)

`plan` is five objects, one per step of his plan (titles and text stay in
`06-template.json`). Each has `do`: 4 to 6 actions for this addiction, and an
optional sourced `proof` (`text` and `ref`).
