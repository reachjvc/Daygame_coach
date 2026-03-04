import { Page } from '@playwright/test'

const NAV_TIMEOUT = 15000

/**
 * Navigates to the dashboard page
 */
export async function goToDashboard(page: Page): Promise<void> {
  await page.goto('/dashboard', { timeout: NAV_TIMEOUT })
}

/**
 * Navigates to the tracking session page
 */
export async function goToTracking(page: Page): Promise<void> {
  await page.goto('/dashboard/tracking/session', { timeout: NAV_TIMEOUT })
}

/**
 * Navigates to the settings page
 */
export async function goToSettings(page: Page): Promise<void> {
  await page.goto('/dashboard/settings', { timeout: NAV_TIMEOUT })
}

/**
 * Navigates to the scenarios page
 */
export async function goToScenarios(page: Page): Promise<void> {
  await page.goto('/dashboard/scenarios', { timeout: NAV_TIMEOUT })
}

/**
 * Navigates to the inner game page
 */
export async function goToInnerGame(page: Page): Promise<void> {
  await page.goto('/dashboard/inner-game', { timeout: NAV_TIMEOUT })
}

/**
 * Navigates to the Q&A page
 */
export async function goToQA(page: Page): Promise<void> {
  await page.goto('/dashboard/qa', { timeout: NAV_TIMEOUT })
}

/**
 * Navigates to the onboarding/preferences page
 */
export async function goToOnboarding(page: Page): Promise<void> {
  await page.goto('/preferences', { timeout: NAV_TIMEOUT })
}

/**
 * Navigates to the goals page
 */
export async function goToGoals(page: Page): Promise<void> {
  await page.goto('/dashboard/goals', { timeout: NAV_TIMEOUT })
}

/**
 * Waits for page to match a URL pattern
 */
export async function waitForPageLoad(page: Page, urlPattern: RegExp): Promise<void> {
  await page.waitForURL(urlPattern, { timeout: NAV_TIMEOUT })
}
