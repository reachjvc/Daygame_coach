# Content creation process

How we make content, and what we learned. Read `docs/product/content_creation.md`
first: it has what is going on now. His exact words, and the older sections
that used to be here, are in `docs/product/content_creation_history.md`.

**Status (owner, 2026-11-18): not decided.** About 40% of a final process.
Everything Claude wrote here is a proposal until he says yes.

**Next film to improve: "Outvoted" v2** (Claude, proposed 2026-11-21;
Track 2). It carries out his notes of 2026-11-20 (faster; other kinds of
animation, "at night" and "in the morning" the obvious spots; the blocks
stay the main line; himself filmed; breathing gone) and of 2026-11-21 (no
AI still paintings or slow zooms; variety from kinds of animation; GPU near
full at night, proven with numbers; filming = him speaking the script on
camera; the blocks' type of animation is right, the blocks are not the gold
standard; short loops; GPU by day when free, the night always has work).
[his words; history "The owner's words"] Plan:
`Plans/outvoted-animation-round.md`. A night session builds only from this
line; if it is out of date, the night does not start. [Claude, proposed]
Status 2026-11-21 19:40: seven spot loops, the filming storyboard and the
whole v2 film (101 s) are on his loop page; waits for his 👍 and notes.
[record]

Tracks (proposed 2026-11-21): **Track 1** celebrity clip reels; **Track 2**
our own films (Outvoted, the next reels); **Video 01**; **Finding the
look** (finder, ten ways). Headings here and in the history file name
theirs. Mistakes, one entry each, newest first:
`docs/product/content_mistakes.md` (proposed).

## How this file is kept (proposed 2026-11-21, not decided)

His words (2026-11-21, R3-6): "you tend to drift away from what i want, and
then make fixed rules that actually serve to make future versions drift too".

Two files, two jobs:
- **History file** = the raw record. His notes go in word for word, each tied
  to the round, the version and the video time it was about. Nothing there is
  reworded or deleted.
- **This file** = only the lessons. Short (under about 150 lines).

Every lesson line here:
1. points to the words it comes from (R3-4, or a history section);
2. keeps his own hedges and limits: "only", "maybe", "could", "for this
   reel". "Don't only make them longer" never becomes "make them shorter";
3. names its scope: this reel, celebrity reels, or all content;
4. says whose it is: **[his words]**, **[his yes]** (he agreed to Claude's
   wording) or **[Claude's reading]**.

Pruning, after every round of his notes, one line at a time (never a
rewrite of the whole file):
- A [Claude's reading] he has not confirmed by the next round is deleted.
- A line his newer words contradict is deleted; the newer words win.
- A line with no source in the history file is deleted.
- Duplicates are merged into the line with the best source.
- The round's page lists every line added and deleted, each with a 👍 and a
  note box, so he can stop a wrong change. Git keeps the old text.

Before building a round: the page shows each choice with the quote it comes
from. A choice with no quote is labelled "Claude's guess" on the page.

Why this way (research 2026-11-21; sources checked on the page unless
marked "snippet"):
- Two 2025-26 studies found that an AI that keeps rewriting its notes into
  general lessons gets worse over time: the lessons get short and generic
  and drop their conditions. Keeping the raw cases and editing one line at a
  time did better. ACE paper (arxiv.org/abs/2510.04618, ICLR 2026);
  "Useful Memories Become Faulty…" (dylanzsz.github.io/faulty-memory, 2026,
  early-stage). Both measured on benchmarks, not creative work.
- User research practice: write exactly what people said, not what you think
  it means (GOV.UK service manual).
- Decision records: a changed decision gets a new entry that supersedes the
  old one, with a status (Microsoft architecture guide, 2026).
- Anthropic's own advice for instruction files: under 200 lines, review often
  for outdated or conflicting lines; with conflicting lines the AI picks one
  "arbitrarily" (code.claude.com/docs/en/memory).
- Video review tools pin each note to a time in one version (Frame.io, Vimeo;
  snippet).
- Not found: any test of this on creative feedback. The rules above are
  Claude's reading of the sources.

This replaces the earlier proposal that "each note is fixed and saved as a
rule for later reels" (way 5, 2026-11-20): saving notes as general rules is
how the drift happened.

## Lessons: celebrity clip reels [Track 1]

Worked, or worth more tries:
- Full screen 9:16, following the speaker's face. The viral original plays
  next to ours on the review page. [his words, 2026-11-20; history "Celebrity
  clip reels"] Scope: celebrity reels.
- Combining narration with other pictures or other interviews has "some
  inkling that they could be quite successful". [his words, 2026-11-21,
  round 2] He then asked for **real people on camera** saying the points
  ("clips of like TV anchors or whatever, saying the things you want to
  say"), in place of the AI narrator. [his words, R3-1]
- Idea, his "just an idea": show the research paper on screen when the
  reel names a finding (the abstinence violation effect). [his words, R3-4]
  It was "just a general idea": find about 20 things it points at that are
  not papers, then pick the few that work best. [his words, RS-T3]
- Most reels "somewhere in 45-85 sec", no fixed number. [his words, RS-Q2]
  Scope: celebrity reels.
- Openings and story lines: "find like 10 or 20 things to show me, and i
  pick the thing thats most catching, especially when it is the thing
  people see initially". [his words, RS-U7]
- "generally i will appear in a decent amount of our reels", for example
  the outro, "or i can appear in many ways"; probably not reacting. "we
  want to generally design a process where it is easy for me to appear".
  [his words, RS-Q6]

Did not work:
- Cuts that chop words off: "unwatchable". [his words, 2026-11-21] Cause:
  transcript word times end before the sound does. [measured] Fix in use:
  the cut check on the sound (`cutsafe.py`).
- Black bars or blurred bands, including black edges inside the picture
  (photos in a frame, VHS edges). [his words, 2026-11-20, R3-3, R3-4]
  The framed layout "seems more like a mistake". [his words, RS-U4]
  [measured] round 3 had black edges in all three versions; `barscheck.py`
  finds them.
- Short inserts between the interview: "so short and irrelevant", "weird
  and make no sense to a real watcher, like they could simply be longer, so
  we watch less of the original footage". [his words, R3-1, R3-4]
- One source name on screen the whole time. The name should come up for
  the source actually on screen ("it isnt cbs all the time"). [his words,
  R3-2]
- Round 2: every version shorter than the base; he never said no version
  may be longer. [his words, 2026-11-21, R3-5]
- A plain dark card with words: boring. Text goes over moving pictures of
  him. [his words, 2026-11-21]
- Versions that lost the story and became "something weird"; eight
  experiments when he wanted the one reel improved. [his words, 2026-11-21]
- A big source tag. Small, in a corner. [his words, 2026-11-21]
- Round 3 overall: "not very good attempts". [his words, R3-4]

Not judged yet: round 1's ten reels as reels to post; the kids episode
(B1–B3) and theme cast lists.

## Lessons: our own films [Track 2, Video 01, Finding the look]

Worked, or worth more tries:
- Claude's animations are "quite nice"; an idea bank of reusable worlds.
  [his words, 2026-11-18]
- The falling block tower (video 01) and the drawn street scene. [his
  words, 2026-11-19]
- The "Outvoted" blocks film: "definitely on the right path"; the blocks
  tell a whole story. The best style he has seen yet; he likes the more
  beautiful animations. [his words, 2026-11-20, 2026-11-21]
- The research summary on the ten ways page: "very good and useful". [his
  words, 2026-11-20]

Did not work:
- Question rounds on single items: too slow. Rough sketches and single
  options: too hard to decide from. [his words, 2026-11-18]
- Four moving options for one scene: too few, not specific enough, but
  they gave good ideas. [his words, 2026-11-18]
- A moving storyboard of near-stills: "a bunch of very simple animations".
  [his words, 2026-11-19]
- The "Outvoted" film: too slow, too much blocks only, breathing still
  audible. [his words, 2026-11-20]
- A page of sentence tables to cut: "almost impossible to understand". [his
  words, 2026-11-20]
- AI still paintings with a slow zoom: never again. [his words, 2026-11-21]
- The outperformer finder: probably the wrong direction; a channel uses one
  style on all its videos. Find the style he likes, and new work to copy or
  put our own spin on. [his words, 2026-11-21]
- Claude's own check of its night output ("came out well"), with nothing to
  compare against. [his words 2026-11-21 on the result; cause is Claude's
  reading; history "Why it went wrong"]

Not judged yet: the look finder page; three looks of the same ten seconds;
Outvoted v2 (`Plans/outvoted-animation-round.md`).

## Tools (facts)

Private folder `~/.cache/daygame-research/celeb-reels/code/`:
- `render4.py` (round 4) = `render3.py` plus a source name per picture,
  still pictures (the paper) and the black-edge check after every render.
- `render3.py` builds a reel from an edit list (`edl3/`). It refuses to
  render if a cut lands in speech (`cutsafe.py`, measured on the sound), and
  after rendering it checks every word near a cut was heard.
- `barscheck.py` lists every stretch with a black edge in a rendered reel;
  it exits with an error if there is one.
- Idea bank for our own films: `~/.cache/daygame-research/content/bank/`.
- GPU use log for night renders: `~/.cache/daygame-research/tools/gpu_log.sh`.
