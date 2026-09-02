/**
 * THE ONE THING — the tests named in docs/plans/one-thing.md before the code.
 *
 * AT2 is the one that would have caught the fault in the first design: a
 * countdown computed on the database's clock instead of the user's. It runs the
 * same instant through three timezones and across a daylight-saving boundary.
 */

import { describe, it, expect, afterEach, vi } from "vitest"
import {
  currentOneThing,
  pastOneThings,
  isSameAsCurrent,
  oneThingState,
  daysBetween,
  addDays,
  defaultDueOn,
  DEFAULT_HORIZON_DAYS,
} from "@/src/goals/oneThingService"
import type { LifeAnswerRow } from "@/src/db/lifeAnswerRepo"

const row = (over: Partial<LifeAnswerRow> = {}): LifeAnswerRow => ({
  id: "row-1",
  user_id: "user-1",
  answer_key: "one_thing",
  body: "Quit weed for 100 days",
  answered_at: "2026-08-01T09:00:00Z",
  due_on: "2026-11-09",
  created_at: "2026-08-01T09:00:00Z",
  ...over,
})

/** Newest first, the order the repo returns. */
const rows = (...r: LifeAnswerRow[]) => r

afterEach(() => {
  vi.useRealTimers()
})

const at = (iso: string) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

// ── AT1 ────────────────────────────────────────────────────────────────────
describe("AT1 — what my one thing is", () => {
  it("is nothing when nothing has been written", () => {
    at("2026-08-27T10:00:00Z")
    expect(currentOneThing([], "Europe/Copenhagen")).toBeNull()
    expect(oneThingState(null)).toBe("none")
  })

  it("is the newest row, not the first one written", () => {
    at("2026-08-27T10:00:00Z")
    const current = currentOneThing(
      rows(
        row({ id: "new", body: "Bench 100 kg", answered_at: "2026-08-20T09:00:00Z" }),
        row({ id: "old", body: "Quit weed for 100 days", answered_at: "2026-03-01T09:00:00Z" })
      ),
      "Europe/Copenhagen"
    )
    expect(current?.body).toBe("Bench 100 kg")
  })

  it("keeps the ones before it, newest first, without repeating the current one", () => {
    at("2026-08-27T10:00:00Z")
    const all = rows(
      row({ id: "c", body: "third", answered_at: "2026-08-20T09:00:00Z" }),
      row({ id: "b", body: "second", answered_at: "2026-06-01T09:00:00Z" }),
      row({ id: "a", body: "first", answered_at: "2026-03-01T09:00:00Z" })
    )
    expect(pastOneThings(all, "Europe/Copenhagen").map((o) => o.body)).toEqual(["second", "first"])
  })

  it("makes the previous one current again when the newest is deleted", () => {
    at("2026-08-27T10:00:00Z")
    const all = rows(
      row({ id: "b", body: "second", answered_at: "2026-06-01T09:00:00Z" }),
      row({ id: "a", body: "first", answered_at: "2026-03-01T09:00:00Z" })
    )
    // The repo returns what is left after a delete; nothing else has to happen.
    expect(currentOneThing(all, "Europe/Copenhagen")?.body).toBe("second")
  })
})

// ── AT2 ────────────────────────────────────────────────────────────────────
describe("AT2 — the countdown runs on the user's calendar", () => {
  it("counts whole calendar days to the deadline", () => {
    at("2026-08-27T10:00:00Z")
    const current = currentOneThing(rows(row({ due_on: "2026-09-01" })), "Europe/Copenhagen")
    expect(current?.daysLeft).toBe(5)
    expect(current?.lapsed).toBe(false)
  })

  it("is lapsed the day after the deadline, not on it", () => {
    at("2026-09-01T10:00:00Z")
    expect(currentOneThing(rows(row({ due_on: "2026-09-01" })), "UTC")?.lapsed).toBe(false)
    at("2026-09-02T10:00:00Z")
    const gone = currentOneThing(rows(row({ due_on: "2026-09-01" })), "UTC")
    expect(gone?.lapsed).toBe(true)
    expect(gone?.daysLeft).toBe(-1)
    expect(oneThingState(gone!)).toBe("lapsed")
  })

  it("gives two people on the same instant the answer their own calendar gives", () => {
    // 2026-09-01 21:00 UTC is already 2026-09-02 in Auckland and still
    // 2026-09-01 in New York. A deadline of 2026-09-01 has lapsed for one and
    // not the other, and the database's own clock is nobody's answer.
    at("2026-09-01T21:00:00Z")
    const auckland = currentOneThing(rows(row({ due_on: "2026-09-01" })), "Pacific/Auckland")
    const newYork = currentOneThing(rows(row({ due_on: "2026-09-01" })), "America/New_York")

    expect(auckland?.lapsed).toBe(true)
    expect(auckland?.daysLeft).toBe(-1)
    expect(newYork?.lapsed).toBe(false)
    expect(newYork?.daysLeft).toBe(0)
  })

  it("counts calendar days across a daylight-saving change, not 24-hour blocks", () => {
    // Copenhagen springs forward on 2026-03-29. That day is 23 hours long, so
    // adding 90 x 86400 seconds lands an hour short and shifts the date.
    expect(addDays("2026-03-20", 90)).toBe("2026-06-18")
    expect(daysBetween("2026-03-20", "2026-06-18")).toBe(90)
    // And through the autumn change, where a day is 25 hours long.
    expect(addDays("2026-10-20", 30)).toBe("2026-11-19")
    expect(daysBetween("2026-10-20", "2026-11-19")).toBe(30)
  })

  it("defaults the deadline to 90 days out in the user's timezone", () => {
    // 22:30 UTC on the 27th is already the 28th in Copenhagen, so the default
    // deadline counts from the 28th for them and the 27th for a UTC user.
    at("2026-08-27T22:30:00Z")
    expect(defaultDueOn("Europe/Copenhagen")).toBe(addDays("2026-08-28", DEFAULT_HORIZON_DAYS))
    expect(defaultDueOn("UTC")).toBe(addDays("2026-08-27", DEFAULT_HORIZON_DAYS))
  })
})

// ── AT3 ────────────────────────────────────────────────────────────────────
describe("AT3 — writing the same words again changes nothing", () => {
  it("recognises an unchanged answer, ignoring surrounding space", () => {
    const all = rows(row({ body: "Quit weed for 100 days" }))
    expect(isSameAsCurrent(all, "Quit weed for 100 days")).toBe(true)
    expect(isSameAsCurrent(all, "  Quit weed for 100 days  ")).toBe(true)
  })

  it("recognises a real change", () => {
    const all = rows(row({ body: "Quit weed for 100 days" }))
    expect(isSameAsCurrent(all, "Quit weed for 200 days")).toBe(false)
  })

  it("treats the first answer of all as a change", () => {
    expect(isSameAsCurrent([], "Quit weed for 100 days")).toBe(false)
  })
})
