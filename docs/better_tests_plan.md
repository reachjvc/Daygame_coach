# Test Improvement Plan

**Status:** Phases 1-5 Complete | Future work below
**Updated:** 02-02-2026

## Changelog
- 02-02-2026 - Documented schema-test limitation: integration tests validate DB constraints, not repo functions
- 02-02-2026 - Phase 5: Comprehensive integration test expansion (+88 tests)
- 02-02-2026 14:05 - Added 6 tracking edge case tests (58 → 6 decision documented below)
- 02-02-2026 - Condensed to summary + lessons + future work

---

## Summary: What Was Done

| Phase | What | Result |
|-------|------|--------|
| 1. Testcontainers | Isolated PostgreSQL per test run | 5 setup tests |
| 2. Integration Tests | 4 repos (tracking, profiles, settings, innerGameProgress) | 77 tests |
| 3. Security E2E | Auth, input validation, RLS, IDOR | 43 tests |
| 4. Error-Path E2E | API errors, auth errors, form validation | 21 tests |
| 5. Integration Expansion | Field Reports, Reviews, Sticking Points, valuesRepo, valueComparisonRepo | 88 tests |

**Total Integration Tests:** 160 tests across 8 files

---

## Case Study: 58 Tests Narrowed to 6 (02-02-2026)

### What Happened

Previous Claude proposed 58 integration tests:
- Session tracking edge cases: 16 tests
- Q&A orchestration: 28 tests
- Scenario XP: 14 tests

### Critical Review Found

1. **Q&A "integration" tests were actually unit tests** - `buildSystemPrompt`, `parseResponse`, `computeConfidence` are pure functions that don't touch the database. They receive data as parameters, they don't fetch it.

2. **~10 tracking tests already existed** - Week 53→Week 1, milestone thresholds, concurrent session ends were already covered.

3. **Scenario XP isn't wired up** - `updateUserProgress` exists but no API routes call it yet. Tests for unimplemented flows are premature.

### User Insight

> "We're doing work that won't matter when the project is more settled"

- Q&A prompt format changes constantly → unit tests become maintenance burden
- Scenario XP API might change when wired → tests need rewriting
- Only tracking is stable and worth testing now

### Final Decision: 6 Tests

Added to `tests/integration/db/trackingRepo.integration.test.ts`:

| Test | What It Catches |
|------|-----------------|
| Concurrent approach logging to same session | Race condition in approach count |
| Double endSession on same ID | Idempotency / double-counting |
| night_owl at exactly 21:00 | >= vs > comparison bug |
| early_bird at 00:00 (midnight) | Hour boundary edge case |
| first_5_approach_session milestone | Threshold check correctness |
| longest_week_streak preserved when current breaks | Overwriting longest with shorter |

### Lesson for Future Claude

Don't write tests for:
- Pure functions that don't touch the database (those are unit tests)
- Features that aren't wired up yet
- Code that's still being shaped (prompts, AI responses)

DO write tests for:
- Stable database operations
- Edge cases in production code (race conditions, boundaries)
- Security boundaries

---

## Phase 5: Comprehensive Integration Test Expansion (02-02-2026)

### What Was Added

| Area | Tests | File |
|------|-------|------|
| Field Report Templates | 4 | trackingRepo.integration.test.ts |
| Field Report CRUD | 7 | trackingRepo.integration.test.ts |
| Field Report Queries | 6 | trackingRepo.integration.test.ts |
| Review Templates | 3 | trackingRepo.integration.test.ts |
| Review CRUD | 5 | trackingRepo.integration.test.ts |
| Review Queries | 4 | trackingRepo.integration.test.ts |
| Commitment Tracking | 3 | trackingRepo.integration.test.ts |
| Sticking Point CRUD | 5 | trackingRepo.integration.test.ts |
| Sticking Point Queries | 5 | trackingRepo.integration.test.ts |
| Sticking Point Enums | 2 | trackingRepo.integration.test.ts |
| Cascade Deletes | 2 | trackingRepo.integration.test.ts |
| valueComparisonRepo | 18 | valueComparisonRepo.integration.test.ts |
| valuesRepo | 13 | valuesRepo.integration.test.ts |

**Schema changes:**
- Fixed `value_comparisons` table: `value_a/b/winner` → `value_a_id/value_b_id/chosen_value_id/comparison_type/round_number`
- Added `values` table: `id, category, display_name, description`
- Added `user_values` table: `user_id, value_id` with unique constraint
- Updated `truncateAllTables()` to include new tables

### Why This Was Done

User requested comprehensive coverage analysis. Found 14 trackingRepo functions and 2 repos (valuesRepo, valueComparisonRepo) with zero integration tests despite having production code.

---

## Key Insight: Two Layers of Testing

| Layer | Tool | Purpose |
|-------|------|---------|
| **Logic correctness** | Testcontainers | Does the query work? Does the transaction complete? |
| **Security boundaries** | Real Supabase E2E | Can User B access User A's data? (RLS enforcement) |

Testcontainers tests logic but **cannot test RLS policies**. We need dedicated security E2E tests against real Supabase to avoid false confidence.

---

## Decisions Made

| Question | Answer |
|----------|--------|
| Testcontainers vs Supabase? | **Testcontainers** for logic, **Real Supabase E2E** for RLS |
| How many repos? | **4 repos** (skip trivial: values, valueComparison, embeddings) |
| Service validation tests? | **Defer** until features are built |
| Error E2E? | **Yes** with route interception (not mocking) |
| RLS security tests? | **Yes, P1** - prevents false confidence |

---

## Design Decision: Schema Tests vs Function Tests (02-02-2026)

### What Integration Tests Actually Test

The integration tests in `tests/integration/db/*.integration.test.ts` use **raw SQL queries** against testcontainers PostgreSQL, not the actual repo functions from `src/db/*.ts`.

**What they validate:**
- ✓ FK constraint enforcement
- ✓ Unique constraint enforcement
- ✓ CHECK constraint enforcement
- ✓ Cascade delete behavior
- ✓ User isolation (multi-user scenarios)
- ✓ SQL query correctness

**What they DON'T test:**
- ✗ Supabase client wrapper code
- ✗ Error handling in repo functions
- ✗ Backward-compatibility logic (e.g., `listValues()` retry on missing column)
- ✗ `.single()` behavior in `saveComparison()`

### Why We Kept It This Way

1. **Repos use `createServerSupabaseClient()`** which requires Next.js server context
2. **Refactoring for testability** would require dependency injection across all repos
3. **E2E tests already cover production code** - full stack from UI to database
4. **Schema tests have real value** - they catch database drift, which caused bugs in past

### Guidance for Future Work

- **Don't rename these files** - they're correctly named as integration tests (they integrate with the database)
- **Don't add function-level tests** without first solving the Supabase client mocking problem
- **Rely on E2E** for production code coverage
- **Add API-level tests** if you need to test repo behavior without UI (use `fetch` against running dev server)

---

## Mistakes & Lessons Learned

### Test Isolation Issues
**Problem:** Error-path tests passed individually but caused ~50 failures when run with full suite.

**Root causes:**
- Missing `test.describe.configure({ mode: 'serial' })` - tests ran in parallel with shared auth state
- No `afterEach()` cleanup - route handlers leaked between tests
- Route interceptions stacked across parallel tests

**Fix:** Added serial mode + `page.unrouteAll()` cleanup. Created safeguard test `tests/unit/e2e-isolation.test.ts`.

### Bugs Found During Testing

| Bug | Root Cause | Fix |
|-----|------------|-----|
| Session cleanup not working | `ensureNoActiveSessionViaAPI` checked `data.id` but API returns `data.session.id` | Fixed JSON path |
| Modal confirm button not clickable | Button outside viewport | Use `dispatchEvent('click')` |
| QA timeout test fails | App stayed in "Thinking..." on timeout | Added AbortController + 30s timeout |

### False-Pass Anti-Pattern
9 security tests had silent `return` statements that passed when test data didn't exist. Fixed by using proper test data setup via API helpers.

---

## What NOT to Add

| Type | Reason |
|------|--------|
| Component unit tests | E2E covers UI; components are presentation only |
| Service validation tests | Add when features are built, not before |
| Mock-based tests | Violates testing_behavior.md |
| Scenario module tests | 82% are placeholders with `comingSoon: true` |

---

## Future Work

### 1. Rate Limiting (BLOCKED - implement feature first)

**Status:** Tests exist in `security-ratelimit.spec.ts` but are blocked until rate limiting is implemented.

**Recommended limits:**
- Q&A endpoint: 10 requests/minute per user
- Session creation: 5 requests/minute per user
- AI endpoints: 5 requests/minute per user
- General API: 60 requests/minute per user

**Where to implement:** Middleware in `app/api/` or Vercel Edge Config.

### 2. Prompt Injection Tests (when AI can modify data)

**Current state:** AI only answers questions → low risk.
**Future state:** AI modifies data → HIGH risk.

**When to add:** As soon as AI gains ability to modify user data.

**Implementation approach:**
1. AI actions go through a validation layer (not directly to database)
2. AI can only call specific, pre-approved functions
3. User input is clearly separated from system instructions
4. AI output is validated before executing actions

### 3. Backups (HIGH priority when you have real users)

- [ ] Enable Supabase automatic backups
- [ ] Test restore process (backups are useless if you can't restore)
- [ ] Consider daily exports to a separate location

### 4. Logging (MEDIUM priority)

- [ ] Structured logging in API routes (who did what, when, result)
- [ ] Error logging with stack traces
- [ ] Log aggregation service (Vercel built-in or Axiom)

### 5. Alerting (MEDIUM priority)

- [ ] Error rate alerts (>1% of requests failing)
- [ ] Latency alerts (responses taking >2 seconds)
- [ ] Rate limit alerts (repeated limit hits)
- [ ] Budget alerts (OpenAI spending threshold)

### 6. Cost Monitoring (HIGH priority)

- [ ] OpenAI usage dashboard monitoring
- [ ] Set up billing alerts ($X threshold)
- [ ] Track tokens-per-request in logs
- [ ] Calculate cost-per-user metrics

---

## Good Test Suggestions

| Suggestion | Why It Catches Real Bugs |
|------------|-------------------------|
| Test happy path submission flow | Catches broken API, validation |
| Test state machine transitions | Catches logic bugs |
| Test data persistence after action | Catches save/load bugs |
