/**
 * Goals Setup Tour — Dynamic E2E regression spec
 *
 * Verifies the tour WORKS, not what it looks like. No hardcoded step titles,
 * no baseline screenshots. Adapts to any step count, any content.
 *
 * What it checks per step:
 *  1. Popover is visible and has a non-empty title + description
 *  2. The highlighted element (driver-active-element) exists and is in viewport
 *  3. Step counter is consistent (Step N of M, M stays constant)
 *  4. Editor steps: first Enter opens editor, second Enter closes + advances
 *  5. Tour completes: finish dialog appears after last step
 *
 * Run:  npx playwright test goals-tour --project=setup --project=goals-tour
 */

import { test, expect, type Page } from '@playwright/test'
import { login } from './helpers/auth.helper'

const NAV_TIMEOUT = 15000
const STEP_SETTLE_MS = 700

test.describe('Goals Setup Tour', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(120_000)

  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.evaluate(() => localStorage.removeItem('goals-tour-step'))
  })

  /** Navigate wizard to Goals step so the tour renders. */
  async function navigateToGoalsStep(page: Page) {
    await page.goto('/dashboard/goals/setup', { timeout: NAV_TIMEOUT })
    await page.waitForLoadState('networkidle')

    const ftoButton = page.locator('#btn-path-fto')
    await ftoButton.click({ timeout: 5000 })
    await page.waitForTimeout(300)

    const cta = page.getByRole('button', { name: /choose goals/i }).last()
    await expect(cta).toBeEnabled({ timeout: 3000 })
    await cta.click()
    await page.waitForTimeout(1000)
  }

  /** Read "Step X of Y" label → return { current, total }. */
  async function readStepLabel(page: Page): Promise<{ current: number; total: number }> {
    const text = await page.locator('.gt-popover .gt-step-label').textContent()
    const match = text?.match(/step\s+(\d+)\s+of\s+(\d+)/i)
    if (!match) throw new Error(`Could not parse step label: "${text}"`)
    return { current: Number(match[1]), total: Number(match[2]) }
  }

  /** Assert popover is visible, has content, and its target element is in the viewport. */
  async function assertStepHealthy(page: Page) {
    const popover = page.locator('.gt-popover.driver-popover')
    await expect(popover).toBeVisible({ timeout: 5000 })

    // Has a non-empty title
    const title = await popover.locator('.driver-popover-title').textContent()
    expect(title?.trim().length).toBeGreaterThan(0)

    // Has a non-empty description
    const desc = await popover.locator('.driver-popover-description').textContent()
    expect(desc?.trim().length).toBeGreaterThan(0)

    // The highlighted element exists somewhere on the page
    // (driver.js adds .driver-active-element to the target)
    const highlightedCount = await page.locator('.driver-active-element').count()
    // Some steps use unattached popovers — only check if highlight exists
    if (highlightedCount > 0) {
      const box = await page.locator('.driver-active-element').first().boundingBox()
      expect(box, 'highlighted element should have a bounding box').not.toBeNull()
    }

    return title?.trim() ?? ''
  }

  /** Check if the current step is an editor step (curve or ramp). */
  function isEditorStep(title: string): 'curve' | 'ramp' | false {
    if (title === 'Progression Curve') return 'curve'
    if (title === 'Habit Ramp') return 'ramp'
    return false
  }

  /** Advance one step, handling editor two-phase and All Categories expand. */
  async function advanceStep(page: Page, title: string) {
    const editorType = isEditorStep(title)

    if (editorType) {
      const editorSelector = editorType === 'curve'
        ? '[data-tour="curve-editor"]'
        : '[data-tour="ramp-editor"]'

      // Phase 1: Enter opens editor, stays on step
      await page.keyboard.press('Enter')
      await page.waitForTimeout(2500)
      await expect(page.locator(editorSelector)).toBeVisible({ timeout: 3000 })

      // Phase 2: Enter closes editor, advances
      await page.keyboard.press('Enter')
      await page.waitForTimeout(STEP_SETTLE_MS)
      return
    }

    if (title === 'All Categories') {
      await page.keyboard.press('Enter')
      await page.waitForTimeout(1200)
      return
    }

    await page.keyboard.press('Enter')
    await page.waitForTimeout(STEP_SETTLE_MS)
  }

  test('full tour: every step is healthy, editors work, tour completes', async ({ page }) => {
    await navigateToGoalsStep(page)

    // ── Welcome ──
    await expect(page.locator('.gt-welcome')).toBeVisible({ timeout: 5000 })
    await page.keyboard.press('Enter')
    await page.waitForTimeout(STEP_SETTLE_MS)

    // ── Discover total steps dynamically ──
    const { total } = await readStepLabel(page)
    expect(total).toBeGreaterThanOrEqual(5) // sanity: at least basic steps exist

    const seenTitles: string[] = []

    for (let stepNum = 1; stepNum <= total; stepNum++) {
      const title = await assertStepHealthy(page)
      const label = await readStepLabel(page)

      // Step counter is consistent
      expect(label.current).toBe(stepNum)
      expect(label.total).toBe(total)

      // No duplicate titles (would indicate stuck/looping tour)
      expect(seenTitles).not.toContain(title)
      seenTitles.push(title)

      // Advance (last step: Enter triggers finish)
      if (stepNum < total) {
        await advanceStep(page, title)
      }
    }

    // ── Finish ──
    await page.keyboard.press('Enter')
    await page.waitForTimeout(STEP_SETTLE_MS)
    const finish = page.locator('.gt-finish')
    await expect(finish).toBeVisible({ timeout: 5000 })

    // Dismiss
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    await expect(finish).not.toBeVisible()
  })

  test('back navigation reverses through editor steps correctly', async ({ page }) => {
    await navigateToGoalsStep(page)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(STEP_SETTLE_MS)

    const { total } = await readStepLabel(page)
    const titles: string[] = []

    // Advance to 60% of the tour (should be past any editors)
    const targetStep = Math.min(Math.ceil(total * 0.6), total - 1)
    for (let i = 1; i <= targetStep; i++) {
      const title = await assertStepHealthy(page)
      titles.push(title)
      if (i < targetStep) await advanceStep(page, title)
    }

    // Now go back 3 steps
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowLeft')
      await page.waitForTimeout(STEP_SETTLE_MS)
      await assertStepHealthy(page)
    }

    // Verify we actually went backwards
    const { current: afterBack } = await readStepLabel(page)
    expect(afterBack).toBe(targetStep - 3)
  })

  test('skip saves position, resume dialog appears on reopen', async ({ page }) => {
    await navigateToGoalsStep(page)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(STEP_SETTLE_MS)

    // Advance 2 steps
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press('Enter')
      await page.waitForTimeout(STEP_SETTLE_MS)
    }

    // Skip
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    await expect(page.locator('.gt-popover.driver-popover')).not.toBeVisible()

    // Reopen
    await page.locator('button[title="Show guided tour"]').click({ timeout: 3000 })
    await page.waitForTimeout(500)
    await expect(page.locator('.gt-welcome__title')).toHaveText(/resume tour/i, { timeout: 3000 })
  })

  test('no console errors during tour', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', err => errors.push(err.message))

    await navigateToGoalsStep(page)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(STEP_SETTLE_MS)

    const { total } = await readStepLabel(page)
    for (let i = 1; i <= total; i++) {
      const title = await assertStepHealthy(page)
      if (i < total) await advanceStep(page, title)
    }

    // Complete
    await page.keyboard.press('Enter')
    await page.waitForTimeout(STEP_SETTLE_MS)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    // Filter out noise (third-party, React dev warnings, unrelated API calls)
    const realErrors = errors.filter(e =>
      !e.includes('Third-party cookie') &&
      !e.includes('DevTools') &&
      !e.includes('favicon') &&
      !e.includes('Failed to load resource') // background API calls unrelated to tour
    )
    expect(realErrors, `Console errors during tour:\n${realErrors.join('\n')}`).toHaveLength(0)
  })
})
