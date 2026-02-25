import { chromium } from "playwright"

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const page = await context.newPage()

  // Go to login page
  console.log("Navigating to login...")
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" })

  // Check if we need to log in
  const url = page.url()
  console.log("Current URL:", url)

  if (url.includes("/login") || url.includes("/auth")) {
    console.log("Logging in...")
    // Fill email
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    await emailInput.fill("test-user-b@daygame-coach-test.local")

    // Fill password
    const passwordInput = page.locator('input[type="password"], input[name="password"]')
    await passwordInput.fill("TestUserB_SecurePass123!")

    // Click submit
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // Wait for navigation
    await page.waitForTimeout(3000)
    console.log("After login URL:", page.url())
  }

  // Navigate directly to the goals v11 test page
  console.log("Navigating to /test/goalsv11...")
  await page.goto("http://localhost:3000/test/goalsv11", { waitUntil: "networkidle" })
  await page.waitForTimeout(2000)
  console.log("Current URL:", page.url())

  // If redirected to login, try again
  if (page.url().includes("/login") || page.url().includes("/preferences")) {
    if (page.url().includes("/login")) {
      console.log("Re-attempting login...")
      const emailInput = page.locator('input[type="email"], input[name="email"]')
      await emailInput.fill("test-user-b@daygame-coach-test.local")
      const passwordInput = page.locator('input[type="password"], input[name="password"]')
      await passwordInput.fill("TestUserB_SecurePass123!")
      const submitButton = page.locator('button[type="submit"]')
      await submitButton.click()
      await page.waitForTimeout(3000)
    }
    // Navigate again
    await page.goto("http://localhost:3000/test/goalsv11", { waitUntil: "networkidle" })
    await page.waitForTimeout(2000)
    console.log("Final URL:", page.url())
  }

  const screenshotDir = "tests/e2e/screenshots"
  const tabs = ["View A", "View B", "View C", "View D", "View E"]

  for (const tabLabel of tabs) {
    console.log(`Clicking tab: ${tabLabel}`)

    // Click the tab button
    const tabButton = page.locator(`button:has-text("${tabLabel}")`)
    await tabButton.click()

    // Wait for content to load
    await page.waitForTimeout(2000)

    // Take full page screenshot
    const filename = `goalsv11-${tabLabel.toLowerCase().replace(" ", "-")}.png`
    await page.screenshot({
      path: `${screenshotDir}/${filename}`,
      fullPage: true
    })
    console.log(`Screenshot saved: ${filename}`)
  }

  await browser.close()
  console.log("Done!")
}

main().catch(console.error)
