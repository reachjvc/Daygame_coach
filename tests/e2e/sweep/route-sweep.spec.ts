/**
 * EVERY PAGE, ON EVERY DEVICE, CHECKED FOR THE BORING UNIVERSALS.
 *
 * The failure this prevents, measured 2026-09-07: of 38 Playwright projects, 37
 * named the spec files they run one by one, and every page any browser test
 * opened was there because a person had typed its address. Across 28 real pages
 * that left 6 never opened by a browser at all and 4 more opened only in Desktop
 * Chrome. The whole signup flow was never opened on a phone by anything — so a
 * 700px scrolling box inside a 664px screen, 1.4MB of photos on one step, and
 * country shapes 9px wide were all invisible. Not one test failed. No test
 * looked.
 *
 * The route list here is DERIVED from `app/` (tests/support/appRoutes.ts), so a
 * new page is swept the day it exists and nobody has to remember it. The
 * projects `sweep-desktop`, `sweep-phone` and `sweep-webkit` run this file, so
 * every page is seen at two sizes and on two engines.
 *
 * A DEV-SERVER CAVEAT, RECORDED SO NOBODY CHASES IT TWICE. Under `npm run dev`
 * with all three sweep projects running at once, Tailwind's on-demand CSS can be
 * a step behind, and a freshly-added utility class is in the HTML with no rule
 * behind it — so the tap-target rule reports a 44px control as 40px. Verified on
 * 2026-09-08 by building for production and reading the generated stylesheet:
 * `.min-h-11{min-height:calc(var(--spacing)*11)}` is present and correct, and
 * the same test passes when run on its own. CI runs `npm run build && npm start`,
 * where this cannot happen. If a tap-target failure appears only in a full local
 * sweep, re-run that one route before believing it.
 *
 * WHAT IT DELIBERATELY DOES NOT DO: judge whether a page is correct. It checks
 * the things that are wrong on any page, in any product — an internal value on
 * screen, a page that draws nothing, sideways scrolling, a scroll box taller
 * than the screen, a tap target too small for a thumb, a page too heavy for
 * mobile data. Everything else needs a test that knows what the page is for.
 */

import { test, expect, type Page } from "@playwright/test"
import { staticRoutes } from "../../support/appRoutes"
// The two debt maps live in tests/support/ so `npm test` can hold them to their
// own rule without starting a browser. See tests/unit/navigation/sweepDebt.test.ts.
import { KNOWN_DEBT, TAP_TARGET_DEBT } from "../../support/sweepDebt"

const NAV_TIMEOUT = 30_000

/** Apple's minimum, and the number the design rules in this repo already use. */
const MIN_TAP_TARGET_PX = 44

/**
 * Page weight budget, in bytes, for everything the page pulls down.
 *
 * Deliberately generous to start: this is a ceiling that catches "somebody
 * shipped a folder of photographs", not a performance target. Onboarding step 3
 * measured 1.4MB of archetype JPEGs alone.
 */
const BYTE_BUDGET = 3_000_000

const ROUTES = staticRoutes().map((r) => r.route)

async function settle(page: Page) {
  await page.waitForLoadState("load")
  try {
    await page.waitForFunction(
      () =>
        document.querySelectorAll("h1,h2,h3").length > 0 ||
        document.body.innerText.trim().split(/\s+/).length > 12,
      undefined,
      { timeout: 8000 },
    )
  } catch {
    // Genuinely empty. The assertions below report it.
  }
}

interface Violation {
  route: string
  rule: string
  detail: string
}

function report(violations: Violation[], rule: string) {
  const real = violations.filter((v) => !(KNOWN_DEBT[v.route] ?? []).includes(v.rule))
  return {
    real,
    message:
      `${rule}:\n` +
      real.map((v) => `  ${v.route.padEnd(34)} ${v.detail}`).join("\n") +
      `\n\nFix the page, or add the route to KNOWN_DEBT in tests/support/sweepDebt.ts with a reason.`,
  }
}

test.describe("every page", () => {
  /**
   * One test per route, one visit per route, every rule checked on that visit.
   *
   * The first version ran one test per RULE, looping all 27 routes inside each
   * -- four visits per page, 108 navigations in four tests, and every one of
   * them timed out at 60s against a dev server that compiles on demand. Per
   * route is also better reporting: a failure names the page in the test title
   * instead of hiding in a list.
   */
  for (const route of ROUTES) {
    test(`${route} holds up`, async ({ page }) => {
      const violations: Violation[] = []

      await page.goto(route, { timeout: NAV_TIMEOUT })
      await settle(page)

      /**
       * THE PAGE THAT ACTUALLY DREW, which is not always the one asked for.
       *
       * Some routes are redirects. `/dashboard/goals/plan` has been one since
       * 2026-09-09 and lands on `/life-mastery`, so this sweep measured Life
       * Mastery's controls and then looked the budget up under the key it
       * STARTED from — finding nothing, defaulting to zero, and reporting 106
       * undersized targets on a page that draws none of them.
       *
       * Keying on where it landed is the fix rather than giving the redirect
       * its own copy of the number: two entries for one page's debt drift the
       * moment either is lowered, and the one nobody is looking at is the one
       * that goes stale. A budget belongs to the page that draws the controls.
       */
      const drawn = new URL(page.url()).pathname

      const text = await page.evaluate(() => document.body.innerText)
      const words = text.trim().split(/\s+/).filter(Boolean).length
      if (words < 5) {
        violations.push({ route, rule: "renders", detail: `only ${words} words on screen` })
      }
      for (const pattern of [/\bNaN\b/, /\bundefined\b/, /\[object Object\]/]) {
        if (pattern.test(text)) {
          const line = text.split("\n").find((l) => pattern.test(l))?.trim().slice(0, 70)
          violations.push({ route, rule: "no-internal-values", detail: `shows "${line}"` })
        }
      }

      const over = await page.evaluate(() => {
        const d = document.documentElement
        return d.scrollWidth > d.clientWidth + 1 ? { w: d.scrollWidth, c: d.clientWidth } : null
      })
      if (over) {
        violations.push({
          route,
          rule: "no-horizontal-overflow",
          detail: `${over.w}px of content in a ${over.c}px window`,
        })
      }

      // The onboarding archetype step was a 700px scroller holding 6134px of
      // cards inside a 664px phone screen. You cannot see where such a box ends,
      // so a swipe over it scrolls the box and a swipe beside it scrolls the
      // page -- which reads as "the page is stuck".
      const trap = await page.evaluate(() => {
        const vh = window.innerHeight
        for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
          if (el === document.body || el === document.documentElement) continue
          if (!/auto|scroll/.test(getComputedStyle(el).overflowY)) continue
          const box = el.getBoundingClientRect()
          if (box.height > vh && el.scrollHeight > el.clientHeight + 4) {
            return {
              h: Math.round(box.height),
              vh,
              inner: el.scrollHeight,
              cls: String(el.className).slice(0, 50),
            }
          }
        }
        return null
      })
      if (trap) {
        violations.push({
          route,
          rule: "no-scroll-trap",
          detail: `${trap.h}px scrolling box (holding ${trap.inner}px) in a ${trap.vh}px screen — ${trap.cls}`,
        })
      }

      // Tap targets, on a touch screen only. The onboarding map had 236 country
      // shapes of which 233 were under 44px and 159 under 10x10 -- Poland was
      // 8.9x8.4. Only counts things a person can actually press: visible, on
      // screen, and not a link inside a run of prose (where the line height, not
      // the link, is what you aim at).
      if (test.info().project.name === "sweep-phone") {
        const measureSmallTargets = () =>
          page.evaluate((min) => {
          const out: string[] = []
          const sel = "button, a[href], [role=button], input:not([type=hidden]), select"
          for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
            const box = el.getBoundingClientRect()
            if (box.width === 0 || box.height === 0) continue
            if (getComputedStyle(el).visibility === "hidden") continue
            // Inline links inside a paragraph are aimed at by their line, not
            // their box; holding them to 44px would mean padding prose.
            const inProse = el.tagName === "A" && /P|LI|SPAN/.test(el.parentElement?.tagName ?? "")
            if (inProse) continue
            // ROUNDED, BECAUSE A LAYOUT ENGINE DOES NOT RETURN WHOLE PIXELS.
            //
            // `min-h-11` IS 44px, and `getBoundingClientRect` returns it as
            // 43.99993896484375 when the element happens to land on a different
            // sub-pixel offset — measured in the training suite on 2026-09-23,
            // where the same class passed on one account and failed on another
            // purely because the content above it was a different height.
            //
            // Every control on the three quit-vice routes now sits at EXACTLY
            // 44 with their debt entries deleted, so those pages have no
            // headroom at all: without this, any content change anywhere above
            // a button turns a passing route red over six hundred-thousandths
            // of a pixel. A genuinely 43px control still fails, which is the
            // rule this is protecting rather than relaxing.
            if (Math.round(box.width) < min || Math.round(box.height) < min) {
              out.push(
                `${el.tagName.toLowerCase()}"${(el.textContent ?? "").trim().slice(0, 20)}" ` +
                  `${Math.round(box.width)}x${Math.round(box.height)}`,
              )
            }
          }
            return out
          }, MIN_TAP_TARGET_PX)

        // MEASURE TWICE WHEN THE FIRST MEASUREMENT DISAGREES WITH THE BUDGET.
        //
        // Not leniency -- an artifact of the dev server. Under `npm run dev`
        // with the sweeps running in parallel, Tailwind generates CSS on
        // demand, and a utility used on only ONE page can be missing from the
        // stylesheet that page is served. `/preferences` is the only user of
        // `min-h-11`, so it is the one that loses: measured 40px when the rule
        // is 44px, ~40% of full runs, while passing 3/3 in isolation. The rule
        // IS in the production build -- verified 2026-09-08 by reading the
        // generated stylesheet: `.min-h-11{min-height:calc(var(--spacing)*11)}`.
        //
        // A reload gets the complete stylesheet. Reporting only when both
        // measurements agree removes the artifact without softening the
        // threshold: a genuinely undersized control fails both times.
        let small = await measureSmallTargets()
        const allowed = TAP_TARGET_DEBT[drawn] ?? 0

        if (small.length > allowed) {
          await page.reload({ timeout: NAV_TIMEOUT })
          await settle(page)
          small = await measureSmallTargets()
        }

        if (small.length > allowed) {
          violations.push({
            route,
            rule: "tap-targets",
            detail:
              `${small.length} target(s) under ${MIN_TAP_TARGET_PX}px on ${drawn}, was ${allowed}: ` +
              `${small.slice(0, 4).join("; ")}. Fix them, or if this page genuinely ` +
              `improved, lower its number in TAP_TARGET_DEBT (tests/support/sweepDebt.ts).`,
          })
        }
      }

      const bytes = await page.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .reduce((sum, r) => sum + ((r as PerformanceResourceTiming).transferSize || 0), 0),
      )
      if (bytes > BYTE_BUDGET) {
        violations.push({
          route,
          rule: "byte-budget",
          detail: `${(bytes / 1_000_000).toFixed(2)}MB (budget ${(BYTE_BUDGET / 1_000_000).toFixed(1)}MB)`,
        })
      }

      const { real, message } = report(violations, `${route} failed`)
      expect(real, message).toEqual([])
    })
  }

  test("the sweep actually covers the app", () => {
    // The ratchet. If the route walk stops matching, this file silently sweeps
    // nothing and passes -- the exact failure it was built to end.
    expect(
      ROUTES.length,
      "No routes were derived from app/. tests/support/appRoutes.ts has stopped " +
        "finding pages, and every sweep in this file is now checking nothing.",
    ).toBeGreaterThanOrEqual(25)
  })
})
