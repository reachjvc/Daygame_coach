# What r/leaves posts say at each stage of quitting weed

**The question.** The idea was that if we harvest about 1,000 posts from r/leaves, we can see what people report at each stage of quitting, and what to watch out for. This is a pilot to test that idea.

**Short answer: it partly works.** The data shows a clear shape over time. Body symptoms come first and fade within a month. Vivid dreams come a little later. Low mood and cravings stay for months. The relapse traps repeat from post to post. But the data cannot say how many quitters get each symptom, and the late stages are thin. Use it for the order and rough size of things, not for exact rates.

Data: `leaves-stages.json` (method, counts, regexes). Harvested 2026-11-04. The repo is public, so the verbatim example sentences, the 24,624 downloaded posts and the scripts are kept on the owner's machine only, in `~/.cache/daygame-research/leaves/` (`leaves-stages-full.json` is this file with examples). Rerun for another forum by pointing `scripts/download.py` at it.

## What was done

- Downloaded every r/leaves post from 240 fixed days: the 5th, 12th, 19th and 26th of each month, 2021 to 2025. The source was the Arctic Shift archive, because reddit.com blocks this machine. That gave **24,624 posts**. **12,443** were usable: a real text post of at least 300 characters, not removed, not a bot.
- Kept the **4,865 posts** whose author says how long they have been off weed ("Day 12", "3 weeks clean", "6 months sober"). The count came from the title, or else from the start of the post. Posts with conflicting or past counts were dropped. A hand check of 60 random posts found no wrong counts. Earlier rounds found 3-4 wrong in 70, and each was fixed.
- Read about 40 posts per stage to find the themes. Then counted each theme with a keyword list, and checked about 10 random hits per theme by hand. The keyword lists were fixed until most hits were right. One theme was dropped: "drinking instead" was mostly false hits.
- Relapse reasons were coded by hand on 100 random relapse posts. Counting them by keyword was tried first, and 30-80% of its hits were wrong.

## By stage: top 3 themes (share of posts that mention it)

| Stage | Posts | 1st | 2nd | 3rd |
|---|---|---|---|---|
| Days 1-3 | 1,104 | Cravings 19% | No appetite, nausea 16% | "Starting over again" 14% |
| Days 4-7 | 999 | Cravings 22% | No appetite, nausea 17% | Can't sleep 16% |
| Days 8-14 | 709 | Cravings 23% | Anxiety, panic 13% | Low mood 13% |
| Days 15-30 | 800 | Cravings 21% | Anxiety, panic 15% | Low mood 14% |
| Days 31-90 | 670 | Cravings 24% | Low mood 16% | Anxiety, panic 15% |
| Days 91-364 | 377 | Cravings 29% | Low mood 15% | Anxiety, panic 10% |
| 1 year+ | 206 | Cravings 27% | Low mood 14% | Can't sleep 11% (mostly looking back) |

**The trends:**

- **The body goes first.** In week 1, night sweats are at 10-11%, no appetite or nausea at 16-17%, and can't sleep at 12-16%. After day 30, each is at 3-6%.
- **Dreams come later.** Vivid dreams and nightmares are at 4% in days 1-3 and peak at 10-11% in weeks 2-4.
- **Day 1 is often a restart.** 14% of day 1-3 posts say this is another attempt ("day 1 again", "for the millionth time").
- **Mood does not fade like the body.** Low mood stays at 13-16% and anxiety at 10-15% from day 1 to a year. One caution: many late posts are looking back on the first weeks.
- **Cravings never leave the posts.** They are at 19% in days 1-3 and 27-29% after three months. "Missing it" and romanticising weed grow from 1% to about 6%.
- **The good changes.** These show up from week 1 and peak at 15-90 days: feeling proud (up to 10%), a clear head (6%), more motivation (6%), and body and appetite back (6%). Money and better relationships appear mostly after 3 months. These counts are floors, so read them as a ranking (see caveats).

## The traps

671 posts describe the author's own relapse. 221 of them say how long the author had been clean. Those relapses come after:

| Days 1-3 | 4-7 | 8-14 | 15-30 | 31-90 | 91-364 | 1 year+ |
|---|---|---|---|---|---|---|
| 24 | 40 | 18 | 36 | 45 | 40 | 18 |

Two times stand out: the end of week 1, and anywhere from 1 to 12 months. 103 of the 221 relapses (47%) came after more than a month clean; 85 (38%) came between 1 and 12 months.

What people named as the cause, in 84 hand-read relapse posts (21 named nothing; a post can name more than one):

1. **"Just a little won't hurt" / "I can moderate now"**: 12. Variants include "delta-8 doesn't count" and "one slip won't reset my timer".
2. **Withdrawal got too hard** (no sleep, cravings, feeling sick): 12.
3. **Friends, a party, someone offered, or a partner who smokes**: 11.
4. Stress or a bad event: 9. Low mood, grief, loneliness: 9.
5. A trip, birthday or holiday: 6. It was right there (an old stash, a dispensary on the way): 6.
6. Fewer cases: the break had an end date (a drug test passed, a plan done): 3. Felt great and got comfortable: 3.

## Caveats (read before using any number)

- **r/leaves is not everyone who quits.** Most quitters never post. People who quit easily have little reason to.
- **People post more when it is hard.** Early posts are often written because something hurts. That pushes symptom shares up early, and pushes relapse stories up overall.
- **Late stages are milestone posts.** Most are "100 days", "6 months" or "1 year" posts, and they look back on the hard start. In one check, 9 of 12 "can't sleep" hits at 1 year+ were about the first weeks. Only 377 and 206 posts fall in the two last stages, so differences of a few points there are noise.
- **Keyword counting misses things.** A post that describes insomnia in other words does not count. Every share here is a floor, and the good changes are under-counted more than the symptoms. The spot-checks also found that 1 to 4 of every 10 hits were wrong, depending on the theme. The file gives the check result for each theme.
- **A mention is not a rate.** "Low mood 14%" means 14% of posts at that stage mention it, not that 14% of quitters have it.
- **Posts only, no comments.** Much of r/leaves lives in the replies.
- **Relapse timing is biased.** A long lost streak is more likely to be posted with a number. Quick day-2 relapses mostly appear as "day 1 again" with no count.
- **Links not opened.** Reddit blocked every attempt, so no link was opened. The quotes match the archived text exactly, but each should be checked on the live page before it goes into the product. Some authors will have deleted their posts since.
- **Suicidal thoughts appear in 1.6% of posts** (80 of 4,865), at every stage. None were used as examples. Any page built from this needs crisis resources on it.

**On the "1,000 posts" idea:** this pilot used 4,865 dated posts, and even so the last two stages are small. With 1,000 posts, each stage after 3 months would have only about 40-80 posts. That is too few to rank themes there.
