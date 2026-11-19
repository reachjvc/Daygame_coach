# Quit reels study: what worked for 25 quit accounts, and what we can remake

Written 2026-11-19. Status: **Phase 1 running; Phase 2 waits for his Instagram login.**
Feeds the next reels in `docs/product/content_creation.md`.

## In plain words

His idea (2026-11-19): find 25 Instagram accounts about quitting any addiction, bigger is better.
He follows them and looks at them himself sometimes. Claude reads all their posts. It finds the ones
that did unusually well *for that account at that time*, and the ones we could remake in our own
words with better animation. His example: "the X beliefs that commonly hold addictions in place",
maybe as a series of several parts.

What we copy: the topic, the angle and the structure. We never copy the words, the person's story or
their footage. The site already has a belief test (`Plans/quit-tool.md`), so a beliefs series would point
to the site's own tool (Claude's note).

Account names, captions and transcripts stay in `~/.cache/daygame-research/quit-reels/`, never in git,
because the repo is public.

## Commenting (his question, Claude's answer, proposed)

Yesterday's check found almost no English quit-nicotine creators above 5,000 followers on Instagram.
Comments under big accounts also sink. So `Plans/find-the-men.md` moved the daily comments to the three
Reddit quit forums, where men write "I want to quit" every day. Claude still proposes that.
Commenting under the 25 accounts is optional and low priority. The best use is a genuine comment on a
mid-size account's fresh post (10k to 200k followers, under about 50 comments). There it is seen, and
it can bring a few profile visits. This only pays once his own profile has reels on it.

## BLOCKERS

| ID | What | Attempted, and what it returned | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | Logged out, Instagram shows only followers and about 12 captions: no views, no dates | 2026-11-18 probe (find-the-men agent B); `ig-read.mjs whoami` on 2026-11-19 returned `logged_in: false` | Phase 2 | He logs in at http://localhost:7801 (read-only browser, started 2026-11-19, task `iglogin` on his daily page) |
| B2 | Graphics card nearly full (7.9 of 8.2 GB used, 2026-11-19 at the time of the check) | `nvidia-smi` | Phase 3 transcription | Run speech-to-text on the CPU, or wait until the card is free; gpu_guard rule applies |

## OPEN QUESTIONS

| # | Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|---|
| Q1 | Which time window per account? | The last 12 months, so trends are current | All posts ever | Old outliers that no longer work today |
| Q2 | What counts as "did well"? | Views at least 3× the median of the 30 reels around it from the same account (Claude's choice from memory of common "outlier" tools; not checked today) | Top 10% by views | Big accounts would dominate the list |
| Q3 | Faceless only? | No. Keep every outlier and mark whether it can be made without a face. Talking-head ideas can often be retold with animation | Faceless only | Good topics get lost |

## PHASES

### Phase 1: the candidate list (Sonnet, running 2026-11-19)
About 45 accounts across nicotine, alcohol, weed, porn, gambling, phone/dopamine, sugar, gaming and drugs,
plus addiction doctors and coaches. Followers measured logged out. Opus checks 5 rows against the profile
itself and picks 25 with a spread across addictions, biggest first.
**Done when:** a short artifact page lists the 25 (followers, topic, link, 👍 and auto-saving notes), so he
can follow them in a few minutes.

### Phase 2: every reel's views (after his login; script run by Claude, small)
Add a paged `feed` command to `ig-read.mjs`. It stays GET-only and keeps the 250-calls-a-day cap. Pull
each account's reels for the last 12 months: date, views, likes, comments, caption. Work out the outlier
score (Q2).
**Done when:** a table per account. Opus checks 5 reels' numbers against the reel page.

### Phase 3: what the outliers say (Sonnet agents)
Download the outlier reels (read-only, cookies from the same browser). Then:
- speech-to-text on the audio;
- read the on-screen text from frames.

Per reel, record: topic, hook (first line), format, length, why it likely worked, and whether it works
without a face. Also: which of our angles it fits (beliefs, symptoms, "day N", myths, and so on).
Then group the reels into patterns that repeat across accounts.
**Done when:** every outlier has a row, and Opus has checked 5 transcripts against the video.

### Phase 4: the remake board (Opus writes, Sonnet builds the page)
One artifact page. Each pattern shows how many accounts had a hit on it and how big the lift was, with
2–3 links to the originals. It also has Claude's proposed remake for us: the angle, a series idea,
words-only or voiced. Each pattern has a 👍 and an auto-saving notes box. Short page: the top 10 to 15
patterns only.
**Done when:** published, link in chat, his daily page updated.
