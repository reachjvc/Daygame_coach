/**
 * A gym is where signal dies.
 *
 * WHAT THIS PROVES. Ticking a set writes it immediately, and when that write
 * fails the set is held in this browser and sent when the connection comes
 * back. The ✓ goes down either way, because somebody standing at a rack cannot
 * wait for a round trip — but the set must not be lost, and it must not arrive
 * twice.
 *
 * The identity of a set is its SLOT — the lift, the kind, the set number — so
 * replaying a held write corrects that set rather than adding another. That is
 * what stops a flaky connection turning three sets into five.
 */

import { test, expect } from "@playwright/test"

test.describe.configure({ mode: "serial" })

test("sets ticked with no connection are kept and sent when it comes back", async ({
  page,
  context,
}) => {
  test.setTimeout(240000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/programs")

  await page.evaluate(async () => {
    const live = await (await fetch("/api/workouts/live")).json()
    if (live) await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })
    for (const e of await (await fetch("/api/programs/enrollments")).json()) {
      const d = await (await fetch(`/api/programs/enrollments/${e.id}`)).json()
      for (const l of d.logs ?? []) await fetch(`/api/programs/enrollments/${e.id}/log/${l.id}`, { method: "DELETE" })
      await fetch(`/api/programs/enrollments/${e.id}`, { method: "DELETE" })
      await fetch(`/api/programs/enrollments/${e.id}?permanent=1`, { method: "DELETE" })
    }
    await fetch("/api/programs/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" }),
    })
  })

  await page.reload({ waitUntil: "networkidle" })
  await page.getByTestId("start-workout").click()
  await page.waitForURL("**/programs/live", { timeout: 20000 })
  await expect(page.getByTestId("set-row-1").first()).toBeVisible({ timeout: 20000 })

  // --- the signal dies ---
  await context.setOffline(true)

  await page.getByTestId("tick-1").first().click()
  await page.getByTestId("tick-2").first().click()

  // The ✓ goes down anyway. Waiting for a round trip at a rack is not an option.
  await expect(page.getByTestId("tick-1").first()).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByTestId("tick-2").first()).toHaveAttribute("aria-pressed", "true")
  /**
   * And the ROW says so, not just the footer's count — it names which set is
   * at risk, and it says what happens next. The old wording ("not saved yet —
   * waiting for signal") was rendered from the instant of the tap, so this
   * assertion passed on a perfect connection too; the marker now waits for a
   * write to actually be in trouble, which is what makes it worth asserting.
   */
  await expect(page.getByText(/Not saved — no signal/i).first()).toBeVisible({ timeout: 20000 })

  // --- and comes back ---
  await context.setOffline(false)
  // The queue is flushed on the `online` event and on a timer; give it both.
  await page.waitForFunction(
    () => (JSON.parse(window.localStorage.getItem("live-workout-queue-v1") ?? "[]") as unknown[]).length === 0,
    undefined,
    { timeout: 60000 }
  )

  const saved = await page.evaluate(async () => {
    const live = await (await fetch("/api/workouts/live")).json()
    return {
      workouts: live ? 1 : 0,
      sets: (live?.sets ?? []).map((s: { setNumber: number; reps: number }) => s.setNumber).sort(),
    }
  })
  console.log("OFFLINE", JSON.stringify(saved))

  expect(saved.workouts, "one workout, not one per attempt").toBe(1)
  expect(saved.sets, "both sets arrived, exactly once each").toEqual([1, 2])

  await page.evaluate(async () => {
    const live = await (await fetch("/api/workouts/live")).json()
    if (live) await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })
    for (const e of await (await fetch("/api/programs/enrollments")).json()) {
      await fetch(`/api/programs/enrollments/${e.id}`, { method: "DELETE" })
      await fetch(`/api/programs/enrollments/${e.id}?permanent=1`, { method: "DELETE" })
    }
  })
})
