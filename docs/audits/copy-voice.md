# Copy voice audit — Life Mastery (Plan / Track / Library / Guide)

Source of rendered text: `copy-audit.txt` (7 screens captured from the running app).
Policy: `docs/plans/life-mastery-canon.md` line 46 (v21) — **we speak in OUR voice. The source coach is internal grounding only: no guru name, no third-person "he/his/him" about him in user-facing copy.** Root lineage (Robbins, Eker, Chapman) may be credited once, plainly.

Scope note: code comments are out of scope. Every row below is a string that renders. A few live in conditional panels (`SinglePersonPanel`, `BeliefWorkPanel`, `BrainstormPanel`, `CourseCorrectionPanel`) that the 7-screen capture didn't reach — they are still shipped copy and are included.

---

## (a) VOICE-POLICY VIOLATIONS — third person about the coach

**Verdict on the "Guide is written about him" claim: confirmed, and it is worse than the Guide.** 29 rendering strings across 5 files. The Guide is the densest concentration (12), but the pattern also leaks into the belief-change exercise, the relationship panel, the brainstorm panel, the year-debrief, the course-correction panel, and every one of the guided session subtitles in `visionPlanService.ts`.

### A1 — The Guide screen (`src/goals/components/vision-plan/VisionPlanLab.tsx`)

| file:line | current string | what's wrong | replacement |
|---|---|---|---|
| VisionPlanLab.tsx:6343 | `Build it his way` | Page H1 is literally about a third party. Worst single instance in the product. | `Build it in order` |
| VisionPlanLab.tsx:6345 | `His order, one exercise at a time. He starts above your areas and works down — vision, then purpose, then who you are, and only then goals.` | Two `he`s in the page subtitle; also the em-dash-plus-list rhythm. | `One exercise at a time, top down: your vision, then your purpose, then who you are, and only then your goals.` |
| VisionPlanLab.tsx:6284 | `How he answered it` (`HisAnswer` label) | Renders next to every input on the Guide. The whole affordance is framed as a person. | `A worked example` |
| VisionPlanLab.tsx:6286 | `title="He never wrote a vision paragraph for this area — this is assembled from how he talks about it"` | Tooltip on the `reconstructed` badge. | `title="No written paragraph exists for this area — this is assembled from how it's described elsewhere"` |
| VisionPlanLab.tsx:6383 | `He does this in nature, or a library, or a coffee shop — anywhere he won't be interrupted.` | Third person, and it's advice we can just give. | `Nature, a library, a coffee shop — anywhere you won't be interrupted.` |
| VisionPlanLab.tsx:6419 | `gloss="He keeps the whole-life vision, purpose, identity and code of conduct as four separate documents and re-reads them together. This is his purpose document."` | Three third-person references in one gloss. | `gloss="Vision, purpose, identity and code of conduct are four separate documents, re-read together. This is the purpose one."` |
| VisionPlanLab.tsx:6436 | `He is blunt about this: purpose is decided, not discovered. If you're stuck, drop the word "passion" and ask what you actually enjoy — joy is the clue.` | Attribution scaffolding in front of a claim we're happy to make ourselves. | `Purpose is decided, not discovered. If you're stuck, drop the word "passion" and ask what you actually enjoy.` |
| VisionPlanLab.tsx:6441 | `gloss="His mission is one sentence with a BE and a DO in it, said daily. And the reason identity does the work:"` | | `gloss="A mission is one sentence with a BE and a DO in it, said daily. And the reason identity does the work:"` |
| VisionPlanLab.tsx:6444 | `If a belief contradicts the identity you just wrote, work it here — his procedure, and it asks whether the belief is USEFUL rather than whether it's true.` | `his procedure` + shouty `USEFUL`. | `If a belief contradicts the identity you just wrote, work it here. The question is whether the belief is useful, not whether it's true.` |
| VisionPlanLab.tsx:6455 | `Rename any area so the words pull you. His aren't "fitness" and "money" — they're "physical power" and "absolute financial freedom".` | | `Rename any area so the words pull you. Not "fitness" and "money" — "physical power" and "absolute financial freedom".` |
| VisionPlanLab.tsx:6471 | visible `his: {ex.renamedTo}` and `title={`His: ${ex.renamedTo}`}` | Inline label beside every one of the 12 rename inputs. | visible `e.g. {ex.renamedTo}`, title `Example: ${ex.renamedTo}` |
| VisionPlanLab.tsx:6298 (via `EXEMPLAR_ERA_LABEL`) | `his earlier plan` / `his mid-period plan` / `his latest plan` / `his current self-assessment` | Every quote in the Guide is stamped with one of these. | `an early version` / `a middle version` / `the latest version` / `a current self-assessment` — defined at `lifeMasteryExemplar.ts:33-36` |

### A2 — Guided-session copy (`src/goals/visionPlanService.ts`)

These are the `why` lines rendered under each open session (VisionPlanLab.tsx:6374) and the sitting warning (6351).

| file:line | current string | replacement |
|---|---|---|
| visionPlanService.ts:1122 | `He calls this the first step, before any of the work. In a bad state the answers don't come.` | `This is the first step, before any of the work. In a bad state the answers don't come.` |
| visionPlanService.ts:1125 | `Good strictly first, and no "but" — saying it cheapens the win. He treats this as a prerequisite to setting anything new.` | `Good strictly first, and no "but" — saying it cheapens the win. Do this before setting anything new.` |
| visionPlanService.ts:1143 | `He chunks every yearly goal into 90-day and monthly targets, with the arithmetic done.` | `Every yearly goal breaks into 90-day and monthly targets, with the arithmetic done.` |
| visionPlanService.ts:1149 | `Set-and-forget is the failure he names most often. Signing starts the loop, it doesn't end the work.` | `Set-and-forget is the most common failure. Signing starts the loop; it doesn't end the work.` |
| visionPlanService.ts:1192 | `That's over two hours left. He'd tell you to do a couple of these and come back — "if you can't handle five, start with one."` | `That's over two hours left. Do a couple and come back. If five is too many, do one.` |

### A3 — Elsewhere in the product

| file:line | current string | replacement |
|---|---|---|
| VisionPlanLab.tsx:5842 | `He ran this himself — 2,000 approaches in a year at eighteen. It moves on reps, not on feeling ready. And you end every interaction yourself, which is what he means by "there's no rejection".` | `It moves on reps, not on feeling ready — 2,000 approaches in a year is a real number someone has done. You end every interaction yourself, so there's nothing to be rejected from.` |
| VisionPlanLab.tsx:5884 | `His volume, as a default` (section label) | `A starting volume` |
| VisionPlanLab.tsx:5887 | `Where he went: {APPROACH_VENUES}` | `Where this works: {APPROACH_VENUES}` |
| VisionPlanLab.tsx:5893 | `After a session — his debrief questions` | `After a session — the debrief questions` |
| VisionPlanLab.tsx:5913 | `Reading he actually prescribes for this: {SINGLE_BOOKS}.` | `Reading for this: {SINGLE_BOOKS}.` |
| VisionPlanLab.tsx:6065 | `His order — approach first, letting go last. Most goals need the first one.` | `In order — approach first, letting go last. Most goals need the first one.` |
| VisionPlanLab.tsx:6175 | `A number beside each one: how many years out is this? He writes 1, 3, 5, 10 or 20. Only the 1s become this year's goals.` | `A number beside each one: how many years out is this? Use 1, 3, 5, 10 or 20. Only the 1s become this year's goals.` |
| VisionPlanLab.tsx:6265 | `Careful with "but" — his rule: saying it cheapens the win. Let the good stand on its own; the challenges get their own list.` | `Careful with "but" — it cheapens the win. Let the good stand on its own; the challenges get their own list.` |
| lifeMasteryBeliefs.ts:48 (renders at VisionPlanLab.tsx:6010) | `His worked example: "I don't have time" becomes "I have an abundance of time for whatever I'm committed to." Note it doesn't deny reality — it relocates the problem to commitment.` | `Worked example: "I don't have time" becomes "I have an abundance of time for whatever I'm committed to." It doesn't deny reality; it moves the problem to commitment.` |
| lifeMasterySingle.ts:43 (renders at VisionPlanLab.tsx:5868) | `The target isn't attraction, it's the act of walking up to a stranger. He starts people here on purpose: how do you eat an elephant? One bite at a time.` | `The target isn't attraction, it's the act of walking up to a stranger. Start here on purpose — one bite at a time.` |
| lifeMasterySingle.ts:67 (renders at VisionPlanLab.tsx:5879) | `Don't memorise it. He's explicit that a memorised line is the wrong thing — the softener is a shape, and the words should be yours.` | `Don't memorise it. A memorised line is the wrong thing. The softener is a shape; the words should be yours.` |
| lifeMasterySingle.ts:99 (renders at VisionPlanLab.tsx:5902) | placeholder `His actual journal question — attention on her experience, not your performance` | `Attention on her experience, not your performance` |

---

## (b) EXPOSED MACHINERY

| file:line | current string | what's wrong | replacement |
|---|---|---|---|
| VisionPlanLab.tsx:9516 | `Your goals — you are the author; AI drafts are suggestions to edit or delete` | Renders as a shouty all-caps banner. Names our implementation, hedges legally, and pre-apologises. The user does not need to be told what an AI draft is. | `Your goals` — and put the caveat once, quietly, under the section: `Drafted from what you wrote. Edit or delete any of them.` |
| VisionPlanLab.tsx:9518 | `Redraw AI suggestions` | Button labelled after the machine. | `Draft again` |
| VisionPlanLab.tsx:5388 | `The Goal Workshop — you author these` | "you author these" is a rebuttal to a complaint the user hasn't made. Proper-noun'd internal feature name. | `Your goals for this year` |
| VisionPlanLab.tsx:9186 | `Counting which of the 12 life areas this lights up — done when the coach finishes drafting below.` | Narrates our own async job. | `Counting which life areas this covers…` |
| VisionPlanLab.tsx:9943 | `Your 10s live in the rooms now — 4 of 12 written.` | Changelog leaking into UI. "now" is meaningless to a user who never saw the previous build. | `4 of 12 rooms have a 10 written.` |
| VisionPlanLab.tsx:9962 | `Your plan only contains what your vision asked for — these are the usual high-leverage habits.` | Explains why our generator produced what it produced. | `Common habits you can add to the plan.` |
| VisionPlanLab.tsx:5907 | `Notes here are for the session you just did — they aren't saved yet.` | Ships an unimplemented-feature disclaimer in the product. | Either persist them or cut the panel. Interim: `These notes aren't saved.` |
| VisionPlanLab.tsx:9393 | `Your plan is live — this returns you to it.` | Explains what a button does after the button already says it. | Cut. The button says `Update plan & back to tracking`. |
| VisionPlanLab.tsx:2212 | `Or see a filled example first — it's easier to write yours after reading one` | Reasoning-out-loud tacked onto a button label. | `See a filled-in example` |
| VisionPlanLab.tsx:6487 | `This one happens in the plan itself, where your goals live.` | | `This one happens in the plan.` |

---

## (c) EPIGRAM / TONE

### C1 — The systematic source: `PRINCIPLES[*].teaser`

`src/goals/data/lifeMasteryPrinciples.ts` defines 16 principle cards, and **every one has a `teaser` field whose job is to be an aphorism.** This is the single biggest generator of "AI text" in the product — it is an architected epigram slot. Rendered as `Why the why — Reasons are the fuel…` etc.

**Structural recommendation: the `teaser` field should say what the card contains, not deliver a maxim.** Rewrites:

| line | current teaser | replacement |
|---|---|---|
| :25 | `Knowing → doing → living. The plateau is the gate, not the wall.` | `What mastery means here, and why progress flattens before it moves.` |
| :35 | `The dabbler quits at the plateau. The master decided not to.` | `What you're committing to, and why it covers all twelve areas.` |
| :45 | `Dream freely first — but your values judge every goal before it becomes your life.` | `How to rank your values, and what the ranking then decides for you.` |
| :55 | `You can't hit a target you can't see — and dim targets don't pull.` | `Write the ten-year picture with no realism applied. Realism belongs in this year's goals.` |
| :65 | `Reasons are the fuel — the vision is just the destination.` | `Write why you want it. More reasons make it easier to keep going.` |
| :75 | `You will not outperform who you believe you are.` | `Decide who you're being before deciding what to do.` |
| :85 | `A rating without a reference is a mood, not a measurement.` | `Write what a 10 looks like for you, so the weekly rating means something.` |
| :95 | `A goal you don't believe at 7+ — and want at 7+ — is a wish.` | `Every goal needs belief 7+ and desire 7+. Below either, reshape it.` |
| :105 | `Total balance is a myth. Strategic imbalance, honestly chosen, is the move.` | `Pick 1-3 areas per season. The rest hold at a maintenance floor.` |
| :115 | `You don't hope for a good day. You manufacture one.` | `An ordered sequence you run every morning — mind, body, spirit.` |
| :125 | `You can finish every task and still achieve nothing.` | `Plan the day as 3-5 results instead of a to-do list.` |
| :135 | `Measure weekly and the worst you can have is a bad week.` | `Score every area once a week, then commit next week's outcomes.` |
| :145 | `Wins celebrated first, failures owned honestly, lessons turned into systems.` | `Once a month: every goal's number against its target, with a reason for each miss.` |
| :155 | `Whatever gets rewarded gets repeated — so reward today, tonight.` | `Two questions and a score, at the end of the day.` |
| :165 | `You can't plan your way out of a state. Change the state first.` | `Sixty-second protocols for cravings, panic, paralysis and rough days.` |

The `trap:` field is a second epigram slot (`It's weather. Run the protocol; the plan is still there.` / `A vision you already believe is just a forecast.`). Inside an expanded teaching card this is more defensible — but there are 16 of those too, and they all land on the same rhetorical beat. Cut the second sentence of each `trap` and keep the first.

### C2 — Epigrams in the UI chrome

| file:line | current string | what's wrong | replacement |
|---|---|---|---|
| VisionPlanLab.tsx:2261 | `6 of 12 rooms begun. An even wheel isn't the goal — a moving one is.` | Progress counter with an aphorism stapled to it. | `6 of 12 rooms begun.` |
| VisionPlanLab.tsx:2070 | `One to three areas at a time. Everything else drops to a maintenance floor — on purpose, with your consent. That's not neglect, that's how you actually move one.` | Textbook AI rhythm: em-dash aside, then "That's not X, that's Y". | `One to three areas at a time. Everything else drops to a maintenance floor you set.` |
| VisionPlanLab.tsx:8957 | `Design the mornings, size the week honestly, then sign. Signing is where the planning stops and the living starts.` | Three-verb list, then an epigram. | `Design the mornings, size the week, then sign.` |
| VisionPlanLab.tsx:6610 | `Everything you wrote, read back whole. Re-reading is the practice — this is where you do it.` | | `Everything you wrote, in one place, to read back.` |
| VisionPlanLab.tsx:873 | `Amber = under 7. The trend matters more than any single week — ups and downs, but the line goes up.` | | `Amber = under 7. Watch the trend, not the single week.` |
| VisionPlanLab.tsx:5565 | `A season of focus is fine; an accidental collapse isn't. Write the floor, keep the floor.` | Semicolon antithesis + repetition-for-effect. | `Set a floor for each area that isn't in focus, so nothing collapses while you push.` |
| VisionPlanLab.tsx:3383 | `Ask it on purpose, all day — the mind answers whatever it's asked.` | | `Ask it on purpose, through the day.` |
| VisionPlanLab.tsx:8631 | `{n} done today — celebrate each one as it lands: smile, pat on the back, out loud "good job." What gets rewarded gets repeated.` | Counter + instruction + maxim in one line. | `{n} done today. Mark each one as it lands — say "good job" out loud.` |
| VisionPlanLab.tsx:8626 | `Tip: star 3-5 "must" items and do them FIRST — willpower is highest in the morning; win those and the day is a win.` | `Tip:` prefix, shouty FIRST, two-clause payoff. | `Star 3-5 musts and do them first — willpower is highest in the morning.` |
| VisionPlanLab.tsx:593 | `Dashed ring = level 7 — the FLOOR, not the aim: push every area toward 8-9-10.` | | `Dashed ring = level 7. That's the floor — aim higher.` |
| VisionPlanLab.tsx:9202 | `…No pressure today; dark rooms just shouldn't be invisible.` | Reassure-then-reverse. | `…You can leave them for later.` |
| VisionPlanLab.tsx:9195 | `This lights up 6 of 12 life areas — the standard here: a vision for every room, even one sentence.` | "the standard here" is us lecturing. | `This covers 6 of 12 life areas. Aim for a line in every room, even one sentence.` |
| VisionPlanLab.tsx:2217 | `Before you start: 2 minutes to get in state — never skip this part` | "never skip this part" is a command dressed as a link label. | `Before you start: 2 minutes to get in state` |
| VisionPlanLab.tsx:2280 | `+ Add a room of your own — your life, your map` | Slogan appended to a button. | `+ Add a room of your own` |
| VisionPlanLab.tsx:8619 | `The delegation pass — after the musts are starred, ask of each could-do: "who says I have to do this?" A VA, Fiverr, a friend. Delegated = off the plate, not on a someday list.` | Long teaching paragraph sitting on top of a task list, ending on a definition-epigram. | `After the musts are starred, ask of each could-do: who says I have to do this? Hand it off — a VA, Fiverr, a friend.` |
| VisionPlanLab.tsx:5510 | `The document behind everything — one area at a time. Name it so it drives you, define your 10, write the why, claim the identity, and give it goals. Every area, not just the loud ones.` | Five-verb list plus a closing jab. | `One area at a time: name it, define your 10, write the why, claim the identity, add goals.` |
| VisionPlanLab.tsx:5634, :5951-ish (repeats per area) | `Name it so it drives you — a flat label doesn't pull; a name like "Physical Power" does. Click the name to change it.` | Repeats on every area card in the Library; semicolon antithesis. | `Click the name to rename it — "Physical Power" pulls harder than "Fitness".` |
| VisionPlanLab.tsx:9422 | `Which room, conquered, lifts all the others? Its goals move to the front of the schedule and your weekly reviews lean on it — everything else stays in the plan at a steadier pace.` | | `Which room, if you fixed it, lifts the others? Its goals go first in the schedule; the rest continue at a steadier pace.` |
| VisionPlanLab.tsx:9659 | `Belief 10/10? It might be too safe — the calibration sweet spot is 80-90% sure: big enough that it stretches you, close enough that you'll swing.` | Colon + double-clause payoff. | `Belief 10/10 may mean the goal is too safe. Aim for 80-90% sure.` |
| VisionPlanLab.tsx:9231 | `How you start the day decides how the day goes. An ordered sequence you run every morning — it lives above your goals on the Track view and doesn't count against your daily habit budget.` | Maxim, then two unrelated mechanics glued on with an em-dash. | `An ordered sequence you run every morning. It sits above your goals on Track and doesn't count against your daily habit budget.` |
| VisionPlanLab.tsx:3876 | `Step 1 — audit your CURRENT morning first (you already have a ritual; you just didn't design it)` | Shouty CURRENT + gotcha parenthetical. | `Step 1 — write down what your morning actually looks like now` |
| VisionPlanLab.tsx:3952 | `Read it. Which 2-3 morning acts would make THAT person inevitable? Pick those below — the ritual serves the vision, not the other way round.` | Shouty THAT, plus a chiasmus. | `Read it. Which 2-3 morning acts would get you there? Pick those below.` |
| VisionPlanLab.tsx:8830 | `Read it bottom-up: each row CARRIES the ones above it. Broken health drains your mind; a shaky mind poisons your emotions; wrecked emotions strain the relationship — and so on to the top.` | Three-clause escalating cascade — the most AI-sounding sentence in the file. | `Read it bottom-up: each row carries the ones above it. Health holds up your mind, your mind holds up your emotions, and so on to the top.` |
| VisionPlanLab.tsx:8853-8854 | `Click a row of the pyramid to inspect that part of your life —` / `its rating trend, your 10, the goals feeding it, and a one-tap fix when it's weak.` | Sentence deliberately broken across an em-dash into two DOM nodes; four-item list. | `Click a row to see its rating trend, your 10, and the goals feeding it.` |
| VisionPlanLab.tsx:5819 | `The work is completely different depending on the answer, so the area asks rather than assuming.` | The UI justifying its own question. | Cut. |
| lifeMasteryPrinciples.ts:235,247,259,271,283 | SOS `closer` fields: `One day at a time. Never say 'never again' — just not this hour.` · `Consistency beats duration. One minute done is a win — celebrate it like one.` · `Your head is for strategy — it's terrible at happiness.` · `A bad day is weather, not a verdict.` · `You don't argue with a weed — you pull it and plant something in the hole.` | Five more architected epigram slots. These are the one place a closing line is arguably earned (end of a crisis protocol) — but all five hit the identical "X isn't Y, it's Z" beat. | Keep at most two. Rewrite the rest as instructions: `Not this hour. That's the whole commitment.` / `One minute done still counts.` / `Give it ten minutes before you decide anything.` |

### C3 — Shouty all-caps used as headers

These are sentence-case strings rendered through `uppercase tracking-[0.14em]`. They are *field labels* — the label sits directly on top of the input it names — but they render at the same visual weight as section headings, so a goal card reads as eight shouted commands in a row.

| file:line | rendered | fix |
|---|---|---|
| VisionPlanLab.tsx:9579 | `SAY IT LIKE IT'S DONE` | Drop `uppercase` on field labels; keep it only on the section rules (`YOUR GOALS`, `YOUR DRIVING FORCE`). Label becomes `Say it like it's done`. |
| VisionPlanLab.tsx:9588 | `YOUR WHY — NOBODY WRITES THIS FOR YOU` | `Your why` — the "nobody writes this for you" is a defensive aside about our AI drafting. Cut it. |
| VisionPlanLab.tsx:9599 | `…CREATING WHAT FEELING?` | `Creating what feeling?` |
| VisionPlanLab.tsx:9609 | `AND IF YOU DON'T? — THE PAIN-WHY` | `The pain-why — and if you don't?` |
| VisionPlanLab.tsx:9699 | `PRE-MORTEM — WHAT WILL TRY TO STOP YOU?` | `What will try to stop you?` |
| VisionPlanLab.tsx:3270 | `REASON WORDS — THE MORE REASONS, THE MORE FUEL` | `Reason words` |
| VisionPlanLab.tsx:2870 | `ENGINEER YOUR RULES — WHEN DO YOU GET TO FEEL YOUR VALUES?` | `Your rules — when do you get to feel each value?` |
| VisionPlanLab.tsx:3353 | `CODE OF CONDUCT — HOW YOU'RE COMMITTED TO SHOWING UP` | `Code of conduct` |
| VisionPlanLab.tsx:3379 | `YOUR PRIMARY QUESTION — THE ONE YOUR MIND ASKS ON LOOP` | `Your primary question` |
| VisionPlanLab.tsx:3318 | `YOUR MISSION — ONE SENTENCE, SPOKEN DAILY` | `Your mission` (keep "one sentence, spoken daily" as the placeholder) |
| VisionPlanLab.tsx:8244 | `YOUR DRIVING FORCE — READ IT EVERY MORNING` | Legitimate section header; keep caps, keep the instruction. |

Rule of thumb to apply: **caps = section rule. Field labels get sentence case, and the explanation moves into the input's placeholder.**

---

## (d) DUPLICATION

| what | where | fix |
|---|---|---|
| The Life Mastery Blueprint explainer, near-identical, on two screens | `VisionPlanLab.tsx:9926-9934` (Plan/your-life, ~90 words) and `VisionPlanLab.tsx:8829-8832` (Track, ~70 words). Both explain bottom-up ordering, both explain spirituality-as-circle, both explain dim rows. | Write it once. Long version lives in the Library/method page; both screens get one line: **Plan** → `Read bottom-up — each row carries the ones above it. Dim rows are areas your plan doesn't feed yet.` **Track** → `Read bottom-up. Brightness is your latest weekly rating. Click any row.` |
| The pyramid caption repeats the paragraph immediately above it | `VisionPlanLab.tsx:701-702` — `Brightness = your latest rating per row. Click any row to inspect it — the base carries everything above it.` sits directly under 8829-8832, which just said all three of those things. | Cut the caption entirely. |
| The 1-3 focus-areas explanation appears three times, reworded | `VisionPlanLab.tsx:2070` (Plan/rooms), `:9422` (Plan/your-life), `:5522` (Library) — all say "which area, conquered, lifts the others / the rest drop to maintenance, on purpose, with your consent". | One canonical sentence, reused verbatim from a constant: `Pick 1-3 areas for this season. The rest hold at a floor you set.` |
| `on purpose, with your consent` | `:2070` and `:5522` | Keep at most one. It's a distinctive phrase and repeating it twice makes it read as a slogan. |
| `Name it so it drives you…` | `:5510` (Library intro) and `:5634` (repeated per area card, so it appears up to 12× on one screen) | Keep the intro; make the per-card version a tooltip on the name, not body copy. |
| Rooms header text is byte-identical across `01_plan_rooms` and `02_room_open` | same component | Fine — same screen, expected. No action. |

---

## Voice rules

Derived from the lines in `copy-audit.txt` that already read like a person wrote them — the ritual step names (`Big glass of water`, `Read your vision out loud`, `Make your bed`), the goal chips (`On pace`, `Ahead`, `behind on this? →`), the weekly-review summaries (`Honest baseline. Money and fun are the weak rooms.`), the stake menu (`Eat a raw onion`, `Flip phone for a month`), the area sub-labels (`Energy, Vitality, Well-Being`).

1. **Say the thing, then stop.** No closing line that reframes what you just said. If a sentence's last clause exists to land a point rather than add information, delete the clause.
2. **One idea per sentence, one em-dash per screen.** Where you have three clauses, you have three sentences — or two ideas too many.
3. **Never "That's not X, that's Y."** Also banned: "X isn't the goal — Y is", "not a Z, the thing that Ws", "A without B is C". These are the four shapes doing most of the damage.
4. **The method is ours; state it in the imperative.** `Purpose is decided, not discovered.` Not `He is blunt about this: …`. No third-person attribution anywhere a user can see it. Lineage (Robbins, Eker, Chapman) gets one plain credit in the method page and nowhere else.
5. **Never name the machine.** No "AI drafts", "suggestions", "redraw", "the coach is drafting". Say what the user gets: `Drafted from what you wrote. Edit or delete any of them.`
6. **Labels label, they don't teach.** A field label is 1-4 words in sentence case. Any explanation that fits goes in the placeholder; anything longer belongs in the method page, not stacked above the input.
7. **Caps are structural, not emphatic.** All-caps marks a section rule. Never CARRIES, FIRST, THAT, CURRENT, USEFUL mid-sentence — if a word needs stress, rewrite so it doesn't.
8. **State counters plainly.** `6 of 12 rooms begun.` `4 of 12 rooms have a 10 written.` No commentary attached to a number, and never the word "now" — the user has no previous version to compare against.
9. **Don't explain the product to itself.** Cut any sentence whose subject is the app ("the area asks rather than assuming", "this returns you to it", "these notes aren't saved yet"). If it's a limitation, fix it; if it's a behaviour, the UI already shows it.
10. **Say it once.** Any explanation appearing on two screens is a bug. Pick the screen where the user actually needs it, and make the other one a single line.
