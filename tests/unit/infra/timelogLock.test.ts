/**
 * THE TIME LOG'S GUARD TESTS CHANGE ONLY WITH THE OWNER'S YES
 * (scripts/ci/timelog-lock.mjs; his answer, 2026-11-28).
 *
 * The judge first, on commits written out here; then the real thing, on a
 * throwaway git repository, the way CI runs it; then that CI and the commit
 * hook still run it, so dropping the step is a red test too.
 */
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterEach, describe, expect, test } from "vitest"

import { judgeCommit, onlyRemovesFailMarks } from "../../../scripts/ci/timelog-lock.mjs"

const GUARD = "tests/e2e/timelog-guard/stories.spec.ts"
const APPROVED = 'Time Log: change a story\n\nOwner-approved: "yes, change it" (2026-11-28)\n'
const changed = (path: string, diff = "@@ -1 +1 @@\n-old\n+new\n") => ({ path, status: "M", diff })

describe("the judge", () => {
  test("a changed guard test without the owner's line is refused", () => {
    expect(judgeCommit({ message: "Time Log: change a story\n", files: [changed(GUARD)] }).ok).toBe(false)
  })

  test("a changed guard test with the owner's line passes", () => {
    expect(judgeCommit({ message: APPROVED, files: [changed(GUARD)] }).ok).toBe(true)
  })

  test("a change to a file that is not locked passes without the line", () => {
    expect(judgeCommit({ message: "Time Log: fix\n", files: [changed("src/timetrack/components/TimerBar.tsx")] }).ok).toBe(true)
  })

  test("a photo, a clock trap and the lock itself are locked too", () => {
    for (const path of [
      "tests/e2e/timelog-guard/photos/__screens__/timelog-photos-phone/timer.png",
      "tests/unit/timetrack/clock-traps/clockTraps.ts",
      "scripts/ci/timelog-lock.mjs",
      ".husky/commit-msg",
    ]) {
      expect(judgeCommit({ message: "x\n", files: [{ path, status: "M", diff: "" }] }).ok, path).toBe(false)
    }
  })

  test("a line that only names the approval, without his quoted words, is not his yes", () => {
    expect(judgeCommit({ message: "x\n\nOwner-approved: yes\n", files: [changed(GUARD)] }).ok).toBe(false)
  })

  test("a fixed bug's one-line test.fail mark may be deleted without the line", () => {
    const diff = "@@ -73 +72,0 @@\n-    test.fail(true, 'BUG A1-1: Undo of a delete puts back the old whole row')\n"
    expect(judgeCommit({ message: "Time Log: A1-1 fixed\n", files: [changed(GUARD, diff)] }).ok).toBe(true)
  })

  test("a test.fail( declaration may become test( without the line", () => {
    expect(onlyRemovesFailMarks("@@ -89 +89 @@\n-  test.fail(\n+  test(\n")).toBe(true)
    expect(onlyRemovesFailMarks("@@ -114 +114 @@\n-  it.fails(\"an end typed\", () => {\n+  it(\"an end typed\", () => {\n")).toBe(true)
  })

  test("adding a test.fail mark, or deleting a mark with anything else, needs the line", () => {
    expect(onlyRemovesFailMarks("@@ -72,0 +73 @@\n+    test.fail(true, 'new bug')\n")).toBe(false)
    expect(onlyRemovesFailMarks("@@ -73,2 +72,0 @@\n-    test.fail(true, 'BUG')\n-    expect(x).toBe(1)\n")).toBe(false)
    expect(onlyRemovesFailMarks("@@ -89 +89 @@\n-  test.fail(\n+  test.skip(\n")).toBe(false)
  })

  test("a mark deleted together with code on its line, or code slipped in beside it, needs the line", () => {
    expect(onlyRemovesFailMarks("@@ -73 +72,0 @@\n-    test.fail(true, 'BUG'); expect(a).toBe(b)\n")).toBe(false)
    expect(onlyRemovesFailMarks("@@ -73 +73 @@\n-test.fail(true, 'BUG')\n+++counter\n")).toBe(false)
  })

  test("a new or deleted guard file needs the line even when its text is only marks", () => {
    const diff = "@@ -0,0 +1 @@\n+test.fail()\n"
    expect(judgeCommit({ message: "x\n", files: [{ path: GUARD, status: "A", diff }] }).ok).toBe(false)
  })
})

describe("on a real repository, as CI runs it", () => {
  let repo = ""
  afterEach(() => {
    if (repo) rmSync(repo, { recursive: true, force: true })
    repo = ""
  })

  const lock = join(process.cwd(), "scripts/ci/timelog-lock.mjs")
  /**
   * Git's own variables are dropped: run from a git hook (the pre-commit's unit
   * tests), GIT_DIR and GIT_INDEX_FILE point at the real repository, and every
   * command here would commit into it instead of the throwaway one.
   */
  const env: NodeJS.ProcessEnv = {
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))),
    NODE_ENV: "test",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
  }
  const run = (cmd: string, args: string[]) => {
    const result = spawnSync(cmd, args, { cwd: repo, encoding: "utf8", env })
    return { status: result.status, out: result.stdout + result.stderr }
  }
  const commit = (path: string, text: string, message: string) => {
    mkdirSync(dirname(join(repo, path)), { recursive: true })
    writeFileSync(join(repo, path), text)
    run("git", ["add", "-A"])
    const made = run("git", ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "core.hooksPath=/dev/null", "commit", "-q", "-m", message])
    expect(made.status, made.out).toBe(0)
  }

  test("a range holding one unapproved change to a guard test is refused, and names it", () => {
    repo = mkdtempSync(join(tmpdir(), "timelog-lock-"))
    run("git", ["init", "-q", "-b", "main"])
    commit(GUARD, "test('a', () => {})\n", "start")
    const base = run("git", ["rev-parse", "HEAD"]).out.trim()
    commit("src/a.ts", "export const a = 1\n", "unrelated")
    commit(GUARD, "test('a', () => { expect(1).toBe(1) })\n", APPROVED)
    expect(run("node", [lock, "--range", `${base}..HEAD`]).status, "approved and unrelated commits were refused").toBe(0)

    commit("tests/e2e/timelog-guard/café.spec.ts", "test('b', () => {})\n", "a guard file with an unusual name")
    const accented = run("node", [lock, "--range", "HEAD~1..HEAD"])
    expect(accented.status, "a locked file git would quote slipped through").toBe(1)

        commit(GUARD, "test('a', () => {})\n", "quietly undo it")
    const refused = run("node", [lock, "--range", `${base}..HEAD`])
    expect(refused.status).toBe(1)
    expect(refused.out).toContain(GUARD)
  })
})

describe("where it runs", () => {
  test("CI's static job runs it on every commit a push adds, and the commit hook before each commit", () => {
    const ci = readFileSync(".github/workflows/ci.yml", "utf8")
    const staticJob = ci.slice(ci.indexOf("\n  static:"), ci.indexOf("\n  unit:"))
    expect(staticJob).toContain('node scripts/ci/timelog-lock.mjs --range "$(git merge-base origin/main HEAD)..HEAD"')
    expect(readFileSync(".husky/commit-msg", "utf8")).toContain('node scripts/ci/timelog-lock.mjs --staged "$1"')
  })
})
