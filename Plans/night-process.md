# Night process: his check at 20:00, a full night of work, a morning report

Written 2026-11-22 by Claude. Status: **proposed**. The owner said "yes lets do this" to the
outline in chat and added the 20:00 check. Everything below that he has not said is Claude's pick
and open until he says so.

## In plain words

The first two nights failed in two ways. Night 1 (20 to 21 Nov) made 18 AI-painting films he
could not use: nobody asked him whether that direction was right. Night 2 (21 to 22 Nov) had no
work: the render queue ran empty at 19:01 and the card sat at about 4% busy from 00:00 to 07:00.
The one whole film built that evening (v2) he judged "not coherent at all, too many swaps, v1 is
better" (06:31, film-v2 on his loop page).

The new way has four parts:

1. **20:00 check, with him.** Every day a "Night check" page is ready by 19:30. It shows where the
   work stands, what tonight will make, and why. He looks at it by 20:00 at the latest. One tap
   per item (👍 go / ✗ skip) and a note box on each, saved while he types.
2. **The night is stocked before it starts.** The night list adds up measured hours. Under 9
   hours of work from 21:00 to 06:00, I do not start the night; I add work first.
3. **Quality checks before he sees anything.** A dry run proves the whole chain works before
   bed. Every finished piece passes automatic checks and a fresh reviewer; the morning page shows
   only pieces that passed.
4. **No idle night.** A timer wakes me about every 30 minutes. Each wake: read status, restart
   anything stuck, build the next item of Claude's own work, write a line in the night log.

## The rules of the 20:00 check (proposed)

- **What he sees:** (a) one line: "tonight we are making X because of your note Y"; (b) the
  newest results, as short clips or frames; (c) the night list with hours; (d) what changed since
  yesterday.
- **What runs without a new 👍:** only work that continues something he already 👍'd or asked for
  in his own words. Each such item names the note it comes from.
- **What needs a 👍 first:** any new kind of work (a new look, a new tool, a new direction). Without
  his 👍 by 20:00 it does not run; the night uses its approved items.
- **If he does not look by 20:00:** the night runs only items already approved on an earlier
  night, plus checks and tests. No new direction. The morning page says "not looked at".
- **A note that says STOP on an item:** that item stops; I read the notes at every wake.
- A reminder row "Night check, 5 min, by 20:00" goes on his daily page (db `days/<date>`).

## What counts as "work for the whole night"

Two kinds, both on the list with an hour estimate from past logs:

- **Machine jobs** (renders, tests): `night/queue.txt` through `runner.sh`, with `night/est.txt`
  (id, minutes). A job without an estimate cannot be on the list.
- **My jobs** (design, build, review, fixes): `night/claude-tasks.md`, ordered, each with a done
  check. At each wake I take the first unchecked one.

Stock gate: machine hours plus my-job hours from 21:00 to 06:00 must reach 9 h; machine jobs alone
must cover at least 3 h, so the card is busy even while I am between wakes. The machine has
less real work than the night has hours: I will not invent renders to fill the card. If the
stock is short after the 20:00 check, the morning page says so, with the numbers. A "reserve" section
(approved earlier, safe to run: full-quality re-renders of approved spots, checks of finished
pieces) fills any gap.

## Phases

### Phase 1 (today, 22 Nov): tools. DONE 08:00 (stock.py, status.sh, wake.md exist and ran on the real night folder)
- `~/.cache/daygame-research/tools/night/stock.py`: reads queue.txt, est.txt, claude-tasks.md and
  prints hours of stock to 06:00; exit 1 under the gate.
- `~/.cache/daygame-research/tools/night/status.sh`: runner alive (restart if not), GPU average of
  the last 30 min from the gpu log, jobs with no log change in 15 min (stuck), jobs done since last
  wake; writes `night/status.txt` and appends to `night/night-log.md`.
- `~/.cache/daygame-research/tools/night/wake.md`: the exact wake-up prompt for the timer.
- Acceptance: run both on tonight's real queue; stock.py fails on the empty queue and passes
  after Phase 2 stocks it.

### Phase 2 (today): tonight's list and the page. DONE: page https://claude.ai/artifact/78ScUAMcVr2SZxe7upotZX, 20 clips (5 sequences x v1 / v2 blocks / v2 / calm), night list n1-n7, daily-page rows 22-28 Nov
- Tonight's list comes from his notes of 22 Nov 06:26–06:33 (below).
- The Night check page (artifact, same URL every day, db `likes` / `notes` / `list`), built to the
  review-board rules: a 👍 per item, notes that auto-save with the green Saved badge, previous
  notes listed. Checked on a phone-width window before publish.
- Acceptance: the page opens, a 👍 and a note save and come back after reload.

### Phase 3 (today before 19:30): dry run
- The chain clips to film runs once at low quality on the real files. It must give a playable
  film with sound in sync, no black frames, captions in place (ffprobe + frame checks, contact
  sheet looked at by me, then by a fresh reviewer).
- Acceptance: all checks pass, or the night list says in its first line what is broken.

### Phase 4 (20:00): his check; 21:00 start
- Timer starts at 21:00 (`ScheduleWakeup`, about 30 min). Each wake follows `wake.md`.
- GPU proof: `gpu_log.sh summary` in the morning report.

### Phase 5 (06:00 to 07:00): morning report
- One page (same URL): done, failed and why, GPU hours, what needs his look first. Only passed
  pieces appear as clips; failed ones are a list with reasons.
- A push notification at 06:30 if I am still alive; the page is the record either way.

## Tonight's list from his notes (22 Nov, 06:26 to 06:33). Proposed.

His words, kept short:
- film-v2: "v1 is actually better … v2 is not coherent at all. Too many swaps between things, and
  some of the animations are too fast paced. I need the ability to look at this in sequences, and
  talk about the different moments that feel off … some cuts or animations coming in for only a
  little time just makes it feel not very good."
- loop-flicker: needed more than 2 s; prefers B or C (cannot tell them apart); "our objective is
  not to make it not look like computer generated. It is obviously an animation."
- loop-8: "why am I seeing this again?" (a card shown twice on the page: to check).
- Earlier (21 Nov): short loops are good; no wooden blocks as the strategy; he wants to film
  tomorrow; S1c "very good", S6a "strongest", S8b "like the most"; reset of the page while typing
  (fixed D40).

Candidate items (each needs the 20:00 👍 except the ones that only continue his words):
1. **Film in sequences.** Cut the film into 5 to 6 sequences at natural story breaks. Each
   sequence is its own short clip on the page with a note box, so he can say which moment feels
   off. Continues film-v2 note. No new look.
2. **Fewer swaps.** A "calm" assembly: blocks stay the base; new scenes only at the spots he 👍'd
   (S1c, S6a, S8b, S5b, S7a), each held at least 4 s; no scene change within 3 s of another; slower
   animation speed. Compared side by side with v1 per sequence. Continues film-v2 note.
3. **Fix the known flaws** from the handoff: bed (S5b) and objects (S7a) vanish at the cut; S1c
   counter never lands on a readable number; the dead stretch 1:27 to 1:34.
4. **Grain** B (0.008) as the default for all spots, since he prefers B or C.
5. **Page:** find why loop 8 shows twice; show sequences, not one long film.
6. **Reserve:** 64-sample full-quality renders of the approved spots so tomorrow's options are
   ready at full quality.

## BLOCKERS

| ID | What | Attempted, result | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | A timer-woken session only works while the Claude session stays open | Checked: `ScheduleWakeup` exists in this session; no overnight run has used it yet. Test tonight at 20:30 with a 60 s wake | Phase 4 | Test it before he leaves; if it fails, machine jobs only and say so on the page. **Tested 2026-11-22 08:05: the 60 s timer wake reached this session and status.sh ran (log line 08:05 in night-log.md).** |
| B2 | He may not look by 20:00 | Rule above (approved-only night) | none | as written |
| B3 | Disk and RAM are shared with other sessions (13 to 14 GB free at times; the gate also budgets RAM) | `runner.sh` already stops at 15 GB free; renders go through `gpu_gate` | night | keep both; status.sh reports free GB |

## OPEN QUESTIONS (each with my recommendation)

| Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|
| Is 20:00 the hard time, or the latest? | The latest; page ready 19:30 | page ready 18:00 | none |
| Should tonight's page have a "stop the whole night" control? | Yes: a note on the top card that says STOP | none | a night wasted |
| Do my jobs run through the night (token cost), or machine jobs only? | Both, as he said "work through the night" | machine only | tokens vs idle hours |
| Sequences: how many? | 5 to 6, cut at story breaks I pick and show first | by his word list | one round |

## Ground rules for the executing session

- Nothing is called decided; every item is "proposed" until his words.
- The page is the only thing he looks at; no local paths.
- Every file written here is committed the same turn (`git commit --only`, ship via
  `node scripts/ship.mjs`).
- GPU jobs go through `tools/gpu_gate.py`; mirror the log from `gpu_log.sh`.
