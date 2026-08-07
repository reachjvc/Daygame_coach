# System coherence audit — Life Mastery (Guide / Plan / Track / Library)

Scope: the product as a **system**. Copy quality and individual input fields are covered by other passes; this is about jobs done twice, state that doesn't cross a mode boundary, screens that contradict each other, and the week-one arc.

Sources: `copy-audit.txt` (rendered text, 7 screens, example loaded), `src/goals/components/vision-plan/VisionPlanLab.tsx` (10,009 lines — the entire UI), `src/goals/visionPlanService.ts` (2,735), `src/goals/data/lifeMasteryAreas.ts`, `docs/plans/life-mastery-guided-build.md`, `docs/plans/area-prioritization.md`.

**The one-line diagnosis.** Every round has been scoped as *"add a capability"*, and a capability is always added as a **new surface with its own state**. So the product now has 4 modes × ~7 core jobs, and most jobs exist in 2-4 of them with 2-4 separate state fields. Nothing is broken in isolation; the incoherence is entirely at the seams. v22 already named the mechanism ("additive-only is why the front door never moved") — this audit says the same disease has spread through the state layer, not just the layout.

---

## 0. The root structural problem: three area taxonomies

Everything below gets worse because of this, so it goes first.

| Taxonomy | Members | Where it renders | Stored on |
|---|---|---|---|
| **5 pillars** | health · relations · wealth · meaning · vices | `AreaBoard` (Plan stage 2, "3 life areas in your plan"), `LifeAreaWheel` ("PLAN PROGRESS 100%") on Track, goal colours, `areaOrder`, `deselectedAreas` | `goal.pillarId` (required) |
| **12 Life Mastery areas** | lm_health … lm_spirituality | the room wheel, `LifeMasteryWheel`, weekly review, score history, Library areas, `focusAreaIds`/`areaRank` | `goal.areaId` (optional) |
| **9 pyramid rows** | Health+Fitness … Contribution (+Spirituality circle) | `BlueprintPyramid` on both Plan and Track | derived from `band` |

Consequences, all visible in the copy dump:

- **Track shows all three at once and they disagree.** "PLAN PROGRESS — 100% OF YOUR PLAN / Health 100% / Relations 100% / Wealth 100%" sits directly above "LIFE MASTERY WHEEL — Health 5/10, Money 4/10 … 5 AVG/10" and then the pyramid whose rows are lit by a fourth rule. A user reading top to bottom is told they are at 100%, then at 5/10, in the same scroll.
- **One goal double-counts.** `goalFeedsArea` falls back to the pillar→area fan-out (`lifeMasteryAreas.ts:78`), so a `pillarId: "wealth"` goal feeds **both** Mission & Purpose and Money; a `health` goal feeds **both** Health and Fitness. The dump shows exactly this: "First $3k month" listed under Mission & Purpose *and* The Freedom Fund; "Train until it's who I am" under Health *and* Fitness. Every coverage number in the product (rooms mapped, "6 of 12 life areas", pyramid brightness, "N areas have none") is inflated by this.
- **Stage 2 asks you to prioritise the wrong thing.** "3 life areas in your plan — drag to set priority" (`AreaBoard`, pillars) is immediately followed by "Your most important room — this season's focus (2/3)" (12 areas). Two prioritisation controls, adjacent, on different taxonomies, with `areaOrder`/`deselectedAreas` explicitly documented in `area-prioritization.md` as "legacy axis, leave alone".

**Fix:** finish the migration the 12-area model started. Make `areaId` required on every goal (derive once at creation from `pillarId`, then never read `pillarId` for area purposes again), delete `AreaBoard` / `LifeAreaWheel` / `areaOrder` / `deselectedAreas`, and make `goalFeedsArea` exact-match only. This is the single change that makes the rest of this document tractable.

---

## 1. Duplications

| Job | Where it appears now | Single home it should have | Delete |
|---|---|---|---|
| **Pick this season's focus areas** | (a) `SeasonPriority` — Plan/rooms, "What are you working on this season?" · (b) `#lm-focus` picker — Plan/lifewide, "Your most important room — this season's focus (2/3)" · (c) `LifePlanView` — Library/Areas, "This season's focus — pick 1-3 domino areas (2/3)" · (d) `pendingActions` "Pick your 1-3 focus areas for this season" | `SeasonPriority` (it is the only one that writes `areaRank` through the fail-closed setter) | (b) and (c) entirely; make both a read-only summary + "set priority →" link. See §2.1 — they don't just duplicate, they corrupt. |
| **Whole-life vision prose** | (a) Guide session 3 textarea (writes `text`) · (b) the collapsed "Prefer to write your whole vision as one block of text? →" box on Plan/rooms (writes `text`, and only this one runs the intent read that sets `matchedText`) · (c) `onCompose` — build prose out of the room 10s | The Guide session, with the *read* action attached to it | The Plan prose box becomes a read-only card + "edit in Guide". Keep `onCompose` as a one-way helper. |
| **Unfiltered brainstorm → horizon-number → circle this year** | (a) `BrainstormPanel` in Guide session 6 → `rawWants` · (b) "The Unlimited Brainstorm" tool in `VisionWorkshop` → `goalInbox` | one panel, one list | One of them. They have the *same name*, the *same 1/3/5/10/20 mechanic*, and only (b) is wired to anything (§2.3). |
| **Your 10 per area** | (a) `RoomJourneyPanel` beat 1 · (b) `LifePlanView` textarea (Library/Areas) · (c) Library/Vision read-back | the room panel | the Library editor — Library is framed "everything you wrote, read back whole" and then ships editable textareas. |
| **Per-area why / identity** | (a) room panel beats 3-4 · (b) `LifePlanView` "WHY THIS AREA MATTERS" / "WHO YOU ARE HERE" | the room panel | the Library duplicate |
| **Purpose + identity + code of conduct** | (a) Guide session 4 · (b) `DrivingForceBuilder` on Plan/lifewide · (c) Library/Driving read-back | Guide session 4 | the lifewide editor → read-only card + "edit in Guide" |
| **Rename an area** | (a) Guide session 5 (list of 12 inputs) · (b) click the name in the room panel · (c) `LifePlanView` name click | Guide session 5 for the bulk pass, room panel for the one-off; these are genuinely different moments | the Library one |
| **Values** | (a) `ValuesJourney` on lifewide · (b) per-room `SoftList` kind `values` · (c) `RulesEngineering` · (d) Library/Values | one authoring surface (lifewide), rooms tag against it | per-room value authoring; keep the roll-up |
| **Identity material** | `drivingForce.identity` · `areaPlans[].identity` · `affirmations` · `incantations` · `manifestoLines` · `valueRules` — **six** stores | two: a whole-life identity list and a per-area one; affirmations/incantations are *renderings* of them | the product currently ships an `IdentityStackCard` that *explains* the six-way split ("Five identity pieces — how they fit, and when each gets read"). Explaining sprawl is not resolving it. |
| **Guided path / progress** | (a) Guide rail (10 sessions) · (b) `StageRail` (rooms → your life → commit) · (c) `pendingActions` "N next actions — Your guided path, in order" · (d) room beats 0/4 | one | Three of these tell a user "where you are" and none of them agrees with the others. `pendingActions` is the strongest engine (it's derived) — promote it, and make the Guide rail read from it. |
| **Add a goal** | room panel · `LifePlanView` "+ Add a goal in X" · `AreaGoalComposer` · `GoalWorkshopPanel` · routine library | room panel + workshop | the Library adder |

---

## 2. State blindness

### 2.1 The two rogue focus pickers silently corrupt the ranking — *worst bug found*

`area-prioritization.md` shipped an invariant: `focusAreaIds === areaRank.slice(0, focusCount)`, with `setAreaPriority()` as **"the ONLY writer of both"**, asserted by a unit test.

The UI has two writers that bypass it:

- `VisionPlanLab.tsx:9430` (lifewide picker) → `onSetFocus([...focusAreaIds, a.id])`
- `VisionPlanLab.tsx:5497-5498` (`LifePlanView`, Library) → `onSetFocus(...)`

`onSetFocus` (`:7577`) only does `setFocusAreaIds(ids)` + reshuffles `priorityIds`. It never touches `areaRank` or `focusCount`. So:

1. Pick Money as focus in the Library → `focusAreaIds = [lm_money]`, `areaRank` unchanged.
2. The wheel's focus ring is derived from `areaTier(areaRank, …)` (`:7640`) → still rings the *old* area. Two focus indicators on one screen, disagreeing.
3. Next time you touch `SeasonPriority` (or reorder anything), `applyPriority` re-projects `focusAreaIds` from `areaRank` — **your Library choice is silently discarded.**

The test passes because it tests the service, not the component. **Fix:** delete both pickers (see §1); if either must stay, route it through `applyPriority`.

### 2.2 The Guide reports "0 of 10 done" against a complete plan

`guideProgress(done)` reads only `guideDone` — an array appended to when you click "Mark done, next". Nothing else in the app ever writes it: the example loader (`:7546-7557`) sets vision, values, driving force, tens, areaPlans, ritual, goals, progress and `committedAt`, and does **not** set `guideDone`. Hence "0 of 10 done · about 220 min left" on a screen whose sibling tab shows a signed manifesto.

**Fix — derive, don't track.** Each session already has an observable output:

| session | derived-done predicate |
|---|---|
| state | `guideDone` (genuinely a gate — the only one that needs its own flag) |
| debrief | `yearDebrief.good.length > 0` |
| vision | `text.trim()` non-empty |
| driving | `drivingForce?.purpose` **and** `identity.length > 0` |
| areas | any `areaPlans[*].name` set |
| brainstorm | `rawWants.some(w => w.circled)` |
| qualify | every goal has `beliefLevel != null && desireLevel != null` |
| chunk | every 1-year goal has ≥1 milestone |
| rituals | `ritual != null` |
| commit | `committedAt != null` |

Keep `guideDone` only as a manual override (`doneSet = derived ∪ guideDone`).

### 2.3 The Guide's brainstorm output goes nowhere

Guide session 6 writes `rawWants`. `rawWants` is read by exactly one component (`BrainstormPanel`) and persisted — and that is all. The Goal Workshop's own empty state says *"run the Unlimited Brainstorm in the vision workshop above — its 1-3 year wants land here"*, which is true only of the **other** brainstorm (`onGoalMaterial → setGoalInbox`, `:9064`). A user who does the 30-minute Guide session correctly — dump, number, 80/20-circle — gets nothing in the workshop and no explanation.

**Fix:** delete `rawWants`, point `BrainstormPanel` at `goalInbox` (extended with `years`/`circled`).

### 2.4 A Guide-written vision never becomes a plan

`text` is the prose; `matchedText` + `result.intents` are what light the wheel, seed the AI goal drafts and drive coverage. `matchedText` is set **only** by running the intent read (`:7133`) — a button inside the collapsed prose box on Plan/rooms. The Guide writes `text` and stops. So after session 3 the wheel is dark, no rooms are lit, and nothing tells you the missing step is a collapsed disclosure in a different mode.

**Fix:** run the read on Guide-session-3 completion (or attach the read button to the Guide's textarea).

### 2.5 Baseline ratings are collected, then thrown away

Room beat 2 is "mark where you are today" → `baselineRatings` + `baselineRatedAt`. Consumers: the room panel itself, the room-beat counter, the Plan wheel. That's it.

- Track's `LifeMasteryWheel` uses `track.latestReview?.areaRatings ?? null` (`:8731`) — **null for the first 7 days**, so a user who rated all 12 rooms sees an empty wheel on day 1.
- `ScoreHistoryCard`, the pyramid brightness and the Library "5/10" chips all read reviews only.
- `WeeklyReviewForm` starts with `useState({})` (`:4295`) — the first review asks for 12 ratings from scratch, and `lastRatingsBefore` (the "you were a 4 last week" comparison, and the +1 rule) has nothing to compare against.

**Fix:** treat the baseline as review week 0. Seed `progress.weeklyReviews[0]` from `baselineRatings` at `confirmPlan()`, stamped with `baselineRatedAt`.

### 2.6 Library is gated on goals, so the Guide's output can't be read back

Header pills (`:8090-8092`): Library shows only when `goals.length > 0`. A user who completes Guide sessions 1-5 — a year debrief, a vision, a purpose, an identity, a code of conduct, renamed areas — cannot open the library that exists to read them back. This is the exact bug called out in `life-mastery-guided-build.md` ("the mode pills were gated on `goals.length > 0`, so the Guide was invisible") reproduced one pill to the right.

**Fix:** gate Library on "any content exists" — the same `hasContent` expression already computed for persistence at `:7009`.

### 2.7 Renames stop at the Plan boundary

`areaPlans[id].name` is honoured in **4** places: `wheelRooms` (`:7595` — wheel, room panel, `SeasonPriority`), the lifewide focus picker (`:9438`), `LifePlanView`'s `areaName` (`:5500`), and the goal-composer heading (`:7166`).

It is **not** honoured in: `LifeMasteryWheel` labels (`:539`), `BlueprintPyramid` rows (`:646`, `:730` — built from canonical `label` in `BLUEPRINT_ROWS`), `BlueprintAreaPanel`, `ScoreHistoryCard` (`:842`), the whole `WeeklyReviewForm` (`:4371`, `:4428`, and the area `<select>`s at `:4484`/`:4527`/`:4578`), goal-area dropdowns (`:5420`), Library soft-layer chips (`:6555`), Library/Vision 10s (`:6595`), the rebaseline nudge (`:8769`), and every `pendingActions` label.

Net effect: **the rename is invisible in the mode you live in.** You name it "The Engine" during planning, and every day after that Track calls it Health. Guide session 5 spends 15 minutes teaching that the name is load-bearing, then the product ignores it.

**Fix:** one `useAreaLabel(areaId)` accessor (or pass `wheelRooms` down); ban direct `a.label` reads outside the data module. Enforce with an ESLint rule or a test that greps the component.

### 2.8 Custom rooms are orphans

"+ Add a room of your own — your life, your map" creates `customAreas[]`. Custom ids reach `wheelRooms`, `deriveAreaRank` and `setAreaPriority` — so a custom room can hold a 10, a rating, goals, and be ranked #1 focus. But every downstream surface iterates `LIFE_MASTERY_AREAS`: the Track wheel, the pyramid, score history, the weekly review sliders, the Library areas page, the maintenance contract, `pendingActions`, `areasTouchedInWeek`, `rebaselineDue`.

A custom room is therefore **unratable and untrackable forever**, with no warning at creation.

**Fix:** either make the 12 + custom list the single iteration source everywhere (`allAreas = LIFE_MASTERY_AREAS ∪ customAreas`), or remove the feature. Shipping it half-wired is worse than not shipping it.

### 2.9 `committedAt` and `confirmed` are two "signed" flags that can disagree

`FoundationSection`'s manifesto sets `committedAt` (`:9372`); the terminal button sets both (`:9383`). Sign the manifesto and navigate away → `committedAt` set, `confirmed` false → Track pill hidden, Library shows "Signed 2026-07-15", and the commit screen's sticky footer still says "Sign below to start tracking" while the button says "Update plan & back to tracking" (both visible simultaneously in the dump, lines 584-591).

**Fix:** one flag. `confirmed` should be `committedAt != null && goals.length > 0`.

### 2.10 Roll-over only looks back one day

`rolloverAdhoc(prev, addDays(today,-1), today)` (`:7487`) runs on entering Track. Miss two days and Monday's unfinished musts are stranded on Monday's plan forever — no surfacing anywhere. The Track view has no "you were away" state at all.

---

## 3. Contradictions

### 3.1 The +1 rule vs. "push every area toward 8-9-10" — *the known one, still live*

- **Wrong** — `VisionPlanLab.tsx:593` (Track, under the wheel): *"Dashed ring = level 7 — the FLOOR, not the aim: push every area toward 8-9-10."*
- **Right** — `VisionPlanLab.tsx:4345` (`WeeklyReviewForm`): *"Aim for one level up in the areas you're working — 7+ is the target, and the rest hold their floor while you push."*

`area-prioritization.md` §SHIPPED explicitly records rewriting this string in the review form and shipping `nextLevelTarget()` (+1, capped at 10). The wheel caption is the *same sentence they replaced*, in the more-seen location. Also `:536` — the ring's own tooltip, "Success line — level 7+ in **every** area".

### 3.2 "A vision for every room" vs. "an even wheel isn't the goal" — same screen, adjacent

Plan/rooms shows, within ~20 lines of each other (dump 57 and 80):
> "6 of 12 rooms begun. An even wheel isn't the goal — a moving one is."
> "This lights up 6 of 12 life areas — **the standard here: a vision for every room**, even one sentence. Answer the area questions again for the 6 quiet ones."

Per `area-prioritization.md`, the second is wrong: rank + maintenance floors is how a non-focus area is honoured, not a written vision for all 12.

### 3.3 `pendingActions` is a completionist engine pointed at a strategic-imbalance product

`visionPlanService.ts:2377-2390` generates, unconditionally:
- "Write your 10 in every room (4/12)"
- "Set a goal in every area — 8 areas have none"
- "Write the why for 10 more areas"

These are the top of the "5 next actions" badge in the header, on every screen. They demand exactly the even-wheel completionism §3.1/§3.2 exist to remove, and there is no `areaTier` check anywhere in `pendingActions`. **Fix:** scope all three to focus-tier areas; for maintenance areas the only prompt should be "write the floor".

### 3.4 The weekly review's untouched-area nudge

`:4437` — *"Do one small thing in each area every week — even a phone call counts. For anything under 7, ask: 'What can I do to level up this area of life?'"*, driven by `dueUntouched` (all 12). Same contradiction, and it fires during the ritual that is supposed to teach the +1/floor doctrine.

### 3.5 "100% of your plan" vs "5 avg/10"

Track, adjacent blocks. `visionPercent` measures *habit adherence against schedule*; the wheel measures *life satisfaction*. Both are labelled with a bare percentage/score and no framing that distinguishes them. A user at 100% adherence and 5/10 life is being congratulated and warned in the same viewport.

### 3.6 Library says read-back, Library is an editor

*"Everything you wrote, read back whole. Re-reading is the practice — this is where you do it."* — then the Areas page ships editable 10s, an editable focus picker, editable maintenance floors, editable names, and an add-goal button.

### 3.7 The Guide claims his order and skips a step

`life-mastery-guided-build.md` Part 3 lists **11** sessions; session 5 is *"Per area: your 10 → your score → your why → who you are here"* — the room journey, the step the doc calls the beat-order fix that "turns out to match him". `GUIDE_SESSIONS` has 10 entries and that one is absent: it goes `areas → brainstorm`. So "his order" as shipped omits the per-area pass, which is also the only place `yourTens` can be authored.

---

## 4. Dead ends and orphans

1. **4 of 10 Guide sessions are stubs.** `qualify`, `chunk`, `rituals`, `commit` render "This one happens in the plan itself" + a button. `chunk` routes to `lifewide` — there is no chunking UI there (milestones are edited per-goal inside `GoalDeepRow`), so the button lands you on a screen that doesn't contain the exercise you were sent to do.
2. **Dead branch:** the same button's `sess.id === "brainstorm" ? "rooms"` arm sits inside a block gated to `["qualify","chunk","rituals","commit"]` — unreachable. Residue of a session that moved.
3. **Library/Affirmations has no edit link** (every other page has one). Its empty state — *"Write an identity line in a room's deeper work and it'll offer to become one"* — describes a 3-click path with no link.
4. **Library/Values empty state** says values are *"authored inside each room, and life-wide on the Your-life screen"* — two locations, no link, and the page's own edit button goes to only one of them.
5. **Library/Method** — a wall of principle cards with no link back to anything.
6. **The Track wheel / score history / pyramid-brightness block is dead for 7 days** (§2.5). Three large components rendering "not yet rated" on the main screen from day 1 to day 6, while `baselineRatings` sits in state.
7. **"MONTHLY GOALS REPORT"** renders as a heading with nothing under it until a month boundary passes (dump 841-843) — no empty state, no "available from 1 Sep".
8. **Custom rooms** (§2.8) — creatable, then invisible.
9. **`rawWants`** (§2.3) — writable, then invisible.
10. **`baselineRatedAt`** — persisted, read by nothing.
11. **"Click a row of the pyramid to inspect that part of your life"** renders as static instruction text below the pyramid rather than as affordance on the rows.
12. **The prose vision box is behind a collapsed link** (*"Prefer to write your whole vision as one block of text? →"*) yet is the **only** control that converts prose into intents — the highest-leverage action on the screen is a disclosure triangle.

---

## 5. The week-one arc

### Day 1 — build
Blank slate lands on **Guide** (v22). Sessions 1-5 work well and are genuinely the best part of the product. Then:
- Session 3's vision produces **no visible change anywhere** (§2.4). Nothing tells you to go to Plan and press the read.
- Session 6's brainstorm output is discarded (§2.3).
- Sessions 7-10 bounce you into Plan, where the Guide's framing, "his answer" panels and dosage warnings vanish — Plan is the *old* product with a different vocabulary ("rooms" vs "areas", "your 10" vs "vision", "focus" vs "priority" vs "domino" vs "season").
- You rate 12 rooms. Those numbers will never be seen again (§2.5).
- You sign. Land on Track.

**Day 1 gap:** the Guide → Plan handoff. Four of ten sessions are a redirect into a mode that doesn't know a Guide exists.

### Day 2 — the first real morning
Track shows: driving force card, morning ritual (5 steps, `install day 1/30`), today's musts, evening reflection. **This part works.** Below the fold: an empty wheel, an empty score history, a pyramid lit by plan-coverage rather than ratings, an empty "PAST WEEKLY REVIEWS", an empty monthly report. Roughly half of Track is placeholder for six days.

**Day 2 gaps:**
- No "welcome back / day 2 of your plan" state — Track is identical to day 1 except a streak counter.
- Nothing surfaces yesterday's misses beyond a single-day ad-hoc rollover (§2.10).
- The renamed areas you spent session 5 on are gone (§2.7).
- The header still nags "Set a goal in every area — 9 areas have none" (§3.3) on the morning after you deliberately chose 2 focus areas.

### Day 7 — the first weekly review
`reviewDue` fires at day 7. The review is the strongest single screen in the product (re-read your vision → rate → per-goal check-ins → lesson → commit outcomes). Gaps:
- 12 sliders from zero; your day-1 baseline is not offered (§2.5), so `prevRatings` is null and the +1 rule, the ghost dots and the Δ column all have nothing to work from. **Week 1 cannot show progress**, which is precisely the week a new user needs it.
- The "do one small thing in each area" nudge (§3.4) fires for all 10 non-focus areas.
- Saving the review is the first moment the wheel, score history and pyramid become real — a six-day cliff with no countdown ("your first review unlocks the wheel on Sunday" would fix it).

### What's missing between "I signed" and "I opened it the next morning"
Nothing exists in that gap. Signing does `setConfirmed(true); setProgress({startDate, …}); setMode("track")` — an instant mode swap. There is no hand-off screen, no "here's what tomorrow looks like", no scheduling of the first review, no seeding of the tracking state from anything you built. `life-mastery-guided-build.md` states the requirement outright — *"Commit is a beginning… session 10 must hand over to the weekly loop, not end"* — and it is not built.

---

## 6. Top 5 structural changes

1. **Collapse to one area taxonomy (12 + custom), everywhere.** Make `areaId` required, delete the 5-pillar `AreaBoard`/`LifeAreaWheel`/`areaOrder`/`deselectedAreas`, make `goalFeedsArea` exact-match. *Every coverage number, focus indicator and progress percentage in the product is currently computed on one of three disagreeing axes.*
2. **Derive Guide progress from plan state; make `pendingActions` the single progress engine that Guide, StageRail and the badge all read.** *The Guide telling a completed plan "0 of 10 done" is not a display bug — it's the only mode that tracks its own progress separately, and three progress systems means at least two are always wrong.*
3. **One writer per job — kill the duplicate focus pickers, the duplicate brainstorm, the Library editors, the lifewide driving-force editor.** *Two of the three focus pickers actively corrupt `areaRank` and silently lose the user's choice on the next reorder.*
4. **Seed tracking from planning at `confirmPlan()`: baseline ratings become review week 0, and the Guide's vision runs the intent read.** *Week one currently cannot display any progress because the only data that could show it is collected in Plan and never read by Track.*
5. **Route every area label through one accessor, and make the focus/maintenance doctrine the only voice.** *Renaming is taught for 15 minutes and then ignored by the entire tracking loop; and the same product tells you to push every area to 8-9-10, to keep a floor and aim +1, and to write a goal in all 12 — in three places you see daily.*

---

### Not covered here
Copy quality/tone (separate pass) · individual field validation and input affordances (separate pass) · visual design · test coverage · performance of the 10k-line component (though splitting it is a prerequisite for most of the above).
