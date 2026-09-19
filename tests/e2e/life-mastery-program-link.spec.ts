/**
 * A PROGRAM STARTED IN LIFE MASTERY IS THE SAME PROGRAM EVERYWHERE.
 *
 * This is the walk the whole phase exists for. The plan used to keep its OWN
 * copy of the training week — the day names, the program's name, how many days
 * a week — beside a reference to the enrollment that actually owns it. Every
 * screen then read whichever copy was nearest, and they disagreed:
 *
 *   - The Systems step offered to rename days the program never heard about.
 *   - It said "2 days a week" for StrongLifts, which is trained three times.
 *   - The Templates step warned that your written week "is not the week any of
 *     these prescribe" — about the program you were running.
 *   - Open the laptop after starting on the phone and the plan knew nothing.
 *   - Every week you built yourself was called "Your own program".
 *
 * The second browser context is the part that cannot be faked by a unit test:
 * a plan with no reference in its storage at all, which must still show the
 * running program's real week because it reconciles against the database.
 *
 * In the `training` project: it starts programs on the shared account.
 */

import { test, expect, type Page } from "@playwright/test"
import { LIFE_MASTERY } from "@/src/shared/lifeMasteryRoutes"

const PLAN_KEY = "north-star-v1"

/** A plan with a training routine and nothing else that matters here. */
const PLAN = {
  version: 1,
  seq: 2,
  areas: [{ id: "lm_fitness", label: "Fitness", sublabel: "", color: "#84cc16", custom: false }],
  routines: [
    {
      id: "r1",
      label: "Training week",
      blueprintId: "workout",
      kind: "weekly",
      areaId: "lm_fitness",
      serves: [],
      steps: [],
      daysPerWeek: 3,
      splitDays: [{ id: "d1", name: "Something I typed" }],
      program: null,
    },
  ],
  goals: [],
  answers: {},
  logged: {},
}

/** Seeded before the page's own scripts, or the flow's save effect wins. */
async function seed(page: Page, plan: unknown): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      if (!window.localStorage.getItem(key as string)) {
        window.localStorage.setItem(key as string, value as string)
      }
    },
    [PLAN_KEY, JSON.stringify(plan)]
  )
}

/** Every enrollment this spec made, ended and then removed. */
async function cleanUp(page: Page): Promise<void> {
  await page.evaluate(async () => {
    // A workout left open refuses every end below.
    const live = await (await fetch("/api/workouts/live")).json()
    if (live) await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })
    for (const e of await (await fetch("/api/programs/enrollments")).json()) {
      await fetch(`/api/programs/enrollments/${e.id}`, { method: "DELETE" })
      await fetch(`/api/programs/enrollments/${e.id}?permanent=1`, { method: "DELETE" })
    }
  })
}

/** Open the workout routine's card — MilestonesTab renders it only when open. */
async function openTrainingCard(page: Page): Promise<void> {
  await page.goto(`${LIFE_MASTERY}?step=systems`, { waitUntil: "networkidle" })
  await page.getByRole("button", { name: /Systems/ }).first().click()
  await page.getByText("Training week", { exact: false }).first().click()
}

test.describe("Life Mastery and the training database", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeEach(async ({ page }) => {
    test.setTimeout(240000)
    await page.setViewportSize({ width: 1280, height: 1000 })
    await seed(page, PLAN)
    await page.goto(LIFE_MASTERY, { waitUntil: "networkidle" })
    await cleanUp(page)
  })

  test.afterEach(async ({ page }) => {
    await cleanUp(page)
  })

  test("a program started here is the same program everywhere, in every browser", async ({
    page,
    browser,
  }) => {
    // ---- start StrongLifts from the Templates step ----------------------
    await page.goto(`${LIFE_MASTERY}?step=templates`, { waitUntil: "networkidle" })
    await page.getByRole("button", { name: /Templates/ }).first().click()
    await page.getByRole("button", { name: /^Strength$/ }).first().click()
    await page.getByRole("button", { name: /StrongLifts/i }).first().click()

    // TYPE A TWO-WORD DAY NAME. The space used to be deleted as it was typed,
    // because every keystroke went through a function that trims.
    const dayName = page.getByLabel(/Name of training day 1/i).first()
    await dayName.click()
    await dayName.fill("")
    await dayName.type("Upper Body")
    await expect(dayName, "the space must survive being typed").toHaveValue("Upper Body")
    await dayName.blur()

    await page.getByRole("button", { name: /Start tracking this/i }).first().click()
    await expect(page.getByText(/is running/i).first()).toBeVisible({ timeout: 30000 })

    // ---- the Systems step reads the program, and offers no copy to edit ---
    await openTrainingCard(page)
    const card = page.getByTestId("training-week-linked")
    await expect(card).toBeVisible({ timeout: 20000 })
    await expect(card).toContainText("StrongLifts")
    // Named from the person's OWN schedule, so the rename is what it says.
    await expect(card).toContainText("Upper Body")
    await expect(card).toContainText("in turn")

    /**
     * The made-up weekly number and the editing surface are both gone.
     *
     * The stepper is asserted through its BUTTONS, and the number inside the
     * card rather than on the page: a routine's individual steps legitimately
     * carry their own cadence, and their day pickers list "1×/wk" … "7×/wk" as
     * options. The fault was the one number claiming to describe the program's
     * whole week.
     */
    await expect(card).not.toContainText(/\d+×\/wk/)
    await expect(card).not.toContainText(/days a week/i)
    await expect(page.getByLabel(/days for/i)).toHaveCount(0)
    await expect(page.getByLabel(/Name for training day/i)).toHaveCount(0)

    // ---- and the Templates step invents no disagreement -------------------
    await page.goto(`${LIFE_MASTERY}?step=templates`, { waitUntil: "networkidle" })
    await expect(page.getByText(/is not the week any of these prescribe/i)).toHaveCount(0)

    // ---- A SECOND BROWSER THAT HAS NEVER SEEN THIS PLAN -------------------
    // The reference lives in the first browser's storage. This one has a plan
    // with none, which is what starting on your phone and opening the laptop
    // looks like — and what used to leave the laptop describing a week that
    // had nothing to do with the program running.
    const other = await browser.newContext({ storageState: "tests/e2e/.auth/user.json" })
    const fresh = await other.newPage()
    try {
      await seed(fresh, { ...PLAN, routines: [{ ...PLAN.routines[0], splitDays: [], program: null }] })
      await openTrainingCard(fresh)

      const adopted = fresh.getByTestId("training-week-linked")
      await expect(adopted, "the laptop adopts the program running on the account").toBeVisible({
        timeout: 20000,
      })
      await expect(adopted).toContainText("Upper Body")
      await expect(adopted).toContainText("in turn")
    } finally {
      await other.close()
    }
  })

  test("a week you write yourself is called what you called it, everywhere", async ({ page }) => {
    await page.goto(`${LIFE_MASTERY}?step=templates`, { waitUntil: "networkidle" })
    await page.getByRole("button", { name: /Templates/ }).first().click()
    await page.getByRole("button", { name: /build my own/i }).first().click()

    // The text box is behind its own toggle — the builder opens on the
    // click-to-build editor.
    await page.getByRole("button", { name: /Paste or write it instead/i }).first().click()
    const text = page.getByLabel(/Write your training week/i).first()
    await text.click()
    await text.fill("Pull\nPull-up 3x5 @bw")
    await page.getByRole("button", { name: /Use this/i }).first().click()

    await page.getByRole("button", { name: /Start tracking this/i }).first().click()

    // THE NAME. Without it every self-built week is "Your own program" — the
    // shared catalogue shell — in the live header, in History and on the card.
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 20000 })
    await dialog.getByLabel(/Week name/i).fill("Winter block")
    await dialog.getByRole("button", { name: /Start tracking this/i }).click()

    // WAIT FOR THE START TO LAND before leaving. Navigating straight after the
    // click raced the POST, and the failure read as "the name did not stick"
    // rather than "nothing was started".
    await expect(page.getByText(/Your program is running/i)).toBeVisible({ timeout: 30000 })

    await page.goto("/programs", { waitUntil: "networkidle" })
    await expect(page.getByText("Winter block").first()).toBeVisible({ timeout: 30000 })
    await expect(page.getByText("Your own program")).toHaveCount(0)
  })

  test("leaving for Training and coming back returns to the step you were on", async ({ page }) => {
    await page.goto(`${LIFE_MASTERY}?step=templates`, { waitUntil: "networkidle" })
    await page.getByRole("button", { name: /Systems/ }).first().click()

    // The address follows the step. `replaceState`, so it does NOT add a
    // history entry — pressing Back from here goes where you came from, which
    // is the point: the step is not a place you go back through.
    await expect(page).toHaveURL(/step=systems/)

    // THE CASE THIS EXISTS FOR. Follow a link out, press Back, and Life
    // Mastery used to reopen on the north star paragraph whatever step you
    // had been working on.
    await page.goto("/programs", { waitUntil: "networkidle" })
    await page.goBack()

    await expect(page).toHaveURL(/step=systems/)
    await expect(page.getByRole("heading", { name: /Systems|Your systems/i }).first()).toBeVisible({
      timeout: 20000,
    })
  })
})
