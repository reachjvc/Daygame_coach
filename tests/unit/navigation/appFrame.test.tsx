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
import { TABS } from "@/components/navTabs"
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

  // The bar has four since 2026-11-10 (Plans/site-navigation-build.md, Phase
  // 2) and no More sheet; the header names the same four.
  it("names every destination the bar names, and marks the one you are on", () => {
    path = ROUTES.settings
    const { container } = render(
      <AppFrame>
        <p>settings</p>
      </AppFrame>,
    )
    const nav = headerNav(container)
    for (const item of TABS) {
      expect(nav.getByRole("link", { name: item.label }).getAttribute("href")).toBe(item.href)
    }
    const current = nav.getAllByRole("link").filter((a) => a.getAttribute("aria-current") === "page")
    expect(current.map((a) => a.textContent)).toEqual(["You"])
  })

  it("offers Log Out from the header, as a button, never a link", () => {
    // Never clicked in a test against a real account: signOut() ends every
    // session of that account, other sessions' browser tests included.
    // A button and not a form since 2026-11-04: it sends what the time
    // tracker has not saved, or asks, before it signs out (LogOutButton).
    path = ROUTES.tracking
    const { container } = render(
      <AppFrame>
        <p>tracking</p>
      </AppFrame>,
    )
    const button = headerNav(container).getByRole("button", { name: "Log Out" })
    expect(button.tagName).toBe("BUTTON")
    expect(button.closest("a"), "Log Out is a link, which a prefetch or a stray tap can follow").toBeNull()
  })

  it.each([ROUTES.liveWorkout, ROUTES.plan])(
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

  /**
   * TIME KEEPS THE LAPTOP HEADER AND DRAWS ITS OWN PHONE BAR (D9 in
   * Plans/time-tracker-like-toggl.md). The reason it was hidden — two bars
   * stacked at the bottom of a phone — is a phone's reason. On a laptop the
   * header is how you reach Settings and Log Out, and the tracker
   * drops its own duplicate row there instead.
   */
  it("on Time, draws the laptop header but not the phone bar", () => {
    path = ROUTES.time
    const { container } = render(
      <AppFrame>
        <p>the tracker</p>
      </AppFrame>,
    )
    expect(screen.getByText("the tracker")).toBeTruthy()
    const header = container.querySelector("header")
    expect(header, "no laptop header on Time").not.toBeNull()
    // hidden below `sm`, as on every page: on a phone the tracker's own header is the top
    expect(header!.className.split(/\s+/)).toEqual(expect.arrayContaining(["hidden", "sm:block"]))
    // The way out on a laptop: Time is a tool on Home since 2026-11-10, so the
    // header does not name it, but it names Home.
    expect(headerNav(container).getByRole("link", { name: "Home" }).getAttribute("href")).toBe(ROUTES.dashboard)
    expect(screen.queryByTestId("mobile-tab-bar"), "two bars stacked at the bottom of a phone").toBeNull()
    // and no room kept at the bottom for a bar that is not there
    expect(container.querySelector(".pb-tab-bar")).toBeNull()
  })
})
