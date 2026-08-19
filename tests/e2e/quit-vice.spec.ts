/**
 * End-to-end coverage for the quit-a-vice module at /test/quit-vice.
 *
 * Client-only, localStorage-backed, no API, no auth. Each test clears the key
 * and reloads so it starts from a known empty state.
 *
 * The tests are aimed at the lifecycle rather than the happy path: what the
 * page looks like with nothing in it, whether it survives a reload, whether the
 * safety gate actually gates, whether the four flows share one set of answers,
 * and whether every step of every flow renders something rather than a blank
 * rectangle.
 */

import { test, expect, type Page } from "@playwright/test"

const HUB = "/test/quit-vice"
const STORAGE_KEY = "quit-vice-v1"
const FLOWS = ["where", "gives", "map", "experiment", "line", "week"] as const

/**
 * Land on a page with an empty store and React actually hydrated.
 *
 * The wait matters: `domcontentloaded` fires long before the client bundle has
 * attached its handlers, and a click sent in that window is silently dropped —
 * which shows up later as a dialog that "never opened".
 */
async function fresh(page: Page, path: string = HUB) {
  await page.goto(path, { waitUntil: "domcontentloaded" })
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY)
  // Pin the hub to "Everything" for the bulk of the suite. The default is the
  // leaner "Guided" door, which deliberately keeps the tools one tap down —
  // the version tests below drive the switcher explicitly.
  await page.evaluate(() => window.localStorage.setItem("quit-vice-version", "full"))
  await page.reload({ waitUntil: "domcontentloaded" })
  await settled(page)
}

/**
 * Wait for the page to be interactive rather than merely present.
 *
 * Waiting for a heading or a button is not enough: the whole module is
 * server-rendered, so every control is in the HTML — and clickable-looking —
 * before React has attached a single handler. `data-hydrated` is set by the
 * client effect, so it is the one signal that means the buttons do something.
 */
async function settled(page: Page) {
  await page.locator('[data-hydrated="true"]').waitFor({ state: "attached", timeout: 30_000 })
}

/**
 * Click a step in the rail.
 *
 * Scoped to the nav on purpose: the footer's "next" button carries the same
 * title as the rail chip for the step it points at, so an unscoped lookup by
 * name matches two elements and fails on strict mode.
 */
async function goStep(page: Page, title: string) {
  const rail = page.getByRole("navigation", { name: "Steps" })
  // The rail collapses to a single position indicator now — twelve numbered
  // titles on every screen was about a third of the visible text. Open it,
  // pick the step, and it closes itself again.
  const target = rail.getByRole("button", { name: title })
  if (!(await target.isVisible().catch(() => false))) {
    await rail.getByRole("button").first().click()
    await page.waitForTimeout(120)
  }
  await target.click()
}

/** Fails the test on any console error, which is how a blank step shows up. */
function watchConsole(page: Page): string[] {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  page.on("pageerror", (error) => errors.push(String(error)))
  return errors
}

// ---------------------------------------------------------------- the hub

test.describe("the hub", () => {
  test("lists the four flows and reaches the tools with nothing set up", async ({ page }) => {
    const errors = watchConsole(page)
    await fresh(page)

    await expect(page.getByRole("heading", { name: "Quitting something" })).toBeVisible()
    for (const label of ["Watch it first", "Run an experiment", "Draw a line", "Change the week"]) {
      await expect(page.getByRole("heading", { name: label })).toBeVisible()
    }
    // The two that ask for no commitment sit above the four and apart from them.
    await expect(page.getByRole("heading", { name: "Find out where this actually is" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "What it gives you, honestly" })).toBeVisible()

    // The tools sit above the flows on purpose: somebody arriving mid-urge
    // must not have to pick a methodology first.
    await expect(page.getByRole("button", { name: /An urge, now/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /It already happened/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /My card/ })).toBeVisible()

    expect(errors).toEqual([])
  })

  test("shows no progress panel before anything is written", async ({ page }) => {
    await fresh(page)
    await expect(page.getByText("Where you are")).toHaveCount(0)
  })
})

// ------------------------------------------------------------- the tools

test.describe("the urge tool", () => {
  test("runs start to finish with no setup and logs one that passed", async ({ page }) => {
    const errors = watchConsole(page)
    await fresh(page)

    await page.getByRole("button", { name: /An urge, now/ }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // The line that removes the demand is on screen at every stage. Without
    // it the tool reads as a test, and the honest entries stop arriving.
    const standing = dialog.getByText("You can still do it afterwards. This is not a test.")
    await expect(standing).toBeVisible()

    await dialog.getByRole("button", { name: "None of those" }).click()
    await expect(standing).toBeVisible()

    await dialog.getByRole("button", { name: "Bored", exact: true }).click()
    await dialog.getByRole("button", { name: "Next", exact: true }).click()

    await dialog.getByRole("button", { name: "Chest", exact: true }).click()
    await dialog.getByRole("button", { name: "Tight", exact: true }).click()
    await dialog.getByRole("button", { name: "Next", exact: true }).click()

    await dialog.getByRole("button", { name: "What to do with it" }).click()
    await expect(standing).toBeVisible()
    // Four responses now, because observation alone has a large failure
    // literature. Watching is still one of them.
    await expect(dialog.getByRole("button", { name: /Play the tape forward/ })).toBeVisible()
    await expect(dialog.getByRole("button", { name: /Get out of the room/ })).toBeVisible()
    await dialog.getByRole("button", { name: /Watch it for ninety seconds/ }).click()
    await dialog.getByRole("button", { name: "skip" }).click()
    await dialog.getByRole("button", { name: "What happened" }).click()

    await dialog.getByRole("button", { name: /It passed/ }).click()
    await expect(dialog).toBeHidden()

    // It landed in the log, and the hub now says so.
    await expect(page.getByText("Where you are")).toBeVisible()
    await expect(page.getByText("urges came and went without you acting")).toBeVisible()

    expect(errors).toEqual([])
  })

  test("hands an urge that was acted on straight to the debrief", async ({ page }) => {
    await fresh(page)
    await page.getByRole("button", { name: /An urge, now/ }).click()
    const dialog = page.getByRole("dialog")

    await dialog.getByRole("button", { name: "None of those" }).click()
    await dialog.getByRole("button", { name: "Next", exact: true }).click()
    await dialog.getByRole("button", { name: "Next", exact: true }).click()
    await dialog.getByRole("button", { name: "What to do with it" }).click()
    await dialog.getByRole("button", { name: "What happened" }).click()
    await dialog.getByRole("button", { name: /I did it anyway/ }).click()

    await expect(page.getByRole("heading", { name: "You logged it" })).toBeVisible()
  })
})

test.describe("the lapse tool", () => {
  test("opens with no setup and offers nothing that resets", async ({ page }) => {
    await fresh(page)
    await page.getByRole("button", { name: /It already happened/ }).click()
    const dialog = page.getByRole("dialog")

    await expect(dialog.getByRole("heading", { name: "You logged it" })).toBeVisible()
    await expect(dialog.getByText(/Nothing here is going to reset/)).toBeVisible()

    // The two things that turn one lapse into abandoning the attempt are a
    // change of identity and a counter going to nought. Neither is here.
    await expect(dialog.getByText(/streak/i)).toHaveCount(0)
    await expect(dialog.getByText(/back to zero/i)).toHaveCount(0)

    await expect(dialog.getByText("Why today, and not yesterday?")).toBeVisible()
  })

  test("keeps what was typed after closing and reopening", async ({ page }) => {
    await fresh(page)
    await page.getByRole("button", { name: /It already happened/ }).click()
    const field = page.getByRole("dialog").getByLabel("What happened just before?")
    await field.fill("Got in at seven with nothing on")
    await page.getByRole("dialog").getByRole("button", { name: "Done" }).click()

    await page.getByRole("button", { name: /It already happened/ }).click()
    await expect(page.getByRole("dialog").getByLabel("What happened just before?")).toHaveValue("Got in at seven with nothing on")
  })
})

// -------------------------------------------------------------- the flows

test.describe("every flow", () => {
  for (const flow of FLOWS) {
    test(`${flow} renders every step without an error or an empty screen`, async ({ page }) => {
      const errors = watchConsole(page)
      await fresh(page, `${HUB}/${flow}`)

      const rail = page.getByRole("navigation", { name: "Steps" })
      // Open the collapsed rail to enumerate; index 0 is the toggle itself.
      await rail.getByRole("button").first().click()
      await page.waitForTimeout(120)
      const count = (await rail.getByRole("button").count()) - 1
      expect(count).toBeGreaterThan(3)
      // Close it again so the loop's own open/select cycle starts from a
      // known state — toggling an already-open rail shuts it.
      await rail.getByRole("button").first().click()
      await page.waitForTimeout(80)

      for (let i = 0; i < count; i += 1) {
        await rail.getByRole("button").first().click()
        await page.waitForTimeout(80)
        await rail.getByRole("button").nth(i + 1).click()
        // Each step renders its own h2. An empty screen has none.
        await expect(page.locator("h2").first()).toBeVisible()
        await expect(page.locator("main, body")).not.toContainText("undefined")
      }

      expect(errors).toEqual([])
    })
  }
})

test.describe("the safety gate", () => {
  test("holds the date for alcohol until the warning is read, and opens after", async ({ page }) => {
    await fresh(page, `${HUB}/experiment`)

    await goStep(page, "What is the experiment about?")
    await page.getByRole("button", { name: /^Drinking/ }).click()
    await goStep(page, "One thing before a date goes in")
    await page.getByRole("button", { name: "Shaking or tremors" }).click()
    await expect(page.getByRole("heading", { name: "Talk to a doctor before you stop" })).toBeVisible()

    // The length picker is reachable — nothing in this module hides a step —
    // but the buttons are inert and say why, rather than swallowing a click.
    await goStep(page, "How long")
    await expect(page.getByText(/the date is held until you do/)).toBeVisible()
    await expect(page.getByRole("button", { name: "30 days" })).toBeDisabled()
    await expect(page.getByText("Starting when?")).toHaveCount(0)

    await goStep(page, "One thing before a date goes in")
    await page.getByRole("button", { name: /I have read this/ }).click()

    await goStep(page, "How long")
    await page.getByRole("button", { name: "30 days" }).click()
    await expect(page.getByText("Starting when?")).toBeVisible()
  })

  test("does not gate a vice with no withdrawal risk", async ({ page }) => {
    await fresh(page, `${HUB}/experiment`)

    await goStep(page, "What is the experiment about?")
    await page.getByRole("button", { name: /^Scrolling/ }).click()
    await goStep(page, "One thing before a date goes in")
    await page.getByRole("button", { name: "Shaking or tremors" }).click()

    await goStep(page, "How long")
    await page.getByRole("button", { name: "30 days" }).click()
    await expect(page.getByText("Starting when?")).toBeVisible()
  })

  test("clears a stale answer when the vice changes", async ({ page }) => {
    await fresh(page, `${HUB}/experiment`)

    await goStep(page, "What is the experiment about?")
    await page.getByRole("button", { name: /^Scrolling/ }).click()
    await goStep(page, "One thing before a date goes in")
    await page.getByRole("button", { name: "None of these" }).click()
    await expect(page.getByText(/Nothing to flag then/)).toBeVisible()

    // Saying "none of these" about scrolling must not carry into drinking.
    await goStep(page, "What is the experiment about?")
    await page.getByRole("button", { name: /^Drinking/ }).click()
    await goStep(page, "One thing before a date goes in")
    await expect(page.getByText(/Nothing to flag then/)).toHaveCount(0)
  })
})

test.describe("the length picker", () => {
  test("opens at thirty and comes down only when asked", async ({ page }) => {
    await fresh(page, `${HUB}/experiment`)
    await goStep(page, "How long")

    await expect(page.getByRole("button", { name: "30 days" })).toBeVisible()
    await expect(page.getByRole("button", { name: "14 days" })).toHaveCount(0)

    await page.getByRole("button", { name: /Show me a shorter one/ }).click()
    await expect(page.getByRole("button", { name: "14 days" })).toBeVisible()

    for (let i = 0; i < 3; i += 1) await page.getByRole("button", { name: /Show me a shorter one/ }).click()
    await expect(page.getByRole("button", { name: "1 day" })).toBeVisible()
    await expect(page.getByText(/One day is on that list because it belongs there/)).toBeVisible()
  })

  test("offers today first", async ({ page }) => {
    await fresh(page, `${HUB}/experiment`)
    await goStep(page, "How long")
    await page.getByRole("button", { name: "30 days" }).click()
    await expect(page.getByRole("button", { name: /^Today/ })).toBeVisible()
  })
})

test.describe("the if-then builder", () => {
  test("refuses a plan phrased as what you will not do, and says why", async ({ page }) => {
    await fresh(page, `${HUB}/week`)
    await goStep(page, "One plan per situation")

    await page.getByLabel("When…").fill("someone offers me one")
    await page.getByLabel("…then I").fill("do not take it")

    await expect(page.getByText(/Name what you will do instead/)).toBeVisible()
    await expect(page.getByRole("button", { name: "Add it" })).toBeDisabled()
  })

  test("accepts a plan that names an action and stores it", async ({ page }) => {
    await fresh(page, `${HUB}/week`)
    await goStep(page, "One plan per situation")

    await page.getByLabel("When…").fill("it gets to six and I walk in")
    await page.getByLabel("…then I").fill("start the kettle before my coat is off")
    await page.getByRole("button", { name: "Add it" }).click()

    await expect(page.getByText("it gets to six and I walk in")).toBeVisible()
    // And it is on the card, which is the thing that gets opened at the time.
    await page.getByRole("button", { name: /My card/ }).click()
    await expect(page.getByRole("dialog").getByText(/start the kettle before my coat is off/)).toBeVisible()
  })
})

// ------------------------------------------------------- state lifecycle

test.describe("state", () => {
  test("survives a reload", async ({ page }) => {
    await fresh(page, `${HUB}/line`)
    await goStep(page, "What is the line about?")
    await page.getByRole("button", { name: /^Betting/ }).click()

    await page.reload({ waitUntil: "domcontentloaded" })
    await settled(page)
    await goStep(page, "What is the line about?")
    await expect(page.getByRole("button", { name: /^Betting/ })).toHaveAttribute("aria-pressed", "true")
  })

  test("is shared across all four flows", async ({ page }) => {
    await fresh(page, `${HUB}/experiment`)
    await goStep(page, "The card")
    await page.getByRole("textbox", { name: /Add to Three reasons/ }).fill("Saturday mornings back")
    await page.getByRole("button", { name: /Add to Three reasons/ }).click()

    // Same card, opened from a different flow entirely.
    await page.goto(`${HUB}/week`, { waitUntil: "domcontentloaded" })
    await settled(page)
    await page.getByRole("button", { name: /My card/ }).click()
    await expect(page.getByRole("dialog").getByText("Saturday mornings back")).toBeVisible()
  })

  test("start over clears everything, and is confirmed first", async ({ page }) => {
    await fresh(page, `${HUB}/line`)
    await goStep(page, "What is the line about?")
    await page.getByRole("button", { name: /^Betting/ }).click()

    await page.getByRole("button", { name: "start over" }).click()
    await expect(page.getByText("Delete everything, in every flow?")).toBeVisible()
    await page.getByRole("button", { name: "keep it" }).click()
    await goStep(page, "What is the line about?")
    await expect(page.getByRole("button", { name: /^Betting/ })).toHaveAttribute("aria-pressed", "true")

    await page.getByRole("button", { name: "start over" }).click()
    await page.getByRole("button", { name: "yes, start over" }).click()
    await goStep(page, "What is the line about?")
    await expect(page.getByRole("button", { name: /^Betting/ })).toHaveAttribute("aria-pressed", "false")
  })
})

// ------------------------------------------------------------- reachable

test.describe("reachability", () => {
  test("is linked from the test dashboard", async ({ page }) => {
    await page.goto("/test", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("link", { name: /Quitting a vice/ })).toBeVisible()
  })

  test("is reachable from the Vices routine inside Life Mastery", async ({ page }) => {
    // The stated point of the module: clickable from the Life Mastery page.
    // The routine there is a list of days you hold a line, which is the right
    // shape for a scoreboard and no help on the evening you do not hold it.
    await page.goto("/test/life-mastery", { waitUntil: "domcontentloaded" })
    await page.getByText("Opening your plan…").waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {})
    // The routines live under this step, and only under this one: the wanting
    // half and the doing half are two steps again, and a routine is always a
    // system. TAB_LABELS in src/goals/data/northStar.ts is the source of truth
    // for the name.
    await page.locator('nav[aria-label="Sections"] button', { hasText: "Systems" }).click()
    await page.locator("#ns-routines button", { hasText: "Vices" }).first().click()

    const link = page.getByRole("link", { name: /Working on one of these properly/ })
    await expect(link).toBeVisible()
    await link.click()

    await expect(page).toHaveURL(/\/test\/quit-vice$/)
    await expect(page.getByRole("heading", { name: "Quitting something" })).toBeVisible()
  })

  test("every flow links back to the hub", async ({ page }) => {
    for (const flow of FLOWS) {
      await page.goto(`${HUB}/${flow}`, { waitUntil: "domcontentloaded" })
      await settled(page)
      await page.getByRole("link", { name: "All four" }).click()
      await expect(page.getByRole("heading", { name: "Quitting something" })).toBeVisible()
    }
  })
})

test.describe("the rulers", () => {
  test("lets zero be answered, and asks the question written for it", async ({ page }) => {
    // An unanswered slider parks on zero, so without an explicit commit the one
    // answer with its own follow-up is the one answer nobody can give.
    await fresh(page, `${HUB}/experiment`)
    await goStep(page, "Two numbers")

    const importance = page.getByRole("slider", { name: /How important is it/ })
    await expect(page.getByText(/Zero is a real answer/).first()).toBeVisible()

    await importance.click({ position: { x: 2, y: 8 } })
    await expect(page.getByText("What would make this matter even a little?")).toBeVisible()
  })

  test("asks about a lower number, never a higher one", async ({ page }) => {
    await fresh(page, `${HUB}/experiment`)
    await goStep(page, "Two numbers")

    const importance = page.getByRole("slider", { name: /How important is it/ })
    await importance.focus()
    for (let i = 0; i < 6; i += 1) await page.keyboard.press("ArrowRight")

    await expect(page.getByText("How are you at a 6 instead of a 3?")).toBeVisible()
    await expect(page.getByText(/instead of a 9/)).toHaveCount(0)
  })
})

// -------------------------------------------------------- the awareness flow

/**
 * The awareness flow, and the four things about it that are design decisions
 * rather than incidental behaviour. Each of these could be "tidied up" by
 * somebody who did not know why it was that way, so each has a test.
 */
test.describe("finding out where it actually is", () => {
  async function pick(page: Page, vice: string) {
    await goStep(page, "What are we looking at?")
    await page.getByRole("button", { name: new RegExp(`^${vice}`) }).click()
  }

  test("counts the eleven for a substance and never hands out a label", async ({ page }) => {
    const errors = watchConsole(page)
    await fresh(page, `${HUB}/where`)
    await pick(page, "Drinking")
    await goStep(page, "The count")

    const items = page.getByRole("listitem")
    await expect(items).toHaveCount(11)

    for (let i = 0; i < 4; i += 1) {
      await items.nth(i).getByRole("button", { name: "Yes", exact: true }).click()
    }
    await expect(page.getByText("4 of 11 answered.")).toBeVisible()

    // A count, and no noun for the person anywhere on the screen.
    await goStep(page, "What it adds up to")
    await page.getByRole("textbox", { name: /what do you expect it to say/ }).fill("not many")
    await expect(page.getByText("of 11 things counted")).toBeVisible()
    await expect(page.getByText("described as moderate")).toBeVisible()
    await expect(page.locator("body")).not.toContainText("You are an")
    await expect(page.locator("body")).not.toContainText("You have a")

    expect(errors).toEqual([])
  })

  test("shows no number at all until a prediction has been written", async ({ page }) => {
    await fresh(page, `${HUB}/where`)
    await pick(page, "Drinking")
    await goStep(page, "The count")
    await page.getByRole("listitem").first().getByRole("button", { name: "Yes", exact: true }).click()

    await goStep(page, "What it adds up to")
    // Elicit before provide. A number that arrives unannounced gets argued with.
    await expect(page.getByText("of 11 things counted")).toHaveCount(0)
    await page.getByRole("textbox", { name: /what do you expect it to say/ }).fill("one or two")
    await expect(page.getByText("of 11 things counted")).toBeVisible()
  })

  test("gives a behaviour the shorter set, no tolerance, and no severity band", async ({ page }) => {
    await fresh(page, `${HUB}/where`)
    await pick(page, "Porn")
    await goStep(page, "The count")

    // Eight impairment items. Tolerance and withdrawal are absent by design:
    // running a dependence instrument here is the harm the module forbids.
    await expect(page.getByRole("listitem")).toHaveCount(8)
    await expect(page.getByText("less out of the same amount")).toHaveCount(0)
    await expect(page.getByText("Felt it physically when it wore off")).toHaveCount(0)
    // The honesty about there being no validated scale is still there — it
    // now sits behind the disclosure, because what to do stays visible and
    // why it works folds away.
    await page.getByText("what these are").click()
    await expect(page.getByText(/not a dependence scale/)).toBeVisible()

    await page.getByRole("listitem").first().getByRole("button", { name: "Yes", exact: true }).click()
    await page.getByRole("button", { name: /That I do it at all/ }).click()
    await expect(page.getByText(/quit plan is then aimed at the wrong thing/)).toBeVisible()
    // It asks what the feeling is attached to *now*, and says the answer moves,
    // because the accounts show a trajectory rather than three types of person.
    await expect(page.getByText(/because this moves/)).toBeVisible()
    await expect(page.getByRole("button", { name: /What I have started calling myself/ })).toBeVisible()

    await goStep(page, "What it adds up to")
    await page.getByRole("textbox", { name: /what do you expect it to say/ }).fill("a couple")
    await expect(page.getByText("No bands on this one")).toBeVisible()
    await expect(page.getByText("described as moderate")).toHaveCount(0)
  })

  test("flags the physical item for a substance, before any date is set", async ({ page }) => {
    await fresh(page, `${HUB}/where`)
    await pick(page, "Drinking")
    await goStep(page, "The count")
    await page.getByRole("listitem").nth(10).getByRole("button", { name: "Yes", exact: true }).click()

    await goStep(page, "What it adds up to")
    await page.getByRole("textbox", { name: /what do you expect it to say/ }).fill("just the one")
    await expect(page.getByText("Worth a doctor before a quit date")).toBeVisible()
  })
})

// ------------------------------------------------------------- the help door

test.describe("the help door", () => {
  test("is one tap from every flow and leads with the crisis block", async ({ page }) => {
    for (const flow of FLOWS) {
      await page.goto(`${HUB}/${flow}`, { waitUntil: "domcontentloaded" })
      await settled(page)
      await page.getByRole("button", { name: "Need more than this" }).click()
      await expect(page.getByRole("dialog").getByRole("heading", { name: "Past what a page can do" })).toBeVisible()
      // `exact` matters: Radix ships its own sr-only "Close" button, so a
      // loose name match resolves to two elements and trips strict mode.
      await page.getByRole("dialog").getByRole("button", { name: "close", exact: true }).click()
    }
  })

  test("gives real numbers per locale and answers the bar-to-clear belief first", async ({ page }) => {
    await fresh(page)
    await page.getByRole("button", { name: /past what a page can do/i }).click()
    const dialog = page.getByRole("dialog")

    await dialog.getByRole("button", { name: "United Kingdom" }).click()
    await expect(dialog.getByText("116 123")).toBeVisible()
    await expect(dialog.getByText("Emergency: 999")).toBeVisible()
    await expect(dialog.getByText("There is no bar to clear first")).toBeVisible()

    await dialog.getByRole("button", { name: "United States" }).click()
    await expect(dialog.getByText("Call or text 988")).toBeVisible()
    await expect(dialog.getByText("1-800-662-4357")).toBeVisible()
    await expect(dialog.getByText("116 123")).toHaveCount(0)
  })

  test("refuses a negated call plan and explains why, then stores a real one", async ({ page }) => {
    await fresh(page)
    await page.getByRole("button", { name: /past what a page can do/i }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: "United Kingdom" }).click()

    await dialog.getByRole("textbox", { name: "When…" }).fill("Monday at nine")
    await dialog.getByRole("textbox", { name: "…then I" }).fill("not put it off again")
    // The code must never reach the screen. It did once.
    await expect(dialog.getByText(/Name what you will do instead/)).toBeVisible()
    await expect(dialog.getByText("negation", { exact: true })).toHaveCount(0)
    await expect(dialog.getByRole("button", { name: /Add it to my plans/ })).toBeDisabled()

    await dialog.getByRole("textbox", { name: "…then I" }).fill("ring the surgery")
    await dialog.getByRole("button", { name: /Add it to my plans/ }).click()
    await expect(dialog.getByText("That is in your plans now")).toBeVisible()
  })
})

// ------------------------------------------------------- what it gives you

/**
 * The gives flow, and the four things about it that are load-bearing.
 *
 * The one to guard hardest: this must never become a pros-and-cons grid. The
 * good half and the costly half live on separate screens and nothing totals
 * them, because getting an ambivalent person to argue out loud for keeping it
 * is what predicts them keeping it.
 */
test.describe("what it gives you", () => {
  async function pick(page: Page, vice: string) {
    await goStep(page, "What are we talking about?")
    await page.getByRole("button", { name: new RegExp(`^${vice}`) }).click()
  }

  /** Sliders are the only control here; Playwright needs the keyboard for them. */
  async function slide(page: Page, claim: string, to: number) {
    const slider = page.getByRole("slider", { name: claim })
    await slider.focus()
    for (let i = 0; i < to; i += 1) await slider.press("ArrowRight")
  }

  test("only carries beliefs rated four or higher into the check", async ({ page }) => {
    const errors = watchConsole(page)
    await fresh(page, `${HUB}/gives`)
    await pick(page, "Drinking")

    await goStep(page, "What it gives you")
    await slide(page, "It makes me easier company.", 8)
    await slide(page, "It helps me sleep.", 2)
    await expect(page.getByText("1 of them is a four or higher")).toBeVisible()

    await goStep(page, "Now check them")
    await expect(page.getByText("It makes me easier company.")).toBeVisible()
    // Rated a two, so it is not worth walking anybody through checking it.
    await expect(page.getByText("It helps me sleep.")).toHaveCount(0)

    expect(errors).toEqual([])
  })

  test("never totals the good half against the costly half", async ({ page }) => {
    await fresh(page, `${HUB}/gives`)
    await pick(page, "Drinking")
    await goStep(page, "What you are for")
    await page.getByRole("button", { name: "Being fit", exact: true }).click()

    // Both directions are asked, and the helpful one is asked first.
    await expect(page.getByText("Which of these does it help with?")).toBeVisible()
    await expect(page.getByText("And which does it get in the way of?")).toBeVisible()
    // No score, no total, no verdict.
    await expect(page.locator("body")).not.toContainText("on balance")
    await page.getByText("why there is no score here").click()
    await expect(page.getByText("No scoring on this screen")).toBeVisible()
  })

  test("caps the top three and drops a value that gets unpicked", async ({ page }) => {
    await fresh(page, `${HUB}/gives`)
    await pick(page, "Drinking")
    await goStep(page, "What you are for")

    const picks = ["Being fit", "Being honest", "Faith", "Being kind"]
    for (const value of picks) await page.getByRole("button", { name: value, exact: true }).click()

    // Tap all four in the ranking row; the fourth must not take.
    const ranking = page.getByRole("group", { name: "Your top three" })
    for (const value of picks) {
      await ranking.getByRole("button", { name: value }).click()
    }
    const stored = await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key)
      return raw ? (JSON.parse(raw).lists?.["values.top"] ?? []) : []
    }, STORAGE_KEY)
    expect(stored).toHaveLength(3)
  })

  test("puts a future cue into the urge tool and onto the card", async ({ page }) => {
    await fresh(page, `${HUB}/gives`)
    await pick(page, "Drinking")
    await goStep(page, "Two versions of later")

    const cue = "Out with the dog before it gets dark, and I sleep through."
    await page.getByRole("textbox", { name: "Something changed" }).first().fill(cue)
    await expect(page.getByText("1 of 4 written.")).toBeVisible()

    // The whole point of writing them short: they are used at the decision.
    await page.getByRole("button", { name: /An urge, now/ }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: "None of those" }).click()
    await dialog.getByRole("button", { name: "Next", exact: true }).click()
    await dialog.getByRole("button", { name: "Next", exact: true }).click()
    await dialog.getByRole("button", { name: "What to do with it" }).click()
    await expect(dialog.getByText(cue)).toBeVisible()
    await dialog.getByRole("button", { name: "close", exact: true }).click()

    await page.getByRole("button", { name: /My card/ }).click()
    await expect(page.getByRole("dialog").getByText("Where the other way goes")).toBeVisible()
    await expect(page.getByRole("dialog").getByText(cue)).toBeVisible()
  })

  test("warns before a goodbye letter when no line has been drawn", async ({ page }) => {
    await fresh(page, `${HUB}/gives`)
    await pick(page, "Drinking")
    await goStep(page, "The letter")

    // A farewell presumes a decision this flow has not asked anybody to make.
    await expect(page.getByText(/goodbye to something you are still deciding about/)).toBeVisible()
    await page.getByText("how well this one is evidenced").click()
    await expect(page.getByText(/very little research behind it/)).toBeVisible()

    await page.getByRole("button", { name: /A letter from it, to you/ }).click()
    await page.getByRole("textbox").first().fill("I have been here since you were nineteen.")
    await expect(page.getByText(/goes into the copy-out/)).toBeVisible()
  })
})

// --------------------------------------------------- the good stretch

/**
 * The tripwire and the rebuilt urge response.
 *
 * Both come from the same finding, which is the loudest one in the research
 * corpus: across eight independent sources the relapse trigger people describe
 * is feeling *fine* rather than craving.
 */
test.describe("the tripwire", () => {
  test("is reachable with nothing set up and warns about self-trust", async ({ page }) => {
    const errors = watchConsole(page)
    await fresh(page)

    await page.getByRole("button", { name: /A rule for the week it is going well/ }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("heading", { name: /A rule for the week it is going well/ })).toBeVisible()

    await dialog.getByRole("button", { name: "I could probably moderate now" }).click()
    await dialog.getByRole("textbox").last().fill("I will be fine, just have one")
    // The counter-intuitive finding: a plan resting on self-trust is the
    // fragile kind. Everyone whose plan rested on restored confidence failed.
    await expect(dialog.getByText(/a plan that rests on trusting yourself is the fragile kind/)).toBeVisible()

    await dialog.getByRole("textbox").last().fill("text Sam that the thought turned up, before I do anything")
    await dialog.getByRole("button", { name: /Save the tripwire/ }).click()
    await expect(dialog.getByText(/That is your tripwire/)).toBeVisible()

    expect(errors).toEqual([])
  })

  test("refuses a tripwire phrased as what you will not do", async ({ page }) => {
    await fresh(page)
    await page.getByRole("button", { name: /A rule for the week it is going well/ }).click()
    const dialog = page.getByRole("dialog")

    await dialog.getByRole("button", { name: "I have earned this" }).click()
    await dialog.getByRole("textbox").last().fill("not act on it")
    await expect(dialog.getByText(/Name what you will do instead/)).toBeVisible()
    await expect(dialog.getByRole("button", { name: /Save the tripwire/ })).toBeDisabled()
  })
})

test.describe("the urge response is a choice, not one answer", () => {
  test("offers four responses and reorders them for a cue-rich room", async ({ page }) => {
    await fresh(page)
    await page.getByRole("button", { name: /An urge, now/ }).click()
    const dialog = page.getByRole("dialog")

    await dialog.getByRole("button", { name: "None of those" }).click()
    await dialog.getByRole("button", { name: "Next", exact: true }).click()
    await dialog.getByRole("button", { name: "Next", exact: true }).click()
    await dialog.getByRole("button", { name: "What to do with it" }).click()

    // Observation is one option among four rather than the only one, because
    // the peer corpus barely teaches it and reports it extending the urge.
    for (const label of ["Play the tape forward", "Get out of the room", "Move", "Watch it for ninety seconds"]) {
      await expect(dialog.getByRole("button", { name: new RegExp(label) })).toBeVisible()
    }

    await dialog.getByRole("button", { name: /Near it, or with people who are using/ }).click()
    await expect(dialog.getByText(/moving your attention away works better/)).toBeVisible()
  })

  test("writes the tape forward rather than only timing a wait", async ({ page }) => {
    await fresh(page)
    await page.getByRole("button", { name: /An urge, now/ }).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: "None of those" }).click()
    await dialog.getByRole("button", { name: "Next", exact: true }).click()
    await dialog.getByRole("button", { name: "Next", exact: true }).click()
    await dialog.getByRole("button", { name: "What to do with it" }).click()

    await dialog.getByRole("button", { name: /Play the tape forward/ }).click()
    await expect(dialog.getByRole("textbox", { name: /what happens next/i })).toBeVisible()
  })
})

test.describe("the refusal line names the right thing", () => {
  test("does not tell a gambling user about drinking", async ({ page }) => {
    await fresh(page, `${HUB}/where`)
    await goStep(page, "What are we looking at?")
    await page.getByRole("button", { name: /^Betting/ }).click()

    await page.getByRole("button", { name: /My card/ }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("If it is offered")).toBeVisible()
    await expect(dialog.getByText(/not drinking at the moment/)).toHaveCount(0)
    await expect(dialog.getByText(/not putting anything on/)).toBeVisible()
  })
})

// ------------------------------------------------------------- versions

/**
 * Three front doors over one state.
 *
 * The module's copy had grown to roughly 9,700 words — about forty-four
 * minutes of reading — in front of somebody who is ambivalent by definition.
 * Three versions is only a defensible answer to that if moving between them
 * is free, so that is what these check.
 */
test.describe("the version switcher", () => {
  test("offers all three and remembers the choice", async ({ page }) => {
    await fresh(page)
    const group = page.getByRole("group", { name: "How much to show" })
    for (const label of ["Plain", "Guided", "Everything"]) {
      await expect(group.getByRole("button", { name: label })).toBeVisible()
    }
    await group.getByRole("button", { name: "Plain" }).click()
    await expect(page.getByRole("heading", { name: "What is going on?" })).toBeVisible()

    await page.reload({ waitUntil: "domcontentloaded" })
    await settled(page)
    await expect(page.getByRole("heading", { name: "What is going on?" })).toBeVisible()
  })

  test("shows dramatically less at once in the lean versions", async ({ page }) => {
    await fresh(page)
    const group = page.getByRole("group", { name: "How much to show" })
    const words = async () => {
      const t = (await page.locator(".max-w-3xl").first().innerText()) ?? ""
      return t.split(/\s+/).filter(Boolean).length
    }
    await group.getByRole("button", { name: "Everything" }).click()
    const full = await words()
    await group.getByRole("button", { name: "Plain" }).click()
    const plain = await words()
    // The whole point of the version existing.
    expect(plain).toBeLessThan(full / 2)
  })

  test("carries work across a switch, which is the claim that matters", async ({ page }) => {
    await fresh(page)
    const group = page.getByRole("group", { name: "How much to show" })

    await group.getByRole("button", { name: "Everything" }).click()
    await page.getByRole("button", { name: /A rule for the week it is going well/ }).click()
    let dialog = page.getByRole("dialog")
    await dialog.getByRole("button", { name: "I have earned this" }).click()
    await dialog.getByRole("textbox").last().fill("ring Sam before I do anything")
    await dialog.getByRole("button", { name: /Save the tripwire/ }).click()
    await dialog.getByRole("button", { name: "close", exact: true }).click()

    // Same work, different door.
    await group.getByRole("button", { name: "Plain" }).click()
    await page.getByRole("button", { name: /It is going well, actually/ }).click()
    dialog = page.getByRole("dialog")
    await expect(dialog.getByText("ring Sam before I do anything")).toBeVisible()
  })

  test("opens the acute door by default, so an urge is one tap away", async ({ page }) => {
    await page.goto(HUB, { waitUntil: "domcontentloaded" })
    await page.evaluate(() => {
      window.localStorage.removeItem("quit-vice-v1")
      window.localStorage.setItem("quit-vice-version", "guided")
    })
    await page.reload({ waitUntil: "domcontentloaded" })
    await settled(page)

    // Somebody arriving mid-urge must not have to open a disclosure first.
    await expect(page.getByRole("button", { name: "An urge, right now" })).toBeVisible()
    // The considered door stays shut; nothing behind it is urgent.
    await expect(page.getByRole("link", { name: /Whether this is actually a problem/ })).toHaveCount(0)
  })

  test("routes the plain answers to the right places", async ({ page }) => {
    await fresh(page)
    await page.getByRole("group", { name: "How much to show" }).getByRole("button", { name: "Plain" }).click()

    // The fault this caught: this answer used to open the reading library.
    await page.getByRole("link", { name: /I do not know if this is a problem/ }).click()
    await expect(page).toHaveURL(/\/where$/)
    await expect(page.getByRole("heading", { name: /Find out where this actually is/ })).toBeVisible()
  })
})
