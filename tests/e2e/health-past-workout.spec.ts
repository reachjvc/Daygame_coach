/**
 * Writing up a workout you have already done.
 *
 * TWO THINGS THE 2026-09-07 MIGRATION BROKE, both fixed and both pinned here.
 * That migration replaced the `is_warmup` boolean with `set_kind` and dropped
 * the column, and this save path never caught up:
 *
 * 1. The form sent `set_kind`, the API's validator still listed `is_warmup`,
 *    and a validator deletes fields it was not told about. So the warm-up
 *    switch did nothing at all — every warm-up single was stored as ordinary
 *    work, counted in the volume total, and able to be announced as a personal
 *    best.
 * 2. The workout row is written before its sets. When the sets were refused,
 *    the workout stayed — an empty session that counts towards the streak, the
 *    heatmap and the totals while recording nothing that happened. The person
 *    sees an error, tries again, and now has two.
 */

import { test, expect } from "@playwright/test"

test("a past workout with a warm-up set saves, and the warm-up stays a warm-up", async ({ page }) => {
  test.setTimeout(180000)
  await page.goto("/programs")
  const out = await page.evaluate(async () => {
    const r: Record<string, unknown> = {}
    const before = ((await (await fetch("/api/health/workout?days=3650")).json()) as unknown[]).length

    const res = await fetch("/api/health/workout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_type: "weights", duration_min: 45, intensity: 3,
        sets: [
          // Named exactly what the metric looks for, and heavy enough that no
          // older set on the account can beat it, so the number is deterministic.
          { exercise: "Bench Press", weight_kg: 40, reps: 5, set_number: 1, set_kind: "warmup" },
          { exercise: "Bench Press", weight_kg: 300, reps: 1, set_number: 2, set_kind: "working" },
        ],
      }),
    })
    r.status = res.status
    const body = await res.json().catch(() => null)
    r.error = (body as { error?: string })?.error ?? null
    const id = (body as { id?: string })?.id ?? null
    r.kinds = ((body as { sets?: { set_kind: string; weight_kg: number }[] })?.sets ?? [])
      .map((s) => `${s.weight_kg}:${s.set_kind}`)

    // A workout whose sets are refused must not leave an empty shell behind.
    const bad = await fetch("/api/health/workout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_type: "weights", duration_min: 45, intensity: 3,
        // Two sets in the SAME slot. This passes validation and is refused by
        // the database's own uniqueness rule, which is the only way to reach
        // the half-written state: workout row in, sets rejected.
        sets: [
          { exercise: "ZZTest Ghost", weight_kg: 60, reps: 5, set_number: 1, set_kind: "working" },
          { exercise: "ZZTest Ghost", weight_kg: 60, reps: 5, set_number: 1, set_kind: "working" },
        ],
      }),
    })
    r.badStatus = bad.status
    const after = ((await (await fetch("/api/health/workout?days=3650")).json()) as unknown[]).length
    r.netNewWorkouts = after - before

    if (id) await fetch(`/api/health/workout?id=${id}`, { method: "DELETE" })
    r.cleanedUp = ((await (await fetch("/api/health/workout?days=3650")).json()) as unknown[]).length - before
    return r
  })
  console.log("WARMUP", JSON.stringify(out, null, 1))
  expect(out.error, "the workout must save").toBeNull()
  expect(out.status).toBe(201)
  expect(out.kinds, "the warm-up must survive the save").toEqual(["40:warmup", "300:working"])
  expect(out.badStatus, "a workout whose sets cannot be stored is refused").toBe(500)
  expect(out.netNewWorkouts, "and leaves no empty workout behind").toBe(1)
  expect(out.cleanedUp).toBe(0)
})
