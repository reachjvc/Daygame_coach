import '@testing-library/jest-dom/vitest'
import { afterAll, vi } from 'vitest'

/**
 * WHAT JSDOM DOES NOT HAVE, AND EVERY RADIX COMPONENT ASSUMES.
 *
 * `ResizeObserver` is a browser API jsdom has never implemented. Radix's
 * Slider (and its Popover, Select and Tooltip, through `useSize`) measures its
 * own thumb with one on mount, so a test that renders any of them dies with
 * `ReferenceError: ResizeObserver is not defined` — a message that looks like a
 * broken import rather than a missing browser.
 *
 * The stub observes nothing, which is exactly right for a layout with no
 * layout: jsdom reports every element as 0×0 either way. It exists so the
 * component mounts and can be asserted on. What it CANNOT tell you is whether
 * the thing is the right size on a real screen — that is what the browser
 * suite's touch-target measurements are for.
 */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

/**
 * jsdom has no `Element.prototype.scrollIntoView` (real browsers all do). Code
 * that calls it on mount (timetrack `Segmented`) threw in a file that ran after
 * one which had stubbed and then removed its own copy. Defined once here, before
 * any file runs, as a no-op: a file that stubs it still can, nothing removes this.
 */
if (typeof Element !== 'undefined' && typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = function scrollIntoView() {}
}

/**
 * EVERY FILE HANDS THE NEXT ONE REAL CLOCKS, REAL GLOBALS AND UNSPIED MODULES.
 *
 * The `node` and `dom` projects run many files in one worker without a fresh
 * module cache or a fresh jsdom (vitest.config.ts). Whatever one file changes
 * on the shared globals, the next file in that worker would start with. This
 * undoes it after the file's last test and after the file's own `afterAll`
 * hooks, so nothing changes inside a file: a stub made in `beforeAll` or at the
 * top of the file still holds for all its tests. (The `unstubGlobals`-style
 * config options act before EACH test, which would undo exactly those.)
 *
 * What it undoes: fake timers and a set system time, `vi.stubGlobal`,
 * `vi.stubEnv`, `vi.spyOn`; and a global, a `navigator` or a `document`
 * property that the file replaced, removed or (on `navigator` and `document`)
 * added by plain assignment or `Object.defineProperty`. 2026-11-18: a push test
 * left `navigator.serviceWorker` defined as `undefined`, and the next Time Log
 * file in that worker crashed on `navigator.serviceWorker.ready`.
 *
 * What it keeps: globals ADDED to `globalThis`. Libraries put their own state
 * there once per worker when first imported (tslib helpers, Next's async
 * storages, undici), and a cached module is not imported again, so deleting
 * them would break the next file instead of protecting it.
 */
/** A property as the file found it; for a getter with a setter, also what the getter gave. */
type Before = Map<string, { desc: PropertyDescriptor | undefined; value?: unknown }>
const read = (target: object, key: string) => {
  try {
    return (target as Record<string, unknown>)[key]
  } catch {
    return undefined
  }
}
const own = (target: object): Before =>
  new Map(
    Object.getOwnPropertyNames(target).map((key) => {
      const desc = Object.getOwnPropertyDescriptor(target, key)
      return [key, desc?.get && desc.set ? { desc, value: read(target, key) } : { desc }]
    }),
  )
const same = (a: PropertyDescriptor | undefined, b: PropertyDescriptor | undefined) =>
  !!a && !!b && Object.is(a.value, b.value) && a.get === b.get && a.set === b.set
/**
 * Put back every property that was there at the start; with `dropAdded`, remove the ones that were not.
 *
 * jsdom's window keys on `globalThis` are a getter and a setter (vitest's
 * populateGlobal) over a store of their own: `window.matchMedia = fake` keeps
 * the descriptor and changes what the getter returns, and putting a deleted
 * getter back brings the fake back with it (2026-11-18: two calendar files
 * set a phone-sized `matchMedia` and deleted it after, and every later Time
 * Log file in that worker drew the phone layout). So a getter whose answer
 * changed is also set back through its own setter.
 */
function restore(target: object, before: Before, dropAdded: boolean) {
  for (const [key, { desc: original, value }] of before) {
    const now = Object.getOwnPropertyDescriptor(target, key)
    try {
      if (original && !same(now, original)) Object.defineProperty(target, key, original)
      if (original?.get && original.set && !Object.is(read(target, key), value)) {
        ;(target as Record<string, unknown>)[key] = value
      }
    } catch {
      // a property the environment made non-configurable cannot be swapped back, nor could a test have swapped it
    }
  }
  if (!dropAdded) return
  for (const key of Object.getOwnPropertyNames(target)) {
    // React marks a document it listens on; it is React's cache, not the test's
    if (before.has(key) || key.startsWith('_react')) continue
    try {
      Reflect.deleteProperty(target, key)
    } catch {
      // non-configurable: same as above
    }
  }
}
const shared: [object, Before, boolean][] = [[globalThis, own(globalThis), false]]
if (typeof navigator !== 'undefined') shared.push([navigator, own(navigator), true])
if (typeof document !== 'undefined') shared.push([document, own(document), true])

afterAll(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  for (const [target, before, dropAdded] of shared) restore(target, before, dropAdded)
})
