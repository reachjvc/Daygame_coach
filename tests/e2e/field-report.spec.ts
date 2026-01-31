import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'
import { login } from './helpers/auth.helper'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

test.describe('Field Report Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Arrange: Login and navigate to field report page
    await login(page)
    await page.goto('/dashboard/tracking/report', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  })

  test('should display template selection on load', async ({ page }) => {
    // Assert: Template selection page should be visible
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByText('Write Field Report')).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByText('Choose Your Template')).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should display available templates', async ({ page }) => {
    // Assert: At least one template card should be visible
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Check for common template slugs - at least one should be visible
    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard('quick-log'))
    const standardTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard('standard'))

    // Check that at least one template is visible
    const quickLogVisible = await quickLogTemplate.isVisible().catch(() => false)
    const standardVisible = await standardTemplate.isVisible().catch(() => false)
    expect(quickLogVisible || standardVisible).toBe(true)
  })

  test('should open form when template selected', async ({ page }) => {
    // Arrange: Wait for template selection to load
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Find first available template card and click it
    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard('quick-log'))
    const standardTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard('standard'))
    const deepDiveTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard('deep-dive'))

    // Click whichever template is available
    const templateToClick = quickLogTemplate.or(standardTemplate).or(deepDiveTemplate)
    await expect(templateToClick.first()).toBeVisible({ timeout: AUTH_TIMEOUT })
    await templateToClick.first().click({ timeout: ACTION_TIMEOUT })

    // Assert: Form view should appear
    await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.submit)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.saveDraft)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should navigate back to template selection from form', async ({ page }) => {
    // Arrange: Navigate to form view
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard('quick-log'))
    const standardTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard('standard'))
    const templateToClick = quickLogTemplate.or(standardTemplate)
    await expect(templateToClick.first()).toBeVisible({ timeout: AUTH_TIMEOUT })
    await templateToClick.first().click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Click back button
    await page.getByTestId(SELECTORS.fieldReport.back).click({ timeout: ACTION_TIMEOUT })

    // Assert: Should be back at template selection
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should have submit button disabled when required fields empty', async ({ page }) => {
    // Arrange: Navigate to form view
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Use standard template which likely has required fields
    const standardTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard('standard'))
    const deepDiveTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard('deep-dive'))
    const templateToClick = standardTemplate.or(deepDiveTemplate)

    if (await templateToClick.first().isVisible().catch(() => false)) {
      await templateToClick.first().click({ timeout: ACTION_TIMEOUT })
      await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

      // Assert: Submit button should be disabled when required fields are empty
      const submitButton = page.getByTestId(SELECTORS.fieldReport.submit)
      await expect(submitButton).toBeVisible({ timeout: AUTH_TIMEOUT })
      await expect(submitButton).toBeDisabled({ timeout: ACTION_TIMEOUT })
    }
  })

  test('should allow saving as draft without required fields', async ({ page }) => {
    // Arrange: Navigate to form view
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard('quick-log'))
    const standardTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard('standard'))
    const templateToClick = quickLogTemplate.or(standardTemplate)
    await expect(templateToClick.first()).toBeVisible({ timeout: AUTH_TIMEOUT })
    await templateToClick.first().click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: Save draft button should be enabled even with empty fields
    const saveDraftButton = page.getByTestId(SELECTORS.fieldReport.saveDraft)
    await expect(saveDraftButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(saveDraftButton).toBeEnabled({ timeout: ACTION_TIMEOUT })
  })
})
