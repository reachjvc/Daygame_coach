/**
 * THE SESSION ENDPOINT REFUSES A BODY OF THE WRONG SHAPE — AND STARTS NOTHING.
 *
 * Moved here from `tests/e2e/security-input.spec.ts`, whose two surviving tests
 * sent a request through a browser and accepted 400 or 422. The shape rule is
 * `CreateSessionSchema` and the status is the route's, so both are checked
 * here: the schema's verdict, then the real POST handler answering 400 without
 * reaching the code that opens a session. The browser versions also left a
 * session running on the shared account whenever they passed by accident;
 * these cannot.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const { createSession } = vi.hoisted(() => ({
  createSession: vi.fn(async () => ({ id: "s1" })),
}))

vi.mock("@/src/db/auth", () => ({
  requireAuth: vi.fn(async () => ({ success: true, userId: "u1", supabase: {} })),
}))
vi.mock("@/src/tracking/trackingService", () => ({
  createSession,
  getUserSessions: vi.fn(async () => []),
}))

import { POST } from "@/app/api/tracking/session/route"
import { CreateSessionSchema } from "@/src/tracking/schemas"

async function post(body: unknown) {
  const res = await POST(
    new NextRequest("http://x/api/tracking/session", { method: "POST", body: JSON.stringify(body) }),
  )
  return { status: res.status, body: (await res.json()) as { error?: string } }
}

beforeEach(() => {
  createSession.mockClear()
})

describe("starting a session with a body of the wrong shape", () => {
  it("rejects string where number expected", async () => {
    const body = { goal: "five", location: "Test" }
    expect(CreateSessionSchema.safeParse(body).success).toBe(false)

    const res = await post(body)
    expect(res.status).toBe(400)
    expect(res.body.error).toBe("Invalid request body")
    expect(createSession).not.toHaveBeenCalled()
  })

  it("handles null values appropriately", async () => {
    // A null goal is not "no goal": the field is optional, so absent is the
    // only way to leave it out.
    const body = { goal: null, location: null }
    expect(CreateSessionSchema.safeParse(body).success).toBe(false)

    const res = await post(body)
    expect(res.status).toBe(400)
    expect(createSession).not.toHaveBeenCalled()
  })

  it("starts one for the same request with the goal as a number", async () => {
    // The control: the refusals above are about the shape, not about this
    // harness refusing everything.
    const res = await post({ goal: 5 })
    expect(res.status).toBe(200)
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({ user_id: "u1", goal: 5 }))
  })
})
