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
| 0 | The frame: menu, shared record, page titles, links | wave-1 menu | — | building |
| 1 | Your quit date | lab `quitdate/best` | copy e's plan steps; the old "quit curve" hard-days calendar (mock F9kYB9… v2, study timing only) | not started |
| 2 | Craving now? | lab `sos/best` | one line of wave-1's "other side" answer; the craving log of `diary/best` | not started |
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

## Done

(none yet)

## Questions from the build

(none yet)
