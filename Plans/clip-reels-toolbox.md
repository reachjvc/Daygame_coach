# Clip reels: toolbox and versions (proposed, 2026-11-21)

Status: **proposed**. Nothing here is decided until the owner says so. This
plan stays open until he says otherwise.

Track 1 (celebrity clip reels). Replaces the round-by-round way of working
of rounds 2–4. Owner's review page: "Clip Reels Reset" (link in memory
`celeb-quit-reels` and in `notes-seen.md`). Private material (people, video
ids, footage): `~/.cache/daygame-research/celeb-reels/`.

## Why

His words (verbatim, `docs/product/content_creation_history.md`):
- R4-1: "i want you to have atool box, and then make several versions from
  using that toolbox, and then we find something that works."
- R4-5: "We're not anywhere near what i want to be able for us to produce
  i nterms of quality or our alignment of understanding, which is still
  very far apart."
- R4-6: "you keep misunderstanding my feedback at the least slightly"
- chg-1: "YOu keep wanting to make too fixed rules that do not make sense
  in the long term"

What went wrong, Claude's reading (each case quoted in the history file):
his ideas became required parts ("anchor", the paper), his question became
a rule (black bars, chg-4), a number he never said became a rule (12 s,
chg-1), a preference became a ban (AI voice, chg-0), and each round made 1–2
small steps from the last instead of several different tries.

## The proposal in short

1. **Toolbox, not rules.** His ideas become tools (T1–T13 on the page).
   Each tool keeps a log of where it was used and his words about it. Only
   what he himself calls a rule is a rule.
2. **Note kinds.** Each note is labelled idea / fault / question / verdict /
   wish, shown to him. Questions get answered with evidence, not turned into
   rules. Unsure of the kind: ask.
3. **Checker.** Before a round is built, a separate agent reads his raw
   notes next to Claude's reading and flags added numbers, "never/must"
   words and narrowed meanings.
4. **Footage hunt first.** A library of a few dozen candidate moments from
   across the internet before any cutting.
5. **Four different versions per round**, each with a visible recipe (which
   tools, where), all telling "why never again never worked".
6. **Cuts judged by ear** as well as by `cutsafe.py`; sound and picture can
   change at slightly different moments to smooth a cut.
7. **Reference reels** (if he says yes to Q5): real celebrity story reels
   at the top of the next page so he can point at what he likes.

## Phases

- **Phase 0, his answers** (owner; done 2026-11-21, see below). Read the reset page's notes and 👍
  (db `notes`, `thumbs`). Record his notes verbatim in the history file.
  Nothing below starts before this. Model: Opus.
- **Phase 1, reference reels** (only if Q5 = yes). Find 6 strong celebrity
  story reels, play them on the next page with 👍 + notes. Model: Sonnet
  for the search, Opus picks.
- **Phase 2, footage hunt.** Library of candidate moments with contact
  sheets, source and what each could do for the story; sources with higher
  claim risk marked. Model: Haiku scouts, Sonnet sorts.
- **Phase 3, four versions.** Cut from the library with the existing tools
  (`render4.py`, `cutsafe.py`, `barscheck.py`); recipe per version; every cut
  heard in a short preview. Model: Sonnet builds, Opus review gate.
- **Phase 4, his look.** One page: four versions, viral original beside
  each, recipe strip, 👍 + notes, Claude's reading of the last round's notes
  with their kinds at the top.
- **Phase 5, next loop.** Notes read with kinds, checker run, tool logs
  updated; next four versions build on the best one plus new mixes.

## Questions (on the page, each with a recommendation)

- Q1 What the Billy reel is for: recommend test bench for the toolbox,
  posting the best as a bonus.
- Q2 Length: recommend no fixed number, most near the original (53 s),
  one or two longer if earned.
- Q3 Versions per round: recommend 4, clearly different.
- Q4 Footage limits: recommend anything public in drafts, posting his call,
  claim risk marked.
- Q5 Reference reels first: recommend yes.
- Q6 Him on camera: recommend not in the next round.
- Q7 How readings are checked: recommend build straight away, reading shown
  on the next page, stop only when unsure.
- Q8 Trial Reels with real viewers: recommend later, once two versions are
  liked; posting is his call.

## His answers on the Reset page (2026-11-21, word for word in the history file, RS-*)

Phase 0 is done. Short form here; his exact words win wherever this differs.
- 👍 on Q1 (Billy = test bench), Q5 (reference reels first), Q8 (Trial
  Reels later), P2, P3, P5, P6, all research items except R8, and tools T1,
  T2, T3, T5, T7, T8, T9, T10, T11, T13.
- Length: no fixed number, "somewhere in 45-85 sec for MOST videos" (RS-Q2).
- Versions: "as many as you can realistically make that would make sense"
  (RS-Q3).
- Risk: use short pieces from many sources; claims are something to learn
  from, but every project and part shows its risk so he knows what he says
  yes to (RS-Q4).
- Him on camera: not reacting, but in a decent share of reels, for example
  an outro (the science, what to do, how it relates to quitting). The
  process must make his part easy to film (RS-Q6).
- Checking my reading: ask him only when unsure (RS-Q7).
- Story and hook: "(something like that)" is never copied as text; show him
  10 to 20 options and he picks the most catching, above all for the opening
  (RS-U7). Possibly decide together on "X appropriate things this story
  would be telling" (RS-U6).
- Wider search: find things that are tangentially relevant: someone saying
  the same thing, a slightly different thing, another rockstar with the same
  story (RS-U2). Bigger hunt, done by smaller models (RS-P4).
- Toolbox grows: animations where they make sense (RS-U6); about 20 things
  his paper idea pointed at, not papers (RS-T3); about 10 ways to make the
  crash vivid (RS-T10); the narrator may describe the screen sometimes
  (RS-T4).
- Black bars: "seems more like a mistake" (RS-U4). Find once and for all how
  reels should look (RS-T12).
- More AI in the process, with the best methods (RS-R8).
- A way to see whether we get closer to the target: what he said, about
  which version, kept as memory without fixed rules; stay creative (RS-P1).
- The loop asks little of him. Claude suggests a research spell on how to do
  the job when he keeps saying the same thing (RS-M5).

## Round 5 (proposed 2026-11-21, after his answers)

Steps a–e run side by side; f needs c; g and h close the round.

- **a. Story and opening lists** (Opus). 15–20 things the Billy story could
  be telling, and 15–20 openings (first 2–3 s: line + picture). Each
  version in f uses a different pair; the page shows the full lists for his
  pick.
- **b. How reels look, once** (Sonnet research, Opus judges). Measure 20–30
  strong celebrity story reels on YouTube Shorts and TikTok (no Instagram
  reads): full screen or framed, caption place and size, text on top,
  source names, length, cut pace. One look sheet with the counts. 6–8 of
  them play at the top of the page (Q5).
- **c. Wide footage hunt** (Haiku scouts, Sonnet sorts). Search angles per
  story beat: Billy elsewhere, other rockstars with the same story, people
  saying the same or a slightly different thing. Library with contact
  sheets, checked words, and a claim-risk label.
- **d. Idea lists** (Opus). ~20 things the paper idea pointed at; ~10 ways
  to make the crash vivid; animation tools we can make.
- **e. Research** (Sonnet). Best AI methods for this kind of editing (R8),
  and Claude's suggestion from RS-M5: why an AI keeps reading examples
  literally, and how editors and AI tools widen options.
- **f. Versions** (Sonnet builds, Opus gate). As many as make sense, most
  45–85 s, each a different story + opening + tool mix, recipe strip,
  risk label, cuts checked by ear. One or two leave a slot for his outro.
- **g. Target log** (proposed). Per version: his words tied to the time
  and the tools in it, and one tap "how close to what you want" (1–10), so
  rounds can be compared.
- **h. Page** "Clip Reels Round 5": my reading of his notes with kinds,
  the checker's flags, lists from a and d, look sheet, versions.

## Blockers

None known. Downloads use `yt-dlp` as in rounds 1–4. No paid tools.

## Research behind it

On the page, section R, each item marked checked or from memory, with links.
