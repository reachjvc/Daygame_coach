// @vitest-environment jsdom

/**
 * The front page's three doors and the prices page (Plans/rebrand-10kdaysclub.md, Phase 5).
 */
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"

const replace = vi.fn()
const path = "/"
vi.mock("next/navigation", () => ({ usePathname: () => path, useRouter: () => ({ push: vi.fn(), replace }) }))
vi.mock("@/src/db/signOutRequest", () => ({ signOut: vi.fn() }))

import { HomePage } from "@/src/home/components/HomePage"
import { PricingPage } from "@/src/home/components/PricingPage"
import { DatingPage } from "@/src/home/components/DatingPage"
import { LifePage } from "@/src/home/components/LifePage"
import { PRODUCTS } from "@/src/home/products"
import { PAYWALL_HREF } from "@/src/hometab"
import { ROUTES, isPublicPage } from "@/src/shared/routes"

afterEach(() => {
  cleanup()
  replace.mockClear()
  window.location.hash = ""
})

describe("the front page", () => {
  it("has three doors, each opening its part and wearing its colour", () => {
    render(<HomePage />)
    const doors: [string, string, string][] = [
      ["life", ROUTES.life, "See the life tools"],
      ["quit", "/quit", "Quit something"],
      ["dating", ROUTES.dating, "See the dating tools"],
    ]
    for (const [id, href, label] of doors) {
      const door = screen.getByTestId(`door-${id}`)
      expect(door).toHaveAttribute("data-facet", id)
      expect(within(door).getByRole("link", { name: label })).toHaveAttribute("href", href)
    }
    expect(screen.getByText("Where do you want to start?")).toBeInTheDocument()
  })

  it("sends an old /#pricing link on to the prices page", () => {
    window.location.hash = "#pricing"
    render(<HomePage />)
    expect(replace).toHaveBeenCalledWith(ROUTES.pricing)
  })

  it("has no prices on it any more", () => {
    render(<HomePage />)
    expect(screen.queryByText(PRODUCTS[0].name)).toBeNull()
  })
})

describe("prices", () => {
  it("lists the three plans with the new feature lines", () => {
    render(<PricingPage isLoggedIn={false} />)
    const plans = screen.getAllByTestId("pricing-plan")
    expect(plans).toHaveLength(3)
    for (const p of plans) expect(within(p).getByText("Everything that is free stays free")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Prices" })).toBeInTheDocument()
  })

  it("is where every lock leads", () => {
    expect(PAYWALL_HREF).toBe(ROUTES.pricing)
  })
})

describe("the part doors", () => {
  it("the Dating door keeps today's pitch and points at prices, not at a checkout", () => {
    render(<DatingPage isLoggedIn={false} />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Master Daygame From Home")
    expect(screen.getAllByTestId("dating-card")).toHaveLength(5)
    for (const a of screen.getAllByRole("link", { name: "See prices" })) expect(a).toHaveAttribute("href", ROUTES.pricing)
    expect(screen.queryByText("Get Instant Access")).toBeNull()
  })

  it("the Life door shows the four life tools", () => {
    render(<LifePage isLoggedIn={false} />)
    expect(screen.getAllByTestId("life-card")).toHaveLength(4)
    expect(screen.getByRole("link", { name: "Start free" })).toHaveAttribute("href", "/auth/sign-up")
  })

  it("all three open signed out", () => {
    for (const p of [ROUTES.life, ROUTES.dating, ROUTES.pricing]) expect(isPublicPage(p)).toBe(true)
    expect(isPublicPage("/lifeline")).toBe(false)
  })
})
