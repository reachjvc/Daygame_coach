import { test, expect } from "@playwright/test"
import { QUIT_VICE } from "@/src/shared/lifeMasteryRoutes"

/**
 * THE RACE THAT MADE `blackbox.spec.ts` FAIL HALF ITS RUNS, MADE TO HAPPEN ON
 * PURPOSE.
 *
 * That file empties the account between tests by tombstoning whatever it holds.
 * It used to do that as soon as `data-hydrated` went up — which means "the
 * browser copy has been read" and says nothing about the account. At that
 * moment the page's load sync is still in flight: it fetches the account,
 * merges, and pushes back, INCLUDING the rows it just merged in, because the
 * watermark is not advanced past them. Those rows carry their original
 * `updatedAt`.
 *
 * So two writers race on one account. Tombstone first, then re-push: fine, the
 * re-push is of rows that no longer matter. Re-push first, then tombstone:
 * also fine. **Tombstone, then a re-push that was already in flight: the
 * upsert puts every row back with `deleted_at` null and the tombstones are
 * undone.** The account keeps the previous test's data, it merges into the next
 * test about 700ms after its reload, and whichever assertion is running then is
 * the one that fails. A different victim every run.
 *
 * ----------------------------------------------------------------------------
 * WHY THIS FILE EXISTS RATHER THAN "we ran it ten times and it stopped
 * failing". A one-in-two fault that has gone quiet is indistinguishable from a
 * one-in-two fault that got luckier, and `mode: "serial"` means each run yields
 * one data point. So this holds the push back until the tombstone has certainly
 * landed, which makes the losing order guaranteed instead of likely.
 *
 * TO SEE IT FAIL: delete the `await settled(page)` line from `seed()` in
 * `blackbox.spec.ts` and run this file. It went red naming the surviving rows.
 * Put it back and it is green. That is the whole proof.
 */

test.describe.configure({ mode: "serial" })

const PUSH_DELAY_MS = 2500

test("a push already in flight cannot resurrect the rows the fixture just buried", async ({
  page,
}) => {
  // A record on the account, put there the way a previous test would leave one.
  await page.goto(QUIT_VICE)
  await page.locator('[data-hydrated="true"]').waitFor({ timeout: 20000 })
  const planted = await page.evaluate(async () => {
    const id = crypto.randomUUID()
    const stamp = new Date().toISOString()
    const res = await fetch("/api/black-box", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: {
          attempts: [
            {
              id,
              user_id: "",
              vice_id: "alcohol",
              label: "Left by an earlier test",
              started_on: "2026-01-05",
              started_by: "",
              structure: [],
              ended_on: null,
              ended_by_report_id: null,
              updated_at: stamp,
              deleted_at: null,
            },
          ],
          reports: [],
        },
      }),
    })
    return res.ok ? id : null
  })
  expect(planted, "could not plant a row to race against").toBeTruthy()

  /**
   * HOLD EVERY PUSH BACK. The load sync's redundant re-push now certainly
   * arrives after anything the fixture does, which is the losing order.
   */
  await page.route("**/api/black-box", async (route) => {
    if (route.request().method() === "PUT") {
      await new Promise((r) => setTimeout(r, PUSH_DELAY_MS))
    }
    await route.continue()
  })

  // Now do what `seed()` does: land on the page, and bury what the account
  // holds. With the fix, `seed` waits for the page's own sync to finish first,
  // so by the time the tombstones go up there is nothing left in flight.
  await page.goto(QUIT_VICE)
  await page.locator('[data-hydrated="true"]').waitFor({ timeout: 20000 })
  await page
    .locator('[data-sync="synced"][data-pending="0"], [data-sync="offline"], [data-sync="failed"]')
    .waitFor({ timeout: 40000 })

  await page.evaluate(async () => {
    const buried = new Date().toISOString()
    const got = await fetch("/api/black-box").then((x) => x.json()).catch(() => null)
    const live = got?.rows as { attempts: Record<string, unknown>[]; reports: Record<string, unknown>[] } | undefined
    if (!live || (live.attempts.length === 0 && live.reports.length === 0)) return
    await fetch("/api/black-box", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: {
          attempts: live.attempts.map((a) => ({ ...a, updated_at: buried, deleted_at: buried })),
          reports: live.reports.map((x) => ({ ...x, updated_at: buried, deleted_at: buried })),
        },
      }),
    })
  })

  // Long enough that any held-back push has certainly landed by now. If one
  // was in flight over the tombstones, this is where the rows come back.
  await page.waitForTimeout(PUSH_DELAY_MS + 1500)

  const stillLive = await page.evaluate(async () => {
    const got = await fetch("/api/black-box").then((x) => x.json()).catch(() => null)
    const rows = got?.rows as { attempts: { deleted_at: string | null; label: string }[] } | undefined
    return (rows?.attempts ?? []).filter((a) => a.deleted_at === null).map((a) => a.label)
  })

  expect(
    stillLive,
    "rows the fixture buried are live again on the account — a push that was already in flight " +
      "landed after the tombstones and upserted them back with deleted_at null. That is the race " +
      "that made blackbox.spec.ts fail half its full runs at a different test each time.",
  ).toEqual([])
})
