import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "fs"
import { join, relative } from "path"

/**
 * A DATABASE TEST THAT EXPECTS A REFUSAL NAMES WHICH ONE.
 *
 * `await expect(insert(...)).rejects.toThrow()` passes on ANY error: a typo in
 * the SQL, a missing column, a connection that went to the wrong container. On
 * 2026-09-20 one such test passed on a foreign-key error from a cross-run
 * container mix-up while claiming to prove a NOT NULL it never reached, and on
 * 2026-10-13 another (programRepo's "not to one that does not exist") turned out
 * to be refused by a trigger, not by the foreign key its name claimed. Naming
 * the constraint or the SQLSTATE — `.rejects.toMatchObject({ code: "23505",
 * constraint: "uq_user_goals_template" })` — is what makes the test fail when
 * the refusal comes from somewhere else.
 *
 * Scans every file under tests/integration. Comments are ignored, so a file may
 * still explain why a bare matcher was wrong.
 */

const ROOT = process.cwd()
const SCOPE = "tests/integration"

/** A matcher that accepts any error at all. */
const UNNAMED_REFUSAL =
  /\.(?:toThrow|toThrowError)\(\s*\)|\.rejects\s*\.\s*(?:toBeTruthy|toBeDefined)\(\s*\)|\.rejects\s*\.\s*toBeInstanceOf\(\s*Error\s*\)/g

/** Blank out comments, keeping every newline so line numbers still point at the source. */
function withoutComments(src: string): string {
  const blank = (s: string) => s.replace(/[^\n]/g, " ")
  return src.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|[^:])(\/\/[^\n]*)/g, (_m, lead, c) => lead + blank(c))
}

/** `file:line` for every unnamed refusal in `src`. */
function unnamedRefusals(file: string, src: string): string[] {
  const code = withoutComments(src)
  return [...code.matchAll(UNNAMED_REFUSAL)].map((m) => `${file}:${code.slice(0, m.index).split("\n").length}`)
}

function filesUnder(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && /\.tsx?$/.test(e.name))
    .map((e) => join(e.parentPath, e.name))
}

describe("integration tests name the refusal they expect", () => {
  it("catches the shapes it exists for, and lets named refusals and comments through", () => {
    const planted = [
      `await expect(q("INSERT ...")).rejects.toThrow()`,
      `await expect(q("INSERT ...")).rejects.toThrow(\n  )`,
      `expect(() => run()).toThrow()`,
      `await expect(p).rejects.toThrowError()`,
      `await expect(p).rejects.toBeTruthy()`,
      `await expect(p).rejects.toBeDefined()`,
      `await expect(p).rejects.toBeInstanceOf(Error)`,
    ].join("\n")
    expect(unnamedRefusals("planted.ts", planted)).toEqual([
      "planted.ts:1",
      "planted.ts:2",
      "planted.ts:4",
      "planted.ts:5",
      "planted.ts:6",
      "planted.ts:7",
      "planted.ts:8",
    ])

    const fine = [
      `await expect(p).rejects.toThrow(/uq_user_goals_template/)`,
      `await expect(p).rejects.toMatchObject({ code: "23505", constraint: "uq_user_goals_template" })`,
      `// a bare .rejects.toThrow() passed on the wrong error`,
      `/* never .toThrow() */ await expect(p).rejects.toThrow("append-only")`,
      `const url = "http://example.test"; await expect(p).rejects.toThrow(/x/)`,
    ].join("\n")
    expect(unnamedRefusals("fine.ts", fine)).toEqual([])
  })

  it("finds none under tests/integration", () => {
    const files = filesUnder(SCOPE)
    // The scan read the suite at all — an empty walk would pass over nothing.
    expect(files.filter((f) => f.endsWith(".integration.test.ts")).length).toBeGreaterThan(5)

    const offenders = files.flatMap((f) => unnamedRefusals(relative(ROOT, f), readFileSync(f, "utf8")))
    expect(
      offenders,
      "These accept ANY error as the refusal. Name what refuses: " +
        '`.rejects.toMatchObject({ code: "<SQLSTATE>", constraint: "<name>" })` or ' +
        "`.rejects.toThrow(/<constraint_name>/)`.\n" +
        offenders.join("\n"),
    ).toEqual([])
  })
})
