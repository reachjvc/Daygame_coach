"use client"

import { useState } from "react"
import { LIFE_PLAN_IMPORTED_KEY } from "@/src/goals/lifePlanSync"
import { ROUTES } from "@/src/shared/routes"
import { planCacheKey } from "@/src/goals/data/northStar"
import { copySpaceCopy } from "@/src/goals/planSteps/copy/copySpace"

type Action = "copy" | "reset"

const ASK: Record<Action, { button: string; sure: string; yes: string; route: string }> = {
  copy: {
    button: "Copy my real plan in again",
    sure: "This replaces everything in the copy space with a fresh copy of your real plan. Your real plan is not changed.",
    yes: "Yes, copy it in",
    route: "/api/plan-sandbox/copy",
  },
  reset: {
    button: "Start as a brand-new user",
    sure: "This empties the copy space, so you see the plan as somebody who has never opened it. Your real plan is not changed.",
    yes: "Yes, start empty",
    route: "/api/plan-sandbox/reset",
  },
}

/**
 * THE COPY SPACE'S BANNER, at the top of `/plan/sandbox`.
 *
 * Phone first: the two buttons stack under the sentence at 390 px and sit
 * beside it from `sm` up. Each asks once before it does anything. The request
 * goes through the page's own guard (`guardSandboxRequests`), which names the
 * hidden account; the server acts only on the signed-in account's own copy
 * space. After it, this browser's saved copy of the hidden account's plan is
 * dropped, so the page opens again from what the database now holds and not from a
 * leftover (a leftover would be imported straight back into an emptied space).
 */
export function PlanSandboxBanner({ sandboxId, basePath = ROUTES.planSandbox, wording = "sandbox" }: { sandboxId: string; basePath?: string; wording?: "sandbox" | "new" }) {
  const fresh = wording === "new"
  const words = {
    line: fresh ? copySpaceCopy.line : "Copy space — your real plan is not touched",
    copy: fresh ? copySpaceCopy.recopy_button : ASK.copy.button,
    reset: fresh ? copySpaceCopy.fresh_button : ASK.reset.button,
    sure: (a: Action) => (fresh ? (a === "copy" ? `${copySpaceCopy.recopy_confirm_title} ${copySpaceCopy.recopy_confirm_body}` : `${copySpaceCopy.fresh_confirm_title} ${copySpaceCopy.fresh_confirm_body}`) : ASK[a].sure),
    yes: (a: Action) => (fresh ? (a === "copy" ? copySpaceCopy.recopy_confirm_yes : copySpaceCopy.fresh_confirm_yes) : ASK[a].yes),
    working: (a: Action) => (fresh ? (a === "copy" ? copySpaceCopy.recopy_working : copySpaceCopy.fresh_working) : "Working…"),
    cancel: fresh ? copySpaceCopy.cancel : "Cancel",
  }
  const [asking, setAsking] = useState<Action | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const run = async (action: Action) => {
    setBusy(true)
    setError("")
    try {
      const res = await fetch(ASK[action].route, { method: "POST" })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "That did not work. Nothing was changed in your real plan. Try again.")
      }
      try {
        window.localStorage.removeItem(planCacheKey(sandboxId))
        window.localStorage.removeItem(`plan-due-hidden:${sandboxId}`)
        window.localStorage.removeItem(LIFE_PLAN_IMPORTED_KEY)
      } catch {
        /* storage refused: the reload below still reads the database */
      }
      // Always the copy space's own address, whatever the bar says now (never a reload of whatever is there).
      const step = new URLSearchParams(window.location.search).get("step")
      window.location.assign(step && basePath === ROUTES.planSandbox ? `${basePath}?step=${encodeURIComponent(step)}` : basePath)
    } catch (e) {
      setError(e instanceof Error && e.message.length > 3 ? e.message : "That did not work. Nothing was changed in your real plan. Try again.")
      setBusy(false)
      setAsking(null)
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-50" data-testid="plan-sandbox-banner" role="region" aria-label="Copy space">
      <p className="text-sm font-semibold">{words.line}</p>
      {asking ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-amber-100/90" data-testid="plan-sandbox-sure">{words.sure(asking)}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(asking)}
              className="min-h-11 rounded-lg bg-amber-400 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-60"
              data-testid="plan-sandbox-confirm"
            >
              {busy ? words.working(asking) : words.yes(asking)}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setAsking(null)}
              className="min-h-11 rounded-lg border border-amber-400/40 px-4 text-sm text-amber-100 disabled:opacity-60"
              data-testid="plan-sandbox-cancel"
            >
              {words.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setAsking("copy")}
            className="min-h-11 rounded-lg border border-amber-400/50 px-4 text-sm font-medium text-amber-50 hover:bg-amber-400/10"
            data-testid="plan-sandbox-copy"
          >
            {words.copy}
          </button>
          <button
            type="button"
            onClick={() => setAsking("reset")}
            className="min-h-11 rounded-lg border border-amber-400/50 px-4 text-sm font-medium text-amber-50 hover:bg-amber-400/10"
            data-testid="plan-sandbox-new"
          >
            {words.reset}
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-rose-300" role="alert" data-testid="plan-sandbox-error">{error}</p>}
    </div>
  )
}
