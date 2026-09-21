import { describe, it, expect } from "vitest"
import { existsSync, readFileSync, readdirSync } from "fs"
import { join } from "path"
import { homedir } from "os"

/**
 * THE INSTRUCTIONS HAVE A WORD BUDGET, AND IT MAY ONLY GO DOWN.
 *
 * On 2026-09-19 the always-loaded instructions were 4,386 words, and an agent
 * started on them answered "this is a live, paid product taking real Stripe
 * subscriptions" about a product that has never had a customer. The same
 * question against 948 words was answered correctly. Length was not neutral —
 * it was the carrier of the error.
 *
 * Every one of those 4,386 words was added by someone who had just watched a
 * failure and wanted it never to happen again. That is the whole mechanism:
 * each addition is locally justified and the sum is unreadable. The repo
 * already solved this shape twice — `scripts/lint-ratchet.mjs` and
 * `scripts/typecheck-ratchet.mjs`, where the count may only fall — so this is
 * the same bargain for prose.
 *
 * WHAT IT COSTS YOU. To add a line, cut one. That is not an obstacle to route
 * around by raising the cap; raising it is a deliberate, visible act in a diff,
 * and it should be argued for in the commit message like any other regression.
 *
 * `.claude/rules/` is capped too, and deliberately: without it the cheapest way
 * to satisfy the caps above is to shove the words sideways into a rules file
 * and call the problem solved.
 *
 * WHAT THIS TEST CANNOT DO: tell you whether the words left are the right ones.
 * Compressing rule 3 on 2026-09-19 deleted the clause forbidding "revisit
 * later", and the failure it prevented arrived two messages afterwards, under a
 * budget this test would have called healthy. Shrinking is not the same as
 * improving. See "Did I shorten an instruction file?" in docs/known-failures.md.
 */

const ROOT = process.cwd()

/** Words, not bytes: the cost is what a reader has to get through. */
const words = (text: string): number => text.split(/\s+/).filter(Boolean).length

/** The block `next dev` re-writes into CLAUDE.md. Not ours to cut, so not counted. */
const withoutGeneratedBlock = (text: string): string =>
  text.replace(/<!-- BEGIN:nextjs-agent-rules -->[\s\S]*/, "")

describe("the instruction budget", () => {
  it("CLAUDE.md, loaded in full every session, stays within budget", () => {
    const count = words(withoutGeneratedBlock(readFileSync(join(ROOT, "CLAUDE.md"), "utf8")))
    expect(
      count,
      `CLAUDE.md is ${count} words, over its 391-word budget. It is loaded in ` +
        `full, every session, before anyone knows what the task is. Cut something ` +
        `or move it behind a trigger: docs/product/map.md, docs/known-failures.md, ` +
        `or a .claude/rules/ file with a paths: header.`,
    ).toBeLessThanOrEqual(391)
  })

  it("the end-of-turn checklist stays short enough to actually be read", () => {
    const count = words(readFileSync(join(ROOT, "docs/known-failures.md"), "utf8"))
    expect(
      count,
      `docs/known-failures.md is ${count} words, over its 950-word budget. It is ` +
        `injected at the end of a turn, so length is the thing that turns it into ` +
        `wallpaper — see the 492-lint-error story in .github/workflows/ci.yml. ` +
        `To add a check, sharpen or remove one.`,
    ).toBeLessThanOrEqual(950)
  })

  it("the path-triggered rules do not become the dumping ground", () => {
    const dir = join(ROOT, ".claude/rules")
    const count = readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .reduce((sum, f) => sum + words(readFileSync(join(dir, f), "utf8")), 0)
    expect(
      count,
      `.claude/rules/ totals ${count} words, over its 2,710-word budget. These ` +
        `load automatically on matching paths, so they are cheaper than CLAUDE.md ` +
        `but not free, and they are the obvious place to hide words that no ` +
        `longer fit elsewhere.`,
    ).toBeLessThanOrEqual(2710)
  })

  it("the memory index stays an index, not a second rulebook", () => {
    // Memory lives in the user's home directory, so it is simply absent in CI
    // and on any other machine. Absent is not a failure; silently passing a
    // check that never ran would be, so say which happened.
    const index = join(
      homedir(),
      ".claude/projects/-home-jonaswsl-projects-daygame-coach/memory/MEMORY.md",
    )
    if (!existsSync(index)) {
      expect(existsSync(index), "no local memory dir on this machine — budget not checked here").toBe(false)
      return
    }
    const count = words(readFileSync(index, "utf8"))
    expect(
      count,
      `MEMORY.md is ${count} words, over its 430-word budget. It is loaded every ` +
        `session alongside CLAUDE.md. Each line says WHEN a note matters; what the ` +
        `note says belongs in the note.`,
    ).toBeLessThanOrEqual(430)
  })
})
