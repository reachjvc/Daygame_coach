import { describe, expect, it } from "vitest"

import { isStaleSessionCookie } from "@/src/db/supabase"

/**
 * A meaning test, not a shape test: the whole point is the DIFFERENCE between
 * two cookies whose names share a prefix.
 *
 * Get it wrong in one direction and a stale session survives, which is the bug
 * that broke a confirmation link on 2026-09-03. Get it wrong in the other and
 * the PKCE code-verifier is dropped, which breaks EVERY confirmation link --
 * a far worse outcome, and one a prefix match would cause silently.
 */
const REF = "sb-vcjzbmtcgmjrvvklzqaq"

describe("isStaleSessionCookie", () => {
  it("drops the session token", () => {
    expect(isStaleSessionCookie(`${REF}-auth-token`)).toBe(true)
  })

  it("drops the chunked session token, which is how large sessions are stored", () => {
    expect(isStaleSessionCookie(`${REF}-auth-token.0`)).toBe(true)
    expect(isStaleSessionCookie(`${REF}-auth-token.1`)).toBe(true)
    expect(isStaleSessionCookie(`${REF}-auth-token.11`)).toBe(true)
  })

  it("KEEPS the code verifier -- dropping it breaks every confirmation link", () => {
    expect(isStaleSessionCookie(`${REF}-auth-token-code-verifier`)).toBe(false)
  })

  it("leaves unrelated cookies alone", () => {
    expect(isStaleSessionCookie("__next_hmr_refresh_hash__")).toBe(false)
    expect(isStaleSessionCookie("postLoginNext")).toBe(false)
    expect(isStaleSessionCookie("")).toBe(false)
  })

  it("does not match a name that merely contains the token text", () => {
    // Must anchor at the end: a future cookie called "...-auth-token-backup"
    // is not a session and must not be silently discarded.
    expect(isStaleSessionCookie(`${REF}-auth-token-backup`)).toBe(false)
  })
})
