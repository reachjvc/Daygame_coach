"use client"

/**
 * Today. The only screen in the flow that asks what you actually did.
 *
 * Everything else here is about deciding: what your life is for, which areas,
 * which goals, what runs weekly. This one assumes all of that is settled and
 * asks the one question a plan needs answered over and over — **did you do it**
 * — with as little between the question and the answer as possible.
 *
 * So it is one list, today's date at the top, and nothing to configure. What is
 * on today comes first. Everything else that runs weekly comes after it, still
 * inputtable, because a plan that only accepts the sessions it predicted
 * under-counts the weeks you actually had.
 *
 * **Two stores, and the row says which it is writing to.** A routine step is a
 * line in a stack, not a goal, and its tick lives on the plan in this browser.
 * A driver IS a goal: once it has been pushed on the track step it is a row
 * with a target, a period and a weekly reset already built, and its count goes
 * there. A driver that has not been pushed is shown and cannot be counted —
 * said plainly, with the way to fix it — rather than given a second tally that
 * would disagree with the real one the moment it was pushed.
 *
 * Milestones and experiences are absent for the same reason they are absent
 * from the schedule: neither is a thing you did today.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, Loader2, Minus, Plus } from "lucide-react"
import type { NsPlan } from "@/src/goals/types"
import { TODAY_COPY } from "@/src/goals/data/northStar"
import { todayItems, todayProgress, type TodayItem } from "@/src/goals/northStarTrackService"
import { dailyRating } from "@/src/goals/northStarService"
import { ScoreRow } from "./ScoreRow"

interface HubGoal {
  id: string
  template_id?: string | null
  current_value?: number
  target_value?: number
}

const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  })
}

const clockTime = (startMin: number) =>
  `${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`

export function TodayTab({
  plan,
  today,
  runId,
  onToggleStep,
  onRate,
  onNote,
  onGoToTrack,
}: {
  plan: NsPlan
  today: string
  runId: string
  onToggleStep: (stepId: string) => void
  onRate: (areaId: string, score: number) => void
  onNote: (text: string) => void
  onGoToTrack: () => void
}) {
  const [hubGoals, setHubGoals] = useState<HubGoal[] | null>(null)
  const [signedOut, setSignedOut] = useState(false)
  /** The driver currently being counted, so its buttons can say so. */
  const [busyId, setBusyId] = useState<string | null>(null)
  /**
   * The note, held locally and committed on blur.
   *
   * Every other box in the flow saves on each keystroke, which is right for a
   * one-line answer. This one sits under a list whose every row re-renders on
   * a save, and typing a paragraph through that is typing into a page that
   * moves. Keyed by date so opening tomorrow does not show today's draft.
   */
  const [note, setNote] = useState(() => plan.notes[today] ?? "")
  useEffect(() => {
    setNote(plan.notes[today] ?? "")
  }, [today, plan.notes])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/goals")
      if (res.status === 401) {
        setSignedOut(true)
        setHubGoals([])
        return
      }
      if (!res.ok) throw new Error("Could not read your goals")
      const data = await res.json()
      setHubGoals(Array.isArray(data) ? data : data.goals ?? [])
      setError(null)
    } catch (e) {
      setHubGoals([])
      setError(e instanceof Error ? e.message : "Could not read your goals")
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const items = useMemo(
    () => todayItems(plan, today, hubGoals ?? [], runId),
    [plan, today, hubGoals, runId]
  )
  const progress = useMemo(() => todayProgress(items), [items])
  const onToday = items.filter((i) => i.onToday)
  const rest = items.filter((i) => !i.onToday)

  const count = async (item: TodayItem, amount: number) => {
    if (!item.goalId || busyId) return
    setBusyId(item.activity.id)
    setError(null)
    try {
      const res = await fetch(`/api/goals/${item.goalId}/increment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      })
      if (!res.ok) throw new Error("That did not save")
      // Re-read rather than trusting a local guess: the goal may have rolled
      // over into a new week between the page loading and the button.
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save")
    } finally {
      setBusyId(null)
    }
  }

  if (hubGoals === null) {
    return <p className="text-sm text-zinc-500">{TODAY_COPY.loading}</p>
  }

  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-6">
        <h2 className="text-sm font-semibold text-zinc-200">{longDate(today)}</h2>
        <p className="text-[12px] text-zinc-500 mt-2 leading-relaxed max-w-prose">{TODAY_COPY.empty}</p>
      </section>
    )
  }

  const row = (item: TodayItem) => {
    const { activity } = item
    const busy = busyId === activity.id

    if (activity.kind === "routine") {
      return (
        <li key={activity.id}>
          <label className="flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors">
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => onToggleStep(activity.id)}
              className="size-4 shrink-0 accent-violet-500"
              aria-label={`Did ${activity.title}`}
            />
            <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: activity.areaColor }} />
            <span className="min-w-0 flex-1">
              <span className={`block text-[12.5px] truncate ${item.done ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
                {activity.title}
              </span>
              <span className="block text-[10.5px] text-zinc-500 truncate">
                {activity.routineLabel}
                {activity.minutes > 0 && ` · ${activity.minutes} min`}
              </span>
            </span>
            {activity.startMin != null && (
              <span className="text-[10.5px] text-zinc-500 tabular-nums shrink-0">{clockTime(activity.startMin)}</span>
            )}
          </label>
        </li>
      )
    }

    // A driver: a number this week, not a tick.
    return (
      <li key={activity.id} className="flex items-center gap-3 px-5 py-2.5">
        <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: activity.areaColor }} />
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] text-zinc-200 truncate">{activity.title}</span>
          <span className="block text-[10.5px] text-zinc-500 truncate">
            {activity.areaLabel}
            {item.target != null && ` · ${item.current ?? 0} of ${item.target} this week`}
          </span>
        </span>
        {item.goalId ? (
          <span className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => count(item, -1)}
              disabled={busy || (item.current ?? 0) <= 0}
              aria-label={`One fewer ${activity.title}`}
              className="size-7 inline-flex items-center justify-center rounded-md border border-white/10 text-zinc-400 hover:border-white/30 hover:text-zinc-200 disabled:opacity-30 transition-colors"
            >
              <Minus className="size-3.5" />
            </button>
            <button
              onClick={() => count(item, 1)}
              disabled={busy}
              aria-label={`One more ${activity.title}`}
              className="h-7 px-2.5 inline-flex items-center gap-1 rounded-md border border-violet-400/40 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20 disabled:opacity-40 transition-colors"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              <span className="text-[11px]">1</span>
            </button>
          </span>
        ) : (
          /* NOT COUNTED YET, and not given a second tally that would disagree
             with the real one the day it is pushed. */
          <button
            onClick={onGoToTrack}
            className="text-[10.5px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2 shrink-0 transition-colors"
          >
            {TODAY_COPY.notTracked}
          </button>
        )}
      </li>
    )
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-zinc-200">{longDate(today)}</h2>
            <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed max-w-prose">{TODAY_COPY.help}</p>
          </div>
          {progress.total > 0 && (
            <span className="text-[11px] text-zinc-500 tabular-nums shrink-0">
              {progress.done} of {progress.total} {TODAY_COPY.doneSuffix}
            </span>
          )}
        </div>

        {onToday.length > 0 ? (
          <ul className="mt-3 divide-y divide-white/5 border-y border-white/5">{onToday.map(row)}</ul>
        ) : (
          <p className="px-5 py-5 text-[12px] text-zinc-500">{TODAY_COPY.nothingOn}</p>
        )}

        {progress.total > 0 && progress.done === progress.total && (
          <p className="flex items-center gap-1.5 px-5 py-3 text-[11.5px] text-emerald-300/90">
            <Check className="size-3.5" />
            {TODAY_COPY.allDone}
          </p>
        )}

        {error && <p className="px-5 pb-4 text-[11.5px] text-rose-300">{error}</p>}
        {signedOut && <p className="px-5 pb-4 text-[11.5px] text-zinc-500">{TODAY_COPY.signedOut}</p>}
      </section>

      {/* HOW TODAY WENT, in the areas the whole plan is organised around.
          The same 0-10 the wheel uses and the same store (`plan.daily`), so a
          day rated here moves the rolling average the assessment step reads —
          two screens asking one question, not two questions. */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="px-5 pt-4">
          <h2 className="text-sm font-semibold text-zinc-200">{TODAY_COPY.feltTitle}</h2>
          <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed max-w-prose">{TODAY_COPY.feltHelp}</p>
        </div>
        <div className="px-5 py-3 grid gap-x-6 gap-y-1 lg:grid-cols-2">
          {plan.areas.map((area) => (
            <ScoreRow
              key={area.id}
              label={area.label}
              value={dailyRating(plan, today, area.id)}
              color={area.color}
              ariaLabel={(n) => `${area.label} today: ${n} out of 10`}
              onPick={(n) => onRate(area.id, n)}
            />
          ))}
        </div>
        <div className="px-5 pb-5">
          <label htmlFor="today-note" className="block text-[11px] text-zinc-400 mb-1">
            {TODAY_COPY.noteLabel}
          </label>
          <textarea
            id="today-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => onNote(note)}
            placeholder={TODAY_COPY.notePlaceholder}
            className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:border-white/30 focus:outline-none resize-y"
          />
          <p className="text-[10.5px] text-zinc-600 mt-1">{TODAY_COPY.noteSaved}</p>
        </div>
      </section>

      {/* NOT ON TODAY, still inputtable.
          A plan that only accepts the sessions it predicted quietly under-counts
          the weeks somebody actually had. */}
      {rest.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="px-5 pt-4">
            <h2 className="text-sm font-semibold text-zinc-200">{TODAY_COPY.restTitle}</h2>
            <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed max-w-prose">{TODAY_COPY.restHelp}</p>
          </div>
          <ul className="mt-3 divide-y divide-white/5 border-t border-white/5">{rest.map(row)}</ul>
        </section>
      )}
    </div>
  )
}
