import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'

const AUTH_TIMEOUT = 15000

test.describe('Tracking History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/tracking/history', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  })

  test('history page loads with filter tabs', async ({ page }) => {
    await expect(page.getByTestId(SELECTORS.history.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // All three filter tabs should be visible
    await expect(page.getByTestId(SELECTORS.history.filterAll)).toBeVisible()
    await expect(page.getByTestId(SELECTORS.history.filterSubmitted)).toBeVisible()
    await expect(page.getByTestId(SELECTORS.history.filterDrafts)).toBeVisible()
  })

  test('filter tabs switch displayed reports', async ({ page }) => {
    await expect(page.getByTestId(SELECTORS.history.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Click Drafts filter
    await page.getByTestId(SELECTORS.history.filterDrafts).click()
    // The active filter should have primary styling — verify it changed
    await expect(page.getByTestId(SELECTORS.history.filterDrafts)).toHaveClass(/bg-primary/, { timeout: AUTH_TIMEOUT })

    // Click Submitted filter
    await page.getByTestId(SELECTORS.history.filterSubmitted).click()
    await expect(page.getByTestId(SELECTORS.history.filterSubmitted)).toHaveClass(/bg-primary/, { timeout: AUTH_TIMEOUT })

    // Click All filter to reset
    await page.getByTestId(SELECTORS.history.filterAll).click()
    await expect(page.getByTestId(SELECTORS.history.filterAll)).toHaveClass(/bg-primary/, { timeout: AUTH_TIMEOUT })
  })

  test('report cards are expandable', async ({ page }) => {
    await expect(page.getByTestId(SELECTORS.history.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Find first report card
    const firstCard = page.locator('[data-testid^="history-card-"]').first()
    const isCardVisible = await firstCard.isVisible().catch(() => false)

    if (!isCardVisible) {
      // No reports exist — empty state is shown, test passes vacuously
      await expect(page.getByText('No Field Reports Yet')).toBeVisible()
      return
    }

    // Get the card's testid to extract report ID
    const testId = await firstCard.getAttribute('data-testid')
    const reportId = testId!.replace('history-card-', '')

    // Click the expand toggle
    await page.getByTestId(SELECTORS.history.cardExpand(reportId)).click()

    // Expanded content should show "Report Fields" heading
    await expect(firstCard.getByText('Report Fields')).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Click again to collapse
    await page.getByTestId(SELECTORS.history.cardExpand(reportId)).click()
    await expect(firstCard.getByText('Report Fields')).not.toBeVisible()
  })

  test('load more pagination works', async ({ page }) => {
    await expect(page.getByTestId(SELECTORS.history.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Load more button only appears if there are more reports
    const loadMoreButton = page.getByTestId(SELECTORS.history.loadMore)
    const hasLoadMore = await loadMoreButton.isVisible().catch(() => false)

    if (!hasLoadMore) {
      // Not enough reports for pagination — test passes vacuously
      return
    }

    // Count current cards
    const initialCount = await page.locator('[data-testid^="history-card-"]').count()

    // Click load more
    await loadMoreButton.click()
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Should have more cards now
    const newCount = await page.locator('[data-testid^="history-card-"]').count()
    expect(newCount).toBeGreaterThan(initialCount)
  })

  test('delete report from history', async ({ page }) => {
    await expect(page.getByTestId(SELECTORS.history.page)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Find first report card
    const firstCard = page.locator('[data-testid^="history-card-"]').first()
    const isCardVisible = await firstCard.isVisible().catch(() => false)

    if (!isCardVisible) {
      // No reports — skip
      return
    }

    const testId = await firstCard.getAttribute('data-testid')
    const reportId = testId!.replace('history-card-', '')

    // Count cards before delete
    const countBefore = await page.locator('[data-testid^="history-card-"]').count()

    // Click delete — will trigger a confirm dialog
    page.on('dialog', (dialog) => dialog.accept())
    await page.getByTestId(SELECTORS.history.cardDelete(reportId)).click()

    // Wait for the card to disappear
    await expect(page.getByTestId(SELECTORS.history.card(reportId))).not.toBeVisible({ timeout: AUTH_TIMEOUT })

    // Count should be one less (or empty state shows)
    const countAfter = await page.locator('[data-testid^="history-card-"]').count()
    expect(countAfter).toBeLessThan(countBefore)
  })
})
