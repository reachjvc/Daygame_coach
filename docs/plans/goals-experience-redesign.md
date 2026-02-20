# Goals Experience Redesign — Master Plan

## Guiding Principle

**"What is best long term" over "what to do first."** Every decision — template structure, UI choice, hierarchy model — must answer: *does this create the best possible product?* Get one template (dating) right before expanding. Explore many creative combinations before committing. Rethink structural assumptions (L2 in the tree) rather than patching them. Never rush convergence.

## Mission Summary

Rethink the goals experience across 6 dimensions:
1. **Visual/UX**: 10 creative V5 test variants mixing Aurora, Orrery, Circuit, and new themes (Neural, Expedition, Command Deck, Garden). User compares, picks favorites, we iterate.
2. **Structural**: Test extracting L2 achievements from goal tree into parallel gamification layer (badges/trophies earned from L3 progress). Some variants use old tree model, some use new flat+badges model.
3. **Templates**: Audit dating templates first, fix overlaps, deepen path differentiation. Then expand all areas equally.
4. **Interconnection**: Wire goals to field reports, sessions, reviews via expanded LinkedMetric system.
5. **Widgets**: After UX settles, build workout logger, meditation timer, vice tracker, etc.
6. **Daily Experience**: Make the daily return experience feel alive — progress-first home screen, heatmap calendar, streak mechanics, projections, celebrations, weekly review ritual. (Phase 6)

Setup flow in Phase 1, daily hub in Phase 6 (requirements defined upfront, built last after site design settles). Templates curated first (Phase 2.1-2.2), then V5 test pages use the real, solid templates — no fake demo data.

---

## Daily Hub Requirements (Built in Phase 6 — But Setup Must Serve This)

The setup flow runs once. The daily hub is what users see every day. Setup decisions that ignore the daily experience will create mismatches. These requirements constrain what the setup flow can create.

**What the daily hub must display (post-setup):**
- Today's actionable goals: daily habits to check off, weekly counters to increment → **Phase 6.1 (Today's Pulse)**
- Progress toward milestones: visual indicator of how close to next milestone step → **Phase 6.7 (Projection Timeline)**
- Streak status: current weekly streak, days active this week → **Phase 6.4 (Streak Mechanics)**
- Quick-log entry points: start session, log approach, write field report — each connected to relevant goals → **Phase 5.2 + 6.1**
- Achievement/badge progress (if L2 extraction is chosen): badges earning toward, % progress → **Phase 6.8 (Achievement Tiers)**
- Life area health overview: which areas are on track, which are stalling → **Phase 6.1 + 6.2 (Heatmap)**

**Constraints on setup flow:**
- Every goal created must have a clear daily/weekly action the user performs
- Goals must map to an input method (session tracker, manual increment, linked metric, or future widget)
- The hierarchy created must be displayable in a compact daily view (no 50-goal flat lists)

**Constraints on templates:**
- If a goal can't be answered "what do I do today/this week for this?", it's not a good L3 template
- L1 goals are context/motivation, not trackable — they should never appear in the daily view

---

## Production Impact & Migration

**Existing user goals**: Users may already have goals in the L1→L2→L3 tree structure.

**Strategy**: The setup flow redesign is additive — it's a new route (`/dashboard/goals/setup`). The existing Goals Hub (`/dashboard/goals`) and all existing goals remain untouched. Migration decisions happen in Phase 4 when we promote the winning variant to production.

**During Phases 1-2**: Zero production impact. Test pages are isolated in `app/test/`. Template changes in `goalGraph.ts` only affect NEW goal creation — existing DB rows have their own `title`, `category`, etc. and don't reference templates after creation.

**Phase 4 migration plan** (defined later, but flagged now):
- Existing goals keep working as-is
- New setup flow creates goals using new templates
- If L2 extraction is chosen: existing L2 goal rows become orphaned — need migration to convert them to badge records or archive them
- User opt-in: "Want to re-setup your goals with the new experience?" rather than forced migration

**Phase 6 migrations** (4 schema changes, all additive — no breaking changes):
- `ALTER TABLE user_goals ADD COLUMN streak_freezes INTEGER DEFAULT 0;` (6.4)
- `ALTER TABLE user_goals ADD COLUMN motivation_note TEXT;` (6.6)
- `CREATE TABLE daily_goal_snapshots (...)` (6.2)
- `CREATE TABLE weekly_reviews (...)` (6.9)
- All are nullable/defaulted columns or new tables — zero impact on existing data

---

## V1-V4 Test Page Cleanup

19 existing test page variants across V1-V4. After V5 is built, that's 29 test pages.

**Policy**: V1-V4 test pages remain as reference during V5 development (agents may need to read V4 components for reuse). After Phase 4 (production consolidation), archive V1-V4 by moving to `app/test/_archive/`. Do not delete — they contain reusable animation code and SVG patterns.

---

## Structural Rethink: L2 Achievements → Parallel Gamification

**Current**: L0 → L1 → L2 → L3 (achievements are tree nodes)
- 38 L2 achievements, 500+ weight entries, purely derived from L3 progress
- Users never directly edit L2s; they're read-only aggregations

**Proposed**: Extract L2 from tree → badge engine
- **Goal tree**: L0 → L1 → L3 (what you actually track)
- **Badge system**: L2s earned passively as L3 progress accumulates, using existing `PER_L2_WEIGHTS`
- Unlock tiers: 25%/50%/75%/100% thresholds → trophy case / achievement wall
- Cross-area achievements become natural (meditation feeds both PG and Daygame badges)

**Phase 1 tests the visual/UX feel** (does flat+badges feel cleaner than tree?).
**Phase 2.1b proves architectural viability** (can `PER_L2_WEIGHTS` work decoupled from the tree?).
These are independent questions — one is "should we?" and the other is "can we?".

Variants A/B/C/H/J use old tree; D/E/F/I use flat+badges; G uses network graph.

Key files: `goalGraph.ts` (edges), `goalHierarchyService.ts` (progress), `milestoneService.ts` (weights), `GoalHierarchyView.tsx`, `GoalCatalogPicker.tsx`

---

## Universal Step Structure & Fork Handling

Every setup flow variant must answer three design questions. This table locks down the answers per variant so agents don't guess.

### The 3 Design Questions

**Q1: What are the steps?** Three flow models exist:

| Flow Model | Steps | Used By |
|------------|-------|---------|
| **Linear Wizard** | 1. Welcome/Direction → 2. Select Goals → 3. Customize Targets → 4. Preview/Visualize → 5. Summary/Confirm | A, B, C, E, F, H, J |
| **Non-Linear Explorer** | No fixed order. Dashboard shows all areas. Tap area → mini-flow (pick L1 → toggle L3s → set targets). Done when user says done. | D |
| **Network Activator** | 1. See full network → 2. Activate nodes (multi-select, any order) → 3. Customize activated goals → 4. Summary | G, I |

**Q2: Where does the FTO/Abundance fork happen?**

| Fork Model | When | Used By |
|------------|------|---------|
| **Fork-First** | Step 1 starts with FTO vs Abundance. Filters which L1/L3 defaults appear. | A, B, C, E |
| **Area-First, Fork Inside** | Step 1 picks life areas. When configuring daygame area, FTO/Abundance is a sub-choice within that area. | D, F, I |
| **Exploration (no explicit fork)** | All goals visible. User activates what they want. FTO/Abundance is implicit in which goals they pick. | G |
| **Discovery Fork** | User "discovers" the fork as they explore territories/seasons. Daygame region reveals two paths when entered. | H, J |

**Q3: How are L2 achievements shown?**

| L2 Model | Display | Used By |
|----------|---------|---------|
| **Tree Node** | L2s appear in goal picker between L1 and L3. User sees and toggles them. Hierarchy: L1→L2→L3. | A, B, C, H, J |
| **Parallel Badges** | L2s NOT in goal picker. After setup, shown as a separate badge/trophy wall. Progress computed from L3s. | D, F, I |
| **Signal Processors** | L2s shown as processing nodes in a signal flow diagram. Not selectable — they "light up" when L3 inputs feed them. | E |
| **Neural Clusters** | L2s shown as neuron clusters that activate when enough connected L3 nodes are active. Visual, not selectable. | G |

---

## Phase 1: Creative Exploration (V5 Test Pages)

**Purpose**: Build variant test pages in two batches. Batch 1 (4 variants) gets fast feedback. Batch 2 (6 variants) is informed by that feedback. This avoids 10,000+ lines of throwaway code.

### Step 1.0a — Extract Shared Theme Components
Before building V5, move reusable V4 components to a shared location so V5 imports aren't brittle cross-folder references.

**Move to `app/test/shared-themes/`:**
- `AuroraSkyCanvas.tsx` (from V4-C) — aurora ribbons, mountains, stars, particles
- `CircuitBackground.tsx` (from V3-D) — PCB grid, data pulse dots
- `AstrolabeStepGauge.tsx` (from V4-A) — brass step indicator pattern
- `OrreryVisualization.tsx` (from V4-A) — brass solar system SVG

These are copies, not moves — V4 pages keep working.

### Step 1.0b — Scaffolding
Create test page infrastructure. Uses real curated templates from goalGraph (Phase 2.1-2.2 runs first).

**Hub page** (`app/test/goalsv5/page.tsx`):
- Grid of variant cards with thumbnails/descriptions (starts with 4, grows to 10)
- Click → full-screen variant experience
- Back button to return to grid

**Shared data layer** (`app/test/goalsv5/useGoalData.ts`):
- Hook that reads from real `goalGraph.ts` templates (curated in Phase 2)
- Mock progress data for summary screens (simulated current_value/progress_percentage)
- Provides both tree-model data (for A/B/C/H/J) and flat+badges data (for D/E/F/I/G)
- For non-daygame areas: show 2-3 placeholder goals per area with minimal templates (enough to test layout, not template quality)

### Batch 1 — Build 4 Variants (Maximum Spread)
One from each category: direct mashup, non-linear, L2 extraction test, novel concept. Covers all 4 evaluation axes with minimum build cost.

**Why these 4**: A is the user's stated preference, D tests a fundamentally different flow, F directly tests the L2 extraction hypothesis, and one wild card (G or I) tests a novel visual language.

### Step 1.1 — Variant A: "Aurora-Orrery Hybrid" (Direct Mashup) ⚡ LOW complexity
80% reuse from V4. The combination user described. **Hierarchy: Traditional tree (L1→L2→L3).**
- Step 1: Aurora `AuroraSkyCanvas` + ribbons + mountains + path selection
- Steps 2-3: Aurora goal picker + customizer, Orrery `AstrolabeStepGauge` as **sticky bottom bar**
- Summary: Orrery brass, redesigned — collapsible brass panels per life area, "System Stats" card

Reuses: `AuroraSkyCanvas` (V4-C), `AuroraLanding` (V4-C), `AuroraGoalPicker` (V4-C), `AstrolabeStepGauge` pattern (V4-A)

New: `variant-a/StickyAstrolabeNav.tsx`, `variant-a/CollapsibleBrassSummary.tsx`

### Step 1.2 — Variant B: "Aurora-Circuit Fusion" ⚡ MEDIUM complexity
Requires blending two visual systems + custom chip components. **Hierarchy: Traditional tree.**
- Step 1: Aurora sky + PCB module grid for life areas, data pulse animations
- Step indicator: Circuit chip-bar with aurora gradient (green→cyan→purple)
- Goal picker: Goals as processor chips with data flow lines to parents
- Summary: Brass frame + PCB interior, goals as interconnected nodes

New: `variant-b/AuroraCircuitLanding.tsx`, `variant-b/ChipGoalPicker.tsx`, `variant-b/CircuitSummary.tsx`

### Step 1.3 — Variant C: "Theme Journey" (Per-Step Theme) 🔥 HIGH complexity
5 different theme systems + crossfade transitions. Most code of any variant. **Hierarchy: Traditional tree.**
- Step 1 (Choose): Aurora sky — serene
- Step 2 (Select Goals): Circuit/PCB — analytical
- Step 3 (Customize): Forge/Molten — crafting
- Step 4 (Visualize): Constellation — big-picture
- Step 5 (Complete): Aurora+Brass — accomplished
- Crossfade transitions between worlds

New: `variant-c/TransitionWrapper.tsx`, `variant-c/ForgeCustomizer.tsx`

### Step 1.4 — Variant D: "Living Dashboard" (Non-Linear) ⚡ MEDIUM complexity
Novel interaction model but simpler visuals (aurora + ghost data). **Hierarchy: Flat L1→L3.**
- Landing IS the dashboard with ghost/placeholder data
- Life areas as aurora weather systems — stronger pulse = more goals
- Tap area → drill in and configure
- No linear steps — configure in any order
- Ghost data becomes real progressively

New: `variant-d/DashboardPreview.tsx`, `variant-d/AreaDrillIn.tsx`, `variant-d/GhostData.tsx`

### Step 1.5 — Variant E: "Signal Flow" (Gamification-Heavy) 🔥 HIGH complexity
Custom node graph with animated data flow + XP calculations. **Hierarchy: Flat L1→L3, L2s as signal processors.**
- Landing: CPU chip, life areas as hardware modules
- Goals as signal nodes — inputs → processing → outputs
- Data flow animations showing L3→L2 contribution in real-time
- XP preview for selected goal set
- Milestones as firmware upgrades

New: `variant-e/SignalFlowDiagram.tsx`, `variant-e/FirmwareUpgradeList.tsx`, `variant-e/XPProjection.tsx`

### Step 1.6 — Variant F: "Trophy Room" (Achievement Extraction Test) ⚡ MEDIUM complexity
Simple aurora landing + flat picker (reuse) + new trophy wall component. **Hierarchy: Flat L1→L3 + separate badge wall.**
- Aurora landing + simplified goal picker (L1→L3 only, no L2 in selection)
- After setup: Achievement Wall — all L2 badges in trophy case layout
- Each badge: weighted progress bar, contributing L3s listed, % contribution breakdown
- Glow/unlock at 25%/50%/75%/100% thresholds
- Key question: does removing L2 from tree feel cleaner?

New: `variant-f/FlatGoalPicker.tsx`, `variant-f/TrophyRoom.tsx`, `variant-f/AchievementBadgeWall.tsx`

### Step 1.7 — Variant G: "Neural Pathways" (Network Graph) 🔥 HIGH complexity
Custom SVG network graph from scratch, synapse animations, entirely new visual language. **Hierarchy: Network graph (goals can have multiple parents).**
- Landing: Abstract neural network — nodes for life areas, synapses connecting
- Selecting goals lights up pathways between areas
- Cross-area connections visible: meditation node → both PG and Daygame
- Completed goals fire synapse pulse animations
- Achievement "neural clusters" — groups that activate together

New: `variant-g/NeuralCanvas.tsx`, `variant-g/SynapseGoalPicker.tsx`, `variant-g/NeuralClusterBadge.tsx`

### Step 1.8 — Variant H: "Expedition Map" (Cartography) 🔥 HIGH complexity
Custom SVG map with fog-of-war system, progressive reveal, parchment aesthetic from scratch. **Hierarchy: Traditional tree.**
- Landing: Parchment map with fog of war over life area territories
- Picking goals reveals map sections — more goals = more visible terrain
- Progress fills in detailed features (rivers, mountains, settlements)
- Achievements as landmarks discovered on the map
- Expedition log sidebar (future connection to field reports)

New: `variant-h/ExpeditionMap.tsx`, `variant-h/FogOfWar.tsx`, `variant-h/LandmarkAchievements.tsx`

### Step 1.9 — Variant I: "Command Deck" (Space Ops) ⚡ MEDIUM complexity
Can reuse Circuit's scan aesthetic; ship bridge is mostly panel layout + status indicators. **Hierarchy: Flat L1→L3 + badges as system certifications.**
- Life areas as ship systems: Daygame=Weapons, Fitness=Engines, Social=Comms, Career=Nav, etc.
- Landing: Bridge overview with system status panels
- Goals as system calibrations
- Launch readiness meter — all systems need minimum thresholds
- Scanlines, blinking indicators, data streams aesthetic

New: `variant-i/ShipBridge.tsx`, `variant-i/SystemPanel.tsx`, `variant-i/LaunchReadiness.tsx`

### Step 1.10 — Variant J: "Seasons/Growth" (Organic) ⚡ MEDIUM complexity
Custom SVG garden but more illustration than interactive graph. Plant growth = CSS animations. **Hierarchy: Traditional tree.**
- Landing: Garden with seasonal cycle (spring→summer→autumn→winter)
- Goals as seeds → sprouts → plants → fruit (visual progression)
- Life areas as garden zones (herb garden, orchard, field, greenhouse)
- Time-based goals mapped to seasons (daily→spring, weekly→summer, etc.)
- Achievements as harvests — bundles of mature goals

New: `variant-j/GardenCanvas.tsx`, `variant-j/PlantGrowth.tsx`, `variant-j/SeasonalCycle.tsx`

### Step 1.11 — Batch 1 Review
- User explores Batch 1 (4 variants) at `/test/goalsv5`
- Key questions to answer:
  - **Hierarchy**: Tree (A) vs Flat+Badges (D/F) vs Network (G/I)?
  - **Flow**: Linear wizard (A) vs Non-linear (D)?
  - **Theme**: Which visual language resonates? Which feels forced?
  - **Gamification**: Too much? Too little?
- Feedback determines which Batch 2 variants to prioritize

### Batch 2 — Build Remaining Variants (Informed by Batch 1 Feedback)
After Batch 1 review, build the remaining 6 variants. User feedback may reprioritize: if linear wizard + aurora won hard, we might skip building more non-linear variants and instead build more aurora mutations.

**Batch 2 candidates** (all 6, or a subset based on feedback): B, C, E, H, I, J

### Step 1.12 — Full Review & V5.1 Iterations
- User explores all built variants
- Collects preferences across 4 axes:
  - **Hierarchy**: Tree (A/B/C/H/J) vs Flat+Badges (D/E/F/I) vs Network (G)?
  - **Flow**: Linear wizard (A/B/C/E) vs Non-linear (D) vs Hybrid?
  - **Theme**: Aurora-dominant vs Circuit-dominant vs Mixed vs New (H/J)?
  - **Gamification**: Subtle (A/D) vs Medium (B/C/H) vs Heavy (E/F/G/I)?
- Build V5.1 mashups combining winning elements
- Iterate until confident

---

## Phase 2: Goal Template & Data Overhaul

### 2.1a — L2 Badge Engine Prototype (Architecture Proof)
**Resolve the circular dependency**: V5 variants test whether L2 extraction *feels* right. This step proves it *works* technically. Done before any visual work.

Build a standalone service (`src/goals/badgeEngineService.ts`) that:
1. Takes a flat list of L3 goals with progress
2. Reads `PER_L2_WEIGHTS` from goalGraph
3. Computes L2 badge progress for each L2 (same math as `computeAchievementProgress()`)
4. Returns badge status: { badgeId, progress%, tier (bronze/silver/gold/platinum), unlocked: boolean }

This proves L2 extraction is architecturally viable WITHOUT changing any existing code. Pure additive — if it works, V5 flat+badge variants can use it. If it doesn't, we know before investing in 5 variants.

**Files**: `src/goals/badgeEngineService.ts` (new), `tests/unit/badgeEngine.test.ts` (new)
**Validation**: Unit tests pass. Same progress % as existing `computeAchievementProgress()` for identical inputs.

### 2.1b — Deep Audit of Dating Templates

**Methodology** (step-by-step, AI-implementable):

1. **Extract full inventory**: Read `goalGraph.ts`. For every daygame L3 template, record:
   - Template ID, title, display_category
   - tracking_type (counter/percentage/streak/boolean)
   - templateType (milestone_ladder / habit_ramp / null)
   - linkedMetric (if any)
   - defaultMilestoneConfig or defaultRampSteps (if any)
   - Which L2s it feeds (via edges) and at what weight

2. **Real-world action mapping**: For each L3, answer:
   - What specific real-world action does the user perform?
   - How frequently? (daily/weekly/monthly)
   - Can this be auto-tracked from existing data? (sessions, approaches, field reports)
   - If not auto-tracked, what INPUT METHOD makes sense? (manual counter, timer, boolean check, etc.)

3. **Overlap detection**: Find L3 pairs where:
   - Same real-world action with different template IDs (e.g., "Second Dates" in two categories)
   - One is a subset of another (e.g., "Approach Volume" and "Session Frequency" both measure approaching)
   - Redundant at the tracking level (user would increment both from the same action)

4. **Gap detection**: Identify missing goals using Claude's knowledge of dating coaching curricula + web research for major coaching programs. **FLAG: All gap suggestions must be reviewed by user before adding — Claude's gaps are educated guesses, not authoritative.** Categories to check:
   - **Inner game**: Anxiety management, self-talk, state control, frame
   - **Outer game**: Body language, eye contact, vocal tonality, fashion/grooming
   - **Logistics**: Venue knowledge, date spot rotation, scheduling efficiency
   - **Relationship skills**: Emotional intelligence, conflict resolution, boundary setting
   - **Meta-skills**: Review discipline, peer feedback, coaching sessions attended

5. **L1 path evaluation**: For FTO vs Abundance, document:
   - Which L3s are shared vs path-specific (currently: ALL shared)
   - Which L3s SHOULD be path-specific (e.g., "Rotation Size" = Abundance only, "Deep Connection Score" = FTO only)
   - Proposed default enablement per path

6. **L2 evaluation**: For each daygame L2 achievement:
   - Is it a meaningful milestone, or just a grouping label?
   - What would it mean to "earn" this as a badge?
   - Does it overlap with existing milestones in `milestones.ts`?
   - Proposed unlock threshold (what % of weighted L3 progress = badge earned?)

**Deliverable**: `docs/plans/dating-template-audit.md` containing all findings + specific recommendations (merge/split/add/remove/rewire)

### 2.2 — Restructure Dating Templates

**Decision framework** (apply to each audit finding):

| Finding Type | Action | Example |
|-------------|--------|---------|
| Duplicate L3 | Merge into one, update all edges | "Second Dates" → single `l3_second_dates` in `dates` category |
| Subset L3 | Keep the broader one, remove subset | If "Session Frequency" is subset of "Approach Frequency", remove one |
| Missing gap | Add new L3 template with: ID, title, category, tracking_type, linkedMetric, default config | "Vocal Tonality Practice" → `l3_vocal_tonality`, `field_work`, counter, weekly |
| Shared L3 that should be path-specific | Keep L3, add path-specific default enablement in `buildPreviewState()` | "Rotation Size" → enabled by default for Abundance, disabled for FTO |
| L2 that overlaps with milestone | Merge L2 badge with existing milestone, or keep if meaningfully different | If `l2_overcome_aa` overlaps `approach_anxiety_conquered` milestone → merge |
| L2 that's just a label | Either make it meaningful (define unlock criteria) or remove | If "Master Texting" has only 3 L3s and weak differentiation → evaluate |

**Concrete code changes**:
- `goalGraph.ts`: Add/remove/rename template constants, update `GOAL_GRAPH_EDGES`, update `PER_L2_WEIGHTS`
- `goalTypes.ts`: Add new `GoalDisplayCategory` values if needed (e.g., `inner_game`, `logistics`)
- `goalsService.ts`: Modify `buildPreviewState()` to accept `path: 'fto' | 'abundance'` parameter
- `lifeAreas.ts`: Remove deprecated flat `suggestions` for daygame (replaced by goalGraph)

**Validation**: After restructure, run `npm test`. Architecture tests must pass. No duplicate template IDs.

### 2.3 — Expand All Non-Daygame Equally
Bring every area to comparable depth:
- Fitness: workout metrics, nutrition, body comp, flexibility, cardio
- Personal Growth: meditation, reading, journaling, emotional regulation
- Social: events, friendships, hosting, public speaking
- Career: deep work, revenue, skills, networking
- Lifestyle: creative, cooking, travel, style, home
- Vices: porn freedom, screen time, dopamine, alcohol, sleep

### 2.4 — Template-Reporting Map
Document for every L3: what feeds it? Session tracker (exists), field reports (exists), goal increment (exists), workout logger (needs build), meditation timer (needs build), etc.

---

## Phase 3: Interconnectedness

### 3.1 — Expand LinkedMetric System
Add: `gym_sessions_weekly`, `meditation_minutes_weekly`, `social_events_weekly`, `porn_free_days_streak`, `deep_work_hours_weekly`, `field_reports_weekly`, etc.

### 3.2 — Auto-Sync Triggers
Fire `syncLinkedGoals()` after: session end, field report submit, workout log. Show toast.

### 3.3 — Review ↔ Goals
Weekly: momentum score. Monthly: progress charts. Quarterly: re-evaluation prompts.
**Note**: The weekly momentum score data layer built here feeds directly into Phase 6.9 (Weekly Review Ritual), which builds the user-facing UI. Phase 3.3 = data plumbing, Phase 6.9 = experience.

### 3.4 — Cross-Area Connections
Meditation → Overcome AA. Gym → Confidence. `cross_area_edges` in goalGraph.

---

## Phase 4: Production Consolidation

### 4.1 — Extract Winning Theme Components to `src/goals/components/themes/`
### 4.2 — Build Production Setup Flow (`GoalSetupFlow.tsx` + step components + route)
### 4.3 — Redesign Summary for 5+ Life Areas (collapsible panels)
### 4.4 — Wire to DB (existing batch API + redirect to Goals Hub)

---

## Phase 5: New Reporting Widgets (After UX Settled)

### 5.1 — Workout Logger (exercises, sets, reps, weight → fitness goals)
### 5.2 — Habit Check-In Grid (daily one-tap grid → goal increment)
**Note**: This widget provides the compact logging surface. Phase 6.1 (Today's Pulse) wraps it with a progress-first view — build the grid here, embed it in 6.1's layout later.
### 5.3 — Meditation Timer (timer + auto-log minutes)
### 5.4 — Vice Streak Tracker (days since + emergency save button)
### 5.5 — Social Event Logger (type, count, quality → social goals)
### 5.6 — Lair Widget Integration (replace PlaceholderWidgets)

---

## Execution Order

**Templates + architecture proof first, then visuals in two batches.**

```
Phase 2.1a (L2 badge engine prototype — prove extraction works) ←── START HERE
  ↓ parallel:
Phase 2.1b (dating template deep audit)
  ↓
Phase 2.2 (dating template restructure — get one area right)
  ↓
Phase 2.4 (template-reporting map — know what feeds what)
  ↓
Phase 1.0a (extract shared theme components to app/test/shared-themes/)
Phase 1.0b (scaffolding — hub page + shared data layer)
  ↓
Phase 1 Batch 1 (4 variants: A, D, F, + one wild card)
  ↓ user reviews Batch 1
Phase 1 Batch 2 (remaining variants, informed by feedback — may skip some)
  ↓ user reviews all, picks direction
Phase 1.12 (V5.1 mashup iterations)
  ↓ user confirms direction + hierarchy model
Phase 2.3 (expand all non-daygame areas equally)
  ↓
Phase 4 (production consolidation — winning variant + complete templates)
  ↓ parallel:
Phase 3.1-3.2 (LinkedMetric + auto-sync)
  ↓
Phase 3.3-3.4 (reviews + cross-area)
  ↓
Phase 5 (reporting widgets)
  ↓
Phase 6 (daily experience — making goals feel alive)
  ⚠️ STOP: Ask user whether to implement as-written or adapt to current site design first
  ↓ user confirms approach
Phase 6.5 (time-of-day + nudges — pure frontend, no deps)
Phase 6.4 (streak freeze — migration + reset logic tweak)
Phase 6.6 (self-authored "why" — migration + form field)
  ↓ parallel with above:
Phase 6.1 (progress-first home — depends on Phase 4 page structure)
Phase 6.3 (milestone celebrations — enrich existing dialog)
  ↓
Phase 6.7 (projection timeline — new component, existing math)
Phase 6.8 (achievement tiers — depends on Phase 2.1a badge decision)
  ↓
Phase 6.2 (heatmap — needs daily_goal_snapshots table + snapshot hook)
Phase 6.9 (weekly review — needs 6.2 snapshot data)
Phase 6.10 (progressive onboarding — depends on Phase 4 setup flow)
```

## Verification & Quality Gates

Each phase has a concrete "done" check. Do not proceed to next phase without passing.

### Phase 2.1 (Audit) — Gate: Review Approval
- `docs/plans/dating-template-audit.md` exists with all 6 methodology sections completed
- User reviews and approves findings before restructuring begins

### Phase 2.1a (Badge Prototype) — Gate: Parity Test
- `badgeEngineService.ts` exists with unit tests
- For identical inputs, produces same progress % as existing `computeAchievementProgress()`
- Tests pass

### Phase 2.2 (Restructure) — Gate: Tests Pass + No Regressions
- `npm test` passes (architecture tests, goalGraph tests, no duplicate IDs)
- Every L3 has a documented real-world action and input method
- FTO/Abundance paths produce different default goal sets (verify with unit test)
- **If tree model kept**: No orphaned L2s (every L2 has ≥2 L3 children with weights summing to 1.0)
- **If badge model chosen**: Every L2 has unlock threshold defined, weights sum to 1.0 in badge catalog, `badgeEngineService` handles all L2s

### Phase 2.4 (Reporting Map) — Gate: Complete Coverage
- Every L3 in goalGraph has a row in the reporting map
- Every "NEEDS BUILD" item is linked to a specific Phase 5 step

### Phase 1.0 (Scaffolding) — Gate: Hub Page Renders
- Shared theme components exist in `app/test/shared-themes/`
- `localhost:3000/test/goalsv5` shows hub page
- `useGoalData` hook returns data for both tree and flat models
- `npm run build` succeeds

### Phase 1 Batch 1 (4 Variants) — Gate: All 4 Clickable + User Feedback
- Each variant: hub → full flow → all steps → summary (no console errors)
- Each variant matches its spec: correct hierarchy model, fork model, L2 model
- User has reviewed and given feedback directing Batch 2 priorities

### Phase 1 Batch 2 (Remaining) — Gate: All Built Variants Clickable
- Same clickability gate as Batch 1 for each built variant
- User may skip some Batch 2 variants based on Batch 1 feedback — that's fine

### Phase 1.12 (Iterations) — Gate: User Picks Direction
- User has explicitly confirmed: hierarchy model, flow type, theme direction, gamification level
- V5.1 mashup variant exists incorporating those choices

### Phase 4 (Production) — Gate: E2E Test
- Production setup flow at `/dashboard/goals/setup` works end-to-end
- Can create real goals in DB via batch API
- Redirects to Goals Hub with created goals visible
- `npm test` passes

### Phase 6 (Daily Experience) — Gate: Per-Item Acceptance + Migrations

**Entry gate**: AI has asked user whether to implement as-written or adapt to current design. User has confirmed approach.

**Per-item gates** (each item is independently shippable):
- 6.1: User sees aggregate daily progress before individual goal list. `npm test` passes.
- 6.2: `daily_goal_snapshots` table exists. Heatmap renders with real data after ≥2 days of use. Snapshot fires before daily reset. Migration delivered.
- 6.3: Milestone dialog shows milestone number, value, ladder progress, projected next date. Not just confetti.
- 6.4: `streak_freezes` column exists. Missing one day with banked freeze preserves streak. `resetDailyGoals()` unit test covers freeze logic. Migration delivered.
- 6.5: Page renders differently at 8am vs 2pm vs 8pm (verify with Playwright by mocking time). "Almost there" label appears at >80% progress.
- 6.6: `motivation_note` column exists. Note appears on stale goals (>7 days no increment). Migration delivered.
- 6.7: `ProjectionTimeline` component renders milestones with past/future distinction and pacing label.
- 6.8: Achievement badges show tier (bronze/silver/gold/diamond). Tier upgrade triggers celebration.
- 6.9: `weekly_reviews` table exists. Weekly summary shows completion rate, streak, best/worst day, mood input. Migration delivered.
- 6.10: New users see "Start small" vs "Go all in" choice. Simple-track creates exactly 1 goal.

**All items**: `npm test` passes. No regressions in existing goal tests.

## Implementation Notes

- **All V5 variants** go in `app/test/goalsv5/` — isolated from production, zero production impact
- **Shared theme components** extracted to `app/test/shared-themes/` — V5 imports from there, not V4 folders
- **Templates curated first** → V5 test pages use real, solid goalGraph data (not fake demo data)
- **Each variant** self-contained in its own `variant-X/` subfolder
- **Batch 1 before Batch 2**: Build 4, get feedback, then build more. Avoids 10k+ lines of throwaway code
- **Agent team builds**: Each variant is independent — can assign 1 agent per variant, no file conflicts
- **Non-daygame areas in V5**: Show 2-3 placeholder goals per non-daygame area (enough to test layout, not template quality)
- **V1-V4 test pages**: Keep as reference during V5 development, archive to `app/test/_archive/` after Phase 4
- Phase 3-5 steps get detailed sub-plans when we reach them

---

## Phase 6: Daily Experience — Making Goals Feel Alive

> **⚠️ IMPLEMENTATION CAVEAT**: Before implementing ANY item in this phase, the AI must first ask the user:
> *"Phase 6 items were designed before the backend/UX overhaul from Phases 1-4 landed. The site may look and work very differently now. Should I implement this as-written, or should we first walk through each item together and figure out how it fits the current design?"*
>
> Phases 1-4 will likely change the page structure, hierarchy model, and visual language significantly. Phase 6 ideas are **intent-level specs** — the "what" and "why" are stable, but the "how" must adapt to whatever the site looks like when we get here.

### Why This Phase Exists

Phases 1-5 focus on setup flow, templates, interconnections, and widgets. None of them address the **daily return experience** — what users see and feel when they come back each day. The goal page currently presents powerful data as a static list with buttons. This phase transforms it into something that feels alive, responsive, and motivating.

Research basis: Duolingo (streaks + leagues), Finch (companion + energy), Fabulous (rituals + sensory cues), Strava (social + kudos), Forest (consequence + accumulation), Strides (projections + pacing), GitHub (heatmap calendar). Stanford Persuasive Tech Lab data: light gamification (streaks + milestones) retains 41% at 90 days vs 23% for heavy gamification.

---

### 6.1 — Progress-First Home Screen ("Today's Pulse")

**Problem**: Users land on a goal list. Lists feel like work. The first thing users see should be *how they're doing*, not *what they need to do*.

**What to build**:
- Replace/augment the default daily view landing with a progress-first section above the goal list
- One dominant metric: "75% of today's goals done" or "3 of 4 complete" — as a filling ring or bar
- Individual goal rings/cards below (compact, tappable to expand and log)
- "N remaining" summary when partially complete
- Full completion state: celebratory visual, "All done for today" message

**Existing code to leverage**:
- `isDailyActionable()` in `goalsService.ts` — already filters to today's goals
- `progress_percentage` computed on every `GoalWithProgress`
- `DashboardView` component has life-area cards with circular progress — similar pattern, different scope

**Key design questions (resolve with user at implementation time)**:
- Does this replace `DailyActionView` or sit above it?
- Does it aggregate across all daily goals, or per life area?
- How does it interact with whatever view system Phase 1/4 established?

**Acceptance**: User sees overall daily completion progress before seeing individual goal list items.

---

### 6.2 — GitHub-Style Heatmap Calendar

**Problem**: No long-term consistency visualization. Users can't see their patterns over weeks/months. The heatmap is the single most information-dense progress view — it creates its own motivation through pattern visibility.

**What to build**:
- Year-long (or 12-week) grid of colored cells, one per day
- Color intensity = % of daily goals completed that day (not binary)
- Tappable cells show that day's breakdown
- Place in Strategic view, or as a dedicated "History" tab

**Critical data gap — must solve first**:
- Currently, `resetDailyGoals()` resets daily goals without persisting the prior day's completion state
- Need a `daily_goal_snapshots` table (or similar) that captures `{user_id, date, goals_total, goals_completed, completion_pct}`
- Snapshot must fire BEFORE daily reset (cron job, or on first visit of new day)
- Migration required: `supabase/migrations/xxx_daily_snapshots.sql`

**Existing code to leverage**:
- `resetDailyGoals()` in `goalRepo.ts` — hook snapshot into this flow
- `curveThemes.ts` zen/cyberpunk themes — reuse color systems for heatmap cells

**Acceptance**: User sees a multi-week colored grid showing daily completion rates. Tapping a cell shows that day's details. Historical data accumulates over time.

---

### 6.3 — Milestone Celebrations That Feel Personal

**Problem**: Current `CelebrationOverlay` uses tier-based confetti (subtle → epic). Confetti is generic. Celebrations should be contextual — showing what was achieved, what's next, and why it matters.

**What to build**:
- Redesign `MilestoneCompleteDialog` to show:
  - Which milestone number out of total (e.g., "Milestone 5 of 15")
  - The specific value achieved (e.g., "80 Approaches")
  - Visual progress through the milestone ladder (filled dots for past, hollow for future)
  - Projected date for next milestone (from `computeProjectedDate()`)
  - A contextual encouragement line (e.g., "You've done more approaches than most people who start daygame ever will")
- Different visual treatments per tier (subtle toast for daily, full-screen for life milestones)

**Existing code to leverage**:
- `getNextMilestoneInfo()`, `getMilestoneLadderValues()`, `computeProjectedDate()` — all exist in `goalsService.ts`
- `getCelebrationTier()` — already maps time horizon to celebration intensity
- `MilestoneCompleteDialog` — exists, needs enrichment not replacement

**Acceptance**: Milestone completion shows specific milestone number, value, progress ladder, and projected next date — not just generic confetti.

---

### 6.4 — Streak Mechanics That Don't Punish

**Problem**: Streaks break on one missed day with no safety net. Research: punitive mechanics drive away everyone except competitive personalities. Duolingo's streak freeze is the gold standard.

**What to build**:

**A. Streak Freeze**
- Every 7-day streak earns 1 streak freeze (auto-banked, max 2-3)
- Missing a day auto-uses a freeze instead of breaking the streak
- Display freeze count near streak: "🔥 14 days (1 freeze banked)"
- New column: `streak_freezes INTEGER DEFAULT 0` on `user_goals` or `user_profiles`
- Modify `resetDailyGoals()`: check for freezes before resetting streak to 0

**B. Recovery Visibility**
- When a streak breaks, show comeback: "🔥 14 → 0 → 3" — the recovery is visible
- Prominent "Personal Best" display: `best_streak` already tracked, just surface it

**Existing code to leverage**:
- `resetDailyGoals()` in `goalRepo.ts` — already handles streak increment/reset logic
- `best_streak` field already exists on `UserGoalRow`
- `formatStreakLabel()` in `goalsService.ts` — extend for freeze display

**Migration**: `ALTER TABLE user_goals ADD COLUMN streak_freezes INTEGER DEFAULT 0;`

**Acceptance**: Missing one day with a banked freeze does NOT reset streak. Streak freeze count visible. Personal best streak always visible.

---

### 6.5 — Time-of-Day & "Almost There" Dynamics

**Problem**: The page is static — it looks the same at 7am and 7pm. Nothing responds to context.

**What to build**:

**A. Time-of-Day Context**
- Morning (before noon): Emphasis on "X goals for today", fresh/energetic tone, prominent quick-log buttons
- Afternoon (noon-6pm): "X remaining, Y done ✓", warmer tone, progress emphasis
- Evening (after 6pm): "Today's results" summary, reflection-oriented, tomorrow preview
- Purely conditional rendering — no data model change, just different UI emphasis per time bracket

**B. Weekly Rhythm Indicator**
- For weekly-period goals: show day-by-day progress through the week
- `Mon ✓ Tue ✓ Wed ● Thu ○ Fri ○` style display
- Uses existing `getDaysLeftInWeek()` from `goalsService.ts`

**C. "Almost There" Nudges**
- When a goal is >80% complete for its period, highlight it differently
- Add a label: "One more!" or "Almost there"
- Conditional CSS class + label on `GoalCard` when `current_value / target_value > 0.8`

**Existing code to leverage**:
- `getDaysLeftInWeek()` in `goalsService.ts`
- `GoalCard` component — add conditional rendering
- User's timezone preference already stored (from `GoalTimeSettingsDialog`)

**Acceptance**: Page feels different at different times of day. Weekly goals show day-by-day progress. Goals near completion are visually highlighted.

---

### 6.6 — Self-Authored Motivation ("Why" Notes)

**Problem**: When users slip, they see nothing. Generic motivational quotes don't work. Research (Spark app): self-authored phrases are significantly more effective.

**What to build**:
- Optional `motivation_note TEXT` field on goals (or on L1 parent level for inheritance)
- Prompt during goal creation: "Why does this matter to you?" (optional, skippable)
- Surface the note when:
  - A streak breaks: "Remember why you started: *[their note]*"
  - Revisiting a stale goal (no increment in 7+ days): show note as banner
  - Weekly review (6.9): goals + their personal reasons

**Migration**: `ALTER TABLE user_goals ADD COLUMN motivation_note TEXT;`

**Existing code to leverage**:
- `GoalFormModal` — add optional text field
- `GoalCard` — conditional note display based on staleness/streak-break

**Acceptance**: Users can add a "why" to any goal. The note surfaces automatically when motivation is most needed (streak break, stale goal).

---

### 6.7 — Projection Timeline (Make the Future Visible)

**Problem**: `computeProjectedDate()` and `computeRampMilestoneDates()` exist but are hidden inside the milestone dialog. Users can't see their trajectory at a glance.

**What to build**:
- A `ProjectionTimeline` component for goal detail/expanded view:
  - Horizontal milestone ladder: filled circles for passed milestones, hollow for future
  - Projected dates below future milestones (from ramp math)
  - Pacing indicator: compare actual weekly rate to target weekly rate
  - "Ahead of schedule" / "On pace" / "Behind" label with color coding
- Works for both `milestone_ladder` and `habit_ramp` goal types

**Existing code to leverage**:
- `getMilestoneLadderValues()` — returns all milestone values
- `computeProjectedDate()` — returns projected completion dates
- `computeRampMilestoneDates()` — returns week-by-week milestone dates
- `getNextMilestoneInfo()` — returns next milestone value and remaining

**Pacing calculation (new)**:
- For milestone_ladder: `actual_rate = current_value / weeks_since_start`, `target_rate = target_value / total_weeks`
- For habit_ramp: compare actual weekly frequency to current ramp step's `frequencyPerWeek`

**Acceptance**: Expanded goal card shows all milestones on a timeline with past/future distinction, projected dates, and pacing indicator.

---

### 6.8 — Achievement Tier System (Badge Wall)

**Problem**: L2 achievement progress is computed (weighted from L3 siblings) but doesn't feel like unlocking. It's a number in the Strategic view.

**What to build**:
- Tier thresholds on L2 achievements: 25% = Bronze, 50% = Silver, 75% = Gold, 100% = Diamond
- Tier upgrade triggers a specific celebration (different visual from goal completion)
- Achievement Wall / Trophy Case: a dedicated section or view showing all L2 badges with tier visuals
- Each badge shows: tier icon, progress %, contributing L3 goals on tap, weight contribution per goal

**Depends on Phase 2.1a decision**:
- If L2 extraction was chosen (flat+badges model): this is the primary badge display
- If traditional tree was kept: this is an additional view layer on top of existing `GoalHierarchyView`
- Either way, the tier math is the same — just different placement

**Existing code to leverage**:
- `computeAchievementProgress()` in `milestoneService.ts` — returns weighted progress + per-goal contributions
- `AchievementBadge` component — exists, needs tier visuals added
- `badgeEngineService.ts` — may exist from Phase 2.1a with tier logic already built

**Acceptance**: Achievements have visible tiers. Crossing a tier threshold triggers a celebration. A trophy case view shows all achievements with their tier status.

---

### 6.9 — Weekly Review Ritual

**Problem**: No structured reflection. Users log daily but never step back to assess. Strides sends weekly summaries. Fabulous has daily reflections connecting choices to outcomes.

**What to build**:
- A "Weekly Review" view or modal, accessible on-demand and prompted on Sunday/Monday
- Content:
  - Completion rate this week vs last week (↑↓ indicator)
  - Current streak status
  - Best and worst days
  - Milestones hit this week (from milestone history)
  - Next week's targets (from habit ramp progression)
  - Simple mood/energy check: "How did this week feel?" → [Great] [Okay] [Tough]
- Mood stored for trend tracking: `weekly_reviews` table with `{user_id, week_start, completion_pct, mood, notes}`

**Depends on 6.2 (heatmap)**:
- Shares the `daily_goal_snapshots` data for per-day completion rates
- If 6.2 hasn't been built yet, the weekly review needs its own snapshot mechanism

**Existing code to leverage**:
- All goal progress data already available via `/api/goals/tree`
- Streak data on each goal
- Habit ramp step progression in `goalsService.ts`

**Migration**: `CREATE TABLE weekly_reviews (id UUID, user_id UUID REFERENCES profiles(id), week_start DATE, completion_pct REAL, mood TEXT, notes TEXT, created_at TIMESTAMPTZ DEFAULT now());`

**Acceptance**: Users can see a weekly summary with completion trends, milestone achievements, and mood tracking. Data persists for trend analysis.

---

### 6.10 — Progressive Onboarding (Two-Track)

**Problem**: The `GoalCatalogPicker` is powerful but overwhelming for first-time users. Fabulous's research: start with ONE keystone habit, layer in more as confidence builds.

**What to build**:

**Track A — "Just One Thing" (cautious users)**
- Simplified picker: choose one L3 goal, skip the full tree
- Start tracking immediately
- After 1 week of consistency, prompt: "Ready to add more? Here's what people who track [X] also track..."
- Gradually reveal hierarchy and more goals

**Track B — "All In" (ambitious users, current flow)**
- Keep the current catalog picker / whatever Phase 4 established
- Add a "Recommended starter pack" preset: curated 5-goal set per life area

**Choice point**: During onboarding, user picks their pace: "Start small" vs "Go all in"

**Existing code to leverage**:
- `GoalCatalogPicker` — keep for Track B
- `generateGoalTreeInserts()` — could generate a minimal 1-goal subset for Track A
- Goal graph edges — power "related goals" suggestions after the first week

**Acceptance**: New users choose between simple (1 goal) and full (tree) onboarding. Simple-track users get prompted to expand after demonstrating consistency.

---

### 6.x — Execution Notes for Phase 6

**Ordering within Phase 6** (recommended priority):

| Step | Impact | Effort | Depends On |
|------|--------|--------|------------|
| 6.5 (time-of-day + nudges) | High | Low | Nothing — pure frontend |
| 6.1 (progress-first home) | High | Medium | Phase 4 page structure |
| 6.4 (streak freeze) | Medium | Low | Migration |
| 6.6 (self-authored "why") | Medium | Low | Migration |
| 6.3 (milestone celebrations) | High | Low-Med | Existing milestone math |
| 6.7 (projection timeline) | High | Medium | Existing projection math |
| 6.8 (achievement tiers) | Medium | Low-Med | Phase 2.1a badge decision |
| 6.2 (heatmap calendar) | Very High | Med-High | New snapshot table + migration |
| 6.9 (weekly review) | High | Medium | 6.2 snapshot data or own snapshot |
| 6.10 (progressive onboarding) | Medium | Low-Med | Phase 4 setup flow |

**Backend changes in Phase 6** (not all frontend):
- 6.2: New `daily_goal_snapshots` table + snapshot-on-reset hook
- 6.4: `streak_freezes` column + modified reset logic
- 6.6: `motivation_note` column
- 6.9: New `weekly_reviews` table

**Research references**:
- Duolingo: streak freeze, league system, 22 gamification elements
- Finch: companion energy tied to completion, anti-shame design, seasonal events
- Fabulous: ritual cues (chime + illustration + countdown), journey chapters, commitment ceremony
- Strava: kudos (lightweight social feedback), segments (competition even when alone)
- Forest: loss aversion (tree dies if you leave), accumulated visual landscape
- Spark: self-authored motivation phrases, progressive difficulty, home-screen metrics over push notifications
- Strides: 4 goal types, pacing indicators, trend visualization
- Stanford Persuasive Tech Lab: light gamification (streaks + milestones) = 41% 90-day retention; heavy gamification = 23%. Light gamification users 52% more likely to maintain habit after quitting app.
- GitHub contribution heatmap: cross-domain adoption as consistency visualization
