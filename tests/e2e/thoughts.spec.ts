import { test, expect } from "./fixtures/test"
import type { Page } from "@playwright/test"
import { ROUTES } from "@/src/shared/routes"

/**
 * THOUGHT FREQUENCIES, BY HAND (Plans/thought.md, Phase 3 and 4).
 *
 * Each worker has its own fresh account, so every test starts from an empty
 * page. The acceptance the plan names: add "I am bad", tap it five times,
 * undo one, and see 4 — after a reload, so the count is the server's.
 */

async function open(page: Page): Promise<void> {
  await page.goto(ROUTES.thoughts)
  await expect(page.getByTestId("thoughts-page")).toBeVisible()
}

async function add(page: Page, text: string): Promise<void> {
  const logged = page.waitForResponse((r) => r.url().endsWith("/api/thoughts/logs") && r.ok())
  await page.getByTestId("thought-input").fill(text)
  await page.getByTestId("thought-input").press("Enter")
  await logged
}

function button(page: Page, text: string) {
  return page.getByTestId("thought-button").filter({ hasText: text })
}

test.describe("thought frequencies @phone", () => {
  test("a new thought becomes a button; taps count, undo takes one back, and it all survives a reload", async ({ page }) => {
    await open(page)
    await expect(page.getByTestId("thoughts-empty")).toBeVisible()

    await add(page, "I am bad")
    await expect(button(page, "I am bad")).toContainText("1")

    for (let i = 0; i < 4; i++) {
      const sent = page.waitForResponse((r) => r.url().endsWith("/api/thoughts/logs") && r.ok())
      await button(page, "I am bad").click()
      await sent
    }
    await expect(button(page, "I am bad")).toContainText("5")

    const undone = page.waitForResponse((r) => r.url().includes("/api/thoughts/logs/") && r.request().method() === "DELETE")
    await page.getByTestId("logged-notice").getByRole("button", { name: "Undo" }).click()
    await undone
    await expect(button(page, "I am bad")).toContainText("4")

    await page.reload()
    await expect(button(page, "I am bad")).toContainText("4")
  })

  test("typing a near-copy offers the thought you already have instead of a second one", async ({ page }) => {
    await open(page)
    await add(page, "I am bad")

    await page.getByTestId("thought-input").fill("im bad")
    const suggestion = page.getByTestId("thought-suggestions").getByRole("listitem").filter({ hasText: "I am bad" })
    await expect(suggestion).toBeVisible()
    const sent = page.waitForResponse((r) => r.url().endsWith("/api/thoughts/logs") && r.ok())
    await suggestion.click()
    await sent

    await expect(page.getByTestId("thought-button")).toHaveCount(1)
    await expect(button(page, "I am bad")).toContainText("2")
  })

  test("the same words with different case and punctuation are the same thought", async ({ page }) => {
    await open(page)
    await add(page, "I am bad")
    await add(page, "i am BAD.")

    await expect(page.getByTestId("thought-button")).toHaveCount(1)
    await expect(button(page, "I am bad")).toContainText("2")
  })

  test("a thought's sheet merges, archives and deletes", async ({ page }) => {
    await open(page)
    await add(page, "I am bad")
    await add(page, "Im so bad")
    await add(page, "Nobody likes me")
    await add(page, "I will be late")

    // Merge "Im so bad" into "I am bad": its log moves there.
    await page.getByTestId("show-all").click()
    await page.getByTestId("all-thoughts-sheet").getByRole("button", { name: /Im so bad/ }).click()
    await page.getByTestId("thought-sheet").getByRole("button", { name: "Merge into another thought" }).click()
    await page.getByTestId("thought-sheet").getByRole("button", { name: /^I am bad/ }).click()
    await expect(page.getByTestId("thought-sheet")).toBeHidden()
    await expect(button(page, "Im so bad")).toHaveCount(0)
    await expect(button(page, "I am bad")).toContainText("2")

    // Archive hides it from the buttons.
    await page.getByTestId("show-all").click()
    await page.getByTestId("all-thoughts-sheet").getByRole("button", { name: /Nobody likes me/ }).click()
    await page.getByTestId("thought-sheet").getByRole("button", { name: /Archive/ }).click()
    await expect(button(page, "Nobody likes me")).toHaveCount(0)

    // Delete asks first, then it is gone for good.
    await page.getByTestId("show-all").click()
    await page.getByTestId("all-thoughts-sheet").getByRole("button", { name: /I will be late/ }).click()
    await page.getByTestId("thought-sheet-delete").click()
    await page.getByTestId("thought-sheet-confirm-delete").click()
    await expect(button(page, "I will be late")).toHaveCount(0)

    await page.reload()
    await expect(page.getByTestId("thought-button")).toHaveCount(1)
    await expect(button(page, "I am bad")).toContainText("2")
  })

  test("a reframe is saved and shown the next time the thought is tapped", async ({ page }) => {
    await open(page)
    await add(page, "I am bad")

    await page.getByTestId("show-all").click()
    await page.getByTestId("all-thoughts-sheet").getByRole("button", { name: /I am bad/ }).click()
    await page.getByTestId("thought-sheet-reframe").click()
    await expect(page.getByTestId("reframe-flow")).toBeVisible()
    await page.getByTestId("reframe-text").fill("I made a mistake today. That makes me someone who is learning.")
    const saved = page.waitForResponse((r) => r.url().endsWith("/api/thoughts/reframes") && r.ok())
    await page.getByTestId("reframe-save").click()
    await saved
    await expect(page.getByTestId("reframe-flow")).toBeHidden()

    await button(page, "I am bad").click()
    await expect(page.getByTestId("logged-reframe")).toContainText("someone who is learning")
  })
})

test.describe("reminders @phone", () => {
  test("settings save and survive a reload; a registered device can be switched off and removed", async ({ page }) => {
    await open(page)
    await add(page, "I am bad")

    // A device as a browser would register it. Real push delivery needs a
    // real phone (Plans/thought.md, B-PHONE); this checks everything around it.
    const registered = await page.request.post("/api/notifications/devices", {
      data: {
        intent: "enable",
        label: "Test phone · installed app",
        subscription: { endpoint: `https://fcm.googleapis.com/fcm/send/e2e-${Date.now()}`, keys: { p256dh: "BNcR_e2e", auth: "tBHI_e2e" } },
      },
    })
    expect(registered.ok()).toBe(true)

    await page.getByTestId("reminder-settings-open").click()
    const sheet = page.getByTestId("reminders-sheet")
    await expect(sheet).toBeVisible()
    const saved = page.waitForResponse((r) => r.url().endsWith("/api/thoughts/settings") && r.ok())
    await sheet.getByRole("radio", { name: "30 min" }).click()
    await saved
    await expect(sheet.getByText("Test phone · installed app")).toBeVisible()

    const switched = page.waitForResponse((r) => r.url().includes("/api/notifications/devices/") && r.request().method() === "PATCH")
    await sheet.getByRole("switch", { name: "Reminders on Test phone · installed app" }).click()
    await switched
    const removed = page.waitForResponse((r) => r.url().includes("/api/notifications/devices/") && r.request().method() === "DELETE")
    await sheet.getByRole("button", { name: "Remove Test phone · installed app" }).click()
    await removed
    await expect(sheet.getByText("No device receives reminders yet.")).toBeVisible()

    await page.reload()
    await page.getByTestId("reminder-settings-open").click()
    await expect(page.getByTestId("reminders-sheet").getByRole("radio", { name: "30 min" })).toHaveAttribute("aria-checked", "true")
  })

  test("a reminder opens the quick-log sheet; one tap logs and closes it, and 'nothing notable' is an answer", async ({ page }) => {
    await open(page)
    await add(page, "I am bad")

    await page.goto(`${ROUTES.thoughts}?log=1&prompt=${crypto.randomUUID()}`)
    const quick = page.getByTestId("quick-log")
    await expect(quick).toBeVisible()
    const sent = page.waitForResponse((r) => r.url().endsWith("/api/thoughts/logs") && r.ok())
    await quick.getByTestId("thought-button").filter({ hasText: "I am bad" }).click()
    await sent
    await expect(quick).toBeHidden()
    await expect(page).toHaveURL(new RegExp(`${ROUTES.thoughts}$`))
    await expect(button(page, "I am bad")).toContainText("2")

    await page.goto(`${ROUTES.thoughts}?log=1&prompt=${crypto.randomUUID()}`)
    const answered = page.waitForResponse((r) => r.url().endsWith("/api/thoughts/logs") && r.ok())
    await page.getByTestId("quick-log-nothing").click()
    await answered
    await expect(page.getByTestId("logged-notice")).toContainText("nothing notable")
    await expect(button(page, "I am bad")).toContainText("2")
  })

  test("the install shortcut opens the sheet without 'nothing notable'", async ({ page }) => {
    await open(page)
    await page.goto(`${ROUTES.thoughts}?log=1`)
    await expect(page.getByTestId("quick-log")).toBeVisible()
    await expect(page.getByTestId("quick-log-nothing")).toHaveCount(0)
  })
})
