# Reel "Outvoted": from a spoken take to a finished animation

Written 2026-11-19. Status: **proposed** (Claude's plan; nothing here is decided by the owner
until he says so). Phases 0 and 1 are done because he asked for them directly.

## In plain words

He spoke the script once, with a normal microphone, in a few minutes. The aim is a way of
working where that is all he has to do, and a finished reel comes out. This reel is the test.

The idea that makes it cheap: **one file, driven by his voice, that gets better in steps.**
The drawing is a web page that shows the right picture for every second of the recording.

1. First each scene is a still that barely moves. That is the storyboard he judges.
2. Then the scenes he approved get real motion, in the same file.
3. Then the same file is filmed frame by frame into the video.

Nothing is thrown away between steps, and a change of mind early costs minutes, not a render.

Where the steps come from: the order (script, voice, storyboard, moving storyboard,
animation) is the studio and AI-creator practice researched on 2026-11-18
(`docs/product/content_creation_process.md`). Nothing new was researched for this plan.
The one-file idea is Claude's own, untested until Phase 6.

Private working folder (not in this public repo): `~/.cache/daygame-research/content/reel-outvoted/`
(`audio/`, `storyboard/`). The script is R1 on the next-six page.

## What the recording gave us (Phase 0 result)

- Raw take 2:28. Cut 2:02: one retake removed, 29 pauses shortened, volume raised by about 22 dB.
- He changed the script while speaking: no "1 a.m.", added nicotine, added "Tomorrow I am
  perfection", a new ending (decide on the one thing, then "Comment QUIT").
- He left out "And for the first time, the guy in the morning said yes."
- Four lines are unclear or halting (listed on the storyboard page with a play button each).
- The cut was placed by measurement. Claude cannot listen, so he is the ear check.

Tools made, reusable for every later reel: `content/audio/asr_words.py` (words with times),
`content/audio/cut_take.py` (drops retakes listed in `drops.json`, caps pauses, levels the
volume, re-times every word).

## Blockers

| ID | What | Tried, and what came back | Blocks | Proposed |
|---|---|---|---|---|
| B1 | Claude cannot hear the cut | Three speech programs compared instead; they disagree on 4 lines | Phase 3 | He listens on the page and re-speaks the weak lines |
| B2 | Filming the page into a video | Filmed 2 seconds (60 frames, 1080x1920) of the storyboard and joined it with the cut sound: a valid video file came out. 0.8 s per frame on the busy machine, so the full reel is about 50 minutes | Nothing | Render once, at the end (Phase 6) |
| B3 | "Comment QUIT for my full guide": is there a guide to send? | Not checked; the quit tools on the site are still being finished (`Plans/quit-finish.md`) | Posting | Q4 |
| B4 | Posting to Instagram | Not tried. His account, his login | Phase 7 | He posts; Claude hands over the file, caption and cover |
| B5 | Machine is busy while he plays | Load was about 20 during this work; the large speech model was killed for being slow | Speed only | Small models on the processor; one build agent at a time |

## Open questions (each with Claude's pick, all proposed)

| # | Question | Pick | Other way | Cost if wrong |
|---|---|---|---|---|
| Q1 | Which world: bedroom ceiling (A), quest log (B), phone (C)? | A. It is where the story happens, and it is new | B ties it to video 01 and he likes game language | A second storyboard pass for the 19 scenes |
| Q2 | Re-speak the four weak lines? | Yes. About 30 seconds of speaking, each line twice | Keep the take as it is | The main line ("not weak … a plan nobody could live") lands soft |
| Q3 | Put back "for the first time, the guy in the morning said yes"? | Yes, when re-speaking. It pays off the two-guys idea | Leave it out; the picture shows YES anyway | A flatter turn at 1:36 |
| Q4 | What does a person get who comments QUIT? | Decide before posting. Until then the end card is a placeholder | End on the challenge with no ask, as the script had it | A promise with nothing behind it |
| Q5 | His face in this reel? | No. Voice only, which is the fast way of working he is testing | Corner circle from the main line on | Needs a filming session |
| Q6 | Words on screen while he speaks? | Yes, word by word, low on the frame (from memory, unchecked: most reels are watched muted) | No captions | Lost viewers with sound off |
| Q7 | He said "downvoting"; the hook text says "outvoted" | One word family. Say "voting down" in the re-speak, keep OUTVOTED on screen | Change the screen text to his word | Small |

## Phases

Model per phase, as he asked on 2026-11-18: thinking on the big model, building on Sonnet.

**Phase 0. Cut and clarity check. Done.** Big model.
Check: sentence times printed from the cut, retake gone, loudness about -17 LUFS.

**Phase 1. Moving storyboard page. Done:** https://claude.ai/artifact/ScW3FS1DDmmUA7gbtkyoZu (notes in its db `notes`, likes in `likes`; ids s01–s19, cl1–cl4, world-a/b/c, audio, general). Spec by the big model
(`storyboard/SPEC.md`, 19 scenes with the second each thing happens), built by one Sonnet agent.
The page plays his cut voice over the scenes, has a card per scene with 👍 and a note that saves
by itself, the four lines to re-speak, and the same three moments in two other worlds.
Check: every scene still looked at by Claude before publishing; phone width.

**Phase 2. His pass (about 10 minutes, his only job besides speaking).**
He plays it once, taps 👍 or writes a note per scene, picks a world, re-speaks the weak lines
into the same recorder. Gate: his notes are in.

**Phase 3. Lock the sound and the story.** Big model reads notes; Sonnet does the edits.
- Splice the re-spoken lines into the cut (`cut_take.py`), re-time all scenes from the new word times.
- Apply his notes to the scene table. Only changed scenes are redrawn.
- If he picked world B or C: redraw the 19 stills in that world first.
- Gate: he says the storyboard is right. Nothing is animated before this.

**Phase 4. Animate, five scenes at a time.** Sonnet builds; big model checks.
- Same engine (`stage.js`): each scene's still becomes real motion, timed to his words.
- After each batch the same page is republished, so he can look whenever he wants, but he does
  not have to. Claude checks 3 frames per scene against the table.
- No video file is rendered in this phase.

**Phase 5. Rough cut.** The page now plays the whole reel live. He notes times that feel off.
Captions (Q6) are added here. Gate: he says "render it".

**Phase 6. Final render.** Sonnet runs it, big model checks.
- Film the page frame by frame at 1080x1920, 30 frames a second, join with the cut sound.
- Checks: frame count equals length x 30; picture and word line up at five spots; loudness
  about -14 LUFS; watched on the phone emulator.
- Also saved as the YouTube Shorts file (same picture).

**Phase 7. Post and learn.** He posts (B4). His notes from this reel become lines in
`content_creation_process.md`; the ceiling world goes into the idea bank for later reels.

## What this run should prove about the process

- His time: one take (a few minutes), one pass over the storyboard, 30 seconds of re-speaking.
- Claude's cost per stage, written here as each stage ends: 
  - Phase 0 (cut): about 15 minutes, mostly waiting for speech programs on a busy machine.
  - Phase 1 (storyboard): one Sonnet agent, 17 minutes, about 150,000 tokens, plus the spec and check.
- Whether stills that barely move are enough for him to judge (he found sketches and single
  options too hard on video 01).
