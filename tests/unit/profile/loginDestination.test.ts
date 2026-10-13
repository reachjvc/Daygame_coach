/**
 * Where someone lands the moment they sign in.
 *
 * Two callers ask this question -- the /redirect page and the login form's API
 * call -- and the whole point of the shared function is that they cannot drift
 * apart. These tests are what stops the drift: they cover the decisions, not
 * the plumbing.
 */

import { describe, test, expect, vi, beforeEach } from "vitest"
import { resolveLoginDestination } from "@/src/profile/loginDestinationService"

const getUser = vi.fn()

vi.mock("@/src/db/server", () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser: () => getUser() } }),
}))

const signedIn = () => getUser.mockResolvedValue({ data: { user: { id: "u1" } } })

beforeEach(() => {
  getUser.mockReset()
})

describe("resolveLoginDestination", () => {
  test("nobody signed in -> null, which is not a path", async () => {
    // Null rather than "/auth/login": that string is also a legitimate
    // destination, so a caller could not tell "signed out" from "go to login".
    getUser.mockResolvedValue({ data: { user: null } })

    expect(await resolveLoginDestination("/dashboard")).toBeNull()
  })

  test("signing in never diverts to the dating questions", async () => {
    /* THE REGRESSION THIS EXISTS FOR. This used to send anyone without
       `onboarding_completed` to `/preferences`. The five-step wizard that set
       that flag was deleted on 2026-09-08 and nothing writes it any more, so
       the branch sent EVERY account there on EVERY login -- including straight
       after saving on that very page. The questions are read only by
       `scenariosService`, so they are asked at the scenario door instead. */
    signedIn()

    expect(await resolveLoginDestination()).toBe("/dashboard")
    expect(await resolveLoginDestination("/dashboard/settings")).toBe("/dashboard/settings")
  })

  test("an off-site 'next' is refused, so login cannot be used to bounce someone to a phishing page", async () => {
    signedIn()

    expect(await resolveLoginDestination("//evil.example")).toBe("/dashboard")
    expect(await resolveLoginDestination("https://evil.example")).toBe("/dashboard")
    expect(await resolveLoginDestination("/\\evil.example")).toBe("/dashboard")
  })
})
