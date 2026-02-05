import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

test.describe('Q&A Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Arrange: Navigate to Q&A page
    await page.goto('/dashboard/qa', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  })

  test('should display initial state with sample questions', async ({ page }) => {
    // Skip if user doesn't have subscription (redirected away from QA)
    test.skip(!page.url().includes('/dashboard/qa'), 'User does not have QA access (no subscription)')

    // Assert: Q&A page should be visible with samples
    await expect(page.getByTestId(SELECTORS.qa.page)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByRole('heading', { name: 'Ask the Coach' })).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.qa.samples)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should fill input when clicking sample question', async ({ page }) => {
    // Skip if user doesn't have subscription
    test.skip(!page.url().includes('/dashboard/qa'), 'User does not have QA access (no subscription)')

    // Arrange: Wait for page to load
    await expect(page.getByTestId(SELECTORS.qa.page)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.qa.samples)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Get the input element
    const input = page.getByTestId(SELECTORS.qa.input)
    await expect(input).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Verify input is initially empty
    await expect(input).toHaveValue('', { timeout: ACTION_TIMEOUT })

    // Act: Click the first sample question
    await page.getByTestId(SELECTORS.qa.sample(0)).click({ timeout: ACTION_TIMEOUT })

    // Assert: Input should be filled with sample text
    await expect(input).not.toHaveValue('', { timeout: ACTION_TIMEOUT })
  })

  test('should disable submit when input empty', async ({ page }) => {
    // Skip if user doesn't have subscription
    test.skip(!page.url().includes('/dashboard/qa'), 'User does not have QA access (no subscription)')

    // Arrange: Wait for page to load
    await expect(page.getByTestId(SELECTORS.qa.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: Submit button should be disabled when input is empty
    const submitButton = page.getByTestId(SELECTORS.qa.submit)
    await expect(submitButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(submitButton).toBeDisabled({ timeout: ACTION_TIMEOUT })
  })

  test('should enable submit when input has text', async ({ page }) => {
    // Skip if user doesn't have subscription
    test.skip(!page.url().includes('/dashboard/qa'), 'User does not have QA access (no subscription)')

    // Arrange: Wait for page to load
    await expect(page.getByTestId(SELECTORS.qa.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Fill the input with text
    const input = page.getByTestId(SELECTORS.qa.input)
    await input.fill('Test question', { timeout: ACTION_TIMEOUT })

    // Assert: Submit button should be enabled
    const submitButton = page.getByTestId(SELECTORS.qa.submit)
    await expect(submitButton).toBeEnabled({ timeout: ACTION_TIMEOUT })
  })

  test('should show loading state during request', async ({ page }) => {
    // Skip if user doesn't have subscription
    test.skip(!page.url().includes('/dashboard/qa'), 'User does not have QA access (no subscription)')

    // Arrange: Wait for page to load and fill input
    await expect(page.getByTestId(SELECTORS.qa.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const input = page.getByTestId(SELECTORS.qa.input)
    await input.fill('What should I say when approaching?', { timeout: ACTION_TIMEOUT })

    // Act: Click submit
    await page.getByTestId(SELECTORS.qa.submit).click({ timeout: ACTION_TIMEOUT })

    // Assert: Submit button should show "Thinking..." text (loading state)
    await expect(page.getByTestId(SELECTORS.qa.submit)).toHaveText('Thinking...', { timeout: ACTION_TIMEOUT })
  })

  test('should display sources panel after getting response', async ({ page }) => {
    // Skip if user doesn't have subscription
    test.skip(!page.url().includes('/dashboard/qa'), 'User does not have QA access (no subscription)')

    // Arrange: Wait for page to load
    await expect(page.getByTestId(SELECTORS.qa.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Use a sample question which should have a known response
    await page.getByTestId(SELECTORS.qa.sample(0)).click({ timeout: ACTION_TIMEOUT })

    // Act: Submit the question
    await page.getByTestId(SELECTORS.qa.submit).click({ timeout: ACTION_TIMEOUT })

    // Assert: Sources panel should appear (after loading completes)
    await expect(page.getByTestId(SELECTORS.qa.sources)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })
})
