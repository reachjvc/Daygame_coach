# Life Mastery — Room Journey redesign (M1)

## Human summary

The lab was organized by artifact type (one global vision step, one global 10s grid, one global goals step…), so every step touched all 12 areas shallowly — "half-doing everything". This flips the axis: **the wheel is the product; a life area (room) is the unit of work.**

Tapping a room opens a 5-beat guided journey, finishable in minutes, deep not wide:

1. **Dream it** — what does a 10 here look like (present tense, worked example). Stored as the room's 10 (`yourTens`), replaces the separate "Define your 10s" grid.
2. **Locate yourself** — rate today 0-10 (`baselineRatings`, new) + your 0. The wedge fills to the rating; the gap to the 10 is the motivation, visible.
3. **Why it matters** — the room's why (`areaPlans.purpose`).
4. **Goals — the guided part** — coach proposes 2-4 concrete goals from the dream (dates, ladders, driver habits); user circles/edits/dismisses, or writes their own (reuses `AreaGoalComposer`). "bench 100kg" is just writing your own here.
5. **Claim it** — one identity line (`areaPlans.identity`).

Global spine unchanged: commit/manifesto, values, driving force, ritual, balancer, Track. North Star is **composed** from room dreams (room-colored lines) + optional free prose. Prose box remains the secondary path (embedder flow untouched).

**Scrapped:** wants-chips mechanism (v15), the standalone 10s grid section, the room want input. Life Plan merge = M2.

## AI execution notes

- Room dreams become intents (`room-<areaId>`, origin "room", roomLabel) via upsert after beat 1 — downstream gates (`result && phase==="done"`) work unchanged. Auto-draft effect additionally gated on `matchedText.trim()` so room work never auto-fires the LLM; room goals come only from explicit "Suggest goals" (per-room POST to /api/goals/vision-plan with the dream as vision + single intent) or manual authoring.
- Accepted proposals: rebrand ids `room-<areaId>-g<n>` (goal+habits+tasks), set `areaId`, push priorityIds, extendAreaOrder, expand.
- `baselineRatings?: Record<string, number>` added to VisionPlanState (+zod). First weekly evaluation can prefill from it (M2).
- `wheelWants` state/UI removed; schema field remains tolerated for old blobs.
- Rail: drop "Your 10s" chip; pendingActions `tens` repoints to `lm-vision`.
