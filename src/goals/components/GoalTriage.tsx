"use client"

/**
 * WHAT IS UNCLEAR ABOUT YOUR GOALS, AND NOTHING ELSE.
 *
 * The list is problems, not goals — a goal nothing is wrong with never appears.
 * Every row is one decision, and **there is deliberately no "accept all"**: the
 * whole point of this screen is that the app proposes and you decide, and a
 * button that applies thirty suggestions at once is the automatic re-filing you
 * said you did not want, wearing one click.
 */

import { useCallback, useEffect, useState } from "react"
import { Loader2, Check, AlertTriangle } from "lucide-react"
import type { UserGoalRow } from "@/src/db/goalTypes"
import { groupTriage, triage, type TriageProblem, type TriageRow } from "@/src/goals/goalTriageService"

const HEADINGS: Record<TriageProblem, string> = {
  counter_of_one: "Counting to one",
  no_area: "Not filed anywhere",
  practice_without_rate: "A rate that is not a rate",
}

export function GoalTriage() {
  const [goals, setGoals] = useState<UserGoalRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  /** 401 is not a failure. See `load`. */
  const [signedOut, setSignedOut] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/goals")
      /**
       * NOT SIGNED IN IS NOT A FAILURE, and must not wear a failure's face.
       *
       * Found in the browser: signed out, this drew "Could not read your
       * goals" in red, which says something went wrong with the app. Nothing
       * had. It is the same distinction the One Thing box makes between a read
       * that failed and an answer that is not there — a 401 is an invitation to
       * sign in, and only everything else is an error.
       */
      if (res.status === 401) {
        setSignedOut(true)
        setGoals([])
        setError(null)
        return
      }
      if (!res.ok) throw new Error("Could not read your goals")
      const data = await res.json()
      // The route returns a plain array; a defensive read costs nothing.
      setGoals(Array.isArray(data) ? data : data.goals ?? [])
      setSignedOut(false)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read your goals")
      setGoals([])
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const key = (r: TriageRow) => `${r.goalId}:${r.problem}`

  const accept = async (row: TriageRow) => {
    if (!row.fix || busy) return
    setBusy(key(row))
    try {
      const res = await fetch(`/api/goals/${row.goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [row.fix.field]: row.fix.to }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "That did not save")
      await load()
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not save")
    } finally {
      setBusy(null)
    }
  }

  if (!goals) {
    return <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Reading your goals" />
  }

  const rows = triage(goals).filter((r) => !dismissed.has(key(r)))
  const groups = groupTriage(rows)

  return (
    <div className="space-y-6" data-testid="goal-triage">
      <div>
        <h1 className="text-2xl font-bold">What is unclear</h1>
        <p className="text-muted-foreground mt-1 max-w-prose">
          Only goals that contradict themselves are listed. Nothing here changes
          until you press it, and nothing is re-filed for you.
        </p>
      </div>

      {signedOut && (
        <p className="text-sm text-muted-foreground" data-testid="goal-triage-signed-out">
          Sign in and this reads your goals. There is nothing to show without an account —
          your goals live on it, not in this browser.
        </p>
      )}

      {error && (
        <p className="text-sm text-rose-400" data-testid="goal-triage-error">{error}</p>
      )}

      {signedOut ? null : groups.length === 0 ? (
        <p className="text-muted-foreground" data-testid="goal-triage-clear">
          Nothing to sort out — every goal says what kind of thing it is.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.problem} className="space-y-2">
            <h2 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              {HEADINGS[group.problem]}
              <span className="text-xs font-normal text-muted-foreground tabular-nums">
                {group.rows.length}
              </span>
            </h2>
            <ul className="space-y-2">
              {group.rows.map((row) => (
                <li key={key(row)} className="rounded-lg border border-border p-3">
                  <p className="font-medium">{row.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{row.says}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {row.fix ? (
                      <button
                        type="button"
                        onClick={() => accept(row)}
                        disabled={busy === key(row)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted/50 disabled:opacity-40 transition-colors"
                      >
                        {busy === key(row) ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                        Make it done-or-not-done
                      </button>
                    ) : (
                      /* No fix means only the person can answer — guessing an
                         area from the words is the fault this area removed. */
                      <span className="text-xs text-muted-foreground">Open the goal to set this yourself.</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setDismissed((d) => new Set(d).add(key(row)))}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Leave it
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
