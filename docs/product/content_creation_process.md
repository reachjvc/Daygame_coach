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

2026-11-19:
- Looking at something before it is finished may not work for him.
- He wants a full animation: "graphically looking awesome is the goal, super
  coherent, rather than a bunch of screens that change."
- He liked the falling block tower of video 01 and the drawn street scene.
- Count the tokens, but quality first: "use as many as necessary".
- Breathing in the voice is annoying. Cut it out, or he needs another way to
  record.

2026-11-20, after watching the finished "Outvoted" film:
- Definitely on the right path. He likes much of the animation; the blocks
  tell a whole story.
- The pace is still too slow.
- He wants a way to check that every word he says is worthwhile.
- He wants more animation: the story sticks to the blocks too much. Lines
  like "at night" and "in the morning" are obvious places for a different
  kind of picture. The blocks can stay the main line.
- He should film himself, and that goes into the video (maybe him waking
  up). This needs a process that storyboards the choice, and more
  animations for the other spots.
- He still hears a good amount of his breathing. He wants it gone if that is
  possible, and expects to test different ways of doing it.

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

- **Reel "Outvoted" (2026-11-19): voice first, then a moving storyboard.** He
  spoke the script once; Claude cut it by measurement and drew every scene as
  a near-still timed to his words, played with the sound on one page. He
  turned it down: "a bunch of very simple animations", not something he can
  judge. Plan: `Plans/reel-outvoted.md`.
- **Reel "Outvoted", second way (2026-11-19): the whole film, then he looks.**
  One planned story in the block look, built in full, checked by Claude on
  stills and a small draft, rendered once. Tokens counted per stage in the
  plan. Result not judged by him yet.

- **Second pass on "Outvoted" (2026-11-20), measured, nothing rebuilt yet.**
  154 words a minute overall; 30 of 117 seconds are pauses; he speaks at
  about 207 words a minute between them. 174 top quit Shorts from our own
  study: median 194 words a minute (rough, from auto captions). Five fresh
  AI readers marked each sentence keep, shorter or cut: all five cut the
  same five lines. The page with the results and seven proposed cutaway
  spots is listed in notes-seen.md. Working files:
  `~/.cache/daygame-research/content/reel-outvoted/wordcheck/` and `pass2/`.

## What others do about pace, pictures and breaths (researched 2026-11-20)

Mostly blogs by companies that sell editing tools; none shows a controlled
test. Full notes (private):
`~/.cache/daygame-research/content/process-research/2026-11-20-*.md`.

- Line tests: cut a line unless it raises curiosity, makes the stakes clear,
  gives value or sets up the next beat; merge lines that do the same job.
- Pauses: editors close natural gaps to 0.1 to 0.4 seconds and keep a few
  chosen beats.
- Pictures: one row per spoken line with its picture; change the picture
  when the line's job changes; cutaways of 2 to 5 seconds in Reels; the face
  for personal lines and for the ask (one seller's test).
- After posting: lay the retention graph over the lines; a drop names the
  line before it.
- Not found: proof that reader panels predict viewers; an example of one
  animated world cutting to footage of its maker and back.

## Ten ways to build, he picks one (2026-11-20, later)

The owner on the second pass: the visual side is still very hard for him to
gauge, the page about which sentences to cut was almost impossible to
understand, and this many rounds cannot be the long-term way. His idea:
Claude lists ten different ways to build the visuals, he picks one, we build
a reel that way and learn from the result. The page with the ten ways is
listed in `notes-seen.md`; read his pick there. Claude's proposed first pick
is "copy one finished reel he likes".

What the fresh research says (transcripts read, videos not watched; most
makers sell a tool):
- 6 of 7 code-animation videos hand the AI a finished reference video. Some
  have helpers measure it frame by frame into a rule sheet.
- Nobody claims one round. Counts given: about 3, 5 to 6, and 20.
- One builds 20 finished seconds first, then the rest.
- AI video makers: cheap drafts first, full quality only for kept takes.
  Stated costs: about $40 for 44 s (seller) and $185 for 86 s (creator).
- Private notes: `process-research/2026-11-20-code-motion.md`,
  `-formats.md`, `-ai-generators.md` (same private folder as above).

## Proposed next version (Claude, proposed 2026-11-20, not decided)

1. **Script, then a sentence check before he records.** Five fresh readers
   plus Claude's own call. He sees only the lines in doubt.
2. **Voice.** He records. Claude cuts the take, closes the pauses by
   measurement and removes breaths (method under test).
3. **Picture plan.** One row per line: blocks, other animation, or him on
   camera. He taps the spots he wants.
4. **His filming list** comes out of the plan. He films the clips in the
   same sitting as the voice.
5. **Build and one full render.** He sees the finished film (his choice of
   2026-11-19).
6. **After posting.** The retention graph is laid over the sentences and
   feeds the next sentence check.

Open questions:
- Does a reader panel find the same dead lines he hears?
- Do filmed clips of him sit well inside the block world? Test on one spot.
- Which breath method leaves none he can hear?
