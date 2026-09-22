import { describe, it, expect } from "vitest"
import { execSync } from "child_process"

/**
 * "IT THREW" IS NOT "IT THREW FOR THE REASON I SAID".
 *
 * `expect(...).toThrow()` with no argument passes on ANY error. On 2026-09-20
 * two tests in goalRepo.integration.test.ts named a NOT NULL constraint on
 * `title` and `category` and had been passing on a FOREIGN KEY error instead —
 * the insert never reached the column being tested. They were green, and green
 * for a reason that had nothing to do with what they claimed. The specific
 * cause that day was a cross-run container mixup, but a bare toThrow would have
 * hidden a typo in the SQL, a missing table, or a connection failure just as
 * well, and for as long.
 *
 * A ratchet rather than a ban, for the same reason the lint one is: 72 of these
 * exist, a bare `eslint .` failing on 492 pre-existing errors taught everyone
 * here to ignore a red tick, and a test that is red on arrival gets deleted
 * rather than fixed. So the count may fall and may not rise. Fix one when you
 * are next in the file, and lower the number in the same commit.
 *
 * TO FIX ONE: pass what you expect — `.toThrow(/null value in column "title"/)`
 * — so the assertion fails when the error changes into a different error.
 */

/** Current counts. These may only go DOWN. */
const BUDGET = {
  "rejects.toThrow()": 24,
  ".toThrow()": 52,
} as const

/** `--untracked` is load-bearing, not tidiness. Plain `git grep` searches only
 *  TRACKED files, so a brand-new test file — which is exactly where a new bare
 *  assertion comes from — was invisible to this until someone committed it. That
 *  hole was in the first version of this file, and the comment above it claimed
 *  the opposite. Fixed-string match: these are literals, not regex. */
function countIn(pattern: string): number {
  try {
    const out = execSync(`git grep --untracked -F -o -- '${pattern}' -- tests/ | wc -l`, {
      cwd: process.cwd(),
      encoding: "utf8",
    })
    return Number(out.trim())
  } catch {
    return -1
  }
}

describe("assertions say what they expect", () => {
  it("counts something, so a broken grep cannot pass silently", () => {
    // If the search itself breaks, every count reads 0 and every budget passes.
    // A green test over an empty search is the same lie as no test at all.
    expect(countIn(".toThrow(")).toBeGreaterThan(0)
  })

  for (const [pattern, budget] of Object.entries(BUDGET)) {
    it(`has at most ${budget} bare \`${pattern}\`, and fewer is better`, () => {
      const found = countIn(pattern)
      expect(found, `counting \`${pattern}\` failed`).toBeGreaterThanOrEqual(0)
      expect(
        found,
        `${found} bare \`${pattern}\` in tests/, budget ${budget}.\n` +
          `A bare toThrow passes on ANY error, including one from a completely ` +
          `different failure. Give it what you expect — .toThrow(/message/) — ` +
          `rather than adding another. If you FIXED some, lower the number here ` +
          `in the same commit so the ratchet keeps its teeth.`,
      ).toBeLessThanOrEqual(budget)
    })
  }
})
