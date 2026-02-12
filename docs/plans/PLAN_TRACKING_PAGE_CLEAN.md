# Tracking Slice Architecture Audit & Remediation Plan

**Status:** IN PROGRESS (Phase 2 Complete)
**Created:** 2026-02-09
**Last Updated:** 2026-02-12 (Phase 2 - Pagination for milestones + draft reports)

## Reference Documents

- **Testing guidelines:** `docs/testing_behavior.md` - AAA pattern, deterministic tests, false-pass prevention
- **Architecture template:** `docs/slices/SLICE_QA.md` - orchestration pattern to follow

---

## Executive Summary

The tracking slice has **functional code but significant architectural drift** from the QA slice pattern. Three categories of issues identified:

| Category | Severity | Summary |
|----------|----------|---------|
| Architecture | HIGH | Business logic in DB layer, service is pass-through |
| Performance | MEDIUM | 5 parallel API calls, no pagination on milestones/drafts |
| Test Coverage | LOW | CustomReportBuilder E2E missing |

---

## 1. Architecture Violations (vs QA Pattern)

### Current State
```
API Route → trackingService.ts (PASS-THROUGH) → trackingRepo.ts (1,700 lines WITH BUSINESS LOGIC)
```

### Should Be (QA Pattern from SLICE_QA.md)
```
API Route → trackingService.ts (ORCHESTRATION) → specialized modules → trackingRepo.ts (CRUD ONLY)
```

### Specific Violations

| Location | Issue | Example |
|----------|-------|---------|
| `src/db/trackingRepo.ts:259-327` | Business logic in DB layer | `updateSessionStats()` - milestone checking, streak calc |
| `src/db/trackingRepo.ts:331-377` | Business logic in DB layer | `checkAndUpdateWeeklyStreak()` |
| `src/tracking/trackingService.ts:108-145` | Pass-through only | `createSession()` just calls `repoCreateSession()` |
| `src/db/trackingTypes.ts` | Types in DB layer | Should be in `src/tracking/types.ts` |

### QA Comparison (from SLICE_QA.md)
- QA has: `qaService.ts` → `retrieval.ts`, `prompt.ts`, `confidence.ts` (business logic modules)
- Tracking has: `trackingService.ts` → directly to `trackingRepo.ts` (no modules)

---

## 2. Performance Issues

### Dashboard Load: 5 Parallel API Calls
Location: `src/tracking/hooks/useTrackingStats.ts:53-59`

```typescript
Promise.all([
  fetch("/api/tracking/stats"),         // Required
  fetch("/api/tracking/sessions?limit=5"), // Required
  fetch("/api/tracking/milestones"),    // ALL milestones (unbounded) ⚠️
  fetch("/api/tracking/field-report?limit=5"),
  fetch("/api/tracking/review?limit=5"),
])
```

**Issues:**
1. User waits for SLOWEST of 5 calls
2. `/api/tracking/milestones` returns ALL (500+ potential)
3. No pagination on draft reports

### Specific Bottlenecks

| Endpoint | Issue | Impact |
|----------|-------|--------|
| `/api/tracking/milestones` | No limit param | Large payload if 100+ milestones |
| `/api/tracking/field-report?drafts=true` | No pagination | All drafts in single request |
| Filter change in history | Resets list to `[]` then refetches | UI flicker |

---

## 3. Test Coverage

### Already Tested ✅
- `generateSlug()`, `estimateMinutes()` - 37 unit tests
- Session/Approach CRUD - 100+ integration tests
- FieldReportPage, SessionTrackerPage, ProgressDashboard - E2E coverage
- **WeeklyReviewPage** - 5 E2E tests in `tests/e2e/weekly-review.spec.ts`
- **Sticking points CRUD** - 15+ integration tests in `trackingRepo.integration.test.ts:2033-2405`
- **Custom Report Templates** - integration tests for CRUD

### Still Missing ❌

| Component/Feature | Missing Tests |
|-------------------|---------------|
| CustomReportBuilder | NO E2E tests (integration exists) |
| VoiceRecorderButton, AudioUploadButton | NO tests (optional - covered by E2E) |
| API error handling (401, 400, 500) | NO explicit tests |

---

## Execution Order

1. **Phase 0:** Fix CustomReportBuilder UX (mode selection: template-only vs template+report)
2. **Phase 1:** Add remaining test coverage (CustomReportBuilder E2E)
3. **Phase 2:** Fix performance issues (pagination)
4. **Phase 3:** Architecture alignment (after tests pass)

---

## Phase 0: CustomReportBuilder UX Fix

**Problem:** Current CustomReportBuilder mixes template creation and report writing without clear user intent. Users fill in values but the API only saves template structure - values get lost.

**Solution:** Add mode selection at entry:

```
┌─────────────────────────────────────────────────┐
│  What would you like to do?                     │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 📋 Create Template Only                 │   │
│  │ Save field layout for future reports    │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 📝 Write Report (saves template too)    │   │
│  │ Fill out a report now, save layout      │   │
│  │ for reuse                               │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Tasks

- [x] Add mode selection state to CustomReportBuilder
- [x] Create mode selection UI (two cards)
- [x] Template-only mode: hide value inputs, show field picker only
- [x] Report+Template mode: current UI with values
- [x] Update save logic:
  - Template-only: POST to `/api/tracking/templates/custom` (existing)
  - Report+Template: POST template, then POST field report with values
- [x] Update API if needed to support both flows (existing API works)

### Files Modified
- EDIT: `src/tracking/components/CustomReportBuilder.tsx`

---

## Phase 1: Test Coverage ✅

**Reference:** Follow `docs/testing_behavior.md` for test patterns

### Tasks

- [x] Add E2E tests for CustomReportBuilder
  - File: `tests/e2e/custom-report-builder.spec.ts` (25 tests)
  - Pattern: Follows `tests/e2e/field-report.spec.ts`
  - Coverage:
    1. ✅ Mode selection screen (4 tests)
    2. ✅ Template-only mode (9 tests)
    3. ✅ Report mode (8 tests)
    4. ✅ Save template flow (1 test)
    5. ✅ Save report+template flow (1 test)
    6. ✅ Field picker and selection
    7. ✅ Navigation between modes
  - Uses AAA pattern with explicit comments

---

## Phase 2: Performance Fixes ✅

### Tasks

- [x] Paginate milestones endpoint
  - `trackingRepo.getUserMilestones()` accepts optional `limit`
  - `trackingService.getUserMilestones()` passes `limit` through
  - `/api/tracking/milestones` accepts `?limit=N` query param
  - `useTrackingStats` now fetches `?limit=20` (was unbounded)

- [x] Paginate draft reports
  - `trackingRepo.getDraftFieldReports()` accepts optional `limit`
  - `trackingService.getDraftFieldReports()` passes `limit` through
  - `/api/tracking/field-report?drafts=true` now respects existing `limit` param for drafts too

- [~] Smooth filter transitions in history — DEFERRED (low impact, current behavior works correctly)

---

## Phase 3: Architecture Alignment

**Reference:** Follow `docs/slices/SLICE_QA.md` for orchestration pattern

### Task 3.1: Extract Business Logic from trackingRepo

Move these functions from `src/db/trackingRepo.ts` to service layer:

| Function | New Location | Lines in Repo |
|----------|--------------|---------------|
| `updateSessionStats()` | `src/tracking/sessionStats.ts` | 259-327 |
| `checkAndUpdateWeeklyStreak()` | `src/tracking/streaks.ts` | 331-377 |
| `checkAndAwardMilestones()` | `src/tracking/milestoneLogic.ts` | ~100 lines |
| `incrementApproachStats()` | `src/tracking/sessionStats.ts` | 1243-1345 |
| `getISOWeekString()`, `areWeeksConsecutive()`, `isWeekActive()` | `src/tracking/streaks.ts` | Helper functions |

### Task 3.2: Move Types to Slice

- Move: `SessionRow`, `ApproachRow`, `FieldReportRow`, etc. to `src/tracking/types.ts`
- Keep: Only raw DB implementation details in `src/db/trackingTypes.ts`
- Update: All imports throughout codebase

### Task 3.3: Make trackingService Orchestrate

Transform from pass-through to orchestration (pattern from `src/qa/qaService.ts:26-100`):

```typescript
// BEFORE (pass-through)
export async function endSession(sessionId: string): Promise<SessionRow> {
  return repoEndSession(sessionId)
}

// AFTER (orchestration)
export async function endSession(sessionId: string): Promise<SessionRow> {
  const session = await repoGetSession(sessionId)
  const approaches = await repoGetSessionApproaches(sessionId)

  // Business logic in service layer modules
  const sessionInfo = calculateSessionInfo(session, approaches)  // from sessionStats.ts
  await updateSessionStats(session.user_id, sessionId, sessionInfo)  // from sessionStats.ts
  await checkAndUpdateWeeklyStreak(session.user_id)  // from streaks.ts

  return repoMarkSessionEnded(sessionId)  // Repo is CRUD only
}
```

---

## Files to Modify

### Phase 1 (Tests) ✅
- NEW: `tests/e2e/custom-report-builder.spec.ts` (25 E2E tests)
- EDIT: `tests/e2e/helpers/selectors.ts` (added customReportBuilder selectors)

### Phase 2 (Performance)
- EDIT: `app/api/tracking/milestones/route.ts`
- EDIT: `src/db/trackingRepo.ts` (add pagination params)
- EDIT: `src/tracking/hooks/useFieldReports.ts`

### Phase 3 (Architecture)
- NEW: `src/tracking/sessionStats.ts`
- NEW: `src/tracking/streaks.ts`
- NEW: `src/tracking/milestoneLogic.ts`
- EDIT: `src/tracking/trackingService.ts` (orchestration)
- EDIT: `src/db/trackingRepo.ts` (remove business logic, keep CRUD)
- EDIT: `src/tracking/types.ts` (absorb from trackingTypes)

---

## Verification

1. Run `npm test` after each phase
2. Run new E2E tests in headed mode to verify flows
3. Profile dashboard load time before/after Phase 2
4. Architecture tests pass: `tests/unit/architecture.test.ts`
