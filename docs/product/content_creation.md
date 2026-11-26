# Content creation: what is going on now

Read this first for any content work, then `docs/product/content_creation_process.md`
(how we make it). This file holds only what is true now: edit a line when it
changes, delete it when it is done. His notes go word for word into
`~/research/content/notes-history.md` (private).

**(Claude)** Content design starts from the content research master file, `~/research/content-experts/00-master.md` (private, outside the repo). Read its top tips and contradictions before designing a piece, and name the tips the piece uses.

## First step, every content session

Read the new notes and 👍 on the live pages listed in
`~/.cache/daygame-research/content/video-01/notes-seen.md`. Act on them, mark them
read there, and copy his notes into his notes file. He should never have to say
"I left notes" (2026-11-18). When a page is replaced, delete its line.

## Tracks

His (2026-11-22): what each track is for, and the shares of Tracks 1 and 4.
Claude's: the track names and "the rest" for Track 2.

| Track | What | Share of posts |
|---|---|---|
| 1. Celebrity reels | Real celebrity quit clips, re-cut and made ours: entertainment that draws people in | 10-20% |
| 2. Our own films | Animated reels with his story and core ideas | the rest |
| 3. Text reels | Short, mostly text; also pictures and carousels | not set |
| 4. Selling | Reels that sell his coaching | 2-10% at most |

Until the quit tools are finished, don't point posts at them: "my tools are not
really finished, so lets not point it to anything right now, but i should try to
finish them today because potentially it really should point to it" (2026-11-23).

## Now

Focus: get **one finished piece out** (2026-11-22).

**Track 1, Reel B** (five superstars who quit drinking or drugs)
- Round 12 page "Reel B Round 12" (2026-11-26) acts on his Reel B Final notes
  (R12-1..3, now in his notes file): every cut re-checked on the sound (0:15 was one
  word running into the next); pauses over 0.3 s cut out (P1 1:10, P2
  1:06 with two lines dropped); each man's band intro under him, piano for
  the last man. Votes: pace P1/P2, band music yes/no. Copyright answered on the page:
  band songs are in the review draft only; for posting they go in through
  Instagram's own music ("Add to mix"), which is licensed.
- Earlier: outro music "does not really add anything, i think. I think it could
  in some scenarios"; he wants to see 10 real videos that use it (R11-2).
- Music M2-M5 are Kevin MacLeod, CC BY 4.0: the post needs a credit line.
- Folder: `~/.cache/daygame-research/celeb-reels/`.

**Track 1, new format: a celebrity talks, we show something else** (his, 2026-11-26,
from a quit coach's reel at 200x that coach's usual views): "We steal [a famous comedian]
speaking, and we make an entirely different video. We steal the format too, of a
celeb talking about something, and us showing something different over it." In the
pipeline after Reel B; nothing built. Which reel: `~/research/competitors/README.md`.

**Track 2, Outvoted** (about 1:40, the blocks film)
- Round 2 built (2026-11-26, page "Night Reels Round 2", waits for his look):
  quest scroll kept plus an alarm clock on the table; 0:23 swap gone (hanging
  blocks continue from the opening, strings simulated; fallback B re-cuts old
  clips); the final block reads YOUR ONE THING, not weed; full reel
  `trunk-n24/b9/out/Outvoted-best3.mp4`. His filmed end line goes after the clip.
- A way to judge how long things stay on screen (his ask): `trunk-n24/b9/DWELL.md`
  and `dwell_check.py` (Claude, proposed, partly judgement).
- Still open: hands through the blankets in the bed scene; the three tower
  landings at 34.9-36.3 s ("dunk dunk dunk" risk; only the new voice moves them).
- Next: he records the voice (page "Outvoted Voice Script", take 9 "on screen"
  line is now out of date) and the end line again "with video too".
- Folder: `~/.cache/daygame-research/content/reel-outvoted/film/trunk-n24/`
  (start with TRUNK.md).

**Track 2, Same Night** (reel R7: why beliefs decide how quitting feels)
- He records the voice himself, "a little faster" (C2).
- 25 beliefs page done; he 👍 15 (page "25 Beliefs for Same Night"). His new idea:
  four addictions (nicotine, porn, weed, alcohol) with the same number of
  general and specific beliefs each, shown faster. Claude's proposal (12 beliefs,
  about 44 s): `reel-beliefs/script-v2/PROPOSAL.md`; waits for his answers on the
  page "Night Reels Round 2". Porn has no liked line yet.
- "Belief" pops on the page (clip built with a placeholder circle for his face,
  no captions): `reel-beliefs/best2/`. The page text is still the old five
  lines; rebuilt after his pattern pick. "So I tested it" is unanswered.
- The site has 12 lies for nicotine only (weed 4, porn 5, alcohol 5), so the
  script must not say "twelve for each".
- Folder: `~/.cache/daygame-research/content/reel-beliefs/`.

**Track 3, text reels.** Finding about 15 text-first Instagram accounts to learn
from: `Plans/track3-creator-list.md` (Claude's proposal, waits for his answers).
Reading works through his free Apify account. Posting through Meta's route is
blocked (2026-11-23). His verdict on the first try: "Your text reel work is not
usable, because your method was looking at 1 second of youtube video".
Next Track 3 piece: copy competitor #1's tier-list reel (one still picture, 1.1M views
on a 308-follower account, A/B tested by them). His: "We should definitely try to
imitate this one very soon, the view to follower count is crazy"; idea "top reasons
why youre GOONMAXXING". Nothing built. Breakdown: `~/research/competitors/restart.md`.
Daily Instagram tracker (free, 46 accounts): page "Instagram Tracker". His ask for the
next version: likes and comments against the account's average, views per follower,
and the KPIs the content experts use (outliers 3x+ usual, followers gained per view,
cover image for DM shares; shares, saves and watch time are not public).
Viral quit reels (his ask "more of the super viral reels"): page "Viral Quit Reels", 14
reels from a search of 172 (300K+ views, all addictions), grouped by format: tiny
quit-app accounts, celebrity clip with a picture on top, one-shot jokes, short lists
on a plain video, explained with a drawing, a man in his car with a free tool. Data
and videos: `~/.cache/daygame-research/quit-reels/viral/` (rank.py, page/build.py).
Main dashboard: page "Reels Dashboard" (expert KPIs plus his: times usual, views per
follower, likes and comments against usual, like rate, shares; competitors; posting
pace). Updated by hand for now; builder `~/.cache/daygame-research/quit-reels/dashboard/`
(data.py, select.py, build.py). Daily self-update waits for his 👍.
How much to post (Claude's proposal, from the data): 21 reels a week. About 15% of
niche reels beat their account's usual by 3x, so 21 a week gives about 3 outliers.
His idea (2026-11-26), from a competitor quit app's 1.1M-view tier-list reel (one still
picture, A/B tested by them): "we could make one similar \"top reasons why youre
GOONMAXXING\"". Breakdown: `~/research/competitors/` (private) and page "Competitor Deep-Dive".

**Track 4, selling: nothing made.** His idea: a bar chart of quit success rates
with "my coaching" on top and a money-back line, e.g. "quit your addiction 100%
easily, or get your money back". He will give the offer; what "my coaching" is
and costs is his. His view: competitors don't show their basis, so why should we.
Claude's flag, unchecked: a bare "100% success" claim may break advertising
rules. His call. Also his (2026-11-20): study one competitor's sales funnel and
copy it to some degree (Claude's record; notes file, "Quit Top Contenders").

**Competitors to beat** (his picks, 2026-11-26): #1 a quit-porn app, #2 a porn-quit
creator, #3 a men's identity coach whose website tools he tried ("there's something
real in the way this guy approaches it"). His rule: post at least as many videos a
week as they do, in better quality. Files and the weekly post count:
`~/research/competitors/` (private).

**Video 01, "The one thing"**: script v4 "decently approved" (2026-11-19), not
touched since. File: `~/.cache/daygame-research/content/video-01-one-thing.md`.

## Where things are

- His notes, word for word: `~/research/content/notes-history.md`.
- Approved scripts: `~/.cache/daygame-research/content/approved/`.
- Name and look: `docs/product/look.md`. Anything published says 10K Days Club.
