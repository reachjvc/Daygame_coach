import { describe, it, expect } from "vitest"
import { execFileSync } from "child_process"
import { existsSync, readFileSync, rmSync, writeFileSync } from "fs"
import { join } from "path"

/**
 * THE END-OF-TURN CHECKLIST HAS TO STILL BE WIRED.
 *
 * `docs/known-failures.md` only works because something puts it in front of the
 * model at the end of a turn. Prose in CLAUDE.md did not work: rule 2 carried
 * its own cautionary story and was broken anyway, and the owner kept having to
 * supply, by hand, reasoning that should have been found for them.
 *
 * So the check is mechanical — a Stop hook — and mechanical things get
 * commented out. This test is the ratchet on the ratchet. It asserts the three
 * pieces exist and still refer to each other: the checklist, the hook, and both
 * hook registrations in settings.json. It deliberately does NOT assert anything
 * about the checklist's contents; a test cannot tell whether a question is
 * still a good question, and pretending otherwise is the stand-in problem that
 * is item one on the list itself.
 */

const ROOT = process.cwd()
const CHECKLIST = "docs/known-failures.md"
const HOOK = ".claude/hooks/known_failures.py"

describe("the end-of-turn known-failures check", () => {
  it("has a checklist with questions in it", () => {
    const path = join(ROOT, CHECKLIST)
    expect(existsSync(path), `${CHECKLIST} is missing.`).toBe(true)

    const questions = readFileSync(path, "utf8")
      .split("\n")
      .filter((line) => line.trimStart().startsWith("- ") && line.includes("?"))
    expect(
      questions.length,
      `${CHECKLIST} has no questions left; it is meant to be answered, not read.`,
    ).toBeGreaterThan(5)
  })

  it("has the hook that puts it in front of you", () => {
    expect(existsSync(join(ROOT, HOOK)), `${HOOK} is missing.`).toBe(true)
  })

  it("still registers both halves of the hook in settings.json", () => {
    // Two halves: the snapshot at UserPromptSubmit is what makes the Stop check
    // fire only on turns that changed something. Without it the check either
    // never fires or fires every time, and a check that always fires is one
    // nobody reads — see the 492-lint-error story in .github/workflows/ci.yml.
    const settings = JSON.parse(readFileSync(join(ROOT, ".claude/settings.json"), "utf8"))

    const commandsFor = (event: string): string[] =>
      (settings.hooks?.[event] ?? []).flatMap(
        (entry: { hooks?: Array<{ command?: string }> }) =>
          (entry.hooks ?? []).map((h) => h.command ?? ""),
      )

    expect(
      commandsFor("UserPromptSubmit").some((c) => c.includes("known_failures.py") && c.includes("--snapshot")),
      "settings.json no longer takes the working-tree snapshot at UserPromptSubmit.",
    ).toBe(true)

    expect(
      commandsFor("Stop").some((c) => c.includes("known_failures.py") && c.includes("--check")),
      "settings.json no longer runs the known-failures check on Stop.",
    ).toBe(true)
  })

  it("delivers the checklist in the field a Stop hook can actually deliver", () => {
    // It did not, for as long as it existed. The hook put one line in `reason`
    // and the checklist in `hookSpecificOutput.additionalContext`, which Claude
    // Code reads for PreToolUse, UserPromptSubmit, SessionStart, Setup,
    // SubagentStart, PostToolUse and PostToolUseFailure — never for Stop. The
    // fire log showed two fires for one session on 2026-10-01 that received
    // nothing and were not stopped. A Stop hook's errors are suppressed in the
    // UI, so it could fail this way indefinitely without anyone seeing it.
    //
    // So this asserts the shape, by running the hook on a tree it has to fire
    // on: everything in `reason`, and no hookSpecificOutput to be dropped.
    const session = `shape-${process.pid}`
    const stdin = JSON.stringify({ session_id: session })
    const run = (mode: string) =>
      execFileSync(join(ROOT, HOOK), [mode], { cwd: ROOT, input: stdin, encoding: "utf8" })

    run("--snapshot")
    const probe = join(ROOT, `.known-failures-shape-${process.pid}.tmp`)
    writeFileSync(probe, "a file this turn changed\n")
    let out: string
    try {
      out = run("--check")
    } finally {
      rmSync(probe, { force: true })
    }

    const payload = JSON.parse(out)
    expect(payload.decision, "the hook stopped blocking on Stop.").toBe("block")
    expect(
      payload.hookSpecificOutput,
      "the checklist is back in hookSpecificOutput, which Stop never reads.",
    ).toBeUndefined()
    expect(
      payload.reason,
      "`reason` no longer carries the checklist itself, so nothing arrives.",
    ).toContain("Known failures")
  })

  it("is pointed at from the places that should send you here", () => {
    for (const file of ["CLAUDE.md", ".claude/rules/finished-work.md"]) {
      expect(
        readFileSync(join(ROOT, file), "utf8"),
        `${file} no longer points at ${CHECKLIST}.`,
      ).toContain(CHECKLIST)
    }
  })
})
