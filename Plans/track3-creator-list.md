# Track 3: the top of our niche on Instagram (producers, reels, text posts)

Status (2026-11-26): plan 3, proposed by Claude, not approved. Replaces plans 1 and 2 of the same day (he called them
expensive and weak). Nothing paid runs until he says yes to the probe batch (about $0.33). Spent so far: $0.32 of the
free $5 a month.

## In plain words

He wants three ranked lists from our niche (quitting addictions, plus men's discipline and habits):
1. the top producers, by followers now or by growth;
2. the top reels;
3. the top text and picture carousels.
He does not pick the posts: the method does. I first find who is in the niche from five places, then measure
everyone the same way and rank. Every example he sees is the full reel or full picture. A small paid test of four tools
comes first (about $0.33), because three of the four are untested.

## What I found today (facts, with how I know)

- Full reels download for free: the video link is in the data (tested, 2.2 MB, 720x1280).
- Exact prices come from Apify's API, not search listings. Measured: reels $0.0026, posts $0.0027.
- Growth history exists: Social Blade keeps about 31 days of daily follower counts for Instagram accounts. Its site
  blocks me (403), but Apify tools read it: amrameng/socialblade-scraper $0.008 per account (31 days, plus 1, 7, 14 and
  30-day growth), benthepythondev/socialblade-scraper $0.003 (15 days). One other tool's notes say Social Blade hides
  Instagram history from visitors. Untested: probe P1.
- A reel search across all of Instagram exists: memo23/instagram-reels-search-scraper, $0.0015 per reel. It takes
  Boolean keywords, a date range and minimum views or likes, and reels that fail the filter are not charged. It can also
  return picture and carousel posts. Untested: probe P2 and P4.
- Instagram's own "similar accounts" list can be read: instagram-scraper/instagram-related-profiles, $0.0025 per
  account, with a follower filter. Untested: probe P3.
- Free follower counts work through the link-preview route, but they are rounded to 1,000 above 10,000 followers.
  Our 25 known accounts (counted 19 Nov and again today) barely moved in 7 days. Fast growers are accounts we have not
  found yet, so growth comes from discovery, not from watching the known list.
- Instagram's own Inspiration hub (trending reels by topic) needs a logged-in professional account. I cannot use it.
- Wayback Machine: almost no snapshots of these profiles, so it cannot give follower history.
- Data already on disk: 25 accounts scrolled on 19-20 Nov (3,156 reels, 231 outliers in `quit-reels/ig/outliers.json`),
  471 ranked originals in `quit-reels/contenders/data.json`, 57 candidate accounts in `candidates.md`.

## How each list is made

**Who is in the niche (the pool).** Five sources, merged and deduplicated: (a) creators behind the top reels from the
reel search; (b) Instagram's similar-accounts lists for the 10 strongest accounts; (c) Instagram's own account search by
keyword (apify/instagram-search-scraper, $0.0027 per result); (d) web lists of top recovery, quit and discipline
accounts (free); (e) the accounts already on disk. A niche check (I read bio and recent captions) drops off-topic accounts.

**1. Top producers.** Social Blade numbers for the pool. Three lists: Biggest (followers now), Fastest (30-day gain,
percent and absolute, for accounts with 5,000+ followers), Breakout (recent reels reaching far more people than the
account has followers, which is how accounts grow).

**2. Top reels.** The reel search per niche keyword, last 12 months, minimum views set high, so only hits are paid for.
Ranked three ways: views; views against the creator's usual (from a cheap per-account pull of the top 30 creators);
views against followers. Reels younger than 7 days, paid partnerships and brand ads are left out.

**3. Top text and picture carousels.** No views exist on pictures, and shares are not public for them. Ranked by likes
and comments, against the account's usual and against followers. Sources: the search with pictures included, plus
per-account post pulls for accounts that post mostly words. Every slide's text is read on this PC (free OCR).

## Things he did not list (proposed additions)

1. Original maker versus reposter: big meme accounts repost others' work; credit lines and matching pictures show the
   maker. Instagram's 2026 originality rule demotes reposts.
2. Comments: what viewers write (questions, "this is me") is free in the data and gives words and ideas.
3. Hooks: the first 2 seconds or first slide, and the audio used.
4. Fair comparison by age: views keep growing for days, so compare posts at similar age.
5. Audience fit: no public data on viewer age or gender; only the creator and topic hint at it. Weak, stated as such.
6. TikTok and YouTube Shorts: the same creators are often bigger there; YouTube is free to read (done before).
7. Keep it running: a weekly refresh of the top 60 builds real growth curves; it needs budget (see below).
8. Our own account: once 10K Days Club posts, measure it the same way.

## Budget

The free plan gives $5 a month. A first full round costs about $3: pool and growth about $1.20, top reels about $0.75,
carousels about $1.20. That leaves little room to iterate inside one month. Options: spread rounds over months, or a
paid Apify plan (his decision, price not checked). My proposal: run the probe batch first, then decide.

## Probe batch (needs his yes, about $0.33)

| # | Question it answers | Run | Cap |
|---|---|---|---|
| P1 | Does Social Blade give Instagram growth? | amrameng tool on 5 known accounts, history on | $0.05 |
| P2 | Does the reel search find big niche reels? | 3 queries, last 12 months, minimum 100,000 views, 30 each | $0.15 |
| P3 | Are Instagram's similar-accounts lists on topic? | 2 seeds, 20 each, 10,000+ followers | $0.10 |
| P4 | Does the search find text carousels? | 1 query, pictures included, 30 results | $0.05 |

Each probe's answer goes on his page with the cost, before anything else runs.

## Steps after the probes (each with its acceptance test; Sonnet runs them, the big model checks the rankings)

| # | Result | Acceptance test |
|---|---|---|
| S1 | Pool of niche accounts from the five sources | every account has a source and a niche reason |
| S2 | Three producer lists | numbers match Social Blade's page on 5 spot checks |
| S3 | Top reels list, full reels on the page | 10 random reels re-checked: views match within 2% |
| S4 | Top text and carousel list, full pictures on the page | a second reader agrees on text or not text for 18 of 20 |
| S5 | One page with all three lists, 👍 and notes on every item | notes save, also tested with a failed save |

## Rules

Public repo: handles of public accounts only. Post text, captions, comments and pictures stay in
`~/.cache/daygame-research/quit-reels/`. Never solve captchas or buy phone numbers to get around checks. Prices: read
each tool's `pricingInfos` through the API.
