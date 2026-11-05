# Addiction one-pagers: the science behind each page

**Purpose.** The owner wants one public page per addiction on his website, linked
from his book and his videos, so a reader can go straight to "their" page. Each
page shows a withdrawal timeline as a graphic, the beliefs that keep people stuck
next to what the science says, and other blocks still being chosen. This folder
holds the evidence those pages will be built from: one JSON file per research
batch, every claim tied to a source.

**Status:** research gathered 2026-11-04 (31 pages, 382 sources, 366 of them
fetched and checked against the claim by the researcher; a random re-check of
five matched four word for word, the fifth was an editorial with no abstract).
Nothing is built into the site yet. The owner is comparing four framework
options on a board.

## The board

https://claude.ai/artifact/9wfvJfSHm3BNTUXmijH7GK shows four framework options
(Field Guide, Where Are You Now, The Voice and the Facts, One Screen), rendered
live from these files for every addiction, plus a stress test, the framework
findings, and questions for the owner. His marks are stored with the page:
`marks/opt-A` … `marks/opt-D`, `marks/blk-<block id>`, and `answers/<question
id>`. His free notes are also in `marks`, keyed by where he wrote them:
`general`, `doubt-<id>`, `item-<addiction id>`, `row-<addiction id>`,
`lesson-<id>`, `find-<topic slug>`, `link-<id>`. Read them with the ArtifactData tool before the next round.

On 2026-11-04 the owner found the board's craving curves wrong: lab tests of
how strongly cues pull had been drawn as craving that rises to the top and stays
there. `board.json` `notCharted` now lists those phases (and a relapse rate);
`build.py` keeps them out of the curves and the phase table says why. A phase
whose study stopped at its peak now ends there with "study stopped here".

Source for the board is in `board/`: `template.html` (the page),
`board.json` (the board's own copy: options, doubts, blocks, questions, display
names, short URL slugs, search aliases) and `build.py`, which merges the JSON
files here into the page. Rebuild with `python3 board/build.py <out.html>` and
publish the output to the same URL.

## Round 2 and 3: the template (2026-11-04)

https://claude.ai/artifact/8D5nSxoACGvVn7PBRHbCus rebuilds the owner's 2025
nicotine one-pager as one template for eight addictions (alcohol, nicotine,
weed, cocaine, porn, betting, phone, sugar), switched by tabs: a big hopeful
number, his five-step plan in his own words, a timeline, a Current belief / New
belief table, three numbers, a box for his own experience, forum findings,
sources. Content is `06-template.json`; every ref key points at a ref in files
01-04 (or `globalRefs`). Build with `python3 board/build_template.py <out.html>`
(template `board/template-v2.html`; it also reads
`community/leaves-stages.json` for the post count) and publish to the same URL.

Round 3 shows each section in three layouts (A Poster, his 2025 sheet; B Story,
one column for phones; C Guide, editorial) and four timeline forms (Line, List,
Grid, Chart). The Chart draws the hand-picked `windows` rows of a page: when a
thing tends to show up, not how strong it is, on a log time axis. A row whose
end was never measured fades out; a trigger row (a lab test of how strongly cues
pull) is drawn as an outline, never as craving. The owner locks a section once
it works, and a locked section keeps its layout on every addiction.

Round 4 adds `07-mirror-stats/<addiction id>.json`: 14 to 17 checked numbers per
addiction in five groups (you, start, cost, quit, after), each with its basis
(design, who, how many, where, when, what was counted), a caveat, and a ref
with a short quote from the fetched source; `lq-details.json` explains the four
lifetime "get free" hero numbers (projections from NESARC 2001–02; free means
no dependence signs left, not abstinence). The build numbers these refs once
per study. The page shows them in two sections, "Is this you?" and "How
quitting goes", and the plan (`plan` per page in `06-template.json`) has its
own section: the owner's five steps, each with actions for that addiction.

Round 5 applies a senior review: sample sizes count the people behind each
number, the cautious estimate leads, projections say so, every number opens
with a second-person `mirror` line, four numbers show per section (`top: true`)
and the rest fold. The build fails when a research note ("fetched", "not
given", "our sum", "in the abstract") reaches a reader field, or when a chart
row is malformed.

Round 6 follows his notes on round 5. "Is this you?" was the wrong angle: a
man who opens the alcohol page already knows he has a problem, so the first
number section is now "How people quit", with three groups in
`07-mirror-stats`: `who` (who gets free), `how` (how they quit) and `works`
(what helps). Each page has 9 to 12 of them, four `top`. The old `you`,
`start` and `cost` numbers fold under "Earlier angle, proposed to remove"
until he decides. Section headings carry no intro line: show, don't tell.
Header option D ("Phone first") is written for a phone by default and adds the
wide two-column arrangement with a container query, after he said option B
fails on a browser.

On 2026-11-05 four separate reviewers checked every who/how/works number
against its source, two pages each. Most needed a fix: a figure taken from the
wrong group (the nicotine "49%" counted ex-smokers too; the weed "8%" counted
everyone, not only those who tried to stop), an n for the whole study instead
of the subgroup behind the figure (betting "92%" rests on 25 men), rounding
without "about", a quote that was not word for word, or a line more hopeful
than its source. One betting number with no countable basis moved to
`rejected`. The build check now also fails on "study summary" and "summary
doesn't say".

His marks are in its db: `locks/<section>` (`{layout, form}`; sections are
head, you, timeline, beliefs, plan, outlook, story, others, sources), `marks/sec-<section>`
(his notes on a section, a thread since round 6: `notes: [{text, t}]` plus an
unsent `draft`; older docs hold one `note` string, which the page still reads),
`marks/row-<addiction id>-<row>` (Keep = yes, Cut =
no), `marks/general`, and his own text in `experience/<addiction id>`. Round 2
keys (`marks/blk-*`, `marks/tl-*`) were never written.

The owner's general note on the first board (marks/general there) sets the
tone: the pages carry his brand's edge and are written for the 98% who can help
themselves; danger lines stay where they are relevant, small, not up front.

## The integrity rule

Same rule as `docs/research/recovery-testimonials/README.md`, applied to science:

- Every claim carries at least one `ref`. A claim without a source is not
  written as a claim; it goes in `placeholders`, saying what we wanted and why
  it could not be sourced.
- `fetched: true` only when the page (abstract, guideline, full text) was
  actually fetched in this pass and the claim is in it. Known-from-memory
  citations are `fetched: false` and are not promoted to the site until checked.
- Prefer, in order: clinical guidelines (NICE, ASAM, WHO, SAMHSA), systematic
  reviews and meta-analyses, large cohorts and national surveys, single trials,
  then single small studies. Say which it is in `kind`.
- Numbers stay exactly as the source states them, with the population and year.
- Where science disagrees with itself, say so. Where the popular claim (for
  example the porn "flatline", Allen Carr's "90%", dopamine brain-scan images)
  has no evidence, say that plainly; that is a finding.
- Withdrawal timelines are approximate by nature. Every phase states its range,
  and `timelineEvidence` grades how solid the whole timeline is.

## Language

Plain English a non-specialist reads in one pass. No cheering ("you've got
this"). Belief `voice` lines are written in first person, the way the thought
sounds in someone's head. Science lines are 40 words or fewer.

## The schema (one object per addiction)

```jsonc
{
  "id": "heroin",                       // url slug
  "name": "Heroin and fentanyl",
  "group": "substance | behaviour | boundary",
  "oneLiner": "…",                      // one sourced sentence a reader remembers
  "oneLinerRefs": ["r1"],
  "axes": {
    "withdrawal": "dangerous | severe | moderate | mild | contested | none-established",
    "canFullyAbstain": true,            // false for food, work, sex, phones, spending, exercise
    "prescribedOrigin": "never | often | always",
    "overdoseRiskAfterBreak": true,     // tolerance loss makes a relapse more lethal
    "classification": "DSM-5 and ICD-11 names and codes, or 'not recognised'",
    "classificationStatus": "recognised-addiction | recognised-other-disorder | proposed | not-recognised | dependence-not-addiction"
  },
  "safety": { "level": "danger | caution | none", "text": "…", "refs": ["r2"] },
  "timelineEvidence": "strong | moderate | weak | none",
  "timeline": [                          // hours since last use; tracks drawn as curves
    { "track": "body | mood-sleep | craving | hormones | life",
      "label": "…", "startH": 6, "peakH": 48, "endH": 168,
      "peakIntensity": 1-5, "note": "…", "refs": ["r3"] }
  ],
  "markers": [                           // moments worth a pin on the graph
    { "atH": 72, "kind": "peak | danger | trap | milestone",
      "label": "…", "refs": ["r4"] }
  ],
  "beliefs": [                           // 3-5: the thoughts that keep people stuck
    { "voice": "I'll just do it at weekends.",
      "kind": "not-that-bad | cant-stop | can-moderate | quitting-wont-work | identity",
      "verdict": "false | mostly-false | half-true | true-but",
      "science": "…", "refs": ["r5"],
      "beliefSource": "where we know people think this (study, or a verified quote file in recovery-testimonials)" }
  ],
  "whatWorks": [                         // 3-5, ranked by evidence
    { "what": "…", "evidence": "strong | moderate | weak", "note": "…", "refs": ["r6"] }
  ],
  "numbers": [ { "stat": "…", "refs": ["r7"] } ],   // 1-3 striking, exact figures
  "screener": { "name": "…", "items": 10, "freeToUse": "yes | no | unclear",
                "url": "…", "refs": ["r8"] },
  "placeholders": [ { "block": "timeline | beliefs | …", "wanted": "…", "why": "…" } ],
  "refs": [
    { "id": "r1", "cite": "Authors (Year). Title. Journal.", "kind": "guideline | review | cohort | survey | trial | study | other",
      "doi": "…", "pmid": "…", "url": "…", "fetched": true, "supports": "≤20 words" }
  ]
}
```

## Files

| File | Covers |
|---|---|
| `01-sedatives-opioids.json` | heroin and fentanyl, prescription opioids, kratom, alcohol, benzodiazepines, GHB/GBL, gabapentin and pregabalin |
| `02-stimulants-other-substances.json` | nicotine (cigarettes, vapes, pouches), cannabis, cocaine, methamphetamine, prescription stimulants, caffeine, ketamine, anabolic steroids |
| `03-behaviours-screens-money.json` | gambling and sports betting, crypto and day trading, gaming, porn, shopping, social media and phones, dating apps |
| `04-behaviours-body-boundary.json` | binge eating and sugar, exercise, work, love and limerence, tanning, decongestant nasal spray, antidepressant discontinuation, self-harm (as a boundary case) |
| `05-cross-addiction-and-framework.json` | the cross-addiction page, plus findings that apply to every page |

## Round 8: the v3 prototype (2026-11-05)

A new prototype, built next to the template page (which stays at version 10):
four pilot pages (alcohol, nicotine, weed, porn) in two full versions, a review
page with the owner's choices and vetoes, and a separate Belief test page one
click from every page. Every note the owner has given is now a numbered rule in
`RULEBOOK.md`, and `board/build_v3.py` refuses to build when a rule a machine
can check is broken (severity tag on every number, one drug per page, word
limits, no screening or cheering, what-helps numbers per 100 people, no forum
text in a public file). Content lives in `08-v3/` (`SCHEMA.md` there): a menu of
21 number kinds (`kinds.json`), one file per pilot (`pages/`), the general
numbers (`general.json`), the decisions shown on the review page
(`decisions.json`), and the felt-difficulty curves (`felt/`). Each curve comes
from about 1,050 posts with a day count on that addiction's quit forum
(Arctic Shift archive, fixed calendar days 2021–2025), scored 0–10 by an AI
reader and re-scored in part by a second, different model; only counts and
scores are kept here, the posts stay on the owner's machine. Every number and
belief proof was written by one agent and passed by a separate one that fetched
the source again (`drafts/` keeps the trail). Rebuild with
`python3 board/finalize_v3.py` then
`python3 board/build_v3.py <out.html> <belief-test-url>`; it also writes
`<out>-exercise.html`. `08-v3/daily-log-proposal.md` proposes how the app
could later collect real daily scores instead of forum posts.
