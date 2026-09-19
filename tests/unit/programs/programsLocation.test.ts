/**
 * THE ADDRESS BAR OWNS WHICH SCREEN YOU ARE ON.
 *
 * The tab and the view were React state. Three things followed, and all three
 * were complaints: nothing could link to a tab, a program or the catalogue;
 * Back always landed on the inventory whatever you had been reading; and the
 * server could not resolve the first paint, so today's session appeared a
 * moment after the page did.
 *
 * Two rules worth stating, because they pull in opposite directions:
 *
 *   - anything UNKNOWN falls back to today. A URL is something anyone can
 *     type, and a mistyped one should land where somebody would have wanted.
 *   - a `?program=` that names a program you are NOT running is dropped AND
 *     said out loud. Silently ignoring it would be the app quietly showing a
 *     different program from the one the link named.
 */

import { describe, it, expect } from "vitest"
import { parseProgramsLocation } from "@/src/programs/programsService"

const running = [{ id: "e1" }, { id: "e2" }]
const at = (query: string) => parseProgramsLocation(new URLSearchParams(query), running)

describe("which tab", () => {
  it("takes the three it knows", () => {
    expect(at("tab=history").tab).toBe("history")
    expect(at("tab=progress").tab).toBe("progress")
    expect(at("tab=today").tab).toBe("today")
  })

  it("falls back to today for anything else, including nothing at all", () => {
    expect(at("").tab).toBe("today")
    expect(at("tab=").tab).toBe("today")
    expect(at("tab=Progress").tab).toBe("today")
    expect(at("tab=../../etc/passwd").tab).toBe("today")
  })
})

describe("which view", () => {
  it("takes the four it knows and falls back to today", () => {
    for (const v of ["today", "programs", "detail", "edit"]) {
      expect(at(`view=${v}`).view).toBe(v)
    }
    expect(at("view=nonsense").view).toBe("today")
  })

  it("reads ?catalog= only on the detail view, and ?enrollment= only on edit", () => {
    // Otherwise a stale parameter from a previous screen decides what is shown.
    expect(at("view=detail&catalog=stronglifts-5x5").catalogId).toBe("stronglifts-5x5")
    expect(at("view=today&catalog=stronglifts-5x5").catalogId).toBeNull()
    expect(at("view=edit&enrollment=e1").enrollmentId).toBe("e1")
    expect(at("view=programs&enrollment=e1").enrollmentId).toBeNull()
  })
})

describe("which program", () => {
  it("keeps an id that names a program you are running", () => {
    const loc = at("program=e2")
    expect(loc.programId).toBe("e2")
    expect(loc.notice).toBeNull()
  })

  it("drops an id you are not running, and says so rather than swapping silently", () => {
    const loc = at("program=e9")
    expect(loc.programId).toBeNull()
    expect(loc.notice).toBe("That program is not running any more")
  })

  it("says nothing when no program was asked for", () => {
    expect(at("tab=history").programId).toBeNull()
    expect(at("tab=history").notice).toBeNull()
  })
})

describe("where Back goes", () => {
  it("keeps a path on this site", () => {
    expect(at("from=%2Fdashboard%2Ftracking").from).toBe("/dashboard/tracking")
  })

  it("refuses anything that would leave the site", () => {
    /**
     * An open redirect: rendered into an href unchecked, `?from=` turns a page
     * of yours into a credible hop to somebody else's login form. Every one of
     * these is a real browser trick, not a theoretical one.
     */
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "/dash board",
    ]) {
      expect(parseProgramsLocation(new URLSearchParams({ from: bad }), running).from, bad).toBeNull()
    }
  })

  it("trims surrounding space rather than refusing over it", () => {
    // Whitespace around a path is not a trick; whitespace INSIDE one is, which
    // is why "/dash board" is refused above and this is not.
    expect(parseProgramsLocation(new URLSearchParams({ from: " /dashboard" }), running).from).toBe(
      "/dashboard"
    )
    // And trimming must not turn a hostile value into an accepted one.
    expect(parseProgramsLocation(new URLSearchParams({ from: " //evil.example" }), running).from).toBeNull()
  })
})
