import { test, expect, type Page } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'
import { ensureCleanSessionPage, ensureNoActiveSessionViaAPI } from './helpers/auth.helper'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000 // Increased for external service latency

/**
 * A field session, from the start button to the dashboard.
 *
 * Merged from session-tracking, approach-logging and data-persistence, which
 * between them started 23 sessions to check much the same seven things, and
 * whose quick-log tests asserted that the modal CLOSED — not that the outcome,
 * mood and tags you picked were stored. They read the account now, and nothing
 * here asserts a Tailwind class. The same flow on a phone is
 * `mobile/mobile-session.spec.ts`.
 */

/** What the account holds for the session that is running now */
async function activeSession(page: Page) {
  const response = await page.request.get('/api/tracking/session/active')
  expect(response.status()).toBe(200)
  return (await response.json()) as {
    session: { id: string; goal: number | null } | null
    approaches: { outcome: string | null; mood: number | null; tags: string[] | null }[]
  }
}

async function startSession(page: Page, goal?: string) {
  await page.getByTestId(SELECTORS.session.startButton).click({ timeout: ACTION_TIMEOUT })
  if (goal) await page.getByTestId(SELECTORS.session.goalInput).fill(goal, { timeout: ACTION_TIMEOUT })
  const confirmButton = page.getByTestId(SELECTORS.session.confirmButton)
  await expect(confirmButton).toBeAttached({ timeout: AUTH_TIMEOUT })
  await confirmButton.evaluate((el: HTMLElement) => el.click())
  await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('0', { timeout: AUTH_TIMEOUT })
}

/** Tap once, and wait for the quick log it opens */
async function tapApproach(page: Page, expectedCount: string) {
  await page.getByTestId(SELECTORS.session.tapButton).click({ timeout: ACTION_TIMEOUT })
  await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText(expectedCount, { timeout: AUTH_TIMEOUT })
  await expect(page.getByTestId(SELECTORS.session.quickLogModal)).toBeVisible({ timeout: AUTH_TIMEOUT })
}

async function endSession(page: Page) {
  await page.getByTestId(SELECTORS.session.endButton).click({ timeout: ACTION_TIMEOUT })
  const confirm = page.getByRole('button', { name: /end session/i })
  await expect(confirm).toBeVisible({ timeout: AUTH_TIMEOUT })
  await confirm.click({ timeout: ACTION_TIMEOUT })
  await page.waitForURL(/\/dashboard\/tracking(?!\/)/, { timeout: AUTH_TIMEOUT })
}

test.describe('Session Tracking Flow', () => {
  // One account can hold one active session, so these never run side by side
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await ensureCleanSessionPage(page)
  })

  test.afterEach(async ({ page }) => {
    await ensureNoActiveSessionViaAPI(page)
  })

  test('a session counts its approaches, and the count survives a reload', async ({ page }) => {
    await startSession(page)
    await expect(page.getByTestId(SELECTORS.session.duration)).toBeVisible()

    for (const count of ['1', '2']) {
      await tapApproach(page, count)
      await page.getByTestId(SELECTORS.session.quickLogDismiss).click({ timeout: ACTION_TIMEOUT })
      await expect(page.getByTestId(SELECTORS.session.quickLogModal)).toBeHidden({ timeout: AUTH_TIMEOUT })
    }
    // both taps reached the account before the reload, or the reload proves nothing
    await expect.poll(async () => (await activeSession(page)).approaches.length, { timeout: AUTH_TIMEOUT }).toBe(2)

    await page.reload({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.endButton)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('2', { timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.duration)).toBeVisible()
  })

  test('the outcome, mood and tags picked in the quick log are what is stored', async ({ page }) => {
    await startSession(page)
    await tapApproach(page, '1')

    // an outcome tapped twice is un-picked; the one picked after it is the one kept
    await page.getByTestId(SELECTORS.session.outcome('blowout')).click({ timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.session.outcome('blowout')).click({ timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.session.outcome('number')).click({ timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.session.mood(4)).click({ timeout: ACTION_TIMEOUT })
    for (const tag of ['day', 'street', 'solo']) {
      await page.getByTestId(SELECTORS.session.tag(tag)).click({ timeout: ACTION_TIMEOUT })
    }
    await page.getByTestId(SELECTORS.session.quickLogSave).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.quickLogModal)).toBeHidden({ timeout: AUTH_TIMEOUT })

    await expect
      .poll(async () => (await activeSession(page)).approaches[0] ?? null, { timeout: AUTH_TIMEOUT })
      .toMatchObject({ outcome: 'number', mood: 4 })
    const [approach] = (await activeSession(page)).approaches
    expect((approach.tags ?? []).map((t) => t.toLowerCase()).sort()).toEqual(['day', 'solo', 'street'])
  })

  test('dismissing the quick log still counts the approach, with nothing made up', async ({ page }) => {
    await startSession(page)
    await tapApproach(page, '1')
    await page.getByTestId(SELECTORS.session.quickLogDismiss).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.quickLogModal)).toBeHidden({ timeout: AUTH_TIMEOUT })

    await expect.poll(async () => (await activeSession(page)).approaches.length, { timeout: AUTH_TIMEOUT }).toBe(1)
    const [approach] = (await activeSession(page)).approaches
    expect(approach.outcome).toBeNull()
    expect(approach.mood).toBeNull()
  })

  test('a goal set at the start is stored and shown', async ({ page }) => {
    await startSession(page, '5')
    await expect(page.getByText('Goal Progress')).toBeVisible({ timeout: AUTH_TIMEOUT })
    expect((await activeSession(page)).session?.goal).toBe(5)
  })

  test('ending a session goes to the dashboard, and the next one starts from zero', async ({ page }) => {
    // Guards a report from 2026-01-30: a session that seemed to persist after End
    await startSession(page)
    await tapApproach(page, '1')
    await page.getByTestId(SELECTORS.session.quickLogSave).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.quickLogModal)).toBeHidden({ timeout: AUTH_TIMEOUT })

    await endSession(page)
    expect((await activeSession(page)).session, 'the session is still active after End').toBeNull()

    await ensureCleanSessionPage(page)
    await startSession(page)
    await expect(page.getByTestId(SELECTORS.session.counter)).toHaveText('0')
  })

  test('going back to an ended session does not bring it back to life', async ({ page }) => {
    // bfcache restores the old React state, which showed an ended session as
    // active: the tap button live, on a session the account had closed
    await startSession(page)
    await tapApproach(page, '1')
    await page.getByTestId(SELECTORS.session.quickLogSave).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.quickLogModal)).toBeHidden({ timeout: AUTH_TIMEOUT })
    await endSession(page)

    await page.goto('/dashboard/tracking/report', { timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    await page.goBack({ timeout: AUTH_TIMEOUT })
    await page.goBack({ timeout: AUTH_TIMEOUT })

    // Wait for the page to settle into one of the honest states — the ended
    // banner, a fresh start screen, or the dashboard — then require that the
    // dead session's controls are not among what is on screen.
    await expect(
      page
        .getByTestId(SELECTORS.session.sessionEndedBanner)
        .or(page.getByTestId(SELECTORS.session.startButton))
        .or(page.getByTestId(SELECTORS.trackingDashboard.page)),
    ).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.session.tapButton)).toBeHidden()
  })
})
