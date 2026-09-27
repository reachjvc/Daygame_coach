// @vitest-environment node
/**
 * WHICH ROW THE SERVER WOULD NOT TAKE.
 *
 * A batch is up to 400 rows and one bad one fails all of them. Until this
 * existed the browser was told "Could not write timetrack_entries: violates
 * check constraint timetrack_entries_stop_after_start" and nothing else — so a
 * person with a mistyped end time had an account that silently stopped saving
 * and no way to find the entry that caused it. Reproduced in the product on
 * 2026-09-26: a good entry created afterwards never reached the server.
 *
 * Halving costs about 2·log2(n) writes instead of n, and — the part that
 * matters as much as the naming — the halves that succeed are really written,
 * so the good work lands instead of queueing behind the bad row.
 */

import { describe, expect, test, vi } from "vitest"

import { isolateRefusedRows } from "@/src/db/timetrackRepo"

/** A server that takes everything except the ids in `refuses`. */
function serverRefusing(refuses: string[]) {
  const accepted = new Set<string>()
  const write = vi.fn(async (batch: { id: string }[]) => {
    if (batch.some((row) => refuses.includes(row.id))) return false
    batch.forEach((row) => accepted.add(row.id))
    return true
  })
  return { write, accepted, calls: () => write.mock.calls.length }
}

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `row-${i}` }))

describe("isolating the row a batch was refused for", () => {
  test("names the one bad row out of four hundred", async () => {
    const server = serverRefusing(["row-137"])

    const refused = await isolateRefusedRows(rows(400), server.write)

    expect(refused).toEqual([{ id: "row-137" }])
  })

  test("and does it in a handful of writes rather than four hundred", async () => {
    const server = serverRefusing(["row-137"])

    await isolateRefusedRows(rows(400), server.write)

    expect(server.calls()).toBeLessThan(24)
  })

  test("the rows that are fine are actually written on the way", async () => {
    const server = serverRefusing(["row-137"])

    await isolateRefusedRows(rows(400), server.write)

    expect(server.accepted.size).toBeGreaterThan(300)
    expect(server.accepted.has("row-137")).toBe(false)
  })

  test("several bad rows are all named when the budget allows it", async () => {
    // each one costs about 2·log2(n) writes, so three of them need more than
    // the default 24 — which is the trade-off, stated rather than hidden
    const server = serverRefusing(["row-3", "row-51", "row-99"])

    const refused = await isolateRefusedRows(rows(120), server.write, 60)

    expect(refused.map((r) => r.id).sort()).toEqual(["row-3", "row-51", "row-99"])
  })

  test("and on a tight budget it names some of them, never the wrong ones", async () => {
    const bad = ["row-3", "row-51", "row-99"]
    const server = serverRefusing(bad)

    const refused = await isolateRefusedRows(rows(120), server.write, 24)

    expect(refused.length).toBeGreaterThan(0)
    expect(refused.every((r) => bad.includes(r.id)), `named a row the server accepts: ${JSON.stringify(refused)}`).toBe(true)
  })

  test("a batch nobody refuses costs exactly one write", async () => {
    const server = serverRefusing([])

    const refused = await isolateRefusedRows(rows(400), server.write)

    expect(refused).toEqual([])
    expect(server.calls()).toBe(1)
  })

  test("a pathological batch stops at its budget rather than storming the server", async () => {
    // every row refused: naming them all would cost ~2n writes
    const server = serverRefusing(rows(64).map((r) => r.id))

    await isolateRefusedRows(rows(64), server.write, 10)

    expect(server.calls()).toBeLessThanOrEqual(10)
  })
})
