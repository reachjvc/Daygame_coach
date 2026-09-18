/**
 * THE MAP IN CLAUDE.md HAS TO STAY TRUE.
 *
 * CLAUDE.md opens with an orientation: what this product is, what a signed-in
 * user sees, and one line per slice. It exists because the code is far bigger
 * than the live product — 54 pages under `/test`, eleven generations of the
 * goals screen, two gym slices where only one is reachable — and somebody
 * reading the folder list alone gets the product wrong in a way that is not
 * obvious and not self-correcting.
 *
 * A map is only worth having while it is accurate, and the way maps die is
 * quietly: a slice is added, the orientation is not, and six weeks later it is
 * describing a codebase that no longer exists. That is exactly how the 482 docs
 * deleted on 2026-09-09 got to be worthless.
 *
 * So this is the ratchet. Add a slice under `src/`, or a route group under
 * `app/`, and this test fails until the orientation mentions it. It deliberately
 * checks only that the NAME appears — a test cannot tell whether a sentence is
 * still true, and pretending otherwise would be the same false comfort as
 * checking that a quote is longer than forty characters. It catches the one
 * failure it can actually catch: something new that nobody wrote down.
 */

import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

const root = path.resolve(__dirname, "../../..")
const claudeMd = fs.readFileSync(path.join(root, "CLAUDE.md"), "utf8")

/** The orientation is everything above the `## Commands` heading. */
const orientation = claudeMd.split("\n## Commands")[0]

function dirsIn(rel: string): string[] {
  return fs
    .readdirSync(path.join(root, rel), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
}

describe("the orientation in CLAUDE.md", () => {
  it("names every slice under src/", () => {
    const missing = dirsIn("src").filter((slice) => !orientation.includes(`\`${slice}/\``))

    expect(
      missing,
      `New slice(s) under src/ that the orientation in CLAUDE.md does not mention: ${missing.join(", ")}.\n` +
        "Add one line each to \"The slices, one line each\" saying what it does for the user, " +
        "and whether it is reachable outside /test.",
    ).toEqual([])
  })

  it("names every route group under app/", () => {
    // `api` and `actions` are not places a person goes; the orientation covers
    // screens. `test` is named as a whole rather than page by page.
    const ignored = new Set(["api", "actions", "test"])
    const groups = dirsIn("app").filter((d) => !ignored.has(d) && !d.startsWith("_"))

    const missing = groups.filter((g) => !orientation.includes(`/${g}`))

    expect(
      missing,
      `New top-level route(s) under app/ that the orientation in CLAUDE.md does not mention: ${missing.join(", ")}.\n` +
        "If a user can reach it, it belongs in \"What a signed-in user actually sees\".",
    ).toEqual([])
  })

  it("still describes the product, not just the file layout", () => {
    // A guard against the orientation being gutted back into a one-line stack
    // description, which is the state that made the product unreadable from the
    // repo in the first place.
    for (const heading of [
      "## What this product is",
      "## What a signed-in user actually sees",
      "## The slices, one line each",
      "## The data",
      "## Live, lab, or dead",
    ]) {
      expect(orientation, `CLAUDE.md lost its "${heading}" section.`).toContain(heading)
    }
  })
})
