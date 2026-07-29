/**
 * E2E: /test/vision-plan — full vision → goals → balance → confirm → track
 * journey. The LLM route (/api/goals/vision-plan) is mocked at the network
 * layer so the spec is deterministic and free; the in-browser embedder is real
 * (model download is cached by the browser between runs).
 */
import { test, expect, Page } from "@playwright/test"
import { loginAsUserB } from "./helpers/auth.helper"

const VISION = "I want to wake up and feel happy with my life, build a business, and be in love"

const MOCK_GOALS = {
  goals: [
    {
      id: "goal-0",
      title: "Build a real business",
      pillarId: "wealth",
      pillarLabel: "Wealth",
      pillarColor: "#a855f7",
      objectiveId: "obj_business",
      objectiveLabel: "Start a Business",
      type: "milestone_ladder",
      why: "You said you want to build a business.",
      sourceIntentIds: ["intent-0"],
      habits: [{ id: "goal-0-habit-0", title: "90 min deep work", daysPerWeek: 5 }],
      tasks: [{ id: "goal-0-task-0", title: "Pick the idea", dueOffsetDays: 0 }],
      measure: { unit: "$/month", start: 0, target: 5000, steps: 5 },
      rampSteps: null,
    },
    {
      id: "goal-1",
      title: "Find someone to love",
      pillarId: "relations",
      pillarLabel: "Relations",
      pillarColor: "#f97316",
      objectiveId: "obj_girlfriend",
      objectiveLabel: "Get a Girlfriend",
      type: "habit_ramp",
      why: "You said you want to be in love.",
      sourceIntentIds: ["intent-1"],
      habits: [{ id: "goal-1-habit-0", title: "Start one conversation", daysPerWeek: 3 }],
      tasks: [],
      measure: null,
      rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }],
    },
  ],
}

async function openFreshLab(page: Page) {
  await page.goto("/test/vision-plan")
  await page.evaluate(() => localStorage.removeItem("visionPlanSandbox_v1"))
  await page.reload()
}

/** v17 — the prose box is collapsed by default (the wheel is the way in); open it. */
async function openProse(page: Page) {
  await page.getByRole("button", { name: /Prefer to write your whole vision/ }).click()
}

async function deriveIntents(page: Page) {
  await openProse(page)
  await page.locator("textarea").first().fill(VISION)
  await page.getByRole("button", { name: /Build my plan/ }).click()
  // First run may download the embedding model in the browser. The North Star
  // confirms the reading landed on the Map stage.
  await expect(page.locator("text=North Star").first()).toBeVisible({ timeout: 300_000 })
  // v16 — goals + board live on the Track stage; navigate there.
  await page.getByRole("button", { name: /Set up tracking/ }).click()
  await expect(page.locator("text=/life areas? in your plan/")).toBeVisible({ timeout: 60_000 })
}

/** v16 — from the Track stage, step Back to Commit, sign, advance to Track. */
async function signManifesto(page: Page) {
  await page.getByRole("button", { name: "← Back" }).click()
  await page.locator("#lm-manifesto-name").fill("Audit")
  for (const l of ["keep going anyway", "hold the line", "feel the win"]) {
    await page.getByLabel("Add your own manifesto line").fill(l)
    await page.getByLabel("Add your own manifesto line").press("Enter")
  }
  await page.getByRole("button", { name: /This is my manifesto/ }).click()
  await page.getByRole("button", { name: /Next: Set up tracking/ }).click()
}

test.describe.configure({ mode: "serial" })

test.describe("vision-plan test page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUserB(page)
  })

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: "ignoreErrors" })
  })

  test("full journey: vision → intents → goals → balance → confirm → track → check off", async ({ page }) => {
    await page.route("**/api/goals/vision-plan", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GOALS) }),
    )
    await openFreshLab(page)

    // Arrange/Act: intents from the real embedder — the area board appears and
    // goals draft themselves (mocked LLM), no button click.
    await deriveIntents(page)

    // Assert: goal cards with decomposition
    await expect(page.locator("text=Build a real business").first()).toBeVisible()

    // Area board: toggling an area off hides its goals below; back on restores.
    await page.getByRole("button", { name: "Leave out Wealth" }).click()
    await expect(page.locator("text=Build a real business")).toHaveCount(0)
    await page.getByRole("button", { name: "Include Wealth" }).click()
    await expect(page.locator("text=Build a real business").first()).toBeVisible()
    await expect(page.locator("text=90 min deep work").first()).toBeVisible()
    await expect(page.getByRole("spinbutton", { name: "Target for Build a real business" })).toHaveValue("5000")

    // Assert: balance section exists with week 1 within cap
    await expect(page.locator("text=Balance your weeks").first()).toBeVisible()
    await expect(page.locator("text=Week 1").first()).toBeVisible()

    // Act: sign the manifesto on the Commit stage, back to Track, then confirm.
    await signManifesto(page)
    await page.getByRole("button", { name: /Save plan & start tracking/ }).click()
    await expect(page.getByRole("img", { name: /Life Mastery Wheel/ })).toBeVisible()

    // Act: check off everything due today
    const items = page.locator("li > button")
    const n = await items.count()
    for (let i = 0; i < n; i++) await items.nth(i).click()

    // Assert: at least one goal is Ahead (habit) or has task progress
    await expect(page.locator("text=/Ahead|1\\/1 tasks/").first()).toBeVisible()

    // Assert: persists across reload
    await page.reload()
    await expect(page.getByRole("img", { name: /Life Mastery Wheel/ })).toBeVisible({ timeout: 15_000 })
    expect(await page.locator("li .line-through").count()).toBeGreaterThanOrEqual(1)
  })

  test("LLM failure shows an explicit error and a retry, never a fallback plan", async ({ page }) => {
    await page.route("**/api/goals/vision-plan", (route) =>
      route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "Claude CLI returned no output" }) }),
    )
    await openFreshLab(page)
    // Goal design auto-fires after the reading — the failure must surface on its own.
    await deriveIntents(page)

    await expect(page.locator("text=/couldn.t draft suggestions/")).toBeVisible({ timeout: 30_000 })
    await expect(page.locator("text=/no output/")).toBeVisible()
    await expect(page.getByRole("button", { name: /Retry goal design/ })).toBeVisible()
    // No goal cards appeared — the mocked goal's title is nowhere on the page
    await expect(page.locator("text=Build a real business")).toHaveCount(0)
  })

  test("M8 tweaks: frequency stepper re-balances, milestone stepper, AI refine swaps the goal", async ({ page }) => {
    const refinedGoal = {
      ...MOCK_GOALS.goals[1],
      title: "Approach with intent",
      habits: [{ id: "goal-1-hR-0", title: "Talk to two strangers", daysPerWeek: 4, sourceTargetId: null }],
    }
    await page.route("**/api/goals/vision-plan", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GOALS) }),
    )
    await page.route("**/api/goals/vision-plan/refine", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ goal: refinedGoal }) }),
    )
    await openFreshLab(page)
    await deriveIntents(page)
    await expect(page.locator("text=90 min deep work").first()).toBeVisible()

    // Frequency stepper: 5×/wk → 6×/wk, steady-week meter reflects it
    await page.getByRole("button", { name: "More days for 90 min deep work" }).click()
    await expect(page.locator("text=6×/wk").first()).toBeVisible()

    // Milestone stepper: 5 → 6 rungs
    await page.getByRole("button", { name: "More milestones" }).click()
    await expect(page.locator("text=6 milestones").first()).toBeVisible()

    // Provenance badges present (mock habits are AI picks)
    expect(await page.locator("text=AI pick").count()).toBeGreaterThanOrEqual(1)

    // AI refine on the second goal (mocked): habits swap out. Only the first
    // goal's plan opens by default — unfold the second before refining.
    await page.getByRole("button", { name: /^The plan ·/ }).nth(1).click()
    const refineInput = page.locator("input[placeholder^='Tweak this goal']").nth(1)
    await refineInput.fill("more direct approach style")
    await refineInput.press("Enter")
    await expect(page.locator("text=Talk to two strangers").first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator("text=Approach with intent").first()).toBeVisible()
    await expect(page.locator("text=Start one conversation")).toHaveCount(0)
  })

  test("nonsense vision yields an explicit empty state", async ({ page }) => {
    await openFreshLab(page)
    await openProse(page)
    await page.locator("textarea").first().fill("asdf qwerty zxcv")
    await page.getByRole("button", { name: /Build my plan/ }).click()
    // v16 — the empty-state hint shows on the Map stage itself (no navigation).
    await expect(
      page.locator("text=/Couldn't find any goal areas/"),
    ).toBeVisible({ timeout: 300_000 })
  })
})

// ---------------------------------------------------------------------------
// M11 — workout day designer
// ---------------------------------------------------------------------------

const MOCK_WORKOUT_GOALS = {
  goals: [
    {
      id: "goal-0",
      title: "Build a great body",
      pillarId: "health",
      pillarLabel: "Health",
      pillarColor: "#22c55e",
      objectiveId: "obj_strong",
      objectiveLabel: "Get Strong",
      type: "habit_ramp",
      why: "You said you want a great body.",
      sourceIntentIds: ["intent-0"],
      habits: [{ id: "goal-0-habit-0", title: "Strength session", daysPerWeek: 7, sourceTargetId: null }],
      tasks: [],
      measure: null,
      rampSteps: [{ frequencyPerWeek: 7, durationWeeks: 4 }],
    },
  ],
}

test.describe("vision-plan workout designer (M11)", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeEach(async ({ page }) => {
    await loginAsUserB(page)
  })

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: "ignoreErrors" })
  })

  test("pick a split, rename/reorder days, see it in the week preview and today's checklist", async ({ page }) => {
    await page.route("**/api/goals/vision-plan", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_WORKOUT_GOALS) }),
    )
    await openFreshLab(page)
    await openProse(page)
    await page.locator("textarea").first().fill("i want a great body")
    await page.getByRole("button", { name: /Build my plan/ }).click()
    // v16 — goal cards live on the Track stage; navigate there after the read.
    await expect(page.locator("text=North Star").first()).toBeVisible({ timeout: 300_000 })
    await page.getByRole("button", { name: /Set up tracking/ }).click()
    await expect(page.locator("text=Strength session").first()).toBeVisible({ timeout: 60_000 })

    // Plain-language ramp + designer affordance are visible on a health goal
    await expect(page.locator("text=/Starts gentle/").first()).toBeVisible()
    await page.locator("text=Design training days").first().click()

    // Pick Push/Pull/Legs → named days + week preview appear (and frequency adopts ×3)
    await page.getByRole("button", { name: /Push \/ Pull \/ Legs/ }).click()
    await expect(page.locator("text=Training days — in order").first()).toBeVisible()
    await expect(page.locator("text=Your week:").first()).toBeVisible()
    await expect(page.locator("text=3×/wk").first()).toBeVisible()

    // Raise back to 7×/wk so today (any weekday) is scheduled — days then cycle
    for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "More days for Strength session" }).click()
    await expect(page.locator("text=days repeat within the week").first()).toBeVisible()

    // Rename day 1 → Chest Day A
    await page.locator("[aria-label='Rename day Push']").click()
    const rename = page.locator("input[aria-label='Rename day Push']")
    await rename.fill("Chest Day A")
    await rename.press("Enter")
    await expect(page.locator("text=Chest Day A").first()).toBeVisible()

    // Reorder: move Pull earlier → order Pull, Chest Day A, Legs
    await page.locator("[aria-label='Move Pull earlier']").click()
    // Add + remove a day round-trips. The remove control is hover-revealed, so
    // hover the row first, then click it directly (no force → waits for it).
    await page.getByRole("button", { name: "+ day" }).click()
    await expect(page.locator("text=Day D").first()).toBeVisible()
    const removeDayD = page.locator("[aria-label='Remove day Day D']")
    await removeDayD.scrollIntoViewIfNeeded()
    await removeDayD.hover()
    await removeDayD.click()
    await expect(page.locator("text=Day D")).toHaveCount(0)

    // Milestones note: habit_ramp goal has none — but the split survives confirm.
    // Commit (Save is gated on the manifesto), then Save from the Track stage.
    await signManifesto(page)
    await page.getByRole("button", { name: /Save plan & start tracking/ }).click()
    await expect(page.getByRole("img", { name: /Life Mastery Wheel/ })).toBeVisible()

    // 7×/wk habit is due today; PPL cycling puts SOME named day on today's row
    await expect(page.locator("li >> text=/— (Pull|Chest Day A|Legs)/").first()).toBeVisible()

    // Survives reload
    await page.reload()
    await expect(page.getByRole("img", { name: /Life Mastery Wheel/ })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator("li >> text=/— (Pull|Chest Day A|Legs)/").first()).toBeVisible()
  })
})
