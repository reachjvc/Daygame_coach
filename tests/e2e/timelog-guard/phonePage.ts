/**
 * THE PHONE'S PAGE, MADE TO BEHAVE LIKE A PHONE PAGE THAT IS PUT AWAY.
 *
 * `phoneHooks` is added to every page of a phone context (`addInitScript`):
 * a clock that can jump, a visibility the test sets, and a freeze that holds
 * the page's timers and network answers until thaw. reopen.spec.ts says why
 * each is needed in Playwright's Chromium.
 */

/** Added to every page of the phone: hooks the matrix needs to make a Playwright page behave like a phone page that is put away */
export function phoneHooks() {
  const w = window as unknown as Record<string, unknown> & { __log: string[] }
  w.__log = []
  const RealDate = Date
  let skew = Number(sessionStorage.getItem('__skew') ?? 0)
  // a clock that can be moved: Date.now() and new Date() only; timers keep real time
  class SkewDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(RealDate.now() + skew)
      else super(...(args as [number]))
    }
    static now() {
      return RealDate.now() + skew
    }
  }
  ;(window as unknown as { Date: unknown }).Date = SkewDate
  w.__setSkew = (ms: number) => {
    skew = ms
    sessionStorage.setItem('__skew', String(ms))
  }

  // visibility that a test can set
  let shown: 'visible' | 'hidden' | null = null
  const real = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState')!
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => shown ?? real.get!.call(document) })
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => (shown ?? real.get!.call(document)) === 'hidden' })
  w.__setVisibility = (v: 'visible' | 'hidden') => {
    shown = v
    document.dispatchEvent(new Event('visibilitychange'))
  }

  // A frozen page runs nothing. One-shot timers and network answers wait and are handed over on thaw.
  // An interval loses the beats it missed and carries on at its own pace after thaw: a phone's timers
  // run on a clock that stands still while it sleeps, so the next beat is up to one period away.
  let frozen = false
  const held: (() => void)[] = []
  const original = {
    setTimeout: window.setTimeout.bind(window) as (fn: () => void, ms?: number) => number,
    setInterval: window.setInterval.bind(window) as (fn: () => void, ms?: number) => number,
  }
  ;(window as unknown as Record<string, unknown>).setTimeout = (fn: TimerHandler, ms?: number, ...a: unknown[]) => {
    if (typeof fn !== 'function') return original.setTimeout(fn as unknown as () => void, ms)
    return original.setTimeout(() => {
      if (!frozen) fn(...a)
      else held.push(() => fn(...a))
    }, ms)
  }
  ;(window as unknown as Record<string, unknown>).setInterval = (fn: TimerHandler, ms?: number, ...a: unknown[]) => {
    if (typeof fn !== 'function') return original.setInterval(fn as unknown as () => void, ms)
    return original.setInterval(() => {
      if (!frozen) fn(...a)
    }, ms)
  }
  const realFetch = window.fetch.bind(window)
  window.fetch = (...args) => {
    const answer = realFetch(...args)
    return new Promise((resolve, reject) => {
      const settle = (done: () => void) => (frozen ? held.push(done) : done())
      answer.then(
        (r) => settle(() => resolve(r)),
        (e) => settle(() => reject(e)),
      )
    })
  }
  w.__freeze = () => {
    frozen = true
    document.dispatchEvent(new Event('freeze'))
  }
  w.__thaw = () => {
    frozen = false
    document.dispatchEvent(new Event('resume'))
    for (const run of held.splice(0)) run()
  }

  document.addEventListener('freeze', () => w.__log.push('freeze'))
  document.addEventListener('resume', () => w.__log.push('resume'))
  document.addEventListener('visibilitychange', () => w.__log.push('visibility:' + document.visibilityState))
  window.addEventListener('pageshow', (e) => {
    w.__log.push('pageshow persisted=' + e.persisted)
    const k = '__pageshows'
    sessionStorage.setItem(k, JSON.stringify([...JSON.parse(sessionStorage.getItem(k) ?? '[]'), e.persisted]))
  })
  window.addEventListener('pagehide', (e) => w.__log.push('pagehide persisted=' + e.persisted))
}

/**
 * WRITES DOWN EVERY MOMENT THE PAGE SHOWS A GIVEN TIMER AS RUNNING.
 *
 * Added to a page with `addInitScript`; it does nothing until the test names
 * the timer (`window.__watchFor = 'Alpha'`). From then on it looks after every
 * change to the page and on every frame, and keeps one line per place the
 * timer was seen running: the phone's bar, a "Running:" row in the list, the
 * PC's timer bar, the header pill, the tab's title. `window.__seen` holds them.
 *
 * `window.__watchIdle = true` also writes down the moment the page offers
 * Start (nothing running), for a timer that IS still running on the account.
 */
export function runningWatch() {
  const w = window as unknown as { __watchFor?: string; __watchIdle?: boolean; __seen: string[]; __look: () => void }
  w.__seen = []
  const note = (what: string) => {
    if (!w.__seen.includes(what)) w.__seen.push(what)
  }
  const look = () => {
    const name = w.__watchFor
    if (!name) return
    const bar = document.querySelector('[data-testid="run-bar"]')
    if (bar?.querySelector('button[aria-label="Stop timer"]') && (bar.textContent ?? '').includes(name)) note('the phone bar')
    if (document.querySelector(`[aria-label^="Running: ${name},"]`)) note('a running row in the list')
    if (document.title.endsWith(` · ${name}`)) note(`the tab title "${document.title}"`)
    const pill = document.querySelector('button[aria-label="Stop the running timer"]')?.parentElement
    if ((pill?.textContent ?? '').includes(name)) note('the header pill')
    const main = document.querySelector('main')
    if (main?.querySelector('button[aria-label="Stop timer"]') && [...main.querySelectorAll('input')].some((i) => i.value === name)) {
      note('the PC timer bar')
    }
    if (w.__watchIdle && document.querySelector('button[aria-label="Start timer"]')) note('Start (nothing running)')
  }
  new MutationObserver(look).observe(document, { subtree: true, childList: true, characterData: true, attributes: true })
  const frame = () => {
    look()
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
  w.__look = look
}
