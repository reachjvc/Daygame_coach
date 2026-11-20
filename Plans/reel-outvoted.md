# Reel "Outvoted": from a spoken take to a finished animation

Written 2026-11-19, rewritten the same evening after his answer. Status: **proposed**
(Claude's plan; nothing here is decided by the owner until he says so).

## In plain words

He spoke the script once, with a normal microphone, in a few minutes. The aim is a way of
working where that is all he has to do, and a finished reel comes out. This reel is the test.

**The first way failed.** Claude drew every scene as a near-still timed to his voice (a
"moving storyboard") for him to judge before the real animation. His words: "a bunch of very
simple animations"; looking at something before it is finished may not work for him.

**The way now (his words, 2026-11-19):** "fully create a full on animation, graphically
looking awesome is the goal, super coherent, rather than a bunch of screens that change."
He liked the falling block tower of video 01 and the drawn street scene. Tokens are counted
per stage, but quality comes first: "use as many as necessary".

So: Claude plans one story, builds the whole film in the block look, checks it itself, and
he sees it only as a real video.

Private working folder (not in this public repo): `~/.cache/daygame-research/content/reel-outvoted/`
(`audio/`, `film/`, the dropped `storyboard/`). The script is R1 on the next-six page.

## The film

One continuous shot-film on one wooden table, 1:58, no people, no hands.

- Every night he stacks a whole new life on top of the amber block QUIT WEED: quit nicotine,
  work all day, start running, talk to every woman, build the business, write the book,
  perfection.
- Every morning the tower comes down.
- Then he sets down only the amber block and lets the others lie where they fell (games all
  day, junk food, no running …). It stands, day after day.
- The light is the time of day: cool moon, warm low sun. Words burn into the table.
- Ends on a blank block that gets YOUR ONE THING, and four cubes Q U I T.

Every event hangs on a spoken word, so a new recording re-times the film with one command.

## Where it stands

| Stage | State |
|---|---|
| Cut of his take | Done. 1:57, retake removed, pauses shortened, breaths cut out, volume raised |
| Voice quality | He says: still not clean enough; he re-records with another microphone another day |
| Film build | Done: all 21 shots, key stills and a small full-length draft, checked by Claude |
| Fix round | Done 2026-11-19: livelier opening, the seven blocks waiting in the dark, captions kept clear of blocks, two still stretches |
| Full-size render | Done 2026-11-20: 3,555 pictures, 1 h 21 min of computer time (one part stopped in the night and was run again in the morning). Checked: one picture per second looked at, voice 3 ms off the cut, loudness -14.1 LUFS |
| His look | Waiting for him: the film page (listed in notes-seen.md) with 👍 and notes on film, sound and captions |

## What it cost (counted, as he asked)

New tokens = what Claude read for the first time plus what it wrote, counted from the
session logs with `~/.cache/daygame-research/tools/tokens.py`.

| Stage | New tokens | Time |
|---|---|---|
| Cutting his take, checking the words, planning (main chat) | 205,000 | about 50 min |
| Moving storyboard (dropped), smaller model | 229,000 | 17 min |
| Taking the breaths out (main chat) | 78,000 | 10 min |
| Film build, first full draft (big model) | 883,000 | 1 h 55 min |
| Fix round on the film (big model) | 695,000 | 52 min |
| Main chat around the build: brief, his questions, two reviews | 193,000 | |
| Full-size render | none | 1 h 21 min of computer time |
| Finishing: checks, the page for him | about 140,000 | about 40 min |
| **Total** | **about 2,423,000** | |

Without the dropped storyboard the film took about 2.2 million new tokens.

Re-read tokens (the chat reading its own history at each step) come on top and are the
largest number: about 79 million (61 million of them in the film build and fix round).
They are billed at a small fraction of new tokens.

## Blockers

| ID | What | Tried, and what came back | Blocks | Proposed |
|---|---|---|---|---|
| B1 | Claude cannot hear | Three speech programs compared; levels measured. Nobody has listened to the knocks and room tone | His verdict on sound | He listens to the finished video |
| B2 | "Comment QUIT for my full guide": is there a guide to send? | Not checked; the quit tools are still being finished (`Plans/quit-finish.md`) | Posting | Decide before posting |
| B3 | Posting to Instagram | Not tried. His account, his login | Posting | He posts; Claude hands over the file, caption and cover |
| B4 | Machine is busy while he plays | Render waits and slows down by itself when the PC is loaded | Speed only | Long renders in the background, or at night |

## Open questions (each with Claude's pick, all proposed)

| # | Question | Pick | Other way | Cost if wrong |
|---|---|---|---|---|
| Q1 | Is the block film the right look and story? | He judges the finished video | | One more build round (the fix round took about 700,000 new tokens) |
| Q2 | New voice take with a better microphone? | Yes, his call and his timing. The film re-times itself to the new take | Keep this take | A second render (computer time only) |
| Q3 | Put back "for the first time, the guy in the morning said yes"? | Yes, in the new take. It pays off the two-guys idea | Leave it out | A flatter turn |
| Q4 | What does a person get who comments QUIT? | Decide before posting | End with no ask | A promise with nothing behind it |
| Q5 | Night render queue (his idea, 2026-11-19: build by day, render at night, he judges in the morning) | Kept as an idea. Not set up | | |

## What this run should prove about the process

- His time: one take (a few minutes), then one look at a finished video.
- Whether Claude can get a film right without him seeing a step in between.
- What a finished reel costs in tokens and in computer time (table above).
