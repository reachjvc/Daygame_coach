import { readLifePlan } from "@/src/db/lifePlanRepo"
import { readDayRows, readNodeIds } from "@/src/db/lifePlanDayRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { getWorkoutLogs } from "@/src/db/healthRepo"
import { dayRowsToRecord } from "@/src/goals/lifePlanDayService"
import { rowsToPlan } from "@/src/goals/lifePlanMapper"
import { NO_TRAINING_TICKS, trainingTicks, type TrainingTicks } from "@/src/goals/dayTicks"
import { currentSeasonOneThing } from "@/src/goals/seasonService"
import { getTodayInTimezone } from "@/src/shared/dateUtils"
import type { NsPlan } from "@/src/goals/types"
import type { OneThing } from "@/src/goals/oneThingService"

/** What `SeasonBand` draws, read on the server. */
export interface SeasonBandData {
  seasonPlan: NsPlan | null
  oneThing: OneThing | null
  /** False when a read failed, so the band draws NOTHING rather than the invitation. */
  seasonReady: boolean
  /** The ACCOUNT's calendar day, so the band and the flow agree what today is. */
  today: string | null
  seasonTicks: TrainingTicks
}

/**
 * THE SEASON BAND'S DATA, IN ONE PLACE.
 *
 * It was written inline in the Tracking page. Home shows the same band
 * (Plans/site-navigation-build.md, Phase 1), and two copies of this read are
 * two places for the "0 of 5 done today" bug below to come back in.
 *
 * `seasonReady` is false when either read failed. The band then draws nothing
 * rather than the invitation — an invitation shown because a query broke is
 * the same lie in a different costume.
 */
export async function loadSeasonBand(userId: string): Promise<SeasonBandData> {
  const out: SeasonBandData = {
    seasonPlan: null,
    oneThing: null,
    seasonReady: false,
    today: null,
    seasonTicks: NO_TRAINING_TICKS,
  }
  try {
    const [stored, timezone] = await Promise.all([readLifePlan(userId), getUserTimezone(userId)])
    out.today = getTodayInTimezone(timezone)
    let plan = stored ? rowsToPlan(stored.rows) : null

    /**
     * THE DAY HALF, WITHOUT WHICH THIS BAND COUNTS TO ZERO FOREVER.
     *
     * `rowsToPlan` returns `logged` empty by construction — the day tables are
     * not part of the whole-plan read, deliberately, because a plan is
     * replaced and a day is appended to. The page then asked that empty map
     * how much had been done today and was told nothing, every day, for
     * everyone: "0 of 5 done today" an hour after ticking all five.
     *
     * So the days are read here, by the same route's repo, and merged in.
     */
    if (stored && plan) {
      const planId = stored.rows.plan_id
      const [dayRows, ids] = await Promise.all([readDayRows(userId, planId), readNodeIds(userId, planId)])
      const localIdFor = new Map([...ids].map(([local, id]) => [id, local]))
      plan = { ...plan, ...dayRowsToRecord(dayRows, localIdFor) }
    }

    /* Nine days rather than seven, for the same reason the flow reads nine:
       the cut is made by the server's day, so somebody far enough east or
       west needs the extra one to have their whole week. A failed read is
       caught below and leaves the ticks empty with `seasonReady` false, so
       the band draws nothing rather than an untrained week. */
    if (plan) out.seasonTicks = trainingTicks(plan, await getWorkoutLogs(userId, 9), timezone)

    // The season's sentence (Plans/life-plan-rebuild.md, Phase 3), not the
    // old one-thing tables, which nothing writes any more.
    out.oneThing = plan ? currentSeasonOneThing(plan, out.today) : null
    out.seasonPlan = plan
    out.seasonReady = true
  } catch (error) {
    console.error("Failed to read the season band's plan:", error)
    return { ...out, seasonPlan: null, oneThing: null, seasonReady: false, seasonTicks: NO_TRAINING_TICKS }
  }
  return out
}
