/**
 * AUDIT A3: THE TIME LOG ON A PHONE WITH NO OR BAD SIGNAL.
 * Each test below is one thing a person would see. A test marked test.fail() is a bug found by this audit.
 */
import { devices, expect, type Browser, type BrowserContext, type Page, type Route } from '@playwright/test'
import { SIGNED_OUT, signIn, test } from '../fixtures/test'
import { pressLogOut } from '../helpers/logOut'
import { TRACKER, entryInList, savedToAccount, tapStop } from '../helpers/timetrack'
import { fixClock, type FixedClock } from './clock'
import { MORNING, Taps, accountEntries, openClean, startTimer, stopTimer } from './helpers'

const MINUTE = 60_000
const SYNC = '**/api/timetrack/sync*'

export type Net = 'online' | 'offline' | 'status503' | 'hang' | 'applyThenDrop' | 'applyThenHold'

export interface Phone {
  context: BrowserContext
  page: Page
  clock: FixedClock
  net: (mode: Net, drops?: number) => Promise<void>
  /** requests waiting while the net is 'hang' or 'applyThenHold' */
  release: () => void
  seen: { method: string; status: number | 'failed'; at: number }[]
  taps: Taps
}

/** A phone of the worker's account with the fake clock and a network the test can break in six ways */
export async function openPhone(browser: Browser, storageState: string, start = MORNING, share?: { clock: FixedClock }): Promise<Phone> {
  const context = await browser.newContext({
    ...devices['Pixel 7'],
    storageState,
    timezoneId: 'Europe/Copenhagen',
    baseURL: test.info().project.use.baseURL,
    serviceWorkers: 'block',
  })
  const clock = await fixClock(context, share ? share.clock.now().toISOString() : start)
  const page = await context.newPage()
  let mode: Net = 'online'
  let dropsLeft = Infinity
  let gate: Promise<void> = Promise.resolve()
  let open: () => void = () => {}
  const seen: Phone['seen'] = []
  const fakeDate = () => new Date(clock.now()).toUTCString()
  await context.route(SYNC, async (route: Route) => {
    const method = route.request().method()
    const note = (status: number | 'failed') => seen.push({ method, status, at: Date.now() })
    try {
      if (mode === 'online' || mode === 'offline') {
        return await route.fallback()
      }
      if (mode === 'status503') {
        note(503)
        return await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"down"}' })
      }
      if (mode === 'hang') {
        await gate
        return await route.fallback()
      }
      // the account takes the change, the answer does not arrive (or arrives late)
      const response = await route.fetch()
      if (mode === 'applyThenDrop' && method === 'POST' && dropsLeft <= 0) {
        note(response.status())
        return await route.fulfill({ response, headers: { ...response.headers(), date: fakeDate() } })
      }
      if (mode === 'applyThenDrop' || method === 'GET') {
        if (method === 'GET') {
          note(response.status())
          return await route.fulfill({ response, headers: { ...response.headers(), date: fakeDate() } })
        }
        dropsLeft--
        note('failed')
        return await route.abort('connectionreset')
      }
      await gate
      note(response.status())
      return await route.fulfill({ response, headers: { ...response.headers(), date: fakeDate() } })
    } catch (error) {
      if (!/closed|disposed|aborted|Target/i.test(String(error))) throw error
    }
  })
  const phone: Phone = {
    context,
    page,
    clock,
    seen,
    taps: new Taps(page),
    release: () => open(),
    async net(next, drops = Infinity) {
      mode = next
      dropsLeft = drops
      if (next === 'hang' || next === 'applyThenHold') {
        gate = new Promise<void>((resolve) => (open = resolve))
      } else {
        open()
      }
      await clock.setOffline(next === 'offline')
    },
  }
  return phone
}


/** Rename a finished entry on a phone: its sheet, the name, Done */
async function renameOnPhone(page: Page, from: string, to: string): Promise<void> {
  await entryInList(page, from).first().getByRole('button', { name: new RegExp(`^${from}`) }).click()
  const sheet = page.getByRole('dialog', { name: 'Time entry', exact: true })
  await sheet.getByPlaceholder('I’ve worked on…').fill(to)
  await sheet.getByRole('button', { name: 'Done' }).click()
  await expect(sheet).toBeHidden()
}

/** Delete a finished entry on a phone: its sheet, Delete time entry */
async function deleteOnPhone(page: Page, name: string): Promise<void> {
  await entryInList(page, name).first().getByRole('button', { name: new RegExp(`^${name}`) }).click()
  const sheet = page.getByRole('dialog', { name: 'Time entry', exact: true })
  await sheet.getByRole('button', { name: 'Delete time entry' }).click()
  await expect(sheet).toBeHidden()
}

const continueOnPhone = (page: Page, name: string) => entryInList(page, name).first().getByRole('button', { name: 'Continue this entry' }).click()

const summary = (entries: { description: string; stopped_at: string | null }[]) => entries.map((e) => `${e.description}${e.stopped_at === null ? ' (running)' : ''}`).sort()

/** The account's rows that a person would see: not deleted */
const live = (entries: Awaited<ReturnType<typeof accountEntries>>) => entries.filter((e) => e.deleted_at === null)

test.describe('the phone with no signal or a bad one', () => {
  test.setTimeout(120_000)

  test('start, stop, rename, continue and delete with no signal all reach the account once the signal is back', async ({ browser, account }) => {
    const phone = await openPhone(browser, account.storageState)
    const { page, clock } = phone
    try {
      await openClean(page)
      await clock.settle()
      await phone.net('offline')
      await startTimer(phone.taps, page, 'One')
      await clock.jump(10 * MINUTE)
      await stopTimer(phone.taps, page)
      await startTimer(phone.taps, page, 'Two')
      await clock.jump(5 * MINUTE)
      await stopTimer(phone.taps, page)
      await renameOnPhone(page, 'Two', 'Two renamed')
      await startTimer(phone.taps, page, 'Three')
      await clock.jump(MINUTE)
      await stopTimer(phone.taps, page)
      await deleteOnPhone(page, 'Three')
      await continueOnPhone(page, 'One')
      await clock.jump(5 * MINUTE)
      await tapStop(page)
      await phone.net('online')
      await savedToAccount(page, 40_000)
      expect(summary(live(await accountEntries(page, { withDeleted: true })))).toEqual(['One', 'One', 'Two renamed'])
    } finally {
      await phone.context.close()
    }
  })

  test('a stop the account took but did not answer, with the page reloaded meanwhile, is one stopped entry', async ({ browser, account }) => {
    const phone = await openPhone(browser, account.storageState)
    const { page, clock } = phone
    try {
      await openClean(page)
      await clock.settle()
      await startTimer(phone.taps, page, 'Fresh')
      await clock.jump(10 * MINUTE)
      await savedToAccount(page)
      await phone.net('applyThenHold')
      await stopTimer(phone.taps, page)
      await expect.poll(async () => (await accountEntries(page)).map((e) => e.stopped_at !== null)).toEqual([true])
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { name: 'Time Log', exact: true }).waitFor()
      await phone.net('online')
      phone.release()
      await savedToAccount(page, 40_000)
      expect(summary(await accountEntries(page)), 'one entry, stopped').toEqual(['Fresh'])
      await expect(page.getByTestId('run-bar').getByRole('button', { name: 'Stop timer' }), 'no timer running').toHaveCount(0)
    } finally {
      await phone.context.close()
    }
  })

  test('Log Out, reached after leaving the tracker with a stop that has not reached the account, asks before it throws it away', async ({ browser, throwawayAccount }) => {
    const context = await browser.newContext({ ...devices['Pixel 7'], storageState: SIGNED_OUT, baseURL: test.info().project.use.baseURL, serviceWorkers: 'block' })
    const page = await context.newPage()
    try {
      await signIn(page, throwawayAccount)
      await page.goto(TRACKER, { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { name: 'Time Log', exact: true }).waitFor()
      await savedToAccount(page, 60_000)
      await page.route(SYNC, (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
      const taps = new Taps(page)
      await startTimer(taps, page, 'Basement')
      await tapStop(page)
      await page.getByRole('link', { name: /Home/ }).click()
      await page.waitForURL(/\/dashboard$/)
      await pressLogOut(page)
      await expect(page.getByTestId('log-out-unsent'), 'Log Out must ask before it loses the entry').toBeVisible({ timeout: 20_000 })
      await page.getByTestId('log-out-stay').click()
      await page.unroute(SYNC)
      await page.goto(TRACKER, { waitUntil: 'domcontentloaded' })
      await savedToAccount(page, 60_000)
      expect(summary(await accountEntries(page)), 'the entry is on the account after the signal is back').toEqual(['Basement'])
    } finally {
      await context.close()
    }
  })

  /**
   * FINDINGS. The phone sends a change; the account takes it; the answer is lost (a request that timed out, a tunnel).
   * The phone then undoes the change by hand. It still sends the first one, so the account keeps what the person
   * took back, while the phone shows the undone state and says Saved.
   */
  test('a name changed and put back by hand after a lost answer is the name on the account', async ({ browser, account }) => {
    test.fail(true, 'BUG: a row put back after its send failed is dropped from the queue (useTimetrackSync takeBackWhatWasPutBack only resends what is still in the air), so the account keeps the first change')
    const phone = await openPhone(browser, account.storageState)
    const { page, clock } = phone
    try {
      await openClean(page)
      await clock.settle()
      await startTimer(phone.taps, page, 'Keep')
      await clock.jump(10 * MINUTE)
      await stopTimer(phone.taps, page)
      await savedToAccount(page)
      await phone.net('applyThenDrop', 1)
      await renameOnPhone(page, 'Keep', 'Changed')
      await expect.poll(async () => summary(await accountEntries(page))).toEqual(['Changed'])
      await renameOnPhone(page, 'Changed', 'Keep')
      await phone.net('online')
      await savedToAccount(page, 40_000)
      await expect(entryInList(page, 'Keep'), 'the phone shows the name the person put back').toHaveCount(1)
      await expect.poll(async () => summary(await accountEntries(page)), { message: 'the account must hold the name the phone shows', timeout: 10_000 }).toEqual(['Keep'])
    } finally {
      await phone.context.close()
    }
  })

  test('a timer the account took but did not answer, then deleted on the phone, does not come back as a running timer', async ({ browser, account }) => {
    test.fail(true, 'BUG: a new row deleted after its send failed is dropped from the queue as "never existed", so the account keeps it running (same cause as the rename above)')
    const phone = await openPhone(browser, account.storageState)
    const { page } = phone
    try {
      await openClean(page)
      await phone.clock.settle()
      await phone.net('applyThenDrop', 1)
      await startTimer(phone.taps, page, 'Ghost')
      await expect.poll(async () => summary(await accountEntries(page))).toEqual(['Ghost (running)'])
      await page.getByTestId('run-bar').getByRole('button', { name: 'Edit the running time entry' }).click()
      const sheet = page.getByRole('dialog', { name: 'Time entry', exact: true })
      await sheet.getByRole('button', { name: 'Delete time entry' }).click()
      await expect(sheet).toBeHidden()
      await phone.net('online')
      await savedToAccount(page, 40_000)
      await expect.poll(async () => summary(live(await accountEntries(page, { withDeleted: true }))), { message: 'no timer may run on the account: the person deleted it', timeout: 10_000 }).toEqual([])
      await page.reload({ waitUntil: 'domcontentloaded' })
      await savedToAccount(page, 40_000)
      await expect(page.getByTestId('run-bar').getByRole('button', { name: 'Stop timer' }), 'no timer after a reload').toHaveCount(0)
    } finally {
      await phone.context.close()
    }
  })

  test('the Undo after a delete stays while the account refuses the delete', async ({ browser, account }) => {
    test.fail(true, 'BUG: the red "Could not save" message replaces the Undo bar (PhoneTracker newestToast effect sets undo to null), so the Undo offered for 30 s goes in about a second')
    const phone = await openPhone(browser, account.storageState)
    const { page, clock } = phone
    try {
      await openClean(page)
      await clock.settle()
      await startTimer(phone.taps, page, 'Oops')
      await clock.jump(10 * MINUTE)
      await stopTimer(phone.taps, page)
      await savedToAccount(page)
      // the account answers "no" to everything, but only once the test lets it
      let letItAnswer: () => void = () => {}
      const held = new Promise<void>((resolve) => (letItAnswer = resolve))
      await page.route(SYNC, async (route) => {
        if (route.request().method() !== 'POST') return route.fallback()
        await held
        return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }).catch(() => {})
      })
      await deleteOnPhone(page, 'Oops')
      const undo = page.getByRole('button', { name: /Undo/ })
      await expect(undo, 'the Undo is offered right after the delete').toBeVisible()
      letItAnswer()
      await expect(page.getByText(/Could not save to your account/)).toBeVisible()
      await expect(undo, 'the Undo is still there after the account said no').toBeVisible()
    } finally {
      await phone.context.close()
    }
  })

  /** A second phone of the same account, its clock level with the first */
  async function withTwoPhones(browser: Browser, storageState: string, body: (a: Phone, b: Phone) => Promise<void>) {
    const a = await openPhone(browser, storageState)
    try {
      await openClean(a.page)
      await a.clock.settle()
      const b = await openPhone(browser, storageState, undefined, a)
      try {
        await b.page.goto(TRACKER, { waitUntil: 'domcontentloaded' })
        await b.page.getByRole('heading', { name: 'Time Log', exact: true }).waitFor()
        await savedToAccount(b.page, 60_000)
        await body(a, b)
      } finally {
        await b.context.close()
      }
    } finally {
      await a.context.close()
    }
  }

  test('a timer whose start the account took but did not answer, stopped on another phone, is not shown running after the first phone says Saved', async ({ browser, account }) => {
    test.fail(true, 'BUG: the phone that lost the answer says "Saved ... checked just now" while still drawing the timer the other phone stopped, for up to a minute (the retry settles the account but not the screen)')
    await withTwoPhones(browser, account.storageState, async (a, b) => {
      await a.net('applyThenDrop', 1)
      await startTimer(a.taps, a.page, 'Shared')
      await expect.poll(async () => (await accountEntries(b.page)).length).toBe(1)
      await a.clock.jump(5 * MINUTE)
      await b.clock.jump(5 * MINUTE)
      await b.page.reload({ waitUntil: 'domcontentloaded' })
      await b.page.getByRole('heading', { name: 'Time Log', exact: true }).waitFor()
      await savedToAccount(b.page, 60_000)
      await tapStop(b.page)
      await savedToAccount(b.page)
      await a.net('online')
      await savedToAccount(a.page, 60_000)
      expect((await accountEntries(a.page)).map((e) => e.stopped_at !== null), 'the account has the timer stopped').toEqual([true])
      await expect(a.page.getByTestId('run-bar').getByRole('button', { name: 'Stop timer' }), 'the first phone still runs a timer the account has stopped').toHaveCount(0, { timeout: 15_000 })
    })
  })

  test('work done behind a wifi login page (every sync answered 200 with a web page) is on the account once the real signal is back', async ({ browser, account }) => {
    const phone = await openPhone(browser, account.storageState)
    const { page, clock, context } = phone
    try {
      await openClean(page)
      await clock.settle()
      let portal = true
      let portalPosts = 0
      await context.route(SYNC, (route) => {
        if (!portal) return route.fallback()
        if (route.request().method() === 'POST') portalPosts++
        return route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>Welcome to the hotel wifi. Please log in.</body></html>' })
      })
      await startTimer(phone.taps, page, 'Hotel')
      await clock.jump(5 * MINUTE)
      await tapStop(page)
      await expect.poll(() => portalPosts, { message: 'the stop must have gone to the login page' }).toBeGreaterThan(0)
      portal = false
      await savedToAccount(page, 60_000)
      await expect.poll(async () => summary(await accountEntries(page)), { message: 'the entry must reach the account without the page being reopened', timeout: 30_000 }).toEqual(['Hotel'])
    } finally {
      await context.close()
    }
  })

  /**
   * A passing "slow down" or "request timed out" from the network (a rate limit, a gateway) is not the account
   * refusing the rows. The phone treats any 4xx like a refusal: it stops retrying and tells the person to reload.
   */
  for (const status of [429, 408] as const) {
    test(`one ${status} answer from the network does not leave the last change unsent until the next tap`, async ({ browser, account }) => {
      test.fail(true, 'BUG: any 4xx except 401/409 stops the automatic retry and says "refused ... Reload to resync" (useTimetrackSync push, response.status >= 400 && < 500), though 408 and 429 only mean try again; the stop stays "Not saved"')
      const phone = await openPhone(browser, account.storageState)
      const { page, clock, context } = phone
      try {
        await openClean(page)
        await clock.settle()
        let answered = 0
        let armed = false
        await context.route(SYNC, (route) => {
          if (route.request().method() === 'POST' && armed && answered === 0) {
            answered++
            return route.fulfill({ status, contentType: 'application/json', headers: { 'retry-after': '1' }, body: '{"error":"slow down"}' })
          }
          return route.fallback()
        })
        await startTimer(phone.taps, page, 'Busy')
        await savedToAccount(page)
        await clock.jump(5 * MINUTE)
        armed = true
        await tapStop(page)
        await expect.poll(() => answered, { message: 'the stop must have met the refusal' }).toBe(1)
        await expect.poll(async () => summary(await accountEntries(page)), { message: 'nothing was touched after the one refusal: the stop must still reach the account', timeout: 30_000 }).toEqual(['Busy'])
      } finally {
        await context.close()
      }
    })
  }
})
