# Quit tools: fix what the first review found

Written 2026-11-19 (Opus, review session). Status: **proposed. Nothing here is decided by the owner yet.**
Source: a review of everything quit built on 2026-11-18, walked on the live site at phone size (390 px) and once at
desktop size. Seven reviewers covered the wave-1 tools (`Plans/quit-tool.md`), the 13 improved lab variants
(`best`) and all 51 competitor copies (`Plans/quit-copy.md`). Full reports with steps and screenshots (private, may
name competitors): `~/.cache/daygame-research/quit-review-2026-11-19/` — `A-report.md` (menu, coaching, privacy,
card, beliefs, gives, how), `B-report.md` (past, cost, sos, symptoms, slip), `C-report.md` (best: sos, progress,
timeline, quitdate), `D-report.md` (best: beliefs, checkin, diary, lessons), `E-report.md` (best: cost, past,
ifthen, library; accountability copies), `F1-report.md` and `F2-report.md` (all copies). Item ids below such as
"A3" or "C-B1" point into those reports (report letter, then finding number or blocker number).

## Part 1: in plain words

**Verdict: about 5 out of 10. Many things need changing: about 150 findings, about 12 of them blockers.**

What is good: nothing crashes, no page scrolls sideways at phone width, tap targets are big enough, answers survive a
reload, and about 50 of the study quotes checked match their sources. No competitor name shows anywhere on the site.

What is wrong falls into seven groups:

1. **Bugs that lose his data or show a wrong result.** A double tap in the 12 lies test also answers the next
   question (checked again by the review session). "Change my plan" in the quit date tool deletes his clean run. "Load example data"
   in check-in and diary wipes his own entries with no confirm. "Start over" in progress and cost deletes everything
   with one tap. A price typed as "7,50" is saved as $7.00. The belief result says "0 of 12 hold you" under three
   beliefs it calls "hold you most".
2. **The tools don't share anything.** The quit date is asked and kept separately in three tools (progress, timeline,
   quit date), which then disagree (20 vs 21 clean days). A slip is logged in three places (check-in, diary, slip).
   His money is typed in two (progress, cost). This is the biggest mistake built in by design.
3. **"Help for this moment" isn't matched to the moment.** Craving SOS (both versions) and the diary tip take a card
   by list position, so "In the car" gets "Tap 'Craving now?' at the bottom of any page". About 9 of 24 SOS swaps
   can't be done during a craving ("ask a doctor about varenicline", "same wake-up time every day"). "Not yet" is
   answered as if he slipped.
4. **Dead ends and broken promises.** 12 of 20 menu rows open "Coming soon" and look the same as working rows. Tools
   send him to things that don't exist ("your if-then cards", "steps 1–3", "your quit list"). "Make your free plan"
   leads to a login wall on the life plan. Links drop `?preview=1` and land on "Page not found".
5. **Copies that aren't full copies.** About two in three copies have placeholder screens; all five library copies
   have no articles to read; one accountability copy can't finish its main flow. His rule for copies (2026-11-18):
   a placeholder in place of a working feature is a failed copy. Each copy also shows 20–25 review tags ("inferred",
   "number not sourced yet") that read like proofreading marks.
6. **Content.** Written for cigarettes ("if you light it", "Did you smoke?") though the tools are for vapes and
   pouches too. Price asked per cigarette, not per pack. About 8 sources are about the wrong people (an alcohol trial
   in veterans behind the nicotine sleep advice, in three places) or don't say what we claim. Some numbers lack "how
   many people". Some pages are walls: "How people quit" is 15 cards; the health timeline repeats one card five
   times; the library best is about 20 phone screens of one-line cards.
7. **Live right now.** `/quit/coaching` is public without the preview flag. It shows "$200" and a guarantee in the
   first person ("I keep working with you free"). The privacy page tells people to ask for deletion "through the
   coaching page", which has no contact.

Scores per tool (best variant unless "wave 1"): sos 6 (wave 1: 4), progress 7, timeline 6 (wave-1 symptoms 5),
quit date 6, beliefs 6 (wave 1: 6), check-in 6, diary 5, lessons 5, cost 5 (wave 1: 6), past 6 (wave 1: 5),
if-then 6, library 4, gives (wave 1) 4, how (wave 1) 6, slip (wave 1) 5, coaching page 4. Copies: 3 to 8, most 5–6.

**Proposed order:** fix what would spoil his judgement first (Phases 0–4), then he reviews and picks one variant per
tool (`quit-copy.md` Phase 14), then only the picked variants get the shared basics, the menu and the content pass
(Phases 6–8). This avoids polishing about 50 copies that won't ship, without asking him to judge bugs instead of
designs.

## BLOCKERS (each tried once on 2026-11-19)

| ID | What | Attempted, and what it returned | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | Privacy contact email | `src/quit/data/contact.json` → `{"privacyEmail": null}` | The deletion path on `/privacy`; public release | Owner gives one address; until then the privacy page keeps saying no data leaves the phone |
| B2 | The quit-copy session is still running (Phase 12 `best` in fact-check, Phase 14 review page in progress) | `ListAgents`: 5 peer sessions, names don't say which runs quit-copy; plan status line on origin/main says Phase 14 is in progress | Phase 5 here is its Phase 14; fixes in Phases 2–4 touch the same files | The owner tells that session to hold Phase 14 until Phases 2–4 here pass, or says to run both |
| B3 | Coaching price and guarantee | `quit-tool.md` records his yes to $200 / 30 days and the guarantee (first-1000 A1–A6); his later note says he is "not sure about the prices" and is weighing a $1.99–2.99 membership | Making `/quit/coaching` public | Phase 0 hides the page; it returns when he confirms price and wording |

## OPEN QUESTIONS (proposed answers; the owner decides)

| Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|
| Q1 Fix before he reviews the variants? | Yes: Phases 0–4 first (about a day of builds), then the review page | He reviews now; only picked variants get fixed | Reviewing now: he judges bugs and placeholders, not designs, and may drop a good variant for a fixable bug |
| Q2 One shared record per addiction (quit date, slips, money, if-then plan) that every tool reads? | Yes, spec now (Phase 1), wire after his picks (Phase 6) | Each tool keeps its own | He types his date three times and sees numbers that disagree |
| Q3 Menu rows for tools not built yet | Keep them, greyed, with a "Soon" pill, not tappable | Hide them until built | Today they look tappable and open a dead end |
| Q4 Copy screens that were never shown publicly | Build a working best guess, tagged "not seen" in one small corner tag | Keep the placeholder card | Placeholders break his "fully working copy" rule; guesses may differ from the real app (the tag says so) |
| Q5 Library copies (their articles are their words) | Fill each copy's shell with our own short articles from `library/best` data, so the shell can be judged | Leave "Not copied: article" | Empty copies can't be judged at all |
| Q6 SOS: keep wave 1's belief answer and "if you light it" tape in the improved version? | Keep one line of the belief answer; drop the tape | Keep both / drop both | His step 1 method goes missing from the craving tool |

## PHASES

Models (owner, 2026-11-18): Opus writes briefs, fact-checks and audits; **Sonnet** builds (`claude --model sonnet`,
subagents `model: "sonnet"`); **Haiku** runs mechanical checks. Every build runs in a git worktree and is
fast-forwarded to `main` when its checks pass (memory `shared-checkout-tool-quirks`). Each fix gets a Playwright
check at 390x844 against the live site with `?preview=1` after deploy.

### Phase 0: what is live now — Sonnet, small

1. Gate `/quit/coaching` like the other quit pages: 404 without `?preview=1` (B3).
2. While previewing, every internal quit link keeps `?preview=1`: the coaching link, the footer's "Free tools", the
   header link, `/quit/coaching`'s "Free quit tools" (A3, B9).
3. `/quit/coaching?a=weed` must not promise "nicotine-free" (A3).

Acceptance: `curl` `/quit/coaching` → 404; menu → tool → coaching → back with `?preview=1` never shows a 404.

### Phase 1: the shared basics, spec only — Opus

Write the brief for one record per addiction in the browser store: quit date, clean runs and slips (one log, slips
for any day with undo), unit and price (per pack, per vape, per tin; per day), if-then plan, belief results,
check-in entries. Name the owner tool of each field, the reads per tool, and the move from today's keys
(`quit-v1`, `quit-lab-v1` per variant). Covers C-B3, D (three slip logs, two feeling lists, two reminder settings),
E3 (cost vs progress). Built in Phase 6, only for the picked variants.

### Phase 2: bugs that lose data or show a wrong result — Sonnet builds, Opus checks

In `best` and wave-1 `current` (copies only where named):

1. Double tap answers the next question: wave-1 beliefs (A-B1, confirmed again 2026-11-19); check every
   one-question-per-screen tool (beliefs best, past, slip, check-in, quit date).
2. Belief verdict counts ratings 4–5 while "hold you most" lists 3 and up (A5, D beliefs).
3. Wave-1 SOS opens on the last result on return (B1); "Not yet" treated as a slip (B3); "Yes" gets no credit (B4).
4. Quit date best: "Change my plan" deletes the run; a second "I slipped today" makes a broken run; slips only for
   today, no undo (C-B2, C should-fix).
5. Progress best and cost best: "Start over" without confirm; negative money shown as "$-367.46"; "1 clear days";
   a long word in a slip note widens the page (C, E5).
6. Cost best: "7,50" saved as $7.00, "0,75" blocks Save with no reason; formula line off ($316.72 vs $317.20);
   huge inputs scroll sideways (E2, E5).
7. If-then best: 15 of 33 actions build broken sentences ("then I same wake-up time every day"); "Two are ticked"
   with one; the "Show on my SOS screen" switch does nothing; unticking a moment doesn't remove it (E1, E6).
8. Lab example mode: example data lives in its own slot, so "Load example data" and "Clear example" never touch his
   own entries; first visit opens empty (D-B1). Check every variant that has example mode.
9. Lessons best: stuck on Day −3 without a quit date (show the date question or a link); a finish after day 14 (D-B2).
10. Check-in best: "Fill in yesterday" asks about "today"; days missed 2+ back can't be filled; a reload mid-evening
    drops answers; no look-back before his first day (D).
11. Belief best: "Take it again" hides the old result with no way back; "No" to "can you stop?" gets no reply (D).
12. Wave-1 slip: old day 1 on return; date shows as "2026-11-20"; unlabelled "Something else" box (B8).
13. "Make your free plan" goes to `/plan` (life plan, login wall): point to the quit date tool (A6, D).
14. Share card: "of Smoking or vaping's 12 lies"; add the site address; "Save the image" must not replace the page;
    per-page link preview title and image (A7).

Acceptance: each item reproduced before and passing after, at 390 px on live; Opus reads the diff for each.

### Phase 3: help that fits the moment — Opus writes the content map, Sonnet builds, Opus fact-checks

1. One list of in-the-moment swaps per need (things doable in 1–10 minutes, where he is), separate from the week-plan
   swaps in `gives`; SOS (both versions) uses only that list (B2, C-B1).
2. "Help for this moment" (SOS best) and the diary tip: a set of cards chosen per situation, not a deck opened at an
   offset; nothing circular ("tap Craving now?" inside Craving now) (C-B1, D-B3).
3. SOS: timer starts with one tap and sits at the top; "Move for five minutes" gets a timer and a source that backs
   it, or drops "five" (C); help on the first screen, naming the voice optional (B5).
4. Wording by unit from the data file: "Did you smoke?" → "Did you vape / smoke / use a pouch?"; "if you light it"
   only for cigarettes (A13, B9, C).
5. Diary best: "Did you smoke?" at the top; trim the 27 feeling and 33 action chips to what fits a craving (D).

Acceptance: for each of the situations, Opus reads the first three cards and confirms each can be done right there.

### Phase 4: copies that work — Sonnet builds, Haiku checks

1. Build the faked features (F1, F2): sos/a falling-blocks and memory games; sos/d its four strategies and card
   text; sos/e reasons list; diary/c timer and mood ring; beliefs/c result page; quitdate/b step-3 choices and
   suggested column; quitdate/d log control; accountability/e "Create the commitment" and its stakes step without
   the developer note; ifthen/b survey, analyze and "+"; ifthen/c saved-plan screen; library/c player; past/a video
   screen; lessons/e tour.
2. Never-seen screens: a working best guess (Q4), with one small "not seen" corner tag.
3. Library copies a–e: our own articles from `library/best` data (Q5).
4. Review tags: one "Copy notes" switch per page, off by default, instead of 20–25 tags on every screen.
5. Small: money with two decimals ("$138.4"); "1 check-ins"; tiny tab glyphs on cost/b; clipped first bar on past/b;
   ifthen/b cards overlapping at 390 px; cost/c splash with no control.

Acceptance: Haiku walks every copy's spec screen list and reports zero placeholders except the corner tag.

### Phase 5: his review — `quit-copy.md` Phase 14

The review page as planned there, plus one "known issues" line per variant for anything Phases 2–4 left open.
Depends on Phases 0–4.

### Phase 6: after his picks — Opus brief, Sonnet build

1. Wire the picked variants to the shared basics (Phase 1).
2. Put them in the menu `/quit/<addiction>`; rows not built yet greyed with "Soon" (Q3).
3. Menu lines promise only what the tool does: "hungry" (no hunger row), "hours" (never shown for nicotine),
   "3 taps" (6), "80% of it" (no basis) (A, B6, B7, B8).
4. Remove every link or mention of a tool that doesn't exist yet ("your if-then cards", "steps 1–3", "quit list").
5. Alcohol, weed and porn: tools without content stay hidden from the public switcher until their content exists.

### Phase 7: content pass — Opus fact-checks, Sonnet edits

Sources about the wrong people or not backing the claim (A10, A11, B, D, E: the sleep rules trial in three places,
the friend-network study, the letter study, lessons Day 4, the alcohol if-then review's main finding left out, the
5-minute walk); missing basis (lessons: 15 students, "83 in 100", "36%", the unsourced "most people get free"; 3,446
vs 3,609; Chaiton 7 vs 6.1); price per pack, vape price dated, consider the sales-weighted $9.95; walls (how: 15
cards; timeline: five identical cards; symptoms: 5 of 7 alike; library best: about 20 screens); the "basically
harmless" proof; RULEBOOK rules 6, 12c, 21 and the banned "complete success"; "Draft… not legal advice" on the public
privacy page.

### Phase 8: prove it — Opus audit, Sonnet walks

Repeat this review on the picked set (seven reviewers, same briefs), plus the phone emulator walk (memory
`android-emulator-rig`). Zero blockers and zero data-loss findings to pass. Then `quit-tool.md` Phase 7 ship steps
(needs B1).

## Part 2: ground rules for the build sessions

- Read the report item before fixing it; reproduce it on live first. Fix what the item points at, nothing wider.
- Public repo: no competitor names, quotes or screenshots in commits; the reports stay in `~/.cache`.
- Commit with `git commit --only <paths>`; worktree builds, fast-forward to `main`; `npm run build` keeps `--webpack`.
- A question this plan doesn't answer goes under "Questions from the build" below; go on with the next item.

## Questions from the build

(none yet)

## Execution prompt (after the owner answers Q1–Q6)

`/goal Run Plans/quit-review-fixes.md Phases 0–4 in order with the models named per phase. Read each report item
before fixing it. Stop after Phase 4 and post what passed and what is left.`
