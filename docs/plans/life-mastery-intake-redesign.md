# Life Mastery Intake — Vision-First Redesign

**Status:** BUILT 2026-08-03. 2,215 unit tests green. `scripts/dev/vision-plan-walk.mjs` completes all four pages on a fresh state with 0 BREAK / 0 ODD.

> **First report of this plan was wrong.** It claimed M0 to M5 done when only pages 1 and 2 existed. Pages 3 and 4 were the old editors under new headings, with gates asking for state their screens never wrote, so page 3 could not be completed at all. The verification passed because it clicked "I'm not sure yet" past the very question that had no control. What follows is the corrected record. · **Target:** `/test/vision-plan`, `create` mode only
**Replaces:** the rooms-first create flow (`rooms → lifewide → commit`)
**Leaves alone:** `track`, `library`, `guide`
**Research basis:** `docs/plans/life-mastery-canon.md` plus fresh verification on 2026-08-02/03 against the 374-transcript corpus (`~/.cache/lm-corpus/text`) and the live blog. Every question below carries a video id.

---

## Part 1 — Human explanation

### The problem with the order

Our create flow drops you into per-area rooms first. Pick health, write a dream, rate it. The life-wide vision comes later, at the "Your life" stage. He does the opposite, and he says why:

> "the reason why you got to start with that is because the vision provides the context of what your goals are going to be… if you don't have that big picture vision that excites you then maybe your goals over the next year aren't going to excite you" (`o36Mu7SVdLY`)

On the whiteboard he numbers it out loud: *"let's put number one, Ultimate Vision"*, then purpose, then identity, then code of conduct, and he calls those four *"the driving force"*. Only after that does he break life into areas and set goals (`8kco2rjijjE`).

So today we ask you to rate a life area against an ideal we never asked you to write. That is the confusion.

### The problem with the writing

418 user-facing strings, and 187 of them contain an em-dash. 25 use the "X, not Y" construction. It reads like a machine wrote it, because a machine did.

His own voice is nothing like that. Across 42,000 sampled words he says "you" 42 times per thousand. He writes in short plain clauses joined by "and" and "so". He repeats the noun instead of reaching for a pronoun. He never does antithesis. He sounds like this:

> "I want you to spend some time and journal and write it out hour by hour. First maybe imagine and see it and ask yourself these questions."

> "take the time to give yourself that gift and get clarity of your life, how you want your life to be"

**The voice rules, enforced by lint:**

1. Say "you". Second person, direct.
2. One idea per sentence. Short sentences.
3. No em-dashes. Use a period, or "and", or a comma.
4. No "X, not Y". Say the thing you mean and stop.
5. No "it's not about X, it's about Y".
6. Repeat the noun. Don't reach for a clever pronoun.
7. Plain verbs. Write it out. Take the time. Ask yourself. Pick one.
8. Warm, not clever. No aphorisms we made up.
9. His questions appear verbatim, in quotes, with the video id in the data file.

### The flow: four scrolls, not thirteen clicks

You asked for stepwise without the clunk. The order stays his. The clicking goes away.

Instead of 13 screens with a Next button, there are **four pages you scroll**. Inside a page the questions reveal one at a time as you answer, and the answered ones stay visible above you, so you watch the thing assemble.

```
Page 0  LOOK BACK             only if you have a year behind you to look at
Page 1  WHAT MATTERS          commit to mastery · what's been most important
Page 2  WHERE YOU'RE GOING    vision · purpose · identity · code · values re-design
Page 3  YOUR AREAS            pick and name them · your 10 and your 0 · purpose · identity
Page 4  WHAT YOU'LL DO        goals · qualify each one · could-do to 80/20 to chunks · sign
```

### Page 0, and why the year debrief comes first

He is explicit that you debrief the year before you touch goals, and that you re-read the vision in between:

> "before you even decide to set your goals for 2018 and beyond you really got to make sure that you reflect on the previous year, you've got to debrief it" (`2fDYApReHWc`)

> "once you've reflected on this previous year now you want to start thinking about the future… so before I set goals for a year, the first thing I always do is I really reflect on my vision. My ultimate vision for my life. So I believe that the goals that we set every year, those are just the milestones, the stepping stones that lead us to the ultimate vision." (`JZnLIuW7NQw`)

So the annual order is **debrief, then vision, then goals**. His three questions, verbatim:

1. "what was all the good that happened?" Great moments, victories, wins, good decisions you made, things you're proud of.
2. "what were the challenges, and also what are the solutions? what can you do better?"
3. "what did you learn this last year? what were the most valuable lessons, insights, learnings?"

He calls this the same review at every scale: *"this could be like a weekly ritual that you do, a monthly or a yearly one."* It is already in the app as the weekly and monthly reflection, so page 0 reuses it rather than adding a fourth copy.

**Two entry paths, because they are genuinely different:**

- **First run.** You have nothing in the system to debrief and no vision yet. Page 0 is offered but skippable in one click, and it asks you to look back at your actual life rather than at app data. Then you build the vision from scratch on page 2.
- **Annual re-run.** Page 0 is required and pre-filled with evidence the app already holds, which is the "relive the year" step. Page 2 then opens with your existing vision on screen to re-read and adjust, not with an empty box. Pages 3 and 4 re-run against it.

The existing `yearDebrief` state field already holds `{good, challenges, lessons}`, so page 0 writes into a field that is already there.

How it feels:

- **No Save button.** It saves as you type.
- **No Next button inside a page.** Answer a question and the next one appears below it and slides into view. Three page transitions in the whole intake, not thirteen.
- **Tab and Enter move you forward.** Typing is the whole interaction.
- **Stuck? "I'm not sure yet" is an inline link** under every question. It moves you on and leaves the question open so you can come back.
- **The rail at top shows the four pages** and doubles as jump-back nav once a page is done.
- **Page 2 is the payoff.** Vision, purpose, identity and code assemble on one scroll into a single card you can read top to bottom. That card is the driving force, and it's what the weekly review re-reads.

Because the light values question and the vision now live on the same scroll, the "values bracket the vision" idea reads as one continuous thought instead of two separate ceremonies.

### Each question on screen

Every question renders the same four slots:

| Slot | What goes there |
|---|---|
| The question | his words, verbatim |
| Why you're being asked | one or two lines, from the existing `PRINCIPLES` cards |
| A worked answer | his own, quoted, from `lifeMasteryExemplar.ts` |
| Two or three examples | ordinary answers, labelled as examples so nobody copies them |

The questions:

- **Vision.** "imagine as if there's no limits. If a magician were able to come along and create the perfect life for you, what would that be?" (`8kco2rjijjE`). Optional on-ramp, the Perfect Day: write it hour by hour, from the moment you wake up to the moment you go to bed, where you live, what you'd feel, who you share it with (`9RxHchflvVs`).
- **Purpose.** "why do I want this? what reasons do I have to actually make this happen and follow through?" (`8kco2rjijjE`)
- **Identity.** "Who am I committed to being? If I were to look my name up in the dictionary, what would it say about me?" (`8kco2rjijjE`)
- **Code of conduct.** "how you're committed to showing up. Standards you have set to live your life by." His own list ships as the worked answer (`8kco2rjijjE`).
- **Values.** "What's been most important to me in my life?" then "What else?" on a loop. Convert means to ends, so family becomes love and money becomes freedom. Rank them against each other. Then the away-froms: "what emotional states am I trying to avoid?" Then read the conflicts off the ordering (`Lp_GOrM16Xc`, `NidJpDcCkQs`).
- **Your 10 and your 0.** "what is the ten for you, and then what is a zero for you? Where are you right now?" (`wqJ-2N5KVOU`). Get specific the way he does for health: how much would you weigh, what would your body fat be, how would you want to feel (`8kco2rjijjE`).
- **Goals.** The sentence is "I will easily [what, quantified] to [purpose] creating [feeling] by [date]", and you can add "and enjoy the process". He explains every word: "'I' means I'm taking responsibility. 'will' ensures that you're actually going to be doing it. 'easily' changes the way it feels." (`GXhPOncX8CA`). Horizon rule: the vision is 10 or 20 years out and can seem crazy, the goals have to be attainable and realistic (`2V06cH1z3Qo`).
- **Belief and desire.** Both rated out of 10, both need to be around 7 or 8. "that you have that 7-8 in 10 level of belief and that desire for it, that's the sweet spot" (`GXhPOncX8CA`). Below that, shrink the goal.
- **Action plan.** "I don't just create a to-do list. I create a could-do list… 'could' as a keyword because then you're opening up your mind to different options and possibilities." Then 80/20 it, because "20% of that list will yield 80% of the results" (`AuRE42mCwlU`, `JZnLIuW7NQw`).

### Fidelity ledger: what's his, and what's ours

You asked whether it's all true to form. Most of it is. These three things are ours, and you should know that before we build them.

| Element | Verdict |
|---|---|
| Vision before goals, and the four driving-force pieces in that order | **His**, verbatim, `8kco2rjijjE` + `o36Mu7SVdLY` |
| Magician question, Perfect Day, dictionary question, code of conduct | **His**, verbatim |
| Values elicitation, means to ends, ranking, away-froms, conflict audit | **His**, `Lp_GOrM16Xc` + `NidJpDcCkQs` |
| Your 10 and your 0 together | **His**, `wqJ-2N5KVOU` |
| "I will easily…" and the word-by-word rationale | **His**, `GXhPOncX8CA` |
| Belief and desire both around 7-8 | **His**, `GXhPOncX8CA` |
| Could-do list, 80/20, chunk to 90 and 30 days | **His**, `AuRE42mCwlU` + `JZnLIuW7NQw` |
| Debrief the year before the vision, and the vision before the goals | **His**, `2fDYApReHWc` + `JZnLIuW7NQw` |
| The three debrief questions, and reusing them weekly and monthly | **His**, `JZnLIuW7NQw` |
| **The light values question before the vision** | **Ours.** He never teaches a values pass before vision. His blog calls values foundational, his life-plan video leaves them out entirely. Asking one light question up front and doing the real work after the vision is our reconciliation of those two sources. Defensible, but it is our call, not his. |
| **Splitting the session into four pages** | **Ours.** He teaches it as one sitting with the blog post open beside you, revisited every week. The four pages are packaging. |
| **Gating: a question must be answered before the next appears** | **Ours.** He gates nothing. This is a product decision to keep people moving, which is why "I'm not sure yet" has to work everywhere. |

### What is not changing

Track, library, guide, the weekly wheel, monthly reports, RPM, rituals, year in review. All of it keeps working. This is an intake redesign.

### Risk

⚠️ **This replaces a shipped flow, and sandbox plans live in `localStorage`.** Someone mid-plan must not lose their work. M0 handles it: `deriveIntakePosition` reads whatever data already exists and drops a returning user at the first unanswered question with everything else intact. It has a regression test, and that test gates every milestone after it.

---

## Part 2 — AI execution

### Files

| File | Action |
|---|---|
| `src/goals/data/lifeMasteryIntake.ts` | NEW. The four pages and their questions: id, page, his question, principle key, his worked answer with videoId, examples, `answered(state)` predicate. |
| `src/goals/types.ts` | Extend `VisionPlanState`: `intakeSeen?: string[]`, `yourZeros?: Record<string,string>`, `codeOfConduct?: string[]`, `goalQualification?: Record<string, {desire:number; reward:string; consequence:string; premortem:string}>` |
| `src/goals/visionPlanService.ts` | `INTAKE_PAGES`, `deriveIntakePosition(state)`, `revealedQuestions(state, page)` |
| `src/goals/components/vision-plan/VisionPlanLab.tsx` | Refactor create mode in place. |
| `src/goals/data/valuesFramework.ts` | Split the exercise into `audit` (one question) and `redesign` (the full pass). |
| `tests/unit/goals/lifeMasteryCopyLint.test.ts` | Add the mechanical voice rules. |
| `docs/plans/life-mastery-canon.md` | Update USER JOURNEY and BUILD LEDGER. Resolve the `yourZeros` open question to BUILT. |

### Anchors in `VisionPlanLab.tsx`

- `7135` `type CreateStage` → `type IntakePage = "matters" | "going" | "areas" | "doing"`
- `7431` `useState<CreateStage>("rooms")` → `useState(deriveIntakePosition(state))`
- `6154-6212` `StageRail` → `IntakeRail`, four pages, done pages clickable
- `10486` `stage === "lifewide"` block → source the driving-force editors, move to page 2
- `9989` `stage === "rooms"` block → page 3
- `10299` `stage === "commit"` block → end of page 4
- `11094-11120` footer nav → three page transitions only, no per-question Next
- `2244` `AREA_WANT_PROMPTS` → keep, add the 0-prompt per area
- `3480-3660` identity and code-of-conduct editors → extract, reuse on page 2
- `2726-3060` values `Phase` machine → split, `elicit` on page 1, the rest on page 2

### Reveal mechanics (the anti-clunk requirement)

- `revealedQuestions` returns every question up to and including the first unanswered one. Answering re-runs it and the next block mounts.
- New block mounts with `scroll-margin-top` and a single `scrollIntoView({behavior:"smooth", block:"nearest"})`. Never scroll-jack a block already on screen.
- Autosave on a 400ms debounce into `SANDBOX_KEY`. No Save button anywhere.
- Enter commits a single-line field and reveals the next. Textareas need Cmd/Ctrl+Enter.
- "I'm not sure yet" writes the question id into `intakeSeen` without a value, which reveals the next question and leaves the field open with a quiet marker.
- Respect `prefers-reduced-motion`: no smooth scroll, no slide-in.

### Second pass, 2026-08-03: what was actually broken

| Defect | Fix |
|---|---|
| The intake's first question, "Are you committing to this?", had no control at all. `renderIntakeInput` returned `null` for `kind: "custom"`. | Real commit control with a date and an undo. The `default` branch now throws in development rather than rendering an empty card. |
| `values_redesign` was the same dead end, and it was also *required*, so page 2 could not be left after filling every visible field. | Wired to the existing `ValuesJourney`, and marked optional. A multi-phase side exercise is not the price of leaving a page. |
| Page 3 gates asked for `areaRank`, a 10, a 0 and an area purpose, counted across different areas. Doing one area properly still left Next disabled. | One gate: any single area with both ends written. |
| Page 4 rendered the morning ritual and the Start-tracking signature ABOVE the goal workshop, so the thing the page is about sat below the button that ends the flow. | Goals first, then the plan, then signing. Matches the page's own intro and the source order. |
| Wheel labels were `pointer-events: none`, so only the wedge opened a room. | Labels open the room too. |
| A 401 from the drafting endpoint was reported as "The coach didn't answer", about a request that was never made. | A distinct, accurate message. Still reported, never swallowed. |
| "Answer the questions on this page first" appeared beside a page of filled-in answers. | The blocking question is named on screen. |
| The copy lint missed wrapped JSX text, string literals inside JSX expressions, inline object fields, `GUIDE_SESSIONS` and the whole routine library. | All five closed. Antithesis rules are scoped away from spoken lines (incantations, credo) by field name, where contrast is a real device. |

### Milestones (all done)

Build notes worth keeping, because each one was a real defect the plan did not predict:

- **The optional question was a gate.** `perfect_day` is marked optional but still blocked everything behind it, so a returning user with a full driving force was sent back to an exercise they had deliberately skipped. Fixed with `blocksIntake`, plus a regression test.
- **The rail ignored its own filter.** `visiblePages` correctly dropped the year debrief on a first run, and `IntakeRail` rendered `INTAKE_PAGES` anyway, so a brand new user was asked to debrief a year the app knows nothing about. The rail now takes the pages as a prop.
- **The view mode was never persisted.** A reload mid-intake dropped the user on the Guide. Their answers had saved correctly, but it read as total data loss. Mode now lives in `visionPlanMode_v1`, kept out of the plan schema because it is view state.
- **`goalQualification` was never needed.** `VisionGoalDraft` already carries `desireLevel`, `reward`, `stake`, `obstacles`, `painWhy` and `smartSentence`. The planned state field would have been a second source of truth. Dropped; `perfectDay` took its place as the one field with no existing home.
- **The copy lint had three blind spots.** It was line-based, so wrapped JSX text escaped it. It only read files it imported, so `GUIDE_SESSIONS` in the service escaped it. And it never looked at string literals inside JSX expressions, where a lot of copy lives. All three are closed.
- **A broken page passed 2,204 tests.** A bulk copy edit ate a backtick inside a `className` template literal and the whole page failed to parse, with every test still green, because nothing compiles this component. `lifeMasteryRegressions.test.ts` now parses the big surfaces and checks for that exact shape.

### Milestones

**M0 — Nothing breaks.** Add state fields and `deriveIntakePosition`. Old flow still renders.
*Accept:* `tests/unit/goals/intakeMigration.test.ts` proves a v17-era payload hydrates, lands on the first unanswered question, loses nothing. `npm test` green.

**M1 — The writing is ours again.** Rewrite all 418 user-facing strings to the nine voice rules. Extend the copy lint with mechanical checks: zero em-dashes in user-facing strings, no `/,\s+not\s+[a-z]/`, no `/(isn't|is not)[^.]{2,40}it's/`, no "not just". Lint covers the component's JSX text and every `lifeMastery*.ts` data file.
*Accept:* the new lint fails on the current copy, passes after the rewrite. `npm test` green. Do this before the flow work so every later milestone is born clean.

**M2 — Pages 0, 1 and 2, and the driving force assembles on one scroll.** The year debrief, then commit and the one values question, then vision, purpose, identity, code, then the values re-design. Reveal mechanics working.
*Accept:* Playwright. Answer the vision box and the purpose question appears without a click. Answered questions stay visible above. "I'm not sure yet" moves you on. Reload lands on the same question. The driving-force card reads top to bottom. On a first run page 0 skips in one click. On a re-run page 0 is required and page 2 opens with the existing vision on screen.

**M3 — Page 3, areas with a 10 and a 0.** Pick areas, name them, per-area 10, 0, purpose, identity. `yourZeros` built.
*Accept:* 10 and 0 both persist, the weekly wheel reads both ends, renaming persists.

**M4 — Page 4, goals qualified.** Brainstorm, horizon tag, circle the one-year ones, the sentence builder, belief and desire, why and pain-why, reward and consequence, pre-mortem.
*Accept:* a goal under 7 on either belief or desire gets the shrink-the-goal prompt. The sentence renders his template.

**M5 — Action plan and sign.** Could-do to 80/20 to 90-day and 30-day chunks, then the manifesto and hand-off to Track. Old `rooms`/`lifewide`/`commit` code deleted.
*Accept:* one Playwright run from page 1 to Track with a populated plan. `rg "CreateStage"` returns nothing. Copy lint, `noFabricatedFields`, `npm test` all green.

### Constraints

- Every quote in `lifeMasteryIntake.ts` carries a real `videoId`. `noFabricatedFields` and the copy lint stay green.
- Voice policy v2 still applies: our voice, never third person about the source coach.
- No new icons without checking `src/shared/iconRoles.ts`.
- `npm test` between milestones.
- Update this doc and the canon before reporting done.
- Verify in the browser with Playwright before calling any milestone done. Screenshots to `.playwright-mcp/`.
