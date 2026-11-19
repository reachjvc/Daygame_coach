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
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
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
    const run = spawnSync("sh", ["-e", "pre-commit"], { cwd: dir, env, encoding: "utf8" })
    expect(run.status, run.stdout + run.stderr).toBe(0)
  })
})
