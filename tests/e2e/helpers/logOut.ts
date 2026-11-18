import type { Page } from "@playwright/test"

/**
 * Press Log Out wherever this screen keeps it. A laptop and a tablet have it in
 * the site header; a phone has no header, and since the More sheet went
 * (2026-11-10, f2b5bf58) its Log Out is on the You tab. Only presses it: what
 * Log Out then asks or does is the test's to check.
 */
export async function pressLogOut(page: Page): Promise<void> {
  const header = page.getByTestId("header-logout-button")
  if (await header.isVisible()) {
    await header.click()
    return
  }
  await page.getByTestId("tab-you").click()
  await page.getByTestId("you-logout-button").click()
}
