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
 * **Nothing is listed flat.** "Read your north star out loud" is not a task; it
 * is the third line of your morning routine, and shown as a peer of "Bench
 * press" it reads as one more chore on a list of nineteen while the stack it
 * belongs to is nowhere on the screen. So every view here is headers first —
 * one per routine, in the order the day happens — with the steps folded inside
 * them. `trackGroups` decides the grouping and the order for both views, so a
 * step cannot sit under one header here and another one there.
 *
 * Two ways to look, because two different questions get asked:
 *
 *   **By week** — a grid, routines down, weeks across. The one thing a plan
 *   cannot tell you by reading it is what it turns INTO, and that is the ramp:
 *   twice a week now, four a week from week five. The step-up is marked,
 *   because that is the week worth agreeing to in advance.
 *
 *   **By day** — the next seven days, with what sits on each. Only things that
 *   have been given days can be drawn on one; "four times a week" is a complete
 *   answer that names no Tuesday, so those are listed underneath as their own
 *   thing rather than scattered onto days nobody chose.
 *
 * **Today's steps tick off here.** Opening the morning routine on today and
 * ticking "read your north star" writes to `plan.logged` — the same store the
 * Today step reads, so the two agree rather than keeping two tallies. Only
 * today: a tick is a record of something you did, and offering one on Thursday
 * invites a log that says you did Thursday on Monday.
 */

import { useMemo, useState } from "react"
import { CalendarDays, Check, ChevronDown, Rows3, TrendingUp } from "lucide-react"
import type { NsPlan } from "@/src/goals/types"
import { WEEK_DAYS } from "@/src/goals/data/northStarStart"
import { SCHEDULE_COPY } from "@/src/goals/data/northStar"
import {
  groupLogged,
  groupSummary,
  stepLogged,
  trackDays,
  trackGroups,
  trackWeeks,
  unscheduledActivities,
  type TrackActivity,
  type TrackGroup,
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

function Chevron({ open }: { open: boolean }) {
  return <ChevronDown className={`size-3.5 shrink-0 text-zinc-500 transition-transform ${open ? "" : "-rotate-90"}`} />
}

export function TrackSchedule({
  plan,
  today,
  onToggleStep,
}: {
  plan: NsPlan
  today: string
  /** Ticking a step off today. Absent when this is rendered read-only. */
  onToggleStep?: (stepId: string) => void
}) {
  /**
   * WHICH VIEW OPENS FIRST, decided by the plan rather than fixed.
   *
   * The day view is the one you work off — headers in the order the day
   * happens, steps inside them, today's ticked off — so it leads. But it can
   * only draw what has been given days, and a plan whose steps say "5× a week"
   * and name no Tuesday opens on seven cards reading "Nothing on". For that
   * plan the week grid is the honest first look. Null means nobody has
   * chosen; once they have, the choice stands.
   */
  const [mode, setMode] = useState<Mode | null>(null)
  /**
   * WHICH HEADERS THE USER HAS TOGGLED, not which ones are open.
   *
   * Each view has a default — the week grid opens everything, a day opens only
   * today — and holding the toggles rather than the state means a group that
   * was never touched follows its view's default instead of being frozen at
   * whatever it happened to be on first render.
   */
  const [toggled, setToggled] = useState<Set<string>>(() => new Set())
  const isOpen = (key: string, byDefault: boolean) => (toggled.has(key) ? !byDefault : byDefault)
  const toggle = (key: string) =>
    setToggled((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const weeks = useMemo(() => trackWeeks(plan, today, WEEKS), [plan, today])
  const days = useMemo(() => trackDays(plan, today), [plan, today])
  const loose = useMemo(() => unscheduledActivities(plan), [plan])
  const view: Mode = mode ?? (days.some((d) => d.items.length > 0) ? "day" : "week")

  // Every activity that appears in any week, in the order the first week has
  // them, grouped by what it belongs to and ordered by the clock.
  const groups = useMemo(() => {
    const seen = new Map<string, TrackActivity>()
    for (const week of weeks) for (const row of week.rows) if (!seen.has(row.activity.id)) seen.set(row.activity.id, row.activity)
    return trackGroups([...seen.values()])
  }, [weeks])

  /** A group's whole load in a given week: its rows, added up. */
  const groupPerWeek = (group: TrackGroup, weekIndex: number) => {
    const ids = new Set(group.activities.map((a) => a.id))
    return weeks[weekIndex].rows.reduce((n, r) => (ids.has(r.activity.id) ? n + r.perWeek : n), 0)
  }

  if (groups.length === 0) {
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
              aria-pressed={view === id}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                view === id ? "bg-violet-500/20 text-violet-100" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === "week" ? (
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
            {groups.map((group) => {
              const key = `week:${group.id}`
              // The grid is a table of numbers and the grouping is what gives
              // it its shape, so everything starts open here. The day view,
              // where the question is "what am I doing", starts folded.
              const open = isOpen(key, true)
              return (
                <tbody key={group.id} className="border-b border-white/5">
                  <tr className="bg-white/[0.02]">
                    <th scope="row" className="text-left font-normal px-5 py-2 max-w-[240px]">
                      <button
                        onClick={() => toggle(key)}
                        aria-expanded={open}
                        className="flex items-center gap-2 min-w-0 w-full text-left group"
                      >
                        <Chevron open={open} />
                        <Dot color={group.color} />
                        <span className="min-w-0">
                          <span className="block text-[12px] font-medium text-zinc-100 truncate group-hover:text-white transition-colors">
                            {group.label}
                          </span>
                          <span className="block text-[10.5px] text-zinc-500 truncate tabular-nums">
                            {group.startMin != null && `${clockTime(group.startMin)} · `}
                            {groupSummary(group)}
                          </span>
                        </span>
                      </button>
                    </th>
                    {weeks.map((week, i) => (
                      <td key={week.index} className="text-center px-1.5 py-2 text-[11.5px] tabular-nums text-zinc-400">
                        {groupPerWeek(group, i)}
                      </td>
                    ))}
                  </tr>

                  {open &&
                    group.activities.map((activity) => (
                      <tr key={activity.id} className="border-t border-white/5">
                        <th scope="row" className="text-left font-normal pl-11 pr-5 py-2 max-w-[240px]">
                          <span className="flex items-center gap-2 min-w-0">
                            <Dot color={activity.areaColor} />
                            <span className="min-w-0">
                              <span className="block text-[12px] text-zinc-300 truncate">{activity.title}</span>
                              {/* The area, unless it is the header this row is
                                  already sitting under. A routine filed under
                                  no area borrows its own name for one, and the
                                  line read "Morning routine" under every step
                                  of the morning routine. */}
                              {activity.areaLabel !== group.label && (
                                <span className="block text-[10.5px] text-zinc-600 truncate">{activity.areaLabel}</span>
                              )}
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
                                /* The week the number goes up is the week to
                                   agree to in advance, so it is marked rather
                                   than left to be spotted by comparing two
                                   columns. */
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
                </tbody>
              )
            })}
            <tbody>
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
          {days.map((day) => {
            const dayGroups = trackGroups(day.items.map((i) => i.activity))
            return (
              <div key={day.dateISO} className="bg-zinc-950 px-4 py-3 min-h-[104px]">
                <div className="flex items-baseline gap-2">
                  <span className={`text-[11.5px] font-medium ${day.isToday ? "text-violet-200" : "text-zinc-300"}`}>
                    {day.isToday ? SCHEDULE_COPY.today : WEEK_DAYS[day.weekday]}
                  </span>
                  <span className="text-[10.5px] text-zinc-600">{shortDate(day.dateISO)}</span>
                </div>

                {dayGroups.length === 0 ? (
                  <p className="text-[10.5px] text-zinc-600 mt-2">{SCHEDULE_COPY.nothingOn}</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {dayGroups.map((group) => {
                      const key = `day:${day.dateISO}:${group.id}`
                      // Today is the day you are working off, so it opens. The
                      // other six are there to be read, and six open stacks is
                      // the flat list this grouping exists to replace.
                      const open = isOpen(key, day.isToday)
                      const logged = groupLogged(plan, day.dateISO, group)
                      const allDone = day.isToday && logged.total > 0 && logged.done === logged.total
                      return (
                        <li key={group.id}>
                          <button
                            onClick={() => toggle(key)}
                            aria-expanded={open}
                            className="flex items-center gap-1.5 w-full min-w-0 text-left py-0.5 group"
                          >
                            <Chevron open={open} />
                            <Dot color={group.color} />
                            <span className="text-[11.5px] text-zinc-200 truncate group-hover:text-white transition-colors">
                              {group.label}
                            </span>
                            <span className="ml-auto flex items-center gap-1 shrink-0 text-[10.5px] tabular-nums">
                              {group.startMin != null && <span className="text-zinc-500">{clockTime(group.startMin)}</span>}
                              {day.isToday && logged.total > 0 ? (
                                <span className={allDone ? "text-emerald-300/90" : "text-zinc-500"}>
                                  {allDone ? <Check className="size-3" aria-label="All done" /> : `${logged.done}/${logged.total}`}
                                </span>
                              ) : (
                                <span className="text-zinc-600">{group.activities.length}</span>
                              )}
                            </span>
                          </button>

                          {open && (
                            <ul className="pl-5 mt-0.5 space-y-0.5">
                              {group.activities.map((activity) => {
                                const done = stepLogged(plan, day.dateISO, activity.id)
                                /* A TICK IS A RECORD, so it is only offered on
                                   today. Thursday's steps are shown on Thursday
                                   and nowhere else; a checkbox on them invites a
                                   log that says you did Thursday on Monday. */
                                if (!day.isToday || !onToggleStep || activity.kind !== "routine") {
                                  return (
                                    <li key={activity.id} className="flex items-center gap-2 min-w-0 py-0.5">
                                      <Dot color={activity.areaColor} />
                                      <span className="text-[11px] text-zinc-400 truncate">{activity.title}</span>
                                    </li>
                                  )
                                }
                                return (
                                  <li key={activity.id}>
                                    <label className="flex items-center gap-2 min-w-0 py-0.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={done}
                                        onChange={() => onToggleStep(activity.id)}
                                        className="size-3.5 shrink-0 accent-violet-500"
                                        aria-label={`Did ${activity.title}`}
                                      />
                                      <span className={`text-[11px] truncate ${done ? "text-zinc-600 line-through" : "text-zinc-300"}`}>
                                        {activity.title}
                                      </span>
                                    </label>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      {view === "day" && (
        <p className="px-5 pt-3 text-[10.5px] text-zinc-500">
          {onToggleStep ? SCHEDULE_COPY.tickHint : SCHEDULE_COPY.groupHint}
        </p>
      )}

      {/* WHAT THE DAY VIEW CANNOT DRAW, said rather than dropped.
          "Four times a week" is a finished answer that names no day, and a day
          view that silently leaves those out is a schedule missing half the
          plan without saying so. */}
      {view === "day" && loose.length > 0 && (
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

      <p className="px-5 pb-4 pt-3 text-[11px] text-zinc-600 leading-relaxed max-w-prose">{SCHEDULE_COPY.notMilestones}</p>
    </section>
  )
}
