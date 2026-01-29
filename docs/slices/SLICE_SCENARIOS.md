# Vertical Slice: Scenarios
**Status:** Reference
**Updated:** 29-01-2026

## Changelog
- 29-01-2026 17:15 - Split API contracts to SLICE_SCENARIOS_API.md
- 29-01-2026 07:46 - Original document

---

## Slice Purpose

A unified scenarios system with **19 pluggable scenario types** organized into 5 phases:

| Phase | Scenarios | Available |
|-------|-----------|-----------|
| **Opening** | Practice Openers | 1/1 |
| **Hooking** | Topic Pivot, Assumption Game, Her Question to You | 0/3 |
| **Vibing** | Career Response, Hobby Response, Compliment Delivery, Flirting Escalation | 1/4 |
| **Resistance** | Shit-Tests, Boyfriend Mention, Time Pressure | 1/3 |
| **Closing** | Number Ask, Instagram Close, Instant Date Pitch, First Text, Date Proposal, Flake Recovery, Dating App Opener, App to Date | 0/8 |

**Total: 19 scenarios (3 available, 16 coming soon)**

---

## Architecture Overview

```
src/scenarios/
├── scenariosService.ts           # Routes to correct scenario handler
├── types.ts                      # All shared types
├── catalog.ts                    # ALL 19 scenarios with phases, availability
├── shared/
│   ├── archetypes.ts             # Woman personality types (6 archetypes)
│   ├── difficulty.ts             # Difficulty system (5 levels)
│   └── prompts.ts                # Shared system/evaluation prompts
├── openers/                      # Single-turn opener practice
│   ├── generator.ts
│   ├── evaluator.ts
│   ├── data/                     # base-texts, energy, outfits, weather, hooks
│   └── OpenersTrainer.tsx
├── career/                       # Career revelation scenario
│   ├── generator.ts
│   ├── evaluator.ts
│   └── data/careers.ts
├── shittests/                    # Shit-test scenarios
│   ├── generator.ts
│   ├── evaluator.ts
│   └── data/shit-tests.ts
└── components/
    ├── ScenariosHub.tsx          # Main hub showing all scenarios
    └── ChatWindow.tsx            # Shared chat interface

app/api/scenarios/
├── openers/
│   ├── encounter/route.ts
│   └── evaluate/route.ts
└── chat/route.ts
```

---

## Shared Infrastructure

### Types & Catalog

```typescript
// types.ts - All 19 scenario types
export type ScenarioType =
  | "practice-openers" | "topic-pivot" | "assumption-game" | "her-question"
  | "practice-career-response" | "hobby-response" | "compliment-delivery" | "flirting-escalation"
  | "practice-shittests" | "boyfriend-mention" | "time-pressure"
  | "number-ask" | "insta-close" | "instant-date" | "first-text" | "date-proposal" | "flake-recovery" | "app-opener" | "app-to-date";

// catalog.ts - Scenario registry with status
export const SCENARIO_CATALOG: Record<ScenarioId, ScenarioDef> = { /* ... */ };
export const PHASE_CATALOG: PhaseDef[] = [ /* 5 phases */ ];
```

### Archetypes (6 personality types)

```typescript
export const ARCHETYPES: Record<string, Archetype> = {
  powerhouse: { /* Polished, purposeful, time-conscious */ },
  creative: { /* Artsy, individualistic, perceptive */ },
  athlete: { /* Energetic, disciplined, competitive */ },
  intellectual: { /* Thoughtful, curious, observant */ },
  freeSpirit: { /* Relaxed, unconventional, warm */ },
  traveler: { /* Open, adventurous, story-seeking */ },
};
```

### Difficulty (5 levels)

| Level | Receptiveness | Energy Bias |
|-------|---------------|-------------|
| beginner | 8 | positive |
| intermediate | 6 | neutral |
| advanced | 4 | neutral |
| expert | 3 | negative |
| master | 2 | negative |

---

## UI Components

### ScenariosHub

Main page showing **ALL 19 scenarios** organized by phase.
- All scenarios visible, grouped into 5 collapsible phase sections
- Available scenarios clickable, unavailable show "Coming Soon" badge

### ChatWindow

Shared multi-turn chat interface for career/shittests scenarios.

---

## Implementation Order

1. **Foundation** - types.ts, catalog.ts, shared/difficulty.ts, shared/archetypes.ts
2. **Openers** - Data files, generator, evaluator, API routes, UI
3. **Chat Scenarios** - Career and shittests sub-modules, unified chat API
4. **Hub & Integration** - ScenariosHub, service layer, dashboard page

---

## Making a "Coming Soon" Scenario Available

1. Create sub-module `src/scenarios/{type}/` with generator.ts, evaluator.ts
2. Add routing in `scenariosService.ts`
3. Set `status: "available"` in `catalog.ts`
4. Done - Hub automatically enables the scenario

---

## Adding a New Scenario Type

1. Add to `ScenarioType` union in `types.ts`
2. Add catalog entry to `SCENARIO_CATALOG`
3. Create sub-module folder with generator/evaluator
4. Add routing in `scenariosService.ts`

---

## Related Documentation

- **API Contracts:** [SLICE_SCENARIOS_API.md](SLICE_SCENARIOS_API.md)
- **Q&A (provider reuse):** [SLICE_QA.md](SLICE_QA.md)

---

## Notes

### Why One Slice?

1. **Shared infrastructure** - Archetypes, difficulty, evaluation patterns used by all
2. **Easy to extend** - Add new scenario = add a folder
3. **Single hub** - One entry point at `/dashboard/scenarios`
4. **Consistent patterns** - Same service/API/UI structure across all scenarios

### Key Differences from Old Structure

| Aspect | Old | New |
|--------|-----|-----|
| Location | `lib/scenarios/` flat | `src/scenarios/` with sub-modules |
| Components | `components/scenarios/` | `src/scenarios/{type}/Component.tsx` |
| Dashboard | `/dashboard_test/scenarios` | `/dashboard/scenarios` |
