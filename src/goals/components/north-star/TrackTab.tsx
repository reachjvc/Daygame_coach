"use client"

/**
 * The last step — Track. Where the plan stops being a document.
 *
 * Its number moves whenever a step is added, so it is not named by one here.
 *
 * Every step before this writes to localStorage and nothing else, which is
 * right for the work: you are deciding what your life is for, and a login
 * screen in front of that is a way of losing people. But a plan that is only
 * ever read back is a plan nobody runs. This step is the one place the flow
 * crosses over: it pushes the goals into `user_goals`, the same rows the goals
 * hub counts, streaks and resets every week, and then renders that hub right
 * here so the tracking happens on the page the plan was written on.
 *
 * Three things it will not do:
 *
 *   - **It does not push on its own.** Writing to somebody's real goals is not
 *     a side effect of opening a tab. The list is shown first, with what each
 *     goal becomes over there, and nothing moves until the button is pressed.
 *   - **It does not push twice.** Every row is tagged `ns:<run>:<goal id>` and
 *     `createGoalBatch` dedupes on that tag, so pressing again picks up what
 *     is new and leaves the rest — including the progress already on it.
 *   - **It does not touch anything else.** Goals made by hand have no `ns:` tag
 *     and are never matched, updated or counted here.
 *
 * The rest of the flow works signed out. This step cannot: the goals are rows
 * on an account. Signed out it says so and stops, rather than failing at the
 * button.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, Check } from "lucide-react"
import type { NsPlan, NsTrackRow } from "@/src/goals/types"
import { buildTrackInserts, pushedRealIds, trackRows, trackTemplateId } from "@/src/goals/northStarTrackService"
import { TRACK_COPY } from "@/src/goals/data/northStar"
import { GoalsHubContent } from "@/src/goals/components/GoalsHubContent"
import { TrackSchedule } from "./TrackSchedule"

/** The batch route takes 50 at a time; the push loops until it is done. */
const BATCH_LIMIT = 50

type Auth = "checking" | "in" | "out"

interface HubGoal {
  id: string
  template_id?: string | null
}

export function TrackTab({
  plan,
  runId,
  today,
  onToggleStep,
}: {
  plan: NsPlan
  runId: string
  today: string
  /**
   * Ticking one of today's routine steps off from inside the schedule.
   *
   * The same handler the Today step uses, writing to the same `plan.logged`,
   * because two screens showing the morning routine must not keep two
   * different answers to "did you read your north star".
   */
  onToggleStep: (stepId: string) => void
}) {
  const [auth, setAuth] = useState<Auth>("checking")
  const [hubGoals, setHubGoals] = useState<HubGoal[]>([])
  const [selected, setSelected] = useState<Set<string> | null>(null)
  const [pushing, setPushing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pushedThisTime, setPushedThisTime] = useState<number | null>(null)
  // Bumped after a push so the hub below remounts and refetches. It owns its
  // own data, and there is no prop that would tell it the list just changed.
  const [hubKey, setHubKey] = useState(0)

  const loadHub = useCallback(async () => {
    try {
      const res = await fetch("/api/goals")
      if (res.status === 401) {
        setAuth("out")
        return
      }
      if (!res.ok) throw new Error("Could not read your goals")
      // The route returns a plain array; a defensive read costs nothing.
      const data = await res.json()
      setHubGoals(Array.isArray(data) ? data : data.goals ?? [])
      setAuth("in")
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read your goals")
      setAuth("in")
    }
  }, [])

  useEffect(() => {
    loadHub()
  }, [loadHub])

  /**
   * The hub below shows THIS plan, not the account.
   *
   * Memoised because it is a prop the hub's fetch depends on; a fresh object
   * every render would put it in a refetch loop.
   */
  const hubScope = useMemo(
    () => ({
      // Every goal this step pushed, and nothing else: the run is in the tag.
      templatePrefix: trackTemplateId(runId, ""),
      title: TRACK_COPY.hubTitle,
      subtitle: TRACK_COPY.hubHelp,
    }),
    [runId]
  )

  const pushed = useMemo(() => pushedRealIds(runId, hubGoals), [runId, hubGoals])
  const rows = useMemo(() => trackRows(plan, runId, pushed), [plan, runId, pushed])
  const fresh = useMemo(() => rows.filter((r) => !r.pushed), [rows])

  // Everything not yet over there, ticked, until the user says otherwise. The
  // null state means "nobody has touched the boxes", so a goal added to the
  // plan after that still arrives ticked instead of silently unselected.
  const isSelected = useCallback(
    (row: NsTrackRow) => (selected ? selected.has(row.goalId) : !row.pushed),
    [selected]
  )
  const chosen = useMemo(() => rows.filter(isSelected).map((r) => r.goalId), [rows, isSelected])

  const toggle = (goalId: string) => {
    setSelected((prev) => {
      const next = new Set(prev ?? rows.filter((r) => !r.pushed).map((r) => r.goalId))
      if (next.has(goalId)) next.delete(goalId)
      else next.add(goalId)
      return next
    })
  }

  const push = async () => {
    if (pushing || chosen.length === 0) return
    setPushing(true)
    setError(null)
    setPushedThisTime(null)
    try {
      // The real ids grow as the loop goes, so a child in the second batch can
      // still be hung off a parent created in the first.
      const realIds = new Map(pushed)
      let remaining = [...chosen]
      let count = 0

      while (remaining.length > 0) {
        const inserts = buildTrackInserts(plan, runId, { goalIds: remaining, pushedRealIds: realIds })
        const batch = inserts.slice(0, BATCH_LIMIT)
        if (batch.length === 0) break

        const res = await fetch("/api/goals/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goals: batch }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.error ?? `The push failed (${res.status})`)
        }
        const created: HubGoal[] = await res.json()
        for (const [goalId, id] of pushedRealIds(runId, created)) realIds.set(goalId, id)

        const sent = new Set(batch.map((i) => i._tempId))
        remaining = remaining.filter((id) => !sent.has(id))
        count += batch.length
      }

      setPushedThisTime(count)
      setSelected(null)
      setHubKey((k) => k + 1)
      await loadHub()
    } catch (e) {
      setError(e instanceof Error ? e.message : "The push failed")
    } finally {
      setPushing(false)
    }
  }

  if (auth === "checking") {
    return (
      <div className="space-y-5">
        <TrackSchedule plan={plan} today={today} onToggleStep={onToggleStep} />
        <p className="text-sm text-zinc-500">Checking your goals…</p>
      </div>
    )
  }

  if (auth === "out") {
    return (
      <div className="space-y-5">
        {/* The schedule is read off the plan and needs no account, so being
            signed out costs you the counting, not the answer to "what am I
            doing next week". */}
        <TrackSchedule plan={plan} today={today} onToggleStep={onToggleStep} />
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-6">
          <h2 className="text-sm font-semibold text-zinc-200">{TRACK_COPY.signedOutTitle}</h2>
          <p className="text-[12px] text-zinc-400 mt-2 leading-relaxed max-w-prose">{TRACK_COPY.signedOut}</p>
          <Link
            href="/auth/login"
            className="inline-block mt-4 text-[12px] px-3 py-1.5 rounded-full border border-violet-400/40 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20 transition-colors"
          >
            Sign in
          </Link>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* What you will be doing comes first. "Which of these should be counted"
          is a question you can only answer once you have seen the weeks. */}
      <TrackSchedule plan={plan} today={today} onToggleStep={onToggleStep} />

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="px-5 pt-4">
          <h2 className="text-sm font-semibold text-zinc-200">{TRACK_COPY.title}</h2>
          <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed max-w-prose">{TRACK_COPY.help}</p>
        </div>

        {rows.length === 0 ? (
          <p className="px-5 py-6 text-[12px] text-zinc-500">{TRACK_COPY.empty}</p>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-white/5 border-y border-white/5">
              {rows.map((row) => {
                const ticked = isSelected(row)
                return (
                  <li key={row.goalId}>
                    <label className="flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors">
                      <input
                        type="checkbox"
                        checked={ticked}
                        onChange={() => toggle(row.goalId)}
                        className="size-3.5 shrink-0 accent-violet-500"
                        aria-label={`Track ${row.title}`}
                      />
                      <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: row.areaColor }} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] text-zinc-200 truncate">{row.title}</span>
                        <span className="block text-[10.5px] text-zinc-500">
                          {row.areaLabel} · {row.readout}
                        </span>
                      </span>
                      {row.pushed && (
                        <span className="flex items-center gap-1 text-[10.5px] text-emerald-300/80 shrink-0">
                          <Check className="size-3" />
                          tracked
                        </span>
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>

            <div className="flex flex-wrap items-center gap-3 px-5 py-4">
              <button
                onClick={push}
                disabled={pushing || chosen.length === 0}
                className="inline-flex items-center gap-2 text-[12px] px-3 py-1.5 rounded-full border border-violet-400/40 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20 disabled:opacity-40 disabled:hover:bg-violet-500/10 transition-colors"
              >
                {pushing && <Loader2 className="size-3.5 animate-spin" />}
                {pushing ? "Sending…" : chosen.length === 0 ? "Nothing ticked" : `Track ${chosen.length} ${chosen.length === 1 ? "goal" : "goals"}`}
              </button>
              <span className="text-[11px] text-zinc-500">
                {fresh.length === 0
                  ? TRACK_COPY.allTracked
                  : `${fresh.length} of ${rows.length} not over there yet.`}
                {pushedThisTime != null && ` Sent ${pushedThisTime}.`}
              </span>
            </div>
          </>
        )}

        {error && <p className="px-5 pb-4 text-[11.5px] text-rose-300">{error}</p>}
      </section>

      {/* The real hub, on the real rows, SCOPED TO THIS PLAN.
          Not a preview — the same component /dashboard/goals renders, so what
          is tried here is what ships. Unscoped it answered the wrong question:
          every goal on the account, with the plan you just built buried in it.
          `scope` prunes it to the `ns:<run>:` namespace, which is exactly the
          goals this step pushed. It fetches its own data, hence the remount
          after a push. */}
      {/* No heading of our own: the hub renders `scope.title` and
          `scope.subtitle` as its own H1, and a second copy above it said the
          same sentence twice in two sizes. */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <Suspense fallback={<p className="px-5 py-6 text-sm text-zinc-500">Opening your goals…</p>}>
          <GoalsHubContent key={hubKey} scope={hubScope} />
        </Suspense>
        <p className="px-5 pb-4 text-[11px] text-zinc-600">
          {TRACK_COPY.hubScoped}{" "}
          <Link href="/dashboard/goals/plan?step=today" className="underline underline-offset-2 hover:text-zinc-400 transition-colors">
            today's list
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
