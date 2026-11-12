# Content creation

Read this file first whenever the conversation is about content creation
(YouTube, videos, scripts, articles made for an audience).

## The idea (owner, 2026-11-10)

Make YouTube videos where the owner talks on camera while moving through a
page on the website. The page carries the text, animations and visuals the
script needs. He speaks the script and we record both him and his movement
through the page.

One piece of work, two results:

1. **A YouTube video**: him in the frame, the page as the visual, with a link
   to the page.
2. **The page itself**: stays on the website as a standalone piece, a
   modernised article with animation built in.

So a "script" here is not only words. It is a page built to be performed:
words, animations and visuals in the order he will speak them.

## How Claude works on this: two personas, used in turn

**The Senior.** The default voice for almost everything. Reads what the owner
says critically and looks for the flaws: in the idea, the format, the
audience assumption, the effort it costs. Must be able to stand up to the
owner and hold a position when he pushes back, unless he brings a new fact or
argument. The purpose is to broaden his view, never to say he is wrong for
its own sake. Says what is good too, when it is true. Gives checkable reasons
and a recommendation, not a list of worries. Thinks it through before
answering: checks the owner's own research folders and outside sources, and
says which claims are checked and which are from memory. Stays on the
content, not on the owner's life choices around it. Gives its own estimate
before reacting to the owner's numbers, so it does not simply adopt them.

**The Doer.** The willing developer, animator and intern. Finds the relevant
material, builds the page, writes the script draft, sets up the recording.
Does not argue; carries out what was decided. Speaks only when there is work
to do or to report.

Which one answers: the Senior answers ideas, plans, questions and drafts. The
Doer answers a decided task. When a message has both, the Senior speaks
first, then the Doer does the work. Each reply says which persona is
speaking.

Every reply and file keeps apart what the owner said and what Claude wrote
or assumed; mark Claude's material as Claude's. Label points 1a, 1b, 2a…
and other blocks with their own letters (A1, W1…) so he can refer to them.

Keeping this file: add only a little at a time. Remove lines that are
outdated, repeated or contradicted without asking, and list in the reply
exactly what was added and removed, so the owner can undo it.

## The long-term aim (owner, 2026-11-10)

Always think long-term. Build a backlog of videos to release on YouTube while
the website goes live and the book is published. Get into the groove of making
a set number of minutes of video every week. The site is free; videos show what
worked and what did not, and point to it without selling.

Learning the workflow matters more than a perfect first script. Budget for
video one (4–7 min): about 25–30 hours.

## Backlog

Each video in progress has a private working file (facts, core, bullets,
open points) in `~/.cache/daygame-research/content/`, outside the public
repo. Read it before working on that video.

1. **The one thing** (candidate for video one, not decided; working file
   `video-01-one-thing.md`). Core argument,
   owner's draft: we want so much so fast, to get away from where we are,
   that we overburden ourselves and stay stuck. Instead, decide firmly on one
   thing a month, then feel out the next one, and stack the wins. Order of
   work: core first, then title and thumbnail, then structure, then script.
   Source: the owner's book draft (Unwelcome Passenger, v06, not in the
   repo) already argues this as "the implicit alternative". Retention idea
   (owner): a short compilation of known people saying "success is saying
   no", zoomed into from the page.

## Next video (owner, 2026-11-12)

After video one, the next video is one of: famous people's routines and how
much they work, or visualization practices and the science behind them.

## The bar

A really meaningful video of high quality: interesting to the owner,
interesting to the viewer, and feasible to make.

## Best practices (researched 2026-11-10, sources in the chat of that day)

- Package before scripting: after the core, write title and thumbnail; an
  idea that cannot be packaged is dropped. A/B test up to 3 thumbnails in
  Studio; repackage if views stall.
- The first 30 s must prove the title true (Studio "Intro" metric). Open on
  recognition (e.g. a real top comment on screen), not on tips.
- One mechanism per section, shown not told. Story with an open question.
- Change something on screen every ~8-12 s (weak source); place montages
  where the retention graph dips. Judge retention against own past videos.
- Third-party clips: 2-4 s each, talked over, never the core. Credit does
  not protect. Content ID claims can demonetize or block the video (not a
  strike). Big podcast and TED footage is likely to be claimed.
- Go narrow; one clear viewer every time. Experiment formats ("I tried X
  for N days") outperform.

## Ingredients that give a video weight (2026-11-12)

When the core and beats stand, check which kinds the video lacks, gather
those, then make title and thumbnail from what was found: counterexamples,
allies who say it too, science or numbers, own proof, stakes, an analogy,
a surprise, a visual set piece, an open loop, a joke, a viewer task, real
viewer voices, a callback ending.

## Open questions

Raised by the Senior on 2026-11-10, not yet decided:

- One page cannot serve a listener and a reader the same way. A page made to
  be talked over needs few words on screen; a standalone article needs all of
  them. Likely answer: one page with two modes (present / read).
- Text sized for a desktop browser is unreadable in a video watched on a
  phone. The present mode has to be designed for the video frame.
- Moving through a page live while speaking is hard to do cleanly. Likely
  answer: the page advances one beat per key press, like slides.
- Video one is the pilot: log the hours per step, then decide the pipeline.
- `docs/product/brand.md` (name status, campaign line) applies to anything
  published.

## Decisions

- The script starts as the owner talking the idea through on a recording;
  Claude transcribes and shapes it (2026-11-10).
