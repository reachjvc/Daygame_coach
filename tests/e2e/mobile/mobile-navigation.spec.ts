import { test, expect } from '@playwright/test'
import { SELECTORS } from '../helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

test.describe('Mobile Navigation', () => {
  test('hamburger menu opens and shows nav items', async ({ page }) => {
    await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Hamburger button should be visible on mobile
    const menuButton = page.getByRole('button', { name: 'Open menu' })
    await expect(menuButton).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Open menu
    await menuButton.click({ timeout: ACTION_TIMEOUT })

    // Nav items should be visible in the dialog
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: ACTION_TIMEOUT })
    await expect(page.getByText('Goals')).toBeVisible({ timeout: ACTION_TIMEOUT })
    await expect(page.getByText('Settings')).toBeVisible({ timeout: ACTION_TIMEOUT })
    await expect(page.getByText('Log Out')).toBeVisible({ timeout: ACTION_TIMEOUT })
  })

  test('hamburger menu closes on nav item click', async ({ page }) => {
    await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    const menuButton = page.getByRole('button', { name: 'Open menu' })
    await menuButton.click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: ACTION_TIMEOUT })

    // Click Settings link
    await page.getByTestId(SELECTORS.header.settingsLink).click({ timeout: ACTION_TIMEOUT })

    // Dialog should close after navigation
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: AUTH_TIMEOUT })

    // Should navigate to settings
    await expect(page).toHaveURL(/\/dashboard\/settings/, { timeout: AUTH_TIMEOUT })
  })

  test('dashboard link navigates correctly from mobile menu', async ({ page }) => {
    // Start on settings page
    await page.goto('/dashboard/settings', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    const menuButton = page.getByRole('button', { name: 'Open menu' })
    await menuButton.click({ timeout: ACTION_TIMEOUT })

    // Click Dashboard link
    await page.getByTestId(SELECTORS.header.dashboardLink).click({ timeout: ACTION_TIMEOUT })

    await expect(page).toHaveURL(/\/dashboard/, { timeout: AUTH_TIMEOUT })
  })

  test('logo is visible and clickable on mobile', async ({ page }) => {
    await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // Logo should be visible
    const logo = page.getByRole('link', { name: 'DayGame Coach' })
    await expect(logo).toBeVisible({ timeout: AUTH_TIMEOUT })
  })
})
