import { describe, it, expect } from "vitest"
import { MAX_SNAPSHOT_BYTES, parseSnapshotRequest } from "@/src/goals/planSnapshotService"

const ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301"
const plan = { areas: [{ id: "lm_health" }], goals: [{ id: "g1", title: "Bænk 28 kg" }] }

describe("what the unauthenticated write route accepts", () => {
  it("takes a well-formed snapshot", () => {
    const parsed = parseSnapshotRequest({ clientId: ID, plan, planText: "read back" })
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.value).toMatchObject({ clientId: ID, planText: "read back" })
  })

  it("refuses anything that is not one of our own ids", () => {
    // The id is a UUID this app minted. Free-form strings would let anybody
    // write to, or overwrite, a row of their choosing.
    for (const clientId of ["", "abc", "../../etc", "3f2504e0-4f89-11d3-9a0c", 42, null]) {
      expect(parseSnapshotRequest({ clientId, plan, planText: "" }).ok, String(clientId)).toBe(false)
    }
  })

  it("refuses a plan bigger than the cap", () => {
    // No cap means one fetch in a loop fills the table with whatever they like.
    const huge = { areas: [], goals: [{ title: "x".repeat(MAX_SNAPSHOT_BYTES) }] }
    const parsed = parseSnapshotRequest({ clientId: ID, plan: huge, planText: "" })
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.error).toMatch(/over the/)
  })

  it("refuses a body that is not a plan at all", () => {
    expect(parseSnapshotRequest(null).ok).toBe(false)
    expect(parseSnapshotRequest("hello").ok).toBe(false)
    expect(parseSnapshotRequest({ clientId: ID, planText: "" }).ok).toBe(false)
    expect(parseSnapshotRequest({ clientId: ID, plan: { goals: [] }, planText: "" }).ok).toBe(false)
  })

  it("truncates an overlong read-back rather than failing the whole write", () => {
    const parsed = parseSnapshotRequest({ clientId: ID, plan, planText: "x".repeat(200_000) })
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.value.planText).toHaveLength(100_000)
  })

  it("defaults a missing read-back to empty instead of undefined", () => {
    // The column is NOT NULL; undefined here would be a 500 on every write.
    const parsed = parseSnapshotRequest({ clientId: ID, plan })
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.value.planText).toBe("")
  })
})
