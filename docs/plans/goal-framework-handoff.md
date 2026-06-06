# Goal Framework Redesign — Handoff Brief

**Purpose:** This document hands off a design discussion to the AI currently working on the new goal test page. That page is structurally lacking (skeleton data in some pillars, objectives that split inputs from outputs, hardcoded "one person's" target numbers, no shared-driver dedup). This brief gives the *underlying model* that fixes those problems at the root rather than patching them pillar-by-pillar.

Read this whole thing before touching the data. The point is to stop authoring bespoke content per objective and instead author a small reusable **grammar**, then pour content into it. Most of the problems you're seeing (thin Wealth/Meaning, weirdly specific numbers, input/output split) are symptoms of one missing abstraction.

---

## 1. The core problem, stated precisely

The current framework organizes everything by **outcome** (objectives like "Get Strong", "Transform Your Body", "Master Nutrition"). But the **daily actions that drive outcomes are shared across outcomes.** Gym sessions + eating enough protein + training consistently drive *both* "Get Strong" *and* "Transform Your Body." The inputs are nearly identical; only the outputs differ (strength numbers vs body-comp numbers).

This produces every symptom you've hit:

- Users must pick 3–4 objectives just to assemble a coherent input+output set.
- Objectives are either all-inputs ("Build the Habit", "Master Nutrition") or all-outputs ("Get Strong", "Transform Your Body") — never both.
- The same driver (gym frequency) gets tracked twice if two objectives are selected.
- Wealth/Meaning look thin because nobody has authored the same volume of bespoke outcome-objectives there — and authoring more bespoke ones is the wrong fix.
- Target numbers (bench 100kg, deadlift 180kg) are one person's goals frozen as universal defaults.

**The fix is not "flesh out Wealth and Meaning to match Health."** That just multiplies the bespoke-content problem. The fix is a reusable model.

---

## 2. The reusable grammar: ~5 goal primitives

Every supporting goal in any life area is one of a small number of *types*. These types are the reusable parts. Author the types once; everything else is content.

| Primitive | What it is | Input/Output | Milestone shape (increments) | Done-rule (deterministic) |
|---|---|---|---|---|
| **Volume / Driver** | an input you fully control | INPUT | rising cadence: 3/wk → 4 → 5 | counter ≥ target |
| **Skill / Rate** | a capability or conversion you improve | OUTPUT (process-linked) | checkpoints: can't → clumsy → clean → fluent | self-check ☑ or computed ratio |
| **Target / Metric** | move a number to a value | OUTPUT | waypoints: 100 → 95 → 90 → 85 | measured value hits waypoint |
| **Habit / Streak** | hold a frequency | INPUT | streak lengths: 3 days → 2 wk → 2 mo | consistency over window |
| **Stage / Milestone** | discrete one-time achievement | OUTPUT | first → then → then | checkbox / event fired |

**Critical:** notice your existing target-type system (accumulation, threshold, streak, frequency) is *already half this grammar*:
- accumulation ≈ **Volume**
- threshold ≈ **Target** (and sometimes a **Skill** checkpoint)
- streak ≈ **Habit**
- frequency ≈ **Volume** (cadence flavor)

You're missing two things: (1) the explicit **input vs output (driver vs metric)** axis as a first-class property of every target, and (2) the **Stage** primitive for funnel-shaped journeys (dating especially). Add those, and the grammar is complete.

---

## 3. How the grammar fixes your specific problems

**Problem: inputs and outputs split into separate objectives.**
→ An objective now contains BOTH. "Get Strong" = `Volume(gym sessions)` + `Habit(protein daily)` as drivers, AND `Target(bench/squat/DL 1RM)` + `Skill(lift form)` as metrics. One objective, complete loop.

**Problem: shared drivers tracked twice.**
→ Drivers are **deduplicated at the driver level, not the objective level.** `Volume(gym sessions)` is one entity. "Get Strong" and "Transform Your Body" both *reference* it. Selecting both does not double-count gym sessions — the same driver feeds multiple objectives' metrics. This is the single most important structural change: **drivers are shared, reusable nodes; objectives are bundles of metrics that subscribe to drivers.**

**Problem: hardcoded one-person numbers.**
→ Default target values become **calibrated templates, not truths.** Either (a) ask the user's current level at adopt-time and scale (e.g. "current bench?" → set waypoints relative to it), or (b) ship clearly-labeled starting templates the user is *expected* to adjust. Numbers are seeds, not facts. (Self-determination theory: hardcoded numbers kill ownership.)

**Problem: thin Wealth/Meaning.**
→ Re-express them as compositions of the *same* primitives, not bespoke objectives. Wealth "Build Income" = `Volume(deep work hours)` + `Habit(weekly review)` drivers + `Target(monthly income)` + `Stage(first paying client → first $5k month → first $10k month)` metrics. Same engine, different words. Depth comes from composition, not from hand-authoring 20 unique targets.

---

## 4. Journeys = compositions of typed primitives

A **journey template** = `objective + a composition of typed goals + which drivers it shares + toggle-defaults + unlock dependencies`. The product is a *library* of these, across life areas. Author the engine once; author journeys cheaply forever. **The product's breadth = how many journeys you author; the engine is built once and never per-journey.**

### The funnel insight (matters most for dating)

Some objectives are **conversion funnels**: the objective only happens at the *bottom*, as the output of stacked conversion rates. "Get a girlfriend" is the canonical example:

```
GIRLFRIEND          (select 1 from several women you're dating)
  ▲
ONGOING / sees you again   ← dates that continue
  ▲
DATES               ← numbers that convert
  ▲
NUMBERS (non-flake) ← convos that close
  ▲
GOOD CONVERSATIONS  ← approaches that stick
  ▲
APPROACHES          ← the only pure INPUT you control
```

Key truth: **the user only controls the bottom (approaches = a Volume driver). Everything above is a Rate (Skill) he improves.** So the dating journey is:

```
◆ Get a girlfriend
  DRIVERS:  Volume(approaches)  5/wk→10→15→20
  METRICS:  Skill(open · hold · close)   checkpoints each
            Stage(number → date → 2nd date → ongoing → exclusive)
```

The funnel also gives the **perspective** the framework otherwise lacks. Rough beginner conversion math (illustrative, must be calibratable): ~15% of approaches → number, ~20% of numbers → date, dating 3–4 women to land 1 girlfriend ⇒ on the order of **a few hundred approaches over months.** Showing that reframes "do one approach" from trivial into "rep #1 of ~500 toward the actual goal" — and tells beginners that *volume*, not skill-perfection, is their lever early on. **The "next focus" can be derived deterministically: the weakest conversion rate in the user's own logged funnel = the next skill goal.** No model needed.

### Same engine, different area (proof of generality)

```
◆ Get lean (-20 lbs)
  DRIVERS:  Volume(gym sessions) 2/wk→3→4   ·  Habit(hit protein daily) 3d→2wk→2mo
  METRICS:  Target(bodyweight 200→190→180)  ·  Skill(lift form, cooking)
            Stage(first pull-up → first 5k → photoshoot-ready)
```

Identical machinery — toggleable spread, milestone increments, weakest-stage-is-next-focus logic. Only the content differs.

---

## 5. The hierarchy question (Identity → Pillars → Objectives → Targets)

A debate ran on whether the 4-layer hierarchy is too complex and causes **goal substitution** (planning *feels* like progress, replacing actual action). Resolution that the grammar above supports:

- **Don't collapse the hierarchy. Submerge it.** (Kai/Maya position.) The hierarchy is the *recovery scaffold* — when life disrupts a routine, the user needs the "why" above the habit to find the adapted version. But it should be **set-and-forget at the top, interact-daily at the bottom.**
  - **Identity** = the "why" / the ache. Configured once at onboarding, revisited quarterly, *pinned and always visible* but not edited daily. (This is also the dead-week recovery hook: re-surface the why when `days_since_last_log` is high.)
  - **Pillars** = life areas (Health, Wealth, Relations, Meaning). Static frame.
  - **Objectives** = journeys (compositions of typed primitives). Surfaced monthly during review.
  - **Targets** = the typed primitives themselves (drivers + metrics).
- **The daily interface is just behaviors and their immediate signal** — "today's actions, check them off, get a signal." The upper layers run *underneath*, governing what shows up and why. The user shouldn't be touching Identity/Pillars during normal use. Complexity lives in the model, not in the user's face.

This directly answers Dex's goal-substitution critique: the planning surfaces are submerged, so the user can't substitute planning for doing — the daily surface only offers *doing*.

---

## 6. Determinism is a hard constraint

The system must **not "think" at runtime.** All intelligence is baked into authoring (the grammar + the journey library + the copy), done once. At runtime everything is a table lookup, a counter threshold, or an if-then:

- Placement (where a user starts) = lookup from a short intake → start node. No interpretation.
- Progression = counter hits threshold → node completes → next node unlocks. Pure if-then.
- "Next focus" = weakest logged conversion rate. A sort, not a judgment.
- Dead-week copy = keyed off `days_since_last_log`. A rule, not a model.

Each primitive has a *fixed* milestone-shape and a *fixed* done-rule, so there is no per-journey logic to write. The one place that needs care: **done-rules for fuzzy skills** (e.g. "got a real laugh" in a dating convo isn't auto-countable). Those must degrade to a single honest self-check box — accept the user is honest — rather than anything inferred.

---

## 7. How users actually arrive (don't over-ask at intake)

Real users bring **one loud feeling + one naive goal + a lot of fog** — not a structured goal tree. They cannot self-diagnose ("what's your blocker?") — that's literally why they need the app. Design intake accordingly:

- **Self-placement by recognition, not self-diagnosis.** Show the path; let the user tap the *concrete behavioral* line that's true ("I've never walked up to a woman I don't know" / "I can start a convo but it dies in a minute"). The tap = placement. They read the whole landscape while doing it → perspective lands immediately.
- **Infer and reflect the "why," never ask it point-blank.** Map the placement tier → a prewritten ache ("Most guys who start here say: I feel like I'm behind, like everyone figured this out but me — sound right?"). The user confirms (or picks a sibling phrasing). Feels *read*, not surveyed. The confirmed string becomes the pinned Identity/why.
- **Optional depth is fine.** The user is happy to engage with a richer goal-spread tool *when setting goals* — toggleable rows, adjustable increments. The rule is: depth is opt-in, the daily surface stays minimal, and the system never demands the user author structure they don't yet have.

---

## 8. The toggleable goal-spread tool (what the UI is)

The tool is a **view onto the journey composition**, pre-authored:

```
◆ OBJECTIVE: Get a girlfriend
  ├─ [✓] Driver  approaches        5/wk → 10 → 15 → 20
  ├─ [✓] Skill   open cleanly      1st approach → bail-OK → stay 30s → open 3/outing
  ├─ [ ] Skill   hold a convo      (unlocks when opening is handled)  survive 1m → 3m → real laugh
  ├─ [ ] Skill   close             1st number → non-flake number → 5 numbers
  ├─ [ ] Stage   dates             book 1 → go on 1 → 1st 2nd-date
  └─ [ ] Select  ongoing           dating 2 → dating 3-4 → exclusive
```

- Each row = a supporting goal that **visibly serves the objective at the top.**
- Increments = the milestone ladder inside each row (your existing milestone-distribution-by-type logic applies here).
- Toggleable: beginners run the top rows; lower rows unlock from funnel data, but can be toggled open early to preview what's coming.
- Default-on set = matched to the user's self-placement tier; the rest is opt-in depth.
- **Drivers shown here are shared entities** — if another objective also uses `approaches` or `gym sessions`, it's the *same* node, not a duplicate.

---

## 9. Concrete next steps for the goal test page

In priority order:

1. **Add the input/output (driver/metric) axis** as a first-class property of every target. This is the keystone — everything else depends on it.
2. **Make drivers shared, deduplicated nodes.** Objectives reference drivers; selecting two objectives that share a driver tracks it once. (This is the structural fix to the "Get Strong vs Transform Your Body" problem.)
3. **Restructure each objective to contain BOTH drivers and metrics** (a complete input→output loop), instead of all-input or all-output objectives.
4. **Add the Stage primitive** for funnel journeys (dating), and **derive "next focus" from the weakest logged rate.**
5. **Convert hardcoded numbers to calibrated templates** — ask current level at adopt-time, or label clearly as adjustable seeds.
6. **Re-express Wealth/Meaning as compositions of the same primitives** rather than authoring more bespoke targets. Depth = composition.
7. **Submerge the hierarchy:** daily surface = behaviors + signal only; Identity/Pillars = set-and-forget, pinned, surfaced on review or dead-weeks.

---

## 10. Open decisions (need a human call)

- **Library scope:** dating-adjacent only (girlfriend, abundance, online dating, get-over-ex, social confidence, fitness-for-dating) — keeps it a daygame coach with depth? Or dating + core life areas (fitness, career) as a men's self-improvement platform? Or fully general life-goals system? This decides whether you author ~6 tightly-themed templates or design for an open-ended library.
- **How many life areas show in the perspective frame** — fixed at the current 4 pillars, or vary by user?
- **Driver→metric attribution math** — when a logged driver should visibly move multiple objectives' metrics, what's the fixed formula? (Must be deterministic or the progress signals become fake.)
- **Calibration vs templates** for default numbers — ask-current-level (more accurate, more friction) vs labeled-adjustable-seed (less friction, less ownership)?

---

### One-line summary
Stop authoring bespoke outcome-objectives. Author a 5-primitive grammar (Volume/Skill/Target/Habit/Stage) with an explicit driver-vs-metric axis and shared, deduplicated drivers; make objectives complete input→output loops; make journeys compositions of primitives; keep it 100% deterministic; submerge the hierarchy so the daily surface is just do-the-thing.
