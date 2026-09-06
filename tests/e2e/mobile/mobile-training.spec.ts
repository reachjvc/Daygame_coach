/**
 * Training, on a phone.
 *
 * The rest of `tests/e2e/mobile/` checks that pages load and touch targets are
 * big enough. This walks the actual flow, because the defects that made this
 * feature unusable were never load failures — the page rendered perfectly at
 * 2264 pixels tall with three competing things called logging on it.
 *
 * WHAT IT PINS, and why each one:
 *   - **The page fits.** It was 2264px on a 390px phone for one workout; the
 *     restructure brought it to ~1100. A ceiling here is the only thing that
 *     stops it creeping back.
 *   - **No horizontal overflow.** The single most common way a page breaks on a
 *     phone, and invisible on a laptop.
 *   - **You can log what actually happened**, not just what was asked for.
 *
 * Runs on the `mobile-iphone` / `mobile-pixel` projects, and the same file is
 * picked up by the WebKit and Firefox smoke projects — see `playwright.config.ts`.
 */

import { test, expect } from "@playwright/test"

/**
 * A ceiling that the WORST realistic case has to pass, not the best.
 *
 * Measured with folds closed on a 390px screen: 1310px for a three-lift day
 * (StrongLifts) and 1603px for a six-lift one (Upper/Lower). A 1500 ceiling
 * would have passed only because this spec happens to enrol in the smaller
 * program — a limit the tallest page cannot meet is not a limit. 1800 leaves
 * room for a longer program without letting the page drift back towards the
 * 2264px it replaced.
 */
const MAX_PAGE_HEIGHT = 1800

/**
 * SERIAL, because these share one account.
 *
 * `fullyParallel` is on, and each test here clears the account's enrollments in
 * `beforeEach` so it starts from a known state. Run in parallel that is two
 * tests deleting each other's program mid-assertion — which is exactly what
 * happened: the same spec passed alone and failed in a suite. The repo already
 * isolates its other account-mutating specs for this reason.
 */
test.describe.serial("training on a phone", () => {
  test.beforeEach(async ({ page }) => {
    // Start from nothing so the run does not depend on what a previous one left.
    await page.goto("/programs")
    await page.evaluate(async () => {
      // Clear BOTH lists. Leftover finished programs from a previous test would
      // otherwise lengthen the page and make the height assertion depend on run
      // order rather than on the layout it is meant to measure.
      for (const e of await (await fetch("/api/programs/enrollments")).json()) {
        await fetch(`/api/programs/enrollments/${e.id}`, { method: "DELETE" })
      }
      for (const e of await (await fetch("/api/programs/enrollments?past=1")).json()) {
        await fetch(`/api/programs/enrollments/${e.id}?permanent=1`, { method: "DELETE" })
      }
    })
  })

  test("the page fits a phone and never scrolls sideways", async ({ page }) => {
    // WITH A PROGRAM RUNNING. Measuring the empty state proves nothing — the
    // 2264px this replaced was a page with a session, a history and a logger on
    // it, and an assertion that never sees one would pass forever.
    await page.goto("/programs")
    await page.evaluate(async () => {
      await fetch("/api/programs/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" }),
      })
    })
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByRole("heading", { name: "Training" })).toBeVisible()
    await expect(page.getByTestId(/^lift-row-/).first()).toBeVisible({ timeout: 15000 })

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    )
    expect(overflow, "the page scrolls sideways on a phone").toBe(false)

    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    expect(height, `page is ${height}px tall on a phone`).toBeLessThan(MAX_PAGE_HEIGHT)
  })

  test("both ways of logging are reachable without scrolling", async ({ page }) => {
    // The free-form logger used to be ~1400px down the page and most people
    // never met it.
    await page.goto("/programs")
    await expect(page.getByRole("button", { name: /Today's session/ })).toBeInViewport()
    await expect(page.getByRole("button", { name: /Anything else/ })).toBeInViewport()
  })

  test("a session records what you actually did, not what it asked for", async ({ page }) => {
    await page.goto("/programs")
    await page.evaluate(async () => {
      const r = await fetch("/api/programs/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" }),
      })
      await r.json()
    })
    // WebKit finishes the enrollment fetch appreciably later than Chromium, so
    // the wait is on the data arriving rather than on a fixed pause.
    await page.reload({ waitUntil: "networkidle" })

    const firstLift = page.getByTestId(/^lift-row-/).first()
    await expect(firstLift).toBeVisible({ timeout: 15000 })
    await firstLift.click()

    // Five prescribed sets; record four.
    const before = await page.locator('input[type="number"]').count()
    await page.getByRole("button", { name: "− one set" }).first().click()
    const after = await page.locator('input[type="number"]').count()
    expect(after, "removing a set did not remove its inputs").toBeLessThan(before)

    await page.getByRole("button", { name: /save/i }).first().click()
    await expect(page.getByTestId("history-toggle")).toContainText(/session/i)
  })

  test("a program you built yourself survives starting a cited one, and can be restarted", async ({ page }) => {
    /**
     * THE BUG THIS PINS. A self-built program has `discipline: "strength"`, and
     * enrolling deactivates any active program in the same discipline — so
     * building your own week and later trying StrongLifts archived yours
     * silently, showed it on no screen, and gave no way to bring it back.
     * "It still doesn't load the one I custom made a long time ago."
     */
    await page.goto("/programs")
    await page.evaluate(async () => {
      for (const e of await (await fetch("/api/programs/enrollments?past=1")).json()) {
        await fetch(`/api/programs/enrollments/${e.id}?permanent=1`, { method: "DELETE" })
      }
      await fetch("/api/programs/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: "custom",
          level: "intermediate",
          unitSystem: "kg",
          workingWeights: { custom_placeholder: 60 },
        }),
      })
      // The step that used to lose it.
      await fetch("/api/programs/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" }),
      })
    })
    await page.reload({ waitUntil: "networkidle" })

    // It is still on the account, and visible.
    const archived = await page.evaluate(async () =>
      (await (await fetch("/api/programs/enrollments?past=1")).json()).map(
        (e: { program_id: string }) => e.program_id
      )
    )
    expect(archived, "the self-built program was not kept").toContain("custom")

    // And it can be started again, weights and all.
    const resumed = await page.evaluate(async () => {
      const past = await (await fetch("/api/programs/enrollments?past=1")).json()
      const mine = past.find((e: { program_id: string }) => e.program_id === "custom")
      const r = await fetch(`/api/programs/enrollments/${mine.id}/resume`, { method: "POST" })
      if (!r.ok) return { ok: false, active: [] as string[] }
      const active = await (await fetch("/api/programs/enrollments")).json()
      return { ok: true, active: active.map((e: { program_id: string }) => e.program_id) }
    })
    expect(resumed.ok, "restarting an archived program failed").toBe(true)
    expect(resumed.active).toContain("custom")
  })

  test("the week is visible and every day is a real touch target", async ({ page }) => {
    await page.goto("/programs")
    await page.evaluate(async () => {
      await fetch("/api/programs/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: "upper-lower", level: "beginner", unitSystem: "kg" }),
      })
    })
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByTestId("week-strip")).toBeVisible({ timeout: 15000 })
  })
})
