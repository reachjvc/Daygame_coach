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

/**
 * The map moved out of CLAUDE.md on 2026-09-19. It was 1,300 words loaded into
 * every session whether or not anyone needed them, and the owner was right that
 * a 4,000-word preamble is not how you get a rule followed. It now costs one
 * deliberate read, and CLAUDE.md carries the line that sends you to it.
 */
const orientation = fs.readFileSync(path.join(root, "docs/product/map.md"), "utf8")

function dirsIn(rel: string): string[] {
  return fs
    .readdirSync(path.join(root, rel), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
}

describe("the product map in docs/product/map.md", () => {
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
      expect(orientation, `docs/product/map.md lost its "${heading}" section.`).toContain(heading)
    }
  })

  it("is still reachable from CLAUDE.md, which is the only file always loaded", () => {
    // A map nobody is sent to is the 482 deleted docs all over again.
    expect(claudeMd, "CLAUDE.md no longer sends anyone to docs/product/map.md.").toContain(
      "docs/product/map.md",
    )
  })

  it("still points at the owner's vision, and the vision still has items", () => {
    // The vision is the one file that says what the product is FOR. A pointer to
    // a file nobody keeps is the failure the 482 deleted docs were, so both ends
    // are checked: the orientation names it, and it still carries numbered items
    // for a plan or a reply to cite.
    const rel = "docs/product/vision.md"
    expect(claudeMd, `CLAUDE.md no longer points at ${rel}.`).toContain(rel)

    const vision = path.join(root, rel)
    expect(fs.existsSync(vision), `${rel} is missing; the orientation points at it.`).toBe(true)

    const items = fs
      .readFileSync(vision, "utf8")
      .split("\n")
      .filter((line) => /^\d+\. \S/.test(line))
    expect(items.length, `${rel} has no numbered items left.`).toBeGreaterThan(0)
  })
})
