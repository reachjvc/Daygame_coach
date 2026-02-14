# Better Goals

As for everything else in this project, we're aiming for absolute best quality. No shortcuts are ever necessary. Think of the best possible quality we can create for every feature, and the site as a whole.

> **EDITING RULE:** When cleaning up this doc, consolidate *structure and prose* — never collapse, merge, or remove individual list items (goals, categories, variants). Every brainstormed item stays until explicitly removed by the user.

## Reference Diagrams

![Goal 1 - Career hierarchy](/goal%20pictures/goal%201.jpg)
![Goal 2 - Dating hierarchy (approaches, habits)](/goal%20pictures/goal%202.jpg)
![Goal 2 continued - Instadates, phone numbers, outcomes](/goal%20pictures/goal%203.jpg)

## Objective

Users should EASILY create goal hierarchies. The system does the hard work. Manual creation of 60+ sub-goals is a non-starter.

## Architecture: The Goal Graph

Goals aren't a rigid template — they're a **graph of known relationships**. Users can enter at any level. The system helps them fan out downward and optionally connect upward.

### Goal Levels

**Level 0 — Life dream:**
- Get married to my dream girl
- Start a happy and loving family
- Find the love of my life

**Level 1 — Major life goal ("one person" flavor):**
- Get a girlfriend
- Find my dream girl
- Get engaged to my dream girl
- Be in a deeply fulfilling relationship
- Find "the one"

**Level 1 — Major life goal ("abundance" flavor):**
- Build a rotation
- Have an abundant dating life
- Sleep with X women
- Date very attractive women
- Have casual options whenever I want
- Experience variety before settling down

**Level 2 — Transformation / mastery (confidence & inner game):**
- Become the man I want to be
- Become confident with women
- Never fear rejection again
- Overcome approach anxiety permanently
- Feel worthy of love / attractive
- Become socially fearless
- Develop unshakeable self-worth
- Develop masculine frame / leadership

**Level 2 — Transformation / mastery (skill-focused):**
- Master daygame
- Master cold approach
- Become great at talking to women
- Master seduction / attraction
- Become "naturally" attractive (no techniques needed)
- Master dating (being great on dates)
- Master texting game
- Master night game
- Master social circle game
- Master online dating

**Level 2 — Transformation / mastery (lifestyle):**
- Never worry about dating again
- Have total dating freedom
- Be able to attract any woman I want
- Be the guy women approach
- Build an attractive lifestyle
- Maximize physical attractiveness

**Level 2 — Transformation / mastery (meta):**
- Become a daygame coach / mentor
- Document my journey

**Level 3 — Specific skill / metric (input):**
- Approach volume (cumulative: 1 → 5 → 10 → ... → 1000)
- Approach frequency (habit ramp: 10/week → 15/week → 25/week)
- Session frequency (days per week in field)
- Consecutive days approaching
- Hours in field (cumulative)
- Texting conversations initiated
- Dates planned / executed
- Voice notes / field reports recorded

**Level 3 — Specific skill / metric (outcome):**
- Phone numbers collected
- Instadates
- Day2s / dates from cold approach
- Second dates
- Kiss closes
- Sex / lays from daygame
- Women dating simultaneously (rotation size)
- Sustained rotation for X months

**Any level can be a user's entry point.** Someone entering "Master daygame" at Level 2 gets the same downward fan-out as someone whose Level 0 goal cascaded through to it.

### Smart Prompting (two directions)

**Downward:** "To achieve 'Master Daygame', most people work on these areas: [approach volume, frequency, numbers, instadates, ...]. Which do you want to include?"

**Upward:** "Is 'Master Daygame' part of a bigger goal for you? People often connect it to 'Get a Girlfriend' or 'Dating Abundance'."

Every goal knows what it **fans into** (down) and what it **could belong to** (up). Users build in both directions.

### Goal Types

| Type | Example | Reporting |
|------|---------|-----------|
| **Input** (green) | Approaches/week, videos/week | Recurring |
| **Outcome** (red) | Phone numbers, subscribers, instadates | One-time date |
| **Habit Ramp** | 25/week: prove once → 4wk → 8wk → 12wk | Graduated duration |
| **Milestone Ladder** | 1 → 5 → 10 → 25 → ... → 1000 | Progressive targets |

### Date Derivation

Milestone dates aren't arbitrary — they derive from the habit ramp. If you define the ramp (10/week months 1-3, 15/week months 4-6, 25/week months 7+), cumulative milestones + dates fall out mathematically. Outcome milestones estimated via conversion rates.

---

## Design Decisions

### Decision 1: Goal Catalog — DECIDED

Full catalog lives in "Goal Levels" section above.

**DECIDED:**
- Fan-outs are **defaults** — user can toggle any sub-goal on/off
- Keep direct language (phone numbers, instadates, dates, etc.) — no sanitizing
- All L1 goals (both "one person" and "abundance" flavors) share the same default L3 targets for v1
- **v2:** Differentiate sub-goals between "one person" and "abundance" flavors

**Fan-out edges (v1):**

Any L1 goal → these L2 achievements:
- Master Daygame
- Become Confident with Women

Any L2 achievement → all L3 goals below (same set for both achievements in v1):

| Category | L3 Goal | Type | Default Target |
|----------|---------|------|---------------|
| Field Work | Approach Volume | Milestone ladder | 1 → 1000 |
| Field Work | Approach Frequency | Habit ramp | 10/wk → 25/wk |
| Field Work | Session Frequency | Habit ramp | 3 days/wk |
| Field Work | Consecutive Days | Milestone ladder | 1 → 30 |
| Results | Phone Numbers | Milestone ladder | 1 → 25 |
| Results | Instadates | Milestone ladder | 1 → 10 |
| Results | Dates (cold approach) | Milestone ladder | 1 → 15 |
| Results | Second Dates | Milestone ladder | 1 → 10 |
| Dirty Dog | Kiss Closes | Milestone ladder | 1 → 15 |
| Dirty Dog | Lays | Milestone ladder | 1 → 10 |
| Dirty Dog | Rotation Size | Milestone ladder | 1 → 3 |
| Dirty Dog | Sustained Rotation | Habit ramp | 1 → 6 months |

**v2 TODO:** Revisit and brainstorm more L3 goals (Hours in Field, Voice Notes / Field Reports, Texting Conversations, Dates Planned, etc.). Also differentiate which L3 goals feed into which achievements with different weights.

### Decision 2: Goal Display Categories — DECIDED

L3 goals are organized into display categories:

| Category | Contains | Default |
|----------|----------|---------|
| **Field Work** | Approaches/wk, sessions, hours, consecutive days | Shown |
| **Results** | Phone numbers, instadates, dates, 2nd dates | Shown |
| **Dirty Dog Goals** | Lays, kiss closes, rotation size, sustained rotation | **Opt-in** |

"Dirty dog goals" is a collapsed opt-in section with playful copy. Not hidden or shameful — just behind one click. Keeps the default view commercially clean while being honest about what users actually track.

### Decision 3: L2 Goals = Achievements (Badges) — DECIDED

L2 goals (Master Daygame, Become Confident, etc.) are **not** structural parents. They are **achievement badges** that sit prominently near L1, above the L3 work goals.

**Visual hierarchy:**
```
L1: Get a Girlfriend
  🏆 Master Daygame         ██████░░░░  62% of milestones reached
  🏆 Become Confident       ████░░░░░░  40% of milestones reached

  ── Field Work ──────────────────────
  📊 Approaches/week         15/wk → 25
  📊 Sessions/week           3/wk

  ── Results ─────────────────────────
  🎯 Phone numbers           3 / 25
  🎯 Instadates              1 / 10
  🎯 Dates                   0 / 15

  ── Dirty Dog Goals ─── [expand ▾]
```

**Achievement progress:** Weighted composite of contributing L3 goal completions. Each L3 goal that "feeds into" an achievement contributes a weighted %. Wording: **"X% of milestones reached toward this achievement"** — honest about the fact that mastery is subjective, but gives a meaningful progress signal.

**Achievement weights (v1):** All L3 goals feed into both achievements with the same weights. Approach Volume = 50%, remaining 50% distributed:

| L3 Goal | Weight |
|---------|--------|
| Approach Volume | **50%** |
| Approach Frequency | 8% |
| Session Frequency | 4% |
| Consecutive Days | 3% |
| Phone Numbers | 10% |
| Instadates | 7% |
| Dates (cold approach) | 7% |
| Second Dates | 3% |
| Kiss Closes | 2% |
| Lays | 3% |
| Rotation Size | 1.5% |
| Sustained Rotation | 1.5% |

**Auto-redistribution:** When a user removes a goal, its weight redistributes proportionally across remaining goals (so total always = 100%). E.g., removing Phone Numbers (10%) bumps all others up by ~11% of their current weight.

**v2 TODO:** Differentiate weights between "Master Daygame" (more results-weighted) and "Become Confident" (more exposure/consistency-weighted). For v1, same weights for both achievements.

### Decision 4: Milestone Curve Editor — DECIDED

Users configure milestone ladders via an interactive XY curve editor:

1. User sets: target value (e.g., 1000), start value (e.g., 1), number of steps (e.g., 15)
2. System plots a **default semi-logarithmic curve** (front-loaded: early wins close together, bigger gaps later)
3. User sees dots on a graph (Y = metric value, X = step number) + milestone values listed beside it
4. User can **drag 2-3 control points** to reshape the curve (like a bezier editor)
5. All milestones recalculate smoothly as curve reshapes
6. Power users can also **edit individual milestone values** directly in a list view

**Default curve:** Semi-logarithmic (front-loaded). Most users will just use this.

**Open question:** Exact control point UX — bezier handles vs. draggable midpoint vs. slider. Will prototype and test.

### Decision 5: Default Targets & Milestone Shapes — IN PROGRESS

Sensible defaults for each L3 category (users always customize):
- Approach volume: [1, 5, 10, 25, 40, 60, 80, 100, 150, 200, 300, 400, 500, 750, 1000]
- Phone numbers: [1, 2, 5, 10, 15, 25]
- Instadates: [1, 2, 5, 10]
- Dates from cold approach: [1, 2, 5, 10, 15]
- Habit ramp steps: [prove once, 1 week, 2 weeks, 4 weeks, 8 weeks, 12 weeks]

**DECIDED:**
- No fixed conversion rates — users self-select based on their skill level
- Users pick their own ramp starting point (not forced to start at 10/wk)
- Milestone dates derive from user's chosen ramp schedule, not arbitrary
- Date derivation should be intelligent — based on target date for the big goal working backward, not just fixed defaults

### Decision 6: UX Flow — DECIDED (v1)

**Option C: "Just get me started"** for v1 onboarding:
1. User picks ONE goal at any level (e.g., "Get a Girlfriend")
2. System generates the full recommended tree with defaults
3. User can customize (toggle goals, adjust targets, reshape curves) after generation
4. All other flows (wizard, interactive tree builder) planned for future iterations

### Decision 7: Daily Loop & Dopamine — DECIDED

Two views, two rhythms:

**Daily view (action mode):** What the user sees 80% of the time.
- Weekly targets + current progress ("12/15 approaches, 2 days left")
- **Next** milestone only, not final target ("Next: 25 approaches — 5 to go")
- Streak counter ("Week 8 of your daygame journey")

**Strategic view (meaning mode):** Visited ~weekly.
- Full milestone ladder with position marked
- Achievement badge progress
- Date projections ("at current pace, you'll hit 500 by September")
- Curve editor lives here

**Two dopamine clocks:**
- **Heartbeat (weekly):** Recurring targets create short cycles. Streaks add loss aversion.
- **Arc (milestones):** Cumulative, never resets. Bad weeks don't erase progress. Front-loaded curve = rapid early wins.

**Celebration cascade:** log approach → subtle tick. Weekly target hit → toast. Milestone hit → confetti. Achievement threshold crossed → epic.

**Off-day framing:** Show next milestone as opportunity, not guilt. "5 approaches from your next milestone" = pull, not push.

### Decision 8: Time Commitment — DEFERRED (v2+)

Possibly an optional input where user estimates hours/week per life area. Purpose: reality-check whether their goal timeline is realistic given time investment. Skipping in v1.

### Decision 8: Non-Dating Domains — DEFERRED

Daygame/dating first. After it's solid, add high-value templates: book writing, YouTube channel, financial independence, fitness, etc. (Phase 5+)

---

## Implementation Plan

**HUMAN** = domain expertise only you can provide
**AI** = pure implementation
**COLLAB** = your input, then AI implements

### Phase 0: Goal Graph Content (HUMAN) — DONE

0.1 ✅ Define goal catalog across all levels (done — see "Goal Levels" above)
0.2 ✅ Fan-out edges defined (see Decision 1). Both flavors share same L3 defaults for v1.
0.3 ✅ Define default targets, milestone shapes (done — see Decision 5). Conversion rates: user-chosen, not fixed.
0.4 ✅ UX direction decided: Option C for v1 (see Decision 6)

### Phase 1: Type System & Data Model (AI)

1.1 — Add `goal_nature: "input" | "outcome"` to type system + migration
1.2 — Add habit ramp goal type + fields + migration
1.3 — Goal graph data model (goals, edges, defaults) as static data files
1.4 — Achievement model: L2 goals as badges with weighted progress from L3 goals
1.5 — Goal display categories: field_work, results, dirty_dog (with opt-in flag)

### Phase 2: Algorithms (AI)

2.1 — Milestone ladder generator (start + target + steps + curve shape → milestones)
2.2 — Curve engine: semi-logarithmic default, bezier control points for reshaping
2.3 — Habit-derived date calculator (ramp schedule → cumulative milestone dates)
2.4 — Achievement progress calculator (weighted composite of child goal completions)

### Phase 3: Template Content (HUMAN + AI)

3.1 ✅ Fan-out edges + achievement weights authored (see Decision 1 + Decision 3)
3.2 — Encode into data files (AI)

### Phase 4: UI (AI)

4.1 — Goal entry point picker ("Just get me started" — Option C flow)
4.2 — Fan-out customization (toggle sub-goals on/off, adjust targets)
4.3 — Achievement badges display (near L1, progress bars, milestone % wording)
4.4 — Goal categories display (Field Work / Results / Dirty Dog Goals sections)
4.5 — Milestone curve editor (XY graph + control points + list view)
4.6 — Ramp schedule UI (user picks starting frequency, ramp steps)
4.7 — Upward connection prompts ("Is this part of a bigger goal?")
4.8 — Visual input/outcome distinction (green/red)

### Phase 5: Future (DEFERRED)

5.1 — Non-dating domain templates
5.2 — AI-assisted decomposition for unknown goal types
5.3 — Advanced UX flows (wizard, interactive tree builder)
5.4 — Time commitment reality-checker
5.5 — **Brainstorm more L3 goals:** Hours in Field, Voice Notes / Field Reports, Texting Conversations, Dates Planned, etc.
5.6 — **Differentiate L1 flavors:** "One person" vs "abundance" get different default sub-goals and targets
5.7 — **Differentiate achievement weights:** "Master Daygame" weights results higher, "Become Confident" weights exposure/consistency higher

### Work Summary

| Phase | Who | What | Status |
|-------|-----|------|--------|
| **0** | HUMAN | Goal graph content (catalog, edges, targets, UX) | ✅ DONE |
| **1.1-1.5** | AI | Type system, data model, migrations | READY |
| **2.1-2.4** | AI | Algorithms (milestone gen, curves, dates, achievement progress) | ✅ DONE (milestoneService.ts) |
| **3.1** | HUMAN | Author goal graph content | ✅ DONE |
| **3.2** | AI | Encode into data files | READY |
| **4.1-4.8** | AI | All UI | READY (after 1 + 3.2) |
| **5.1-5.4** | AI | Future enhancements (deferrable) | DEFERRED |

**No HUMAN blockers remaining.** All phases are AI-implementable. Recommended build order: 1 → 3.2 → 4 (algorithms already done in Phase 2).
