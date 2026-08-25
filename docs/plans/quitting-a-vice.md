# Quitting a vice — `/test/quit-vice`

**Status:** shipped (sandbox). localStorage (`quit-vice-v1`) is the only store.
No API, no database, no account, nothing leaves the browser. Reachable from the
`/test` dashboard and from the **Vices** routine card inside Life Mastery.

## What it is

Two flows that ask for no commitment, four flows through quitting something, and
three tools that work with no setup at all. Every flow shares one set of answers — start in one,
move to another, and the log, the plans, the card and the voice work come with
you.

| Flow | URL | Pitch | Position it takes |
|---|---|---|---|
| **Find out where this actually is** | `/test/quit-vice/where` | No advice and no label at the end. An accurate picture. | The other four all begin *after* somebody has concluded there is a problem. Around 95% of people who met criteria and got no help said the reason was they did not think they needed any — so that conclusion is the bottleneck, not motivation. |
| **What it gives you, honestly** | `/test/quit-vice/gives` | Start at the good half, then check it against your own record. | Every account of this is about the damage. If it did nothing for you it would be easy, and the things it genuinely does are what any replacement has to cover. |
| **Watch it first** | `/test/quit-vice/map` | Change nothing. Find out what it actually gives you. | Argument does not touch a habit's grip; your own expected-vs-actual numbers do. |
| **Run an experiment** | `/test/quit-vice/experiment` | Not forever. A dated, reversible period with one small thing a day. | "Forever" is what people refuse. A bounded, negotiated period is what they accept. |
| **Draw a line** | `/test/quit-vice/line` | One decision, made once, so it stops being on the table every evening. | The nightly re-litigation is the exhausting part, not the vice. |
| **Change the week** | `/test/quit-vice/week` | No feelings, no digging. Move the furniture. | None of this is psychological; all of it is architecture. |

**The three tools**, on the toolbar of every screen and at the top of the hub:

- **An urge, now** — HALT → name the feeling → find it in the body → rate it →
  ninety seconds → what happened. No setup required.
- **It already happened** — the lapse debrief. Compassion beat, behaviour-level
  questions, then the chain worked backwards, then *"Why today, and not
  yesterday?"*, then the next hour.
- **My card** — three reasons and one line. The thing you open at eleven at
  night.

**The fourth thing on the toolbar: "Need more than this"** — the help door
(`components/HelpDoor.tsx`). Crisis numbers first, unconditionally, then the
four beliefs that keep people away from treatment, then real services for
UK / US / elsewhere, then one if-then plan with a time on it. Reachable in one
tap from every screen. The awareness flow is not shippable without it: handing
somebody an accurate picture of a serious problem and then offering a body-map
picker is worse than not showing them the picture.

The four change-flows are four because the research disagrees with itself in ways that
cannot be averaged out. Averaging them is how you get a flow that suits nobody.

## The nine modules — the teaching spine

`/test/quit-vice/learn`. Until this existed the module was a **toolbox**:
reactive tools you open when something is happening, two assessment flows, a
checklist and a library. All useful, none of it teaching anything. There was no
sequence, nothing saying what a person would understand afterwards, and the
strongest findings in the corpus sat inside `Why` disclosures on screens people
only reach in a crisis.

Nine modules, each **one idea → one exercise → real accounts**, in that order,
because the idea makes the exercise worth doing and the accounts make the idea
believable.

| # | module | exercise it reuses |
|---|---|---|
| 1 | You cannot see this one from inside | the `where` flow |
| 2 | What it actually gives you | the `gives` flow |
| 3 | The room matters more than the resolve | the shortlist |
| 4 | A constraint you can undo alone is not a constraint | the shortlist |
| 5 | What to do when it is actually happening | the urge tool |
| 6 | The dangerous week is the good one | the tripwire |
| 7 | A lapse is information about a method | the lapse debrief |
| 8 | What was different the time it worked | the attempt review |
| 9 | Reading other people is itself the technique | the accounts |

Rules, enforced by `tests/unit/vice/modules.test.ts`:

- **Ordered by what generates awareness**, not by what a programme would do
  first. The count comes before any technique, because ~95% of people who met
  criteria and got no help said they did not think they needed any. Nothing
  asks for a decision until module 6.
- **Every module reuses an exercise that already exists.** A module is a frame
  around a tool, never a second place to do the same work.
- **Nothing is a prerequisite** — readiness-gating is contradicted by the
  corpus, where two durable quits began with no wish to stop at all.
- **The takeaway stands alone.** Somebody who reads only that line has the
  useful part; a test caps it at 26 words.
- **Nine, and no tenth.** The page says outright there is no daily module and
  no reason to be here every day, since a high proportion of recovery-focused
  activity carries OR 5.00 for a use episode. The read-count is explicitly not
  a score and skipping is named as a normal way to use it.

## The short version

`/test/quit-vice/shortlist` — the fifth path, and the only one built from the
evidence ranking rather than from a single school of thought. Ten items in
`data/shortlist.ts`, ordered by how many **distinct source files** name that
family, with the count shown beside each so a thin one can be discounted on
sight. The component sorts by that number rather than trusting the array, since
a nine-source item displayed below an eight-source one makes the page's own
claim visibly false.

Three findings shape it more than the ranking does:

- **Environment beats disposition** — the strongest single mechanism claim in
  the corpus, five studies. So the top of the list is physical, not mental.
- **A constraint you can revoke alone is not a constraint.** Gambling blockers
  get beaten by offshore sites and app-offloading; porn blockers "work only
  when somebody else holds the key". Every item carries a *needs somebody else*
  badge where that applies, per item rather than explained once.
- **Six of the ten happen away from the screen, and the page says so.**
  Engagement volume predicts nothing good across three independent designs and
  a high *proportion* of recovery-focused activity carries OR 5.00 for a use
  episode. The count is explicitly not a streak, and when the list is complete
  the page tells people to come back less often — which is the opposite of what
  a retention-optimised product would say and what the evidence supports.

The four longer flows stay. Each walks a genuine position the literature takes
and they disagree with each other on purpose. This one sits above them because
it is the shortest and the best-evidenced, not because they are wrong.

## The hub is grouped by where a person is

Not by what kind of object a screen contains. An earlier version had **"My
card" under "Something is happening now"**, beside an urge in progress — a card
is a thing you made weeks ago, and grouping by object type is how a hub becomes
a menu nobody can parse. The arc, from the corpus:

| heading | what belongs there |
|---|---|
| **Right now** | An urge. I just did it. Minutes, not sessions. |
| **Where I am with it** | Whether it is a problem · what it gives me · it is going well · I have tried before · ways to change it |
| **Things I have written** | The card. Possessions, not moments. |
| **What other people did** | The accounts and the techniques. |

Plus the way out, always reachable and never buried.

## "I have tried before"

The corpus's own highest-value question was *what was different on the attempt
that finally worked*, and until now the module had no surface for it at all —
despite most people who resolve having several attempts behind them.

`data/again.ts` is built directly on the five themes the nicotine file
identified and the other substances echo:

1. **The internal argument was over before day one** — less need for willpower, not more
2. **Absolutism about the first one**, learned from the specific prior failure
3. **A pharmacological change**, not a psychological one — one account failed dozens of times then succeeded first try on medication
4. **Removing the second substance** — several treat the drink as the actual failure point of every previous attempt
5. **A changed cue set** — a route, a job, a house

The screen asks how the last attempt *ended* and answers that specific ending,
because theme 2 is that the rule which finally works is learned from the
particular failure rather than adopted in general. What is conspicuously absent
from every "this time" account — more motivation, more facts about harm,
stronger reasons — is absent here too, and a test asserts the words "try
harder" never appear.

**The counter-evidence is kept.** Not every durable quit has a story: one man
succeeded at the worst moment of his life describing himself as having the
weakest will of anyone, another with no wish to stop at all. A screen that
insisted on a narrative would be lying to those people, so there is a "what if
none of this fits" toggle that says so.

## Three versions over one state

The module grew to roughly **9,700 words of copy — about forty-four minutes of
reading** — in front of somebody who is ambivalent by definition. No single
commit did that; every one added a paragraph that was, on its own, worth
reading. So there are now three front doors, chosen by a switcher at the foot
of the hub and kept in their own storage key:

| version | words visible | for |
|---|---|---|
| `plain` | ~70 | One question, four answers. The eleven-at-night arrival. |
| `guided` *(default)* | ~85 | Two doors: something is happening, or you are working something out. |
| `full` | ~600 | Everything. The flows, the library, the techniques. |

**A version is a view, never a container.** All three read and write the same
`quit-vice-v1` state, so the log, plans, card, tripwire and voice work follow
you across; `tests/unit/vice/versions.test.ts` asserts the version lives in a
separate key so "start over" cannot take it, and an e2e test writes a tripwire
in one version and reads it in another.

### What else came out of the same pass

- **The rail collapsed.** It listed every step, numbered, on every screen —
  twelve titles on the longest flow, about a third of everything visible, and
  it made each flow look like a twelve-part course before you had done
  anything. Now: position, a progress bar, and the full list one tap away.
  77 words → 8.
- **`Why` disclosures.** What to do stays visible; why it works folds away.
  Applied to provenance, evidence notes, the case for each design decision.
  The reasoning is what separates this from a wellness app and it is still one
  tap from every screen — it is just no longer the first thing.
- **Word budgets, enforced.** `tests/unit/vice/wordBudget.test.ts` caps step
  blurbs, titles, the intro paragraph people actually see, the urge responses
  and both lean versions. The way to satisfy it is to move prose behind a
  `Why`, never to raise the number.

## The decisions that are load-bearing

These are the ones to argue with before changing anything.

**There is no streak counter, anywhere.** A counter that resets to zero delivers
both halves of the abstinence violation effect — an identity re-designation
("you are a day-zero person again") and an internal, permanent-sounding
explanation — at the exact moment of maximum vulnerability. It is not neutral
instrumentation; at a lapse it is an active harm. The running total here counts
urges that came and went without being acted on, which is monotonic by
construction: nothing that happens later can take one away.

**A day with nothing logged is never scored.** Not green, not red — absent. An
app that assumes a quiet day went well ends up congratulating somebody who is
holding a drink, and is never believed again.

**No pros-and-cons screen.** Almost every app in the category ships one. Inviting
an ambivalent person to write down what they like about the habit produces
sustain talk, and sustain talk is the variable that predicts worse outcomes. The
0–10 importance ruler replaces it.

**The ruler only ever compares downwards.** "How are you at a 6 instead of a 3?"
invites the case *for* changing. "Instead of a 9?" invites the case against.
`rulerFollowUp` has no input that can produce a higher number, and a test asserts
that across all eleven answers.

**If-then plans phrased as negations are refused, not discouraged.** A plan that
names what you will *not* do measurably backfires, worst in the people whose
habit is strongest. `planProblem` rejects it and says why. The word list is
deliberately short — `stop` is not on it, because "stop at the shop" is a fine
plan and a validator that cries wolf gets ignored.

**The urge tool never demands abstinence.** *"You can still do it afterwards.
This is not a test."* is on screen at every stage. Remove the demand and
observation becomes possible; leave it in and the honest entries stop arriving,
which makes the log — and therefore everything downstream of it — worthless.

**The page never says how long an urge lasts.** The twenty-minute figure everyone
repeats has no primary source. Once a few have been logged it quotes the
person's own median and longest instead.

**Never the word "addiction", about anybody.** Compulsive sexual behaviour is not
classified as an addiction, and a large share of people who describe themselves
that way have a conflict between behaviour and values rather than a dependence.
Telling that person their brain is broken is wrong and makes them worse.

**No empty encouragement.** "You've got this" is the single line people who have
quit something name as most repellent. Acknowledging difficulty is welcome;
cheering is not.

**The urge tool offers four responses, not one.** It used to offer only
observation — watch the urge for ninety seconds — which is urge surfing, and
the research corpus is unkind to it as a *sole* option: nearly absent from the
largest peer community (4 mentions against 10 for playing the tape forward,
which that community explicitly teaches), reported as *extending* the urge,
often too fast to catch at all, and described by a practitioner who uses it as
the wrong move in a cue-rich room. So the tool asks where the person is and
offers play-the-tape-forward, get-out-of-the-room, move, and watch — reordering
to put attention-away first when they say they are near it. Watching stays,
because people credit it. It is no longer the only door.

**The tripwire fires on a good week, not a bad night.** The loudest finding in
the corpus: across eight independent sources and five substances the relapse
trigger people describe is *feeling fine* — "now I can finally moderate" — at
day 4, at ten days and two months, at six months, at a year, at nine years in
one case, with an RCT giving it a mechanism (positive affect predicted urge,
which predicted intoxication). Only two people in the entire corpus had written
a rule for that moment in advance and **nobody who failed had**. `HAZARD_DAYS`
are drawn from the reported windows rather than rounded to 7/30/90, and the
nudge is framed as information, never as a warning that somebody is about to
fail.

**"I'll be fine" is treated as a red flag, not a green one.** The signal that
separated durable from fragile was whether the plan rested on self-trust or on
structure: one person failed at day 72 *because* confidence returned, another
held for months while saying plainly that they did not trust themselves, with a
lock box doing the work. The tripwire builder detects the self-trust shape and
says so.

**The incongruence question tracks a trajectory, not a taxonomy.** It used to
bucket people at intake into cost-driven or self-driven distress. The accounts
show movement instead: cost → adopting the dependence-and-powerlessness framing
→ the framing itself becoming the distress. Bucketing gets exactly those people
wrong, and the label hides the type anyway since nearly everybody says
"addiction" regardless. There is now a fourth option naming the framing itself,
the copy says the answer moves, and nothing in the product branches on it.

**The gives flow is never a balance sheet.** This is the one a later change is
most likely to break, because the flow looks exactly like pros-and-cons and
pros-and-cons is contraindicated — weighing good against bad gets an ambivalent
person to argue out loud for keeping it, and saying the case for keeping it
predicts keeping it. So the good half and the costly half are on different
screens, are never totalled, and never appear on the same line. `values.serves`
is asked *before* `values.costs`, and the page never draws the conclusion: a
discrepancy the person finds and one the page points at land completely
differently.

**Beliefs are checked against the person's own log, never argued with.**
Expectancy challenge works and then fades — the trials lose it past about four
weeks. What does not fade is their own record, because it keeps arriving. That
is the whole difference between `gives.test` and a lecture, and it is why the
screen says so out loud.

**Only beliefs rated ≥4 (`BELIEF_LIVE_AT`) get carried into the check.** Walking
somebody through a check of something they rated a two is how a twenty-minute
flow becomes one nobody finishes.

**The futures are cues, not an essay.** Episodic future thinking is the
best-evidenced thing in the flow — it shortens the temporal window, reduces how
much the immediate thing pulls, and moved real drinking in an AUD trial. It
works *at the moment of the decision*, which is why the fields are short, why
the changed half is second on every row, and why `cueForUrge()` puts one on
screen during the ninety-second wait and `futureCues()` puts them all on the
card. A futures screen that stayed inside the flow would be the exercise
without the mechanism.

**The urge cue rotates by episode count, never randomly.** `Math.random()` in a
render gives a different cue on every keystroke, and this has to sit still while
somebody reads it.

**The goodbye letter is offered second and gated.** A farewell presumes a
decision the flow has not asked anybody to make, so the letter *from* it is the
default and the farewell carries a warning until `line.sentence` exists. The
provenance is on the screen: goodbye letters are ubiquitous in treatment and
thinly evidenced; externalising is the part with support.

**The awareness flow never produces a label.** It produces a count, and the
association that goes with the count, attached to the number rather than to the
person. There is no screen anywhere in it that tells somebody what they are. The
bands ("moderate", "severe") describe counts and are never rendered next to the
word *you*.

**Every high count is paired with the resolution figure, always.** ~9% of US
adults report having resolved a substance problem (~22.35M), **46.1% of them with
no formal help at all**, and only ~46% describe themselves as "in recovery". A
screen that returns a frightening number with no context is just a scare, and a
scared person shuts the tab. The counterweight is not optional decoration.

**The dependence criteria only run on substances.** Screens and behaviours get a
different, shorter set — impairment and control only, no tolerance, no
withdrawal, **and no severity bands, because no validated ones exist**. Running
a dependence instrument on a porn user is precisely the harm `LANGUAGE_RULES`
already forbids: a large share of self-identifiers have a values conflict rather
than a dependence, and a score converts that conflict into a diagnosis they do
not have. `criteriaBand()` returns `null` for those shapes by design, not by
omission.

**No shame item in the behaviour count.** It would load hardest on exactly the
people the paragraph above describes. The distinction is asked separately in
`INCONGRUENCE`, where "is the bad feeling about what it costs, or about doing it
at all?" can be answered honestly instead of scored — and where answering "at
all" says plainly that a quit plan is aimed at the wrong thing.

**Feedback is elicit → provide → elicit, enforced in the UI.** Nothing on the
feedback screen renders until the person has written what they expect it to say.
A number that arrives unannounced gets defended against; one that confirms or
upsets a prediction they made themselves gets thought about. Same reason the
yearly-cost guess is captured before the arithmetic appears and is never
re-editable afterwards.

**The awareness flow ends in three doors and recommends none.** It has just
spent fifteen minutes establishing that the person holds the information.
Issuing a verdict on the last screen would take that back.

## The safety interlock

⚠️ **This is the part that can hurt somebody, and it is why the gate exists.**

Alcohol and benzodiazepines are the two things on the list where stopping
abruptly without medical cover can cause seizures and can be fatal. Everything
else is unpleasant to stop.

- `medicalRisk` lives on the vice in `data/vices.ts`, not on a question the
  person has to know to answer.
- The safety step is ordered **before** any step that sets a date, in every flow
  that sets one. A test asserts the ordering rather than trusting the data.
- Ticking any withdrawal sign on a risky vice sets `dateIsBlocked`, which
  disables the length picker and shows why. `setExperiment` also refuses at the
  service layer, so the gate does not depend on the button being disabled.
- Acknowledging the warning re-opens it. Correcting the answer back to "none of
  these" drops the acknowledgement, so nobody carries a warning they never read.
- Changing the vice clears the safety answer entirely — "none of these" about
  scrolling must never carry over to drinking.

## Provenance and licensing

Content policy, enforced partly by lint and partly by review:

- 🟢 **Reproduced closely**: SAMHSA TIP 35 (the importance and confidence rulers,
  Exhibits 3.9/3.10) and NIAAA's Rethinking Drinking (refusal ladder, the
  autonomy reframe, slip guidance). Both are US Government works in the public
  domain.
- 🟡 **Rebuilt, not copied**: SMART Recovery and Therapist Aid publish the best
  versions of several of these and forbid republishing their files. Where their
  tool was the model, the fields are written in our own words.
- 🔴 **Named techniques avoided**: the "it wants, I don't" move is here; the
  The Rational Recovery and AVRT marks were cancelled (Dec 2022, Oct 2025,
  USPTO TSDR) but cancellation is not abandonment, so the avoid rule stands.
  The live trademark hazard is Allen Carr's Easyway — current marks in
  classes 9/41/44 (software, training, health) and hundreds of DMCA filings. Brewer's habit-mapper PDF is
  not reproduced; the trigger → behaviour → result model is not ownable.

The `Where this comes from` disclosure on every flow says all of this to the
reader, including the unflattering part: apps in this category have a poor
record on their own, and what predicts anything is whether a person keeps
opening the thing.

## Files

```
src/vice/
  types.ts                       all types, incl. ViceHandlers
  viceService.ts                 every pure function; the rulers, planProblem,
                                 payoff/urge/window stats, date maths, load/save
  data/vices.ts                  the catalogue + medicalRisk + trigger banks
  data/copy.ts                   all user-facing strings + LANGUAGE_RULES
  data/flows.ts                  the five flows and the 30 daily missions
  data/awareness.ts              the eleven, the impact set, bands, arithmetic,
                                 trajectory, doors, INCONGRUENCE
  data/gives.ts                  belief banks, the check, values, horizons,
                                 the two letters
  data/testimonials.ts           381 cited first-person accounts, extracted
                                 mechanically from the research corpus
  data/techniques.ts             196 techniques, backfires and findings, with
                                 cross-source recurrence counts
  data/help.ts                   the help door copy + UK/US/intl services,
                                 with VERIFIED (the date numbers were checked)
  hooks/useViceState.ts          load once, write on change, handler bag
  components/Ui.tsx              Panel/Field/Line/Scale/Chip/ChipBank/LineList…
  components/ViceHub.tsx         the front door
  components/ViceFlow.tsx        rail + step switch + toolbar + dialogs
  components/Tools.tsx           UrgeTool, LapseTool, CardTool
  components/HelpDoor.tsx        crisis, treatment demystification, services,
                                 barriers, and one if-then plan
  components/Voices.tsx          OneVoice (acute, inside the ninety seconds)
                                 and VoicesDialog (said / did, browsable)
  components/Tripwire.tsx        the rule for the good stretch
  components/steps/BasicSteps.tsx   intro, pickVice, safety, ruler, text, chips
  components/steps/PlanSteps.tsx    negotiate, ifthen, binding, refusal, voice,
                                    card, tape
  components/steps/DataSteps.tsx    log, window, missions, review
  components/steps/AwarenessSteps.tsx  count, usage, feedback, trajectory, doors
  components/steps/GivesSteps.tsx      beliefs, beliefTest, values, futures,
                                       letter
app/test/quit-vice/{,where,gives,map,experiment,line,week}/page.tsx
tests/unit/vice/viceService.test.ts      95 tests
tests/unit/vice/viceCopyLint.test.ts     12 tests
tests/unit/vice/testimonials.test.ts     14 tests
tests/unit/vice/researchIsShipped.test.ts 10 tests — the anti-demo guard
tests/e2e/quit-vice.spec.ts              45 tests
```

Entry point into Life Mastery: `src/goals/components/north-star/RoutineCard.tsx`
renders a link when `routine.blueprintId === "vices"`. The routine is a list of
days you hold a line, which is the right shape for a scoreboard and no help on
the evening you do not hold it — so it links out rather than trying to be this.

## How it is kept honest

- **`viceService.test.ts`** targets the decisions above rather than the getters:
  the ruler never comparing upwards, negation plans being refused, the counter
  being monotonic across a lapse, unlogged days staying unscored, the safety gate
  clearing on a vice change, and the date maths surviving the weeks the clocks
  change (done in local milliseconds, those come out a day short once a year).
- **`viceCopyLint.test.ts`** walks every user-facing string and fails on
  controlling language, diagnosis words, empty encouragement, a promised urge
  duration, double spaces, unbalanced quotes and missing terminal punctuation.
  It also asserts the rules catch violations when they are present, so the lint
  cannot quietly stop working. Four strings were rewritten to satisfy it rather
  than the rule being weakened.
- **The lint also fails on phrasing that reads as machine-written** — a fixed
  list of tells (`bannedMachineTells`) plus the "not just X but Y" shape. This
  is a trust rule rather than a style one: somebody deciding whether to believe
  a page about their drinking is reading for whether a person wrote it, and a
  page that sounds generated gets its numbers discounted along with its prose.
- **The awareness arithmetic is tested at the three places it could quietly
  start lying:** counting criteria belonging to a different vice's set after a
  switch (stale keys must not inflate a new count), inventing a band for a shape
  that has none, and dividing by a guess of zero (an `Infinity×` on screen is
  both wrong and trust-destroying). Waking days use a 16-hour day, not 24 —
  dividing by 24 counts sleep as spendable time.
- **`quit-vice.spec.ts`** walks every step of every flow asserting no console
  error and no empty screen, then the lifecycle: reload, cross-flow sharing,
  confirmed reset, and the gate actually gating.
- **`data-hydrated`** is set on the root of the hub and each flow once the client
  effect has run. The module is server-rendered, so every control is present and
  clickable-looking before React attaches a handler; this is the one signal that
  means the buttons do something.

## The research corpus

`docs/research/recovery-testimonials/` — fifteen independently-gathered sources,
178,000 words, 2,186 verified quotes, ~200 catalogued techniques, plus
`SYNTHESIS.md`. Every quote was verified as an exact substring of raw fetched
text, with attribution checked separately; that second pass matters, because two
agents found genuine quotes attributed to the wrong people and substring
matching does not catch it.

The verification caught, and discarded: one quote hallucinated by the page-fetch
layer, one composite stitched from two passages, one containing a phrase absent
from its source, and 53+ academic quotes that read as verbatim testimony but are
paraphrased by the papers' own stated policy.

**`researchIsShipped.test.ts` is the guard against the failure that produced all
this.** An earlier pass gathered the corpus properly and then wired fourteen
quotes and zero techniques into the product — every other test passed, because
nothing was *wrong*, it was just a demo. The test now fails if the product ships
less than a quarter of the usable corpus, if techniques exist only as prose, if
any user-facing stage is empty, if one source dominates, or if a dataset exists
in `src/` that no component imports.

## Dead controls

`tests/e2e/deadControls.spec.ts` clicks every visible, enabled control on the
hub in all three versions and on every step of every flow, and fails on any
that changes neither the DOM nor storage. It runs the probe *inside* the page
rather than through the driver, because a click-per-round-trip sweep of six
flows takes minutes and times out; in-page it is seconds.

It found two real faults on its first run:

- **"copy it all as text" latched.** Once clicked it read "copied" forever, so
  a second copy did nothing and looked broken. The confirmation now resets.
- **"Start" on every intro screen was inert.** It set a done-flag which, on a
  fresh state, `viceStateIsUntouched` did not count — so it was never
  persisted — and with the rail collapsed nothing visibly changed either. It
  now advances to the next step, and `stepDone` counts as touched state.

## Known gaps

- **No notifications.** The single strongest component-level result in this
  literature is a time-boxed daily task sequence delivered by push. The missions
  are here; the push is not, because a test page cannot send one. If this is
  promoted, that is the first thing to add.
- **Nothing is verified.** Face-to-face programmes that work tend to have
  somebody who checks — a CO monitor, a person. Everything here is self-report.
- **Boredom tolerance is the core skill for the screen-shaped vices, and a page
  on a phone is a poor place to build it.** That is a real contradiction in the
  product, not something the design solves.
- **The `map` flow's chart needs about ten entries to say anything.** Before that
  it is honest about having nothing to say, which is correct but not compelling.
- **Helpline numbers go stale, and a wrong crisis number is an active harm.**
  `help.ts` carries `VERIFIED` and renders it on screen. This was not
  theoretical: the US National Problem Gambling Helpline changed in September
  2025 after a court ruling ended NCPG's use of 1-800-GAMBLER, and the obvious
  number to have written would have been the dead one. Re-check on a schedule.
- **The locale picker is manual and only has three entries.** UK, US, and
  findahelpline.com for everywhere else. No detection, and nothing region-
  specific below national level.
- **The awareness flow is still self-report with no verification**, like the
  rest of the module, and its own evidence base is modest — personalised
  feedback runs about d=0.22 on drinking. It is in here for the picture it
  produces and the door it opens, not for a behaviour change effect.
- **No moderation path.** Every flow assumes stopping or a bounded break. Trials
  find no significant advantage for abstinence over moderation goals, and most
  people prefer a non-abstinence goal, so this is a real omission rather than a
  considered exclusion.
