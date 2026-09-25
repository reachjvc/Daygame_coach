import { test, expect, type Page } from "@playwright/test"
import { QUIT_VICE } from "@/src/shared/lifeMasteryRoutes"

/**
 * EVERY CONTROL ON THIS PAGE THAT THE TAP-TARGET SWEEP CANNOT SEE.
 *
 * `tests/e2e/sweep/route-sweep.spec.ts` navigates to a route, waits for it to
 * settle, and measures what is on screen. That is the right design for a sweep
 * over every page in the app — and on the Black Box it measures five controls,
 * because every question this module asks is inside a dialog. The sweep is not
 * wrong; it is answering a narrower question than its name suggests, and
 * `TAP_TARGET_DEBT` recording this route at ZERO was true and misleading at the
 * same time.
 *
 * Measured by hand at 390px on 2026-09-25, before this file existed:
 *
 *     Start a run      19 of 22 controls under 44px
 *     Report form       4 of 29
 *     Thought door      1 of 7
 *     Urge door         2 of 8
 *     Help door         2 of 6
 *
 * The vice chips were 32 high — the control you use to say what you are
 * stopping — as were the structure chips, the factor chips, and the confirm on
 * the alcohol-withdrawal warning. A phone is where this module is used and
 * eleven at night is when; a 32px chip is a mis-tap, and on the report form the
 * mis-tap that matters ends a run.
 *
 * ----------------------------------------------------------------------------
 * WHY IT OPENS THE DOORS RATHER THAN ASSERTING ON CLASS NAMES.
 *
 * A test that greps for `min-h-11` passes on a component whose parent clips it,
 * on one that is `display:none`, and on one nobody can reach. This opens each
 * door the way a person does and measures the boxes the browser actually drew.
 *
 * IT DOES NOT TOUCH THE ACCOUNT. Both verbs are answered in the browser, for
 * the reason `vice-cross.spec.ts` gives at length: a second writer on the
 * shared test account is the race that made `blackbox.spec.ts` fail half its
 * runs, and a real GET merges whatever another project last left there into the
 * fixture about 700ms after load.
 */

/**
 * Serial, because every test here writes the same browser-local record and
 * installs its own route handler. `tests/unit/e2e-isolation.test.ts` enforces
 * this on any spec that does either, and it caught this file the first time it
 * ran — the rule is not decoration: a route left installed by an aborted test
 * answers the next one's requests.
 */
test.describe.configure({ mode: "serial" })

/** Apple's minimum, and the number the rest of this repo already uses. */
const MIN = 44

/** A phone, because that is the only width at which this rule means anything. */
test.use({ viewport: { width: 390, height: 844 } })

/**
 * The one control this file knowingly does not hold to the rule.
 *
 * `components/ui/dialog.tsx` draws a 32×32 close button inside every
 * `DialogContent` in the app. Raising it is a change to every dialog on every
 * screen, which is not a decision that belongs in a vice spec — the same reason
 * `components/BackLink` was left alone when this module went to 44px and its
 * five call sites were fixed instead.
 *
 * IDENTIFIED BY `data-slot`, NOT BY ITS LABEL. The first version of this file
 * matched the string "Close", and the thought door's own worded dismissal says
 * "Close" too — so the exemption swallowed the very control it was looking for
 * and reported that door as having no way out immediately after one was added.
 * An exemption keyed on copy is an exemption that grows every time somebody
 * picks the same word.
 *
 * The exemption is only tolerable because every door also has a worded
 * dismissal big enough to hit, and the last case asserts that rather than
 * assuming it — it is what found the thought door having none at all.
 */
const SHARED_DIALOG_CLOSE = "dialog-close"

const RECORD = {
  version: 1,
  attempts: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      viceId: "alcohol",
      label: "Drinking",
      startedOn: "2025-09-20",
      startedBy: "Read my own record",
      structure: ["Told a specific person"],
      endedOn: null,
      endedByReportId: null,
      updatedAt: "2026-09-01T00:00:00.000Z",
      deletedAt: null,
    },
  ],
  reports: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      attemptId: "11111111-1111-4111-8111-111111111111",
      at: "2026-08-30T21:30:00",
      wentThrough: false,
      thought: "Nearly a year, surely I could moderate",
      ending: "fine",
      closeness: 6,
      withWhom: "On my own",
      where: "Kitchen",
      factors: ["A good stretch beforehand"],
      didInstead: "Went for a walk",
      updatedAt: "2026-09-01T00:00:00.000Z",
      deletedAt: null,
    },
  ],
}

async function isolated(page: Page) {
  await page.route("**/api/black-box**", (route) => {
    if (route.request().method() === "PUT") {
      return route.fulfill({ status: 200, contentType: "application/json", body: '{"written":0}' })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        rows: { attempts: [], reports: [] },
        takenAt: new Date().toISOString(),
      }),
    })
  })
}

async function land(page: Page) {
  await isolated(page)
  await page.goto(QUIT_VICE)
  await page.locator('[data-hydrated="true"]').waitFor({ timeout: 40000 })
  await page.evaluate((r) => {
    localStorage.setItem("vice-blackbox-v1", JSON.stringify(r))
  }, RECORD)
  await page.reload()
  await page.locator('[data-hydrated="true"]').waitFor({ timeout: 40000 })
  await page.locator('[data-sync-settled="true"]').waitFor({ timeout: 40000 })
}

/** Everything drawn on screen that a finger could land on. */
async function measured(page: Page) {
  return page.evaluate(() => {
    const out: { label: string; slot: string; w: number; h: number }[] = []
    const sel = "button, a[href], [role=button], input:not([type=hidden]), select, textarea"
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const box = el.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) continue
      if (getComputedStyle(el).visibility === "hidden") continue
      const label =
        (el.innerText || (el as HTMLInputElement).value || el.getAttribute("aria-label") || "")
          .trim()
          .split("\n")[0]
          .slice(0, 48) || el.tagName.toLowerCase()
      out.push({
        label,
        slot: el.getAttribute("data-slot") ?? "",
        w: Math.round(box.width),
        h: Math.round(box.height),
      })
    }
    return out
  })
}

/** What this door added to the page, measured, minus what was already there. */
async function opened(page: Page, open: (p: Page) => Promise<void>) {
  const before = await measured(page)
  await open(page)
  // The dialog animates in; a box measured mid-transition is not its box.
  await page.waitForTimeout(600)
  const after = await measured(page)
  const was = new Set(before.map((c) => `${c.label}|${c.w}x${c.h}`))
  return after.filter((c) => !was.has(`${c.label}|${c.w}x${c.h}`))
}

const DOORS: [string, (p: Page) => Promise<void>][] = [
  ["Start a run", async (p) => p.getByRole("button", { name: "Add a run you already had" }).click()],
  ["File a report", async (p) => p.getByRole("button", { name: "File a report" }).click()],
  [
    "I'm having a thought",
    async (p) => p.getByRole("button", { name: /having a thought/ }).click(),
  ],
  [
    "An urge, right now",
    async (p) => {
      await p.getByRole("button", { name: /An urge, right now/ }).click()
      await p.getByRole("button", { name: /Near it, or with people/ }).click()
    },
  ],
  [
    "The crisis door",
    async (p) => {
      await p.getByRole("button", { name: /past what a page can do/ }).click()
      await p.getByRole("button", { name: "United Kingdom" }).click()
    },
  ],
]

test.describe("every door on the Black Box is usable with a thumb", () => {
  for (const [name, open] of DOORS) {
    test(`${name}: nothing under ${MIN}px`, async ({ page }) => {
      await land(page)
      const controls = await opened(page, open)

      // A door that opened nothing would pass this test by measuring an empty
      // list, which is the exact failure shape this file was written about.
      expect(controls.length, `"${name}" put no new controls on screen`).toBeGreaterThan(2)

      const small = controls.filter(
        (c) => (c.w < MIN || c.h < MIN) && c.slot !== SHARED_DIALOG_CLOSE,
      )
      expect(
        small,
        `Controls under ${MIN}px behind "${name}":\n` +
          small.map((c) => `  ${c.w}x${c.h}  "${c.label}"`).join("\n") +
          `\n\nThe route-sweep cannot see these: it measures the landing state and` +
          `\nnever opens a dialog, which is why this file exists.`,
      ).toEqual([])
    })
  }

  test("and the small shared close button is never the only way out of a door", async ({ page }) => {
    // The one exemption above is only tolerable while every door also has a
    // worded dismissal big enough to hit. If that stops being true, the
    // exemption stops being a scoping decision and becomes a hole.
    await land(page)
    for (const [name, open] of DOORS) {
      const controls = await opened(page, open)
      const wayOut = controls.filter(
        (c) =>
          c.slot !== SHARED_DIALOG_CLOSE &&
          /^(cancel|close|back)$/i.test(c.label) &&
          c.w >= MIN &&
          c.h >= MIN,
      )
      expect(wayOut.length, `"${name}" has only the 32px close to dismiss it`).toBeGreaterThan(0)
      await page.keyboard.press("Escape")
      await page.waitForTimeout(400)
    }
  })
})
