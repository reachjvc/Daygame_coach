// @vitest-environment jsdom
/**
 * THE FOUR AUTH FORMS, RENDERED, AND WHAT EACH INPUT TELLS A PASSWORD MANAGER.
 *
 * The failure this guards is silent: the `autocomplete` attributes were absent
 * from all four pages and nothing noticed. Without them password managers do
 * not offer to fill, and on a phone every visit means typing a password by
 * hand. Nothing errors, nothing logs.
 *
 * The earlier version read the page sources for the attribute strings. That
 * passed for a string in a comment, could not see an input that lost its
 * attribute while a sibling kept the same one, and never looked at the reset
 * form's second field. These render each form and read every input it puts in
 * the DOM, so a new field without an attribute fails too.
 *
 * What this cannot prove is that a manager actually offers to save; only a
 * human with 1Password or iOS Keychain can confirm that.
 *
 * `username` on the login email field is not a typo — it is the value password
 * managers look for to pair an address with a stored password. Both password
 * fields on signup and reset are `new-password`: marking either
 * `current-password` makes managers offer the saved password on a form that is
 * creating a new one.
 */

import { cleanup, render, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import ForgotPasswordPage from "@/app/auth/forgot-password/page"
import LoginPageClient from "@/app/auth/login/LoginPageClient"
import ResetPasswordPage from "@/app/auth/reset-password/page"
import SignUpPage from "@/app/auth/sign-up/page"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

// The reset form only renders once the browser client confirms a recovery
// session; give it one. No other page calls the client until submit.
vi.mock("@/src/db", () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "u1" } }, error: null }),
    },
  }),
}))

afterEach(cleanup)

/** Every input the form renders, keyed by id, with its autocomplete value. */
function autocompleteById(container: HTMLElement): Record<string, string | null> {
  const form = container.querySelector("form")
  expect(form, "the page rendered no form").not.toBeNull()
  return Object.fromEntries(
    Array.from(form!.querySelectorAll("input")).map((input) => [
      input.id,
      input.getAttribute("autocomplete"),
    ]),
  )
}

describe("auth forms declare autocomplete for password managers", () => {
  it("sign-up: name, email, and two new-password fields", () => {
    const { container } = render(<SignUpPage />)
    expect(autocompleteById(container)).toEqual({
      fullName: "name",
      email: "email",
      password: "new-password",
      "repeat-password": "new-password",
    })
  })

  it("login: the email is the username, the password is the current one", () => {
    const { container } = render(<LoginPageClient />)
    expect(autocompleteById(container)).toEqual({
      email: "username",
      password: "current-password",
    })
  })

  it("forgot-password: email", () => {
    const { container } = render(<ForgotPasswordPage />)
    expect(autocompleteById(container)).toEqual({ email: "email" })
  })

  it("reset-password: both fields are new-password", async () => {
    const { container } = render(<ResetPasswordPage />)
    await waitFor(() => expect(container.querySelector("form")).not.toBeNull())
    expect(autocompleteById(container)).toEqual({
      password: "new-password",
      "repeat-password": "new-password",
    })
  })
})
