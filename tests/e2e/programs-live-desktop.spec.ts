/**
 * THE LIVE WORKOUT IN A WINDOW, WHICH NOTHING HAD EVER OPENED.
 *
 * Every spec on this screen begins `await page.setViewportSize(PHONE)` — 390 ×
 * 844 — and that is right, because a workout is logged on a phone. But it means
 * that on 2026-09-26 no test in this repository had ever pressed the ✓ on a
 * screen wider than 390px, and the ✓ did not work there:
 *
 *   `hover-delete-<label>` was `absolute right-1 top-1 hidden … sm:flex`, 44px,
 *   at the row's right edge — which is exactly where the ✓ is, because the ✓ is
 *   the last grid column and also 44px. `hidden sm:flex` means display:none on
 *   a phone and display:flex from 640px up, and `opacity-0` hides a thing from
 *   the eye and not from the pointer. So on every laptop, every tablet and
 *   every phone held sideways, the click landed on Delete.
 *
 * Found by opening the page in a 1280px window and pressing the button. The
 * only reason it is not in the suite is that the suite was measuring one width.
 *
 * TWO THINGS THIS FILE OWNS, both of them holes rather than features:
 *
 *   1. Nothing on this screen may cover a control. Not "the ✓ works" — the
 *      instance — but every interactive element, checked by asking the browser
 *      what is actually at its centre.
 *   2. `/programs/live` is excluded from the cold-open sweep by name ("its
 *      whole purpose is an open workout. A sweep that has to start one is not a
 *      read"), so the busiest screen in the app was the one screen no sweep
 *      watched for console and hydration errors. This one starts a workout, so
 *      it can.
 */

import { test, expect, type Page } from "@playwright/test"
import { cleanUp, resetAndEnroll, guardTrainingAccount } from "./helpers/training.helper"

test.describe.configure({ mode: "serial" })
guardTrainingAccount()

/** A window, not a phone. The whole point of the file. */
const LAPTOP = { width: 1280, height: 800 }
/** The narrowest width at which `sm:` applies — where the fault began. */
const SMALL_LAPTOP = { width: 640, height: 900 }

let startedAt = new Date().toISOString()

/**
 * HOW "EVERY CONTROL" IS ENUMERATED, written out, because the claim is only as
 * good as the list.
 *
 * `button` alone is what a previous sweep in this repo used, and it was blind
 * to every `select`, `input`, `a` and `[role=switch]` on the screen by
 * construction. These are the tags that take a click or a keystroke.
 */
const CONTROLS = "button, a[href], input, select, textarea, [role='switch'], [role='button']"

/**
 * Controls whose centre belongs to something else.
 *
 * Asked of the browser rather than computed from rectangles: overlap is decided
 * by stacking, transforms and pointer-events as well as position, and
 * `elementFromPoint` is the only thing that knows all four. A control counts as
 * reachable when the element at its centre is the control itself or something
 * inside it — an icon inside a button is the button.
 */
async function coveredControls(page: Page): Promise<string[]> {
  return page.evaluate((selector) => {
    const covered: string[] = []
    for (const el of Array.from(document.querySelectorAll(selector))) {
      const box = el.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) continue
      const style = getComputedStyle(el)
      if (style.visibility === "hidden" || style.display === "none") continue
      // Off screen is not covered; it is somewhere else.
      if (box.bottom < 0 || box.top > window.innerHeight) continue
      if (box.right < 0 || box.left > window.innerWidth) continue

      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
      if (hit && (hit === el || el.contains(hit))) continue

      /**
       * NAME THE CULPRIT, NOT ITS ICON.
       *
       * The first version printed "is covered by svg" for all fifteen ticks,
       * which says a thing is broken and nothing about what to change. What
       * covers a control is almost always an ancestor of whatever the point
       * lands on — a `<Trash2>` inside the delete button — so this walks up
       * until something has a name.
       */
      const name = (n: Element | null): string => {
        for (let e = n; e; e = e.parentElement) {
          const id = e.getAttribute("data-testid")
          const aria = e.getAttribute("aria-label")
          if (id) return `${e.tagName.toLowerCase()}[${id}]`
          if (aria) return `${e.tagName.toLowerCase()}("${aria}")`
        }
        return n ? n.tagName.toLowerCase() : "nothing"
      }
      covered.push(`${name(el)} (${el.getAttribute("aria-label") ?? ""}) is covered by ${name(hit)}`)
    }
    return covered
  }, CONTROLS)
}

async function startAWorkout(page: Page): Promise<void> {
  await page.goto("/programs")
  await resetAndEnroll(page)
  await page.reload()
  await page.getByTestId("start-workout").first().click()
  await page.waitForURL(/\/programs\/live/, { timeout: 30000 })
  await expect(page.getByTestId("tick-1").first()).toBeVisible({ timeout: 30000 })
}

test.describe("the live workout in a window", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180000)
    startedAt = new Date(Date.now() - 60_000).toISOString()
    await page.setViewportSize(LAPTOP)
  })

  test.afterEach(async ({ page }) => {
    await cleanUp(page, startedAt).catch(() => {})
  })

  test("the tick saves a set on a laptop, where it used to hit Delete instead", async ({ page }) => {
    await startAWorkout(page)

    const tick = page.getByTestId("tick-1").first()
    // A five-second click, not the default thirty: the failure this guards
    // against is the click never landing, and waiting half a minute for that
    // answer only makes a red run slower to read.
    await tick.click({ timeout: 5000 })

    await expect(tick).toHaveAttribute("aria-pressed", "true", { timeout: 20000 })

    /**
     * AND IN THE DATABASE. `aria-pressed` goes true the instant the ✓ is
     * tapped, before the request leaves — that is deliberate, you are standing
     * at a rack — so asserting it and then reading the server in the next line
     * asks the question before the answer exists. The first version of this
     * test did exactly that and failed on its own race.
     *
     * Polled, not slept: it waits for the set to arrive and no longer.
     */
    await expect
      .poll(
        async () =>
          page.evaluate(async () => {
            const live = (await (await fetch("/api/workouts/live")).json()) as {
              sets: unknown[]
            } | null
            return live?.sets.length ?? 0
          }),
        { timeout: 20000, message: "the click has to reach the server, not just the button" }
      )
      .toBe(1)
  })

  test("nothing on the live screen covers a control, at either width", async ({ page }) => {
    await startAWorkout(page)

    expect(await coveredControls(page), `at ${LAPTOP.width}px`).toEqual([])

    // 640px is where `sm:` begins, and where the fault began with it. A rule
    // checked at one width is a rule checked at one width.
    await page.setViewportSize(SMALL_LAPTOP)
    await expect(page.getByTestId("tick-1").first()).toBeVisible()
    expect(await coveredControls(page), `at ${SMALL_LAPTOP.width}px`).toEqual([])
  })

  test("hovering a row does not put the delete button over the tick", async ({ page }) => {
    await startAWorkout(page)

    // The hover state is the one a mouse is always in when it clicks, so a
    // control that is only covered on hover is a control that is always
    // covered in practice.
    await page.getByTestId("set-row-1").first().hover()
    await expect(page.getByTestId("hover-delete-1").first()).toBeVisible()
    expect(await coveredControls(page), "while the row is hovered").toEqual([])
  })

  test("opens cold with no console error and no hydration failure", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.split("\n")[0]}`))
    page.on("console", (m) => {
      if (m.type() !== "error") return
      const text = m.text()
      if (/Download the React DevTools|\[Fast Refresh\]/i.test(text)) return
      errors.push(`console: ${text.split("\n")[0]}`)
    })

    await startAWorkout(page)
    await page.getByTestId("tick-1").first().click({ timeout: 5000 })
    await expect(page.getByTestId("tick-1").first()).toHaveAttribute("aria-pressed", "true", {
      timeout: 20000,
    })

    /**
     * RELOAD WHILE THE REST CLOCK IS RUNNING, which is the state this screen is
     * built for — a phone locks itself mid-rest and the tab is reloaded when
     * you come back. It was also the state that broke it: the clock is restored
     * from `localStorage`, which the server cannot read, so the server rendered
     * no rest bar and the browser's first render rendered one, and React threw
     * the whole live screen away and rebuilt it.
     */
    await page.reload()
    await expect(page.getByTestId("tick-1").first()).toBeVisible({ timeout: 30000 })
    /**
     * WAIT FOR THE REST BAR, not for a number of milliseconds.
     *
     * It is the thing itself: the bar exists only because the mount effect read
     * the clock back out of `localStorage`, so seeing it proves React hydrated
     * AND that effect ran — which is the exact window a mismatch is thrown in.
     * A fixed sleep here would be a guess that passes on a fast machine.
     */
    await expect(page.getByTestId("rest-bar")).toBeVisible({ timeout: 20000 })
    await page.waitForLoadState("networkidle")

    expect(errors, "the busiest screen in the app, opened cold").toEqual([])
  })
})
