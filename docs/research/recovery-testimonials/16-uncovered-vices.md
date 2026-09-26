# 16 — The four vices the corpus never covered: gaming, scrolling, junk food, spending

Source pass: r/StopGaming, r/gamingaddiction, r/sugarfree, r/ShoppingAddiction,
r/digitalminimalism, r/nosurf — via the arctic-shift Reddit archive API.

Collected 2026-09-26.

---

## Why this file exists

The product offers nine things to quit. Files 01–15 cover drinking, weed,
nicotine, opioids, gambling and compulsive sexual behaviour. **They cover
nothing at all for gaming, scrolling, junk food or spending**, and that was
invisible until the testimonials were tagged by vice on 2026-09-25, because 71
untagged entries were being served for every vice and stood in for the gap.

What that looked like in the product: the thought door's "Somebody else, at the
same point" had exactly **one** untagged account at stage `goodStretch`, and
`rotate % 1` is always 0 — so every person quitting scrolling, gaming, porn,
gambling, junk or spending was shown the same quote, forever, and it is about
thirty drinks a week. Driven and confirmed at 390px before this pass began.

The stage that matters most here is `goodStretch`. Eight sources in this corpus
say the hazard is feeling fine rather than craving — "now I can finally
moderate" — and it was the emptiest stage for six of nine vices.

---

## Access and verification

| Route | Status |
|---|---|
| **arctic-shift** `api/comments/search?subreddit=…&body=…` | **Works.** Returns the comment record with `author`, `body`, `created_utc` and `permalink` in one object |
| pullpush.io | **Gone as a free route.** HTTP 429: *"This website does not provide free scraping resources for agents… paid scraping service"*. The note in project memory saying pullpush works is stale as of this date |
| reddit.com directly | JavaScript shell, ~1.5k characters of text, no comment bodies |

**The handle–quote pairing is correct by construction here, and that is the one
real advantage of this route.** File 05 had to run a second script (`pairs.py`)
to check that each quote sat inside a body whose own `data-author` matched the
handle credited, because it was scraping HTML and the two could drift. The
archive API returns `author` and `body` as fields of the same record, so a quote
cannot be credited to the wrong person unless the archive itself is wrong.

**Search is substring, not semantic**, and it is case-insensitive on `body`.
`query`, `q` and `selftext` are rejected as unknown parameters — only `body`
works.

---

## What went wrong in this pass, recorded because it changes what the numbers mean

**1. "Moderation" means something else in r/digitalminimalism.** The first pass
searched eight phrases including `in moderation`, which is the module's central
concept — and in a digital-minimalism community that phrase overwhelmingly means
**moderating a subreddit**. Of 53 scrolling candidates returned, the majority
were people discussing the labour of running a community:

> *"I moderate some small subs here and it's a labor of love with emphasis on
> the labor."*

That is a false friend, not a thin community, and it produced **zero**
good-stretch accounts for scrolling while gaming, junk and spending each
produced several. A second pass used the shape the behaviour actually takes —
*deleted the app, was fine, reinstalled it* — rather than the word the other
vices use.

**2. r/nosurf returned nothing on the first pass** despite holding data, because
every one of the eight phrases missed it. A community having archived content
and a query finding some are different facts.

**3. Candidate counts are not quote counts, and the ratio is poor on purpose.**
182 candidates were harvested and read in full; a small fraction is usable. The
rest are advice in the second person ("Stay busy. Start daily exercise"), replies
with no account in them, product promotion (a supplement, an app posted by an
account that only posts about that app), or off-topic entirely. **Nothing here
was selected from a preview.** The one time this corpus did that — eighteen
quotes whitelisted off 190-character previews — about 40% of what shipped was
wrong.

---

## Editorial rules applied to this batch

**Counter-evidence is kept, and it is kept out of the good-stretch door.** Two
accounts say moderation works for them:

> *"I've been playing in moderation for like the past decade or so."*
> *"I quit alcohol for 6 years and now just drink in moderation."*

Those are real and the corpus does not filter them out — a set of "abstinence
worked" accounts with the dissenters removed is an advert. But `goodStretch` is
the stage shown at the exact moment somebody is telling themselves they can
moderate, and answering that moment with "it worked for me" would be the one
place this module could do harm with a true quote. They belong at `deciding`,
where somebody is weighing, not at `goodStretch`, where somebody is mid-
rationalisation. **Stage is the editorial decision here, not inclusion.**

**r/BingeEatingDisorder was deliberately not used**, though it holds plenty of
archived material and would have been the richest source for `junk`. Binge
eating disorder is a clinical diagnosis, and this module has no eating-disorder
framing, no screening and no route to specialist care for it — its safety gate
covers alcohol and benzodiazepine withdrawal and nothing else. Quoting a
clinical ED population into a general habit tool, under a heading that says
"somebody else, in the same spot", would imply an equivalence the product has not
earned and cannot support. `junk` is sourced from **r/sugarfree** only, which is
a community about a habit rather than a diagnosis. **If the owner wants ED
accounts, that is a product decision about safety framing first and a research
task second.**

**Nothing is quoted about weight loss.** Several sugar-free accounts frame the
change as weight loss; this module is not a weight-loss tool and has no framing
for that either.

---

## What was actually shipped

The verified accounts are in `src/vice/data/testimonials.ts` with ids `16-xxx`,
each carrying its author, its permalink and its date as the archive recorded
them. Per-vice and per-stage coverage after this pass is asserted in
`tests/unit/vice/testimonialVices.test.ts`, which holds the remaining gaps as a
debt list with a staleness assertion — so a vice that gains accounts must be
removed from it, and the list shrinks rather than rots.
