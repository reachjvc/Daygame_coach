# One-pager rulebook

Every note the owner has given on the addiction one-pagers, turned into a rule
that applies to **every page at once**. He approves a rule once; he does not
review each section on each page again. When he gives a new note, it becomes a
new numbered rule here first, then every page is rebuilt from it.

Each rule gives: the rule, his words (or the handoff that summarised them),
the date, why it exists, and how it is checked. **Build** means
`board/build_v3.py` refuses to build when the rule is broken. **Gate** means one
of the review passes in Phase 5 (source check, owner-lens critic, cold reader,
browser check, adversarial audit) checks it before he sees anything.

Rules taken from his book drafts are kept out of this public file. They live in
a private appendix on his machine (`~/.cache/daygame-research/one-pagers-v2/rulebook-private.md`).

## A. Angle and reader

**1. The reader already knows he has a problem. Never screen him.**
His words (template page, 4 Nov): "If you click a onepager for alcohol
dependency/addiction, then per your own definition you have a problem. The
stats i want is more like how to quit, who quits using what etc." and "as i
keep saying". Why: rounds 1–5 kept an "Is this you?" section and a doctors'
checklist; he had to say it several times. Check: Build bans screening words
in reader text ("is this you", "are you addicted", "take the test", "quiz",
"screener", "checklist" outside a basis line).

**2. One reader sentence, kept on every page.** The reader is *a man who has
tried to cut down or stop and couldn't*. That means people who meet the
criteria for addiction or dependence, not people who use above the guidelines.
His words (5 Nov): "theres different between like 10 drinks every day, and
someone who drinks more than the recommended guidelines. so it isnt clear
enough to me what is what with these." Why: numbers about binge drinkers or
casual users were mixed in with numbers about addicts. Check: Build requires a
`severity` on every number and belief (see rule 3); Gate (owner-lens critic).

**3. Every number says which group it counts and how much they used.** Each
number carries one severity tag, shown on the card in plain words:

| Tag | Who was counted | Shown as |
|---|---|---|
| `dependent` | met the criteria for dependence or a moderate-to-severe disorder | "Counted: people hooked on …" |
| `disorder` | met the criteria for any disorder, mild included | "Counted: people with a … problem, mild cases included" |
| `treatment` | people in or seeking treatment | "Counted: people in treatment for …" |
| `resolved` | people who say they had a problem and no longer do | "Counted: people who beat a … problem" |
| `self-hooked` | people who say they feel hooked (behaviours, forums) | "Counted: people who say they feel hooked on …" |
| `heavy` | heavy or daily users, not checked for dependence | "Counted: heavy users, not checked for addiction" |
| `users` | ordinary users or the whole population | "Counted: ordinary users, not addicts" |

Why: rule 2. Check: Build fails on a missing or unknown tag, and on a `heavy`
or `users` number in the hope, who-gets-free or what-helps groups.

**4. A moderation belief is answered only with a source about addicts.** His
words (5 Nov, beliefs): "some of these are sort of dangerous, because it isnt
clear if were talking about real addicts who may not be able to moderate or
not". The alcohol "27% vs 7%" relapse number does it right: it counts people
who had been dependent. Check: Build fails when a belief tagged
`moderation` has proof whose severity is `heavy` or `users`.

## B. Voice

**5. Edge, for the 98%. Danger lines only where a source ties the risk to that
drug or to quitting it; small, never up front.** His words (first board, 4
Nov): "My brand is not about telling people that they need to seek crisis help
… it need not be front and center … I am more afraid of us making something that
has no edge and has no ability to help the 98%, than i am about damaging the 2%
of really bad cases". He has said no doctor will review the pages. Never ask
him whether to add a crisis line. Danger text sits in the timeline, the
footer, and (added 5 Nov after a safety audit) one small line in the plan step
where the reader stops, because a heavy daily drinker who follows the steps
stops before he reaches the footer. Check: Build allows danger rows only on a
page whose research file has `safety.level: danger`, and never in the hero.

**6. Show, don't tell. No intro line under a section heading.** His words (4
Nov): "this is not my voice at all 'Numbers you might see yourself in. Each one
says what it's based on.' I will rather show than tell". Check: Build fails if
a heading is followed by a sentence that describes what comes next (no
`intro`/`sub` field on sections; the rendered HTML has no `</h2><p>`).

**7. No cheering.** No "you've got this", "you can do it", "amazing",
"journey", no exclamation marks in reader text. Why: his brand voice; first
stated in the research README, 4 Nov. Check: Build word list.

**8. Plain English, read once.** A proof or science line is 40 words or fewer;
a mirror line 14 words or fewer, in the second person; a source quote 30 words
or fewer, word for word. Check: Build counts words.

## C. Numbers

**9. Every number shows its basis.** Who was counted, how many (the n behind
that exact figure, not the whole study), where, when, what was measured, and
what the number does not mean. His words (4 Nov, hero "90.6%"): "that sounds
really promising, but based on what?" Check: Build requires `who`, `n`,
`where`, `when`, `measured`, `caveat`; Gate (source check).

**10. The cautious estimate goes first; a projection says so.** Why: the
lifetime "get free" numbers are projections from recalled ages and probably
run too hopeful (5 Nov reviewers). Check: Build fails when a number marked
`projection` has no "projected" or "expected" in its line.

**11. No death tolls or population totals.** His words (4 Nov): he doesn't care
about "2.6 million deaths". Why: a reader can't see himself in a population
total. Check: Build bans "deaths", "died", "million" and "billion" in reader
number text.

**12. One number per line.** Each line carries one number (or one pair being
compared, like "27% vs 7%"), so it is understood on the first read. His words
(5 Nov): "here the 'what helps' section for instance i couldnt understand on my
first read-through". Check: Build allows at most two figures in a headline
line and 22 words; Gate (cold reader explains each number back).

**12a. A "what helps" number says what happened per 100 people with it and per
100 without it.** "27 in 100 vs 12 in 100", never "×2.3" or "1 in 12" alone. From
his note under rule 12, and the risk-communication research (Trevena 2013:
relative risks and "number needed to treat" are the formats lay readers misread
most; Grimes 1999: "1 in X" is picked wrongly more often than "per 100"). Check:
Build fails on a `×` or "1 in" figure in the what-helps group.

**13. One drug per page.** No other addiction's numbers or name appear on a
page. His words (5 Nov): "the 38 year average age seems like a kind of good
stat to have, but the weed is then irrelevant. remember, these are one pagers
for the specific drug". Check: Build bans the other pilots' names in a page's
numbers and beliefs; a number whose group mixes drugs says so in its basis.

**14. Number kinds come from one menu.** He picks kinds of numbers once; every
page fills the same kinds. Some kinds are general (about every addiction) and
are shown once, the same everywhere; others are filled per addiction. His words
(5 Nov): "it could be useful to see a number of different statistics that i
choose from.. Perhaps some statistics are general and we can show them
somewhere, while others are specific to whatever object of addiction." The menu
is `08-v3/kinds.json`. Check: Build fails on a number whose kind is not in the
menu, and lists each page's empty kinds.

**15. Section order: one number that creates hope, then the beliefs and the
graph, then more numbers.** His words (5 Nov): "Perhaps a good combination is
leading with one statistic creating hope, and then some belifs/the graph, then
more statistics." Check: Build (the section order is fixed in the template).

**16. A new number is not ready until a separate reviewer has fetched its
source.** It needs a fetched source, a quote of 30 words or fewer, a mirror line
of 14 words or fewer, and a check by a reviewer who did not write it and who
fetched the source again. Why: on 5 Nov four reviewers found most numbers
needed a fix (wrong group, whole-study n, rounding, quotes not word for word).
Check: Build fails on a number without `check.by`, `check.on` and
`check.verdict: ok`.

**17. Weak numbers are named as weak.** A number on a small group, a forum
sample, ordinary users or a projection says so on the card, and the review page
lists it under "What is weak". Why: 5 Nov reviewers' open doubts (porn "21 of
42", the lifetime projections, betting "92%" on 25 men). Check: Gate.

## D. Timeline

**18. A graph of how hard quitting feels: when it peaks, when it eases.** His
words (5 Nov): "i liked the graphical representation of how difficult it should
be, i kind of still want that like a visual of when it peaks and when it is much
less … not based on one study but like feels true to people actually. (the ideal
would be surveying 1000 people every day …)". The recipe (same for every
addiction): body symptoms from clinical sources, drawn as ranges; how hard it
feels from that addiction's quit forum, posts with a day count, scored 0–10 by
an AI reader, with 15% re-scored blind by a second, different model, plotted as
a typical day and its spread for each stage. Check: Build fails
on a felt-difficulty file without its post count, its reader agreement and its
bias note.

**19. A lab cue test is never drawn as craving.** Withdrawal is drawn as
ranges. A phase whose study stopped at its peak ends there and says so. Why: 4
Nov he found the round-1 curves confusing, then wrong (craving drawn rising to
the top). Check: Build (trigger rows carry no peak and no fall).

**20. The graph names its basis and its biases.** How many posts it rests on;
that people who post are not everyone and likely struggle more; that scores
come from readers of the posts, not from the writers. Check: Build.

## E. Plan and beliefs

**21. His five steps, in his words, the same on every page, each with longer
actions for that addiction.** His words (5 Nov): "this plan probably needs to
be longer." Check: Build fails if a step title or text differs from
`06-template.json` `plan`/`planTitles`, or a step has fewer than 3 actions.

**22. Beliefs in his two-column form: the limiting belief, a counterpart you
also genuinely believe, then a real-life test.** 3 to 5 per page, each tagged
with the reader it is about (rule 3). The alcohol row "I've been drinking for
years. I'm stuck with it." → "Most people hooked on alcohol get free in the
end." is marked Keep. Check: Build counts rows and fields.

**23. The beliefs exercise is a feature one click from every page.** It is
fully explained there and done there. His words (5 Nov): "Ideally we make the
beliefs thing something they can reach on my website and do there, so its a
feature just a click away where it is fully explained." Check: Browser check
(the link works from every page).

## F. Design

**24. Phone first, with a wide arrangement on big screens; both shown in the
review.** His words (4 Nov, header): "not option B, at least not on browser. I
am generally unsure how to design this for both phone and browser at the same
time". Decided for him (rule 27): phone first. Check: Browser check at 390 px
and 1280 px, no sideways scroll.

## G. Process

**25. Never remove anything before he says so.** Build another version next to
the one you think is weaker; don't rework the original. The template page
(version 10) and the first board stay as they are. A data file changes only to
fix a factual error, with a note. His words (4 Nov): "make sure we dont remove
anything before i say that we need to remove it". Check: Gate (adversarial
audit compares old files).

**26. Keep what he liked.** The "How quitting goes" numbers ("more in line with
what I want than a bunch of the other stats", 5 Nov); the felt-difficulty
graphic; the "age when it ended" number; alcohol belief row 3; his five-step
plan; his 2025 nicotine one-pager. Check: Gate (owner-lens critic).

**27. Decide; don't ask. Every choice put to him becomes a rule for every page,
at most 7 per round, and never the same detail twice.** Why: 5 Nov he said he
fears looking every part over for all addictions "over and over". Check: Gate.

**28. Facts he can check, never "easy".** He finds Claude sycophantic. Say
where Claude is the biased party. Check: Gate (report).

**29. Gates run before he sees anything.** Source check, owner-lens critic,
cold reader, browser check, adversarial audit, looped until none finds a
problem. Why: 5 Nov he saw numbers before reviewers had checked them.

**30. The repo is public.** No forum quotes, book text, health details or his
story in the repo or on a page. Counts and scores derived from posts may go in
the repo. Check: Build scans every committed v3 file for any 8-word run that
also appears in a harvested forum post.

**31. No spending, no real email.** No paid APIs, datasets or sign-ups; an API
that asks for an email gets a placeholder (his address was sent to Unpaywall
once). Check: Gate (adversarial audit).
