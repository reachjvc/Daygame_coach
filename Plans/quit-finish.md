# Quit tools: finish them one by one

Written 2026-11-19 (Opus). Replaces `Plans/quit-review-fixes.md` (same day) and the "owner picks a variant per tool"
step of `Plans/quit-copy.md`. **Status: running. The order and the merges below are proposed; a tool counts as done
only when the owner says so.**

## Why

Owner, 2026-11-19: he does not want to review ~70 variants. He wants "a list of tools we intend to have, and then
begin working on finishing them one by one, on both browser and mobile, so that i can say 'this is done' and we dont
have to think so much about it anymore". Features he calls done are the ones that later move into his own rebuild
(memory `project-rewrite-with-jacob`: "only features both agree are DONE"; quit comes first).

The review of 2026-11-19 (about 150 findings; private reports with steps and screenshots in
`~/.cache/daygame-research/quit-review-2026-11-19/`: A–E and F1–F2 `-report.md`) is the fix list for every tool
below. Its main lessons, applied to every tool:

1. Tools must share one record per addiction (quit date, clean runs, slips, unit and price). Today three tools ask the
   date and disagree.
2. Nothing that a person entered may be lost by one tap: every reset asks first, example data never touches real data.
3. "For this moment" help must be chosen for that moment and doable right there.
4. No dead ends: no link to a tool that isn't finished, no "Coming soon" row that looks tappable.
5. Wording fits cigarettes, vapes and pouches (one helper from the data file), and every number shows its basis.

## The tools (nicotine; other addictions stay hidden until their content exists)

Status: **not started → building → checking → waiting for you → done (date, his words)**.

| # | Tool (menu name) | Built from | Folded in (nothing deleted; lab stays hidden) | Status |
|---|---|---|---|---|
| 0 | The frame: menu, shared record, page titles, links | wave-1 menu | — | live f9190770 (no owner check: it has no screens of its own) |
| 1 | Your quit date | lab `quitdate/best` | copy e's plan steps; the old "quit curve" hard-days calendar (mock F9kYB9… v2, study timing only) | waiting for you |
| 2 | Craving now? | lab `sos/best` | wave-1's voice step and "other side" answer; the craving log of `diary/best` | waiting for you |
| 3 | Your record (progress, money kept) | lab `progress/best` | the live counter feel of copies d and e | building |
| 4 | Slipped? Restart today | wave-1 `slip` | slips go into the shared record; clean runs never reset | building |
| 5 | The 12 lies test | wave-1 `beliefs` | from `beliefs/best`: a reply per belief, "can you stop?", earlier results | building |
| 6 | What you'll feel, and when | lab `timeline/best` | wave-1 `symptoms` (what helps per symptom) | not started |
| 7 | If-then plan | lab `ifthen/best` | — | not started |
| 8 | Daily check-in | lab `checkin/best` | slip question from `diary/best` | building |
| 9 | What it costs you | wave-1 `cost` | per-pack price and live update (copy e); money setup from the shared record | not started |
| 10 | Your past attempts | lab `past/best` | wave-1's "many tries are normal" number and "after the first slip" question | not started |
| 11 | Today's lesson | lab `lessons/best` | — | building |
| 12 | How people quit | wave-1 `how` | the sourced sections of `library/best`, shortened | building |
| 13 | What it gives you | wave-1 `gives` | — | building |
| later | Tell someone, Money on the line, Clear-out list, What helps besides apps, Who you are now | not built | accountability copies a, b, e as reference | not started |
| later | Talk to a coach | `/quit/coaching` | needs his price, guarantee wording and privacy email | hidden |

Order: the frame and the quit date first, because Craving now?, record, check-in, lessons and the timeline all read
the date. Then the tools used most during a quit. Until a tool is done, its menu row is greyed with "Soon" and can't be
tapped. Finished tools live at `/quit/nicotine/<tool>` (behind `?preview=1` until the public release).

## What "done" means (every tool)

1. Every flow works start to end on a phone (390x844, touch) and a computer (1280x800), and on the Android emulator
   (memory `android-emulator-rig`).
2. A three-reviewer walk finds no blocker and nothing "should fix": bugs (Sonnet), feel and look on phone and computer
   (Opus), content and sources (Opus). Same briefs as the 2026-11-19 review, narrowed to the tool.
3. Every finding the 2026-11-19 reports list for this tool and its folded-in parts is fixed or answered in the tool's
   brief.
4. Reads and writes the shared record; no question another finished tool already asked.
5. The owner tries one link on his phone and computer and says "done". It goes in the table with the date and his
   words, and nobody changes it again unless he reopens it.

## Recipe per tool (models per owner, 2026-11-18)

1. **Brief — Opus.** Written into this file under "Tool briefs": base, what to fold in, every report item for it,
   screen list, data it reads and writes, acceptance list. A builder decides nothing.
2. **Build — Sonnet**, in a git worktree, at the real address; tests and typecheck ratchet green; fast-forward to
   `main`.
3. **Check — three reviewers** (above) on the live site after deploy.
4. **Fix rounds — Sonnet**, until the check is clean. After three rounds still not clean: stop and write why here.
5. **His turn.** One task on his daily page (FJPtUMkj…, `days/<date>`): the link, three lines on what it does, "say
   done or tell Claude what's wrong". His notes are fixes for that tool, not new rules.

## BLOCKERS (each tried once on 2026-11-19)

| ID | What | Attempted, and what it returned | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | Saving quit data on the server for signed-in people needs new tables on the live database | No quit tables in `supabase/migrations`; `quit-tool.md` Phase 0 asked "live tables yes / not yet", never answered | Data that survives a new phone (his rule: user data on a server, never browser-only) | Ask him once. Until yes: works without an account, kept on the phone, and the tool says so in one line |
| B2 | Privacy contact email | `src/quit/data/contact.json` → `{"privacyEmail": null}` | Public release, deletion path | Ask at release, not before |
| B3 | Coaching price and guarantee wording | `quit-tool.md` records $200 and the guarantee; later he was "not sure about the prices" | Talk to a coach | Page stays hidden (tool 0 gates it) |

His note on the rebrand before/after page (2026-11-19 evening, "Talk to a coach"; copied here from
`Plans/rebrand-round-2.md`): *"i liked the one on the left more, but theres nothing here now"*. The page is
hidden on purpose (B3).

## OPEN QUESTIONS (proposed; he may veto)

| Question | Decision | Alternative | Cost if wrong |
|---|---|---|---|
| Q1 Which variant per tool | The table above, from the review scores | He picks on a review page | He said he doesn't want to review them |
| Q2 Folds (curve into quit date, symptoms into timeline, diary into Craving now?, library into How people quit) | Fold | Keep separate tools | Separate: the same things asked twice and 20 menu rows |
| Q3 Unfinished menu rows | Greyed "Soon", not tappable | Hidden | Hidden: the menu changes shape as tools finish |
| Q4 Account | Works without one; server saving once B1 is yes | Account required | Required: fewer people try it |

## Tool briefs

### Tool 0: the frame — brief (Opus, 2026-11-19) — build exactly this, decide nothing

**Release rule (owner, 2026-11-19: "no need to hide it, just have it be where you intend it to be").** Nicotine and
every BUILT nicotine tool open on production with no `?preview=1`. Two lists, two meanings:
- `src/quit/data/finished.json` = the owner said "done" (unchanged meaning).
- `src/quit/data/liveTools.json` = built and open to everyone (today `["date","sos"]`). It drives what is tappable on
  the menu, which tool pages answer 200 without the flag, and every link that points at a tool (footer "Craving now?",
  sticky bar, plan-step links, slip link). Unlisted tools stay greyed "Soon" and their page is a 404.
- `src/quit/data/live.json` = addictions open to everyone (`["nicotine"]`; the file must pass `validateLive`).
- Still hidden (404 in production): `/quit/coaching` (B3), other addictions (no content), `/quit/lab`. `?preview=1`
  remains a dev aid; no link may need it.

**How to add a tool when it is built:** (1) append its id to `src/quit/data/liveTools.json`; (2) make sure it is a
menu id in `menu.json`; (3) check every internal link on the new page goes only to live tools (use
`isLiveTool(id)` from `src/quit/menu.ts` for any link to another tool); (4) run vitest, then the e2e spec "a
production build links nothing that needs ?preview=1" (`E2E_PRODUCTION_BUILD=1`). Add it to `finished.json` only when
the owner says "done".

Model: Sonnet builds in a worktree (memory `worktree-e2e-servers`), Opus reads the diff.

1. **Shared record.** New `src/quit/record.ts` on the existing `quit-v1` store (`src/quit/store.ts`): per addiction
   one object `record` with `quitDate` (ISO date or null), `runs` (`[{start, end|null, endedBy: "slip"|"reset"|null}]`,
   never deleted, a new run starts on the next clean day), `slips` (`[{id, day, note?}]`, any day up to today, undo by
   id), `unit` (`{id, perDay, priceUsd, priceBasis: "typed"|"default"}`; price per pack/vape/tin as the data file's
   unit says). Pure functions with unit tests: `cleanDays(record, today)`, `currentRun`, `addSlip`, `undoSlip`,
   `setQuitDate` (changing the date never removes a past run). A React hook `useQuitRecord(addiction)`. No tool uses
   it yet except where steps below say.
2. **Unit wording helper.** `src/quit/wording.ts`: `useVerb(unit)` → smoke / vape / use a pouch; `didYouUse(unit)` →
   "Did you smoke?" / "Did you vape?" / "Did you use a pouch?". Unit tests.
3. **Menu.** `src/quit/data/finished.json` lists finished tool ids (starts `[]`). In `/quit/<addiction>`, a row whose
   tool isn't in that list shows greyed with a "Soon" pill and is not a link; finished rows are links. Wave-1 tools
   stay reachable by direct address for now (they are rebuilt one by one).
4. **Preview flag.** While `?preview=1` is on, every internal quit link keeps it: header link, footer "Free tools",
   coaching link, `/quit/coaching` "Free quit tools", back links (review A3, B9).
5. **Coaching page.** `/quit/coaching` answers 404 without `?preview=1`, like the other quit pages (B3).
6. **Titles and previews.** Each quit page gets its own `<title>` ("Quit nicotine · 10K Days Club", tool pages "<tool
   name> · Quit nicotine") and description without the word "dating" (A7).
7. **Signed-out 401.** Find what calls `/api/settings/time-preferences` on quit pages for signed-out visitors and stop
   that call when nobody is signed in (one console error on every page today).

Acceptance: unit tests for 1 and 2; Playwright at 390x844 and 1280x800 on live after deploy: menu rows not finished
are greyed and not links; menu → any link → back never shows a 404 with `?preview=1`; `curl /quit/coaching` → 404;
no console error on `/quit/nicotine?preview=1` signed out; typecheck ratchet green.

### Tool 1: Your quit date — brief (Opus, 2026-11-19) — build exactly this, decide nothing

Model: Sonnet builds in a worktree after Tool 0 is on `main` (it needs `src/quit/record.ts`); Opus reads the diff.
Address: `/quit/nicotine/date`. Menu: the row `curve` ("Your quit curve") becomes `date`, name **"Your quit date"**,
line **"Pick day 1. See the hard days on your calendar."**, group "Plan it", no pill. Built from lab `quitdate/best`
(`src/quit/lab/quitdate/best/*`, `shared/*`): move what is reused into `src/quit/tools/date/`; leave the lab files
untouched. Nicotine only: no addiction switcher. One question per screen on phones, a progress bar, in-page Back;
browser Back steps back; reload resumes on the same screen; a double tap never skips a screen (the 12 lies test bug).
Desktop (1280): same screens in a centred column about 560 px wide.

**Screens**

1. **What do you want?** Stop for good / Take a break / Not ready yet (texts from `bestText`).
2. **(Stop) Which day?** Chips in date order: **Today** (sub-line "Already off it? Today is your date."), Tomorrow,
   In 3 days, This weekend, Next Monday, In 2 weeks (skip a chip that falls on the same day as an earlier one). Then
   "Or pick a date": allowed from 1 year back ("I already stopped on…") to 42 days ahead. Past 28 days ahead, one
   plain information line (not a warning) from `evidence.ts` with its basis box: the Anesi line, and the Hughes &
   Callas line reworded to what the abstract says (later dates went with fewer quit attempts and more early lapses; the
   6-month result was only a trend). No line for dates up to 28 days.
3. **(Break) How long?** 1 week / 2 weeks / 4 weeks / a set date (as `best`), start date as screen 2.
4. **What do you use?** Cigarettes / Vape / Pouches (units from `nicotine.json`), "About how many a day?" (number, or
   "skip"), and the price per pack / per vape / per tin, prefilled from the data file with one basis line under it
   (source name and date; the vape price says it is from 2022). Commas and dots both work as decimal mark ("7,50" =
   7.50). Saved to `record.unit`. Skippable; asked here once, read later by cost and record.
5. **Your plan.** His five steps from `planSteps` as five short cards: title, one line, and the "do" lines folded
   under "What to do". Step 3 shows his date. Never a tick box for "Pick the date". A tool name inside a step is a link
   only when that tool is in `finished.json`; otherwise plain text. Fix the data text: step 1 "(the table above)" →
   "(the 12 lies test)"; "When one of the thoughts above comes up" → "When one of those thoughts comes up".
6. **Result: Your quit date.** The date large; "3 days to go." / "Today is day 1." / "Day 23."; **Add to calendar**:
   Google link and an .ics download, event title **"Day 1"** (neutral on a shared calendar), a reminder the evening
   before at 19:00 (VALARM), DTSTAMP = the time it was made. Below: **the hard days**, a 6-week calendar from the date
   (week rows, Monday first, today ringed), with three marked stretches and a basis box each: days 1–7 "hardest days
   for most" (Hughes 2007, single-author review: say so); most withdrawal back to normal within about 10 days
   (Shiffman 2006 diary study, n as in the data file); cue cravings can still be strong around day 35 (Bedi 2011, paid
   abstainers, tested at days 7, 14, 35 only: no claim about days 1–6). No minute or hour promise for one craving.
   Then "Change my date" and "Back to the menu".
7. **Not ready yet.** His step 1 with its "do" lines (fixed as in 5) and "Pick a date when you are ready" (goes to 2).

**Data (decided 2026-11-19 after reading Tool 0's diff):** clean runs and slips already live in the **Black Box**
(`src/vice/blackbox/*`, bridged for quit in `src/quit/blackbox.ts`): a browser copy, synced to the server
(`/api/black-box`) when signed in. The wave-1 tools file slips and close calls there. So runs and slips come only from
the Black Box, never from `record.ts`. Steps:
- In `src/quit/record.ts` remove `runs`, `slips`, `cleanDays`, `currentRun`, `addSlip`, `undoSlip` and their tests (no
  tool uses them). `record` keeps `quitDate`, `unit`, and gets `goal: "stop"|"break"|"later"|null` and
  `breakEnd: ISO date|null`. `setQuitDate` only sets the date.
- When the quit date is today or past and the Black Box has no living nicotine run, start one with `startAttempt` (or
  `recordPastRun` for a past date) with `startedOn` = the quit date. A future date starts no run; the first visit to
  this tool on or after that day starts it.
- While a run is living, the result shows "Day N" from that run, and "Change my date" is replaced by one plain line:
  "Your run started on <date>. Slipped? Use Slipped? Restart today." (a link only once `slip` is in `finished.json`).
  The date is never moved under a living run, so no clean day is ever lost.
- Before a run exists, changing the date asks nothing (nothing is lost) and simply sets the new date.

**Also fix:** (a) Tool 0 question: the sticky "Craving now?" bar, the footer "Craving now?" link and the "New here?
… 12 lies test" hint show only when their target (`sos`, `beliefs`) is in `finished.json`; until then they are not
rendered. (b) "Make your free plan" in the 12 lies test (wave-1 and lab) points to `/quit/nicotine/date` instead of
`/plan` (review A6, D).

**Acceptance (Playwright on live with `?preview=1`, 390x844 touch and 1280x800, screenshots looked at):**
1. Fresh: Stop → Today → Vape, 1 a day, price kept → plan → result shows "Today is day 1.", calendar from today with
   today ringed, three stretches with basis boxes.
2. Stop → In 3 days → result "3 days to go.", calendar starts at that date; chips are in date order on every weekday
   (unit test for each weekday).
3. Pick a date 30 days ahead → the information line shows; 20 days ahead → no line; 43 days ahead not allowed.
4. Past date ("Already off it", 20 days ago) → a living Black Box run starting that day, result "Day 21."; no
   "Change my date" while it lives; signed out the run is in the browser Black Box, signed in it reaches
   `/api/black-box` (test-stack account, never the live database).
5. Break → 2 weeks → result shows the end date and the countdown; with the clock past the end → "The break has
   ended" with Stop for good / Another break / Not now.
6. Not ready → step 1, no "above"/"table above" text anywhere on the page.
7. Price "7,50" saves 7.50; empty count is allowed; "abc" shows "Type a number, like 7.50".
8. Reload on every screen resumes there; browser Back steps back one screen; double tap on any answer moves one
   screen.
9. The .ics file parses (one VEVENT, one VALARM, DTSTAMP within a minute of now, SUMMARY "Day 1").
10. No console error; no sideways scroll; every tap target at least 44 px; the menu row "Your quit date" opens it.
11. Then the three-reviewer check (recipe step 3) and fix rounds; when clean, add `date` to `finished.json` and set
    the status to "waiting for you".

### Tool 2: Craving now? — brief (Opus, 2026-11-19) — build exactly this, decide nothing

Model: Sonnet builds in a worktree; Opus reads the diff and fact-checks the new text. Address: `/quit/nicotine/sos`
(replaces the wave-1 tool there; move what is reused from lab `src/quit/lab/sos/best/*` and `shared/*` into
`src/quit/tools/sos/`, keep the wave-1 voice step; never edit lab files). Menu line becomes **"Help in one tap:
breathe, move, play, or what to do right where you are."** Nicotine only: no addiction switcher. Desktop: centred
column about 560 px.

**Opening (every visit starts fresh):** the shelf shows at once, and a **10-minute wait ring starts by itself** at
the top ("Give it ten minutes", with 5 / 10 / 15 to change it; a tool, never a claim about how long a craving lasts).
A visit counts as new when the last one ended (after-flow done) or started more than 60 minutes ago; an old result
or "time is up" never shows on a new visit (review B1, C4). The ring keeps running while he is inside any tile. When it
reaches zero: a short vibration where the phone allows it (`navigator.vibrate(200)`, ignored elsewhere) and the line
"Ten minutes. How is it now?" with the after-flow buttons, also when he is inside a tile.

**Shelf (one tap each; phone Back inside a tile returns to the shelf, through a history entry per tile — C7):**
1. **What is it telling you?** The wave-1 voice step: the voice chips → "The other side" answer with its proof and
   basis box (from `beliefs` in `nicotine.json`, as wave-1 does). No tape. No swap card here (help for the moment does
   that). The chosen voice is kept for the log (`thought`).
2. **Hold to breathe** (lab best, unchanged).
3. **Move** → a timer tile: "Move for a few minutes": walk, stairs, or push-ups against a wall; a 5-minute countdown he
   starts. Basis box: Haasova 2013 (exercise cuts cravings soon after, in its studies; entry already in the data).
   Drop the "five minutes" claim and the Taylor 2007 "up to 50 minutes" quote from this tile (C6).
4. **Bubble wrap** and 5. **Block puzzle** (lab best, unchanged). The data text "Play three minutes of Tetris" →
   "Play three minutes of a falling-blocks game" (brand name, C23).
6. **What to do right here** (was "Help for this moment"): the 10 situations from `riskyMoments`; tapping one shows
   its three cards together, from a new data field `momentSwaps` (below). Nothing circular, nothing that takes days.
7. **Your reasons**: his reasons (typed once, kept) and, when the record has a past quit date and a unit with count
   and price, "About $X kept since <date>", worked out from those numbers, with the sum shown in one line under it.
   Never a typed money field (C22). Without those numbers: reasons only.

**After-flow** ("I'm through it" is always visible at the bottom of the shelf, and comes up when the ring ends):
"Did you <verb>?" from `wording.ts` (smoke / vape / use a pouch, from the record's unit; "use it" when no unit — C20),
with three answers:
- **No, I got through it** → "You got through this one." plus one optional row: how strong (1–10) and where (the
  situations). Saved as a close call in the Black Box (`fileCloseCall` in `src/quit/blackbox.ts`, `thought` from tile 1
  if used). A second save within 5 minutes updates the first (lab rule). Then "Back to the menu".
- **Still fighting it** → "Give it five more minutes" (restarts the ring at 5) and the shelf. Never the slip screen
  (B3).
- **Yes** → "A slip doesn't undo the days before." Saved as a slip in the Black
  Box (`fileSlip`), with **Undo** (the Black Box `undo`) for as long as the screen is open. Then a link to "Slipped?
  Restart today" when `slip` is in `finished.json`, else his step text: "Today, go back through steps 1–3 on paper."
Signed out, the line under the save says "Saved on this phone."; signed in, "Saved to your account." (Black Box
status).

**His pattern:** under the shelf, a bar list of the situations of his saved close calls and slips (from the Black
Box), from 3 saves on; before that one line: "After three saves, your most common moments show here."

**New data field `momentSwaps` in `nicotine.json`** (written by Opus, our own words; no numbers, so no sources):

| id | three cards |
|---|---|
| after-food | Get up from the table and clear your plate. · Brush your teeth or have a mint right now. · Walk around the block before you sit down again. |
| coffee | Drink it somewhere else today: another room, standing, or away from where you used. · Have gum or a mint with it. · When the cup is empty, get up and start the next thing. |
| drinks | Make the next round a soft drink. · Stay inside, away from where people go out to use. · Tell one person there: "I've stopped." |
| work-break | Take the break, but walk a lap of the building instead. · Get a drink or a snack and sit with someone. · Text a friend for the length of the break. |
| stress | Ten slow breaths before you decide anything. · Walk or take the stairs for a few minutes. · Write down in one line what's stressing you, to deal with after. |
| bored | Pop bubbles or play the block puzzle here for three minutes. · Do one small job you've put off: a dish, an email, a call. · Give your hands something: gum, a toothpick, a pen. |
| others-smoking | Stay inside, or walk the other way for a few minutes. · Say it once, plainly: "I've stopped." · Hold a drink or chew gum, so your hands and mouth have something. |
| late-night | Go to bed now. · Have a hot shower or a hot drink. · Text one person, or write down what you'd tell them. |
| waking | Get up straight away and drink a glass of water. · Change the first ten minutes: shower first, or step outside without it. · Eat something with your first drink. |
| driving | Put on a song you know by heart and sing it. · Have gum or a mint; keep a pack in the car. · Open the window and breathe slowly until the next stop. |

The validator (`src/quit/validate.ts`) checks every `riskyMoments` id has exactly three cards; other addictions'
files get the field empty.

**Acceptance (Playwright on live with `?preview=1`, 390x844 touch and 1280x800, screenshots looked at):**
1. First visit: shelf and running ring visible without scrolling on the phone; no question before the shelf.
2. Ring set to 5, page clock moved 5 minutes while inside Hold to breathe → the "How is it now?" line shows there.
3. Phone/browser Back inside each tile returns to the shelf, never off the page.
4. "In the car" shows the three driving cards; every situation shows its own three.
5. "No" → close call saved; reload → the pattern list counts it; a second save within 5 minutes updates it (one row).
6. "Still fighting it" → ring at 5:00, shelf; no slip text anywhere.
7. "Yes" → slip saved, Undo removes it.
8. Next visit (clock +61 minutes): fresh shelf and a new ring; no old result.
9. Record unit "vape" → "Did you vape?"; no unit → "Did you use it?".
10. Reasons with a past quit date, 10 cigarettes a day, $10.34 a pack of 20, 30 days → "About $155 kept" with its sum
    line.
11. No console error, no sideways scroll, tap targets at least 44 px; signed in on the test stack, the close call
    reaches `/api/black-box`.
12. Then the three-reviewer check and fix rounds; when clean, add `sos` to `finished.json` (which also brings back
    the "Craving now?" bar) and set the status to "waiting for you".

### Tool 3: Your record — brief (Opus, 2026-11-19) — build exactly this, decide nothing

Model: Sonnet builds in a worktree; Opus reads the diff. Address: `/quit/nicotine/record` (the menu row id `record`
already exists). Built from lab `progress/best` (`src/quit/lab/progress/best/*`, `shared/calc.ts`, `shared/Bits.tsx`):
move what is reused into `src/quit/tools/record/`; never edit lab files. Folded in: the live counter of copy d (a
ticking days / hours / minutes / seconds clock and the money tile that moves with it) and the ring of copy e (a ring
that fills, with the run numbers beside it). Nicotine only: no addiction switcher (review C21). Desktop (1280): the
same screens in the page column, like Tools 1 and 2. All choices below are **proposed**; the recommendation is the
first option each time.

**Menu row:** name **"Your record"**, line **"Every clean day counts. Close calls beaten. Never resets."**, group
unchanged, `account: "none"` (works without an account, like Tools 1 and 2), wave 1 in `menu.json` and in
`src/quit/tools/registry.ts` (today wave 3, which shows "Coming soon").

**Data: it asks nothing another tool asks.**
- Runs, slips and close calls come only from the Black Box (`src/quit/blackbox.ts`, the same bridge pattern as
  `DateTool.tsx`: `useSignedIn(false, true)`, signed-in or local bridge mounted at one place). Totals use the Black
  Box's own maths (`forVice` + `stats` / `runLanes` / `runDays` in `src/vice/blackboxService.ts`), so "total clean
  days", "Day N" in Your quit date and the Black Box page always agree (review C3: the same 21 days showed 21 in one
  tool and 20 in another). The quit day itself is day 1, never 0 (C18).
- Quit date, goal, break end, unit, count a day and price come from the shared record (`useQuitRecord`). The price is
  per cigarette, per disposable vape, per can, as Tool 1 saves it (not per pack).
- Its own data (spending and targets) is kept in the `quit-v1` store under the tool key **`record-tool`** (the key
  `record` is the shared record). One line under it: "Your spending and targets are kept on this phone." (B1).
- Starting a run: when the record's date is today or past, the goal is stop or break, the Black Box is `settled`, and
  the Black Box holds no nicotine run (living or ended) that started on or after that date, start one on that date
  (`startRun`), as Your quit date does. Never otherwise (a run ended by a slip is not restarted here: that is Tool 4).
- It logs no slips (Tool 4 does) and removes no runs (the Black Box page does).

**Money kept (one shared function, `src/quit/money.ts`, unit tests):** clean time × count a day × price of one −
spending. Clean time per run: from 00:00 of its start day to now while it lives, to 00:00 of its end day once a slip
ended it (the slip day is not counted for money). It ticks live. Tool 2's Reasons tile keeps its own line ("About $X
kept since <date>", from the current quit date; Tool 4 S2): both read the same count and price from the shared
record, so none is typed twice (C3). Units not used
= clean time × count a day, rounded down. Without a count or a price: the money and units tiles show "–" and "Add your
numbers" (below). Negative money is shown as "−$367.46" (minus before the dollar sign) with the line "Spending is
more than the money kept so far." (C15).

**Screens** (a tab row at the top: **Home · Money · Milestones · Calendar**, each with a lucide icon and a 14 px or
larger label, at least 44 px high (C25); each tab is a history entry `?tab=money`, so browser Back returns to the
previous tab and reload stays on it; `?preview=1` kept):

1. **Home.**
   - **The ring (copies d and e):** about 200 px on a phone. Inside: total clean days, large, "clean days in all".
     The ring fills toward the next step of the clean-day ladder ("7 of 14"), and one dot runs round it once a minute
     (copy d's sweep; still with `prefers-reduced-motion`).
   - **Live counter** under the ring, ticking each second: "This run: 4 d 14 h 23 min 05 s", line under it "Day 5 ·
     since Thu, Nov 12". Tap → "Counted from the start of the day you picked; the time of day is not kept."
   - Three cards in a row: **This run** (days), **Best run** (days), **Close calls beaten** (the vice's
     `closeCallsSurvived`). Tap each → its formula line (as `best`).
   - Three tiles: **Money kept** (live, cents), **Cigarettes not smoked** (unit word from the data file: cigarettes /
     disposable vapes / cans of pouches; live), **Price of one** (with the price basis: Tool 1's `priceBasis` line, or
     "Your own price." when typed — C24). Tap → formula with his real numbers, e.g. "10 a day × $0.52 × 23.6 days
     clean − $0.00 spent = $122.72". Plural right for 1 (C15 "× 1 clear days").
   - **Next step:** "Next: 14 clean days, on Wed, Nov 25 if this run keeps going."
   - **Your runs:** newest first, each "9 days · Oct 20 to Oct 28" or "Going now", close calls in it, and for an ended
     one "Ended by a slip on Oct 28" with the slip's thought (`break-words`, C17). Line: "Every run stays. Nothing is
     wiped."
   - **No run going** (all runs ended by slips): the ring and totals stay; the counter is replaced by "No run going.
     Your 23 clean days still count." and a link to "Slipped? Restart today" when `slip` is open (see Links), else
     the plain line "Start your next run in Slipped? Restart today."
2. **Money.** The total, large and live. Period tabs **Total · Last 7 days · Last 30 days · Last 365 days** (clean
   time inside the window × rate − spending dated inside it; rolling windows, so no "yesterday only" mixed with
   today's spending — C15). The formula line under it. **Your amount a day** "10 cigarettes × $0.52 = $5.20 a day" with
   **Change**: the same two fields as Tool 1 screen 4 (count, price), prefilled, saved to the shared record (it is the
   same answer, not a second question), parsed with Tool 1's `parseTyped` ("7,50" = 7.50; "abc" → "Type a number,
   like 7.50"; count up to 500, price up to 1000 — C19). When the record has no unit: **Add your numbers** opens the
   same form with the unit chips of Tool 1 screen 4. Projections per month (× 365 ÷ 12) and per year (× 365) with
   their formula lines. **Spent on it or on replacements** (gum, patches, a vape bought): amount (up to 100,000) and
   what for (60 characters, `break-words`), dated today; each row has Remove, and a removal shows "Removed. Undo" for
   as long as the screen is open. **Your targets:** name (60 characters) and price (up to 100,000), filled in order
   from the money kept, progress bar, days to go at his rate counted from the real (possibly negative) total (C15),
   Remove with Undo.
3. **Milestones.** Clean-day ladder 1, 3, 7, 14, 30, 60, 90, 180, 365: reached ones with the date of that clean day
   (across all runs); the next ones "N clean days to go" and, while a run lives, "on <date> if this run keeps going".
   Money ladder $10, $25, $50, $100, $250, $500, $1,000, $2,500: reached only while today's money kept is at or above
   it (so spending can take a step back, C15), with the first day it got there; else "about N days at your rate".
   No badge art, no exclamation marks.
4. **Calendar.** Month grid, Monday first, from the month of the first run to this month (Prev / Next stop there).
   Clean days filled, slip days dashed (no red), close-call days with a small dot, today ringed, other days plain.
   Tap a day → its line: "Clean. Day 5 of the run that started Nov 12." / "Slip: <thought>" / "Close call beaten:
   <thought>" / "Not part of your record." No slip logging here.

**Before day 1:**
- No date (or goal "later") and no run in the Black Box: "Your record starts on your quit date." with a button to
  Your quit date (link rule below), and **See an example**: the same screens filled from an example made in memory
  (two runs, one ended by a slip, three close calls, 10 cigarettes a day at $0.52, one target). A bar on every screen:
  "Example. Nothing here is yours, and nothing is saved." with **Leave the example**. Nothing in the example touches
  storage or the Black Box (lesson 2, C16).
- Date in the future: "3 days to go. Your record starts on Sat, Nov 21." and the same "See an example"; no counter that
  counts up before day 1 (F1 quitdate/d, progress/c).
- Goal "break": a line under the counter "Break: ends Thu, Dec 3." After that day: "Your break ended on Dec 3." with a
  link to Your quit date.

**Links:** a link to another quit tool (Your quit date, Slipped? Restart today) is drawn only when that tool is open
to the public (the visible-tools list, `isFinished` until the visibility agent's list lands); otherwise plain text.

**Report items for this tool** (review C, E, D, F1, 2026-11-19), each answered above: C3 (one date, one slip log,
same day counts, SOS reads money from here), C15 (negative money, milestones, targets, plural, Day tab), C16 (no
one-tap wipe: there is no "Start over"; example data never stored; removals have Undo), C17 (long text), C18 (day 0,
live counter, flat look), C19 (limits and empty count), C21 (switcher), C24 (price basis with the ÷ 20 and the vape
date, via Tool 1's basis line), C25 (tab labels), D35 (no icon, colour or progress visual: the ring), E5 (cost and
progress were one money tool twice: proposed, Your record holds money kept since quitting; Tool 9 "What it costs you"
becomes the before-quitting calculator reading the same record unit), F1 progress/c and quitdate/d (counting before
day 1). Not taken from `best`: the addiction switcher, setup form (Tool 1 asks it), "Log a slip" (Tool 4), "Start
over", the example seed that wrote into his data.

**Acceptance (Playwright `tests/e2e/quit/record.spec.ts`, 390x844 touch and 1280x800, clock fixed; screenshots
looked at):**
1. Fresh, no date: the empty state and the link or plain text to Your quit date; See an example fills every tab;
   Leave the example → empty again and storage (both `quit-v1` and the Black Box key) unchanged.
2. Date today via the record (no run): the tool starts a run; Home shows 1 clean day, "Day 1", the counter ticks
   (clock +65 s moves the seconds).
3. Past date 20 days ago, 10 cigarettes at $0.52: 21 clean days; money tile and Money total agree; the formula line
   holds 10, $0.52 and the clean time.
4. A slip filed in the Black Box on day 10, then a new run: total clean days keep the first run's days; Your runs
   lists both; the calendar marks the slip day dashed.
5. Spending $500: money shows "−$…" with the line; the $100 step is not reached; a target's days to go grow; Remove →
   Undo puts it back.
6. Change: "7,50" saves 7.50 to the shared record (Your quit date shows it); "abc" shows the error; 501 refused.
7. Future date: countdown, no counter.
8. Tabs: Back returns to the previous tab, reload stays; a 200-character unbroken text in a spend note does not widen
   the page.
9. No console error; no sideways scroll; every tap target at least 44 px; the menu row "Your record" opens it once
   it is open to the public.
10. Then the three-reviewer check and fix rounds; when clean, set the status to "waiting for you".

**Proposed (owner may veto):** R1 the big number is the Black Box's total clean days (slip day counted, as everywhere
else), while money counts clean time without the slip days; alternative: count money on the same days (one day more
per slip). R2 the live counter starts at 00:00 of day 1, because no tool keeps the hour he stopped; alternative: ask
the hour in Your quit date. R3 Your record holds money kept since quitting and Tool 9 becomes the calculator before
quitting (E5); alternative: one money tool. R4 spending and targets stay on the phone until B1 is answered.

### Tool 4: Slipped? Restart today — brief (Opus, 2026-11-19) — build exactly this, decide nothing

Model: Sonnet builds in a worktree; Opus reads the diff. Address: `/quit/nicotine/slip` (rebuilds wave-1 `slip` in
place in `src/quit/tools/slip/`). Menu line becomes **"Save the slip, keep your days, pick a new day 1."** (the old
"3 taps" was wrong: review B20). Nicotine only. One question per screen on phones, progress bar, in-page Back,
browser Back steps back, reload resumes, a double tap never skips a screen or files twice. Desktop: the same screens
in the page column, as the date and craving tools.

**Data (no new tables, no record.ts runs):** the slip goes into the **Black Box** (`src/quit/blackbox.ts`), for every
visitor: `BlackBoxBridge` signed in, `LocalBlackBoxBridge` signed out (as Tool 2 does, `useSignedIn(true, true)`).
Wave-1 only bridged when signed in, so signed out nothing was saved (B19). A slip ends the living run (Black Box rule);
the ended run and its days are never removed or changed (clean runs never reset). The new day 1 is written to
`record.quitDate` (`useQuitRecord().setQuitDate`), so the date tool and the craving tool count from it and the date
tool never tries to restart a run on the old date. Two small additions to `src/quit/blackbox.ts` (keep every
existing export): `amend` also takes `thought?: string` and `ending?: ViceEndingId`; new
`removeRun(attemptId): boolean` that removes a run only when it is living and has no living reports (for Undo and for
changing a new day 1 from today to tomorrow). Unit tests for both.

**Three cases, read from the Black Box once it is `settled` (never guess before; show nothing but the heading):**
- **A. A run is living** → the questions, then file the slip with `fileSlip`.
- **B. The latest nicotine run ended with a slip and no later run lives** (e.g. Tool 2 "Yes" filed it): never file
  again. Line on top: "Your slip on <weekday day month> is in your record." Ask only what that report lacks: "Where
  were you?" when its `where` is empty, "What did the voice say?" when its `thought` is empty; save the answers with
  `amend`. Nothing missing → straight to the result.
- **C. No run at all.** When `record.quitDate` is today or past, start the run on it first (the date tool's rule:
  `startRun(quitDate)`), then case A. Otherwise ask screens 2 and 3 (nothing is filed: there is no run to end), and
  the result says in one line "You had no run on record, so nothing was saved as a slip."
- Before A: when `record.quitDate` is later than the last slip day and today or past (a new day 1 has come), start
  the run on it, then case A. So "Tomorrow" chosen yesterday starts by itself.

**Screens (case A):**
1. **When was it?** Today / Yesterday / Another day (opens a date field; min = the later of the run's start and the
   run's latest report day, max = today; that is what `fileReport` accepts, so it never refuses silently). A chip
   whose day is before the min is not shown. When only today is possible, skip this screen (step count drops to 2).
   Replaces wave-1 "Earlier this week" (= a guessed 2 days ago).
2. **Where were you?** The 10 `riskyMoments` chips (same list and labels as Tool 2's row, so its pattern list counts
   slips too; replaces the separate `endings` list, review D6) and "Somewhere else". Continue; a plain "Skip" link.
   Saved as the report's `where` (empty for skip / somewhere else).
3. **What did the voice say?** The 12 belief `short` chips and "Something else", which opens a text field with a
   **visible** label "In your words (optional)" (B21), max 80. Continue files the slip (thought = `slipThought`,
   ending = `endingForBelief`, `at` = `reportAt(day, today, nowInBrowser())`); "Skip" files with an empty thought.
   One filing per visit (ref guard; a saved `reportId` that `has()` still holds is never filed again).

**Result** (all cases; `data-testid="result"`):
1. Heading **"A slip doesn't undo the days before."** (the same line as Tool 2's Yes screen).
2. **Your days** card: "Your run: <start> to <slip day>, N days. It stays in your record." N = `runDays` from
   `src/vice/blackboxService.ts` (the Black Box's own count, first and last day included), with a basis line "Counted
   like your Black Box: from day 1 to the slip day, both counted." With more than one ended or living nicotine run:
   "All your runs together: M days." (sum of `runDays`). Dates as "Wed 29 Oct", never ISO (B21). The save status
   line as Tool 2: "Saved on this phone." / "Saved to your account." / "Saving to your Black Box..." and **Undo**
   while the screen is open (case A only). Undo removes the new run first if this visit started one
   (`removeRun`), then the slip (`undo`, which brings the run back), and puts `record.quitDate` back to what it was.
3. **Back through steps 1 to 3** (same three names as Tool 2's text: your top lies, your swaps, a new day 1; no
   intro line under the heading, rulebook rule 6):
   - **1. Your top lies.** First the lie he named on screen 3 (or the one Tool 2 saved, matched by its `short`): its
     `limiting` line, then its `counterpart` and `proof` with the source tap and `counted` line. Then his top lies
     from the 12 lies test (`topBeliefs` on the test's saved ratings, read through the test's own parse function on
     main at build time; Tool 5 is rebuilding it), each as its counterpart, without repeating the named one. Neither:
     plan step 1 title and text; "the 12 lies test" is a link only when that tool is tappable.
   - **2. Your swaps.** When he said where: the place label and its three `momentSwaps` cards (as Tool 2's "What to do
     right here"). Else, when he named a lie: the three swaps of that lie's `need` (with their evidence chip). Plus
     the swaps he marked tried in `gives` (as wave-1). Nothing: plan step 2 title and text.
   - **3. A new day 1.** Chips **Today** (only when the slip day is before today; the Black Box does not allow a new
     run on the slip day itself) and **Tomorrow**; one must be tapped. Shown as "Day 1: Thu 20 Nov". Today: starts
     the run now (`startRun(today)`), sets `record.quitDate`, line "Your new run started today." Tomorrow: sets
     `record.quitDate` to tomorrow, line "It starts by itself when you open this tool or Your quit date that day."
     Switching Today → Tomorrow while the screen is open removes the run just started (`removeRun`). The date is
     fixed when tapped (a later visit never shows a day 1 in the past, B20).
4. No closing "Every day you keep that promise..." line (B21, D26: out of context and a rule-6 verdict line). The
   days card carries that point with his own numbers.
5. "Back to the menu". No "Clear my answers", no link to `/plan/quit-vice` ("Start the new run in your Black Box"):
   this tool starts the run itself.

**Visits:** a new visit with a living run that this tool did not start in its last visit begins at screen 1 with empty
answers (no stale result, B20). The result comes back on reload only while it still describes the latest slip (no run
lives, or the living run is the one this visit started).

**Tool 2 consistency:** Tool 2's Yes screen keeps its text and links here once `slip` is tappable; arriving from it is
case B, so the slip is never filed twice and its questions are not asked again. Never ask "Did you <verb>?" here.

**Review items covered:** B19 (answers used on the result, signed-out saving), B20 (stale result, menu line), B21
(closing line, raw date, unlabelled text box), D6 (one situation list, one slip owner: the Black Box), D26 (rule 6
phrase, "a new day 1" now keeps every past day), C8 (no double slip: one filing guard, Undo), B32 (no `/api/whoami`
401 signed out: `useSignedIn(true, true)`).

**Acceptance (Playwright, local test stack then live with `?preview=1`, 390x844 touch and 1280x800, screenshots
looked at):**
1. Signed out, a living run started 20 days ago (seed the browser Black Box): Yesterday → In the car → "Just one
   won't hurt" → result: days card "21 days" with dates as words; the lie's counterpart and proof; the three driving
   cards; Black Box in localStorage has the slip with `where: "driving"` and the run ended yesterday.
2. Day 1 Today → a new living run starting today; date tool `/quit/nicotine/date` shows "Today is day 1." and no
   refusal notice. Switch to Tomorrow → that run is gone, `record.quitDate` = tomorrow.
3. Undo → the slip is gone, the old run lives again, the new run is gone, `record.quitDate` back.
4. Tool 2 "Yes" with a living run, then open slip → case B: "Your slip on ... is in your record", only "Where were
   you?" asked (Tool 2 had a voice) → result; the Black Box holds one slip only.
5. Run started today: screen 1 is skipped; result offers only Tomorrow.
6. Another day: the date field refuses a day before the run's start.
7. No run and no quit date: screens 2 and 3, result with the "nothing was saved" line, Tomorrow sets the date.
8. Double tap on the last Continue files one slip; reload on each screen resumes; browser Back steps back.
9. Clock moved to the next day after choosing Tomorrow → opening slip starts the new run and shows screen 1.
10. Signed in on the test stack: the slip reaches `/api/black-box`.
11. No console error, no sideways scroll, tap targets at least 44 px, the menu row opens the tool.
12. Then the three-reviewer check and fix rounds; status "waiting for you".

**Proposed (owner may veto):** S1 the days card uses the Black Box count (slip day included) so every tool shows the
same number; alternative "days without it" (slip day not counted), which disagrees with the Black Box page by one.
S2 Tool 2's "About $X kept since <date>" counts from the new day 1 after a slip (it reads `record.quitDate`);
recommendation: Tool 3 sums money over all runs, and Tool 2 keeps its line. S3 the wave-1 `endings` list stays in the
data file (past attempts uses it) but this tool no longer asks it.

### Tool 8: Daily check-in — brief (Opus, 2026-11-19) — build exactly this, decide nothing

Model: Sonnet builds in a worktree; Opus reads the diff. Address: `/quit/nicotine/checkin` (menu row id `checkin`
exists). Built from lab `checkin/best` (`src/quit/lab/checkin/best/*`, `checkin/shared/*`): move what is reused into
`src/quit/tools/checkin/`; never edit lab files. Folded in: the slip question of lab `diary/best` ("Did you smoke?"),
which here files the slip in the **Black Box**, the same way Tool 2's "Yes" does, and hands the rest to Tool 4.
Nicotine only: no addiction switcher. One question per screen on phones, a progress bar, in-page Back, browser Back
steps back, reload resumes, a double tap never skips a screen or files twice. Desktop (1280): the same screens in the
page column, like Tools 1 to 4. All choices below are **proposed**; the recommendation is the first option each time.

**Menu row:** name **"Daily check-in"**, line **"Morning: how hard will today be? Evening: how did it go?"** (the
old "30 seconds a day for the first 2 weeks" had no basis), `account: "none"`, wave 1 in `menu.json` and
`src/quit/tools/registry.ts`; add `checkin` to `liveTools.json` when built.

**Data: it asks nothing another tool asks, and has one slip owner (review D6).**
- Its own answers are kept in the `quit-v1` store under the tool key **`checkin`**: `{ days: Record<ISO day, Day>,
  draft: {kind, date, step, answers} | null }`, `Day = { pledge?, forecast?: 1-5, slipped?: boolean, hard?: 1-5,
  urges?: 1-5, feelings?: string[], note?: string, slipReportId?: string }`. A parse function drops bad parts (unit
  tests). One line on the Today tab: "Your check-ins are kept on this phone." (B1).
- **Slips go to the Black Box**, for every visitor: `BlackBoxBridge` signed in, `LocalBlackBoxBridge` signed out,
  `useSignedIn(true, true)` (no `/api/whoami` 401 signed out), exactly as `SosTool.tsx` mounts them. Filing waits
  until the Black Box is `settled`.
- A day that already holds a living Black Box slip (filed by Craving now?, Slipped? Restart today, or the Black Box
  page) is never asked "Did you smoke?": the evening opens with "Your slip on Thu 19 Nov is in your record." and goes
  on to the next question; the day counts as slipped everywhere in this tool.
- It starts no runs and ends none except by `fileSlip` (Tool 1 and Tool 4 own runs). It reads the unit from the shared
  record only for the verb (`didYouUse` / `useVerb` in `src/quit/wording.ts`: smoke / vape / use a pouch, "use it"
  with no unit).

**The slip question (from diary/best, review D4: the one answer that matters goes first).**
Evening step 1 is **"Did you <verb> today?"** ("…that day?" when filling a past day, review D13): **No, a clear
day** / **Yes, I <past verb>**. The answer is saved at once (no Next needed to keep it).
- **Yes, with a living run** → `fileSlip({ at: reportAt(day, today, nowInBrowser()), thought: "", ending:
  endingForBelief(null, beliefs) })`; the id is kept as the day's `slipReportId`. Under the question:
  "A slip doesn't undo the days before." (Tool 2's line), the save status line as Tool 2 ("Saved on this phone." /
  "Saved to your account." / "Saving to your Black Box..."), **Undo** while the screen is open, and the link
  **"Slipped? Restart today"** to `/quit/nicotine/slip` when `isLiveTool("slip")`, else Tool 2's plain step text.
  Tool 4 then sees case B (the latest run ended with a slip) and asks only where, the voice and a new day 1, so this
  tool never asks where or the voice (no question twice).
- **Yes, the Black Box refuses** (the day is before the run's start or before its latest report) or **no living run**
  → kept in the check-in only, with one line: "You had no run going that day, so nothing was saved as a slip."
- **Changing Yes → No** for a day with a `slipReportId`: `undo(id)`; when undo is refused (a later run exists),
  the answer stays Yes with the line "This slip is in your Black Box; remove it there." and a link to the Black Box
  page only when that page is public, else plain text.
- One filing per day: a ref guard plus `has(slipReportId)` (Tool 4's rule).

**Screens** (a tab row at the top: **Today · Month · Pattern · Reminders**, each with a lucide icon and a 14 px or
larger label, at least 44 px high; each tab is a history entry `?tab=month`, so Back returns to the previous tab and
reload stays; no heading intro lines, rule 6, review D24):
1. **Today.** The date as "Thu 19 Nov" (the format Tool 4 uses; review D32). Two cards with icons (lucide `Sun`,
   `Moon`; review D35): **Morning** (pledge and forecast, or "Not done yet", button Start / Change) and **Evening**
   (result, how hard, or "Not done yet", button Start / Change). "Fill in yesterday, Wed 18 Nov" only when yesterday
   has no evening answer **and** he has at least one earlier entry (review D14: not on the first day). **This month**
   card: days checked in, clear days, and the line "A slip or a missed day does not reset anything. Each month is
   counted on its own." On days 1 to 7 of a month the card also shows last month's two numbers (review D30).
2. **Morning flow** (2 screens): "Your pledge for today" (one line, up to 140 characters, optional, label visible) →
   "How hard do you expect today to be?" (worded 5-step scale: Easy / Fairly easy / In between / Hard / Very hard,
   each with its number). Save.
3. **Evening flow** (up to 5 screens): Did you <verb>? (above) → "How hard was today?" (same worded scale; "This
   morning you expected: Hard (4)" only when a forecast exists, review D13) → "How strong were the urges?" (same
   scale) → "What did you feel?" (a short list of its own, 10 chips: Stressed, Bored, Tired, Restless, Low,
   Short-tempered, Lonely · Calm, Proud, Clear-headed; review D15: the 27 symptom words included things that are not
   feelings) → "A note, if you want one" (textarea, 500 characters, `break-words`). From step 2 on each screen has
   **Next** and **Done for today** (saves what is answered and goes to the done screen; review D16). The draft is
   saved on every tap, so a reload resumes on the same screen with the answers (review D16). For a past day every
   question says "that day", never "today" (D13).
4. **Done screen.** "Saved for Thu 19 Nov" and the day's summary (outcome, expected vs it was, urges, feelings, pledge,
   note). Back to today.
5. **Month.** Month grid, Monday first, Prev / Next (from the month of his first entry, or this month, to this month),
   counts for that month. Mode chips **Clear days · How hard · Feelings · Notes** that wrap at 390 px, never cut off
   behind a fade (review D31). Slip days from the Black Box show as slipped even without a check-in. Tap a day: its
   summary and, for any day from 60 days back to today, **Fill in this day** / **Change** (opens the evening flow for
   that day; review D14). Future days are not tappable.
6. **Pattern.** Only lines that can predict: the morning forecast (review D17: urges and feelings are answered the
   same evening as the slip, so "proud → no slip" is the result, not a pattern). From 14 evenings with a result
   ("Pattern lines start once you have 14 check-ins with a result. You have 3."): "On the 6 days you expected it to be
   hard, you slipped on 2; on the other 10 days, on 1." when each side has 3 or more days and the shares differ, else
   "No pattern yet". Plus the pairs line ("Of 12 days with a forecast and a result, it was harder than you expected on
   4, easier on 5 and the same on 3."). One line under: "These lines count only your own days. They are not a study."
   Urges and feelings are not compared.
7. **Reminders.** No notifications are possible, so a stored time alone does nothing (review D23 for lessons, same
   flaw). Two time fields (morning 08:00, evening 21:00) and **Add to calendar**: an .ics download with two daily
   repeating events (`RRULE:FREQ=DAILY`), titles "Morning check-in" / "Evening check-in", a link to the tool in the
   description, DTSTAMP = tap time (build it like Tool 1's `icsFor`), and a Google Calendar link for each. Times kept
   in the tool store.

**Before any entry:** the Today tab as above (empty cards), plus **See an example**: every tab filled from the lab's
20-day seed held in memory only, with a bar on every screen "Example. Nothing here is yours, and nothing is saved."
and **Leave the example**. Nothing in the example touches storage or the Black Box (review D1: the lab's "Load example
data" wiped his own days in one tap). The example never files a slip.

**Report items for this tool** (review D, A, E, F1, 2026-11-19), each answered above: D1 (example wiped his data),
D4 (slip question buried), D6 (three slip logs, two situation lists, same feelings list twice: one slip owner, the
Black Box; feelings list of its own), D13 (yesterday flow said "today"), D14 (missed days could never be filled;
look-back on day one), D15 (27 chips, not feelings), D16 (5 screens, no early save, reload lost answers), D17
(circular pattern lines), D24 (intro line under the heading), D30 (1st of the month shows 0), D31 (cut-off chip), D32
(date format), D35 (no icon or colour), A4 (menu row was "Coming soon"), A21/B32 (signed-out 401), D23 analogue
(reminder that never reminds). Not taken from `best`: the addiction switcher, "Load example data" / "Clear example",
the 27-word feelings list, urges and feelings pattern lines, the time-only reminders.

**Acceptance (Playwright `tests/e2e/quit/checkin.spec.ts`, 390x844 touch and 1280x800, clock fixed; screenshots
looked at):**
1. Fresh: Today shows two empty cards, no "Fill in yesterday"; See an example fills Month and Pattern (pattern lines
   show); Leave the example → empty, and `quit-v1` and the Black Box key in localStorage are unchanged.
2. Morning: pledge "No smoking at the bar" + Hard (4) → Today shows both; reload keeps them.
3. Evening with a living run (seed the browser Black Box, run started 10 days ago): Yes → slip in the Black Box for
   today, the run ended; status "Saved on this phone."; Undo → slip gone, run living; Yes again → one slip only after
   a double tap.
4. Slip link: with `slip` live it goes to `/quit/nicotine/slip`, which shows Tool 4's case B (once Tool 4 is on main).
5. A slip filed by Craving now? today → the evening does not ask "Did you smoke?" and shows "Your slip on … is in your
   record."
6. No run: Yes → the "nothing was saved as a slip" line, Black Box untouched.
7. Evening: answer step 1, tap Done for today → done screen; reload mid-flow on step 3 resumes on step 3 with answers.
8. Yesterday flow: every question says "that day"; a cell 20 days back → Fill in this day works; a future cell is not
   tappable.
9. Month at 390: all four mode chips fully visible; on the 3rd of a month last month's numbers show.
10. Pattern: 14 evenings seeded → the forecast line shows with its four numbers; no feelings or urges line.
11. Reminders: the .ics parses (two VEVENTs, each `RRULE:FREQ=DAILY`, DTSTAMP within a minute of now).
12. Vape unit → "Did you vape today?"; no unit → "Did you use it today?".
13. Signed in on the test stack: the slip reaches `/api/black-box`.
14. No console error; no sideways scroll; tap targets at least 44 px; a 300-character unbroken note does not widen the
    page; the menu row opens the tool; tabs: Back returns to the previous tab, reload stays.
15. Then the three-reviewer check and fix rounds; status "waiting for you".

**Proposed (owner may veto):** K1 the check-in files slips in the Black Box and links to Slipped? Restart today for
where, the voice and a new day 1; alternative: ask those here too (the same questions in two tools). K2 a "Yes" with
no run going is kept in the check-in only; alternative: start a run first (but this tool would then own runs, which
Tools 1 and 4 do). K3 pattern lines only from the morning forecast; alternative: keep the lab's urges and feelings
lines with a "same evening" caveat. K4 reminders as calendar events, since the site cannot send notifications;
alternative: drop the tab. K5 its own 10 feelings, not the 27 symptom words.

### Tool 13: What it gives you — brief (Opus, 2026-11-19) — build exactly this, decide nothing

Model: Sonnet builds in a worktree; Opus wrote and fact-checked the data (done, below) and reads the diff. Address:
`/quit/nicotine/gives` (wave-1 tool, rebuilt in place in `src/quit/tools/gives/`). Base: wave-1 `gives` (there is no
lab copy). It is his plan step 2 ("Find your 80% swaps") made into a tool: name what nicotine gives you, find swaps
that give you most of it, and rate how close each one came. Nicotine only, no switcher. One question per screen on
phones, progress bar, in-page Back, browser Back steps back, reload resumes. Desktop (1280): the same screens in the
page column, like the date and craving tools. All choices below are **proposed**; the recommendation is the one
written, the alternative is in "Proposed" at the end.

**Menu row:** name unchanged; line **"Name what it does for you. Find swaps that give you most of it."** (review
A11: the old line promised "80%" as if it were a result). `account: "none"`, wave 1, minutes 3.

**Screens**

1. **What does it give you? Pick 1 to 3.** The 8 needs as large option cards (not small chips): the name and, under
   it, its new `line` in his voice ("Relief / It calms me down.", "Reward / It's my treat.", "Something to do / It
   fills empty time.", "People / It's how I join in.", "Sleep / It helps me wind down.", "Focus / It helps me
   concentrate.", "Confidence / I can't picture myself without it.", "The nicotine itself / My body wants the
   nicotine."). A ninth card **"Something else"** opens a text field with a visible label "What does it give you?"
   (max 60 characters, required while that card is picked); it counts toward the 3. Preselection, before he taps
   anything: the link's `#need=` (or old `?need=`, rewritten as wave-1 does), else the needs of his top beliefs from
   the 12 lies test (`parseBeliefs` + `topBeliefs` from `src/quit/tools/beliefs/logic.ts` as they are on main at build
   time; Tool 5 keeps `parseBeliefs` and `ratings`). Three picked → the other cards are disabled with the line "Three
   is the most. Untick one to change." Continue.
2. **One screen per picked need** (heading: the need name, its line under it in grey).
   - **"What you tell yourself"**: the `limiting` lines of beliefs with this need **that he rated 3 or more** in the
     12 lies test (A10: never a thought he marked "Not me"). Test not taken: the heading reads **"What people tell
     themselves"** and all the lines with this need show. Taken but none rated 3+: the section is left out.
   - **Three swaps**, ordered by `orderSwaps` (his ratings first). Each card: the text, the evidence chip, and for a
     sourced swap a closed **"Based on"** fold with Who (`counted`), How many (`n`), Caveat (`weak`) and the source
     quotes and links. When Tool 5's `src/quit/tools/beliefs/BeliefBasis.tsx` is on main, use it; otherwise build
     `src/quit/tools/gives/SwapBasis.tsx` with the same three rows and look (then tell Tool 5 in "Questions from the
     build"). A "Not tested" swap shows no fold.
   - Under each card a toggle button **"Add to my list"** / **"On my list · Remove"** (A10: one tap undoes it; no more
     "Clear my answers" to take one off). Stored in `tried` as `{swapId, triedOn: today}` (the wave-1 shape: Tool 4
     reads it); Remove deletes the entry and its rating.
   - **"Your own swap"**: a text field (visible label "Something that gives you this, in your words", max 60) and Add.
     Own swaps go on his list straight away and show above the three cards with Remove. For "Something else" this is
     the only section (no data swaps, no quotes).
   - Next / on the last need "See my list". A tap within 250 ms of a screen move is ignored and the button only moves
     from the screen it was drawn on (A28: the double tap pushed `?s=3` twice). Browser Back from screen N shows N−1.
3. **Result: "Your 80% swaps"** (`data-testid="result"`; the heading is his step 2 title, so "80%" is his aim, not a
   promise; under the heading nothing, rule 6).
   - Grouped by need (need name as a small heading, in the order picked). Each swap on his list: the text, "On your
     list since Wed, Nov 19", and the rating row **"Tried it? How much of it did it give you?"** with five buttons:
     None / A little / About half / Most of it / All of it (stored as 0 / 25 / 50 / 80 / 100 in `rated`, so
     `orderSwaps` still works). Rated "Most of it" or "All of it": a small mark "80% swap". Rated None or A little:
     a link "Try another one" to that need's screen. The rating can be set any day, also the first (the wave-1
     slider only appeared on a later day and nobody found it, A10); tapping the chosen button again clears it.
   - A need with nothing on the list: "Nothing on your list for <need> yet." with a link to its screen.
   - **"Remind me to rate them"**: Google Calendar link and an .ics download for an event 7 days from today at 19:00,
     30 minutes, title "Rate your swaps", description with the tool's address (no `?preview=1`), one VALARM at the
     start, DTSTAMP = tap time. Its own small builder in `src/quit/tools/gives/logic.ts` (do not change the date tool's
     `icsFor`).
   - **Next** (each a link only while its tool is in `liveTools.json`, `isLiveTool`; otherwise not drawn): "Craving
     now?" (`sos`) with the line "Help for the moment itself"; "Your quit date" (`date`, his step 3) with "Step 3 of
     the plan: pick day 1". 
   - "Change what it gives you" → screen 1 (keeps the list). "Back to the menu".
   - "Start again" (small, at the bottom) asks first, inline: "This empties your list, your own swaps and your
     ratings." Clear / Keep (lesson 2: no one-tap wipe).
   - One line at the very bottom: "Your list is kept on this phone." (B1).
   Opening the tool later: a saved list → the result; picks but no list → screen 2; nothing → screen 1.

**Data (done by Opus 2026-11-19 in `nicotine.json`, quotes copied word for word from the PubMed abstracts, checked by
script):**
- Each need has a new `line` (above). Builder: add `line: string` to `QuitNeed` and `counted?: string`, `n?: string`,
  `weak?: string` to `QuitSwap` in `src/quit/types.ts`; validator (`src/quit/validate.ts`): every need of a live file
  has a `line` (max 8 words); a swap with evidence other than "none" has `counted` and `n`, and each digit run in `n`
  (commas removed) appears in one of its quotes (same rule Tool 5 adds for beliefs: reuse its helper if it is on main).
  Unit tests pass and fail.
- Swaps fixed (A12, C6, A18): `sleep-1` (an alcohol trial) and `confidence-3` (a delinquency study) now "Not tested"
  with no source; `connection-1` (a drinking study) became "Ask a friend or partner to stop with you" (Christakis
  2008, 12,067 people, observational: weak); `reward-1` "Some evidence" (Halpern 2015, 2,538 people: 6 in 100 with
  usual help, 9 to 16 in 100 with money on the line; only about 14 in 100 put up their own money; Cochrane 2025
  high-certainty for incentives in general) instead of "Weak"; `reward-2` and `boredom-1` cite MacPherson 2010 (68
  smokers, behavioural activation, pilot) instead of a residential drug-treatment trial (one drug per page);
  `relief-1` is "15 minutes" (Taylor 2007: walking-type bouts tested lasted 15 minutes or more; 5 minutes was only
  for isometric exercise); `focus-1` lost "then start 10 minutes later" (Chang 2012 found the same small effect at
  every timing); `confidence-1` says "I've stopped" (fits vapes and pouches) and adds Callaghan 2021 (544
  ex-smokers); `confidence-2` "each day without it". Every sourced swap has Who, How many and a caveat. The `relief-1`
  Haasova ref stays (Tool 2's Move tile reads it).
- b11 "I'll put on weight" now has need `substance` (Tool 5 handed this to Tool 13; A19, D28: under Confidence it read
  as if weight gives confidence; under "The nicotine itself" it sits next to patch plus gum).
- Of 24 swaps: 3 strong, 1 some, 7 weak, 13 not tested. A11 answered: the grades are honest, and the rating loop is
  how he finds which ones give him most of it; no new swap without a source that fits.

**Saved state** (`quit-v1`, tool `gives`, parsed by `parseGives`, which stays compatible): `done`, `picked` (need ids,
plus `"own"` for Something else), `ownNeed: string | null` (60), `own: {needId: [{id, text, addedOn}]}` (at most 5 per
need, 60 characters each), `tried` (unchanged shape; Tool 4 reads it), `rated` (0–100, unchanged). A wave-1 save
opens as before. No record, no Black Box: nothing here is a quit event. Reads `beliefs` (ratings) only.

**Report items for this tool, each answered above:** A10 (thin payoff and invisible rating loop: grouped list, rating
any day, reminder, next links; no undo: Remove; quotes from "Not me": only his 3+), A11 (80%: his step's aim, not a
promise; menu line reworded; grades honest), A12 (three off-topic studies and the reward grade), A18 (cigarette
wording in swaps), A19 / D28 (b11 need), A28 (double tap), B2 / B25 (in-the-moment swaps: Tool 2 has its own
`momentSwaps`; this tool is the week list, and links to Craving now?), C6 (five minutes), B204 (slip still lists
tried swaps), lesson 2 (start again asks), lesson 4 (links only to live tools).

**Old tests:** the wave-1 `gives` cases in `tests/e2e/quit/wave1-part1.spec.ts` and
`tests/e2e/quit/phase7-signed-out.spec.ts` move into the new spec (keep what still holds: `?need=` preselects,
unknown need ignored, top beliefs preselect). `tests/unit/quit/tools/gives.test.ts` and `phase7.test.ts` updated.

**Acceptance (Playwright `tests/e2e/quit/gives.spec.ts`, 390x844 touch and 1280x800, screenshots looked at):**
1. Fresh: screen 1 shows 9 cards with their lines; picking a 4th is not possible and the line shows.
2. 12 lies test saved with b3 = 5 and b9 = 4 → Relief and Sleep preselected; Relief's screen quotes only "A cigarette
   is the only thing…" (b3), not b12 when b12 is rated 1. No test saved → "What people tell themselves" with both.
3. `#need=focus` preselects Focus; `?need=focus` is rewritten to `#need=focus`; `#need=nonsense` is ignored.
4. Add, then Remove, a swap → it is gone from the list and from `tried`; its rating too.
5. Own swap "Call my brother" on Relief → on the list; Something else "a reason to step outside" → its own screen
   with only the own-swap field; the list shows both.
6. Result: rate "Most of it" → the "80% swap" mark, and on reopening Relief's screen that swap is first; rate
   "None" → "Try another one" goes to Relief's screen.
7. .ics parses (one VEVENT, one VALARM, DTSTART 7 days ahead at 19:00, DTSTAMP within a minute of now, SUMMARY
   "Rate your swaps"); the Google link holds the same date.
8. Start again asks; Keep changes nothing; Clear empties the `gives` key only (beliefs untouched).
9. Every "Based on" fold shows Who, How many and Caveat; "Not tested" swaps have none.
10. Double tap on Continue and Next moves one screen; reload on each screen resumes; browser Back steps back.
11. Slip (Tool 4) still lists a swap added here (unit test on `parseGives` with the new fields; `tried` unchanged).
12. No console error, no sideways scroll, tap targets at least 44 px, a 60-character unbroken own swap does not widen
    the page; the menu row opens the tool once `gives` is in `liveTools.json`.
13. Then the three-reviewer check and fix rounds; status "waiting for you".

**Proposed (owner may veto):** G1 the result heading uses his "80% swaps" and the menu line drops the number;
alternative: keep "Get swaps that give you 80% of it" on the menu with a "his aim, not a study" note. G2 rating with
five worded buttons, any day; alternative: the wave-1 0–100 slider after a day. G3 a calendar reminder in 7 days;
alternative: none (the site sends no notifications). G4 "Something else" and own swaps, because step 1 says "write
down what you think nicotine gives you" in his own words; alternative: the 8 needs only. G5 b11 (weight) under "The
nicotine itself"; alternative: a ninth need "Appetite" with its own swaps (needs sources first).

### Tool 12: How people quit — brief (Opus, 2026-11-19) — build exactly this, decide nothing

Model: Opus builds it (small tool; most of the work is choosing what to keep). Address: `/quit/nicotine/how`
(rebuilds wave-1 `how` in place in `src/quit/tools/how/`). Folded in from lab `library/best`: its sourced sections,
shortened (below). Never edit lab files; lab `library/best` imports `groupNumbers` from `src/quit/tools/how/logic.ts`,
so that export keeps its behaviour. Nicotine only: no addiction switcher (E19). Desktop: the page column, like the
other tools. It asks nothing, so it reads and writes nothing in the shared record. All choices below are **proposed**;
the recommendation is the first option each time.

**What it keeps from each source**
- From wave-1 `how`: the hope number on top, all 15 checked numbers in their groups (who gets free, how quitting
  goes, what helps, what happens after), every basis box, caveat and source, the medicine note at the end.
- From `library/best`: the three "True or not?" facts (each placed once, in the section it belongs to: f3 "most
  failed tries end in the first 8 days" under How quitting goes, f1 "patch alone vs patch plus gum" under What helps,
  f2 "more anxious and depressed" under What happens after), and the four sourced outside services (US quitline,
  Smokefree.gov, England helpline, NHS services) as "Free help outside this site".
- Not taken from `library/best` (E15–E19): search, Saved, bookmarks, "Mark as read", "about 1 min read", the
  addiction switcher, the card carousel. "What helps" swaps: the weak and untested ones belong to Tool 13 "What it
  gives you"; the strong ones are already here (varenicline = the medicine number, combination NRT = fact f1), and
  "Walk or climb stairs for five minutes" is not used because its sources don't back "five minutes" (C6; Craving now?
  has the Move tile). "What to expect" (`symptomCourse`) is Tool 6's; here one line links to it. Outside-help rows
  that are tips, not help outside (`combo-nrt` = f1, `exercise` (C6), `tell-one`), and `forum` (no source) are left
  out (E16). Nothing is removed from the data file.

**Screen (one page)**
1. Top: the hope number as the large card. Under it one line (A18): "Almost every study here counted cigarette
   smokers, most before vapes were common. Each card says who was counted."
2. **On this page:** five jump buttons with counts ("Who gets free · 2", "How quitting goes · 4", "What helps · 5",
   "What happens after · 6", "Free help · 4"; counted from the data, the second hope number `hope-lifetime` sits
   under Who gets free); a tap scrolls to the section (no history entry), each at least
   44 px.
3. Sections in that order. Each number is a **compact card** (A15, E17): the big figure; the headline, where a
   headline that starts with the big figure drops that start so it is not said twice ("About 19 in 100 /
   Americans ever hooked…"); the "Counted:" line; then one **Details** button with a visible chevron that turns
   (`aria-expanded`). Details opens: the checked tag and chips, the weak line, the basis box (study, who, how many,
   where, when, what was measured, caveat) and the source tap. Closed cards, each about half as tall as today's. Under What helps, one line: "Craving right now? Craving now? has quick help for the moment."
   (link when `sos` is live).
4. **True or not?** cards (in their sections): the statement, two buttons **True** / **Not true**; a tap shows
   "Right." or "Not quite.", the answer ("True" / "Not true"), the explanation, its "Counted:" line and its source.
   Nothing is saved; a reload shows them closed again.
5. **Free help outside this site:** the four services, each its line and an "Open the site" link (new tab,
   44 px), with its source tap.
6. One line: "What you'll feel, day by day, and what helps: <Tool 6 name>." (a link, name read from the menu;
   shown only once Tool 6 is live, no line before). Then the medicine note (clozapine, olanzapine, theophylline) with
   its source, and the page's Sources fold, as today.

**Data fixes (`nicotine.json`)**
- A16, RULEBOOK 12c: two big figures are time stamps. `after-first-month` "Week 1" → **"Anxiety fell"** (headline
  already starts with it, so the card shows "Anxiety fell / from the first week off, …"); `after-mood` "Years 1 and 3"
  → **"Life rated better"**; both lose `timeIsResult`. "26 years" stays: the time is the finding.

**Counting (A27):** `start` on load; `done` once, when the Free help section scrolls into view.

**Review items for this tool** (A, E, B, 2026-11-19), each answered above: A15 (wall of cards, no summary or jump
links, figure said twice, hero breaks, folds without a marker), A16 (time-stamp figures), A18 (cigarette studies not
said up front), A27 (done = page view), A30 and B28 (the Sources fold and the footer "Sources" link stack: frame-wide,
left to Tool 0; the fold stays because it is the page's full list), E15 (one-liners dressed as articles), E16 (the same
advice in three or four sections), E17 (empty-looking "Based on", footer outside the card), E18 (search: dropped), E19
(switcher: dropped), C6 ("five minutes" not backed: the swap is not used).

**Acceptance (Playwright `tests/e2e/quit/how.spec.ts`, 390x844 touch and 1280x800; screenshots looked at):**
1. Every number card shows (hope first), each with its Counted line; Details opens the basis box with its six rows
   and the source; the chevron button says expanded.
2. No headline starts with its own big figure on screen; no big figure is "Week 1" or "Years 1 and 3".
3. Jump buttons scroll their section into view; the page height on the phone is under 5,800 px with all cards closed
   (built: 5,591 px, holding the facts and outside help too; the 15 number cards alone went from about 420 to about
   200 px each).
4. Each True or not? card: tapping the wrong answer shows "Not quite." and the right one, with the source.
5. Free help shows the four services and no forum, exercise, tell-one or combo-nrt line.
6. No search box, no "Mark as read", no "min read", no switcher.
7. No console error, no sideways scroll, every tap target at least 44 px; the menu row opens it.
8. Then the three-reviewer check and fix rounds; status "waiting for you".

**Proposed (owner may veto):** H1 cards closed, with Details (alternative: open as today, 6,400 px). H2 the three
facts sit inside their sections (alternative: a separate True or not? section). H3 the outside help stays here until
"What helps besides apps" is built, then becomes a link. H4 the "mirror" lines ("You think nobody hooked like you ever
really gets free") stay unused here, as in wave-1 (alternative: show each above its number).

### Tool 11: Today's lesson — brief (Opus, 2026-11-19) — build exactly this, decide nothing

Model: Opus builds it (the content fixes need the abstracts at hand), in a worktree. Address: `/quit/nicotine/lesson`
(menu id `lesson`). Built from lab `lessons/best` (`src/quit/lab/lessons/best/*`): what is reused moves into
`src/quit/tools/lesson/`; lab files stay untouched. The 17 lessons (day −3 to −1, day 1 to 14) stay in `nicotine.json`
`lessons`. Nicotine only: no addiction switcher (review D25). Desktop (1280): the page column, like Tools 1 to 4. All
choices below are **proposed**; the recommendation is the first option each time.

**Menu row:** name "Today's lesson", line **"One short lesson a day, with one thing to do. From 3 days before day 1
to day 14."** (the old "at your hour. 90 days." was untrue: there is no reminder and 17 lessons), minutes 3,
`account: "none"`, wave 1 in `menu.json` and `registry.ts`.

**Which day (it asks nothing; it reads the shared record and the Black Box):**
1. A living nicotine run in the Black Box → day N from its `startedOn` (the start day is day 1, as Your quit date's
   "Day N"; there is no day 0, D34).
2. Else `record.quitDate` in the future → day −1, −2, −3 for the three days before. Further ahead: "Your lessons start
   on <date>, 3 days before your quit date." with **Read the first lesson now**.
3. Else `record.quitDate` today or past and no slip in the Black Box on or after it → day N from the quit date (the
   date tool starts the run on its next visit; this tool writes nothing to the Black Box).
4. Else (no date, goal "later", or the last run ended with a slip and no new day 1 is set) → the day −3 lesson "Pick
   the day", with one line: no date: "The lessons follow your quit date. Until you pick one, start here."; after a
   slip: "Your last run ended on <date>. The lessons start again from day 1 with your next run." The line links to
   Your quit date / Slipped? Restart today only when that tool is live (`isLiveTool`), else plain text (D2 blocker).
5. Past day 14 → **the end card** (D18): "That was the last lesson, on day 14." "You did N of 17 exercises." and
   "What next": links to the live tools Your record, Craving now?, Daily check-in (only those live), plus All days.
   Never "No new lesson today" for ever.
After a slip and a new day 1, the lessons start again from day 1; what he marked done and wrote stays (no reset).

**Screens** (tabs **Today · All days**, `?tab=all`; a lesson opened from the list is `?day=N`, a history entry, so
browser Back returns to the list; reload stays):
1. **Today.** A strip of 17 steps (−3 … 14), done ones filled, today ringed, "Day 5 of 14" (or "2 days before day
   1") above it. Then the lesson card:
   - day label and date ("Day 5 · Thu, Nov 19"), the title, the body;
   - **Counted:** line under the body (new field `counted` per lesson, below) and the source tap;
   - **The thought behind it** (fold): the linked belief's thought (`limiting`), the proof, its counted line and
     source (no counterpart: b1's counterpart has no source, D21; Tool 5 owns that text);
   - **Do this today**: the exercise, a note box that saves as he types ("Saved on this phone.", no Save button,
     owner rule), and **Mark as done** (tap again: "Not done yet"; the note stays). No "I have read it" lock (D23).
   - "Tomorrow: <next title>" under it, and once: "You can read any day again in All days." (D24 said twice).
2. **All days.** Two groups, "Before day 1" and "Day 1 to 14": day label, title, a check for done, a "Today" pill.
   Tap → the lesson card (as above, with Back, and Previous / Next lesson).
Dropped from `best`, each answered: the thumbs (stored only on the phone; nobody could see them, D23), the reminder time
("No reminder is sent", and the check-in has its own, D6, D23), the read-time line (every lesson is under 200 words,
E15), the lab "Set day" box (D34), the addiction switcher (D25). Look (D35): lucide icons (BookOpen, PenLine, Check),
the progress strip.

**Data:** reads `useQuitRecord` (quitDate, goal) and the Black Box (living run, slip reports) through the bridge as
DateTool (`useSignedIn(false, true)`, signed-in or local bridge). Its own state in the `quit-v1` store, tool key
`lesson`: `{done: {[day]: ms}, notes: {[day]: string ≤ 1000}}`. One line under the note box: "Your notes are kept on
this phone." (B1).

**Content fixes in `nicotine.json` lessons** (checked against the PubMed abstracts on 2026-11-19; each lesson gets a
`counted` line, ≤ 30 words, validator limit added — D19):
- Day −3 (Anesi 2017): counted "1,848 smokers in a US trial who picked a quit day within 90 days. A model's estimate in
  a planned side analysis; later pickers may differ in other ways."
- Day −1 and Day 8 (Kenford 1994): "Two small patch trials, 88 and 112 daily smokers. 83 in 100 is the lower result;
  the other trial found 97." Day 8 gets this source and one sentence with it (D20: it had none).
- Day 4: Miller 2023 (alcohol, veterans) is removed (D20); the sleep steps cite Trauer 2015 (CBT for insomnia, 20
  trials, 1,162 adults with long-lasting insomnia), and the counted line says it was not tested in people who just
  quit.
- Day 5 (Skorka-Brown 2015): body says "a field study of 31 students", counted "15 played; their cravings were for
  many things, nicotine among them."
- Day 6 (Christakis 2008): counted gives the range 12 to 55% and "a link seen in the data, not a trial".
- Day 11 (Foulds 2015): "3,446" → the abstract's "3,609 ex-smokers who now vaped" (D22), online survey.
- The others: who and how many as their abstracts say (Shiffman 214; Hajek 469; Lam 300 women; Aubin 62 studies;
  Doll 34,439 male doctors; Taylor 12 studies; Heishman 41 lab studies; Hughes a one-author review).

**Report items for this tool:** D2 (no date → stuck at −3), D18 (no finish), D19 (no counted lines), D20 (Day 8 no
source, Day 4 wrong population), D21 (b1 counterpart: not shown here), D22 (Foulds number), D23 (thumbs, reminder,
lock, lost half-typed note), D24 (line twice), D25 (switcher), D34 (day 0), D35 (look), D6 (second reminder), A-report
menu row (Coming soon, wrong line), E15/E-cross (lessons are the long reading; Tool 12 may link here once both are live).

**Acceptance (Playwright `tests/e2e/quit/lesson.spec.ts`, 390x844 touch and 1280x800, clock fixed; screenshots
looked at):**
1. Fresh, no date: the day −3 lesson with the "follow your quit date" line; the date link only if `date` is live.
2. Record date 4 days ago and a living run from it: Day 5 lesson; strip shows day 5 ringed.
3. Record date 2 days ahead: Day −2 lesson; 10 days ahead: the "start on <date>" card, then Read the first lesson now.
4. Note typed, reload → note still there; Mark as done → the All days row shows the check; Not done yet keeps the note.
5. All days → tap Day 7 → card; browser Back → list; reload on both stays.
6. Run started 20 days ago → the end card with the exercise count; no "No new lesson today".
7. A slip after the quit date and no new date → day −3 with the "last run ended" line.
8. Every lesson shows a Counted line; Day 4 has no Miller source; Day 11 says 3,609.
9. No console error, no sideways scroll, tap targets at least 44 px, the menu row opens it.
10. Then the three-reviewer check and fix rounds; status "waiting for you".

**Proposed (owner may veto):** L1 the lessons follow the current run, so after a slip they start again from day 1
(withdrawal starts again too); alternative: keep counting from the first quit date. L2 no reminder until the check-in
or a phone app can send one; alternative: keep the stored time. L3 thumbs dropped; alternative: send them to a table he
can read (needs B1). L4 the belief fold leaves out the counterpart until Tool 5 sources b1.

### Tool 5: The 12 lies test — brief (Opus, 2026-11-19) — build exactly this, decide nothing

Model: Sonnet builds in a worktree; Opus wrote and fact-checked the data changes (done, below) and reads the diff.
Address: `/quit/nicotine/beliefs` (wave-1 tool, rebuilt in place in `src/quit/tools/beliefs/`). Built from wave-1
`beliefs` (worded scale, true/false facts with the reveal, result, share card, clear). Folded in from lab
`beliefs/best` (`src/quit/lab/beliefs/best/*`, never edited): a reply per agreed belief, "Do you believe you can
stop?", earlier results. Not folded in: the fears screen (review D10: it repeats beliefs he just rated and is used for
nothing; proposed: drop). Nicotine only, no switcher. Desktop: same screens in the page column. Menu row unchanged
except the line **"Rate 12 thoughts. See the answer to the ones that hold you."** and minutes 4. The menu hint
becomes **"New here? Start with the 12 lies test."** (review A24: "Most start" claimed what people do; done in data).

**Screens** (one per screen, in `?s=N` through `useScreens`; reload resumes, browser Back steps back, in-page Back;
a tap within 250 ms of a move is ignored and every answer is keyed to the screen it was made on — review A1):

1. **Questions 1–12, one belief each.** Visible step text "Question N of 16" above the bar (D29). A small grey
   scene line, then the thought itself large in quotes (`limiting`, A9), then **"How much is this you?"** and the five
   worded buttons stacked (Not me / A bit / Somewhat / Mostly / That's me; D12). 1–3 moves to the next question.
2. **Reply (only after 4 or 5; its own screen and history entry, not counted as a question).** "The other side":
   `counterpart` large, `proof`, the Counted line, and the **belief basis box** (below). Continue.
3. **Questions 13–15, the facts** (wave-1 as is): statement, True / False; the reveal on the same screen: Right. /
   Not quite., `explain`, Counted line, the basis box, Next.
4. **Question 16: "Do you believe you can stop?"** Yes / Not sure / No. No line under the heading (RULEBOOK rule 6,
   D24). Tapping goes to the result.
5. **Result**, in this order (D27: shorter; A29: verdict on top):
   a. "Your result", "Taken Nov 19, 2026, 10:42" (date and time, so two the same day differ; D27).
   b. Verdict card: "{n} of 12 hold you", band label, band text, and the band link to `/quit/nicotine/date` (all three
      bands now link there; "Make your free plan" for `free`, "Set your date" for the others, "See your quit date" when
      the shared record has a `quitDate`). Rendered only while `date` is finished (`isFinished` in `src/quit/menu.ts`).
   c. Your can-stop answer and one line for it (D10): Yes → "Good. Write it down where you will see it in the first
      week." Not sure → "Not sure is an honest answer. You don't need to be sure to pick a day 1." No → "Then don't
      decide it today. The thoughts that hold you below are part of why the no feels true. Start with them." With an
      earlier result whose answer differs: "Last time: No."
   d. **"These hold you most"**: ratings 4–5 only, highest first, ties in data order, at most 3 (A5, D8: the list and
      the count now use the same rule). Each card: the thought, "The other side", "When this thought comes", "Test it
      this week", then a closed "The proof" fold with proof, Counted line and basis box (he saw it on the reply).
      No 4–5 but some 3s: heading "None hold you hard. These pull a little:" with the top 3 of the 3s, same cards.
      All 1–2: "None of the twelve hold you much."
   e. "You already see through these" (ratings 1–2), the short lines.
   f. With an earlier result: **"Since last time"**: one line per belief whose rating changed, e.g. "Less: It calms me
      down (Mostly → A bit)"; no change: "Same as last time."
   g. "Your 16 answers" closed fold: each short line with its word (not a bare number; D27), the three facts with
      Right / Not quite, and the can-stop answer.
   h. Share and save (A7): **Share my result** uses `navigator.share` with the card image as a file where
      `navigator.canShare({files})` allows it, else text + link, else copies the link ("Link copied"). **Save the
      image** fetches the card and downloads it as `12-lies-result.png` without leaving the page; if the fetch fails
      it opens the card in a new tab. Share text: "I believed {n} of the 12 lies nicotine tells you." (from the
      menu's `lies` name, lower-cased "The" → "the"; never `data.name`).
   i. **Take it again**. During a retake every question screen shows "Stop and keep my last result"; with at least
      one new answer it asks first ("Stop? The answers of this new try are dropped." Stop / Keep going) (D7).
   j. **Earlier results**, newest first, compact: date and time, "{n} of 12 hold you", band label, can-stop answer,
      the top thoughts in quotes; each with **Delete** and an inline confirm (D11).
   k. "Clear all my answers" with an inline confirm (removes results and the draft; lesson 2).
   l. Links to `gives` (the per-card need link, "What it gives you" button, band `gives`) render only while `gives`
      is finished. Until then nothing. When it is: wording "Swaps for what it gives you" (D28), not "What it gives
      you: Confidence" (A19). The need mapping of b11 (weight → Confidence) is for Tool 13 to settle.
   m. "Back to the menu".

Opening the tool: results and no draft → the result; a draft → the screen it was on; nothing → question 1.

**Belief basis box (shared with Tool 2).** New `src/quit/tools/beliefs/BeliefBasis.tsx`, used here and by the sos
voice tile (`src/quit/tools/sos/Tiles.tsx`, replacing its own `sos-basis` details; keep that test id through a prop) so
the two stay in sync. Closed fold "Based on" with: Who = `counted`, How many = `n` (new data field) or, when absent,
**"Not in the line we quote"**, Caveat = `weak`, then the sources (`SourceTap` with every ref quote). Facts get the
same box (Who, How many, sources; no caveat field).

**Data (done by Opus 2026-11-19 in `nicotine.json`; quotes copied verbatim from the PubMed abstracts):**
- Every belief and fact has `n` (how many people or studies), and each number in it is in one of that item's ref
  quotes (new quotes added from the abstracts). Builder: add `n?: string` to `QuitBelief` and `QuitFact`, and a
  validator rule in `src/quit/validate.ts`: each digit run in `n` (commas or spaces between digits removed) must
  appear in a quote of that item's refs, likewise normalised; unit test for pass and fail.
- b1 counterpart was unsourced (D21): now "It's not too late. Stopping at any age gives years back." (Doll 2004).
- b1, b2 pointed to a "quit list" that doesn't exist (A14): replaced.
- b5 (A13, D22): the proof didn't answer the thought and "3,446" is not in the abstract. Now "It's only a vape",
  with the abstract's 3,609, the 8.1 vs 14.5 finding, and the strength and length findings; caveat says it measures
  dependence, not harm.
- b4 caveat names 83 as the lower of 83 / 97 in 100 and the two trial sizes; b7 shows 15 played, 16 did not (31);
  b8 shows the 12%–55% range; b12 1,848 (D19).
- Cigarette-only wording (A18): b3, b7, b10 thoughts and b3, b7, b8 answers say nicotine / use it. b1 "I've smoked
  too long" kept (most users smoked first; proposed). Curly apostrophes in all belief text (B30).
- Bands: no band names an unfinished tool; all link to the date tool.
- Tool 2 shows the same fields (short, counterpart, proof, counted, weak), so its voice tile changes with them.

**Saved state** (`quit-v1`, tool `beliefs`; slip and gives read `ratings` through `parseBeliefs`, which stays):
`{ ratings, facts }` = the latest finished test (unchanged shape for them), plus `draft: {ratings, facts, canStop,
startedAt} | null` and `results: [{at (ISO date-time), ratings, facts, canStop}]` (at most 20, oldest dropped).
A wave-1 save with all 12 ratings and no `results` shows as one result "Taken before Nov 19, 2026" (`at` null); a
partial wave-1 save becomes the draft. Reads the shared record's `quitDate` only; writes nothing to it. No Black Box.

**Share card** `app/quit/[addiction]/card/route.tsx`: the new share text; the number in the quit colour
(`--facet-quit` #a78bfa); bottom line is the request's host plus `/quit/nicotine/beliefs` (A7: no bare path;
proposed: whatever host serves it, so a later domain needs no change). Without `held` it draws a question card ("How
many of the 12 lies nicotine tells you do you believe?") used as the beliefs page `og:image`, with the menu line as
its description (A8). Card links carry `v=2` so day-old cached cards are not reused (A31).

**Answered, not built (proposed):** A17 the header "Back" and the in-page "Back" — frame wording, for Tool 0 (proposed:
header reads "Menu"). A21 present mode: kept working; arrow keys not added. A25 / D25 other addictions: nicotine
only. B207 voice chips ordered by his ratings: for Tool 2.

**Acceptance (Playwright, local and on live with `?preview=1`, 390x844 touch and 1280x800, screenshots looked at):**
1. Fresh: all "Somewhat" → no reply screens, facts, can-stop "Not sure" → result: "0 of 12 hold you" and "None hold you
   hard. These pull a little:" with 3 cards; never "These hold you most" with 0 held.
2. Rate b3 "That's me" → reply screen with "The other side", basis box shows Who, How many "469 heart patients who
   wanted to stop", Caveat; Continue → question 4. Browser Back from question 4 → the reply; again → question 3.
3. Double tap on any rating moves one screen and saves one rating (stored state checked).
4. Reload on a question, a reply, a fact reveal and the result resumes there.
5. Finish twice (second time change two ratings, can-stop No then Yes) → the result shows "Since last time" with the
   two changes, "Last time: No.", and one earlier result with its own date and time; Delete asks, then removes it.
6. Take it again → "Stop and keep my last result" on question 1 goes back without asking; after one answer it asks.
7. A wave-1 save `{ratings: all 12, facts: all 3}` opens as a result "Taken before …"; slip and gives still read it.
8. "Save the image" downloads a PNG and stays on the page; `/quit/nicotine/card?held=7&preview=1` reads "I believed 7
   of the 12 lies nicotine tells you." and shows a host; without `held` it draws the question card.
9. No link to `gives`; the band link shows only while `date` is in finished.json (test both with a stubbed list in a
   unit test of the link helper).
10. The sos voice tile shows the same basis box (its spec still passes).
11. Present mode at 390x844: all five answers visible without scrolling.
12. No console error, no sideways scroll, every tap target at least 44 px.
13. Then the three-reviewer check and fix rounds; status "waiting for you".

## Done

(none yet)

## Questions from the build

- Tool 0 step 3 greys only the menu rows. The sticky "Craving now?" bar, the "New here? ... 12 lies test" link and the
  tool-page footer "Craving now?" link still point to tools that are not finished (Soon). Lesson 4 says no link to an
  unfinished tool. Proposed: grey/remove them too until `sos` / `beliefs` are in finished.json. Not done: the brief did not say.
- ClockSync (root layout) now skips the time-zone call on /quit pages unless a Supabase sign-in cookie exists; other pages unchanged.
  **Answered (Opus, 2026-11-19):** both accepted. The bar, footer link and hint are hidden until their tool is finished
  (Tool 1 "Also fix" (a)). The ClockSync change stays.

### From the Tool 1 build (Sonnet, 2026-11-19)

- Price per unit. The data file's `defaultPriceUsd` is per cigarette (0.52 = the 10.34 US average pack / 20), per disposable vape and per can of pouches, and the cost tool asks "what does one <unit> cost". The brief says "price per pack". Built as the data file says (one cigarette, one vape, one can) so the record and the cost tool agree; the basis line under the price explains the 0.52. Proposed: keep, or switch to a pack price and divide by 20 in one place.
- Study numbers. nicotine.json holds no "n" for Hughes 2007, Shiffman 2006 or Bedi 2011. Used Shiffman n=214 (from Plans/quit-tool.md) and Bedi n=86 (from docs/research/addiction-one-pagers); the Hughes review shows "number not in the line we quote". The checker should confirm 214 and 86 against the abstracts, or add them to nicotine.json.
- The data file's step 1 also said "against the beliefs above". Changed to "against the 12 lies test" so the Not ready page has no "above" (Acceptance 6).
- Stretch 2 is days 8 to 10 (Shiffman: back to baseline within 10 days), shown after days 1 to 7; its basis box says the Hughes review puts the end at 2 to 4 weeks. Stretch 3 is day 35 to day 42 (end of the calendar), marked "not tested after day 35".
- A living Black Box run wins over the date picked: if a run already lives when someone walks the tool, the result shows the run's own start date and no new run starts. The record's quitDate is not changed to match. Proposed: also set the record's date to the run's start.
- "Day N" with no living run (the Black Box refused the days, or a run was ended by a slip) is counted from the record's date, which can be wrong after a slip. A one-line notice shows when the Black Box refuses.
- Break ended: "Stop for good" keeps the date and the living run and only changes the goal; "Another break" asks a length counted from today; "Not now" only hides the three choices for that end date. The brief did not say what each does.
- "Make your free plan" now carries ?preview=1 to the date tool (it is a /quit address).
- Signed-out visitors: the Black Box bridge skips the /api/whoami call when there is no sign-in cookie (no 401 console error). Other tools still call it.
- The ics download is built on tap (so DTSTAMP is the tap time); the event is on day 1 for a break too, not on the break's end.
- Tool 2, no Black Box run: the pattern list and the money line read the record. Proposed: with no run in the Black Box the
  after-flow still works, but "Keep a record" is offered and nothing is saved until he starts one (same as wave-1). Recommendation: keep this; saving
  silently would create a record he never asked for.
- Tool 2, meaning of price for "money kept": Tool 1 made the record's price per single unit (one cigarette, one vape, one can),
  so Tool 2 uses count a day x that price x days, with no pack division, and shows the sum line. Proposed: keep; the "10 a day,
  $10.34 a pack" acceptance case reads as 0.517 each. For pouches the count is cans a day (matches "a can" in the data file).
- Tool 2 review round 1 (2026-11-19): fixed a lost save for a signed-in person on a new device, an Undo that took out an
  older close call, a "Save" that wiped the strength, a ring that never prompted again after Back, a vibration on page
  load, Back after answering inside a tile, the voice answer landing off screen, a missing small ring inside tiles, an
  empty-looking Move basis, a brand name in the "bored" proof, and four swap cards. Not fixed, proposed for the owner's
  look: desktop heading offset by about 24 px, the lone half-moon voice icon, "Saved" shown twice after a close call,
  "steps 1-3" not named on the slip screen, three beliefs whose basis repeats the line above it.
- Tool 2 review round 2 (2026-11-19): the leftovers of round 1 are fixed. The tool and the date tool now fill the page column
  (the heading was offset 24 px in both); the row save says "Added." so "Saved" shows once; the slip step names the three steps
  (top lies, swaps, new day 1); beliefs b2, b3, b5 got their own caveat and b4's was made a full sentence; the status line says
  "Saving" while sign-in is unknown; the still-fighting note no longer repeats the ring's "five minutes"; the voice tile uses
  a microphone icon (lucide `Mic`). The date spec's desktop width bound moved from 600 to 640 (the page column).

### From the Tool 4 build (Sonnet, 2026-11-19)

- Acceptance 1 says "21 days" for a run started 20 days ago and a slip "Yesterday". The Black Box count (both ends counted) gives 20 (day -20 to day -1). The spec test asserts 20; 21 would be the count if the slip were today.
- "Another day" shows only when it can pick a day other than Today or Yesterday (the run's earliest day is 2 or more days back). The brief did not say; an empty-choice field would be noise.
- Case C (no run): both Today and Tomorrow are offered for the new day 1 (there is no slip day to forbid Today). Brief offered Today "only when the slip day is before today".
- Small additive changes outside the tool: `QuitBlackBoxApi.runs` (living runs of the vice, needed to read the ended run's dates and to find the new run), `removeRun`, and `amend` with thought/ending (as briefed); `clearQuitDate` in `src/quit/record.ts` (Undo must put a missing quit date back to "none", and the hook had no way to do it). Pure `amendReport` and `removeRunIfEmpty` live in `blackboxLogic.ts` with unit tests.
- Half-answered visits carry for 60 minutes (like Tool 2's visit rule); a filed result carries only while it still describes the latest slip. A due new day 1 always starts a fresh visit.
- Old tests removed: the three wave-1 slip tests in wave1-part2.spec.ts, all of phase7-signed-in.spec.ts (every test there was about the wave-1 slip), the "A62" test in phase7-signed-out.spec.ts, and the keepLine/resume unit tests in phase5.test.ts. slip.spec.ts covers their points (double tap, one filing, local-only/saved status, fixed day 1).
- `slip` was added to liveTools.json at ship time (Opus), so the menu row and the links from the date and craving tools open it.
- Not run: `node scripts/typecheck-ratchet.mjs` was killed (exit 143, memory pressure from other sessions) three times; a scoped `tsc -p` over src/quit, app/quit and the quit tests is clean.
