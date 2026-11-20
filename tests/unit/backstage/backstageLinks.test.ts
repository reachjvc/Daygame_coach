import { describe, expect, it } from "vitest"
import { backstageSections } from "@/src/backstage/backstageLinks"
import { isLive } from "@/src/quit/data"
import { isLiveTool, menu } from "@/src/quit/menu"
import { ROUTES } from "@/src/shared/routes"

const links = backstageSections().flatMap((s) => s.links)

describe("backstage: the owner's list of hidden pages", () => {
  it("links the copy space pages", () => {
    const hrefs = links.map((l) => l.href)
    expect(hrefs).toEqual(expect.arrayContaining([ROUTES.planNew, ROUTES.planSandbox, ROUTES.planNewRoleModels]))
  })

  it("lists every quit addiction that has a file but is not live, and no live one", () => {
    for (const id of Object.keys(menu.addictions) as (keyof typeof menu.addictions)[]) {
      const row = links.find((l) => l.id === `quit-${id}`)
      if (isLive(id)) expect(row).toBeUndefined()
    }
    expect(links.filter((l) => l.id.startsWith("quit-") && !l.id.startsWith("quit-tool-") && l.href.startsWith("/quit/") && l.href.includes("?preview=1") && !l.href.includes("/lab") && !l.href.includes("coaching")).length).toBeGreaterThan(0)
  })

  it("lists only quit tools that are not live, each opened with the preview flag", () => {
    const tools = links.filter((l) => l.id.startsWith("quit-tool-"))
    for (const t of tools) {
      expect(isLiveTool(t.id.slice("quit-tool-".length))).toBe(false)
      expect(t.href).toMatch(/\?preview=1$/)
    }
  })

  it("has unique ids and no empty label", () => {
    expect(new Set(links.map((l) => l.id)).size).toBe(links.length)
    for (const l of links) expect(l.label.trim()).not.toBe("")
  })
})
