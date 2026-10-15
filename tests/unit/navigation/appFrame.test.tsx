// @vitest-environment jsdom

/**
 * THE SIGNED-IN APP'S FRAME: ONE HEADER, ONE BAR, DRAWN BY ONE LAYOUT.
 *
 * Each page used to decide whether to draw a header and a tab bar, so on a
 * laptop Tracking, Training and Preferences had no way out but the browser's
 * Back button (`Plans/site-structure.md`). The frame now comes from
 * `app/(app)/layout.tsx`. The other navigation tests decide "framed" from where
 * a page file sits; this one proves the layout really draws it, and that the
 * header says what the bar says.
 */

import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import AppLayout from "@/app/(app)/layout"
import { AppFrame } from "@/components/AppFrame"
import { MORE_ITEMS, TABS } from "@/components/navTabs"
import { ROUTES } from "@/src/shared/routes"

let path: string = ROUTES.dashboard
vi.mock("next/navigation", () => ({ usePathname: () => path, useRouter: () => ({ push: vi.fn() }) }))
// The real action talks to Supabase on the server. Rendering only needs it to exist.
vi.mock("@/app/actions/auth", () => ({ signOut: vi.fn() }))

afterEach(() => cleanup())

/** The laptop header's own links: the logo sits outside its <nav>. */
function headerNav(container: HTMLElement) {
  const header = container.querySelector("header")
  expect(header, "no header drawn").not.toBeNull()
  return within(header!.querySelector("nav")!)
}

describe("the app frame", () => {
  it("is drawn by the (app) layout around the page", () => {
    path = ROUTES.dashboard
    const { container } = render(
      <AppLayout>
        <p>the page</p>
      </AppLayout>,
    )
    expect(screen.getByText("the page")).toBeTruthy()
    expect(headerNav(container).getAllByRole("link").length).toBeGreaterThan(0)
    expect(screen.getByTestId("mobile-tab-bar")).toBeTruthy()
  })

  it("names every destination the bar and the More sheet name, and marks the one you are on", () => {
    path = ROUTES.settings
    const { container } = render(
      <AppFrame>
        <p>settings</p>
      </AppFrame>,
    )
    const nav = headerNav(container)
    for (const item of [...TABS, ...MORE_ITEMS]) {
      expect(nav.getByRole("link", { name: item.label }).getAttribute("href")).toBe(item.href)
    }
    const current = nav.getAllByRole("link").filter((a) => a.getAttribute("aria-current") === "page")
    expect(current.map((a) => a.textContent)).toEqual(["Settings"])
  })

  it("offers Log Out from the header, as a form, never a link", () => {
    // Never clicked in a test against a real account: signOut() ends every
    // session of that account, other sessions' browser tests included.
    path = ROUTES.tracking
    const { container } = render(
      <AppFrame>
        <p>tracking</p>
      </AppFrame>,
    )
    const button = headerNav(container).getByRole("button", { name: "Log Out" })
    expect(button.closest("form")).not.toBeNull()
  })

  it.each([ROUTES.liveWorkout, ROUTES.time, ROUTES.plan])(
    "steps aside on %s, which draws its own frame",
    (route) => {
      path = route
      const { container } = render(
        <AppFrame>
          <p>own frame</p>
        </AppFrame>,
      )
      expect(screen.getByText("own frame")).toBeTruthy()
      expect(container.querySelector("header")).toBeNull()
      expect(screen.queryByTestId("mobile-tab-bar")).toBeNull()
    },
  )
})
