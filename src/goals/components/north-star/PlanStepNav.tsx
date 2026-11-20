"use client"

import type { NorthStarTabId, NsPlan, NsProgress } from "@/src/goals/types"
import { TAB_LABELS, TAB_ORDER } from "@/src/goals/data/northStar"
import { ACCOUNT_CHANGED_MESSAGE } from "@/src/goals/planAccount"
import type { SyncState } from "@/src/goals/lifePlanSync"

/**
 * THE BAR BETWEEN STEPS: "← <previous step> · where the work is saved · <next step> →".
 *
 * At the bottom on the setup steps, at the top on the daily ones (`siteBar`). Moved out of `NorthStarFlow` unchanged
 * (Plans/plan-new-from-real.md, Phase 4); the sync state it words comes in as props. `testIds` only adds test hooks:
 * `/plan` does not pass it, so its markup is as it was.
 */
export function PlanStepNav({
  tab,
  siteBar,
  setTab,
  plan,
  loaded,
  unsent,
  serverState,
  serverNote,
  otherAccount,
  storageRefused,
  progress,
  testIds = false,
  prev,
  next,
}: {
  tab: NorthStarTabId
  siteBar: boolean
  setTab: (tab: NorthStarTabId) => void
  plan: NsPlan
  loaded: boolean
  unsent: boolean
  serverState: SyncState
  serverNote: string
  otherAccount: boolean
  storageRefused: boolean
  progress: NsProgress
  testIds?: boolean
  /**
   * Where Back and Next go, when a sequence of screens decides it (`/plan/new`). Undefined = the real tool's twelve
   * steps in `TAB_ORDER`, as `/plan` has them; null = nothing that way.
   */
  prev?: { label: string; onGo: () => void } | null
  next?: { label: string; onGo: () => void } | null
}) {
  const tabIndex = TAB_ORDER.indexOf(tab)
  const back = prev !== undefined ? prev : tabIndex > 0 ? { label: TAB_LABELS[TAB_ORDER[tabIndex - 1]], onGo: () => setTab(TAB_ORDER[tabIndex - 1]) } : null
  const forward = next !== undefined ? next : tabIndex < TAB_ORDER.length - 1 ? { label: TAB_LABELS[TAB_ORDER[tabIndex + 1]], onGo: () => setTab(TAB_ORDER[tabIndex + 1]) } : null
  return (
      <div className={siteBar ? "sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-sm border-b border-white/10" : "sticky bottom-0 bg-zinc-950/90 backdrop-blur-sm border-t border-white/10"}>
        <div className={`max-w-5xl mx-auto flex items-center justify-between gap-3 ${siteBar ? "px-4 py-2 sm:px-6 sm:py-3" : "px-6 py-3"}`}>
          {back ? (
            <button onClick={back.onGo} data-testid={testIds ? "back" : undefined} className="text-xs text-zinc-400 hover:text-white transition-colors whitespace-nowrap shrink-0">
              ← {back.label}
            </button>
          ) : <span />}
          {/* What is actually happening to what you typed, said plainly and
              with the off switch next to it. A copy going to a server is not a
              thing to bury in a privacy policy nobody opens. */}
          <span className="text-[11px] text-zinc-600 text-center min-w-0">
            {/* WHAT HAPPENED TO THE PLAN ITSELF comes first and in amber, above
                the line about the improvement copy. They are different facts
                and the one people need is "is my work safe", not "was a
                research copy sent". Silent while all is well. */}
            {(otherAccount || serverNote) && (
              <span className="block text-amber-200/80 mb-0.5">{otherAccount ? ACCOUNT_CHANGED_MESSAGE : serverNote}</span>
            )}
            {storageRefused && (
              <span className="block text-amber-200/80 mb-0.5">
                This browser will not let the page store anything. Your work is only in this tab.
              </span>
            )}
            {/* THE MIRROR IS GONE, and with it the line offering to stop it.
                Until 2026-09-24 this said "a copy sent so this page can be
                improved", with a button to delete that copy — a whole plan,
                journal included, going to an unauthenticated table keyed by a
                random browser id. What is left says the one thing that is now
                true and is worth saying: where the work is. */}
            {/* `unsent` is the whole correction: during the debounce and while
                the request is open, this browser has the work and the account
                does not, and "Saved on this device." is what that is.
                "unknown" is an account with no plan yet: nothing is saved until
                something is written, and then it goes to the account
                (Plans/life-plan-after-setup.md, F10). */}
            {/* The routine line ("Saved to your account.") gives way on a phone
                under the site bar, where the row must stay one line high; the
                amber warnings above it stay at every width. */}
            <span className={siteBar ? "hidden sm:inline" : undefined} data-testid={testIds ? "save-status" : undefined} data-state={testIds ? serverState : undefined}>
              {!plan.updatedAt && !unsent
                ? "Nothing written yet"
                : serverState === "saved" && !unsent
                  ? "Saved to your account."
                  : loaded && serverState === "unknown"
                    ? "Saves to your account as you write."
                    : "Saved on this device."}
            </span>
          </span>
          {forward ? (
            <button
              onClick={forward.onGo}
          data-testid={testIds ? "next" : undefined}
              className="text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap shrink-0 bg-primary/20 border border-primary/40 text-foreground hover:bg-primary/30 transition-colors"
            >
              {forward.label} →
            </button>
          ) : (
            <span className="text-[11px] text-zinc-600 tabular-nums">
              {progress.areasRated} of {progress.areas} areas rated
            </span>
          )}
        </div>
      </div>
  )
}
