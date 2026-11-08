# 08-v3: data for the one-pager prototype (v3)

Built by `board/build_v3.py` into the prototype. Rules: `../RULEBOOK.md`.

| File | Holds |
|---|---|
| `kinds.json` | the menu of number kinds (rule 14), with the recommended picks |
| `pages/<id>.json` | one pilot page: numbers by kind, beliefs, plan actions, timeline rows |
| `general.json` | the general numbers, shown the same on every page |
| `felt/<id>.json` | the felt-difficulty curve from that addiction's quit forum (counts and scores only) |
| `drafts/` | writer drafts and reviewer verdicts, kept as the audit trail |
| `decisions.json` | the decisions on the review page, each with its reason; `{name}` facts are filled in by the build, `assert`s re-checked (rule 28) |

## A number

```jsonc
{
  "kind": "hope-free-now",            // an id from kinds.json
  "big": "42 in 100",                 // the figure, one number or one compared pair; shares as "N in 100" (rule 12b)
  "headline": "…",                    // 22 words or fewer, at most 2 figures, says the group
  "mirror": "…",                      // 14 words or fewer, second person, a thought about quitting (never a screening question)
  "severity": "dependent",            // RULEBOOK rule 3: dependent | disorder | treatment | resolved | self-hooked | heavy | users | screened
  "counted": "people who had ever been hooked on alcohol",   // plain words, 12 or fewer, with its tag's key words (rule 3)
  "propose": null,                    // or why a rule argues against this card: it then falls under the one off-reader choice (rule 27)
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
  "keep": true,                       // only where he marked the row Keep (the Belief test page shows it as the example)
  "ownWords": false,                  // true: the proof is his own v10/2025 sentence, kept word for word (rule 26)
  "weak": null,                       // or one plain sentence; listed under What is weak
  "check": { "by": "…", "on": "…", "verdict": "ok", "notes": "…" }
}
```

## The plan (rule 21)

`plan` is five objects, one per step of his plan (titles and text stay in
`06-template.json`). Each has `do`: 3 or more actions for this addiction (the
review page states the real range, filled in by the build), and an optional
sourced `proof`: `text`, `ref`, `severity` (rule 3; shown as a Counted line),
optional `weak`, optional `ownWords`, and, for an off-reader proof, an optional
`alt` ({`text`, `ref`, `severity`}) that replaces it when he picks "take them
off" in the off-reader choice.

## Page-level fields

| Field | Holds |
|---|---|
| `heroLine` | on a page with no hope number only: one line with no figure, under the title |
| `gapReaderLine` | `{text, kinds}`: one plain reader line under "Who gets free, and how" that speaks for the empty kinds it names |
| `gaps[]` | `{kind, why, reader?}`: why a picked kind is empty (review page); `reader` gives the page's own words for the gap line |
| `windows[]` | body rows: `label`, `when`, `s`/`pk`/`e` in hours (start, peak, end), `open` (no clear end), `fall` (worst at the start), `kind` (feel, change, trigger, danger), `refs`, optional `note` (a smaller line under the caption) |
| `timelineNote` | a line under the body rows (default: the 06 note); "Many people get less than this." is added on every page |
| `feltHeadlineProposal` | `{text}`: replaces the graph's computed second line ("No clear easing. …") |
| `footerProposal` | `{text, refs}`: the "Before you stop" line; on a page without a danger safety level it shows as one small note |
| `researchRefsToAdd[]` | refs a v3 page adds for its own rows; a ref's `shortCite` replaces its title in the source list |
| `notUsed.*` | any list here shows on the review page under "Not on the pages" |
