import { expect, type Page } from "@playwright/test"
import { whenHydrated } from "./hydration"

/**
 * Press Log Out wherever this screen keeps it. A laptop and a tablet have it in
 * the site header; a phone has no header, and since the More sheet went
 * (2026-11-10, f2b5bf58) its Log Out is on the You tab. Only presses it: what
 * Log Out then asks or does is the test's to check.
 *
 * It waits until React owns the button first: a press before that does nothing,
 * and the test would then wait for a Log Out that was never asked for.
 */
export async function pressLogOut(page: Page): Promise<void> {
  const header = page.getByTestId("header-logout-button")
  if (await header.isVisible()) {
    await (await whenHydrated(header, 60_000)).click()
    return
  }
  await page.getByTestId("tab-you").click()
  await expect(page.getByRole("heading", { name: "You", level: 1 })).toBeVisible()
  await (await whenHydrated(page.getByTestId("you-logout-button"), 60_000)).click()
}
