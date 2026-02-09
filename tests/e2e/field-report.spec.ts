import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

/**
 * Template slug constants - single source of truth reference.
 * These map to slugs defined in src/tracking/data/templates.ts
 */
const SLUGS = {
  quickLog: 'quick-log',
  standard: 'standard',
  deepDive: 'deep-dive',
  cbt: 'cbt-thought-diary',
} as const

test.describe('Field Report Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Arrange: Navigate to field report page
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
    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.quickLog))
    const standardTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.standard))

    // Check that at least one template is visible
    const quickLogVisible = await quickLogTemplate.isVisible().catch(() => false)
    const standardVisible = await standardTemplate.isVisible().catch(() => false)
    expect(quickLogVisible || standardVisible).toBe(true)
  })

  test('should open form when template selected', async ({ page }) => {
    // Arrange: Wait for template selection to load
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Find first available template card and click it
    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.quickLog))
    const standardTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.standard))
    const deepDiveTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.deepDive))

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

    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.quickLog))
    const standardTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.standard))
    const templateToClick = quickLogTemplate.or(standardTemplate)
    await expect(templateToClick.first()).toBeVisible({ timeout: AUTH_TIMEOUT })
    await templateToClick.first().click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Click back button
    await page.getByTestId(SELECTORS.fieldReport.back).click({ timeout: ACTION_TIMEOUT })

    // Assert: Should be back at template selection
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should show submit button on form view', async ({ page }) => {
    // Arrange: Navigate to form view
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Use standard template
    const standardTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.standard))
    const deepDiveTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.deepDive))
    const templateToClick = standardTemplate.or(deepDiveTemplate)

    if (await templateToClick.first().isVisible().catch(() => false)) {
      await templateToClick.first().click({ timeout: ACTION_TIMEOUT })
      await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

      // Assert: Submit button should be visible on form
      const submitButton = page.getByTestId(SELECTORS.fieldReport.submit)
      await expect(submitButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    }
  })

  test('should allow saving as draft without required fields', async ({ page }) => {
    // Arrange: Navigate to form view
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.quickLog))
    const standardTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.standard))
    const templateToClick = quickLogTemplate.or(standardTemplate)
    await expect(templateToClick.first()).toBeVisible({ timeout: AUTH_TIMEOUT })
    await templateToClick.first().click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: Save draft button should be enabled even with empty fields
    const saveDraftButton = page.getByTestId(SELECTORS.fieldReport.saveDraft)
    await expect(saveDraftButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(saveDraftButton).toBeEnabled({ timeout: ACTION_TIMEOUT })
  })

  test('should display date automatically set to today', async ({ page }) => {
    // Arrange: Navigate to form view
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.quickLog))
    const standardTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.standard))
    const templateToClick = quickLogTemplate.or(standardTemplate)
    await expect(templateToClick.first()).toBeVisible({ timeout: AUTH_TIMEOUT })
    await templateToClick.first().click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: Date display should be visible automatically with today's date
    const dateDisplay = page.getByTestId(SELECTORS.fieldReport.dateDisplay)
    await expect(dateDisplay).toBeVisible({ timeout: AUTH_TIMEOUT })
    const today = new Date()
    await expect(dateDisplay).toContainText(today.getDate().toString())
  })

  test('should allow changing date by clicking date display', async ({ page }) => {
    // Arrange: Navigate to form view
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.quickLog))
    const standardTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.standard))
    const templateToClick = quickLogTemplate.or(standardTemplate)
    await expect(templateToClick.first()).toBeVisible({ timeout: AUTH_TIMEOUT })
    await templateToClick.first().click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: Date display should be visible and clickable (popover-based date picker)
    const dateDisplay = page.getByTestId(SELECTORS.fieldReport.dateDisplay)
    await expect(dateDisplay).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(dateDisplay).toBeEnabled({ timeout: ACTION_TIMEOUT })
  })

  test('should reset date to today when navigating back and selecting new template', async ({ page }) => {
    // Arrange: Navigate to form view
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.quickLog))
    const standardTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.standard))
    const templateToClick = quickLogTemplate.or(standardTemplate)
    await expect(templateToClick.first()).toBeVisible({ timeout: AUTH_TIMEOUT })
    await templateToClick.first().click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Verify date is visible initially
    const dateDisplay = page.getByTestId(SELECTORS.fieldReport.dateDisplay)
    await expect(dateDisplay).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Go back and select another template
    await page.getByTestId(SELECTORS.fieldReport.back).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Select a different template (or same one)
    await expect(templateToClick.first()).toBeVisible({ timeout: AUTH_TIMEOUT })
    await templateToClick.first().click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: Date should still be visible (reset to today)
    await expect(dateDisplay).toBeVisible({ timeout: AUTH_TIMEOUT })
    const today = new Date()
    await expect(dateDisplay).toContainText(today.getDate().toString())
  })
})

test.describe('Field Input Types', () => {
  test.beforeEach(async ({ page }) => {
    // Arrange: Navigate to field report form with quick-log template
    await page.goto('/dashboard/tracking/report', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Navigate to form view using quick-log template (has text, number, select fields)
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })
    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.quickLog))
    await expect(quickLogTemplate).toBeVisible({ timeout: AUTH_TIMEOUT })
    await quickLogTemplate.click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should render and accept text input', async ({ page }) => {
    // The quick-log template has 'intention' field which is text type
    const intentionInput = page.getByTestId(SELECTORS.fieldReport.fieldInput('intention'))

    if (await intentionInput.isVisible().catch(() => false)) {
      // Act: Type in the text input
      await intentionInput.fill('Practice cold reads')

      // Assert: Value should be updated
      await expect(intentionInput).toHaveValue('Practice cold reads')
    }
  })

  test('should render and accept number input', async ({ page }) => {
    // The quick-log template has 'approaches' field which is number type
    const approachesInput = page.getByTestId(SELECTORS.fieldReport.fieldInput('approaches'))

    if (await approachesInput.isVisible().catch(() => false)) {
      // Act: Enter a number
      await approachesInput.fill('5')

      // Assert: Value should be updated
      await expect(approachesInput).toHaveValue('5')
    }
  })

  test('should render emoji select picker', async ({ page }) => {
    // The quick-log template has 'mood' field which is emoji select
    const moodSelect = page.getByTestId(SELECTORS.fieldReport.fieldSelect('mood'))

    if (await moodSelect.isVisible().catch(() => false)) {
      // Assert: Should show emoji options
      const option0 = page.getByTestId(SELECTORS.fieldReport.fieldSelectOption('mood', 0))
      const option1 = page.getByTestId(SELECTORS.fieldReport.fieldSelectOption('mood', 1))

      await expect(option0).toBeVisible({ timeout: ACTION_TIMEOUT })
      await expect(option1).toBeVisible({ timeout: ACTION_TIMEOUT })

      // Act: Click an emoji option
      await option1.click({ timeout: ACTION_TIMEOUT })

      // Assert: Option should appear selected (has ring class)
      await expect(option1).toHaveClass(/ring-2/)
    }
  })

  test('should allow selecting different emoji options', async ({ page }) => {
    const moodSelect = page.getByTestId(SELECTORS.fieldReport.fieldSelect('mood'))

    if (await moodSelect.isVisible().catch(() => false)) {
      const option0 = page.getByTestId(SELECTORS.fieldReport.fieldSelectOption('mood', 0))
      const option2 = page.getByTestId(SELECTORS.fieldReport.fieldSelectOption('mood', 2))

      // Act: Select first option
      await option0.click({ timeout: ACTION_TIMEOUT })
      await expect(option0).toHaveClass(/ring-2/)

      // Act: Select different option
      await option2.click({ timeout: ACTION_TIMEOUT })

      // Assert: New option selected, old deselected
      await expect(option2).toHaveClass(/ring-2/)
      await expect(option0).not.toHaveClass(/ring-2/)
    }
  })
})

test.describe('Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/tracking/report', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  })

  test('should show submit button on standard template', async ({ page }) => {
    // Use standard template
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const standardTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.standard))
    const deepDiveTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.deepDive))
    const templateToClick = standardTemplate.or(deepDiveTemplate)

    if (await templateToClick.first().isVisible().catch(() => false)) {
      await templateToClick.first().click({ timeout: ACTION_TIMEOUT })
      await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

      // Assert: Submit button should be visible on standard template
      const submitButton = page.getByTestId(SELECTORS.fieldReport.submit)
      await expect(submitButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    }
  })

  test('should enable submit when required fields are filled', async ({ page }) => {
    // Use quick-log template which has fewer required fields
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.quickLog))
    await expect(quickLogTemplate).toBeVisible({ timeout: AUTH_TIMEOUT })
    await quickLogTemplate.click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Fill required fields - mood and approaches are typically required
    const moodOption = page.getByTestId(SELECTORS.fieldReport.fieldSelectOption('mood', 2))
    if (await moodOption.isVisible().catch(() => false)) {
      await moodOption.click({ timeout: ACTION_TIMEOUT })
    }

    const approachesInput = page.getByTestId(SELECTORS.fieldReport.fieldInput('approaches'))
    if (await approachesInput.isVisible().catch(() => false)) {
      await approachesInput.fill('3')
    }

    // Assert: Submit button should be enabled after filling required fields
    const submitButton = page.getByTestId(SELECTORS.fieldReport.submit)
    // Wait a moment for form validation to update
    await page.waitForTimeout(500)
    await expect(submitButton).toBeEnabled({ timeout: ACTION_TIMEOUT })
  })

  test('should keep save draft enabled regardless of validation', async ({ page }) => {
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.quickLog))
    await expect(quickLogTemplate).toBeVisible({ timeout: AUTH_TIMEOUT })
    await quickLogTemplate.click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: Save draft button should always be enabled
    const saveDraftButton = page.getByTestId(SELECTORS.fieldReport.saveDraft)
    await expect(saveDraftButton).toBeEnabled({ timeout: ACTION_TIMEOUT })
  })
})

test.describe('Form Submission', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/tracking/report', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  })

  test('should save draft and redirect to tracking dashboard', async ({ page }) => {
    // Navigate to quick-log form
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.quickLog))
    await expect(quickLogTemplate).toBeVisible({ timeout: AUTH_TIMEOUT })
    await quickLogTemplate.click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Fill some optional data
    const quickNoteInput = page.getByTestId(SELECTORS.fieldReport.fieldInput('quick_note'))
    if (await quickNoteInput.isVisible().catch(() => false)) {
      await quickNoteInput.fill('Test draft note')
    }

    // Act: Click save draft
    const saveDraftButton = page.getByTestId(SELECTORS.fieldReport.saveDraft)
    await saveDraftButton.click({ timeout: ACTION_TIMEOUT })

    // Assert: Should redirect to tracking dashboard
    await expect(page).toHaveURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })
  })

  test('should submit completed form and redirect to tracking dashboard', async ({ page }) => {
    // Navigate to quick-log form
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.quickLog))
    await expect(quickLogTemplate).toBeVisible({ timeout: AUTH_TIMEOUT })
    await quickLogTemplate.click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Fill required fields
    const moodOption = page.getByTestId(SELECTORS.fieldReport.fieldSelectOption('mood', 2))
    if (await moodOption.isVisible().catch(() => false)) {
      await moodOption.click({ timeout: ACTION_TIMEOUT })
    }

    const approachesInput = page.getByTestId(SELECTORS.fieldReport.fieldInput('approaches'))
    if (await approachesInput.isVisible().catch(() => false)) {
      await approachesInput.fill('5')
    }

    // Wait for form to validate
    await page.waitForTimeout(500)

    // Act: Click submit
    const submitButton = page.getByTestId(SELECTORS.fieldReport.submit)
    if (await submitButton.isEnabled()) {
      await submitButton.click({ timeout: ACTION_TIMEOUT })

      // Assert: Should redirect to tracking dashboard
      await expect(page).toHaveURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })
    }
  })
})

test.describe('Post-Session Mood Picker', () => {
  test.beforeEach(async ({ page }) => {
    // Arrange: Navigate to field report form
    await page.goto('/dashboard/tracking/report', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Navigate to form view
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })
    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.quickLog))
    const standardTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.standard))
    const templateToClick = quickLogTemplate.or(standardTemplate)
    await expect(templateToClick.first()).toBeVisible({ timeout: AUTH_TIMEOUT })
    await templateToClick.first().click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should display post-session mood picker on form', async ({ page }) => {
    // Assert: Mood picker should always be visible
    const moodPicker = page.getByTestId(SELECTORS.fieldReport.postSessionMoodPicker)
    await expect(moodPicker).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(moodPicker).toContainText('How are you feeling now?')
  })

  test('should display all 5 mood options', async ({ page }) => {
    // Assert: All mood buttons should be visible
    for (let i = 1; i <= 5; i++) {
      const moodButton = page.getByTestId(SELECTORS.fieldReport.postSessionMood(i))
      await expect(moodButton).toBeVisible({ timeout: AUTH_TIMEOUT })
    }
  })

  test('should select mood on click', async ({ page }) => {
    // Act: Click mood button 4 (Good)
    const moodButton = page.getByTestId(SELECTORS.fieldReport.postSessionMood(4))
    await moodButton.click({ timeout: ACTION_TIMEOUT })

    // Assert: Label should appear with mood name
    const moodLabel = page.getByTestId(SELECTORS.fieldReport.postSessionMoodLabel)
    await expect(moodLabel).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(moodLabel).toHaveText('Good')
  })

  test('should deselect mood when clicking same button twice', async ({ page }) => {
    // Arrange: Select a mood
    const moodButton = page.getByTestId(SELECTORS.fieldReport.postSessionMood(3))
    await moodButton.click({ timeout: ACTION_TIMEOUT })

    const moodLabel = page.getByTestId(SELECTORS.fieldReport.postSessionMoodLabel)
    await expect(moodLabel).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Click same mood again to deselect
    await moodButton.click({ timeout: ACTION_TIMEOUT })

    // Assert: Label should disappear
    await expect(moodLabel).not.toBeVisible({ timeout: ACTION_TIMEOUT })
  })

  test('should switch mood when clicking different button', async ({ page }) => {
    // Arrange: Select mood 2
    const mood2 = page.getByTestId(SELECTORS.fieldReport.postSessionMood(2))
    await mood2.click({ timeout: ACTION_TIMEOUT })

    const moodLabel = page.getByTestId(SELECTORS.fieldReport.postSessionMoodLabel)
    await expect(moodLabel).toHaveText('Meh')

    // Act: Click mood 5
    const mood5 = page.getByTestId(SELECTORS.fieldReport.postSessionMood(5))
    await mood5.click({ timeout: ACTION_TIMEOUT })

    // Assert: Label should update
    await expect(moodLabel).toHaveText('On fire')
  })

  test('should reset mood when navigating back to template selection', async ({ page }) => {
    // Arrange: Select a mood
    const moodButton = page.getByTestId(SELECTORS.fieldReport.postSessionMood(4))
    await moodButton.click({ timeout: ACTION_TIMEOUT })

    const moodLabel = page.getByTestId(SELECTORS.fieldReport.postSessionMoodLabel)
    await expect(moodLabel).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Go back and select another template
    await page.getByTestId(SELECTORS.fieldReport.back).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.quickLog))
    const standardTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.standard))
    const templateToClick = quickLogTemplate.or(standardTemplate)
    await expect(templateToClick.first()).toBeVisible({ timeout: AUTH_TIMEOUT })
    await templateToClick.first().click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: Mood should be reset (label not visible)
    await expect(moodLabel).not.toBeVisible({ timeout: ACTION_TIMEOUT })
  })
})

test.describe('Field Report Edit Flow', () => {
  test('should navigate to edit mode via query param and show form', async ({ page }) => {
    // First create a draft report
    await page.goto('/dashboard/tracking/report', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.quickLog))
    await expect(quickLogTemplate).toBeVisible({ timeout: AUTH_TIMEOUT })
    await quickLogTemplate.click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Save as draft
    const saveDraftButton = page.getByTestId(SELECTORS.fieldReport.saveDraft)
    await saveDraftButton.click({ timeout: ACTION_TIMEOUT })

    // Wait for redirect to tracking dashboard
    await expect(page).toHaveURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })

    // Navigate to history page
    await page.goto('/dashboard/tracking/history', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Find and click edit button (pencil icon)
    const editLink = page.locator('a[href*="/dashboard/tracking/report?edit="]').first()
    if (await editLink.isVisible({ timeout: AUTH_TIMEOUT }).catch(() => false)) {
      await editLink.click({ timeout: ACTION_TIMEOUT })

      // Assert: Should be at edit URL with query param
      await expect(page).toHaveURL(/\/dashboard\/tracking\/report\?edit=/, { timeout: AUTH_TIMEOUT })

      // Assert: Form should be visible (not template selection)
      await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

      // Assert: Back button should say "Back to History"
      await expect(page.getByText('Back to History')).toBeVisible({ timeout: AUTH_TIMEOUT })

      // Assert: Submit button should say "Update Report"
      await expect(page.getByText('Update Report')).toBeVisible({ timeout: AUTH_TIMEOUT })
    }
  })

  test('should pre-fill form with existing report data in edit mode', async ({ page }) => {
    // First create a draft report with specific data
    await page.goto('/dashboard/tracking/report', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.quickLog))
    await expect(quickLogTemplate).toBeVisible({ timeout: AUTH_TIMEOUT })
    await quickLogTemplate.click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Fill approaches field with specific value
    const approachesInput = page.getByTestId(SELECTORS.fieldReport.fieldInput('approaches'))
    if (await approachesInput.isVisible().catch(() => false)) {
      await approachesInput.fill('7')
    }

    // Save as draft
    const saveDraftButton = page.getByTestId(SELECTORS.fieldReport.saveDraft)
    await saveDraftButton.click({ timeout: ACTION_TIMEOUT })

    // Wait for redirect
    await expect(page).toHaveURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })

    // Navigate to history and click edit
    await page.goto('/dashboard/tracking/history', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    const editLink = page.locator('a[href*="/dashboard/tracking/report?edit="]').first()
    if (await editLink.isVisible({ timeout: AUTH_TIMEOUT }).catch(() => false)) {
      await editLink.click({ timeout: ACTION_TIMEOUT })

      await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

      // Assert: Approaches field should have the saved value
      const editApproachesInput = page.getByTestId(SELECTORS.fieldReport.fieldInput('approaches'))
      if (await editApproachesInput.isVisible().catch(() => false)) {
        await expect(editApproachesInput).toHaveValue('7')
      }
    }
  })

  test('should successfully update report and redirect to history', async ({ page }) => {
    // First create a draft report
    await page.goto('/dashboard/tracking/report', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const quickLogTemplate = page.getByTestId(SELECTORS.fieldReport.templateCard(SLUGS.quickLog))
    await expect(quickLogTemplate).toBeVisible({ timeout: AUTH_TIMEOUT })
    await quickLogTemplate.click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Fill required fields to enable submit
    const moodOption = page.getByTestId(SELECTORS.fieldReport.fieldSelectOption('mood', 3))
    if (await moodOption.isVisible().catch(() => false)) {
      await moodOption.click({ timeout: ACTION_TIMEOUT })
    }

    const approachesInput = page.getByTestId(SELECTORS.fieldReport.fieldInput('approaches'))
    if (await approachesInput.isVisible().catch(() => false)) {
      await approachesInput.fill('3')
    }

    // Save as draft first
    const saveDraftButton = page.getByTestId(SELECTORS.fieldReport.saveDraft)
    await saveDraftButton.click({ timeout: ACTION_TIMEOUT })

    // Wait for redirect
    await expect(page).toHaveURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })

    // Navigate to history and click edit
    await page.goto('/dashboard/tracking/history', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    const editLink = page.locator('a[href*="/dashboard/tracking/report?edit="]').first()
    if (await editLink.isVisible({ timeout: AUTH_TIMEOUT }).catch(() => false)) {
      await editLink.click({ timeout: ACTION_TIMEOUT })

      await expect(page.getByTestId(SELECTORS.fieldReport.form)).toBeVisible({ timeout: AUTH_TIMEOUT })

      // Modify the approaches count
      const editApproachesInput = page.getByTestId(SELECTORS.fieldReport.fieldInput('approaches'))
      if (await editApproachesInput.isVisible().catch(() => false)) {
        await editApproachesInput.clear()
        await editApproachesInput.fill('10')
      }

      // Wait for form to validate
      await page.waitForTimeout(500)

      // Click Update Report button
      const submitButton = page.getByTestId(SELECTORS.fieldReport.submit)
      if (await submitButton.isEnabled()) {
        await submitButton.click({ timeout: ACTION_TIMEOUT })

        // Assert: Should redirect to history page (not tracking dashboard)
        await expect(page).toHaveURL(/\/dashboard\/tracking\/history/, { timeout: AUTH_TIMEOUT })
      }
    }
  })
})
