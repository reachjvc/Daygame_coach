/**
 * BEST HOURS FOR THE HARDEST WORK (alpha prove-review-02).
 *
 * The tester's two weeks: weekdays coding 09:00-11:30, daygame 15:00-16:30,
 * a series 18:30-20:00, family calls 20:00-21:00, scrolling 21:00-22:00;
 * weekends friends 19:00-22:00. The page named 19:00, 21:00 and 20:00: twelve
 * weekend "Friends" answers decided hours that Monday to Friday were series
 * and scrolling. Martell's step 2 puts the hardest work in the hours you have
 * energy while doing work that builds your life, on the days you work.
 */
import { describe, expect, it } from "vitest"
import { buildReview } from "@/src/audit/auditService"
import { planHours } from "@/src/audit/weekService"
import type { AuditRun, AuditSlot, ScaleValue } from "@/src/audit/types"

const CPH = "Europe/Copenhagen"
const RUN_START = Date.parse("2026-10-27T07:00:00Z") // Tue 08:00 in Copenhagen, after DST ended

type Seg = [string, string, string, number, number]
const WEEKDAY: Seg[] = [
  ["08:00", "08:30", "Breakfast", 5, 4],
  ["08:30", "09:00", "Scrolling", 2, 1],
  ["09:00", "11:30", "Coding the app", 5, 6],
  ["11:30", "12:00", "Email", 3, 4],
  ["12:00", "12:45", "Lunch", 5, 4],
  ["12:45", "13:30", "Avoiding work", 3, 2],
  ["13:30", "15:00", "Coding the app", 4, 6],
  ["15:00", "16:30", "Daygame", 6, 7],
  ["16:30", "17:30", "Gym", 4, 6],
  ["17:30", "18:30", "Cooking", 5, 4],
  ["18:30", "20:00", "Series", 6, 2],
  ["20:00", "21:00", "Calls with family", 6, 5],
  ["21:00", "22:00", "Scrolling", 3, 1],
]
const WEEKEND: Seg[] = [
  ["08:00", "10:00", "Sleeping in", 6, 3],
  ["10:00", "11:00", "Breakfast", 5, 4],
  ["11:00", "13:00", "Admin", 2, 3],
  ["13:00", "17:00", "daygame", 6, 7],
  ["17:00", "19:00", "Cooking", 5, 4],
  ["19:00", "22:00", "Friends", 7, 5],
]
const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))

/** The tester's seed, as data: about 75% of waking quarters answered, Gym only Mon/Wed/Fri (else Admin). */
function twoWeeks(days = 13): { slots: AuditSlot[]; run: AuditRun } {
  const run: AuditRun = {
    id: "00000000-0000-4000-8000-000000000001",
    startedAt: new Date(RUN_START).toISOString(),
    endsAt: new Date(RUN_START + 14 * 86400_000).toISOString(),
    endedAt: new Date(RUN_START + days * 86400_000 + 14 * 3600_000).toISOString(),
    quietStart: 22 * 60,
    quietEnd: 8 * 60,
    mutedUntil: null,
    review: { choices: {}, notes: {}, week: [] },
    endSentAt: null,
  }
  const slots: AuditSlot[] = []
  let n = 0
  for (let d = 0; d <= days; d++) {
    const dayStart = RUN_START + d * 86400_000
    const dow = new Date(dayStart + 3600_000).getUTCDay()
    for (const [from, to, activity, energy, growth] of dow === 0 || dow === 6 ? WEEKEND : WEEKDAY) {
      for (let m = mins(from); m < mins(to); m += 15) {
        n++
        if ((n * 7 + d * 3) % 4 === 0) continue
        const act = activity === "Gym" && dow !== 1 && dow !== 3 && dow !== 5 ? "Admin" : activity
        slots.push({
          id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
          runId: run.id,
          slotAt: new Date(dayStart + (m - 8 * 60) * 60_000).toISOString(),
          activity: act,
          energy: (act === "Admin" ? 2 : energy) as ScaleValue,
          growth: (act === "Admin" ? 3 : growth) as ScaleValue,
          avoiding: false,
          why: null,
          source: "app",
          timeEntryId: null,
        })
      }
    }
  }
  return { slots, run }
}

describe("best hours from the tester's two weeks", () => {
  it("names the daygame and coding hours, never the evening hours of series, calls, scrolling or weekend friends", () => {
    const { slots, run } = twoWeeks()
    const built = buildReview(slots, run, CPH)
    const plan = planHours(built.workHours, built.bestHours)
    expect(plan.best).toBe("15:00, 09:00 and 10:00")
    for (const h of ["18:00", "19:00", "20:00", "21:00"]) expect(plan.best).not.toContain(h)
  })

  it("names no hour after only a few work days, rather than guess", () => {
    // Ended on the first Saturday: four work days (Tue-Fri).
    const { slots, run } = twoWeeks(4)
    const built = buildReview(slots, run, CPH)
    expect(planHours(built.workHours, built.bestHours).best).toBe(null)
  })
})
