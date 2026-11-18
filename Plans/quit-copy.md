# Quit tools, copied from the best: one phase per tool

Written 2026-11-18 (Opus, planning session). Status: **running. Phases 0–3 done (timeline best 04b80266, fact-checked). B1 fixed (7c78d5bc): live lab answers 200. Phase 4 copies in Step E. Step B passed for Phases 4–13.**

## Why this plan exists

On 2026-11-18 the owner looked at the wave-1 quit tools (`Plans/quit-tool.md`, built and hidden on main) and said
he could not picture them, and feared they were "really small versions of what the competitors offer, instead of
taking the best of all competitors". That was mostly true: the research listed the best ideas from about 20
competitors, but no tool was built by first copying a competitor's version in full. His instruction, word for word
in substance:

- Each phase is about **one tool**, and must be executable by a lesser model.
- **Fully copy** the competitor's version of that tool. If several competitors have it, **copy all of them**.
- Then **improve** on it, designed in our styling.
- Copies keep the competitor's addiction (an alcohol app's tool is copied for alcohol). The improved version may
  then get a version per addiction.
- Run all phases in one go, then send him **one page** where he sees each tool in each of its variants and marks
  what he likes and doesn't.

This plan replaces the "ship wave 1" step of `Plans/quit-tool.md` Phase 7: which variant ships per tool is decided
by his marks. The wave-1 build stays as the variant **"current"** of each tool, and everything it proved (checked
nicotine content, the validator, privacy and coaching pages, the audit fixes) is reused.

## What "copy" means here (the line we hold)

- **Copied 1:1, fully working:** what each screen does, the order of screens, every control, every state, how many
  taps, what is asked, what is shown after, timings, what is saved, and **every feature's behaviour**: a breathing
  circle breathes at the same pace, a game is playable, a ring fills, a counter ticks, a sound plays at the same
  moment, the phone vibrates where theirs does. Owner, 2026-11-18: "you must copy the features too, so i can see if
  theyre cool … you cannot then excuse yourself". A static picture, a "coming soon" or a text description in place
  of a working feature is a failed copy.
- **Redrawn, not lifted:** their exact words, drawings, icons, photos, sound files and brand. Our copy says the same
  things in our words, draws the same animation in our styling (the app's dark theme and components), and makes its
  own sounds (Web Audio tones) that play at the same moments. Words, art and recordings are protected; several of their
  terms of service also forbid copying content (census Table 2b).
- **Only public material is used**: store screenshots and listings, product websites, help-centre articles and
  their images, public YouTube walkthroughs (frames), reviews, and the 660 funnel screenshots taken in the earlier
  research. **No sign-ups, no trials, no purchases** (Part 5 of `quit-tool.md`; several ToS ban competitor study from
  an account). Where a screen was never seen, its spec says "inferred" and the review page says so.
- **The repo is public:** no competitor name, screenshot, quote or logo goes into the repo. Variants have neutral ids
  (`a`, `b`, `c` …); the id-to-product map lives only in `~/.cache/daygame-research/quit-copy/variants.json`. The
  owner's review page is private and may show their screenshots next to ours.

## Owner answers (2026-11-18)

- A few competitors per tool is fine (Q1 stands: up to 5). Copies must work, animations and games included.
- Community feed, AI chat coach and blockers left out (Q2). No paid apps bought now.
- He runs the one prompt below in a new chat.

## Owner-only items (asked once, in the message that hands over this plan)

1. **The Vercel account that owns the live site.** The login approved on 2026-11-18 (`reachjvc-1930`) sees only an
   old project `v0-ai-daygame-coach`; `daygame-coach.vercel.app` is under another account. A second device login was
   started for the other account (CLI in the planning session's scratchpad); if it was approved, Phase 0 finds the
   CLI logged in (`vercel whoami`), else Phase 0 starts a new device login and posts its link in chat once. Needed to read the live
   crash (see B1) so he can try every variant on his phone.
2. **The privacy contact email** (still open from `quit-tool.md`): needed only when a tool goes public.
3. **Optional:** buying one or two paid apps to screen-record. Not needed; public material covers every tool here.

## BLOCKERS (each tried once on 2026-11-18)

| ID | What | Attempted, and what it returned | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | **FIXED 2026-11-18 (7c78d5bc)**: an absolute internal import bypassed Next's server rewrite and loaded the pages-router copy; a server-only externals rule now maps it to the app-router copy; live `/`, `/quit`, `/quit/lab/*` answer 200. **Cause found 2026-11-18** (owner logged in as the right account, jonas879-8953): the root layout's internal router-context import needs pages-router files Vercel's trace leaves out; fix = `outputFileTracingIncludes`. Live site answers 500 on `/` and every `/quit` page (`/privacy`, `/auth/login` are 200) | `curl` on build 134d39d1: `/`, `/quit`, `/quit/nicotine?preview=1`, `/quit/coaching` → 500. Same as `first-1000.md` B1 (Vercel only; local production builds give 200). `vercel login` done; `vercel inspect daygame-coach.vercel.app` → "Can't find the deployment … under reachjvc-1930s-projects" | "Try it" links on the review page | Owner item 1, then Phase 0 reads the function log and fixes it |
| B2 | Competitor material behind accounts | Census Table 2b: six studied products ban copying or competitor use; one bans scripted capture | Screens never shown publicly | Public material only; mark unseen screens "inferred" |
| B3 | Repo is public | Memory `repo-is-public`; `quit-tool.md` Part 5 | Names, shots, quotes in commits | Neutral variant ids; private map and shots in `~/.cache/daygame-research/quit-copy/` |
| B4 | Next.js 16.4.1 security advisory stops `next build` / `next dev` once | Seen in every build today; a rerun continues | Nothing (rerun) | Owner decides on the upgrade separately; builders rerun, never upgrade |

## OPEN QUESTIONS (decided, with a reason; the owner may veto)

| Question | Decision | Alternative | Cost if wrong |
|---|---|---|---|
| Q1 How many competitors per tool | Up to **5 copies per tool**: the products with the most store reviews **that have enough public screens to copy screen by screen**. Every other product with the tool is listed, and its one best unique piece goes into the improved version | All of them (the SOS button alone is in 18 products) | 18 copies of one button triples the time and the review page; the unique bits still reach him through "improved" |
| Q2 Tools not copied now | Community feed, AI chat coach, app/site blockers | Copy them too | Feed needs moderation; AI coaches are the worst-rated feature (75,000-review study); blockers matter for porn, phone and gambling, not nicotine. Each can get its own phase later |
| Q3 Order | Phases 1–4 first (SOS, progress, health timeline, quit date) so the 20 Dec release can use his picks for those | Census order | The four most-used tools land first |
| Q4 Copies need an account? | No. Every copy keeps its data in the browser (`quit-lab-v1`), even where the original needs an account | Build accounts | Faster; the improved version decides accounts later |
| Q5 Addiction of the improved version | Built from the addiction data files (`src/quit/data/<id>.json`), filled for nicotine; other addictions render where their content exists and say "content coming" where it doesn't | One version per addiction now | Content for weed/porn/alcohol is `quit-tool.md` Phase 10 |
| Q6 Where variants live | `/quit/lab/<tool>/<variant>` (public address, hidden: `?preview=1` like nicotine, `noindex`) so he can open them on his phone | Under `/test` (404 in production) | He couldn't try them |

## Phase briefs (written by the planning session before each phase starts)

### Phase 0 brief (2026-11-18)

- B1: blocked (Vercel CLI logged out; owner item 1). Skipped; the rest of Phase 0 continues.
- Build (Sonnet, worktree): `app/quit/lab/page.tsx` (index), `app/quit/lab/[tool]/[variant]/page.tsx`,
  `src/quit/lab/registry.ts`, `src/quit/lab/store.ts`, `src/quit/lab/LabFrame.tsx`. Static `lab` beats the
  `[addiction]` segment. Without `?preview=1` every lab page calls `notFound()` (local and production alike);
  `export const metadata = { robots: { index: false, follow: false } }` on both pages. Registry shape:
  `LAB: Record<LabToolId, { name: string; variants: Record<string, { Component; addiction: string; label: string;
  kind: "copy" | "best" | "current" }> }>`, with `LabToolId` = `sos | progress | timeline | quitdate | beliefs |
  checkin | diary | lessons | cost | past | ifthen | accountability | library`. Variant `current` wraps the wave-1
  component with nicotine data: sos→sos, timeline→symptoms, beliefs→beliefs, diary→slip, cost→cost, past→past,
  library→how. One variant `dummy` under `sos` (a single screen "Lab works") proves the frame.
  Store: `quit-lab-v1` in localStorage, namespaced `<tool>/<variant>/<key>`, same try/catch rules as `src/quit/store.ts`.
- Tests: unit test that every registry entry has a component and label; e2e that `/quit/lab?preview=1` lists every
  tool and variant, each opens without console errors at 390×844, and `/quit/lab` without preview is 404.
- Research kit (Sonnet, with Phase 1 Step A): `~/.cache/daygame-research/quit-copy/` with `variants.json`
  (`{tool: {letter: {product, addiction, platform}}}`), `kit/` (store-shot fetch reusing census `gp.py`/`iap.py`,
  `frames.sh` = yt-dlp + ffmpeg scene-change frames), `spec-template.md`.

### Phases 1–2 Step B verdicts and Step C brief (2026-11-18)

- Phase 0: frame built (9 files: registry, store, LabFrame, index and variant pages, unit + e2e tests); current
  variants registered for sos, timeline, beliefs, diary, cost, past, library.
- Phase 1 (sos) Step B: copies **a, c, d, e** pass. **b dropped** to "other products' pieces": 2 of 7 screens seen,
  so a copy would be mostly guessed. Kit made: `kit/` (store and Play shots, frames.sh, spec-template.md).
- Phase 2 (progress) Step B: copies **a–e** pass (savings screen of a checked against its shot, figure for figure).
- Step C rules for every copy, from here on:
  1. `seen` screens: built screen for screen, control for control.
  2. `inferred` screens: built only with the elements the spec states as fact; every guessed label, list item or
     card is a dashed placeholder tile reading "Not seen in public material". Each inferred screen carries a small
     "inferred" tag at the top so the review page and the owner can tell.
  3. Counts and formulas the spec derived from screenshots (e.g. per-day spend × whole days) are used as derived.
     Health, craving-length and "time won back" figures without a source show "number not sourced yet".
  4. Store the user's inputs in `quit-lab-v1` via `useLabState(<tool>, <letter>, key, initial)`.
  5. Text lives in a `text.ts` per variant (the `noHardcodedText` test); our own words from the spec summary.
  6. Sounds and vibration only where the spec marks them seen.
- Phase 3 (timeline) Step B: copies **a–e** pass; public material is thin (1–3 seen screens each), inferred parts
  follow rule 2. The day calendar (census row 8) is not copied twice: it is part of progress copies c and e.
  No health item in any copy cites a source, so every health figure in the copies shows "number not sourced yet";
  the improved version uses our checked `symptomCourse` data.
- Phase 5 (beliefs) Step B: copies **a, b, c** pass (b has the only true rate-your-beliefs quiz; its result is an
  email, so our copy shows it on the page). **d and e dropped**: sign-up questionnaires with no belief result (one
  ends at a price page, one at an "approved" page), so a copy would be a different tool; their belief-adjacent
  screens (pain reframe, capability question) go into overlap for `best`.
- Phase 4 (quitdate) Step B: copies **a, b, d, e** pass. **c dropped** (only its goal form is public). Only e has a
  real quit-date picker; a and b are goal forks with weekly plans; d's date entry is inferred (rule 2). Unsourced
  success percentages in b and the savings figure in a show "number not sourced yet". The no-date steady-limit
  path seen in a small app goes to overlap for `best`.
- Phase 6 (checkin) Step B: copies **a, b, c, d** pass (c fully seen; b half seen, but the seen half is its core:
  hold-to-check-in and the expected-difficulty slider). **e dropped** (2 screens seen).
- Phase 7 (diary) Step B: copies **b, c, d, e** pass. **a dropped** (2 seen, 4 inferred). d's log screens are the
  same product's craving flow already built as sos/d: the diary copy reuses those components and adds its own
  stats; e is picked over a bigger app because it has the trigger chart.
- Phase 9 (cost) Step B: copies **b, c, e** pass (c: the only public first-run cost setup; e: a public web
  calculator walked in full; b: savings goals page seen). **a and d dropped**: input screens never public, a copy
  would be mostly placeholders; their goal displays are already in progress copies.
- Phase 8 (lessons) Step B: copies **b, c, d, e** pass (d: the whole 28-day shell walked on video; b: day chips,
  locked tasks, 3-page lesson, day-complete). **a dropped** (its missions tab never seen). Copies carry 3 sample
  lessons each in our own words; outcome percentages show "number not sourced yet".
- Phase 10 (past) Step B: copies **a, b** pass (a: sign-up history questions incl. a screen that mirrors his own
  relapse number; b: slip entry, abstinence-periods chart). **c, d dropped** (half or more guessed). No product
  has the full past-attempts tool (method, why it ended, what helped), so `best` builds that part from our rules.
- Phase 11 (ifthen) Step B: copies **a, c** pass (a: a public plan-builder walked in full; c: a public worksheet).
  **b cut to its three seen screens** (three-circles cards, boundaries survey, feeling chips); nothing inferred of
  b is built. The tool is paywalled almost everywhere, so a full if-then builder is ours to design in `best`.
- Phase 12 (accountability) Step B: copies **a, b, e** pass (a: partner sign-up, activity summary, check-in;
  b: partners and clock check-in; e: the only real stake flow, its payment, charge and payout screens shown as
  "not built: the site never holds money"). **c, d dropped** (thin; c is mostly a leaderboard).
- Phase 13 (library) Step B: copies **a–e** pass (6–14 seen screens each; the shell only, article content never
  copied). No pick shows a search-results or saved-items screen: those are inferred (rule 2) everywhere.
- B1 round 1 (c084d633, trace includes) deployed: still 500, next missing file `react/jsx-runtime`. Round 2:
  find why the server bundle takes the pages-router context; reproduce with the standalone build.

### Phase 1 Step D brief: `sos/best` (2026-11-18)

Copies a, c, d, e are on main (c9982f21). The improved version, from `sos/overlap.md` and our rules:
1. **Help first, one tap.** Opening it shows the tool shelf at once; no question comes before help (four of five
   copies give help in 1–2 taps; the one that asks three questions first is the slowest).
2. **A wait the user chooses** (5, 10 or 15 minutes; 10 preselected) as a visible ring countdown that runs while he
   uses any tool. Labelled as a tool ("give it ten minutes"), never as how long a craving lasts (three copies
   give three different unsourced lengths).
3. **Shelf of tools**, each one tap: hold-to-breathe (his own breath drives the circle: copy c's best piece);
   bubble wrap (zero rules: the best piece of a product not copied); a block puzzle (2048 kind); "move for five
   minutes" with its checked source (exercise and cravings, `needs` refs in the data file); help for this moment:
   pick the situation from `riskyMoments`, get one card at a time from `responses`/`needs` swaps with a next arrow
   (copy e's best piece); his own reasons and money kept (from the lab store if set, else a short prompt).
4. **Afterwards, two taps at most:** "Did you smoke/use?" yes / no. No fireworks, no cheering: a plain line of what
   he did. Yes leads to a no-blame note and the diary; nothing resets. Optional one-row log: strength 1–10 and the
   situation (copy d's data idea, but after help, never before); a second log within 5 minutes updates the first
   instead of counting twice (copy d's complaint).
5. **His own pattern:** under the shelf, a small bar list of his logged situations (copy e's pie as a bar list,
   readable on a phone), from 3 logs on; before that, a line saying it appears after three.
6. **Addiction switcher** at the top (nicotine, alcohol, weed, porn from `src/quit/data/<id>.json`); where a data
   field is missing for an addiction, that tool says "content coming".
7. Rules: every number with basis and source; no streak, nothing resets; no screening; no founder "I"; phone first.
   New text is our own; any new factual claim goes to an Opus fact-check before merge.

### Phase 2 Step D brief: `progress/best` (2026-11-18)

Copies a–e on main (920d4776). The improved version, from `progress/overlap.md` and our rules:
1. **Never resets:** the big figure is **total clear days**; under it "current run" and "best run" side by side
   (copy e's best piece). A slip adds a stretch to a stretch list (length + his note; copy c's best piece);
   nothing is wiped.
2. **One row of tiles** under it (copy d): money kept, units not used, plus one tile per addiction from its data
   file where a checked figure exists. No time-won-back tile and no calorie tile (unsourced in every copy).
3. **Money page:** the per-day amount he typed shown beside the total with an edit pencil (copy a); period tabs
   (day, week, month, year; copy e); projections per month and year from the same rate (copy a); minus what he
   spent on the habit or replacements (copy b); the formula line with his real inputs.
4. **A named target** for the money (copy b's wishlist): one or more items with price, filled in order, progress bar
   and days to go at his rate.
5. **Milestones**, not cheering: a plain ladder of clear-day counts (1, 3, 7, 14, 30, 60, 90, 180, 365) and money
   amounts, reached ones listed with the date; no badge art, no exclamation marks, no feature-use badges.
6. **Calendar** of clear days and slips (copy c/e), slip days marked without red alarm styling.
7. Setup in one screen: start date, which unit (from the data file's `units`), units per day (empty until typed),
   price per unit prefilled from the unit's checked `defaultPriceUsd` with its source on tap, editable; an "Example
   data" option like the copies. Addiction switcher from the data files; units word from the data file (`units`).
8. Rules: every number his own input or derived from it, shown with its formula on tap; no unsourced figure; no
   founder "I"; phone first.

### Phase 3 Step D brief: `timeline/best` (2026-11-18)

Copies a–e on main (aea37aa4). The owner left no notes on curve mock v2 (db empty 2026-11-18), so the plan's
science rule decides: timing from studies, as ranges, each with its source; no per-item health claim without a
checked source.
1. **Header:** day N since his quit date (set once; or "Example data"), and a plain count of how many of the
   symptoms are past the end of their study range.
2. **Withdrawal view first** (copy e's best piece, made honest): one card per `symptomCourse` row: the symptom in
   plain words, a horizontal day band showing the studied range (peak window, then "gone by" range drawn as a
   fading span from the shorter to the longer study figure), a marker at his day N, the data file's sentence, and
   the sources on tap. No single-day countdown and no percent with decimals: the studies give ranges.
   Cue-triggered craving gets its own card: "still rising at day 35, the last day tested", band open-ended.
   The data file's note ("studies are almost all of cigarette smokers") sits under the list.
3. **A 6-week strip** (the calendar link no competitor has): days 1–42 with the week-1 peak shaded and his day
   marked, so he sees hard days before they come.
4. **Body recovery list** (what copies a–d lead with): shown only for items with a checked source in the data file;
   there are none yet, so the section is one line "content coming: checked body-recovery timings" — never the
   competitors' unsourced items.
5. Addiction switcher; an addiction without `symptomCourse` shows "content coming".
6. The day ranges drawn on the bands are numbers we derive from the sources' words ("first week", "2 to 4 weeks",
   "about 10 days"): the builder lists each derived number in its report and an **Opus fact-check** compares them
   with the cited quotes before merge.

---

## PHASES

Models (owner, 2026-11-18): Opus plans, writes each phase brief, reviews specs and diffs, and fact-checks numbers;
**Sonnet** researches and builds; **Haiku** runs mechanical checks. Every build runs in a git worktree and is
fast-forwarded to `main` when its checks pass; nothing in the lab is reachable without `?preview=1`.

### Phase 0: setup — Opus brief, Sonnet build

1. **B1 fix** (after owner item 1): read the Vercel function log for `/` and `/quit`; fix the cause; confirm `/`,
   `/quit?preview=1` answer 200 on the live site.
2. **Lab frame:** `app/quit/lab/[tool]/[variant]/page.tsx`, `src/quit/lab/registry.ts` (`{tool: {variant: {component,
   addiction, label}}}` with neutral labels), `src/quit/lab/store.ts` (`quit-lab-v1`, same rules as `quit-v1`), a lab
   index `/quit/lab` listing tools and variants (preview only), `robots` noindex, unit test that every registry entry
   renders and that production without `?preview=1` answers 404.
3. **Research kit** in `~/.cache/daygame-research/quit-copy/`: `variants.json` (private id map), `kit/` scripts:
   store-listing screenshot fetch (reuse `quit-tool/census/scripts/gp.py`, `iap.py`), YouTube frame grabs
   (`yt-dlp` + `ffmpeg`, one frame per scene change, never committed), and the spec template below.
4. **Variant "current":** register each wave-1 tool as variant `current` of its tool.

Acceptance: lab index and one dummy variant open on the live site with `?preview=1`; tests, typecheck ratchet green.

### The tool phase recipe (Phases 1–13 all follow it)

**Step A — research (Sonnet, read-only).** Folder `~/.cache/daygame-research/quit-copy/<tool>/`.
1. List every product that has this tool: start from the census rows named in the phase table
   (`~/.cache/daygame-research/quit-tool/feature-census.md` Table 1 and Table 3 for product codes), then one web search
   for current top apps with it that the census missed.
2. For each, record store review count and what public material exists; pick up to 5 (Q1). Write `candidates.md`.
3. For each picked product, gather every public screen of the tool: store screenshots, website and help-centre
   images, YouTube walkthrough frames, the earlier funnel shots (`~/.cache/daygame-research/one-pagers-v2/research/
   funnel-walk-shots/`, `quit-tool/census/shots/`, `census/store/`). Save under `<tool>/<letter>/shots/`.
4. Write `<tool>/<letter>/spec.md` from the template: product (private), addiction, where the tool is reached from;
   **every screen in order**, each marked `seen` (with the shot file) or `inferred` (with why); per screen: layout top
   to bottom, every element and control, every state (empty, filled, error, done), what each tap does, timings,
   sounds, vibration, animation, what is stored; the text **summarised in plain English** (never copied); numbers
   it shows and whether it gives a source; what users praise and complain about (from
   `quit-tool/loved-features.csv`, filtered on this product and tool).
5. Write `<tool>/overlap.md`: elements all or most copies share; each copy's best unique piece; the other products'
   unique pieces (Q1).

**Step B — spec review (Opus, the planning session).** Check each spec against its shots: a screen claimed `seen`
must have its shot; nothing invented without `inferred`; enough detail that a builder decides nothing. Send back
with exact gaps (at most two rounds).

**Step C — copies (Sonnet, worktree).** One variant per spec at `/quit/lab/<tool>/<letter>`, in
`src/quit/lab/<tool>/<letter>/`: screen for screen, control for control, same order, same states, same taps; every
moving or interactive feature working as in the original (animation pace, game rules, sound and vibration moments),
built with CSS/SVG/canvas and Web Audio — never a still or a description in its place; the
original's addiction; our tokens and components; our words (each line rewritten from the spec's summary, never
from a screenshot); data in `quit-lab-v1`; numbers it shows: only where our data file has a checked figure for the
same thing, else the copy shows the same element with a visible "number not sourced yet" placeholder (we never
repeat an unsourced competitor number). No competitor name or art anywhere in the repo. Each copy gets one e2e
spec that walks every screen of its spec in order.

**Step D — improved (Opus brief, Sonnet build).** Variant `best` at `/quit/lab/<tool>/best`: everything most copies
share, the best unique piece of each, plus our rules (`quit-tool.md` Part 5 and the RULEBOOK: every number with its
basis and source, no forum shares as measures, no streak that resets to zero, no screening, no cheering, no
founder "I", phone first). Built from `src/quit/data/<addiction>.json` with an addiction switcher (Q5). New content
is written by Sonnet and every new number or claim is fact-checked by an Opus subagent before merge.

**Step E — checks (Haiku).** Screenshot every screen of every variant at 390×844, dark, into
`~/.cache/daygame-research/quit-copy/<tool>/shots-ours/<letter>/`; tick each spec screen as present or missing;
check no horizontal scroll; for each animated or interactive feature in the spec, a short screen recording (Playwright
video) proves it moves or plays as specified; grep the diff for any product name in `variants.json`. Missing screens go back to Step C.

**Step F — merge.** Opus reads the diff and the checks; vitest, typecheck ratchet, e2e for the tool on phone and
desktop; fast-forward `main`, push, update this file's status line.

### Phases 1–13

| Phase | Tool | Census rows (Table 1) | Our current variant | Notes for the brief |
|---|---|---|---|---|
| 1 | **Craving SOS** | 12 SOS button, 14 breathing, 15 distraction games, 19 help matched to state | `sos` | Each copy keeps its own breathing/game; no copy promises how long a craving lasts unless the original does (then our copy shows "not sourced") |
| 2 | **Progress home** (clean time, money saved, units not used, time regained, badges, total days + best streak) | 1, 2, 4, 5, 6, 79 | none (wave 3 `record`) | Our improved version keeps "never resets" (total clear days + best run) |
| 3 | **Health and withdrawal timeline** | 86 health-recovery timeline, 8 calendar of days | `symptoms` | Improved version uses `symptomCourse` (study timing) and the curve mock v2 ideas; his notes on that mock feed this phase |
| 4 | **Quit date and plan** | 50 quit date and method, finite goal, goal type | none (`curve` held) | Near date first (evidence); his "days or weeks" wording stays |
| 5 | **Belief test** | 45 belief/fear quiz | `beliefs` | Public material: public web quizzes and funnel shots, store shots (named in the private research folder) |
| 6 | **Daily check-in** (pledge, difficulty, mood, journal) | 32 daily check-in, journal, mood tracker | none (wave 3 `checkin`) | |
| 7 | **Craving and slip diary + trigger chart** | 10 craving/slip log, 26 trigger chart | `slip` | |
| 8 | **Daily lesson program** | 39 daily lesson program, 53 real-life missions, quote/tip of the day | none (wave 3 `lesson`) | Copy the program's shell and delivery with 3 sample lessons each; lesson content later, clean-room (owner note) |
| 9 | **Cost calculator and savings goal** | 2 money saved (input side), 3 savings goal | `cost` | |
| 10 | **Past attempts** | the census "rare" list item 1 (five products; names in the private census) | `past` | |
| 11 | **If-then and relapse-prevention plan** | the "paid-only small tools" (if-then, three circles, letter to self) | none (wave 2 `ifthen`) | |
| 12 | **Accountability partner and stake** | 65 accountability partner, deposit contracts | none (wave 2 `tell`, `stake`) | The site never holds money (unchanged) |
| 13 | **Library and what helps** | 41 article/video library | `how` (+ wave 2 `besides`) | |

### Phase 14: the review page — Opus

One private artifact, linked in chat, never opened on his screen. Per tool, in phase order: the improved version
first, then each copy, then "current". Per variant: a strip of our phone screens; beside each copy, the
competitor's public screens it was copied from (private page only) and "seen / inferred"; a "Try it on your phone"
link (`/quit/lab/<tool>/<variant>?preview=1`, live site); and, always visible, 👍, 👎 and a note box with Save,
a green Saved badge and his earlier notes (memory `review-boards-note-log`). Top of the page: three lines on what
was copied and what wasn't (the line above). Untouched variants count as "no opinion", not as a yes, because here he
is choosing between variants. db collections `likes`, `dislikes`, `notes`, keyed `<tool>/<variant>`.

Acceptance: every variant of every tool on the page, every "try it" link answers 200 on the live site, one read of
each db collection works.

### After his marks (not part of this run)

Per tool, the planning session writes a one-line decision from his marks (which variant ships, what to merge in)
and `Plans/quit-tool.md` takes over again for content, accounts and the public release.

---

## Part 5: ground rules for the build sessions

Everything in `Plans/quit-tool.md` Part 5 applies, plus:

- Copy flows, never words or art; never sign up, start a trial or buy anything; public material only.
- No competitor name, quote, screenshot or logo in any committed file, commit message or test name.
- Unseen screens are `inferred`, never guessed silently.
- A competitor's number is never shown as ours: show our checked figure or a "not sourced yet" placeholder.
- One heavy command at a time; stop dev servers before the typecheck; never `pkill -f`; never `test-stack.mjs up`
  (use `~/.cache/daygame-research/quit-tool/stack-env.json`). Memory: `worktree-e2e-servers`,
  `shared-checkout-tool-quirks`.
- A `next build` that stops with the Next.js security notice is simply run again; never upgrade.
- Questions a builder can't settle go in its report, never into this file; the planning session answers them.

## The one prompt to run it all

Start in the project folder with `claude --model opus` and paste:

> /goal Execute Plans/quit-copy.md, Phases 0 to 14, in one run. You are the planner and reviewer only: write each
> phase's brief into the plan before it starts, then hand ALL research and building to subagents with model "sonnet"
> (building with isolation "worktree"), all fact-checking of numbers and claims to subagents with model "opus", and
> mechanical checks (screenshots against the spec, tests, typecheck ratchet, name greps) to subagents with model
> "haiku". Do not write app code yourself. Follow the tool phase recipe (Steps A–F) exactly for Phases 1–13; run at
> most three agents at once and check `free -g` before starting a build. After each phase: read the specs, the diff
> and the check results, send work back with exact fixes if anything fails, then fast-forward main, push, and update
> the status line at the top of the plan. If Phase 0's live-site fix is blocked on the owner's Vercel account, do
> the rest of Phase 0 and continue; the review page then says which "try it" links wait for that fix. Stop only for
> an acceptance check still failing after two fix rounds. End with Phase 14: post the review page link in chat and a
> short plain-words report (done / not yet, what he needs to do).
