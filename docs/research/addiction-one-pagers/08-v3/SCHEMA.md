# 08-v3: data for the one-pager prototype (v3)

Built by `board/build_v3.py` into the prototype. Rules: `../RULEBOOK.md`.

| File | Holds |
|---|---|
| `kinds.json` | the menu of number kinds (rule 14), with the recommended picks; `mainlyHooked: true` makes a hooked card's tag say it matters mainly to men who are hooked (G3) |
| `pages/<id>.json` | one pilot page: numbers by kind, beliefs, plan actions, timeline rows |
| `general.json` | the general numbers, shown the same on every page |
| `felt/<id>.json` | that addiction's quit-forum posts per day bin: post count `n`, the share naming each hard thing (`symptoms`) and good change (`positives`), and the bias note; the graph draws these as lines (round 8). Its old 0 to 10 fields (`median`, `hist`, `agreement`, `scale`) are no longer drawn |
| `drafts/` | writer drafts and reviewer verdicts, kept as the audit trail |
| `decisions.json` | the decisions on the review page, each with its reason; `{name}` facts are filled in by the build, `assert`s re-checked (rule 28); a choice he answered carries `answered: "<option id>"` |
| `replies.json` | `{noteKey: [{t, text}]}`: a "What I did" line under each of his notes (written by the main session; the build creates `{}` if missing) |

## Note keys (round 7, G5)

His notes live in the review page's marks store, collection `notes`. A note written on a page item is keyed
`<page>/<section>[/<item>]`: section is one of hero, beliefs, graph, quit, outlook, plan, general, story, sources;
item is a belief or plan step number (`alcohol/beliefs/1`, `alcohol/plan/3`), a number card's kind (with `-2`, `-3`
for a second card of that kind: `alcohol/outlook/after-lasting-2`), or `body` for the body rows
(`alcohol/graph/body`). The store's doc id swaps each `/` for `~` (`alcohol~beliefs~1`) and the doc keeps the key in
its `key` field. Each doc: `notes: [{text, t}]` (appended, never overwritten), `draft` (autosaved, unsaved text).
Keys from before round 7 (`ch-hero`, `ch-offreader`, `ch-sections`, `general`, `sec-beliefs`, `sec-hero`) still
show: in the Notes tab, and at the matching section of the alcohol page.

## A number

```jsonc
{
  "kind": "hope-free-now",            // an id from kinds.json
  "big": "42 in 100",                 // the figure, one number or one compared pair; shares as "N in 100" (rule 12b)
  "headline": "…",                    // 22 words or fewer, at most 2 figures, says the group
  "mirror": "…",                      // 14 words or fewer, second person, a thought about quitting (never a screening question)
  "severity": "dependent",            // RULEBOOK rule 3: dependent | disorder | treatment | resolved | self-hooked | heavy | users | screened
  "counted": "people who had ever been hooked on alcohol",   // plain words, 12 or fewer, with its tag's key words (rule 3)
  "propose": null,                    // why a rule argues against this card; required on every card in the off-reader choice (rule 27)
  "basis": {
    "design": "…", "who": "…",
    "n": "…",                         // the people behind THIS figure, not the whole study
    "where": "…", "when": "…",
    "measured": "…"                   // what exactly was counted
  },
  "caveat": "…",                      // what the number does not mean
  "projection": false,                // true when the figure is modelled, not counted (one chip: "Worked out, not counted")
  "pooled": false,                    // true for a pooled average across studies (one chip: "Average across studies")
  "checked": "hooked",                // round 7, G3: "hooked" | "not": did its source check people for addiction? Shown as
                                      // the tag "Checked as hooked" / "Not checked for addiction"; without it the severity decides
  "liked": false,                     // true: he liked it in v10 and a rule argues against it; it stays under "take them off" (rule 26, E2)
  "timeIsResult": false,              // true when the big figure is a time that IS the finding (rule 12c)
  "alsoRef": null,                    // or a second source (or list) the card's lines rest on; "refs2" works the same; cited at the end of the caveat
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
  "counted": null,                    // or plain words that replace the Counted line built from the tag (moderation rows: "… not checked for addiction")
  "weak": null,                       // or one plain sentence; listed under What is weak
  "check": { "by": "…", "on": "…", "verdict": "ok", "notes": "…" }
}
```

## The plan (rule 21)

`plan` is five objects, one per step of his plan (titles and text stay in
`06-template.json`). Each has `do`: 3 or more actions for this addiction (the
review page states the real range, filled in by the build), and an optional
sourced `proof`: `text`, `ref`, `severity` (rule 3; shown as a Counted line),
optional `counted` (replaces that line), optional `weak`, optional `ownWords`.
A proof about people not checked for addiction stays on the page whatever the
off-reader choice says (round 4, D2); `alt` is no longer used.

## Page-level fields

| Field | Holds |
|---|---|
| `heroDefinition` | round 7, G1: one plain line on what "hooked" means in the hero's study; a string (sources in `heroDefinitionRef`) or `{text, ref}` |
| `heroRange` | round 7, G1: `{line, studies: [{big, who, where, ref}]}`: what other studies that counted the same thing found; the line under the hero, each study listed in a fold |
| `heroHalfFree` | round 7, G1: "half are free about N years after they got hooked"; a string (source in `heroHalfFreeRef`) or `{text, ref}` |
| `heroLine` | not used since round 5 (E1): a page with no hope number goes from its title straight to the beliefs |
| `gapReaderLine` | `{text, kinds}`: one plain reader line under "Who gets free, and how" that speaks for the empty kinds it names |
| `gaps[]` | `{kind, why, reader?}`: why a picked kind is empty (review page); `reader` gives the page's own words for the gap line |
| `windows[]` | body rows: `label`, `when`, `s`/`pk`/`e` in hours (start, peak, end), `open` (no clear end), `fall` (worst at the start), `kind` (feel, change, trigger, danger), `refs`, optional `caption` (a smaller reader line under the row's text); `note` is internal (source notes) and never shown |
| `timelineNote` | a line under the body rows (default: the 06 note); "Many people get less than this." is added on every page |
| `feltHeadlineProposal` | no longer used (round 4, D9; round 8 headline in RULEBOOK rule 18): the template computes the graph headline from the lines; the build fails if a page carries one |
| `footerProposal` | `{text, refs}`: the "Before you stop" line; on a page without a danger safety level it shows as one small note |
| `researchRefsToAdd[]` | refs a v3 page adds for its own rows; a ref's `shortCite` replaces its title in the source list |
| `notUsed.*` | any list here shows on the review page under "Not on the pages" |
