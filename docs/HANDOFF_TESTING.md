# Testing Handoff Document

**Status:** In Progress
**Updated:** 31-01-2026 16:53

## Changelog
- 31-01-2026 16:53 - Phase 4 complete: Added Q&A (15) + inner-game (54) API tests = 443 unit tests
- 31-01-2026 16:47 - Phase 4 partial: API route tests for tracking (41 tests)
- 31-01-2026 16:42 - Phase 3B complete: testcontainers + 24 integration tests
- 31-01-2026 16:34 - Phase 3A complete: trackingRepo helper tests (35 tests)
- 31-01-2026 16:30 - Phase 2C complete: articlesService tests (36 tests)

---

## Current State

**Unit tests:** 443 passing (`npm test`)
**Integration tests:** 24 tests (require Docker - `npm run test:integration`)

---

## What Was Completed

### Phase 1: Q&A System Unit Tests ✓
- 103 tests in `tests/unit/qa/`

### Phase 2A: Profile Service Tests ✓
- 55 tests in `tests/unit/profile/profileService.test.ts`

### Phase 2B: Schema Tests ✓
- 104 tests in `tests/unit/tracking/schemas.test.ts`

### Phase 2C: Articles Service Tests ✓
- 36 tests in `tests/unit/articles/articlesService.test.ts`
- Exported 4 helper functions from `src/articles/articlesService.ts`

### Phase 3A: TrackingRepo Helpers ✓
- 35 tests in `tests/unit/db/trackingRepoHelpers.test.ts`
- Exported 3 helper functions from `src/db/trackingRepo.ts`

### Phase 3B: Testcontainers Integration ✓
- **24 integration tests** in `tests/integration/db/trackingRepo.integration.test.ts`
- Created complete infrastructure:
  - `tests/integration/schema.sql` - PostgreSQL schema generated from types
  - `tests/integration/setup.ts` - Testcontainers setup/teardown
  - `vitest.integration.config.ts` - Separate config for integration tests
- Installed: `@testcontainers/postgresql`, `testcontainers`, `pg`, `@types/pg`
- Added script: `npm run test:integration`

**Note:** Integration tests require Docker to be running. They are excluded from `npm test`.

### Phase 4: API Route Tests (Tracking) ✓
- **41 tests** in `tests/unit/api/tracking.test.ts`
- Mocking strategy:
  - `vi.mock("@/src/db/server")` - mocks `createServerSupabaseClient`
  - `vi.mock("@/src/tracking/trackingService")` - mocks service functions
  - `vi.mock("@/src/db/trackingRepo")` - mocks `getApproachOwner`
- Test categories per route:
  - Authentication (401 on no user, auth error)
  - Validation (400 on invalid request body)
  - Happy path (successful operations)
  - Error handling (500 when service throws)
- Routes tested:
  - `POST /api/tracking/session` (create session)
  - `GET /api/tracking/session` (list sessions with pagination)
  - `POST /api/tracking/approach` (create approach)
  - `GET /api/tracking/approach` (list approaches with pagination)
  - `PATCH /api/tracking/approach/[id]` (update approach with ownership check)

### Phase 4B: API Route Tests (Q&A) ✓
- **15 tests** in `tests/unit/api/qa.test.ts`
- Mocking strategy:
  - `vi.mock("@/src/db/server")` - mocks `requirePremium`
  - `vi.mock("@/src/qa")` - mocks `handleQARequest`
- Routes tested:
  - `POST /api/qa` (Q&A question submission)

### Phase 4C: API Route Tests (Inner Game) ✓
- **54 tests** in `tests/unit/api/inner-game.test.ts`
- Mocking strategy:
  - `vi.mock("@/src/db/server")` - mocks auth functions
  - `vi.mock("@/src/inner-game")` - mocks service functions
  - `vi.mock("@/src/db/valueComparisonRepo")` - mocks comparison repo
  - `vi.mock("@/src/db/valuesRepo")` - mocks values repo
  - `vi.mock("@/src/inner-game/modules/progress")` - mocks progress functions
  - `vi.mock("@/src/inner-game/modules/valueInference")` - mocks inference
- Routes tested:
  - `GET /api/inner-game/values` (list values with optional category filter)
  - `POST /api/inner-game/values` (save value selection)
  - `GET /api/inner-game/comparisons` (get comparison history)
  - `POST /api/inner-game/comparisons` (save comparison)
  - `DELETE /api/inner-game/comparisons` (reset comparisons)
  - `GET /api/inner-game/progress` (get user progress)
  - `POST /api/inner-game/progress` (update progress)
  - `POST /api/inner-game/infer-values` (infer values from responses)

---

## IMMEDIATE NEXT TASK: Phase 5 - Component Tests

### Component tests to add:
- React component testing with Vitest + React Testing Library
- Test UI interactions and state management
- Priority components: SessionTrackerPage, InnerGamePage

---

## Remaining Phases

| Phase | Description | Tests | Status |
|-------|-------------|-------|--------|
| **3A** | trackingRepo helpers | 35 | ✓ DONE |
| **3B** | Testcontainers integration | 24 | ✓ DONE |
| **4** | API route tests (tracking) | 41 | ✓ DONE |
| **4B** | API route tests (Q&A) | 15 | ✓ DONE |
| **4C** | API route tests (inner-game) | 54 | ✓ DONE |
| **5** | Component tests | ~40+ | **NEXT** |

**Target:** 500+ tests | **Current:** 443 unit + 24 integration

---

## Key Files Reference

### Database Layer
- `src/db/trackingRepo.ts` - All tracking CRUD functions
- `src/db/trackingTypes.ts` - TypeScript types for DB rows
- `src/db/supabase.ts` - Supabase client creation

### API Routes
- `app/api/tracking/session/route.ts`
- `app/api/tracking/approach/route.ts`
- `app/api/tracking/approach/[id]/route.ts`
- `app/api/qa/route.ts`
- `app/api/inner-game/values/route.ts`
- `app/api/inner-game/comparisons/route.ts`
- `app/api/inner-game/progress/route.ts`
- `app/api/inner-game/infer-values/route.ts`

### API Route Tests
- `tests/unit/api/tracking.test.ts` - 41 tests
- `tests/unit/api/qa.test.ts` - 15 tests
- `tests/unit/api/inner-game.test.ts` - 54 tests

### Schemas (for validation testing)
- `src/tracking/schemas.ts` - Zod schemas for tracking API
- `src/qa/schemas.ts` - Zod schemas for Q&A API
- `src/inner-game/schemas.ts` - Zod schemas for inner-game API

---

## Quick Commands

```bash
npm test                    # Run unit tests (443 tests)
npm run test:integration    # Run integration tests (requires Docker)
npm run test:watch          # Watch mode for unit tests
```

---

## Testing Rules (from CLAUDE.md)

1. **Run `npm test` after every step**
2. **AAA pattern** with comments: `// Arrange`, `// Act`, `// Assert`
3. **No mocking external services** - use testcontainers for DB
4. **Deterministic tests** - no Math.random(), Date.now() without injection
5. **Read `docs/testing_behavior.md` before writing tests**
