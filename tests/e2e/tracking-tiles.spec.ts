import { test, expect } from '@playwright/test'
import { SELECTORS } from './helpers/selectors'

const ACTION_TIMEOUT = 2000
const AUTH_TIMEOUT = 15000

const DEFAULT_LAYOUT = [
  'approaches_cumulative',
  'numbers_cumulative',
  'week_streak',
  'sessions_cumulative',
]

/** Write a layout straight through the API, so a test starts from a known row set. */
async function setLayout(page: import('@playwright/test').Page, metricIds: string[]) {
  const status = await page.evaluate(async (ids) => {
    const res = await fetch('/api/tracking/dashboard', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widgets: ids.map((m) => ({ widget_type: 'metric_tile', metric_id: m })) }),
    })
    return res.status
  }, metricIds)
  // Throws rather than skipping: a failed setup must fail the test, not hide it.
  expect(status, `failed to seed layout: HTTP ${status}`).toBe(200)
}

function tileIds(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-metric-id]')].map((el) => (el as HTMLElement).dataset.metricId)
  )
}

test.describe('Tracking dashboard tiles', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
    await setLayout(page, DEFAULT_LAYOUT)
    await page.reload({ timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
  })

  test.afterEach(async ({ page }) => {
    await setLayout(page, DEFAULT_LAYOUT)
  })

  test('shows the four default tiles under their original testids', async ({ page }) => {
    await expect(page.getByTestId(SELECTORS.trackingDashboard.totalApproaches)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.trackingDashboard.totalNumbers)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.trackingDashboard.weekStreak)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.trackingDashboard.totalSessions)).toBeVisible({ timeout: AUTH_TIMEOUT })
  })

  test('a tile added in the picker survives a reload', async ({ page }) => {
    // Act: open the manage dialog, add a metric from the catalogue.
    await page.getByTestId(SELECTORS.trackingDashboard.editTiles).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.trackingDashboard.tilesDialog)).toBeVisible({ timeout: AUTH_TIMEOUT })

    await page.getByTestId(SELECTORS.trackingDashboard.addTile).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.trackingDashboard.metricPicker)).toBeVisible({ timeout: AUTH_TIMEOUT })

    await page.getByTestId(SELECTORS.trackingDashboard.metricSearch).fill('Approaches this week')
    await page.getByTestId('metric-option-approaches_weekly').click({ timeout: ACTION_TIMEOUT })

    await page.getByTestId(SELECTORS.trackingDashboard.saveTiles).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.trackingDashboard.tilesDialog)).toBeHidden({ timeout: AUTH_TIMEOUT })

    // Assert: it is on the page, and still there after a reload.
    await expect(page.getByTestId('stat-tile-approaches_weekly')).toBeVisible({ timeout: AUTH_TIMEOUT })

    await page.reload({ timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })
    await expect(page.getByTestId('stat-tile-approaches_weekly')).toBeVisible({ timeout: AUTH_TIMEOUT })
    expect(await tileIds(page)).toEqual([...DEFAULT_LAYOUT, 'approaches_weekly'])
  })

  test('refuses to go below two tiles, and says so', async ({ page }) => {
    await page.getByTestId(SELECTORS.trackingDashboard.editTiles).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.trackingDashboard.tilesDialog)).toBeVisible({ timeout: AUTH_TIMEOUT })

    // Act: remove until the floor, then try once more.
    for (const id of DEFAULT_LAYOUT) {
      const button = page.getByTestId(`remove-tile-${id}`)
      if (await button.isVisible()) await button.click({ timeout: ACTION_TIMEOUT })
    }

    // Assert: two rows survive and the refusal is explained.
    await expect(page.getByTestId(SELECTORS.trackingDashboard.tilesError)).toBeVisible({ timeout: ACTION_TIMEOUT })
    await expect(page.locator('[data-testid^="tile-row-"]')).toHaveCount(2)
  })

  test('cancel discards an edit', async ({ page }) => {
    const before = await tileIds(page)

    await page.getByTestId(SELECTORS.trackingDashboard.editTiles).click({ timeout: ACTION_TIMEOUT })
    await expect(page.getByTestId(SELECTORS.trackingDashboard.tilesDialog)).toBeVisible({ timeout: AUTH_TIMEOUT })
    await page.getByTestId(`remove-tile-${DEFAULT_LAYOUT[0]}`).click({ timeout: ACTION_TIMEOUT })
    await page.getByTestId(SELECTORS.trackingDashboard.tilesDialog)
      .getByRole('button', { name: 'Cancel' })
      .click({ timeout: ACTION_TIMEOUT })

    expect(await tileIds(page)).toEqual(before)
  })

  test('a metric with no data shows an em dash, not a zero', async ({ page }) => {
    // body_weight_current has no health logs for the e2e user.
    await setLayout(page, [...DEFAULT_LAYOUT, 'body_weight_current'])
    await page.reload({ timeout: AUTH_TIMEOUT })
    await page.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

    const tile = page.getByTestId('stat-tile-body_weight_current')
    await expect(tile).toBeVisible({ timeout: AUTH_TIMEOUT })
    await expect(tile).toContainText('—')
    await expect(tile).not.toContainText('0 kg')
  })

  test('the API refuses a metric that does not exist', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/tracking/dashboard', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgets: [
            { widget_type: 'metric_tile', metric_id: 'deep_work_hours_daily' },
            { widget_type: 'metric_tile', metric_id: 'week_streak' },
          ],
        }),
      })
      return { status: res.status, body: await res.json() }
    })

    expect(result.status).toBe(400)
    expect(result.body.error).toContain('Unknown metric')
  })
})
