# Proposal: real daily craving logs, the owner's "1,000 people a day"

Proposal only. Nothing here is built, and nothing should be until the owner
decides whether the app is rebuilt.

## Why

The felt-difficulty graph on each one-pager is built from quit-forum posts.
That is the closest honest data we could get, and it has three weaknesses the
graph states: people who post are not everyone who quits, they post more when
it is hard, and the scores come from AI readers, not the writers. The owner's
ideal is different: ask 1,000 people every day how hard today was. An app can
do exactly that for its own users.

## What the reader does

- Once a day, after his quit date (plan step 3), one question: **"How hard was
  today?"** on the same 0 to 10 scale the graph uses, with the same words at
  0, 2, 4, 6, 8 and 10. One tap.
- Optional: tap the symptoms he had today (the same list the forum readers
  used: cravings, short temper, anxiety, low mood, bad sleep, vivid dreams,
  tiredness, brain fog, stomach, sweats, headaches, restless, boredom,
  loneliness, aches, sex drive), and whether he used today (yes or no).
- He sees his own line drawn over the page's curve. A slip does not wipe his
  count: total days off sit next to the current run (an idea from Try Dry).

## What gets stored

One row per person per day: addiction, day number since the quit date, the
0 to 10 score, the symptom taps, used today yes or no, and the date. No free
text leaves his own view. A note field, if any, stays private to him.

## How it becomes the graph

- Per addiction and day bin (the 15 bins the forum graph uses), the middle
  score and the middle half, shown only once a bin has at least 30 people,
  so no one can be picked out.
- Each person counts once per bin, so a heavy logger does not outweigh others.
- The graph says how many people it rests on, and that people who stop
  logging drop out (the I Am Sober data shows this: 3,274 check-ins on day 1,
  735 on day 30). Show the drop-out next to the curve.
- Until a bin has 30 people, the page keeps the forum curve and says so.

## Consent and privacy

- Opt-in, asked once, in plain words: "Count my daily score, without my name,
  in the graph other people see."
- The aggregate holds counts and scores only.
- A person can delete his rows; the graph is rebuilt without them.

## Cost and size, so the owner can weigh it

- One small table and one daily screen. The data model fits the time tracker
  and Today pieces the app already has, or a rebuild.
- Nothing paid is needed.
- It needs users before it says anything: at 30 people per bin, about 30
  people must reach each stage, including day 365, before the late part of the
  curve can replace the forum data.
