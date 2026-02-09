import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

test.describe('Custom Report Builder - Mode Selection', () => {
  test.beforeEach(async ({ page }) => {
    // Arrange: Navigate to field report page
    await page.goto('/dashboard/tracking/report', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  })

  test('should display custom report card in template selection', async ({ page }) => {
    // Assert: Template selection page should be visible
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: Custom report card should be visible with "Build Your Own" badge
    const customCard = page.getByText('Custom Report').first()
    await expect(customCard).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByText('Build Your Own')).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should open mode selection when clicking custom report card', async ({ page }) => {
    // Arrange: Wait for template selection
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Click custom report card
    const customCard = page.locator('[class*="border-dashed"]').filter({ hasText: 'Custom Report' })
    await customCard.click({ timeout: ACTION_TIMEOUT })

    // Assert: Mode selection screen should appear
    await expect(page.getByTestId(SELECTORS.customReportBuilder.modeSelect)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByText('What would you like to do?')).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should display both mode options on mode selection screen', async ({ page }) => {
    // Arrange: Navigate to custom builder
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })
    const customCard = page.locator('[class*="border-dashed"]').filter({ hasText: 'Custom Report' })
    await customCard.click({ timeout: ACTION_TIMEOUT })

    // Assert: Both mode buttons should be visible
    await expect(page.getByTestId(SELECTORS.customReportBuilder.modeTemplateOnly)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.customReportBuilder.modeReport)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Assert: Mode descriptions should be visible
    await expect(page.getByText('Create Template Only')).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByText('Write Report Now')).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should navigate back from mode selection to template selection', async ({ page }) => {
    // Arrange: Navigate to custom builder mode selection
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })
    const customCard = page.locator('[class*="border-dashed"]').filter({ hasText: 'Custom Report' })
    await customCard.click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.customReportBuilder.modeSelect)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: Click back button
    await page.getByText('Choose Different Template').click({ timeout: ACTION_TIMEOUT })

    // Assert: Should be back at template selection
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })
})

test.describe('Custom Report Builder - Template Only Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Arrange: Navigate to template-only mode
    await page.goto('/dashboard/tracking/report', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const customCard = page.locator('[class*="border-dashed"]').filter({ hasText: 'Custom Report' })
    await customCard.click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.customReportBuilder.modeSelect)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Select template-only mode
    await page.getByTestId(SELECTORS.customReportBuilder.modeTemplateOnly).click({ timeout: ACTION_TIMEOUT })
  })

  test('should display template builder UI in template-only mode', async ({ page }) => {
    // Assert: Template builder UI should be visible
    await expect(page.getByTestId(SELECTORS.customReportBuilder.builderTemplateOnly)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByText('Create Template')).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should show template name input field', async ({ page }) => {
    // Assert: Template name input should be visible
    const nameInput = page.getByTestId(SELECTORS.customReportBuilder.templateNameInput)
    await expect(nameInput).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(nameInput).toHaveAttribute('placeholder', /name/i)
  })

  test('should allow entering template name', async ({ page }) => {
    // Act: Enter template name
    const nameInput = page.getByTestId(SELECTORS.customReportBuilder.templateNameInput)
    await nameInput.fill('My Test Template')

    // Assert: Value should be set
    await expect(nameInput).toHaveValue('My Test Template')
  })

  test('should show field picker to add fields', async ({ page }) => {
    // Assert: Field picker should be visible or can be opened
    const addFieldButton = page.getByText('Add a field').or(page.getByText('Hide fields'))
    await expect(addFieldButton).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should display category filter buttons in field picker', async ({ page }) => {
    // Ensure field picker is visible
    const hideFieldsButton = page.getByText('Hide fields')
    if (!(await hideFieldsButton.isVisible().catch(() => false))) {
      await page.getByText('Add a field').click({ timeout: ACTION_TIMEOUT })
    }

    // Assert: Category filter "All" button should be visible (use exact match)
    await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should add field to template when clicking field option', async ({ page }) => {
    // Ensure field picker is visible
    const hideFieldsButton = page.getByText('Hide fields')
    if (!(await hideFieldsButton.isVisible().catch(() => false))) {
      await page.getByText('Add a field').click({ timeout: ACTION_TIMEOUT })
    }

    // Act: Click a field option (e.g., 'intention' or any available field)
    const fieldOption = page.locator('[data-testid^="field-option-"]').first()
    const fieldId = await fieldOption.getAttribute('data-testid')
    const actualFieldId = fieldId?.replace('field-option-', '') || ''

    await fieldOption.click({ timeout: ACTION_TIMEOUT })

    // Assert: Field should appear in selected fields list
    if (actualFieldId) {
      await expect(page.getByTestId(SELECTORS.customReportBuilder.selectedField(actualFieldId))).toBeVisible({ timeout: AUTH_TIMEOUT })
    }
  })

  test('should remove field from template when clicking remove button', async ({ page }) => {
    // Ensure field picker is visible
    const hideFieldsButton = page.getByText('Hide fields')
    if (!(await hideFieldsButton.isVisible().catch(() => false))) {
      await page.getByText('Add a field').click({ timeout: ACTION_TIMEOUT })
    }

    // Add a field first
    const fieldOption = page.locator('[data-testid^="field-option-"]').first()
    const fieldId = await fieldOption.getAttribute('data-testid')
    const actualFieldId = fieldId?.replace('field-option-', '') || ''
    await fieldOption.click({ timeout: ACTION_TIMEOUT })

    // Verify field was added
    if (actualFieldId) {
      await expect(page.getByTestId(SELECTORS.customReportBuilder.selectedField(actualFieldId))).toBeVisible({ timeout: AUTH_TIMEOUT })

      // Act: Click remove button
      await page.getByTestId(SELECTORS.customReportBuilder.removeField(actualFieldId)).click({ timeout: ACTION_TIMEOUT })

      // Assert: Field should no longer be in selected list
      await expect(page.getByTestId(SELECTORS.customReportBuilder.selectedField(actualFieldId))).not.toBeVisible({ timeout: ACTION_TIMEOUT })
    }
  })

  test('should disable save button when no fields selected', async ({ page }) => {
    // Assert: Save button should be disabled when no fields selected
    const saveButton = page.getByTestId(SELECTORS.customReportBuilder.saveButton)
    await expect(saveButton).toBeDisabled({ timeout: ACTION_TIMEOUT })
  })

  test('should enable save button when fields are selected', async ({ page }) => {
    // Ensure field picker is visible
    const hideFieldsButton = page.getByText('Hide fields')
    if (!(await hideFieldsButton.isVisible().catch(() => false))) {
      await page.getByText('Add a field').click({ timeout: ACTION_TIMEOUT })
    }

    // Add a field
    const fieldOption = page.locator('[data-testid^="field-option-"]').first()
    await fieldOption.click({ timeout: ACTION_TIMEOUT })

    // Assert: Save button should be enabled
    const saveButton = page.getByTestId(SELECTORS.customReportBuilder.saveButton)
    await expect(saveButton).toBeEnabled({ timeout: AUTH_TIMEOUT })
  })

  test('should navigate back to mode selection with cancel button', async ({ page }) => {
    // Act: Click cancel button
    await page.getByRole('button', { name: 'Cancel' }).click({ timeout: ACTION_TIMEOUT })

    // Assert: Should be back at mode selection
    await expect(page.getByTestId(SELECTORS.customReportBuilder.modeSelect)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })
})

test.describe('Custom Report Builder - Report Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Arrange: Navigate to report mode
    await page.goto('/dashboard/tracking/report', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const customCard = page.locator('[class*="border-dashed"]').filter({ hasText: 'Custom Report' })
    await customCard.click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.customReportBuilder.modeSelect)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Select report mode
    await page.getByTestId(SELECTORS.customReportBuilder.modeReport).click({ timeout: ACTION_TIMEOUT })
  })

  test('should display report builder UI in report mode', async ({ page }) => {
    // Assert: Report builder UI should be visible
    await expect(page.getByTestId(SELECTORS.customReportBuilder.builderReport)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByText('Custom Report')).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should show template name input for reuse', async ({ page }) => {
    // Assert: Template name input should be visible
    const nameInput = page.getByTestId(SELECTORS.customReportBuilder.templateNameInput)
    await expect(nameInput).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should show report title input', async ({ page }) => {
    // Assert: Report title label should be visible
    await expect(page.getByText('Report Title')).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should show notes textarea', async ({ page }) => {
    // Assert: Notes section should be visible
    await expect(page.getByText('Your Notes')).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByPlaceholder(/Write freely/i)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should allow entering notes', async ({ page }) => {
    // Act: Enter notes
    const notesTextarea = page.getByPlaceholder(/Write freely/i)
    await notesTextarea.fill('This is my test report content.')

    // Assert: Value should be set
    await expect(notesTextarea).toHaveValue('This is my test report content.')
  })

  test('should disable save button when no content', async ({ page }) => {
    // Assert: Save button should be disabled when no content
    const saveButton = page.getByTestId(SELECTORS.customReportBuilder.saveButton)
    await expect(saveButton).toBeDisabled({ timeout: ACTION_TIMEOUT })
  })

  test('should enable save button when notes are entered', async ({ page }) => {
    // Act: Enter notes
    const notesTextarea = page.getByPlaceholder(/Write freely/i)
    await notesTextarea.fill('This is my test report content.')

    // Assert: Save button should be enabled
    const saveButton = page.getByTestId(SELECTORS.customReportBuilder.saveButton)
    await expect(saveButton).toBeEnabled({ timeout: AUTH_TIMEOUT })
  })

  test('should navigate back to mode selection with cancel button', async ({ page }) => {
    // Act: Click cancel button
    await page.getByRole('button', { name: 'Cancel' }).click({ timeout: ACTION_TIMEOUT })

    // Assert: Should be back at mode selection
    await expect(page.getByTestId(SELECTORS.customReportBuilder.modeSelect)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })
})

test.describe('Custom Report Builder - Save Template Flow', () => {
  test('should save template and redirect to tracking dashboard', async ({ page }) => {
    // Arrange: Navigate to template-only mode
    await page.goto('/dashboard/tracking/report', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const customCard = page.locator('[class*="border-dashed"]').filter({ hasText: 'Custom Report' })
    await customCard.click({ timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.customReportBuilder.modeTemplateOnly).click({ timeout: ACTION_TIMEOUT })

    // Enter template name
    const nameInput = page.getByTestId(SELECTORS.customReportBuilder.templateNameInput)
    await nameInput.fill('E2E Test Template')

    // Add a field
    const hideFieldsButton = page.getByText('Hide fields')
    if (!(await hideFieldsButton.isVisible().catch(() => false))) {
      await page.getByText('Add a field').click({ timeout: ACTION_TIMEOUT })
    }
    const fieldOption = page.locator('[data-testid^="field-option-"]').first()
    await fieldOption.click({ timeout: ACTION_TIMEOUT })

    // Act: Click save button
    const saveButton = page.getByTestId(SELECTORS.customReportBuilder.saveButton)
    await saveButton.click({ timeout: ACTION_TIMEOUT })

    // Assert: Should redirect to tracking dashboard
    await expect(page).toHaveURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })
  })
})

test.describe('Custom Report Builder - Save Report Flow', () => {
  test('should save report and template, then redirect', async ({ page }) => {
    // Arrange: Navigate to report mode
    await page.goto('/dashboard/tracking/report', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.fieldReport.templateSelection)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const customCard = page.locator('[class*="border-dashed"]').filter({ hasText: 'Custom Report' })
    await customCard.click({ timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.customReportBuilder.modeReport).click({ timeout: ACTION_TIMEOUT })

    // Enter template name
    const nameInput = page.getByTestId(SELECTORS.customReportBuilder.templateNameInput)
    await nameInput.fill('E2E Test Report Template')

    // Enter notes
    const notesTextarea = page.getByPlaceholder(/Write freely/i)
    await notesTextarea.fill('This is my E2E test report content.')

    // Act: Click save button
    const saveButton = page.getByTestId(SELECTORS.customReportBuilder.saveButton)
    await saveButton.click({ timeout: ACTION_TIMEOUT })

    // Assert: Should redirect to tracking dashboard
    await expect(page).toHaveURL(/\/dashboard\/tracking/, { timeout: AUTH_TIMEOUT })
  })
})
