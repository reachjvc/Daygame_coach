import { describe, expect, it } from "vitest"

import { PASSWORD_MIN_LENGTH, checkPassword, isWeakPasswordError } from "@/src/shared/passwordRules"

/**
 * These assert the exact wording, not just that something was rejected.
 * The message IS the feature: "Add a capital letter." tells someone what to
 * type next, "invalid password" sends them away. A test that only checks for
 * non-null would pass while the page said nothing useful.
 */
describe("checkPassword", () => {
  it("accepts a password that satisfies every rule", () => {
    expect(checkPassword("Xy3zzzzz")).toBeNull()
    expect(checkPassword("CorrectHorse9")).toBeNull()
  })

  it("asks for more characters when it is too short", () => {
    expect(checkPassword("Xy3zzzz")).toBe("Use at least 8 characters.")
    expect(checkPassword("")).toBe("Use at least 8 characters.")
  })

  it("names the missing character class, one at a time", () => {
    expect(checkPassword("XY3ZZZZZ")).toBe("Add a lowercase letter.")
    expect(checkPassword("xy3zzzzz")).toBe("Add a capital letter.")
    expect(checkPassword("Xyzzzzzz")).toBe("Add a number.")
  })

  it("reports length before composition, so the first fix is the obvious one", () => {
    // "Ab1" fails three rules at once. Telling someone to add a number when the
    // real problem is that it is three characters long is a worse message.
    expect(checkPassword("Ab1")).toBe("Use at least 8 characters.")
  })

  it("counts characters, not bytes, so accented input is not penalised", () => {
    // 8 visible characters, all valid classes present.
    expect(checkPassword("Pæssord1")).toBeNull()
  })

  it("exports the minimum so pages can state it without hardcoding a number", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8)
  })
})

describe("isWeakPasswordError", () => {
  it("recognises Supabase's alphabet-dumping message", () => {
    // Verbatim from the live project, 2026-09-04.
    expect(
      isWeakPasswordError(
        "Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789."
      )
    ).toBe(true)
    expect(isWeakPasswordError("Password should be at least 8 characters.")).toBe(true)
    expect(isWeakPasswordError("weak_password")).toBe(true)
  })

  it("leaves unrelated auth errors alone, so they still reach the user", () => {
    expect(isWeakPasswordError("Invalid login credentials")).toBe(false)
    expect(isWeakPasswordError("Email not confirmed")).toBe(false)
    expect(isWeakPasswordError("User already registered")).toBe(false)
  })
})
