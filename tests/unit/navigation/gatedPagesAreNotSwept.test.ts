// @vitest-environment node
/**
 * A PAGE HIDDEN ON PURPOSE MUST BE LEFT OUT OF THE SWEEPS ON PURPOSE.
 *
 * Sessions hide unfinished pages behind a flag with `notFound()`. The cold-open
 * sweep opens every static route and expects it to exist, so a hidden page
 * turns main red in the browser run, hours after the commit. The cure is a
 * line in `NOT_SWEPT` (with the spec that does open it) written the same day;
 * this test fails at commit if that line is missing.
 *
 * route-sweep.spec.ts keeps no exclusion list of its own (it walks
 * `staticRoutes()`; only per-rule debt is listed, in sweepDebt.ts), so there is
 * nothing to check there.
 */
import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"
import { staticRoutes } from "@/tests/support/appRoutes"
import { NOT_FOUND_ONLY_ON_BAD_INPUT, NOT_SWEPT } from "@/tests/support/notSwept"

const gated = staticRoutes().filter((r) => /\bnotFound\(/.test(readFileSync(r.file, "utf-8")))

describe("pages that answer 404 on purpose", () => {
  test("the walk found the gated pages", () => {
    expect(gated.length, "no page calls notFound( any more, or the walk broke").toBeGreaterThanOrEqual(2)
  })

  test("each is in NOT_SWEPT or NOT_FOUND_ONLY_ON_BAD_INPUT, with a reason", () => {
    const missing = gated.filter((r) => !(r.route in NOT_SWEPT) && !(r.route in NOT_FOUND_ONLY_ON_BAD_INPUT))
    expect(
      missing.map((r) => `${r.route}  (${r.file.replace(/^.*\/app\//, "app/")})`),
      "These pages call notFound( but the cold-open sweep would open them and fail on the 404. " +
        "Add each to NOT_SWEPT in tests/support/notSwept.ts with the reason and the spec that opens it " +
        "(or to NOT_FOUND_ONLY_ON_BAD_INPUT if it is 404 only for bad input):",
    ).toEqual([])
  })

  test("every entry has a real reason", () => {
    for (const list of [NOT_SWEPT, NOT_FOUND_ONLY_ON_BAD_INPUT]) {
      for (const [route, reason] of Object.entries(list)) {
        expect(reason.trim().length, `${route} has no reason`).toBeGreaterThan(15)
      }
    }
  })

  test("a bad-input-only entry is not also a gate that hides the whole page", () => {
    const both = Object.keys(NOT_FOUND_ONLY_ON_BAD_INPUT).filter((r) => r in NOT_SWEPT)
    expect(both, "listed in both lists").toEqual([])
  })
})
