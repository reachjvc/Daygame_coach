/**
 * EDITING A PROGRAM THAT IS ALREADY RUNNING.
 *
 * The Templates step accepted the edit on screen and sent nothing. After
 * "StrongLifts 5×5 is running — your version" the editor stayed live: change a
 * lift, change a weight, watch it appear — and the gym went on prescribing
 * what it had before, for ever, with nothing saying so.
 *
 * `EditActiveProgram` had a save, written inline. Two callers, one path now,
 * so the second one cannot be forgotten again.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { saveRunningSchedule } from "@/src/programs/hooks/useEnrollment"
import type { ProgramSchedule } from "@/src/programs/types"

const WEEK: ProgramSchedule = {
  kind: "linear_rotation",
  days: [{ id: "d1", label: "Full body", exercises: [] }],
}

function serving(reply: { ok: boolean; status?: number; body?: unknown } | "throw") {
  const calls: { url: string; init?: RequestInit }[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), init })
      if (reply === "throw") throw new TypeError("Failed to fetch")
      // The list refresh that follows a successful save.
      if (init?.method !== "PUT") return { ok: true, status: 200, json: async () => [] } as unknown as Response
      return {
        ok: reply.ok,
        status: reply.status ?? (reply.ok ? 200 : 500),
        json: async () => reply.body ?? {},
      } as unknown as Response
    })
  )
  return calls
}

beforeEach(() => vi.restoreAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe("saving an edit to a running program", () => {
  it("PUTs the schedule and the weights to that enrollment", async () => {
    const calls = serving({ ok: true })

    const res = await saveRunningSchedule("e1", WEEK, { lib_squat: 60 })

    expect(res.ok).toBe(true)
    const put = calls.find((c) => c.init?.method === "PUT")!
    expect(put.url).toBe("/api/programs/enrollments/e1/schedule")
    expect(JSON.parse(String(put.init?.body))).toEqual({
      customSchedule: WEEK,
      workingWeights: { lib_squat: 60 },
    })
  })

  it("re-reads the shared list, or every other surface shows the old week", async () => {
    const calls = serving({ ok: true })
    await saveRunningSchedule("e1", WEEK, {})
    expect(calls.some((c) => c.init?.method !== "PUT")).toBe(true)
  })

  it("hands back the server's own sentence on a refusal", async () => {
    serving({
      ok: false,
      status: 409,
      body: { error: "Your program moved on while this was being saved — reload and try again" },
    })

    const res = await saveRunningSchedule("e1", WEEK, {})
    expect(res.ok).toBe(false)
    // A refusal here is something a person can act on. A generic message would
    // send them looking for a bug instead of pressing reload.
    expect(res.ok === false && res.error).toMatch(/moved on while this was being saved/)
  })

  it("falls back to a sentence of its own when the server sends none", async () => {
    serving({ ok: false, body: null })
    const res = await saveRunningSchedule("e1", WEEK, {})
    expect(res.ok === false && res.error).toBe("Could not save your changes.")
  })

  it("a request that never arrived says nothing was changed", async () => {
    serving("throw")
    const res = await saveRunningSchedule("e1", WEEK, {})
    expect(res.ok === false && res.error).toMatch(/nothing was changed/i)
  })

  it("null clears the custom week — restoring the catalogue program", async () => {
    const calls = serving({ ok: true })
    await saveRunningSchedule("e1", null, {})
    const put = calls.find((c) => c.init?.method === "PUT")!
    expect(JSON.parse(String(put.init?.body)).customSchedule).toBeNull()
  })
})
