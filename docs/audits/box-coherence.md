# Box Coherence Audit — Vision Plan Lab

Scope: every input / textarea / slider / toggle / picker that renders in
`src/goals/components/vision-plan/VisionPlanLab.tsx` (~10 009 lines), checked against the
live text of the 7 screens in `copy-audit.txt`.

Method: full enumeration of `<input> / <textarea> / <select>` (87 placeholder sites, 78
inputs, 13 textareas), each traced to its `onChange` target and from there to
`VisionPlanStateSchema` in `src/goals/visionPlanService.ts` to confirm whether it persists.

Four questions per field: (1) does the label alone tell me what to type, (2) is it obvious
where the text goes, (3) is the field reachable/needed right now, (4) can it be saved.

---

## 1. Field-by-field problems and fixes

`file:line` = `VisionPlanLab.tsx` unless stated.

### Screen 03 — Your life, whole · the goal card (worst density in the app)

Every goal renders 7 text boxes + 2 sliders, always expanded. Three goals = 27 controls on
one page with no progressive disclosure.

| Screen | Field label | file:line | Problem | Concrete fix |
|---|---|---|---|---|
| 03 lifewide | `SAY IT LIKE IT'S DONE` | 9579 | Instruction with no noun — "say *what*?". It is prefilled by `buildSmartSentence(g)`, so it is never actually empty, yet the label reads like a blank prompt. | Label → **`THE GOAL, WRITTEN AS ALREADY TRUE`**; add sub-hint `Auto-written from your goal — edit it into your own words.` |
| 03 | `YOUR WHY — NOBODY WRITES THIS FOR YOU` | 9588 | The coaching aside is longer than the instruction and the instruction is only "why". | Label → **`WHY THIS GOAL MUST HAPPEN`**; keep the aside as the amber warning already at 9596. |
| 03 | `…CREATING WHAT FEELING?` | 9599 | Meaningless standing alone; the leading ellipsis implies it continues the box above it, which it does not (it continues the *placeholder* of the box above). | Label → **`THE FEELING IT GIVES YOU`**; placeholder → **`One or two words — "freedom", "quiet pride", "aliveness"`**. |
| 03 | `AND IF YOU DON'T? — THE PAIN-WHY` | 9609 | "Pain-why" is internal jargon; the question mark makes it read as a rhetorical aside. | Label → **`WHAT IT COSTS YOU IF YOU DON'T`**. |
| 03 | `BELIEF` slider | 9620 | Bare noun. Belief in what — the method, yourself, the deadline? | Label → **`BELIEF — WILL YOU ACTUALLY DO IT?`** (rule already in the `title` at 9619; surface it). |
| 03 | `DESIRE` slider | 9636 | Same. | Label → **`DESIRE — DO YOU ACTUALLY WANT IT?`** |
| 03 | `BELIEF` / `DESIRE` sliders | 9621, 9637 | **Phantom value.** `value={g.beliefLevel ?? 7}` but the readout prints `–/10`. The thumb sits at 7 while the number says unset, and because a range input fires no `change` when dragged to its current position, the user *cannot* record a deliberate 7. | Copy the pattern already solved at 4380–4403: dim the track (`opacity-40`) when null and make the `–/10` readout a button labelled `Tap to confirm 7, or slide to rate`. |
| 03 | `THE REWARD` / `THE STAKE` | 9667, 9677 | Nouns without a verb; "stake" reads as gambling. | **`REWARD WHEN YOU LAND IT`** / **`WHAT YOU FORFEIT IF YOU MISS`**. |
| 03 | `PRE-MORTEM — WHAT WILL TRY TO STOP YOU?` | 9699 | "Pre-mortem" adds nothing the question doesn't already say. | **`WHAT WILL TRY TO STOP YOU — AND YOUR COUNTER-MOVE`**. |
| 03 | `by` + date input on a `Now`/ongoing goal | 9548 | An ongoing practice goal renders `ongoing · by [empty date]`. The tooltip explains it; the label doesn't. | When `type === "habit_ramp" && !targetDate`, replace the bare date box with a text button **`+ add a deadline (optional)`** that reveals the date input. |
| 03 | Whole card | 9578–9707 | 7 boxes + 2 sliders per goal, all at once, before the user has done anything. | Show `THE GOAL, WRITTEN AS ALREADY TRUE`, `WHY THIS GOAL MUST HAPPEN`, `BELIEF`, `DESIRE` by default. Put feeling / pain-why / reward / stake / pre-mortem behind one disclosure: **`Qualify it fully — feeling, cost, reward, stake, obstacles (5)`**. |
| 03 | `Add` (goal workshop) | 5438 | Button label `Add` with a rich placeholder; when the list is empty the placeholder is the only instruction. | Fine as-is; the empty state at 5395 is one of the better ones in the app. |
| 03 | `YOUR PURPOSE — WHY DO YOU WANT THIS VISION?` | 3247 | Same stored field as the Guide's `YOUR PURPOSE — WHY ARE YOU HERE?` (6427). Two genuinely different questions writing one string; whichever you answer second silently overwrites the first. | Pick one question. Keep **`YOUR PURPOSE — WHY ARE YOU HERE?`** in both places (it matches `drivingForce.purpose`'s meaning), and make the lifewide instance a read-only echo with `Edit in the Guide →`. |
| 03 | `REASON WORDS — THE MORE REASONS, THE MORE FUEL` | 3260-ish chips | Chip row with no stated effect — tapping one does what? | Add hint: **`Tap the words that are true for you — they appear on your morning driving-force card.`** |
| 03 | `ENGINEER YOUR RULES — WHEN DO YOU GET TO FEEL YOUR VALUES?` step 2 input | 2899 | Renders, accepts text, is **never saved** (see §2). | Persist to `valueRules` as `{ old, new }` pairs, or label it **`(scratch — not saved)`** the way the session journal at 5907 already does. |

### Screen 01/02 — Your rooms · the room journey

| Screen | Field label | file:line | Problem | Concrete fix |
|---|---|---|---|---|
| 01/02 | `The gap — where you are today` slider | 1822 | Same phantom-value bug: `value={rating ?? 5}`, readout `–/10`. Dragging to 5 records nothing. | Same fix as belief/desire: dim + `Tap to confirm 5, or slide to rate`. |
| 01/02 | Beat 5 `The deeper work` | 1890–1957 | **Seven empty inputs render at once** — fuel, pain-why, identity, then SoftLists for values, affirmations, incantations, rules — regardless of whether the user has written their 10 (beat 1) or a single goal (beat 4). Comment at 1892 says hiding it was "the bug"; the fix over-corrected. | Gate on beat 1: while `!dream.trim()`, collapse the whole block to one line — **`The deeper work — unlocks once you've pictured your 10`**. Once unlocked, show *fuel / pain-why / identity* and put the four SoftLists behind **`+ Values, affirmations, incantations and rules for this room (4)`**. |
| 01/02 | `The fuel — read on hard days, feeds your driving force.` | 1901 | **False promise.** Writes `areaPlans[room].purpose` (9045). The morning driving-force card at 8244–8290 reads `drivingForce.purpose` — a different store. This text never appears there. | Hint → **`Read on hard days. Shows up in Library › Areas, next to this room's goals.`** |
| 01/02 | `The identity — one line, joins your incantations and daily card.` | 1924 | **False promise.** Writes `areaPlans[room].identity`; the daily card renders `drivingForce.identity` (8285-8288). Only the explicit `+ Make an affirmation` button (1937) bridges anything, and it bridges into `areaPlans.affirmations`, which surfaces only in the Library. | Hint → **`One line. Tap "make it an affirmation" below to put it in your morning deck.`** |
| 01/02 | `This room's values — … These roll up into your life-wide values.` | 1953 | Half-true. `softLayerRollup` (visionPlanService.ts:1307) merges them into the **Library › Values** page, but *not* into the ranked 1-5 hierarchy on screen 03 (`valuesList`), which is what the user thinks of as "my values". | Hint → **`Shown in Library › Values alongside your ranked five — they don't change the ranking.`** |
| 01/02 | `Rules` SoftList | 1956 | Bare noun, and its hint is a raw format string (`RULES_EXERCISE.rewriteFormat`). Different store (`areaPlans[id].rules`) from the life-wide rules engine (`valueRules`, 2863). | Label → **`RULES FOR THIS ROOM — WHEN DO YOU GET TO FEEL GOOD HERE?`**, placeholder already good (`I feel fit anytime I move my body`). |
| 01/02 | `Incantations` | 1955 | Undefined term at first encounter (the Library's glossary is 5 screens away). | Label → **`INCANTATIONS — AFFIRMATIONS SAID WITH YOUR WHOLE BODY`**. |
| 01/02 | Maintenance floor input | 2115 | Only rendered inside the collapsed `set priority` drawer, and only for out-of-focus areas — so the same concept has two different eligibility rules (see §3). | Keep this one; delete the Library duplicate. |
| 01/02 | `set priority` collapsed drawer | 2059-2071 | Collapsed by default; the summary line reads `What are you working on this season?` which is a question, not a control affordance. | Summary → **`This season's focus — not set yet`** with the affordance `choose →`. |

### Screen 04 — Commit

| Screen | Field label | file:line | Problem | Concrete fix |
|---|---|---|---|---|
| 04 | `Step 1 — audit your CURRENT morning first` | 3862–3915 | The entire audit (act list + ↑/↓ marks) is **never saved** — the source comment at 3860 says so outright ("A worksheet, not stored state"), but the UI never tells the user. | Either persist as `ritual.audit: {text, up}[]` or add the same honest footnote used at 5907: **`This is a worksheet — the list isn't saved, only the ritual you build below.`** |
| 04 | `START FROM A PRESET` 15/30/60 + `OR PICK STEPS` | 3960-ish | Two mechanisms with no stated relationship — does a preset wipe manual picks? | Add hint under the presets: **`A preset replaces your current list. Picking steps below adds to it.`** |
| 04 | `PRIORITY — #1 STARTS FIRST · SEEDED BY YOUR FOCUS ROOMS, DRAG TO OVERRIDE` | commit stage | Explains the mechanism, not what to do. | **`DRAG TO REORDER — #1 STARTS IN WEEK 1`**, keep `seeded by your focus rooms` as a grey sub-line. |
| 04 | `DAILY BUDGET ≤ 4/day` | commit stage | A cap with no consequence stated at the control. | Add hint: **`Anything over the cap phases in a week later.`** |

### Screen 05 — Track

| Screen | Field label | file:line | Problem | Concrete fix |
|---|---|---|---|---|
| 05 | RPM block reason textarea | 8591 | No visible label at all — only a placeholder and an `aria-label`. Once one character is typed, nothing on screen says what the box is. | Add visible label **`TODAY'S REASONS FOR THIS BLOCK`** above it. |
| 05 | `ADD-ONS — KEEP ONE FOR THE HEART` + `Add something to today… (unfinished items roll to tomorrow)` | 8610, 4244 | Label says "add-ons, connection or joy, not output"; the placeholder says "add something to today". They describe different lists — the user reads them as a contradiction. | Placeholder → **`One thing for the heart — a call, a walk, something you'll enjoy`**. Move generic capture to a separate `+ add a task` affordance. |
| 05 | `Productivity score` slider | 8706 | (a) score of what — the plan, the day, yourself? (b) Third phantom-value slider: `value={… ?? 5}` with `–/10` readout. | Label → **`SCORE TODAY 1-10 — HOW PRODUCTIVE DID IT FEEL?`**; apply the dim + tap-to-confirm pattern. |
| 05 | `Amazing things that happened today` / placeholder `Three counts. One counts too.` | 8674 | The placeholder is a riddle. | Placeholder → **`Write three. One still counts.`** |
| 05 | `Tonight's magic moment — one line for the jar` | 8696 | "The jar" is undefined at first encounter and the label collides with the weekly review's `Magic moment` (4445), which stores somewhere else. | Label → **`TONIGHT'S ONE MOMENT WORTH KEEPING`**; placeholder keeps the jar explanation it already has. |
| 05 | Weekly review — 12 sliders + 4 texts + outcomes + captures | 4290–4620 | All local React state, saved only by `Save weekly review`, which is **disabled until all 12 areas are rated** (`allRated`, 4307). A user who writes the lesson, the challenge and three outcomes but rates 11 areas loses everything on navigation. | Auto-persist a draft (`progress.weeklyDraft`) on change, or at minimum enable Save and warn `2 areas unrated — saved anyway`. |
| 05 | `Next week's focus — the ONE area to lean into hardest (your 1-3 season areas live in the Life Plan)` | 4577 | Reads like a fourth focus picker; the parenthetical is doing all the disambiguation work. | **`THIS WEEK'S ONE AREA — A WEEKLY LEAN, NOT YOUR SEASON FOCUS`**. |
| 05 | `behind on this? →` | goal rows | Link text is a question; the destination is unstated. | **`open the get-back-on-track panel →`**. |

### Screen 06 — Library

| Screen | Field label | file:line | Problem | Concrete fix |
|---|---|---|---|---|
| 06 | `YOUR 10 — THE VISION FOR THIS AREA` | 5641 | Same store as the room journey's `The picture` (`yourTens`, 7767) with a different label, and no indication the two are the same box. | Keep the Library copy read-only with **`Edit in the room →`**, or unify the label to **`YOUR 10 — WHAT THIS AREA LOOKS LIKE AT ITS BEST`** in both. |
| 06 | `WHY THIS AREA MATTERS` | 5652 | Same store as the room's `The fuel` (`areaPlans.purpose`), third different phrasing of one field. | Unify: **`WHY THIS AREA MATTERS`** everywhere, including the room panel. |
| 06 | `WHO YOU ARE HERE` | 5661 | Standing alone this is a riddle. | **`WHO YOU ARE IN THIS AREA — "I AM…"`** |
| 06 | Collapsed area card | 5609-5632 | A never-touched area shows only `Fitness · Strength, Endurance, Muscle · not rated`. Nothing says the card contains three writable boxes. | Collapsed state → append **`— your 10, your why, your identity: not written`** so the card advertises its contents. |
| 06 | `THE MAINTENANCE CONTRACT` inputs | 5554 | Duplicate of 2115 with a narrower rule (only health/relationship/family) and different placeholders. | Delete this instance; link to the rooms-screen ranker. |
| 06 | `THIS SEASON'S FOCUS — PICK 1-3 DOMINO AREAS` | 5519 | Third instance of the same control, and it desyncs the ranker (see §3, bug). | Replace with a read-only summary + **`Change it in Your rooms →`**. |

### Screen 07 — Guide

| Screen | Field label | file:line | Problem | Concrete fix |
|---|---|---|---|---|
| 07 | `0 of 10 done · about 220 min left` | guide header | `guideDone` is a manual checklist (`Mark done, next`). A user with a fully built, signed plan still sees "0 of 10 done · over two hours left". | Derive completion from content, not clicks: mark `vision` done when `visionText.trim()`, `driving` when purpose+identity exist, `areas` when any rename, `brainstorm` when `rawWants.length`, etc. Manual check stays as an override. |
| 07 | `WHO ARE YOU? (I AM…)` / `YOUR CODE OF CONDUCT — THE STANDARDS` | 6439, 6440 | Byte-identical stores to the lifewide Driving Force lists (3305, 3365) with different labels. Editing in one place silently changes the other screen. | Keep the Guide as the authoring home (it is the taught order); make the lifewide instance read-only with `Edit in the Guide →`. |
| 07 | `ANYTHING IN THE WAY?` | 6444 | Heading gives no idea that a belief-rewriting tool sits under it. | **`A BELIEF IN THE WAY? REWRITE IT`**. |
| 07 | Vision textarea | 6407 | Writes the same `text` prose the Plan screen hides behind `Prefer to write your whole vision as one block of text? →` — and **nothing runs the matcher**. The user writes 45 minutes of vision here and no goals appear until they find the hidden prose box and press `Build my plan`. | After blur with non-empty text, show **`Read this and draft my areas →`** wired to `run()`. |
| 07 | Area rename inputs (12) | 6463 | Third rename surface (room header 1730, Library title 5616). | Keep; it is the only *bulk* rename. Add hint **`Renaming here changes the room everywhere.`** |

---

## 2. Fields that render but never persist

Ordered worst → least. "Worst" = most words typed before the loss.

| # | Field(s) | file:line | What happens | Fix |
|---|---|---|---|---|
| 1 | **Approach-session journal** — 5 inputs: `How many did you actually do?`, `What was your body doing?`, `What did you feel, and when did it pass?`, `What did you do that made her feel that way?`, `One thing to do differently next time` | 5897-5906 (`SESSION_JOURNAL_PROMPTS`, `src/goals/data/lifeMasterySingle.ts:95`) | Fully uncontrolled — **no `value`, no `onChange`**. React never sees a keystroke. Text dies on any re-render, not just navigation. Only field in the file with no handler at all. The disclaimer at 5907 admits it. | Add `sessionJournals: { date, reps, body, felt, her, next }[]` to `VisionPlanStateSchema` and wire an `onJournal` callback. It is the one artifact in the relationship room that produces learning; it should feed the weekly review's `lesson`. |
| 2 | **Morning audit** — act list + ↑/↓ empowering/draining marks | 3862-3915 (`RitualAudit`) | Local `useState`. Comment at 3860: "A worksheet, not stored state." Users typically enter 6-10 lines. The derived "N draining acts" warning is also lost. | Persist as `ritual.audit`; the draining acts should stay visible next to the designed ritual as the thing being replaced. |
| 3 | **Letters** — `The habit`, thank-you textarea, goodbye textarea | 3664, 3671, 3679 | Saved **only** if all three are non-empty when `Sign both letters` is clicked. A half-written goodbye letter is lost on collapse (`letterOpen` toggle unmounts nothing, but navigation does). | Autosave a draft letter on blur; allow saving with an empty goodbye. |
| 4 | **Mission composer** — `Your full name`, `…to BE`, `…to DO/GIVE` | 3328, 3330, 3332 | Composed into `drivingForce.mission` only on `Goosebumps? Keep it` (needs all three). Worse: `rewrite it` (3322) clears `mission` and the three component boxes come back **empty** — the user cannot tweak one clause, they must retype all three. | Persist the three parts (`drivingForce.missionParts`) and repopulate them on `rewrite it`. |
| 5 | **Rules engineering step 2** — `Write it exactly as your head says it — no editing.` | 2899 (`currentRule`) | Local state, never read except to reveal three diagnostic bullets, wiped when a different value chip is picked. The whole exercise is *catch the old rule, then rewrite it* — half the exercise is discarded. | Store as `valueRules` entries with `{ old, new }`, or at minimum keep `currentRule` per value in component state keyed by value so switching chips doesn't destroy it. |
| 6 | **Belief swap (Rough day?)** — `The belief that's costing you` | 3717 (`beliefOld`) | Only `beliefNew` is kept, and only as an incantation string. The limiting belief itself is discarded — even though `VisionPlanStateSchema.beliefs[]` (visionPlanService.ts:745) has an `old` field designed exactly for it. | Route this widget through the same `onBeliefs` updater the Guide's `BeliefWorkPanel` uses (5925). One store, three entry points. |
| 7 | **Primary question step 1** — `Step 1 — catch the loop: "why am I behind?"` | 3393 (`pqOld`) | Never saved. Once the new question is kept, the block collapses and the old question is gone — so the user can never review what they were replacing. | Add `drivingForce.primaryQuestionOld`. |
| 8 | **Whole weekly review** — 12 rating sliders, `Magic moment`, `Proudest accomplishment`, `Lesson learned`, `Biggest challenge`, up to 3 outcomes (area/text/why/weekday), unlimited captures, the honest note | 4295-4306, 4445-4572 | All component-local. `Save weekly review` is **disabled until all 12 areas are rated**. Everything is lost on navigation, refresh or accidental back. This is the single largest block of user writing in the app. | Autosave a draft into `progress.weeklyDraft` keyed by `weekStart`; restore on mount. Independent of the all-rated gate. |

Also worth knowing (not losses, but the same shape): `beliefOld/beliefNew` in the incantation deck's antithesis input (2468) discards the belief and keeps only the antithesis.

---

## 3. Duplicated controls — and the single home each should have

| Concept | Instances | Should live in |
|---|---|---|
| **Season focus (1-3 areas)** | (a) rooms screen `SeasonRanker` — rank list + 1/2/3 count, 2059-2125; (b) lifewide chips `YOUR MOST IMPORTANT ROOM — THIS SEASON'S FOCUS`, 9418-9442; (c) Library chips `THIS SEASON'S FOCUS — PICK 1-3 DOMINO AREAS`, 5516-5540 | **Rooms screen (a)** only. (b) and (c) become read-only summaries with `Change it in Your rooms →`. **See the state bug below — this is not cosmetic.** |
| **Maintenance floor** | (a) `SeasonRanker`, one per out-of-focus area, 2115; (b) Library maintenance contract, only health/relationship/family, 5554 | **(a)**. Same field (`areaPlans[id].maintenance`) with two different eligibility rules and two different placeholder styles. |
| **Your 10 for an area** | (a) room beat 1 `The picture`, 1761; (b) Library `YOUR 10 — THE VISION FOR THIS AREA`, 5641 | Both write `yourTens[areaId]`. Keep the **room** as the editor (it also fires goal suggestions — as does adding a goal, since v25); Library reads back. |
| **Why this area matters** | (a) room `The fuel — read on hard days…`, 1902; (b) Library `WHY THIS AREA MATTERS`, 5652 | Both write `areaPlans[id].purpose`. Keep the **room**; unify the label. |
| **Identity for an area** | (a) room `The identity — one line…`, 1925; (b) Library `WHO YOU ARE HERE`, 5661 | Both write `areaPlans[id].identity`. Keep the **room**. |
| **Area rename** | (a) room header `rename`, 1730; (b) Library `EditableTitle`, 5616; (c) Guide step 5, twelve inputs, 6463 | All write `areaPlans[id].name`. Keep **(c) Guide** for bulk and **(a) room** for in-context; make Library's title read-only. |
| **Purpose (life-wide)** | (a) lifewide `YOUR PURPOSE — WHY DO YOU WANT THIS VISION?`, 3247; (b) Guide `YOUR PURPOSE — WHY ARE YOU HERE?`, 6427 | Both write `drivingForce.purpose` while **asking different questions**. Keep the **Guide** wording in both. |
| **Identity list (life-wide)** | (a) lifewide Driving Force, 3305; (b) Guide `WHO ARE YOU? (I AM…)`, 6439 | Both write `drivingForce.identity`. Keep the **Guide**. |
| **Code of conduct** | (a) lifewide, 3365; (b) Guide, 6440 | Both write `drivingForce.conduct`. Keep the **Guide**. |
| **Belief rewriting** | (a) Guide `BeliefWorkPanel` — persists old + replacement + counter-evidence + 30-day reference count, 5925-6010; (b) Rough-day belief swap — discards the old belief, 3717; (c) incantation-deck antithesis input — discards the belief, 2468 | **(a)**. (b) and (c) should call the same `onBeliefs` updater instead of their own lossy local state. |
| **Whole-life vision text** | (a) Guide step 3 textarea, 6407; (b) prose box behind `Prefer to write your whole vision as one block of text? →`, 9071 | Both write `text`. Keep **both surfaces** (they serve different journeys) but the Guide one must offer `Read this and draft my areas →`, because today it writes into a box the user can't see and never runs the matcher. |
| **Magic moment** | (a) nightly `Tonight's magic moment`, 8696 → `eveningReflections[date].magicMoment`; (b) weekly `Magic moment / Best moment of the week…`, 4445 → `weeklyReviews[].magicMoment` | Genuinely two things, but identically named. Rename (b) → **`BEST MOMENT OF THE WEEK`**. |
| **Rules** | (a) room SoftList `Rules` → `areaPlans[id].rules`, 1956; (b) `ENGINEER YOUR RULES` → `valueRules`, 2863 | Two stores, one concept. The Library merges them via `softLayerRollup`, so keep both authoring points but label (a) **`RULES FOR THIS ROOM`** and (b) **`RULES FOR YOUR VALUES`**. |
| **Affirmations / incantations** | room SoftLists → `areaPlans[id].*`, 1954-1955; life-wide arrays `affirmations` / `incantations` | Same pattern as rules — merged in the Library only. Label the room ones `…FOR THIS ROOM`. |
| **Goal `why`** | (a) `RoomGoalRow`, placeholder `What does landing this actually give you?`, 1500; (b) `AreaGoalComposer`, `Why do you want this? (the fuel)`, 5194; (c) goal card, `Why MUST this happen? Borrowed reasons don't burn…`, 9589 | One field (`g.why`), three questions. Standardise on **(c)**'s wording everywhere. |
| **Season focus vs weekly focus** | season focus (above) vs `Next week's focus — the ONE area…`, 4577 | Different concepts, near-identical names. Rename the weekly one **`THIS WEEK'S ONE AREA`**. |

### Bug found while confirming the duplication

`onSetFocus` (7577-7589) — the handler behind the **lifewide** and **Library** focus chips — sets
`focusAreaIds` and reorders `priorityIds`, but **never updates `areaRank` or `focusCount`**.
`applyPriority` (7794-7806), the handler behind the rooms-screen `SeasonRanker`, updates all three.

Consequence: pick `Fun` in the Library, go back to Your rooms, and the ranker still reads
`This season: The Engine · Fitness` — because it renders `areaRank.slice(0, focusCount)`
(2059). The two controls now disagree about the same season. On reload, `focusCount` is
partially resynced from `focusAreaIds.length` (6928) but `areaRank` order is not, so the
displayed focus *changes again* after a refresh.

Deleting the two duplicate pickers fixes this by construction. If they are kept, both must
route through `applyPriority`.

---

## 4. Empty states

Good, keep as models:

- Brainstorm, 6217: `Nothing yet. Start typing — quantity first.`
- Goal workshop, 5395: `Nothing waiting. Add a want below, or run the Unlimited Brainstorm…`
- Library › Vision, 6631: `Nothing written yet — open a room and picture your 10.`
- Library › area goals, 5689: `Nothing yet — no area gets left behind. Even one small goal keeps it growing.`
- Score history, visionPlanService-side helper at 817: `Your score history builds here, week by week — your own life spreadsheet.`
- Room suggestions (v25 — the tray now renders BELOW the goal list, and fills from the 10 *and* from each goal you add): `Write your 10 above, or add a goal, and suggestions appear here by themselves.`
- Year debrief, 6396: `The good comes first and it comes alone — the challenges list opens once you've written at least one.`

Missing or weak:

| Section | file:line | Empty behaviour | Fix |
|---|---|---|---|
| Goal card, all 7 boxes | 9578-9707 | Seven grey rectangles. Only `why` gets a consequence sentence (9596, amber). | Give the card a single header line when nothing is filled: **`Not qualified yet — the why and the belief are what make this stick.`** |
| Room beat 5 `The deeper work` | 1890 | Seven empty boxes with no state text. | Gate it (§1) and, when locked, show **`Unlocks once you've pictured your 10.`** |
| `Past weekly reviews` | 8862 | Entire section is hidden when empty (`length > 0`). The user never learns it exists. | Render with **`Your first weekly review lands here — Sunday, 20 minutes.`** |
| Library collapsed area cards | 5609 | `Fitness · Strength, Endurance, Muscle · not rated` — no hint that three writable boxes are inside. | Append `— your 10, your why, your identity: not written`. |
| `THE MAINTENANCE CONTRACT` | 5544 | Only appears once a focus area is picked; before that, the concept is invisible. | Always render with **`Pick your season focus above and the floors for everything else appear here.`** |
| `MONTHLY GOALS REPORT` (screen 05) | report section | Renders as a bare heading with no body before a month is complete. | **`Your first monthly report unlocks at the end of the month — wins first, then the honest verdicts.`** |
| `SESSION JOURNAL` | 5896 | Collapsed behind `After a session — his debrief questions`; when opened, five empty boxes plus an admission they don't save. | Persist (§2) and then the empty state can honestly say `Log a session and it appears in your weekly review.` |

---

## 5. Top 10 changes, by confusion removed

1. **Persist the weekly review as a draft** (4290-4620). The largest block of writing in the
   app is component-local and gated behind all-12-rated. Highest-value single fix.
2. **Delete the two duplicate season-focus pickers** (9418, 5519), keeping the rooms-screen
   ranker. This also removes the `areaRank`/`focusCount` desync bug in `onSetFocus` (7577)
   — three controls that disagree about the same season is worse than any label.
3. **Wire the approach-session journal to state** (5897) — five inputs with no `onChange`
   at all, in the room most likely to be used daily.
4. **Gate the room's "deeper work" beat behind the 10** (1890) and fold the four SoftLists
   into one disclosure. Removes 7 simultaneous empty boxes from a first-run screen.
5. **Split the goal card**: 4 fields visible, 5 behind `Qualify it fully — feeling, cost,
   reward, stake, obstacles (5)` (9578-9707). 27 controls per three goals is the single
   densest screen in the product.
6. **Fix the three phantom-value sliders** (1822 room rating, 9621/9637 belief+desire,
   8706 productivity) using the tap-to-confirm pattern already correct at 4380. Today a
   user literally cannot record the default number.
7. **Relabel the four goal-card mystery boxes**: `THE GOAL, WRITTEN AS ALREADY TRUE`,
   `WHY THIS GOAL MUST HAPPEN`, `THE FEELING IT GIVES YOU`, `WHAT IT COSTS YOU IF YOU
   DON'T`. `…creating what feeling?` is the worst label in the app.
8. **Correct the two false destination promises in the room panel** (1901 "feeds your
   driving force", 1924 "joins your … daily card"). Both claim a home the text never
   reaches. Wrong beats vague.
9. **Unify the purpose question** (3247 vs 6427). Two different questions writing one
   string means one honest answer silently destroys the other.
10. **Derive Guide progress from content, not clicks** (guide header). A signed, live plan
    reporting `0 of 10 done · about 220 min left` tells the user the app isn't reading
    their work.
