# Supplementary Unit Tests Plan

**Status:** ✅ COMPLETE
**Updated:** 01-02-2026 19:25

## Changelog
- 01-02-2026 19:35 - Senior review: removed openersEvaluator.test.ts (tested reimplemented code, not exports), added edge case to valueCutting. Now 81 tests.
- 01-02-2026 19:25 - IMPLEMENTED: All 4 remaining test files (102 tests total), plan complete
- 01-02-2026 - Senior review: reduced ~100 to ~82 tests, removed change detectors and non-deterministic tests
- 31-01-2026 22:15 - Audit: documented existing tests, removed change detectors from milestones, fixed file name mismatches
- 31-01-2026 21:35 - Revised: removed low-value tests, added API schema validation, added gaps section
- 31-01-2026 20:01 - Initial creation: comprehensive pure function test plan

---

## Purpose

This plan supplements `better_tests_plan.md` by covering **pure utility functions** that:
- Have no external dependencies (no DB, no API calls)
- Are deterministic (same input = same output)
- Have edge cases worth catching
- Are NOT covered by E2E or integration tests

**Prerequisite:** Always read `docs/testing_behavior.md` before writing any tests.

---

## Philosophy

| Principle | Application |
|-----------|-------------|
| **Useful tests only** | Each test must catch a real bug, not just detect changes |
| **AAA pattern** | Arrange-Act-Assert with explicit comments |
| **Deterministic** | No randomness, no time-dependency, no flakiness |
| **Edge cases** | Boundary values, empty inputs, invalid data |

---

## Phase 1: Tracking Slice ✅ COMPLETE

### 1.1 milestones.ts ✅ IMPLEMENTED

**File:** `tests/unit/tracking/milestones.test.ts`
**Tests:** 22 passing

| Function | Tests | Edge Cases Covered |
|----------|-------|-------------------|
| `getMilestoneInfo()` | 5 | Unknown type fallback, empty string, special chars |
| `getTierColor()` | 1 | Format validation (gradient from-/to-) |
| `getTierBg()` | 1 | Format validation (bg- prefix, opacity) |
| `getMilestoneCategories()` | 4 | No duplicates, all known categories |
| `getAllTiers()` | 4 | Set type, size, all values present |
| Data integrity | 6 | Required fields, valid tiers, non-empty strings |
| TIER_INFO integrity | 3 | Count, required fields, order |

**Removed:** Individual tier color/background exact value tests (change detectors - no bug-catching value).

---

## Phase 2: API Schema Validation ✅ COMPLETE

### 2.1 Per-Slice Schema Tests

**Structure:** Tests are per-slice (better architecture) rather than centralized.

| File | Tests | Coverage |
|------|-------|----------|
| `tests/unit/tracking/schemas.test.ts` | 104 | Enums, session/approach/report/review schemas |
| `tests/unit/qa/schemas.test.ts` | 34 | Message schemas |
| `tests/unit/inner-game/schemas.test.ts` | 44 | Progress/value schemas |

**Total: 182 schema validation tests**

**Why useful:** Ensures malformed requests return 400 (Bad Request), not 500 (Server Error).

---

## Phase 3: QA Slice ✅ COMPLETE

### 3.1 confidence.ts ✅ IMPLEMENTED

**File:** `tests/unit/qa/confidence.test.ts`
**Tests:** 33 passing

| Function | Tests | Edge Cases Covered |
|----------|-------|-------------------|
| `computeConfidence()` | 12 | Empty chunks, single/multiple chunks, policy violations, clamping, rounding |
| `detectPolicyViolations()` | 10 | Clean text, manipulation patterns, boundary violations, case insensitivity |
| `getConfidenceLabel()` | 6 | Boundaries: 0.7, 0.4, edge values |

**Why useful:** Safety-critical. Bugs here = untrustworthy AI responses.

### 3.2 prompt.ts ✅ IMPLEMENTED

**File:** `tests/unit/qa/prompt.test.ts`
**Tests:** 35 passing

| Function | Tests | Edge Cases Covered |
|----------|-------|-------------------|
| `buildUserPrompt()` | 4 | Whitespace trimming, empty input, internal whitespace |
| `buildSystemPrompt()` | 14 | Source maps, missing metadata, truncation, script intent, security markers |
| `parseResponse()` | 12 | Missing sections, duplicate prefixes, leaked sections, follow-ups parsing |

**Why useful:** Parsing errors = broken chat responses.

### 3.3 qaServiceHelpers ✅ IMPLEMENTED (undocumented until now)

**File:** `tests/unit/qa/qaServiceHelpers.test.ts`
**Tests:** 34 passing

| Function | Tests | Edge Cases Covered |
|----------|-------|-------------------|
| `createNoContextResponse()` | 10 | Structure, zero confidence, empty sources, providers, latency |
| `chunksToSources()` | 5 | Single/multiple chunks, empty input, metadata preservation |
| `addCoachNamesToSourceCitations()` | 8 | Citation replacement, missing coach, format variations, out-of-range |
| `createMetaCognition()` | 10 | Reasoning fallback, coach limitations, follow-ups |
| `getDefaultModel()` | 4 | All providers |

**Why useful:** Response transformation logic. Bugs = malformed API responses.

---

## Phase 3b: Profile Slice ✅ COMPLETE (undocumented until now)

### profileService.ts ✅ IMPLEMENTED

**File:** `tests/unit/profile/profileService.test.ts`
**Tests:** 55 passing

| Function | Tests | Edge Cases Covered |
|----------|-------|-------------------|
| `getInitialLevelFromExperience()` | 8 | All 5 experience levels, unknown, empty, typos, case mismatch |
| `sanitizeArchetypes()` | 10 | Valid combos, duplicate detection, nullification cascades, empty strings |
| `validateAgeRange()` | 12 | Boundaries, clamping, swap when reversed, NaN handling |
| `validateRegion()` | 6 | All 13 valid regions, unknown, empty, case mismatch |
| `ProfileServiceError` | 4 | Error class structure |

**Why useful:** Profile validation. Bugs = corrupted user profiles.

---

## Phase 3c: Articles Slice ✅ COMPLETE (undocumented until now)

### articlesService.ts ✅ IMPLEMENTED

**File:** `tests/unit/articles/articlesService.test.ts`
**Tests:** 36 passing

| Function | Tests | Edge Cases Covered |
|----------|-------|-------------------|
| `PILLAR_TONE_GUIDANCE` | 2 | All 4 pillars have guidance, correct count |
| `buildSystemPrompt()` | 9 | All content units, rhetorical strategies, pillar tone guidance |
| `buildUserPrompt()` | 9 | Minimal/full requests, context elements, empty context |
| `formatFeedbackForPrompt()` | 7 | Sections with/without feedback, quotes, truncation, notes |
| `buildRevisionSystemPrompt()` | 6 | Feedback types, quality standards, style guide |

**Why useful:** Article generation prompts. Bugs = broken content generation.

---

## Phase 4: Scenarios Slice ✅ COMPLETE

### 4.1 difficulty.ts ✅ IMPLEMENTED

**File:** `tests/unit/scenarios/difficulty.test.ts`
**Tests:** 15 passing

| Function | Test Cases | Edge Cases | Notes |
|----------|-----------|------------|-------|
| `getDifficultyForLevel(level)` | 6 | Boundaries: 0, 5, 10, 15, 20, 100 | **KEEP** - Pure, boundary-testable |
| `getDifficultyPromptModifier(difficulty)` | 2 | Structure only: includes difficulty name, includes receptiveness | ~~5~~ → 2 (exact strings = change detector) |
| `generateWomanDescription(archetype, difficulty)` | 0 | N/A | **REMOVED** - Template interpolation, no bug-catching value |

**Why reduced:** Testing exact string templates like `"You're in a good mood..."` fails when copy changes intentionally - that's not a bug. Only test structure (includes required keywords).

**Est. tests: ~8** (down from ~15)

### 4.2 openers/evaluator.ts ⏸️ DEFERRED

**Reason:** `clampScore` and `evaluateHeuristically` are not exported - testing would require reimplementing the functions locally (testing fake code, not production). Will revisit when functions are exported or when tested via integration tests through `evaluateOpener` fallback path.

---

## Phase 5: Inner Game Slice ✅ COMPLETE

### 5.1 valueCutting.ts ✅ IMPLEMENTED

**File:** `tests/unit/inner-game/valueCutting.test.ts`
**Tests:** 36 passing

⚠️ **CRITICAL: `generateComparisonPairs()` uses `Math.random()`**

```typescript
// Line 17 in valueCutting.ts
const shuffled = [...valueIds].sort(() => Math.random() - 0.5)
```

This violates testing_behavior.md deterministic requirement. Cannot test exact pair output.

| Function | Test Cases | Edge Cases | Notes |
|----------|-----------|------------|-------|
| `generateComparisonPairs(valueIds)` | 3 | Structure only: pair count formula, valid IDs, no duplicates | ~~6~~ → 3 (non-deterministic output) |
| `scoreValuesFromComparisons(...)` | 4 | Empty comparisons, ties, missing values | **KEEP** |
| `getTopValues(...)` | 4 | n > available, ties at cutoff | **KEEP** |
| `calculateRoundsNeeded(count)` | 4 | 0, 1-10, 11-15, 16+ values | **KEEP** |
| `isCuttingComplete(...)` | 3 | Incomplete, complete, edge thresholds | **KEEP** |
| `getValuesAfterRound(...)` | 3 | Round 1, 2, 3 | **KEEP** |
| `buildFinalCoreValues(...)` | 2 | Normal, edge cases | **KEEP** |
| `mergeValues(...)` | 3 | Deduplication, empty arrays | **KEEP** |
| `splitByAspirational(...)` | 3 | All current, all aspirational, mixed | **KEEP** |
| `getNextCuttingAction(...)` | 6 | All state transitions + targetCoreValues boundary | **KEEP** |

**Structural tests for generateComparisonPairs:**
```typescript
// CAN test: structure and formulas
test('≤10 values returns round-robin count', () => {
  const pairs = generateComparisonPairs(['a','b','c','d','e']) // n=5
  expect(pairs.length).toBe(10) // n*(n-1)/2 = 5*4/2 = 10
})

test('all pairs contain valid valueIds', () => {
  const valueIds = ['a','b','c']
  const pairs = generateComparisonPairs(valueIds)
  pairs.forEach(([left, right]) => {
    expect(valueIds).toContain(left)
    expect(valueIds).toContain(right)
  })
})

// CANNOT test: which specific pairs are returned (random shuffle)
```

**Est. tests: ~28** (down from ~35)

**Why useful:** This is core inner-game functionality. Algorithm bugs = broken value discovery flow.

### 5.2 progressUtils.ts ✅ IMPLEMENTED

**File:** `tests/unit/inner-game/progressUtils.test.ts`
**Tests:** 30 passing

| Function | Test Cases | Edge Cases |
|----------|-----------|------------|
| `calculateCompletionPercentage(progress)` | 7 | 0-6 steps completed |
| `getResumeStep(progress)` | 6 | Each step state |
| `getCompletedSteps(progress)` | 4 | Various combinations |
| `canNavigateToStep(progress, target)` | 6 | Forward/backward navigation |
| `migrateProgress(progress)` | 3 | Legacy fields, new fields |

**Est. tests: ~26** (unchanged - all pure, all valuable)

---

## Implementation Priority

### Already Done (432 tests)

| Files | Tests | Status |
|-------|-------|--------|
| tracking/schemas.test.ts | 104 | ✅ |
| profile/profileService.test.ts | 55 | ✅ |
| inner-game/schemas.test.ts | 44 | ✅ |
| articles/articlesService.test.ts | 36 | ✅ |
| db/trackingRepoHelpers.test.ts | 35 | ✅ |
| qa/prompt.test.ts | 35 | ✅ |
| qa/schemas.test.ts | 34 | ✅ |
| qa/qaServiceHelpers.test.ts | 34 | ✅ |
| qa/confidence.test.ts | 33 | ✅ |
| tracking/milestones.test.ts | 22 | ✅ |

### Now Complete (81 tests implemented)

| Priority | Files | Estimated | Actual | Status |
|----------|-------|-----------|--------|--------|
| **P1** | valueCutting.ts | ~28 | 36 | ✅ |
| **P1** | difficulty.ts | ~8 | 15 | ✅ |
| **P2** | openers/evaluator.ts | ~20 | 0 | ⏸️ DEFERRED (not exported) |
| **P2** | progressUtils.ts | ~26 | 30 | ✅ |

---

## Files Created (81 tests implemented)

| Test File | Source File | Tests | Status |
|-----------|-------------|-------|--------|
| `tests/unit/inner-game/valueCutting.test.ts` | `src/inner-game/modules/valueCutting.ts` | 36 | ✅ |
| `tests/unit/scenarios/difficulty.test.ts` | `src/scenarios/shared/difficulty.ts` | 15 | ✅ |
| `tests/unit/inner-game/progressUtils.test.ts` | `src/inner-game/modules/progressUtils.ts` | 30 | ✅ |

## Files Already Complete

| Test File | Tests | Status |
|-----------|-------|--------|
| `tests/unit/tracking/schemas.test.ts` | 104 | ✅ |
| `tests/unit/profile/profileService.test.ts` | 55 | ✅ |
| `tests/unit/inner-game/schemas.test.ts` | 44 | ✅ |
| `tests/unit/articles/articlesService.test.ts` | 36 | ✅ |
| `tests/unit/db/trackingRepoHelpers.test.ts` | 35 | ✅ |
| `tests/unit/qa/prompt.test.ts` | 35 | ✅ |
| `tests/unit/qa/schemas.test.ts` | 34 | ✅ |
| `tests/unit/qa/qaServiceHelpers.test.ts` | 34 | ✅ |
| `tests/unit/qa/confidence.test.ts` | 33 | ✅ |
| `tests/unit/tracking/milestones.test.ts` | 22 | ✅ |

**Total: 513 useful unit tests** (432 existing + 81 new)

---

## Deferred (Low Value or Not Testable)

These were originally planned but provide minimal bug-catching value or can't be tested properly:

| File | Reason to Defer |
|------|-----------------|
| `scenarios/openers/evaluator.ts` | `clampScore` and `evaluateHeuristically` not exported - can't test without reimplementing |
| `scenarios/chat/evaluator.ts` | Heuristic fallback - rarely runs in production |
| `scenarios/career/evaluator.ts` | Heuristic fallback - rarely runs in production |
| `scenarios/shittests/evaluator.ts` | Heuristic fallback - rarely runs in production |
| `scenarios/config.ts` | Just object spreading - trivial logic |
| `profile/archetypes.ts` | Depends on file system - not pure |
| `inner-game/valueInference.ts` | Simple JSON parsing - low complexity |

**Revisit if:** These functions gain complexity or start causing production bugs.

---

## What NOT to Add

| Type | Reason |
|------|--------|
| Service pass-through tests | No logic to test (e.g., trackingService.ts) |
| Type-only file tests | Nothing to execute |
| Config constant tests | Static data, no behavior |
| Component tests | E2E covers UI |
| Tests requiring mocks | Violates testing_behavior.md |
| Change detector tests | Tests that fail when code changes but don't catch bugs |

---

## Senior Review Summary (01-02-2026)

### Tests Removed (~18 total)

| File | Removed | Reason |
|------|---------|--------|
| valueCutting.ts | 7 | `generateComparisonPairs` uses `Math.random()` - can't test exact output |
| difficulty.ts | 7 | Template string tests are change detectors - no bug-catching value |
| openers/evaluator.ts | 5 | Exact score assertions fail when weights tuned - use relative tests |

### Key Principles Applied

1. **Non-deterministic functions**: Test structure (pair count formula, valid IDs) not exact output
2. **Template interpolation**: Test structure (includes keywords) not exact strings
3. **Scoring functions**: Test relative behavior (`withX < withoutX`) not exact values

### Final Assessment

- **Original plan:** ~100 tests
- **After review:** ~82 estimated
- **Actual implemented:** 102 tests
- **Quality:** High - tests follow relative behavior patterns, no change detectors

---

## Gaps Not Covered by Any Plan

These need tests but don't fit cleanly into unit or integration:

| Gap | Type Needed | Notes |
|-----|-------------|-------|
| Stripe webhook handling | Integration | Needs Stripe test mode |
| Session timeout mid-action | E2E | User experience edge case |
| Concurrent writes (same user, two tabs) | Integration | Race condition testing |
| Empty state (new user, no data) | E2E | First-time user experience |
| Error response format consistency | Integration | All errors should return `{ error: string }` |

**Recommendation:** Add these to `better_tests_plan.md` Phase 4 or create a new phase.

---

## Verification Checklist

Before implementing each test file:
- [ ] Read `docs/testing_behavior.md`
- [ ] Follow AAA pattern with comments
- [ ] No mocking - pure functions only
- [ ] Cover edge cases listed in this plan
- [ ] Run `npm test` after each file
- [ ] All tests must pass before proceeding

After all tests implemented:
```bash
npm test  # ✅ 539 tests passing (540 total - 1 pre-existing architecture issue)
```

**Note:** The architecture test failure (`src/articles/schemas.ts` type export) is a pre-existing issue unrelated to this test plan.

---

## Relationship to Other Plans

| Plan | Scope | Overlap |
|------|-------|---------|
| `better_tests_plan.md` | Integration (testcontainers), Security E2E, Error E2E | `trackingRepoHelpers` pure functions documented there |
| This plan | Pure function unit tests | None |
| E2E specs | User flows via Playwright | Tests different layer |

**Note:** `tests/unit/db/trackingRepoHelpers.test.ts` (35 tests) is documented in `better_tests_plan.md` Phase 2.1 as they were created alongside the integration tests.

These plans are **complementary**, not competing.
