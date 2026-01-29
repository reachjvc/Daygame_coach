# Project Cleanup Plan
**Status:** IN PROGRESS
**Updated:** 29-01-2026 13:30

## Changelog
- 29-01-2026 13:30 - Completed Phase 1, 6.1, 6.2, 2.1-2.2 (see Execution Log below)
- 29-01-2026 12:45 - Added Phases 6-10 (architecture compliance, type centralization, AI readability, TODO debt, test page org)
- 29-01-2026 11:30 - Complete rewrite with phased approach, YAGNI/DRY/KISS audit

---

## Execution Log

| Phase | Status | What was done |
|-------|--------|---------------|
| **1** | ✅ DONE | Deleted tw-animate-css, empty tests/, proxy.ts, 6 orphan doc files |
| **6.1** | ✅ DONE | Created `src/tracking/trackingService.ts` (30+ functions), updated 15 API routes |
| **6.2** | ✅ DONE | Refactored `ScenariosService` class → 3 function exports, updated index.ts + 3 API routes |
| **2.1-2.2** | ✅ DONE | Consolidated `SmallEvaluation`, `MilestoneEvaluation`, `EvaluationResult`, `clampScore()` from 3 evaluator files → `types.ts` |
| **2.3** | ⏭️ SKIP | EXPERIENCE_LEVELS/PRIMARY_GOALS - different data structures for validation vs UI, not true duplication |
| **7** | 🔜 NEXT | Type centralization in scenarios (50+ types) |
| **8-10** | 📋 TODO | AI readability, TODO debt, test page org |

---

## How to Think About Cleanup

### Principle 1: Ask Before Assuming
Not everything that looks unused IS unused. Before deleting:
- **Ask:** "Is this still needed? What purpose does it serve?"
- Things that look like duplicates might serve different purposes
- Test pages might be actively used for development
- Multiple docs might cover different aspects intentionally

Cleanup includes identifying candidates AND verifying they're actually cleanup targets.

### Principle 2: Prioritize by Impact
Work through these layers in order:

| Layer | What to Check | Examples |
|-------|---------------|----------|
| **1. Duplication** (DRY) | Same code/types in multiple places | Duplicate types, copy-pasted functions |
| **2. Bloat** (YAGNI) | Things that exist but aren't needed | Unused deps, orphan files, dead code |
| **3. Complexity** (KISS) | Things harder than they need to be | 4500-line files, wrapper functions |
| **4. Documentation** | Overlapping, contradictory, outdated docs | Multiple docs for same feature |
| **5. Hygiene** | Cache files, temp dirs, empty folders | __pycache__, empty tests/ |

**Key insight:** A 4500-line file is worse than 10 orphan files. Prioritize structural problems over cosmetic ones.

### Principle 3: AI Readability First
This cleanup prioritizes making the codebase **instantly navigable by AI**:
- **One file per concept** - Types in types.ts, config in config.ts, not scattered
- **Predictable patterns** - Same structure in every slice
- **Self-documenting names** - `trackingService.ts` not `utils.ts`
- **Clean barrel files** - `import { X } from '@/src/slice'` just works

---

## Phase 1: Delete Obvious Bloat (30 min)

### 1.1 Unused npm Dependency
| Package | Risk | Evidence |
|---------|------|----------|
| `tw-animate-css` | LOW | Only in package.json + globals.css import, no actual usage |

```bash
npm uninstall tw-animate-css
# Remove import from app/globals.css
```

### 1.2 Empty Directory
| Path | Risk |
|------|------|
| `tests/` (6 empty subdirs) | LOW |

```bash
rm -rf tests/
```

### 1.3 Dead Code File
| File | Risk | Evidence |
|------|------|----------|
| `proxy.ts` | LOW | Zero imports anywhere in codebase |

### 1.4 Orphan Doc Files
| File | Risk | Issue |
|------|------|-------|
| `docs/codex` | LOW | No extension, old cleanup plan |
| `docs/codex_tests` | LOW | No extension |
| `docs/log` | LOW | No extension |
| `docs/sources.txt` | LOW | Orphaned |
| `docs/tests/test_scripts` | LOW | Single file in folder |
| `docs/claude/planning_style.md` | LOW | Single file in folder |

---

## Phase 2: Fix DRY Violations (2-3 hours)

### 2.1 Duplicate Evaluation Types (HIGH)
**Problem:** Same types defined in 3 files

| File | Duplicate Types |
|------|-----------------|
| `src/scenarios/chat/evaluators.ts` | SmallEvaluation, MilestoneEvaluation, EvaluationResult |
| `src/scenarios/career/evaluator.ts` | SmallEvaluation, MilestoneEvaluation, EvaluationResult |
| `src/scenarios/shittests/evaluator.ts` | SmallEvaluation, MilestoneEvaluation, EvaluationResult |

**Fix:** Move to `src/scenarios/types.ts`, import in evaluators.

### 2.2 Duplicate clampScore() Helper (HIGH)
**Problem:** Same 3-line function in 4 files

| File |
|------|
| `src/scenarios/chat/evaluators.ts:35` |
| `src/scenarios/career/evaluator.ts:34` |
| `src/scenarios/shittests/evaluator.ts:34` |
| `src/scenarios/openers/evaluator.ts:92` |

**Fix:** Create `src/scenarios/shared/scoring.ts`:
```typescript
export function clampScore(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)))
}
```

### 2.3 Duplicate Config Data (MEDIUM)
**Problem:** Experience levels and primary goals defined in 3 places each

Experience levels:
- `src/profile/data/experience-levels.ts` (source)
- `src/profile/components/UserPreferences.tsx:58-64` (hardcoded)
- `src/profile/config.ts:18-24` (Set of strings)

Primary goals:
- `src/profile/config.ts:29-34` (Set)
- `src/profile/components/UserPreferences.tsx:66-71` (array)

**Fix:** Import from data files, delete duplicates in components.

### 2.4 Duplicate Zod vs TypeScript Enums (MEDIUM)
**Problem:** Same enums defined twice

| Zod Schema (schemas.ts) | TypeScript Type (trackingTypes.ts) |
|-------------------------|-----------------------------------|
| `ApproachOutcomeSchema = z.enum([...])` | `type ApproachOutcome = 'blowout' \| ...` |
| `SetTypeSchema = z.enum([...])` | `type SetType = 'solo' \| ...` |

**Fix:** Generate Zod from TypeScript or use shared const arrays.

---

## Phase 3: Consolidate Documentation (2-3 hours)

### 3.1 Overlapping Tracking Docs (HIGH)
**Problem:** 3 docs covering same feature with conflicting status

| Doc | Lines | Issue |
|-----|-------|-------|
| `docs/slices/SLICE_TRACKING.md` | 314 | Shows Phase 1 complete |
| `docs/brainstorm/PROGRESS_TRACKING_IMPLEMENTATION.md` | 226 | Shows Phase 1 "ACTIVE" with gaps |
| `docs/brainstorm/PROGRESS_TRACKING_IDEAS.md` | 475 | Brainstorm, no clear status |

**Fix:**
- Keep SLICE_TRACKING.md as source of truth
- Archive PROGRESS_TRACKING_IMPLEMENTATION.md (or merge active bits into SLICE)
- Archive PROGRESS_TRACKING_IDEAS.md (brainstorm complete)

### 3.2 Oversized Doc (MEDIUM)
**Problem:** `docs/data/TRAINING_DATA.md` is 664 lines (limit: 500)

**Fix:** Split into:
- `TRAINING_DATA.md` - Active pipeline overview (~200 lines)
- `deprecated/TRAINING_DATA_LEGACY.md` - Old scripts reference

### 3.3 Broken Cross-References (MEDIUM)
**Problem:** Docs reference deleted files

| Doc | Broken Reference |
|-----|------------------|
| `docs/slices/SLICE_ARTICLES.md` | References FIELD_REPORT_RESEARCH_PLAN.md (deleted) |
| `docs/prompts/PROMPT_TRACKING_PHASE3.md` | References PLAN_TRACKING_PHASE2.md (deleted) |

**Fix:** Update or remove references.

### 3.4 Contradictory Type Guidance (MEDIUM)
**Problem:** SLICE_SCENARIOS.md shows scattered types, but CLAUDE.md says centralize

**Fix:** Update SLICE_SCENARIOS.md to show types.ts as single source.

### 3.5 Missing Status Headers (LOW)
| Doc | Issue |
|-----|-------|
| `docs/brainstorm/SEO.md` | Vague status |
| `docs/articles/writing_style.md` | No status |
| `docs/articles/INDEX.md` | No status |

---

## Phase 4: Address KISS Violations (Future - When Touching These Files)

### 4.1 Massive Generator File
**Problem:** `src/scenarios/openers/generator.ts` is 4501 lines

**Risk:** HIGH - untestable, unmaintainable

**Fix (when working on openers):** Extract into modules:
- `generator.ts` - orchestrator (~200 lines)
- `generators/environment.ts`
- `generators/position.ts`
- `generators/energy.ts`

**Effort:** 4-6 hours
**Note:** Don't do this as "cleanup" - do it when you need to modify opener generation.

### 4.2 Split Database Types
**Problem:** Types split across `src/db/types.ts` and `src/db/trackingTypes.ts`

**Question:** Is this intentional domain separation or accidental?

**Options:**
1. Consolidate into single `types.ts`
2. Keep split but document why
3. Split by domain: `types/profiles.ts`, `types/tracking.ts`, etc.

---

## Phase 5: Hygiene (10 min, optional)

These are gitignored but clutter local dev:

| Path | Risk | Action |
|------|------|--------|
| `scripts/__pycache__/` | LOW | `rm -rf` |
| `scripts/training-data/__pycache__/` | LOW | `rm -rf` |
| `.cache/` | LOW | `rm -rf` (35MB) |
| `supabase/.temp/` | LOW | `rm -rf` |

---

## Phase 6: Architecture Compliance (CRITICAL - 4-6 hours)

These violations directly contradict CLAUDE.md rules and create confusion for AI.

### 6.1 Missing trackingService.ts (CRITICAL)
**Problem:** Tracking slice has no service layer. API routes call directly to `trackingRepo`.

**Violation:** CLAUDE.md requires: "Business logic → `src/{slice}/*Service.ts`"

**Current state:**
```
src/tracking/
├── types.ts        ✅
├── config.ts       ✅
├── schemas.ts      ✅
├── index.ts        ✅
├── components/     ✅
├── hooks/          ✅
└── ???Service.ts   ❌ MISSING
```

**Files calling repo directly (instead of service):**
| API Route | Repo Function Called |
|-----------|---------------------|
| `app/api/tracking/session/route.ts` | `createSession()`, `getActiveSession()` |
| `app/api/tracking/session/[id]/route.ts` | `getSessionById()`, `updateSession()` |
| `app/api/tracking/session/[id]/end/route.ts` | `endSession()` |
| `app/api/tracking/approach/route.ts` | `logApproach()` |
| `app/api/tracking/approach/[id]/route.ts` | `updateApproach()`, `deleteApproach()` |
| `app/api/tracking/field-report/route.ts` | `saveFieldReport()` |
| `app/api/tracking/review/route.ts` | `saveWeeklyReview()` |
| `app/api/tracking/stats/route.ts` | `getStats()` |
| `app/api/tracking/milestones/route.ts` | `getUserMilestones()` |

**Fix:** Create `src/tracking/trackingService.ts` with function exports:
```typescript
// src/tracking/trackingService.ts
export async function startSession(userId: string, data: StartSessionInput) { ... }
export async function endSession(userId: string, sessionId: string) { ... }
export async function logApproach(userId: string, data: LogApproachInput) { ... }
export async function getTrackingStats(userId: string) { ... }
// etc.
```

Then update all API routes to call service functions, not repo functions.

### 6.2 Class Singleton → Function Exports (HIGH)
**Problem:** Scenarios uses class singleton pattern, violating CLAUDE.md.

**File:** `src/scenarios/scenariosService.ts`
```typescript
// ❌ CURRENT (violates CLAUDE.md)
export class ScenariosService {
  async generateEncounter(...) { ... }
  async evaluateOpener(...) { ... }
  async chat(...) { ... }
}
export const scenariosService = new ScenariosService()
```

**Consumers using singleton:**
- `app/api/scenarios/openers/encounter/route.ts` → `scenariosService.generateEncounter()`
- `app/api/scenarios/openers/evaluate/route.ts` → `scenariosService.evaluateOpener()`
- `app/api/scenarios/chat/route.ts` → `scenariosService.chat()`

**Fix:** Refactor to function exports:
```typescript
// ✅ TARGET (CLAUDE.md compliant)
export async function generateEncounter(request: GenerateEncounterRequest) { ... }
export async function evaluateOpener(request: EvaluateOpenerRequest) { ... }
export async function handleChat(request: ChatRequest): Promise<ChatResponse> { ... }
```

### 6.3 Sub-Module Structure Violations (MEDIUM)
**Problem:** Scenarios sub-modules don't follow required pattern.

**CLAUDE.md requires:**
```
src/{slice}/{sub-module}/
├── types.ts          # REQUIRED
├── config.ts         # REQUIRED
├── {module}Service.ts # REQUIRED
└── data/
```

**Current state:**
| Sub-module | types.ts | config.ts | *Service.ts |
|------------|----------|-----------|-------------|
| `src/scenarios/openers/` | ❌ | ❌ | ❌ (has generator.ts, evaluator.ts) |
| `src/scenarios/career/` | ❌ | ❌ | ❌ (has generator.ts, evaluator.ts) |
| `src/scenarios/chat/` | ❌ | ❌ | ❌ (has evaluators.ts, responses.ts) |
| `src/scenarios/shittests/` | ❌ | ❌ | ❌ (has generator.ts, evaluator.ts) |
| `src/scenarios/shared/` | ❌ | ❌ | ❌ |

**Fix:** For each sub-module:
1. Create `types.ts` - move types from generator.ts/evaluator.ts
2. Create `config.ts` - move constants
3. Rename/restructure service entry point

**Note:** This is lower priority than 6.1 and 6.2. Do when touching these modules.

### 6.4 Business Logic in API Routes (MEDIUM)
**Problem:** `app/api/test/articles/route.ts` has 177 lines of business logic.

**Contains:**
- Type definitions (lines 5-19): `ArticleManifest`, `ArticleInfo`
- Directory reading logic
- Markdown parsing: `parseDraftIntoSections()`
- Article manifest handling

**Fix:** Extract to `src/articles/articlesService.ts` (or test-specific service).

---

## Phase 7: Type Centralization (HIGH - 3-4 hours)

### 7.1 Scenarios Type Sprawl (HIGH)
**Problem:** 50+ types scattered across 15+ files instead of `types.ts`.

**Type locations (should ALL be in `src/scenarios/types.ts`):**

| File | Types Defined |
|------|---------------|
| `src/scenarios/config.ts` | WeatherSettings, EnergySettings, MovementSettings, DisplaySettings, EnvironmentSettings, SandboxSettings (6) |
| `src/scenarios/scenariosService.ts` | EnvironmentChoice, GenerateEncounterRequest, EvaluateOpenerRequest, OpenerEvaluation, ChatHistoryMessage, ChatRequest, ChatResponse (7) |
| `src/scenarios/catalog.ts` | ScenarioId, ScenarioStatus, ScenarioDef, PhaseId, PhaseDef (5) |
| `src/scenarios/shared/difficulty.ts` | DifficultyLevel, DifficultyConfig (2) |
| `src/scenarios/openers/generator.ts` | EnvironmentCode, EnvironmentWeights, VisibleItemType, RegionId, CountryId, GeneratedScenarioV2, GeneratorOptionsV2, plus internal types (8+) |
| `src/scenarios/openers/data/outfits.ts` | 9 types |
| `src/scenarios/openers/data/weather.ts` | 3 types |
| `src/scenarios/openers/data/base-texts.ts` | 2 types |
| `src/scenarios/openers/data/energy.ts` | 3 types |
| `src/scenarios/chat/evaluators.ts` | SmallEvaluation, MilestoneEvaluation, EvaluationResult (3) |
| `src/scenarios/career/evaluator.ts` | SmallEvaluation, MilestoneEvaluation, EvaluationResult (3 duplicates!) |
| `src/scenarios/shittests/evaluator.ts` | SmallEvaluation, MilestoneEvaluation, EvaluationResult (3 duplicates!) |

**Current `src/scenarios/types.ts`:** Only 25 lines with minimal types!

**Fix strategy:**
1. Move ALL scenario types to `src/scenarios/types.ts`
2. For sub-module-specific types, create `src/scenarios/openers/types.ts`, etc.
3. Export from barrel files
4. Update all imports

**Impact:** Makes AI navigation instant. "Find all scenario types" → one file.

### 7.2 API Route Type Definitions (LOW)
**Problem:** Types defined in `app/api/test/articles/route.ts`:
- `interface ArticleManifest` (lines 5-9)
- `interface ArticleInfo` (lines 11-19)

**Fix:** Move to `src/articles/types.ts`, import in route.

---

## Phase 8: AI Readability Improvements (MEDIUM - 2-3 hours)

These changes make the codebase easier for AI to navigate and understand.

### 8.1 Barrel File (index.ts) Consistency (MEDIUM)
**Problem:** Inconsistent barrel file usage across slices.

**Current state:**
| Slice | Has index.ts | Exports Public API |
|-------|--------------|-------------------|
| `src/qa/` | ✅ | ✅ Clean |
| `src/inner-game/` | ✅ | ✅ Clean |
| `src/scenarios/` | ✅ | ⚠️ Exports class singleton |
| `src/tracking/` | ✅ | ⚠️ Missing service exports |
| `src/profile/` | ✅ | ✅ Clean |
| `src/settings/` | ✅ | ✅ Clean |
| `src/dashboard/` | ✅ | ✅ Clean |
| `src/articles/` | ✅ | ✅ Clean |
| `src/db/` | ✅ | ✅ Clean |

**Sub-modules missing barrel files:**
- `src/scenarios/openers/` - has `data/index.ts` but no main `index.ts`
- `src/scenarios/career/` - no index.ts
- `src/scenarios/chat/` - no index.ts
- `src/scenarios/shittests/` - no index.ts
- `src/scenarios/shared/` - no index.ts

**Fix:** Add index.ts to sub-modules with clean public API exports.

### 8.2 Import Path Consistency (LOW - Already Good)
**Current state:** Using `@/src/` path alias consistently. ✅

62 relative imports (`../`) exist in 36 files - acceptable for intra-slice imports.

**No action needed** - just documenting that this is already clean.

### 8.3 File Naming Patterns (LOW)
**Inconsistency found:**

| Pattern | Files |
|---------|-------|
| `*Service.ts` | qaService.ts, innerGameService.ts, scenariosService.ts, profileService.ts, settingsService.ts, articlesService.ts |
| `*Repo.ts` | trackingRepo.ts, valueComparisonRepo.ts, settingsRepo.ts |
| `generator.ts` (no prefix) | openers/generator.ts, career/generator.ts, shittests/generator.ts |
| `evaluator.ts` (no prefix) | openers/evaluator.ts, career/evaluator.ts, shittests/evaluator.ts |
| `evaluators.ts` (plural!) | chat/evaluators.ts |

**Minor fix:** Rename `chat/evaluators.ts` → `chat/evaluator.ts` for consistency.

---

## Phase 9: TODO/FIXME Debt Tracking (LOW - Documentation Only)

### 9.1 Active TODOs in Code
These are documented debt. Don't delete them - track and schedule.

| File | Line | TODO |
|------|------|------|
| `app/api/qa/route.ts` | 13, 86 | Rate limiting |
| `app/api/qa/route.ts` | 15, 92 | Log outcome for analytics |
| `src/tracking/components/FieldReportPage.tsx` | 491 | Navigate to custom template builder |
| `src/scenarios/shared/difficulty.ts` | 120 | Connect to actual user level from database |
| `src/tracking/hooks/useSession.ts` | 342 | Fetch user average from stats |

### 9.2 Placeholder Prompts (HIGH DEBT)
**Problem:** Multiple `⚠️ TODO` markers in production prompts.

| File | Line | Placeholder |
|------|------|-------------|
| `src/scenarios/shared/prompts.ts` | 74 | "ADD REAL EXAMPLES FROM YOUR EXPERIENCE" |
| `src/scenarios/shared/prompts.ts` | 88 | "DEFINE YOUR EVALUATION CRITERIA" |
| `src/scenarios/shared/prompts.ts` | 206 | "Implement after testing openers" |
| `src/scenarios/shared/prompts.ts` | 211-212 | Push/pull system prompt undefined |
| `src/scenarios/shared/archetypes.ts` | 21, 28, 35 | Missing archetype examples, speech patterns, shittests |

**Risk:** These are actively used in AI prompts. Incomplete prompts = bad AI responses.

**Fix:** This is feature work, not cleanup. Schedule as separate task.

---

## Phase 10: Test Page Organization (LOW - 1 hour)

### 10.1 Test Page Inventory
**Location:** `app/test/`

| Page | Purpose | Status |
|------|---------|--------|
| `page.tsx` | Test index/landing | ? |
| `achievements/page.tsx` | Test achievements UI | Active |
| `articles/page.tsx` | Test article generation | Active |
| `field-reports/page.tsx` | Test field report UI | Active |
| `marcus-loop/page.tsx` | Test Marcus avatar | Active |
| `role-models/page.tsx` | Test role models UI | Active |
| `values-curation/page.tsx` | Test values UI | Active |

**Problem:** No documentation of what each test page does or when to use it.

**Fix options:**
1. Add README.md to `app/test/` explaining each page
2. Add header comment to each page.tsx explaining purpose
3. Create index page (`app/test/page.tsx`) that links to all with descriptions

**Recommendation:** Option 3 - Create proper test index page.

### 10.2 Test API Routes
**Location:** `app/api/test/`

| Route | Purpose |
|-------|---------|
| `articles/route.ts` | Article generation testing |
| `save-feedback/route.ts` | Save article feedback |
| `generate-draft/route.ts` | Generate article drafts |

**Same fix:** Document or create index explaining each.

---

## Summary by Effort (Updated)

| Phase | Effort | Impact | Risk | Priority |
|-------|--------|--------|------|----------|
| 1. Delete Bloat | 30 min | LOW | LOW | Do first |
| 2. Fix DRY | 2-3 hrs | HIGH | MEDIUM | High |
| **6. Architecture Compliance** | **4-6 hrs** | **CRITICAL** | **MEDIUM** | **Highest** |
| **7. Type Centralization** | **3-4 hrs** | **HIGH** | **LOW** | **High** |
| 3. Consolidate Docs | 2-3 hrs | MEDIUM | LOW | Medium |
| **8. AI Readability** | **2-3 hrs** | **MEDIUM** | **LOW** | **Medium** |
| 4. KISS Violations | 4-6 hrs | HIGH | MEDIUM | When touching files |
| 5. Hygiene | 10 min | LOW | LOW | Anytime |
| **9. TODO Debt** | **0 hrs** | **LOW** | **LOW** | **Track only** |
| **10. Test Page Org** | **1 hr** | **LOW** | **LOW** | **Low** |

**New recommended order:**
1. Phase 1 (Delete Bloat) - Quick wins
2. **Phase 6 (Architecture)** - CRITICAL compliance
3. **Phase 7 (Type Centralization)** - HIGH value for AI
4. Phase 2 (DRY) - Reduce duplication
5. **Phase 8 (AI Readability)** - Consistency
6. Phase 3 (Docs) - Clean up confusion
7. Phase 5 (Hygiene) - Quick cleanup
8. Phase 10 (Test Pages) - Nice to have
9. Phase 4 (KISS) - Only when touching those files
10. Phase 9 (TODO Debt) - Track, don't action

---

## Verified: NOT Cleanup (Asked & Decided)

These looked like cleanup candidates but were verified as intentional:

| Item | Looked Like | Asked | Decision |
|------|-------------|-------|----------|
| `public/Marcus/` + `public/marcus-test/` | Duplicate images (123MB) | "Which is production?" | Keep both - different purposes |
| `app/test/*` pages | Orphan test pages | "Still needed?" | Keep all - active dev use |
| 3 tracking docs | Overlapping docs | "Which to keep?" | Keep all - different purposes |

### Reclassified as Cleanup
| Item | Previous | Now |
|------|----------|-----|
| Create trackingService.ts | "Feature work" | **Phase 6.1** - Architecture compliance |

### Not Cleanup (Different Category)
| Item | Why |
|------|-----|
| Fill in ⚠️ TODO prompts | Content creation, not cleanup |
| Add new scenario types | Feature work |

---

## Summary by Effort

| Phase | Effort | Impact | Risk |
|-------|--------|--------|------|
| 1. Delete Bloat | 30 min | LOW | LOW |
| 2. Fix DRY | 2-3 hrs | HIGH | MEDIUM |
| 3. Consolidate Docs | 2-3 hrs | MEDIUM | LOW |
| 4. KISS Violations | 4-6 hrs | HIGH | MEDIUM |
| 5. Hygiene | 10 min | LOW | LOW |

**Recommended order:** Phase 1 → Phase 2 → Phase 3 → Phase 5 → Phase 4 (only when touching those files)

---

## Verification After Cleanup

```bash
npm run build   # Must pass
npm run lint    # Must pass
```

Check that no imports are broken after consolidating types.

---

## AI Readability Summary

The main goal of this cleanup is making the codebase **instantly navigable by AI**:

| Before Cleanup | After Cleanup |
|----------------|---------------|
| "Find scenario types" → check 15+ files | "Find scenario types" → `src/scenarios/types.ts` |
| "How does tracking work?" → no service layer | "How does tracking work?" → `trackingService.ts` |
| "What's the scenarios API?" → class singleton | "What's the scenarios API?" → function exports |
| "Where are test pages?" → scattered, undocumented | "Where are test pages?" → `app/test/` with index |

**Key insight:** AI spends most context on navigation. Reduce navigation = more context for actual work.

---

## Deprecated Folder Status

Current contents of `deprecated/`:
```
deprecated/2026-01-28/
  └── DeathbedStep.tsx
deprecated/2026-01-29/
  ├── test-llm-*.py (4 files)
  ├── 07.LLM-conversations-* (3 backups)
  ├── PLAN_TRACKING_PHASE2.md
  ├── PROMPT_*.md (2 files)
  ├── VALUES_*.md (2 files)
  └── FIELD_REPORT_RESEARCH_PLAN.md
```

**Rule:** Delete after 7 days unused. Check dates before deleting.

- `2026-01-28/*` → Delete on 2026-02-04
- `2026-01-29/*` → Delete on 2026-02-05
