"use client"

/**
 * What the next few weeks actually look like.
 *
 * The track step used to answer "your goals are over there" and point at a
 * list. The question it should answer is **what will I be doing** — which is
 * not the same list, because most of a plan is not something you do.
 *
 * **A milestone is not an activity.** "Bench 100 kg" and "see the northern
 * lights" are what the doing is for; neither happens on a Tuesday. Put them in
 * a weekly view and every week reads as a week you failed at them, right up
 * until the one you did not. So this is built only from what repeats — the
 * drivers and the routine steps — and the outcomes are read elsewhere.
 *
 * Two ways to look, because two different questions get asked:
 *
 *   **By week** — a grid, activities down, weeks across. The one thing a plan
 *   cannot tell you by reading it is what it turns INTO, and that is the ramp:
 *   twice a week now, four a week from week five. The step-up is marked,
 *   because that is the week worth agreeing to in advance.
 *
 *   **By day** — the next seven days, with what sits on each. Only things that
 *   have been given days can be drawn on one; "four times a week" is a complete
 *   answer that names no Tuesday, so those are listed underneath as their own
 *   thing rather than scattered onto days nobody chose.
 */

import { useMemo, useState } from "react"
import { CalendarDays, Rows3, TrendingUp } from "lucide-react"
import type { NsPlan } from "@/src/goals/types"
import { WEEK_DAYS } from "@/src/goals/data/northStarStart"
import { SCHEDULE_COPY } from "@/src/goals/data/northStar"
import {
  trackDays,
  trackWeeks,
  unscheduledActivities,
  type TrackActivity,
} from "@/src/goals/northStarTrackService"

/** Eight weeks: far enough for a ramp to finish, short enough to read. */
const WEEKS = 8

type Mode = "week" | "day"

const shortDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
}

const clockTime = (startMin: number) =>
  `${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`

/** "4× a week", or "20 approaches a week" when the driver counts things. */
function rate(activity: TrackActivity, perWeek: number): string {
  return activity.unit ? `${perWeek} ${activity.unit} a week` : `${perWeek}× a week`
}

function Dot({ color }: { color: string }) {
  return <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
}

export function TrackSchedule({ plan, today }: { plan: NsPlan; today: string }) {
  const [mode, setMode] = useState<Mode>("week")

  const weeks = useMemo(() => trackWeeks(plan, today, WEEKS), [plan, today])
  const days = useMemo(() => trackDays(plan, today), [plan, today])
  const loose = useMemo(() => unscheduledActivities(plan), [plan])

  // Every activity that appears in any week, in the order the first week has
  // them — the plan's own priority order, drivers before routine steps.
  const rows = useMemo(() => {
    const seen = new Map<string, TrackActivity>()
    for (const week of weeks) for (const row of week.rows) if (!seen.has(row.activity.id)) seen.set(row.activity.id, row.activity)
    return [...seen.values()]
  }, [weeks])

  if (rows.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-6">
        <h2 className="text-sm font-semibold text-zinc-200">{SCHEDULE_COPY.title}</h2>
        <p className="text-[12px] text-zinc-500 mt-2 leading-relaxed max-w-prose">{SCHEDULE_COPY.empty}</p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-200">{SCHEDULE_COPY.title}</h2>
          <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed max-w-prose">{SCHEDULE_COPY.help}</p>
        </div>
        <div className="flex items-center rounded-lg border border-white/10 p-0.5 shrink-0" role="group" aria-label="Schedule view">
          {(
            [
              { id: "week" as const, label: "By week", Icon: Rows3 },
              { id: "day" as const, label: "By day", Icon: CalendarDays },
            ]
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              aria-pressed={mode === id}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                mode === id ? "bg-violet-500/20 text-violet-100" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === "week" ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr className="border-y border-white/5">
                <th scope="col" className="text-left text-[10.5px] font-medium text-zinc-500 px-5 py-2">
                  {SCHEDULE_COPY.activityHeader}
                </th>
                {weeks.map((week) => (
                  <th key={week.index} scope="col" className="text-center text-[10.5px] font-medium text-zinc-500 px-1.5 py-2 tabular-nums">
                    <span className="block text-zinc-400">W{week.index}</span>
                    <span className="block text-zinc-600">{shortDate(week.startISO)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((activity) => (
                <tr key={activity.id} className="border-b border-white/5">
                  <th scope="row" className="text-left font-normal px-5 py-2 max-w-[240px]">
                    <span className="flex items-center gap-2 min-w-0">
                      <Dot color={activity.areaColor} />
                      <span className="min-w-0">
                        <span className="block text-[12px] text-zinc-200 truncate">{activity.title}</span>
                        <span className="block text-[10.5px] text-zinc-500 truncate">
                          {activity.routineLabel && activity.routineLabel !== activity.areaLabel
                            ? `${activity.routineLabel} · ${activity.areaLabel}`
                            : activity.areaLabel}
                        </span>
                      </span>
                    </span>
                  </th>
                  {weeks.map((week) => {
                    const cell = week.rows.find((r) => r.activity.id === activity.id)
                    if (!cell) return <td key={week.index} className="text-center text-[11px] text-zinc-700 px-1.5 py-2">–</td>
                    return (
                      <td key={week.index} className="text-center px-1.5 py-2">
                        <span
                          className={`inline-flex items-center gap-0.5 text-[11.5px] tabular-nums ${
                            cell.stepsUp ? "text-emerald-300" : "text-zinc-300"
                          }`}
                          /* The week the number goes up is the week to agree to
                             in advance, so it is marked rather than left to be
                             spotted by comparing two columns. */
                          title={cell.stepsUp ? SCHEDULE_COPY.stepsUp : rate(activity, cell.perWeek)}
                        >
                          {cell.stepsUp && <TrendingUp className="size-3" aria-label={SCHEDULE_COPY.stepsUp} />}
                          {cell.perWeek}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr>
                <th scope="row" className="text-left px-5 py-2 text-[10.5px] font-medium text-zinc-500">
                  {SCHEDULE_COPY.totalRow}
                </th>
                {weeks.map((week) => (
                  <td key={week.index} className="text-center px-1.5 py-2 text-[11.5px] tabular-nums text-zinc-400">
                    {week.sessions}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 grid gap-px bg-white/5 border-y border-white/5 sm:grid-cols-2 lg:grid-cols-4">
          {days.map((day) => (
            <div key={day.dateISO} className="bg-zinc-950 px-4 py-3 min-h-[104px]">
              <div className="flex items-baseline gap-2">
                <span className={`text-[11.5px] font-medium ${day.isToday ? "text-violet-200" : "text-zinc-300"}`}>
                  {day.isToday ? SCHEDULE_COPY.today : WEEK_DAYS[day.weekday]}
                </span>
                <span className="text-[10.5px] text-zinc-600">{shortDate(day.dateISO)}</span>
              </div>
              {day.items.length === 0 ? (
                <p className="text-[10.5px] text-zinc-600 mt-2">{SCHEDULE_COPY.nothingOn}</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {day.items.map(({ activity, startMin }) => (
                    <li key={activity.id} className="flex items-center gap-2 min-w-0">
                      <Dot color={activity.areaColor} />
                      <span className="text-[11.5px] text-zinc-300 truncate">{activity.title}</span>
                      {startMin != null && (
                        <span className="ml-auto text-[10.5px] text-zinc-500 tabular-nums shrink-0">{clockTime(startMin)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* WHAT THE DAY VIEW CANNOT DRAW, said rather than dropped.
          "Four times a week" is a finished answer that names no day, and a day
          view that silently leaves those out is a schedule missing half the
          plan without saying so. */}
      {mode === "day" && loose.length > 0 && (
        <div className="px-5 py-4">
          <h3 className="text-[11.5px] font-semibold text-zinc-300">{SCHEDULE_COPY.looseTitle}</h3>
          <p className="text-[10.5px] text-zinc-500 mt-0.5 leading-relaxed max-w-prose">{SCHEDULE_COPY.looseHelp}</p>
          <ul className="flex flex-wrap gap-1.5 mt-2">
            {loose.map((activity) => (
              <li
                key={activity.id}
                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-white/10 text-zinc-400"
              >
                <Dot color={activity.areaColor} />
                {activity.title}
                <span className="text-zinc-600">{rate(activity, activity.perWeek)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="px-5 pb-4 text-[11px] text-zinc-600 leading-relaxed max-w-prose">{SCHEDULE_COPY.notMilestones}</p>
    </section>
  )
}
