import { test, expect, type Page } from "@playwright/test"

/**
 * Dead-control sweep.
 *
 * A button that changes nothing when clicked is the failure a normal test
 * suite never catches: every assertion still passes, the page still renders,
 * and the control is simply inert. This found a real one — the "copy it all as
 * text" button latched permanently on its confirmation, so a second copy did
 * nothing and looked broken.
 *
 * The probe runs inside the page rather than through the driver, because a
 * click-per-round-trip sweep of six flows takes minutes and times out. In-page
 * it takes seconds: click, watch for a DOM mutation or a storage write, and
 * report anything that produces neither.
 */

const HUB = "/test/quit-vice"
const FLOWS = ["where", "gives", "map", "experiment", "line", "week"] as const

async function settled(page: Page) {
  await page.locator('[data-hydrated="true"]').waitFor({ state: "attached", timeout: 30000 })
}

async function sweep(page: Page, tag: string): Promise<string[]> {
  return page.evaluate(async (label) => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const root = () => document.querySelector(".max-w-3xl") as HTMLElement
    const faults: string[] = []
    const seen = new Set<string>()
    const nav = document.querySelector('nav[aria-label="Steps"]') as HTMLElement | null

    const probe = async (btn: HTMLButtonElement, where: string) => {
      // A control labelled only by aria-label is correctly labelled — icon
      // buttons and checkboxes have no text node and should not be reported.
      const text = ((btn.textContent || "").trim() || btn.getAttribute("aria-label") || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 44)
      if (!text) { faults.push(`NO LABEL @ ${where}`); return }
      // Reset controls and the copy confirmation are excluded: one is
      // destructive, the other intentionally shows transient text.
      if (/start over|yes, start over|keep it|copy it all|copied|blocked the copy/i.test(text)) return
      // Re-selecting the option that is already selected is meant to be inert.
      if (btn.getAttribute("aria-pressed") === "true") return
      const key = `${where}::${text}`
      if (seen.has(key)) return
      seen.add(key)

      // Re-check visibility at click time. An earlier click in this same sweep
      // may have collapsed the container this button lives in, and clicking a
      // now-hidden button legitimately does nothing — that is the probe being
      // wrong, not the product.
      if ((btn as HTMLElement).offsetParent === null || btn.disabled) return

      const before = document.body.innerHTML.length + "|" + (localStorage.getItem("quit-vice-v1") || "").length
      let mutated = false
      const obs = new MutationObserver(() => { mutated = true })
      obs.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true })
      try { btn.click() } catch { faults.push(`THREW "${text}" @ ${where}`); obs.disconnect(); return }
      await sleep(70)
      obs.disconnect()
      const after = document.body.innerHTML.length + "|" + (localStorage.getItem("quit-vice-v1") || "").length
      if (!mutated && before === after) faults.push(`DEAD "${text}" @ ${where}`)
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
      await sleep(55)
    }

    const visible = () =>
      [...root().querySelectorAll("button")].filter(
        (b) => (b as HTMLElement).offsetParent !== null && !(b as HTMLButtonElement).disabled && !(nav?.contains(b) ?? false),
      ) as HTMLButtonElement[]

    if (!nav) {
      for (const b of visible().slice(0, 20)) await probe(b, label)
      return faults
    }

    const toggle = () => (nav.querySelector("button") as HTMLButtonElement)
    toggle().click(); await sleep(150)
    const steps = [...nav.querySelectorAll("button")].length - 1
    toggle().click(); await sleep(90)

    for (let i = 0; i < steps; i++) {
      toggle().click(); await sleep(110)
      ;([...nav.querySelectorAll("button")][i + 1] as HTMLButtonElement)?.click()
      await sleep(170)
      for (const b of visible().slice(0, 16)) await probe(b, `${label}#${i + 1}`)
    }
    return faults
  }, tag)
}

test("no dead controls on the hub, in any version", async ({ page }) => {
  test.setTimeout(180000)
  const all: string[] = []
  for (const v of ["plain", "guided", "full"]) {
    await page.goto(HUB, { waitUntil: "domcontentloaded" })
    await page.evaluate((ver) => {
      localStorage.removeItem("quit-vice-v1")
      localStorage.setItem("quit-vice-version", ver)
    }, v)
    await page.reload({ waitUntil: "domcontentloaded" })
    await settled(page)
    all.push(...(await sweep(page, `hub:${v}`)))
  }
  expect(all, `dead controls:\n  ${all.join("\n  ")}`).toEqual([])
})

test("no dead controls in the nine modules", async ({ page }) => {
  test.setTimeout(120000)
  await page.goto(`${HUB}/learn`, { waitUntil: "domcontentloaded" })
  await settled(page)
  const faults = await sweep(page, "learn")
  expect(faults, `dead controls:\n  ${faults.join("\n  ")}`).toEqual([])
})

test("no dead controls on the short version", async ({ page }) => {
  test.setTimeout(120000)
  await page.goto(`${HUB}/shortlist`, { waitUntil: "domcontentloaded" })
  await settled(page)
  const faults = await sweep(page, "shortlist")
  expect(faults, `dead controls:\n  ${faults.join("\n  ")}`).toEqual([])
})

for (const flow of FLOWS) {
  test(`no dead controls in ${flow}`, async ({ page }) => {
    test.setTimeout(180000)
    await page.goto(`${HUB}/${flow}`, { waitUntil: "domcontentloaded" })
    await page.evaluate(() => localStorage.setItem("quit-vice-version", "full"))
    await settled(page)
    const faults = await sweep(page, flow)
    expect(faults, `dead controls in ${flow}:\n  ${faults.join("\n  ")}`).toEqual([])
  })
}
