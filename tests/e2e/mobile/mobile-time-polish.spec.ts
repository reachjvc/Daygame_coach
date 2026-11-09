/**
 * TIME ON A PHONE, THE SMALL THINGS (alpha picky-eye-17, picky-eye-18, fast-time-03).
 *
 * - The header never cuts its own title while the sync badge has words to say
 *   ("Offline · 1 waiting"): the back word gives way whole, not as "Dashbo…".
 * - Reports never labels a bar with tracked time "0m".
 * - The entry sheet's start time, its two shortcuts and a row's ▶ are at least
 *   48px, the size Toggl's Android app uses (Material 48dp).
 */

import { type Locator, type Page } from '@playwright/test'
import { test, expect } from '../fixtures/test'
import { entryInList, openFreshTracker, trackEntry } from '../helpers/timetrack'

const tab = (page: Page, name: string) => page.getByRole('navigation').getByRole('button', { name, exact: true })

async function size(locator: Locator): Promise<{ width: number; height: number }> {
  await expect(locator).toBeVisible()
  const box = await locator.boundingBox()
  expect(box, 'not on screen').not.toBeNull()
  return { width: Math.round(box!.width), height: Math.round(box!.height) }
}

/** Text that is cut (an ellipsis) is wider than its box */
const isCut = (locator: Locator) => locator.evaluate((el) => el.scrollWidth > el.clientWidth)

test.describe('time on a phone: header, report labels and tap targets', () => {
  test('the title stays whole while the badge says something, and a few seconds is not "0m"', async ({ page, context }) => {
    await openFreshTracker(page)
    await context.setOffline(true)
    await trackEntry(page, 'a few seconds')
    const header = page.getByRole('banner')
    await expect(header.getByRole('button', { name: /^(Offline|Saving)/ })).toBeVisible({ timeout: 15_000 })

    await tab(page, 'Reports').dispatchEvent('click')
    const title = header.getByRole('heading', { level: 2 })
    await expect(title).toHaveText('Reports')
    expect(await isCut(title), 'the title "Reports" is cut').toBe(false)
    // The back word shows whole or not at all.
    const back = header.getByRole('link').first()
    const word = back.locator('span').nth(1)
    const wordBox = await word.boundingBox()
    const backBox = await back.boundingBox()
    if (wordBox && backBox && wordBox.y < backBox.y + backBox.height && wordBox.width > 0) {
      expect(await isCut(word), 'the back word is cut').toBe(false)
    }

    const byDay = page.getByRole('region', { name: 'By day' }).or(page.locator('section[aria-label="By day"]'))
    await expect(byDay).toContainText('<1m')
    await expect(byDay).not.toContainText(/(^|\s)0m/)
    await context.setOffline(false)
  })

  test('the entry sheet and the row ▶ are at least 48px tall', async ({ page }) => {
    await openFreshTracker(page)
    await trackEntry(page, 'measured')

    const row = entryInList(page, 'measured').first()
    const cont = row.getByRole('button', { name: 'Continue this entry' })
    const c = await size(cont)
    expect(c.height, `▶ is ${c.width}x${c.height}`).toBeGreaterThanOrEqual(48)
    expect(c.width, `▶ is ${c.width}x${c.height}`).toBeGreaterThanOrEqual(48)

    await page.locator('main li div[role="button"]').first().click()
    const sheet = page.getByRole('dialog', { name: 'Time entry' })
    for (const name of [/set to last stop time/i, /round stop time/i]) {
      const s = await size(sheet.getByRole('button', { name }))
      expect(s.height, `${name} is ${s.width}x${s.height}`).toBeGreaterThanOrEqual(48)
    }
    await sheet.getByRole('button', { name: /^Start: / }).click()
    const start = sheet.getByRole('textbox', { name: 'Start time' })
    await expect(start).toBeFocused()
    const s = await size(start)
    expect(s.height, `start time box is ${s.width}x${s.height}`).toBeGreaterThanOrEqual(48)
  })
})
