/**
 * R2. A PART'S COLOUR IS CHOSEN BY AN ADDRESS, NEVER BY HAND (docs/product/look.md).
 *
 * A page by its own address (`FacetScope` in the root layout), a tile, card,
 * row or door by the address it opens. The lists are Plans/rebrand-10kdaysclub.md,
 * Phase 3 step 2.
 */
import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { FACETS, facetFor, type Facet } from "@/src/shared/facets"
import { ROUTES } from "@/src/shared/routes"
import { TOOLS } from "@/components/navTabs"

const ROOT = resolve(__dirname, "../../..")

describe("R2: the part of every address", () => {
  it("every address in ROUTES maps to a part", () => {
    for (const address of Object.values(ROUTES)) expect(FACETS).toContain(facetFor(address))
  })

  const cases: [string, Facet][] = [
    ["/life", "life"],
    [ROUTES.plan, "life"],
    [`${ROUTES.plan}/role-models/x`, "life"],
    [ROUTES.training, "life"],
    [ROUTES.liveWorkout, "life"],
    [ROUTES.time, "life"],
    [ROUTES.audit, "life"],
    [ROUTES.trackingDaily, "life"],
    [ROUTES.quitVice, "quit"],
    [`${ROUTES.quitVice}/anything`, "quit"],
    ["/quit", "quit"],
    ["/quit/coaching", "quit"],
    ["/dating", "dating"],
    [ROUTES.scenarios, "dating"],
    [ROUTES.coach, "dating"],
    [ROUTES.innerGame, "dating"],
    [ROUTES.articles, "dating"],
    [ROUTES.tracking, "dating"],
    [ROUTES.trackingSession, "dating"],
    [ROUTES.trackingReview, "dating"],
    [`${ROUTES.tools}/dating`, "dating"],
    ["/", "brand"],
    [ROUTES.dashboard, "brand"],
    [ROUTES.tools, "brand"],
    [ROUTES.settings, "brand"],
    ["/auth/login", "brand"],
    ["/pricing", "brand"],
    ["/privacy", "brand"],
    // segment-aware, and a query or hash does not change the part
    ["/timeline", "brand"],
    ["/quitting", "brand"],
    [`${ROUTES.time}?tab=reports`, "life"],
    [`${ROUTES.tracking}#week`, "dating"],
  ]
  it.each(cases)("%s is %s", (address, facet) => {
    expect(facetFor(address)).toBe(facet)
  })

  it("every tool in TOOLS is coloured by the address it opens", () => {
    for (const t of TOOLS) expect(FACETS).toContain(facetFor(t.href))
    const tile = readFileSync(join(ROOT, "src/hometab/components/ToolTile.tsx"), "utf8")
    const rows = readFileSync(join(ROOT, "src/hometab/components/ToolsPage.tsx"), "utf8")
    expect(tile).toContain("data-facet={facetFor(href)}")
    expect(rows).toContain("data-facet={facetFor(t.href)}")
  })

  it("the root layout puts every page in its part", () => {
    const layout = readFileSync(join(ROOT, "app/layout.tsx"), "utf8")
    expect(layout).toContain("<FacetScope>{children}</FacetScope>")
  })

  it("the theme names every part, and each one sets primary", () => {
    const css = readFileSync(join(ROOT, "app/globals.css"), "utf8")
    for (const f of FACETS) {
      expect(css).toMatch(new RegExp(`--facet-${f}: #[0-9a-f]{6};`))
      expect(css).toContain(`[data-facet="${f}"] {\n  --primary: var(--facet-${f});`)
    }
  })
})
