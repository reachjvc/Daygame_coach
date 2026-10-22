// @vitest-environment node
/**
 * A BROWSER TEST THAT SKIPS ITSELF IS ON THIS LIST, WITH ITS REASON.
 *
 * A skip reports as "not failed", and in a summary that is a green run. On
 * 2026-10-13 the suite had 32 skip calls: eleven for "user B is not
 * configured" (so a missing account passed), nine that would skip every Q&A
 * test the day the account lost access, two that let a signed-in account
 * rendered as a stranger count as fine. A skip is sometimes honest — a service
 * worker cannot exist under `next dev` — but then it is a known gap, and a
 * known gap is written down.
 *
 * The list may only shrink: an entry whose skip is gone fails too, so a fixed
 * test takes its entry with it. The plan named `.test-known-failures.json` as
 * the place for this; that file was deleted on 2026-10-13 as tooling nothing
 * enforced, so the list lives with the rule that enforces it.
 */

import { describe, test, expect } from "vitest"
import { callSites, e2eSourceFiles, parse } from "./e2eSource"

/** `file › where` → why it may skip */
const KNOWN_SKIPS: Record<string, string> = {
  "tests/e2e/vice-offline.spec.ts › the Black Box opens with no connection, and its record is there":
    "a service worker registers only in a production build; under `next dev` there is none to test",
  "tests/e2e/programs-live-format.spec.ts › describe: the live workout, opened with no signal":
    "Playwright's WebKit fails every navigation while offline is emulated, service worker or not (the Black Box's offline test fails the same way there); these run on Chromium",
  "tests/e2e/programs-live-format.spec.ts › reopens with every set on it: one saved with signal, one waiting for it":
    "a service worker registers only in a production build; under `next dev` there is none to test",
  "tests/e2e/programs-live-format.spec.ts › a workout that is over is not kept: its stored page is dropped":
    "a service worker registers only in a production build; under `next dev` there is none to test",
}

const isSkip = (callee: string) => /^test(\.describe)?\.(skip|fixme)$/.test(callee)

function skipsIn(file: string, text?: string): Set<string> {
  return new Set(callSites(parse(file, text), isSkip).map((site) => `${file} › ${site.where}`))
}

function problems(found: Set<string>, known: Record<string, string>): string[] {
  const out: string[] = []
  for (const key of found) if (!(key in known)) out.push(`${key}: skips, and is not on the list`)
  for (const key of Object.keys(known)) if (!found.has(key)) out.push(`${key}: listed, but no longer skips — take it off`)
  return out
}

describe("skips in the browser suite", () => {
  test("every test that can skip itself is listed with its reason, and nothing else is listed", () => {
    const files = e2eSourceFiles()
    expect(files.length, "the scan found almost no files under tests/e2e").toBeGreaterThan(40)

    const found = new Set<string>()
    for (const file of files) for (const key of skipsIn(file)) found.add(key)

    const wrong = problems(found, KNOWN_SKIPS)
    expect(
      wrong,
      "A skip is a pass that checked nothing. Make the test run, or fail loudly when its\n" +
        "setup is missing; if the gap is real and known, list it above with the reason:\n" +
        wrong.join("\n"),
    ).toEqual([])
  })

  test("the check catches planted skips and passes a listed one", () => {
    const planted = `
      import { test } from "@playwright/test"
      test.skip("declared skipped", async () => {})
      test("conditional", async ({ page }) => { test.skip(!page.url().includes("x"), "why") })
      test.describe("group", () => {
        test.fixme()
        test("listed", async () => { test.skip(true, "known") })
      })
      // test.skip(true, "a comment is not a skip")
    `
    const found = skipsIn("planted.spec.ts", planted)
    expect([...found].sort()).toEqual([
      "planted.spec.ts › conditional",
      "planted.spec.ts › declared skipped",
      "planted.spec.ts › describe: group",
      "planted.spec.ts › listed",
    ])
    const wrong = problems(found, { "planted.spec.ts › listed": "known" })
    expect(wrong, "the three unlisted skips, and not the listed one").toHaveLength(3)
    expect(problems(new Set(), { "gone.spec.ts › old": "fixed" }), "a stale entry").toHaveLength(1)
  })
})
