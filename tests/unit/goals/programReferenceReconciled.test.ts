/**
 * THE PLAN CANNOT BE THE AUTHORITY ON WHAT IS RUNNING.
 *
 * The reference was written once, when a program was started from Life
 * Mastery, and removed only by Life Mastery's own End button. Everything else
 * left it wrong:
 *
 *   - End the program on the Training page → the plan still points at a row
 *     that stopped prescribing, and goes on describing it as your week.
 *   - Start a program on your phone → the laptop's plan knows nothing about
 *     it, because the reference lives in that browser's storage.
 *   - Clear your browser data → the link is gone while the program runs on.
 *
 * So the plan reconciles against the database every time it opens.
 *
 * ── WHAT THESE GAINED, 2026-09-23 ───────────────────────────────────────────
 *
 * The two cases that must change NOTHING — a read still in flight, and a read
 * that failed — were not testable at all before, because the guard was an
 * early return in the React effect that called this. `useActiveEnrollments`
 * never returns null on failure; it keeps the last-known list and sets `error`.
 * So `{ enrollments: [], error: "…" }` is the shape of a first failed request,
 * and a rule keyed on the list alone reads it as "nothing is running" and
 * detaches a program somebody is three weeks into.
 *
 * And it says what it did: `adopted` and `ended`, so the screen can tell
 * somebody their plan changed instead of changing under them.
 */

import { describe, it, expect } from "vitest"
import { addRoutine, applyProgramToWorkoutRoutine, emptyNsPlan } from "@/src/goals/northStarService"
import { reconcileProgramReference } from "@/src/goals/programReferenceService"
import type { EnrollmentRead } from "@/src/goals/programReferenceService"
import type { NsPlan } from "@/src/goals/types"

const NOW = "2026-09-19T10:00:00.000Z"

const workout = (plan: NsPlan) => plan.routines.find((r) => r.blueprintId === "workout")

const enrollment = (id: string, started_at: string) => ({ id, started_at })

/** A successful read of exactly these enrollments. */
const read = (enrollments: EnrollmentRead["enrollments"]): EnrollmentRead => ({
  enrollments,
  loading: false,
  error: null,
})

/** A plan already pointing at `enr-1`. */
const tracking = (id = "enr-1") => applyProgramToWorkoutRoutine(emptyNsPlan(), NOW, { enrollmentId: id })

describe("a read that cannot be trusted yet", () => {
  it("changes nothing while the list is still loading", () => {
    const plan = tracking()
    const out = reconcileProgramReference(plan, { enrollments: [], loading: true, error: null }, NOW)

    expect(out.plan).toBe(plan)
    expect(out.adopted).toBeNull()
    expect(out.ended).toBeNull()
  })

  it("changes nothing when the read FAILED, even though the list is empty", () => {
    /**
     * This is the whole reason the read is passed in whole. An empty list with
     * an error is a first failed request, and detaching on it takes away the
     * program somebody is in the middle of.
     */
    const plan = tracking()
    const out = reconcileProgramReference(
      plan,
      { enrollments: [], loading: false, error: "Your programs could not be loaded." },
      NOW
    )

    expect(out.plan).toBe(plan)
    expect(workout(out.plan)?.program).toEqual({ enrollmentId: "enr-1" })
  })

  it("adopts nothing on a failed read that still carries a stale list", () => {
    // The hook keeps whatever was last known. Adopting from it would write a
    // reference on the strength of a request that did not happen.
    const out = reconcileProgramReference(
      emptyNsPlan(),
      { enrollments: [enrollment("enr-9", "2026-09-18T08:00:00.000Z")], loading: false, error: "nope" },
      NOW
    )
    expect(out.adopted).toBeNull()
    expect(workout(out.plan)?.program ?? null).toBeNull()
  })
})

describe("reconciling the plan against what is actually running", () => {
  it("a program ended elsewhere is detached, reported, and the week stays", () => {
    const plan = tracking()
    const out = reconcileProgramReference(plan, read([]), NOW)

    expect(workout(out.plan)?.program).toBeNull()
    // Reported rather than silently forgotten: the plan had been describing
    // this program, possibly for months.
    expect(out.ended).toEqual({ enrollmentId: "enr-1" })
    // The week the person wrote is not deleted because a program stopped.
    expect(workout(out.plan)?.splitDays).toEqual(workout(plan)?.splitDays)
    expect(workout(out.plan)?.daysPerWeek).toBe(workout(plan)?.daysPerWeek)
  })

  it("a program started elsewhere is adopted, and gets a routine to live in", () => {
    // The default routine set ships with no workout routine at all, so this is
    // the fresh-browser case: nothing in storage, a program running.
    const out = reconcileProgramReference(
      emptyNsPlan(),
      read([enrollment("enr-9", "2026-09-18T08:00:00.000Z")]),
      NOW
    )

    expect(workout(out.plan)).toBeDefined()
    expect(workout(out.plan)?.program).toEqual({ enrollmentId: "enr-9" })
    expect(out.adopted).toEqual({ enrollmentId: "enr-9" })
  })

  it("adopting touches the reference and nothing else about the week", () => {
    /**
     * Starting a program used to write the PROGRAM's day names into the plan's
     * own week and set "days a week" to how many there were. StrongLifts is two
     * day TEMPLATES trained three times a week, so the plan read "2 days a
     * week", and the names were then editable in the Systems step — so somebody
     * could rename Workout A in their plan and the program never heard about
     * it. Two versions of one week, and nothing able to say which was right.
     *
     * The days the adopted routine has are the BLUEPRINT's own suggestion —
     * "Full Body A / B / C", which `addRoutine` ships — and they are left
     * exactly as they were. That is not a copy of anything: this function is
     * handed `{ id, started_at }` and never sees a day name, which is the
     * structural half of the same guarantee.
     */
    const fresh = addRoutine(emptyNsPlan(), "workout", NOW)
    const out = reconcileProgramReference(
      emptyNsPlan(),
      read([enrollment("enr-9", "2026-09-18T08:00:00.000Z")]),
      NOW
    )
    expect(workout(out.plan)?.splitDays).toEqual(workout(fresh)?.splitDays)
    expect(workout(out.plan)?.daysPerWeek).toBe(workout(fresh)?.daysPerWeek)
  })

  it("a reference that is still running comes back as the very same object", () => {
    const plan = tracking()
    // Identity, not equality: the effect that calls this writes to storage on
    // any change, so returning a copy would save on every single mount.
    const out = reconcileProgramReference(plan, read([enrollment("enr-1", "2026-09-01T08:00:00.000Z")]), NOW)
    expect(out.plan).toBe(plan)
    expect(out.adopted).toBeNull()
    expect(out.ended).toBeNull()
  })

  it("two running and none referenced: the most recently started wins", () => {
    /**
     * ADOPTING WITH TWO RUNNING IS DELIBERATE. Adopting nothing makes the
     * Systems step answer `none`, and its card draws NOTHING for `none` — so
     * Life Mastery would go silent about two running programs, which is the
     * state most worth saying out loud. With the newest adopted the card
     * reaches `several` and reads "2 programs running — see Training".
     */
    const out = reconcileProgramReference(
      emptyNsPlan(),
      read([
        enrollment("enr-old", "2026-07-15T08:00:00.000Z"),
        enrollment("enr-new", "2026-09-10T08:00:00.000Z"),
      ]),
      NOW
    )
    expect(workout(out.plan)?.program).toEqual({ enrollmentId: "enr-new" })
  })

  it("two running and one referenced: the reference is left alone", () => {
    const plan = tracking("enr-old")
    const out = reconcileProgramReference(
      plan,
      read([
        enrollment("enr-old", "2026-07-15T08:00:00.000Z"),
        enrollment("enr-new", "2026-09-10T08:00:00.000Z"),
      ]),
      NOW
    )
    // Running two programs at once is a real state. The newer one does not get
    // to hijack a plan that already names the older.
    expect(out.plan).toBe(plan)
  })

  it("nothing running and nothing referenced changes nothing", () => {
    const plan = emptyNsPlan()
    const out = reconcileProgramReference(plan, read([]), NOW)
    expect(out.plan).toBe(plan)
    expect(out.ended).toBeNull()
  })

  it("detaches only the reference that died, not a second one that is fine", () => {
    // Two routines can each name a program; only the dead one goes.
    let plan = tracking("enr-dead")
    const second = plan.routines.find((r) => r.blueprintId !== "workout")!
    plan = {
      ...plan,
      routines: plan.routines.map((r) =>
        r.id === second.id ? { ...r, program: { enrollmentId: "enr-alive" } } : r
      ),
    }

    const out = reconcileProgramReference(plan, read([enrollment("enr-alive", "2026-09-01T08:00:00.000Z")]), NOW)

    expect(workout(out.plan)?.program).toBeNull()
    expect(out.plan.routines.find((r: NsPlan["routines"][number]) => r.id === second.id)?.program).toEqual({
      enrollmentId: "enr-alive",
    })
    // The live one is not adopted onto the workout routine on top of the
    // routine that already names it.
    expect(out.adopted).toBeNull()
  })

  it("a program that ended and a new one that started are both handled at once", () => {
    /**
     * The dead reference is dropped BEFORE the adoption rules rather than
     * instead of them. Handled the other way round, a plan pointing at a
     * finished program would stay stuck on it while a new one ran, because
     * "nothing referenced" was never true.
     */
    const plan = tracking("enr-finished")
    const out = reconcileProgramReference(plan, read([enrollment("enr-fresh", "2026-09-18T08:00:00.000Z")]), NOW)

    expect(out.ended).toEqual({ enrollmentId: "enr-finished" })
    expect(out.adopted).toEqual({ enrollmentId: "enr-fresh" })
    expect(workout(out.plan)?.program).toEqual({ enrollmentId: "enr-fresh" })
  })
})
