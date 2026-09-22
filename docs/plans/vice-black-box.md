# The Black Box — a plan for the vice module's new front door

Serves `docs/product/vice-concept.md` items 1–9, and `docs/product/vision.md`
items 5 (progress should look good), 15 (not rebuilt later) and 17 (wording and
UX need a pass).

---

# The human half

## What it is, in one sentence

**A flight recorder for quitting: every attempt you have made, every moment you
nearly went and didn't, and a page that answers you with your own record at the
moment you start thinking you could moderate.**

## Why it is shaped like aviation

Aviation does not wait for crashes. The Aviation Safety Reporting System has
collected voluntary reports of **close calls** since 1976, on the premise that
the chain of events behind a near miss is the same chain as behind the accident —
you just got lucky at the last link. Reporting is confidential and cannot be used
against the reporter, and that immunity is the entire mechanism: remove the
penalty or nobody files.

Two consequences run through this whole design. **A close call and a relapse are
the same report with one field different.** And **filing must never cost you
anything on screen** — no counter moving, no red, no "you slipped".

## The five rules this plan follows

These are what I am asking you to approve. Everything else is an output.

**Rule 1 — One report form. A close call and a relapse differ by one checkbox.**
*If this is wrong:* close calls become a lighter, second-class thing, you file
fewer of them, and the tool ends up holding only your defeats — which is the
exact object that makes the next relapse more likely, not less.

**Rule 2 — Filing a report pays out immediately, in your own history.**
You write the thought you are having; the screen answers with every previous time
you had that thought and what happened next.
*If this is wrong:* an unrewarded log is abandoned inside a fortnight, and the
tool is empty on the night you need it.

**Rule 3 — Nothing on the screen ever resets to zero.**
When an attempt ends, its bar stays on the chart at full length and a new lane
starts beneath it. The record only ever grows.
*If this is wrong:* the screen delivers both halves of Marlatt's abstinence
violation effect — the slip, plus the proof you are back to nothing — at the
moment you are least able to take it. This is the one failure that would make the
tool worse than no tool. It is also exactly what Quitzilla ships ("beat your
record", longest streak).

**Rule 4 — The record is database-shaped from day one and lives in the browser
today.** Append-only rows, stable ids, ISO timestamps, one service is the only
thing that reads or writes, export built in.
*If this is wrong:* a multi-year record is born in a shape that cannot move, and
the platform migration (vision item 36) either loses it or costs a hand-written
rescue.

**Rule 5 — It has to read well at one attempt and zero close calls.**
The payoff cannot require data you do not have yet.
*If this is wrong:* you never reach the third entry, which is where the value
actually starts.

## What you will see

**The landing page — this is what "Vices" becomes.**

At the top, one wide button: **"I'm having a thought."** That is the front door
for concept item 4. One tap, no form, no attempt required — it opens your own
record on that thought. This is the feature the whole tool exists for.

Under it, **the picture**: a stack of horizontal bars, one per attempt, oldest at
the top so it reads downwards like a timeline.

- Bar **length** is how long the attempt held.
- Small **ticks** along a bar are close calls you filed — each one a night you
  didn't go.
- The **right end** of a bar carries a mark for how it ended, coloured by kind.
- The **current attempt** has no right end. It fades out, because it has not
  ended.

Four things become readable at a glance, and none of them need a paragraph:

1. Bars getting longer down the page — progress, without a streak counter.
2. Three bars ending in the same mark — your signature.
3. **Dense ticks before an ending** — you saw it coming and it still got you.
   That is a plan problem.
4. **Sparse ticks before an ending** — it got you with no warning at all. That is
   a different problem and needs a different answer.

Below the picture, **what it has cost you**: your recurring thoughts ranked not by
how often you have had them but by **what each one cost in days and money**.
Borrowed from Edgewonk, a trading journal whose "Mistake Impact Analysis" ranks a
trader's error categories by money lost rather than frequency. Nothing in
recovery software does this, and this module already collects the cost-per-week
arithmetic it needs (`ViceUsage`).

The sentence that comes out the other end is the product:

> **"I can handle it now" has ended 3 of your 5 attempts. It has cost you 71 days
> and about £340.**

## The graph, specified

**Built and screenshotted before this plan was finished, because "visually
appealing" cannot be judged from a description.** The mockup is at
`.playwright-mcp/blackbox-v2.png` (desktop) and `.playwright-mcp/blackbox-phone-v2.png`
(phone). Concept item 6 is the reason this section exists at all.

### Four pieces, top to bottom

**1. The ribbon — "the periods I didn't smoke".**
One strip across the whole history. Lit = not smoking, dark = smoking, faint year
separators. This is the literal thing the owner asked for and it is the piece that
answers it in one glance: how much of two and a half years was clean.

**2. The runs.**
One row per attempt on a shared calendar axis, so a bar sits where it actually
happened and the gaps between bars *are* the smoking.

- Bar = the clean run, one hue, 14px tall, 4px rounded ends.
- **Close calls are small dots under the bar**, not marks on it — the run keeps a
  clean silhouette and the near-misses read as discrete events.
- The right end carries a dot for how it ended, plus a **direct text label**
  ("41 days · I felt fine"), so identity is never colour-alone.
- The current run has no end dot and fades out to the right, because it has not
  ended.

**3. Three stat tiles** — longest run, total clean days across all runs, current
run. A handful of headline numbers is a KPI row, not a chart.

**4. What each thought has cost you** — horizontal bars ranked by the clean days
each thought has ended, with the top one in the accent.

### Colour: the emphasis form, not six hues

The story is "two of these ended the same way", so exactly one ending category
carries an accent and everything else is neutral. Two hues, not six:

| Role | Dark value | Why |
| --- | --- | --- |
| Not smoking | `#3987e5` | the subject; one hue |
| Ended "I felt fine" | `#d95926` | the good-stretch class — the tool's whole point |
| Ended anything else | `#52525b` | neutral; the text label carries the reason |

**Validated, not eyeballed**, against the app's real surface `#09090b`:
`validate_palette.js "#3987e5,#d95926" --mode dark` → all six checks PASS,
worst-case CVD ΔE 26.8 and normal-vision ΔE 31.8, both far clear of the floors.

The accent is fixed to the *category*, never to whichever ending currently happens
to be most common — colour follows the entity, never its rank, or the chart
repaints itself as the data changes.

### Three faults found by looking at the render

Recorded because they are the specification for the build, and because none of
them were visible in the description:

1. **The last row's label ran off the right edge.** Fixed by flipping the label to
   the left of the bar — and the flip threshold is computed from the **actual
   available width**, not a fixed percentage, or the same bug returns on a phone.
   It did return on a phone, at 390px, and that is how the class got fixed.
2. **Close-call ticks drawn on the bar turned the 88-day run into a barcode.**
   Moved below the bar as dots.
3. **The ribbon — the thing actually asked for — was the smallest element on the
   page.** Given height and made the first thing under the numbers.

### Still open at phone width

The last axis label ("Jul 26") wraps to two lines at 390px. Cosmetic, fixed in M5.

## The milestones

Each is a working app state you can open and judge.

**M1 — Clicking Vices lands on the Black Box.**
New page at `/life-mastery/quit-vice`. You can start an attempt, name what you
are quitting, say what got it going and what you put in place to keep it
underway (concept item 3). The old hub moves to `/life-mastery/quit-vice/old`,
is not linked from anywhere, and **nothing is deleted**.
*Acceptance:* e2e — open `QUIT_VICE`, see the Black Box, start an attempt,
reload, it is still there. Unit — the path is written only in
`lifeMasteryRoutes.ts`.

**M2 — You can file a report.**
One form. A checkbox decides whether you went through with it. Fields: when, the
thought in your own words, how close, who you were with, where, what was going
on, contributing factors (plural), what you did instead.
*Acceptance:* unit — a report with `wentThrough: false` leaves the attempt
running; `true` ends it. Unit — the summary line reads in the plural and a
single-factor report is still accepted (a form that refuses is a form nobody
fills in).

**M3 — Every report pays out in your own history.**
On save, the screen shows every previous report carrying the same thought, what
happened each time, and the running cost.
*Acceptance:* unit — given three prior reports on the same thought, the payout
names the count and which attempts it ended. Given **zero** priors it says so
plainly and invents no pattern. That second test is the one that matters.

**M4 — The moderation door.**
The "I'm having a thought" button on the landing page reaches M3's answer in one
tap without filing anything first, and offers to file afterwards.
*Acceptance:* e2e — from a cold load, one click reaches your own record.

**M5 — The picture.**
Lanes, ticks, endings, the open-ended current bar.
*Acceptance:* unit on the layout arithmetic from real dates (no server clock, no
UTC-first conversion — both are architecture rules). Unit — **no label overflows
its container at 390px**, which is the fault the mockup actually had. Plus a
Playwright screenshot into `.playwright-mcp/` at both widths for you to look at.

**M6 — It survives.**
Export and import as one file. The readability rule in
`tests/unit/architecture.test.ts` extended to scan `src/vice`, which it does not
today.
*Acceptance:* unit — export then import reproduces the record exactly.
Architecture test — `src/vice` is in the readability scan and the new files pass
it.

## Your concept, item by item

| # | Verdict | Item | Where |
| --- | --- | --- | --- |
| 1 | Yes | Times I quit, and the reasons | `ViceAttempt` + `ViceReport`; M1, M2 |
| 2 | Yes | Close calls, aviation framing | Rule 1 — one form, `wentThrough` flag; M2 |
| 3 | Yes | What got it going, kept it underway, ended it | Attempt carries `startedBy`, `structure[]`, `endedBy`; M1, M2 |
| 4 | Yes | Read at the moderation moment | M4, the landing page's first button |
| 5 | Yes | Both in combination | Reports belong to attempts; the lanes show both at once; M5 |
| 6 | Yes | Shown beautifully | M5, plus M6 extending the readability rule over `src/vice` |
| 7 | Behaviour | Old rules are AI's, not yours | The plan cannot answer this, only the choices can — see "What I keep and what I drop" |
| 8 | Yes | New work in isolation | M1 — old hub unlinked at `/old`, nothing deleted |
| 9 | No | Does it need to be deployable | Answered below; Rule 4 is what I recommend instead |

## What I keep from the old module, and what I drop (item 7)

You said AI wrote the rules, so they are not necessarily your opinion. The line I
am drawing: **anything with a source outside this repo is evidence and stays;
anything that is a product decision is taste and goes.**

**Kept, because there is a citation behind it:**

- **No resetting streak counter.** Marlatt's abstinence violation effect. This is
  Rule 3 and it is also the single most load-bearing thing in the design.
- **The good stretch is the hazard, not the bad night.** Eight sources and an
  RCT, and you reproduced it on yourself this week. It is why close calls are
  first-class rather than an afterthought.
- **The medical-risk gate.** Alcohol and benzodiazepine withdrawal can kill. Any
  screen that helps you set or restart a quit date has to route through it. This
  is a safety interlock, not a design opinion, and I will not build a door that
  goes round it.

**Dropped for this tool, because it is AI's taste:** the six flows, the three
copy versions, the nine-module learn spine, the shortlist page, the hub grouping,
the word budget. None of it is deleted — it stays at `/old`, unlinked.

**Added from the research, because the existing data model is missing it:** a
**who you were with** field. In a study of 791 quitters and 37,002 craving
entries, being alone was a top-five predictor of whether a craving became a
lapse. `ViceEpisode` records `where` and has no field for company — and
`data/again.ts:53` already asks in prose whether your attempts "ended in the same
company", with no way to answer it.

## Item 9 — should this be deployable from the start?

**No, and the reason is not speed.**

You decided on 2026-09-17 to leave Supabase for a managed platform with Postgres
on a private network. A new Supabase table today is a table that has to be ported
next month, and it would be the 35th `auth.users` foreign key to repoint on the
way. Building it now is writing code in order to throw it away.

But a real programmer would not do what the current vice module does either,
which is let the shape of the data be an accident of the UI. **What kills a
project is not `localStorage`; it is data born in a shape that cannot move.** So
Rule 4: the record is written today exactly as it would be written as database
rows — append-only, stable ids, ISO timestamps, a `version` field, nothing
derived ever stored — and **one service is the only thing in the codebase that
reads or writes it**. That mirrors the rule this repo already enforces, that
nothing outside `src/db/` talks to the database, which is the reason the platform
migration only rewrites twelve files instead of the whole app.

When the move lands, this becomes a repo and an API route and nothing else
changes. **Cost of doing it this way: about half a day over the careless
version.** Cost of not doing it: your multi-year record either dies in a browser
cache or gets hand-migrated.

One more thing that half day buys, and it is the reason export is in M6 rather
than "later": an export is not only insurance. Melanie Stefan proposed the "CV of
failures" in *Nature*, Johannes Haushofer published his and it went viral, and
Engineers Without Borders Canada publishes an annual **Failure Report** on
purpose. A record of your attempts that you can hold as a file is a different
object from a log trapped in an app.

## Built — what actually happened

Executed 2026-09-20. All six milestones shipped. Suite: **5,238 unit tests and
7 end-to-end tests green**, including the existing 184 the old module already had.

**Two faults my own tests caught while building:**

1. **The lifetime total dropped by one when a run ended.** Live runs counted
   today inclusively and ended runs did not. A number that ticks down at the
   moment somebody lapses is precisely what Rule 3 exists to stop, and it was
   invisible to every shape-based test. Run length is now inclusive at both ends.
2. **A label ran off the right edge, then did it again on a phone.** Fixed once
   at a hard-coded 62%, which fixed the laptop only; the threshold is now
   measured from the width the chart actually gets.

**Four faults a review pass caught that my tests did not:**

3. **Reports were dated in UTC while "today" was local.** `new Date().toISOString()`
   for the timestamp, then `slice(0, 10)` for the day — so a run ended at 23:30
   on a Saturday west of UTC was recorded as ending on the Sunday, and every
   length was a day out. This is the exact class `toDateISO` exists to prevent,
   reintroduced one layer above it. Now `nowInBrowser()`, local wall clock.
4. **The start date was free text.** Typing "16/08/2026" was accepted, stored,
   and turned every length and bar width into NaN — persisted, so a reload did
   not clear it. Now a native date picker plus `isCalendarDay` in the store.
5. **Import validated only that two arrays existed.** One malformed row was
   written to storage and then crashed the page on every load — with the only
   door back to a good import sitting on the page that no longer rendered. Every
   row is now checked before anything is replaced.
6. **"holding 1 days"**, and a `closeness` field that defaulted to 6, making its
   "did not say" state unreachable and never reading it back anywhere.

Each of the six has a test that fails if it returns.

**A seventh fault, found after the review, by asking whether the owner could
actually do the thing I had just told him to do:**

7. **There was no way to enter a run you had already had.** `startAttempt` only
   ever made a *live* run, and an ending was always dated *now* — so "I quit in
   February 2025 and it ended that May" could not be represented at all. The
   chart's whole value is that it accumulates, the reply said "go and put your
   real quit history in", and the screen had no door for it. Added
   `recordPastRun` (attempt and its ending written together, so a past run can
   never exist without the reason it ended), a `PastRun` dialog asking only two
   dates and an ending, and guards against a run that ends before it starts.

   This one is worth naming as a class: every test passed, the review passed,
   and the feature was still unusable for its stated purpose, because nothing
   had asked *can the user actually do the task this exists for*.

**One thing the screenshots changed.** On an empty record the copy said the
useful first move is entering the runs you already had, while the loudest button
said "Start a run". The emphasis now flips at zero runs — a screen whose primary
action contradicts its own copy is a screen that does not mean it.

**Also done, beyond the milestones:** the 101 unreadable spellings already in
`src/vice` (84 `text-zinc-600`, 17 at 10px) were fixed rather than grandfathered,
so the module joined the readability scan with an empty allowlist — shipping a
new screen beside unreadable old ones is how a rule becomes decorative. The new
copy was added to `viceCopyLint.test.ts` on the day it was written.

## Manual blockers

Attempted, with the result recorded.

1. **Starting state of the vice test suite** — *attempted, done.*
   `npx vitest run tests/unit/vice` → **9 files, 184 tests, all passing** on
   `training-rebuild` at the time of writing. The new work starts from green.
2. **Screenshot verification of M5** — *attempted, done.* Driven signed-in
   through Playwright against the real page with a seeded two-and-a-half-year
   record. `.playwright-mcp/blackbox-real-desktop.png` and
   `blackbox-real-phone.png`. Still the one thing the owner should judge with
   their own eyes rather than from a description.
3. **Shared checkout** — *attempted, done.* Another session
   (`daygame-coach-4b`) is live in this tree and messaged about
   `TrackTab.tsx` / `GoalHierarchyView.tsx`. None of my files overlap: this work
   is `src/vice/**`, `app/life-mastery/quit-vice/**`, `docs/`, and one scan list
   in `tests/unit/architecture.test.ts`. No stash, no `git add -A`.
4. **Whether anything else links to the old hub** — *attempted, done.* The full
   suite passes, including the navigation sweep, which caught a real one on the
   way: the new page had no way back and left a user stranded. `BackLink` added.

## Open questions

Each with a recommendation, so none of these block a start.

1. **The name.** *Recommendation: **Black Box**.* It is the recorder, not the
   crash — the thing that survives and tells you why — and Matthew Syed's *Black
   Box Thinking* already made the phrase mean exactly this. Alternative if it
   reads too grim to you: **The Log**.
2. **One vice or several?** *Recommendation: the data model carries a `viceId` on
   every attempt from day one; the screen shows one vice until you ask for more.*
   Costs nothing now, avoids a migration later.
3. **Does the old module stay reachable?** *Recommendation: yes, at
   `/life-mastery/quit-vice/old`, linked from nowhere.* You get isolation (item
   8); I delete nothing I would have to justify, and its 184 tests stay green.
4. **Storage key.** *Recommendation: a new key, `vice-blackbox-v1`.* The existing
   `quit-vice-v1` is **not read, not written and not migrated**, so nothing
   already in your browser is rewritten — which is on your always-ask list, and
   this is how the plan avoids needing to ask.

---

# The AI half — execution

## Files

**New**
- `src/vice/blackbox/blackboxStore.ts` — the only reader/writer. One
  `localStorage` implementation today, repo-shaped for the platform move.
- `src/vice/blackboxService.ts` — derivations: lanes, thought grouping, cost
  attribution, the signature. Pure; no storage, no dates from the server clock.
- `src/vice/components/blackbox/BlackBoxPage.tsx` — the landing page.
- `src/vice/components/blackbox/Lanes.tsx` — the picture.
- `src/vice/components/blackbox/ReportForm.tsx` — the one form (M2).
- `src/vice/components/blackbox/ThoughtAnswer.tsx` — the payout (M3, M4).
- `src/vice/components/blackbox/AttemptStart.tsx` — M1.
- `app/life-mastery/quit-vice/old/page.tsx` — the old `ViceHub`, moved.
- `tests/unit/vice/blackboxService.test.ts`, `blackboxStore.test.ts`,
  `blackboxMeaning.test.ts` (asserts on meaning, per `.claude/rules/generated-data.md`).
- `tests/e2e/blackbox.spec.ts`.

**Changed**
- `src/vice/types.ts` — add `ViceAttempt`, `ViceReport`, `ViceEnding`. Types stay
  in `types.ts`; the architecture test requires it.
- `app/life-mastery/quit-vice/page.tsx` — renders `BlackBoxPage`.
- `tests/unit/architecture.test.ts` — extend the `unreadableText()` scan from
  `src/programs` + `src/goals/components/north-star` to include `src/vice`.
- `docs/product/map.md` — the vice slice's one-liner, at M6.

**Untouched:** every existing file under `src/vice/` other than `types.ts`. The
old flows, tools, data and their 184 tests keep working.

## Constraints that will bite

- **Dates.** `no day is taken from the server clock` and `no NEW date derived by
  converting to UTC first` are both enforced. Attempt lengths are date
  arithmetic; use `src/shared/` date helpers, not `new Date()` maths.
- **Screens do not fetch.** `no NEW screen fetches its own data` — the page
  receives its record from the store through the service.
- **Readability.** The scan does not currently cover `src/vice`, and the existing
  vice components use `text-zinc-600`, which the rule calls below the contrast
  floor. New components use 11px and `text-zinc-500` minimum; M6 turns the scan
  on so this cannot regress.
- **Type exports only in `types.ts`.**
- **Load the `dataviz` skill before writing any of `Lanes.tsx`.**

## Order

M1 → M2 → M3 → M4 → M5 → M6, executed end to end without per-milestone approval,
with the M5 screenshot shown to the owner before M6 starts.
