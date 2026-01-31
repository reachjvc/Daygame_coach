import { Page } from '@playwright/test'

const ACTION_TIMEOUT = 2000

/**
 * Navigates to the dashboard page
 */
export async function goToDashboard(page: Page): Promise<void> {
  await page.goto('/dashboard', { timeout: ACTION_TIMEOUT })
}

/**
 * Navigates to the tracking session page
 */
export async function goToTracking(page: Page): Promise<void> {
  await page.goto('/dashboard/tracking/session', { timeout: ACTION_TIMEOUT })
}

/**
 * Navigates to the settings page
 */
export async function goToSettings(page: Page): Promise<void> {
  await page.goto('/dashboard/settings', { timeout: ACTION_TIMEOUT })
}

/**
 * Navigates to the scenarios page
 */
export async function goToScenarios(page: Page): Promise<void> {
  await page.goto('/dashboard/scenarios', { timeout: ACTION_TIMEOUT })
}

/**
 * Navigates to the inner game page
 */
export async function goToInnerGame(page: Page): Promise<void> {
  await page.goto('/dashboard/inner-game', { timeout: ACTION_TIMEOUT })
}

/**
 * Navigates to the Q&A page
 */
export async function goToQA(page: Page): Promise<void> {
  await page.goto('/dashboard/qa', { timeout: ACTION_TIMEOUT })
}

/**
 * Navigates to the onboarding/preferences page
 */
export async function goToOnboarding(page: Page): Promise<void> {
  await page.goto('/preferences', { timeout: ACTION_TIMEOUT })
}

/**
 * Waits for page to match a URL pattern
 */
export async function waitForPageLoad(page: Page, urlPattern: RegExp): Promise<void> {
  await page.waitForURL(urlPattern, { timeout: ACTION_TIMEOUT })
}
