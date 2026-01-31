# Supplementary Unit Tests Plan

**Status:** Active
**Updated:** 31-01-2026 22:15

## Changelog
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

## Phase 4: Scenarios Slice

### 4.1 difficulty.ts (HIGH PRIORITY)

**File to create:** `tests/unit/scenarios/difficulty.test.ts`

| Function | Test Cases | Edge Cases |
|----------|-----------|------------|
| `getDifficultyForLevel(level)` | 6 | Boundaries: 0, 5, 10, 15, 20, 100 |
| `getDifficultyPromptModifier(difficulty)` | 5 | All 5 difficulty levels |
| `generateWomanDescription(archetype, difficulty)` | 4 | Receptiveness thresholds |

**Why useful:** Wrong difficulty = frustrating UX for users at wrong skill level.

### 4.2 openers/evaluator.ts (MEDIUM PRIORITY)

**File to create:** `tests/unit/scenarios/openersEvaluator.test.ts`

| Function | Test Cases | Edge Cases |
|----------|-----------|------------|
| `clampScore(value)` | 6 | Negative, zero, 0.4/0.5/0.6 rounding, >10, NaN |
| `evaluateHeuristically(opener, encounter)` | 15+ | Word count edges, pattern combos, scenario-specific calibration |

**Pattern combinations to test:**
- Headphones + long message
- Fast walking + time constraint
- Apology + compliment
- Multiple questions

**Why useful:** This is the fallback when AI evaluation fails. Must be reliable.

---

## Phase 5: Inner Game Slice

### 5.1 valueCutting.ts (HIGH PRIORITY - Complex Algorithm)

**File to create:** `tests/unit/inner-game/valueCutting.test.ts`

| Function | Test Cases | Edge Cases |
|----------|-----------|------------|
| `generateComparisonPairs(valueIds)` | 6 | ≤10 (round-robin), >10 (tournament), odd count |
| `scoreValuesFromComparisons(...)` | 4 | Empty comparisons, ties, missing values |
| `getTopValues(...)` | 4 | n > available, ties at cutoff |
| `calculateRoundsNeeded(count)` | 4 | 0, 1-10, 11-15, 16+ values |
| `isCuttingComplete(...)` | 3 | Incomplete, complete, edge thresholds |
| `getValuesAfterRound(...)` | 3 | Round 1, 2, 3 |
| `buildFinalCoreValues(...)` | 2 | Normal, edge cases |
| `mergeValues(...)` | 3 | Deduplication, empty arrays |
| `splitByAspirational(...)` | 3 | All current, all aspirational, mixed |
| `getNextCuttingAction(...)` | 5 | All state transitions |

**Why useful:** This is core inner-game functionality. Algorithm bugs = broken value discovery flow.

### 5.2 progressUtils.ts (MEDIUM PRIORITY)

**File to create:** `tests/unit/inner-game/progressUtils.test.ts`

| Function | Test Cases | Edge Cases |
|----------|-----------|------------|
| `calculateCompletionPercentage(progress)` | 7 | 0-6 steps completed |
| `getResumeStep(progress)` | 6 | Each step state |
| `getCompletedSteps(progress)` | 4 | Various combinations |
| `canNavigateToStep(progress, target)` | 6 | Forward/backward navigation |
| `migrateProgress(progress)` | 3 | Legacy fields, new fields |

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

### Remaining (~100 tests)

| Priority | Files | Est. Tests | Rationale |
|----------|-------|-----------|-----------|
| **P1** | valueCutting.ts | ~35 | Complex algorithm, core feature |
| **P1** | difficulty.ts | ~15 | User experience critical |
| **P2** | openers/evaluator.ts | ~25 | Fallback evaluation logic |
| **P2** | progressUtils.ts | ~26 | User progress tracking |

---

## Files to Create (Remaining ~100 tests)

| Test File | Source File | Est. Tests | Priority |
|-----------|-------------|-----------|----------|
| `tests/unit/inner-game/valueCutting.test.ts` | `src/inner-game/modules/valueCutting.ts` | ~35 | P1 |
| `tests/unit/scenarios/difficulty.test.ts` | `src/scenarios/shared/difficulty.ts` | ~15 | P1 |
| `tests/unit/scenarios/openersEvaluator.test.ts` | `src/scenarios/openers/evaluator.ts` | ~25 | P2 |
| `tests/unit/inner-game/progressUtils.test.ts` | `src/inner-game/modules/progressUtils.ts` | ~26 | P2 |

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

**Total: 432 useful unit tests**

---

## Deferred (Low Value)

These were originally planned but provide minimal bug-catching value:

| File | Reason to Defer |
|------|-----------------|
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
npm test  # Should show ~185 new tests passing
```

---

## Relationship to Other Plans

| Plan | Scope | Overlap |
|------|-------|---------|
| `better_tests_plan.md` | Integration (testcontainers), Security E2E, Error E2E | `trackingRepoHelpers` pure functions documented there |
| This plan | Pure function unit tests | None |
| E2E specs | User flows via Playwright | Tests different layer |

**Note:** `tests/unit/db/trackingRepoHelpers.test.ts` (35 tests) is documented in `better_tests_plan.md` Phase 2.1 as they were created alongside the integration tests.

These plans are **complementary**, not competing.
