"use client"

/**
 * THOUGHT FREQUENCIES, THE PAGE (Plans/thought.md, screen 1).
 *
 * Top to bottom in the order a person needs it: what is ready to reframe, the
 * box to type a new thought, and the thoughts you already have as buttons,
 * most frequent first. One tap counts it.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { usePushDevice } from "@/src/notifications/hooks/usePushDevice"
import { ROUTES } from "@/src/shared/routes"
import { useThoughts } from "../hooks/useThoughts"
import { isUuid, readyToReframe, sortForButtons, TOP_BUTTONS } from "../thoughtsService"
import { ThoughtsCallError, thoughtsApi } from "../thoughtsClient"
import type { FrequencyStats, Thought } from "../types"
import { AllThoughtsSheet } from "./AllThoughtsSheet"
import { frequencyLine } from "./format"
import { FrequenciesView, ThoughtTrend } from "./FrequenciesView"
import { LoggedNotice } from "./LoggedNotice"
import { QuickLogSheet } from "./QuickLogSheet"
import { RemindersCard } from "./RemindersCard"
import { RemindersSheet } from "./RemindersSheet"
import { ReframeFlow } from "./ReframeFlow"
import { ThoughtButtons } from "./ThoughtButtons"
import { ThoughtInput } from "./ThoughtInput"
import { ThoughtSheet } from "./ThoughtSheet"

export function ThoughtsScreen() {
  const s = useThoughts()
  const push = usePushDevice()
  const [openId, setOpenId] = useState<string | null>(null)
  const [reframeId, setReframeId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  /** Opened by a reminder (`?log=1&prompt=<id>`) or the install shortcut (`?log=1`). */
  const [quick, setQuick] = useState<{ promptId: string | null } | null>(null)
  const [tab, setTab] = useState<"thoughts" | "frequencies">("thoughts")
  const [stats, setStats] = useState<FrequencyStats | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)

  /** The Frequencies numbers, read when that tab or a thought's sheet opens, fresh each time. */
  const loadStats = useCallback(async () => {
    setStatsError(null)
    try {
      setStats(await thoughtsApi.stats())
    } catch (e) {
      setStatsError(e instanceof ThoughtsCallError ? e.message : "Could not count your thoughts")
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("log") !== "1") return
    const prompt = params.get("prompt")
    setQuick({ promptId: isUuid(prompt) ? prompt : null })
  }, [])

  const closeQuick = useCallback(() => {
    setQuick(null)
    // The address goes back to the page itself, so a reload does not reopen the sheet.
    window.history.replaceState(null, "", ROUTES.thoughts)
  }, [])

  const buttons = useMemo(() => sortForButtons(s.thoughts), [s.thoughts])
  const ready = useMemo(
    () => (s.settings ? readyToReframe(s.thoughts, s.settings, s.timezone, new Date()) : []),
    [s.thoughts, s.settings, s.timezone],
  )
  const open = s.thoughts.find((t) => t.id === openId) ?? null
  const reframing = s.thoughts.find((t) => t.id === reframeId) ?? null
  const openSheet = useCallback(
    (t: Thought) => {
      setOpenId(t.id)
      void loadStats()
    },
    [loadStats],
  )

  const quickSheet = (
    <QuickLogSheet
      open={quick !== null}
      promptId={quick?.promptId ?? null}
      thoughts={s.thoughts}
      pending={s.pending}
      loading={!s.view}
      onLog={(t) => s.log(t, quick?.promptId ? "prompt" : "tap", quick?.promptId ?? null)}
      onLogNew={(text) => s.logText(text, quick?.promptId ? "prompt" : "typed", quick?.promptId ?? null)}
      onNothing={() => quick?.promptId && s.nothingNotable(quick.promptId)}
      onClose={closeQuick}
    />
  )

  if (!s.view) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 pb-10 pt-6">
        <h1 className="text-2xl font-semibold">Thought Frequencies</h1>
        {s.loadError ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-5" role="alert">
            <p>{s.loadError}.</p>
            <p className="mt-1 text-sm text-muted-foreground">Nothing was changed. Try again when you have signal.</p>
            <Button className="mt-4" onClick={() => void s.reload()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-3" aria-busy="true" aria-label="Loading your thoughts">
            <div className="h-12 animate-pulse rounded-xl bg-card" />
            <div className="flex flex-wrap gap-2">
              {[40, 28, 34, 22].map((w) => (
                <div key={w} className="h-11 animate-pulse rounded-2xl bg-card" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
        )}
        {quickSheet}
      </main>
    )
  }

  const top = buttons.slice(0, TOP_BUTTONS)
  const empty = s.thoughts.length === 0

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-10 pt-6" data-testid="thoughts-page">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Thought Frequencies</h1>
        <p className="mt-1 text-sm text-muted-foreground">Catch the thoughts that keep coming back. Then rewrite them.</p>
      </header>

      <div className="mt-5">
        <RemindersCard
          push={push}
          settings={s.view.settings}
          nextDueAt={s.view.nextDueAt}
          lastDeliveredAt={s.view.lastDeliveredAt}
          timezone={s.timezone}
          onOpenSettings={() => setShowSettings(true)}
          onTurnOn={async () => {
            const on = await push.turnOn()
            if (on && !s.view?.settings.remindersOn && s.view) await s.saveSettings({ ...s.view.settings, remindersOn: true })
          }}
        />
      </div>

      <div className="mt-5 flex gap-1 rounded-xl bg-card p-1" role="tablist" aria-label="Thought Frequencies">
        {(["thoughts", "frequencies"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            data-testid={`tab-${t}`}
            onClick={() => {
              setTab(t)
              if (t === "frequencies") void loadStats()
            }}
            className={`min-h-10 flex-1 rounded-lg text-sm font-medium ${tab === t ? "bg-background text-foreground" : "text-muted-foreground"}`}
          >
            {t === "thoughts" ? "Thoughts" : "Frequencies"}
          </button>
        ))}
      </div>

      {tab === "frequencies" ? (
        <div className="mt-6" role="tabpanel">
          <FrequenciesView stats={stats} error={statsError} thoughts={s.thoughts} timezone={s.timezone} onRetry={() => void loadStats()} />
        </div>
      ) : (
        <div role="tabpanel">

      {ready.length > 0 && (
        <section className="mt-6" aria-labelledby="ready-label">
          <h2 id="ready-label" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Ready to reframe ({ready.length})
          </h2>
          <ul className="-mx-4 mt-2 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1">
            {ready.map((t) => (
              <li key={t.id} className="w-60 shrink-0 snap-start">
                <button
                  type="button"
                  onClick={() => setReframeId(t.id)}
                  data-testid="ready-to-reframe"
                  className="flex h-full min-h-24 w-full flex-col justify-between gap-2 rounded-2xl border border-primary/30 bg-primary/[0.06] p-3.5 text-left hover:bg-primary/10"
                >
                  <span className="line-clamp-2 font-medium leading-snug">{t.text}</span>
                  <span className="flex items-end justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{frequencyLine(t.counts.total, t.counts.firstAt, new Date())}</span>
                    <span className="shrink-0 font-semibold text-primary">Reframe →</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6" aria-label="Log a thought">
        <ThoughtInput thoughts={s.thoughts} onLogExisting={(t) => s.log(t, "typed")} onLogNew={(text) => s.logText(text)} />
      </section>

      {empty ? (
        <section className="mt-6 rounded-2xl border border-dashed border-border p-5 text-sm leading-relaxed text-muted-foreground" data-testid="thoughts-empty">
          <p className="text-foreground">Type the last thing you thought about yourself, and press enter.</p>
          <p className="mt-2">
            It becomes a button. The next time that thought comes back, tap it instead of typing. After a few days you can
            rewrite the ones that keep coming.
          </p>
        </section>
      ) : (
        <section className="mt-6" aria-labelledby="buttons-label">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="buttons-label" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your thoughts · today
            </h2>
            <span className="text-xs text-muted-foreground">Hold one for more</span>
          </div>
          <div className="mt-3">
            <ThoughtButtons thoughts={top} pending={s.pending} onTap={(t) => s.log(t, "tap")} onHold={openSheet} />
          </div>
          {s.queued > 0 && (
            <p className="mt-3 flex items-center gap-2 text-xs text-amber-300" role="status" data-testid="thoughts-queued">
              <span aria-hidden className="size-2 rounded-full bg-amber-400" />
              {s.sendState === "signed-out"
                ? `${s.queued} saved on this phone. Sign in again to send them.`
                : `${s.queued} saved on this phone. They send when you have signal.`}
            </p>
          )}
          <Button variant="ghost" className="mt-3 -ml-3 text-muted-foreground" onClick={() => setShowAll(true)} data-testid="show-all">
            Show all ({s.thoughts.length})
          </Button>
        </section>
      )}

        </div>
      )}

      <AllThoughtsSheet
        open={showAll}
        thoughts={s.thoughts}
        onClose={() => setShowAll(false)}
        onOpen={(t) => {
          setShowAll(false)
          openSheet(t)
        }}
      />

      <ThoughtSheet
        thought={open}
        others={s.thoughts}
        timezone={s.timezone}
        onClose={() => setOpenId(null)}
        onReframe={(t) => {
          setOpenId(null)
          setReframeId(t.id)
        }}
        update={s.update}
        merge={s.merge}
        remove={s.remove}
        loadReframes={s.reframes}
        trend={open ? <ThoughtTrend stats={stats} thought={open} timezone={s.timezone} /> : null}
      />

      <RemindersSheet
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={s.view.settings}
        timezone={s.timezone}
        lastDeliveredAt={s.view.lastDeliveredAt}
        push={push}
        save={s.saveSettings}
      />

      {quickSheet}

      {reframing && <ReframeFlow thought={reframing} onClose={() => setReframeId(null)} onSave={s.saveReframe} />}

      <LoggedNotice notice={s.notice} onUndo={(n) => void s.undo(n)} onDone={s.dismissNotice} />
    </main>
  )
}
