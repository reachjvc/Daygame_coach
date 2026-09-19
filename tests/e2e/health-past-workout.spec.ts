/**
 * Writing up a workout you have already done.
 *
 * THIS SPEC USED TO TEST A DIFFERENT ENDPOINT. `POST /api/health/workout` took
 * a whole workout and its sets in one call, and two faults it had are pinned
 * below against the path that replaced it:
 *
 * 1. A warm-up saved as a warm-up. The 2026-09-07 migration replaced the
 *    `is_warmup` boolean with `set_kind` and the old validator still listed
 *    `is_warmup` — and a validator deletes fields it was not told about, so
 *    every warm-up single was stored as ordinary work, counted in the volume
 *    total, and able to be announced as a personal best.
 * 2. No half-written workout. That path wrote the workout row before its sets,
 *    so a refused set left an empty session counting towards the streak, the
 *    heatmap and the totals while recording nothing that happened.
 *
 * The second one is structurally impossible now and is asserted as such: a
 * workout is not FINISHED until you finish it, so at no point between Start
 * and Finish does it appear in the finished list. An unfinished one is an OPEN
 * workout — a state the Tracking door shows you and offers to finish or
 * discard, not a phantom session that never happened.
 */

import { test, expect } from "@playwright/test"
import { seedFinishedWorkout, deleteWorkoutsNamed } from "./helpers/seedWorkout"

test.describe.configure({ mode: "serial" })

test("a warm-up set stays a warm-up, and the working set is what counts", async ({ page }) => {
  test.setTimeout(180000)
  await page.goto("/programs")
  await deleteWorkoutsNamed(page, "ZZWarm")

  const id = await seedFinishedWorkout(page, {
    sets: [
      // Heavy enough that no older set on the shared account can beat it, so
      // the number is deterministic.
      { exercise: "ZZWarm Bench", weightKg: 40, reps: 5, setNumber: 1, kind: "warmup" },
      { exercise: "ZZWarm Bench", weightKg: 300, reps: 1, setNumber: 2, kind: "working" },
    ],
  })

  const stored = await page.evaluate(async (logId) => {
    const logs = (await (await fetch("/api/health/workout?days=3650&include=sets")).json()) as {
      id: string
      sets?: { set_kind: string; weight_kg: number }[]
    }[]
    const mine = logs.find((l) => l.id === logId)
    return (mine?.sets ?? []).map((s) => `${s.weight_kg}:${s.set_kind}`).sort()
  }, id)

  expect(stored, "the warm-up must survive the save").toEqual(["300:working", "40:warmup"])

  await deleteWorkoutsNamed(page, "ZZWarm")
})

test("a workout with sets still being written is OPEN, never a finished empty one", async ({
  page,
}) => {
  test.setTimeout(180000)
  await page.goto("/programs")

  const out = await page.evaluate(async () => {
    const already = await (await fetch("/api/workouts/live")).json()
    if (already) await fetch(`/api/workouts/${already.id}`, { method: "DELETE" })
    const before = ((await (await fetch("/api/health/workout?days=3650")).json()) as unknown[]).length

    const started = await (
      await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientKey: `zz-ghost-${Date.now()}` }),
      })
    ).json()

    const set = (setNumber: number) =>
      fetch(`/api/workouts/${started.id}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId: null,
          exercise: "ZZTest Ghost",
          weight: 60,
          reps: 5,
          setNumber,
          kind: "working",
        }),
      })

    const noSets = ((await (await fetch("/api/health/workout?days=3650")).json()) as unknown[]).length
    await set(1)
    // The SAME slot again — a set re-ticked after a correction. It updates the
    // row rather than being refused, which is why the old path's "workout row
    // written, sets refused" state has no equivalent here.
    const second = await set(1)
    const oneSet = ((await (await fetch("/api/health/workout?days=3650")).json()) as unknown[]).length

    const live = await (await fetch("/api/workouts/live")).json()
    await fetch(`/api/workouts/${started.id}`, { method: "DELETE" })
    return {
      secondStatus: second.status,
      stillOpen: live?.id === started.id,
      finishedWithNoSets: noSets - before,
      finishedMidWrite: oneSet - before,
    }
  })

  // A re-ticked set corrects the one that is there.
  expect(out.secondStatus, "re-ticking a set is not an error").toBe(200)

  /**
   * THE STRUCTURAL GUARANTEE, and the reason the old fault cannot recur.
   *
   * `POST /api/health/workout` wrote the workout row and then its sets, so a
   * refusal in the second half left a FINISHED session with nothing in it,
   * counting towards the streak, the heatmap and every total. Here a workout
   * is not finished until you finish it: at no point between Start and Finish
   * does it appear in the finished list, whether it has no sets or some.
   */
  expect(out.finishedWithNoSets, "no finished workout before any set").toBe(0)
  expect(out.finishedMidWrite, "and none part-way through writing them").toBe(0)
  expect(out.stillOpen, "it is yours to finish or discard").toBe(true)
})
