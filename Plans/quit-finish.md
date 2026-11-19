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
| 3 | Your record (progress, money kept) | lab `progress/best` | the live counter feel of copies d and e | not started |
| 4 | Slipped? Restart today | wave-1 `slip` | slips go into the shared record; clean runs never reset | not started |
| 5 | The 12 lies test | wave-1 `beliefs` | from `beliefs/best`: a reply per belief, "can you stop?", earlier results | not started |
| 6 | What you'll feel, and when | lab `timeline/best` | wave-1 `symptoms` (what helps per symptom) | not started |
| 7 | If-then plan | lab `ifthen/best` | — | not started |
| 8 | Daily check-in | lab `checkin/best` | slip question from `diary/best` | not started |
| 9 | What it costs you | wave-1 `cost` | per-pack price and live update (copy e); money setup from the shared record | not started |
| 10 | Your past attempts | lab `past/best` | wave-1's "many tries are normal" number and "after the first slip" question | not started |
| 11 | Today's lesson | lab `lessons/best` | — | not started |
| 12 | How people quit | wave-1 `how` | the sourced sections of `library/best`, shortened | not started |
| 13 | What it gives you | wave-1 `gives` | — | not started |
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

## OPEN QUESTIONS (proposed; he may veto)

| Question | Decision | Alternative | Cost if wrong |
|---|---|---|---|
| Q1 Which variant per tool | The table above, from the review scores | He picks on a review page | He said he doesn't want to review them |
| Q2 Folds (curve into quit date, symptoms into timeline, diary into Craving now?, library into How people quit) | Fold | Keep separate tools | Separate: the same things asked twice and 20 menu rows |
| Q3 Unfinished menu rows | Greyed "Soon", not tappable | Hidden | Hidden: the menu changes shape as tools finish |
| Q4 Account | Works without one; server saving once B1 is yes | Account required | Required: fewer people try it |

## Tool briefs

### Tool 0: the frame — brief (Opus, 2026-11-19) — build exactly this, decide nothing

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
