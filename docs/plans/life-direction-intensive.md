# Life Direction Intensive

Status: **BUILT** 2026-08-09 (sandbox, localStorage). All 6 milestones shipped; UX revision applied; 62 unit tests; verified in browser. Research: `docs/research/ali-abdaal/00-synthesis.md`.

## What this is, in plain language

A long-form guided process — **6 sessions, ~8–11 hours** — that takes someone from "no clear direction" to a written, reality-tested plan with goals they can act on tomorrow. It is meant to be done over days, not in one sitting, and it saves as you go.

The research found that the popular version of this work (Ali Abdaal's) is good at **asking** the direction questions and bad at **carrying the answers forward**. His layers are joined by a human re-reading them each morning. Ours joins them structurally: a value ranked in session 2 is what flags an incoherent goal in session 3; the hours declared in session 0 are what blocks an over-allocated plan in session 5.

**What the user sees:** a session list. Each session is a series of screens, one question at a time, that they can leave and come back to. Sessions unlock as the previous one gets real answers — not clicks. At the end they have a plan they can read as one page and copy out.

**Three things are deliberately hard:** the plan will refuse to advance a goal the user rates under 80% likely to be followed; it will refuse a week that allocates more hours than they said they have; and it will name goals that contradict their own top-ranked values. Those refusals are the product.

## What it is not

Not persisted to the database. This ships to `/test/life-direction` on localStorage like every sibling system. **Real persistence needs a migration and an RLS review with the user and is out of scope here** — see Gate below.

## Sessions

| # | Session | Time | Produces |
|---|---|---|---|
| 0 | Baseline | ~45 min | Archetype score, wheel ratings, energy audit, **constraints** |
| 1 | Reflect | ~75 min | 8 written reflections, 3 focus areas |
| 2 | Direction | ~2.5 h | North star answers, legacy work, 3 scored odyssey plans, **ranked values**, fear-setting |
| 3 | Converge | ~1.75 h | Dream list tagged by horizon, 12-month celebrations, **hour budget**, coherence check |
| 4 | Goal formation | ~2 h | Goals in the 12-field GPS union, **80% realism gate**, lead indicators |
| 5 | Install | ~1.5 h | Ideal week, **fit test**, cadence, accountability, prototype assignment |

## UX revision (2026-08-09)

A review of the first build found one design flaw and a set of interaction problems. All fixed:

- **Focus and portfolio were two lists doing one job.** Celebrations keyed off the focus list while goals keyed off the portfolio, so the two could diverge and leave celebrations with no goal beneath them. Now the portfolio **seeds from the focus areas**, celebrations key off the **portfolio**, and dropping an area removes its celebration and hours with it. Step order changed to portfolio → celebrate.
- **Session checklist moved to the top**, collapsible, above the content instead of below the Next button.
- **Next now validates**, naming what is blank and reading "Next anyway". It deliberately does not block — this runs over days, and trapping someone on a screen loses them.
- **Step position and a progress bar** in every session.
- **Assessment split one dimension per screen** (4 × 5) instead of 20 statements at once.
- **Odyssey split one future per screen** plus a comparison table, so the third is not scored against a memory of the first.
- **Locks explain themselves** ("Finish baseline first, starting with: …"), shown only on the first locked session, with **"Open it anyway"** — recorded in `overrides`, and it never inflates progress.
- **Fit test is actionable in place**: "Give it a slot" opens an inline week grid, "Cut this goal" removes it.
- **Value chips have a real remove affordance**; changing the list warns that the ranking clears.
- Eulogy stems render as stems above their inputs; budget gets a bar that turns red when over.

New shared chrome: `SessionFrame.tsx`. `StepNav` and `CheckList` deleted as superseded.

## Milestones (each is a working app state)

1. **User can open the intensive and complete Session 0**, and their baseline persists across a reload.
2. **User can complete Sessions 1–2** and see their values ranked by forced pairwise comparison.
3. **User can complete Session 3** and be blocked from over-allocating their week.
4. **User can form goals in Session 4** and be blocked below the 80% realism floor.
5. **User can complete Session 5** and see the fit test reject goals that don't fit the week.
6. **User can read the whole plan as one page** and copy it out.

## Acceptance tests

- `ldiProgress` reports a session complete only on evidence, never on visit.
- A goal with either realism percentage under 80 is reported unfinished and cannot be marked ready.
- An hour budget exceeding declared available hours produces an explicit over-allocation error.
- A goal whose area is absent from the top-ranked values produces a coherence warning.
- Reload restores every session's answers.
- No authored field is ever pre-populated (extends the `noFabricatedFields` rule).

## Constraints obeyed

- **Voice policy v2** — copy is our program's voice. No guru names, no "he/his". Research attribution lives in `docs/research/`, not in UI strings.
- **No fabrication** — authored fields start empty and stay empty until the user writes them.
- **No merge** — this does not touch North Star, Life Mastery v1, or the full lab. Their service headers refuse merging deliberately.
- Types in `src/goals/types.ts`, logic in `src/goals/lifeDirectionService.ts` (pure), UI in `src/goals/components/life-direction/`.

## ⛔ Gate before any production use

Persisting this requires new tables (vision, values ranking, area reviews, goals, cadence). Per CLAUDE.md §5 the computed fields here — archetype scores, coherence warnings, progress — are **system-computed, not user-entered**, so they must not get user INSERT/UPDATE policies. **Ask the user before writing any migration or RLS policy.**

---

## AI execution

**New files**
- `src/goals/data/lifeDirection.ts` — sessions, steps, prompt banks, area/domain tables, intake items, scales.
- `src/goals/lifeDirectionService.ts` — pure `plan → plan` reducers + derivations, mirroring `northStarService.ts` conventions (`now = nowIso()`, `serializeLdiPlan`/`loadLdiPlan`, `emptyLdiPlan`).
- `src/goals/components/life-direction/` — `LifeDirectionIntensive.tsx` shell + one component per session.
- `app/test/life-direction/page.tsx` — 7-line client shim.
- `tests/unit/goals/lifeDirectionService.test.ts`.

**Edited files**
- `src/goals/types.ts` — append the `Ldi*` block at the end. No existing type changes.
- `app/test/page.tsx` — append one `testPages` entry. Icon: `Signpost`. `Compass` was rejected — `iconRoles.ts` already assigns it to "navigation, direction, principles section", and reusing a registered icon in a new context needs approval.

**Storage key:** `ldi-v1`. **Container:** `max-w-3xl` (dominant sibling width).
**Step engine:** `useSteppedFlow` from `src/shared/useSteppedFlow.ts`.
