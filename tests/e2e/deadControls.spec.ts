import { randomUUID } from "node:crypto"
import type { Page } from "@playwright/test"
import { test, expect } from "./fixtures/test"
import { QUIT_VICE } from "@/src/shared/lifeMasteryRoutes"

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
 * click-per-round-trip sweep takes minutes and times out. In-page
 * it takes seconds: click, watch for a DOM mutation or a storage write, and
 * report anything that produces neither.
 */

/** The Black Box, which is what the front door serves now. */
const BLACK_BOX = QUIT_VICE

async function settled(page: Page) {
  await page.locator('[data-hydrated="true"]').waitFor({ state: "attached", timeout: 30000 })
}

async function sweep(page: Page, tag: string): Promise<string[]> {
  return page.evaluate(async (label) => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const root = () => document.querySelector(".max-w-3xl") as HTMLElement
    const faults: string[] = []
    const seen = new Set<string>()

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
      // "Save a copy" is excluded for a third reason: its whole effect is a
      // file download, which this in-page probe cannot observe at all. It is
      // not inert — `tests/unit/vice/blackboxStore.test.ts` covers what it
      // writes — and reporting it would teach people to ignore this list.
      //
      // "Load a copy" is the exact mirror and was missing: its whole effect is
      // opening a native file picker (`fileInput.current?.click()`), which this
      // probe can see even less of than a download. It meets the same bar —
      // `importRecord` has nine assertions in that same unit file, including the
      // export/import round trip and three malformed inputs — so it is excused
      // for the same stated reason rather than left failing the sweep.
      if (/start over|yes, start over|keep it|copy it all|copied|blocked the copy|save a copy|load a copy/i.test(text)) return
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

      const stored = () =>
        (localStorage.getItem("vice-blackbox-v1") || "").length
      const before = document.body.innerHTML.length + "|" + stored()
      let mutated = false
      const obs = new MutationObserver(() => { mutated = true })
      obs.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true })
      try { btn.click() } catch { faults.push(`THREW "${text}" @ ${where}`); obs.disconnect(); return }
      await sleep(70)
      obs.disconnect()
      const after = document.body.innerHTML.length + "|" + stored()
      if (!mutated && before === after) faults.push(`DEAD "${text}" @ ${where}`)
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
      await sleep(55)
    }

    const visible = () =>
      [...root().querySelectorAll("button")].filter(
        (b) => (b as HTMLElement).offsetParent !== null && !(b as HTMLButtonElement).disabled,
      ) as HTMLButtonElement[]

    for (const b of visible().slice(0, 20)) await probe(b, label)
    return faults
  }, tag)
}

test("no dead controls on the Black Box", async ({ page }) => {
  test.setTimeout(120000)
  // The front door, swept on both states that render a different screen: an
  // empty record, and one with a run going. Neither module was covered at all
  // between 2026-09-20 and this test.
  const started = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)
  const live = {
    version: 1,
    attempts: [{
      id: randomUUID(), viceId: "nicotine", label: "Smoking or vaping", startedOn: started,
      startedBy: "Read my own record", structure: ["Told a specific person"],
      endedOn: null, endedByReportId: null,
    }],
    reports: [],
  }
  const all: string[] = []
  for (const [tag, record] of [["empty", null], ["live", live]] as const) {
    await page.goto(BLACK_BOX, { waitUntil: "domcontentloaded" })
    await page.evaluate((r) => {
      if (r === null) localStorage.removeItem("vice-blackbox-v1")
      else localStorage.setItem("vice-blackbox-v1", JSON.stringify(r))
    }, record)
    await page.reload({ waitUntil: "domcontentloaded" })
    await settled(page)
    all.push(...(await sweep(page, `blackbox:${tag}`)))
  }
  expect(all, `dead controls:\n  ${all.join("\n  ")}`).toEqual([])
})
