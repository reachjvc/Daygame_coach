# Quit tools: finish them one by one

**Status 2026-11-26:** 13 nicotine tools are live and wait for you to try them. None is "done" yet. Nothing is
being built right now: the next move is yours (see "Now").

## What this is

Free quit tools, nicotine first, then the other addictions (your CLAUDE.md: "a suite of 'quit' tools for all
relevant addictions"). Visitors find the tools and the tools lead to coaching. We finish them one at a time, on
phone and computer, until you say "this is done". A done tool is not changed again unless you reopen it.

## Status

Status words: not started, building, checking, waiting for you, done (date and your words). Address:
https://10kdaysclub.com/quit/nicotine/<id>. Checked 2026-11-26: the 13 load; "later" ones and coaching are "not found".

| # | Tool | id | Status |
|---|---|---|---|
| 0 | The frame: menu, page titles, shared record, links | – | live; no check by you (no screens of its own; Claude's call) |
| 1 | Your quit date | date | waiting for you since 2026-11-19 (no task found on your daily page) |
| 2 | Craving now? | sos | waiting for you since 2026-11-19 (no task found on your daily page) |
| 3 | Your record | record | waiting for you since 2026-11-20 |
| 4 | Slipped? Restart today | slip | waiting for you since 2026-11-20 |
| 5 | The 12 lies test | beliefs | waiting for you since 2026-11-22 |
| 6 | What you'll feel, and when | symptoms | waiting for you since 2026-11-20 |
| 7 | If-then plan | ifthen | waiting for you since 2026-11-20 |
| 8 | Daily check-in | checkin | waiting for you since 2026-11-20 |
| 9 | What it costs you | cost | waiting for you since 2026-11-22 |
| 10 | Your past attempts | past | waiting for you since 2026-11-20 |
| 11 | Today's lesson | lesson | waiting for you since 2026-11-20 |
| 12 | How people quit | how | waiting for you since 2026-11-20 |
| 13 | What it gives you | gives | waiting for you since 2026-11-22 |
| later | Tell someone, Money on the line, Clear-out list (you: "not sure if useful"), What helps besides apps, Who you are now | tell, stake, clear, besides, identity | not started (grey "Soon" on the menu) |
| later | Talk to a coach | coach | hidden until you set price and guarantee (B3) |
| new | Our own belief tool, for any area of life | – | studying real tools; waiting for your marks (see "Now") |
| next | Weed, alcohol, gaming, porn and more (your CLAUDE.md list) | – | not started, hidden (weed, alcohol, porn have data files) |

## Your decisions that still hold

- 2026-11-19: "a list of tools we intend to have, and then begin working on finishing them one by one, on both
  browser and mobile, so that i can say 'this is done' and we dont have to think so much about it anymore".
- 2026-11-19: you do not want to review the ~70 lab variants (Claude's summary). Never add a "pick a variant" step.
- 2026-11-19, on release: "no need to hide it, just have it be where you intend it to be". So a built tool is
  open to everyone at once.
- 2026-11-26: Claude builds the site and the app. The plan for you to rebuild it yourself is off.
- Your data rule: what a person enters is kept on the server, never only in the browser (2026-11-18, Claude's
  summary, after a plan was lost to browser-only storage). Today the tools break this; see B1.
- 2026-11-18: the tools are free, at most a free account; only 1:1 coaching is paid; money in USD. On prices:
  "not sure about the prices". On the founder's voice in the tools: "not sure we need my voice" (check with him).
- 2026-11-18: no "men" in tool names (Claude's summary of your menu notes).
- Your notes on a tool are fixes for that tool, not new rules for all tools.
- Your five-step plan in `src/quit/data/nicotine.json` (`planSteps`) is your own text, with small wording fixes.
  The tools link to its steps.
- Belief tools (your notes on the look page, 2026-11-21):
  - one master list of beliefs from all tools "where i choose which ones i do not like"; our tool "would perhaps
    just give feedback on each belief immediately, or after the test, without an email signup";
  - one belief tool = "a list of the most common beliefs that we curate + a tool where they write their own";
  - "beliefs are really about more than just nicotine or weed or addictions, but about life in general": the user
    picks an area (quitting, daygame, productivity, ...) and sees the beliefs for it; "i want to redesign part
    of my website" for this;
  - 2026-11-26, after marking the first beliefs: some beliefs exist for every addiction ("X calms me", "X is very
    hard to quit"). "This is very good to know, because then we have some foundational pillars, and we just move
    things around slightly depending on the type of addiction." So our tool is built on shared pillar beliefs,
    with per-addiction wording on top. A 👍 on a wording also means he likes the replies under it.
  - tool r2's explainer page "is worth gold"; tool r4's guide and its guide to distortions: "take their words and things, then change things
    around strategically, then create a menu where everything seemlessly goes together".
- How to work (2026-11-19): "just work independently, or give me the very worst contenders here in text".
- Studying real apps (2026-11-20): "I would prefer to not have to pay for any apps". You don't walk apps or fill
  forms yourself; throwaway inboxes are fine ("you can begin your work by using the throwaways").
- Coaching page (2026-11-19, rebrand before/after): "i liked the one on the left more, but theres nothing here now".
- Content rules for every tool (never screen the reader, edge for the 98%, every number shows who was counted)
  are your one-pager notes, kept as rules in `docs/research/addiction-one-pagers/RULEBOOK.md`. Your ideal for
  the "how it feels" graph: "surveying 1000 people every day" (rule 18).
- One public page per addiction, linked from your book and videos (Claude's summary, one-pager notes). On
  2026-11-18 you said the one-pager is not the right frame for the tools. Are the pages still wanted? (check with him)

## Now

**1. Your try of the 13 live tools.** Tasks for 11 of them are on your daily page under 2026-11-20 and 2026-11-22.
None is ticked, and the quit notes board has no notes yet.
- Next step for Claude: put the untried tools on a coming day of the daily page, a few per day, with the link
  and "say done or tell Claude what's wrong" (Claude's proposal).
- When you leave a note: read the notes board first, fix only that tool, re-check it, ask you again.
- When you say "done": add the tool id to `src/quit/data/finished.json` and write the date and your words in the
  table above.

**2. Our own belief tool (study, round 3).** Claude studied about 25 real belief tools: working copies and
video studies are on the look page. All their beliefs are on the **Belief Map** (published 2026-11-26): one block
per single belief, Easyway's wording and reply first, then the same belief in other tools (592 beliefs, every line
word for word). On 2026-11-26 he asked for everything open in one long list, so the **Belief List, all open** replaces it for deciding: every wording and reply side by side, nothing to expand.
- 2026-11-25: you struck 44 beliefs and wrote two notes on the list: "this was hard for me to read, but probably
  valuable" and "so many replications of the exact same words, it is a kind of bad job youve done here". Claude then
  rebuilt the list: one row per belief, and a box per tool with a plain summary and that tool's own lines.
- 2026-11-26: you found that version too hard to work with (one Cut hit several beliefs; competitor lines mixed).
  You asked for: the belief as Easyway words it, their reply, addiction copies shown once, then the cousins from
  other tools. Claude built that as the Belief Map. Your old strikes show there as "You struck this before".
- 2026-11-26, round 1 on the all-open list: you went through the first 65 beliefs (Allen Carr's 10 and most of
  EasyPeasy's) and kept 57. They are moved off the page; the record is `v5/round1-decisions.md` in the belief study.
  527 beliefs left; the page now marks beliefs seen in 3+ addictions as "Pillar".
- 2026-11-27, round 2: you went through every addiction section (102 more beliefs, 72 kept; record `v5/round2.json`).
  130 kept in all. Left on the list: 425 life beliefs and 163 non-beliefs, no addiction beliefs.
- 2026-11-27: the **Belief Picker** groups the 130 kept beliefs into 59 common beliefs (25 pillars across addictions,
  7 thinking traps, porn-only, gambling-only, ideas, later). Per belief you pick the best words and the best answer,
  and switch addictions on or off. Grouping is `v6/groups.json`. Your notes say the free open-source thought diary
  was the copy that explained thinking traps best.
- Next: you pick words and answers on the Belief Picker. Then Claude designs our tool from the picks and the copy you
  liked best, each change as one plain question (Keep / Change). Then build, check, and you say done.
- The 12 lies test stays as it is until you decide (see question 7).

## How a tool gets to "done"

- Done means: every flow works on a phone (390 wide, touch), on a computer (1280 wide) and on the Android phone
  emulator; three reviewers (bugs; feel and look; content and sources) find nothing that blocks or "should fix";
  it uses the shared record and never asks what another tool already asked; then you try one link on phone and
  computer and say "done".
- After three fix rounds still not clean: stop and write why here. Then a task on your daily page. Fix list: the
  review reports of 2026-11-19 (private folder below).
- Built and open: list the id in `src/quit/data/liveTools.json`. Done: also in `finished.json`, only on your word.
  A menu row not in `liveTools.json` is grey "Soon" and its page is "not found".
- Data: clean runs and slips live in the Black Box (`src/vice/blackbox/`, `/api/black-box`) and reach your
  account when signed in. Quit date, unit and price (`src/quit/record.ts`) and most other answers stay in the
  browser until B1.
- Every data file is checked by `src/quit/validate.ts` against the RULEBOOK rules. Every number shows who was
  counted, how many, and what it does not mean.

## Questions only you can answer

1. **B1, save to your account.** Keep quit date, unit, price and the tools' answers on the server (one small new
   table in the live database)? Asked 2026-11-19, no answer yet. Recommendation: yes, it is your data rule.
2. **B4, database fix.** Apply the tested fix that stops two phones overwriting each other's Black Box rows
   (`supabase/migrations/20261120090000_vice_rows_newer_wins.sql`, undo file in `supabase/migrations/rollback/`)?
   It changes no existing row. Checked 2026-11-26, read-only: not applied, and it is the only repo migration missing
   on live; `db push --remote` needs `--include-all` for it. Recommendation: yes.
3. **B3, coaching.** `src/quit/data/offer.json` holds $200 for 30 days and "If you're not nicotine-free in 30
   days, I keep working with you free until you are." You said "yes all of these are fine" (2026-11-18), then
   "not sure about the prices"; you were also weighing a $1.99-2.99/month membership (undecided). Keep, change or
   clear? Recommendation: decide once the first tools are done; the page stays hidden until then.
4. **B2, privacy email.** The contact address for the quit pages (`src/quit/data/contact.json` is empty). Needed
   before you promote the tools. Recommendation: the support@ address set up on 2026-11-22.
5. **How people quit: which number first?** Lead with "About 84 in 100" (get free in their lifetime) instead of
   "19 in 100"? Reviewers in all three rounds read "19 in 100" as bad news. Recommendation: yes, lead with 84.
6. **Next addiction, and when.** Recommendation (Claude's proposal): weed next (Claude's reading of your CLAUDE.md list), once
   2 or 3 nicotine tools are done, so their fixes carry over.
7. **Belief tool and the 12 lies test.** When our new belief tool is ready, does it replace the 12 lies test?
   Recommendation: keep the 12 lies test untouched until then, and you choose with both in front of you.
8. **The ~70 small choices in the old plan** (codes like R1–R7, K1–K8, H1–H10). Your daily-page tasks point to
   them. They are Claude's defaults and already built. Recommendation: drop them; you raise what you dislike
   while you try each tool. Old text: `git show 18efdb10:Plans/quit-finish.md`.

## Where things are

- Live: https://10kdaysclub.com/quit/nicotine (menu).
- Code: `src/quit/` (tools in `src/quit/tools/<id>/`, data in `src/quit/data/`), pages in `app/quit/`, Black Box in
  `src/vice/blackbox/`, tests in `tests/unit/quit/` and `tests/e2e/quit/`.
- Content rules: `docs/research/addiction-one-pagers/RULEBOOK.md`; private appendix
  `~/.cache/daygame-research/one-pagers-v2/rulebook-private.md`. Source data: `docs/research/addiction-one-pagers/08-v3/`.
- Your pages: daily page https://claude.ai/artifact/FJPtUMkjkJnEtwvn5J6M1t; quit notes board
  https://claude.ai/artifact/E2ThcB2qrCmcbCyJVhVdDJ (source `~/.cache/daygame-research/quit-finish/board/`);
  belief tools look page https://claude.ai/artifact/AdANNvEXV3dMFoZsC3WrtF; Belief Picker https://claude.ai/artifact/VKfBXHKWF9nzGNH8sHT176
  (`build6.py`, tests `test8.cjs`); Belief List, all open https://claude.ai/artifact/PmCDKP6rqMKBgnVkMsv6TX
  (`build5.py` on top of `build4.py`, tests `test7.cjs`); Belief Map
  https://claude.ai/artifact/55QSbJEd4RUizQfr9AwoWn (built by `round3/beliefs/page/build4.py`, tests `test6.cjs`, in
  the belief study); older belief list https://claude.ai/artifact/JZf7qwpmp45tzpVRhastfx (`build3.py`).
- Private folders (they name other products; never copy into the repo): review reports of 2026-11-19
  `~/.cache/daygame-research/quit-review-2026-11-19/` (A–E, F1, F2 `-report.md`); build notes and fetched sources
  `~/.cache/daygame-research/quit-finish/`; belief study `~/.cache/daygame-research/quit-copy/beliefs/round3/`.
- Competitors you want to beat on everything (your ask, 2026-11-26): one private file each in
  `~/research/competitors/` (README says how to revisit). Read the matching file before building a tool they also have.
- Old texts (briefs, review rounds, small choices): `git show 18efdb10:Plans/quit-finish.md` and
  `git show 18efdb10:Plans/beliefs-rethink-r3.md`. The app plan: `docs/tech.md`, section 9.
