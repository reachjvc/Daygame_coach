/**
 * A STALE RESIZE KEEPS THE OTHER DEVICE'S MOVE (alpha p9-review-02).
 *
 * Block Mon 09:00-12:00 open on two devices. A moves it to Wed 13:00-16:00.
 * B, not reloaded, changes only To to 11:00 and is told it changed elsewhere;
 * its change is then put on the moved block. From and To used to count as one
 * field, so changing To brought the old From back (Wed 09:00-11:00), and Save
 * again undid A's move. Now each is its own field: what B changed is applied
 * as a change (an hour shorter), what B left alone comes from the stored block.
 */
import { describe, expect, it } from "vitest"
import { rebasedTime } from "@/src/audit/weekService"

const h = (hours: number) => hours * 60
const was = { start: h(9), end: h(12) }
const stored = { start: h(13), end: h(16) }

describe("the time of a stale change put on the block as stored now", () => {
  it("keeps the other device's start when only To was changed, and makes it as much shorter", () => {
    expect(rebasedTime({ start: h(9), end: h(11) }, was, stored)).toEqual({ start: h(13), end: h(15) })
  })

  it("keeps the other device's end when only From was changed, and moves the start as far", () => {
    expect(rebasedTime({ start: h(10), end: h(12) }, was, stored)).toEqual({ start: h(14), end: h(16) })
  })

  it("keeps the stored time when neither was changed", () => {
    expect(rebasedTime(was, was, stored)).toEqual(stored)
  })

  it("keeps the person's time when both From and To were changed", () => {
    expect(rebasedTime({ start: h(10), end: h(13) }, was, stored)).toEqual({ start: h(10), end: h(13) })
  })

  it("never makes a block end before it starts, nor leave its day", () => {
    expect(rebasedTime({ start: h(9), end: h(9) + 15 }, was, { start: h(13), end: h(14) })).toEqual({ start: h(13), end: h(13) + 15 })
    expect(rebasedTime({ start: h(9), end: h(17) }, was, { start: h(20), end: h(23) })).toEqual({ start: h(20), end: h(24) })
    expect(rebasedTime({ start: h(5), end: h(12) }, was, { start: h(1), end: h(3) })).toEqual({ start: 0, end: h(3) })
  })
})
