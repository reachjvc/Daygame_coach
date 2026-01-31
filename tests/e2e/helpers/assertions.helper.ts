import { Page, expect } from '@playwright/test'

const ACTION_TIMEOUT = 2000

/**
 * Asserts that an element with the given testId is visible
 */
export async function expectVisible(page: Page, testId: string, timeout = ACTION_TIMEOUT): Promise<void> {
  await expect(page.getByTestId(testId)).toBeVisible({ timeout })
}

/**
 * Asserts that an element with the given testId has specific text
 */
export async function expectText(page: Page, testId: string, text: string, timeout = ACTION_TIMEOUT): Promise<void> {
  await expect(page.getByTestId(testId)).toHaveText(text, { timeout })
}

/**
 * Asserts that an element with the given testId contains specific text
 */
export async function expectContainsText(
  page: Page,
  testId: string,
  text: string,
  timeout = ACTION_TIMEOUT
): Promise<void> {
  await expect(page.getByTestId(testId)).toContainText(text, { timeout })
}

/**
 * Asserts that the current URL contains the given pattern
 */
export async function expectUrlContains(page: Page, pattern: string | RegExp): Promise<void> {
  if (typeof pattern === 'string') {
    expect(page.url()).toContain(pattern)
  } else {
    expect(page.url()).toMatch(pattern)
  }
}

/**
 * Asserts that a counter element displays the expected value
 */
export async function expectCounterValue(
  page: Page,
  testId: string,
  value: number,
  timeout = ACTION_TIMEOUT
): Promise<void> {
  await expect(page.getByTestId(testId)).toHaveText(String(value), { timeout })
}
