/**
 * WHAT THE PHONE SHOWS, AGAINST WHAT THE ACCOUNT HOLDS.
 *
 * The Time Log's promise on opening: whatever device last touched your time,
 * the phone shows the account's version of it. `expectPhoneMatchesServer`
 * checks that in words a person can read: the running bar, the list of
 * finished entries, no entry twice, and the badge saying Saved. When it
 * fails it prints both sides line by line.
 *
 * It reads the account through the same endpoint the page syncs with
 * (`GET /api/timetrack/sync`), from a request context of its own, so it never
 * depends on the phone page being alive.
 */
import { expect, type APIRequestContext, type Page, type TestInfo } from '@playwright/test'

/** The zone both browsers are opened in, so "HH:MM" means the same thing to the page and to this file */
export const ZONE = 'Europe/Copenhagen'

export interface ServerEntry {
  id: string
  description: string
  started_at: string
  stopped_at: string | null
}

/** Live entries on the account (not deleted) */
export async function readServer(api: APIRequestContext): Promise<ServerEntry[]> {
  const response = await api.get('/api/timetrack/sync')
  expect(response.status(), 'could not read the account').toBe(200)
  const body = (await response.json()) as {
    rows: { timetrack_entries: (ServerEntry & { deleted_at: string | null })[] }
  }
  return body.rows.timetrack_entries.filter((e) => e.deleted_at === null)
}

const clock = new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
/** "07:05", the way the phone writes a time of day (24-hour clock, the account's default) */
export const hhmm = (iso: string) => clock.format(new Date(iso))

export interface PhoneView {
  /** the bar at the bottom: null when it offers Start (idle) */
  bar: { description: string; since: string; clock: string } | null
  /** "Running: …" rows at the top of the list */
  runningRows: string[]
  /** the list's rows, top to bottom: first line of text, and the time range if it shows one */
  rows: { description: string; range: string | null }[]
  /** "Saved" when the badge says so, otherwise the header's words */
  badge: string
  /** the screen says "planned" somewhere: an entry the phone thinks starts in the future (`isPlanned`) is kept out of the list */
  saysPlanned: boolean
}

export async function readPhone(page: Page): Promise<PhoneView> {
  return page.evaluate(() => {
    const bar = document.querySelector('[data-testid="run-bar"]') as HTMLElement | null
    const stop = bar?.querySelector('button[aria-label="Stop timer"]')
    let shownBar: PhoneView['bar'] = null
    if (bar && stop) {
      const lines = (bar.querySelector('button[aria-label="Edit the running time entry"]') as HTMLElement | null)?.innerText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean) ?? []
      const since = lines.find((l) => l.startsWith('since '))
      const timeOfRow = lines.findIndex((l) => /^\d+:\d\d:\d\d$/.test(l))
      shownBar = {
        clock: lines[timeOfRow] ?? '?',
        description: lines[timeOfRow + 1] ?? '?',
        since: since ? since.slice(6) : '?',
      }
    }
    const runningRows = [...document.querySelectorAll('[aria-label^="Running: "]')].map((e) => e.getAttribute('aria-label') ?? '')
    const rows = [...document.querySelectorAll('ul.divide-y > li')]
      .filter((li) => li.parentElement?.closest('li') == null)
      .map((li) => {
        const text = (li as HTMLElement).innerText
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
        const range = text.match(/(\d\d:\d\d)\s*[–-]\s*(\d\d:\d\d|now)/)
        return { description: lines[0] ?? '', range: range ? `${range[1]}–${range[2]}` : null }
      })
    const headers = [...document.querySelectorAll('header')].map((h) => (h as HTMLElement).textContent ?? '').join(' | ')
    const badge = /Saved\./.test(headers) ? 'Saved' : headers.replace(/\s+/g, ' ').slice(0, 160)
    return { bar: shownBar, runningRows, rows, badge, saysPlanned: /planned/i.test(document.body.innerText) }
  })
}

/** Empty string when the phone shows what the account holds; otherwise the lines that differ */
export function diffPhoneVsServer(phone: PhoneView, server: ServerEntry[]): string {
  const lines: string[] = []
  const running = server.filter((e) => e.stopped_at === null)
  const done = server.filter((e) => e.stopped_at !== null)
  const runningText = running.map((e) => `${e.description} since ${hhmm(e.started_at)}`)

  const barText = phone.bar ? `${phone.bar.description} since ${phone.bar.since}` : 'idle (Start offered)'
  if (running.length > 1) lines.push(`server: ${running.length} timers running (${runningText.join('; ')})`)
  if (running.length === 0 && phone.bar) lines.push(`running bar: phone shows "${barText}", server has no timer running`)
  if (running.length > 0 && !phone.bar) lines.push(`running bar: phone is idle, server runs "${runningText[0]}"`)
  if (running.length > 0 && phone.bar && barText !== runningText[0]) {
    lines.push(`running bar: phone "${barText}", server "${runningText[0]}"`)
  }
  const shownRunning = phone.runningRows.length
  if (shownRunning !== running.length) {
    lines.push(`running rows in the list: phone ${shownRunning} (${phone.runningRows.join('; ') || 'none'}), server ${running.length}`)
  }

  const serverRows = done
    .map((e) => ({ description: e.description, range: `${hhmm(e.started_at)}–${hhmm(e.stopped_at!)}` }))
    .sort((a, b) => a.description.localeCompare(b.description))
  const phoneRows = [...phone.rows].sort((a, b) => a.description.localeCompare(b.description))
  const show = (r: { description: string; range: string | null }) => `${r.description} ${r.range ?? '(no times)'}`
  if (phoneRows.length !== serverRows.length) {
    lines.push(`list: phone has ${phoneRows.length} rows, server has ${serverRows.length}`)
  }
  const counts = new Map<string, number>()
  for (const r of phoneRows) counts.set(r.description, (counts.get(r.description) ?? 0) + 1)
  for (const [description, n] of counts) if (n > 1) lines.push(`list: "${description}" appears ${n} times on the phone`)
  const phoneSet = phoneRows.map(show)
  const serverSet = serverRows.map(show)
  const missing = serverSet.filter((s) => !phoneSet.includes(s))
  const extra = phoneSet.filter((s) => !serverSet.includes(s))
  for (const s of missing) lines.push(`list: server has "${s}", phone does not`)
  for (const s of extra) lines.push(`list: phone has "${s}", server does not`)

  if (phone.badge !== 'Saved') lines.push(`badge: phone says "${phone.badge}", expected Saved`)

  if (lines.length === 0) return ''
  return [
    ...lines,
    '--- phone ---',
    `bar: ${barText}`,
    ...phoneRows.map((r) => `row: ${show(r)}`),
    `badge: ${phone.badge}`,
    ...(phone.saysPlanned ? ['the screen says "planned": the phone thinks an entry starts after its own "now"'] : []),
    '--- server ---',
    ...runningText.map((t) => `running: ${t}`),
    ...serverRows.map((r) => `row: ${show(r)}`),
  ].join('\n')
}

/**
 * Within `within` ms the phone shows what the account holds, and keeps showing
 * it for `hold` ms more (a first match that flips back is still a wrong screen).
 * The account is read again on every look, since the phone may be sending a change.
 */
export async function expectPhoneMatchesServer(
  page: Page,
  api: APIRequestContext,
  options: { within?: number; hold?: number; info?: TestInfo } = {},
): Promise<void> {
  const { within = 5_000, hold = 1_500, info } = options
  let last = ''
  const began = Date.now()
  const timeline: string[] = []
  const look = async () => {
    const [phone, server] = await Promise.all([readPhone(page), readServer(api)])
    last = diffPhoneVsServer(phone, server)
    timeline.push(`+${Date.now() - began}ms ${last ? last.split('\n')[0] : 'matches'} [badge ${phone.badge.slice(-40)}]`)
    if (process.env.REOPEN_DEBUG) console.log('PHONE', JSON.stringify(phone), 'SERVER', JSON.stringify(server.map((e) => [e.description, e.started_at, e.stopped_at])))
    return last
  }
  try {
    await expect
      .poll(look, { timeout: within, intervals: [100, 200, 300, 500], message: `the phone does not show the account's time within ${within} ms` })
      .toBe('')
  } catch (error) {
    if (process.env.REOPEN_DEBUG) {
      // how long the wrong screen lasts: keep looking after the deadline
      await expect.poll(look, { timeout: 30_000, intervals: [250] }).toBe('').catch(() => undefined)
      console.log('TIMELINE\n' + timeline.filter((_, i, all) => i === 0 || all[i].slice(all[i].indexOf(' ')) !== all[i - 1].slice(all[i - 1].indexOf(' '))).join('\n'))
    }
    throw error
  } finally {
    if (last && info) await info.attach('phone-vs-server.txt', { body: last, contentType: 'text/plain' })
  }
  const until = Date.now() + hold
  while (Date.now() < until) {
    const diff = await look()
    expect(diff, `the phone showed the account's time, then stopped showing it within ${hold} ms`).toBe('')
    await page.waitForTimeout(300)
  }
}
