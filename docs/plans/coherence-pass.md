# The coherence pass — what three critics and a walk-through found

## Why this exists

Owner's verdict after ~20 rounds: *"it's getting closer, but there's still AI text, some boxes that don't entirely always make sense."* Three parallel critics (copy/voice, field-level, system) audited the **rendered** product against `copy-audit.txt` — the actual visible text of all seven screens with a worked plan loaded. Findings below are **verified independently** where they're mine to own.

---

## 0. The root finding: three area taxonomies coexist

The product has **5 pillars** (`goal.pillarId`, AreaBoard, LifeAreaWheel), **12 Life Mastery areas** (`goal.areaId`, the wheel, reviews, focus) and **9 pyramid rows**. Track renders all three in one scroll — "PLAN PROGRESS 100%" sits directly above "WHEEL 5 AVG/10", measuring different things with the same authority.

Worse, `goalFeedsArea()` falls back to pillar→area fan-out when a goal has no explicit `areaId`. Measured:

| one goal on pillar | counts as feeding |
|---|---|
| health | 2 areas |
| wealth | 2 areas |
| relations | 3 areas |
| **meaning** | **6 areas** |

So a single goal tagged `meaning` lights six of twelve rooms. **Every coverage count, every "N of 12 areas" line, and the blueprint's lit rows are inflated.** Most other findings are downstream of this.

**Fix:** 12 areas is the real taxonomy — it's what the user picks, rates, reviews and prioritises. Pillars become an internal grouping for the balancer only, never a source of area coverage. `goalFeedsArea` returns false without an explicit `areaId`; goals created before this get one at migration from their pillar's *primary* area.

---

## 1. Bugs that lose or corrupt work — do these first

**1.1 The focus picker breaks the invariant this project documented as enforced.** `area-prioritization.md` says `setAreaPriority()` is "the ONLY writer" of rank + focus. Two of the three focus pickers (lifewide `:9418`, Library `:5519`) call `onSetFocus` directly, setting `focusAreaIds` and never touching `areaRank`.
**Reproduced live:** focus `[health, money]` → clicked "Fun" on the life-wide screen → focus became `[health, money, fun]` with `areaRank` untouched, invariant false. The unit test passes because it tests the service, not the call sites. *This is mine, from this session.*

**1.2 Five fully uncontrolled inputs.** `SESSION_JOURNAL_PROMPTS` (`:5897`) renders five inputs with **no `value` and no `onChange`** — the only uncontrolled inputs in the file. Everything typed is gone on re-render. Seven more blocks render without persisting: the ritual audit, the habit-breaking letters, the mission composer's three parts (and "rewrite it" wipes them), the rules exercise's current-rule, the Rough-day belief swap (discarded even though `beliefs[].old` exists in the schema), and the primary-question original.

**1.3 The weekly review is all-or-nothing with no draft.** It *does* save (`saveWeeklyReview`), but the button is `disabled={!allRated}` — 12 sliders plus four text fields — and the in-progress state is component-local. Leave halfway and it's gone. A weekly ritual that can't be done in two sittings won't be done.

**1.4 Phantom sliders.** Room rating (`:1822`), belief/desire (`:9621/:9637`) and productivity (`:8706`) all render `value={x ?? 5}` beside a `–/10` readout: the thumb sits on 5 while the app says unset — **and dragging to the position it's already on fires no event, so the value 5 is unreachable.** `WeeklyReviewForm` (`:4380`) already solves this with dim + tap-to-confirm; copy that.

**1.5 Day-one ratings never reach Track.** `baselineRatings` feeds the Plan wheel, the room panel and the beat count — nothing else. Track's wheel reads `track.latestReview?.areaRatings`. So you honestly rate twelve rooms on day one and **the Track wheel is empty for seven days**, and the first weekly review starts from zero. Week one structurally cannot show progress.

**1.6 Two false promises.** The room panel says the fuel field "feeds your driving force" and identity "joins your… daily card". Both write `areaPlans[room].*`; the morning card reads `drivingForce.*`. The text never arrives.

---

## 2. Voice — a documented user decision, violated across a whole mode

Canon v21 records the decision: *"the entire vibe should shift into it being ours"* — our voice, no intermediate guru. **29 rendering strings** across five files are third-person narration about him:

- The Guide's H1 is literally **"Build it his way"**; "His order, one exercise at a time"; "He'd tell you to…"; "He is blunt about this".
- `EXEMPLAR_ERA_LABEL` = "his earlier plan" / "his latest plan" — **stamped under every quote** (`:6298`).
- The component is named `HisAnswer`, rendering "How he answered it".
- Leaks into `visionPlanService.ts:1119-1195` (5 of 10 session `why` strings), `lifeMasterySingle.ts`, `lifeMasteryBeliefs.ts`.

**Why the guard missed it:** `lifeMasteryCopyLint.test.ts` has had a correct `guru pronoun` rule all along — it only lints the data files it *imports*. Three new data files and the whole component were outside the net. **Extended (done): it now lints the new data layers and the component's JSX and fails with all 15+.**

**Fix:** the product speaks. "Build it his way" → "The order that works". "He'd tell you to…" → "Two of these is a good sitting." Era labels → "earlier plan" / "latest plan". Quoted material stays quoted and attributed; narration about a person goes.

---

## 3. The epigrams are architected, not accidental

`lifeMasteryPrinciples.ts` has **16 `teaser` + 16 `trap` + 6 `closer` fields — 38 slots whose only job is an aphorism**, plus ~25 more in UI chrome ("An even wheel isn't the goal — a moving one is", "That's not neglect, that's how you actually move one", "Signing is where the planning stops and the living starts").

**Decision needed, not just a rewrite.** Canon v21 already flagged this — *"aphorism-stacked collapsible headers read seminar-ish — taste-level, kept"* — and kept it. The owner is now calling it out, which overrides that, but it's a schema change. Recommendation: keep `teaser` as a plain one-line *description* of what the card covers, delete `trap` and `closer` as separate slots, and cap UI chrome at one aphorism per screen.

---

## 4. The same job in many places

| Job | Where now | Single home |
|---|---|---|
| Pick focus areas | rooms `:2059`, lifewide `:9418`, Library `:5519` | the rooms ranker (it owns `areaRank`) |
| Write the vision | prose box, Guide session 3, per-room 10s | Guide session 3 authors it; rooms hold per-area 10s |
| Brainstorm wants | Guide session 6, Goal Workshop | Guide session 6; the Workshop consumes it |
| Per-area 10/why/identity | room panel, Library Areas | room panel authors, Library reads back |
| Identity material | **6 state stores**, with a card that *explains* the split rather than resolving it | one store, surfaced in three places |
| Progress through the build | Guide rail, StageRail, "N next actions", room beats | one derived model |

Plus: the Blueprint's long explainer renders **twice** verbatim and is summarised a third time by its own caption; "Name it so it drives you…" repeats up to 12× on one Library screen.

---

## 5. Contradictions

- `:593` **"push every area toward 8-9-10"** vs `:4345` "aim one level up… the rest hold their floor". The first is the exact string `area-prioritization.md` records as replaced — it survived in the *more-seen* spot because last round I fixed the instance I was looking at, not the string.
- "A vision for every room" sits 20 lines under "an even wheel isn't the goal".
- `pendingActions` is a completionist engine ("Set a goal in every area — 8 have none") with no `areaTier` check, nagging from the header on every screen about areas the user deliberately deprioritised.

---

## 6. Week one

**Day 1:** Guide sessions 1-5 are the strongest thing here. Sessions 6-10 are four redirect stubs into Plan, which uses different vocabulary and doesn't know the Guide exists.
**Day 2 (Track):** ritual, musts and reflection work. Roughly half the screen is placeholder for six days; renames are gone; the header nags about deprioritised areas.
**Day 7:** the review is good but starts from zero (see 1.5).
**Between signing and the next morning: nothing.** `confirmPlan()` is a mode swap. The build doc's own requirement — *"Commit is a beginning… must hand over to the weekly loop"* — is unbuilt.

---

## Order of work

1. **Phase 0 — stop losing work** (1.1-1.6). Nothing else matters while typed text vanishes and the focus setting corrupts itself.
2. **Phase 1 — one taxonomy** (§0). Prerequisite for honest counts everywhere.
3. **Phase 2 — voice + epigrams** (§2, §3). The lint is already extended; make it green.
4. **Phase 3 — one home per job** (§4) and kill the contradictions (§5).
5. **Phase 4 — Guide↔Plan** (§6): derive session completion from real state, make sessions 6-10 real, hand off from Commit into day two.

Full detail: `docs/audits/copy-voice.md`, `docs/audits/box-coherence.md`, `docs/audits/system-coherence.md`.

---

## SHIPPED 2026-07-30 — all phases, with the failures encoded as tests

**The rule this pass ran on:** every defect from the whole rebuild is now a test in `tests/unit/goals/lifeMasteryRegressions.test.ts` (40 tests), grouped by **failure class** rather than by feature — because the recurring problem was never one bug, it was the same mistake in a new place. A fix without a test in that file is not a fix.

### The 13 classes now guarded
1. **State read across an update boundary** — panels must take an updater, not a computed array; no `setState` nested in another's updater (brace-matched, so sibling calls aren't false positives); the debounced suggestion takes the fresh text as an argument.
2. **Derived artifact trusted over source** — `yourZeros` stays deleted; the canon carries the retraction and no prescriptive sequence still asks for it (**found one more surviving instance while writing this test**).
3. **A guard with a hole where the new work went** — the audit can assert visibility; screenshots default to viewport; first-screen geometry is asserted.
4. **Fixing the instance, not the class** — nothing anywhere says "push every area toward 8-9-10".
5. **An invariant documented as enforced, bypassed at the call site** — the focus projection has exactly one call site, inside `applyPriority`, which routes through `setAreaPriority`.
6. **Inputs that go nowhere** — zero uncontrolled `<input>`/`<textarea>` in the file.
   **6b. Controlled ≠ persisted** — the approach journal saves to `sessionJournals`; a half-finished weekly review survives as `weeklyDraft` and is dropped on save.
7. **Phantom slider defaults** — a `?? n` fallback is allowed only with visible unset styling (the real requirement; the fallback itself is unavoidable for a range).
8. **Three taxonomies** — no pillar fan-out: a goal feeds exactly one area. All three goal-creating paths (`parseGoalGenResponse`, `createAreaGoal`, `addRoutineHabit`) stamp an area; the loader migrates legacy blobs.
   **8b. The nag respects the season** — `pendingActions` never demands goals in deprioritised areas; maintenance areas are asked for a floor.
9. **Work invisible across modes** — Guide progress is **derived** from plan state (`guideSessionSatisfied` per session), so a signed plan can't read as "0 of 10".
10. **Promising what the code doesn't do** — the "feeds your driving force" / "joins your daily card" claims are gone.
11. **Losing a day-one rating for a week** — signing seeds the baseline as review week 0, so week one has a "from".
12. **Voice** — no third-person narration in JSX, service session copy, or era labels. The copy lint now lints the newer data files *and* the component's JSX, which is where the hole was.
13. **Machinery and changelog in user copy** — no "AI drafts", no "Redraw AI suggestions", no "…now".

### Measured outcome
- **1963 unit tests**, flow audit **44/44 (exit 0)**, typecheck clean on every touched file, eslint down to 4 pre-existing items.
- **Mobile: 335px of horizontal overflow → 0** on all six screens, now a standing audit check at 390×844. It had never been opened in ~40 verification runs.
- First run: lands on the Guide (`Build it in order`), **wheel 100% visible**, clicking a room **scrolls its panel into view**, **zero guru pronouns on screen**.
