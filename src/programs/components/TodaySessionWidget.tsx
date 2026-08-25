"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle2 } from "lucide-react"
import { UNIT_CONFIG, WEEKDAY_SHORT } from "../config"
import type { EnduranceSet, ProgressionChange, SessionPrescription, UnitSystem } from "../types"

// Total prescribed minutes of an endurance session (for the workout-log bridge).
function enduranceMinutes(sets: EnduranceSet[]): number {
  const secs = sets.reduce((t, s) => t + s.repeat * s.blocks.reduce((b, blk) => b + (blk.durationSec ?? 0), 0), 0)
  return Math.max(1, Math.round(secs / 60))
}

interface Props {
  enrollmentId: string
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
  }, [prescription])

  const isEndurance = Boolean(prescription.enduranceSets)

  async function submit() {
    setSaving(true)
    try {
      const entries = prescription.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        sets: ex.sets.map((s) => {
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {prescription.restDay ? "Rest day" : "Today"} — {prescription.dayLabel}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            Cycle {prescription.cycle} · Week {prescription.week}
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
            {prescription.isFinalSession && (
              <p className="text-xs text-emerald-600">Final session — you&apos;ll have graduated the program! 🎉</p>
            )}
          </div>
        )}

        {prescription.exercises.map((ex) => (
          <div key={ex.exerciseId}>
            <div className="flex items-baseline justify-between">
              <span className="font-medium">{ex.name}</span>
              {ex.note && <span className="text-xs text-muted-foreground">{ex.note}</span>}
            </div>
            <div className="mt-1 space-y-1">
              {ex.sets.map((s) => {
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
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <Button onClick={submit} disabled={saving} className="w-full">
          {saving ? "Logging…" : "Log session"}
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
