/**
 * Standalone Playwright visual check for MilestoneCurveEditor controls.
 * This file is temporary and should be deleted after the check.
 */
import { test } from '@playwright/test'
import dotenv from 'dotenv'
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local', override: true })

const SS = 'tests/e2e/screenshots'

test.describe('MilestoneCurveEditor Visual Check', () => {
  test.setTimeout(120000)

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login', { timeout: 15000 })
    await page.getByTestId('login-email-input').fill('test-user-b@daygame-coach-test.local')
    await page.getByTestId('login-password-input').fill('TestUserB_SecurePass123!')
    await page.getByTestId('login-submit-button').click()
    await page.waitForURL(/\/(dashboard|redirect|preferences)/, { timeout: 15000 })
    await page.goto('/dashboard/goals', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
  })

  async function openCurveEditor(page: import('@playwright/test').Page) {
    const modal = page.getByTestId('goal-form-modal')
    await page.getByTestId('goals-new-goal-button').click({ timeout: 5000 })
    await page.waitForTimeout(500)
    await modal.getByRole('button', { name: /milestone/i }).click()
    await page.waitForTimeout(300)
    const targetInput = modal.locator('input[type="number"]').first()
    await targetInput.click({ clickCount: 3 })
    await targetInput.fill('1000')
    await page.waitForTimeout(300)
    await modal.getByRole('button', { name: /customize curve/i }).click()
    await page.waitForTimeout(500)
    // Scroll curve editor into view
    await modal.locator('.overflow-y-auto').evaluate(el => el.scrollTop = el.scrollHeight)
    await page.waitForTimeout(300)
    return modal
  }

  test('(a) default state - close-up of controls', async ({ page }) => {
    const modal = await openCurveEditor(page)

    // Screenshot the entire modal for context
    await modal.screenshot({ path: `${SS}/a1-modal-default.png` })

    // Scroll to see the controls area below the chart
    await modal.locator('.overflow-y-auto').evaluate(el => el.scrollTop = el.scrollHeight)
    await page.waitForTimeout(200)
    await modal.screenshot({ path: `${SS}/a2-modal-scrolled-controls.png` })

    // Check elements
    console.log(`"Curve shape" visible: ${await page.getByText('Curve shape').isVisible()}`)
    console.log(`"N milestones" visible: ${await page.locator('text=/\\d+ milestones/').first().isVisible()}`)
    for (const t of ['Linear', 'Front-loaded', 'Back-loaded', 'Slight front', 'Slight back']) {
      if (await page.locator(`text=${t}`).first().isVisible().catch(() => false))
        console.log(`Tension pill shows: "${t}"`)
    }
  })

  test('(b) tension slider positions', async ({ page }) => {
    await openCurveEditor(page)
    const modal = page.getByTestId('goal-form-modal')
    const slider = page.locator('[role="slider"]').first()
    await slider.scrollIntoViewIfNeeded()

    // Default is curveTension=2 (Front-loaded). Go far left first.
    await slider.focus()
    for (let i = 0; i < 42; i++) await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(200)
    await modal.screenshot({ path: `${SS}/b1-back-loaded.png` })

    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(200)
    await modal.screenshot({ path: `${SS}/b2-slight-back.png` })

    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(200)
    await modal.screenshot({ path: `${SS}/b3-linear.png` })

    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(200)
    await modal.screenshot({ path: `${SS}/b4-slight-front.png` })

    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(200)
    await modal.screenshot({ path: `${SS}/b5-front-loaded.png` })
  })

  test('(c) advanced controls', async ({ page }) => {
    await openCurveEditor(page)
    const modal = page.getByTestId('goal-form-modal')

    // Click Advanced
    const advBtn = page.getByRole('button', { name: /^Advanced$/i })
    await advBtn.scrollIntoViewIfNeeded()
    await advBtn.click()
    await page.waitForTimeout(300)
    await modal.locator('.overflow-y-auto').evaluate(el => el.scrollTop = el.scrollHeight)
    await page.waitForTimeout(200)
    await modal.screenshot({ path: `${SS}/c1-advanced-open.png` })

    // Add control point
    const addCpBtn = page.getByRole('button', { name: /control point/i })
    await addCpBtn.click()
    await page.waitForTimeout(300)
    await modal.locator('.overflow-y-auto').evaluate(el => el.scrollTop = el.scrollHeight)
    await page.waitForTimeout(200)
    await modal.screenshot({ path: `${SS}/c2-with-cp.png` })

    console.log(`"+ Control Point" visible: ${await addCpBtn.isVisible()}`)
    console.log(`"Remove CP1" visible: ${await page.getByRole('button', { name: /remove cp1/i }).isVisible()}`)
    console.log(`Helper text visible: ${await page.getByText('Drag points on the chart').isVisible()}`)
  })

  test('(d) range row close-up', async ({ page }) => {
    await openCurveEditor(page)
    const modal = page.getByTestId('goal-form-modal')

    // Scroll to bottom to see Range
    await modal.locator('.overflow-y-auto').evaluate(el => el.scrollTop = el.scrollHeight)
    await page.waitForTimeout(300)

    const rangeLabel = page.getByText('Range').first()
    console.log(`Range visible: ${await rangeLabel.isVisible()}`)

    // Take close-up of range row
    try {
      await rangeLabel.locator('..').screenshot({ path: `${SS}/d1-range-row-closeup.png` })
    } catch { console.log('Range row closeup failed') }

    await modal.screenshot({ path: `${SS}/d2-modal-with-range.png` })
  })

  test('(e) reset behavior', async ({ page }) => {
    await openCurveEditor(page)
    const modal = page.getByTestId('goal-form-modal')

    // First change tension to back-loaded so reset has visible effect
    const slider = page.locator('[role="slider"]').first()
    await slider.scrollIntoViewIfNeeded()
    await slider.focus()
    for (let i = 0; i < 42; i++) await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(200)

    // Click Advanced and add control point too
    const advBtn = page.getByRole('button', { name: /^Advanced$/i })
    await advBtn.scrollIntoViewIfNeeded()
    await advBtn.click()
    await page.waitForTimeout(200)
    const addCpBtn = page.getByRole('button', { name: /control point/i })
    if (await addCpBtn.isVisible()) await addCpBtn.click()
    await page.waitForTimeout(200)

    await modal.locator('.overflow-y-auto').evaluate(el => el.scrollTop = el.scrollHeight)
    await page.waitForTimeout(200)
    await modal.screenshot({ path: `${SS}/e1-before-reset.png` })

    // Now click Reset — scope to the curve editor area to avoid hitting other buttons
    // The Reset button is inside the curve editor, next to Advanced/Hide advanced
    const resetBtn = modal.getByRole('button', { name: 'Reset', exact: true })
    await resetBtn.scrollIntoViewIfNeeded()
    console.log(`Reset button visible: ${await resetBtn.isVisible()}`)
    await resetBtn.click()
    await page.waitForTimeout(300)

    // Verify modal is still open
    const modalStillOpen = await modal.isVisible()
    console.log(`Modal still open after reset: ${modalStillOpen}`)

    if (modalStillOpen) {
      await modal.locator('.overflow-y-auto').evaluate(el => el.scrollTop = el.scrollHeight)
      await page.waitForTimeout(200)
      await modal.screenshot({ path: `${SS}/e2-after-reset.png` })
    } else {
      await page.screenshot({ path: `${SS}/e2-MODAL-CLOSED-after-reset.png`, fullPage: true })
      console.log('WARNING: Modal closed after clicking Reset!')
    }
  })

  test('(f) milestone slider extremes via presets and SVG drag', async ({ page }) => {
    await openCurveEditor(page)
    const modal = page.getByTestId('goal-form-modal')

    // Quick Wins = 8 milestones
    const qw = page.getByRole('button', { name: /quick wins/i })
    await qw.scrollIntoViewIfNeeded()
    await qw.click()
    await page.waitForTimeout(300)
    await modal.screenshot({ path: `${SS}/f1-quick-wins-8ms.png` })

    // Ambitious = 3 milestones (back-loaded curve)
    const amb = page.getByRole('button', { name: /ambitious/i })
    await amb.click()
    await page.waitForTimeout(300)
    await modal.screenshot({ path: `${SS}/f2-ambitious-3ms.png` })

    // Balanced = 5 milestones
    const bal = page.getByRole('button', { name: /balanced/i })
    await bal.click()
    await page.waitForTimeout(300)
    await modal.screenshot({ path: `${SS}/f3-balanced-5ms.png` })

    // Now try SVG milestone slider drag
    // Find the SVG within the curve editor container
    const svgEl = modal.locator('svg').first()
    await svgEl.scrollIntoViewIfNeeded()
    const svgBox = await svgEl.boundingBox()

    if (svgBox) {
      const scaleX = svgBox.width / 280
      const scaleY = svgBox.height / 174
      const trackY = svgBox.y + 154 * scaleY
      const trackLeftX = svgBox.x + 44 * scaleX
      const trackRightX = svgBox.x + 268 * scaleX

      // Balanced = 5 milestones, handle at x_svg = 44 + ((5-2)/18)*224 = 44 + 37.3 = 81.3
      const currentX = svgBox.x + 81.3 * scaleX

      // Drag to 2 milestones (far left)
      await page.mouse.move(currentX, trackY)
      await page.mouse.down()
      await page.mouse.move(trackLeftX, trackY, { steps: 10 })
      await page.mouse.up()
      await page.waitForTimeout(300)

      const modalOpen1 = await modal.isVisible()
      console.log(`Modal open after drag to 2: ${modalOpen1}`)
      if (modalOpen1) {
        await modal.screenshot({ path: `${SS}/f4-2-milestones.png` })
        console.log('[f] 2 milestones screenshot taken')
      }

      // Drag to 20 milestones (far right)
      const svgBox2 = await svgEl.boundingBox()
      if (svgBox2) {
        const trackLeftX2 = svgBox2.x + 44 * (svgBox2.width / 280)
        const trackRightX2 = svgBox2.x + 268 * (svgBox2.width / 280)
        const trackY2 = svgBox2.y + 154 * (svgBox2.height / 174)

        await page.mouse.move(trackLeftX2, trackY2)
        await page.mouse.down()
        await page.mouse.move(trackRightX2, trackY2, { steps: 15 })
        await page.mouse.up()
        await page.waitForTimeout(300)

        const modalOpen2 = await modal.isVisible()
        console.log(`Modal open after drag to 20: ${modalOpen2}`)
        if (modalOpen2) {
          await modal.screenshot({ path: `${SS}/f5-20-milestones.png` })
          console.log('[f] 20 milestones screenshot taken')
        }
      }
    } else {
      console.log('WARNING: SVG not found')
    }
  })
})
