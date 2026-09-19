/**
 * "VALIDATION FAILED" IS NOT AN ANSWER.
 *
 * Both screens that start a program show the server's sentence verbatim
 * (`WorkoutPrograms.tsx`, `CustomProgramBuilder.tsx`). The route answered the
 * bare string "Validation failed" — so somebody whose push-up was refused for
 * being 0 kg saw two words naming neither the lift nor the field, on a form
 * with one box per lift.
 *
 * These drive the real POST handler rather than the schema, because the thing
 * that was wrong was what the ROUTE did with the schema's answer.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const { enrollInProgram } = vi.hoisted(() => ({
  enrollInProgram: vi.fn(async (_userId: string, body: unknown) => ({ enrollment: { id: "e1" }, body })),
}))

vi.mock("@/src/db/auth", () => ({
  requireAuth: vi.fn(async () => ({ success: true, userId: "u1", supabase: {} })),
}))

vi.mock("@/src/db/programRepo", () => ({
  enrollInProgram,
  listActiveEnrollments: vi.fn(async () => []),
  listPastEnrollments: vi.fn(async () => []),
}))

import { POST } from "@/app/api/programs/enrollments/route"

const A_WEEK = {
  kind: "linear_rotation",
  days: [
    {
      id: "d1",
      label: "Full body",
      exercises: [
        {
          id: "lib_push_up",
          name: "Push-up",
          metricType: "load",
          scheme: { kind: "linear", sets: 3, reps: 10 },
          progression: {
            kind: "linear_load",
            incrementKg: 2.5,
            incrementLb: 5,
            deloadAfterFails: 3,
            deloadPct: 0.1,
          },
        },
      ],
    },
  ],
}

async function post(body: Record<string, unknown>) {
  const res = await POST(
    new Request("http://x/api/programs/enrollments", { method: "POST", body: JSON.stringify(body) })
  )
  return { status: res.status, body: (await res.json()) as { error?: string } }
}

const base = { programId: "stronglifts-5x5", level: "intermediate", unitSystem: "kg" }

beforeEach(() => {
  enrollInProgram.mockClear()
})

describe("starting a program", () => {
  it("lets a bodyweight lift through at zero, with the zero intact", async () => {
    const res = await post({ ...base, workingWeights: { lib_push_up: 0 } })

    expect(res.status).toBe(201)
    const sent = enrollInProgram.mock.calls[0]?.[1] as { workingWeights: Record<string, number> }
    // Not "falsy so dropped" — the number zero, which is what a push-up weighs.
    expect(sent.workingWeights.lib_push_up).toBe(0)
  })

  it("names the lift when a weight is refused", async () => {
    const res = await post({ ...base, workingWeights: { lib_push_up: -1 } })

    expect(res.status).toBe(400)
    // The old answer was "Validation failed", on a form with one box per lift.
    expect(res.body.error).toContain("workingWeights.lib_push_up")
    expect(enrollInProgram).not.toHaveBeenCalled()
  })

  it("names the field when a self-built week arrives with no name", async () => {
    const res = await post({ programId: "custom", level: "intermediate", unitSystem: "kg", customSchedule: A_WEEK })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/^label: /)
    expect(res.body.error).toMatch(/give this week a name/i)
    expect(enrollInProgram).not.toHaveBeenCalled()
  })

  it("carries the name through to the repo when there is one", async () => {
    const res = await post({
      programId: "custom",
      level: "intermediate",
      unitSystem: "kg",
      customSchedule: A_WEEK,
      label: "Winter block",
    })

    expect(res.status).toBe(201)
    const sent = enrollInProgram.mock.calls[0]?.[1] as { label?: string }
    // Without this the repo falls back to the catalogue shell and every
    // self-built week in the app is called "Your own program".
    expect(sent.label).toBe("Winter block")
  })
})
