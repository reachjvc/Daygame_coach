/**
 * THE BROWSER BACK BUTTON GOES BACK ONE STEP.
 *
 * The failure this prevents: `useSteppedFlow` used to take a boolean barrier,
 * which can only ever hold ONE history entry. A five-step flow therefore got one
 * entry for all five steps -- the flag flipped false->true on leaving step 1 and
 * then stayed true. Measured on https://daygame-coach.vercel.app on 2026-09-07,
 * pressing Back three times from step 3:
 *
 *     Safari  : step 2  ->  jumped to step 5  ->  step 4
 *     Firefox : step 2  ->  nothing           ->  nothing
 *
 * Two different wrong behaviours from one bug. Safari fell out of the flow
 * entirely, and since nothing is saved until the final button, every answer went
 * with it. The unit test at tests/unit/navigation/backNavigation.test.ts passed
 * throughout -- it checks that pages carry a BackLink component, and never
 * presses the browser's own Back button.
 *
 * This runs on WebKit and Firefox deliberately: a Chromium-only test would have
 * caught neither of the two failures above.
 *
 * DRIVEN THROUGH THE BASELINE SESSION, NOT ONBOARDING (changed 2026-09-08).
 * It used to walk `/preferences?step=N`, but the five-step onboarding wizard is
 * gone -- the dating questions are now a single screen at the scenario door, and
 * a one-screen form has no steps to walk. `useSteppedFlow` still has eight other
 * callers, so the hook is still worth this test; the baseline session is simply
 * the multi-step flow that is easiest to reach (no login, no paywall) and it is
 * long enough -- eight steps -- to show the original bug, which needed three.
 *
 * `Next anyway` is the session's own affordance for moving past an unanswered
 * screen. Using it keeps this test about history, not about the questions.
 */

import { test, expect } from "@playwright/test"

const T = 15000

/** The step number the flow is showing, or a marker if we fell out of it. */
async function currentStep(page: import("@playwright/test").Page) {
  return await page.evaluate(() => {
    const m = document.body.innerText.match(/Step\s+(\S+)\s+of\s+8/)
    return m ? m[1] : "<left the flow>"
  })
}

async function advance(page: import("@playwright/test").Page) {
  const anyway = page.getByRole("button", { name: "Next anyway", exact: true })
  const plain = page.getByRole("button", { name: "Next", exact: true })
  if (await anyway.count()) {
    await anyway.click()
  } else {
    await plain.click()
  }
}

/** Open the baseline session and walk forward to step 3. */
async function walkToStep3(page: import("@playwright/test").Page) {
  await page.goto("/test/life-direction")
  await page.getByRole("button", { name: /1\. Baseline/ }).click({ timeout: T })
  await expect(page.getByText("Step 1 of 8")).toBeVisible({ timeout: T })
  await advance(page)
  await expect(page.getByText("Step 2 of 8")).toBeVisible({ timeout: T })
  await advance(page)
  await expect(page.getByText("Step 3 of 8")).toBeVisible({ timeout: T })
}

test.describe("browser Back inside a stepped flow", () => {
  test("goes back exactly one step per press", async ({ page }) => {
    await walkToStep3(page)

    await page.evaluate(() => history.back())
    await expect(page.getByText("Step 2 of 8")).toBeVisible({ timeout: T })

    await page.evaluate(() => history.back())
    await expect(page.getByText("Step 1 of 8")).toBeVisible({ timeout: T })
  })

  test("never jumps to a step the user was not on", async ({ page }) => {
    // Safari's actual failure: Back from step 2 landed on step 5.
    await walkToStep3(page)

    const seen: string[] = []
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => history.back())
      await page.waitForTimeout(400)
      seen.push(await currentStep(page))
    }

    // Strictly descending, one at a time, until it leaves the flow.
    const inFlow = seen.filter((s) => s !== "<left the flow>")
    expect(inFlow).toEqual(["2", "1"].slice(0, inFlow.length))
  })

  test("the in-page Back button does not skip a step", async ({ page }) => {
    await walkToStep3(page)

    await page.getByRole("button", { name: "Back", exact: true }).click()
    await expect(page.getByText("Step 2 of 8")).toBeVisible({ timeout: T })
  })

  test("browser Back after the in-page Back is not swallowed", async ({ page }) => {
    /* Shrinking the stack fires one synchronous history.back() per level, which
       a browser may coalesce -- leaving the suppression counter above zero and
       eating the user's NEXT real Back. */
    await walkToStep3(page)

    await page.getByRole("button", { name: "Back", exact: true }).click()
    await expect(page.getByText("Step 2 of 8")).toBeVisible({ timeout: T })

    await page.evaluate(() => history.back())
    await expect(page.getByText("Step 1 of 8")).toBeVisible({ timeout: T })
  })
})
