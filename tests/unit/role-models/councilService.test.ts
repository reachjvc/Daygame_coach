import { describe, expect, it } from "vitest"

import {
  checkCouncilPick,
  COUNCIL_FULL_MESSAGE,
  type CouncilMember,
  nextPosition,
  readOrder,
  readPick,
  reorderPositions,
  visibleCouncil,
} from "@/src/role-models/councilService"
import type { RoleModelPerson } from "@/src/role-models/types"
import good from "@/tests/fixtures/role-models/good.json"

const marcus = { ...(structuredClone(good) as unknown as RoleModelPerson), id: "marcus", name: "Marcus" }
const lookup = (id: string) => (id === "marcus" ? marcus : id.startsWith("p") ? { ...marcus, id } : null)
const member = (id: string, position: number): CouncilMember => ({ roleModelId: id, position, takenValues: ["Discipline"], addedAt: "" })
const five = ["p1", "p2", "p3", "p4", "p5"].map((id, i) => member(id, i))

describe("a pick", () => {
  it("takes only his own values, in the list's spelling, each once", () => {
    expect(checkCouncilPick([], "marcus", ["discipline", "COURAGE", "Discipline"], lookup)).toEqual({ ok: true, takenValues: ["Discipline", "Courage"] })
  })

  it("refuses a value he does not have, even a real list word", () => {
    const r = checkCouncilPick([], "marcus", ["Wealth"], lookup)
    expect(r).toMatchObject({ ok: false, status: 400 })
  })

  it("refuses no values at all", () => {
    expect(checkCouncilPick([], "marcus", [], lookup)).toMatchObject({ ok: false, status: 400 })
  })

  it("refuses a person not shown in the library", () => {
    expect(checkCouncilPick([], "nobody", ["Discipline"], lookup)).toMatchObject({ ok: false, status: 404 })
  })

  it("refuses a sixth person with a plain message", () => {
    expect(checkCouncilPick(five, "marcus", ["Discipline"], lookup)).toEqual({ ok: false, status: 409, message: COUNCIL_FULL_MESSAGE })
  })

  it("lets a member of a full council change what he takes", () => {
    expect(checkCouncilPick(five, "p3", ["Courage"], lookup)).toEqual({ ok: true, takenValues: ["Courage"] })
  })
})

describe("order", () => {
  it("a new member takes the first free slot", () => {
    expect(nextPosition([])).toBe(0)
    expect(nextPosition([member("a", 0), member("b", 2)])).toBe(1)
  })

  it("a reorder must list every member exactly once", () => {
    const now = [member("a", 0), member("b", 1)]
    expect(reorderPositions(now, ["b", "a"])).toEqual(new Map([["b", 0], ["a", 1]]))
    expect(reorderPositions(now, ["a"])).toBeNull()
    expect(reorderPositions(now, ["a", "a"])).toBeNull()
    expect(reorderPositions(now, ["a", "c"])).toBeNull()
  })

  it("shows members in order and drops anyone no longer in the library", () => {
    expect(visibleCouncil([member("p2", 1), member("gone", 0), member("p1", 0)], lookup).map((m) => m.roleModelId)).toEqual(["p1", "p2"])
  })
})

describe("request bodies", () => {
  it("a pick has exactly roleModelId and takenValues", () => {
    expect(readPick({ roleModelId: "marcus-aurelius", takenValues: ["Discipline"] })).toEqual({ roleModelId: "marcus-aurelius", takenValues: ["Discipline"] })
    expect(readPick({ roleModelId: "marcus", takenValues: ["x"], userId: "someone" })).toBeNull()
    expect(readPick({ roleModelId: "../etc", takenValues: [] })).toBeNull()
    expect(readPick({ roleModelId: "m", takenValues: ["a", "b", "c", "d", "e", "f"] })).toBeNull()
    expect(readPick(null)).toBeNull()
  })

  it("an order is a list of at most five ids", () => {
    expect(readOrder({ order: ["a", "b"] })).toEqual(["a", "b"])
    expect(readOrder({ order: ["a"], extra: 1 })).toBeNull()
    expect(readOrder({ order: ["1", "2", "3", "4", "5", "6"] })).toBeNull()
  })
})
