// @vitest-environment node
/**
 * THE PRE-COMMIT HOOK LETS A COMMIT WITH NO CODE THROUGH.
 *
 * Husky runs hooks with `sh -e`. On 2026-11-18 the hook picked the staged code
 * files with `code=$(… | grep …)`; with no code staged, grep exits 1, `sh -e`
 * stops there, and the commit is refused with no message at all. Every commit
 * of only plans or docs failed that way, and `sh .husky/pre-commit` (no `-e`),
 * which is how the hook was timed, passed. So this runs it the way Husky does.
 */
import { spawnSync } from "node:child_process"
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { afterAll, describe, expect, it } from "vitest"

const hook = resolve(__dirname, "../../../.husky/pre-commit")
const dir = mkdtempSync(join(tmpdir(), "pre-commit-"))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

const env = { ...process.env, NODE_ENV: "test" as const, GIT_DIR: undefined, GIT_INDEX_FILE: undefined, GIT_WORK_TREE: undefined }
const git = (...args: string[]) => spawnSync("git", args, { cwd: dir, env, encoding: "utf8" })

describe("the pre-commit hook, run as Husky runs it (sh -e)", () => {
  it("passes a commit that stages only a plan", () => {
    git("init", "-q")
    mkdirSync(join(dir, "Plans"))
    writeFileSync(join(dir, "Plans/x.md"), "# x\n")
    git("add", "Plans/x.md")
    copyFileSync(hook, join(dir, "pre-commit"))
    mkdirSync(join(dir, "scripts"))
    copyFileSync(resolve(__dirname, "../../../scripts/related-tests.mjs"), join(dir, "scripts/related-tests.mjs"))
    const run = spawnSync("sh", ["-e", "pre-commit"], { cwd: dir, env, encoding: "utf8" })
    expect(run.status, run.stdout + run.stderr).toBe(0)
  })

  it("keeps a path with a space whole, and sees a staged deletion", () => {
    mkdirSync(join(dir, "Plans"), { recursive: true })
    writeFileSync(join(dir, "Plans/a b.md"), "# y\n")
    writeFileSync(join(dir, "Plans/old.md"), "# z\n")
    git("add", "Plans/old.md")
    git("-c", "user.email=a@b", "-c", "user.name=t", "commit", "-q", "--no-verify", "-m", "x")
    git("rm", "-q", "Plans/old.md")
    git("add", "Plans/a b.md")
    const run = spawnSync("sh", ["-e", "pre-commit"], { cwd: dir, env, encoding: "utf8" })
    expect(run.status, run.stdout + run.stderr).toBe(0)
    expect(run.stdout).toContain("No unit test imports or reads the staged files.")
  })

  describe("lint at commit (scripts/lint-ratchet.mjs --files)", () => {
    // A stand-in lint script that records its arguments, so this tests the
    // hook's wiring (which paths, when, what a failure does), not eslint.
    const stub = `import { appendFileSync } from "node:fs"
appendFileSync("lint-calls.txt", JSON.stringify(process.argv.slice(2)) + "\\n")
process.exit(process.env.LINT_FAIL ? 1 : 0)
`
    const repo = mkdtempSync(join(dir, "lint-"))
    const g = (...args: string[]) => spawnSync("git", args, { cwd: repo, env, encoding: "utf8" })
    const hookRun = (extra: Record<string, string> = {}) =>
      spawnSync("sh", ["-e", "pre-commit"], { cwd: repo, env: { ...env, ...extra }, encoding: "utf8" })
    const calls = () => {
      try {
        return readFileSync(join(repo, "lint-calls.txt"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l) as string[])
      } catch {
        return []
      }
    }
    const reset = () => rmSync(join(repo, "lint-calls.txt"), { force: true })
    const write = (name: string, text = "export const a = 1\n") => {
      mkdirSync(dirname(join(repo, name)), { recursive: true })
      writeFileSync(join(repo, name), text)
    }

    it("sets up", () => {
      g("init", "-q")
      copyFileSync(hook, join(repo, "pre-commit"))
      mkdirSync(join(repo, "scripts"))
      copyFileSync(resolve(__dirname, "../../../scripts/related-tests.mjs"), join(repo, "scripts/related-tests.mjs"))
      writeFileSync(join(repo, "scripts/lint-ratchet.mjs"), stub)
      write("src/old.ts")
      write("src/gone.ts")
      g("add", "src/old.ts", "src/gone.ts")
      g("-c", "user.email=a@b", "-c", "user.name=t", "commit", "-q", "--no-verify", "-m", "x")
    })

    it("lints one staged src file, passing --files and its path", () => {
      write("src/a.ts")
      g("add", "src/a.ts")
      const run = hookRun()
      expect(run.status, run.stdout + run.stderr).toBe(0)
      expect(calls()).toEqual([["--files", "src/a.ts"]])
      g("reset", "-q")
      reset()
    })

    it("lints a scripts/ .mjs file and 5 files in one go, and a name with a space whole", () => {
      // src/a.ts is still on disk from the test above, so `git add src` stages it too.
      for (const f of ["src/b.ts", "src/c.tsx", "scripts/d.mjs", "src/e f.js", "src/g.ts"]) write(f)
      g("add", "src")
      g("add", "scripts/d.mjs")
      const run = hookRun()
      expect(run.status, run.stdout + run.stderr).toBe(0)
      const all = calls().flat().filter((a) => a !== "--files").sort()
      expect(all).toEqual(["scripts/d.mjs", "src/a.ts", "src/b.ts", "src/c.tsx", "src/e f.js", "src/g.ts"])
      g("reset", "-q")
      reset()
    })

    it("does not lint a staged deletion, and lints the new path of a rename", () => {
      g("rm", "-q", "src/gone.ts")
      let run = hookRun()
      expect(run.status, run.stdout + run.stderr).toBe(0)
      expect(calls()).toEqual([])
      g("mv", "src/old.ts", "src/renamed.ts")
      reset()
      run = hookRun()
      expect(run.status, run.stdout + run.stderr).toBe(0)
      expect(calls().flat()).toEqual(["--files", "src/renamed.ts"])
      g("reset", "-q", "--hard")
      reset()
    })

    it("does not run lint for non-code files or with nothing staged", () => {
      write("notes.md", "# n\n")
      g("add", "notes.md")
      expect(hookRun().status).toBe(0)
      expect(calls()).toEqual([])
      g("reset", "-q")
      expect(hookRun().status).toBe(0)
      expect(calls()).toEqual([])
    })

    it("aborts the commit when lint fails", () => {
      write("src/h.ts")
      g("add", "src/h.ts")
      const run = hookRun({ LINT_FAIL: "1" })
      expect(run.status).toBe(1)
      expect(run.stdout + run.stderr).toContain("Commit aborted")
    })
  })
})
