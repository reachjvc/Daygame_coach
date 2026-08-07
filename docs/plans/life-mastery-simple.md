# Life Mastery, simple flow — `/test/life-mastery`

**Status:** shipped (sandbox). Full lab stays at `/test/vision-plan`, untouched.

## What it is

Three screens, no LLM, no API, localStorage only.

1. **Your why.** Opens by asking how far out the picture sits (five · ten · twenty, ten preselected, with his reasoning behind it). Then a ladder, one question per screen, framed "Ten years from now, on an ordinary Tuesday". Seven concrete rungs (where you wake up · who is there · your days · your body · money · fun · then "take the limits off"), each showing a sentence opener in front of the box so the task is finishing a sentence. Answered rungs stack into a "your vision, so far" panel underneath. Screen 8 hands over that paragraph, assembled, to edit. Screen 9 asks the why and the cost of standing still. Every rung is skippable; only vision + why count as "done".
2. **Your areas.** The 12 Blueprint areas as cards. Rename any (typing the Blueprint name back clears the rename), put unused ones aside into a tray, add your own areas. Type a goal, enter, type the next. Pasting a multi-line list splits it one goal per line and strips bullets/numbering.
3. **Why per goal.** One card per goal. The why box asks a rotating question (8 angles) instead of showing the word "why". Then the cost of not doing it, a date, belief + desire 0-10 (under 7 warns), and the "I will easily…" sentence with a one-click draft. Ends with the whole plan read back as plain text, copyable.

## Why step 1 is a ladder (v2)

v1 put thirteen questions on one screen with an index. It failed the only test that matters: the user could not write with it. Three different jobs shared the page (describe the picture · list your reasons · define who you are), so each box was a fresh blank page and nothing fed anything else, and it opened with the most abstract question in the set.

The rebuild: one job per screen, concrete before abstract, a visible sentence opener per question, and the answers assembling into the vision in front of you. The reasons moved after the picture. The identity questions moved to step 3.

## The horizon is ten years, not three (v3)

Checked against the transcripts, not the data files. He never prompts a five-year picture, and three years is a **goal** horizon in his taxonomy, so the original "three years from now" frame quietly turned the vision into a plan and fought the last rung, which asks for the limits to come off.

- Vision: "the goals are just milestones, stepping stones that lead you to achieving a higher vision that's maybe 10 or 20 or 30 years from now. So the goals are more short-term, typically a year or less. When you go beyond a year it becomes a lot harder to manage and measure" (Kz83kMosOWU). Also 2V06cH1z3Qo, Rw2qaMltFcY ("10, 20, 30, 40, 50 years out… totally unrealistic"), oLQiUIJ7PsQ ("I do always have a vision ten to twenty years").
- Five years appears in three other jobs: a **sorting bucket** after the 50-item brainstorm ("what can I achieve in the next 12 months, put a one beside it… then a three… then a five, then a ten year", I1MhBE-0zxU); **leverage**, both directions ("what's my life going to be like 5 years, 10 years from now if I don't take action", xw5RUrN4Eow); and as one option in the perfect-day range ("any day that you want for your life 5 10 20 years from now", 9RxHchflvVs).
- So: default 10, offer his 5 / 10 / 20, and put that quote behind "why these". The cost-of-not copy moved from three years to five, which is his own phrasing.
- The horizon gets **screen one of the ladder**, not a caption. It decides what every question after it means, and as an 11px line above an unchanged "Where do you wake up?" the change was invisible. A returning visit skips it and resumes where the writing stopped.

## Decisions

- **Separate from `visionPlanService`.** That module runs the whole system (intents, balancer, horizons, rituals, weekly evaluation). None of it is wanted here, so the flow has its own state shape and its own service.
- **Ids never get reused.** `goalSeq`/`areaSeq` only go up. Deriving the next id from the highest live id hands a deleted goal's id to the next one written, and anything keyed by id then shows dead state.
- **Custom areas get one neutral colour.** The twelve carry a palette validated as a set (CVD + contrast); adding to it without re-running that check breaks it.
- **Load is tolerant, save is whole.** Unknown answer keys and goals in areas that no longer exist are dropped on load; a corrupt blob loads as null and the flow starts empty rather than throwing.
- **The rail is not a gate.** Every step is reachable at any time. Forcing the order on someone who wants to jot goals first only loses the goals. The end of step 1 nudges rather than blocks, for the same reason.
- **The assembly only ever uses words the user saw.** The paragraph is the leads (shown in front of each box) plus the answers. Three rules decide whether a lead is used: a lead ending in a comma always stays, an answer repeating the lead keeps its own copy, and an answer starting "I"/"We" stands alone. Nothing else counts as a sentence, because "my partner and our two kids" is a noun phrase.
- **An edited vision is never overwritten.** Assembly runs once, on arrival at the draft screen with the box empty. After that the only route back to the raw assembly is the explicit rebuild button.

## Files

| File | What |
|---|---|
| `app/test/life-mastery/page.tsx` | Route |
| `src/goals/components/life-mastery/LifeMasteryFlow.tsx` | Shell: rail, storage, reset |
| `src/goals/components/life-mastery/WhyStep.tsx` | Step 1 |
| `src/goals/components/life-mastery/AreasStep.tsx` | Step 2 |
| `src/goals/components/life-mastery/QualifyStep.tsx` | Step 3 + read-back |
| `src/goals/lifeMasteryService.ts` | All state logic (pure) |
| `src/goals/data/lifeMasteryWhy.ts` | 7 ladder rungs + why/cost + 3 identity + 8 goal angles |
| `src/goals/types.ts` | `LifeMasteryPlan` (incl. `horizonYears`), `SimpleGoal`, `ResolvedArea`, `LifeMasteryProgress` |
| `tests/unit/goals/lifeMasterySimple.test.ts` | 61 tests |

Storage key: `lm-simple-v1`.

## Verified

`npm test` green. Scripted browser pass at 1280px and 390px: choose a horizon on the opening screen and confirm the ladder carries it, walk all seven rungs (skipping one) → check the assembled paragraph exactly → edit it → rebuild → why + cost → paste a bulleted list into Money → qualify a goal → identity → reload and confirm the read-back and that step 1 resumes where the work stopped. No console errors, no horizontal overflow at 390px.

## Not built

Nothing writes to `user_goals`. Promotion to prod would reuse the `fw:` mapper path the new-goals flow uses (see `docs/plans/` for that flow), and would need a decision on whether the rung answers live in a table or stay on the vision record.
