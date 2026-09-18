// @vitest-environment node
/**
 * YOU CANNOT END, OR PUSH ASIDE, A PROGRAM YOU ARE MID-WORKOUT ON.
 *
 * In plain terms, what went wrong. "End program" flipped the program off with
 * no check, and starting a different program of the same kind pauses whatever
 * was running — also with no check. Either way the workout you were in the
 * middle of then finished onto a plan nobody is shown any more: its weights
 * moved, invisibly, for something you had just ended, and the new program sat
 * at week 1 as though you had never trained.
 *
 * The second test is the one that matters most: the check runs for EVERY
 * program about to be displaced before the first write, so a refusal never
 * leaves one program already switched off and the rest untouched.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { strongLifts5x5 } from "@/src/programs/data/strength/stronglifts5x5"
import { seedEnrollment } from "@/src/programs/programsService"

const USER = "u1"

interface FakeOptions {
  /** Enrollment ids that have a workout open on them right now. */
  busy?: string[]
  /** Active enrollments, for the displacement loop. */
  active?: string[]
  /** The open-workout check fails to run at all. */
  checkFails?: boolean
  /** An INACTIVE enrollment being picked back up, by id. */
  resuming?: string
  /**
   * The DATABASE refuses the switch-off, the way the 20260917100100 trigger
   * does — a Start that crossed the app's check, or a script with no check at
   * all. The app never sees "open" in this case; it sees a failed write.
   */
  triggerRefuses?: boolean
  /** The switch-off fails for some unrelated reason. */
  writeFails?: boolean
}

function fakeSupabase(opts: FakeOptions) {
  const pausedIds: string[] = []
  const seed = seedEnrollment(strongLifts5x5, "beginner", "kg")

  const enrollmentRow = (id: string) => ({
    id,
    user_id: USER,
    program_id: strongLifts5x5.id,
    level: "beginner",
    unit_system: "kg",
    exercise_state: seed.exerciseState,
    cursor: seed.cursor,
    is_active: true,
    started_at: "2026-09-01T00:00:00Z",
    created_at: "2026-09-01T00:00:00Z",
    custom_schedule: null,
    initial_exercise_state: seed.exerciseState,
    replay_events: [],
    bar_weight_kg: null,
    label: null,
  })

  const table = (name: string) => {
    const filters: Record<string, unknown> = {}
    let patch: Record<string, unknown> | null = null

    const chain: Record<string, unknown> = {
      select: () => chain,
      insert: (row: Record<string, unknown>) => {
        patch = row
        return chain
      },
      update: (row: Record<string, unknown>) => {
        patch = row
        return chain
      },
      eq: (col: string, value: unknown) => {
        filters[col] = value
        return chain
      },
      neq: () => chain,
      in: () => chain,
      or: () => chain,
      is: () => chain,
      not: () => chain,
      order: () => chain,
      limit: () => chain,
      then: (done: (v: unknown) => unknown) => (resolve() as Promise<unknown>).then(done),
      maybeSingle: () => resolve(),
      single: () => resolve(),
    }

    function resolve() {
      if (name === "workout_logs") {
        if (opts.checkFails) {
          return Promise.resolve({ data: null, error: { message: "connection lost" } })
        }
        const open = (opts.busy ?? []).includes(String(filters.enrollment_id))
        return Promise.resolve({ data: open ? { id: "w-open" } : null, error: null })
      }
      if (name === "program_enrollments") {
        // A single read by id: the program being resumed, which is not active.
        if (!patch && opts.resuming && filters.id === opts.resuming) {
          return Promise.resolve({
            data: { ...enrollmentRow(opts.resuming), is_active: false },
            error: null,
          })
        }
        if (patch && patch.is_active === false) {
          if (opts.writeFails) {
            return Promise.resolve({
              data: null,
              error: { code: "08006", message: "connection to server was lost" },
            })
          }
          if (opts.triggerRefuses) {
            return Promise.resolve({
              data: null,
              // The shape supabase-js hands back for a RAISE EXCEPTION.
              error: { code: "55000", message: "Finish or throw away the open workout first." },
            })
          }
          pausedIds.push(String(filters.id))
          return Promise.resolve({ data: null, error: null })
        }
        if (patch) {
          // An enrolment insert.
          return Promise.resolve({ data: enrollmentRow("e-new"), error: null })
        }
        return Promise.resolve({
          data: (opts.active ?? []).map(enrollmentRow),
          error: null,
        })
      }
      if (name === "user_settings" || name === "profiles") {
        return Promise.resolve({ data: null, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    }

    return chain
  }

  return { client: { from: table }, pausedIds }
}

async function repoWith(opts: FakeOptions) {
  const fake = fakeSupabase(opts)
  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => fake.client }))
  vi.doMock("@/src/db/settingsRepo", () => ({
    getUserTimezone: async () => "Europe/Copenhagen",
    getTrainingSettings: async () => ({ barWeightKg: 20, smallestPlateKg: 1.25 }),
  }))
  const repo = await import("@/src/db/programRepo")
  return { repo, fake }
}

beforeEach(() => vi.resetModules())
afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
  vi.doUnmock("@/src/db/settingsRepo")
})

describe("a program with a workout open on it", () => {
  test("ending a program with a workout open on it is refused", async () => {
    const { repo, fake } = await repoWith({ busy: ["e1"] })
    await expect(repo.unenroll(USER, "e1")).rejects.toThrow(
      "Finish or throw away the open workout first."
    )
    expect(fake.pausedIds, "and nothing was switched off").toEqual([])
  })

  test("ending a different program while a loose workout is open is allowed", async () => {
    // A workout off any program, or one on a different program, is not this
    // program's business.
    const { repo, fake } = await repoWith({ busy: ["e2"] })
    await expect(repo.unenroll(USER, "e1")).resolves.toBeUndefined()
    expect(fake.pausedIds).toEqual(["e1"])
  })

  test("starting a program that would displace one with a workout open is refused before anything is paused", async () => {
    const { repo, fake } = await repoWith({ active: ["e1", "e2"], busy: ["e2"] })
    await expect(
      repo.enrollInProgram(USER, {
        programId: strongLifts5x5.id,
        level: "beginner",
        unitSystem: "kg",
      })
    ).rejects.toThrow("Finish or throw away the open workout first.")
    // e1 comes first in the loop and is NOT the busy one. If the check ran
    // inside the loop rather than before it, e1 would already be switched off
    // and the person would be left with no running program at all.
    expect(fake.pausedIds).toEqual([])
  })

  test("picking an old program back up is refused too, before anything is paused", async () => {
    /**
     * THE THIRD PLACE THAT PAUSES A PROGRAM. "End program" and starting a new
     * one were the two the audit found; resuming a finished program does the
     * same thing and had no check either — and with the database trigger in
     * place its refusal would have reached the screen as "Failed to pause
     * couch-to-5k: Finish or throw away the open workout first."
     */
    const { repo, fake } = await repoWith({ active: ["e1", "e2"], busy: ["e2"], resuming: "e3" })
    await expect(repo.resumeEnrollment(USER, "e3")).rejects.toThrow(
      "Finish or throw away the open workout first."
    )
    expect(fake.pausedIds).toEqual([])
  })

  test("a check that could not be run refuses too, rather than passing", async () => {
    // A failed read is not "nothing is open". Treating it as one moves weights
    // on a program nobody can see again.
    const { repo, fake } = await repoWith({ checkFails: true })
    await expect(repo.unenroll(USER, "e1")).rejects.toThrow(
      "Could not check whether a workout is open, so nothing was changed."
    )
    expect(fake.pausedIds).toEqual([])
  })

  /**
   * THE GAP THE TRIGGER CLOSES, AND WHAT THE PERSON READS WHEN IT FIRES.
   *
   * The app's check runs and then writes, so a Start landing in the
   * milliseconds between the two gets through it — and a script or another tab
   * never ran it at all. The trigger in 20260917100100 refuses the write
   * itself. When it does, the app sees a FAILED WRITE rather than "a workout is
   * open", and without the mapping the screen read "Failed to end program:
   * Finish or throw away the open workout first." One sentence either way, and
   * the same 409 to the route, whichever of the two caught it.
   */
  test("the database's own refusal reaches the screen as the same one sentence", async () => {
    const { repo } = await repoWith({ triggerRefuses: true })
    const thrown = await repo.unenroll(USER, "e1").catch((e: unknown) => e)
    expect(thrown).toBeInstanceOf(repo.ProgramBusy)
    expect((thrown as Error).message).toBe("Finish or throw away the open workout first.")
  })

  test("a write that fails for any other reason is not called a busy program", async () => {
    // Otherwise every failed End would tell the person to finish a workout that
    // is not there, and the route would answer 409 — "you did something" — for
    // what is actually a fault on this side.
    const { repo } = await repoWith({ writeFails: true })
    const thrown = await repo.unenroll(USER, "e1").catch((e: unknown) => e)
    expect(thrown).not.toBeInstanceOf(repo.ProgramBusy)
    expect((thrown as Error).message).toContain("Failed to end program")
  })
})
