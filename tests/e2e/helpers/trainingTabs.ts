/**
 * WHICH TRAINING TAB TO OPEN — said once, for every spec.
 *
 * Fourteen places clicked `getByRole("button", { name: "History" })`, which
 * was right while the strip was a hand-rolled `Segmented` of plain buttons. It
 * became a real tab strip (`role="tab"`), and all fourteen started waiting
 * four minutes for a button that no longer exists. The strip will be repainted
 * again in Phase 8; one function means one place to change.
 *
 * It also prefers the URL, because the tab is in the address bar now: going
 * straight there is what a person following a link does, and it does not
 * depend on the strip being painted yet.
 */

import { expect, type Page } from "@playwright/test"

export type TrainingTab = "today" | "history" | "progress"

/** Click the tab, the way a person does. */
export async function openTab(page: Page, tab: TrainingTab): Promise<void> {
  const label = tab === "today" ? "Today" : tab === "history" ? "History" : "Progress"
  const trigger = page.getByRole("tab", { name: label, exact: true })
  await expect(trigger).toBeVisible({ timeout: 30000 })
  await trigger.click()
  await expect(trigger).toHaveAttribute("data-state", "active")
}

/** Arrive with the tab already chosen, as a link would. */
export async function gotoTab(page: Page, tab: TrainingTab): Promise<void> {
  await page.goto(tab === "today" ? "/programs" : `/programs?tab=${tab}`, {
    waitUntil: "networkidle",
  })
}
