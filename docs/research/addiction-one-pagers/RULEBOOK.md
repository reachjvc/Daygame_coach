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
| `resolved` | people who say they had a problem and no longer do | "Counted: people who say they beat a … problem" |
| `self-hooked` | people who say they feel hooked (behaviours, forums) | "Counted: people who say they feel hooked on …" |
| `heavy` | heavy or daily users, not checked for dependence | "Counted: heavy users, not checked for addiction" |
| `users` | ordinary users or the whole population | "Counted: ordinary users, not addicts" |
| `screened` | questionnaire answers showed a likely problem; no diagnosis | "Counted: people whose questionnaire answers showed a likely … problem" |

The "who" line also says how much they used (cigarettes a day, days a week,
"daily"), or "how much they used is not reported". Belief proofs and plan
proofs carry a tag too, and show a short Counted line under them.
Why: rule 2. Check: Build fails on a missing or unknown tag; on a `heavy`
or `users` number in the hope, who-gets-free or what-helps groups; on a
Counted label that lacks its tag's key words (`disorder`: "mild"; `resolved`:
"say"; `heavy`/`users`: "not"; `self-hooked`: "say" or "feel"; `screened`:
"questionnaire" or "answers"; `dependent`: "hooked"; `treatment`: treatment,
trial, therapy, help); and on a `basis.who` that names no amount of use
(added 8 Nov after the round-3 rules audit).

**4. A moderation belief is answered only with a source about addicts.** His
words (5 Nov, beliefs): "some of these are sort of dangerous, because it isnt
clear if were talking about real addicts who may not be able to moderate or
not". The alcohol "27% vs 7%" relapse number does it right: it counts people
who had been dependent. Restated 8 Nov (round 4, D1): a moderation belief's
proof must never support moderating. It is answered by a source that counted
hooked people (`dependent`, `disorder`, `resolved` or `treatment`), or by one
that didn't, and then the proof argues against the "just one" and its Counted
line says plainly who was counted ("… not checked for addiction"); the words
sit on the Counted line, not in the proof sentence. A "just one" thought ("just
one", "one quick look", "I can handle it", "under control") is a moderation
belief whatever kind it was filed under. Check: Build fails on a "just one"
belief not filed as `moderation`; on a moderation belief answered by other
people whose Counted line lacks "not checked"; on "not checked" inside its
proof sentence; and when a stop-or-cut-down number counts other people
without saying "not checked for addiction".

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
stops before he reaches the footer. A page without a danger level may carry one small footer line, never up
front, when a source ties a risk to quitting that drug (nicotine, 8 Nov: clozapine
and olanzapine levels rise once smoking stops, Kroon 2007). Check: Build allows danger rows only on a
page whose research file has `safety.level: danger`, and never in the hero.

**6. Show, don't tell. No intro line under a section heading.** His words (4
Nov): "this is not my voice at all 'Numbers you might see yourself in. Each one
says what it's based on.' I will rather show than tell". The same goes for
verdict lead-ins: a line opens with the fact, never with what to conclude
from it ("Most slip.", "No medicine has clearly helped: …", "noticeable but
manageable", "Each one is a complete success" as an action). Check: Build fails if
a heading is followed by a sentence that describes what comes next (no
`intro`/`sub` field on sections; the rendered HTML has no `</h2><p>`), and on
a verdict lead-in in a headline, belief proof, plan proof, plan action or body
row.

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
run too hopeful (5 Nov reviewers). Exception (8 Nov): the hope number at the
top follows rule 15, his own words ("leading with one statistic creating
hope"), where this rule came from reviewers. There the projection may lead,
with the head count right under it in the same view; its line says
"projected" and its one Weak label says it likely runs high, said once, not
three times. The choice `hero` on the review page sets the order. A modelled
figure (a pooled effect times an assumed rate, a model's estimate) is a
projection too. On a card, a worked-out figure shows its Counted label and one
amber chip, "Worked out, not counted" ("Average across studies" for a pooled
average, `pooled: true`), carrying anything else its Weak label says; "not
counted" is never said twice (round 4, D6). In the hero the chip names its
figure ("About 91 in 100: worked out, not counted; likely runs high"), so it
never reads as a label on the head count. Check: Build fails when a number
marked `projection` has no "projected" or "expected" in its line; the render
check fails when the hero has both hope numbers but shows only one, when a
projection chip sits in a hero with no projected figure, and on the old
"Projected, not counted" chip.

**11. No death tolls or population totals.** His words (4 Nov): he doesn't care
about "2.6 million deaths". Why: a reader can't see himself in a population
total. Check: Build bans "deaths", "died", "million" and "billion" in reader
number text.

**12. One number per line.** Each line carries one number (or one pair being
compared, like "27% vs 7%"), so it is understood on the first read. His words
(5 Nov): "here the 'what helps' section for instance i couldnt understand on my
first read-through". A range ("2–7 days") and a share ("7 in 100") count as one
figure; number words ("half", "one in three") count too. Check: Build allows
at most two figures in a headline (and 22 words), a belief proof, a plan proof,
and a body row's label and its timing line; Gate (cold reader explains each
number back).

**12b. Shares of people are written "N in 100".** On every reader face: the
big figure, the headline, the hope number too. Only a drop or a rise ("87%
less") stays in %; raw counts ("138 of 180") go under Based on. Why: round-3
cold readers had to convert between "42 in 100", "90.6%" and "138 of 180" on one
screen. Round 4: this holds for headlines, belief and plan proofs and body
rows too ("1 in 4" is "25 in 100"; "2,008 of 4,781" goes under Based on). His
own kept sentences (`ownWords`) are the exception (rule 26). Check: Build fails
on "%" or "N of M" in a big figure, and on "N%", "1 in N" or a raw "N of M"
count in a headline, a proof or a body row.

**12c. A big figure is a result, not a time stamp.** "Week 1", "72 hours",
"7 days" or "Years 1 and 3" says when, not what happened. Make the result the
big figure where the source gives one; where the time is itself the finding
("2–7 days" of withdrawal, "6 years" of rising well-being), the card says so
with `timeIsResult: true` and its headline says the result first. From round 4
(D7). Check: Build fails on a time as the big figure without `timeIsResult`.

**12a. A "what helps" number says what happened per 100 people with it and per
100 without it.** "27 in 100 vs 12 in 100", never "×2.3" or "1 in 12" alone. From
his note under rule 12, and the risk-communication research (Trevena 2013:
relative risks and "number needed to treat" are the formats lay readers misread
most; Grimes 1999: "1 in X" is picked wrongly more often than "per 100").
Exception: when no study gives a without-it figure, the number goes under How
they quit as "What happened with help, no comparison" (kind `how-with-help`),
with a Weak label, and is listed under What is weak. Check:
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
is `08-v3/kinds.json`. Where a page has no honest number for a picked kind,
the reader sees one plain line where it would sit ("Not counted here yet: the
age when it ended; …", or the page's own words). The general kinds follow one
choice on the review page, not the menu too (rule 27: never the same detail
twice); when shown they sit under "Alcohol and drugs together". Check: Build
fails on a number whose kind is not in the menu, and lists each page's empty
kinds; the render check fails when a page has an empty picked kind and no gap
line. A gap line never sits right after a card that answers the same question:
an empty kind is left out of it when its section shows a card of the same
group, or of a kind its `near` list names (round 4, D6). Within a section,
cards run by group: who gets free, how they quit, what helps, then life after.

**15. Section order: one number that creates hope, then the beliefs and the
graph, then more numbers.** His words (5 Nov): "Perhaps a good combination is
leading with one statistic creating hope, and then some belifs/the graph, then
more statistics." When no study counts people hooked on it who got free (porn,
8 Nov), the page has no hope number: its title, at most one line with no
figure in it, then the beliefs; "Who gets free, and how" says plainly what is
not counted, and What is weak lists it. Check: Build (the section order is
fixed in the template; a page with no hope number needs its plain gap line,
and its hero line may carry no figure); the render check fails when such a
page doesn't go straight to the beliefs.

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
42", the lifetime projections, betting "92%" on 25 men). Check: the review
page builds its "On the cards" list from every Weak label on the pages, so the
two can't differ; Gate.

## D. Timeline

**18. A graph of how hard quitting feels: when it peaks, when it eases.** His
words (5 Nov): "i liked the graphical representation of how difficult it should
be, i kind of still want that like a visual of when it peaks and when it is much
less … not based on one study but like feels true to people actually. (the ideal
would be surveying 1000 people every day …)". The recipe (same for every
addiction): body symptoms from clinical sources, drawn as ranges; how hard it
feels from that addiction's quit forum, posts with a day count, scored 0–10 by
an AI reader, with 15% re-scored blind by a second, different model, plotted as
a typical day and its spread for each stage. A stage under 25 posts is drawn
hollow, with its post count (never "few"). The 0 to 10 scale is explained
where it is first used. Body symptoms are drawn as bars on one time axis
(hour 1 to year 3, log scale), darker where they peak, red for danger, with
their text as captions, and readable at 390 px (8 Nov, his v10 praise). Check:
Build fails on a felt-difficulty file without its post count, its reader
agreement and its bias note, and on a body row without a start and end in
hours; the render check fails when a body row is not drawn as a bar or the
graph says "few".

The graph's headline (round 4, D9) calls the hardest stretch only where the
highest typical day, among stages with 25 posts or more, stands at least 1
point above every later stage; a hollow stage never sets it. Otherwise there is
one headline, said plainly: "No clear peak. A typical day sits at 3 to 4 out of
10 from days 2–3 through months 4–12." Pages carry no headline text of their
own. A plan proof that quotes the graph uses a figure the graph shows. Check:
Build fails on a page's `feltHeadlineProposal` and on a plan proof's "N out of
10" that no stage of the graph shows; the render check fails on more than one
graph headline, on "No clear peak" next to a hardest stretch, and when the
page's stage medians differ from the build's.

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
be longer." "(the table above)" in step 1 links to the beliefs; "me" in step 5
links to a byline under the plan. Check: Build fails if a step title or text differs from
`06-template.json` `plan`/`planTitles`, or a step has fewer than 3 actions;
the render check fails when "the table above" is not a link.

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
plan; his 2025 nicotine one-pager. His own v10 and 2025 sentences in kept rows
stay word for word, even where rule 10 or rule 12 would cut them; such a proof
carries `ownWords: true` and the build skips its figure count (8 Nov). Check:
Gate (owner-lens critic).

**27. Decide; don't ask. Every choice put to him becomes a rule for every page,
at most 7 per round, and never the same detail twice.** Why: 5 Nov he said he
fears looking every part over for all addictions "over and over". A card never
asks on its own ("Proposed to remove"); every proposal folds into one choice
that lists the cards it covers. A detail a rule or decision already settles is
not asked again, and each card sits in exactly one choice. The off-reader
choice covers number cards only; its count is the length of the list it shows
(round 4, D2/D3). Belief and plan proofs about people not checked for addiction
stay, labelled so, and the choice names them in one line. The review page says
under its tabs that only "Choices for you" needs him. Check: Build (at most 7 choices); the render check fails on a
"Proposed to remove" chip and on more than 7 asks on the review page; Gate.

**28. Facts he can check, never "easy".** He finds Claude sycophantic. Say
where Claude is the biased party. Every sentence on the review page is true
against the pages: a figure it states about them is filled in from the pages
by the build (`{feltUsed}`, `{planActions}` …), and a sentence about one page
carries an `assert` the build re-checks (8 Nov, round-3 finding: four review
sentences were false). A second source a line rests on (`alsoRef`, `refs2`) is
cited as a numbered source at the end of the card's caveat (round 4, D10).
Check: Build (unknown fact names, failed asserts); the render check fails when
the off-reader choice's stated count differs from its list; Gate (report).

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
