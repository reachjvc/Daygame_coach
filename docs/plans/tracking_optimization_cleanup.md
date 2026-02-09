# Tracking Slice Optimization & Cleanup Plan
**Status:** Complete
**Updated:** 09-02-2026
**Target:** Fix performance issues and achieve full vertical slice compliance

## Changelog
- 09-02-2026 - Phases 5-7 completed. All phases done.
- 30-01-2026 - Phases 1-4, 8-9 completed. Phases 5-7 deferred (optional)
- 30-01-2026 - Initial plan created

## Implementation Summary

**Completed:**
- Phase 1: N+1 query fixed (11+ queries → 1 single JOIN query)
- Phase 1: Unused dailyStats fetch removed (4 requests → 3)
- Phase 2: Constants moved from types.ts to config.ts
- Phase 3: config.tsx converted to config.ts (JSX moved to templateIcons.tsx)
- Phase 4: Milestone data extracted to data/milestones.ts (159 lines)
- Phase 5: ProgressDashboard split into 8 sub-components in dashboard/
- Phase 6: DashboardSkeleton for progressive loading
- Phase 7: AchievementsModal lazy loaded with React.lazy + Suspense
- Phase 8: Barrel exports completed for components/ and data/
- Phase 9: Documentation updated

**Results:**
- ProgressDashboard reduced from 1067 → 102 lines (90% reduction)
- Network requests reduced from 4 → 3
- DB queries reduced from 11+ → 1 (for sessions endpoint)
- AchievementsModal code-split (only loads when opened)

---

## Executive Summary

The `/tracking` page is slow due to:
1. **N+1 query problem** in `getSessionSummaries()` - 11+ DB calls instead of 1-2
2. **Unused data fetch** - 30-day daily stats fetched but never displayed
3. **Architecture violations** - Constants in types.ts, JSX in config.tsx
4. **Monolithic component** - 746-line ProgressDashboard with inline data

This plan has 100 steps organized into 10 phases. Reference: QA slice (`src/qa/`) for proper architecture.

---

## Phase 1: Critical Performance Fixes (Steps 1-15)

### Database Query Optimization

- [x] **1.** Read `src/db/trackingRepo.ts:400-440` and understand N+1 in `getSessionSummaries()`
- [x] **2.** Create new function `getSessionSummariesOptimized()` using single query with join
- [x] **3.** Write SQL: `SELECT sessions.*, approaches.* FROM sessions LEFT JOIN approaches ON ...`
- [x] **4.** Group results by session_id in JavaScript after single query
- [x] **5.** Add proper TypeScript types for the joined query result
- [x] **6.** Add unit test for `getSessionSummariesOptimized()` - verify single query execution
- [x] **7.** Replace `getSessionSummaries()` implementation with optimized version
- [x] **8.** Verify API endpoint `/api/tracking/sessions` uses new function
- [x] **9.** Test page load - measure DB query count (should be 2-3, not 11+)
- [x] **10.** Delete old N+1 implementation code

### Remove Unused Data Fetch

- [x] **11.** Read `src/tracking/hooks/useTrackingStats.ts:39` - confirm `dailyStats` unused
- [x] **12.** Search codebase for `dailyStats` usage in ProgressDashboard
- [x] **13.** Remove `fetch("/api/tracking/stats/daily?days=30")` from Promise.all
- [x] **14.** Remove `dailyStats` from state interface and initial state
- [x] **15.** Test page load - verify one less network request

---

## Phase 2: Architecture Compliance - Types (Steps 16-30)

### Move Constants from types.ts to config.ts

Reference: `src/qa/types.ts` (types ONLY) vs `src/qa/config.ts` (constants ONLY)

- [x] **16.** Read `src/tracking/types.ts:40-94` - identify constants to move
- [x] **17.** Create list: `APPROACH_TAGS`, `OUTCOME_OPTIONS`, `MOOD_OPTIONS`, `SET_TYPE_OPTIONS`
- [x] **18.** Read `src/tracking/config.tsx` - understand current structure
- [x] **19.** Move `APPROACH_TAGS` from types.ts to config.ts
- [x] **20.** Move `OUTCOME_OPTIONS` from types.ts to config.ts
- [x] **21.** Move `MOOD_OPTIONS` from types.ts to config.ts
- [x] **22.** Move `SET_TYPE_OPTIONS` from types.ts to config.ts
- [x] **23.** Update imports in all files using these constants (use grep)
- [x] **24.** Keep only type re-exports and interface definitions in types.ts
- [x] **25.** Add comment header to types.ts: "Types only - constants are in config.ts"
- [x] **26.** Verify types.ts follows QA slice pattern (no const exports)
- [x] **27.** Run TypeScript compiler - fix any import errors
- [x] **28.** Run existing tests - verify no regressions
- [x] **29.** Update barrel export in `src/tracking/index.ts`
- [x] **30.** Remove outdated comment in config.tsx about "constants in types.ts"

---

## Phase 3: Architecture Compliance - Config (Steps 31-45)

### Convert config.tsx to config.ts (Remove JSX)

Reference: `src/qa/config.ts` (no React imports, pure data)

- [x] **31.** Read `src/tracking/config.tsx:81-88` - identify JSX: `TEMPLATE_ICONS`
- [x] **32.** Create new file `src/tracking/components/templateIcons.tsx`
- [x] **33.** Move `TEMPLATE_ICONS` to templateIcons.tsx (it has React components)
- [x] **34.** Export `TEMPLATE_ICONS` from templateIcons.tsx
- [x] **35.** Update imports in components that use `TEMPLATE_ICONS`
- [x] **36.** Remove lucide-react imports from config.tsx
- [x] **37.** Rename `config.tsx` to `config.ts`
- [x] **38.** Verify config.ts has no React/JSX imports
- [x] **39.** Update barrel export in `src/tracking/index.ts`
- [x] **40.** Move `MOOD_EMOJI_OPTIONS` - decide: config.ts (pure data) or separate file
- [x] **41.** Consolidate all pure config constants in config.ts
- [x] **42.** Add section headers matching QA slice style
- [x] **43.** Run TypeScript compiler - verify no errors
- [x] **44.** Run build - verify no JSX in config.ts
- [x] **45.** Test FieldReportPage - verify template icons still work

---

## Phase 4: Extract Milestone Data (Steps 46-60)

### Move ALL_MILESTONES to data folder

Reference: `src/tracking/data/` already exists with `keyStats.tsx`, `principles.tsx`

- [x] **46.** Read `src/tracking/components/ProgressDashboard.tsx:598-719` - 121 lines of inline data
- [x] **47.** Create `src/tracking/data/milestones.ts`
- [x] **48.** Define `MilestoneInfo` interface in milestones.ts
- [x] **49.** Move `ALL_MILESTONES` record to milestones.ts
- [x] **50.** Move `TIER_INFO` array to milestones.ts
- [x] **51.** Export both from milestones.ts
- [x] **52.** Move helper functions `getMilestoneInfo`, `getTierColor`, `getTierBg` to milestones.ts
- [x] **53.** Update imports in ProgressDashboard.tsx
- [x] **54.** Remove inline data from ProgressDashboard.tsx (should be ~600 lines now)
- [x] **55.** Update `src/tracking/data/index.ts` barrel export
- [x] **56.** Test achievements modal - verify all milestones display correctly
- [x] **57.** Test tier filtering - verify colors work
- [x] **58.** Test locked/unlocked states
- [x] **59.** Verify no duplicate type definitions
- [x] **60.** Run TypeScript compiler - fix any issues

---

## Phase 5: Split ProgressDashboard Component (Steps 61-75)

### Break into smaller, focused components

- [x] **61.** Analyze ProgressDashboard sections: QuickStats, QuickActions, RecentMilestones, RecentSessions, WeeklyReviewStatus
- [x] **62.** Create `src/tracking/components/dashboard/QuickStatsGrid.tsx`
- [x] **63.** Move quick stats grid (lines 88-136) to QuickStatsGrid
- [x] **64.** Create `src/tracking/components/dashboard/QuickActionsCard.tsx`
- [x] **65.** Move quick actions card (lines 139-183) to QuickActionsCard
- [x] **66.** Create `src/tracking/components/dashboard/RecentMilestonesCard.tsx`
- [x] **67.** Move recent milestones section (lines 185-236) to RecentMilestonesCard
- [x] **68.** Create `src/tracking/components/dashboard/RecentSessionsCard.tsx`
- [x] **69.** Move recent sessions section (lines 429-527) to RecentSessionsCard
- [x] **70.** Create `src/tracking/components/dashboard/AchievementsModal.tsx`
- [x] **71.** Move achievements modal (lines 239-427) to AchievementsModal
- [x] **72.** Create `src/tracking/components/dashboard/WeeklyReviewCard.tsx`
- [x] **73.** Move weekly review status (lines 529-566) to WeeklyReviewCard
- [x] **74.** Update ProgressDashboard to compose these components
- [x] **75.** ProgressDashboard should now be <150 lines

---

## Phase 6: Progressive Loading (Steps 76-85)

### Implement skeleton loading and partial renders

- [x] **76.** Create `src/tracking/components/dashboard/DashboardSkeleton.tsx`
- [x] **77.** Add skeleton for QuickStatsGrid (4 card placeholders)
- [x] **78.** Add skeleton for QuickActionsCard
- [x] **79.** Add skeleton for RecentSessionsCard
- [x] **80.** Modify useTrackingStats to expose individual loading states
- [x] **81.** Update state interface: `{ statsLoading, sessionsLoading, milestonesLoading }`
- [x] **82.** Render QuickStatsGrid immediately when stats load (don't wait for sessions)
- [x] **83.** Render RecentMilestonesCard immediately when milestones load
- [x] **84.** Render RecentSessionsCard immediately when sessions load
- [x] **85.** Test progressive loading - verify content appears incrementally

---

## Phase 7: Code Splitting & Bundle (Steps 86-92)

### Lazy load heavy components

- [x] **86.** Add `React.lazy()` for AchievementsModal (only loads when opened)
- [x] **87.** Add `<Suspense>` wrapper with loading fallback
- [x] **88.** Review lucide-react imports in ProgressDashboard
- [x] **89.** Remove unused icon imports (Filter, Trophy if moved to modal)
- [x] **90.** Import icons only where used (in sub-components)
- [x] **91.** Run `npm run build` - check bundle size
- [x] **92.** Compare tracking chunk size before/after optimizations

---

## Phase 8: Complete Barrel Exports (Steps 93-96)

### Fix components/index.ts

- [x] **93.** Read `src/tracking/components/index.ts` - identify missing exports
- [x] **94.** Add exports for all public components: KeyStatsSection, PrinciplesSection, ResearchDomainsSection, FieldRenderer
- [x] **95.** Add exports for new dashboard sub-components
- [x] **96.** Verify all components importable via `@/src/tracking/components`

---

## Phase 9: Documentation (Steps 97-99)

### Update slice documentation

- [x] **97.** Update `docs/slices/SLICE_TRACKING.md` file structure section
- [x] **98.** Add new `components/dashboard/` folder to documentation
- [x] **99.** Add performance notes section documenting the optimizations made

---

## Phase 10: Validation & Cleanup (Step 100)

### Final verification

- [x] **100.** Run compliance checklist:
  - [x] No business logic in `app/api/` routes
  - [x] No direct Supabase calls outside `src/db/`
  - [x] All slice types in `types.ts`, not scattered
  - [x] Slice UI in `src/tracking/components/`, not `components/`
  - [x] Data files in `data/` subfolder
  - [x] Config file is `.ts` not `.tsx`
  - [x] Constants in `config.ts`, types in `types.ts`
  - [x] Page load time improved (measure before/after)
  - [x] All tests pass
  - [x] Build succeeds

---

## Success Metrics

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| DB queries on page load | 11+ | 1 | 2-3 ✅ |
| Network requests | 4 | 3 | 3 ✅ |
| ProgressDashboard.tsx lines | 1067 | 102 | <150 ✅ |
| types.ts contains constants | Yes | No | No ✅ |
| config.tsx (JSX) | Yes | No (config.ts) | No ✅ |
| AchievementsModal | Bundled | Lazy loaded | Code-split ✅ |

---

## Files Created

```
src/tracking/
├── config.ts                              # Renamed from config.tsx ✅
├── data/
│   └── milestones.ts                      # ALL_MILESTONES, TIER_INFO ✅
└── components/
    ├── templateIcons.tsx                  # TEMPLATE_ICONS (JSX) ✅
    └── dashboard/
        ├── index.ts                       # Barrel exports ✅
        ├── QuickStatsGrid.tsx             # Stats cards ✅
        ├── QuickActionsCard.tsx           # Quick actions ✅
        ├── RecentMilestonesCard.tsx       # Achievements list ✅
        ├── RecentSessionsCard.tsx         # Sessions list ✅
        ├── RecentFieldReportsCard.tsx     # Field reports list ✅
        ├── AchievementsModal.tsx          # Full modal (lazy loaded) ✅
        ├── WeeklyReviewsCard.tsx          # Weekly reviews ✅
        └── DashboardSkeleton.tsx          # Loading skeleton ✅
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/db/trackingRepo.ts` | Fix N+1 query in getSessionSummaries |
| `src/tracking/hooks/useTrackingStats.ts` | Remove unused dailyStats fetch, add partial loading |
| `src/tracking/types.ts` | Remove constants (APPROACH_TAGS, etc.) |
| `src/tracking/config.tsx` → `config.ts` | Move JSX out, pure constants only |
| `src/tracking/components/ProgressDashboard.tsx` | Extract data, split into sub-components |
| `src/tracking/components/index.ts` | Complete barrel exports |
| `src/tracking/index.ts` | Update exports |
| `docs/slices/SLICE_TRACKING.md` | Update file structure |

---

## Reference: QA Slice Architecture

```
src/qa/                    # CORRECT PATTERN
├── types.ts              # Types ONLY (no constants)
├── config.ts             # Constants ONLY (no JSX, no types)
├── qaService.ts          # Business logic
├── index.ts              # Barrel exports
└── components/
    └── QAPage.tsx        # UI component
```

Apply this pattern to tracking slice.
