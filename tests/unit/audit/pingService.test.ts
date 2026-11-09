/**
 * THE PING'S WORDS — src/audit/pingService.ts (Plans/energy-audit.md, Phase 5).
 */
import { describe, expect, it } from "vitest"
import { endPayload, pingEntryId, pingPayload } from "@/src/audit/pingService"

describe("pingPayload", () => {
  it("says 'from 10:00 to 10:15' in the person's zone", () => {
    const p = pingPayload("2026-11-09T09:00:00.000Z", "Europe/Copenhagen", "send-1")
    expect(p).toEqual({
      kind: "audit-ping",
      title: "Time & energy audit",
      body: "What did you do from 10:00 to 10:15?",
      url: "/audit?answer=2026-11-09T09%3A00%3A00.000Z&send=send-1",
      tag: "audit-ping",
      slotAt: "2026-11-09T09:00:00.000Z",
      sendId: "send-1",
      actions: [
        { id: "same", title: "Same as before" },
        { id: "mute", title: "Mute 1 h" },
      ],
    })
    expect(pingPayload("2026-11-09T04:15:00.000Z", "Asia/Kathmandu", "s").body).toBe("What did you do from 10:00 to 10:15?")
  })

  it("contains nothing the person wrote: only its own fixed words, times and ids", () => {
    const text = JSON.stringify(pingPayload("2026-11-09T09:00:00.000Z", "Europe/Copenhagen", "send-1"))
    const words = text.replace(/"[a-zA-Z]+":/g, "").match(/[A-Za-z]{3,}/g) ?? []
    const allowed = new Set(["audit", "ping", "What", "did", "you", "from", "Time", "energy", "answer", "send", "same", "Same", "before", "mute", "Mute"])
    expect(words.filter((w) => !allowed.has(w))).toEqual([])
  })

  it("names its quarter in the send log by run and epoch seconds", () => {
    expect(pingEntryId("r1", "2026-11-09T09:00:00.000Z")).toBe("audit:r1:1794214800")
  })
})

describe("endPayload", () => {
  it("is the one other notification, and opens the review", () => {
    expect(endPayload()).toEqual({
      kind: "audit-end",
      title: "Time & energy audit",
      body: "Your two weeks are done. See what takes your energy and what builds your life.",
      url: "/audit?view=review",
      tag: "audit-end",
    })
  })
})
