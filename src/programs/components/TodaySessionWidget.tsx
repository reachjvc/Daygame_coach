"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle2, ChevronDown, ChevronUp, Pencil } from "lucide-react"
import {
  describeSets,
  needsInput,
  daysSinceLastSession,
  staleLifts,
  lastTimePerLift,
  platesFor,
  describePlates,
  LAYOFF_DAYS,
} from "../programsService"
import { RestTimer, REST_SECONDS } from "./RestTimer"
import { UNIT_CONFIG, WEEKDAY_SHORT } from "../config"
import type { EnduranceSet, LoggedExercise, ProgressionChange, SessionPrescription, UnitSystem } from "../types"

// Total prescribed minutes of an endurance session (for the workout-log bridge).
function enduranceMinutes(sets: EnduranceSet[]): number {
  const secs = sets.reduce((t, s) => t + s.repeat * s.blocks.reduce((b, blk) => b + (blk.durationSec ?? 0), 0), 0)
  return Math.max(1, Math.round(secs / 60))
}

interface Props {
  enrollmentId: string
  /**
   * Sessions logged on this enrollment — for the layoff notice and for which
   * individual lifts have gone stale. Needs `entries`, not just dates.
   */
  logs?: { logged_at: string; entries: LoggedExercise[] }[]
  /** What to do with a program whose last session has been logged. */
  onFinish?: (choice: "archive" | "restart") => void
  prescription: SessionPrescription
  unit: UnitSystem
  onLogged: () => void
  /**
   * Every session in the program, so you can log the one you actually did.
   *
   * The app's guess — the cursor, or today's weekday — is a good default and a
   * bad rule: people swap Push and Pull, train Legs twice, or come back on a
   * rest day. Absent for endurance plans, whose weeks are fixed.
   */
  days?: Array<{ id: string; label: string; weekday?: number }>
  onPickDay?: (dayId: string) => void
}

export function TodaySessionWidget({
  enrollmentId,
  logs = [],
  onFinish,
  prescription,
  unit,
  onLogged,
  days,
  onPickDay,
}: Props) {
  // What you actually did, keyed by `${exerciseId}:${setNumber}` and seeded to
  // what was prescribed — so an as-prescribed session is one button.
  const [reps, setReps] = useState<Record<string, string>>({})
  const [weights, setWeights] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [changes, setChanges] = useState<ProgressionChange[] | null>(null)
  /**
   * The lifts whose set-by-set boxes are showing.
   *
   * CLOSED IS THE DEFAULT because doing what it says is the normal outcome.
   * Every set used to render as its own pair of number boxes, so an upper/lower
   * day was twenty rows of "40 kg × 6 / 6–8 reps" — a sentence that is neither
   * the prescription nor what you did, repeated down the whole screen. Now each
   * lift is one line you can read, and you open the one that went differently.
   */
  const [open, setOpen] = useState<Set<string>>(new Set())
  /**
   * HOW MANY SETS YOU ACTUALLY DID, which is not always how many it asked for.
   *
   * The widget rendered exactly the prescribed number of rows and gave you no
   * way to change it — so a session where you stopped at three of five, or
   * pushed a sixth because it felt good, could not be written down at all. The
   * app would record five as prescribed and progress you off a set you never
   * lifted. The API has always accepted any number of sets; only this screen
   * insisted.
   */
  const [setCounts, setSetCounts] = useState<Record<string, number>>({})
  /**
   * When the last set was marked done — an INSTANT, not a counter, so the timer
   * is right after the phone has been locked. See `RestTimer`.
   */
  const [restFrom, setRestFrom] = useState<number | null>(null)
  const [restTarget, setRestTarget] = useState<number>(REST_SECONDS.accessory)

  useEffect(() => {
    const seedReps: Record<string, string> = {}
    const seedWeights: Record<string, string> = {}
    for (const ex of prescription.exercises) {
      for (const s of ex.sets) {
        seedReps[`${ex.exerciseId}:${s.setNumber}`] = String(s.reps)
        seedWeights[`${ex.exerciseId}:${s.setNumber}`] = String(s.weight)
      }
    }
    setReps(seedReps)
    setWeights(seedWeights)
    setChanges(null)
    // An AMRAP lift has no prescribed answer, so it cannot be logged closed —
    // "as prescribed" would record the bottom of the range as your top set and
    // progress you off a number you never lifted.
    setOpen(new Set(prescription.exercises.filter(needsInput).map((e) => e.exerciseId)))
    setSetCounts(Object.fromEntries(prescription.exercises.map((e) => [e.exerciseId, e.sets.length])))
  }, [prescription])

  const isEndurance = Boolean(prescription.enduranceSets)

  async function submit() {
    setSaving(true)
    try {
      const entries = prescription.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        // Built from what you SAID you did, not from what was asked. A set
        // beyond the prescription falls back to the last prescribed one for its
        // numbers, which is the only sensible default for "one more of those".
        sets: Array.from({ length: setCounts[ex.exerciseId] ?? ex.sets.length }, (_, i) => {
          const s = ex.sets[i] ?? ex.sets[ex.sets.length - 1] ?? { setNumber: i + 1, reps: 0, weight: 0 }
          return { ...s, setNumber: i + 1 }
        }).map((s) => {
          const key = `${ex.exerciseId}:${s.setNumber}`
          // The weight you ACTUALLY lifted, not the one that was prescribed.
          // A blank box falls back to the prescription rather than to zero,
          // which would log a bodyweight set for a barbell lift.
          const typed = Number(weights[key])
          return {
            setNumber: s.setNumber,
            reps: Number(reps[key] ?? s.reps),
            weight: Number.isFinite(typed) && typed >= 0 ? typed : s.weight,
          }
        }),
      }))
      const body = {
        dayId: prescription.dayId,
        cycle: prescription.cycle,
        week: prescription.week,
        entries,
        ...(isEndurance ? { durationMin: enduranceMinutes(prescription.enduranceSets!) } : {}),
      }
      const res = await fetch(`/api/programs/enrollments/${enrollmentId}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        setChanges(data.changes ?? [])
        onLogged()
      }
    } finally {
      setSaving(false)
    }
  }

  const ul = UNIT_CONFIG[unit].label
  const layoffDays = useMemo(() => daysSinceLastSession(logs), [logs])
  const lastTime = useMemo(() => lastTimePerLift(logs, ul), [logs, ul])
  /**
   * Which individual lifts went stale. After an injury or a busy month it is
   * usually some lifts and not the program, and one line for the whole program
   * cannot say which weights below are the wrong ones.
   */
  const stale = useMemo(
    () => staleLifts(logs, (id) => prescription.exercises.find((e) => e.exerciseId === id)?.name ?? id),
    [logs, prescription]
  )

  /**
   * Which lifts you have actually altered, compared against the prescription.
   *
   * Derived rather than tracked with a flag: a flag would stay set after you
   * typed a number and then typed the prescribed one back, and would claim a
   * change that is not there. Comparing the numbers cannot be wrong.
   */
  const changedLifts = useMemo(() => {
    const out = new Set<string>()
    for (const ex of prescription.exercises) {
      for (const s of ex.sets) {
        const key = `${ex.exerciseId}:${s.setNumber}`
        const r = reps[key]
        const w = weights[key]
        if ((r !== undefined && Number(r) !== s.reps) || (w !== undefined && Number(w) !== s.weight)) {
          out.add(ex.exerciseId)
          break
        }
      }
    }
    return out
  }, [prescription, reps, weights])
  const anythingChanged = changedLifts.size > 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {prescription.restDay ? "Rest day" : "Today"} — {prescription.dayLabel}
          {/* NUMBERS A PERSON RECOGNISES. This read "Cycle 76 · Week 1" after a
              year on StrongLifts — a linear program has no cycles and its week
              never advances, so one number climbed meaninglessly beside another
              that never moved. Cycle and week are shown only where the program
              actually has them: a 5/3/1 wave, a couch-to-5k schedule. */}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {prescription.periodised
              ? `Cycle ${prescription.cycle} · Week ${prescription.week}`
              : `Session ${prescription.sessionCount + 1}`}
          </span>
        </CardTitle>
        {prescription.restDay && (
          <p className="text-xs text-muted-foreground">
            Nothing is scheduled today. This is what is next — log it anyway if you did it.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* WHICH SESSION YOU ACTUALLY DID. The default is the app's best guess
            and people routinely do something else. */}
        {days && days.length > 1 && onPickDay && (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Logging</p>
            <div className="flex flex-wrap gap-1.5">
              {days.map((d) => {
                const active = d.id === prescription.dayId
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onPickDay(d.id)}
                    aria-pressed={active}
                    className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                      active
                        ? "border-sky-400/50 bg-sky-500/15 text-sky-200"
                        : "border-white/12 text-muted-foreground hover:bg-white/[0.06]"
                    }`}
                  >
                    {d.label}
                    {d.weekday != null && (
                      <span className="ml-1 opacity-60">{WEEKDAY_SHORT[d.weekday]}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {isEndurance && (
          <div className="space-y-2">
            {prescription.summary && (
              <p className="text-sm text-muted-foreground">
                ⏱ {enduranceMinutes(prescription.enduranceSets!)} min · {prescription.summary}
              </p>
            )}
            <div className="space-y-1.5">
              {prescription.enduranceSets!.map((set, i) => (
                <div key={i} className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  {set.repeat > 1 && <span className="mr-2 font-medium">{set.repeat}×</span>}
                  {set.blocks.map((b, j) => (
                    <span key={j} className="text-muted-foreground">
                      {j > 0 && " → "}
                      <span className="text-foreground">{b.label}</span>
                      {b.durationSec ? ` ${Math.round(b.durationSec / 60) >= 1 && b.durationSec % 60 === 0 ? `${b.durationSec / 60} min` : `${b.durationSec}s`}` : b.distanceKm ? ` ${b.distanceKm} km` : ""}
                    </span>
                  ))}
                </div>
              ))}
            </div>
            {prescription.isFinalSession && !prescription.isComplete && (
              <p className="text-xs text-emerald-600">Final session — you&apos;ll have graduated the program! 🎉</p>
            )}
          </div>
        )}

        {/* COMING BACK. The engine advances on what you log, so a program left
            in March prescribes, in September, exactly the weight you walked away
            from. No cited program has a rule for time off, so this states the
            fact and leaves the decision — the controls to act on it are already
            on this page. */}
        {layoffDays !== null && layoffDays >= LAYOFF_DAYS && (
          <p
            data-testid="layoff-notice"
            className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-600 dark:text-amber-400"
          >
            You last trained this {layoffDays} days ago. The weights below are where you left
            them — take some off before your first session back if they look heavy now.
            {/* Which ones, when it is not all of them. */}
            {stale.length > 0 && stale.length < prescription.exercises.length && (
              <span className="mt-1 block" data-testid="stale-lifts">
                Longest untrained: {stale.slice(0, 3).map((l) => `${l.name} (${l.days}d)`).join(", ")}.
              </span>
            )}
          </p>
        )}

        {/* THE LANDING. `advanceCursor` holds the cursor at the last session once
            it is reached, so a finished plan quietly re-offered its final
            session for ever — congratulating the person and then giving them
            nowhere to go. Two ways out and no third: finishing a plan and
            choosing to run it again is a normal thing to want. */}
        {prescription.isComplete && (
          <div
            data-testid="program-complete"
            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2 text-xs text-emerald-700 dark:text-emerald-400"
          >
            <p className="font-medium">You have finished this program. 🎉</p>
            <p className="mt-0.5">
              Everything you logged is kept either way — ending it moves it to the programs you have
              finished, and starting it again begins from week one.
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {onFinish && (
                <button
                  type="button"
                  onClick={() => onFinish("archive")}
                  className="rounded-md border border-emerald-500/40 px-2 py-1 transition-colors hover:bg-emerald-500/15"
                >
                  End it — I am done
                </button>
              )}
              {onFinish && (
                <button
                  type="button"
                  onClick={() => onFinish("restart")}
                  className="rounded-md border border-border px-2 py-1 text-muted-foreground transition-colors hover:bg-accent"
                >
                  Run it again
                </button>
              )}
            </div>
          </div>
        )}

        <RestTimer startedAt={restFrom} targetSeconds={restTarget} onDismiss={() => setRestFrom(null)} />

        {prescription.exercises.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Did it exactly as shown? Just save. Tap a lift to change what you actually did.
          </p>
        )}

        {prescription.exercises.map((ex) => {
          const isOpen = open.has(ex.exerciseId)
          const mustOpen = needsInput(ex)
          const edited = changedLifts.has(ex.exerciseId)
          return (
          <div key={ex.exerciseId} className="rounded-md border border-border/60">
            {/* ONE LINE PER LIFT. What it asks for, on the left; whether you
                have touched it, on the right. */}
            <button
              type="button"
              onClick={() => !mustOpen && setOpen((o) => {
                const next = new Set(o)
                if (next.has(ex.exerciseId)) next.delete(ex.exerciseId)
                else next.add(ex.exerciseId)
                return next
              })}
              aria-expanded={isOpen}
              disabled={mustOpen}
              data-testid={`lift-row-${ex.exerciseId}`}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left disabled:cursor-default"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{ex.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {describeSets(ex, ul)}
                  {ex.dropSets ? ` · +${ex.dropSets} drop${ex.dropSets > 1 ? "s" : ""}` : ""}
                  {ex.note ? ` · ${ex.note}` : ""}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                {edited && !isOpen && (
                  <span className="inline-flex items-center gap-1 text-sky-400">
                    <Pencil className="size-3" /> changed
                  </span>
                )}
                {mustOpen ? (
                  <span className="text-amber-500">how many did you get?</span>
                ) : isOpen ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </span>
            </button>

            {isOpen && (
            <div className="space-y-1 border-t border-border/60 px-3 py-2">
              {/* WHAT YOU DID LAST TIME, next to the boxes you are filling in.
                  Every other lifting app puts it here, because "what did I get
                  last week" is the question you are actually answering when you
                  decide today's numbers. */}
              {lastTime[ex.exerciseId] && (
                <p className="pb-1 text-xs text-muted-foreground">
                  Last time: {lastTime[ex.exerciseId]}
                </p>
              )}
              {Array.from(
                { length: setCounts[ex.exerciseId] ?? ex.sets.length },
                (_, i) => ex.sets[i] ?? { ...(ex.sets[ex.sets.length - 1] ?? { reps: 0, weight: 0, amrap: false, weightKg: 0 }), setNumber: i + 1 }
              ).map((s) => {
                const unitLabel = ex.repUnit === "sec" ? "sec" : "reps"
                return (
                  <div key={s.setNumber} className="flex items-center gap-2 text-sm">
                    {!ex.bodyweight && (
                      <>
                        {/* The weight is an INPUT, not a label. You lift what
                            you lift; the prescription is the starting point. */}
                        <Input
                          type="number"
                          inputMode="decimal"
                          aria-label={`Weight lifted on set ${s.setNumber} of ${ex.name} in ${ul}`}
                          className="h-8 w-20"
                          value={weights[`${ex.exerciseId}:${s.setNumber}`] ?? ""}
                          onChange={(e) =>
                            setWeights((w) => ({ ...w, [`${ex.exerciseId}:${s.setNumber}`]: e.target.value }))
                          }
                        />
                        <span className="text-muted-foreground">{ul} ×</span>
                      </>
                    )}
                    <Input
                      type="number"
                      inputMode="numeric"
                      aria-label={`Reps done on set ${s.setNumber} of ${ex.name}`}
                      className="h-8 w-20"
                      value={reps[`${ex.exerciseId}:${s.setNumber}`] ?? ""}
                      onChange={(e) => setReps((r) => ({ ...r, [`${ex.exerciseId}:${s.setNumber}`]: e.target.value }))}
                    />
                    <span className="text-muted-foreground">
                      {s.amrap ? `${unitLabel} (AMRAP)` : s.repRangeMax ? `/ ${s.reps}–${s.repRangeMax} ${unitLabel}` : `/ ${s.reps} ${unitLabel}`}
                    </span>
                    {/* Marking a set done starts the rest clock. One tap, in the
                        place your thumb already is. */}
                    <button
                      type="button"
                      onClick={() => {
                        setRestFrom(Date.now())
                        setRestTarget(ex.sets.length >= 4 ? REST_SECONDS.compound : REST_SECONDS.accessory)
                      }}
                      aria-label={`Start the rest timer after set ${s.setNumber} of ${ex.name}`}
                      className="ml-auto shrink-0 rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
                    >
                      rest
                    </button>
                  </div>
                )
              })}
              {/* WHAT TO PUT ON THE BAR. Arithmetic people do in their head
                  between sets and get wrong. Hidden for bodyweight lifts, which
                  have no bar to load. */}
              {!ex.bodyweight && ex.sets[0] && (
                <p className="pt-1 text-xs text-muted-foreground" data-testid={`plates-${ex.exerciseId}`}>
                  Bar: {describePlates(platesFor(Number(weights[`${ex.exerciseId}:1`] ?? ex.sets[0].weight), unit), ul)}
                </p>
              )}
              {/* Did fewer, or did one more. Both are normal and neither could
                  be written down before. */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setSetCounts((c) => ({
                      ...c,
                      [ex.exerciseId]: Math.max(1, (c[ex.exerciseId] ?? ex.sets.length) - 1),
                    }))
                  }
                  disabled={(setCounts[ex.exerciseId] ?? ex.sets.length) <= 1}
                  className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30"
                >
                  − one set
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSetCounts((c) => ({
                      ...c,
                      [ex.exerciseId]: Math.min(20, (c[ex.exerciseId] ?? ex.sets.length) + 1),
                    }))
                  }
                  className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
                >
                  + one set
                </button>
                <span className="text-xs text-muted-foreground">
                  {setCounts[ex.exerciseId] ?? ex.sets.length} sets
                  {(setCounts[ex.exerciseId] ?? ex.sets.length) !== ex.sets.length &&
                    ` · asked for ${ex.sets.length}`}
                </span>
              </div>
            </div>
            )}
          </div>
        )})}

        <Button onClick={submit} disabled={saving} className="w-full">
          {/* PLAIN WORDS. This said "Log session as prescribed", which is a
              doctor's word for a thing that is just "what it says above". The
              button has to be readable by somebody who has never seen a
              training app, and it has to stay honest: it may only claim you did
              exactly this when the app knows what "exactly this" is, which an
              AMRAP set — as many reps as you can — by definition is not. */}
          {saving
            ? "Saving…"
            : anythingChanged
              ? "Save what I did"
              : prescription.exercises.some(needsInput)
                ? "Save this session"
                : "I did all of this — save it"}
        </Button>

        {changes && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="mb-1 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="size-4 text-green-600" /> Logged — next session updated
            </div>
            <ul className="space-y-0.5 text-muted-foreground">
              {changes.map((c) => (
                <li key={c.exerciseId}>
                  <span className="text-foreground">{c.name}:</span> {c.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
