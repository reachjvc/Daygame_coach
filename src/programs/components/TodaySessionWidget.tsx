"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle2 } from "lucide-react"
import { UNIT_CONFIG } from "../config"
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
}

export function TodaySessionWidget({ enrollmentId, prescription, unit, onLogged }: Props) {
  // actual reps keyed by `${exerciseId}:${setNumber}`, seeded to prescribed reps.
  const [reps, setReps] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [changes, setChanges] = useState<ProgressionChange[] | null>(null)

  useEffect(() => {
    const seed: Record<string, string> = {}
    for (const ex of prescription.exercises)
      for (const s of ex.sets) seed[`${ex.exerciseId}:${s.setNumber}`] = String(s.reps)
    setReps(seed)
    setChanges(null)
  }, [prescription])

  const isEndurance = Boolean(prescription.enduranceSets)

  async function submit() {
    setSaving(true)
    try {
      const entries = prescription.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        sets: ex.sets.map((s) => ({
          setNumber: s.setNumber,
          reps: Number(reps[`${ex.exerciseId}:${s.setNumber}`] ?? s.reps),
          weight: s.weight,
        })),
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
          Today — {prescription.dayLabel}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            Cycle {prescription.cycle} · Week {prescription.week}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                        <span className="w-24 text-muted-foreground">{s.weight} {ul}</span>
                        <span className="text-muted-foreground">×</span>
                      </>
                    )}
                    <Input
                      type="number"
                      inputMode="numeric"
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
