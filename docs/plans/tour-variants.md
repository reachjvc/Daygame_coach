# Plan: 4 Tour Variants for Goals Step

## Context
Current GoalsStepTour on step 2 ("Goals") is incomplete — covers area header, categories, preselected/available goals, expand-all, curve/ramp editors. Missing: custom goals, custom categories, date buttons, life area sections, overall flow polish. 4 agents each build a complete tour variant, accessible from test dashboard.

## Architecture

### Test page structure
- New test page: `/app/test/tour-variants/page.tsx` — variant chooser (same pattern as `/test/goals/page.tsx`)
- 4 variants: A (Strong Site), B (Creative), C (Minimalist), D (Narrative)
- Each variant: standalone component that renders GoalsStep + its own tour implementation
- Each variant gets pre-hydrated mock data (selected goals, targets, etc.) so the tour has real content to highlight

### Mock data layer
- Shared file: `/app/test/tour-variants/mock-data.ts`
- Provides pre-configured state: selected path, goals, targets, curve/ramp configs, life areas
- All 4 variants import from same mock data so tours highlight identical content

### What each agent builds

**Agent A — "Strong Site" (Linear/Notion style)**
- Clean spotlight overlay with smooth transitions
- Step counter with progress bar (not just "X of N")
- Hotkey hints in tooltip footer
- Covers ALL elements including custom goals, dates, life areas

**Agent B — "Creative / Experimental"**
- Break conventions — maybe a character guide, particle effects, or a "map" metaphor
- Could use the aurora aesthetic already in the app
- Still must be functional and cover all tour stops

**Agent C — "Minimalist / Apple-style"**
- No dark overlay — subtle inline hints
- Progressive disclosure: hints appear contextually as user scrolls
- Micro-animations, gentle pulses instead of heavy rings
- Barely-there aesthetic

**Agent D — "Storytelling / Narrative"**
- Each step has contextual copy explaining WHY this element matters
- Narrative arc: "Here's your foundation → Here's how you customize → Here's what makes it yours"
- Emotional, coaching-style language matching the app's purpose

### What ALL variants must cover (minimum tour stops)
1. Life area header ("Dating & Daygame")
2. Sub-categories (field_work, results, etc.)
3. Pre-selected goals
4. Available/unselected goals
5. Expand-all categories interaction
6. Target stepper (click to edit)
7. Curve editor (open + customize)
8. Ramp editor (open + customize)
9. **NEW: Date button on a goal**
10. **NEW: Custom goal creation ("+ Add custom goal")**
11. **NEW: Custom category creation ("+ Add custom category")**
12. **NEW: Life area section (health/fitness or similar)**
13. **NEW: Life area goal toggling**

### My review process
After each agent submits, I will:
1. Read every line of their tour component
2. Check all 13 tour stops are present and functional
3. Verify CSS/styling is complete (not placeholder)
4. Verify it renders on the test page without errors
5. Send agent back with specific feedback if anything is half-finished
6. Only accept when the tour is genuinely end-to-end complete

## Files to create
| File | Purpose |
|------|---------|
| `app/test/tour-variants/page.tsx` | Variant chooser + dynamic imports |
| `app/test/tour-variants/mock-data.ts` | Shared pre-hydrated goal state |
| `app/test/tour-variants/VariantA.tsx` | Strong Site tour |
| `app/test/tour-variants/VariantB.tsx` | Creative tour |
| `app/test/tour-variants/VariantC.tsx` | Minimalist tour |
| `app/test/tour-variants/VariantD.tsx` | Narrative tour |
| `app/test/tour-variants/variantA.css` | Styles for A |
| `app/test/tour-variants/variantB.css` | Styles for B |
| `app/test/tour-variants/variantC.css` | Styles for C |
| `app/test/tour-variants/variantD.css` | Styles for D |

## Files to modify
| File | Change |
|------|--------|
| `app/test/page.tsx` | Add "Tour Variants" entry to testPages array |

## Key files agents need to understand
- `src/goals/components/setup/GoalsStep.tsx` — the component being toured
- `src/goals/components/setup/GoalsStepTour.tsx` — current tour (reference implementation)
- `src/goals/components/setup/goalsStepTour.css` — current tour styles
- `src/goals/types.ts` — data types
- `src/goals/data/goalGraph.ts` — goal catalog
- `src/goals/data/lifeAreas.ts` — life area configs
- `src/goals/components/setup/setupConstants.ts` — colors, steps

## Verification
1. `npm run build` — no type errors
2. Navigate to `/test` → see "Tour Variants" card
3. Click into each variant → GoalsStep renders with pre-hydrated data
4. Start each tour → all 13 stops work, no crashes, styling complete
5. `npm test` — existing tests pass
