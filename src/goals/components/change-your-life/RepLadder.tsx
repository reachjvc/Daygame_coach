"use client"

/**
 * The offering: one ladder, one rep a day.
 *
 * Setup asks three things and then gets out of the way. The third — where on the
 * ladder you already are — is the one that stops this being patronising: someone
 * who already trains four times a week should not be told to put their training
 * clothes on, and being handed a rung you have obviously outgrown is how a tool
 * loses you in the first minute.
 *
 * Everything is adjustable afterwards, because the alternative is a user quietly
 * stuck on a rung that is wrong for them: cadence, rung, and the ladder itself.
 * "Too much today" is a first-class control, not a failure state.
 */

import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  CUSTOM_MAX_RUNGS,
  CUSTOM_MIN_RUNGS,
  CUSTOM_RUNG_HINTS,
  LADDER_GROUPS,
  REPS_TO_ADVANCE,
  REP_LADDERS,
  type Ladder,
  type LadderId,
} from "@/src/goals/data/repLadders"
import {
  adjustRung,
  buildCustomLadder,
  customIsUsable,
  emptyRun,
  ladderOf,
  loadRun,
  logRep,
  missMessage,
  recentDays,
  rungState,
  serializeRun,
  setCadence,
  setLetter,
  startRun,
  statusOf,
  weekPace,
  type RepRun,
} from "@/src/goals/repLadderService"

import { LabHeader } from "./shared"

const STORAGE_KEY = "cyl-ladder-v2"
const DAYS = [1, 2, 3, 4, 5, 6, 7]

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function RepLadder() {
  const [run, setRun] = useState<RepRun>(() => emptyRun())
  const [hydrated, setHydrated] = useState(false)
  const [today, setToday] = useState("")

  useEffect(() => {
    setToday(todayIso())
    const restored = loadRun(window.localStorage.getItem(STORAGE_KEY))
    if (restored) setRun(restored)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(STORAGE_KEY, serializeRun(run))
  }, [run, hydrated])

  const reset = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY)
    setRun(emptyRun())
  }, [])

  if (!hydrated || !today) return null
  const started = statusOf(run, today).started

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10 md:px-8">
        {started ? (
          <Today run={run} setRun={setRun} today={today} reset={reset} />
        ) : (
          <Setup onStart={(l, rung, days, custom) => setRun(startRun(run, l, rung, days, today, custom))} />
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------- setup

function Setup({
  onStart,
}: {
  onStart: (ladder: LadderId, startRung: number, daysPerWeek: number, custom: Ladder | null) => void
}) {
  const [picked, setPicked] = useState<LadderId | null>(null)
  const [rung, setRung] = useState(0)
  const [days, setDays] = useState(3)
  const [customLabel, setCustomLabel] = useState("")
  const [customRungs, setCustomRungs] = useState(
    Array.from({ length: 3 }, () => ({ action: "", counts: "" })),
  )

  const custom = picked === "custom" ? buildCustomLadder(customLabel, customRungs) : null
  const ladder = picked === "custom" ? custom : picked ? REP_LADDERS.find((l) => l.id === picked) ?? null : null
  const ready = picked === "custom" ? customIsUsable(custom) : Boolean(ladder)

  return (
    <>
      <LabHeader
        eyebrow="Three questions, then it leaves you alone"
        title="What are you working on?"
        blurb="Pick whichever is closest. You can change it later, and you can write your own if none of these fit."
        backHref="/test/change-your-life"
        backLabel="Back"
      />

      {LADDER_GROUPS.map((group) => {
        const inGroup = REP_LADDERS.filter((l) => l.group === group)
        if (inGroup.length === 0) return null
        return (
          <div key={group} className="mb-6">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{group}</p>
            <div className="grid gap-2">
              {inGroup.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    setPicked(l.id)
                    setRung(0)
                  }}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    picked === l.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <p className="font-semibold text-foreground">{l.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{l.aim}</p>
                </button>
              ))}
            </div>
          </div>
        )
      })}

      <button
        onClick={() => {
          setPicked("custom")
          setRung(0)
        }}
        className={`mb-8 w-full rounded-lg border border-dashed p-4 text-left transition-colors ${
          picked === "custom" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
        }`}
      >
        <p className="font-semibold text-foreground">Something else</p>
        <p className="mt-1 text-sm text-muted-foreground">Write your own rungs. Two is enough to start.</p>
      </button>

      {picked === "custom" ? (
        <div className="mb-8 space-y-4 rounded-lg border border-border bg-card p-5">
          <div>
            <label className="text-sm font-medium text-foreground">What are you working on?</label>
            <input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g. Cold showers"
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Write them easiest first. The first one should be small enough that skipping it would be embarrassing.
          </p>
          {customRungs.map((r, i) => (
            <div key={i} className="grid gap-2 border-t border-border pt-3 md:grid-cols-2">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-primary">
                  Rung {i + 1}
                </label>
                <input
                  value={r.action}
                  onChange={(e) => {
                    const next = [...customRungs]
                    next[i] = { ...next[i], action: e.target.value }
                    setCustomRungs(next)
                  }}
                  placeholder={CUSTOM_RUNG_HINTS[i] ?? "Harder than the one above"}
                  className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  It counts when
                </label>
                <input
                  value={r.counts}
                  onChange={(e) => {
                    const next = [...customRungs]
                    next[i] = { ...next[i], counts: e.target.value }
                    setCustomRungs(next)
                  }}
                  placeholder="Optional"
                  className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          ))}
          {customRungs.length < CUSTOM_MAX_RUNGS ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomRungs([...customRungs, { action: "", counts: "" }])}
            >
              Add a rung
            </Button>
          ) : null}
          {!customIsUsable(custom) ? (
            <p className="text-xs text-muted-foreground">
              At least {CUSTOM_MIN_RUNGS} rungs with something written in them.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Where you already are. The question that stops this being patronising. */}
      {ladder && ladder.rungs.length > 0 ? (
        <div className="mb-8">
          <p className="text-lg font-semibold text-foreground">Where are you now?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap the first one that would actually be a stretch today. Anything above it you can already do, so there&apos;s
            no point starting there.
          </p>
          <div className="mt-4 grid gap-2">
            {ladder.rungs.map((r, i) => (
              <button
                key={i}
                onClick={() => setRung(i)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  i === rung
                    ? "border-primary bg-primary/10"
                    : i < rung
                      ? "border-border bg-card/50 opacity-60"
                      : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <span className="font-mono text-xs tabular-nums text-primary">{i + 1}</span>
                <span className="ml-3 text-sm text-foreground">{r.action}</span>
                {i < rung ? (
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    already easy
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {ready ? (
        <div className="mb-10">
          <p className="text-lg font-semibold text-foreground">How many days a week is realistic?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The number you&apos;d still hit in a bad week, because that&apos;s the week that decides this.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {DAYS.map((n) => (
              <button
                key={n}
                onClick={() => setDays(n)}
                className={`h-12 w-12 rounded-lg border text-lg font-semibold tabular-nums transition-colors ${
                  days === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button size="lg" onClick={() => picked && onStart(picked, rung, days, custom)}>
              Start
            </Button>
            <span className="text-sm text-muted-foreground">That&apos;s setup done. The rest is one screen a day.</span>
          </div>
        </div>
      ) : null}
    </>
  )
}

// --------------------------------------------------------------- the day

function Today({
  run,
  setRun,
  today,
  reset,
}: {
  run: RepRun
  setRun: (r: RepRun) => void
  today: string
  reset: () => void
}) {
  const ladder = ladderOf(run)!
  const state = rungState(run)!
  const status = statusOf(run, today)
  const pace = weekPace(run, today)
  const strip = recentDays(run, today, 14)
  const miss = missMessage(status.missStreak)
  const [letterDraft, setLetterDraft] = useState(run.letter)
  const [tuning, setTuning] = useState(false)

  return (
    <>
      <div className="mb-8 flex items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{ladder.label}</p>
          <p className="mt-1 font-mono text-sm tabular-nums text-muted-foreground">
            Day {status.dayNumber} · rung {state.index + 1} of {state.total} · {pace.done}/{pace.target} this week
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
          Start over
        </Button>
      </div>

      {status.justPromoted ? (
        <div className="mb-4 rounded-lg border border-primary/40 bg-primary/5 p-4">
          <p className="text-sm text-foreground">
            That&apos;s {REPS_TO_ADVANCE} clean at the last one, so you&apos;ve moved up. If this feels like too big a
            jump, step back down — that costs you nothing.
          </p>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-6 md:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary">Today</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-foreground text-balance md:text-4xl">
          {state.rung.action}
        </h1>
        <p className="mt-5 text-base text-muted-foreground">
          <span className="text-foreground">It counts when:</span> {state.rung.counts}
        </p>
        <p className="mt-2 text-base text-muted-foreground">
          <span className="text-foreground">Then:</span> {state.rung.release}
        </p>

        {status.loggedToday === null ? (
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => setRun(logRep(run, today, "did"))}>
              Did it
            </Button>
            <Button size="lg" variant="outline" onClick={() => setRun(logRep(run, today, "missed"))}>
              Couldn&apos;t today
            </Button>
          </div>
        ) : (
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <p className="text-lg text-foreground">
              {status.loggedToday === "did" ? "Logged. That's today done." : "Logged. Nothing resets."}
            </p>
            <button
              onClick={() => setRun(logRep(run, today, status.loggedToday === "did" ? "missed" : "did"))}
              className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              change it
            </button>
          </div>
        )}

        {/* Adjustment lives next to the rung, because a wrong rung is the most
            likely reason someone silently stops. */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <span className="text-sm text-muted-foreground">Is this the right size?</span>
          <Button
            size="sm"
            variant="outline"
            disabled={state.isFirst}
            onClick={() => setRun(adjustRung(run, -1))}
          >
            Too much today
          </Button>
          <Button size="sm" variant="outline" disabled={state.isLast} onClick={() => setRun(adjustRung(run, 1))}>
            Too easy
          </Button>
        </div>
      </div>

      {miss ? (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm text-foreground">{miss}</p>
        </div>
      ) : null}

      {status.showLetter ? (
        <div className="mt-4 rounded-lg border border-primary/40 bg-primary/5 p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary">You wrote this for now</p>
          <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed text-foreground">{run.letter}</p>
        </div>
      ) : null}

      {status.letterDue ? (
        <div className="mt-4 rounded-lg border border-primary/40 bg-primary/5 p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary">
            Two minutes, while it&apos;s going well
          </p>
          <p className="mt-3 text-base leading-relaxed text-foreground">
            Imagine someone you care about tells you, in a few weeks, that they fell off this. Write what you&apos;d
            actually say to them. Then swap their name for yours. You&apos;ll read it on the day you need it, and
            you&apos;ll be in no state to write it then.
          </p>
          <textarea
            rows={5}
            value={letterDraft}
            onChange={(e) => setLetterDraft(e.target.value)}
            className="mt-4 w-full rounded-md border border-border bg-background p-3 text-base text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            className="mt-3"
            disabled={letterDraft.trim().length === 0}
            onClick={() => setRun(setLetter(run, letterDraft))}
          >
            Keep it
          </Button>
        </div>
      ) : null}

      <div className="mt-8">
        <div className="flex gap-1.5">
          {strip.map((d) => (
            <span
              key={d.date}
              title={d.date}
              className={`h-8 flex-1 rounded ${
                d.outcome === "did" ? "bg-primary" : d.outcome === "missed" ? "bg-destructive/40" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="mt-3 font-mono text-xs tabular-nums text-muted-foreground">
          {status.totalDone} done · last 14 days
          {state.isLast ? " · top rung" : ` · ${state.toAdvance} more here to move up`}
        </p>
      </div>

      <p className="mt-8 border-l-2 border-border pl-4 text-base leading-relaxed text-muted-foreground">
        {status.timelineNote}
      </p>

      <div className="mt-8 border-t border-border pt-5">
        <button
          onClick={() => setTuning((t) => !t)}
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {tuning ? "Hide settings" : "Change how often, or see the whole ladder"}
        </button>

        {tuning ? (
          <div className="mt-5 space-y-6">
            <div>
              <p className="text-sm font-medium text-foreground">Days a week</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DAYS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setRun(setCadence(run, n))}
                    className={`h-10 w-10 rounded-lg border text-sm font-semibold tabular-nums transition-colors ${
                      run.daysPerWeek === n
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground">The whole ladder</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Jump to any rung. Moving is not a failure and nothing is recorded when you do.
              </p>
              <div className="mt-2 grid gap-1.5">
                {ladder.rungs.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => setRun(adjustRung(run, i - state.index))}
                    className={`rounded-lg border p-2.5 text-left text-sm transition-colors ${
                      i === state.index
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="font-mono text-xs tabular-nums text-primary">{i + 1}</span>
                    <span className="ml-3">{r.action}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
