import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * SHAPE TEST -- and deliberately labelled as one.
 *
 * It proves the attribute strings are present in the files. It cannot prove a
 * password manager offers to save anything; only a human with 1Password or iOS
 * Keychain can confirm that, and that check is P6 in docs/plans/auth-polish.md.
 *
 * It exists because the attributes were absent from all four pages and nothing
 * noticed. The failure it guards is silent: without them, password managers do
 * not offer to fill, and on a phone every visit means typing a password by
 * hand. Nothing errors, nothing logs, and no other test would fail.
 *
 * `username` on the login email field is not a typo -- it is the value password
 * managers look for to pair an address with a stored password.
 */
const ROOT = join(__dirname, "../../..")

const EXPECTED: Record<string, string[]> = {
  "app/auth/sign-up/page.tsx": [
    'autoComplete="name"',
    'autoComplete="email"',
    'autoComplete="new-password"',
  ],
  "app/auth/login/LoginPageClient.tsx": [
    'autoComplete="username"',
    'autoComplete="current-password"',
  ],
  "app/auth/forgot-password/page.tsx": ['autoComplete="email"'],
  "app/auth/reset-password/page.tsx": ['autoComplete="new-password"'],
}

describe("auth pages declare autocomplete for password managers", () => {
  for (const [file, attributes] of Object.entries(EXPECTED)) {
    for (const attribute of attributes) {
      it(`${file} uses ${attribute}`, () => {
        const source = readFileSync(join(ROOT, file), "utf8")
        expect(source).toContain(attribute)
      })
    }
  }

  it("both password fields on signup are marked new-password, not current", () => {
    const source = readFileSync(join(ROOT, "app/auth/sign-up/page.tsx"), "utf8")
    // Two fields: password and repeat. Marking either "current-password" makes
    // managers offer the saved password on a form that is creating a new one.
    expect(source.match(/autoComplete="new-password"/g)).toHaveLength(2)
    expect(source).not.toContain('autoComplete="current-password"')
  })
})
