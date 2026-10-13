/**
 * A PROGRAM YOU BUILT YOURSELF SURVIVES STARTING A CITED ONE, AND CAN BE RESTARTED.
 *
 * Moved from `tests/e2e/mobile/mobile-training.spec.ts`, where it ran on a
 * phone-sized browser and made every call through `fetch` — nothing on screen
 * was read. The same handlers (`app/api/programs/enrollments/**`) run here with
 * `programRepo` and production's schema behind them, on an account of its own.
 *
 * THE BUG THIS PINS. A self-built program has `discipline: "strength"`, and
 * enrolling deactivates any active program in the same discipline — so building
 * your own week and later trying StrongLifts archived yours silently, showed it
 * on no screen, and gave no way to bring it back. "It still doesn't load the
 * one I custom made a long time ago."
 *
 * The browser version also lied for weeks: it never sent the `label` a custom
 * program requires, so its create answered 400 and the test passed on whatever
 * `custom` row an earlier spec had left on the shared account. Here the create
 * is asserted, and the account starts empty.
 */

import { describe, it, expect, vi } from "vitest"
import { actAs, newUser } from "@/tests/db/harness"
import { call } from "./call"
import * as enrollments from "@/app/api/programs/enrollments/route"
import * as resume from "@/app/api/programs/enrollments/[id]/resume/route"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

type Enrollment = { id: string; program_id: string }

const list = async (past: boolean) =>
  (await call<Enrollment[]>(enrollments.GET, `/api/programs/enrollments${past ? "?past=1" : ""}`)).body

describe("a self-built program", () => {
  it("survives starting a cited one, and can be restarted", async () => {
    const user = await newUser("own-week")
    actAs(user)

    const created = await call(enrollments.POST, "/api/programs/enrollments", {
      method: "POST",
      body: {
        programId: "custom",
        level: "intermediate",
        unitSystem: "kg",
        workingWeights: { custom_placeholder: 60 },
        label: "My own week",
      },
    })
    expect(created.status, `the self-built program could not be created: ${JSON.stringify(created.body)}`).toBe(201)

    // The step that used to lose it.
    const cited = await call(enrollments.POST, "/api/programs/enrollments", {
      method: "POST",
      body: { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" },
    })
    expect(cited.status, JSON.stringify(cited.body)).toBe(201)

    // It is still on the account.
    const archived = await list(true)
    expect(archived.map((e) => e.program_id), "the self-built program was not kept").toContain("custom")

    // And it can be started again.
    const mine = archived.find((e) => e.program_id === "custom")!
    const resumed = await call(resume.POST, `/api/programs/enrollments/${mine.id}/resume`, {
      method: "POST",
      params: { id: mine.id },
    })
    expect(resumed.status, `restarting an archived program failed: ${JSON.stringify(resumed.body)}`).toBe(200)
    expect((await list(false)).map((e) => e.program_id)).toContain("custom")
  })
})
