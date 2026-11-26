# Track 3: finding the list of Instagram accounts to read

Status (2026-11-26): proposed by Claude, not yet approved. Instagram reading works through his Apify free account
($0.32 of $5 spent). Next: P1 once he answers Q1 and Q2 (or says "go with your proposals").

## In plain words

He wants to learn from Instagram accounts that post mostly words, like soberrhumor. I find about 15 such accounts
in six steps, and each step has a spending cap. He sees one page: each account with six sample posts and a score for
how much better its best posts did than its usual. He taps 👍 on the ones worth following. Nothing is copied.
The whole thing costs about $4.20 of the free $5 monthly credit, which has no card behind it.

## Tool and budget

Reading goes through his Apify free account: reels about $1.60 per 1,000, posts about $3.70 per 1,000, profile checks
cheaper. The free plan stops at $5 a month. Every step passes `maxTotalChargeUsd`. If a step would pass its cap, stop
and tell him. Spent so far: $0.32.

## A "text-first account" (proposed definition)

- Posted in the last 60 days, English.
- 5,000 to 500,000 followers (giants have teams and paid reach; tiny ones tell us nothing).
- At least half of the last 30 posts are words on a picture or text-only reels, judged by reading the text off the
  picture on this PC (free).
- Topic: quitting an addiction, recovery, discipline, habits, men's self-improvement.

## Phases (each ends in a working state; Sonnet runs them, the big model checks P5 and P6)

| # | Working state at the end | Cost cap | Acceptance test |
|---|---|---|---|
| P1 | One seed list: soberrhumor, his own examples (5-10 accounts from his feed, they count most), the 57 handles in `~/.cache/daygame-research/quit-reels/candidates.md` | $0 | file exists, no duplicates, every handle exists on Instagram (checked in P4) |
| P2 | Ranked list of handles that seed accounts credit in captions ("📷 @handle"). Evidence: 121 posts already pulled show soberrhumor naming @madsjohnstonn 18 times | $1.00 | top 10 handles hand-checked against 3 real posts each |
| P3 | Ranked list of accounts that keep appearing in 10 hashtags (sobermemes, recoverymemes, quitvaping, nofap, dopaminedetox, disciplinequotes and similar), top 30 posts each | $1.00 | each hashtag returned at least 20 posts; spend under cap |
| P4 | Shortlist of about 40 from about 300 candidates (followers, post count, bio, last post date) | $0.50 | every dropped account has a written reason |
| P5 | About 15 accounts with their last 30 posts, text read off every picture, "× usual" score | $1.70 | a second reader (big model) re-judges 20 random posts as text or not text; at least 18 agree |
| P6 | One page for him: 15 accounts, 6 sample posts each, 👍 and notes | $0 | page published, shows real data, notes save (tested with a failed save) |

Total about $4.20.

## Blockers tried once

- Instagram's own "related accounts": the post data has no such field (checked in the 121 posts). A vendor page says
  ScrapeCreators' profile call lists related accounts (100 free test calls). Untested: try it on three seeds in P2.
- Hashtag tool price: listings on the Apify Store disagree ($0.50 to $2.30 per 1,000). Read the exact price on the
  chosen tool's page before P3.

## Questions (each with my proposal and the cost if it is wrong)

- Q1 Which topics count? Proposal: quit-addiction plus men's discipline and habits. If wrong: quit-only gives a narrow,
  mostly alcohol and mostly female list, and a second round costs about $2.
- Q2 Account size range? Proposal: 5,000 to 500,000 followers. If wrong: a second filter pass, no extra reading cost.
- Q3 Spend beyond the free $5? Proposal: no. If wrong: the plan stops at the cap and waits for the next month's credit.

## Rules

Public repo: handles of public accounts only. No post text, captions or screenshots in the repo; raw data stays in
`~/.cache/daygame-research/quit-reels/`. Never solve captchas or buy phone numbers to get around checks.
