# One-pager rulebook

The owner's notes on the addiction one-pagers that apply to **every page at
once**. He approves a rule once and does not review each page again. A note
fixes the thing it points at; it becomes a rule here only when he says it
applies generally. Rule numbers are fixed: code and tests cite them.

**Check** says what enforces a rule. **Build**: `board/build_v3.py` and
`src/quit/validate.ts` refuse broken data. **Render**: `board/check_render_v3.mjs`.
**Gate**: a review pass before he sees anything (rule 29). The exact word lists
and limits live in that code; the round-by-round history lives in git.

Rules from his book drafts are private:
`~/.cache/daygame-research/one-pagers-v2/rulebook-private.md`.

## A. Angle and reader

**1. The reader already knows he has a problem. Never screen him.** No "Is this
you?", quiz or checklist. He said this several times (4 Nov): "If you click a
onepager for alcohol dependency/addiction, then per your own definition you have
a problem. The stats i want is more like how to quit, who quits using what etc."
and "as i keep saying". Check: Build bans screening words.

**2. Say who each number is about.** The core reader is *a man who has tried to
cut down or stop and couldn't*: someone who meets the criteria for addiction,
not someone above the drinking guidelines. His words (5 Nov): "theres different
between like 10 drinks every day, and someone who drinks more than the
recommended guidelines. so it isnt clear enough to me what is what with these."
But pages are not only for addicts (9 Nov): "I didn't say every page is for an
addict. It is very important to distinguish. Some things are more necessary for
people who are truly addicts, less so if you're not." So cards about people not
checked for addiction stay, and every number card carries exactly one tag:
"Checked as hooked" or "Not checked for addiction", set by who its source
counted. A card that matters mainly to the truly hooked (medicine, withdrawal)
says so on its tag. Check: Build, Render, Gate.

**3. Every number says which group it counts and how much they used.** One tag
per number, belief proof and plan proof, shown as a "Counted" line of 12 words
or fewer:

| Tag | Who was counted | Shown as |
|---|---|---|
| `dependent` | met the criteria for dependence or a moderate-to-severe disorder | "Counted: people hooked on …" |
| `disorder` | any disorder, mild included | "Counted: people with a … problem, mild cases included" |
| `treatment` | people in or seeking treatment | "Counted: people in treatment for …" |
| `resolved` | say they had a problem and no longer do | "Counted: people who say they beat a … problem" |
| `self-hooked` | say they feel hooked (behaviours, forums) | "Counted: people who say they feel hooked on …" |
| `heavy` | heavy or daily users, not checked | "Counted: heavy users, not checked for addiction" |
| `users` | ordinary users or everyone | "Counted: ordinary users, not addicts" |
| `screened` | questionnaire showed a likely problem, no diagnosis | "Counted: people whose questionnaire answers showed a likely … problem" |

The "who" line also says how much they used, or "how much they used is not
reported". `heavy` and `users` numbers never sit in the hope, who-gets-free or
what-helps groups. Check: Build.

**4. Never support moderation.** His words (5 Nov): "some of these are sort of
dangerous, because it isnt clear if were talking about real addicts who may not
be able to moderate or not". Any "just one" thought ("one quick look", "I can
handle it", "under control") is a moderation belief. It is answered by a source
that counted hooked people, or else its proof argues against the "just one" and
its Counted line says "not checked for addiction". A card whose face sells using
less ("87% less") says it counted using less, not stopping. Check: Build.

## B. Voice

**5. Edge, for the 98%. Danger lines small, never up front.** His words (4 Nov):
"My brand is not about telling people that they need to seek crisis help … it
need not be front and center … I am more afraid of us making something that has
no edge and has no ability to help the 98%, than i am about damaging the 2% of
really bad cases". No doctor will review the pages; never ask him whether to add
a crisis line. Danger text appears only where a source ties the risk to that
drug or to quitting it: in the timeline, the footer, and one small line in the
plan step where the reader stops (a heavy drinker stops before he reaches the
footer). The emergency line counts any one sign, at any time, with no wording a
reader can use to rule himself out; pointers to it say "now", never "first".
Check: Build (danger rows only on `safety.level: danger` pages, never in the hero).

**6. Show, don't tell.** No intro line under a heading, no lead-in that says what
to conclude ("Most slip."): open with the fact. His words (4 Nov): "this is not
my voice at all 'Numbers you might see yourself in. Each one says what it's based
on.' I will rather show than tell". Check: Build.

**7. No cheering.** No "you've got this", "amazing", "journey", no exclamation
marks. Check: Build.

**8. Plain English, read once.** Proof or science line ≤ 40 words; mirror line
≤ 14 words, second person; source quote ≤ 30 words, word for word. Check: Build.

## C. Numbers

**9. Every number shows its basis.** Who, how many (the n behind that exact
figure), where, when, what was measured, what it does not mean. His words (4 Nov,
on a "90.6%"): "that sounds really promising, but based on what?" Check: Build, Gate.

**10. Cautious figure first; a projection says so.** In the hero the head count
leads, the projection right under it, marked "projected". No hedge words ("likely
runs high"): show what "hooked" meant and the range other studies found instead.
A modelled figure is a projection; a pooled average is marked `pooled`. On a card
it gets one amber chip: "Worked out, not counted" or "Average across studies";
never say the same thing twice. Check: Build, Render.

**11. No death tolls or population totals.** He doesn't care about "2.6 million
deaths": a reader can't see himself in it. Check: Build.

**12. One number per line** (or one compared pair, "27% vs 7%"). His words
(5 Nov): "here the 'what helps' section for instance i couldnt understand on my
first read-through". Check: Build, Gate (a cold reader explains each number back).

**12a. "What helps" says per 100 with it and per 100 without it**: "27 in 100 vs
12 in 100", never "×2.3" or "1 in 12" (lay readers misread those most). With no
comparison, it goes under How they quit, labelled weak. Check: Build.

**12b. Shares are written "N in 100"** everywhere a reader looks, folds included.
Only a rise or drop stays in % ("87% less"); raw counts ("138 of 180") go under
Based on. His own kept sentences are the exception (rule 26). Check: Build.

**12c. A big figure is a result, not a time stamp.** Not "Week 1" or "72 hours",
unless the time is the finding ("2–7 days" of withdrawal), marked `timeIsResult`.
Check: Build.

**13. One drug per page.** His words (5 Nov): "the 38 year average age seems like
a kind of good stat to have, but the weed is then irrelevant. remember, these are
one pagers for the specific drug". Check: Build.

**14. Number kinds come from one menu** (`08-v3/kinds.json`). His words (5 Nov):
"it could be useful to see a number of different statistics that i choose from..
Perhaps some statistics are general and we can show them somewhere, while others
are specific to whatever object of addiction." Every page fills the same kinds.
An empty kind gets one plain gap line ("Not counted here yet: …"), unless a card
nearby already answers it. General kinds sit under "Alcohol and drugs together".
Cards run: who gets free, how they quit, what helps, life after. Check: Build, Render.

**15. Order: one hope number, then beliefs and the graph, then more numbers.** His
words (5 Nov): "Perhaps a good combination is leading with one statistic creating
hope, and then some belifs/the graph, then more statistics." With no honest hope
number (porn), the title goes straight to the beliefs, and the gap is named under
"Who gets free, and how" and in What is weak. Check: Build, Render.

**16. A number isn't ready until a second reviewer re-fetched its source.** On
5 Nov reviewers found most numbers needed a fix. Check: Build (`check.by`,
`check.on`, `check.verdict: ok`).

**17. Weak numbers are named weak** (small group, forum sample, ordinary users,
projection), on the card and in the review page's "What is weak", built from the
same labels. Check: Build.

## D. Timeline

**18. A graph of how quitting feels, from what people actually say.** His words
(5 Nov): "i liked the graphical representation of how difficult it should be, i
kind of still want that like a visual of when it peaks and when it is much less …
not based on one study but like feels true to people actually. (the ideal would be
surveying 1000 people every day …)". And (9 Nov): "this graph as it is now is not
great. The scoring does not make sense. Before you had multiple lines on the
graph, so I think that's something that may be useful".
Recipe, same for every addiction:
- Forum posts with a day count, tagged by an AI reader for what they mention. No
  0-10 score.
- X axis: the nine stages (day 1 to year 2+). Y axis: "N in 100 posts" at that
  stage mentioning a thing.
- One line each for the 4 hard things and the 2 good changes named most. Hard =
  solid, warm; good = dashed, cool; each its own marker; plain-word legend that
  wraps at 390 px.
- A stage under 25 posts is faded, with its post count (never "few").
- Body symptoms from clinical sources: bars on one log time axis (hour 1 to year
  3), darker at the peak, red for danger.
- The headline is computed from the lines, not written by hand: "<top hard thing>
  come(s) up most <stage>. X in 100 posts; <last stage>, Y in 100." and the same
  for the top good change. Other page text about the graph agrees with it.
Check: Build (`felt_lines()`), Render.

**19. A lab cue test is never drawn as craving.** Withdrawal is drawn as ranges; a
phase whose study stopped at its peak ends there and says so. Check: Build.

**20. The graph names its basis and biases**: how many posts; posters are not
everyone and likely struggle more; tags come from AI readers. Check: Build.

## E. Plan and beliefs

**21. His five steps, his words, same on every page**, each with 3+ actions for
that addiction. His words (5 Nov): "this plan probably needs to be longer."
"(the table above)" links to the beliefs; "me" links to a byline. Check: Build
(`06-template.json`), Render.

**22. Beliefs in his form: the limiting belief, a counterpart you also genuinely
believe, then "When this thought comes".** 3 to 5 per page, tagged (rule 3). The
third column is one small thing to do when the thought shows up on its own, never
a test that sends him into the hard thing: "Nobody tests out how hard it is willy
nilly, they need a lot of pushing themselves to go there" (9 Nov). A proof never
repeats a number already on the page: "don't just repeat the same stats" (9 Nov).
The alcohol row "I've been drinking for years. I'm stuck with it." → "Most people
hooked on alcohol get free in the end." is marked Keep. Check: Build, Render.

**23. The beliefs exercise is one click from every page**, explained and done
there. His words (5 Nov): "Ideally we make the beliefs thing something they can
reach on my website and do there, so its a feature just a click away where it is
fully explained." Check: browser check.

## F. Design

**24. Phone first, wide layout on big screens.** His words (4 Nov): "not option
B, at least not on browser. I am generally unsure how to design this for both
phone and browser at the same time". Check: browser at 390 and 1280 px, no
sideways scroll.

## G. Process

**25. Never remove anything before he says so.** Build a new version beside the
weaker one. His words (4 Nov): "make sure we dont remove anything before i say
that we need to remove it". Data files change only to fix a factual error, with a
note. Check: Gate.

**26. Keep what he liked**: the "How quitting goes" numbers ("more in line with
what I want than a bunch of the other stats", 5 Nov), the felt-difficulty graphic,
the "age when it ended" number, alcohol belief row 3, his five-step plan, his 2025
nicotine one-pager. His own sentences stay word for word even where rules 10 or 12
would cut them (`ownWords`). A card he liked stays even if a rule argues against
it (`liked`). Check: Build, Render, Gate.

**27. Decide; don't ask.** He fears looking every part over for all addictions
"over and over" (5 Nov). Each choice put to him becomes a rule for every page; at
most 7 per round; never the same detail twice; no card asks on its own. Answered
choices are recorded (`decisions.json`). Check: Build, Render.

**28. Facts he can check, never "easy".** He finds Claude sycophantic: say where
Claude is the biased party. Every sentence on the review page must be true of the
pages; its figures are filled in by the build and checked. Check: Build, Render.

**29. Gates run before he sees anything**: source check, owner-lens critic, cold
reader, browser check, adversarial audit, looped until none finds a problem.

**30. The repo is public.** No forum quotes, book text, health details or his
story in the repo or on a page; counts from posts are fine. Check: Build scans
for any 8-word run copied from a forum post.

**31. No spending, no real email.** No paid APIs, datasets or sign-ups; an API
that asks for an email gets a placeholder. Check: Gate.
