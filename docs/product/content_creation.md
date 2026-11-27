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
- Round 13 page "Reel B Round 13" (2026-11-26, waits for his look) acts on his
  Round 12 notes (R13-1..3): his pick P2 ("Faster is better"), band music yes,
  Instagram's own music for posting "Sounds good". New: each song starts on a
  strong beat as each man starts; music rises in the pauses; Hetfield's song is
  Enter Sandman; a short band-video shot of each man (none of Sixx: no clear
  face). One vote: A = 0.7 s riff break before each man (1:08), B = none (1:06).
  Five cuts flagged for his ear. Files: `celeb-reels/code/*13.py`, `out13/`.
- Earlier: outro music "does not really add anything, i think. I think it could
  in some scenarios"; he wants to see 10 real videos that use it (R11-2).
- Music M2-M5 are Kevin MacLeod, CC BY 4.0: the post needs a credit line.
- Folder: `~/.cache/daygame-research/celeb-reels/`.

**Track 1, new format: a celebrity talks, we show something else** (his, 2026-11-26,
from a quit coach's reel at 200x that coach's usual views): "We steal [a famous comedian]
speaking, and we make an entirely different video. We steal the format too, of a
celeb talking about something, and us showing something different over it." In the
pipeline after Reel B; nothing built. Which reel: `~/research/competitors/README.md`.

**Track 2, Outvoted** (now about 1:07, the blocks film)
- Round 4 page "Outvoted Round 4" (2026-11-27, waits for his look) acts on OR3-1..3:
  script v5 (301 to 209 words, old line vs new line, `reel-outvoted/script-v5/`),
  O4 blocks sink out of the dark with no strings (b11s X1; a physically right string
  needs ~3 s per block), STILL VAPING: four looks, pick = room dark + beam + push-in
  (b11v), whole reel re-timed to a placeholder voice (b11t, two fresh-review rounds).
- Open for him: script approval, then he records voice + video (pause ~0.5 s after
  "Still vaping."); face circle covers NO WOMEN at 40-46 s; stronger vaping push.
- His real take re-times in one command: `trunk-n24/b11t/retime.sh` (see its REPORT.md).
- Folder: `~/.cache/daygame-research/content/reel-outvoted/film/trunk-n24/`
  (TRUNK.md, then b11t/REPORT.md and REVIEW.md).

**Track 2, Same Night** (reel R7: why beliefs decide how quitting feels)
- He records the voice himself, "a little faster" (C2).
- Round 3 page "Same Night Round 3" (2026-11-26, waits for his look) acts on
  NR2-4/5: four beliefs per addiction (his general one plus three specific);
  porn beliefs researched anew (lonely, can't sleep without it, every guy does
  it; research in `~/research/content/porn-beliefs-2026-11-26.md`); weed's second
  belief replaced. The "current vs new" labels are gone; three ways to make the
  new belief pop (A arrow, B strike-through + underline, Claude's pick, C marker).
  Length question: a new belief for all 16 is about 65 s; a new belief for the 4
  general ones only is about 50 s (Claude's pick). Script `reel-beliefs/script-v3/`.
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
