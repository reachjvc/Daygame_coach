# Handoff: E2E Test Implementation Plan

**Status:** ✅ COMPLETE - 10 of 10 implemented
**Updated:** 31-01-2026 20:30
**Priority:** Done

## Changelog
- 31-01-2026 20:30 - All 10 test files implemented, 93 passing, 8 skipped
- 31-01-2026 17:50 - Updated with implementation progress (3/10 done), bug fixes, patterns
- 31-01-2026 00:15 - Initial handoff document created

---

## ✅ COMPLETED (10 of 10)

### 1. ✅ approach-logging.spec.ts
- **Location:** `tests/e2e/approach-logging.spec.ts`
- **Tests:** 6 passing
- **Added testids to** `src/tracking/components/SessionTrackerPage.tsx`

### 2. ✅ field-report.spec.ts
- **Location:** `tests/e2e/field-report.spec.ts`
- **Tests:** 6 passing
- **Added testids to** `src/tracking/components/FieldReportPage.tsx`

### 3. ✅ qa-chat.spec.ts
- **Location:** `tests/e2e/qa-chat.spec.ts`
- **Tests:** 6 (skipped - requires subscription)
- **Added testids to** `src/qa/components/QAPage.tsx`

### 4. ✅ signup-flow.spec.ts
- **Location:** `tests/e2e/signup-flow.spec.ts`
- **Tests:** 4 passing
- **Added testids to** `app/auth/sign-up/page.tsx`:
  - `signup-form`
  - `signup-fullname-input`
  - `signup-email-input`
  - `signup-password-input`
  - `signup-repeat-password-input`
  - `signup-submit-button`
  - `signup-error-message`

### 5. ✅ tracking-dashboard.spec.ts
- **Location:** `tests/e2e/tracking-dashboard.spec.ts`
- **Tests:** 5 passing
- **Added testids to** `src/tracking/components/ProgressDashboard.tsx`:
  - `tracking-dashboard`
  - `total-approaches`
  - `total-numbers`
  - `week-streak`
  - `total-sessions`
  - `new-session-link`
  - `field-report-link`
  - `weekly-review-link`
  - `quick-add-button`

### 6. ✅ inner-game-flow.spec.ts
- **Location:** `tests/e2e/inner-game-flow.spec.ts`
- **Tests:** 3 passing, 2 skipped (preview mode)
- **Added testids to**:
  - `src/inner-game/components/InnerGamePage.tsx`: `inner-game-page`, `inner-game-loading`
  - `src/inner-game/components/WelcomeCard.tsx`: `inner-game-welcome`, `inner-game-welcome-start`

### 7. ✅ weekly-review.spec.ts
- **Location:** `tests/e2e/weekly-review.spec.ts`
- **Tests:** 5 passing
- **Added testids to** `src/tracking/components/WeeklyReviewPage.tsx`:
  - `weekly-review-page`
  - `weekly-review-loading`
  - `weekly-stats-card`
  - `weekly-template-{slug}`
  - `weekly-review-form`
  - `weekly-review-submit`
  - `weekly-review-save-draft`
  - `weekly-review-back`

### 8. ✅ scenarios-hub.spec.ts
- **Location:** `tests/e2e/scenarios-hub.spec.ts`
- **Tests:** 6 passing
- **Added testids to** `src/scenarios/components/ScenariosHub.tsx`:
  - `scenarios-hub`
  - `scenarios-signup-prompt`
  - `scenarios-recommended`
  - `scenario-card-{id}`

### 9. ✅ preferences.spec.ts
- **Location:** `tests/e2e/preferences.spec.ts`
- **Tests:** 6 passing
- **Uses existing testids in** `src/profile/components/OnboardingFlow.tsx`:
  - `onboarding-progress`
  - `onboarding-step-indicator`
  - `onboarding-back-button`
  - `onboarding-next-button`
  - `onboarding-complete-button`

### 10. ✅ articles.spec.ts
- **Location:** `tests/e2e/articles.spec.ts`
- **Tests:** 6 passing
- **Added testids to** `src/articles/components/ArticlesPage.tsx`:
  - `articles-page`
  - `articles-header`
  - `content-pillars`
  - `pillar-card-{id}`
  - `article-types`
  - `article-type-{key}`

---

## FINAL TEST COUNTS

- **Total E2E tests:** 101
- **Passing:** 93
- **Skipped:** 8 (6 qa-chat require subscription, 2 inner-game preview mode)

---

## COMMANDS

```bash
# Run single test file
npx playwright test tests/e2e/<name>.spec.ts --reporter=list

# Run all e2e tests (workers=1 avoids session conflicts)
npx playwright test --workers=1 --reporter=list

# Run full test suite
npm test
```

---

## SELECTORS FILE

All selectors are centralized in `tests/e2e/helpers/selectors.ts` with organized namespaces:
- `auth` - Login page selectors
- `header` - Header navigation
- `dashboard` - Main dashboard
- `session` - Session tracking
- `settings` - Settings page
- `onboarding` - Preferences/onboarding flow
- `fieldReport` - Field report page
- `qa` - Q&A chat page
- `signup` - Signup page
- `trackingDashboard` - Tracking dashboard
- `innerGame` - Inner game flow
- `weeklyReview` - Weekly review
- `scenarios` - Scenarios hub
- `articles` - Articles page
