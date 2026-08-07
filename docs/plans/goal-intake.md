# Goal intake — make any written goal list land correctly

**Status:** SHIPPED 2026-07-30 — all ten milestones (see the ledger at the bottom) · **Target:** `/test/vision-plan` · **Scope:** the path from "text a user wrote" to "a goal in a room"
**Out of scope:** non-English intake (parked — see Appendix B), DB/RLS, the tracking loop itself.

---

## Part 1 — What this is, in plain language

### The problem

Someone shows up with a goal list they already wrote — in Notes, in a journal, in their head. Today the only way in is: pick a room, type one line, repeat. There is **one intake function with one call site**, and it was built for typing single goals into a room you already chose.

Run a real list through it and a measurable share of the lines come out wrong. Not "slightly off" — wrong in ways that make the goal untrackable:

- **"10 pullups, from 7"** becomes a climb from **0** to 10. The system has a field for where you're starting; nothing ever fills it in. Every ladder in the product starts at zero.
- **"Publish 3 videos per week"** becomes a one-off target of 3 videos, because only `3x per week` and `3 days a week` are recognised as a rhythm — `per week` isn't.
- **"1 Muscle Up"** becomes a 5-rung ladder from 0 to 1. Written as "Muscle up" it correctly becomes a yes/no achievement; adding the count you'd naturally write breaks it.
- **"Bench 28 kg, 3x6-8"** becomes "0 → 28 Bench". Half a user's gym list is this shape and none of it survives.
- **"Body fat to 12%"** or **"Diamond 3"** — anything that goes *down* — either climbs the wrong way or gets flattened to yes/no.
- **"Remember I do this to enjoy it"** becomes a habit you do 3×/week.

### The insight

These aren't six unrelated bugs. They're one thing: **intake reads a line as one of three types, when what it needs to read is a shape.** A shape is: is there a rhythm, is there a number, which way does it move, where am I starting, and is this even a goal.

And the second half: **not everything on a goal list is a goal.** Real lists mix goals with identity statements ("I'm confident in every situation"), rules ("remember why you're doing this"), and things you don't control ("internationally bestselling author"). The system has a correct home for each of those already — `identity`, `valueRules`, `rawWants` at a 5/10-year horizon. Intake just never routes anything there, so all of it becomes habits.

### What changes for the user

1. **A door for a list.** Paste the whole thing, headings and all. Every line comes back as a row showing what the system made of it — shape, area, the numbers — with one-tap correction on each. Nothing is created until you accept the screen.
2. **Numbers work.** Say where you're starting. Rhythms are recognised however you phrase them. Ladders climb down when the goal goes down. Lifts keep their weight and their sets-and-reps.
3. **Lines that aren't goals get offered their right home** — never moved silently, always one tap to say "no, it's a goal".
4. **Outcome goals get asked how.** "No pain in my back" has no action in it. The card asks what you'll actually do, and suggests.
5. **A list with structure keeps it.** Three thresholds of the same thing collapse into one ladder. A project with three sub-items renders as a project.

### How we know it makes sense for people who aren't us

The acceptance gate isn't this repo's owner's list. It's **ten fixture goal lists from ten different archetypes** (lifter, founder, student, new parent, injury rehab, career switcher, single-and-dating, debt payoff, creative, chronic-condition), ~15 lines each, committed as a test. The suite asserts the invariants — no ladder with more rungs than range, no measurable goal without a baseline, no non-goal silently becoming a habit, every line landing in a real area. **That file is the deliverable that answers "does this hold up for 10 random users".** Every milestone below adds its cases to it.

---

## Part 2 — Milestones

Each is a working, testable app state. **M2-M7 all edit the same function** — they are sequential, single-owner, not parallel (see Part 4).

---

### M1 — Paste a list and see what it becomes

**Capability:** paste a multi-line goal list; get a review screen; accept it.

- New `parseGoalList(raw, today)` in `visionPlanService.ts`: splits on newlines, detects heading lines (no verb + trailing colon, or a line that matches an area name), maps headings to the 12 areas (exact → fuzzy → `customAreas` → `null`), runs every non-heading line through the reading pipeline.
- New `GoalListReview` component: one row per line — original text, detected shape, area, measure, and the route (goal / identity / rule / horizon-want / skip). Every field editable inline. Bulk actions: accept all, skip all, re-assign area.
- Nothing writes to state until **Accept**. Accept calls the existing `createAreaGoal` / `addGoalEdge` per row.
- Entry points: the Guide's brainstorm step (replaces the single-line input's "or paste a list") and an empty-state affordance in each room.

**Non-destructive:** the existing single-line composer stays exactly as it is and keeps its call site.

**Acceptance:** `tests/unit/goals/goalListIntake.test.ts` — a 20-line pasted list with two headings produces 20 rows, 2 areas, 0 state writes before accept; accept produces exactly 20 goals with the right `areaId`; a heading that matches no area produces rows with `areaId: null` that the review screen requires you to resolve.

---

### M2 — Say where you're starting from

**Capability:** "10 pullups, from 7" climbs from 7. Every measurable goal can carry a baseline.

- `classifyGoalInput` parses baselines: `from N`, `currently N`, `now N`, `N → N`, `N to N`, `(at N)`. When the phrase gives both, the *second* number is the target.
- Composer ([VisionPlanLab.tsx:5374](../../src/goals/components/vision-plan/VisionPlanLab.tsx#L5374)) and the type-flip path ([:8405](../../src/goals/components/vision-plan/VisionPlanLab.tsx#L8405)) gain a **From** input beside **To**. Both currently hardcode `start: 0`.
- No migration: existing goals already have `start: 0`, which stays correct for them.

**Acceptance:** `"10 pullups, from 7"` → `{start:7, target:10}`; `"go from 7 to 10 pullups"` → same (today it yields `0→7` with unit `"to"`); composer round-trips a non-zero start through save/load; the first generated rung is `> start`.

---

### M3 — Rhythm, however you write it

**Capability:** any natural phrasing of a cadence becomes a practice, not a target.

- Widen R1 in `classifyGoalInput`: `per|a|each|every` × `week|day|month`, bare `weekly|daily|monthly|nightly`, word numerals (`one|two|…|seven`), `twice|three times`, `x3/week`, `3/wk`.
- Monthly cadence maps to `daysPerWeek: 1` **and** flags it, rather than silently pretending it's weekly — a monthly rhythm belongs in `VisionWeeklyRitual.monthlyDay`, which already exists. Route it there.

**Acceptance:** a ~25-phrasing table asserted in one test. `"Publish 3 videos per week"` → `habit_ramp 3d/wk` (today: `milestone_ladder 0→3`). Every phrasing that already worked still works.

---

### M4 — A count of one is not a ladder

**Capability:** "1 Muscle Up" is a yes/no achievement; a 0→1 goal never renders five rungs.

Two rules, in this order:

1. A `NAMED_ACHIEVEMENTS` hit **beats** a leading count. Currently R3a fires first and turns it into a ladder.
2. **`steps` is derived from range, not hardcoded to 5** ([visionPlanService.ts:3012](../../src/goals/visionPlanService.ts#L3012)). `steps = clamp(1, 8, round(range))` for integer ranges under 8, else 5. This is the general fix — it also stops "get 1 download" from drawing four fractional rungs.

**Acceptance:** `"1 Muscle Up"` → `achievement` (today: `milestone_ladder 0→1 "Muscle"`); `"Muscle up"` unchanged; `generateMilestoneLadder({start:0,target:1,steps:1})` yields one rung; existing 0→100 ladders produce byte-identical output.

---

### M5 — Goals that go down ⚠️ **gated**

**Capability:** body fat, race times, debt, ranks — ladders that descend.

- Descending is simply `start > target`, which `VisionMeasure` already permits. Parsing: explicit (`under|sub|below|to N%` with a higher baseline) or implied by M2's baseline.
- Relax R3b: today `under|sub|below` forces binary *because* start was always 0. With M2 landed, a real start makes a descending ladder representable.

**⚠️ Gate — do not start M5 until this is done and written up:** audit every consumer of `measure.start`/`measure.target` for an ascending assumption — `measureToLadderConfig` ([:391](../../src/goals/visionPlanService.ts#L391)), `generateMilestoneLadder`, `roundToNiceNumber`, `goalRollup` ([:1726](../../src/goals/visionPlanService.ts#L1726)), `expectedToDate`, `measureLogs` progress, and the ladder UI. This is shared math touching **every existing goal**. If any consumer can't be made direction-agnostic cheaply, ship M5 as parse-and-store-only with descending goals rendering as achievements, and say so.

**Acceptance:** `"body fat from 22% to 12%"` → descending ladder; a logged reading of 17% reads 50% progress; **every ascending case in the existing suite is unchanged** (this is the real test).

---

### M6 — Lift goals

**Capability:** "Bench 28 kg, 3x6-8" keeps its weight, its unit and its protocol.

- `VisionMeasure.protocol?: string` — optional, display-only, **no math changes**. Holds `3×6-8`, `5/3/1`, `AMRAP`.
- Parser: strip a trailing set×rep pattern (`\d+\s*[x×]\s*\d+(-\d+)?`) into `protocol`; the title keeps the movement name only.
- **Unit table replaces positional guessing.** Today unit comes from the word after the number, else the word before, and punctuation defeats it — `"Bench 28 kg, 3x6-8"` yields unit `"Bench"` because `"kg,"` fails the character class. Add a recognised-unit table (`kg lb lbs % km m mi min hr reps sets $ € £`) matched adjacent to the number with punctuation stripped, before falling back to the neighbouring word.

**Acceptance:** all six lift shapes (`Bench 28 kg, 3x6-8` · `BB row 70 kg, 3x6-8` · `Skullcrushers, 30 kg, 2x8-10` · `Curl 18 kg x 10 strict form` · `10 pullups from 7` · `1 muscle up`) produce the right title / unit / target / protocol / type. `"Skullcrushers, 30 kg, 2x8-10"` currently yields `0→30 reps` — it is kilograms.

---

### M7 — Not everything you wrote is a goal

**Capability:** identity lines, rules and out-of-your-control wants get offered their right home.

- `readGoalRoute(text)` returns `goal | identity | rule | horizon-want` with the matched cue, or `goal` when nothing matches. **Never guesses** — same doctrine as `readGoalVehicle`.
  - identity: `I am…`, `be someone who…`, `have confidence in…`, `be more X`
  - rule: `remember to…`, `always…`, `never…`, `don't forget…`
  - horizon-want: superlatives and third-party verdicts — `best-selling`, `world's best`, `famous`, `#1`, `viral`, `recognised as` → `rawWants` at 5-10 years, **no belief slider, no date, no ladder**
- Surfaces **only** in M1's review screen as a suggested route with a one-tap "no, it's a goal". Nothing is ever auto-moved.
- Destinations all exist: `areaPlans[area].identity`, `valueRules`, `rawWants`.

**⚠️ Gate:** a route that fires on a real goal is worse than no routing. Ship with the review screen defaulting to **goal** and the alternative offered beside it, not pre-selected.

**Acceptance:** the three known cases route correctly (`"Have confidence in all situations"` → identity, `"Remember I do it to enjoy it"` → rule, `"Internationally bestselling author"` → horizon-want); the 10-user corpus produces **zero** false routes on lines that are genuinely goals; every routed line is reversible in one tap.

---

### M8 — Outcome goals get asked how

**Capability:** "No pain in my back" arrives with no habits, and the card asks what you'll do about it.

- A goal with zero habits and no measure is a **state goal**. Today it silently becomes a 3×/week habit named after the outcome.
- Its card shows "What will you actually do?" and reuses the existing room-suggestion machinery (`/api/goals/vision-plan/refine`) to propose 3-5 habits, accept-tray style. Accepted habits attach and enter the balancer.

**Acceptance:** a state goal enters with `habits: []`; the prompt renders; accepting two suggestions attaches two habits and `balancePlan` schedules them; declining leaves the goal valid and un-nagged.

---

### M9 — Projects with sub-goals

**Capability:** "Build the company: do X, Y, Z" renders as one project with three children.

- **No schema change.** `feedsGoalIds` is already an acyclic edge set with `goalFeeders()` and cycle-safe `addGoalEdge`. A goal with ≥2 feeders **in its own area** renders as a project container; feeders render as children.
- Intake: an indented or `a./b./c.`-prefixed run of lines under a parent line becomes parent + edges.
- `removeGoal` already strips inbound edges, so deleting a parent can't orphan.

**Acceptance:** a 4-line indented block produces 1 parent + 3 children + 3 edges; the project card renders children; deleting the parent leaves 3 valid standalone goals; a cycle attempt still throws.

---

### M10 — Ten users, asserted

**Capability (ours):** we can prove intake holds for lists nobody here wrote.

`tests/unit/goals/goalIntakeShapes.test.ts` — ten fixture lists (~15 lines each), each from a distinct archetype, **none of them this repo owner's list**. Per-list assertions plus these global invariants:

| Invariant | Why |
|---|---|
| No ladder has more rungs than its integer range | the 0→1 five-rung bug, as a class |
| Every `milestone_ladder` has a unit from the unit table, never a word lifted from the title | the `"Bench"` bug, as a class |
| No line containing a cadence phrase becomes a `milestone_ladder` | M3, as a class |
| Every goal lands in a real `areaId` or is explicitly unresolved | no silent mis-filing |
| No line routed away from `goal` without an explicit cue | M7 false-positive guard |
| Round-trip: parse → create → serialise → `loadVisionPlanState` → deep-equal | nothing lost on save |

Failures found here get added to `lifeMasteryRegressions.test.ts` **by failure class**, per that file's existing convention.

---

## Part 3 — Order, dependencies, risk

```
M1 (door) ─┬─ M2 (baseline) ── M5 (descending) ⚠️
           ├─ M3 (rhythm)
           ├─ M4 (counts/steps)
           ├─ M6 (lifts)            all of M2-M7 edit classifyGoalInput → SEQUENTIAL
           ├─ M7 (routing) ⚠️
           ├─ M8 (how)      ── independent of the parser
           └─ M9 (projects) ── independent of the parser
                                              ▼
                                        M10 (gate)
```

**Ship order:** M1 → M2 → M3 → M4 → M6 → M5 → M7 → M8 → M9 → M10.
M5 sits after M6 because it needs M2's baseline *and* deserves a clean parser under it. M8/M9 can be built in parallel with the parser work by a different owner.

**Standing constraints:**
- **Persistence key stays `visionPlanSandbox_v1`.** Every new field optional. A bump orphans existing plans with no upgrade path — recorded as a hard line in `life-mastery-os.md` v17.
- **No fallbacks.** A line intake can't read stays visibly unresolved in the review screen. It never becomes a 3×/week habit as a consolation prize — that is the current behaviour and it is the bug.
- `classifyGoalInput`'s return type widens (baseline, protocol, route). One call site ([:1728](../../src/goals/components/vision-plan/VisionPlanLab.tsx#L1728)) plus its tests.

---

## Part 4 — If this goes to an agent team

**File ownership — no two agents in the same file:**

| Owner | Files | Milestones |
|---|---|---|
| Agent A (parser) | `src/goals/visionPlanService.ts`, `src/goals/types.ts` | M2, M3, M4, M5, M6, M7 — **strictly sequential, one agent, one at a time** |
| Agent B (intake UI) | new `src/goals/components/vision-plan/GoalListReview.tsx` | M1 |
| Agent C (goal cards) | `VisionPlanLab.tsx` | M1 wiring, M2 composer inputs, M8, M9 rendering |
| Agent D (tests) | `tests/unit/goals/goalIntakeShapes.test.ts`, `goalListIntake.test.ts` | M10, and the fixture lists **written before** M2 lands |

**Ordering constraints:**
- D writes the ten fixture lists first, from archetypes, with expected shapes — **before** A starts. Otherwise the fixtures get written to match whatever the parser happens to do.
- B and C both touch M1; B owns the new component, C owns only the call site that mounts it.
- A does not begin M5 until the descending-math audit is written up and reviewed.

**The failure mode this project has hit repeatedly:** an agent reports done without building everything in the plan. Cross-check every milestone's acceptance test exists and runs before accepting any report.

---

## Appendix A — Evidence

Measured 2026-07-30 against `classifyGoalInput`, `readGoalVehicle`, `measureToLadderConfig` at HEAD.

```
Publish 3 videos per week   → milestone_ladder 0→3 videos      (want: habit 3d/wk)
Publish 1 video a week      → milestone_ladder 0→1 youtube     (want: habit 1d/wk)
Train 5 days a week         → habit_ramp 5d/wk                 ✓
1 Muscle Up                 → milestone_ladder 0→1 "Muscle", 5 steps
Muscle up                   → achievement                      ✓
10 pullups, from 7          → 0→10 reps                        (baseline discarded)
Go from 7 to 10 pullups     → 0→7 "to"                         (target = the baseline)
Bench 28 kg (currently 22)  → 0→28 kg                          (baseline discarded)
Bench 28 kg, 3x6-8          → 0→28 "Bench"                     (unit from title word)
Skullcrushers, 30 kg, 2x8-10→ 0→30 reps                        (it is kilograms)
Diamond 3                   → 0→3 "Diamond"                    (rank ladders descend)
```

`classifyGoalInput` call sites: **1** — `VisionPlanLab.tsx:1728`, inside the room composer.
`BrainstormPanel`: single-line `<input>` + Enter. There is no paste path anywhere.
`steps` is hardcoded `5` at `visionPlanService.ts:3012`; `measureToLadderConfig` passes it straight through.

## Appendix B — Parked

**Non-English intake.** Measured: 17 of 39 lines classify differently in Danish than the same goal in English; every Danish achievement falls through to `habit_ramp`, and `readGoalVehicle("Få en kæreste")` returns null so the ReasonsDrill shows nothing. Deliberately out of scope. The cheapest future fix is not localised regex tables — it is routing free-text intake through the LLM classifier that already exists for room suggestions, keeping the regex path as the offline fallback. M1's review screen is the surface that would make that safe to adopt.

**Privacy note for beta.** `/api/goals/vision-plan/reasons` and `/refine` send goal titles and reasons to Claude. Plan state is otherwise localStorage-only. Goal lists are among the most sensitive text a user will type into this product; before beta, the review screen should say plainly which actions leave the machine.

---

## SHIPPED 2026-07-30 — all ten milestones

**Measured:** 2179 unit tests green (was 1963 — **+216**), flow audit **52/52 exit 0**, typecheck clean, eslint back to its 4 pre-existing items, and the whole path walked in a real browser (paste → review → accept → reload).

### What landed, by milestone

| M | Landed as |
|---|---|
| M1 | `parseGoalList` + `mergeEscalations` (service) and `GoalListReview.tsx` (new). Opens from every room: "Already written a list? Paste the whole thing." Nothing is created until Accept. |
| M2 | Baseline parsed (`from N` · `currently N` · `N → N` · `starting at N`) **and** a `from` input in both the composer and the room row. The baseline is removed from the title once it is a field, so it can't go stale. |
| M3 | `readCadence` — `per/a/each/every` × day/week/month, weekdays, word numerals, bare trailing adverbs. Monthly is flagged and routed to a ritual instead of being rounded to weekly. |
| M4 | `ladderSteps` derives rungs from range; a climb of exactly one rung is an achievement, not a 5-rung ladder to 1. |
| M5 | Descending ladders. **The audit found the math was already direction-safe** — `generateLadderSegment` has an explicit descending branch and `measureRunRate` is sign-symmetric. Only two copy sites assumed ascending: the affirmation sentence ("get down to X or below") and the belief-shrink hint (`shrunkTarget` halves the RANGE, not the number). |
| M6 | `VisionMeasure.protocol` (`3×6-8`, `5/3/1`) + a real unit table replacing positional guessing. |
| M7 | `readGoalRoute` → identity / rule / horizon-want, each carrying the literal cue back. Offered in the review screen, defaulting to Goal, never pre-selected. Writes to `areaPlans[].identity`, `valueRules`, `rawWants` (5yr). |
| M8 | `VisionHabit.placeholder` + `goalNeedsAction` + `addGoalAction`. **The real bug was not "no habits"** — every goal is created with one, auto-titled `Work toward: <goal>`, so "no pain in my left knee" was on the calendar 3×/week and looked planned. |
| M9 | Projects derived from the existing `feedsGoalIds` edges. No schema change, no migration. Indented lines and `12a.`-style bullets become children. |
| M10 | `fixtures/goalLists.ts` — ten lists, ten archetypes, 125 lines, **none of them this repo owner's**. `goalIntakeShapes.test.ts` (149) + `goalListIntake.test.ts` (34). |

### Defects found *while building*, now guarded (regressions classes 14-17)

1. **`"Build the company"` was read as a heading.** `headingToArea` resolved a line if *any* word in it named an area — "company" is a Mission alias. The goal vanished from the list and everything under it was silently re-filed. Same shape as the old `\bfriend` bug. Fixed: multi-word headings require *every* word to be an area word or a connector.
2. **`"Send 20 cold emails a week"` was titled `"Send"`.** The rhythm cut removed the whole matched span. Only the period belongs to the rhythm when what sits between is a countable noun.
3. **A `setState` nested inside another's updater** in the accept handler — caught by class 1's own guard, which is what it is for.
4. **Icon reuse**: `Undo2` is already in use in `EliminatePhase`. Dropped the icon rather than claim it (rule 10).
5. **🔴 Pre-existing data loss, found by reloading the page.** The save gate read `hasPlan = goals.length > 0 && !!result`. Anyone who skipped the vision prose and typed a goal straight into a room **saved nothing** — it rendered, the room looked right, and it was gone on reload. Reproduced on the *original* one-line composer, so it predates this work. `intents` already fell back to `[]` three lines below the gate, which was the tell. Now `hasPlan = goals.length > 0`.

**The lesson worth keeping from #5:** ~40 prior verification runs on this lab never reloaded the page. "It renders" and "it persists" are different claims and only one of them was ever being checked.

### Deliberate deviations from the plan above

- **M5 was cheaper than budgeted.** The gate demanded an audit before starting; the audit found the shared math already direction-agnostic, so the milestone became a parser change plus two copy fixes. No fallback needed.
- **M4's rule generalised.** The plan said "a named achievement beats a leading count". The honest rule turned out to be broader — *any* count of exactly one is a checkbox — which subsumes the muscle-up case and needed no special list.
- **M8's detection had to change shape.** `habits.length === 0` never fires; the placeholder had to become explicit.
- **Escalation merging** was promised in Part 1 but had no milestone of its own. Built into M1.

### Post-ship QA pass — two more defects, both found by clicking

Asked "is anything obviously broken", the honest answer was that several controls had been *built and never clicked*. Exercising them found two:

6. **A shape flip destroyed the parsed numbers.** `setType` nulled the measure on the way out, so flipping a row to Practice and back handed you a blank unit and 0 → 0 — and Accept went dead until you retyped what we had already read correctly. The row now keeps its measure whatever shape it wears; `accept()` strips it for the shapes that must not carry one.
7. **An unmapped heading was silently filed under whichever room was open.** `defaultAreaId` was applied to every unresolved row, including rows under a heading the user *had* written and we failed to map — while the amber banner told them to "pick a room for those lines". Behaviour and copy contradicted each other, and the behaviour was the guess this screen exists to avoid. The room-you-opened-from fallback now applies only to a list with no headings at all.

Also verified in the same pass and passing: mobile 390px (0px overflow), the shape/area/route dropdowns, skip/include, inline measure edits persisting, the merge undo, and the unresolved-heading gate re-enabling once resolved.

**These are now permanent, not throwaway.** `scripts/vision-plan-flow-audit.mjs` gained a section 11 covering the list door: reachable, shape-flip reversible, nothing created before Accept, accepted goals survive a reload, and an unmapped heading blocks Accept. Audit is **49/49 exit 0**.

### M11 — the reasons (added after ship, on the owner's challenge)

**"I should be triggered to give many *why*, and given questions."** Correct, and the diagnosis was worse than a missing prompt.

`createAreaGoal` **fabricated** a why: `"Because fitness is part of the life I said I want."` So pasting twelve goals recorded that you had explained all twelve. And because no goal ever *lacked* a why, no nag for one could exist — `pendingActions` asked about belief, desire and area-purpose, but had nothing for the per-goal reason.

**This is the M8 placeholder class, in the one field the framework turns on.** I had just fixed it for actions (`Work toward: …`) and shipped it for reasons in the same session.

Built:
- **No fabricated why.** `createAreaGoal` leaves it empty. Empty is honest and it is what makes the gap visible. `goalNeedsWhy` / `goalsNeedingWhy` are now expressible.
- **`pendingActions` gains `goal-why`**, ordered by `priorityIds` so it leads with the goal the user ranked highest.
- **`ReasonsPass`** — the beat immediately after intake, not a page you might find. His order is goal → why written directly under it, because the daily loop's whole job is re-reading them.
  - It asks a **question**, cycling `REASON_PROMPTS`' eight angles ("what does another three years exactly like this one take from you?"), plus the `readGoalVehicle` card naming what the goal is actually for. Both already existed and neither was on the intake path.
  - It asks the **pain-why** as well — "most people only write the nice one".
  - It is **80/20** (`paretoKeepCount`): it says out loud that you don't have to do all of them now, and "later — keep asking me" is a first-class button, because the badge does.

**Bug found verifying it:** the queue was filtered on `goalNeedsWhy` while the pass's own index advanced — so writing goal 1's reason removed it from the list and the index skipped straight past goal 2. Every second goal was silently missed. The set is now frozen at intake and the pass owns its progress. Same mutate-while-indexing shape as the merge grouping.

Audit section 11 now covers it: the beat fires, it asks a question with other angles, the pain-why is asked, and advancing does not skip.

### M12 — capture is not planning (owner's call: fast capture, honestly labelled)

The audit that prompted this: a plan built by pasting a list had **1 of 10** steps of the derivation chain and **0 of 11** per-goal fields. I had verified the door thirty times and never once asked whether the plan it produced was any good.

- **`planConformance()`** — the plan measured against his order (commit → values → vision → purpose → identity → your-10s → area why → goals → reasons → conditioning), each step carrying the reason it exists. Rendered on the screen the user lands on: *"Your plan has 1 of 10 parts of the method · 2 of 2 goals are captured, not planned yet"*, with the next step and why it matters.
- **`goalIsPlanned` / `goalGaps`** — a captured line is not a goal until it has a reason, belief & desire, and a date you chose. The row says so itself: *"captured — not a goal yet, still needs a reason · belief & desire · a date · the cost of not"*. A badge in the header is not the same as the row admitting what it is.
- **The reasons pass is the DRILL, not one box.** First version asked for one why and advanced — capture again. It now stays on the goal, feeds `reasonsList`, asks a **different question after every reason**, counts them ("the first ten are the surface"), and offers the existing LLM expansion in your own voice once there are two to match. 80/20 framing, and "later — keep asking me" is first-class because the badge does.
- **No fabricated deadline.** `today + 365` was stamped on every captured line and printed in its SMART sentence. Removing it opened a real gap, so intake now **reads a date you wrote** — `by 2027-03-01`, `by June` (the next June, never one already past), `by October 2027`, `in 6 months`, `by end of year` — and refuses to guess: `by soon` leaves the date missing and `goalGaps` reports it.

**Four instances of one gate, found one at a time:** `result` — the analysed-vision object, set only by the prose path — was treated as "does this user have a plan" by the save gate (nothing persisted), screen 2's render condition (blank), `result.unmatched` (**client-side crash**), and `areaGroups` ("0 life areas in your plan" while holding a dozen). All four fixed; class 19 pins them.

**Three instances of the deeper one:** a default that reads as an answer suppresses the question forever — the fabricated why, the `Work toward: …` habit, the fabricated deadline. Class 18 pins that, including a check that the fabrication is gone from the *class* rather than the branch I happened to be looking at (it survived in the `from → to` branch after being removed from the other two).

### Why the same mistake shipped three times — and the one guard that generalises

`lifeMasteryRegressions.test.ts` names 19 failure classes, but its assertions are **instance** assertions wearing class names: class 18 checks `why`, `targetDate` and `placeholder` **by name**. A fourth fabricated field passes it clean — which is exactly how the third one shipped an hour after the second was fixed, and how it survived in the `from → to` branch after being removed from the other two.

`tests/unit/goals/noFabricatedFields.test.ts` is the generalisation. It reads the field list off `VisionGoalDraft` **at run time** and requires every field to be classified STRUCTURAL (we derive it) or AUTHORED (the user's words or judgement, never written for them), then asserts every AUTHORED field is empty on a goal built from bare input.

Verified by reintroducing each mistake and watching it fail:

| deliberately broken | result |
|---|---|
| fabricated `why` restored | 2 tests fail |
| fabricated `today + 365` restored | 2 tests fail |
| stand-in habit's `placeholder` removed | 1 test fails |
| **a brand-new unclassified field added to the type** | **1 test fails** |

The last row is the only one that matters. Everything else re-catches a known mistake; that one catches the shape nobody has seen yet, by refusing to let a field exist without somebody deciding what kind it is. A guard that has never been watched fail is just another assertion.

**What this does not cover.** Three other classes from this session have no mechanical guard: the `result` gate (four instances, pinned by name only), mutate-while-indexing (merge grouping, then the reasons queue), and the big one — verifying the feature instead of the artifact it produces. `planConformance` is the first output-level check; there is no equivalent for the rest.

### Still open

- **Non-English intake** — parked, see Appendix B. Unchanged.
- **The monthly → ritual branch is unexercised in a browser.** `canAddRituals` is false in a fresh sandbox, so every browser walk took the "comes in weekly" path. The ritual-writing branch is covered by the accept handler's guard and by unit tests, but nobody has watched it run.
- **`GoalListReview` is not in the copy lint's net** — same hole that let 29 guru-voice strings through before. Worth adding the new component to `lifeMasteryCopyLint`.
