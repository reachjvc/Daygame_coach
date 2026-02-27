import { test, expect } from '@playwright/test'
import { ensureCleanSessionPage, ensureNoActiveSessionViaAPI } from '../helpers/auth.helper'
import { SELECTORS } from '../helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

test.describe('Mobile Session Tracking', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await ensureCleanSessionPage(page)
  })

  test.afterEach(async ({ page }) => {
    await ensureNoActiveSessionViaAPI(page)
  })

  test('session tracker loads on mobile', async ({ page }) => {
    await expect(page.getByTestId(SELECTORS.session.startButton)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByText('Session Tracker')).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('start session dialog is usable on small viewport', async ({ page }) => {
    // Click start session
    await page.getByTestId(SELECTORS.session.startButton).click({ timeout: ACTION_TIMEOUT })

    // Goal input should be visible and fillable
    const goalInput = page.getByTestId(SELECTORS.session.goalInput)
    await expect(goalInput).toBeVisible({ timeout: AUTH_TIMEOUT })
    await goalInput.fill('3', { timeout: ACTION_TIMEOUT })

    // Location input
    const locationInput = page.getByTestId(SELECTORS.session.locationInput)
    await expect(locationInput).toBeVisible({ timeout: AUTH_TIMEOUT })
    await locationInput.fill('Test Location', { timeout: ACTION_TIMEOUT })

    // Confirm button should be visible (not hidden behind keyboard)
    const confirmButton = page.getByTestId(SELECTORS.session.confirmButton)
    await expect(confirmButton).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('approach tap button is large enough for touch', async ({ page }) => {
    // Start a session first
    await page.getByTestId(SELECTORS.session.startButton).click({ timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.session.goalInput).fill('3', { timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.session.confirmButton).click({ timeout: ACTION_TIMEOUT })

    // Tap button should be visible and have a reasonable touch target
    const tapButton = page.getByTestId(SELECTORS.session.tapButton)
    await expect(tapButton).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Verify the button is at least 44x44px (minimum touch target)
    const box = await tapButton.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })
})
