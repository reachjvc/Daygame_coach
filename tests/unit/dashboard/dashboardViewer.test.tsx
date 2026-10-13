/**
 * THE DASHBOARD TELLS A VISITOR FROM A SIGNED-UP NON-SUBSCRIBER.
 *
 * Found by walking signup with a real account (2026-09-04). A single
 * `isPreviewMode` boolean covered two different people: a logged-out visitor,
 * and someone who had just signed up and finished onboarding but had not
 * subscribed. The second was shown "Sign up to start practicing!", linked to
 * /auth/sign-up, and given no profile at all — the page passed
 * `profileData={null}`, discarding the answers onboarding had just saved.
 *
 * The earlier version of this file asserted exact source lines. These run the
 * code instead:
 *
 * - `DashboardPage` is called as the server would call it, with the account
 *   and profile mocked, and the `DashboardContent` element it returns is read
 *   for its `viewer` and `profileData`. That covers which of the three states
 *   each account gets and what the private `toDashboardProfile` builds, without
 *   exporting either.
 * - `DashboardContent` is rendered per viewer, and its links are read. That
 *   covers where a locked card sends each person.
 */

import { cleanup, render, screen } from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ProfileRow } from "@/src/db"
import { DashboardContent } from "@/src/dashboard/components/DashboardContent"
import { DashboardPage } from "@/src/dashboard/components/DashboardPage"
import type { DashboardProfileData } from "@/src/dashboard/types"

const db = vi.hoisted(() => ({
  user: null as { id: string } | null,
  profile: null as ProfileRow | null,
}))

vi.mock("@/src/db/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: async () => ({ data: { user: db.user } }) },
  }),
  getProfile: async () => db.profile,
}))

// The header's sign-out button imports a server action; nothing here clicks it.
vi.mock("@/app/actions/auth", () => ({ signOut: vi.fn() }))

beforeEach(() => {
  db.user = null
  db.profile = null
})
afterEach(cleanup)

/** The props of the first element of `type` in a returned React tree. */
function propsOf(node: unknown, type: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") return null
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = propsOf(child, type)
      if (found) return found
    }
    return null
  }
  const element = node as ReactElement<{ children?: unknown }>
  if (element.type === type) return element.props as Record<string, unknown>
  return propsOf(element.props?.children, type)
}

async function contentProps(): Promise<{ viewer: unknown; profileData: unknown }> {
  const tree = await DashboardPage()
  const props = propsOf(tree, DashboardContent)
  expect(props, "DashboardPage rendered no DashboardContent").not.toBeNull()
  return { viewer: props!.viewer, profileData: props!.profileData }
}

/** A profile that has been through onboarding: real level, real answers. */
const ONBOARDED: ProfileRow = {
  id: "u1",
  has_purchased: false,
  level: 7,
  xp: 40,
  scenarios_completed: 3,
  age_range_start: 24,
  age_range_end: 30,
  archetype: "corporate-powerhouse",
  secondary_archetype: "artist",
  tertiary_archetype: null,
  dating_foreigners: true,
  user_is_foreign: false,
  preferred_region: "western-europe",
  secondary_region: "east-asia",
  experience_level: "intermediate",
  primary_goal: "confidence",
}

const ONBOARDED_DASHBOARD: DashboardProfileData = {
  has_purchased: false,
  level: 7,
  xp: 40,
  scenarios_completed: 3,
  age_range_start: 24,
  age_range_end: 30,
  archetype: "corporate-powerhouse",
  secondary_archetype: "artist",
  tertiary_archetype: null,
  dating_foreigners: true,
  user_is_foreign: false,
  preferred_region: "western-europe",
  secondary_region: "east-asia",
  experience_level: "intermediate",
  primary_goal: "confidence",
}

describe("which viewer DashboardPage says each account is", () => {
  it("a logged-out visitor is a visitor, with no profile", async () => {
    expect(await contentProps()).toEqual({ viewer: "visitor", profileData: null })
  })

  it("a signed-up non-subscriber is unsubscribed and gets their real profile, not null", async () => {
    db.user = { id: "u1" }
    db.profile = ONBOARDED
    expect(await contentProps()).toEqual({
      viewer: "unsubscribed",
      profileData: ONBOARDED_DASHBOARD,
    })
  })

  it("a subscriber is subscribed, and the profile is built the same way", async () => {
    db.user = { id: "u1" }
    db.profile = { ...ONBOARDED, has_purchased: true }
    expect(await contentProps()).toEqual({
      viewer: "subscribed",
      profileData: { ...ONBOARDED_DASHBOARD, has_purchased: true },
    })
  })

  it("a signed-in account with no profile row is still unsubscribed, not a visitor", async () => {
    db.user = { id: "u1" }
    expect(await contentProps()).toEqual({ viewer: "unsubscribed", profileData: null })
  })

  it("fills the dashboard's defaults where the row has none", async () => {
    db.user = { id: "u1" }
    db.profile = { id: "u1", has_purchased: false }
    expect((await contentProps()).profileData).toEqual({
      has_purchased: false,
      level: 1,
      xp: 0,
      scenarios_completed: 0,
      age_range_start: 22,
      age_range_end: 25,
      archetype: "",
      secondary_archetype: undefined,
      tertiary_archetype: undefined,
      dating_foreigners: false,
      user_is_foreign: undefined,
      preferred_region: undefined,
      secondary_region: undefined,
      experience_level: undefined,
      primary_goal: undefined,
    })
  })
})

describe("where a locked card sends each viewer", () => {
  const hrefs = () =>
    screen.getAllByRole("link").map((a) => a.getAttribute("href"))

  it("a visitor is sent to sign up", () => {
    render(<DashboardContent profileData={null} viewer="visitor" />)
    expect(screen.getByTestId("dashboard-qa-link")).toHaveAttribute("href", "/auth/sign-up")
    expect(screen.getByTestId("dashboard-tracking-link")).toHaveAttribute("href", "/auth/sign-up")
  })

  it("someone who already has an account is never sent to the signup page", () => {
    render(<DashboardContent profileData={ONBOARDED_DASHBOARD} viewer="unsubscribed" />)
    expect(hrefs()).not.toContain("/auth/sign-up")
    expect(screen.getByTestId("dashboard-qa-link")).toHaveAttribute("href", "/#pricing")
    expect(screen.getByTestId("dashboard-tracking-link")).toHaveAttribute("href", "/#pricing")
  })

  it("a subscriber's cards open the modules themselves", () => {
    render(<DashboardContent profileData={null} viewer="subscribed" />)
    expect(screen.getByTestId("dashboard-qa-link")).toHaveAttribute("href", "/dashboard/qa")
    expect(screen.getByTestId("dashboard-tracking-link")).toHaveAttribute("href", "/dashboard/tracking")
    expect(hrefs()).not.toContain("/auth/sign-up")
    expect(hrefs()).not.toContain("/#pricing")
  })
})
