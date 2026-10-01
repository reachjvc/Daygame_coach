import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { execFileSync } from "child_process"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync, existsSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

/**
 * THE GATE'S DECISION, WITHOUT RUNNING THE SUITE.
 *
 * `.claude/hooks/check-test-results.sh` decides whether a turn that is about to
 * end should have its tests run. On 2026-10-01 it was deciding with
 * `git diff --name-only HEAD`, which does not list untracked files: a session
 * that added one new `.ts` file and nothing else got 0 and the gate ran nothing.
 * `git status --porcelain` on its own does not fix it either, because git
 * collapses an untracked DIRECTORY into one entry (`?? app/test/zzbuildprobe/`)
 * that no `.ts` pattern can match.
 *
 * Both of those are shapes of working tree, so this test builds real ones in a
 * throwaway git repo and asks the hook with `--explain`, which prints the
 * decision and runs nothing. The hook is copied in rather than invoked in place
 * because it pins itself to its own repo root: a copy under <tmp>/.claude/hooks
 * treats <tmp> as the repo, which is the whole point.
 */

const HOOKS = ["check-test-results.sh", "session-key.sh"]
let repo: string

/**
 * Every git variable the caller may have set, removed.
 *
 * This suite runs inside `.husky/pre-commit`, where git exports GIT_DIR and
 * GIT_INDEX_FILE pointing at the REAL repository. The first version of this file
 * inherited them: `git init` in the temp directory re-initialised the shared
 * checkout's .git and `git add` wrote to the shared index. It failed loudly,
 * which is the only reason it did no damage. A test that builds a git repo must
 * say which repo it means.
 */
const cleanEnv = (): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: repo }
  for (const key of Object.keys(env)) {
    if (key.startsWith("GIT_")) delete env[key]
  }
  return env
}

const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: repo, encoding: "utf8", env: cleanEnv() })

const ask = (): string =>
  execFileSync(join(repo, ".claude/hooks/check-test-results.sh"), ["--explain"], {
    cwd: repo,
    encoding: "utf8",
    env: cleanEnv(),
    input: JSON.stringify({ session_id: "gate-test" }),
  }).trim()

beforeAll(() => {
  repo = mkdtempSync(join(tmpdir(), "gate-"))
  mkdirSync(join(repo, ".claude/hooks"), { recursive: true })
  for (const hook of HOOKS) {
    copyFileSync(join(process.cwd(), ".claude/hooks", hook), join(repo, ".claude/hooks", hook))
  }
  writeFileSync(join(repo, "README.md"), "seed\n")
  git("init", "-q", ".")
  git("add", "README.md")
  git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "seed")
})

afterAll(() => {
  if (repo && existsSync(repo)) rmSync(repo, { recursive: true, force: true })
})

describe("the end-of-turn test gate", () => {
  it("runs nothing when only the hooks themselves are sitting there", () => {
    expect(ask()).toContain("skip: no code files changed")
  })

  it("runs nothing for a documentation edit", () => {
    writeFileSync(join(repo, "notes.md"), "a doc change is not code\n")
    expect(ask()).toContain("skip: no code files changed")
  })

  it("runs the suite for a brand-new untracked .ts file", () => {
    // The original defect: `git diff` cannot see this file at all.
    writeFileSync(join(repo, "fresh.ts"), "export const a = 1\n")
    expect(ask()).toContain("run:")
    rmSync(join(repo, "fresh.ts"))
  })

  it("runs the suite for a .ts file inside a brand-new untracked directory", () => {
    // The half-fix's defect: default porcelain prints `?? newdir/` and the
    // extension pattern cannot match a directory.
    mkdirSync(join(repo, "newdir/sub"), { recursive: true })
    writeFileSync(join(repo, "newdir/sub/inside.ts"), "export const b = 2\n")
    expect(ask()).toContain("run:")
  })

  it("asks only once per turn, and only for this session", () => {
    const key = execFileSync("sha256sum", [], { input: "gate-test", encoding: "utf8" }).slice(0, 16)
    const marker = join(process.env.TMPDIR ?? "/tmp", `.claude-test-check-${key}`)
    writeFileSync(marker, "")
    try {
      expect(ask()).toContain("skip: already checked this turn")
    } finally {
      rmSync(marker, { force: true })
    }
    // Cleared again, the same tree decides the same way as before the marker.
    expect(ask()).toContain("run:")
  })

  it("keys that marker by session, so three sessions cannot silence each other", () => {
    const source = execFileSync("cat", [join(process.cwd(), ".claude/hooks/session-key.sh")], {
      encoding: "utf8",
    })
    expect(source).toContain("sha256sum")
    expect(
      execFileSync(join(process.cwd(), ".claude/hooks/clear-test-marker.sh"), [], {
        input: JSON.stringify({ session_id: "gate-test" }),
        encoding: "utf8",
        env: cleanEnv(),
      }),
    ).toBe("")
  })
})
