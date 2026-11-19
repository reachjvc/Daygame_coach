// @vitest-environment node
/**
 * `scripts/lint-ratchet.mjs --files` (what the pre-commit hook runs) must
 * judge a file exactly as the full run does: same finding signature, count per
 * file + signature against eslint-baseline.json, warnings not gated.
 */
import { describe, expect, it } from "vitest"
import { checkFiles } from "../../../scripts/lib/lint-files.mjs"

const cwd = process.cwd()
const FILE = "src/shared/routes.ts" // exists, lints clean in the real baseline
const check = (source: string, baselineFiles: Record<string, Record<string, number>> = {}) =>
  checkFiles([FILE], { files: baselineFiles }, { cwd, readSource: () => source })

const UNUSED = "@typescript-eslint/no-unused-vars: 'foo' is assigned a value but never used."

describe("lint-ratchet file mode", () => {
  it("passes clean text", async () => {
    const r = await check("export const a = 1\n")
    expect(r.added).toEqual([])
    expect(r.checked).toEqual([FILE])
  })

  it("fails a new error, naming file and rule", async () => {
    const r = await check("const foo = 1\nexport {}\n")
    expect(r.added).toEqual([`${FILE}: ${UNUSED}`])
  })

  it("allows what the baseline lists for that file, by count", async () => {
    const src = "const foo = 1\nexport {}\n"
    expect((await check(src, { [FILE]: { [UNUSED]: 1 } })).added).toEqual([])
    const two = "const foo = 1\n{ const foo = 2 }\nexport {}\n"
    const r = await check(two, { [FILE]: { [UNUSED]: 1 } })
    expect(r.added.length).toBe(1)
  })

  it("does not let another file's baseline cover this one", async () => {
    const r = await check("const foo = 1\nexport {}\n", { "src/other.ts": { [UNUSED]: 5 } })
    expect(r.added.length).toBe(1)
  })

  it("skips non-code and missing files", async () => {
    const r = await checkFiles(["README.md", "src/does-not-exist.ts"], { files: {} }, { cwd })
    expect(r.checked).toEqual([])
    expect(r.added).toEqual([])
  })
})
