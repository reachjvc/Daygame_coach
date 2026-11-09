import { test, expect } from "./fixtures/test"
import type { Page } from "@playwright/test"
import { ROUTES } from "@/src/shared/routes"

/**
 * PUSH DEVICES, shared by Time and the audit (moved from the Thoughts spec,
 * Plans/energy-audit.md Phase 1). Real push delivery needs a real phone; this
 * checks everything around it, through the app's own routes.
 */

async function clearDevices(page: Page): Promise<void> {
  const { devices } = await (await page.request.get("/api/notifications/devices")).json()
  for (const d of devices as { id: string }[]) {
    expect((await page.request.delete(`/api/notifications/devices/${d.id}`)).ok()).toBe(true)
  }
}

test.beforeEach(async ({ page }) => {
  await clearDevices(page)
})

test.describe("push devices @phone", () => {
  test("a registered device can be switched off and removed", async ({ page }) => {
    await page.goto(ROUTES.settings)
    const registered = await page.request.post("/api/notifications/devices", {
      data: {
        intent: "enable",
        label: "Test phone · installed app",
        subscription: { endpoint: `https://fcm.googleapis.com/fcm/send/e2e-${Date.now()}`, keys: { p256dh: "BNcR_e2e", auth: "tBHI_e2e" } },
      },
    })
    expect(registered.ok()).toBe(true)

    const listed = await (await page.request.get("/api/notifications/devices")).json()
    expect(listed.devices).toHaveLength(1)
    expect(listed.devices[0]).toMatchObject({ label: "Test phone · installed app", enabled: true })
    expect(Object.keys(listed.devices[0])).not.toContain("endpoint")

    const id = listed.devices[0].id as string
    expect((await page.request.patch(`/api/notifications/devices/${id}`, { data: { enabled: false } })).ok()).toBe(true)
    const off = await (await page.request.get("/api/notifications/devices")).json()
    expect(off.devices[0].enabled).toBe(false)

    expect((await page.request.delete(`/api/notifications/devices/${id}`)).ok()).toBe(true)
    const gone = await (await page.request.get("/api/notifications/devices")).json()
    expect(gone.devices).toEqual([])
  })

  test("signing out forgets this browser as a notification device", async ({ page }) => {
    await page.goto(ROUTES.settings)
    const endpoint = `https://fcm.googleapis.com/fcm/send/e2e-forget-${Date.now()}`
    const registered = await page.request.post("/api/notifications/devices", {
      data: { intent: "enable", label: "Shared laptop", subscription: { endpoint, keys: { p256dh: "BNcR_e2e", auth: "tBHI_e2e" } } },
    })
    expect(registered.ok()).toBe(true)

    // What both Log Out buttons call first (src/notifications/pushClient.ts, forgetThisDevice).
    expect((await page.request.post("/api/notifications/devices/forget", { data: { endpoint } })).ok()).toBe(true)

    const { devices } = await (await page.request.get("/api/notifications/devices")).json()
    expect(devices).toEqual([])
  })
})
