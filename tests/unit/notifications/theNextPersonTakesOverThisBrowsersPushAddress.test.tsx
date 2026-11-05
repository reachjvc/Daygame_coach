// @vitest-environment jsdom
/**
 * THE NEXT PERSON SIGNED IN ON A BROWSER TAKES ITS PUSH ADDRESS OVER AT ONCE.
 *
 * Found by reading the code in the account-switching audit (Phase 8 of
 * Plans/toggl-parity.md); pushes are off on the development server, so no
 * browser test could see it. A's session ends without Log Out — it expires, or
 * the cookies are cleared — so nothing tells the server this browser is no
 * longer A's device. B signs in. The server went on sending A's running-timer
 * pushes here, and they name what A is doing, until B happened to open Time ›
 * Settings or Thoughts: only those screens asked the server to take the address
 * over (`usePushDevice`).
 *
 * Now every signed-in page asks once when it loads (`claimThisDevice`, drawn by
 * the (app) layout). The server's answer is the one it already gave those
 * screens: a device of somebody else's moves to whoever is signed in, with both
 * of its switches off, so A stops reaching it and B is sent nothing they did
 * not ask for; a device of B's own keeps its switches.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, waitFor } from "@testing-library/react"

import AppLayout from "@/app/(app)/layout"
import { claimThisDevice } from "@/src/notifications/pushClient"

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard", useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/app/actions/auth", () => ({ signOut: vi.fn() }))

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/abc123"

function aBrowserWithAPushAddress({ allowed = true, subscribed = true } = {}) {
  vi.stubEnv("NODE_ENV", "production")
  vi.stubGlobal("Notification", { permission: allowed ? "granted" : "default" })
  vi.stubGlobal("PushManager", function PushManager() {})
  const subscription = { endpoint: ENDPOINT, toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: "BNcR", auth: "tBHI" } }) }
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistration: async () => ({ pushManager: { getSubscription: async () => (subscribed ? subscription : null) } }) },
  })
  const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async () => new Response(JSON.stringify({ id: "d1", enabled: false, timerRunning: false })),
  )
  vi.stubGlobal("fetch", fetch)
  return fetch
}

const posted = (fetch: ReturnType<typeof aBrowserWithAPushAddress>) =>
  fetch.mock.calls
    .filter(([url, init]) => url === "/api/notifications/devices" && init?.method === "POST")
    .map(([, init]) => JSON.parse(String(init?.body)) as { intent: string; subscription: { endpoint: string } })

beforeEach(() => {
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: undefined })
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("a signed-in page, on a browser that holds a push address", () => {
  it("asks the server to take the address over for whoever is signed in, without switching anything on", async () => {
    const fetch = aBrowserWithAPushAddress()
    render(
      <AppLayout>
        <p>the page</p>
      </AppLayout>,
    )

    await waitFor(() => expect(posted(fetch), "B's page left A's device as A's").toHaveLength(1))
    expect(posted(fetch)[0]).toMatchObject({ intent: "refresh", subscription: { endpoint: ENDPOINT } })
  })
})

describe("claimThisDevice", () => {
  it("asks nothing of a browser that never allowed notifications, or holds no address", async () => {
    const notAllowed = aBrowserWithAPushAddress({ allowed: false })
    await claimThisDevice()
    expect(posted(notAllowed)).toHaveLength(0)

    const noAddress = aBrowserWithAPushAddress({ subscribed: false })
    await claimThisDevice()
    expect(posted(noAddress)).toHaveLength(0)
  })

  it("never throws, offline included", async () => {
    aBrowserWithAPushAddress()
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))))
    await expect(claimThisDevice()).resolves.toBeUndefined()
  })
})
