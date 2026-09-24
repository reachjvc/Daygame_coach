/**
 * OPEN A PAGE THE WAY A PERSON DOES, AND ASK IT TWO QUESTIONS.
 *
 * Shared by `cold-open.spec.ts` (signed in) and `cold-open-signed-out.spec.ts`
 * (the sales page and the auth flow), which differ only in their route list and
 * in which Playwright project runs them — signed-out pages must not inherit a
 * session, so they cannot live in the same project.
 *
 * One owner because the two questions are subtle in the same two ways: the wait
 * after the document lands, without which every page reads as clean, and the
 * shadow-root filter, without which the Next dev overlay's own nested controls
 * are reported as the app's.
 */

import { expect, type Page } from "@playwright/test"

export interface ColdOpen {
  /** Where the browser ended up, which is not always where it was sent. */
  landedOn: string
  /**
   * The status of the document that was finally served, after any redirect.
   *
   * Here because without it this sweep reports pages that do not exist as
   * healthy. Measured 2026-09-24: a made-up address under `/life-mastery`
   * answers 404, and a 404 page has no hydration error and no nested control,
   * so both of the questions below pass on it. A route list that outlives a
   * deleted page would then go on reporting it clean forever — which is the
   * same fault that had `quit-vice.spec.ts` driving the wrong page for four
   * days, and it does not get to happen twice in one night.
   */
  status: number
  hydrationErrors: string[]
  /** One line per distinct control-inside-a-control, deduplicated. */
  nested: string[]
}

export async function openCold(page: Page, route: string): Promise<ColdOpen> {
  const hydrationErrors: string[] = []

  const remember = (text: string) => {
    // React says "hydration" in the message itself, as a thrown error or as a
    // console error depending on the build.
    if (/hydrat/i.test(text)) hydrationErrors.push(text.split("\n")[0].slice(0, 200))
  }
  page.on("pageerror", (error) => remember(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") remember(message.text())
  })

  const response = await page.goto(route, { waitUntil: "networkidle" })
  /**
   * Not a fallback — `goto` returns null only when no navigation happened at
   * all, and a sweep that cannot say what the server answered must say so
   * rather than assume 200.
   */
  if (!response) throw new Error(`No navigation response for ${route}`)
  /**
   * Hydration happens AFTER the document lands, so the listeners need a beat
   * with nothing else going on. Without this every page reads as clean, which
   * is the failure that makes a guard like this worse than none: it reports
   * silence as health.
   */
  await page.waitForTimeout(1500)

  const nested = await page.$$eval("button button, a button, button a, a a", (elements) =>
    elements
      // The Next dev overlay lives in a shadow root and has nested controls of
      // its own. `getRootNode()` is what tells them apart.
      .filter((element) => element.getRootNode() === document)
      .map((element) => {
        const outer = element.parentElement?.closest("button, a")
        const label = (element.textContent ?? "").trim().slice(0, 30)
        return `<${element.tagName.toLowerCase()}> "${label}" inside <${outer?.tagName.toLowerCase()}>`
      })
  )

  return {
    landedOn: new URL(page.url()).pathname,
    status: response.status(),
    hydrationErrors,
    nested: [...new Set(nested)],
  }
}

/**
 * THE PAGE HAS TO EXIST BEFORE ANYTHING ELSE IS WORTH ASKING.
 *
 * Asserted first in every test, because a 404 answers "no" to both other
 * questions and would otherwise read as a pass.
 */
export function expectPageExists(route: string, result: ColdOpen): void {
  expect(
    result.status,
    `${route} answered ${result.status} (landed on ${result.landedOn}). Either the ` +
      `page is gone and this route list has outlived it, or the route is real and ` +
      `broken. A 404 has no hydration error and no nested control, so the rest of ` +
      `this test would pass on it and report a missing page as a healthy one.`
  ).toBeLessThan(400)
}

/**
 * A hydration failure means React discarded a tree the server had already sent
 * and rebuilt it on the client. Whatever it printed first was wrong, and
 * anything the person had already typed into it is gone. No allowance, no route
 * exempt.
 */
export function expectNoHydrationFailure(route: string, result: ColdOpen): void {
  expect(
    result.hydrationErrors,
    `${route} failed hydration (landed on ${result.landedOn}). React discarded ` +
      `server-rendered markup and rebuilt it, so whatever it showed first was ` +
      `wrong:\n${result.hydrationErrors.join("\n")}`
  ).toEqual([])
}

export function expectNoNestedControls(route: string, result: ColdOpen): void {
  expect(
    result.nested,
    `${route} renders a control inside another control. A <button> inside a ` +
      `<button> breaks hydration outright — the parser closes the outer one, so ` +
      `the server and the browser disagree. Inside an <a> it is invalid HTML and ` +
      `two controls where the page means one. Use \`asChild\` so the link IS the ` +
      `button, and check any component that renders a caller-supplied element ` +
      `inside its own control:\n${result.nested.join("\n")}`
  ).toEqual([])
}
