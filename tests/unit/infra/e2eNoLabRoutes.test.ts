// @vitest-environment node
/**
 * NO BROWSER TEST DRIVES A `/test` PAGE.
 *
 * `/test/*` is the lab: pages that exist under `next dev` and return 404 in a
 * production build, which is what CI runs. On 2026-10-13 about a quarter of
 * the browser runs drove one — the time tracker's whole suite, the archived
 * vice module, the goals prototypes — so in CI they were testing a 404 page,
 * and locally they were testing a copy of the product nobody uses. Rule R3 of
 * Plans/tests-worth-their-keep.md: tests check the product, not the lab.
 *
 * What counts as driving one: any string in a file under tests/e2e (specs and
 * helpers) that IS a lab address — `/test`, `/test/…`, `/test?…` — because an
 * address is usually a constant first and a `goto` later; and any import from
 * `app/test/`, which is how the archived module's addresses were reached.
 * Comments and regular expressions are not strings, so a test may still say
 * that a page must not show "/test/".
 */

import { describe, test, expect } from "vitest"
import { e2eSourceFiles, parse, stringsIn } from "./e2eSource"

const LAB_ADDRESS = /^\/test(\/|$|[?#])/
const LAB_MODULE = /(^|[@./])app\/test\//

function labUses(file: string, text?: string): string[] {
  return stringsIn(parse(file, text))
    .filter(({ text: s }) => LAB_ADDRESS.test(s) || LAB_MODULE.test(s))
    .map(({ text: s, line, isImport }) => `${file}:${line} ${isImport ? "imports" : "names"} ${s}`)
}

describe("the browser suite tests the product, not the lab", () => {
  test("no file under tests/e2e names a /test address or imports from app/test", () => {
    const files = e2eSourceFiles()
    // A scan that read nothing would pass. The suite has ~60 specs and helpers.
    expect(files.length, "the scan found almost no files under tests/e2e").toBeGreaterThan(40)

    const offenders = files.flatMap((file) => labUses(file))
    expect(
      offenders,
      "These drive a lab page, which 404s in the production build CI runs. Test the " +
        "product route that renders the same thing, or leave the lab untested:\n" +
        offenders.join("\n"),
    ).toEqual([])
  })

  test("the check catches a planted lab address, and lets the product's own addresses through", () => {
    const planted = [
      `await page.goto('/test/toggl')`,
      `const PAGE = "/test/archive/goals-hub"`,
      "await page.goto(`/test/archive/${flow}`)",
      `await page.goto("/test")`,
      `await page.goto("/test?x=1")`,
      `import { QUIT_VICE_ARCHIVE } from "@/app/test/archive/quit-vice/routes"`,
      `const r = await import("../../app/test/crash/page")`,
    ]
    for (const line of planted) {
      expect(labUses("planted.spec.ts", line), `missed: ${line}`).toHaveLength(1)
    }

    const harmless = [
      `await page.goto('/dashboard/time')`,
      `await page.goto('/testimonials')`,
      `expect(visible).not.toMatch(/\\/test\\//)`,
      `// this used to open /test/toggl`,
      `/* "/test/crash" was the lab page */`,
      `import { test } from "@playwright/test"`,
      `const label = "tests are /tested/ here"`,
    ]
    for (const line of harmless) {
      expect(labUses("planted.spec.ts", line), `flagged: ${line}`).toEqual([])
    }
  })
})
