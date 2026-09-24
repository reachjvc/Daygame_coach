import { describe, it, expect } from "vitest"
import { HELP, SERVICES, VERIFIED } from "@/src/vice/data/help"

/**
 * THE HELPLINE NUMBERS GO STALE, AND NOTHING SAID SO.
 *
 * This is not a hypothetical about data rot. When `help.ts` was written the
 * obvious US gambling number to put in it — 1-800-GAMBLER — was ALREADY DEAD: a
 * court ruling had ended the NCPG's operation of it in September 2025. The most
 * plausible number a person could have typed from memory was wrong on the day
 * it was typed.
 *
 * A wrong number here is not a stale doc. It is somebody in the worst hour of
 * their week dialling nothing, having been told by this app that it was the
 * number to dial. So the file carries `VERIFIED` and shows it on screen, and
 * this test is what makes that date mean something: without it, "we show the
 * date" is a way of documenting the rot rather than stopping it.
 *
 * ----------------------------------------------------------------------------
 * WHY IT FAILS RATHER THAN WARNS, and why the window is 90 days.
 *
 * A warning in a test run is read once and never again. A failure is the only
 * signal in this repo that reliably reaches a person — and it reaches them
 * before a release rather than after, which is the whole point.
 *
 * 90 days is a judgement, not a finding: long enough that it is not noise on a
 * project with one developer, short enough that a number which changed by court
 * ruling in September is not still on screen the following summer. It can be
 * argued down; it must not be argued up to make a failure go away.
 *
 * WHEN THIS FAILS, THE FIX IS TO CHECK THE NUMBERS, then move `VERIFIED`. It is
 * not to move `VERIFIED`. Checking means reaching each service and confirming
 * the line answers and still serves what this file says it serves — which is
 * work no test and no agent without network access can do, and is recorded as a
 * manual blocker in `docs/plans/vice-finished.md`.
 */

const MAX_AGE_DAYS = 90

function daysSince(iso: string): number {
  const then = Date.parse(`${iso}T00:00:00Z`)
  return Math.floor((Date.now() - then) / 86_400_000)
}

describe("the crisis numbers are not allowed to rot quietly", () => {
  it("carries a verification date that parses as a real day", () => {
    expect(VERIFIED, "VERIFIED must be YYYY-MM-DD").toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(Date.parse(`${VERIFIED}T00:00:00Z`))).toBe(false)
  })

  it("was verified in the last 90 days", () => {
    const age = daysSince(VERIFIED)
    expect(
      age,
      `The helplines in src/vice/data/help.ts were last checked ${age} days ago (${VERIFIED}).\n` +
        `CHECK THE NUMBERS, then move VERIFIED. Do not move VERIFIED to make this pass:\n` +
        `the US gambling line in this file was already dead the day it was written,\n` +
        `after a court ruling ended NCPG's operation of 1-800-GAMBLER in Sept 2025.\n` +
        `Every number is shown to somebody who may be about to dial it.`,
    ).toBeLessThanOrEqual(MAX_AGE_DAYS)
  })

  it("is not dated in the future, which would buy a year of silence by typo", () => {
    // `2027-08-17` for `2026-08-17` is one keystroke and would switch this
    // guard off until the following autumn without failing anything.
    expect(daysSince(VERIFIED), `VERIFIED is in the future: ${VERIFIED}`).toBeGreaterThanOrEqual(0)
  })

  it("shows the date to the person reading it, not only to this test", () => {
    // A date the app knows and does not say is a date that protects the
    // developer rather than the reader.
    expect(HELP.verifiedNote).toContain("{date}")
  })

  it("covers the regions the door offers, so the loops below ask something", () => {
    // A `for` over an empty object passes by asking nothing, which is how a
    // guard ends up protecting a file it no longer reads. `LOCALES` in
    // `HelpDoor` offers three choices; every one of them must resolve.
    const regions = Object.keys(SERVICES)
    expect(regions.sort()).toEqual(["other", "uk", "us"])
  })

  it("has at least one crisis service in every region it claims to cover", () => {
    // The door leads with the crisis block unconditionally. A region whose
    // list holds no crisis entry renders that block empty, which reads as
    // "there is nothing for you here" at the worst possible moment.
    for (const [region, { items }] of Object.entries(SERVICES)) {
      expect(
        items.some((service) => service.crisis),
        `SERVICES.${region} has no crisis service, so the help door's first block is empty there.`,
      ).toBe(true)
    }
  })

  it("gives every region an emergency number, which is the one that never rots", () => {
    // The fallback the copy itself promises: "the emergency number for where
    // you are always works". It has to be there for that sentence to be true.
    for (const [region, service] of Object.entries(SERVICES)) {
      expect(service.emergency, `SERVICES.${region} has no emergency number`).toBeTruthy()
    }
  })
})
