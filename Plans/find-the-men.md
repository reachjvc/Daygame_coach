# Find the men: where to reach men who want to quit nicotine, then a morning list

Written 2026-11-18. Status: **Phase 0 done 2026-11-18 (scorecard: https://claude.ai/artifact/5SqYSv3Kup5SMvDQj5RRWn); Phase 1 running (queue: https://claude.ai/artifact/49KLP6bzdETbvS4q8pPKLj).** Part of `Plans/first-1000.md`. It replaces
that plan's "comment on 10 niche posts" task.

## In plain words

The goal is not followers or comments. The goal is **conversations with men who want to quit nicotine**.
The first try (follow creator accounts, comment on their posts) aimed at a stand-in. A check on Instagram
itself found almost no English quit-nicotine creators above 5,000 followers, and comments on giant accounts
sink. So this plan finds **the men themselves**: places where, today, a man wrote "I want to quit", "day 2 off
Zyn" or "relapsed again".

It runs in this order, and nothing gets built before the step before it has proven itself:

1. **Map every channel** (Phase 0). For each one: how many fresh quit posts a day, whether it can be read
   without his login, its rules on self-promotion, and how visible a reply is. Instagram gets its own deep
   look, because he believes there's something there.
2. **Test by hand for 3 days** (Phase 1). Each morning a cheaper model (Sonnet) finds 10 places and drafts
   2–3 replies for each. He picks, posts, and logs what comes back. A channel is only kept if replies come back.
3. **Automate the morning list** (Phase 2). Only for the channels that passed. The list is ready each morning,
   with a ping to his phone. His part stays choosing the words, about 15 minutes.
4. **Keep the daily task page current** (Phase 3, and a standing rule).

## What is already known (probes run 2026-11-18)

| Channel | Readable? | Volume / note |
|---|---|---|
| Reddit r/QuitVaping, r/stopsmoking | **Yes**, via the arctic-shift archive API (near real time: newest post 30 min old) | 19 and 27 new posts in the last 24 h. reddit.com's own JSON returned **403** from this machine |
| Reddit r/QuitZyn | Readable | **0** posts in 24 h. The name may be wrong, or the forum may be dead. Phase 0 finds the real pouch/snus forums |
| Instagram profiles, captions, like/comment counts | **Yes**, logged out | Example: a quit Reel with 2,202 likes and 73 comments. Comment **text** is behind the login wall |
| Instagram comments | **No**, not logged out | Reading them needs a logged-in session (owner question Q1) |
| TikTok comments (yt-dlp) | **No**: 0 returned | Captions and metadata only |
| YouTube Shorts comments (yt-dlp) | **Yes**: 11 read from a sample Short | Newest first is possible |
| Phone ping | Possible: the session tool `PushNotification`, the app's own web push, or a scheduled routine. To be tested | — |

## OWNER-ONLY: answer once, at the start of Phase 0 — ANSWERED 2026-11-18

Q1 yes, read-only. Q2 yes, Reddit account today. Q3 "online in a chat, but free": a claude.ai routine that
posts in a chat with a phone push, the same shape as his existing reminder routine.

| # | Question | Recommendation |
|---|---|---|
| Q1 | May a browser that Claude runs be logged in to the quit Instagram account (you log in yourself, password never seen) **to READ** comment sections and search? It never follows, likes, posts or DMs unless you say so later. | **Yes, read-only**, but only if Phase 0 shows that Instagram comment sections are where the men are. Reading carries far less risk than acting. |
| Q2 | Make a Reddit account for replies (about 5 min). Many quit forums hide comments from brand-new accounts, and none allow links or self-promotion. | **Yes, today.** Its age starts counting now. Use it for genuine replies only, never links. |
| Q3 | Where should the morning ping arrive? | **Your phone**, by the simplest route Phase 2 proves works. No paid service. |

Nothing in this plan costs money. Scheduled runs use the Claude plan he already has. If a step seems to need
a paid service or an API key, it stops and says so.

## BLOCKERS (each tried once, 2026-11-18)

| ID | What | Attempted, and what it returned | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | reddit.com JSON blocked | `curl …/r/QuitVaping/new.json` → 403 for 4 forums | — | Use arctic-shift (works) |
| B2 | Instagram comments need a login | Playwright, logged out, on a Reel: caption and "73 comments" count shown, text behind the login wall | Instagram scanning | Q1 yes. 2026-11-18: no VNC and no sudo here, so a login page streams a headless browser to http://localhost:7801; a GET-only reader (`ig-rig/ig-read.mjs`, 250 calls/day cap) uses the saved login. Waiting for his login |
| B3 | TikTok comments | `yt-dlp --write-comments` on a 1.4M-view video → 0 comments | TikTok scanning | 2026-11-18: `tiktok.com/api/comment/list/?aweme_id=…` works logged out, but no search and no newest-first. Not measured; dropped for now |
| B4 | Morning automation | Not tried yet: routines (`RemoteTrigger`), local timer, app web push. Each needs a dry run | Phase 2 | Phase 2 tries them in that order. 2026-11-18: his existing claude.ai reminder routine posts in a chat with `notifications.push`; copy that shape (Q3). Dry run 1 (trig_01WmBP…): ArtifactData write+read **works**, PushNotification **works**, network **blocked** (`connect_rejected` for arctic-shift and reddit.com). Dry run 2: WebFetch also blocked; the Default environment is `limited` with `allowed_hosts: []`. Adding the host needs his approval in a run he starts (unattended run refused, nothing changed): daily-page task `cloudok`. Phase 2 routine trig_01MtPKqmwY8eUwt1vRRDMRLr runs 07:07 daily in dry-run mode (writes `cloudtest/<date>`, no push) so it has 3 mornings of proof by the Phase 1 gate |
| B5 | Forum quotes are health disclosures and the repo is public | Memory "repo is public" | All phases | Queue content lives only in the artifact database and in `~/.cache/daygame-research/find-the-men/`. Never in git |
| B6 | New Reddit accounts are often hidden by AutoModerator (karma/age) | Not measurable without posting | Phase 1 | Each posted comment is looked up in the archive: missing or `[removed]` = hidden. Then slow down and keep to the friendliest forum until the account has karma |

## PHASES

### Phase 0: channel map and the Instagram question (1 session, Sonnet agents)

Agents (`model: "sonnet"`), run in parallel:
- **A. Forums:** Reddit (nicotine, vaping, snus, pouch and quit-smoking forums, including Scandinavian ones),
  Facebook groups (public only), quit-app communities, Discord. Per channel: fresh "I want to quit / day N /
  relapsed" posts per day (counted over 7 days, not guessed), how to read it, its rules on links and promotion,
  limits on new accounts, how visible a reply is, the risk.
- **B. Instagram, in depth:** which moves reach men who want to quit. Comment sections under viral nicotine
  and pouch Reels (ZYN/VELO/snus content), keyword search, hashtags, replying in a Reel to a stranger's
  comment, collabs with small quit creators, story replies, DMs to people who said they want to quit (cold DM
  risk). Per move: proof it reaches the right man, what it needs (login or not), the risk, and an estimate per
  10 actions. Use logged-out reads only. If a move can only be judged logged in, write that down and leave it.
- **C. YouTube and TikTok:** fresh comments on quit and nicotine Shorts where men say they want to quit.
  Volume per day, readable route, reply visibility.

Opus then checks 5 rows from each agent against the source itself, and writes a scorecard to
`~/.cache/daygame-research/find-the-men/channels.md`. Score = fresh posts/day × reply visibility × fit ÷ risk.

**Done when:** one short page (artifact with a notes box) shows the top 3 channels with their numbers and
the answer to Q1–Q3. **Gate:** no building before the owner has seen it. Recommendations count as accepted
unless he flags one (memory "no marking everything").

**Result (2026-11-18).** Counted over 7 days (11–18 Nov) from the arctic-shift archive; Opus re-pulled 5 forums and
the totals matched the agent's within 1 post. Score = intent posts/day × visibility × fit ÷ risk.

| # | Channel | Intent posts/day (strict, broad) | First reply (median) | Score |
|---|---|---|---|---|
| 1 | r/stopsmoking | 23.0, 29.3 | 0.5 h | 12.9 |
| 2 | r/QuitVaping | 16.1, 19.9 | 0.8 h | 10.9 |
| 3 | r/QuittingZyn | 11.4, 14.4 | 0.9 h | 9.7 |
| 4 | r/QuitSmokingJourney | 8.7, 13.6 | 75% never answered, 643 members | 2.4 |
| 5 | YouTube comments (21 quit videos) | 1.6 | 66% unanswered (1 video) | 0.6 |

Not measured: Instagram (comments, tags and search need a login; login page built, waiting for his login),
TikTok (comments readable logged out via `api/comment/list`, but no search), Facebook, Discord, quit apps.
Dead or no quit posts: r/QuitZyn, r/Zyn (closed), r/Snus, r/Vaping, r/NicotinePouch, r/DippingTobacco.
Full table and method: `~/.cache/daygame-research/find-the-men/channels.md`.

### Phase 1: three-day hand test (depends on 0)

- Each morning, a Sonnet agent fills the **comment queue**: 10 items from the top channels, posted in the last
  24 h. Each item has a link, what the man said (one line), and 3 replies (an experience, a question, a tip) in
  the owner's voice, with [brackets] for facts only he knows. No links, no pitch, no "check my page".
- The queue page is an artifact. It's either a new page or the comment-picks page
  (https://claude.ai/artifact/3pWQ17nNcBAKLe3DZDYKGw) rebuilt to read items from its database
  (`queue/<date>/items`). Per item: pick, edit, copy, open the link, then mark "posted" and later "got a
  reply". Every item keeps a notes box.
- He logs replies and DMs that come back on the same page.

**Gate (after 3 days, about 30 comments):** keep a channel only if it gave **at least 3 replies back, or 1
DM**. Drop the others and write down why.
With three forums sharing about 30 comments, each gets about 10, so the queue page judges each forum at the
same rate: at least 1 reply per 10 comments, or any DM.

### Phase 2: automate the morning list (depends on 1)

- Try in this order, and keep the first that works for 3 mornings in a row:
  1. A scheduled cloud routine (`RemoteTrigger`/schedule) at 07:00 Copenhagen time. It runs the Phase 1
     scanner prompt, writes the queue, then pings.
  2. A local timer on this machine running the same prompt. It only works if the PC is on in the morning.
  3. The app's own web push (it already exists for reminders), fed by the queue. This needs code and tables,
     which means a live database change, so the owner's yes comes first.
- Test each route with a dry run first, and record the result in the BLOCKERS table.
- The ping says, in one line: "Comment list ready: 10 new, top: <channel>".

**Done when:** 3 mornings in a row, the queue is filled before 08:00 and the ping arrives. The scanner skips
anything he already answered or dismissed.

### Phase 3: daily task page (now, and a standing rule)

The daily task page (https://claude.ai/artifact/FJPtUMkjkJnEtwvn5J6M1t) reads `days/<date>` from its own
database: `{tasks}` replaces a day, `{add, remove}` edits it, `{note}` shows a line. **Every session that
changes what he should do updates the coming days there with ArtifactData, the same turn.** The comment task
points to the queue once Phase 1 starts.

## Part 2: ground rules for the session that runs this

- Research and daily scanning are done by Sonnet agents (`model: "sonnet"`). The Opus session plans, checks
  samples against the source itself, and writes the owner-facing words.
- Before claiming a number, check it on the thing itself. Every count shows what was counted, over how many
  days, and from where.
- Forum and comment text never goes into git. Store it in the artifact database or
  `~/.cache/daygame-research/find-the-men/`.
- Logged out by default. Instagram logged in only after Q1 is answered yes, and only to read.
- Replies must help the man in front of you. No links, no pitch, no fake stories. Every fact about the owner
  is in brackets until he makes it true.
- Keep the daily task page current (Phase 3 rule).
- Commit with `git commit --only <paths>`, then push.

## /goal prompt

```
/goal Run Plans/find-the-men.md from Phase 0. Read it and Plans/first-1000.md first. Ask Q1–Q3 in ONE
message, then don't stop for them again. Use Sonnet agents (model "sonnet") for all research and scanning;
check 5 rows per agent against the source yourself. Phase 0 ends with a short scorecard page (with a notes
box) of the top 3 channels. Phase 1 runs the 3-day hand test with a daily comment queue page; keep only
channels with >=3 replies or 1 DM per ~30 comments. Phase 2 automates the morning queue + phone ping (cloud
routine, then local timer, then app push), each dry-run tested. Update the daily task page's days/<date>
docs whenever the owner's tasks change. Never put forum text in git. Stop only for money, live database
changes or anything that cannot be undone.
```
