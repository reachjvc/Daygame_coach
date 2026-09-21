// @vitest-environment node
/**
 * A RULE IN A FILE IS NOT A RULE THAT FIRES.
 *
 * THE FAULT THIS CATCHES. `.claude/hooks/check-code-review.sh` sat in this repo
 * fully written and referenced by nothing — it was not in the `Stop` list in
 * `.claude/settings.json`, so it had never run once. Its partner,
 * `clear-code-review-marker.sh`, ran on every single prompt to clear a marker
 * that nothing ever created. Both looked like enforcement. Neither was.
 *
 * So this file asserts two different things, and the second is the one that
 * matters most:
 *
 *   1. `never.py` denies the commands it exists to deny, and — just as
 *      important — does NOT deny the near-misses that must keep working. A
 *      hook that blocks `git add <path>` would get switched off within a day.
 *   2. Every executable in `.claude/hooks/` is actually wired into
 *      `settings.json`. That is the assertion that would have caught the dead
 *      hook above, and it fires on the next orphan too.
 *
 * WHY IT SHELLS OUT INSTEAD OF IMPORTING. The hook is Python, and the thing
 * that needs to be true is the contract Claude Code uses: JSON on stdin, JSON
 * on stdout, exit 0. Testing a Python function from TypeScript would mean
 * reimplementing that contract in the test, which is a stand-in for it.
 */

import { describe, it, expect } from "vitest"
import { execFileSync } from "node:child_process"
import { readFileSync, readdirSync } from "node:fs"
import { join, resolve } from "node:path"

const root = resolve(__dirname, "../../..")
const HOOK = join(root, ".claude/hooks/never.py")

/** Runs the hook exactly as Claude Code does. Returns the deny reason, or null
 *  when the hook stayed silent (which is how it permits something). */
function ask(tool_name: string, tool_input: Record<string, unknown>): string | null {
  const out = execFileSync("python3", [HOOK], {
    input: JSON.stringify({ tool_name, tool_input }),
    encoding: "utf8",
  }).trim()
  if (!out) return null
  return JSON.parse(out).hookSpecificOutput.permissionDecisionReason as string
}

const bash = (command: string) => ask("Bash", { command })

describe("the never-hook blocks what it exists to block", () => {
  it("refuses a sweeping git add, including behind a cd", () => {
    // The `cd` case is why this is a hook and not a permission glob: a glob
    // matches the start of the command and would let this straight through.
    expect(bash("git add -A")).toMatch(/share this working tree/)
    expect(bash("cd src && git add -A")).toMatch(/share this working tree/)
    expect(bash("git add --all")).toMatch(/share this working tree/)
    expect(bash("git add .")).toMatch(/share this working tree/)
  })

  it("refuses every git stash that writes, including pop", () => {
    // One stash in this checkout holds work that must never be popped.
    expect(bash("git stash")).toMatch(/off in this checkout/)
    expect(bash("git stash pop")).toMatch(/off in this checkout/)
    expect(bash("git stash push -m wip")).toMatch(/off in this checkout/)
  })

  it("refuses the exact command that destroyed a user's sentence on 2026-08-27", () => {
    const reason = bash(`supabase db query --linked "update life_answers set body = 'rewritten'"`)
    expect(reason).toMatch(/2026-08-27/)
  })

  it("refuses a png written anywhere but .playwright-mcp/", () => {
    expect(ask("Write", { file_path: "docs/diagram.png" })).toMatch(/outside \.playwright-mcp/)
    expect(bash("convert in.png docs/out.png")).toMatch(/outside \.playwright-mcp/)
    expect(ask("mcp__playwright__browser_take_screenshot", { filename: "/tmp/x.png" }))
      .toMatch(/outside \.playwright-mcp/)
  })
})

describe("and permits the near-misses, so nobody switches it off", () => {
  it("lets a named git add through", () => {
    expect(bash("git add CLAUDE.md docs/product/map.md")).toBeNull()
  })

  it("lets you read the stash", () => {
    expect(bash("git stash list")).toBeNull()
    expect(bash("git stash show -p")).toBeNull()
  })

  it("lets a rollback-wrapped probe and a plain read through", () => {
    expect(bash(`supabase db query --linked "begin; update t set a=1; rollback;"`)).toBeNull()
    expect(bash(`supabase db query --linked "select count(*) from life_answers"`)).toBeNull()
  })

  it("does not mistake grepping for SQL for running it", () => {
    expect(bash("grep -rn 'delete from' src/")).toBeNull()
  })

  it("does not block a png whose SOURCE is outside the folder", () => {
    // `cp shot.png .playwright-mcp/shot.png` is the correct way to file a
    // screenshot. Checking every path rather than the destination blocked it,
    // and the hook's own self-test caught that on its first run.
    expect(bash("cp shot.png .playwright-mcp/shot.png")).toBeNull()
    expect(ask("Write", { file_path: ".playwright-mcp/after.png" })).toBeNull()
    expect(ask("Write", { file_path: "src/vice/data/blackbox.ts" })).toBeNull()
  })

  it("fails open on input it cannot read, rather than wedging another session", () => {
    // Three sessions share this settings file. A hook that throws blocks them all.
    const out = execFileSync("python3", [HOOK], { input: "not json", encoding: "utf8" })
    expect(out.trim()).toBe("")
  })
})

describe("the ask-first list stops being prose", () => {
  it("asks before a migration, payments, auth, access control or an icon", () => {
    const asks = (tool_input: Record<string, unknown>) => ask("Edit", tool_input)
    expect(asks({ file_path: "supabase/migrations/20260921_x.sql" })).toMatch(/ask-first list/)
    expect(asks({ file_path: "src/settings/stripe.ts" })).toMatch(/payments/)
    expect(asks({ file_path: "app/auth/login/page.tsx" })).toMatch(/sign-up, login/)
    expect(asks({ file_path: "src/db/profilesRepo.ts" })).toMatch(/paid modules/)
    expect(asks({ file_path: "src/shared/iconRoles.ts" })).toMatch(/icon/)
  })

  it("does not ask about an ordinary neighbour of a listed file", () => {
    expect(ask("Edit", { file_path: "src/settings/settingsService.ts" })).toBeNull()
  })

  it("says ask, not deny — these are the owner's call, not mine", () => {
    const out = execFileSync("python3", [HOOK], {
      input: JSON.stringify({ tool_name: "Edit", tool_input: { file_path: "src/settings/stripe.ts" } }),
      encoding: "utf8",
    })
    expect(JSON.parse(out).hookSpecificOutput.permissionDecision).toBe("ask")
  })
})

/**
 * The decision table lives in never.py's own CASES list, and this runs it. The
 * table is the single copy of "what counts as a violation" — the tests above
 * deliberately do NOT restate it, they check the other half: that the JSON
 * contract Claude Code actually speaks works end to end, which calling the
 * Python function directly cannot show.
 */
describe("the hook's full decision table", () => {
  it("passes every case it defines", () => {
    // execFileSync throws on a non-zero exit, so a failing case fails this test.
    const out = execFileSync("python3", [HOOK, "--selftest"], { encoding: "utf8" }).trim()
    expect(out).toMatch(/^(\d+)\/\1 cases correct$/)
  })

  it("still has cases to run — '0/0 correct' must not pass by default", () => {
    // A floor, not a count. Deleting the table would otherwise leave this
    // whole file green while checking nothing, which is the failure mode that
    // hides best.
    const out = execFileSync("python3", [HOOK, "--selftest"], { encoding: "utf8" }).trim()
    expect(Number(out.split("/")[0])).toBeGreaterThanOrEqual(27)
  })
})

describe("every hook that exists is actually wired up", () => {
  const settings = readFileSync(join(root, ".claude/settings.json"), "utf8")
  const scripts = readdirSync(join(root, ".claude/hooks"))
    .filter((f) => f.endsWith(".sh") || f.endsWith(".py"))

  it.each(scripts)("%s is referenced in settings.json", (script) => {
    // check-code-review.sh failed this for months while looking like enforcement.
    expect(settings).toContain(script)
  })

  it("finds hooks to check at all, so an empty folder cannot pass by default", () => {
    expect(scripts.length).toBeGreaterThan(0)
  })
})
