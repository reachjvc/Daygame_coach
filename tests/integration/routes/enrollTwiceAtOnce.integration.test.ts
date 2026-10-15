/**
 * TWO STARTS OF ONE PROGRAM AT ONCE — a double tap on Start.
 *
 * Both requests read the account before either writes, so neither sees the
 * other's program to displace, and the database's one-live-copy rule
 * (`uq_program_enrollments_active`) lets only one in. Measured before the fix:
 * three at once answered 500, 201, 500 — "That program could not be started"
 * on a program that had just started. Every tap now answers with the program
 * that is running, and there is still exactly one of it.
 */
import { describe, it, expect, vi } from "vitest"
import { actAs, newUser } from "@/tests/db/harness"
import { call } from "./call"
import * as enrollments from "@/app/api/programs/enrollments/route"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

describe("starting the same program twice at once", () => {
  it("answers every tap with the one program that is running", async () => {
    const user = await newUser("enrol-twice")
    actAs(user)
    const start = () =>
      call<{ enrollment?: { id: string }; error?: string }>(enrollments.POST, "/api/programs/enrollments", {
        method: "POST",
        body: { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" },
      })

    const answers = await Promise.all([start(), start(), start()])

    expect(answers.map((a) => a.status), JSON.stringify(answers.map((a) => a.body.error))).toEqual([201, 201, 201])
    const ids = new Set(answers.map((a) => a.body.enrollment?.id))
    expect(ids.size, "the taps were told about different programs").toBe(1)

    const running = await call<{ id: string }[]>(enrollments.GET, "/api/programs/enrollments")
    expect(running.body.map((e) => e.id)).toEqual([...ids])
  })
})
