// @vitest-environment node
/**
 * A FIXED SLEEP IN A BROWSER TEST IS ALLOWED ONLY WHERE TIME IS THE THING
 * UNDER TEST — and only in the places listed here, which may only shrink.
 *
 * `waitForTimeout` is a guess about how long a screen takes. Too short and the
 * test is flaky, and the flake reads as a product defect; too long and every
 * run pays for it forever. On 2026-10-13 there were 377 seconds of them per
 * pass of the suite, 54 in one time-tracker file. They became waits on a
 * condition: the response, the element, the account's answer.
 *
 * Five tests genuinely measure wall-clock time — a retry rate, a race with a
 * pull already in flight, a rest clock in a backgrounded tab, idle detection,
 * an idle page that must not keep working. Each carries `@timing` in its title
 * so it can be run in a lane of its own, and is listed below with the number
 * of sleeps it has. The count must match exactly: an allowance with headroom
 * lets the next sleep in for free.
 *
 * Replaces the training-only sleep ceiling that lived in
 * tests/unit/e2e-isolation.test.ts — one owner for the rule.
 */

import { describe, test, expect } from "vitest"
import { callSites, e2eSourceFiles, parse } from "./e2eSource"

/** `file › test title` → how many sleeps that test may have */
const TIMED_SLEEPS: Record<string, number> = {
  // ten seconds in the background is the experience under test
  "tests/e2e/programs-live-workout.spec.ts › the rest clock is still right after the tab has been in the background @timing @engine @phone": 1,
  // a retry RATE: POSTs counted over twelve seconds
  "tests/e2e/timetrack-sync.spec.ts › a server it cannot reach is not asked once a second @timing": 1,
  // a stop pressed 120ms into a pull, then long enough for that pull to land
  "tests/e2e/timetrack-sync.spec.ts › a timer stopped once stays stopped, even if a pull was already in flight @timing": 2,
  // idle detection: the threshold has to pass in wall time
  "tests/e2e/toggl-time-tracker.spec.ts › idle detection never fires while you work elsewhere, and asks when you come back @timing": 1,
  // two samples across idle seconds: growth is the assertion
  "tests/e2e/mobile/mobile-toggl.spec.ts › an idle page does no work: observers are not rebuilt as the clock ticks @timing": 2,
}

const isSleep = (callee: string) => /\.waitForTimeout$/.test(callee)

/** Every sleep in a file, by the test it is in */
function sleepsIn(file: string, text?: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const site of callSites(parse(file, text), isSleep)) {
    const key = site.inTest ? `${file} › ${site.where}` : `${file} › ${site.where} (line ${site.line}, outside any test)`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/** What is wrong with a set of sleeps, against an allowlist */
function problems(found: Map<string, number>, allowed: Record<string, number>): string[] {
  const out: string[] = []
  for (const [key, count] of found) {
    if (!key.includes("@timing")) out.push(`${key}: ${count} sleep(s) in a test not tagged @timing`)
    else if (!(key in allowed)) out.push(`${key}: ${count} sleep(s), and the test is not on the list`)
    else if (allowed[key] !== count) out.push(`${key}: ${count} sleep(s), the list says ${allowed[key]}`)
  }
  for (const key of Object.keys(allowed)) {
    if (!found.has(key)) out.push(`${key}: listed, but has no sleep (or was renamed) — take it off the list`)
  }
  return out
}

describe("fixed sleeps in the browser suite", () => {
  test("appear only in the listed @timing tests, exactly as many as listed", () => {
    const files = e2eSourceFiles()
    expect(files.length, "the scan found almost no files under tests/e2e").toBeGreaterThan(40)

    const found = new Map<string, number>()
    for (const file of files) for (const [key, n] of sleepsIn(file)) found.set(key, n)

    const wrong = problems(found, TIMED_SLEEPS)
    expect(
      wrong,
      "Wait for the thing itself — a response, an element, a poll of the account — instead of\n" +
        "for a length of time. Only a test that measures time may sleep, and it is listed above\n" +
        "with its exact count; lower the count in the same change that removes a sleep:\n" +
        wrong.join("\n"),
    ).toEqual([])
  })

  test("the check catches planted sleeps and passes a listed one", () => {
    const planted = `
      import { test } from "@playwright/test"
      async function helper(page) { await page.waitForTimeout(500) }
      test("plain", async ({ page }) => { await page.waitForTimeout(300) })
      test("tagged but unlisted @timing", async ({ page }) => { await page.waitForTimeout(300) })
      test.describe("group", () => {
        test("listed @timing", async ({ page, other }) => {
          // await page.waitForTimeout(999) is a comment, not a sleep
          await other.waitForTimeout(1000)
        })
      })
    `
    const found = sleepsIn("planted.spec.ts", planted)
    const wrong = problems(found, { "planted.spec.ts › listed @timing": 1 })

    expect(wrong.some((w) => w.includes("outside any test")), "a sleep in a helper").toBe(true)
    expect(wrong.some((w) => w.startsWith("planted.spec.ts › plain:")), "a sleep in an untagged test").toBe(true)
    expect(wrong.some((w) => w.includes("tagged but unlisted @timing")), "a tagged test off the list").toBe(true)
    expect(wrong.some((w) => w.startsWith("planted.spec.ts › listed @timing:")), "the listed test is fine").toBe(false)
    expect(wrong, "exactly the three planted faults").toHaveLength(3)

    // a list that has headroom, or names a test that no longer sleeps, is wrong too
    expect(problems(found, { "planted.spec.ts › listed @timing": 2 }).some((w) => w.includes("the list says 2"))).toBe(true)
    expect(problems(new Map(), { "gone.spec.ts › old @timing": 1 })).toHaveLength(1)
  })
})
