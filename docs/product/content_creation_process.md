# Content creation process

How we make a video, step by step. Read `docs/product/content_creation.md`
first: it has what is going on now, the personas and the viewer.

**Status (owner, 2026-11-18): not decided.** This is maybe 40% of the final
process. The steps below are Claude's proposal, tested on video 01 and
changed as we learn. Before changing the process, research what people do
now (rule in `CLAUDE.md`).

## The owner's words

2026-11-18:
- Claude can make quite nice animations.
- Rounds where Claude has to guess the single most valuable thing to add or
  remove are not efficient.
- More handholding: he sees frames of what Claude intends to make before
  Claude spends hours making it.
- With all of the script, or more of it, Claude can make better animations.
- Early on, much more variance. A bunch of quite different ideas, because
  something completely different could be the ideal; plus close cousins of
  what he already likes, as iterations.
- He prefers Claude to animate, rather than him doing things physically. He
  records himself speaking, and that goes into the video.
- From a rough sketch, or a single option, it is too hard for him to decide.
  He needs more to vote on and choose from, and each choice must be clearer.
- Maybe Claude storyboards more, he approves some or several scenes, and
  Claude creates those.
- A few different animation styles in one video may work.
- After the scene 1 test (4 moving options): still not there. Too few
  choices, and each choice was not specific enough. Judging is still hard.
  What does work: the rounds produce good ideas that may be usable in
  general, beyond this video.
- He likes the idea bank: every visual world we build becomes a reusable
  piece. He likes testing out different processes.

## Idea bank

Private folder `~/.cache/daygame-research/content/bank/`: one reusable
animation per visual world (calendar, quest log, blocks, moving words, …),
each with a second-by-second description. Later videos pick from it.

## What others do (researched 2026-11-18)

Animation studios:
- Order: script, storyboard, then 2 to 4 style frames (finished stills of
  key scenes that lock the look), then an animatic (the frames timed to the
  voice), then animation.
- The client signs off each stage before the next starts.
- Style options are shown as the same scene side by side, so only the style
  differs. The client picks one of 2 or 3 directions.
- Sources: [Milanote](https://www.milanote.com/guide/motion-design-style-frames),
  [Blue Carrot](https://bluecarrot.io/blog/essential-animation-process-steps-and-timeline/),
  [Advids](https://advids.co/insights/understanding-the-process-storyboards-vsstyle-frames-vsanimatics-and-what-to-expect).

Creators working with AI (2026 posts and 15 YouTube videos):
- The script is approved before anything is designed.
- The voice is recorded first, and scenes are timed to it.
- They want a storyboard or contact sheet before the build.
- The human judges the stills; the AI makes the changes.
- Every note becomes a rule in a file, so a mistake happens only once.
- Only 1 of 15 claims one prompt with no review.
- Sources: [Hack](https://coachlindsayhack.substack.com/p/i-made-my-first-explainer-video-in),
  [Crist](https://michaelcrist.substack.com/p/make-ai-videos-with-claude),
  [Tyson](https://theagentarchitect.substack.com/p/claude-code-remotion-video-rendering),
  [anima](https://github.com/seanwinslow28/anima),
  [Peverelli](https://youtu.be/HzXD4GVqXwM),
  [Abdaal](https://youtu.be/C0jOKDJtK9s),
  [Flick](https://youtu.be/zakFNEOPq0M).
- Fuller notes (private): `~/.cache/daygame-research/content/process-research/youtube.md`.

## Tried on video 01

- **Question rounds on single items:** too slow (owner).
- **A 3D render before he saw any frame:** 54 minutes of rendering, and a
  change of idea throws it away.
- **Seven still frames of one idea:** useful, but only one option.
- **Rough sketches, 8 ideas x 3 frames:** he liked two (calendar, quest
  log), but sketches are hard to judge.
- **4 moving options for one scene, in the finished look:** too few, and not
  specific enough. But it gave good ideas.

- **Whole film built before he saw anything (reel "Outvoted"):** a finished
  film, but the visual side is still hard for him to gauge, and it takes too
  many rounds (owner, 2026-11-20).
- **A page of script cuts and picture spots (second pass):** almost
  impossible for him to understand (owner, 2026-11-20).

## Ten ways to build, he picks one (2026-11-20)

His idea: Claude lists ten different ways to build the visuals, he picks
one, we build a reel that way and learn from the result. The page with the
ten ways is listed in `notes-seen.md`; read his pick there. Claude's proposed
first pick is "copy one finished reel he likes".

What the fresh research says (transcripts read, videos not watched; most
makers sell a tool):
- 6 of 7 code-animation videos hand the AI a finished reference video. Some
  have helpers measure it frame by frame into a rule sheet.
- Nobody claims one round. Counts given: about 3, 5 to 6, and 20.
- One builds 20 finished seconds first, then the rest.
- AI video makers: cheap drafts first, full quality only for kept takes.
  Stated costs: about $40 for 44 s (seller) and $185 for 86 s (creator).
- Private notes: `~/.cache/daygame-research/content/process-research/2026-11-20-*.md`.

## Proposed next version (Claude, proposed, not decided)

1. **Script.** Approved on one page.
2. **Voice.** He records it. Claude cuts it at the pauses and times scenes
   to it.
3. **Scene list.** The script cut into scenes of 5 to 8 seconds. Each scene
   says what the viewer must understand.
4. **Choices per scene.** 3 or 4 options per scene, in the finished look
   (not sketches): moving where motion carries the point, side by side. He
   votes per scene. Styles may differ between scenes.
5. **Build.** Claude builds the chosen scenes, each as a low-quality preview
   first.
6. **Rough cut.** All scenes timed to his voice, in one video on a page.
7. **Final.** One full render. His notes become rules for the next video.

Open questions:
- How many options per scene can he judge?
- What does one option cost to make?
- Does he need motion to judge, or are stills enough?
