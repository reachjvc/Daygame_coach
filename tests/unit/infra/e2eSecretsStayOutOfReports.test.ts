import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "fs"
import { join } from "path"

/**
 * CI's Playwright reports are downloadable from this public repo, so nothing a
 * report records may hold a real credential.
 *
 * Two ways it leaked, both verified on 2026-10-13:
 * - Playwright names a typing step after its text (`Fill "<password>"`), and
 *   the HTML report keeps step names even with tracing off. Real passwords go
 *   in through `fillSecret` (tests/e2e/helpers/secret.ts) instead.
 * - A trace records typed values, the login request body and the auth cookies.
 *   Every trace setting is off under CI.
 */

const ROOT = process.cwd()

function filesUnder(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && /\.tsx?$/.test(e.name))
    .map((e) => join(e.parentPath, e.name))
}

// A typing call whose argument is a real credential: `X.password` or a
// `*PASSWORD*` env var. Literal throwaway strings like 'wrongpassword' pass.
const TYPED_SECRET =
  /\.(fill|type|pressSequentially|insertText)\(\s*[^,)]*(\.password\b|PASSWORD)/

describe("e2e secrets stay out of CI reports", () => {
  it("never types a real password with a call that names its step after the text", () => {
    const offenders = filesUnder("tests/e2e").flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .map((line, i) => (TYPED_SECRET.test(line) ? `${file}:${i + 1}` : null))
        .filter((hit): hit is string => hit !== null),
    )
    expect(
      offenders,
      "These lines type a real password with fill/type, which writes it into the " +
        "report's step names. Use fillSecret from tests/e2e/helpers/secret.ts.",
    ).toEqual([])
  })

  it("turns every trace setting off under CI", () => {
    const traceLines = readFileSync(join(ROOT, "playwright.config.ts"), "utf8")
      .split("\n")
      .filter((line) => /^\s*trace:/.test(line))
    expect(traceLines.length).toBeGreaterThan(0)
    for (const line of traceLines) {
      expect(line, "a trace setting records credentials in CI").toMatch(/process\.env\.CI \? 'off'/)
    }
  })

  it("uploads no trace files from CI", () => {
    const dir = join(ROOT, ".github/workflows")
    for (const f of readdirSync(dir)) {
      expect(readFileSync(join(dir, f), "utf8"), `${f} uploads trace files`).not.toMatch(/trace\.zip/)
    }
  })
})
