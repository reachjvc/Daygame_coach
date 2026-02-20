/**
 * Playwright debug script for /test/goalsv7 click issues
 * Run with: npx playwright test test-goalsv7-debug.ts --headed
 */
import { test, expect, Page } from "@playwright/test"

test.describe("GoalsV7 Click Debug", () => {
  let consoleMessages: { type: string; text: string }[] = []

  test.beforeEach(async ({ page }) => {
    consoleMessages = []
    page.on("console", (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() })
    })
    page.on("pageerror", (err) => {
      consoleMessages.push({ type: "pageerror", text: err.message })
    })
  })

  test("Debug click issues on goalsv7", async ({ page }) => {
    // 1. Navigate and screenshot initial state
    await page.goto("http://localhost:3000/test/goalsv7", { waitUntil: "networkidle" })
    await page.waitForTimeout(2000) // Wait for dynamic imports + animations
    await page.screenshot({ path: "debug-screenshots/goalsv7-01-initial.png", fullPage: true })

    // 2. Dump console messages
    console.log("\n=== CONSOLE MESSAGES ===")
    for (const msg of consoleMessages) {
      console.log(`[${msg.type}] ${msg.text}`)
    }

    // 3. Check what elements exist at the click point of "Find The One" card
    const ftoCard = page.locator("button", { hasText: "Find The One" })
    const ftoCount = await ftoCard.count()
    console.log(`\n=== FTO CARD FOUND: ${ftoCount} ===`)

    if (ftoCount > 0) {
      const box = await ftoCard.first().boundingBox()
      console.log("FTO card bounding box:", JSON.stringify(box))

      // Check if visible
      const isVisible = await ftoCard.first().isVisible()
      console.log("FTO card isVisible:", isVisible)

      // Check if enabled
      const isEnabled = await ftoCard.first().isEnabled()
      console.log("FTO card isEnabled:", isEnabled)

      // Check computed styles
      const styles = await ftoCard.first().evaluate((el) => {
        const computed = window.getComputedStyle(el)
        return {
          pointerEvents: computed.pointerEvents,
          opacity: computed.opacity,
          visibility: computed.visibility,
          display: computed.display,
          zIndex: computed.zIndex,
          position: computed.position,
          overflow: computed.overflow,
        }
      })
      console.log("FTO card computed styles:", JSON.stringify(styles, null, 2))
    }

    // 4. Check for overlay elements blocking clicks
    console.log("\n=== OVERLAY CHECK ===")
    const overlayCheck = await page.evaluate(() => {
      // Find all fixed/absolute positioned elements
      const allElements = document.querySelectorAll("*")
      const overlays: { tag: string; classes: string; position: string; zIndex: string; pointerEvents: string; rect: DOMRect | null }[] = []

      for (const el of allElements) {
        const computed = window.getComputedStyle(el)
        if (computed.position === "fixed" || computed.position === "absolute") {
          const rect = el.getBoundingClientRect()
          // Only care about elements that cover a significant area
          if (rect.width > 200 && rect.height > 200) {
            overlays.push({
              tag: el.tagName,
              classes: el.className?.toString?.().slice(0, 100) || "",
              position: computed.position,
              zIndex: computed.zIndex,
              pointerEvents: computed.pointerEvents,
              rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } as any,
            })
          }
        }
      }
      return overlays
    })

    for (const o of overlayCheck) {
      console.log(`  ${o.tag} | pos: ${o.position} | z: ${o.zIndex} | pointer-events: ${o.pointerEvents} | class: ${o.classes} | rect: ${JSON.stringify(o.rect)}`)
    }

    // 5. Check what element is at the center of the FTO card
    if (ftoCount > 0) {
      const box = await ftoCard.first().boundingBox()
      if (box) {
        const centerX = box.x + box.width / 2
        const centerY = box.y + box.height / 2

        const elementAtPoint = await page.evaluate(([x, y]) => {
          const el = document.elementFromPoint(x, y)
          if (!el) return { found: false }

          // Walk up to find the nearest button or clickable
          let current: Element | null = el
          const chain: { tag: string; classes: string; id: string }[] = []
          while (current) {
            chain.push({
              tag: current.tagName,
              classes: current.className?.toString?.().slice(0, 80) || "",
              id: current.id || "",
            })
            current = current.parentElement
          }

          return {
            found: true,
            topElement: { tag: el.tagName, classes: el.className?.toString?.().slice(0, 100) || "", id: el.id },
            chain: chain.slice(0, 10), // First 10 ancestors
          }
        }, [centerX, centerY])

        console.log(`\n=== ELEMENT AT FTO CARD CENTER (${centerX}, ${centerY}) ===`)
        console.log(JSON.stringify(elementAtPoint, null, 2))
      }
    }

    // 6. Try clicking the FTO card and check if handleSelectPath fires
    console.log("\n=== ATTEMPTING CLICK ON FTO CARD ===")
    const preClickConsoleCount = consoleMessages.length

    if (ftoCount > 0) {
      try {
        await ftoCard.first().click({ timeout: 3000 })
        console.log("Click completed without error")
      } catch (e: any) {
        console.log("Click error:", e.message)
      }
    }

    await page.waitForTimeout(1000)

    // Check new console messages after click
    const newMessages = consoleMessages.slice(preClickConsoleCount)
    console.log("\n=== NEW CONSOLE MESSAGES AFTER CLICK ===")
    for (const msg of newMessages) {
      console.log(`[${msg.type}] ${msg.text}`)
    }

    // Screenshot after click
    await page.screenshot({ path: "debug-screenshots/goalsv7-02-after-fto-click.png", fullPage: true })

    // 7. Check if the step changed
    const stepAfterClick = await page.evaluate(() => {
      // Check for "Goals" step indicators
      const goalText = document.querySelector("h1")?.textContent
      return { h1Text: goalText }
    })
    console.log("\n=== PAGE STATE AFTER CLICK ===")
    console.log(JSON.stringify(stepAfterClick))

    // 8. Try force clicking with JavaScript
    console.log("\n=== TRYING JS DISPATCH CLICK ===")
    const preDispatchCount = consoleMessages.length

    await page.goto("http://localhost:3000/test/goalsv7", { waitUntil: "networkidle" })
    await page.waitForTimeout(2000)

    const jsClickResult = await page.evaluate(() => {
      const buttons = document.querySelectorAll("button")
      let ftoBtn: HTMLButtonElement | null = null
      for (const btn of buttons) {
        if (btn.textContent?.includes("Find The One")) {
          ftoBtn = btn
          break
        }
      }
      if (!ftoBtn) return { found: false }

      // Try dispatching click
      ftoBtn.click()
      return { found: true, tag: ftoBtn.tagName, innerText: ftoBtn.innerText.slice(0, 50) }
    })
    console.log("JS click result:", JSON.stringify(jsClickResult))

    await page.waitForTimeout(1000)

    const messagesAfterJsClick = consoleMessages.slice(preDispatchCount)
    console.log("\n=== CONSOLE AFTER JS CLICK ===")
    for (const msg of messagesAfterJsClick) {
      console.log(`[${msg.type}] ${msg.text}`)
    }

    await page.screenshot({ path: "debug-screenshots/goalsv7-03-after-js-click.png", fullPage: true })

    // 9. Check for event listener count on the button
    const listenerInfo = await page.evaluate(() => {
      const buttons = document.querySelectorAll("button")
      let ftoBtn: HTMLButtonElement | null = null
      for (const btn of buttons) {
        if (btn.textContent?.includes("Find The One")) {
          ftoBtn = btn
          break
        }
      }
      if (!ftoBtn) return { found: false }

      // getEventListeners only works in devtools, but we can check React fiber
      const reactKey = Object.keys(ftoBtn).find(k => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"))
      const reactProps = Object.keys(ftoBtn).find(k => k.startsWith("__reactProps$"))

      let onClickHandler = null
      if (reactProps) {
        const props = (ftoBtn as any)[reactProps]
        onClickHandler = typeof props?.onClick === "function" ? "function found" : props?.onClick
      }

      return {
        found: true,
        reactFiber: !!reactKey,
        reactProps: !!reactProps,
        onClickHandler,
        disabled: ftoBtn.disabled,
        ariaDisabled: ftoBtn.getAttribute("aria-disabled"),
      }
    })
    console.log("\n=== EVENT LISTENER INFO ===")
    console.log(JSON.stringify(listenerInfo, null, 2))
  })
})
