/**
 * AUDIT A2: REOPEN AND BACKGROUND, the cases reopen.spec.ts and stories.spec.ts do not reach.
 *
 * Those two files ask "does the phone show what the account holds once the wake's
 * check has landed?". This one acts in the seconds BEFORE it lands: the owner takes
 * the phone out of his pocket and taps at once. While the page is checking, the
 * tracker holds a tap on Stop, Start or Continue (D2, afterCheck.ts) and runs it
 * when the check answers. What the person sees and can do in that window is
 * what is tested here.
 *
 * A test marked `test.fail` names a bug that is open: it asserts what the owner
 * should see and is expected to fail until the bug is fixed. When the fix lands the
 * suite goes red on purpose ("expected to fail, but passed"): delete the mark.
 *
 * The phone and the PC are two browser contexts of the worker's account. Both have
 * their own fixed clock (clock.ts), so "two hours later" is `clock.jump`. The
 * wake is a `visibilitychange` (hidden, then visible), and the check's answer is
 * held by the test, so "the instant the page comes back" lasts as long as it takes.
 */
import { test, expect } from '../fixtures/test'
import { devices, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { fixClock, type FixedClock } from './clock'
import { MORNING, Taps, accountEntries, openAgain, openClean, startTimer } from './helpers'
import { savedToAccount, timerButton } from '../helpers/timetrack'

interface Device {
  context: BrowserContext
  page: Page
  clock: FixedClock
}

async function openDevice(browser: Browser, storageState: string, kind: 'phone' | 'pc'): Promise<Device> {
  const context = await browser.newContext({
    ...(kind === 'phone' ? devices['Pixel 7'] : devices['Desktop Chrome']),
    storageState,
    timezoneId: 'Europe/Copenhagen',
    baseURL: test.info().project.use.baseURL,
    serviceWorkers: 'block',
  })
  const clock = await fixClock(context, MORNING)
  return { context, page: await context.newPage(), clock }
}

/** The page is put away, as a phone's is when the screen goes dark: the page sees `hidden` */
async function putAway(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

/** The page comes back: the page sees `visible`, which is the wake the tracker answers with "Checking…" */
async function comeBack(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

/** From now on the account's answer to a check is held until `release()`: the seconds just after waking, made as long as the test needs */
async function holdChecks(page: Page): Promise<() => void> {
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => (release = resolve))
  await page.route('**/api/timetrack/sync*', async (route) => {
    if (route.request().method() === 'GET') await gate
    await route.fallback()
  })
  return release
}

/** A phone with a timer running since 10:00, and a PC that has it open: the account holds both as they are */
async function phoneRunningAlpha(browser: Browser, storageState: string): Promise<{ phone: Device; pc: Device }> {
  const phone = await openDevice(browser, storageState, 'phone')
  const pc = await openDevice(browser, storageState, 'pc')
  await openClean(phone.page)
  await phone.clock.settle()
  await startTimer(new Taps(phone.page), phone.page, 'Alpha')
  await savedToAccount(phone.page)
  await openAgain(pc.page)
  await pc.clock.settle()
  return { phone, pc }
}

test.describe('actions in the seconds after the phone wakes', () => {
  test.setTimeout(120_000)
  // makes its own phone and PC; runs once, in the desktop project (as reopen.spec.ts does)
  test.skip(({ isMobile }) => isMobile, 'makes its own phone and PC; runs once, in timelog-guard-desktop')

  test.fail(
    'Undo on the "Stopped" message, tapped while the phone still checks, keeps the timer running (BUG: the held Stop runs anyway)',
    async ({ browser, account }) => {
      const { phone, pc } = await phoneRunningAlpha(browser, account.storageState)
      try {
        // two hours pass with the phone in a pocket; nothing else changed on the account
        await putAway(phone.page)
        await phone.clock.jump(120 * 60_000)
        const release = await holdChecks(phone.page)
        await comeBack(phone.page)

        // the instant it is back: Stop, and the message offers Undo
        await timerButton(phone.page, 'Stop timer').click()
        await phone.page.getByRole('button', { name: 'Undo', exact: true }).click()
        // the check answers now; wait until the phone says it has heard from the account (the held tap runs with that answer)
        release()
        await expect(phone.page.locator('header.sticky')).toContainText("checked for the other device's changes just now")

        // he undid the Stop, so the timer is still his: running on the screen, and it stays running on the account
        await expect(timerButton(phone.page, 'Stop timer'), 'the timer stopped although Undo was tapped').toBeVisible()
        const stoppedOnAccount = await expect
          .poll(async () => (await accountEntries(phone.page)).some((e) => e.description === 'Alpha' && e.stopped_at !== null), { timeout: 3_000, intervals: [300] })
          .toBe(true)
          .then(
            () => true,
            () => false,
          )
        expect(stoppedOnAccount, 'Alpha was stopped on the account although the Stop was undone').toBe(false)
      } finally {
        await phone.context.close()
        await pc.context.close()
      }
    },
  )

  test.fail(
    'a phone woken with no signal, still showing a timer the PC stopped, does not say just "Saved" (BUG: the phone badge shows the short word "Saved" beside an amber dot)',
    async ({ browser, account }) => {
      const { phone, pc } = await phoneRunningAlpha(browser, account.storageState)
      try {
        // the PC stops Alpha at 10:30 while the phone is away
        await pc.clock.jump(30 * 60_000)
        await timerButton(pc.page, 'Stop timer').click()
        await savedToAccount(pc.page)

        // two hours later the phone wakes where there is no signal
        await putAway(phone.page)
        await phone.clock.jump(120 * 60_000)
        await phone.clock.setOffline(true)
        await comeBack(phone.page)

        // the check cannot be answered (3 seconds), so the phone still shows the old, running Alpha
        const badge = phone.page.locator('header').getByRole('button', { name: /^Saved\./ })
        await expect(badge).toHaveAttribute('data-tone', 'amber', { timeout: 15_000 })
        await expect(timerButton(phone.page, 'Stop timer'), 'the old copy is on screen').toBeVisible()

        // what he can read on the phone must tell him that copy may be out of date, not only "Saved"
        await expect(badge, 'the visible words say only Saved over a copy that was not checked').toHaveText(/reach|out of date|not checked|offline/i)
      } finally {
        await phone.context.close()
        await pc.context.close()
      }
    },
  )
})
