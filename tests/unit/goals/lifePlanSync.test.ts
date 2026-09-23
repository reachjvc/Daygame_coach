/**
 * WHICH COPY OF THE PLAN WINS.
 *
 * Every case here is a way somebody loses work they cannot get back, which is
 * why the decision is a pure function and not four conditions spread through an
 * effect. The flow has had exactly one copy of the plan since it was written;
 * this is the moment it gets a second.
 *
 * The case that matters most is the third: a read that FAILED must never be
 * read as "the account has no plan". `undefined` and `null` are different
 * answers and collapsing them is how one flaky request overwrites a real plan
 * with whatever this browser happened to hold.
 */

import { describe, it, expect } from "vitest"
import { decideOnLoad, canSave, syncNotice, LIFE_PLAN_IMPORTED_KEY } from "@/src/goals/lifePlanSync"
import { emptyNsPlan, normalizeNsPlan, serializeNsPlan, planIsUntouched } from "@/src/goals/northStarService"
import type { NsPlan } from "@/src/goals/types"

function untouched(): NsPlan {
  return normalizeNsPlan(JSON.parse(serializeNsPlan(emptyNsPlan())))!
}

/** A plan somebody has actually written something into. */
function written(text: string): NsPlan {
  return { ...untouched(), northStar: text }
}

/** A plan with a year of days in it, which Phase 1 does not save. */
function withDays(base: NsPlan): NsPlan {
  return {
    ...base,
    daily: { "2026-09-01": { lm_fitness: 7 } },
    logged: { "2026-09-01": ["g1"] },
    notes: { "2026-09-01": "a good day" },
    journal: { "2026-09-01": { f1: "three gratitudes" } },
  }
}

describe("a plan on the account always wins", () => {
  it("uses the server's plan and does not import over it", () => {
    const decision = decideOnLoad({
      server: { plan: written("from the account"), revision: 4 },
      browser: written("from this old laptop"),
      imported: false,
    })
    expect(decision.kind).toBe("use-server")
    if (decision.kind !== "use-server") return
    expect(decision.plan.northStar).toBe("from the account")
    expect(decision.revision).toBe(4)
  })

  it("keeps this browser's day record, which the server does not hold yet", () => {
    // Phase 1 saves no days. Without this the server's four empty maps would be
    // written over a year of ticks, notes and journal on the first load.
    const decision = decideOnLoad({
      server: { plan: written("from the account"), revision: 1 },
      browser: withDays(written("older")),
      imported: true,
    })
    expect(decision.kind).toBe("use-server")
    if (decision.kind !== "use-server") return
    expect(decision.plan.journal).toEqual({ "2026-09-01": { f1: "three gratitudes" } })
    expect(decision.plan.notes).toEqual({ "2026-09-01": "a good day" })
    // And the plan half is still the account's.
    expect(decision.plan.northStar).toBe("from the account")
  })
})

describe("an untouched plan on the account does not block the import", () => {
  it("imports the browser's real plan over the account's empty shell", () => {
    // The flow creates a plan ROW the first time it loads anywhere. Opening
    // Life Mastery once on a phone would otherwise put an empty plan on the
    // account and rule 1 would protect it forever, so the laptop holding four
    // years of work could never import. Found by driving it in a browser.
    const decision = decideOnLoad({
      server: { plan: untouched(), revision: 1 },
      browser: written("four years of this"),
      imported: false,
    })
    expect(decision.kind).toBe("import-browser")
  })

  it("still refuses to import over a plan somebody has written in", () => {
    const decision = decideOnLoad({
      server: { plan: written("one sentence on the account"), revision: 1 },
      browser: written("four years on this laptop"),
      imported: false,
    })
    expect(decision.kind).toBe("use-server")
  })

  it("keeps the account's shell when this browser has nothing better", () => {
    const decision = decideOnLoad({ server: { plan: untouched(), revision: 3 }, browser: null, imported: false })
    expect(decision.kind).toBe("use-server")
    if (decision.kind !== "use-server") return
    expect(decision.revision).toBe(3)
  })
})

describe("the browser copy is imported once, into an empty account only", () => {
  it("imports a written plan when the account has none", () => {
    const decision = decideOnLoad({
      server: { plan: null, revision: 0 },
      browser: written("four years of this"),
      imported: false,
    })
    expect(decision.kind).toBe("import-browser")
  })

  it("does not import again once the marker is set", () => {
    const decision = decideOnLoad({
      server: { plan: null, revision: 0 },
      browser: written("four years of this"),
      imported: true,
    })
    // Re-importing would either duplicate everything or resurrect a plan
    // somebody deliberately cleared.
    expect(decision.kind).toBe("start-empty")
  })

  it("never imports an untouched plan", () => {
    // A browser that opened the flow and left has the twelve default areas and
    // nothing else. That is not a plan, and rule 1 would then protect it.
    const fresh = untouched()
    expect(planIsUntouched(fresh)).toBe(true)
    const decision = decideOnLoad({ server: { plan: null, revision: 0 }, browser: fresh, imported: false })
    expect(decision.kind).toBe("start-empty")
  })

  it("starts empty when this browser holds nothing at all", () => {
    const decision = decideOnLoad({ server: { plan: null, revision: 0 }, browser: null, imported: false })
    expect(decision.kind).toBe("start-empty")
  })

  it("names the marker so the key cannot drift between reader and writer", () => {
    expect(LIFE_PLAN_IMPORTED_KEY).toBe("life-plan-imported-v1")
  })
})

describe("a failed read never leads to a write", () => {
  it("stays local when the account's plan could not be reached", () => {
    // `undefined` is "nobody knows", NOT "there is no plan". This is the single
    // most dangerous line in the file: read as `null`, the next autosave
    // replaces a real plan with whatever this browser holds.
    const decision = decideOnLoad({ server: undefined, browser: written("a year of work"), imported: false })
    expect(decision.kind).toBe("stay-local")
  })

  it("refuses to save while it is on the local copy", () => {
    const decision = decideOnLoad({ server: undefined, browser: written("x"), imported: false })
    expect(canSave(decision, true)).toBe(false)
  })

  it("does not import on a failed read even with an unset marker", () => {
    const decision = decideOnLoad({ server: undefined, browser: written("x"), imported: false })
    expect(decision.kind).not.toBe("import-browser")
  })

  it("allows saving once the account has actually answered", () => {
    expect(canSave(decideOnLoad({ server: { plan: null, revision: 0 }, browser: null, imported: true }), true)).toBe(true)
    expect(canSave(decideOnLoad({ server: { plan: written("a"), revision: 2 }, browser: null, imported: true }), true)).toBe(true)
  })

  it("never saves before the load has finished", () => {
    // Saving early writes the empty starting plan over the saved one, which is
    // the bug the existing `loaded` guard in the flow exists for.
    const decision = decideOnLoad({ server: { plan: written("a"), revision: 1 }, browser: null, imported: true })
    expect(canSave(decision, false)).toBe(false)
  })
})

describe("what the person is told", () => {
  it("says a conflict happened and that nothing was saved", () => {
    expect(syncNotice("stale")).toMatch(/changed on another device/i)
    expect(syncNotice("stale")).toMatch(/nothing here has been saved/i)
  })

  it("says work is safe when the plan cannot be reached", () => {
    expect(syncNotice("offline")).toMatch(/keep working/i)
    expect(syncNotice("failed")).toMatch(/still here on this device/i)
  })

  it("says nothing when there is nothing wrong", () => {
    expect(syncNotice("saved")).toBe("")
    expect(syncNotice("saving")).toBe("")
    expect(syncNotice("unknown")).toBe("")
  })
})
