/**
 * LOG OUT LANDS ON THE FRONT PAGE EVERY TIME (Plans/tests-green-and-fast.md, F9).
 *
 * Signing out through a server action made Next re-render the page the person
 * stood on without a session, so the proxy sent that page to /auth/login and
 * it sometimes beat Log Out's own move to "/". Signing out is now a plain
 * request that touches no page.
 */
import { afterEach, expect, test, vi } from "vitest"

import { signOut } from "@/src/db/signOutRequest"

afterEach(() => vi.unstubAllGlobals())

test("signs out with a POST to the route handler", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true })))
  vi.stubGlobal("fetch", fetchMock)
  expect(await signOut()).toEqual({ ok: true })
  expect(fetchMock).toHaveBeenCalledWith("/api/auth/sign-out", expect.objectContaining({ method: "POST" }))
})

test("a refusing server is not ok, and an unreachable one rejects (Log Out handles both)", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 500 })))
  expect(await signOut()).toEqual({ ok: false })
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))))
  await expect(signOut()).rejects.toThrow()
})
