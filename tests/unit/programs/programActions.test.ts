/**
 * THE ANSWER IS THE POINT.
 *
 * Four of the five program buttons used to be `await fetch(...)` with no look
 * at what came back, so a refusal and a success were indistinguishable to the
 * screen. These tests hold the two halves of the fix: the server's own sentence
 * is what comes out on a refusal, and a request that never arrived is reported
 * as not having arrived — never as done.
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import {
  endProgram,
  skipSession,
  resetProgram,
  restartProgram,
  deletePastProgram,
  UNREACHABLE,
} from "@/src/programs/programActions"

function replies(res: Partial<Response> & { json?: () => Promise<unknown> }) {
  // Typed with the arguments fetch is actually called with, so the assertions
  // below about the url and the options are checked rather than `any`.
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async () => res as unknown as Response
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("a refusal is reported in the server's own words", () => {
  it("endProgram returns the server's sentence on a 409 and never reports success", async () => {
    replies({
      ok: false,
      status: 409,
      json: async () => ({ error: "Finish or throw away the workout you have open first" }),
    })
    const res = await endProgram("e1")
    expect(res.ok).toBe(false)
    expect(res.ok === false && res.error).toBe("Finish or throw away the workout you have open first")
  })

  it("falls back to a sentence of its own when the server sends none", async () => {
    replies({ ok: false, status: 500, json: async () => null })
    const res = await skipSession("e1")
    expect(res.ok === false && res.error).toBe("That session was not skipped.")
  })

  it("reset and skip are told apart when the server is silent", async () => {
    replies({ ok: false, status: 500, json: async () => null })
    expect((await resetProgram("e1")) as { error: string }).toMatchObject({
      error: "The program was not reset.",
    })
  })
})

describe("a lost connection", () => {
  it("is reported as could-not-reach, not as done", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch")
      })
    )
    for (const call of [
      () => endProgram("e1"),
      () => skipSession("e1"),
      () => resetProgram("e1"),
      () => restartProgram("e1"),
      () => deletePastProgram("e1"),
    ]) {
      const res = await call()
      expect(res.ok).toBe(false)
      expect(res.ok === false && res.error).toBe(UNREACHABLE)
    }
  })
})

describe("what each action asks the server for", () => {
  it("names the route and the method the server actually has", async () => {
    const f = replies({ ok: true, status: 200, json: async () => ({}) })
    await endProgram("abc")
    expect(f.mock.calls[0]?.[0]).toBe("/api/programs/enrollments/abc")
    expect(f.mock.calls[0]?.[1]?.method).toBe("DELETE")

    await skipSession("abc")
    expect(f.mock.calls[1]?.[0]).toBe("/api/programs/enrollments/abc/action")
    expect(f.mock.calls[1]?.[1]?.body).toBe(JSON.stringify({ action: "skip" }))

    await resetProgram("abc")
    expect(f.mock.calls[2]?.[1]?.body).toBe(JSON.stringify({ action: "reset" }))

    await restartProgram("abc")
    expect(f.mock.calls[3]?.[0]).toBe("/api/programs/enrollments/abc/resume")

    await deletePastProgram("abc")
    expect(f.mock.calls[4]?.[0]).toBe("/api/programs/enrollments/abc?permanent=1")
    expect(f.mock.calls[4]?.[1]?.method).toBe("DELETE")
  })

  it("hands back the body a success carries, so restart can name what it displaced", async () => {
    replies({ ok: true, status: 200, json: async () => ({ displaced: [{ program_id: "stronglifts-5x5" }] }) })
    const res = await restartProgram("e1")
    expect(res.ok).toBe(true)
    expect(res.ok === true && res.data.displaced?.[0]?.program_id).toBe("stronglifts-5x5")
  })

  it("a success with no body at all is still a success", async () => {
    replies({
      ok: true,
      status: 204,
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input")
      },
    })
    expect((await endProgram("e1")).ok).toBe(true)
  })
})
