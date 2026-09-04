import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Guards a defect found by walking signup with a real account (2026-09-04).
 *
 * A single `isPreviewMode` boolean covered two different people: a logged-out
 * visitor, and someone who had just signed up and completed all five onboarding
 * steps but had not subscribed. The second was shown "Sign up to start
 * practicing!", linked to /auth/sign-up, and told they were Level 1 while their
 * profile said level 7 -- because the page passed profileData={null}.
 *
 * The fix replaces the boolean with one three-state value, so the two cases
 * cannot silently share a branch again. These assertions are about that
 * distinction; they are shape checks over the source, and the real proof is the
 * live walkthrough recorded in docs/architecture/auth-entities.md.
 */
const ROOT = join(__dirname, "../../..")
const content = readFileSync(join(ROOT, "src/dashboard/components/DashboardContent.tsx"), "utf8")
const page = readFileSync(join(ROOT, "src/dashboard/components/DashboardPage.tsx"), "utf8")

describe("dashboard distinguishes a visitor from a signed-up non-subscriber", () => {
  it("takes a three-state viewer rather than a boolean", () => {
    expect(content).toContain('export type DashboardViewer = "visitor" | "unsubscribed" | "subscribed"')
    expect(content).not.toMatch(/isPreviewMode\?:\s*boolean/)
  })

  it("passes each of the three states from the page, exactly once", () => {
    for (const viewer of ['viewer="visitor"', 'viewer="unsubscribed"', 'viewer="subscribed"']) {
      expect(page.match(new RegExp(viewer, "g"))).toHaveLength(1)
    }
  })

  it("gives a signed-up non-subscriber their real profile, not null", () => {
    // The bug: profileData={null} on the unsubscribed branch discarded the
    // level and answers onboarding had just saved.
    expect(page).toMatch(/viewer="unsubscribed"/)
    expect(page).toContain("profile ? toDashboardProfile(profile) : null")
  })

  it("builds the dashboard profile in one shared place", () => {
    // Two copies is how the branches drifted in the first place.
    expect(page.match(/function toDashboardProfile/g)).toHaveLength(1)
    expect(page.match(/has_purchased: profile\.has_purchased/g)).toHaveLength(1)
  })

  it("never sends someone who already has an account to the signup page", () => {
    // /auth/sign-up may appear only as the visitor arm of unlockHref.
    const signupLinks = content.match(/["']\/auth\/sign-up["']/g) ?? []
    expect(signupLinks).toHaveLength(1)
    expect(content).toContain('const unlockHref = viewer === "visitor" ? "/auth/sign-up" : "/#pricing"')
  })
})
