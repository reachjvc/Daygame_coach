import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'
import { login } from './helpers/auth.helper'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

test.describe('Articles Page', () => {
  test.beforeEach(async ({ page }) => {
    // Arrange: Login and navigate to articles
    await login(page)
    await page.goto('/dashboard/articles', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  })

  test('should display articles page', async ({ page }) => {
    // Assert: Articles page should be visible
    await expect(page.getByTestId(SELECTORS.articles.page)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should display header', async ({ page }) => {
    // Assert: Header should be visible with title
    await expect(page.getByTestId(SELECTORS.articles.header)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByRole('heading', { name: /knowledge library/i })).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should display content pillars section', async ({ page }) => {
    // Assert: Content pillars section should be visible
    await expect(page.getByTestId(SELECTORS.articles.contentPillars)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByRole('heading', { name: /content pillars/i })).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should display 4 pillar cards', async ({ page }) => {
    // Assert: Should have 4 pillar cards visible
    await expect(page.getByTestId(SELECTORS.articles.contentPillars)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Check that pillar cards exist (there should be 4 content pillars)
    const pillarSection = page.getByTestId(SELECTORS.articles.contentPillars)
    const cards = pillarSection.locator('[data-testid^="pillar-card-"]')
    await expect(cards).toHaveCount(4, { timeout: AUTH_TIMEOUT })
  })

  test('should display article types section', async ({ page }) => {
    // Assert: Article types section should be visible
    await expect(page.getByTestId(SELECTORS.articles.articleTypes)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByRole('heading', { name: /article types/i })).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('should display 3 article type cards', async ({ page }) => {
    // Assert: Should have 3 article type cards (ARTICLE_TIERS has 3 entries)
    await expect(page.getByTestId(SELECTORS.articles.articleTypes)).toBeVisible({ timeout: AUTH_TIMEOUT })

    const articleTypesSection = page.getByTestId(SELECTORS.articles.articleTypes)
    const cards = articleTypesSection.locator('[data-testid^="article-type-"]')
    await expect(cards).toHaveCount(3, { timeout: AUTH_TIMEOUT })
  })
})
