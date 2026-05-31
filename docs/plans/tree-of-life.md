# Tree of Life — Goal System Revamp

## Vision

Replace the current flat/list-based goal creation with a **visual tree that grows as the user builds their life**. Values (from Inner Game) become the **soil** — the invisible foundation that feeds everything above ground.

The tree is not decoration. It's the primary interface for understanding "where am I, what feeds what, and what should I do today."

---

## Current State (As-Is)

### Goals System

**Data model** — `user_goals` table with 30+ columns:
- Hierarchy: `parent_goal_id`, `goal_level` (0=dream, 1=major, 2=achievement, 3=skill), `template_id`
- Tracking: `tracking_type` (counter|percentage|streak|boolean), `period` (daily→yearly), `current_value`, `target_value`
- Phases: `goal_phase` (acquisition → consolidation → graduated)
- Types: `goal_type` (recurring|milestone|habit_ramp), `goal_nature` (input|outcome)
- Display: `display_category` (20 categories), `life_area` (5 areas + custom)
- Streaks: `current_streak`, `best_streak`, freeze system
- Milestones: `milestone_config` (exponential curve ladder), `ramp_steps` (habit frequency escalation)

**5 Life Areas** with colors:
| Area | Color | Icon |
|------|-------|------|
| Daygame | orange #f97316 | Target |
| Health & Appearance | green #22c55e | Heart |
| Career & Finances | purple #a855f7 | Briefcase |
| Personal Growth | yellow #eab308 | Sparkles |
| Vices & Elimination | rose #f43f5e | ShieldAlert |

**Goal hierarchy**: L0 (dreams) → L1 (major goals) → L3 (specific skills). L2 = standalone badges.

**Static goal graph** (`goalGraph.ts`): ~100+ template goals organized by life area. Powers "just get me started" catalog. Users can also create freeform goals with any parent-child relationship.

**Current goal creation flow**:
1. Manual: Click "+" → GoalFormVariant6 (multi-step wizard: area → identity → type → title → tracking → target → period → curve/ramp → motivation)
2. Template: Open catalog → pick life area → fan-out preview → toggle goals → batch create

**4 view modes**: Today (daily action), Hierarchy (L1→L3 tree), Tree (React Flow), Orrery (orbital)

**Key services**:
- `goalsService.ts` — tree building, filtering, progress aggregation, milestone math, phase detection
- `goalRepo.ts` — CRUD, tree queries, period resets, linked metric sync, snapshots
- `badgeEngineService.ts` — tier computation (iron→mythic)
- `goalHierarchyService.ts` — groups by L1 parent + display category
- `milestoneService.ts` — exponential curve generation, nice-number rounding

### Values System (Inner Game)

**Data model**:
- `values` — 300+ values across 11 categories (Presence, Identity, Drive, Emotion, Freedom, Growth, Discipline, Play, Connection, Ethics, Purpose)
- `user_values` — junction table (user picks from master list)
- `inner_game_progress` — single row per user tracking step completion, AI-inferred values, final ranked results
- `value_comparisons` — pairwise comparison results for prioritization

**User journey** (sequential, gated):
1. **Values Selection** — browse 11 categories, pick resonant values
2. **Shadow Self** — describe frustrations → AI infers hidden values
3. **Peak Experience** — describe best moments → AI infers embodied values
4. **Growth Edges** — describe challenges → AI suggests supporting values
5. **Cutting/Prioritization** — merge all sources → eliminate → pairwise compare → rank top 7
6. **Summary** — see ranked core values + aspirational values

**Output**: 7 ranked core values + aspirational values, each with source tracking (picked/shadow/peak/hurdles)

### The Gap

**Values and goals are completely disconnected.** No field in `user_goals` references values. No UI connects them. Users define their deepest values, then create goals in a separate system with zero awareness of what they said matters most. The "soil" doesn't feed the "tree."

---

## Tree of Life Metaphor Mapping

```
                    🌳 CROWN (Dreams / L0)
                   /  |  \
              BRANCHES (Major Goals / L1)
             /    |    \
         LEAVES (Skills / L3) — daily actions
            |
         TRUNK (Life Areas — the 5 colored channels)
            |
      ──────────── ground line ────────────
            |
         ROOTS (Core Values — top 7 ranked)
            |
         SOIL (All values — the 300+ pool)
```

| Tree Part | Maps To | Data Source | Visual |
|-----------|---------|-------------|--------|
| **Soil** | All 300+ values | `values` table | Underground gradient, barely visible |
| **Roots** | User's 7 core values | `inner_game_progress.finalCoreValues` | Root tendrils reaching down, labeled |
| **Trunk** | Life areas (5) | `lifeAreas.ts` config | Colored channels within trunk |
| **Branches** | Major goals (L1) | `user_goals` where `goal_level=1` | Branches growing from trunk, colored by area |
| **Leaves/Fruit** | Daily skills (L3) | `user_goals` where `goal_level=3` | Leaves that grow/bloom with progress |
| **Crown** | Dreams (L0) | `user_goals` where `goal_level=0` | Top of tree, glowing when progressing |
| **Rings** | Streaks / time | `current_streak`, snapshots | Visible in trunk cross-section |
| **Seasons** | Phases | `goal_phase` | Leaf color (green=acquisition, gold=consolidation, deep green=graduated) |
| **Badges** | Achievements (L2) | Badge engine | Hanging ornaments or nested creatures |

### Growth Mechanics

- **Planting a seed**: Creating a new goal = adding a branch/leaf bud
- **Watering**: Completing daily actions = progress animation
- **Growing**: Milestone completion = branch extends, leaf unfurls
- **Blooming**: Phase transition (acquisition→consolidation) = flowers appear
- **Fruit**: Graduated goals = permanent fruit on branches
- **Roots deepening**: As user completes values journey, roots grow deeper and thicker
- **Withering**: Stale goals (no progress) = leaves brown at edges
- **Pruning**: Archiving a goal = branch fades gracefully

---

## Data Model Changes Needed

### New Fields on `user_goals`

```sql
-- Link goals to the values they serve
ALTER TABLE user_goals ADD COLUMN aligned_values TEXT[] DEFAULT '{}';
-- Which core values does this goal serve? Array of value IDs from user's top 7
```

### New Table: `tree_state` (visual persistence)

```sql
CREATE TABLE tree_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  tree_layout JSONB DEFAULT '{}',   -- node positions, zoom, pan
  unlocked_visuals TEXT[] DEFAULT '{}', -- earned visual elements
  last_growth_event TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Existing Tables — No Changes Needed
- `values`, `user_values`, `inner_game_progress`, `value_comparisons` — all stay as-is
- `user_goals` — parent_goal_id hierarchy already supports tree structure
- `daily_goal_snapshots` — already captures history for growth animation data

---

## Component Architecture (Proposed)

```
src/goals/components/
├── tree-of-life/
│   ├── TreeOfLifeView.tsx        # Main canvas (replaces/augments current views)
│   ├── TreeRenderer.tsx          # SVG/Canvas tree drawing engine
│   ├── SoilLayer.tsx             # Underground values visualization
│   ├── RootSystem.tsx            # Core values as roots
│   ├── TrunkSection.tsx          # Life area channels
│   ├── BranchNode.tsx            # Individual L1 goal branch
│   ├── LeafNode.tsx              # Individual L3 goal leaf
│   ├── CrownGlow.tsx             # L0 dream at top
│   ├── GrowthAnimation.tsx       # Shared animation primitives
│   ├── TreeInteractions.tsx      # Click/tap handlers, tooltips
│   └── TreeCreationFlow.tsx      # "Plant a seed" goal creation
```

### Interaction Model
- **Tap a branch** → expand to see child goals (leaves)
- **Tap a leaf** → quick-increment or view detail
- **Tap soil** → see values, link to Inner Game
- **Tap root** → see which goals align with that value
- **Long-press empty branch spot** → "plant a seed" (create goal)
- **Pinch/zoom** → navigate the tree
- **Swipe up from soil** → reveal roots and values

---

## Key Files to Modify/Read

### Goals (current system to evolve)
| File | What It Does | Relevance |
|------|-------------|-----------|
| `src/goals/types.ts` | All goal types | Add aligned_values, tree visual types |
| `src/goals/goalsService.ts` | Tree building, filtering, progress | Add value-alignment logic |
| `src/goals/data/lifeAreas.ts` | 5 life areas with colors/icons | Tree trunk channels |
| `src/goals/data/goalGraph.ts` | Static template catalog (100+ goals) | Seed templates for tree |
| `src/goals/components/GoalsHubContent.tsx` | Main goals page controller | Add TreeOfLife view mode |
| `src/goals/components/GoalFormModal.tsx` | Goal creation dialog | Add "which values does this serve?" |
| `src/goals/components/GoalFormVariant6.tsx` | Multi-step creation wizard | Integrate value selection step |
| `src/goals/components/DailyActionView.tsx` | Today's goals by period | Could become "today's leaves" |
| `src/goals/components/GoalCard.tsx` | Single goal display | Show value alignment |
| `src/db/goalRepo.ts` | All goal DB operations | Add aligned_values CRUD |
| `src/db/goalSchemas.ts` | Zod validation schemas | Add aligned_values validation |
| `src/db/goalTypes.ts` | DB row types | Add aligned_values to UserGoalRow |
| `app/api/goals/tree/route.ts` | GET tree endpoint | Already builds tree — enhance |

### Inner Game / Values (soil & roots)
| File | What It Does | Relevance |
|------|-------------|-----------|
| `src/inner-game/types.ts` | Value types, progress types | CoreValue, InferredValue |
| `src/inner-game/config.ts` | 300+ values in 11 categories | The "soil" data |
| `src/inner-game/innerGameService.ts` | Progress tracking, value operations | Get user's core values |
| `src/inner-game/modules/valueCutting.ts` | Prioritization & ranking logic | Final 7 core values |
| `src/db/innerGameRepo.ts` | DB access for values/progress | Fetch user's ranked values |
| `app/api/inner-game/progress/route.ts` | GET progress + values | API to fetch soil/root data |

### Shared
| File | What It Does | Relevance |
|------|-------------|-----------|
| `src/shared/iconRoles.ts` | Icon registry (avoid reuse) | Register tree icons |
| `src/goals/components/MilestoneCurveEditor.tsx` | Has zen/cyberpunk/orrery themes | Visual theme reference |

---

## Current View Modes (for context)

The goals page already has 4 view modes via `GoalViewMode`:
- `"today"` → DailyActionView (period-grouped, sortable)
- `"hierarchy"` → GoalHierarchyView (L1→L3 nested)
- `"tree"` → TreeView (React Flow nodes)
- `"orrery"` → OrreryView (orbital visualization)

**Tree of Life would be a 5th view mode** or could **replace the existing "tree" view** which uses React Flow. The existing tree view is purely structural — the Tree of Life adds metaphor, values integration, and growth animation.

---

## Open Design Questions

1. **Rendering tech**: SVG (simpler, good for static trees) vs Canvas/WebGL (better for animations, particles) vs React Flow (already used, but boxy)
2. **Mobile-first?**: Tree needs to work on phone screens — vertical scroll with horizontal branches, or radial/circular layout?
3. **Progressive disclosure**: Show full tree always, or start zoomed into "today's leaves" and let user zoom out?
4. **Values onboarding**: What if user hasn't done Inner Game yet? Show tree without roots? Prompt them to "discover your soil"?
5. **Goal creation flow**: Replace current multi-step wizard entirely, or keep wizard but launch it from tree context (tap empty branch → wizard opens with area pre-selected)?
6. **Performance**: With 50+ goals, how many visual elements before we need virtualization?
7. **Seasons/time**: Should the tree visually change with real seasons, or goal-phase "seasons"?

---

## What Exists vs What's New

### Already Built (reuse)
- Parent-child hierarchy (`parent_goal_id`, `goal_level`)
- Tree building algorithm (`buildGoalTree` with cycle detection)
- Life area colors and icons
- Goal progress tracking and snapshots
- Phase transitions (acquisition→consolidation→graduated)
- Streak and milestone systems
- Badge/achievement system
- Values selection and ranking journey
- 300+ value catalog with categories

### Needs Building
- Visual tree renderer (the actual growing tree graphic)
- Soil/root visualization layer
- Value↔goal alignment (data model + UI)
- Growth animations tied to real progress
- "Plant a seed" creation flow (tree-contextual goal creation)
- Tree state persistence (layout, visual unlocks)
- Mobile-responsive tree layout
- Integration between Inner Game completion and tree root growth

---

## What to Harvest from Existing Variants & Picker Work

There are **6 GoalForm variants**, a **GoalFormVariants.tsx** mockup comparison, a **GoalCatalogPicker** (Miller columns), a **GoalSetupWizard** (3-step onboarding), and **3 Guide variants**. Massive amount of UX experimentation already done. Here's what maps to Tree of Life:

### Variant 2 (Minimalist Inline) → "Quick Seed" Planting
**Pattern**: Type a goal title → system infers life area, frequency, type from natural language.
**Tree of Life use**: When a user taps an empty branch spot, show a minimal input like V2. The tree context (which branch they tapped) pre-fills the life area. Pattern-matching infers the rest. Fastest possible "plant a seed" flow.

**Key code**: `GoalFormVariant2.tsx` — regex inference for frequency (`3x per week`), keyword detection for area (`gym` → health), milestone detection (`by Jan`).

### Variant 3 (Identity-Based) → Root Connection
**Pattern**: "Who are you becoming?" → identity statement → evidence behavior → commitment.
**Tree of Life use**: This IS the soil/root connection. When creating a goal near the trunk (L1 level), prompt with V3's identity framing. The identity statement connects to values (roots). Rotating identity examples per life area already exist.

**Key elements to reuse**:
- Life area circular icon buttons with animated ping + glow on selection
- Left accent bar on identity textarea (colored by life area)
- Rotating identity examples per area (`src/goals/components/GoalFormVariant3.tsx`)
- "Not what you want to do. Who you want to *be*" framing

### Variant 4 (Mission Briefing) → Difficulty Visualization
**Pattern**: Single-page with difficulty bars (1-5 scale), grid overlay aesthetic, sticky footer.
**Tree of Life use**: The **difficulty bars** are useful for calibrating how ambitious a branch is. When viewing a branch's detail panel, show difficulty alongside progress. The grid overlay aesthetic could inform the "soil cross-section" view (underground root network).

**Key elements to reuse**:
- 5-bar difficulty scale with color coding (Light → Extreme)
- Corner bracket selection indicator (could mark "growing" vs "dormant" branches)
- Sticky footer pattern (keep tree actions always visible)
- Monospace/tactical typography for data-dense overlays

### Variant 5 (WOOP/Outcome-First) → Obstacle-Aware Growth
**Pattern**: Envision future → identify obstacles → design behavior → commit with if-then plan.
**Tree of Life use**: When a branch is stale/withering, the "Growth Edges" step from V5 could power a "Why isn't this growing?" diagnostic. Show obstacles as thorns on the branch. The if-then plan becomes a visible "action plan" on the leaf.

**Key elements to reuse**:
- NOW → FUTURE bridge visualization (arrow circle) — could be trunk cross-section showing current vs target
- Obstacle preset pills (teach common blockers per life area)
- Prompt starters ("I can approach without hesitation", "Women respond to my energy")
- Ambient glow effect (radial gradient per area color) — perfect for tree aura

### Variant 6 (Modular/Current) → Full Control Panel
**Pattern**: All-in-one modal with parent goal connection, suggestions, tracking config, milestone curves, ramp editor, motivation, identity micro-prompts.
**Tree of Life use**: This becomes the "branch detail panel" — when a user expands a branch fully, they get V6-level control. Parent goal connection already works as tree parentage. Milestone curve editor (with zen/cyberpunk/orrery themes) could visualize the branch's growth trajectory.

**Key elements to reuse**:
- Parent goal dashed button → expanded searchable list (tree navigation)
- Goal suggestions as pills per area (auto-fill tracking params)
- Starting progress + starting streak backfill (for retroactive tree growth)
- Identity micro-prompt with rotation (connect to values/soil)

### GoalFormVariants.tsx (Mockup Comparison) → First Impression Screens
**Pattern**: Side-by-side first-screen mockups for 5 approaches.
**Tree of Life use**: The "first impression" concept matters. The Tree of Life's first screen should be the tree itself — not a form. Forms appear contextually from tree interactions. But the V1 mockup's motivational opener ("Every transformation starts with a single decision") could be the tree's empty-state message.

**Key elements to reuse**:
- V1's glowing compass icon + orange gradient CTA → "Plant your first seed" button
- V2's minimal input + inferred chips → quick-add from tree
- V3's circular area selectors with glow → life area highlighting on trunk
- V4's grid overlay + monospace → underground root-network aesthetic
- V5's ambient glow + progress indicator → branch aura + growth stage dots

### GoalCatalogPicker (Miller Columns) → "Seed Catalog"
**Pattern**: 3-column progressive drill-down: Life Area → L1/L2 Goals → L3 Specifics. Toggle goals on/off, existing goals show "Active" badges, batch creation.
**Tree of Life use**: Becomes the "seed catalog" — a nursery where users browse available seeds before planting them on the tree. Instead of abstract columns, show seeds organized by where they'd grow on the tree (which branch, which area). The existing dedup logic (marking active goals) prevents double-planting.

**Key elements to reuse**:
- `getAreaCatalog()` function — organized template data per area
- Active badge pattern (shows which seeds are already planted)
- Parent remapping logic (new L3s reference existing L1 parents)
- Batch creation flow (plant multiple seeds at once)

### GoalSetupWizard → "First Planting Ceremony"
**Pattern**: Direction (pick daygame path + life areas + L1 reasons) → Goals (browse/toggle/configure) → Summary → batch create. Aurora background, keyboard shortcuts, optional tour.
**Tree of Life use**: Becomes the onboarding for Tree of Life. Instead of abstract steps, the wizard IS planting the first tree:
1. **Soil** — "What values matter most?" (pull from Inner Game or quick-pick)
2. **Trunk** — "Which life areas?" (selecting areas grows trunk channels)
3. **Branches** — "What are your big goals?" (L1s grow as branches)
4. **Leaves** — "What daily actions?" (L3s appear as leaf buds)
5. **Watch it grow** — animated reveal of the planted tree

**Key elements to reuse**:
- `AuroraBackground` — the ambient shifting gradient (could become sky behind tree)
- `AnimatedStep` — step transitions with smooth animation
- `BottomBar` — step indicator + CTA (becomes tree planting progress bar)
- Keyboard shortcuts (1-6 for quick area selection)
- Auto-selection of core goals per area (auto-plant essential seeds)
- `buildSetupInserts()` — converts selections to DB inserts (reuse directly)
- `GoalsStepTour` — guided tour with highlights (adapt for tree walkthrough)
- Neon wireframe palette (FTO=pink, Abundance=blue, Action=cyan) — branch accent colors
- `NeonDot` pulse indicator — branch growth indicator

### Guide Variants A/B/C → Tree Tooltips & Onboarding
**3 approaches tested**:
- **A**: Slide-out left panel (vertical sidebar, scrollable sections)
- **B**: Floating popover with tabs (Goals/Start/Views/Tips), pop-in animation
- **C**: Paginated cards with dot indicators and prev/next navigation, accent stripe trigger

**Tree of Life use**: The tree IS the guide. But contextual help needs a delivery mechanism:
- **Variant B's tabs** → tooltip tabs when hovering a tree element (Soil / Roots / Branches / Leaves)
- **Variant C's pagination** → step-through tutorial when tree is first planted ("This is your soil... these are your roots... here's how branches grow")
- **Variant A's sidebar** → detail panel that slides out when a branch is selected

### Summary: Harvest Priority

| Source | What to Take | Priority |
|--------|-------------|----------|
| **V2 (Minimalist)** | NLP inference for quick-add from tree | High — makes planting fast |
| **V3 (Identity)** | Identity framing + area icons + accent bars | High — IS the root/soil connection |
| **V5 (WOOP)** | Obstacle pills + bridge visualization + ambient glow | Medium — powers "why isn't this growing?" |
| **V6 (Modular)** | Parent connection + curve editor + ramp editor | High — branch detail panel |
| **Setup Wizard** | Aurora bg, AnimatedStep, BottomBar, auto-selection, batch inserts | High — first planting ceremony |
| **Catalog Picker** | Area catalog data, dedup logic, batch creation | High — seed catalog |
| **V4 (Mission)** | Difficulty bars, sticky footer | Low — specific to data-dense views |
| **Guide B/C** | Tab tooltips, paginated tutorial | Medium — contextual help |
| **GoalFormVariants** | First-impression visuals, glowing icons | Low — polish layer |

---

## Values → Tree Connection (The Soil Mechanic)

### Data Flow

```
InnerGameProgress.finalCoreValues: CoreValue[]
  → [{id: "courage", rank: 1}, {id: "freedom", rank: 2}, ...]
  → Becomes the 7 root tendrils
  → Each root labeled + colored by category

InnerGameProgress.aspirationalValues: {id: string}[]
  → Values user is developing (not yet embodied)
  → Shown as thinner/translucent roots (growing toward soil)

user_values (junction table)
  → All 20-40 selected values from step 1
  → Becomes the soil texture (dense = more values explored)
```

### How Values Feed Branches

When a user creates a goal with `aligned_values: ["courage", "freedom"]`:
- The root tendrils for "courage" and "freedom" visually connect to that branch
- Branches with more root connections look healthier/thicker
- "Unrooted" goals (no value alignment) show as floating/disconnected branches — visual nudge to connect them

### Progressive States

| Inner Game Status | Tree Root State | Visual |
|---|---|---|
| Not started | No roots, thin trunk | Tree floating above bare soil |
| Values selected (step 1 done) | Soil visible, no roots yet | Rich soil texture appears |
| Shadow/Peak/Hurdles done | Proto-roots forming | Thin white lines reaching down |
| Cutting complete (7 values ranked) | Full root system | 7 labeled roots, ranked by thickness |
| Aspirational values marked | Some roots translucent | Aspirational = growing, core = solid |

### API Integration

Existing endpoint: `GET /api/inner-game/progress` returns:
```typescript
{
  progress: {
    finalCoreValues: CoreValue[] | null,  // [{id, rank}] — the 7 roots
    aspirationalValues: {id: string}[] | null,
    // ... other fields
  },
  selectedValues: string[],  // all picked values — the soil
  totalCategories: 11,
  completedCategories: number
}
```

**New endpoint needed**: `GET /api/goals/tree-of-life` — single call that returns:
```typescript
{
  tree: GoalTreeNode[],           // existing tree structure
  roots: CoreValue[] | null,      // user's ranked values
  aspirational: string[] | null,  // growing values
  soilDensity: number,            // selectedValues.length / 300 (richness)
  alignmentMap: Record<string, string[]>,  // goalId → aligned value IDs
}
```

---

## Concrete User Flows

### Flow 1: First Visit (Empty Tree)

```
User opens Goals page → sees Tree of Life view (new default)
  ↓
Empty state: a seedling in bare soil
  - Message: "Every great life starts with roots"
  - Two paths:
    A) "Discover your soil" → links to Inner Game values journey
    B) "Plant your first seed" → opens simplified V2-style quick input
  ↓
If user picks A: they do the values journey, return to tree with roots grown
If user picks B: they plant one goal, tree gets one branch bud
  ↓
After first goal: "Your tree has begun. Plant more seeds or discover your roots."
```

### Flow 2: Planting a Seed (Creating a Goal from Tree)

```
User taps empty space on a trunk channel (e.g., the green "Health" channel)
  ↓
Context-aware creation appears (V2 minimalist inline):
  - Life area pre-filled (Health)
  - Input: "What do you want to grow here?"
  - Smart inference from text (frequency, type, tracking)
  ↓
User types: "gym 4x per week"
  → Inferred: recurring, counter, target=4, period=weekly
  ↓
Optional expand: "Connect to your roots" — shows user's 7 values
  - User taps "discipline" and "strength" → aligned_values set
  ↓
Confirm → branch bud appears on health channel
  - Animation: seed drops, bud sprouts, root connection glows
```

### Flow 3: Watering (Incrementing Progress)

```
User taps a leaf (L3 daily goal, e.g., "Approaches: 3/10 this week")
  ↓
Quick-action panel slides up:
  - +1 button (large, easy thumb target)
  - Current: 3/10, streak: 🔥 5 days
  - Tap +1 → value becomes 4/10
  ↓
Tree responds:
  - Leaf glows briefly (watering animation)
  - If this completes the period (10/10): leaf unfurls fully, confetti particles
  - If streak milestone: flame grows on branch
```

### Flow 4: Branch Detail (Exploring a Goal)

```
User taps a branch (L1 major goal, e.g., "Build Social Confidence")
  ↓
Branch detail panel slides in (sidebar on desktop, bottom sheet on mobile):
  - Branch name + life area color
  - Progress: 3/5 leaves active, 2 graduated (fruit)
  - Root connections: "Fueled by: Courage, Presence"
  - Children (leaves): list of L3 goals with quick-increment
  - "Plant another leaf" button → opens contextual creation
  - "Prune" → archive (with confirmation)
  ↓
User can expand any leaf for V6-level detail (curve editor, ramp, etc.)
```

### Flow 5: Root Discovery (Connecting Values Post-Hoc)

```
User notices some branches look disconnected (no root lines)
  ↓
Taps the "unrooted" indicator on a branch
  ↓
Modal: "What values does [goal title] serve?"
  - Shows user's 7 core values as tappable chips
  - Shows aspirational values as lighter chips
  - User selects 1-3 values
  ↓
Save → root tendrils animate from selected values up to that branch
  - Branch visually thickens slightly (now nourished)
```

### Flow 6: Soil Discovery (No Inner Game Done)

```
User taps the soil layer (bottom of tree)
  ↓
Soil state depends on Inner Game progress:

If not started:
  - "Your soil is untilled. Discover what drives you."
  - CTA → Inner Game values journey
  - Preview: "Most users find 7 core values that fuel everything above"

If partially done:
  - Shows progress: "Soil: 60% explored (3/5 steps)"
  - Shows proto-roots forming from completed steps
  - CTA → "Continue your values journey"

If complete:
  - Full root system visible
  - Each root labeled with value name
  - Rank shown by thickness (rank 1 = thickest)
  - Tap a root → see which branches it feeds
```

---

## Technical Recommendation

### Rendering: Canvas (not SVG, not React Flow)

**Why Canvas**:
1. **AuroraBackground proves the team can do it** — 454 lines of Canvas animation already ship in the setup wizard. Same patterns (particle systems, gradients, animation loops) apply to the tree.
2. **Performance at scale** — 50+ goals means 50+ visual elements + animations. SVG DOM nodes get expensive. Canvas stays fast.
3. **Visual coherence** — the Aurora aesthetic (glows, particles, gradients) is already Canvas-native. The tree should feel like it lives in the same world.
4. **Interaction handling** — Canvas requires manual hit-testing, but the tree has coarse interaction targets (branches, leaves) not pixel-precise ones. Manageable.

**Architecture**:
```
TreeOfLifeCanvas.tsx (main component)
  ├── useTreeLayout()        — computes positions from GoalTreeNode[]
  ├── useTreeRenderer()      — Canvas draw loop (requestAnimationFrame)
  ├── useTreeInteractions()  — hit-testing, touch/mouse events
  ├── useTreeAnimations()    — growth transitions, particles
  └── TreeOverlays.tsx       — HTML overlays for detail panels, forms (not Canvas)
```

**Key technique**: Draw tree in Canvas, overlay HTML for interactions (tooltips, forms, detail panels). Same pattern used by tools like Figma, Miro.

### Layout Algorithm

The tree layout is NOT a generic graph layout. It's a **biological tree** with constraints:
- Trunk grows upward (fixed center X)
- Branches angle outward from trunk (weighted by life area position)
- Leaves cluster at branch tips
- Roots grow downward (mirror of branches)

**Proposed**: Custom layout engine inspired by L-systems (Lindenmayer systems) — fractal branching with:
- Branch angle = function of life area (daygame=left, health=left-center, etc.)
- Branch length = function of goal progress (more progress = longer branch)
- Branch thickness = function of child count + root connections
- Leaf size = function of current_value/target_value

### State Management

```typescript
// Computed on each render from goal data + values
type TreeLayout = {
  trunk: { x: number; y: number; height: number; channels: LifeAreaChannel[] }
  branches: BranchNode[]     // positioned L1 goals
  leaves: LeafNode[]         // positioned L3 goals
  roots: RootNode[]          // positioned core values
  connections: Connection[]  // root→branch lines
  particles: Particle[]      // active animations
}

// Persisted (user's camera state)
type TreeViewState = {
  zoom: number
  panX: number
  panY: number
  focusedNodeId: string | null
}
```

---

## Mobile Strategy

### Layout: Vertical Scroll with Fixed Viewport

On mobile, the tree renders in a **scrollable viewport** (not pinch-zoom):
- Default view: zoomed to show trunk + immediate branches (today's actionable goals)
- Scroll up: see crown (dreams) and full branch extent
- Scroll down: see roots and soil
- The "ground line" sits roughly at screen center by default

### Touch Interactions
- **Tap leaf** → quick-increment (same as current DailyActionView but visual)
- **Tap branch** → bottom sheet with branch detail
- **Tap soil** → slide-up panel with values info
- **Long-press empty area** → "plant a seed" creation flow
- **Two-finger pinch** → zoom in/out (optional, not required)

### Simplified Mobile Rendering
- Fewer particles (performance budget)
- Simpler glow effects (no multi-pass)
- Thicker touch targets (min 44px)
- Branches arranged more vertically (portrait orientation)

### Progressive Enhancement
- **Phone (< 768px)**: Simplified tree, vertical layout, bottom sheets
- **Tablet (768-1024px)**: Full tree with side panel for details
- **Desktop (> 1024px)**: Full tree + persistent side panel + hover tooltips

---

## Empty States & Progressive Complexity

### Complexity grows with the user

| User State | What They See | Interaction Options |
|---|---|---|
| Brand new (0 goals, no values) | Seedling in bare soil | "Discover soil" or "Plant first seed" |
| 1-3 goals, no values | Small sapling, 1-3 buds, bare soil | Add goals, nudge toward values |
| 1-3 goals + values done | Small sapling with visible roots | Connect roots to branches, add goals |
| 5-10 goals, values done | Medium tree with branches, some leaves | Increment, prune, view detail |
| 10-20 goals, full system | Full tree, rich canopy, deep roots | All interactions, weekly review in tree context |
| 20+ goals, graduated goals | Mature tree with fruit, ornaments | Celebration moments, "forest" view |

### Key Principle: Never Show Empty Complexity

Don't show the soil layer until the user has started Inner Game OR has been nudged.
Don't show root connections until goals have `aligned_values`.
Don't show the crown glow until an L0 dream exists.

The tree reveals its layers as the user earns them — like a game unlocking mechanics.

---

## Growth Animation Specifics

### What Triggers Growth

| Event | Animation | Duration |
|---|---|---|
| Goal created | Seed drops → bud sprouts | 1.5s |
| Progress incremented | Leaf glows green, water droplet | 0.5s |
| Period completed (10/10) | Leaf unfurls fully, sparkle burst | 1.2s |
| Milestone reached | Branch extends, ring appears | 2s |
| Phase: acquisition → consolidation | Leaf turns golden-green | 3s (slow) |
| Phase: consolidation → graduated | Leaf becomes fruit | 2s + particle burst |
| Streak milestone (7, 30, 100) | Flame grows on branch | 1s |
| Badge tier up | Ornament materializes on tree | 2s |
| Value connected to goal | Root tendril grows toward branch | 2s |
| Goal archived/pruned | Branch fades + drifts away | 1.5s |
| Goal stale (7+ days no progress) | Leaf edges brown slightly | Gradual over 7 days |
| All daily goals complete | Crown glows, particles rise | 3s |

### Animation Queue

Multiple events can fire at once (e.g., incrementing the last daily goal completes the period AND triggers a streak milestone AND completes all dailies). Use a **queue** with priorities:
1. Immediate feedback (increment glow) — plays instantly
2. Milestone/streak — plays after 0.5s delay
3. Full-tree celebration — plays after milestone finishes
4. Background ambience (staleness, growth) — always running, low-key

---

## Suggested Implementation Phases

### Phase 1: Foundation — Data + Static Tree
- Add `aligned_values TEXT[]` to `user_goals`
- New API: `GET /api/goals/tree-of-life` (combines goals tree + values)
- Add value selection step to goal creation (GoalFormVariant6 mod)
- Build `useTreeLayout` hook (positions from GoalTreeNode[])
- Static Canvas tree renderer (no animation yet — just draw the tree from data)
- Basic click handling (tap branch → show existing detail panel)
- Wire as new view mode in GoalsHubContent

### Phase 2: Soil & Roots
- Fetch `finalCoreValues` alongside goals
- Draw root system (7 tendrils, ranked by thickness)
- Draw soil layer (gradient density from selectedValues count)
- Root→branch connections (for goals with aligned_values)
- "Connect to roots" step in goal creation
- Tap root → see which goals it feeds
- Nudge for unrooted branches

### Phase 3: Growth Animations
- Increment → leaf glow
- Period complete → unfurl animation
- Milestone → branch extension
- Streak → flame particles
- Crown glow when all dailies done
- Staleness (leaf browning over 7 days)
- Phase transitions (color shifts)

### Phase 4: Tree-Native Creation
- Long-press empty → "plant a seed" (V2 minimalist, context-aware)
- Tap branch → "add leaf" (pre-fills parent + area)
- "First planting ceremony" (replaces/augments GoalSetupWizard)
- Seed catalog accessible from tree (browse available templates)

### Phase 5: Mobile + Polish
- Responsive layout (vertical scroll, bottom sheets)
- Touch target optimization
- Performance budget (reduced particles on mobile)
- Particle effects (pollen, fireflies)
- Achievement ornaments
- Day/night ambient (time-of-day or goal-phase)
- Share tree as image

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Canvas rendering complexity | High dev time | Start with static tree (phase 1), animate incrementally |
| Mobile performance | Janky on low-end phones | Progressive enhancement, fewer particles, simpler shaders |
| Users skip Inner Game | Tree has no roots, feels incomplete | "Soil" still exists visually, nudges to Inner Game are gentle not blocking |
| Too many goals = visual clutter | Tree becomes unreadable | Auto-collapse dormant branches, focus view on active goals |
| Values↔Goals connection feels forced | Users skip alignment step | Make it optional, show benefit visually (thick vs thin branches) |
| Regression on existing views | Users who prefer list/hierarchy lose access | Tree of Life is a VIEW MODE, not replacement. Keep "Today" and "Hierarchy" |
