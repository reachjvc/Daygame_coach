import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "fs"
import { join } from "path"

/**
 * THE RULES A REWRITE MAY NOT SILENTLY DROP.
 *
 * `instructionBudget.test.ts` caps how many words the instructions may use. It
 * cannot tell whether the words left are the right ones, and on 2026-09-19 that
 * gap bit within the hour: compressing rule 3 deleted the clause saying "out of
 * scope", "revisit later" and "good enough for now" are the same sentence and
 * none of them is an answer. Two messages later the failure it existed to
 * prevent happened. A check of eighteen remembered phrases had passed, because
 * it probed for what the author remembered rather than for what was load-bearing.
 *
 * A word cap makes shortening attractive and silent deletion invisible. This is
 * the other half of the bargain: the cap says how much, this says what must
 * survive.
 *
 * DELIBERATELY NOT A LOCATION CHECK. A clause may live in any instruction file
 * and move freely between them — that movement is the whole point of the split,
 * and pinning a clause to a file would freeze the layout. It only has to exist
 * somewhere a session will meet it.
 *
 * TO REMOVE ONE: delete it here in the same commit, and say in the message why
 * the failure it prevents can no longer happen. That is a real argument someone
 * can disagree with, which is exactly what deleting a rule should cost.
 */

const ROOT = process.cwd()

/**
 * Every rule below is here because it was written after a specific failure.
 * Kept as short fragments, not whole sentences, so ordinary rewording does not
 * trip the test — only losing the idea does.
 */
const MUST_SURVIVE: Array<[string, string]> = [
  ["revisit later", "deferral is not an answer — the clause deleted on 2026-09-19"],
  ["good enough for now", "the other half of the deferral clause"],
  ["attempted at least once", "a blocker never tried is a guess"],
  ["stand-in", "rule 1: check the thing itself, not a proxy for it"],
  ["nobody has ever paid", "the project's stage; its absence taught an agent there were customers"],
  ["build their case", "rule 6: outside advice gets researched, not argued with"],
  ["future-proof", "rule 5: say it before building, not after"],
  ["fix the class", "rule 3: one place owns each rule"],
  ["cheerleader", "rule 2: be the critic; untested agreement is worth nothing"],
  ["doubt goes in the first line", "uncertainty goes up front, not in a closing caveat"],
  ["silent fallback", "scripts fail loudly or ask"],
  ["third state", "a value that could not be computed is never zero"],
  ["service-role", "the key bypasses row-level security, so those guarantees are advisory"],
  ["whose clock", "server time used where the user's timezone was meant — three bugs so far"],
  ["404s in production", "finding something under /test means it is not in the product"],
]

/** Markdown wraps sentences across lines, so a raw substring search reports
 *  false losses. Compare on normalised whitespace. */
function instructionSurface(): string {
  const files = [
    "CLAUDE.md",
    "docs/known-failures.md",
    "docs/product/map.md",
    "docs/product/vision.md",
    ...readdirSync(join(ROOT, ".claude/rules"))
      .filter((f) => f.endsWith(".md"))
      .map((f) => join(".claude/rules", f)),
  ]
  return files
    .map((f) => readFileSync(join(ROOT, f), "utf8"))
    .join("\n")
    .toLowerCase()
    .replace(/\s+/g, " ")
}

describe("rules a rewrite may not silently drop", () => {
  const surface = instructionSurface()

  it.each(MUST_SURVIVE)("still says %j — %s", (clause) => {
    expect(
      surface.includes(clause.toLowerCase()),
      `The instructions no longer contain "${clause}" anywhere.\n` +
        `If you shortened a file, you deleted a rule with it — put it back, or ` +
        `remove this entry in the same commit and justify it.`,
    ).toBe(true)
  })
})
