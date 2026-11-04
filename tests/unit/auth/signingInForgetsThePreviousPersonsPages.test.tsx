// @vitest-environment jsdom
/**
 * SIGNING IN FORGETS THE PAGES KEPT FOR THE PREVIOUS PERSON.
 *
 * The service worker keeps a few pages for opening with no signal, and the
 * kept /time page names the account it was drawn for. Log Out empties those
 * stores, but a session that simply ended does not, and signing in is a
 * client-side transition the worker never sees. So B signed in, opened Time
 * with no signal, and was served A's page (a security review, 2026-11-04).
 * The login page now empties the stores the moment a sign-in succeeds.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import LoginPageClient from "@/app/auth/login/LoginPageClient"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}))
const signIn = vi.hoisted(() => ({ error: null as Error | null }))
vi.mock("@/src/db", () => ({
  createBrowserSupabaseClient: () => ({ auth: { signInWithPassword: async () => ({ error: signIn.error }) } }),
}))

let dropped: string[] = []

beforeEach(() => {
  dropped = []
  signIn.error = null
  vi.stubGlobal("caches", {
    keys: async () => ["app-shell-build1", "someone-elses-store"],
    delete: async (name: string) => (dropped.push(name), true),
  })
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ destination: "/dashboard" }) })))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function logIn() {
  render(<LoginPageClient />)
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "b@example.com" } })
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "Secret123" } })
  fireEvent.submit(screen.getByLabelText(/email/i).closest("form")!)
}

test("a sign-in that succeeds empties the stored pages, and only those", async () => {
  logIn()
  await waitFor(() => expect(dropped, "the previous person's /time page is still stored").toEqual(["app-shell-build1"]))
})

test("a sign-in that is refused leaves them alone", async () => {
  signIn.error = new Error("Invalid login credentials")
  logIn()
  await screen.findByText(/Invalid login credentials|email or password/i)
  expect(dropped).toEqual([])
})
