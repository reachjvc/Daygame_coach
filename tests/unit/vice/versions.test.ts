/**
 * The versions are views over one state, never containers.
 *
 * The module now has three front doors because the single one had grown to
 * ~9,700 words of copy — about forty-four minutes of reading — in front of
 * somebody who is ambivalent by definition. Three doors is only defensible if
 * moving between them is free: if a person writes their card in one version
 * and finds it gone in another, the whole idea is worse than the problem it
 * fixes.
 *
 * So this file asserts the property that makes the design honest, rather than
 * asserting what any particular version looks like.
 */

import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { DEFAULT_VERSION, VERSION_KEY, VICE_VERSIONS, isVersionId } from "@/src/vice/data/versions"
import { VICE_STORAGE_KEY } from "@/src/vice/viceService"
import { GUIDED, PLAIN } from "@/src/vice/data/plain"

describe("switching version cannot cost anybody their work", () => {
  it("keeps the version in its own key, away from the vice state", () => {
    // "Start over" wipes the vice state. A display preference is not part of
    // somebody's record of their quit and must not be destroyed with it —
    // nor must it live where a reset would take it.
    expect(VERSION_KEY).not.toBe(VICE_STORAGE_KEY)
  })

  it("has a default that exists, and validates unknown values", () => {
    expect(VICE_VERSIONS.map((v) => v.id)).toContain(DEFAULT_VERSION)
    expect(isVersionId("plain")).toBe(true)
    expect(isVersionId("nonsense")).toBe(false)
    expect(isVersionId(null)).toBe(false)
  })

  it("gives every version a line about who it is for, not what it contains", () => {
    for (const v of VICE_VERSIONS) {
      expect(v.forWho.length, v.id).toBeGreaterThan(20)
      expect(v.label.length, v.id).toBeLessThan(14)
    }
  })
})

describe("the lean versions are actually lean", () => {
  function visibleWords(obj: unknown): number {
    return JSON.stringify(obj).match(/"[^"]{4,}"/g)!.join(" ").split(/\s+/).length
  }

  it("keeps the plain version inside its word budget", () => {
    // The whole point. If this creeps back up, the version has stopped being
    // an answer to the problem and become another copy of it.
    const budget = VICE_VERSIONS.find((v) => v.id === "plain")!.wordBudget
    expect(visibleWords(PLAIN)).toBeLessThan(budget * 2.2)
  })

  it("keeps the guided version inside its word budget", () => {
    const budget = VICE_VERSIONS.find((v) => v.id === "guided")!.wordBudget
    expect(visibleWords(GUIDED)).toBeLessThan(budget * 2.2)
  })

  it("routes every plain answer somewhere real", () => {
    // The fault this caught: "I do not know if this is a problem" opened the
    // reading library instead of the flow that answers it.
    for (const a of PLAIN.answers) {
      expect(Boolean(a.tool) || Boolean(a.flow), `${a.id} goes nowhere`).toBe(true)
    }
    const unsure = PLAIN.answers.find((a) => a.id === "unsure")
    expect(unsure?.flow, "the awareness answer must open the awareness flow").toBe("where")
  })

  it("routes every guided item somewhere real", () => {
    for (const door of GUIDED.doors) {
      for (const item of door.items) {
        // `href` covers items that leave for a page of their own, like the
        // nine modules. Omitting it here reported a working link as a dead one.
        const routed = "tool" in item || "flow" in item || "flows" in item || "href" in item
        expect(routed, `${door.id}/${item.id} goes nowhere`).toBe(true)
      }
    }
  })
})

describe("every version reaches the things a person can need", () => {
  const reachable = (v: "plain" | "guided") => {
    const src = v === "plain" ? PLAIN : GUIDED
    return JSON.stringify(src)
  }

  it("puts the acute tools and the way out within reach in both lean versions", () => {
    for (const v of ["plain", "guided"] as const) {
      const json = reachable(v)
      // Somebody mid-urge, somebody after a lapse, and somebody who needs more
      // than a web page must all get there without reading a menu.
      expect(json, `${v}: no urge route`).toContain("urge")
      expect(json, `${v}: no lapse route`).toContain("lapse")
      expect(json, `${v}: no way out`).toMatch(/past what a page can do/)
    }
  })

  it("does not hide the good-stretch tool, which is the finding the corpus is loudest about", () => {
    expect(JSON.stringify(PLAIN)).toContain("tripwire")
    expect(JSON.stringify(GUIDED)).toContain("tripwire")
  })
})

describe("the hub renders all three and nothing else", () => {
  const hub = fs.readFileSync(path.join(process.cwd(), "src/vice/components/ViceHub.tsx"), "utf8")

  it("branches on every declared version", () => {
    for (const v of VICE_VERSIONS) {
      expect(hub, `hub never renders "${v.id}"`).toContain(`version === "${v.id}"`)
    }
  })

  it("always offers the switcher, so no version is a trap", () => {
    expect(hub).toContain("VersionSwitcher")
  })
})

/**
 * The grouping has to make sense to a person, not to a filing clerk.
 *
 * The specific failure this guards: "My card" was listed under "Something is
 * happening now", beside an urge in progress. A card is a thing you made weeks
 * ago. Grouping by object type rather than by the person's situation is how a
 * hub becomes a menu nobody can parse.
 */
describe("the hub groups by where a person is, not by what kind of thing it is", () => {
  const flat = (d: (typeof GUIDED)["doors"][number]) => d.items.map((i) => i.id)

  it("keeps possessions out of the acute door", () => {
    const now = GUIDED.doors.find((d) => d.id === "now")!
    // Only things that are happening right now, in minutes.
    expect(flat(now)).toEqual(["urge", "lapse"])
    expect(flat(now)).not.toContain("card")
    expect(flat(now)).not.toContain("voices")
  })

  it("files things the person made under their own heading", () => {
    const mine = GUIDED.doors.find((d) => d.id === "mine")!
    expect(flat(mine)).toContain("card")
  })

  it("covers the whole arc, including having tried before", () => {
    const where = GUIDED.doors.find((d) => d.id === "where")!
    for (const stage of ["unsure", "gives", "good", "again"]) {
      expect(flat(where), `arc stage "${stage}" missing`).toContain(stage)
    }
  })

  it("offers the relapse route in the plain version too", () => {
    expect(PLAIN.answers.map((a) => a.id)).toContain("again")
  })
})

/**
 * Reachability, which is where the real damage was.
 *
 * An audit of what each version could actually route to found that the plain
 * version — the one written for eleven at night — had no route to the card,
 * the single artefact this module tells people to open at eleven at night.
 * These assert the floor rather than the layout.
 */
describe("every version reaches what a person in trouble needs", () => {
  const routes = (v: "plain" | "guided") => {
    const src = v === "plain" ? PLAIN : GUIDED
    return JSON.stringify(src)
  }

  it("offers the card in both lean versions", () => {
    for (const v of ["plain", "guided"] as const) {
      expect(routes(v), `${v} cannot reach the card`).toMatch(/"card"/)
    }
  })

  it("offers other people's accounts in both, the highest-rated feature there is", () => {
    for (const v of ["plain", "guided"] as const) {
      expect(routes(v), `${v} cannot reach the accounts`).toMatch(/"voices"/)
    }
  })

  it("offers the way out in both", () => {
    for (const v of ["plain", "guided"] as const) {
      expect(routes(v)).toMatch(/past what a page can do/)
    }
  })
})

describe("the tools are a path, not a menu of dead ends", () => {
  const tools = fs.readFileSync(path.join(process.cwd(), "src/vice/components/Tools.tsx"), "utf8")

  it("hands off from the lapse debrief rather than ending at close", () => {
    // Before this, the only link between any two tools in the whole module was
    // urge → lapse. Everything else closed and offered nothing.
    expect(tools).toMatch(/openTool\("again"\)/)
    expect(tools).toMatch(/openTool\("tripwire"\)/)
  })
})
