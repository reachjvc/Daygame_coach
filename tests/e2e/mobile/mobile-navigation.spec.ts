import { test, expect } from '@playwright/test'
import { SELECTORS } from '../helpers/selectors'

const AUTH_TIMEOUT = 15000

test.describe('Mobile Navigation', () => {
  test('hamburger menu hidden at desktop, visible at mobile viewport', async ({ page }) => {
    await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    // At mobile viewport (set by project config), hamburger should be visible
    const menuButton = page.getByRole('button', { name: 'Open menu' })
    await expect(menuButton).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Desktop nav links should be hidden at this viewport
    const settingsLink = page.getByTestId(SELECTORS.header.settingsLink)
    await expect(settingsLink).not.toBeVisible()
  })

  test('open hamburger shows nav items in dialog', async ({ page }) => {
    await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    const menuButton = page.getByRole('button', { name: 'Open menu' })
    await menuButton.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(dialog.getByText('Goals')).toBeVisible()
    await expect(dialog.getByText('Settings')).toBeVisible()
    await expect(dialog.getByText('Log Out')).toBeVisible()
  })

  test('click nav item navigates and closes menu', async ({ page }) => {
    await page.goto('/dashboard', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    const menuButton = page.getByRole('button', { name: 'Open menu' })
    await menuButton.click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Click Settings (scope to dialog to avoid strict mode violation with desktop nav)
    const menuDialog = page.getByRole('dialog')
    await menuDialog.getByTestId(SELECTORS.header.settingsLink).click()

    // Dialog should close, page should navigate
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page).toHaveURL(/\/dashboard\/settings/, { timeout: AUTH_TIMEOUT })
  })
})
